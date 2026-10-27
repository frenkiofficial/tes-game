// INIT THREE.JS SCENE, CAMERA, RENDERER
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1329);
scene.fog = new THREE.FogExp2(0x0b1329, 0.018);

// KAMERA ISOMETRIC SAMA DENGAN MOBILE LEGENDS (Sudut 45 derajat melihat ke bawah)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 22, 18);

// LIGHTING STYLE MOBA (Terang & Warna Karakter Tajam)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// ---- ARENA MAP (DESIGN MAP ML BB) ----
// 1. Rumput Utama (Ground)
const groundGeo = new THREE.PlaneGeometry(60, 80);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 2. Jalur Utama (Mid Lane dengan tekstur batu jalanan)
const laneGeo = new THREE.PlaneGeometry(12, 80);
const laneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
const lane = new THREE.Mesh(laneGeo, laneMat);
lane.rotation.x = -Math.PI / 2;
lane.position.y = 0.02;
lane.receiveShadow = true;
scene.add(lane);

// 3. TURRET/TOWER MOBA (Seperti Turret di screenshot ML BB)
function createTurret(x, z, teamColor) {
    const turretGroup = new THREE.Group();
    
    // Base Turret
    const baseGeo = new THREE.CylinderGeometry(1.5, 2, 1.5, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.75;
    turretGroup.add(base);

    // Tiang & Kristal Turret
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({ 
        color: teamColor, 
        emissive: teamColor, 
        emissiveIntensity: 0.8 
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 3.5;
    turretGroup.add(crystal);

    turretGroup.position.set(x, 0, z);
    scene.add(turretGroup);
    return crystal;
}

const redTurretCrystal = createTurret(0, -22, 0xef4444); // Turret Musuh
const blueTurretCrystal = createTurret(0, 22, 0x3b82f6);  // Turret Tim

// ---- HERO PLAYER & BOT SYSTEM ----
const playerGroup = new THREE.Group();

// Model 3D Hero sementara (Dapat diganti file .glb/gltf Layla/Miya)
const heroBodyGeo = new THREE.CapsuleGeometry(0.6, 1.2, 4, 8);
const heroBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.3 });
const heroBody = new THREE.Mesh(heroBodyGeo, heroBodyMat);
heroBody.position.y = 1.2;
heroBody.castShadow = true;
playerGroup.add(heroBody);

// Senjata / Efek Hero
const weaponGeo = new THREE.BoxGeometry(0.2, 0.2, 1.5);
const weaponMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706 });
const weapon = new THREE.Mesh(weaponGeo, weaponMat);
weapon.position.set(0.6, 1.2, 0.3);
playerGroup.add(weapon);

playerGroup.position.set(0, 0, 15);
scene.add(playerGroup);

// CONTROLS JOYSTICK LOGIC
let moveVector = { x: 0, z: 0 };
const joystickContainer = document.getElementById('joystick-container');
const joystickHandle = document.getElementById('joystick-handle');
let activeTouchId = null;

joystickContainer.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    updateJoystick(touch);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    for (let touch of e.changedTouches) {
        if (touch.identifier === activeTouchId) {
            updateJoystick(touch);
        }
    }
}, { passive: false });

const resetJoystick = (e) => {
    for (let touch of e.changedTouches) {
        if (touch.identifier === activeTouchId) {
            activeTouchId = null;
            moveVector = { x: 0, z: 0 };
            joystickHandle.style.transform = `translate(0px, 0px)`;
        }
    }
};
window.addEventListener('touchend', resetJoystick);

function updateJoystick(touch) {
    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    let dist = Math.hypot(dx, dy);
    let maxRadius = 40;

    if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
    }

    joystickHandle.style.transform = `translate(${dx}px, ${dy}px)`;
    moveVector.x = dx / maxRadius;
    moveVector.z = dy / maxRadius;
}

// GAME LOOP
function animate() {
    requestAnimationFrame(animate);

    // Pergerakan Hero dari Analog Joystick
    if (moveVector.x !== 0 || moveVector.z !== 0) {
        playerGroup.position.x += moveVector.x * 0.16;
        playerGroup.position.z += moveVector.z * 0.16;
        
        // Rotasi Hero Menghadap Arah Jalan
        playerGroup.rotation.y = Math.atan2(moveVector.x, moveVector.z);
    }

    // Kamera Mengikuti Hero (Camera Follow Smooth)
    camera.position.x = playerGroup.position.x;
    camera.position.z = playerGroup.position.z + 14;
    camera.lookAt(playerGroup.position.x, 0, playerGroup.position.z);

    // Rotasi Kristal Turret
    redTurretCrystal.rotation.y += 0.02;
    blueTurretCrystal.rotation.y += 0.02;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
