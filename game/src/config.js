// Lantern Row — shared constants: field, speeds, detection, colours, keys.
// One job: every number the simulation and the renderer agree on lives here.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const WIDTH = COLS * TILE; // 1280
export const HEIGHT = ROWS * TILE; // 800
export const STEP = 1 / 60;

export const PLAYER_RADIUS = 15;
export const GUARD_RADIUS = 14;

// Movement speeds in pixels per second.
export const SPEED_WALK = 165;
export const SPEED_SNEAK = 85;
export const SPEED_RUN = 232;
export const SPEED_PATROL = 55;
export const SPEED_SUSPICIOUS = 72;
export const SPEED_CHASE = 118;

// Vision: cone half-angle in radians, range in pixels.
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees
export const CONE_RANGE = 265;
export const CONE_RANGE_CAPTAIN = 330;
export const CONE_RANGE_LIT_BONUS = 55; // lit players are seen from further away

// Detection: suspicion 0..1 per guard; the HUD meter shows the highest.
export const SUSPICION_RISE_SEEN = 0.95; // per second, player visible in a cone
export const SUSPICION_RISE_LIT = 1.6; // multiplier when the player stands in lantern light
export const SUSPICION_RISE_SNEAK = 0.5; // multiplier while sneaking
export const SUSPICION_RISE_HEARD = 0.55; // per second, running heard but not seen
export const SUSPICION_FALL = 0.32; // per second, unseen and unheard
export const SUSPICIOUS_AT = 0.35; // guard stops and stares
export const ALARM_AT = 1.0;
export const ALARM_SECONDS = 4.0;
export const NOISE_RADIUS_RUN = 210;
export const NOISE_RADIUS_WALK = 70;
export const CATCH_RADIUS = 27;

// Lantern light: radius in pixels; a tile is lit when a lantern sees it.
export const LANTERN_RADIUS = 150;

export const COLORS = {
  floorDark: '#1b2340',
  floorDark2: '#20294a',
  floorLit: '#5a4a28',
  floorLit2: '#6b5830',
  wall: '#3a2f4d',
  wallTop: '#54486e',
  stall: '#4a3423',
  stallTop: '#6e4f30',
  stallCloth: '#a03d2d',
  canal: '#123a4a',
  canalEdge: '#1d5a70',
  lanternGlow: '#ffb84d',
  lanternCore: '#ffe9a8',
  cone: 'rgba(255, 184, 77, 0.20)',
  coneAlert: 'rgba(255, 84, 62, 0.30)',
  player: '#f5d76e',
  playerSneak: '#c9a94a',
  guard: '#e0483e',
  guardCaptain: '#ff7a3d',
  ledger: '#7fe0c3',
  exit: '#7fd4e0',
  hudBg: 'rgba(10, 12, 26, 0.82)',
  hudText: '#f2ead8',
  hudDim: '#9a94a8',
  danger: '#ff6b5e',
  safe: '#7fe0c3',
};

export const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  sneak: ['ShiftLeft', 'ShiftRight'],
  run: ['ControlLeft', 'ControlRight'],
  restart: ['KeyR'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
  confirm: ['Enter', 'Space'],
};
