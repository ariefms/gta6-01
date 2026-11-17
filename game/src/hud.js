// Solara Bay — HUD and menus: wanted stars, health, cash, speed, objective,
// clock, controls hint, a 2D minimap canvas, and the start / pause /
// busted / wasted screens. All DOM, no image assets.
import { CONFIG, CONTROLS_TEXT, MISSION_DEFS } from './config.js';

export function createHud() {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-top">
      <div id="hud-stars"></div>
      <div id="hud-cash">$0</div>
      <div id="hud-clock">12:00</div>
    </div>
    <div id="hud-health"><div id="hud-health-fill"></div></div>
    <div id="hud-objective"></div>
    <div id="hud-speed">0 km/h</div>
    <div id="hud-hint"></div>
    <canvas id="minimap" width="180" height="180"></canvas>
    <div id="hud-center"></div>
    <div id="hud-menu"></div>
  `;
  document.body.appendChild(root);
  const style = document.createElement('style');
  style.textContent = `
    #hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Trebuchet MS', sans-serif; color: #fff; }
    #hud-top { position: absolute; top: 14px; right: 210px; text-align: right; text-shadow: 0 2px 4px #000; }
    #hud-stars { font-size: 26px; letter-spacing: 2px; color: #ffd23b; }
    #hud-cash { font-size: 26px; font-weight: bold; color: #7dff9a; }
    #hud-clock { font-size: 18px; }
    #hud-health { position: absolute; top: 16px; left: 16px; width: 220px; height: 16px; background: rgba(0,0,0,.55); border: 2px solid #fff; }
    #hud-health-fill { height: 100%; width: 100%; background: linear-gradient(90deg, #37d67a, #a8f0c0); }
    #hud-objective { position: absolute; top: 44px; left: 16px; max-width: 420px; font-size: 17px; font-weight: bold; text-shadow: 0 2px 4px #000; }
    #hud-speed { position: absolute; bottom: 18px; right: 210px; font-size: 26px; font-weight: bold; text-shadow: 0 2px 4px #000; }
    #hud-hint { position: absolute; bottom: 18px; left: 16px; font-size: 13px; opacity: .85; text-shadow: 0 1px 3px #000; }
    #minimap { position: absolute; top: 14px; right: 14px; border: 3px solid rgba(255,255,255,.85); border-radius: 50%; background: #1d2b33; box-shadow: 0 2px 10px rgba(0,0,0,.5); }
    #hud-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: bold; text-shadow: 0 2px 8px #000; }
    #hud-menu { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(10,30,50,.82), rgba(255,150,60,.55)); pointer-events: auto; }
    #hud-menu .panel { max-width: 640px; padding: 32px 40px; text-align: center; background: rgba(0,0,0,.55); border-radius: 14px; }
    #hud-menu h1 { margin: 0 0 4px; font-size: 56px; letter-spacing: 2px; color: #ffd23b; text-shadow: 0 3px 0 #c23b3b; }
    #hud-menu h2 { margin: 0 0 14px; font-size: 20px; color: #9fd8ff; font-weight: normal; }
    #hud-menu p { font-size: 15px; line-height: 1.5; }
    #hud-menu .cta { margin-top: 16px; font-size: 20px; font-weight: bold; color: #7dff9a; }
    #hud-menu .controls { margin-top: 12px; font-size: 13px; opacity: .9; }
  `;
  document.head.appendChild(style);
  return {
    root,
    stars: document.getElementById('hud-stars'),
    cash: document.getElementById('hud-cash'),
    clock: document.getElementById('hud-clock'),
    healthFill: document.getElementById('hud-health-fill'),
    objective: document.getElementById('hud-objective'),
    speed: document.getElementById('hud-speed'),
    hint: document.getElementById('hud-hint'),
    minimap: document.getElementById('minimap'),
    center: document.getElementById('hud-center'),
    menu: document.getElementById('hud-menu'),
  };
}

export function updateHud(hud, state) {
  const wanted = state.police.wanted;
  hud.stars.textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
  hud.stars.style.visibility = wanted > 0 ? 'visible' : 'hidden';
  hud.cash.textContent = '$' + state.missions.cash;
  hud.healthFill.style.width = Math.max(0, state.player.health) + '%';
  hud.objective.textContent = '◆ ' + state.missions.objective;
  const kmh = state.playerCar ? Math.round(Math.abs(state.playerCar.speed) * 3.6) : 0;
  hud.speed.textContent = state.playerCar ? kmh + ' km/h' : '';
  hud.hint.textContent = state.playerCar
    ? 'W/S drive · A/D steer · Space handbrake · E exit car'
    : 'WASD move · Shift run · E enter car · F punch' + (state.player.hasPistol ? ' · Click shoot' : '');
  const minutes = state.gameMinutes % 1440;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(Math.floor(minutes % 60)).padStart(2, '0');
  hud.clock.textContent = hh + ':' + mm;
  drawMinimap(hud.minimap, state);
}

export function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const size = 180;
  const scale = size / 440;
  const toMap = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#274b5f';
  ctx.fillRect(0, 0, size, size);
  // Beach + sea at the south edge.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(0, size / 2 + 190 * scale, size, size / 2 - 190 * scale);
  ctx.fillStyle = '#1e7fa8';
  ctx.fillRect(0, size / 2 + 215 * scale, size, size);
  // Roads.
  ctx.strokeStyle = '#5a636b';
  ctx.lineWidth = 5;
  for (const s of state.streets) {
    const [x1, y1] = toMap(s, -200);
    const [x2, y2] = toMap(s, 200);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [x3, y3] = toMap(-200, s);
    const [x4, y4] = toMap(200, s);
    ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
  }
  // Mission marker.
  if (state.missions.beacon.visible) {
    const [mx, my] = toMap(state.missions.beacon.position.x, state.missions.beacon.position.z);
    ctx.fillStyle = '#f2c230';
    ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
  // Traffic (grey), police (blue/red blips).
  ctx.fillStyle = '#cfd6da';
  for (const car of state.traffic.cars) {
    const [cx, cy] = toMap(car.x, car.z);
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  for (const cruiser of state.police.cruisers) {
    const [cx, cy] = toMap(cruiser.x, cruiser.z);
    ctx.fillStyle = Math.floor(performance.now() / 300) % 2 ? '#ef4444' : '#3b82f6';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow, rotated to the player's yaw.
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(Math.sin(state.player.yaw), Math.cos(state.player.yaw)) + Math.PI);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function showStartMenu(hud) {
  hud.menu.innerHTML = `
    <div class="panel">
      <h1>SOLARA BAY</h1>
      <h2>An open-world crime story — built for make.fun's “Make GTA 6”</h2>
      <p>Dio Santana is back in Solara Bay with empty pockets and a fast car
      waiting to be borrowed. Work the five-mission story, outrun the Bay
      Patrol, and take the Big Score — or just cruise the coast and see what
      trouble finds you.</p>
      <p><b>Story:</b> ${MISSION_DEFS.map((m) => `${m.id}. ${m.title}`).join(' · ')}</p>
      <div class="cta">Press ENTER to start</div>
      <div class="controls">${CONTROLS_TEXT}</div>
    </div>`;
  hud.menu.style.display = 'flex';
}

export function showPauseMenu(hud, missions) {
  hud.menu.innerHTML = `
    <div class="panel">
      <h1>PAUSED</h1>
      <h2>Solara Bay — take a breath, Dio</h2>
      <p><b>Missions:</b><br>${MISSION_DEFS.map((m, i) => `${i < missions.index ? '✓' : i === missions.index ? '▶' : '·'} ${m.id}. ${m.title}`).join('<br>')}</p>
      <p>Cash: $${missions.cash} · Progress is saved automatically.</p>
      <div class="cta">Press ESC to resume</div>
      <div class="controls">${CONTROLS_TEXT}</div>
    </div>`;
  hud.menu.style.display = 'flex';
}

export function showEndScreen(hud, kind) {
  const title = kind === 'busted' ? 'BUSTED' : 'WASTED';
  const text = kind === 'busted'
    ? 'The Bay Patrol caught up with you. Bail is cheap — the story goes on.'
    : 'Dio went down in Solara Bay. The city keeps moving without him… this time.';
  hud.menu.innerHTML = `
    <div class="panel">
      <h1>${title}</h1>
      <h2>${text}</h2>
      <div class="cta">Press ENTER to try again</div>
    </div>`;
  hud.menu.style.display = 'flex';
}

export function hideMenu(hud) {
  hud.menu.style.display = 'none';
}

export function flashCenter(hud, text, ms) {
  hud.center.textContent = text;
  setTimeout(() => { hud.center.textContent = ''; }, ms || 2200);
}
