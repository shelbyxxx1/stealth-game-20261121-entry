// Lantern Row — the simulation. One job: the rules.
// Fixed timestep, seeded RNG, no Date/Math.random: the same inputs always
// give the same world. Guards patrol, notice, chase; lanterns light the
// floor; noise travels; ledgers are collected; the boat is the exit.
import {
  TILE, COLS, ROWS, STEP, PLAYER_RADIUS, GUARD_RADIUS,
  SPEED_WALK, SPEED_SNEAK, SPEED_RUN, SPEED_PATROL, SPEED_SUSPICIOUS, SPEED_CHASE,
  CONE_HALF_ANGLE, CONE_RANGE, CONE_RANGE_CAPTAIN, CONE_RANGE_LIT_BONUS,
  SUSPICION_RISE_SEEN, SUSPICION_RISE_LIT, SUSPICION_RISE_SNEAK, SUSPICION_RISE_HEARD,
  SUSPICION_FALL, SUSPICIOUS_AT, ALARM_AT, ALARM_SECONDS,
  NOISE_RADIUS_RUN, NOISE_RADIUS_WALK, CATCH_RADIUS, LANTERN_RADIUS,
} from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_PICKUP = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_CLEAR = 8;
export const EVENT_WIN = 16;

export function tileCenter(t) {
  return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
}

function tileAt(px, py) {
  return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
}

function inBounds(tx, ty) {
  return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS;
}

// True when the segment between two points crosses a solid tile.
export function segmentBlocked(solid, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x1 + dx * t) / TILE);
    const ty = Math.floor((y1 + dy * t) / TILE);
    if (!inBounds(tx, ty) || solid[ty * COLS + tx]) return true;
  }
  return false;
}

// Circle vs solid tiles: true when the circle overlaps any solid tile.
function circleHitsSolid(solid, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!inBounds(tx, ty)) return true;
      if (!solid[ty * COLS + tx]) continue;
      const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
}

// Move a circle axis by axis so it slides along walls instead of sticking.
function moveCircle(solid, body, dx, dy) {
  if (dx !== 0 && !circleHitsSolid(solid, body.x + dx, body.y, body.r)) body.x += dx;
  if (dy !== 0 && !circleHitsSolid(solid, body.x, body.y + dy, body.r)) body.y += dy;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function buildLevel(levelIndex) {
  const def = LEVELS[levelIndex];
  const solid = new Uint8Array(COLS * ROWS);
  for (const w of def.walls) {
    for (let ty = w.y; ty < w.y + w.h; ty += 1) {
      for (let tx = w.x; tx < w.x + w.w; tx += 1) {
        if (inBounds(tx, ty)) solid[ty * COLS + tx] = 1;
      }
    }
  }
  // Precompute which floor tiles sit in lantern light (light is blocked by walls).
  const lit = new Uint8Array(COLS * ROWS);
  for (const lamp of def.lanterns) {
    const c = tileCenter(lamp);
    const rTiles = Math.ceil(LANTERN_RADIUS / TILE);
    for (let ty = lamp.y - rTiles; ty <= lamp.y + rTiles; ty += 1) {
      for (let tx = lamp.x - rTiles; tx <= lamp.x + rTiles; tx += 1) {
        if (!inBounds(tx, ty) || solid[ty * COLS + tx]) continue;
        const cc = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        if (Math.hypot(cc.x - c.x, cc.y - c.y) > LANTERN_RADIUS) continue;
        if (segmentBlocked(solid, c.x, c.y, cc.x, cc.y)) continue;
        lit[ty * COLS + tx] = 1;
      }
    }
  }
  const p = tileCenter(def.player);
  const state = {
    levelIndex,
    def,
    solid,
    lit,
    player: { x: p.x, y: p.y, r: PLAYER_RADIUS, face: 0, moving: false, sneaking: false, running: false },
    guards: def.guards.map((g) => {
      const start = tileCenter(g.waypoints[0]);
      const next = tileCenter(g.waypoints[1 % g.waypoints.length]);
      return {
        x: start.x, y: start.y, r: GUARD_RADIUS,
        waypoints: g.waypoints.map(tileCenter),
        wp: 1 % g.waypoints.length,
        pause: 0,
        face: Math.atan2(next.y - start.y, next.x - start.x),
        suspicion: 0,
        mode: 'patrol',
        captain: g.captain,
        range: g.captain ? CONE_RANGE_CAPTAIN : CONE_RANGE,
      };
    }),
    ledgers: def.ledgers.map((t) => ({ ...tileCenter(t), taken: false })),
    exit: tileCenter(def.exit),
    time: 0,
    spotted: 0,
    score: 0,
    alarm: 0,
    lastSeen: null,
    events: 0,
    phase: 'play', // play | caught | clear | win
  };
  return state;
}

export function playerLit(state) {
  const t = tileAt(state.player.x, state.player.y);
  return inBounds(t.x, t.y) && state.lit[t.y * COLS + t.x] === 1;
}

export function guardSees(state, guard) {
  const p = state.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = guard.range;
  if (playerLit(state)) range += CONE_RANGE_LIT_BONUS;
  if (dist > range) return false;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.face)) > CONE_HALF_ANGLE) return false;
  return !segmentBlocked(state.solid, guard.x, guard.y, p.x, p.y);
}

// One fixed step. input: {mx, my, sneak, run}. Returns the event bitmask.
export function stepWorld(state, input) {
  state.events = 0;
  if (state.phase !== 'play') return 0;
  const dt = STEP;
  state.time += dt;
  const p = state.player;

  // --- player movement ---
  const len = Math.hypot(input.mx, input.my);
  const nx = len > 0 ? input.mx / len : 0;
  const ny = len > 0 ? input.my / len : 0;
  const speed = input.sneak ? SPEED_SNEAK : input.run ? SPEED_RUN : SPEED_WALK;
  p.moving = len > 0;
  p.sneaking = input.sneak && len > 0;
  p.running = input.run && len > 0 && !input.sneak;
  if (len > 0) p.face = Math.atan2(ny, nx);
  moveCircle(state.solid, p, nx * speed * dt, ny * speed * dt);

  const noiseRadius = p.running ? NOISE_RADIUS_RUN : p.moving ? NOISE_RADIUS_WALK : 0;
  const lit = playerLit(state);

  // --- guards ---
  let maxSuspicion = 0;
  let alarmRaised = false;
  for (const g of state.guards) {
    const sees = guardSees(state, g);
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const dist = Math.hypot(dx, dy);
    const hears = !sees && p.moving && dist < noiseRadius;
    if (sees) {
      let rate = SUSPICION_RISE_SEEN;
      if (lit) rate *= SUSPICION_RISE_LIT;
      if (p.sneaking) rate *= SUSPICION_RISE_SNEAK;
      g.suspicion = Math.min(1, g.suspicion + rate * dt);
      g.face = Math.atan2(dy, dx);
    } else if (hears) {
      g.suspicion = Math.min(1, g.suspicion + SUSPICION_RISE_HEARD * dt);
      g.face = Math.atan2(dy, dx);
    } else {
      g.suspicion = Math.max(0, g.suspicion - SUSPICION_FALL * dt);
    }
    if (g.suspicion >= ALARM_AT) alarmRaised = true;
    maxSuspicion = Math.max(maxSuspicion, g.suspicion);

    if (state.alarm > 0) {
      g.mode = 'chase';
    } else if (g.suspicion >= SUSPICIOUS_AT) {
      g.mode = 'suspicious';
    } else {
      g.mode = 'patrol';
    }

    if (g.mode === 'patrol') {
      if (g.pause > 0) {
        g.pause -= dt;
      } else {
        const target = g.waypoints[g.wp];
        const tdx = target.x - g.x;
        const tdy = target.y - g.y;
        const td = Math.hypot(tdx, tdy);
        if (td < 6) {
          g.pause = 1.2;
          g.wp = (g.wp + 1) % g.waypoints.length;
        } else {
          const vx = (tdx / td) * SPEED_PATROL * dt;
          const vy = (tdy / td) * SPEED_PATROL * dt;
          g.face = Math.atan2(tdy, tdx);
          moveCircle(state.solid, g, vx, vy);
        }
      }
    } else if (g.mode === 'suspicious' && state.lastSeen) {
      const tdx = state.lastSeen.x - g.x;
      const tdy = state.lastSeen.y - g.y;
      const td = Math.hypot(tdx, tdy);
      if (td > 30) {
        const vx = (tdx / td) * SPEED_SUSPICIOUS * dt;
        const vy = (tdy / td) * SPEED_SUSPICIOUS * dt;
        g.face = Math.atan2(tdy, tdx);
        moveCircle(state.solid, g, vx, vy);
      }
    } else if (g.mode === 'chase' && state.lastSeen) {
      const tdx = state.lastSeen.x - g.x;
      const tdy = state.lastSeen.y - g.y;
      const td = Math.hypot(tdx, tdy);
      if (td > 12) {
        const vx = (tdx / td) * SPEED_CHASE * dt;
        const vy = (tdy / td) * SPEED_CHASE * dt;
        g.face = Math.atan2(tdy, tdx);
        moveCircle(state.solid, g, vx, vy);
      }
    }
  }

  // --- alarm ---
  if (alarmRaised && state.alarm <= 0) {
    state.alarm = ALARM_SECONDS;
    state.lastSeen = { x: p.x, y: p.y };
    state.events |= EVENT_ALARM;
  }
  if (state.alarm > 0) {
    state.alarm -= dt;
    if (maxSuspicion > 0.5) state.lastSeen = { x: p.x, y: p.y };
    for (const g of state.guards) {
      if (Math.hypot(p.x - g.x, p.y - g.y) < CATCH_RADIUS) {
        state.phase = 'caught';
        state.spotted += 1;
        state.events |= EVENT_CAUGHT;
        return state.events;
      }
    }
  }
  if (state.lastSeen && maxSuspicion >= SUSPICIOUS_AT) {
    state.lastSeen = { x: p.x, y: p.y };
  }

  // --- ledgers ---
  for (const ledger of state.ledgers) {
    if (!ledger.taken && Math.hypot(p.x - ledger.x, p.y - ledger.y) < 28) {
      ledger.taken = true;
      state.score += 500;
      state.events |= EVENT_PICKUP;
    }
  }

  // --- exit ---
  const allTaken = state.ledgers.every((l) => l.taken);
  if (allTaken && Math.hypot(p.x - state.exit.x, p.y - state.exit.y) < 32) {
    if (state.levelIndex >= LEVELS.length - 1) {
      state.phase = 'win';
      state.score += Math.max(0, Math.round(3000 - state.time * 10));
      state.events |= EVENT_WIN;
    } else {
      state.phase = 'clear';
      state.events |= EVENT_CLEAR;
    }
  }
  return state.events;
}

export function detectionLevel(state) {
  let m = 0;
  for (const g of state.guards) m = Math.max(m, g.suspicion);
  return m;
}

export function ledgersTaken(state) {
  return state.ledgers.filter((l) => l.taken).length;
}
