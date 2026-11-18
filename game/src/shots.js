// Solara Bay — screenshot staging for the entry images.
// Each ?shot= state arranges one busy, moving frame: the player car drives
// for real, traffic and pedestrians fill the street, and the HUD shows the
// systems the shot is about. Every setup is deterministic (fixed seed and
// fixed offsets), so a screenshot reproduces from its URL alone.
import { startMission } from './missions.js';
import { setWanted } from './police.js';
import { showStartMenu } from './hud.js';
import { CAR_MODELS } from './config.js';
import { createCar } from './vehicles.js';

// Chase formation slots: [lateral metres, metres behind the player].
const PURSUIT_SLOTS = [
  [-4, 9],
  [4, 13],
  [-7, 16],
  [7, 11],
];

// Put Dio behind the wheel of a fresh car at a fixed spot on a street.
function seatDriver(game, modelIndex, x, z, yaw) {
  const spec = CAR_MODELS[modelIndex % CAR_MODELS.length];
  const car = createCar(game.scene, spec, x, z, yaw);
  game.parkedCars.push(car);
  game.playerCar = car;
  game.player.x = x;
  game.player.z = z;
  game.player.mesh.visible = false;
  return car;
}

// Move one traffic car onto a chosen street at a fixed spot, travelling a
// chosen way, and teach the traffic update to keep it on that street.
function placeTrafficCar(car, x, z, yaw, speed) {
  car.x = x;
  car.z = z;
  car.yaw = yaw;
  car.speed = speed;
  if (yaw === 0 || yaw === Math.PI) {
    car.vertical = true;
    car.street = Math.round(x / 40) * 40;
    car.dir = yaw === 0 ? 1 : -1;
    car.lane = x - car.street;
  } else {
    car.vertical = false;
    car.street = Math.round(z / 40) * 40;
    car.dir = yaw === Math.PI / 2 ? 1 : -1;
    car.lane = z - car.street;
  }
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = yaw;
}

// Stand one pedestrian on a sidewalk at a fixed spot.
function placePedestrian(ped, x, z, dir) {
  ped.x = x;
  ped.z = z;
  ped.dir = dir;
  ped.mesh.position.set(x, 0, z);
  ped.mesh.rotation.y = dir;
}

// Chase framing: after every simulation step, glue each cruiser into a
// staggered slot behind the player, same heading, same speed. The police
// still chase (their sirens flash and they steer), but the pursuit can no
// longer drift out of the frame or pile into the player.
export function keepPursuitInFrame(game) {
  const car = game.playerCar;
  if (!car) return;
  const fx = Math.sin(car.yaw);
  const fz = Math.cos(car.yaw);
  const rx = -Math.cos(car.yaw);
  const rz = Math.sin(car.yaw);
  game.police.cruisers.forEach((cruiser, i) => {
    const slot = PURSUIT_SLOTS[i % PURSUIT_SLOTS.length];
    cruiser.x = car.x - fx * slot[1] + rx * slot[0];
    cruiser.z = car.z - fz * slot[1] + rz * slot[0];
    cruiser.yaw = car.yaw;
    cruiser.speed = car.speed;
    cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
    cruiser.mesh.rotation.y = cruiser.yaw;
  });
}

export function applyShot(game, shot) {
  const { player, police, missions, hud, traffic } = game;
  if (shot === 'start') {
    // Start screen over a city vista: camera high above Coral Plaza.
    game.mode = 'menu';
    game.camera.position.set(40, 55, -90);
    game.camera.lookAt(0, 15, 40);
    game.vistaMode = true;
    showStartMenu(hud);
    return;
  }
  // Every other shot plays the game: hide the menu, start the story.
  game.mode = 'play';
  if (shot === 'drive') {
    // Dio in the Solaris Sport, eastbound down the marina avenue at speed,
    // with the street full of traffic and people on the sidewalks.
    const car = seatDriver(game, 3, -140, 40, Math.PI / 2);
    car.speed = 30;
    game.shotAutoDrive = true;
    game.cameraYaw = Math.PI / 2;
    startMission(missions, police, 0);
    const cars = traffic.cars;
    placeTrafficCar(cars[0], -80, 43, Math.PI / 2, 44);
    placeTrafficCar(cars[1], -30, 43, Math.PI / 2, 44);
    placeTrafficCar(cars[2], 10, 43, Math.PI / 2, 12);
    placeTrafficCar(cars[3], 110, 37, -Math.PI / 2, 12);
    placeTrafficCar(cars[4], 140, 37, -Math.PI / 2, 12);
    const peds = traffic.pedestrians;
    placePedestrian(peds[0], 30, 48, Math.PI / 2);
    placePedestrian(peds[1], 55, 32, -Math.PI / 2);
    placePedestrian(peds[2], 70, 48, Math.PI / 2);
    placePedestrian(peds[3], 20, 32, -Math.PI / 2);
  } else if (shot === 'chase') {
    // Dio flees south down the tower avenue in the Solaris Sport while the
    // Bay Patrol rides his bumper — three stars, sirens, traffic ahead.
    const car = seatDriver(game, 3, 40, -140, 0);
    car.speed = 30;
    game.shotAutoDrive = true;
    game.shotChase = true;
    game.cameraPitch = 0.15;
    game.cameraDist = 20;
    startMission(missions, police, 2);
    const cars = traffic.cars;
    placeTrafficCar(cars[0], 43, -100, 0, 44);
    placeTrafficCar(cars[1], 43, -70, 0, 44);
    placeTrafficCar(cars[2], 37, 118, Math.PI, 12);
    const peds = traffic.pedestrians;
    placePedestrian(peds[0], 48, 30, 0);
    placePedestrian(peds[1], 32, 55, Math.PI);
    placePedestrian(peds[2], 48, 70, 0);
  } else if (shot === 'mission') {
    // Mission 2 in progress: parcel already collected, Dio drives north up
    // the tower avenue toward the glowing beacon, one cruiser far behind.
    // Fixed cinematic camera (vistaMode): the chase camera can never show
    // the beacon (-60,-60) and the tower (0,0) together — from the street
    // they are ~90 deg apart, wider than the 88 deg horizontal FOV, and
    // the chase-cam lag puts the beacon behind the (-52,-12) tower block
    // (six chase shots, beacon never once in frame). Camera (-100,25,40)
    // looks north-east at (-30,16,-40): the beacon reads left-centre, the
    // tower right, and Dio's car (at ~z=-8 after 45 s wall, 173 km/h)
    // drives through the middle of the frame. Sightlines ray-tested
    // against the seeded city (seed 1337): beacon y=15..55 and tower
    // y=30..60 both clear, camera clear of every building. Camera height
    // 50 m: at 25 m the player's car was hidden behind the (-68,12)
    // block; at 50 m the ray to the car clears it.
    // Staging math: SwiftShader runs ~0.083 game-s per wall second, so in
    // 45 s the Solaris covers ~160 m from its z=152 start.
    const car = seatDriver(game, 3, -40, 152, Math.PI);
    car.speed = 30;
    game.shotAutoDrive = true;
    game.camera.position.set(-100, 50, 40);
    game.camera.lookAt(-30, 16, -40);
    game.vistaMode = true;
    startMission(missions, police, 1);
    missions.pickedUp = true;
    missions.objective = 'Parcel collected — deliver it to Solara Tower';
    const def = missions.def;
    missions.beacon.position.set(def.target[0], 30, def.target[1]);
    missions.marker.position.set(def.target[0], 0.2, def.target[1]);
    setWanted(police, 1);
    const cars = traffic.cars;
    placeTrafficCar(cars[0], -43, 110, Math.PI, 40);
    placeTrafficCar(cars[1], -43, 80, Math.PI, 40);
    placeTrafficCar(cars[2], -37, -100, 0, 12);
    const peds = traffic.pedestrians;
    placePedestrian(peds[0], -48, -5, Math.PI);
    placePedestrian(peds[1], -32, -25, 0);
    placePedestrian(peds[2], -48, -35, Math.PI);
  }
  // Let one simulation step run so traffic, police and the beacon settle.
  game.step(0.5);
}
