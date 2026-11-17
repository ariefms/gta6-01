// Solara Bay — the five-mission story chain: sequential objectives, a 3D
// beacon over the target, pickup/delivery, timers, crate collection, and
// cash rewards. All names and story beats are original.
import * as THREE from 'three';
import { CONFIG, MISSION_DEFS } from './config.js';
import { setWanted } from './police.js';

export function createMissions(scene) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.55 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true), beaconMat);
  beacon.position.set(0, 30, 0);
  beacon.visible = false;
  scene.add(beacon);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.4, 20), markerMat);
  marker.position.set(0, 0.2, 0);
  marker.visible = false;
  scene.add(marker);
  return {
    scene,
    beacon,
    marker,
    index: 0,
    state: 'idle', // idle | active | done | complete
    objective: 'Press Enter to start the story',
    cash: 0,
    crates: 0,
    timer: 0,
    pickedUp: false,
    escaped: false,
    def: null,
    cratesMeshes: [],
  };
}

function placeBeacon(missions, x, z) {
  missions.beacon.position.set(x, 30, z);
  missions.beacon.visible = true;
  missions.marker.position.set(x, 0.2, z);
  missions.marker.visible = true;
}

export function startMission(missions, police, index) {
  const def = MISSION_DEFS[index];
  missions.def = def;
  missions.index = index;
  missions.state = 'active';
  missions.objective = def.objective;
  missions.pickedUp = false;
  missions.crates = 0;
  missions.escaped = false;
  missions.timer = def.timeLimit || 0;
  // Clear old crate meshes.
  for (const m of missions.cratesMeshes) missions.scene.remove(m);
  missions.cratesMeshes = [];
  if (def.wantedAtStart) setWanted(police, def.wantedAtStart);
  if (def.targets) {
    for (const [x, z] of def.targets) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.6, 1.6),
        new THREE.MeshLambertMaterial({ color: 0x8a6f4d })
      );
      crate.position.set(x, 0.8, z);
      crate.castShadow = true;
      missions.scene.add(crate);
      missions.cratesMeshes.push(crate);
    }
    placeBeacon(missions, def.targets[0][0], def.targets[0][1]);
  } else if (def.pickup) {
    placeBeacon(missions, def.pickup[0], def.pickup[1]);
  } else {
    placeBeacon(missions, def.target[0], def.target[1]);
  }
  return def;
}

export function completeMission(missions, police, onComplete) {
  const reward = CONFIG.missionReward[missions.index] || 100;
  missions.cash += reward;
  missions.state = 'done';
  missions.objective = `Mission complete! +$${reward} — press Enter for the next mission`;
  missions.beacon.visible = false;
  missions.marker.visible = false;
  for (const m of missions.cratesMeshes) missions.scene.remove(m);
  missions.cratesMeshes = [];
  if (missions.def && missions.def.unlocksPistol) onComplete && onComplete('pistol');
  if (missions.index + 1 >= MISSION_DEFS.length) {
    missions.state = 'complete';
    missions.objective = 'Story complete! You own Solara Bay. Free roam — keep the cash coming.';
  }
}

export function advanceMission(missions, police, onComplete) {
  if (missions.state === 'idle') return startMission(missions, police, 0);
  if (missions.state === 'done' && missions.index + 1 < MISSION_DEFS.length) {
    return startMission(missions, police, missions.index + 1);
  }
  return missions.def;
}

// Per-frame mission logic. Returns 'complete' when a mission just finished.
export function updateMissions(missions, police, player, playerCar, dt, onComplete) {
  if (missions.state !== 'active' || !missions.def) return null;
  const def = missions.def;
  const px = player.x;
  const pz = player.z;
  if (missions.timer > 0) {
    missions.timer -= dt;
    if (missions.timer <= 0) {
      missions.objective = 'Too slow — the deal moved on. Press Enter to retry the mission';
      missions.state = 'idle';
      missions.beacon.visible = false;
      missions.marker.visible = false;
      return 'failed';
    }
  }
  const distTo = (t) => Math.hypot(px - t[0], pz - t[1]);
  if (def.pickup && !missions.pickedUp) {
    if (distTo(def.pickup) < 5) {
      missions.pickedUp = true;
      missions.objective = 'Parcel collected — deliver it to Solara Tower';
      placeBeacon(missions, def.target[0], def.target[1]);
      return 'pickup';
    }
    return null;
  }
  if (def.targets) {
    for (let i = 0; i < missions.cratesMeshes.length; i++) {
      const crate = missions.cratesMeshes[i];
      if (!crate.visible) continue;
      const [x, z] = def.targets[i];
      if (distTo([x, z]) < 4) {
        crate.visible = false;
        missions.crates += 1;
        missions.objective = `Collect 3 supply crates (${missions.crates}/3)`;
        const next = def.targets.find((t, j) => missions.cratesMeshes[j].visible);
        if (next) placeBeacon(missions, next[0], next[1]);
        return 'crate';
      }
    }
    if (missions.crates >= def.targets.length) {
      completeMission(missions, police, onComplete);
      return 'complete';
    }
    return null;
  }
  if (def.id === 3) {
    // Hot Pursuit: win by losing the wanted level entirely.
    if (police.wanted === 0) {
      completeMission(missions, police, onComplete);
      return 'complete';
    }
    missions.objective = `Lose the heat — wanted ${'★'.repeat(police.wanted)}${'☆'.repeat(5 - police.wanted)}`;
    return null;
  }
  if (def.id === 5 && !missions.escaped) {
    if (distTo(def.target) < 6) {
      missions.escaped = true;
      missions.objective = 'Cash grabbed! Escape to the safehouse';
      placeBeacon(missions, def.escape[0], def.escape[1]);
      setWanted(police, 4);
      return 'robbed';
    }
    return null;
  }
  if (def.id === 5 && missions.escaped) {
    if (distTo(def.escape) < 6) {
      completeMission(missions, police, onComplete);
      return 'complete';
    }
    return null;
  }
  if (def.needsCar && !playerCar) {
    missions.objective = 'Steal a car first (walk up to one and press E)';
    return null;
  }
  if (distTo(def.target) < 6) {
    completeMission(missions, police, onComplete);
    return 'complete';
  }
  return null;
}
