// Solara Bay — the procedural city. Seeded, so the same seed builds the same
// city every load: roads, blocks, buildings with canvas window textures,
// street props, a beach and sea, and the landmarks (tower, stadium, harbour).
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng, range, pick, pickInt } from './random.js';

// Make a window texture on a canvas: lit and dark windows on a facade colour.
export function makeFacadeTexture(rng, baseColor, floors, cols) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const lit = rng() < 0.45;
      ctx.fillStyle = lit ? '#ffe9a8' : '#2c3a4a';
      const x = 10 + c * ((128 - 20) / cols);
      const y = 12 + f * ((256 - 24) / floors);
      ctx.fillRect(x, y, (128 - 20) / cols - 6, (256 - 24) / floors - 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene) {
  const rng = makeRng(CONFIG.seed);
  const colliders = [];
  const streets = [];
  for (let k = -4; k <= 4; k++) streets.push(k * CONFIG.block);

  // Sky, sun, fog.
  scene.background = new THREE.Color(CONFIG.skyBottom);
  scene.fog = new THREE.Fog(0xcfe4ee, CONFIG.fogNear, CONFIG.fogFar);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(CONFIG.sunColor, 2.2);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.shadowSize, CONFIG.shadowSize);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 600;
  scene.add(sun);

  // Ground: grass-ish base under everything.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x7fae6a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads: dark asphalt strips with pale centre dashes, plus sidewalks.
  const roadMat = new THREE.MeshLambertMaterial({ color: CONFIG.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: CONFIG.sidewalk });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e9c8 });
  const citySpan = 400;
  for (const s of streets) {
    for (const [w, h, x, z, rot] of [
      [citySpan, CONFIG.roadWidth, 0, s, 0],
      [CONFIG.roadWidth, citySpan, s, 0, 0],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, z);
      road.receiveShadow = true;
      scene.add(road);
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, h + 6), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.005, z);
      scene.add(walk);
    }
    // Centre dashes along each street.
    for (let d = -180; d <= 180; d += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(d, 0.02, s);
      scene.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(s, 0.02, d);
      scene.add(dash2);
    }
  }

  // Buildings: one or two per block, varied height and colour.
  const facadeTextures = [];
  for (let v = 0; v < 5; v++) {
    facadeTextures.push(
      makeFacadeTexture(rng, '#' + pick(rng, CONFIG.buildingPalette).toString(16).padStart(6, '0'), pickInt(rng, 6, 12), pickInt(rng, 4, 6))
    );
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });
  for (let i = -4; i < 4; i++) {
    for (let j = -4; j < 4; j++) {
      const cx = i * CONFIG.block + CONFIG.block / 2;
      const cz = j * CONFIG.block + CONFIG.block / 2;
      if (cz > 160) continue; // beach side stays open
      if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue; // plaza keeps the tower
      const count = rng() < 0.35 ? 2 : 1;
      for (let b = 0; b < count; b++) {
        const w = range(rng, 10, 16);
        const d = range(rng, 10, 16);
        const h = range(rng, 10, 42);
        const ox = count === 2 ? (b === 0 ? -8 : 8) : 0;
        const oz = count === 2 ? (b === 0 ? -8 : 8) : 0;
        const tex = pick(rng, facadeTextures);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(cx + ox, h / 2, cz + oz);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofMat);
        roof.position.set(cx + ox, h + 0.3, cz + oz);
        scene.add(roof);
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
      }
    }
  }

  // Solara Tower — the landmark at the city centre plaza.
  const towerMat = new THREE.MeshLambertMaterial({ map: facadeTextures[1], color: 0xffffff });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(22, 95, 22), towerMat);
  tower.position.set(0, 47.5, 0);
  tower.castShadow = true;
  scene.add(tower);
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 3, 18, 8),
    new THREE.MeshLambertMaterial({ color: 0xf2c230 })
  );
  spire.position.set(0, 104, 0);
  scene.add(spire);
  colliders.push({ minX: -11, maxX: 11, minZ: -11, maxZ: 11 });

  // Bay National bank — mission 5 target, gold-trimmed facade.
  const bank = new THREE.Mesh(
    new THREE.BoxGeometry(26, 18, 20),
    new THREE.MeshLambertMaterial({ color: 0xe8d9a0 })
  );
  bank.position.set(0, 9, -140);
  bank.castShadow = true;
  scene.add(bank);
  colliders.push({ minX: -13, maxX: 13, minZ: -150, maxZ: -130 });

  // Solara Stadium — a wide ringed bowl on the east side.
  const stadium = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 30, 14, 24),
    new THREE.MeshLambertMaterial({ color: 0x9db8c9 })
  );
  stadium.position.set(140, 7, -100);
  stadium.castShadow = true;
  scene.add(stadium);
  colliders.push({ minX: 110, maxX: 170, minZ: -130, maxZ: -70 });

  // Harbour piers jutting into the sea at the south edge.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  for (const px of [-80, 0, 80]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 40), pierMat);
    pier.position.set(px, 0.75, 210);
    scene.add(pier);
  }

  // Beach sand and the sea.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 60),
    new THREE.MeshLambertMaterial({ color: CONFIG.sandColor })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 200);
  sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 220),
    new THREE.MeshLambertMaterial({ color: CONFIG.seaColor })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.0, 340);
  scene.add(sea);

  // Street props: lamps and palm trees along the streets.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  for (const s of streets) {
    for (let d = -160; d <= 160; d += 40) {
      if (rng() < 0.5) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 6), lampMat);
      pole.position.set(s + 8, 3.5, d);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
      bulb.position.set(s + 8, 7.2, d);
      scene.add(bulb);
      if (rng() < 0.6) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
        trunk.position.set(s - 8, 2.5, d + 12);
        scene.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 8), leafMat);
        leaves.position.set(s - 8, 6.5, d + 12);
        scene.add(leaves);
      }
    }
  }

  // A few clouds for the sun-soaked sky.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let c = 0; c < 10; c++) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 8, 16), 8, 6), cloudMat);
    cloud.scale.y = 0.4;
    cloud.position.set(range(rng, -260, 260), range(rng, 90, 130), range(rng, -260, 260));
    scene.add(cloud);
  }

  return { colliders, streets, rng };
}

// Circle (player / car) vs building AABB push-out. Returns corrected x,z.
export function resolveCollisions(x, z, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        z = nz + (dz / d) * radius;
      } else {
        x = c.maxX + radius;
      }
    }
  }
  const bound = CONFIG.halfCity + 60;
  x = Math.max(-bound, Math.min(bound, x));
  z = Math.max(-bound, Math.min(bound, z));
  return [x, z];
}
