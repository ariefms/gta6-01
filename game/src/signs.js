// Solara Bay — canvas-texture signs: neon shop signs hung on building
// facades near the streets the shots drive past, plus two freestanding
// rooftop billboards in Coral Plaza. All text is original; the city names
// itself.
import * as THREE from 'three';

// Draw glowing sign text on a canvas and return it as a texture.
function paintSignTexture(text, glow, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.font = 'bold 64px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = glow;
  ctx.fillText(text, 256, 66);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The signs to hang, each near a landmark the shots drive past.
// face: which side of the building carries the sign (W faces the avenue).
const SIGN_SPECS = [
  { text: 'SOLARA', glow: '#ffd23b', bg: '#1c2b3a', near: [20, 40], face: 'W' },
  { text: 'MARINA', glow: '#37d6c8', bg: '#0e2a33', near: [60, 140], face: 'N' },
  { text: 'BAY PATROL', glow: '#5f9dff', bg: '#101418', near: [-20, -40], face: 'W' },
  { text: 'HOTEL', glow: '#ff9e5e', bg: '#2a1a12', near: [20, -120], face: 'W' },
  { text: 'TACOS', glow: '#7dff9a', bg: '#12240f', near: [60, 20], face: 'S' },
  { text: '24H', glow: '#ff5f7a', bg: '#260f18', near: [-60, 60], face: 'E' },
];

function tallestNear(buildings, near) {
  let best = null;
  let bestD = 1e9;
  for (const b of buildings) {
    if (b.h < 12) continue;
    const d = Math.hypot(b.x - near[0], b.z - near[1]);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function hangSign(scene, building, spec) {
  const width = Math.min(12, building.w * 0.85);
  const tex = paintSignTexture(spec.text, spec.glow, spec.bg);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 3),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  const y = Math.min(9, building.h - 3);
  if (spec.face === 'W') {
    panel.position.set(building.x - building.w / 2 - 0.35, y, building.z);
    panel.rotation.y = -Math.PI / 2;
  } else if (spec.face === 'E') {
    panel.position.set(building.x + building.w / 2 + 0.35, y, building.z);
    panel.rotation.y = Math.PI / 2;
  } else if (spec.face === 'S') {
    panel.position.set(building.x, y, building.z + building.d / 2 + 0.35);
    panel.rotation.y = 0;
  } else {
    panel.position.set(building.x, y, building.z - building.d / 2 - 0.35);
    panel.rotation.y = Math.PI;
  }
  scene.add(panel);
}

function raiseBillboard(scene, x, z, yaw, text, glow, bg) {
  const group = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
  for (const px of [-4.5, 4.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), postMat);
    post.position.set(px, 4.5, 0);
    group.add(post);
  }
  const tex = paintSignTexture(text, glow, bg);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3.4),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  panel.position.set(0, 10.5, 0.2);
  group.add(panel);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 3.8, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x14181c })
  );
  back.position.set(0, 10.5, 0);
  group.add(back);
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  scene.add(group);
}

export function mountSignage(scene, buildings) {
  for (const spec of SIGN_SPECS) {
    const building = tallestNear(buildings, spec.near);
    if (building) hangSign(scene, building, spec);
  }
  raiseBillboard(scene, 24, 24, Math.PI, 'SOLARA BAY', '#ffd23b', '#1c2b3a');
  raiseBillboard(scene, -24, -24, 0, 'BAY PATROL', '#5f9dff', '#101418');
  // The tower carries the city's name high on its west and south faces,
  // so it reads as the landmark from the mission and drive cameras even
  // when its gold spire sits above the frame.
  for (const [tx, ty, tz, ry] of [
    [-11.35, 60, 0, -Math.PI / 2],
    [0, 60, 11.35, 0],
  ]) {
    const towerSign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ map: paintSignTexture('SOLARA', '#ffd23b', '#1c2b3a') })
    );
    towerSign.position.set(tx, ty, tz);
    towerSign.rotation.y = ry;
    scene.add(towerSign);
  }
}
