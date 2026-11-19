// Solara Bay — deterministic ?shot= scene setups for the entry screenshots.
// Each state fixes the spawn, the speed and the systems it shows, so a
// screenshot is reproducible from its URL alone. The gameplay shots all
// DRIVE: the player car starts at speed with the throttle pinned, traffic
// and pedestrians are staged onto the shot street, and the chase keeps its
// cruisers rubber-banded into the frame behind Dio.
import { startMission } from './missions.js';
import { setWanted } from './police.js';
import { showStartMenu } from './hud.js';
import { CAR_MODELS } from './config.js';
import { createCar } from './vehicles.js';

// Put Dio in a car at a fixed spot, facing down a street, already moving.
export function seatDriver(game, modelIndex, x, z, yaw, startSpeed) {
  const model = CAR_MODELS[modelIndex % CAR_MODELS.length];
  const car = createCar(game.scene, model, x, z, yaw);
  car.speed = startSpeed || 0;
  game.parkedCars.push(car);
  game.playerCar = car;
  game.player.x = x;
  game.player.z = z;
  game.player.mesh.visible = false;
  return car;
}

// Move one traffic car onto a chosen street and lane, driving with the flow.
function stageTrafficCar(game, index, x, z, yaw, speed) {
  const car = game.traffic.cars[index % game.traffic.cars.length];
  car.x = x;
  car.z = z;
  car.yaw = yaw;
  car.speed = speed;
  const northSouth = Math.abs(Math.sin(yaw)) < 0.5;
  car.vertical = northSouth;
  if (northSouth) {
    car.street = Math.round(x / 40) * 40;
    car.dir = Math.cos(yaw) > 0 ? 1 : -1;
    car.lane = x - car.street;
  } else {
    car.street = Math.round(z / 40) * 40;
    car.dir = Math.sin(yaw) > 0 ? 1 : -1;
    car.lane = z - car.street;
  }
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = yaw;
}

// Put one pedestrian on a sidewalk near the action.
function stagePedestrian(game, index, x, z, dir) {
  const p = game.traffic.pedestrians[index % game.traffic.pedestrians.length];
  p.x = x;
  p.z = z;
  p.dir = dir;
  p.flee = false;
  p.mesh.position.set(x, 0, z);
  p.mesh.rotation.y = dir;
}

// Chase formation slots: [metres behind Dio, metres to the side].
// The chase camera sits ~18 m behind Dio (16 m follow + a small lag),
// so the slots sit 8–12 m behind him: 6–10 m ahead of the camera, far
// enough to read whole, close enough to stay in the frame's width.
const PURSUIT_SLOTS = [[8, -4], [10, 4], [12, -5], [9, 5]];

// Keep every cruiser in its slot behind the player car. The police AI
// steers on its own between frames; this nudges any cruiser that drifted
// out of the frame back into formation.
export function keepPursuitInFrame(game) {
  const car = game.playerCar;
  if (!car) return;
  const fx = Math.sin(car.yaw);
  const fz = Math.cos(car.yaw);
  const rx = Math.cos(car.yaw);
  const rz = -Math.sin(car.yaw);
  game.police.cruisers.forEach((cruiser, i) => {
    const slot = PURSUIT_SLOTS[i % PURSUIT_SLOTS.length];
    const tx = car.x - fx * slot[0] + rx * slot[1];
    const tz = car.z - fz * slot[0] + rz * slot[1];
    if (Math.hypot(cruiser.x - tx, cruiser.z - tz) > 6) {
      cruiser.x = tx;
      cruiser.z = tz;
      cruiser.yaw = car.yaw;
      cruiser.speed = Math.max(cruiser.speed, Math.abs(car.speed) * 0.95);
      cruiser.mesh.position.set(tx, 0, tz);
      cruiser.mesh.rotation.y = car.yaw;
    }
  });
}

export function applyShot(game, shot) {
  const { player, police, missions, hud } = game;
  if (shot === 'start') {
    // Start screen over a city vista: camera high above Coral Plaza.
    game.mode = 'menu';
    game.camera.position.set(40, 55, -90);
    game.camera.lookAt(0, 15, 40);
    game.vistaMode = true;
    showStartMenu(hud);
    return;
  }
  // Every other shot plays the game: throttle pinned, car already moving.
  game.mode = 'play';
  game.shotAutoDrive = true;
  if (shot === 'drive') {
    // Solaris Sport eastbound on the 40th street, traffic flowing with it.
    seatDriver(game, 3, -40, 40, Math.PI / 2, 28);
    startMission(missions, police, 0);
    game.cameraYaw = Math.PI / 2;
    game.camDistance = 9;
    stageTrafficCar(game, 0, 0, 37, Math.PI / 2, 11);
    stageTrafficCar(game, 1, 40, 43, Math.PI / 2, 10);
    stageTrafficCar(game, 2, 80, 37, Math.PI / 2, 12);
    stageTrafficCar(game, 3, 80, 43, -Math.PI / 2, 10);
    stageTrafficCar(game, 4, 3, 80, 0, 9);
    stageTrafficCar(game, 5, -3, -20, Math.PI, 11);
    stagePedestrian(game, 0, 20, 48, Math.PI / 2);
    stagePedestrian(game, 1, 60, 32, -Math.PI / 2);
    stagePedestrian(game, 2, -20, 48, Math.PI / 2);
    stagePedestrian(game, 3, 100, 32, -Math.PI / 2);
  } else if (shot === 'chase') {
    // Hot Pursuit: Dio flees north up the 40th avenue at speed, three
    // stars on the HUD, four cruisers riding his bumper. The 40th avenue,
    // not the tower avenue: Solara Tower stands in the middle of the x=0
    // avenue, and a car driving straight up it gets shoved off the road
    // by the tower's collider. The police AI is frozen once the cruisers
    // exist: unfrozen, they catch Dio and ram him
    // (each ram halves his speed), so the formation is held in its slots
    // by keepPursuitInFrame instead of by the chase AI.
    seatDriver(game, 3, 40, 80, Math.PI, 30);
    setWanted(police, 3);
    missions.objective = 'Lose the Bay Patrol — break line of sight!';
    game.shotChase = true;
    game.cameraPitch = 0.3;
    game.camDistance = 16;
    game.cameraYaw = Math.PI;
    stageTrafficCar(game, 0, 37, 40, Math.PI, 12);
    stageTrafficCar(game, 1, 43, 10, Math.PI, 12);
    stageTrafficCar(game, 2, 37, -20, Math.PI, 10);
    stageTrafficCar(game, 3, 43, -60, Math.PI, 12);
    stageTrafficCar(game, 4, 60, 43, Math.PI / 2, 10);
    stageTrafficCar(game, 5, 120, 37, -Math.PI / 2, 10);
    stagePedestrian(game, 0, 32, 60, Math.PI);
    stagePedestrian(game, 1, 48, 30, 0);
    stagePedestrian(game, 2, 32, -10, Math.PI);
    stagePedestrian(game, 3, 48, -50, 0);
  } else if (shot === 'mission') {
    // Package Run, parcel collected: Dio drives north up the -40 street
    // toward the Solara Tower beacon. A fixed cinematic camera holds the
    // beacon, the tower and the car in one frame (the chase camera hides
    // the beacon behind the blocks on this street).
    seatDriver(game, 3, -40, 60, Math.PI, 30);
    startMission(missions, police, 1);
    missions.pickedUp = true;
    missions.objective = 'Parcel collected — deliver it to Solara Tower';
    missions.beacon.position.set(-60, 30, -60);
    missions.marker.position.set(-60, 0.2, -60);
    setWanted(police, 1);
    game.fixedCam = { pos: [-100, 50, 40], look: [-30, 16, -40] };
    stageTrafficCar(game, 0, -43, 10, Math.PI, 12);
    stageTrafficCar(game, 1, -43, 40, Math.PI, 12);
    stageTrafficCar(game, 2, -37, -100, 0, 10);
    stageTrafficCar(game, 3, -37, -20, 0, 11);
    stageTrafficCar(game, 4, 20, -37, Math.PI / 2, 10);
    stageTrafficCar(game, 5, -80, -43, -Math.PI / 2, 10);
    stagePedestrian(game, 0, -48, -10, Math.PI);
    stagePedestrian(game, 1, -32, -40, 0);
    stagePedestrian(game, 2, -48, -50, Math.PI);
    stagePedestrian(game, 3, -32, -60, 0);
  }
  // Let one simulation step run so traffic, police and the beacon settle.
  game.step(0.5);
  if (shot === 'chase') {
    // Freeze the pursuit, then snap the four cruisers into formation.
    // (step() above already spawned them; freezing stops the rams.)
    police.frozen = true;
    keepPursuitInFrame(game);
  }
}
