import * as THREE from 'three';

let scene, camera, renderer;
let ufo, ufoBoundingBox;
let obstacles = [];
let coins = [];
let scenery = [];
let clouds = [];
// Speed settings - will be set by user selection
let selectedInitialForwardSpeed;
let selectedAcceleration;
let selectedMaxSpeed;
// Keep track of the selected *setting object* and mode
let selectedSpeedSetting = null;
let selectedModeIsInvincible = null;

// Default values (can be overridden)
// Set the standard initial speed
const DEFAULT_INITIAL_FORWARD_SPEED = 25;

// Game speed constants - Updated values
const SPEED_SLOW = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 50, accel: 1 };
const SPEED_MEDIUM = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 100, accel: 5 };
const SPEED_FAST = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 200, accel: 10 };
// Add a placeholder for custom speed, values will be set by user input
const SPEED_CUSTOM = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 0, accel: 0, isCustom: true };

let currentForwardSpeed = DEFAULT_INITIAL_FORWARD_SPEED;
// Separate strafe speeds for keyboard and touch
// Increased speeds
const keyboardStrafeSpeed = 3.5; // Was 2.0
const touchStrafeSensitivity = 0.07; // Was 0.04, adjust this to control touch responsiveness

const planeWidth = 25;
const planeHeight = 15;
const initialCloudCount = 15;
const targetCloudCount = 20; 
const cloudSpawnThreshold = 15; 
const cloudSpawnDistance = 1500; 
const cloudSpawnRangeZ = 1000; 
const cloudVerticalSpawnRangeMultiplier = 2.5; 

// Add tank dimensions/constants
const tankBodyWidth = 2;
const tankBodyLength = 3;
const tankBodyHeight = 1;
const tankTurretRadius = 0.6;
const tankTurretHeight = 0.5;
const tankBarrelLength = 2.5;
const tankBarrelRadius = 0.15;

let score = 0;
let coinCount = 0;
let gameActive = false;
let gameWon = false;
let isInvincible = false; 
let keys = {};
let isPaused = false; // Pause state

// Touch control variables
let isTouching = false;
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let touchDeltaX = 0;
let touchDeltaY = 0;

// --- Arrow Pad Controls (for mobile) ---
let touchArrowState = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const clock = new THREE.Clock();

const controlsElement = document.getElementById('controls'); // Get controls display
const infoElement = document.getElementById('info');
const coinsElement = document.getElementById('coins');
const speedElement = document.getElementById('speed');
const messageContainer = document.getElementById('message-container'); 
const speedOptionsDiv = document.getElementById('speed-options'); // Get speed options div
const speedSlowButton = document.getElementById('speed-slow');
const speedMediumButton = document.getElementById('speed-medium');
const speedFastButton = document.getElementById('speed-fast');
const speedCustomButton = document.getElementById('speed-custom');
const customSpeedInputDiv = document.getElementById('custom-speed-input');
const customMaxSpeedInput = document.getElementById('custom-max-speed');
const customAccelInput = document.getElementById('custom-accel');
const confirmCustomSpeedButton = document.getElementById('confirm-custom-speed');
const startOptionsDiv = document.getElementById('start-options'); 
const endMessageDiv = document.getElementById('end-message'); 
const zoneDisplayElement = document.getElementById('zone-display'); 
const modeDisplayElement = document.getElementById('mode-display'); 
// Get new elements
const modeOptionsDiv = document.getElementById('mode-options');
const modeRegularButton = document.getElementById('mode-regular');
const modeInvincibleButton = document.getElementById('mode-invincible');
const startButtonContainer = document.getElementById('start-button-container');
const startButton = document.getElementById('start-button');
const restartSpeedButton = document.getElementById('restart-speed'); // For going back
const escapeMessageElement = document.getElementById('escape-message');
const touchControlsElement = document.getElementById('touch-controls'); // Get touch overlay
// In-Game buttons
const pauseButton = document.getElementById('pause-button');
const restartInGameButton = document.getElementById('restart-ingame-button');

// --- Arrow Pad Elements ---
const touchArrowsContainer = document.getElementById('touch-arrows-container');
const arrowUp = document.getElementById('arrow-up');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');
const arrowDown = document.getElementById('arrow-down');

const ZONE_GROUND = 0;
const ZONE_AIR_END = 8000; 
const ZONE_SPACE_START = 7000; 
const ZONE_NEAR_SPACE_END = 15000; 
const ZONE_MID_SPACE_END = 20000; 
const ZONE_DEEP_SPACE_END = 25000; 
const ZONE_WIN = 25000; 
const ZONE_WIN_APPROACH = ZONE_WIN - 3000;

let blackHole = null; 
let ground; 
let moon = null; 
let moonSpawned = false; 
let lastPlanetSpawnDistance = ZONE_SPACE_START; 
let lastLargeShipSpawnDistance = ZONE_SPACE_START; 

function showStartScreen() {
    messageContainer.style.display = 'block';
    endMessageDiv.style.display = 'none'; // Hide end message
    startOptionsDiv.style.display = 'none'; // Hide restart options
    speedOptionsDiv.style.display = 'block'; // Show speed options
    modeOptionsDiv.style.display = 'block'; // Show mode options FROM THE START
    startButtonContainer.style.display = 'none'; // Hide start button initially until defaults are set
    modeDisplayElement.style.display = 'block'; // Show mode display
    modeDisplayElement.textContent = 'Avoid the obstacles!'; // Default to regular mode description
    escapeMessageElement.style.display = 'block'; // Show escape message on start screen
    customSpeedInputDiv.style.display = 'none'; // Hide custom input area
    // Hide in-game buttons
    pauseButton.style.display = 'none';
    restartInGameButton.style.display = 'none';
    // Reset pause state if returning here
    isPaused = false;
    pauseButton.textContent = 'Pause';
    pauseButton.classList.remove('paused');

    // Reset selections internally (although defaults will override)
    selectedSpeedSetting = null;
    selectedModeIsInvincible = null;

    // Reset button styles before applying defaults
    [speedSlowButton, speedMediumButton, speedFastButton, speedCustomButton, modeRegularButton, modeInvincibleButton].forEach(btn => {
        btn.classList.remove('selected');
    });

    // *** Apply Default Selections ***
    // Programmatically click the Medium speed and Regular mode buttons
    // This ensures the selection logic runs, including showing the start button
    speedMediumButton.click();
    modeRegularButton.click();

    // Ensure start button is shown after defaults are applied
    startButtonContainer.style.display = 'block';
}

// Function to handle speed selection UI updates
function handleSpeedSelection(selectedButton, speedSetting) {
    selectedSpeedSetting = speedSetting; // Store the selected setting object

    // Update button styles
    [speedSlowButton, speedMediumButton, speedFastButton, speedCustomButton].forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedButton.classList.add('selected');

    // If a preset speed was chosen, hide the custom input area
    if (!speedSetting.isCustom) {
        customSpeedInputDiv.style.display = 'none';
    }

    // Show start button if mode is already selected
    if (selectedModeIsInvincible !== null) {
        startButtonContainer.style.display = 'block';
    }
}

// Function to handle mode selection UI updates
function handleModeSelection(selectedButton, isInvincible) {
    selectedModeIsInvincible = isInvincible; // Store the selected mode

    // Update button styles
    [modeRegularButton, modeInvincibleButton].forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedButton.classList.add('selected');

    // Update the mode display text immediately
    if (isInvincible) {
        modeDisplayElement.textContent = 'You are invincible!';
    } else {
        modeDisplayElement.textContent = 'Avoid the obstacles!';
    }
    modeDisplayElement.style.display = 'block'; // Ensure it's visible

    // Show start button if speed is also selected
    if (selectedSpeedSetting !== null) {
        startButtonContainer.style.display = 'block';
    }
}

function init() {
    scene = new THREE.Scene();
    const initialBgColor = new THREE.Color(0x87CEEB); 
    scene.fog = new THREE.Fog(initialBgColor, 150, 1000); 
    scene.background = initialBgColor; 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); 
    camera.position.set(0, 5, 10); 
    camera.lookAt(0, 5, 0); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Set pixel ratio for sharper rendering on high-DPI displays
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(1000, 10000); 
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); 
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.position.z = -4500; 
    scene.add(ground);

    createUFO(); 

    // Check if touch arrows should be displayed and update control text
    checkAndUpdateControlsDisplay();

    // Create initial clouds so they are visible behind the start menu
    createInitialClouds();

    // Perform an initial render of the scene before showing the start screen
    renderer.render(scene, camera);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Add touch event listeners to the dedicated overlay
    touchControlsElement.addEventListener('touchstart', onTouchStart, { passive: false });
    touchControlsElement.addEventListener('touchmove', onTouchMove, { passive: false });
    touchControlsElement.addEventListener('touchend', onTouchEnd);
    touchControlsElement.addEventListener('touchcancel', onTouchEnd); // Handle cancellations too

    // Add touch event listeners for arrow buttons
    const arrows = [arrowUp, arrowDown, arrowLeft, arrowRight];
    const arrowMapping = {
        'arrow-up': 'up',
        'arrow-down': 'down',
        'arrow-left': 'left',
        'arrow-right': 'right'
    };

    arrows.forEach(arrow => {
        if (arrow) {
            const direction = arrowMapping[arrow.id];
            arrow.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling/zooming
                touchArrowState[direction] = true;
                arrow.classList.add('active');
            }, { passive: false });

            arrow.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchArrowState[direction] = false;
                arrow.classList.remove('active');
            });

            arrow.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                touchArrowState[direction] = false;
                arrow.classList.remove('active');
            });

            // Add mouse events for desktop testing/debugging
            arrow.addEventListener('mousedown', (e) => {
                e.preventDefault();
                touchArrowState[direction] = true;
                arrow.classList.add('active');
            });
            arrow.addEventListener('mouseup', (e) => {
                e.preventDefault();
                touchArrowState[direction] = false;
                arrow.classList.remove('active');
            });
            arrow.addEventListener('mouseleave', (e) => { // Handle mouse leaving the button while pressed
                if (touchArrowState[direction]) {
                    touchArrowState[direction] = false;
                    arrow.classList.remove('active');
                }
            });
        }
    });

    // Speed selection listeners
    speedSlowButton.addEventListener('click', () => handleSpeedSelection(speedSlowButton, SPEED_SLOW));
    speedMediumButton.addEventListener('click', () => handleSpeedSelection(speedMediumButton, SPEED_MEDIUM));
    speedFastButton.addEventListener('click', () => handleSpeedSelection(speedFastButton, SPEED_FAST));
    speedCustomButton.addEventListener('click', () => handleSpeedSelection(speedCustomButton, SPEED_CUSTOM));

    // Mode selection listeners
    modeRegularButton.addEventListener('click', () => handleModeSelection(modeRegularButton, false));
    modeInvincibleButton.addEventListener('click', () => handleModeSelection(modeInvincibleButton, true));

    // Start Game button listener
    startButton.addEventListener('click', () => {
        // Ensure both selections are made
        if (selectedSpeedSetting && selectedModeIsInvincible !== null) {
            // Check if custom speed was selected but not confirmed yet
            if (selectedSpeedSetting.isCustom && customSpeedInputDiv.style.display === 'block') {
                 alert("Please confirm your custom speed settings first!");
                 return; // Prevent starting
            }
            startGame();
        } else {
            console.warn("Please select speed and mode first!");
            // Optionally provide visual feedback here
        }
    });

    // Restart button listener (goes back to speed selection)
    restartSpeedButton.addEventListener('click', () => {
        showStartScreen(); // Just reset the entire start screen flow
    });

    // Custom speed button listener
    speedCustomButton.addEventListener('click', () => {
        handleSpeedSelection(speedCustomButton, SPEED_CUSTOM); // Select "Custom"
        customSpeedInputDiv.style.display = 'flex'; // Show the input area
        startButtonContainer.style.display = 'none'; // Hide start button until confirmed
    });

    confirmCustomSpeedButton.addEventListener('click', () => {
        const maxSpeed = parseInt(customMaxSpeedInput.value, 10);
        const accel = parseInt(customAccelInput.value, 10);

        // Basic validation
        if (isNaN(maxSpeed) || isNaN(accel) || maxSpeed <= 0 || accel <= 0 || maxSpeed > 2000 || accel > 100) {
            alert("Invalid custom speed values. Max Speed (10-2000), Acceleration (1-100).");
            return;
        }

        // Update the custom speed setting object
        SPEED_CUSTOM.max = maxSpeed;
        SPEED_CUSTOM.accel = accel;
        // We keep initial as the default

        selectedSpeedSetting = SPEED_CUSTOM; // Ensure it's set

        customSpeedInputDiv.style.display = 'none'; // Hide input area after confirm
        speedCustomButton.classList.add('selected'); // Keep custom button selected

        // Show start button if mode is also selected
        if (selectedModeIsInvincible !== null) {
            startButtonContainer.style.display = 'block';
        }
    });

    // Pause button listener
    pauseButton.addEventListener('click', togglePause);

    // In-Game Restart button listener - NOW REFRESHES THE PAGE
    restartInGameButton.addEventListener('click', () => {
        location.reload(); // Refresh the entire page
    });

    showStartScreen(); // Show initial speed selection screen
}

function createUFO() {
    const ufoGroup = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); 
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 80 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 0.4, 1); 
    ufoGroup.add(body);

    const bottomGeometry = new THREE.SphereGeometry(1.4, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2 ); 
    const bottomMaterial = new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 50});
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.scale.set(1, 0.4, 1); 
    bottom.position.y = -0.05; 
    ufoGroup.add(bottom);

    const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); 
    const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0x77ccff, transparent: true, opacity: 0.5 });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.y = 0.15; 
    ufoGroup.add(cockpit);

    const alienGroup = new THREE.Group();
    const alienHeadGeom = new THREE.SphereGeometry(0.3, 16, 8);
    const alienBodyGeom = new THREE.CapsuleGeometry(0.15, 0.4, 8, 8);
    const alienMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 }); 

    const alienHead = new THREE.Mesh(alienHeadGeom, alienMat);
    alienHead.position.y = 0.15; 

    const alienBody = new THREE.Mesh(alienBodyGeom, alienMat);
    alienBody.position.y = -0.2; 

    alienGroup.add(alienHead);
    alienGroup.add(alienBody);

    alienGroup.position.y = cockpit.position.y - 0.1; 
    alienGroup.scale.set(0.8, 0.8, 0.8); 
    ufoGroup.add(alienGroup); 

    const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    for(let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2); 
        ufoGroup.add(light);
    }

    ufo = ufoGroup;
    ufo.position.set(0, 5, 0); 
    scene.add(ufo);

    const ufoSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(ufo).getSize(ufoSize);
    const colliderGeometry = new THREE.BoxGeometry(ufoSize.x * 0.7, ufoSize.y * 0.7, ufoSize.z * 0.7);
    const colliderMaterial = new THREE.MeshBasicMaterial({ visible: false }); 
    ufo.userData.collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    ufo.userData.collider.position.y = -0.1; 
    ufo.add(ufo.userData.collider); 
    ufoBoundingBox = new THREE.Box3(); 
}

function createAirplane() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xe0e0e0, shininess: 30 });
    const wingMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, shininess: 20 });
    const windowMat = new THREE.MeshPhongMaterial({ color: 0x6699cc, transparent: true, opacity: 0.6 });

    const fuselageGeom = new THREE.CapsuleGeometry(0.4, 6, 8, 16);
    const fuselage = new THREE.Mesh(fuselageGeom, bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    group.add(fuselage);

    const wingGeom = new THREE.BoxGeometry(10, 0.2, 1.8);
    const wing = new THREE.Mesh(wingGeom, wingMat);
    wing.position.y = 0.5;
    group.add(wing);

    const tailWingGeom = new THREE.BoxGeometry(3.5, 0.1, 1.2);
    const tailWing = new THREE.Mesh(tailWingGeom, wingMat);
    tailWing.position.set(0, 0.1, -3.2);
    group.add(tailWing);

    const tailFinShape = new THREE.Shape();
    tailFinShape.moveTo(0, 0);
    tailFinShape.lineTo(0, 1.2);
    tailFinShape.lineTo(-0.8, 1.2);
    tailFinShape.lineTo(-1, 0);
    tailFinShape.lineTo(0, 0);
    const tailFinExtrudeSettings = { depth: 0.1, bevelEnabled: false };
    const tailFinGeom = new THREE.ExtrudeGeometry(tailFinShape, tailFinExtrudeSettings);
    const tailFin = new THREE.Mesh(tailFinGeom, wingMat);
    tailFin.position.set(0, 0.1, -3.5);
    tailFin.rotation.y = Math.PI / 2;
    group.add(tailFin);

    const windowGeom = new THREE.BoxGeometry(1.5, 0.5, 0.75); 
    const windowMesh = new THREE.Mesh(windowGeom, windowMat);
    windowMesh.position.set(0, 0.3, 1.8); 
    group.add(windowMesh);

    const propGeom = new THREE.BoxGeometry(0.1, 1.5, 0.1);
    const propMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const prop1 = new THREE.Mesh(propGeom, propMat);
    prop1.position.z = 3.5; 
    group.add(prop1);
    const prop2 = new THREE.Mesh(propGeom, propMat);
    prop2.rotation.z = Math.PI / 2;
    prop2.position.z = 3.5; 
    group.add(prop2);

    group.scale.set(1.2, 1.2, 1.2);
    group.userData.type = 'airplane';
    group.userData.boundingRadius = 5; 
    return group;
}

function createHelicopter() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x4455aa, shininess: 50 });
    const rotorMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const bodyGeom = new THREE.CapsuleGeometry(0.8, 3, 16, 16);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2; 
    group.add(body);

    const tailGeom = new THREE.CylinderGeometry(0.2, 0.15, 3, 8);
    const tail = new THREE.Mesh(tailGeom, bodyMat);
    tail.position.z = -2.5; 
    tail.rotation.x = Math.PI / 2; 
    group.add(tail);

    const rotorBaseGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const rotorBase = new THREE.Mesh(rotorBaseGeom, rotorMat);
    rotorBase.position.y = 1.2; 
    group.add(rotorBase);

    const rotorBladeGeom = new THREE.BoxGeometry(6, 0.1, 0.3);
    const rotorBlade1 = new THREE.Mesh(rotorBladeGeom, rotorMat);
    rotorBlade1.position.y = 1.4;
    group.add(rotorBlade1);
    const rotorBlade2 = new THREE.Mesh(rotorBladeGeom, rotorMat);
    rotorBlade2.rotation.y = Math.PI / 2;
    rotorBlade2.position.y = 1.4;
    group.add(rotorBlade2);

    const tailRotorHubGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6);
    const tailRotorHub = new THREE.Mesh(tailRotorHubGeom, rotorMat);
    tailRotorHub.position.set(0.15, 0, -4); 
    tailRotorHub.rotation.z = Math.PI / 2; 
    group.add(tailRotorHub);

    const tailRotorBladeGeom = new THREE.BoxGeometry(0.8, 0.05, 0.1);
    const tailRotorBlade1 = new THREE.Mesh(tailRotorBladeGeom, rotorMat);
    tailRotorBlade1.position.set(0.15, 0, -4); 
    tailRotorBlade1.rotation.z = Math.PI / 2; 
    group.add(tailRotorBlade1);

    const tailRotorBlade2 = new THREE.Mesh(tailRotorBladeGeom, rotorMat);
    tailRotorBlade2.position.set(0.15, 0, -4); 
    tailRotorBlade2.rotation.x = Math.PI / 2; 
    tailRotorBlade2.rotation.z = Math.PI / 2; 
    group.add(tailRotorBlade2);

    group.scale.set(1.8, 1.8, 1.8);
    group.userData.type = 'helicopter';
    group.userData.boundingRadius = 5; 
    return group;
}

function createParachutist() {
    const group = new THREE.Group();
    const chuteMat = new THREE.MeshPhongMaterial({ color: 0xff8844, side: THREE.DoubleSide });
    const personMat = new THREE.MeshPhongMaterial({ color: 0x553311 });

    const chuteGeom = new THREE.SphereGeometry(2.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const chute = new THREE.Mesh(chuteGeom, chuteMat);
    group.add(chute);

    const personGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const person = new THREE.Mesh(personGeom, personMat);
    person.position.y = -3; 
    group.add(person);

    group.scale.set(1.2, 1.2, 1.2);
    group.userData.type = 'parachutist';
    group.userData.boundingRadius = 3;
    return group;
}

function createTank() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x336633, shininess: 15 }); // Dark green
    const detailMat = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 10 }); // Dark grey for details

    // Body
    const bodyGeom = new THREE.BoxGeometry(tankBodyWidth, tankBodyHeight, tankBodyLength);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = tankBodyHeight / 2; // Sit on the ground
    group.add(body);

    // Turret Base
    const turretGeom = new THREE.CylinderGeometry(tankTurretRadius, tankTurretRadius * 0.9, tankTurretHeight, 16);
    const turret = new THREE.Mesh(turretGeom, bodyMat);
    turret.position.y = tankBodyHeight + tankTurretHeight / 2;
    group.add(turret);

    // Barrel
    const barrelGeom = new THREE.CylinderGeometry(tankBarrelRadius, tankBarrelRadius * 0.8, tankBarrelLength, 8);
    const barrel = new THREE.Mesh(barrelGeom, detailMat);
    barrel.rotation.x = Math.PI / 2; // Point forward
    // Position barrel at the front of the turret
    barrel.position.y = tankBodyHeight + tankTurretHeight * 0.7; // Align vertically with turret
    barrel.position.z = tankBarrelLength / 2; // Extend forward from turret center
    group.add(barrel);

    // Tracks (Simplified as boxes on the sides)
    const trackHeight = tankBodyHeight * 0.7;
    const trackWidth = tankBodyWidth * 0.2;
    const trackLength = tankBodyLength * 1.1; // Slightly longer than body
    const trackGeom = new THREE.BoxGeometry(trackWidth, trackHeight, trackLength);
    const trackMat = new THREE.MeshPhongMaterial({ color: 0x222222 }); // Very dark grey/black

    const trackLeft = new THREE.Mesh(trackGeom, trackMat);
    trackLeft.position.set(-(tankBodyWidth / 2 + trackWidth / 2), trackHeight / 2, 0);
    group.add(trackLeft);

    const trackRight = new THREE.Mesh(trackGeom, trackMat);
    trackRight.position.set(tankBodyWidth / 2 + trackWidth / 2, trackHeight / 2, 0);
    group.add(trackRight);

    group.scale.set(1.3, 1.3, 1.3); // Make it a bit larger
    group.userData.type = 'tank';
    // Estimate bounding box or radius later - for now, rely on Box3 calculation
    group.userData.boundingRadius = Math.max(tankBodyWidth, tankBodyLength) * 0.7 * group.scale.x; // Approximate radius
    return group;
}

function createSatellite() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 60 });
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x222266, shininess: 10 }); 

    const bodySize = (Math.random() * 1.0 + 0.8) * 0.8; 
    const bodyGeom = new THREE.BoxGeometry(bodySize, bodySize, bodySize);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    const panelWidth = bodySize * (Math.random() * 1.2 + 1.2); 
    const panelHeight = bodySize * (Math.random() * 0.4 + 0.4);
    const panelGeom = new THREE.PlaneGeometry(panelWidth, panelHeight);

    const panel1 = new THREE.Mesh(panelGeom, panelMat);
    panel1.position.x = (bodySize / 2) + (panelWidth / 2);
    panel1.material.side = THREE.DoubleSide;
    group.add(panel1);

    const panel2 = new THREE.Mesh(panelGeom, panelMat);
    panel2.position.x = -((bodySize / 2) + (panelWidth / 2));
    panel2.material.side = THREE.DoubleSide;
    group.add(panel2);

    const antennaGeom = new THREE.ConeGeometry(0.08, 0.6, 8); 
    const antenna = new THREE.Mesh(antennaGeom, bodyMat);
    antenna.position.z = bodySize / 2 + 0.3; 
    antenna.rotation.x = Math.PI / 2;
    group.add(antenna);

    group.scale.set(1.0, 1.0, 1.0); 
    group.userData.type = 'satellite';
    group.userData.boundingRadius = (panelWidth / 2 + bodySize / 2) * group.scale.x * 1.1; 
    return group;
}

function createAsteroid() {
    const group = new THREE.Group();
    const radius = (Math.random() * 1.5 + 0.5) * 0.8; 
    const asteroidGeometry = new THREE.IcosahedronGeometry(radius, 1); 

    const positionAttribute = asteroidGeometry.getAttribute('position');
    const vertices = [];
    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.4); 
        vertices.push(vertex.x, vertex.y, vertex.z);
    }
    asteroidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    asteroidGeometry.computeVertexNormals(); 

    const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.05, 0.2, Math.random() * 0.3 + 0.3), 
        shininess: 5,
        flatShading: true 
    });
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    group.add(asteroid);

    group.scale.set(0.9, 0.9, 0.9); 
    group.userData.type = 'asteroid';
    group.userData.boundingRadius = radius * 1.2 * group.scale.x; 
    return group;
}

function createAlienSaucer(color = Math.random() * 0xffffff, size = (Math.random() * 0.4 + 0.6) * 0.8 ) { 
    const ufoGroup = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(1.5 * size, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); 
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: color, shininess: 80 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 0.4, 1); 
    ufoGroup.add(body);

    const bottomGeometry = new THREE.SphereGeometry(1.4 * size, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2 ); 
    const bottomMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3).getHex(), shininess: 50}); 
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.scale.set(1, 0.4, 1); 
    bottom.position.y = -0.05 * size * 1.5 * 0.4; 
    ufoGroup.add(bottom);

    if (Math.random() > 0.3) {
        const cockpitGeometry = new THREE.SphereGeometry(0.8 * size, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); 
        const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaff, transparent: true, opacity: 0.4 });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.y = 0.15 * size * 1.5 * 0.4; 
        ufoGroup.add(cockpit);
    }

    ufoGroup.scale.set(0.9, 0.9, 0.9); 
    ufoGroup.userData.type = 'aliensaucer';
    ufoGroup.userData.boundingRadius = 1.5 * size * ufoGroup.scale.x * 1.1; 
    return ufoGroup;
}

function createCoin() {
    const group = new THREE.Group();
    const coinGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16); 
    const coinMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xccad00, shininess: 90 }); 
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2; 
    group.add(coin);

    group.userData.type = 'coin';
    group.userData.boundingRadius = 0.9; 
    return group;
}

function createPlanet() {
    const group = new THREE.Group();
    const planetSize = (Math.random() * 100 + 150) * 2; 
    const planetColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    const planetGeom = new THREE.SphereGeometry(planetSize, 32, 32);
    const planetMat = new THREE.MeshLambertMaterial({ color: planetColor });
    const planet = new THREE.Mesh(planetGeom, planetMat);
    group.add(planet);

    if (Math.random() < 0.8) {
        const ringInnerRadius = planetSize * (Math.random() * 0.3 + 1.2);
        const ringOuterRadius = ringInnerRadius * (Math.random() * 0.5 + 1.2);
        const ringColor = new THREE.Color().setHSL(Math.random(), 0.5, 0.7);
        const ringGeom = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64);
        ringGeom.parameters.innerRadius *= 0.95;
        ringGeom.parameters.outerRadius *= 1.05;
        const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.6 + Math.random() * 0.2 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);
    }

    group.userData.type = 'planet';
    return group;
}

function createMoon() {
    const group = new THREE.Group();
    const moonSize = 80; 
    const moonGeom = new THREE.SphereGeometry(moonSize, 32, 32);
    const moonMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    group.add(moonMesh);

    const craterMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
    for (let i = 0; i < 15; i++) {
        const craterSize = Math.random() * 8 + 2;
        const craterGeom = new THREE.CircleGeometry(craterSize, 16);
        const crater = new THREE.Mesh(craterGeom, craterMat);

        const phi = Math.random() * Math.PI; 
        const theta = Math.random() * Math.PI * 2; 
        const craterPos = new THREE.Vector3();
        craterPos.setFromSphericalCoords(moonSize + 0.1, phi, theta); 
        crater.position.copy(craterPos);
        crater.lookAt(0, 0, 0); 
        group.add(crater);
    }

    group.userData.type = 'moon';
    return group;
}

function createBlackHole() {
    const group = new THREE.Group();
    // Increase the base radius significantly
    const holeRadius = 80 * 16; // Was 80 * 4
    const accretionDiskOuter = holeRadius * 3; // Scales with holeRadius
    const accretionDiskInner = holeRadius * 1.1; // Scales with holeRadius

    const diskGeom = new THREE.RingGeometry(accretionDiskInner, accretionDiskOuter, 64);
    const diskMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const disk = new THREE.Mesh(diskGeom, diskMat);
    disk.rotation.x = Math.PI / 2;
    group.add(disk);
    // Keep track of the disk for animation
    group.userData.disk = disk;

    // Use 0.9 * holeRadius for the central sphere to ensure it's slightly smaller than the inner disk edge
    const centerGeom = new THREE.SphereGeometry(holeRadius * 0.9, 32, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const center = new THREE.Mesh(centerGeom, centerMat);
    group.add(center);
    // Keep track of the center for animation
    group.userData.center = center;


    // Adjust Z position if needed, based on new size, maybe push it further back
    group.position.set(0, planeHeight / 2, -2000); // Pushed further back from -1000
    group.userData.type = 'blackhole';
    group.userData.holeRadius = holeRadius;
    group.userData.diskInnerRadius = accretionDiskInner;
    return group;
}

function createDeathStar() {
    const group = new THREE.Group();
    const mainColor = 0x999999;
    const dishColor = 0x555555;
    const mat = new THREE.MeshPhongMaterial({ color: mainColor, shininess: 10 });
    const dishMat = new THREE.MeshPhongMaterial({ color: dishColor, shininess: 5 });

    const radius = 250; // Significantly larger than star destroyer parts

    // Main sphere
    const sphereGeom = new THREE.SphereGeometry(radius, 48, 32);
    const sphere = new THREE.Mesh(sphereGeom, mat);
    group.add(sphere);

    // Superlaser dish (simplified as an indented circle/sphere cap)
    const dishRadius = radius * 0.3;
    const dishDepth = radius * 0.15; // How much it's indented
    const dishGeom = new THREE.SphereGeometry(dishRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dish = new THREE.Mesh(dishGeom, dishMat);

    // Position the dish on the surface (e.g., along the positive Z axis relative to the sphere center)
    // We need to calculate the position so the base of the cap aligns with the main sphere surface
    // and rotate it to face outwards.
    const dishPositionOffset = radius - dishDepth / 2; // Approximate placement
    dish.position.set(0, radius * 0.3, dishPositionOffset * 0.8); // Place it slightly off-center vertically and forward
    dish.lookAt(0, 0, radius * 1.5); // Point slightly outwards
    dish.scale.y = 0.5; // Flatten the dish slightly
    group.add(dish);

    // Add a subtle trench line (simplified)
    const trenchGeom = new THREE.TorusGeometry(radius * 1.01, 2, 8, 64); // Thin torus slightly outside the sphere
    const trenchMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const trench = new THREE.Mesh(trenchGeom, trenchMat);
    trench.rotation.x = Math.PI / 2; // Align with equator
    group.add(trench);

    group.scale.set(1.0, 1.0, 1.0); // Scale if needed, already quite large
    group.userData.type = 'deathstar'; // Specific type
    return group;
}

function createStarDestroyer() {
    const group = new THREE.Group();
    const mainColor = 0xaaaaaa;
    const detailColor = 0x777777;
    const mat = new THREE.MeshPhongMaterial({ color: mainColor, shininess: 20 });
    const detailMat = new THREE.MeshPhongMaterial({ color: detailColor, shininess: 10 });

    const length = 300;
    const width = 150;
    const height = 50;

    // Main hull shape (wedge)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-width / 2, 0);
    hullShape.lineTo(width / 2, 0);
    hullShape.lineTo(0, length);
    hullShape.lineTo(-width / 2, 0);

    const extrudeSettings = { depth: height * 0.6, bevelEnabled: false };
    const hullGeom = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    const hull = new THREE.Mesh(hullGeom, mat);
    hull.rotation.x = -Math.PI / 2; // Lay flat
    hull.position.y = -height * 0.3; // Center vertically
    group.add(hull);

    // Top superstructure base
    const superstructureBaseGeom = new THREE.BoxGeometry(width * 0.6, height * 0.4, length * 0.4);
    const superstructureBase = new THREE.Mesh(superstructureBaseGeom, mat);
    superstructureBase.position.set(0, height * 0.2, length * 0.2);
    group.add(superstructureBase);

    // Bridge tower base
    const towerBaseGeom = new THREE.BoxGeometry(width * 0.15, height * 0.5, width * 0.15);
    const towerBase = new THREE.Mesh(towerBaseGeom, detailMat);
    towerBase.position.set(0, height * 0.4 + height * 0.25, length * 0.35);
    group.add(towerBase);

     // Bridge top "globes" (simplified)
    const bridgeSphereGeom = new THREE.SphereGeometry(width * 0.05, 8, 6);
    const bridgeSphereMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 50 });
    const sphere1 = new THREE.Mesh(bridgeSphereGeom, bridgeSphereMat);
    sphere1.position.set(width * 0.05, height * 0.4 + height * 0.5 + width * 0.04, length * 0.35);
    group.add(sphere1);
    const sphere2 = new THREE.Mesh(bridgeSphereGeom, bridgeSphereMat);
    sphere2.position.set(-width * 0.05, height * 0.4 + height * 0.5 + width * 0.04, length * 0.35);
    group.add(sphere2);


    // Engine blocks (simplified)
    const engineGeom = new THREE.CylinderGeometry(width * 0.1, width * 0.12, height * 0.5, 8);
    const engineMat = new THREE.MeshPhongMaterial({ color: 0x555599, shininess: 30 });
    const engine1 = new THREE.Mesh(engineGeom, engineMat);
    engine1.rotation.x = Math.PI / 2;
    engine1.position.set(width * 0.15, 0, -length * 0.05);
    group.add(engine1);
    const engine2 = new THREE.Mesh(engineGeom, engineMat);
    engine2.rotation.x = Math.PI / 2;
    engine2.position.set(-width * 0.15, 0, -length * 0.05);
    group.add(engine2);
    const engine3 = new THREE.Mesh(engineGeom, engineMat);
    engine3.rotation.x = Math.PI / 2;
    engine3.scale.set(0.8, 0.8, 0.8);
    engine3.position.set(0, height * 0.1, -length * 0.08);
    group.add(engine3);

    group.scale.set(0.8, 0.8, 0.8); // Scale down a bit
    group.userData.type = 'stardestroyer';
    return group;
}

function startGame() { 
    // Use the globally stored selections
    if (!selectedSpeedSetting || selectedModeIsInvincible === null) {
        console.error("Attempted to start game without selecting speed and/or mode.");
        showStartScreen(); // Go back to selection
        return;
    }
    if (gameActive && !gameWon) return; // Prevent starting if already active

    // Apply selected speed settings
    selectedInitialForwardSpeed = selectedSpeedSetting.initial; // Use the initial from the setting (now default for all)
    selectedMaxSpeed = selectedSpeedSetting.max;
    selectedAcceleration = selectedSpeedSetting.accel;
    // Apply selected mode
    isInvincible = selectedModeIsInvincible;

    score = 0;
    coinCount = 0;
    currentForwardSpeed = selectedInitialForwardSpeed; // Use the selected initial speed
    ufo.position.set(0, 5, 0); 
    ufo.rotation.set(0, 0, 0);
    gameWon = false;
    moonSpawned = false;
    lastPlanetSpawnDistance = ZONE_SPACE_START;
    lastLargeShipSpawnDistance = ZONE_SPACE_START;
    isPaused = false; // Ensure game starts unpaused

    obstacles.forEach(obj => scene.remove(obj));
    obstacles = [];
    coins.forEach(coin => scene.remove(coin));
    coins = [];
    scenery.forEach(item => {
        scene.remove(item);
        item.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
    });
    scenery = [];
    clouds.forEach(cloud => scene.remove(cloud));
    clouds = [];
    if (blackHole) scene.remove(blackHole);
    blackHole = null;
    if (moon) scene.remove(moon);
    moon = null;

    ground.position.z = -4500;
    ground.visible = true;

    // Reset background and fog to initial sky blue
    const initialBgColor = new THREE.Color(0x87CEEB);
    scene.background.set(initialBgColor);
    scene.fog = new THREE.Fog(initialBgColor, 150, 1000);

    createInitialClouds();

    gameActive = true;
    messageContainer.style.display = 'none';
    infoElement.textContent = `Height: 0 m`;
    coinsElement.textContent = `Coins: 0`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`;
    zoneDisplayElement.textContent = 'Zone: Ground Level';
    escapeMessageElement.style.display = 'block'; // Ensure escape message is visible during game

    // Set and show mode display text
    if (isInvincible) {
        modeDisplayElement.textContent = 'You are invincible!';
    } else {
        modeDisplayElement.textContent = 'Avoid the obstacles!';
    }
    modeDisplayElement.style.display = 'block';

    // Show in-game buttons
    pauseButton.textContent = 'Pause';
    pauseButton.classList.remove('paused');
    pauseButton.style.display = 'block';
    restartInGameButton.style.display = 'block';

    clock.start();
    animate();
}

function createCloud() {
    const group = new THREE.Group();
    const puffCount = Math.floor(Math.random() * 3) + 3;
    const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.2
    });

    for (let i = 0; i < puffCount; i++) {
        const puffSize = Math.random() * 10 + 8;
        const puffGeom = new THREE.SphereGeometry(puffSize, 8, 6);
        const puff = new THREE.Mesh(puffGeom, cloudMat);
        puff.position.set(
            (Math.random() - 0.5) * puffSize * 2.5,
            (Math.random() - 0.5) * puffSize * 0.8,
            (Math.random() - 0.5) * puffSize * 1.5
        );
        group.add(puff);
    }
    group.userData.type = 'cloud';
    group.userData.driftSpeed = (Math.random() * 0.1 + 0.05) * (Math.random() > 0.5 ? 1 : -1);
    return group;
}

function createInitialClouds() {
    for (let i = 0; i < initialCloudCount; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * planeWidth * 2.5,
            (Math.random() * planeHeight * 1.5) + 2,
            (Math.random() * -3000) - 1000
        );
        scene.add(cloud);
        clouds.push(cloud);
    }
}

function spawnCloud(forceAhead = false) {
    // Add check to stop spawning clouds in space
    if (score >= ZONE_SPACE_START) {
        return;
    }

    const cloud = createCloud();
    const spawnZ = ufo.position.z - cloudSpawnDistance - (Math.random() * cloudSpawnRangeZ);
    const spawnX = (Math.random() - 0.5) * planeWidth * 3;

    // Adjust vertical spawn based on current height, but keep them possible everywhere
    const baseCloudHeight = planeHeight * 0.5;
    const heightVariance = planeHeight * cloudVerticalSpawnRangeMultiplier;
    const currentHeightInfluence = Math.max(1, score / 2000);
    const spawnY = baseCloudHeight + (Math.random() * heightVariance * currentHeightInfluence) + 1;


    cloud.position.set(spawnX, spawnY, spawnZ);

    if (forceAhead && spawnZ > ufo.position.z - 100) {
        cloud.position.z = ufo.position.z - 100 - Math.random() * cloudSpawnDistance;
    }

    clouds.push(cloud);
    scene.add(cloud);
}

function spawnObstacle(forceAhead = false) {
    let obstacle;
    const currentDistance = score;
    let spawnY;
    let isGroundObstacle = false;

    // Ground Level / Lower Atmosphere Obstacles
    if (currentDistance < ZONE_AIR_END) {
        const type = Math.random();
        if (type < 0.18) { // Reduced chance for house
            obstacle = createHouse();
            isGroundObstacle = true;
        } else if (type < 0.36) { // Reduced chance for building
            obstacle = createBuilding();
            isGroundObstacle = true;
        } else if (type < 0.54) { // Added tanks
            obstacle = createTank();
            isGroundObstacle = true;
        } else if (type < 0.72) { // Adjusted airplane chance
            obstacle = createAirplane();
            spawnY = (Math.random() * planeHeight * 0.8) + 3;
        } else if (type < 0.88) { // Adjusted helicopter chance
            obstacle = createHelicopter();
            spawnY = (Math.random() * planeHeight * 0.8) + 3;
        } else { // Adjusted parachutist chance
            obstacle = createParachutist();
            spawnY = (Math.random() * planeHeight * 0.9) + 2;
        }
    // Upper Atmosphere / Lower Space Transition
    } else if (currentDistance < ZONE_SPACE_START) {
        const type = Math.random();
        if (type < 0.5) obstacle = createAirplane();
        else if (type < 0.8) obstacle = createHelicopter();
        else obstacle = createParachutist();
        spawnY = (Math.random() * planeHeight * 1.2) + 2;
    // Near Space
    } else if (currentDistance < ZONE_NEAR_SPACE_END) {
        obstacle = Math.random() < 0.6 ? createSatellite() : createAsteroid();
        spawnY = (Math.random() * planeHeight * 1.5) + 1;
    // Mid Space
    } else if (currentDistance < ZONE_MID_SPACE_END) {
        obstacle = Math.random() < 0.5 ? createAlienSaucer() : createAsteroid();
        spawnY = (Math.random() * planeHeight * 1.8);
    // Deep Space
    } else {
        obstacle = Math.random() < 0.6 ? createAlienSaucer() : createAsteroid();
        spawnY = (Math.random() * planeHeight * 2.0);
    }

    const spawnDistanceForward = 600 + Math.random() * 400;
    const spawnZ = ufo.position.z - spawnDistanceForward;
    const spawnX = (Math.random() - 0.5) * planeWidth * 2.5;

    if (isGroundObstacle) {
        obstacle.position.set(spawnX, 0, spawnZ); // Set y to 0 for ground obstacles
        obstacle.rotation.set(0, Math.random() * Math.PI * 2, 0); // Random rotation around Y
    } else {
        obstacle.position.set(spawnX, spawnY, spawnZ);
        obstacle.rotation.set(
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25
        );
    }

    // Force spawn ahead logic remains the same
    if (forceAhead && spawnZ > ufo.position.z - 150) {
        obstacle.position.z = ufo.position.z - 150 - Math.random() * 250;
    }

    obstacle.userData.boundingBox = new THREE.Box3();
    // Clear boundingRadius if we want to rely solely on Box3 (might be more accurate for complex shapes)
    // obstacle.userData.boundingRadius = null; // Optional: Uncomment if you prefer Box3 only

    obstacles.push(obstacle);
    scene.add(obstacle);
}

function spawnCoin(forceAhead = false) {
    const coin = createCoin();

    const spawnDistanceForward = 600 + Math.random() * 500;
    const spawnZ = ufo.position.z - spawnDistanceForward;

    const spawnX = (Math.random() - 0.5) * planeWidth * 1.5;
    const spawnY = (Math.random() * (planeHeight * 1.2)) + 1;

    coin.position.set(spawnX, spawnY, spawnZ);

    if (forceAhead && spawnZ > ufo.position.z - 50) {
        coin.position.z = ufo.position.z - 50 - Math.random() * 150;
    }

    coins.push(coin);
    scene.add(coin);
}

function updateObstacles() {
    const removalDistanceBehind = 100;
    const targetObstacleCount = 20;
    const spawnThreshold = targetObstacleCount - 5;

    obstacles = obstacles.filter(obstacle => {
        if (obstacle.position.z > ufo.position.z + removalDistanceBehind) {
            scene.remove(obstacle);
            obstacle.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
            return false;
        }
        // Ensure bounding box exists before trying to set from object
        if (!obstacle.userData.boundingBox) {
            obstacle.userData.boundingBox = new THREE.Box3();
            // Try setting it once here if it was missing
            try { obstacle.userData.boundingBox.setFromObject(obstacle, true); } catch (e) {}
        } else if (obstacle.visible) {
            // Update existing bounding box
            try { obstacle.userData.boundingBox.setFromObject(obstacle, true); } catch (e) {}
        }
        // Check if bounding box is still valid (e.g., not Infinity)
        if (obstacle.userData.boundingBox && !obstacle.userData.boundingBox.isEmpty() && isFinite(obstacle.userData.boundingBox.min.x)) {
            // Box is valid
        } else {
            // Bounding box invalid or failed to compute, maybe use radius as fallback if available
            if (!obstacle.userData.boundingRadius) {
                // If no radius either, estimate based on geometry or position (less accurate)
                // console.warn("Obstacle missing valid bounds:", obstacle.userData.type);
            }
        }

        return true;
    });

    let activeObstacles = obstacles.filter(o => o.position.z < ufo.position.z).length;
    if (activeObstacles < spawnThreshold) {
        const needed = targetObstacleCount - activeObstacles;
        for (let i = 0; i < needed; i++) {
            spawnObstacle();
        }
    }
}

function updateCoins(delta) {
    const removalDistanceBehind = 50;
    const targetCoinCount = 15;
    const spawnThreshold = targetCoinCount - 5;

    coins = coins.filter(coin => {
        if (coin.position.z > ufo.position.z + removalDistanceBehind) {
            scene.remove(coin);
            coin.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
            return false;
        }
        coin.rotation.y += 4 * delta;
        return true;
    });

    if (coins.length < spawnThreshold) {
        const needed = targetCoinCount - coins.length;
        for (let i = 0; i < needed; i++) {
            spawnCoin();
        }
    }
}

function updateClouds(delta) {
    const removalDistanceBehind = 200;

    // If in space, remove all existing clouds and stop processing
    if (score >= ZONE_SPACE_START) {
        if (clouds.length > 0) {
            clouds.forEach(cloud => {
                scene.remove(cloud);
                cloud.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            });
            clouds = []; // Clear the array
        }
        return; // Don't process or spawn new clouds
    }

    clouds = clouds.filter(cloud => {
        if (cloud.position.z > ufo.position.z + removalDistanceBehind) {
            scene.remove(cloud);
            cloud.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            return false;
        }
        // Add subtle drift
        cloud.position.x += cloud.userData.driftSpeed * delta;

        return true;
    });

    // Check if we need to spawn more clouds (only if not in space)
    let activeClouds = clouds.filter(c => c.position.z < ufo.position.z).length;
    if (activeClouds < cloudSpawnThreshold) {
        const needed = targetCloudCount - activeClouds;
        for (let i = 0; i < needed; i++) {
            spawnCloud(); // spawnCloud already checks if we are in space
        }
    }
}

function updateScenery() {
    const currentDistance = score;
    const sceneryRemovalDistance = 25000; // Increased significantly for giant black hole
    const planetSpawnInterval = 400;
    const largeShipSpawnInterval = 90; // Controls frequency of *either* Star Destroyer or Death Star
    const deathStarSpawnChance = 0.2; // 20% chance a large ship spawn is a Death Star

    // Moon spawning logic remains the same...
    if (!moonSpawned && currentDistance > ZONE_NEAR_SPACE_END * 0.8) { // Spawn moon earlier relative to near space end
        moon = createMoon();
        const sideOffset = planeWidth * 4 + Math.random() * 500;
        const vertOffset = planeHeight * 4 + Math.random() * 500;
        const forwardDist = 3000 + Math.random() * 1500;
        moon.position.set(
            (Math.random() > 0.5 ? 1 : -1) * sideOffset,
            (Math.random() > 0.5 ? 1 : -1) * vertOffset,
            ufo.position.z - forwardDist
        );
        moon.lookAt(ufo.position); // Make it face the player initially
        scenery.push(moon);
        scene.add(moon);
        moonSpawned = true;
    }


    scenery = scenery.filter(item => {
        const itemType = item.userData.type;
        // Make sure large scenery uses the larger removal distance
        const removalDist = (itemType === 'planet' || itemType === 'moon' || itemType === 'stardestroyer' || itemType === 'deathstar' || itemType === 'blackhole') ? sceneryRemovalDistance : 500;

        if (item.position.z > ufo.position.z + removalDist) {
            scene.remove(item);
            item.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
            return false;
        }

        // Existing rotation/movement
        if (itemType === 'planet') {
            item.rotation.y += 0.0002;
            item.rotation.x += 0.0001;
        } else if (itemType === 'stardestroyer') {
             // No specific movement needed, they just exist
        } else if (itemType === 'deathstar') {
            item.rotation.y += 0.0001;
            item.rotation.x += 0.00005;
        } else if (itemType === 'moon' && moon) {
            // Optional: Add very slow rotation to the moon
            item.rotation.y += 0.0003;
        }

        return true;
    });

    // Planet and Large Ship Spawning Logic
    if (currentDistance > ZONE_SPACE_START) {
        // Planet spawning
        const distanceSinceLastPlanet = currentDistance - lastPlanetSpawnDistance;
        // Ensure planets don't spawn too close to the final approach zone
        if (currentDistance < ZONE_WIN - 10000 && distanceSinceLastPlanet > planetSpawnInterval && scenery.filter(s => s.userData.type === 'planet' && s.position.z < ufo.position.z - 1000).length < 8) {
            const planet = createPlanet();
            const sideOffset = (planeWidth * 6) + Math.random() * 1500;
            const vertOffset = (planeHeight * 6) + Math.random() * 1500;
            const forwardDist = 4000 + Math.random() * 3000;

            planet.position.set(
                (Math.random() > 0.5 ? 1 : -1) * sideOffset,
                (Math.random() > 0.5 ? 1 : -1) * vertOffset,
                ufo.position.z - forwardDist
            );
            scenery.push(planet);
            scene.add(planet);
            lastPlanetSpawnDistance = currentDistance;
        }

        // Combined Star Destroyer / Death Star Spawning
        const distanceSinceLastLargeShip = currentDistance - lastLargeShipSpawnDistance;
        // Ensure large ships don't spawn too close to the final approach zone
        if (currentDistance < ZONE_WIN - 15000 && distanceSinceLastLargeShip > largeShipSpawnInterval && scenery.filter(s => (s.userData.type === 'stardestroyer' || s.userData.type === 'deathstar') && s.position.z < ufo.position.z - 2000).length < 35) {

            let largeShip;
            if (Math.random() < deathStarSpawnChance) {
                largeShip = createDeathStar();
            } else {
                largeShip = createStarDestroyer();
            }

            const sideOffset = (planeWidth * 8) + Math.random() * 4000;
            const vertOffset = (planeHeight * 8) + Math.random() * 4000;
            const forwardDist = 7000 + Math.random() * 6000;

            largeShip.position.set(
                (Math.random() > 0.5 ? 1 : -1) * sideOffset,
                (Math.random() > 0.5 ? 1 : -1) * vertOffset,
                ufo.position.z - forwardDist
            );
            largeShip.rotation.set(
                (Math.random() - 0.5) * Math.PI * 0.4,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * Math.PI * 0.4
            );

            scenery.push(largeShip);
            scene.add(largeShip);
            lastLargeShipSpawnDistance = currentDistance;
        }
    }

    // Black Hole Logic
    // Create black hole earlier to give player more time to see it
    if (currentDistance > ZONE_WIN - 10000 && !blackHole) { // Create earlier (was ZONE_WIN - 5000)
        blackHole = createBlackHole();
        // Position it relative to the UFO, further ahead
        blackHole.position.z = ufo.position.z - 12000; // Position it far ahead (was -2000 relative to its creation)
        // Center it horizontally, slightly above center vertically
        blackHole.position.x = 0;
        blackHole.position.y = planeHeight * 1.5; // Place it higher

        scene.add(blackHole);
        scenery.push(blackHole); // Add to scenery array for cleanup
    }
    // Update black hole animation if it exists
    if (blackHole && blackHole.userData.disk) {
        blackHole.userData.disk.rotation.z += 0.005; // Spin accretion disk
        if(blackHole.userData.center) blackHole.userData.center.rotation.y += 0.001; // Slowly spin center
    }
}

function checkCollisions() {
    if (!ufo || !ufo.userData.collider || !gameActive || isPaused) return; // Don't check if paused

    ufo.userData.collider.updateWorldMatrix(true, false);
    ufoBoundingBox.setFromObject(ufo.userData.collider);

    if (!isInvincible) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];

            // Prioritize bounding box check if valid
            if (obstacle.userData.boundingBox && !obstacle.userData.boundingBox.isEmpty() && isFinite(obstacle.userData.boundingBox.min.x)) {
                if (ufoBoundingBox.intersectsBox(obstacle.userData.boundingBox)) {
                    gameOver();
                    return;
                }
            }
            // Fallback to radius check if box is invalid or radius exists
            else if (obstacle.userData.boundingRadius) {
                const distance = ufo.position.distanceTo(obstacle.position);
                const ufoRadius = ufoBoundingBox.getSize(new THREE.Vector3()).length() * 0.4;
                if (distance < (ufoRadius + obstacle.userData.boundingRadius * 0.8)) {
                    gameOver();
                    return;
                }
            }
        }
    }

    // Check coins separately
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        // Update coin bounding box before checking
        if (!coin.userData.boundingBox) {
            coin.userData.boundingBox = new THREE.Box3();
        }
        try { coin.userData.boundingBox.setFromObject(coin, true); } catch(e) {}
        if (ufoBoundingBox.intersectsBox(coin.userData.boundingBox)) {
            coinCount++;
            coinsElement.textContent = `Coins: ${coinCount}`;
            scene.remove(coin);
            coin.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            coins.splice(i, 1);
        }
    }
}

function handleInput(delta) {
    if (!gameActive || isPaused) return; // Ignore input if paused

    // Determine if arrow pad is active (visible)
    const isMobileView = getComputedStyle(touchArrowsContainer).display !== 'none';
    const moveSpeed = keyboardStrafeSpeed * delta * 60; // Use same speed for keys and arrows

    let targetX = ufo.position.x;
    let targetY = ufo.position.y;

    // Keyboard OR Touch Arrow Input (Apply speed directly)
    if (keys['arrowleft'] || keys['a'] || touchArrowState.left) {
        targetX -= moveSpeed; // Use updated keyboardStrafeSpeed
    }
    if (keys['arrowright'] || keys['d'] || touchArrowState.right) {
        targetX += moveSpeed; // Use updated keyboardStrafeSpeed
    }
    if (keys['arrowup'] || keys['w'] || touchArrowState.up) {
        targetY += moveSpeed; // Use updated keyboardStrafeSpeed
    }
    if (keys['arrowdown'] || keys['s'] || touchArrowState.down) {
        targetY -= moveSpeed; // Use updated keyboardStrafeSpeed
    }


    // Full Screen Touch Input (only if NOT in mobile view with arrows)
    if (!isMobileView && isTouching) {
        // Calculate delta movement based on sensitivity
        let moveX = touchDeltaX * touchStrafeSensitivity; // Use updated touchStrafeSensitivity
        let moveY = -touchDeltaY * touchStrafeSensitivity; // Y is inverted, use updated sensitivity

        targetX += moveX;
        targetY += moveY;

        // Reset deltas after applying movement for this frame
        // The start positions will be updated in onTouchMove for the *next* frame's delta
        touchDeltaX = 0;
        touchDeltaY = 0;
    }

    // Clamp and Apply position smoothly (Lerp for smoother feel)
    const lerpFactor = 0.2; // Adjust for desired smoothness
    ufo.position.x = THREE.MathUtils.lerp(ufo.position.x, THREE.MathUtils.clamp(targetX, -planeWidth, planeWidth), lerpFactor);
    ufo.position.y = THREE.MathUtils.lerp(ufo.position.y, THREE.MathUtils.clamp(targetY, 1, planeHeight * 1.5), lerpFactor);

    // --- Banking/Pitch based on *intended* direction (keys or arrows) ---
    let horizontalInput = 0;
    if (keys['arrowright'] || keys['d'] || touchArrowState.right) horizontalInput = -1;
    if (keys['arrowleft'] || keys['a'] || touchArrowState.left) horizontalInput = 1;

    let verticalInput = 0;
    if (keys['arrowup'] || keys['w'] || touchArrowState.up) verticalInput = 1;
    if (keys['arrowdown'] || keys['s'] || touchArrowState.down) verticalInput = -1;

    // --- Banking/Pitch based on *touch drag* direction (if active) ---
     if (!isMobileView && isTouching && (touchCurrentX !== touchStartX || touchCurrentY !== touchStartY)) {
         const dragDeltaX = touchCurrentX - touchStartX;
         const dragDeltaY = touchCurrentY - touchStartY;
         // Normalize or scale delta if needed, apply threshold
         const sensitivity = 0.05;
         if (Math.abs(dragDeltaX) > 2) { // Threshold
             horizontalInput = -Math.sign(dragDeltaX) * Math.min(1, Math.abs(dragDeltaX) * sensitivity);
         }
          if (Math.abs(dragDeltaY) > 2) { // Threshold
             verticalInput = -Math.sign(dragDeltaY) * Math.min(1, Math.abs(dragDeltaY) * sensitivity); // Inverted Y
         }
     }

    const targetBank = horizontalInput * Math.PI / 10; // Slightly more bank
    ufo.rotation.z = THREE.MathUtils.lerp(ufo.rotation.z, targetBank, 0.1);

    const targetPitch = verticalInput * Math.PI / 20; // Slightly more pitch
    ufo.rotation.x = THREE.MathUtils.lerp(ufo.rotation.x, targetPitch, 0.1);
}

function onTouchStart(event) {
    // Only handle full-screen drag if arrows aren't visible
    if (getComputedStyle(touchArrowsContainer).display !== 'none') return;
     event.preventDefault(); // Prevent default touch actions like scrolling
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        // Reset current/delta on new touch
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        touchDeltaX = 0;
        touchDeltaY = 0;
        isTouching = true;
    }
}

function onTouchMove(event) {
    // Only handle full-screen drag if arrows aren't visible
    if (getComputedStyle(touchArrowsContainer).display !== 'none') return;
    event.preventDefault(); // Prevent default touch actions like scrolling
    if (isTouching && event.touches.length === 1) {
        const touch = event.touches[0];
        // Update current position
        touchCurrentX = touch.clientX;
        touchCurrentY = touch.clientY;
        // Calculate delta since the START of the drag for this frame's input
        touchDeltaX = touchCurrentX - touchStartX;
        touchDeltaY = touchCurrentY - touchStartY;

        // Don't directly move the UFO here. Let handleInput manage movement.
        // Just update the delta values.
    }
}

function onTouchEnd(event) {
     event.preventDefault(); // Prevent default touch actions
    isTouching = false;
    // Reset deltas when touch ends
    touchDeltaX = 0;
    touchDeltaY = 0;
     // Optionally reset ufo tilt smoothly when touch ends
     // This is handled by the lerp in handleInput when input becomes 0
}

function updateEnvironment(distanceZ) {
    const currentDepth = -distanceZ;
    const spaceTransitionStart = ZONE_SPACE_START;
    const spaceTransitionEnd = spaceTransitionStart + 2000;
    const deepSpaceStart = ZONE_NEAR_SPACE_END;
    const deepSpaceEnd = ZONE_MID_SPACE_END;

    let transitionFactor = 0;

    if (currentDepth > spaceTransitionStart) {
        transitionFactor = Math.min(1, (currentDepth - spaceTransitionStart) / (spaceTransitionEnd - spaceTransitionStart));
    }

    const skyColor = new THREE.Color(0x87CEEB);
    const spaceColor = new THREE.Color(0x000010);
    const currentColor = new THREE.Color().lerpColors(skyColor, spaceColor, transitionFactor);
    scene.background = currentColor;

    const initialFogNear = 150;
    const initialFogFar = 1000;
    const spaceFogNear = 400;
    const spaceFogFar = 3500;
    scene.fog.near = THREE.MathUtils.lerp(initialFogNear, spaceFogNear, transitionFactor);
    scene.fog.far = THREE.MathUtils.lerp(initialFogFar, spaceFogFar, transitionFactor);
    scene.fog.color.copy(currentColor);

    if (currentDepth > spaceTransitionEnd) {
        ground.visible = false;
    } else {
        ground.visible = true;
    }
}

function updateZoneDisplay(currentScore) {
    let zoneName = "Ground Level";
    if (currentScore >= ZONE_WIN_APPROACH) {
        zoneName = "Approaching Singularity";
    } else if (currentScore >= ZONE_DEEP_SPACE_END) {
        zoneName = "Deep Space";
    } else if (currentScore >= ZONE_MID_SPACE_END) {
        zoneName = "Mid Space";
    } else if (currentScore >= ZONE_NEAR_SPACE_END) {
        zoneName = "Near Space";
    } else if (currentScore >= ZONE_SPACE_START) {
        zoneName = "Low Orbit / Exosphere";
    } else if (currentScore >= ZONE_AIR_END / 2) {
        zoneName = "Upper Atmosphere";
    } else if (currentScore > ZONE_GROUND) {
        zoneName = "Lower Atmosphere";
    }

    zoneDisplayElement.textContent = `Zone: ${zoneName}`;
}

function winGame() {
    if (gameWon) return;
    gameActive = false;
    gameWon = true;
    clock.stop();
    endMessageDiv.textContent = `Congratulations!\nYou Reached the Black Hole!\nScore: ${Math.floor(score)}\nCoins: ${coinCount}${isInvincible ? '\n(Invincible Mode)' : ''}`;
    endMessageDiv.style.display = 'block';
    // Hide in-game buttons
    pauseButton.style.display = 'none';
    restartInGameButton.style.display = 'none';
    // Show only the restart options, hide speed/mode/start
    speedOptionsDiv.style.display = 'none';
    modeOptionsDiv.style.display = 'none';
    startButtonContainer.style.display = 'none';
    startOptionsDiv.style.display = 'block'; // Show restart options
    messageContainer.style.display = 'block'; // Show the container
    modeDisplayElement.style.display = 'none';
    escapeMessageElement.style.display = 'none'; // Hide escape message on win screen
}

function gameOver() {
    if (!gameActive || gameWon || isInvincible) return;
    gameActive = false;
    clock.stop();
    endMessageDiv.textContent = `Game Over!\nScore: ${Math.floor(score)}\nCoins: ${coinCount}`;
    endMessageDiv.style.display = 'block';
    // Hide in-game buttons
    pauseButton.style.display = 'none';
    restartInGameButton.style.display = 'none';
    // Show only the restart options, hide speed/mode/start
    speedOptionsDiv.style.display = 'none';
    modeOptionsDiv.style.display = 'none';
    startButtonContainer.style.display = 'none';
    startOptionsDiv.style.display = 'block'; // Show restart options
    messageContainer.style.display = 'block'; // Show the container
    modeDisplayElement.style.display = 'none';
    escapeMessageElement.style.display = 'none'; // Hide escape message on game over screen
}

function animate() {
    // Check game state *before* requesting next frame
    if (!gameActive) return;
    if (isPaused) {
        // If paused, still request the next frame so we can resume later
        requestAnimationFrame(animate);
        // Optional: render one more time to show pause state visually if needed
        // renderer.render(scene, camera);
        return;
    }

    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    // Clamp delta to prevent large jumps if tab loses focus
    const clampedDelta = Math.min(delta, 0.05); // Max delta of 50ms (20 FPS)

    if (currentForwardSpeed < selectedMaxSpeed) {
        currentForwardSpeed += selectedAcceleration * clampedDelta;
        currentForwardSpeed = Math.min(currentForwardSpeed, selectedMaxSpeed);
    }

    handleInput(clampedDelta);

    ufo.position.z -= currentForwardSpeed * clampedDelta;

    score = -ufo.position.z;
    infoElement.textContent = `Height: ${Math.floor(score)} m`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`;
    updateZoneDisplay(score);

    const cameraOffsetX = 0;
    const cameraOffsetY = 5.5;
    const cameraOffsetZ = 10;
    const cameraTargetPosition = new THREE.Vector3(
        ufo.position.x + cameraOffsetX,
        ufo.position.y + cameraOffsetY,
        ufo.position.z + cameraOffsetZ
    );
    camera.position.set(
        ufo.position.x + cameraOffsetX,
        ufo.position.y + cameraOffsetY,
        ufo.position.z + cameraOffsetZ
    );
    const lookAtTargetPosition = new THREE.Vector3(
        ufo.position.x,
        ufo.position.y,
        ufo.position.z - 50 // Look ahead of the UFO
    );

    // Camera lookAt smoothing
    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(camera.position, lookAtTargetPosition, camera.up);
    targetQuaternion.setFromRotationMatrix(tempMatrix);
    camera.quaternion.slerp(targetQuaternion, 0.1); // Use slerp for smooth rotation


    updateObstacles();
    updateCoins(clampedDelta);
    updateClouds(clampedDelta);
    updateScenery();
    checkCollisions();
    if (!gameActive) return; // Check again after collisions

    updateEnvironment(ufo.position.z);

    // Win Condition Check - Check distance to black hole center
    if (!gameWon && score >= ZONE_WIN) {
        if (blackHole && blackHole.userData.center) {
             // Check distance to the black hole's *center position*
            const distToHoleCenter = ufo.position.distanceTo(blackHole.position);
            // Win when getting close to the *inner radius* of the accretion disk
            if (blackHole.userData.diskInnerRadius && distToHoleCenter < blackHole.userData.diskInnerRadius * 1.2) { // Increased multiplier slightly
                winGame();
                return; // Exit animation loop
            }
        } else if (score > ZONE_WIN + 5000) { // Increased fallback distance
            // Fallback win condition if black hole object isn't found correctly
            console.warn("Reached win distance but black hole/center not found or radii missing! Triggering fallback win.");
            winGame();
            return; // Exit animation loop
        }
    }


    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    checkAndUpdateControlsDisplay(); // Update controls text on resize
}

function onKeyDown(event) {
    keys[event.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'p'].includes(event.key.toLowerCase())) { // Add 'p' for pause toggle
        event.preventDefault();
    }
    // Allow pausing with 'P' key
    if (event.key.toLowerCase() === 'p' && gameActive) {
        togglePause();
    }
}

function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

function checkAndUpdateControlsDisplay() {
    // Check if the arrow container is displayed (based on CSS media query)
    const isMobileView = getComputedStyle(touchArrowsContainer).display !== 'none';
    if (isMobileView) {
        controlsElement.innerHTML = 'Controls:<br>Use D-Pad';
    } else {
        controlsElement.innerHTML = 'Controls:<br>Arrows/WASD';
    }
}

function togglePause() {
    if (!gameActive) return; // Can only pause active game

    isPaused = !isPaused;

    if (isPaused) {
        clock.stop();
        pauseButton.textContent = 'Resume';
        pauseButton.classList.add('paused');
        // Optional: Add a visual indicator like darkening the screen or showing text
        // messageContainer.textContent = "Paused"; // Example, might conflict
        // messageContainer.style.display = 'block';
    } else {
        clock.start(); // Resumes timing from where it stopped
        pauseButton.textContent = 'Pause';
        pauseButton.classList.remove('paused');
        // Optional: Hide visual indicator
        // messageContainer.style.display = 'none';

        // Restart the animation loop explicitly
        animate();
    }
}

init();
