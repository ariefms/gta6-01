// Solara Bay — boot, game loop, input, camera, enter/exit, combat, save/load.
// Wires every module together: world, player, vehicles, traffic, police,
// missions, HUD, audio and the ?shot= screenshot states. The screenshot
// states get two extra hooks: shotAutoDrive (the car drives itself while a
// shot renders) and shotChase (cruisers are rubber-banded into frame).
import * as THREE from 'three';
import { CONFIG, CAR_MODELS } from './config.js';
import { buildWorld } from './world.js';
import { createPlayer, walkPlayer, punch } from './player.js';
import { createCar, driveCar, nearestCar } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { createMissions, startMission, advanceMission, updateMissions } from './missions.js';
import { createHud, updateHud, showStartMenu, showPauseMenu, showEndScreen, hideMenu, flashCenter } from './hud.js';
import { AudioEngine } from './audio.js';
import { applyShot, keepPursuitInFrame } from './shots.js';

const query = new URLSearchParams(window.location.search);
const shotName = query.get('shot');
const isShot = shotName !== null;

// Renderer, scene, camera.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(40, 55, -90);

// World and actors.
const world = buildWorld(scene);
const player = createPlayer(scene);
const traffic = createTraffic(scene, world.streets);
const police = createPolice(scene);
const missions = createMissions(scene);
const hud = createHud();
const audio = new AudioEngine();

// Parked cars Dio can steal, scattered near road corners.
const parkedCars = [];
const parkedSpots = [
  [24, 24, 0, 0], [-36, 44, Math.PI / 2, 1], [44, -36, -Math.PI / 2, 2],
  [-44, -44, Math.PI, 3], [84, 4, 0, 4], [-84, -4, Math.PI, 0],
  [4, 84, Math.PI / 2, 1], [-4, -84, -Math.PI / 2, 2], [124, 124, Math.PI / 4, 3],
];
for (const [x, z, yaw, mi] of parkedSpots) {
  parkedCars.push(createCar(scene, CAR_MODELS[mi], x, z, yaw));
}

// The shared state object every module reads and writes.
const game = {
  scene, camera, renderer, world, player, traffic, police, missions, hud, audio,
  parkedCars, streets: world.streets,
  playerCar: null,
  mode: 'menu',
  cameraYaw: 0,
  cameraPitch: 0.32,
  camDistance: 13,
  gameMinutes: 12 * 60,
  vistaMode: false,
  shotName,
  // Screenshot hooks, set by applyShot; both false during normal play.
  shotAutoDrive: false,
  shotChase: false,
  fixedCam: null,
  step,
};

// Keyboard state. Mouse drag orbits the camera; a still click shoots.
const input = {
  forward: false, back: false, left: false, right: false,
  run: false, handbrake: false,
};
const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

window.addEventListener('keydown', (e) => {
  const action = KEYMAP[e.code];
  if (action) { input[action] = true; e.preventDefault(); }
  if (e.code === 'Enter') onEnter();
  if (e.code === 'Escape') onEscape();
  if (e.code === 'KeyE') onEnterExitCar();
  if (e.code === 'KeyF') onPunch();
  if (e.code === 'KeyM') {
    audio.init();
    const muted = audio.toggleMute();
    flashCenter(hud, muted ? 'Sound muted' : 'Sound on', 1200);
  }
});
window.addEventListener('keyup', (e) => {
  const action = KEYMAP[e.code];
  if (action) input[action] = false;
});

let dragging = false;
let lastX = 0;
let lastY = 0;
renderer.domElement.addEventListener('mousedown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  audio.init();
});
window.addEventListener('mouseup', (e) => {
  if (dragging && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 6) onShoot();
  dragging = false;
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  game.cameraYaw -= (e.clientX - lastX) * 0.005;
  game.cameraPitch = Math.max(0.08, Math.min(1.1, game.cameraPitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
});

function onEnter() {
  audio.init();
  if (game.mode === 'menu') {
    game.mode = 'play';
    hideMenu(hud);
    if (missions.state === 'idle') startMission(missions, police, 0);
    flashCenter(hud, 'Mission 1 — First Wheels', 2600);
  } else if (game.mode === 'busted' || game.mode === 'wasted') {
    respawn();
  } else if (game.mode === 'play' && (missions.state === 'done' || missions.state === 'idle')) {
    advanceMission(missions, police, onMissionReward);
    flashCenter(hud, missions.def ? `Mission ${missions.def.id} — ${missions.def.title}` : '', 2600);
  }
}

function onEscape() {
  if (game.mode === 'play') {
    game.mode = 'pause';
    showPauseMenu(hud, missions);
    saveGame();
  } else if (game.mode === 'pause') {
    game.mode = 'play';
    hideMenu(hud);
  }
}

function onEnterExitCar() {
  if (game.mode !== 'play') return;
  if (game.playerCar) {
    // Step out beside the car.
    const car = game.playerCar;
    game.playerCar = null;
    player.x = car.x + Math.sin(car.yaw + Math.PI / 2) * 2.5;
    player.z = car.z + Math.cos(car.yaw + Math.PI / 2) * 2.5;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
  } else {
    const car = nearestCar([...parkedCars, ...traffic.cars], player.x, player.z, 4.5);
    if (car) {
      game.playerCar = car;
      player.mesh.visible = false;
      player.x = car.x;
      player.z = car.z;
      if (parkedCars.includes(car)) {
        addWanted(police, 1);
        flashCenter(hud, 'Car stolen — the Bay Patrol noticed!', 2200);
      }
      audio.pickup();
    }
  }
}

function onPunch() {
  if (game.mode !== 'play' || game.playerCar) return;
  const hit = punch(player, traffic.pedestrians, police.cops);
  if (hit) {
    addWanted(police, 1);
    for (const p of traffic.pedestrians) {
      if (Math.hypot(p.x - player.x, p.z - player.z) < 20) p.flee = true;
    }
  }
}

function onShoot() {
  if (game.mode !== 'play' || game.playerCar || !player.hasPistol || player.ammo <= 0) return;
  player.ammo -= 1;
  audio.gunshot();
  addWanted(police, 1);
  const targets = [...traffic.pedestrians, ...police.cops].filter((t) => t.health > 0);
  let best = null;
  let bestScore = 1e9;
  for (const t of targets) {
    const dx = t.x - player.x;
    const dz = t.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d > 40) continue;
    const angle = Math.atan2(dx, dz);
    let diff = Math.abs(angle - player.yaw);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const score = d + diff * 20;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  if (best) {
    best.health -= 50;
    best.flee = true;
    flashCenter(hud, 'Hit!', 600);
  }
}

function onMissionReward(kind) {
  if (kind === 'pistol') {
    player.hasPistol = true;
    player.ammo = 24;
    flashCenter(hud, 'Pistol unlocked — 24 rounds', 2600);
  }
}

function respawn() {
  player.health = CONFIG.playerHealth;
  police.wanted = 0;
  police.decayTimer = 0;
  player.x = 20;
  player.z = 20;
  player.mesh.visible = true;
  player.mesh.position.set(20, 0, 20);
  game.playerCar = null;
  game.mode = 'play';
  hideMenu(hud);
  if (missions.state === 'active') {
    startMission(missions, police, missions.index);
  }
}

function saveGame() {
  try {
    localStorage.setItem('solara-bay-save', JSON.stringify({
      x: player.x, z: player.z, cash: missions.cash,
      mission: missions.index, state: missions.state,
      hasPistol: player.hasPistol,
    }));
  } catch (e) { /* storage may be unavailable in headless runs */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('solara-bay-save');
    if (!raw) return false;
    const save = JSON.parse(raw);
    player.x = save.x || 20;
    player.z = save.z || 20;
    missions.cash = save.cash || 0;
    player.hasPistol = !!save.hasPistol;
    if (save.hasPistol) player.ammo = 24;
    player.mesh.position.set(player.x, 0, player.z);
    return true;
  } catch (e) {
    return false;
  }
}

// One fixed simulation step: traffic, police, missions, HUD, audio.
function step(dt) {
  game.gameMinutes = (game.gameMinutes + dt * 2) % 1440;
  updateTraffic(traffic, world.streets, dt, { x: player.x, z: player.z });
  const end = updatePolice(police, player, game.playerCar, dt);
  if (end && game.mode === 'play') {
    game.mode = end;
    showEndScreen(hud, end);
    saveGame();
  }
  const missionEvent = updateMissions(missions, police, player, game.playerCar, dt, onMissionReward);
  if (missionEvent === 'complete') {
    audio.pickup();
    flashCenter(hud, `Mission complete! Cash: $${missions.cash}`, 2800);
    saveGame();
  } else if (missionEvent === 'pickup' || missionEvent === 'crate' || missionEvent === 'robbed') {
    audio.pickup();
  }
  const speedRatio = game.playerCar ? Math.abs(game.playerCar.speed) / game.playerCar.topSpeed : 0;
  audio.setEngine(speedRatio, !!game.playerCar);
  audio.siren(police.wanted > 0);
  updateHud(hud, game);
  // The mission beacon spins so it reads at a glance.
  if (missions.beacon.visible) missions.beacon.rotation.y += dt * 0.8;
}

function updateCamera(dt) {
  if (game.fixedCam) {
    // A screenshot state pinned the camera: hold the exact framing.
    camera.position.set(game.fixedCam.pos[0], game.fixedCam.pos[1], game.fixedCam.pos[2]);
    camera.lookAt(game.fixedCam.look[0], game.fixedCam.look[1], game.fixedCam.look[2]);
    return;
  }
  if (game.vistaMode) return; // the start shot keeps its own vista
  let targetX;
  let targetZ;
  let targetYaw;
  if (game.playerCar) {
    targetX = game.playerCar.x;
    targetZ = game.playerCar.z;
    targetYaw = game.playerCar.yaw;
  } else {
    targetX = player.x;
    targetZ = player.z;
    targetYaw = player.yaw;
  }
  // Chase camera follows behind the heading, blended with the orbit drag.
  const followYaw = game.playerCar ? targetYaw : game.cameraYaw;
  const dist = game.playerCar ? game.camDistance : 9;
  const height = 4.5 + game.cameraPitch * 4;
  const cx = targetX - Math.sin(followYaw) * dist;
  const cz = targetZ - Math.cos(followYaw) * dist;
  camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 5);
  camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 5);
  camera.lookAt(targetX, 2, targetZ);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (game.mode === 'play') {
    // Screenshot states drive themselves: full throttle, no steering.
    if (game.shotAutoDrive) input.forward = true;
    if (game.playerCar) {
      driveCar(game.playerCar, input, dt, world.colliders);
      player.x = game.playerCar.x;
      player.z = game.playerCar.z;
    } else {
      walkPlayer(player, input, game.cameraYaw, dt, world.colliders);
    }
    step(dt);
    // Chase shots keep the cruisers glued into the frame behind Dio.
    if (game.shotChase) keepPursuitInFrame(game);
  } else if (game.mode === 'menu' && game.vistaMode) {
    // Slow orbit around the tower behind the start screen.
    const t = performance.now() / 1000;
    camera.position.set(Math.sin(t * 0.05) * 90, 55, Math.cos(t * 0.05) * 90 - 20);
    camera.lookAt(0, 15, 40);
    updateTraffic(traffic, world.streets, dt, { x: player.x, z: player.z });
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Boot: load a save, show the start menu, then run a shot state if asked.
loadGame();
showStartMenu(hud);
if (isShot) {
  hideMenu(hud);
  applyShot(game, shotName);
  updateHud(hud, game);
  renderer.render(scene, camera);
} else {
  game.mode = 'menu';
}
loop();
