// Solara Bay — the wanted system: crimes raise stars, Bay Patrol cruisers
// spawn and chase, cops brawl on foot, and the heat fades when unseen.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng, pick } from './random.js';
import { createCar } from './vehicles.js';

export function createPolice(scene) {
  return {
    wanted: 0,
    cruisers: [],
    cops: [],
    decayTimer: 0,
    busted: false,
    wasted: false,
    frozen: false, // set by the ?shot=chase setup so the pursuit holds its pose
    rng: makeRng(CONFIG.seed + 21),
    scene,
  };
}

export function addWanted(police, amount) {
  police.wanted = Math.min(CONFIG.maxWanted, police.wanted + amount);
  police.decayTimer = 0;
}

export function setWanted(police, level) {
  police.wanted = Math.max(0, Math.min(CONFIG.maxWanted, level));
  police.decayTimer = 0;
}

// Spawn a black-and-white Bay Patrol cruiser near the player.
export function spawnCruiser(police, px, pz) {
  const scene = police.scene;
  const model = { name: 'Bay Patrol', color: 0x222831, topSpeed: 46, accel: 30 };
  const angle = police.rng() * Math.PI * 2;
  const x = px + Math.sin(angle) * 55;
  const z = pz + Math.cos(angle) * 55;
  const car = createCar(scene, model, x, z, angle);
  car.isPolice = true;
  // White doors: a pale box stripe over the body.
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.12, 0.4, 2.0),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f5 })
  );
  stripe.position.y = 0.7;
  car.mesh.add(stripe);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
  );
  bar.position.y = 1.75;
  car.mesh.add(bar);
  car.lightBar = bar;
  police.cruisers.push(car);
  return car;
}

export function spawnCop(police, px, pz) {
  const scene = police.scene;
  const group = new THREE.Group();
  const uniform = new THREE.MeshLambertMaterial({ color: 0x1f3a5f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), uniform);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0xc98a5e }));
  head.position.y = 1.85;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0x101418 }));
  cap.position.y = 2.1;
  group.add(cap);
  const angle = police.rng() * Math.PI * 2;
  const x = px + Math.sin(angle) * 25;
  const z = pz + Math.cos(angle) * 25;
  group.position.set(x, 0, z);
  scene.add(group);
  const cop = { mesh: group, x, z, health: 100, speed: 5.5, flee: false };
  police.cops.push(cop);
  return cop;
}

// Chase logic: cruisers steer at the player and ram; cops run the player down.
// Returns 'busted' | 'wasted' | null.
export function updatePolice(police, player, playerCar, dt) {
  if (police.frozen) return null;
  const px = player.x;
  const pz = player.z;
  const wanted = police.wanted;
  const wantCruisers = wanted === 0 ? 0 : Math.min(CONFIG.policeCruisersMax, 1 + wanted);
  while (police.cruisers.length < wantCruisers) spawnCruiser(police, px, pz);
  while (police.cruisers.length > wantCruisers) {
    const c = police.cruisers.pop();
    police.scene.remove(c.mesh);
  }
  const wantCops = wanted >= 2 ? Math.min(4, wanted - 1) : 0;
  while (police.cops.length < wantCops) spawnCop(police, px, pz);
  while (police.cops.length > wantCops) {
    const c = police.cops.pop();
    police.scene.remove(c.mesh);
  }
  // Cruisers chase and ram.
  for (const cruiser of police.cruisers) {
    const dx = px - cruiser.x;
    const dz = pz - cruiser.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - cruiser.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    cruiser.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, dy));
    cruiser.speed = Math.min(46, cruiser.speed + 22 * dt);
    cruiser.x += Math.sin(cruiser.yaw) * cruiser.speed * dt;
    cruiser.z += Math.cos(cruiser.yaw) * cruiser.speed * dt;
    cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
    cruiser.mesh.rotation.y = cruiser.yaw;
    if (cruiser.lightBar) {
      cruiser.lightBar.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xef4444 : 0x3b82f6);
    }
    if (dist < 3.2) {
      // Ram: damage the player, slow the cruiser.
      cruiser.speed *= 0.4;
      if (playerCar) {
        playerCar.speed *= 0.5;
      } else {
        player.health -= 22 * dt;
      }
    }
  }
  // Cops on foot chase and brawl.
  for (const cop of police.cops) {
    const dx = px - cop.x;
    const dz = pz - cop.z;
    const dist = Math.hypot(dx, dz) || 1;
    cop.x += (dx / dist) * cop.speed * dt;
    cop.z += (dz / dist) * cop.speed * dt;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = Math.atan2(dx, dz);
    if (dist < 1.6 && !playerCar) {
      player.health -= 18 * dt;
    }
  }
  // Wanted decays when the player is far from every cruiser and cop.
  if (wanted > 0) {
    let nearest = 1e9;
    for (const c of police.cruisers) nearest = Math.min(nearest, Math.hypot(c.x - px, c.z - pz));
    for (const c of police.cops) nearest = Math.min(nearest, Math.hypot(c.x - px, c.z - pz));
    if (nearest > 45) {
      police.decayTimer += dt;
      if (police.decayTimer >= CONFIG.wantedDecaySeconds) {
        police.wanted -= 1;
        police.decayTimer = 0;
      }
    } else {
      police.decayTimer = 0;
    }
  }
  if (player.health <= 0) return 'wasted';
  if (!playerCar) {
    for (const cop of police.cops) {
      if (Math.hypot(cop.x - px, cop.z - pz) < 1.4 && player.health < 30) return 'busted';
    }
  }
  return null;
}
