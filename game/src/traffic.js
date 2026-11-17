// Solara Bay — traffic: AI cars driving the road graph and pedestrians on
// the sidewalks who walk, and flee when a crime happens nearby.
import * as THREE from 'three';
import { CONFIG, CAR_MODELS } from './config.js';
import { makeRng, pick } from './random.js';
import { createCar } from './vehicles.js';

export function createTraffic(scene, streets) {
  const rng = makeRng(CONFIG.seed + 7);
  const cars = [];
  for (let i = 0; i < CONFIG.trafficCars; i++) {
    const model = pick(rng, CAR_MODELS);
    const vertical = rng() < 0.5;
    const street = pick(rng, streets);
    const along = (rng() * 2 - 1) * 160;
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -3 : 3);
    const x = vertical ? street + lane : along;
    const z = vertical ? along : street + lane;
    const yaw = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(scene, model, x, z, yaw);
    car.vertical = vertical;
    car.street = street;
    car.dir = dir;
    car.lane = lane;
    car.speed = CONFIG.trafficSpeed * (0.7 + rng() * 0.5);
    cars.push(car);
  }
  const pedestrians = [];
  const pedColors = [0xd95f5f, 0x5f7fd9, 0x7fd95f, 0xd9b25f, 0xb25fd9, 0x5fd9c9];
  for (let i = 0; i < CONFIG.pedestrians; i++) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: pick(rng, pedColors) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.35), mat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xc98a5e }));
    head.position.y = 1.7;
    group.add(head);
    const street = pick(rng, streets);
    const along = (rng() * 2 - 1) * 160;
    const side = rng() < 0.5 ? -8 : 8;
    const vertical = rng() < 0.5;
    const x = vertical ? street + side : along;
    const z = vertical ? along : street + side;
    group.position.set(x, 0, z);
    scene.add(group);
    pedestrians.push({
      mesh: group, x, z,
      dir: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.2,
      vertical, street, side,
      health: 100, flee: false,
    });
  }
  return { cars, pedestrians, rng };
}

// Cars drive along their street; at an intersection they may turn onto another.
export function updateTraffic(traffic, streets, dt, playerPos) {
  for (const car of traffic.cars) {
    const speed = car.speed * dt * car.dir;
    if (car.vertical) car.z += speed;
    else car.x += speed;
    const along = car.vertical ? car.z : car.x;
    if (Math.abs(along) > 176) {
      car.dir *= -1;
      car.yaw += Math.PI;
    }
    // At an intersection, sometimes turn onto the crossing street.
    const near = streets.find((s) => Math.abs(along - s) < 1.2);
    if (near !== undefined && traffic.rng() < 0.02) {
      const oldVertical = car.vertical;
      car.vertical = !car.vertical;
      const pos = car.vertical ? car.z : car.x;
      if (oldVertical) { car.x = near + car.lane; car.z = pos; }
      else { car.z = near + car.lane; car.x = pos; }
      car.yaw = car.vertical ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
  }
  for (const p of traffic.pedestrians) {
    if (p.health <= 0) continue;
    let speed = p.speed;
    let dir = p.dir;
    if (p.flee && playerPos) {
      const away = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      dir = away;
      speed = 4.5;
    }
    p.x += Math.sin(dir) * speed * dt;
    p.z += Math.cos(dir) * speed * dt;
    if (Math.abs(p.x) > 175 || Math.abs(p.z) > 175) p.dir += Math.PI;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = dir;
    if (traffic.rng() < 0.002) p.dir = traffic.rng() * Math.PI * 2;
  }
}
