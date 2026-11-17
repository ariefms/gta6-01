// Solara Bay — deterministic ?shot= scene setups for the entry screenshots.
// Each state fixes the seed, the spawn and the systems it shows, so a
// screenshot is reproducible from its URL alone.
import { startMission, updateMissions } from './missions.js';
import { setWanted } from './police.js';
import { showStartMenu } from './hud.js';
import { CAR_MODELS } from './config.js';
import { createCar } from './vehicles.js';

// Put Dio in a car at a fixed spot, facing down a busy street.
export function putPlayerInCar(game, modelIndex, x, z, yaw) {
  const model = CAR_MODELS[modelIndex % CAR_MODELS.length];
  const car = createCar(game.scene, model, x, z, yaw);
  game.parkedCars.push(car);
  game.playerCar = car;
  game.player.x = x;
  game.player.z = z;
  game.player.mesh.visible = false;
  return car;
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
  // Every other shot plays the game: hide the menu, start the story.
  game.mode = 'play';
  if (shot === 'drive') {
    putPlayerInCar(game, 3, -40, 40, Math.PI / 2); // Solaris Sport, eastbound
    startMission(missions, police, 0);
    game.cameraYaw = Math.PI / 2;
  } else if (shot === 'chase') {
    // Dio flees south down the tower avenue; two cruisers converge ahead
    // so the pursuit reads in frame, with 3 wanted stars on the HUD.
    // Police movement is frozen for this shot so the pose holds.
    putPlayerInCar(game, 0, 0, -100, 0);
    setWanted(police, 3);
    missions.objective = 'Lose the Bay Patrol — break line of sight!';
    game.step(0.5);
    police.frozen = true;
    game.police.cruisers.slice(0, 2).forEach((cruiser, i) => {
      cruiser.x = (i === 0 ? -7 : 7);
      cruiser.z = -100 + 18 + i * 10;
      cruiser.yaw = Math.PI;
      cruiser.speed = 0;
      cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
      cruiser.mesh.rotation.y = Math.PI;
    });
    return;
  } else if (shot === 'mission') {
    // Mission 2 in progress: Dio drives north up the avenue toward the
    // Solara Tower beacon, parcel in the trunk.
    putPlayerInCar(game, 3, 40, 120, Math.PI);
    startMission(missions, police, 1);
    missions.pickedUp = true;
    missions.objective = 'Parcel collected — deliver it to Solara Tower';
    const def = missions.def;
    missions.beacon.position.set(def.target[0], 30, def.target[1]);
    missions.marker.position.set(def.target[0], 0.2, def.target[1]);
    game.cameraYaw = Math.PI;
  }
  // Let one simulation step run so traffic, police and the beacon settle.
  game.step(0.5);
}
