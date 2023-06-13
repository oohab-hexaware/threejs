import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three'
import { CameraHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 50;
camera.position.z = -35;
camera.position.x = 10;

// First-person camera
const firstPersonCamera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
firstPersonCamera.position.copy(camera.position);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 15
orbitControls.enablePan = false
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
orbitControls.update();

// LIGHTS
light()

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls;
new GLTFLoader().load('models/Soldier.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
        }
    });
    // Set position and size for the model
    model.position.set(5, 5, 0); // Set the desired position coordinates
    model.scale.set(2.5, 2.5, 2.5); // Set the desired scale values

    scene.add(model);

    const gltfAnimations = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map()
    gltfAnimations.filter(a => a.name !== 'TPose').forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a))
    })

    characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle');
});

// MODEL
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
loader.load('models/Hexaware.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
        }
    });
    scene.add(model);
});


// CONTROL KEYS
const keysPressed: Record<string, boolean> = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
    } else {
        keysPressed[event.key.toLowerCase()] = true;
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);



// UI
const toggleButton = document.createElement('button');
toggleButton.textContent = 'Toggle View';
toggleButton.style.position = 'absolute';
toggleButton.style.top = '10px';
toggleButton.style.left = '10px';
document.body.appendChild(toggleButton);

let isFirstPersonView = false;

toggleButton.addEventListener('click', () => {
    if (characterControls) {
        characterControls.toggleView();

        if (isFirstPersonView) {
            // Switch to third-person view
            camera.position.copy(firstPersonCamera.position);
            camera.rotation.copy(firstPersonCamera.rotation);
            characterControls.showModel(); // Show the "Soldier.glb" model
        } else {
            // Switch to first-person view
            firstPersonCamera.position.copy(camera.position);
            firstPersonCamera.rotation.copy(camera.rotation);
            camera.position.set(0, -1000, 0); // Move the camera far away from the scene
            characterControls.hideModel(); // Hide the "Soldier.glb" model
        }

        isFirstPersonView = !isFirstPersonView;
    }
});

const clock = new THREE.Clock();
// ANIMATE
function animate() {
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
      characterControls.update(mixerUpdateDelta, keysPressed);
    }
    if (isFirstPersonView) {
        orbitControls.enabled = false; // Disable orbit controls for first-person view
        // Only move the firstPersonCamera in response to W, A, S, D keys
        if (keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d']) {
            characterControls.update(mixerUpdateDelta, keysPressed);

            const moveSpeed = 0.1; // Adjust the movement speed as needed
            const moveX = (keysPressed['d'] ? moveSpeed : 0) - (keysPressed['a'] ? moveSpeed : 0);
            const moveZ = (keysPressed['s'] ? moveSpeed : 0) - (keysPressed['w'] ? moveSpeed : 0);

            firstPersonCamera.translateX(moveX);
            firstPersonCamera.translateZ(moveZ);

            renderer.render(scene, firstPersonCamera);
        }
        // Rotate the firstPersonCamera in response to A and D keys
        if (keysPressed['a']) {
            firstPersonCamera.rotation.y += 0.01; // Adjust the rotation speed as needed
        }
        if (keysPressed['d']) {
            firstPersonCamera.rotation.y -= 0.01; // Adjust the rotation speed as needed
        }
            }
  
    if (!isFirstPersonView) {
      orbitControls.enabled = true;
      orbitControls.update();
  
      if (characterControls) {
        const modelPosition = characterControls.getModelPosition();
        const modelQuaternion = characterControls.getModelQuaternion();
  
        const cameraOffset = new THREE.Vector3(3, 5, 10); // Adjust the camera offset as needed
        const cameraTargetOffset = new THREE.Vector3(0, 5, 0); // Adjust the camera target offset as needed
  
        const cameraPosition = cameraOffset.clone().applyQuaternion(modelQuaternion).add(modelPosition);
        const cameraTarget = cameraTargetOffset.clone().applyQuaternion(modelQuaternion).add(modelPosition);
  
        // Smoothly interpolate camera position
        const smoothFactor = 0.009; // Adjust the smoothing factor as needed
  
        camera.position.lerp(cameraPosition, smoothFactor);
        camera.lookAt(cameraTarget);
  
        // Limit the rotation speed of the camera
        const maxRotationSpeed = 0.001; // Adjust the maximum rotation speed as needed
  
        const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler().setFromQuaternion(modelQuaternion));
        const currentQuaternion = new THREE.Quaternion().copy(camera.quaternion);
  
        const deltaQuaternion = targetQuaternion.clone().multiply(currentQuaternion.clone().inverse());
  
        const angle = 2 * Math.acos(deltaQuaternion.w);
        const axis = new THREE.Vector3(deltaQuaternion.x, deltaQuaternion.y, deltaQuaternion.z).normalize();
  
        const rotationSpeed = Math.min(maxRotationSpeed, angle);
  
        const newQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, rotationSpeed);
        camera.quaternion.multiply(newQuaternion);
  
        renderer.render(scene, camera);
      }
    }
  
    requestAnimationFrame(animate);
  }
  
        document.addEventListener('keydown', (event) => {
            keyDisplayQueue.down(event.key);
            if (event.shiftKey && characterControls) {
                characterControls.setWalkState(); // Set the character controls to walk state
            } else {
                keysPressed[event.key.toLowerCase()] = true;
            }
        
            if (isFirstPersonView) {
                // Disable default browser behavior for arrow keys and spacebar
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ') {
                    event.preventDefault();
                }
            }
        }, false);
        

document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);

document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    firstPersonCamera.aspect = window.innerWidth / window.innerHeight;
    firstPersonCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    keyDisplayQueue.updatePosition()
}
window.addEventListener('resize', onWindowResize);

function wrapAndRepeatTexture(map: { wrapS: THREE.Wrapping; wrapT: THREE.Wrapping; repeat: { x: number; y: number; }; }) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.x = map.repeat.y = 10
}

function light() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(-60, 100, -10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
}