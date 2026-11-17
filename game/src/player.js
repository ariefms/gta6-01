// Solara Bay — Dio Santana on foot: third-person movement, camera orbit,
// punching and pistol combat.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolveCollisions } from './world.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e6f8e });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), shirt);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
  head.position.y = 1.85;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
  cap.position.y = 2.1;
  group.add(cap);
  for (const x of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.32), pants);
    leg.position.set(x, 0.43, 0);
    group.add(leg);
  }
  group.position.set(20, 0, 20);
  scene.add(group);
  return {
    mesh: group,
    x: 20, z: 20, yaw: 0,
    health: CONFIG.playerHealth,
    speed: 0,
    hasPistol: false,
    ammo: 0,
  };
}

// Move relative to the camera yaw; returns true while moving.
export function walkPlayer(player, input, camYaw, dt, colliders) {
  const run = input.run ? CONFIG.runSpeed : CONFIG.walkSpeed;
  let mx = 0;
  let mz = 0;
  if (input.forward) { mx += Math.sin(camYaw); mz += Math.cos(camYaw); }
  if (input.back) { mx -= Math.sin(camYaw); mz -= Math.cos(camYaw); }
  if (input.left) { mx += Math.sin(camYaw - Math.PI / 2); mz += Math.cos(camYaw - Math.PI / 2); }
  if (input.right) { mx += Math.sin(camYaw + Math.PI / 2); mz += Math.cos(camYaw + Math.PI / 2); }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    const nx = player.x + mx * run * dt;
    const nz = player.z + mz * run * dt;
    const [rx, rz] = resolveCollisions(nx, nz, 0.6, colliders);
    player.x = rx;
    player.z = rz;
    player.yaw = Math.atan2(mx, mz);
    player.speed = run;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.yaw;
    // Simple walk bob.
    player.mesh.position.y = Math.abs(Math.sin(performance.now() / 90)) * 0.06;
    return true;
  }
  player.speed = 0;
  player.mesh.position.y = 0;
  return false;
}

// A punch: nearest pedestrian or cop within 2 m takes damage and stumbles.
export function punch(player, pedestrians, cops) {
  let hit = null;
  let bestD = 2.2;
  for (const p of [...pedestrians, ...cops]) {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < bestD) { bestD = d; hit = p; }
  }
  if (hit) {
    hit.health = (hit.health || 100) - 34;
    hit.flee = true;
    hit.x += Math.sin(player.yaw) * 1.5;
    hit.z += Math.cos(player.yaw) * 1.5;
  }
  return hit;
}
