import * as THREE from 'three';

let scene, camera, renderer;
let ufo, ufoBoundingBox;
let obstacles = [];
let coins = [];
let scenery = [];
let clouds = [];
let lasers = []; // Array to store active laser beams
let explosionParticles = []; // Array for explosion particles
let coinCollectParticles = []; // Array for coin collection particles
let explosionSoundBuffer = null; // Cache for explosion sound buffer
// Speed settings - will be set by user selection
let selectedInitialForwardSpeed;
let selectedAcceleration;
let selectedMaxSpeed;
// Keep track of the selected *setting object* and mode
let selectedSpeedSetting = null;
let selectedModeIsInvincible = null;

// --- Boost Variables ---
let isBoosting = false;
const boostMaxSpeedMultiplier = 3; // Increase max speed by 200%
const boostAccelerationMultiplier = 10; // Accelerate faster when boosting
let boostSoundSource = null; // To keep track of the active boost sound node
let boostButtonPressed = false; // Track boost button state separately
// --- End Boost Variables ---

// --- Trail Particles ---
const MAX_TRAIL_PARTICLES = 400; // Increased for density
const TRAIL_LIFETIME = 0.15; // seconds - Much shorter lifetime
const TRAIL_SPAWN_INTERVAL = 0.0005; // seconds - Spawn much more frequently
let trailParticles = [];
let trailParticleGeometry;
// Base trail particle material (will be cloned and color changed)
let baseTrailParticleMaterial;
let trailSpawnTimer = 0;
// --- End Trail Particles ---

// Default values (can be overridden)
// Set the standard initial speed
const DEFAULT_INITIAL_FORWARD_SPEED = 25;

// Game speed constants - Updated values
const SPEED_SLOW = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 100, accel: 5 };
const SPEED_MEDIUM = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 200, accel: 15 };
const SPEED_FAST = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 400, accel: 25 };
// Add a placeholder for custom speed, values will be set by user input
const SPEED_CUSTOM = { initial: DEFAULT_INITIAL_FORWARD_SPEED, max: 1000, accel: 50, isCustom: true };

let currentForwardSpeed = DEFAULT_INITIAL_FORWARD_SPEED;
// Separate strafe speeds for keyboard and touch
// Increased speeds
const keyboardStrafeSpeed = 13; // Was 3.5 - Increased significantly
const touchStrafeSensitivity = 1.5; // Was 0.07 - Increased proportionally

const planeWidth = 100; // Increased from 25 for wider maneuverable area
const planeHeight = 70; // Increased from 15 to allow higher movement
// --- Cloud Density Increase ---
const initialCloudCount = 60; // Was 15 (4x increase)
const targetCloudCount = 80;  // Was 20 (4x increase)
const cloudSpawnThreshold = targetCloudCount - 10; // Was 15 (Adjusted relative to new target: target - 10)
// --- End Cloud Density Increase ---
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
let canShoot = true; // Flag to control shooting cooldown
const SHOOT_COOLDOWN = 0.2; // Seconds between shots
let shootCooldownTimer = 0;
const LASER_SPEED = 500; // Speed of the laser beam
const LASER_LIFESPAN = 2.5; // Seconds before laser disappears automatically
// --- NEW: Explosion Constants ---
const EXPLOSION_PARTICLE_COUNT = 15;
const EXPLOSION_PARTICLE_SPEED = 80;
const EXPLOSION_PARTICLE_LIFETIME = 0.6;
const EXPLOSION_PARTICLE_SIZE = 0.3;
// --- NEW: Coin Collection Particle Constants ---
const COIN_PARTICLE_COUNT = 10; // Fewer particles than explosion
const COIN_PARTICLE_SPEED = 50; // Slower speed
const COIN_PARTICLE_LIFETIME = 0.4; // Shorter lifetime
const COIN_PARTICLE_SIZE = 0.5; // Slightly larger size maybe
const COIN_PARTICLE_COLOR = 0xffeb3b; // Yellowish gold

const clock = new THREE.Clock();
let gameStartTime = 0;
let gameElapsedTime = 0;
let lastTimerUpdate = 0;
let timerActive = false;
let finalGameTime = "";
const timerElement = document.getElementById('timer');

// --- NEW: Web Audio ---
let audioContext;
let audioBuffers = {}; // Cache for decoded audio buffers
let currentMusicSource = null; // Track the currently playing music AudioBufferSourceNode
let currentMusicZone = null; // Track the ID/name of the zone for the current music
let masterGainNode; // Master gain node for muting
let isMuted = false; // Mute state
// --- END: Web Audio ---

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
const shootButton = document.getElementById('shoot-button'); // Get shoot button
const boostButton = document.getElementById('boost-button'); // Get boost button
const muteButton = document.getElementById('mute-button'); // Get mute button

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

// --- Zone Constants for Music Mapping ---
const ZONE_ID_GROUND = 'ground';
const ZONE_ID_UPPER_ATMOSPHERE = 'upper_atmosphere';
const ZONE_ID_LOW_ORBIT = 'low_orbit';
const ZONE_ID_NEAR_SPACE = 'near_space';
const ZONE_ID_MID_SPACE = 'mid_space';
const ZONE_ID_DEEP_SPACE = 'deep_space'; // Includes approach
// --- End Zone Constants ---

let blackHole = null; 
let ground; 
let moon = null; 
let moonSpawned = false; 
let lastPlanetSpawnDistance = ZONE_SPACE_START; 
let lastLargeShipSpawnDistance = ZONE_SPACE_START; 
let lastMountainSpawnDistance = 0; // Track mountain spawns separately
const mountainSpawnInterval = 150; // How often to *consider* spawning a mountain (in meters)
const mountainSpawnChance = 0.6; // Chance to spawn a mountain when interval is met

// --- ADJUSTED TARGET COUNTS ---
const targetObstacleCount = 50; // Increased from 20
const targetCoinCount = 6; // Reduced by 70%
const obstacleSpawnThreshold = targetObstacleCount - 15; // Spawn more aggressively 
const coinSpawnThreshold = targetCoinCount - 2;      
// --- END ADJUSTED TARGET COUNTS ---

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
    shootButton.style.display = 'none'; // Hide shoot button
    boostButton.style.display = 'none'; // Hide boost button
    muteButton.style.display = 'none'; // Hide mute button

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

    // Update boost button hint text based on selected max speed
    if (boostButton) {
        const potentialBoostMaxSpeed = speedSetting.max * boostMaxSpeedMultiplier;
        boostButton.title = `Boost (Up to ${potentialBoostMaxSpeed.toFixed(0)} m/s)`;
    }

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

    const groundGeometry = new THREE.PlaneGeometry(5000, 10000); // Increased width from 1000
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

    // --- Initialize Trail Stuff ---
    trailParticleGeometry = new THREE.SphereGeometry(0.08, 4, 3); // Smaller, simpler geometry for smoother look
    // Base trail particle material (will be cloned and color changed)
    baseTrailParticleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa, // Bright yellow-white (default, will be changed)
        transparent: true,
        opacity: 0.7 // Slightly lower initial opacity for better blending
    });
    // --- End Trail Init ---

    // --- Initialize Explosion Particle Pool ---
    explosionParticles.pool = [];
    const explosionParticleGeometry = new THREE.SphereGeometry(EXPLOSION_PARTICLE_SIZE, 4, 3); // Simple geometry
    const explosionParticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true }); // Orange, transparent
    for(let i=0; i< EXPLOSION_PARTICLE_COUNT * 5; i++) { // Create a pool larger than needed per explosion
        const particle = new THREE.Mesh(explosionParticleGeometry.clone(), explosionParticleMaterial.clone());
        particle.visible = false; // Start inactive
        scene.add(particle);
        explosionParticles.pool.push(particle);
    }
    explosionParticles.active = []; // Track active particles
    // --- End Explosion Particle Pool Init ---

    // --- Initialize Coin Collection Particle Pool ---
    coinCollectParticles.pool = [];
    const coinParticleGeometry = new THREE.SphereGeometry(COIN_PARTICLE_SIZE, 4, 3); // Simple geometry
    const coinParticleMaterial = new THREE.MeshBasicMaterial({ color: COIN_PARTICLE_COLOR, transparent: true }); // Use defined color, transparent
    for(let i=0; i < COIN_PARTICLE_COUNT * 5; i++) { // Create a pool
        const particle = new THREE.Mesh(coinParticleGeometry.clone(), coinParticleMaterial.clone());
        particle.visible = false; // Start inactive
        scene.add(particle);
        coinCollectParticles.pool.push(particle);
    }
    coinCollectParticles.active = []; // Track active particles
    // --- End Coin Collection Particle Pool Init ---

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
        startButtonContainer.style.display = 'block'; // Keep start button visible
    });

    confirmCustomSpeedButton.addEventListener('click', () => {
        const maxSpeed = parseInt(customMaxSpeedInput.value, 10);
        const accel = parseInt(customAccelInput.value, 10);

        // --- Initialize AudioContext on user gesture ---
        if (!audioContext) {
             try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext created.");
                // Create Master Gain Node
                masterGainNode = audioContext.createGain();
                masterGainNode.gain.value = 1; // Start unmuted
                masterGainNode.connect(audioContext.destination);
             } catch(e) {
                console.error("Web Audio API is not supported in this browser", e);
             }
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => console.log("AudioContext resumed."));
        }
        // --- End AudioContext Init ---

        // Basic validation - No alert here anymore
        if (isNaN(maxSpeed) || isNaN(accel) || maxSpeed < 10 || accel < 1 || maxSpeed > 2000 || accel > 100) {
             console.warn("Invalid custom speed values entered, using previous or default if first time.");
             customMaxSpeedInput.value = SPEED_CUSTOM.max || 400; // Use previous valid or default
             customAccelInput.value = SPEED_CUSTOM.accel || 20;
            return; // Prevent further action until valid numbers are entered
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

    // Shoot button listener (for mobile)
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent double-tap zoom, etc.
        tryShootLaser();
    }, { passive: false });
    // Add mousedown for desktop testing
    shootButton.addEventListener('mousedown', (e) => {
         e.preventDefault();
         tryShootLaser();
    });

    // Boost Button Listeners
    boostButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        boostButtonPressed = true;
        checkAndUpdateBoostState();
    }, { passive: false });
    boostButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        boostButtonPressed = false;
        checkAndUpdateBoostState();
    });
    boostButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        boostButtonPressed = false;
        checkAndUpdateBoostState();
    });
    // Add mouse events for desktop testing
    boostButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        boostButtonPressed = true;
        checkAndUpdateBoostState();
    });
    boostButton.addEventListener('mouseup', (e) => {
        e.preventDefault();
        boostButtonPressed = false;
        checkAndUpdateBoostState();
    });
    boostButton.addEventListener('mouseleave', (e) => { // Stop boost if mouse leaves while pressed
        e.preventDefault();
        if (boostButtonPressed) {
            boostButtonPressed = false;
            checkAndUpdateBoostState();
        }
    });

    // --- Initialize AudioContext on user gesture ---
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext initialized.");
        // Create Master Gain Node
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 1; // Start unmuted
        masterGainNode.connect(audioContext.destination);

        // Start suspended, requires user interaction to resume
        if (audioContext.state === 'suspended') {
            console.log("AudioContext is suspended. Waiting for user interaction.");
        }
    } catch(e) {
        console.error("Web Audio API is not supported in this browser", e);
    }
    // --- End AudioContext Init ---

    // Mute Button Listener
    muteButton.addEventListener('click', toggleMute);

    showStartScreen(); // Show initial speed selection screen

    // --- Preload Boost Sound ---
    // We initiate the loading here, but don't play it.
    // The actual playback will happen when boosting starts.
    // This helps reduce delay on the first boost.
   
    preloadSound('boost_sound.mp3');
    preloadSound('explosion.mp3');


    // --- End Preload ---
}

// Function to create UFO
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
    const alienHeadGeom = new THREE.SphereGeometry(0.75, 16, 8);
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

// Function to create Airplane
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

    group.scale.set(2.4, 2.4, 2.4); 
    group.userData.type = 'airplane';
    group.userData.boundingRadius = 10; 
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

    group.scale.set(3.6, 3.6, 3.6); 
    group.userData.type = 'helicopter';
    group.userData.boundingRadius = 10; 
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

    group.scale.set(2.4, 2.4, 2.4); 
    group.userData.type = 'parachutist';
    group.userData.boundingRadius = 3 * 2.4; 
    return group;
}

// Function to create Tank
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

    group.scale.set(5.2, 5.2, 5.2); // Make it twice as big AGAIN (was 2.6)
    group.userData.type = 'tank';
    // Estimate bounding box or radius later - for now, rely on Box3 calculation
    group.userData.boundingRadius = Math.max(tankBodyWidth, tankBodyLength) * 0.7 * group.scale.x; // Approximate radius
    return group;
}

// Function to create Satellite
function createSatellite() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 60 });
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x222266, shininess: 10 });

    const bodySize = (Math.random() * 1.0 + 0.8) * 0.8;
    let body;
    const bodyType = Math.random();

    // Randomly choose body shape
    if (bodyType < 0.4) { // Box Body (Original)
        const bodyGeom = new THREE.BoxGeometry(bodySize, bodySize, bodySize);
        body = new THREE.Mesh(bodyGeom, bodyMat);
    } else if (bodyType < 0.7) { // Sphere Body
        const bodyGeom = new THREE.SphereGeometry(bodySize * 0.7, 16, 12); // Slightly smaller radius for sphere
        body = new THREE.Mesh(bodyGeom, bodyMat);
    } else { // Cylinder Body
        const bodyGeom = new THREE.CylinderGeometry(bodySize * 0.6, bodySize * 0.6, bodySize * 1.2, 16); // Taller cylinder
        body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = Math.PI / 2 * (Math.random() > 0.5 ? 1 : 0); // Randomly orient Z or Y up
        body.rotation.z = Math.PI / 2 * (Math.random() > 0.5 ? 1 : 0);
    }
    group.add(body);

    // Keep panel logic mostly the same, adjust attachment point slightly based on size
    const panelWidth = bodySize * (Math.random() * 1.2 + 1.2);
    const panelHeight = bodySize * (Math.random() * 0.4 + 0.4);
    const panelGeom = new THREE.PlaneGeometry(panelWidth, panelHeight);
    panelGeom.translate(panelWidth / 2, 0, 0); // Pivot panel at one end

    const panel1 = new THREE.Mesh(panelGeom, panelMat);
    // Attach panel slightly offset from the body center
    panel1.position.x = bodySize * 0.5 * (bodyType < 0.4 ? 1.0 : 0.7); // Adjust offset based on body type/size factor
    panel1.rotation.y = (Math.random() - 0.5) * 0.5; // Slight random Y rotation
    panel1.material.side = THREE.DoubleSide;
    group.add(panel1);

    const panel2 = new THREE.Mesh(panelGeom.clone(), panelMat.clone());
    panel2.position.x = -bodySize * 0.5 * (bodyType < 0.4 ? 1.0 : 0.7); // Adjust offset
    panel2.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5; // Rotate opposite direction + random variance
    panel2.material.side = THREE.DoubleSide;
    group.add(panel2);


    // Antenna variation (cone or simple cylinder)
    const antennaType = Math.random();
    let antennaGeom;
    if (antennaType < 0.6) { // Cone Antenna (Original)
         antennaGeom = new THREE.ConeGeometry(0.08, 0.6, 8);
         antennaGeom.translate(0, 0.3, 0); // Move base up
    } else { // Cylinder Antenna
         antennaGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8);
         antennaGeom.translate(0, 0.35, 0); // Move base up
    }

    const antenna = new THREE.Mesh(antennaGeom, bodyMat);
    // Position antenna based on body size/shape
    const antennaZOffset = (bodyType < 0.4 ? bodySize / 2 : (bodyType < 0.7 ? bodySize * 0.7 : bodySize * 0.6)) + 0.05; // Adjust offset based on body shape
    antenna.position.z = antennaZOffset;
    antenna.rotation.x = Math.PI / 2;
    group.add(antenna);

    group.scale.set(5.0, 5.0, 5.0); // Make 5 times bigger (was 1.0)
    group.userData.type = 'satellite';
    // Adjust bounding radius calculation slightly - use panel width as dominant factor
    group.userData.boundingRadius = (panelWidth / 2 + bodySize * 0.6) * group.scale.x * 1.1; // Use average body size factor
    return group;
}

// Function to create Asteroid
function createAsteroid() {
    const group = new THREE.Group();
    // Keep base radius randomness
    const radius = (Math.random() * 1.5 + 0.5) * 0.8;
    const asteroidGeometry = new THREE.IcosahedronGeometry(radius, 1);

    // --- Keep vertex displacement for irregularity ---
    const positionAttribute = asteroidGeometry.getAttribute('position');
    const vertices = [];
    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.4);
        vertices.push(vertex.x, vertex.y, vertex.z);
    }
    asteroidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    asteroidGeometry.computeVertexNormals();
    // --- End vertex displacement ---

    const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.05, 0.2, Math.random() * 0.3 + 0.3),
        shininess: 5,
        flatShading: true
    });
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    group.add(asteroid);

    // --- Adjust scale variation to be slightly smaller ---
    // Previous range: 2.0 to 10.0
    // New range: e.g., from 1.5 to 7.0
    const minScale = 1.5; // Reduced min scale
    const maxScale = 7.0; // Reduced max scale
    const newScale = minScale + Math.random() * (maxScale - minScale);
    // --- End scale variation ---

    group.scale.set(newScale, newScale, newScale);
    group.userData.type = 'asteroid';
    // Update bounding radius calculation based on the new variable scale
    group.userData.boundingRadius = radius * 1.2 * group.scale.x;
    return group;
}

// Function to create AlienSaucer
function createAlienSaucer(color = Math.random() * 0xffffff, size = (Math.random() * 0.4 + 0.6) * 0.8 ) {
    const ufoGroup = new THREE.Group();

    const bodyGeometryType = Math.random();
    let bodyGeometry;
    // Add shape variations
    if (bodyGeometryType < 0.6) { // Regular sphere cap
        bodyGeometry = new THREE.SphereGeometry(1.5 * size, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    } else if (bodyGeometryType < 0.85) { // Cone/Triangle-like
        bodyGeometry = new THREE.ConeGeometry(1.5 * size, 1.5 * size * 0.6, 16); // Height 0.6 * radius
        bodyGeometry.translate(0, 1.5 * size * 0.3, 0); // Adjust position
    } else { // Box/Square-like base
        bodyGeometry = new THREE.BoxGeometry(2.2 * size, 0.6 * size, 2.2 * size); // Wider, flatter box
        bodyGeometry.translate(0, -0.3 * size, 0); // Adjust position
    }

    const bodyMaterial = new THREE.MeshPhongMaterial({ color: color, shininess: 80 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // Apply scale only if it's the original sphere type, otherwise shapes handle it
    if (bodyGeometryType < 0.6) {
        body.scale.set(1, 0.4, 1);
    }
    ufoGroup.add(body);

    const bottomGeometry = new THREE.SphereGeometry(1.4 * size, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2 );
    const bottomMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3).getHex(), shininess: 50});
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    // Adjust bottom scale/position based on main body shape
    if (bodyGeometryType < 0.6) { // Original sphere
        bottom.scale.set(1, 0.4, 1);
        bottom.position.y = -0.05 * size * 1.5 * 0.4;
    } else if (bodyGeometryType < 0.85) { // Cone
        bottom.scale.set(0.9, 0.4, 0.9); // Slightly smaller bottom for cone
        bottom.position.y = -0.15 * size; // Adjusted Y
    } else { // Box
         bottom.scale.set(0.8, 0.3, 0.8); // Flatter, smaller bottom for box
         bottom.position.y = -0.6 * size; // Adjusted Y
    }
    ufoGroup.add(bottom);

    if (Math.random() > 0.3) {
        const cockpitGeometry = new THREE.SphereGeometry(0.8 * size, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaff, transparent: true, opacity: 0.4 });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        // Adjust cockpit position based on shape
        if (bodyGeometryType < 0.6) {
             cockpit.position.y = 0.15 * size * 1.5 * 0.4;
        } else if (bodyGeometryType < 0.85) {
             cockpit.position.y = 0.6 * size; // Higher for cone
        } else {
             cockpit.position.y = 0.1 * size; // Lower for box
        }
        ufoGroup.add(cockpit);
    }

    // Make 10 times bigger than the previous scale (0.9)
    const finalScale = 9.0;
    ufoGroup.scale.set(finalScale, finalScale, finalScale);
    ufoGroup.userData.type = 'aliensaucer';
    // Adjust bounding radius based on the new larger scale (use a slightly larger base multiplier to be safe)
    ufoGroup.userData.boundingRadius = 1.8 * size * ufoGroup.scale.x * 1.1; // Was 1.5
    return ufoGroup;
}

// Function to create Coin
function createCoin() {
    const group = new THREE.Group();
    // Increase radius and thickness by 2x AGAIN (was 3.6, 0.75)
    const coinGeometry = new THREE.CylinderGeometry(7.2, 7.2, 1.5, 16); // Was 3.6, 3.6, 0.75
    const coinMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xccad00, shininess: 90 });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    group.add(coin);

    group.userData.type = 'coin';
    // Update bounding radius to match new size
    group.userData.boundingRadius = 7.6; // Was 3.8
    return group;
}

// Function to create Planet
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

// Function to create Moon
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

// Function to create BlackHole
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
    // Keep track of the center for animation AND collision
    group.userData.center = center;
    // Add bounding box for collision detection with the center sphere
    group.userData.center.userData.boundingBox = new THREE.Box3();

    // Adjust Z position if needed, based on new size, maybe push it further back
    group.position.set(0, planeHeight / 2, -2000); // Pushed further back from -1000
    group.userData.type = 'blackhole';
    group.userData.holeRadius = holeRadius;
    group.userData.diskInnerRadius = accretionDiskInner;
    return group;
}

// Function to create DeathStar
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

// Function to create StarDestroyer
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

// Function to create Laser Beam
function createLaserBeam() {
    // Change geometry to a cylinder
    const laserRadius = 0.15 * 3; // Was 0.15 - Increased radius by 3x
    const laserLength = 5.0; // Keep length the same for now
    const laserGeometry = new THREE.CylinderGeometry(laserRadius, laserRadius, laserLength, 8); // radiusTop, radiusBottom, height, radialSegments
    // Rotate the geometry so the length points along the Z-axis (forward/backward)
    laserGeometry.rotateX(Math.PI / 2);

    // Bright emissive material for laser look
    const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red laser
    });
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    laser.userData.lifetime = LASER_LIFESPAN; // Set initial lifetime
    laser.userData.boundingBox = new THREE.Box3(); // Add bounding box
    // Store length for potential collision adjustments later if needed
    laser.userData.length = laserLength;
    return laser;
}

// Function to start the game
function startGame() { 
    // --- Ensure AudioContext is running ---
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed on game start.");
            // Attempt to start music immediately after resume, if zone is already determined
            if (gameActive) { // Check if game logic already started somehow
                updateZoneDisplay(score); // This will trigger music check
            }
        }).catch(err => {
            console.error("Error resuming AudioContext:", err);
        });
    } else if (!audioContext) {
        // Attempt to create if it wasn't created by button clicks
        try {
             audioContext = new (window.AudioContext || window.webkitAudioContext)();
             console.log("AudioContext created on game start.");
             // Create Master Gain Node
             masterGainNode = audioContext.createGain();
             masterGainNode.gain.value = 1; // Start unmuted
             masterGainNode.connect(audioContext.destination);

             if (audioContext.state === 'suspended') {
                 audioContext.resume(); // Try immediate resume
             }
        } catch(e) {
             console.error("Web Audio API is not supported in this browser", e);
        }
    }
    // --- End AudioContext Check ---

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
    lastMountainSpawnDistance = 0; // Reset mountain spawn tracker
    canShoot = true; // Reset shooting ability
    shootCooldownTimer = 0;

    // --- Reset Trail ---
    trailParticles.forEach(p => scene.remove(p));
    trailParticles = [];
    trailSpawnTimer = 0;
    // --- End Reset Trail ---

    // --- Reset Lasers ---
    lasers.forEach(l => {
        scene.remove(l);
        if (l.geometry) l.geometry.dispose();
        if (l.material) l.material.dispose();
    });
    lasers = [];
    // --- End Reset Lasers ---

    // --- Reset Boost State ---
    isBoosting = false;
    stopBoostSound(); // Ensure sound is stopped if game restarts mid-boost
    boostButton.classList.remove('active');
    // --- End Reset Boost State --


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
    scene.background = initialBgColor;
    scene.fog = new THREE.Fog(initialBgColor, 150, 1000);

    createInitialClouds();

    gameActive = true;
    
    // Initialize and start the timer
    gameStartTime = Date.now();
    lastTimerUpdate = gameStartTime;
    timerActive = true;
    gameElapsedTime = 0;
    timerElement.textContent = "Time: 0:00";

    messageContainer.style.display = 'none';
    infoElement.textContent = `Height: 0 m`;
    coinsElement.textContent = `Coins: 0`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`;
    updateZoneDisplay(score);

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
    shootButton.style.display = 'block'; // Show shoot button
    boostButton.style.display = 'block'; // Show boost button
    muteButton.style.display = 'block'; // Show mute button

    // Update boost button hint text based on selected max speed (in case it wasn't set before)
    if (boostButton && selectedSpeedSetting) {
        const potentialBoostMaxSpeed = selectedSpeedSetting.max * boostMaxSpeedMultiplier;
        boostButton.title = `Boost (Up to ${potentialBoostMaxSpeed.toFixed(0)} m/s)`;
    }

    ufo.visible = true;
    ufo.position.set(0, 5, 0); 
    ufo.rotation.set(0, 0, 0);

    clock.start();
    animate();
}

// Function to create Cloud
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

// Function to create Initial Clouds
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

// Function to spawn Cloud
function spawnCloud(forceAhead = false) {
    // Add check to stop spawning clouds in space
    if (score >= ZONE_SPACE_START) {
        return;
    }

    const cloud = createCloud();
    const spawnZ = ufo.position.z - cloudSpawnDistance - (Math.random() * cloudSpawnRangeZ);
    const spawnX = (Math.random() - 0.5) * planeWidth * 3.5; // Use wider planeWidth (was * 2.5)

    // Ensure clouds spawn within the UFO's reachable vertical area
    // UFO clamp is [1, planeHeight]
    // (Math.random() * (planeHeight - 1)) gives range [0, planeHeight - 1)
    // Adding 1 shifts the range to [1, planeHeight)
    // This keeps clouds within the reachable vertical space.
    const spawnY = (Math.random() * (planeHeight - 1)) + 1;

    cloud.position.set(spawnX, spawnY, spawnZ);

    if (forceAhead && spawnZ > ufo.position.z - 100) {
        cloud.position.z = ufo.position.z - 100 - Math.random() * cloudSpawnDistance;
    }

    clouds.push(cloud);
    scene.add(cloud);
}

// Function to spawn Obstacle
function spawnObstacle(forceAhead = false) {
    let obstacle;
    const currentDistance = score;
    let spawnY;
    let isGroundObstacle = false;
    // Define vertical spawn range based on the doubled planeHeight
    const verticalSpawnRange = planeHeight * 0.95; // Use 95% of the new height
    const baseSpawnY = 2; // Minimum spawn height above ground

    // Ground Level / Lower Atmosphere Obstacles
    if (currentDistance < ZONE_AIR_END) {
        const type = Math.random();
        // Removed house spawning (was type < 0.18)
        // Adjust subsequent probabilities
        if (type < 0.25) { // Was 0.36 -> Increased range for building
            obstacle = createBuilding();
            isGroundObstacle = true;
        } else if (type < 0.50) { // Was 0.54 -> Increased range for tank
            obstacle = createTank();
            isGroundObstacle = true;
        } else if (type < 0.70) { // Was 0.72 -> Adjusted airplane chance
            obstacle = createAirplane();
            spawnY = (Math.random() * verticalSpawnRange) + baseSpawnY; // Spawn higher
        } else if (type < 0.88) { // Kept helicopter chance same relative range
            obstacle = createHelicopter();
            spawnY = (Math.random() * verticalSpawnRange) + baseSpawnY; // Spawn higher
        } else { // Remaining range for parachutist
            obstacle = createParachutist();
            spawnY = (Math.random() * verticalSpawnRange) + baseSpawnY; // Spawn higher
        }
    // Upper Atmosphere / Lower Space Transition
    } else if (currentDistance < ZONE_SPACE_START) {
        const type = Math.random();
        if (type < 0.5) obstacle = createAirplane();
        else if (type < 0.8) obstacle = createHelicopter();
        else obstacle = createParachutist();
        spawnY = (Math.random() * verticalSpawnRange * 1.1) + baseSpawnY; // Spawn even higher
    // Near Space
    } else if (currentDistance < ZONE_NEAR_SPACE_END) {
        obstacle = Math.random() < 0.6 ? createSatellite() : createAsteroid();
        spawnY = (Math.random() * verticalSpawnRange * 1.3) + (planeHeight * 0.1); // Shift base higher too
    // Mid Space
    } else if (currentDistance < ZONE_MID_SPACE_END) {
        obstacle = Math.random() < 0.5 ? createAlienSaucer() : createAsteroid();
        spawnY = (Math.random() * verticalSpawnRange * 1.5) + (planeHeight * 0.2); // Shift base higher too
    // Deep Space
    } else {
        obstacle = Math.random() < 0.6 ? createAlienSaucer() : createAsteroid();
        spawnY = (Math.random() * verticalSpawnRange * 1.6) + (planeHeight * 0.2); // Shift base higher too
    }

    const spawnDistanceForward = 600 + Math.random() * 400;
    const spawnZ = ufo.position.z - spawnDistanceForward;
    const spawnX = (Math.random() - 0.5) * planeWidth * 3.5; // Use wider planeWidth (was * 2.5)

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

// Function to spawn Coin
function spawnCoin(forceAhead = false) {
    const coin = createCoin();

    const spawnDistanceForward = 600 + Math.random() * 500;
    const spawnZ = ufo.position.z - spawnDistanceForward;

    // Ensure coins spawn within the UFO's reachable horizontal area
    // UFO clamp is [-planeWidth, planeWidth]
    // (Math.random() - 0.5) gives range [-0.5, 0.5]
    // Multiply by planeWidth * 2 to get [-planeWidth, planeWidth]
    // Use slightly less (e.g., * 1.9) to avoid spawning exactly at the edge
    const spawnX = (Math.random() - 0.5) * planeWidth * 1.9;

    // Ensure coins spawn within the UFO's reachable vertical area
    // UFO clamp is [1, planeHeight]
    // (Math.random() * (planeHeight - 1)) gives range [0, planeHeight - 1)
    // Adding 1 shifts the range to [1, planeHeight)
    // This keeps coins within the reachable vertical space.
    const spawnY = (Math.random() * (planeHeight - 1)) + 1;

    coin.position.set(spawnX, spawnY, spawnZ);

    if (forceAhead && spawnZ > ufo.position.z - 50) {
        coin.position.z = ufo.position.z - 50 - Math.random() * 150;
    }

    coins.push(coin);
    scene.add(coin);
}

// Function to update Obstacles
function updateObstacles() {
    const removalDistanceBehind = 100;
    // Using constants defined above for target count and threshold

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
    // Use the defined threshold constant
    if (activeObstacles < obstacleSpawnThreshold) {
        const needed = targetObstacleCount - activeObstacles;
        for (let i = 0; i < needed; i++) {
            spawnObstacle();
        }
    }
}

// Function to update Coins
function updateCoins(delta) {
    const removalDistanceBehind = 50;
    // Using constants defined above for target count and threshold

    coins = coins.filter(coin => {
        if (coin.position.z > ufo.position.z + removalDistanceBehind) {
            scene.remove(coin);
            coin.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
            return false;
        }
        coin.rotation.y += 4 * delta;
        return true;
    });

    // Use the defined threshold constant
    if (coins.length < coinSpawnThreshold) {
        const needed = targetCoinCount - coins.length;
        for (let i = 0; i < needed; i++) {
            spawnCoin();
        }
    }
}

// Function to update Clouds
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
            cloud.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
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

// Function to update Scenery
function updateScenery() {
    const currentDistance = score;
    const sceneryRemovalDistance = 25000; // Increased significantly for giant black hole
    const planetSpawnInterval = 100; // Halved from 200 (was 400 originally)
    const largeShipSpawnInterval = 10; // Reduced from 30 (was 90 originally) - Increased spawn rate significantly
    const deathStarSpawnChance = 0.2; // 20% chance a large ship spawn is a Death Star

    // --- Mountain Spawning ---
    const distanceSinceLastMountain = currentDistance - lastMountainSpawnDistance;
    // Spawn mountains only before low orbit starts
    if (currentDistance < ZONE_SPACE_START && distanceSinceLastMountain > mountainSpawnInterval) {
        if (Math.random() < mountainSpawnChance) {
            const mountain = createMountain();
            // --- WIDER SCENERY OFFSET ---
            const sideOffset = (planeWidth * 2.5) + Math.random() * 1500; // Wider base offset (was planeWidth * 1.5 + rnd * 800)
            // --- END WIDER SCENERY OFFSET ---
            const forwardDist = 1500 + Math.random() * 2000; // Further ahead

            mountain.position.set(
                (Math.random() > 0.5 ? 1 : -1) * sideOffset,
                0, // Base on the ground
                ufo.position.z - forwardDist
            );
             // Random rotation around Y for variation
            mountain.rotation.y = Math.random() * Math.PI * 2;
            scenery.push(mountain);
            scene.add(mountain);
        }
         // Always update the last spawn distance check, even if we didn't spawn one this time
        lastMountainSpawnDistance = currentDistance;
    }
     // --- End Mountain Spawning ---

    // Moon spawning logic remains the same...
    if (!moonSpawned && currentDistance > ZONE_NEAR_SPACE_END * 0.8) { // Spawn moon earlier relative to near space end
        moon = createMoon();
        // --- WIDER SCENERY OFFSET ---
        const sideOffset = planeWidth * 6 + Math.random() * 1000; // Wider base offset (was planeWidth * 4 + rnd * 500)
        const vertOffset = planeHeight * 8 + Math.random() * 1000; // Increased vertical offset too
        // --- END WIDER SCENERY OFFSET ---
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
        const removalDist = (itemType === 'planet' || itemType === 'moon' || itemType === 'stardestroyer' || itemType === 'deathstar' || itemType === 'blackhole' || itemType === 'mountain') ? sceneryRemovalDistance : 500; // Include mountains

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
        } else if (itemType === 'mountain') {
            // Mountains are static, no update needed here
        } else if (itemType === 'blackhole' && item.userData.center) {
            // Update black hole animation if it exists
            item.userData.disk.rotation.z += 0.005; // Spin accretion disk
            item.userData.center.rotation.y += 0.001; // Slowly spin center
            // Update the center's bounding box for collision detection
            try {
                item.userData.center.updateWorldMatrix(true, false); // Ensure world matrix is up-to-date
                item.userData.center.userData.boundingBox.setFromObject(item.userData.center, true);
            } catch (e) {
                 // console.warn("Could not update black hole center bounding box:", e);
            }
        }

        return true;
    });

    // Planet and Large Ship Spawning Logic
    if (currentDistance > ZONE_SPACE_START) {
        // Planet spawning
        const distanceSinceLastPlanet = currentDistance - lastPlanetSpawnDistance;
        // Ensure planets don't spawn too close to the final approach zone
        // Increase max count to 32 (was 16, originally 8)
        if (currentDistance < ZONE_WIN - 10000 && distanceSinceLastPlanet > planetSpawnInterval && scenery.filter(s => s.userData.type === 'planet' && s.position.z < ufo.position.z - 1000).length < 32) {
            const planet = createPlanet();
            // --- WIDER SCENERY OFFSET ---
            const sideOffset = (planeWidth * 8) + Math.random() * 3000; // Wider base offset (was planeWidth * 6 + rnd * 1500)
            const vertOffset = (planeHeight * 10) + Math.random() * 3000; // Adjusted vertical offset multiplier based on NEW planeHeight
            // --- END WIDER SCENERY OFFSET ---
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
        // Increase max count to 420 (was 105, originally 35)
        if (currentDistance < ZONE_WIN - 15000 && distanceSinceLastLargeShip > largeShipSpawnInterval && scenery.filter(s => (s.userData.type === 'stardestroyer' || s.userData.type === 'deathstar') && s.position.z < ufo.position.z - 2000).length < 420) {

            let largeShip;
            if (Math.random() < deathStarSpawnChance) {
                largeShip = createDeathStar();
            } else {
                largeShip = createStarDestroyer();
            }

            // --- WIDER SCENERY OFFSET ---
            const sideOffset = (planeWidth * 10) + Math.random() * 6000; // Wider base offset (was planeWidth * 8 + rnd * 4000)
            const vertOffset = (planeHeight * 12) + Math.random() * 6000; // Adjusted vertical offset multiplier based on NEW planeHeight
            // --- END WIDER SCENERY OFFSET ---
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
        blackHole.position.y = planeHeight * 0.8; // Place it higher relative to NEW planeHeight

        scene.add(blackHole);
        scenery.push(blackHole); // Add to scenery array for cleanup
    }
    // NOTE: Black hole update (rotation, bounding box) is now handled within the scenery filter loop above.
}

// Function to handle animation
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

    // --- Speed Update Logic (Handles Boosting) ---
    let currentMaxSpeed = selectedMaxSpeed;
    let currentAcceleration = selectedAcceleration;

    if (isBoosting) {
        currentMaxSpeed *= boostMaxSpeedMultiplier;
        currentAcceleration *= boostAccelerationMultiplier;
    }

    if (currentForwardSpeed < currentMaxSpeed) {
        currentForwardSpeed += currentAcceleration * clampedDelta;
        currentForwardSpeed = Math.min(currentForwardSpeed, currentMaxSpeed);
    } else if (currentForwardSpeed > currentMaxSpeed) {
        // If not boosting and speed is higher than normal max, decelerate naturally
        // Apply a deceleration rate equal to the boost acceleration rate
        const deccel = selectedAcceleration * boostAccelerationMultiplier; // Decelerate at same rate as boost acceleration
        currentForwardSpeed -= deccel * clampedDelta;
        currentForwardSpeed = Math.max(currentForwardSpeed, currentMaxSpeed); // Don't go below normal max
    }
    // --- End Speed Update Logic ---

    handleInput(clampedDelta);
    updateTrail(clampedDelta);
    updateLasers(clampedDelta);
    updateExplosions(clampedDelta);
    updateCoinCollectParticles(clampedDelta);

    ufo.position.z -= currentForwardSpeed * clampedDelta;

    score = -ufo.position.z;
    infoElement.textContent = `Height: ${Math.floor(score)} m`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`;
    updateZoneDisplay(score);

    const cameraOffsetX = 0;
    const cameraOffsetY = 6.5; // Slightly increased offset to see more vertical space (was 5.5)
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

    // Win Condition Check - Check for collision with black hole center
    if (!gameWon && score >= ZONE_WIN_APPROACH) { // Start checking when approaching
        if (blackHole && blackHole.userData.center && blackHole.userData.center.userData.boundingBox) {
            // Ensure UFO bounding box is up-to-date
            ufo.userData.collider.updateWorldMatrix(true, false);
            ufoBoundingBox.setFromObject(ufo.userData.collider);

             // Check for intersection between UFO collider and black hole center sphere
            if (ufoBoundingBox.intersectsBox(blackHole.userData.center.userData.boundingBox)) {
                winGame();
                return; // Exit animation loop
            }
        }
         // --- Fallback win condition if collision doesn't trigger for some reason ---
         else if (score > ZONE_WIN + 5000) { // Increased fallback distance
            // Fallback win condition if black hole object isn't found correctly or collision fails
            console.warn("Reached win distance but black hole collision did not trigger! Triggering fallback win.");
            winGame();
            return; // Exit animation loop
        }
        // --- End Fallback ---
    }

    updateGameTimer();

    renderer.render(scene, camera);
}

// Function to check Collisions
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
        try { coin.userData.boundingBox.setFromObject(coin); } catch(e) {}
        if (ufoBoundingBox.intersectsBox(coin.userData.boundingBox)) {
            coinCount++;
            coinsElement.textContent = `Coins: ${coinCount}`;
            createCoinCollectParticles(coin.position);
            playCoinSound();
            scene.remove(coin);
            coin.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            coins.splice(i, 1);
        }
    }
}

// Function to handle Input
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

    // --- Boost Check (Keyboard - Shift) ---
    // Keys['shift'] is automatically handled by onKeyDown/onKeyUp
    if (keys['shift'] && !isBoosting) {
        checkAndUpdateBoostState();
    } else if (!keys['shift'] && isBoosting && !boostButtonPressed) { // Stop if key released AND touch button isn't active
        checkAndUpdateBoostState();
    }
    // --- End Boost Check ---

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
    // Use the new planeHeight for vertical clamp
    ufo.position.y = THREE.MathUtils.lerp(ufo.position.y, THREE.MathUtils.clamp(targetY, 1, planeHeight), lerpFactor);

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

// Function to handle Touch Start
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

// Function to handle Touch Move
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

// Function to handle Touch End
function onTouchEnd(event) {
     event.preventDefault(); // Prevent default touch actions
    isTouching = false;
    // Reset deltas when touch ends
    touchDeltaX = 0;
    touchDeltaY = 0;
     // Optionally reset ufo tilt smoothly when touch ends
     // This is handled by the lerp in handleInput when input becomes 0
}

// Function to update Environment
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

// Function to update Zone Display
function updateZoneDisplay(currentScore) {
    let zoneName = "Ground Level";
    let zoneId = ZONE_ID_GROUND;
    let musicUrl = 'ground_music.mp3'; // Default music

    if (currentScore >= ZONE_WIN_APPROACH) {
        zoneName = "Approaching Singularity";
        zoneId = ZONE_ID_DEEP_SPACE; // Use deep space music for approach
        musicUrl = 'deep_space_music.mp3';
    } else if (currentScore >= ZONE_DEEP_SPACE_END) {
        // This specific threshold might not be reached if ZONE_WIN_APPROACH is lower
        zoneName = "Deep Space";
        zoneId = ZONE_ID_DEEP_SPACE;
        musicUrl = 'deep_space_music.mp3';
    } else if (currentScore >= ZONE_MID_SPACE_END) {
        zoneName = "Mid Space";
        zoneId = ZONE_ID_MID_SPACE;
        musicUrl = 'mid_space_music.mp3';
    } else if (currentScore >= ZONE_NEAR_SPACE_END) {
        zoneName = "Near Space";
        zoneId = ZONE_ID_NEAR_SPACE;
        musicUrl = 'near_space_music.mp3';
    } else if (currentScore >= ZONE_SPACE_START) {
        zoneName = "Low Orbit / Exosphere";
        zoneId = ZONE_ID_LOW_ORBIT;
        musicUrl = 'low_orbit_music.mp3';
    } else if (currentScore >= ZONE_AIR_END) {
        zoneName = "Upper Atmosphere";
        zoneId = ZONE_ID_UPPER_ATMOSPHERE;
        musicUrl = 'upper_atmosphere_music.mp3';
    } else if (currentScore >= ZONE_AIR_END / 2) {
        zoneName = "Lower Atmosphere";
        zoneId = ZONE_ID_GROUND; // Use ground music for lower atmosphere too
        musicUrl = 'ground_music.mp3';
    }
    // Ensure ZONE_GROUND case falls through to the default

    zoneDisplayElement.textContent = `Zone: ${zoneName}`;

    // --- Music Switching Logic ---
    if (zoneId !== currentMusicZone && gameActive && !isPaused) {
        // console.log(`Switching music from ${currentMusicZone} to ${zoneId}`); // Debug
        stopCurrentMusic(); // Stop previous music first
        loadAndPlayMusic(musicUrl, zoneId);
    }
    // --- End Music Switching Logic ---
}

// Function to win the game
function winGame() {
    if (gameWon) return;
    gameActive = false;
    gameWon = true;
    clock.stop();
    stopCurrentMusic(); // Stop music on win
    stopBoostSound(); // Ensure boost sound is stopped
    stopGameTimer();
    
    // Add win-message class for styling
    endMessageDiv.className = 'win-message';
    
    // Update the end message with more emphasis
    endMessageDiv.textContent = `VICTORY!\nYou Reached the Black Hole!\nScore: ${Math.floor(score)}\nCoins: ${coinCount}\nTime: ${finalGameTime}${isInvincible ? '\n(Invincible Mode)' : ''}`;
    
    // Show message container with restart options
    messageContainer.style.display = 'block';
    startOptionsDiv.style.display = 'block';
    endMessageDiv.style.display = 'block';
    
    // Play a victory sound if audio is available
    if (audioContext && audioContext.state === 'running') {
        playVictorySound();
    }
}

// Function to handle game over
function gameOver() {
    if (!gameActive || gameWon || isInvincible) return;
    gameActive = false;
    clock.stop();
    stopCurrentMusic(); // Stop music on game over
    stopBoostSound(); // Ensure boost sound is stopped
    stopGameTimer();

    // Create explosion at UFO's last position
    createExplosion(ufo.position); // This now plays the explosion sound

    // Do not hide UFO visually
    // ufo.visible = false;  // Removed

    // Remove any win-message class and ensure default styling
    endMessageDiv.className = '';

    // Update the end message with more emphasis
    endMessageDiv.textContent = `GAME OVER!\nYour flight has ended.\nScore: ${Math.floor(score)}\nCoins: ${coinCount}\nTime: ${finalGameTime}`;

    // Show message container with restart options
    messageContainer.style.display = 'block';
    startOptionsDiv.style.display = 'block';
    endMessageDiv.style.display = 'block';

    // Play defeat sound if audio is available
    if (audioContext && audioContext.state === 'running') {
        playDefeatSound();
    }
}

// Function to update Trail
function updateTrail(delta) {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        const particle = trailParticles[i];

        particle.userData.lifetime -= delta;

        if (particle.userData.lifetime <= 0) {
            scene.remove(particle);
            trailParticles.splice(i, 1);
        } else {
            // Fade out and shrink smoothly
            const lifeRatio = Math.max(0, particle.userData.lifetime / TRAIL_LIFETIME); // Ensure lifeRatio doesn't go negative
            particle.material.opacity = lifeRatio * 0.7; // Fade out based on life ratio and initial opacity
            const currentScale = particle.userData.initialScale * lifeRatio;
            particle.scale.setScalar(Math.max(currentScale, 0.01)); // Shrink, but not to zero instantly

            // Optional: Move particles backward slightly (relative to world Z) to enhance trail effect
            // particle.position.z += currentForwardSpeed * delta * 0.05; // Move much slower than UFO
        }
    }

    // Spawn new particles based on timer
    trailSpawnTimer += delta;
    // Spawn potentially multiple particles per frame if delta is large and interval is small
    while (trailSpawnTimer >= TRAIL_SPAWN_INTERVAL) {
        spawnTrailParticle();
        trailSpawnTimer -= TRAIL_SPAWN_INTERVAL; // Subtract interval, don't just reset to 0
    }
}

// Function to spawn Trail Particle
function spawnTrailParticle() {
    if (trailParticles.length >= MAX_TRAIL_PARTICLES - 1) { // Check if limit reached for adding two
        // Remove the oldest particle if we're at the limit
        const oldestParticle1 = trailParticles.shift(); // Remove from beginning
        const oldestParticle2 = trailParticles.shift(); // Remove second oldest
        scene.remove(oldestParticle1);
        scene.remove(oldestParticle2);
        // No need to dispose geometry/material as they are shared/reused
    }

    let trailColor;
    let initialScaleMultiplier = 1.0; // Default scale multiplier

    // --- Determine Trail Color and Scale based on Boost and Zone ---
    if (isBoosting) {
        trailColor = 0xff4500; // Fiery Orange/Red for boost
        initialScaleMultiplier = 1.3; // Make boost trail particles slightly larger
    } else {
        // Use existing zone-based color logic when not boosting
        const currentScore = score; // Use the global score
        if (currentScore >= ZONE_WIN_APPROACH) {
            trailColor = 0xff00ff; // Approaching Singularity: Magenta
        } else if (currentScore >= ZONE_DEEP_SPACE_END) {
            trailColor = 0xaa88ff; // Deep Space: Purple
        } else if (currentScore >= ZONE_MID_SPACE_END) {
            trailColor = 0xff4444; // Mid Space: Red
        } else if (currentScore >= ZONE_NEAR_SPACE_END) {
            trailColor = 0xffa500; // Near Space: Orange
        } else if (currentScore >= ZONE_SPACE_START) {
            trailColor = 0xffffff; // Low Orbit / Exosphere: White
        } else if (currentScore >= ZONE_AIR_END) {
            trailColor = 0x00ffff; // Transition Zone (Air -> Space): Cyan
        } else if (currentScore >= ZONE_AIR_END / 2) {
            trailColor = 0xadd8e6; // Upper Atmosphere: Light Blue
        } else {
             trailColor = 0xffffaa; // Default: Bright Yellow/White
        }
    }
    // --- End Determine Trail Color and Scale ---

    // Clone the base material for each particle to set unique color
    const currentTrailMaterial = baseTrailParticleMaterial.clone();
    currentTrailMaterial.color.setHex(trailColor);
    // Optionally make boosting particles more emissive/brighter
    if (isBoosting) {
         // currentTrailMaterial.emissive = new THREE.Color(trailColor).multiplyScalar(0.5); // Example: Add emissive property
         currentTrailMaterial.opacity = 0.9; // Make boost particles slightly more opaque initially
    }

    const ufoWidth = 1.5 * 0.9 * 1.1; // Approximate half-width + slight increase
    const yOffset = -0.15; // Slightly lower offset
    const zOffset = 0.2; // Slightly closer behind the center

    // Left particle
    const particleLeft = new THREE.Mesh(trailParticleGeometry, currentTrailMaterial); // Use the cloned material
    const spawnOffsetLeft = new THREE.Vector3(-ufoWidth, yOffset, zOffset);
    spawnOffsetLeft.applyQuaternion(ufo.quaternion);
    particleLeft.position.copy(ufo.position).add(spawnOffsetLeft);
    particleLeft.userData.lifetime = TRAIL_LIFETIME;
    // Apply scale multiplier
    particleLeft.userData.initialScale = (1.0 + Math.random() * 0.5) * initialScaleMultiplier;
    particleLeft.scale.setScalar(particleLeft.userData.initialScale);

    // Right particle
    const particleRight = new THREE.Mesh(trailParticleGeometry, currentTrailMaterial.clone()); // Clone again for the second particle
    const spawnOffsetRight = new THREE.Vector3(ufoWidth, yOffset, zOffset);
    spawnOffsetRight.applyQuaternion(ufo.quaternion);
    particleRight.position.copy(ufo.position).add(spawnOffsetRight);
    particleRight.userData.lifetime = TRAIL_LIFETIME;
    // Apply scale multiplier
    particleRight.userData.initialScale = (1.0 + Math.random() * 0.5) * initialScaleMultiplier;
    particleRight.scale.setScalar(particleRight.userData.initialScale);

    trailParticles.push(particleLeft, particleRight);
    scene.add(particleLeft, particleRight);
}

// Function to try shooting a Laser
function tryShootLaser() {
    if (canShoot && gameActive && !isPaused) {
        shootLaser(currentForwardSpeed); // Pass current UFO speed
        canShoot = false;
        shootCooldownTimer = SHOOT_COOLDOWN;
    }
}

// Function to shoot a Laser (now accepts ufoSpeed as parameter)
function shootLaser(ufoSpeed) {
    const laser = createLaserBeam();

    // Position laser slightly in front of the UFO center
    const spawnOffset = new THREE.Vector3(0, 0, -(laser.userData.length / 2 + 1.5)); // Adjust Z offset based on length
    spawnOffset.applyQuaternion(ufo.quaternion); // Rotate offset with UFO
    laser.position.copy(ufo.position).add(spawnOffset);

    // Align laser orientation with UFO's orientation initially
    laser.quaternion.copy(ufo.quaternion);

    // Store the velocity of the UFO at the time of firing on the laser itself
    laser.userData.ufoForwardSpeedAtFire = (typeof ufoSpeed === "number" ? ufoSpeed : currentForwardSpeed);

    lasers.push(laser);
    scene.add(laser);

    // --- Play Sound ---
    playLaserSound();
    // --- End Play Sound ---
}

// Function to update Lasers
function updateLasers(delta) {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];

        // Calculate laser velocity relative to spacecraft speed
        // We want the world Z velocity to be (LASER_SPEED + ufoForwardSpeedAtFire)
        // Since forward in world Z is negative, subtract both from position.z
        let baseSpeed = LASER_SPEED;
        let ufoSpeedAdd = 0;
        if (laser.userData && typeof laser.userData.ufoForwardSpeedAtFire === "number") {
            ufoSpeedAdd = laser.userData.ufoForwardSpeedAtFire;
        }
        const laserVelocityZ = baseSpeed + ufoSpeedAdd;

        // Move laser forward along the world's Z-axis (relative to UFO speed)
        laser.position.z -= laserVelocityZ * delta; // Move along world Z

        // Decrease lifetime
        laser.userData.lifetime -= delta;

        // Remove if lifetime expired or too far behind
        if (laser.userData.lifetime <= 0 || laser.position.z > ufo.position.z + 100) {
            scene.remove(laser);
            if (laser.geometry) laser.geometry.dispose();
            if (laser.material) laser.material.dispose();
            lasers.splice(i, 1);
            continue;
        }

        // Update laser bounding box
        try { laser.userData.boundingBox.setFromObject(laser); } catch(e) {}

        // Check collision with obstacles
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obstacle = obstacles[j];

            // Check bounding boxes first
            let collided = false;
            if (laser.userData.boundingBox && !laser.userData.boundingBox.isEmpty() && isFinite(laser.userData.boundingBox.min.x) &&
                obstacle.userData.boundingBox && !obstacle.userData.boundingBox.isEmpty() && isFinite(obstacle.userData.boundingBox.min.x)) {
                 if (laser.userData.boundingBox.intersectsBox(obstacle.userData.boundingBox)) {
                    collided = true;
                 }
            }
             // Optional: Fallback radius check if boxes didn't intersect or were invalid
             else if (!collided && obstacle.userData.boundingRadius) {
                const laserRadius = laser.geometry.parameters.radiusTop || (0.15 * 3);
                const distance = laser.position.distanceTo(obstacle.position);
                // Adjust collision threshold slightly for laser vs obstacle
                const collisionThreshold = laserRadius + obstacle.userData.boundingRadius * 0.7 + laser.userData.length * 0.1;

                if (distance < collisionThreshold) {
                    collided = true;
                 }
             }


            if (collided) {
                // Collision detected!
                createExplosion(obstacle.position); // Create explosion at obstacle location (this now plays the sound)

                scene.remove(obstacle);
                obstacle.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
                obstacles.splice(j, 1);

                scene.remove(laser);
                if (laser.geometry) laser.geometry.dispose();
                if (laser.material) laser.material.dispose();
                lasers.splice(i, 1);

                break; // Stop checking this laser against other obstacles
            }
        }
    }

    // Update shoot cooldown
    if (!canShoot) {
        shootCooldownTimer -= delta;
        if (shootCooldownTimer <= 0) {
            canShoot = true;
        }
    }
}

// Function to update Explosions
function updateExplosions(delta) {
    for (let i = explosionParticles.active.length - 1; i >= 0; i--) {
        const particle = explosionParticles.active[i];

        particle.userData.lifetime -= delta;

        if (particle.userData.lifetime <= 0) {
            particle.visible = false; // Make inactive
            explosionParticles.active.splice(i, 1); // Remove from active list
        } else {
            // Move particle
            particle.position.addScaledVector(particle.userData.velocity, delta);
            // Apply some drag/friction
            particle.userData.velocity.multiplyScalar(0.97); // Dampen velocity slightly each frame

            // Fade out based on remaining lifetime
            const lifeRatio = particle.userData.lifetime / particle.userData.initialLifetime;
            particle.material.opacity = lifeRatio;
            // Shrink particle as it fades
            particle.scale.setScalar(lifeRatio);
        }
    }
}

// Function to update Coin Collect Particles
function updateCoinCollectParticles(delta) {
    for (let i = coinCollectParticles.active.length - 1; i >= 0; i--) {
        const particle = coinCollectParticles.active[i];

        particle.userData.lifetime -= delta;

        if (particle.userData.lifetime <= 0) {
            particle.visible = false; // Make inactive
            coinCollectParticles.active.splice(i, 1); // Remove from active list
        } else {
            // Move particle
            particle.position.addScaledVector(particle.userData.velocity, delta);
            // Apply some drag/friction
            particle.userData.velocity.multiplyScalar(0.97); // Dampen velocity slightly each frame

            // Fade out based on remaining lifetime
            const lifeRatio = particle.userData.lifetime / particle.userData.initialLifetime;
            particle.material.opacity = lifeRatio;
            // Shrink particle as it fades
            particle.scale.setScalar(lifeRatio);
        }
    }
}

// Function to create Explosion
function createExplosion(position) {
    let particlesCreated = 0;
    for (let i = 0; i < explosionParticles.pool.length && particlesCreated < EXPLOSION_PARTICLE_COUNT; i++) {
        const particle = explosionParticles.pool[i];
        if (!particle.visible) { // Find an inactive particle from the pool
            particle.visible = true;
            particle.position.copy(position);
            // Random direction
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(EXPLOSION_PARTICLE_SPEED * (0.8 + Math.random() * 0.4)); // Random speed variation
            particle.userData.lifetime = EXPLOSION_PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4); // Random lifetime variation
            particle.userData.initialLifetime = particle.userData.lifetime; // Store for fading
            particle.material.opacity = 1.0; // Start fully visible
            particle.scale.setScalar(1.0); // Start at base size

            explosionParticles.active.push(particle);
            particlesCreated++;
        }
    }
    // Play explosion sound when explosion particles are created
    playExplosionSound();
}

// Function to create Coin Collect Particles
function createCoinCollectParticles(position) {
    let particlesCreated = 0;
    for (let i = 0; i < coinCollectParticles.pool.length && particlesCreated < COIN_PARTICLE_COUNT; i++) {
        const particle = coinCollectParticles.pool[i];
        if (!particle.visible) { // Find an inactive particle from the pool
            particle.visible = true;
            particle.position.copy(position);
            // Random direction
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(COIN_PARTICLE_SPEED * (0.8 + Math.random() * 0.4)); // Random speed variation
            particle.userData.lifetime = COIN_PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4); // Random lifetime variation
            particle.userData.initialLifetime = particle.userData.lifetime; // Store for fading
            particle.material.opacity = 1.0; // Start fully visible
            particle.scale.setScalar(1.0); // Start at base size

            coinCollectParticles.active.push(particle);
            particlesCreated++;
        }
    }
}

// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    checkAndUpdateControlsDisplay(); // Update controls text on resize
}

// Function to handle key down
function onKeyDown(event) {
    keys[event.key.toLowerCase()] = true; // Set key state

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'p', 'shift'].includes(event.key.toLowerCase())) { // Keep 'shift' prevented
        event.preventDefault();
    }
    // Allow pausing with 'P' key
    if (event.key.toLowerCase() === 'p' && gameActive) {
        togglePause();
    }
    // Allow shooting with Spacebar
    if (event.key === ' ' && gameActive && !isPaused) {
        tryShootLaser();
    }

    // --- Update Boost State on Shift Down ---
    if (event.key.toLowerCase() === 'shift') {
        checkAndUpdateBoostState();
    }
    // --- End Boost Update ---
}

// Function to handle key up
function onKeyUp(event) {
    const keyLower = event.key.toLowerCase();
    keys[keyLower] = false; // Set key state

    // --- Update Boost State on Shift Up ---
    if (keyLower === 'shift') {
        checkAndUpdateBoostState();
    }
    // --- End Boost Update ---
}

// Function to check and update controls display
function checkAndUpdateControlsDisplay() {
    // Check if the arrow container is displayed (based on CSS media query)
    const isMobileView = getComputedStyle(touchArrowsContainer).display !== 'none';
    if (isMobileView) {
        controlsElement.innerHTML = 'Controls:<br>Use D-Pad Buttons<br>Boost<>Shoot';
    } else {
        controlsElement.innerHTML = 'Controls:<br>Arrows/WASD<br>Shoot/Space<br>Boost/Shift';
    }
}

// Function to toggle pause
function togglePause() {
    if (!gameActive) return; // Can only pause active game

    isPaused = !isPaused;

    if (isPaused) {
        clock.stop();
        pauseButton.textContent = 'Resume';
        pauseButton.classList.add('paused');
        
        // Stop boost sound if game is paused while boosting
        if (isBoosting) { // Check actual boosting state
            stopBoostSound(); // Stop sound immediately when pausing
        }
        // Suspend AudioContext to pause all sounds (including music)
        if (audioContext && audioContext.state === 'running') {
            audioContext.suspend().then(() => console.log("AudioContext suspended for pause."));
        }
    } else { // Resuming
        clock.start(); // Resumes timing from where it stopped
        pauseButton.textContent = 'Pause';
        pauseButton.classList.remove('paused');

        // Resume AudioContext
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                 console.log("AudioContext resumed.");
                 // Re-evaluate boost state upon unpausing AFTER audio context is resumed
                 if (masterGainNode) {
                    masterGainNode.gain.value = isMuted ? 0 : 1;
                 }
                 checkAndUpdateBoostState();
                 // Music will resume automatically if suspend/resume is used
            });
        } else {
             // If context wasn't suspended (e.g., not running initially), still check boost
             checkAndUpdateBoostState();
        }


        // Restart the animation loop explicitly
        animate();
    }
}

function checkAndUpdateBoostState() {
    // Determine if boost should be active based on key OR button press
    // Only allow boosting if game is active and not paused
    const shouldBeBoosting = (keys['shift'] || boostButtonPressed) && gameActive && !isPaused;

    if (shouldBeBoosting && !isBoosting) {
        // ----- Start Boosting -----
        isBoosting = true;
        boostButton.classList.add('active'); // Keep button visual sync
        playBoostSound();
        // console.log("Boost ON"); // For debugging
    } else if (!shouldBeBoosting && isBoosting) {
        // ----- Stop Boosting -----
        isBoosting = false;
        boostButton.classList.remove('active'); // Keep button visual sync
        stopBoostSound();
        // console.log("Boost OFF"); // For debugging
    }
    // If shouldBeBoosting and isBoosting are the same, do nothing (state hasn't changed)
}

async function playBoostSound() {
    if (!audioContext || !masterGainNode || isMuted) return; // Don't play if muted

    const url = '/boost_sound.mp3';

    try {
        let buffer;
        if (audioBuffers[url]) {
            buffer = audioBuffers[url];
        } else {
            console.warn(`Boost sound ${url} not preloaded. Loading now...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers[url] = buffer;
        }

        // Stop any existing source just in case (shouldn't happen due to boostSoundSource check)
        stopBoostSound();

        boostSoundSource = audioContext.createBufferSource();
        boostSoundSource.buffer = buffer;
        boostSoundSource.loop = true; // Enable looping

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Start silent for fade-in
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.2); // Fade in volume (adjust 0.4 for loudness)

        boostSoundSource.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect to MASTER gain

        boostSoundSource.start(audioContext.currentTime);
        console.log("Playing boost sound");

    } catch (error) {
        console.error(`Error playing boost sound ${url}:`, error);
        boostSoundSource = null; // Reset source if error occurred
    }
}

function stopBoostSound() {
    if (boostSoundSource && audioContext) {
        try {
            // Find the gain node connected to the source (assuming direct connection for now)
            // This part is tricky without storing the gain node reference.
            // For simplicity, we'll just stop the source abruptly.
            // A better approach would store the gainNode with the source.
            boostSoundSource.stop(audioContext.currentTime + 0.1); // Stop after a short delay
             console.log("Stopping boost sound");
        } catch (e) {
            console.warn("Error stopping boost sound:", e);
        }
        boostSoundSource = null; // Clear the reference
    }
}

function playCoinSound() {
    if (!audioContext || !masterGainNode) {
        console.warn("AudioContext/MasterGain not available, cannot play coin sound.");
        return;
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode); // Connect to MASTER gain

    // Sound Parameters - "Ching" sound
    oscillator.type = 'triangle'; // Triangle or Sine wave for a purer tone
    const startFrequency = 1500; // High pitch
    const endFrequency = 2200;   // Slightly higher pitch at the end
    const attackTime = 0.01; // Very quick attack
    const decayTime = 0.2;   // Quick decay/ring
    const volume = 0.25;      // Adjust volume (0 to 1)

    const now = audioContext.currentTime;

    // Frequency pitch up slightly
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.linearRampToValueAtTime(endFrequency, now + attackTime + decayTime * 0.5);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, now); // Start silent
    gainNode.gain.linearRampToValueAtTime(volume, now + attackTime); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime); // Decay quickly to near silence

    oscillator.start(now);
    oscillator.stop(now + attackTime + decayTime + 0.05); // Stop oscillator after sound decays
}

function playLaserSound() {
    if (!audioContext || !masterGainNode) {
        // Attempt to resume if suspended, otherwise log warning/error
        if(audioContext && audioContext.state === 'suspended') {
             audioContext.resume().catch(err => {
                console.warn("Could not resume audio context for sound:", err);
                return; // Don't proceed if resume failed
             });
        } else {
            console.warn("AudioContext not available or running, cannot play sound.");
            return; // Exit if audio context is not ready
        }
        // If resume was attempted, it might not be running *immediately*,
        // but we'll try to play the sound anyway hoping it resumes quickly.
        // A more robust solution might queue the sound or wait for resume.
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode); // Connect to MASTER gain

    // Sound Parameters - "Pew" sound
    oscillator.type = 'sawtooth'; // Sawtooth gives a buzzy sound
    const startFrequency = 880; // A5 note
    const endFrequency = 110;   // A2 note
    const attackTime = 0.01; // Very short attack
    const decayTime = 0.15;  // Quick decay
    const sustainLevel = 0.1; // Low sustain volume
    const releaseTime = 0.1; // Quick release
    const totalDuration = attackTime + decayTime + releaseTime;

    const now = audioContext.currentTime;

    // Frequency sweep down
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + attackTime + decayTime * 0.8); // Ramp down quickly

    // Volume envelope (ADSR-like)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.3, now + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel * 0.3, now + attackTime + decayTime);
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    oscillator.start(now);
    oscillator.stop(now + totalDuration + 0.05); // Stop oscillator slightly after gain reaches zero
}

function toggleMute() {
    if (!audioContext || !masterGainNode) return; // Need audio context and gain node

    isMuted = !isMuted;

    if (isMuted) {
        masterGainNode.gain.value = 0; // Mute
        muteButton.textContent = 'Unmute';
        muteButton.classList.add('muted');
        console.log("Audio Muted");
    } else {
        masterGainNode.gain.value = 1; // Unmute (set to full volume, could be adjusted later)
        muteButton.textContent = 'Mute';
        muteButton.classList.remove('muted');
        console.log("Audio Unmuted");
        // Ensure context is running if we unmute
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
}

function stopCurrentMusic() {
    if (currentMusicSource) {
        try {
            currentMusicSource.stop();
        } catch (e) {
            // Ignore errors if source already stopped
        }
        currentMusicSource = null;
    }
    currentMusicZone = null; // Reset zone tracker
    // console.log("Music stopped."); // Debug
}

async function loadAndPlayMusic(url, zoneId) {
    if (!audioContext || !masterGainNode) {
        console.warn(`AudioContext/MasterGain not ready. Cannot play music for zone ${zoneId}`);
        return;
    }
    if (!url) {
        console.warn(`No music URL provided for zone ${zoneId}`);
        return;
    }

    // Mark the zone we are *trying* to play music for
    currentMusicZone = zoneId;

    try {
        let buffer;
        if (audioBuffers[url]) {
            // Use cached buffer
            buffer = audioBuffers[url];
        } else {
            // Fetch and decode
            // console.log(`Fetching audio buffer for ${url}`); // Debug
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers[url] = buffer;
        }

        // Double-check if the zone changed *while* we were loading/decoding
        if (currentMusicZone !== zoneId) {
             console.log(`Zone changed to ${currentMusicZone} while loading ${zoneId}. Aborting playback.`); // Debug
             return; // Don't play if the zone target changed
        }

        // Stop any existing music source just before playing new one (belt-and-suspenders)
        if (currentMusicSource) {
            try { currentMusicSource.stop(); } catch(e) {}
        }

        // Create source node
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        // Optional: Add a gain node for volume control if needed later
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.35; // Set music volume (adjust 0.0 to 1.0)
        source.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect music gain to MASTER gain

        source.start(0); // Start playback immediately
        currentMusicSource = source; // Store the reference to the playing source
        // console.log(`Playing music for zone ${zoneId}: ${url}`); // Debug

        // Handle cleanup if the source finishes unexpectedly (e.g., disconnected)
        source.onended = () => {
            // Only clear if this *specific* source instance ended
            if (currentMusicSource === source) {
                 currentMusicSource = null;
                 // Don't reset currentMusicZone here, as the game might still be in that zone
                 // console.log(`Music source ended for zone ${zoneId}`); // Debug
            }
        };

    } catch (error) {
        console.error(`Error loading or playing music ${url}:`, error);
        currentMusicZone = null; // Reset zone if loading failed
    }
}

// --- NEW: Helper function to preload sounds ---
async function preloadSound(url) {
    // Check if context exists and is running, if not, try to initialize
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.gain.value = isMuted ? 0 : 1; // Initialize based on mute state
            masterGainNode.connect(audioContext.destination);
             if (audioContext.state === 'suspended') {
                console.log("AudioContext suspended during preload.");
             }
        } catch (e) {
            console.error("Web Audio API is not supported. Cannot preload sound.");
            return; // Stop preloading if context fails
        }
    }
    // Don't preload if already cached
    if (audioBuffers[url]) {
        return;
    }

    try {
        // console.log(`Preloading sound: ${url}`); // Debug
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        // Decode and cache
        audioBuffers[url] = await audioContext.decodeAudioData(arrayBuffer);
        // console.log(`Sound ${url} preloaded and cached.`); // Debug
    } catch (error) {
        console.error(`Error preloading sound ${url}:`, error);
        // Clear cache entry if preload failed
        delete audioBuffers[url];
    }
}

function createMountain() {
    const group = new THREE.Group();
    const baseRadius = Math.random() * 150 + 100; // Wider base
    const height = baseRadius * (Math.random() * 0.8 + 0.8) * 1.5; // Taller mountains
    const radialSegments = Math.floor(Math.random() * 5) + 7; // More jagged (7-11 segments)

    const mountainGeometry = new THREE.ConeGeometry(baseRadius, height, radialSegments);

    // Displace vertices for irregularity
    const positionAttribute = mountainGeometry.getAttribute('position');
    const vertices = [];
    const baseVertexY = positionAttribute.getY(0); // Y-coordinate of the tip vertex
    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        // Don't displace the tip vertex (or displace less)
        if (Math.abs(vertex.y - baseVertexY) > 0.1) { // If not the tip
            const displacementFactor = 1 + (Math.random() - 0.5) * 0.6; // More displacement
            vertex.x *= displacementFactor;
            vertex.z *= displacementFactor;
            // Slightly displace height too, but less for vertices near the base
            const heightDisplaceFactor = 1 + (Math.random() - 0.5) * 0.15 * (Math.abs(vertex.y + height/2) / (height/2)); // Less displace near base
             vertex.y *= heightDisplaceFactor;
        }
        vertices.push(vertex.x, vertex.y, vertex.z);
    }
    mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    mountainGeometry.computeVertexNormals();

    // Varying mountain colors (browns, grays, greens)
    const hue = Math.random() * 0.1 + 0.05; // Browns/Greens
    const saturation = Math.random() * 0.3 + 0.1; // Less saturated
    const lightness = Math.random() * 0.2 + 0.25; // Darker
    const mountainColor = new THREE.Color().setHSL(hue, saturation, lightness);
    const mountainMaterial = new THREE.MeshLambertMaterial({
        color: mountainColor,
        flatShading: true // Give a low-poly look
    });

    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.y = height / 2 - 5; // Position base slightly below y=0
    group.add(mountain);

    // Add snow caps occasionally
    if (height > 250 && Math.random() > 0.4) { // Taller mountains more likely to have snow
        const snowCapHeightRatio = 0.7 + Math.random() * 0.2; // Start snow 70-90% up
        const snowCapGeometry = new THREE.ConeGeometry(baseRadius * (1 - snowCapHeightRatio) * 1.1, height * (1 - snowCapHeightRatio), radialSegments);

        // Match displacement roughly (simpler version)
        const snowPosAttr = snowCapGeometry.getAttribute('position');
        const snowVertices = [];
        for (let i = 0; i < snowPosAttr.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(snowPosAttr, i);
            if (Math.abs(vertex.y - snowPosAttr.getY(0)) > 0.1) { // Not the tip
                const displacementFactor = 1 + (Math.random() - 0.5) * 0.3;
                vertex.x *= displacementFactor;
                vertex.z *= displacementFactor;
            }
            snowVertices.push(vertex.x, vertex.y, vertex.z);
        }
        snowCapGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowVertices, 3));
        snowCapGeometry.computeVertexNormals();


        const snowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
        // Position the snow cap on top of the mountain
        snowCap.position.y = height / 2 - (height * (1 - snowCapHeightRatio) / 2) ;
        group.add(snowCap);
    }


    group.userData.type = 'mountain';
    return group;
}

function createBuilding() {
    const group = new THREE.Group();
    const width = Math.random() * 5 + 5;
    const depth = Math.random() * 3 + 3;
    const height = Math.random() * 20 + 10; // Taller range
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingColor = new THREE.Color(Math.random() * 0.3 + 0.5, Math.random() * 0.3 + 0.5, Math.random() * 0.3 + 0.5);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: buildingColor });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = height / 2;
    group.add(building);

    // Add some basic details (like windows texture or simple shapes) - optional
    // Example: Simple window rows
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x333366 });
    const windowHeight = 1;
    const windowWidth = 1;
    const numFloors = Math.floor(height / 2.5); // Estimate floors
    for (let floor = 0; floor < numFloors; floor++) {
        for (let side = 0; side < 4; side++) { // All 4 sides
            const numWindows = Math.floor((side % 2 === 0 ? width : depth) / 2);
            for(let w = 0; w < numWindows; w++) {
                 const windowGeom = new THREE.PlaneGeometry(windowWidth, windowHeight);
                 const windowMesh = new THREE.Mesh(windowGeom, windowMat);
                 const yPos = (floor + 0.5) * 2.5 - height/2 + building.position.y;
                 let xPos=0, zPos=0;
                 if(side === 0) { xPos = (w + 0.5 - numWindows/2) * 2; zPos = depth/2 + 0.01; }
                 else if(side === 1) { xPos = width/2 + 0.01; zPos = (w + 0.5 - numWindows/2) * 2; windowMesh.rotation.y = Math.PI/2; }
                 else if(side === 2) { xPos = (w + 0.5 - numWindows/2) * 2; zPos = -depth/2 - 0.01; windowMesh.rotation.y = Math.PI; }
                 else { xPos = -width/2 - 0.01; zPos = (w + 0.5 - numWindows/2) * 2; windowMesh.rotation.y = -Math.PI/2; }

                 windowMesh.position.set(xPos, yPos, zPos);
                 group.add(windowMesh);
            }
        }
    }


    group.scale.set(2.0, 2.0, 2.0); // Scale up buildings
    group.userData.type = 'building';
    group.userData.boundingRadius = Math.max(width, depth, height) * 0.6 * group.scale.x; // Rough radius
    return group;
}

function updateGameTimer() {
    if (!timerActive) return;
    
    const now = Date.now();
    // Only update display every 100ms to reduce DOM updates
    if (now - lastTimerUpdate >= 100) {
        gameElapsedTime = (now - gameStartTime) / 1000; // Convert to seconds
        
        // Format time as minutes:seconds
        const minutes = Math.floor(gameElapsedTime / 60);
        const seconds = Math.floor(gameElapsedTime % 60);
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        timerElement.textContent = `Time: ${formattedTime}`;
        lastTimerUpdate = now;
    }
}

function stopGameTimer() {
    if (!timerActive) return;
    
    timerActive = false;
    
    // Calculate final time
    const totalSeconds = Math.floor(gameElapsedTime);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    finalGameTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Add sound for victory
function playVictorySound() {
    if (!audioContext || !masterGainNode) return;
    
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(masterGainNode); // Connect to MASTER gain
    
    // Triumphant sound
    oscillator1.type = 'sine';
    oscillator2.type = 'triangle';
    
    const now = audioContext.currentTime;
    
    // First note
    oscillator1.frequency.setValueAtTime(440, now); // A4
    oscillator2.frequency.setValueAtTime(440 * 1.25, now); // Major third up
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
    
    // Second note (higher)
    oscillator1.frequency.setValueAtTime(523.25, now + 0.3); // C5
    oscillator2.frequency.setValueAtTime(523.25 * 1.25, now + 0.3);
    
    // Final chord
    oscillator1.frequency.setValueAtTime(659.25, now + 0.6); // E5
    oscillator2.frequency.setValueAtTime(880, now + 0.6); // A5
    
    // Fade out
    gainNode.gain.setValueAtTime(0.4, now + 0.9);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
    
    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1.5);
    oscillator2.stop(now + 1.5);
}

// Add sound for defeat
function playDefeatSound() {
    if (!audioContext || !masterGainNode) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode); // Connect to MASTER gain
    
    // Sad sound
    oscillator.type = 'sawtooth';
    
    const now = audioContext.currentTime;
    
    // Start with higher note and descend
    oscillator.frequency.setValueAtTime(220, now); // A3
    oscillator.frequency.linearRampToValueAtTime(110, now + 0.5); // A2
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    
    oscillator.start(now);
    oscillator.stop(now + 1.0);
}

// --- NEW: Play Explosion Sound Function ---
async function playExplosionSound() {
    if (!audioContext || !masterGainNode || isMuted) return; // Don't play if muted or context not ready

    const url = '/explosion.mp3';

    // Ensure context is running
     if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(err => {
            console.warn("Could not resume audio context for explosion sound:", err);
            return; // Don't proceed if resume failed
        });
    }
     if (audioContext.state !== 'running') {
         console.warn("AudioContext not running, cannot play explosion sound.");
         return;
     }

    try {
        let buffer;
        if (audioBuffers[url]) {
            buffer = audioBuffers[url];
        } else {
            console.warn(`Explosion sound ${url} not preloaded. Loading now...`);
            // Use the preload function to fetch and cache if needed
            await preloadSound(url); // Call the globally defined preloadSound
            if (audioBuffers[url]) {
                buffer = audioBuffers[url];
            } else {
                // If preload failed, throw error
                 throw new Error(`Failed to load explosion sound buffer: ${url}`);
            }
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Optional: Add slight random pitch variation
        const playbackRate = 0.9 + Math.random() * 0.2; // Between 0.9 and 1.1
        source.playbackRate.value = playbackRate;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.4; // Adjust volume (0.0 to 1.0)

        source.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect to MASTER gain

        source.start(audioContext.currentTime);
        // No need to store reference as it's a short, non-looping sound

    } catch (error) {
        console.error(`Error playing explosion sound ${url}:`, error);
    }
}

init();
