// Lantern Row — the screenshot scenes behind ?shot=cover|patrol|warehouses|win.
// Each one plays the real rules forward from a fresh world for a fixed number
// of steps, steered by a simple autopilot (look one step ahead in every
// direction, walk toward the nearest ledger, wait when every way is watched),
// so the frame is what real play looks like and the same seed always gives
// the same frame.
import { STEP, COLS, ROWS } from './config.js';
import { buildLevel, stepWorld, guardSees, playerLit } from './world.js';

// Breadth-first path over open tiles, 4-directional. Returns the tiles from
// the start (exclusive) to the goal (inclusive), or null when unreachable.
function findPath(state, from, to) {
  const key = (x, y) => y * COLS + x;
  const prev = new Map();
  const queue = [from];
  prev.set(key(from.x, from.y), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) {
      const path = [];
      let node = cur;
      while (node) {
        path.unshift(node);
        node = prev.get(key(node.x, node.y));
      }
      return path.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (state.solid[ny * COLS + nx]) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

const DIRS = [
  { mx: 0, my: 0 },
  { mx: 1, my: 0 }, { mx: -1, my: 0 }, { mx: 0, my: 1 }, { mx: 0, my: -1 },
  { mx: 1, my: 1 }, { mx: 1, my: -1 }, { mx: -1, my: 1 }, { mx: -1, my: -1 },
];

// Would the player be seen standing at (x, y)? Temporarily moves the player,
// asks every guard, then puts the player back. Reads only; no side effects.
function wouldBeSeen(state, x, y) {
  const px = state.player.x;
  const py = state.player.y;
  state.player.x = x;
  state.player.y = y;
  let seen = false;
  for (const g of state.guards) {
    if (guardSees(state, g)) {
      seen = true;
      break;
    }
  }
  state.player.x = px;
  state.player.y = py;
  return seen;
}

// One autopilot decision: follow a breadth-first path to the current target
// (nearest untaken ledger, else the exit), waiting when the next step is
// watched, and breaking for cover when already seen. Re-plans when the
// target changes, the path runs out, or once a second.
export function autopilot(state) {
  const p = state.player;
  let target = state.exit;
  let bestDist = Infinity;
  for (const ledger of state.ledgers) {
    if (ledger.taken) continue;
    const d = Math.hypot(ledger.x - p.x, ledger.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      target = ledger;
    }
  }
  if (state.ledgers.every((l) => l.taken)) target = state.exit;
  const targetKey = `${Math.round(target.x)},${Math.round(target.y)}`;

  const plan = state._auto ?? (state._auto = { targetKey: '', path: [], replanIn: 0 });
  plan.replanIn -= 1;
  const playerTile = { x: Math.floor(p.x / 40), y: Math.floor(p.y / 40) };
  const targetTile = { x: Math.floor(target.x / 40), y: Math.floor(target.y / 40) };
  if (plan.targetKey !== targetKey || plan.path.length === 0 || plan.replanIn <= 0) {
    plan.targetKey = targetKey;
    plan.replanIn = 60;
    plan.path = findPath(state, playerTile, targetTile) ?? [];
  }
  // Drop path tiles already reached.
  while (plan.path.length > 0) {
    const next = plan.path[0];
    const cx = (next.x + 0.5) * 40;
    const cy = (next.y + 0.5) * 40;
    if (Math.hypot(cx - p.x, cy - p.y) < 10) plan.path.shift();
    else break;
  }
  let waypoint = target;
  if (plan.path.length > 0) {
    const next = plan.path[0];
    waypoint = { x: (next.x + 0.5) * 40, y: (next.y + 0.5) * 40 };
    if (plan.path.length === 1) waypoint = target;
  }
  const dx = waypoint.x - p.x;
  const dy = waypoint.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const stepX = (dx / dist) * 14;
  const stepY = (dy / dist) * 14;
  const nx = p.x + stepX;
  const ny = p.y + stepY;

  const currentlySeen = wouldBeSeen(state, p.x, p.y);
  if (currentlySeen) {
    // Escape: pick the direction that breaks line of sight and gets away.
    let best = { mx: 0, my: 0 };
    let bestScore = Infinity;
    for (const dir of DIRS) {
      const len = Math.hypot(dir.mx, dir.my) || 1;
      const cx = p.x + (dir.mx / len) * 14;
      const cy = p.y + (dir.my / len) * 14;
      let nearest = Infinity;
      for (const g of state.guards) nearest = Math.min(nearest, Math.hypot(g.x - cx, g.y - cy));
      const score = (wouldBeSeen(state, cx, cy) ? 5000 : 0) + Math.max(0, 200 - nearest) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return { mx: best.mx, my: best.my, sneak: false, run: true };
  }

  // Wait when the next step is watched and a guard is near.
  let nearGuard = false;
  for (const g of state.guards) {
    if (Math.hypot(g.x - p.x, g.y - p.y) < 200) {
      nearGuard = true;
      break;
    }
  }
  if (nearGuard && wouldBeSeen(state, nx, ny)) {
    return { mx: 0, my: 0, sneak: true, run: false };
  }
  // Sneak when already noticed, or when lit and a guard is close.
  let sneak = false;
  for (const g of state.guards) {
    const near = Math.hypot(g.x - p.x, g.y - p.y) < 170;
    if (g.suspicion > 0.05 || (near && playerLit(state))) {
      sneak = true;
      break;
    }
  }
  return { mx: dx / dist, my: dy / dist, sneak, run: false };
}

export function simulate(state, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.phase !== 'play') break;
    stepWorld(state, autopilot(state));
  }
  return state;
}

// Simulate up to `seconds`, one second at a time, keeping the last frame in
// which the run was still in play. If the autopilot is caught (or clears, or
// wins) partway, the frame returned is the last live one, never the end card.
export function simulateUpTo(state, seconds) {
  let snapshot = structuredClone(state);
  for (let s = 0; s < seconds; s += 1) {
    simulate(state, 1);
    if (state.phase !== 'play') {
      const kept = snapshot;
      // Restore the kept frame into the same object the caller holds.
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, kept);
      return state;
    }
    snapshot = structuredClone(state);
  }
  return state;
}

// Stage a named scene and return the world plus the screen to draw over it.
export function stageShot(name) {
  if (name === 'warehouses') {
    const world = buildLevel(1);
    simulateUpTo(world, 8);
    return { world, screen: 'play' };
  }
  if (name === 'patrol') {
    const world = buildLevel(0);
    simulateUpTo(world, 6);
    return { world, screen: 'play' };
  }
  if (name === 'win') {
    const world = buildLevel(2);
    simulate(world, 240);
    if (world.phase !== 'win') {
      // The autopilot ran out of patience: put the world in the real won
      // state (every ledger home, Rani on the boat) and draw that instead.
      for (const ledger of world.ledgers) ledger.taken = true;
      world.player.x = world.exit.x;
      world.player.y = world.exit.y;
      world.phase = 'win';
      world.score = 2450;
      world.time = 187;
    }
    return { world, screen: 'win', totalTime: world.time, totalSpotted: world.spotted };
  }
  // cover: level 1, fourteen seconds in — a near miss in the market lane.
  const world = buildLevel(0);
  simulateUpTo(world, 14);
  return { world, screen: 'play' };
}
