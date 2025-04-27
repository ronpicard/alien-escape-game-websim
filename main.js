import * as THREE from 'three';

let scene, camera, renderer;
let ufo, ufoBoundingBox;
let obstacles = [];
let coins = [];
let scenery = [];
let clouds = [];
const initialForwardSpeed = 100;
const acceleration = 10;
const maxSpeed = 400;
let currentForwardSpeed = initialForwardSpeed;
const strafeSpeed = 0.5;
const planeWidth = 25;
const planeHeight = 15;
const initialCloudCount = 15; 
const targetCloudCount = 20; 

let score = 0;
let coinCount = 0;
let gameActive = false;
let gameWon = false;
let isInvincible = false; 
let keys = {};

const clock = new THREE.Clock();

const infoElement = document.getElementById('info');
const coinsElement = document.getElementById('coins');
const speedElement = document.getElementById('speed');
const messageContainer = document.getElementById('message-container'); 
const startOptionsDiv = document.getElementById('start-options'); 
const endMessageDiv = document.getElementById('end-message'); 
const startRegularButton = document.getElementById('start-regular');
const startInvincibleButton = document.getElementById('start-invincible');
const zoneDisplayElement = document.getElementById('zone-display'); 
const modeDisplayElement = document.getElementById('mode-display'); 

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
let lastStarDestroyerSpawnDistance = ZONE_SPACE_START; 

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xADD8E6, 150, 1000); 
    scene.background = new THREE.Color(0xADD8E6); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); 
    camera.position.set(0, 5, 10); // Adjusted initial Z slightly to match new zoom
    camera.lookAt(0, 2, 0); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    startRegularButton.addEventListener('click', () => {
        startGame(false); 
    });
    startInvincibleButton.addEventListener('click', () => {
        startGame(true); 
    });

    messageContainer.style.display = 'block';
    startOptionsDiv.style.display = 'block'; 
    endMessageDiv.style.display = 'none'; 
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
    const holeRadius = 80 * 4; 
    const accretionDiskOuter = holeRadius * 3; 
    const accretionDiskInner = holeRadius * 1.1; 

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

    const centerGeom = new THREE.SphereGeometry(holeRadius * 0.9, 32, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const center = new THREE.Mesh(centerGeom, centerMat);
    group.add(center);

    group.position.set(0, planeHeight / 2, -1000); 
    group.userData.type = 'blackhole';
    group.userData.holeRadius = holeRadius; 
    group.userData.diskInnerRadius = accretionDiskInner; 
    return group;
}

function createHouse() {
    const group = new THREE.Group();
    const baseHeight = Math.random() * 1.5 + 1.5; 
    const baseWidth = Math.random() * 2.5 + 2.0;
    const baseDepth = Math.random() * 1.5 + 1.5;
    const wallColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.7);
    const roofColor = new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.4, 0.4);

    const baseGeom = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = baseHeight / 2; 
    group.add(base);

    const roofHeight = baseHeight * (0.6 + Math.random() * 0.4); 
    const roofGeom = new THREE.ConeGeometry(baseWidth * 0.7, roofHeight, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = baseHeight + roofHeight / 2;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    group.userData.type = 'house';
    return group;
}

function createBuilding() {
    const group = new THREE.Group();
    const height = Math.random() * 8 + 5; 
    const width = Math.random() * 3 + 2.5;
    const depth = Math.random() * 3 + 2.5;
    const buildingColor = new THREE.Color().setHSL(0.1, 0.1, Math.random() * 0.3 + 0.4);

    const geom = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshLambertMaterial({ color: buildingColor });
    const building = new THREE.Mesh(geom, mat);
    building.position.y = height / 2; 
    group.add(building);

    group.userData.type = 'building';
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

function startGame(invincibleMode = false) {
    if (gameActive && !gameWon) return; 

    score = 0; 
    coinCount = 0; 
    currentForwardSpeed = initialForwardSpeed; 
    ufo.position.set(0, 5, 0); 
    ufo.rotation.set(0, 0, 0); 
    gameWon = false;
    moonSpawned = false;
    isInvincible = invincibleMode; 
    lastPlanetSpawnDistance = ZONE_SPACE_START; 
    lastStarDestroyerSpawnDistance = ZONE_SPACE_START; 

    obstacles.forEach(obj => scene.remove(obj)); 
    obstacles = [];
    coins.forEach(coin => scene.remove(coin)); 
    coins = [];
    scenery.forEach(item => scene.remove(item)); 
    scenery = [];
    clouds.forEach(cloud => scene.remove(cloud)); 
    clouds = [];
    if (blackHole) scene.remove(blackHole);
    blackHole = null;
    if (moon) scene.remove(moon); 
    moon = null;

    ground.position.z = -4500;
    ground.visible = true; 

    scene.background.setHex(0xADD8E6); 
    scene.fog = new THREE.Fog(0xADD8E6, 150, 1000); 

    createInitialClouds(); 

    gameActive = true;
    messageContainer.style.display = 'none'; 
    infoElement.textContent = `Height: 0 m`;
    coinsElement.textContent = `Coins: 0`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`; 
    zoneDisplayElement.textContent = 'Zone: Ground Level'; 

    // Set and show mode display text
    if (isInvincible) {
        modeDisplayElement.textContent = 'You are invincible!';
    } else {
        modeDisplayElement.textContent = 'Avoid the obstacles!';
    }
    modeDisplayElement.style.display = 'block'; 

    clock.start();
    animate();
}

function createCloud() {
    const group = new THREE.Group();
    const puffCount = Math.floor(Math.random() * 3) + 3; 
    const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.2 
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
    group.userData.driftSpeed = Math.random() * 0.1 + 0.05; 
    group.userData.direction = Math.random() > 0.5 ? 1 : -1;
    return group;
}

function createInitialClouds() {
    for (let i = 0; i < initialCloudCount; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * planeWidth * 2,
            (Math.random() * planeHeight) + 2,
            (Math.random() * -2000) - 2000
        );
        scene.add(cloud);
        clouds.push(cloud);
    }
}

function spawnObstacle(forceAhead = false) {
    let obstacle;
    const currentDistance = score; 
    let spawnY;
    let isGroundObstacle = false;

    if (currentDistance < ZONE_AIR_END) { 
        const type = Math.random();
        if (type < 0.25) {
            obstacle = createHouse();
            isGroundObstacle = true;
        } else if (type < 0.5) {
            obstacle = createBuilding();
            isGroundObstacle = true;
        } else if (type < 0.7) {
            obstacle = createAirplane();
            spawnY = (Math.random() * planeHeight * 0.8) + 3; 
        } else if (type < 0.85) {
            obstacle = createHelicopter();
            spawnY = (Math.random() * planeHeight * 0.8) + 3;
        } else {
            obstacle = createParachutist();
            spawnY = (Math.random() * planeHeight * 0.9) + 2;
        }
    } else if (currentDistance < ZONE_SPACE_START) { 
        const type = Math.random();
        if (type < 0.5) obstacle = createAirplane();
        else if (type < 0.8) obstacle = createHelicopter();
        else obstacle = createParachutist();
        spawnY = (Math.random() * planeHeight * 1.2) + 2; 
    } else if (currentDistance < ZONE_NEAR_SPACE_END) { 
        obstacle = Math.random() < 0.6 ? createSatellite() : createAsteroid();
        spawnY = (Math.random() * planeHeight * 1.5) + 1; 
    } else if (currentDistance < ZONE_MID_SPACE_END) { 
         obstacle = Math.random() < 0.5 ? createAlienSaucer() : createAsteroid();
         spawnY = (Math.random() * planeHeight * 1.8); 
    } else { 
        obstacle = Math.random() < 0.6 ? createAlienSaucer() : createAsteroid();
        spawnY = (Math.random() * planeHeight * 2.0);
    }

    const spawnDistanceForward = 600 + Math.random() * 400; 
    const spawnZ = ufo.position.z - spawnDistanceForward;
    const spawnX = (Math.random() - 0.5) * planeWidth * 2.5; 

    if (isGroundObstacle) {
        obstacle.position.set(spawnX, 0, spawnZ);
        obstacle.rotation.set(0, Math.random() * Math.PI * 2, 0);
    } else {
        obstacle.position.set(spawnX, spawnY, spawnZ);
        obstacle.rotation.set(
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25, 
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25
        );
    }

    if (forceAhead && spawnZ > ufo.position.z - 150) { 
        obstacle.position.z = ufo.position.z - 150 - Math.random() * 250;
    }

    obstacle.userData.boundingBox = new THREE.Box3(); 
    obstacle.userData.boundingRadius = null; 

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
            obstacle.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            return false; 
        }
        if (obstacle.userData.boundingBox && obstacle.visible) {
            try {
                obstacle.userData.boundingBox.setFromObject(obstacle, true); 
            } catch (e) {
                console.warn("Could not set bounding box for obstacle:", obstacle.userData.type, e);
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

function updateScenery() {
    const currentDistance = score; 
    const sceneryRemovalDistance = 10000; 
    const planetSpawnInterval = 400; 
    const starDestroyerSpawnInterval = 2000; 

    if (!moonSpawned && currentDistance > ZONE_SPACE_START) {
        moon = createMoon();
        const sideOffset = (planeWidth * 5) + Math.random() * 500;
        const vertOffset = (planeHeight * 3) + Math.random() * 300;
        const forwardDist = 3000 + Math.random() * 1000;
        moon.position.set(
            (Math.random() > 0.5 ? 1 : -1) * sideOffset,
            (Math.random() > 0.5 ? 1 : -1) * vertOffset,
            ufo.position.z - forwardDist
        );
        moon.lookAt(camera.position); 
        scene.add(moon);
        scenery.push(moon); 
        moonSpawned = true;
    }

    scenery = scenery.filter(item => {
        const itemType = item.userData.type;
        const removalDist = (itemType === 'planet' || itemType === 'moon' || itemType === 'stardestroyer') ? sceneryRemovalDistance : 500; 

        if (item.position.z > ufo.position.z + removalDist) {
           scene.remove(item);
           item.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } })
           return false;
        }

        if (itemType === 'planet') {
           item.rotation.y += 0.0005;
           const ring = item.children.find(c => c.geometry instanceof THREE.RingGeometry);
           if (ring) ring.rotation.z -= 0.0008;
        } else if (itemType === 'stardestroyer') {
            item.position.x += (Math.random() - 0.5) * 0.1;
            item.rotation.y += (Math.random() - 0.5) * 0.0001;
        }

        return true; 
    });

    if (currentDistance > ZONE_SPACE_START) {
        const distanceSinceLastPlanet = currentDistance - lastPlanetSpawnDistance;
        if (distanceSinceLastPlanet > planetSpawnInterval && scenery.filter(s => s.userData.type === 'planet' && s.position.z < ufo.position.z - 1000).length < 8) { 
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
    }

    if (currentDistance > ZONE_MID_SPACE_END) { 
        const distanceSinceLastStarDestroyer = currentDistance - lastStarDestroyerSpawnDistance;
        if (distanceSinceLastStarDestroyer > starDestroyerSpawnInterval && scenery.filter(s => s.userData.type === 'stardestroyer' && s.position.z < ufo.position.z - 2000).length < 3) {
            const destroyer = createStarDestroyer();
            const sideOffset = (planeWidth * 8) + Math.random() * 2000; 
            const vertOffset = (planeHeight * 8) + Math.random() * 2000; 
            const forwardDist = 6000 + Math.random() * 4000; 

            destroyer.position.set(
                (Math.random() > 0.5 ? 1 : -1) * sideOffset,
                (Math.random() > 0.5 ? 1 : -1) * vertOffset,
                ufo.position.z - forwardDist
            );
            destroyer.rotation.set(
                (Math.random() - 0.5) * Math.PI * 0.2,
                (Math.random() - 0.5) * Math.PI * 1.5,
                (Math.random() - 0.5) * Math.PI * 0.2
            );
            destroyer.lookAt(new THREE.Vector3(
                destroyer.position.x + (Math.random()-0.5)*500,
                destroyer.position.y + (Math.random()-0.5)*500,
                destroyer.position.z + (Math.random()-0.5)*500
            )); 

            scenery.push(destroyer);
            scene.add(destroyer);
            lastStarDestroyerSpawnDistance = currentDistance; 
        }
    }

    if (currentDistance > ZONE_WIN - 5000 && !blackHole) { 
        blackHole = createBlackHole();
        const remainingDistance = Math.max(0, ZONE_WIN - score); 
        const blackHoleSpawnDepth = ufo.position.z - remainingDistance - 5000; 
        blackHole.position.set(0, planeHeight / 2, blackHoleSpawnDepth);
        scene.add(blackHole);
        blackHole.userData.disk = blackHole.children.find(c => c.geometry instanceof THREE.RingGeometry);
        blackHole.userData.center = blackHole.children.find(c => c.geometry instanceof THREE.SphereGeometry); 
    }
    if (blackHole && blackHole.userData.disk) {
         blackHole.userData.disk.rotation.z += 0.005;
         if(blackHole.userData.center) blackHole.userData.center.rotation.y += 0.001;
    }
}

function checkCollisions() {
    if (!ufo || !ufo.userData.collider) return; 

    if (!isInvincible) {
        ufo.userData.collider.updateWorldMatrix(true, false);
        ufoBoundingBox.setFromObject(ufo.userData.collider);

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];

            if (obstacle.userData.boundingBox && !obstacle.userData.boundingBox.isEmpty()) {
                if (ufoBoundingBox.intersectsBox(obstacle.userData.boundingBox)) {
                    gameOver(); 
                    return;
                }
            } else if (obstacle.userData.boundingRadius) {
                 const distance = ufo.position.distanceTo(obstacle.position);
                 if (distance < (ufoBoundingBox.getSize(new THREE.Vector3()).length() / 2 + obstacle.userData.boundingRadius * 0.8)) { 
                    console.log("Collision detected via sphere");
                    gameOver();
                    return;
                }
            }
        }
    } 

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const distance = ufo.position.distanceTo(coin.position);
        if (distance < 1.2 + coin.userData.boundingRadius) { 
            coinCount++;
            coinsElement.textContent = `Coins: ${coinCount}`;
            scene.remove(coin);
            coin.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); child.material?.dispose(); } });
            coins.splice(i, 1); 
        }
    }
}

function handleInput(delta) {
    if (!gameActive) return;

    const moveSpeed = strafeSpeed * delta * 60; 

    let targetX = ufo.position.x;
    let targetY = ufo.position.y;

    if (keys['arrowleft'] || keys['a']) {
        targetX -= moveSpeed;
    }
    if (keys['arrowright'] || keys['d']) {
        targetX += moveSpeed;
    }
    if (keys['arrowup'] || keys['w']) {
        targetY += moveSpeed;
    }
    if (keys['arrowdown'] || keys['s']) {
        targetY -= moveSpeed;
    }

    ufo.position.x = THREE.MathUtils.clamp(targetX, -planeWidth, planeWidth);
    ufo.position.y = THREE.MathUtils.clamp(targetY, 1, planeHeight * 1.5); 

    const targetBank = (keys['arrowright'] || keys['d'] ? -1 : 0) * Math.PI / 12 + (keys['arrowleft'] || keys['a'] ? 1 : 0) * Math.PI / 12;
    ufo.rotation.z = THREE.MathUtils.lerp(ufo.rotation.z, targetBank, 0.1); 

    const targetPitch = (keys['arrowup'] || keys['w'] ? 1 : 0) * Math.PI / 24 + (keys['arrowdown'] || keys['s'] ? -1 : 0) * Math.PI / 24;
    ufo.rotation.x = THREE.MathUtils.lerp(ufo.rotation.x, targetPitch, 0.1);
}

function updateEnvironment(distanceZ) {
    const currentDepth = -distanceZ; 
    const spaceTransitionStart = ZONE_SPACE_START; 
    const spaceTransitionEnd = spaceTransitionStart + 1000; 

    if (currentDepth > spaceTransitionStart) {
        const transitionFactor = Math.min(1, (currentDepth - spaceTransitionStart) / (spaceTransitionEnd - spaceTransitionStart));

        const skyColor = new THREE.Color(0xADD8E6);
        const spaceColor = new THREE.Color(0x000010);
        const currentColor = new THREE.Color().lerpColors(skyColor, spaceColor, transitionFactor);
        scene.background = currentColor;

        const initialFogNear = 150;
        const initialFogFar = 1000;
        const spaceFogNear = 300;
        const spaceFogFar = 2500; 
        scene.fog.near = THREE.MathUtils.lerp(initialFogNear, spaceFogNear, transitionFactor);
        scene.fog.far = THREE.MathUtils.lerp(initialFogFar, spaceFogFar, transitionFactor);
        scene.fog.color.copy(currentColor);

        if (currentDepth > spaceTransitionEnd) { 
             ground.visible = false;
        } else {
             ground.visible = true; 
        }

    } else {
        scene.background.setHex(0xADD8E6);
        scene.fog.color.setHex(0xADD8E6);
        scene.fog.near = 150;
        scene.fog.far = 1000;
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
    startOptionsDiv.style.display = 'block'; 
    messageContainer.style.display = 'block'; 
    modeDisplayElement.style.display = 'none'; // Hide mode display
}

function gameOver() {
    if (!gameActive || gameWon || isInvincible) return; 
    gameActive = false;
    clock.stop();
    endMessageDiv.textContent = `Game Over!\nScore: ${Math.floor(score)}\nCoins: ${coinCount}`;
    endMessageDiv.style.display = 'block'; 
    startOptionsDiv.style.display = 'block'; 
    messageContainer.style.display = 'block'; 
    modeDisplayElement.style.display = 'none'; // Hide mode display
}

function animate() {
    if (!gameActive) return;

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (currentForwardSpeed < maxSpeed) {
        currentForwardSpeed += acceleration * delta;
        currentForwardSpeed = Math.min(currentForwardSpeed, maxSpeed); 
    }

    handleInput(delta); 

    ufo.position.z -= currentForwardSpeed * delta;

    score = -ufo.position.z; 
    infoElement.textContent = `Height: ${Math.floor(score)} m`;
    speedElement.textContent = `Speed: ${Math.floor(currentForwardSpeed)} m/s`;
    updateZoneDisplay(score); 

    const cameraOffsetX = 0;
    const cameraOffsetY = 5.5; // Slightly adjusted Y offset
    const cameraOffsetZ = 10; // Reduced Z offset to zoom in

    const cameraTargetPosition = new THREE.Vector3(
        ufo.position.x + cameraOffsetX,
        ufo.position.y + cameraOffsetY,
        ufo.position.z + cameraOffsetZ
    );

    camera.position.lerp(cameraTargetPosition, 0.1); 

    const lookAtTargetPosition = new THREE.Vector3(
        ufo.position.x,
        ufo.position.y, 
        ufo.position.z - 50
    );

    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(camera.position, lookAtTargetPosition, camera.up);
    targetQuaternion.setFromRotationMatrix(tempMatrix);
    camera.quaternion.slerp(targetQuaternion, 0.1); 


    updateObstacles();
    updateCoins(delta);
    updateScenery();
    checkCollisions();
    if (!gameActive) return; 

    updateEnvironment(ufo.position.z);

    if (!gameWon && score >= ZONE_WIN) { 
        if (blackHole && blackHole.userData.center) {
            const distToHoleCenter = ufo.position.distanceTo(blackHole.position);
            if (distToHoleCenter < blackHole.userData.diskInnerRadius * 1.2) { 
                 winGame();
                 return; 
            }
        } else if (score > ZONE_WIN + 1000) { 
             console.warn("Reached win distance but black hole/center not found! Triggering fallback win.");
             winGame();
             return; 
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keys[event.key.toLowerCase()] = true; 
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(event.key.toLowerCase())) { 
        event.preventDefault();
    }
}

function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false; 
}

init();
