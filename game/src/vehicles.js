// Solara Bay — vehicles. Procedural cars (box body, cabin, wheels, lights),
// arcade driving physics, enter/exit, and stealing.
import * as THREE from 'three';
import { CONFIG, CAR_MODELS } from './config.js';
import { resolveCollisions } from './world.js';

export function makeCarMesh(model, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2b3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glass);
  cabin.position.set(0, 1.3, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPos = [[-1.0, 0.42, 1.45], [1.0, 0.42, 1.45], [-1.0, 0.42, -1.45], [1.0, 0.42, -1.45]];
  for (const [x, y, z] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, y, z);
    group.add(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.7, 0.7]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    light.position.set(x, 0.7, 2.22);
    group.add(light);
  }
  if (model.name === 'Bay Taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
    sign.position.set(0, 1.75, -0.2);
    group.add(sign);
  }
  if (model.name === 'Harbor Truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 2.0), new THREE.MeshLambertMaterial({ color: 0x5a6a7a }));
    bed.position.set(0, 1.1, -1.4);
    group.add(bed);
  }
  return group;
}

export function createCar(scene, model, x, z, yaw) {
  const mesh = makeCarMesh(model, model.color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw || 0;
  scene.add(mesh);
  return {
    mesh, model,
    x, z, yaw: yaw || 0,
    speed: 0,
    steer: 0,
    isPolice: false,
    topSpeed: model.topSpeed,
  };
}

// Arcade driving: accelerate, brake, steer, handbrake, drag, building push-out.
export function driveCar(car, input, dt, colliders) {
  const fwd = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  if (fwd) car.speed += car.model.accel * dt;
  if (back) {
    if (car.speed > 0.5) car.speed -= CONFIG.carBrake * dt;
    else car.speed -= car.model.accel * 0.5 * dt;
  }
  if (input.handbrake) car.speed *= Math.max(0, 1 - 3.5 * dt);
  car.speed -= car.speed * CONFIG.carDrag * dt * 0.4;
  car.speed = Math.max(-CONFIG.carReverseMax, Math.min(car.topSpeed, car.speed));
  if (!fwd && !back && Math.abs(car.speed) < 0.4) car.speed = 0;
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.yaw += steerInput * CONFIG.carTurn * dt * Math.min(1, Math.abs(car.speed) / 8) * dir;
  const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
  const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
  const [rx, rz] = resolveCollisions(nx, nz, 1.6, colliders);
  if (rx !== nx || rz !== nz) car.speed *= 0.55;
  car.x = rx;
  car.z = rz;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  return Math.abs(car.speed);
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
