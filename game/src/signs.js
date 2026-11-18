// Solara Bay — neon signage and rooftop billboards.
// Glowing canvas-texture signs mounted on building faces near the streets
// the screenshots drive down, plus two big billboards on the tallest roofs.
// All positions come from the seeded rng, so they are reproducible.
import * as THREE from 'three';

const SIGN_TEXTS = [
  { text: 'SOLARA', color: '#ff2e7e' },
  { text: 'MARINA', color: '#22d3ee' },
  { text: 'BAY PATROL', color: '#3b82f6' },
  { text: 'HOTEL', color: '#f59e0b' },
  { text: 'TACOS', color: '#a3e635' },
  { text: '24H', color: '#e879f9' },
];

// A glowing neon word on a transparent canvas.
function makeSignTexture(word, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 68px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.fillText(word, 256, 64);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(word, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A big board: a headline over a smaller line, on a dark backing.
function makeBillboardTexture(headline, subline, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141a22';
  ctx.fillRect(0, 0, 512, 224);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 212);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 22;
  ctx.fillStyle = accent;
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillText(headline, 256, 92);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f5f0e6';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.fillText(subline, 256, 168);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mountSignage(scene, rng, buildings) {
  // Candidates: tall enough to carry a sign, near the streets the shots use.
  const candidates = buildings.filter(
    (b) => b.h >= 14 && Math.abs(b.cx) <= 80 && Math.abs(b.cz) <= 120
  );
  // Seeded shuffle, then take the first six for the neon signs.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const signTargets = candidates.slice(0, Math.min(SIGN_TEXTS.length, candidates.length));
  SIGN_TEXTS.forEach((sign, i) => {
    const b = signTargets[i];
    if (!b) return;
    const tex = makeSignTexture(sign.text, sign.color);
    const width = 7 + sign.text.length * 0.85;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 2.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    // South face, high enough to read over traffic, clear of the roofline.
    signMesh.position.set(b.cx, Math.min(b.h - 3, 12 + rng() * 8), b.cz + b.d / 2 + 0.35);
    scene.add(signMesh);
  });

  // Billboards on the two tallest buildings.
  const tallest = [...buildings].sort((a, b) => b.h - a.h).slice(0, 2);
  const boards = [
    { headline: 'SOLARA BAY', subline: 'GRAND OPENING', accent: '#ff2e7e' },
    { headline: 'BAY PATROL', subline: 'WE SEE YOU', accent: '#3b82f6' },
  ];
  tallest.forEach((b, i) => {
    const board = boards[i % boards.length];
    const tex = makeBillboardTexture(board.headline, board.subline, board.accent);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 6),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    mesh.position.set(b.cx, b.h + 4.5, b.cz + b.d / 2 - 1);
    scene.add(mesh);
    // Two legs holding the board up off the roof.
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
    for (const lx of [-4, 4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), legMat);
      leg.position.set(b.cx + lx, b.h + 1.5, b.cz + b.d / 2 - 1);
      scene.add(leg);
    }
  });
}
