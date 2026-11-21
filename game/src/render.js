// Lantern Row — all canvas drawing. One job: what the player sees.
// Floor, lantern light, vision cones (ray-marched so walls cut them), the
// player, the guards, the ledgers, the boat, the HUD and every screen card.
import {
  TILE, COLS, ROWS, WIDTH, HEIGHT, CONE_HALF_ANGLE, COLORS,
} from './config.js';
import { playerLit, detectionLevel, ledgersTaken } from './world.js';

function tileSolidAt(state, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
  return state.solid[ty * COLS + tx] === 1;
}

// March one ray from the guard until it hits a wall or the range ends.
function rayEnd(state, x, y, angle, range) {
  const step = 8;
  let d = step;
  while (d < range) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    if (tileSolidAt(state, px, py)) break;
    d += step;
  }
  return { x: x + Math.cos(angle) * Math.min(d, range), y: y + Math.sin(angle) * Math.min(d, range) };
}

function drawCone(ctx, state, guard) {
  const alarmed = guard.suspicion >= 1 || state.alarm > 0;
  const suspicious = guard.suspicion >= 0.35;
  ctx.fillStyle = alarmed ? COLORS.coneAlert : suspicious ? 'rgba(255, 140, 60, 0.26)' : COLORS.cone;
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i += 1) {
    const a = guard.face - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rays;
    const end = rayEnd(state, guard.x, guard.y, a, guard.range);
    ctx.lineTo(end.x, end.y);
  }
  ctx.closePath();
  ctx.fill();
  // Cone edge line, so the boundary reads even on bright floor.
  ctx.strokeStyle = alarmed ? 'rgba(255, 84, 62, 0.55)' : 'rgba(255, 184, 77, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, state) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const solid = state.solid[ty * COLS + tx] === 1;
      if (solid) continue;
      const lit = state.lit[ty * COLS + tx] === 1;
      const odd = (tx + ty) % 2 === 0;
      ctx.fillStyle = lit ? (odd ? COLORS.floorLit : COLORS.floorLit2) : (odd ? COLORS.floorDark : COLORS.floorDark2);
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
}

function drawWalls(ctx, state) {
  for (const w of state.def.walls) {
    const x = w.x * TILE;
    const y = w.y * TILE;
    const ww = w.w * TILE;
    const hh = w.h * TILE;
    if (w.kind === 'canal') {
      ctx.fillStyle = COLORS.canal;
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeStyle = COLORS.canalEdge;
      ctx.lineWidth = 2;
      for (let i = 0; i < Math.floor(ww / 48); i += 1) {
        const wx = x + 14 + i * 48;
        const wy = y + hh / 2 + Math.sin(wx * 0.05 + state.time * 1.4) * 3;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + 10, wy - 5, wx + 20, wy);
        ctx.stroke();
      }
      continue;
    }
    if (w.kind === 'stall') {
      ctx.fillStyle = COLORS.stall;
      ctx.fillRect(x, y, ww, hh);
      ctx.fillStyle = COLORS.stallTop;
      ctx.fillRect(x, y, ww, 6);
      // Striped cloth awning.
      for (let i = 0; i < w.w * 2; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.stallCloth : '#e8d9b0';
        ctx.fillRect(x + i * (TILE / 2), y + 6, TILE / 2, 10);
      }
      ctx.fillStyle = 'rgba(255, 220, 150, 0.10)';
      ctx.fillRect(x, y + 16, ww, hh - 16);
      continue;
    }
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x, y, ww, hh);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(x, y, ww, 6);
    ctx.fillRect(x, y, 6, hh);
  }
}

function drawLanterns(ctx, state) {
  for (const lamp of state.def.lanterns) {
    const x = (lamp.x + 0.5) * TILE;
    const y = (lamp.y + 0.5) * TILE;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 110);
    glow.addColorStop(0, 'rgba(255, 184, 77, 0.28)');
    glow.addColorStop(1, 'rgba(255, 184, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lanternCore;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.lanternGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLedgers(ctx, state) {
  for (const ledger of state.ledgers) {
    if (ledger.taken) continue;
    const bob = Math.sin(state.time * 2.4 + ledger.x) * 2;
    ctx.save();
    ctx.translate(ledger.x, ledger.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.ledger;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#eafff6';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = 'rgba(127, 224, 195, 0.25)';
    ctx.beginPath();
    ctx.arc(ledger.x, ledger.y + bob, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, state) {
  const e = state.exit;
  const open = state.ledgers.every((l) => l.taken);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = open ? '#8a5a2e' : '#5a4632';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? COLORS.exit : '#4a7a88';
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(12, -4);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = open ? '#eafff6' : '#9a94a8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'BOAT — GO!' : 'BOAT', 0, 30);
  ctx.restore();
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    drawCone(ctx, state, g);
  }
  for (const g of state.guards) {
    ctx.fillStyle = g.captain ? COLORS.guardCaptain : COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.face) * (g.r + 6), g.y + Math.sin(g.face) * (g.r + 6));
    ctx.stroke();
    // Eyes.
    const ex = Math.cos(g.face);
    const ey = Math.sin(g.face);
    const px = -ey;
    const py = ex;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(g.x + ex * 5 + px * 5, g.y + ey * 5 + py * 5, 2.6, 0, Math.PI * 2);
    ctx.arc(g.x + ex * 5 - px * 5, g.y + ey * 5 - py * 5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (g.captain) {
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath();
      ctx.arc(g.x, g.y - g.r - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Suspicion mark above the head.
    if (g.suspicion > 0.05) {
      const s = g.suspicion;
      ctx.fillStyle = s >= 1 ? COLORS.danger : s >= 0.35 ? '#ffb84d' : '#fff2c9';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s >= 1 ? '!' : '?', g.x, g.y - g.r - 8);
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const lit = playerLit(state);
  // A soft gold glow, so the player reads at a glance even when shrunk.
  const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30);
  glow.addColorStop(0, 'rgba(245, 215, 110, 0.30)');
  glow.addColorStop(1, 'rgba(245, 215, 110, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 10, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff7d6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#7a5c14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.face) * (p.r + 5), p.y + Math.sin(p.face) * (p.r + 5));
  ctx.stroke();
  // Noise ring while running.
  if (p.running) {
    ctx.strokeStyle = 'rgba(245, 215, 110, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 12 + Math.sin(state.time * 9) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.sneaking) {
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', p.x, p.y - p.r - 8);
  }
  if (lit) {
    ctx.fillStyle = 'rgba(255, 184, 77, 0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIT', p.x, p.y + p.r + 16);
  }
}

function drawEye(ctx, x, y, level) {
  // The detection eye: it opens and fills red as suspicion rises.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = level >= 1 ? COLORS.danger : level >= 0.35 ? '#ffb84d' : COLORS.hudDim;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 9 + level * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10131f';
  ctx.beginPath();
  ctx.arc(0, 0, 3 + level * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHud(ctx, state) {
  const level = detectionLevel(state);
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, WIDTH, 44);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${state.levelIndex + 1}. ${state.def.name}`, 14, 28);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(`Ledgers ${ledgersTaken(state)}/${state.ledgers.length}  ·  ${state.ledgers.every((l) => l.taken) ? 'Reach the boat' : 'Stay unseen'}`, 250, 28);
  ctx.textAlign = 'right';
  ctx.fillStyle = level >= 1 ? COLORS.danger : COLORS.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(state.alarm > 0 ? 'ALARM!' : level >= 0.35 ? 'NOTICED' : playerLit(state) ? 'LIT — exposed' : 'HIDDEN', WIDTH - 52, 28);
  drawEye(ctx, WIDTH - 28, 22, level);
  // Detection meter bar under the top bar.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, 44, WIDTH, 5);
  ctx.fillStyle = level >= 1 ? COLORS.danger : level >= 0.35 ? '#ffb84d' : COLORS.safe;
  ctx.fillRect(0, 44, WIDTH * level, 5);
  // Bottom hint.
  ctx.fillStyle = 'rgba(10, 12, 26, 0.55)';
  ctx.fillRect(0, HEIGHT - 26, WIDTH, 26);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const mm = Math.floor(state.time / 60);
  const ss = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillText(`WASD move · Shift sneak · Ctrl run · R retry · P pause · M sound — ${mm}:${ss}`, 14, HEIGHT - 8);
}

function card(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  ctx.fillStyle = 'rgba(16, 19, 38, 0.96)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, WIDTH / 2, y + 56);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, y + 100 + i * 30);
  });
}

export function drawWorld(ctx, state) {
  drawFloor(ctx, state);
  drawLanterns(ctx, state);
  drawWalls(ctx, state);
  drawLedgers(ctx, state);
  drawExit(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
}

// app: {screen, world, totalTime, totalSpotted}
export function drawGame(ctx, app) {
  const state = app.world;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (app.screen === 'title') {
    drawWorld(ctx, state);
    card(ctx, 'LANTERN ROW', [
      'A night-market stealth game.',
      'Recover the stolen spice ledgers. Reach the canal boat unseen.',
      'Stay in shadow. Mind the lantern light. Sneak past the wardens.',
      'WASD move · Shift sneak · Ctrl run · R retry · P pause · M sound',
      'Press Enter or click to begin',
    ], COLORS.lanternGlow);
    return;
  }
  drawWorld(ctx, state);
  if (app.screen === 'play' || app.screen === 'pause') {
    drawHud(ctx, state);
  }
  if (app.screen === 'intro') {
    card(ctx, state.def.name, [
      state.def.sub,
      `${state.ledgers.length} ledgers · ${state.guards.length} wardens${state.guards.some((g) => g.captain) ? ' · one captain with a long cone' : ''}`,
      'Press Enter to begin',
    ], COLORS.lanternGlow);
  } else if (app.screen === 'pause') {
    card(ctx, 'Paused', ['The wardens wait. The lanterns burn.', 'P or Escape to resume · R to restart the level'], COLORS.hudDim);
  } else if (app.screen === 'caught') {
    card(ctx, 'Spotted!', [
      'A warden caught you in the light.',
      `Times spotted: ${state.spotted} — the market remembers.`,
      'Press R to try the level again',
    ], COLORS.danger);
  } else if (app.screen === 'clear') {
    card(ctx, 'Level clear', [
      `${state.def.name} — all ledgers recovered.`,
      'The boat waits. Press Enter for the next level.',
    ], COLORS.safe);
  } else if (app.screen === 'win') {
    const mm = Math.floor(app.totalTime / 60);
    const ss = Math.floor(app.totalTime % 60).toString().padStart(2, '0');
    card(ctx, 'Unseen to the end', [
      'Every ledger is home. Rani slips away on the canal boat.',
      `Time ${mm}:${ss} · Times spotted ${app.totalSpotted} · Score ${state.score}`,
      'Press Enter to play again',
    ], COLORS.lanternGlow);
  }
}
