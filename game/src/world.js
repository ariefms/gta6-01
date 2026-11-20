// Solara Bay — the procedural city, golden-hour edition.
// One seeded stream builds the same city every load: roads, blocks,
// buildings with canvas window textures, neon signs, street props, a beach
// and the sea, plus the landmarks (tower, stadium, harbour). The RNG calls
// run in the same order as the first build, so the city footprint is stable
// — only the light, the palette and the dressing change.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng, range, pick, pickInt } from './random.js';
import { mountSignage } from './signs.js';

// Paint a facade on a canvas: warm lit windows scattered over a base colour.
export function paintFacade(rng, baseColour, floors, cols) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColour;
  ctx.fillRect(0, 0, 128, 256);
  // A shaded band along the top edge so rooflines read at a glance.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 128, 10);
  const cellW = (128 - 20) / cols;
  const cellH = (256 - 24) / floors;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const lit = rng() < 0.55;
      ctx.fillStyle = lit ? '#ffe9a8' : '#2c3a4a';
      ctx.fillRect(10 + c * cellW, 12 + f * cellH, cellW - 6, cellH - 8);
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

  // Golden hour: a low warm sun, warm haze, the city stops washing out.
  scene.background = new THREE.Color(CONFIG.skyBottom);
  scene.fog = new THREE.Fog(0xf7d9a8, CONFIG.fogNear, CONFIG.fogFar);
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x8a6a4a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(CONFIG.sunColor, 2.6);
  sun.position.set(180, 90, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.shadowSize, CONFIG.shadowSize);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 600;
  scene.add(sun);

  // Grass base under the whole map.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x7fae6a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads: asphalt strips with pale centre dashes, sidewalks underneath.
  const roadMat = new THREE.MeshLambertMaterial({ color: CONFIG.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: CONFIG.sidewalk });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e9c8 });
  const citySpan = 400;
  for (const s of streets) {
    for (const [w, h, x, z] of [
      [citySpan, CONFIG.roadWidth, 0, s],
      [CONFIG.roadWidth, citySpan, s, 0],
    ]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, h + 6), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.005, z);
      scene.add(walk);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, z);
      road.receiveShadow = true;
      scene.add(road);
    }
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

  // Five facade textures, shared across the buildings.
  const facadeTextures = [];
  for (let v = 0; v < 5; v++) {
    facadeTextures.push(
      paintFacade(
        rng,
        '#' + pick(rng, CONFIG.buildingPalette).toString(16).padStart(6, '0'),
        pickInt(rng, 6, 12),
        pickInt(rng, 4, 6)
      )
    );
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });
  const acMat = new THREE.MeshLambertMaterial({ color: 0x8a929a });
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const mastMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
  const awningCols = [0xc23b3b, 0x2e8f8a, 0xf2c230, 0x4a7fb5];
  const buildingRecords = [];
  for (let i = -4; i < 4; i++) {
    for (let j = -4; j < 4; j++) {
      const cx = i * CONFIG.block + CONFIG.block / 2;
      const cz = j * CONFIG.block + CONFIG.block / 2;
      if (cz > 160) continue; // the beach side stays open
      if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue; // the plaza keeps the tower
      const count = rng() < 0.35 ? 2 : 1;
      for (let b = 0; b < count; b++) {
        const w = range(rng, 10, 16);
        const d = range(rng, 10, 16);
        const h = range(rng, 10, 42);
        const ox = count === 2 ? (b === 0 ? -8 : 8) : 0;
        const oz = count === 2 ? (b === 0 ? -8 : 8) : 0;
        const bx = cx + ox;
        const bz = cz + oz;
        const tex = pick(rng, facadeTextures);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(bx, h / 2, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofMat);
        roof.position.set(bx, h + 0.3, bz);
        scene.add(roof);
        // Rooftop dressing, picked by block index so it costs no RNG:
        // AC boxes, water towers on tall roofs, antenna masts, setbacks.
        if ((i + j) % 3 === 0) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), acMat);
          ac.position.set(bx - w / 4, h + 1.0, bz - d / 4);
          scene.add(ac);
        }
        if ((i + j) % 3 === 1 && h > 20) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 10), tankMat);
          tank.position.set(bx + w / 4, h + 1.9, bz + d / 4);
          scene.add(tank);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 10), tankMat);
          cone.position.set(bx + w / 4, h + 3.8, bz + d / 4);
          scene.add(cone);
        }
        if ((i + j) % 4 === 0) {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 6), mastMat);
          mast.position.set(bx + w / 3, h + 3.8, bz - d / 3);
          scene.add(mast);
        }
        if (h > 28) {
          const setback = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.55, 3.2, d * 0.55),
            new THREE.MeshLambertMaterial({ map: tex })
          );
          setback.position.set(bx, h + 2.2, bz);
          setback.castShadow = true;
          scene.add(setback);
        }
        // Ground-floor awning in an accent colour, facing the nearer street.
        if ((i + j) % 2 === 0) {
          const awn = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 0.25, 1.6),
            new THREE.MeshLambertMaterial({ color: awningCols[(i + j + 8) % 4] })
          );
          awn.position.set(bx, 3.4, bz + d / 2 + 0.8);
          scene.add(awn);
        }
        buildingRecords.push({ x: bx, z: bz, w, d, h });
        colliders.push({
          minX: bx - w / 2, maxX: bx + w / 2,
          minZ: bz - d / 2, maxZ: bz + d / 2,
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

  // Bay National bank — the mission 5 target, gold-trimmed facade.
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
  // Crates stacked on the piers.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  for (const [cx, cz, cy] of [[-82, 200, 1.6], [-78, 206, 1.6], [-82, 200, 3.2], [2, 216, 1.6], [78, 202, 1.6], [82, 210, 1.6]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    crate.position.set(cx, cy, cz);
    crate.castShadow = true;
    scene.add(crate);
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

  // Boats in the harbour: hull, mast, and a small sail.
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8 });
  for (const [bx, bz, yaw] of [[-60, 250, 0.4], [20, 265, -0.3], [90, 245, 0.9]]) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), hullMat);
    hull.position.set(bx, 0.6, bz);
    hull.rotation.y = yaw;
    scene.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), mastMat);
    mast.position.set(bx, 4.5, bz);
    scene.add(mast);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 4), sailMat);
    sail.position.set(bx, 4.2, bz);
    sail.rotation.y = yaw;
    scene.add(sail);
  }

  // Street props: lamps and palms along the streets.
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

  // Traffic lights at four busy intersections: pole, arm, three lamps.
  const lightPoleMat = new THREE.MeshLambertMaterial({ color: 0x22282e });
  const lampRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const lampAmber = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  const lampGreen = new THREE.MeshBasicMaterial({ color: 0x37d67a });
  for (const [lx, lz] of [[48, 48], [-48, -48], [48, -88], [-88, 48]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 6.5, 6), lightPoleMat);
    pole.position.set(lx, 3.25, lz);
    scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.25), lightPoleMat);
    arm.position.set(lx - 1.6, 6.4, lz);
    scene.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), lightPoleMat);
    head.position.set(lx - 3.0, 5.6, lz);
    scene.add(head);
    const lampMats = [lampRed, lampAmber, lampGreen];
    for (let li = 0; li < 3; li++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lampMats[li]);
      lamp.position.set(lx - 3.0, 6.2 - li * 0.55, lz + 0.32);
      scene.add(lamp);
    }
  }

  // Bus stops: shelter roof on two posts with a bench.
  const shelterMat = new THREE.MeshLambertMaterial({ color: 0x2e8f8a });
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  for (const [sx, sz, ry] of [[48, 20, 0], [-48, -60, Math.PI], [20, -48, Math.PI / 2], [-20, 88, -Math.PI / 2]]) {
    const stop = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 2), shelterMat);
    roof.position.y = 2.6;
    stop.add(roof);
    for (const px of [-2, 2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), lightPoleMat);
      post.position.set(px, 1.3, 0.8);
      stop.add(post);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 0.8), benchMat);
    bench.position.set(0, 0.7, 0.4);
    stop.add(bench);
    stop.position.set(sx, 0, sz);
    stop.rotation.y = ry;
    scene.add(stop);
  }

  // Parked cars along the road edges (decorative, off the driving lines).
  const parkedPaints = [0x4a7fb5, 0xf2c230, 0x3fae7a, 0xc23b3b, 0x8a929a];
  const parkedSpots = [
    [44.5, 20, 0], [-44.5, -60, Math.PI], [20, -44.5, Math.PI / 2],
    [-20, 44.5, -Math.PI / 2], [84.5, -20, 0], [-84.5, 60, Math.PI],
    [124.5, 44, 0], [-124.5, -44, Math.PI],
  ];
  parkedSpots.forEach(([px, pz, yaw], pi) => {
    const group = new THREE.Group();
    const paint = new THREE.MeshLambertMaterial({ color: parkedPaints[pi % parkedPaints.length] });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1c2b3a })
    );
    cabin.position.set(0, 1.3, -0.2);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
    for (const [wx, wy, wz] of [[-1, 0.42, 1.45], [1, 0.42, 1.45], [-1, 0.42, -1.45], [1, 0.42, -1.45]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    }
    group.position.set(px, 0, pz);
    group.rotation.y = yaw;
    scene.add(group);
  });

  // Palm rows along the beach.
  for (let px = -160; px <= 160; px += 40) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(px, 2.5, 186);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 8), leafMat);
    leaves.position.set(px, 6.5, 186);
    scene.add(leaves);
  }

  // Neon signs and billboards on the city facades.
  mountSignage(scene, buildingRecords);

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
