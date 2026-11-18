// Solara Bay — the procedural golden-hour city.
// One seeded build of the whole town: streets, blocks, sun-soaked buildings
// with lit windows, rooftop clutter, neon signs, harbour and beach. The same
// seed always builds the same city, so screenshots are reproducible.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng, range, pick, pickInt } from './random.js';
import { mountSignage } from './signs.js';

// Paint a facade texture on a canvas: warm wall colour, a darker ground
// floor, and a grid of windows, most of them lit gold at dusk.
export function makeFacadeTexture(rng, baseColor, floors, cols) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 232, 128, 24);
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const lit = rng() < 0.55;
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

// A small parked car built from boxes, for street edges (scenery only).
function parkedCarMesh(color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), paint);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x1c2b3a })
  );
  cabin.position.set(0, 1.2, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 0.4, z);
    group.add(wheel);
  }
  return group;
}

export function buildWorld(scene) {
  const rng = makeRng(CONFIG.seed);
  const colliders = [];
  const streets = [];
  for (let k = -4; k <= 4; k++) streets.push(k * CONFIG.block);

  // Golden hour: low warm sun, warm haze, a peach sky that melts into fog.
  scene.background = new THREE.Color(0xffc27a);
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

  // Ground: warm grass base under everything.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x8aa864 })
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
    for (const [w, h, x, z] of [
      [citySpan, CONFIG.roadWidth, 0, s],
      [CONFIG.roadWidth, citySpan, s, 0],
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

  // Buildings: one or two per block, varied height and colour, with
  // setback top floors, rooftop clutter and ground-floor awnings.
  const facadeTextures = [];
  for (let v = 0; v < 5; v++) {
    facadeTextures.push(
      makeFacadeTexture(rng, '#' + pick(rng, CONFIG.buildingPalette).toString(16).padStart(6, '0'), pickInt(rng, 6, 12), pickInt(rng, 4, 6))
    );
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });
  const awningColors = [0xc23b3b, 0x2f8f4e, 0x3b82f6, 0xf2c230];
  const built = [];
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
        // Setback top floor on taller blocks, for varied rooflines.
        if (h > 30) {
          const top = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.55, 5, d * 0.55),
            new THREE.MeshLambertMaterial({ map: pick(rng, facadeTextures) })
          );
          top.position.set(bx, h + 3.1, bz);
          top.castShadow = true;
          scene.add(top);
        }
        // Rooftop clutter: AC boxes, a water tower or an antenna mast.
        if (h > 24) {
          const ac = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 2),
            new THREE.MeshLambertMaterial({ color: 0x9aa0a3 })
          );
          ac.position.set(bx - w / 4, h + 1.1, bz - d / 4);
          scene.add(ac);
          if (rng() < 0.4) {
            const tank = new THREE.Mesh(
              new THREE.CylinderGeometry(1.1, 1.1, 2.5, 10),
              new THREE.MeshLambertMaterial({ color: 0x7a5230 })
            );
            tank.position.set(bx + w / 4, h + 1.9, bz + d / 4);
            scene.add(tank);
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(1.3, 1.2, 10),
              new THREE.MeshLambertMaterial({ color: 0x5a3a20 })
            );
            cone.position.set(bx + w / 4, h + 3.7, bz + d / 4);
            scene.add(cone);
          } else if (rng() < 0.5) {
            const mast = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.12, 6, 6),
              new THREE.MeshLambertMaterial({ color: 0x333a40 })
            );
            mast.position.set(bx + w / 4, h + 3.6, bz - d / 4);
            scene.add(mast);
          }
        }
        // Ground-floor awning in an accent colour, facing south.
        if (rng() < 0.5) {
          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 0.25, 2.2),
            new THREE.MeshLambertMaterial({ color: pick(rng, awningColors) })
          );
          awning.position.set(bx, 3.4, bz + d / 2 + 1.0);
          scene.add(awning);
        }
        colliders.push({
          minX: bx - w / 2, maxX: bx + w / 2,
          minZ: bz - d / 2, maxZ: bz + d / 2,
        });
        built.push({ cx: bx, cz: bz, w, d, h });
      }
    }
  }

  // Neon signs and rooftop billboards on buildings near the shot streets.
  mountSignage(scene, rng, built);

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

  // Harbour piers jutting into the sea at the south edge, with crates.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa88a5a });
  for (const px of [-80, 0, 80]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 40), pierMat);
    pier.position.set(px, 0.75, 210);
    scene.add(pier);
    for (let k = 0; k < 3; k++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crateMat);
      crate.position.set(px - 2 + k * 2.2, 2.1, 200 + k * 3);
      crate.castShadow = true;
      scene.add(crate);
    }
  }

  // Beach sand and the sea, with boats at anchor.
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
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const sailMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0, side: THREE.DoubleSide });
  for (const [bx, bz] of [[-100, 255], [20, 272], [120, 250]]) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 3.2), hullMat);
    hull.position.set(bx, 0.6, bz);
    hull.castShadow = true;
    scene.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 9, 6),
      new THREE.MeshLambertMaterial({ color: 0x5a3a20 })
    );
    mast.position.set(bx, 5, bz);
    scene.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 6), sailMat);
    sail.position.set(bx + 0.5, 6, bz);
    sail.rotation.y = 0.4;
    scene.add(sail);
  }

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

  // Palm rows along the beach.
  for (let x = -150; x <= 150; x += 25) {
    if (rng() < 0.4) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(x, 2.5, 188);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.5, 8), leafMat);
    leaves.position.set(x, 6.8, 188);
    scene.add(leaves);
  }

  // Traffic lights at four busy intersections.
  const lampColors = [0xef4444, 0xf59e0b, 0x22c55e];
  for (const [ix, iz] of [[0, 40], [40, 0], [-60, -60], [40, -40]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 5.5, 6), lampMat);
    pole.position.set(ix + 7.5, 2.75, iz + 7.5);
    scene.add(pole);
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.7, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x1c2228 })
    );
    housing.position.set(ix + 7.5, 5.2, iz + 7.5);
    scene.add(housing);
    lampColors.forEach((c, li) => {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        new THREE.MeshBasicMaterial({ color: c })
      );
      lamp.position.set(ix + 7.5, 5.8 - li * 0.55, iz + 7.8);
      scene.add(lamp);
    });
  }

  // Bus stops: a shelter roof on two posts with a bench.
  const shelterMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
  for (const [bx, bz, rot] of [[20, 48, 0], [-68, -20, Math.PI / 2]]) {
    const shelter = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 2), shelterMat);
    roof.position.y = 2.6;
    shelter.add(roof);
    for (const px of [-2, 2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), lampMat);
      post.position.set(px, 1.3, 0.8);
      shelter.add(post);
    }
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.35, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x8a6f4d })
    );
    bench.position.set(0, 0.6, 0.4);
    shelter.add(bench);
    shelter.position.set(bx, 0, bz);
    shelter.rotation.y = rot;
    scene.add(shelter);
  }

  // Parked cars on quiet side streets, clear of the shot streets.
  const parkedColors = [0x4a7fb5, 0xc23b3b, 0x3fae7a, 0xf2c230, 0x8a7fb5];
  for (const [px, pz, yaw] of [
    [-120, -40, 0], [-120, 60, 0], [120, -20, Math.PI], [120, 80, Math.PI],
    [-40, -120, Math.PI / 2], [80, -120, Math.PI / 2], [-80, 120, -Math.PI / 2], [0, 120, -Math.PI / 2],
  ]) {
    const parked = parkedCarMesh(pick(rng, parkedColors));
    parked.position.set(px, 0, pz);
    parked.rotation.y = yaw;
    scene.add(parked);
    colliders.push({ minX: px - 2.4, maxX: px + 2.4, minZ: pz - 2.4, maxZ: pz + 2.4 });
  }

  // A few clouds for the sun-soaked sky.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfff2dd, transparent: true, opacity: 0.85 });
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
