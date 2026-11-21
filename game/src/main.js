// Lantern Row — the game loop and screen flow. One job: run the game.
// Title -> intro -> play -> (pause | caught | clear) -> next level -> win.
// ?shot=<name>&seed=<n> stages one deterministic scene, draws it once and
// sets window.__shotReady, for the screenshots.
import { WIDTH, HEIGHT, STEP, KEYS } from './config.js';
import { buildLevel, stepWorld, EVENT_PICKUP, EVENT_ALARM, EVENT_CLEAR, EVENT_WIN, EVENT_CAUGHT } from './world.js';
import { drawGame } from './render.js';
import { createInput, codeIs } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput();
input.attach(window);
const audio = createAudio();

const app = {
  screen: 'title',
  world: buildLevel(0),
  totalTime: 0,
  totalSpotted: 0,
  totalScore: 0,
};

function startLevel(index) {
  app.world = buildLevel(index);
  app.screen = 'intro';
}

function restartLevel() {
  const index = app.world.levelIndex;
  app.world = buildLevel(index);
  app.screen = 'play';
}

function advance() {
  audio.unlock();
  if (app.screen === 'title') {
    app.totalTime = 0;
    app.totalSpotted = 0;
    app.totalScore = 0;
    startLevel(0);
  } else if (app.screen === 'intro') {
    app.screen = 'play';
  } else if (app.screen === 'clear') {
    startLevel(app.world.levelIndex + 1);
  } else if (app.screen === 'win') {
    app.totalTime = 0;
    app.totalSpotted = 0;
    app.totalScore = 0;
    startLevel(0);
  }
}

input.attachClick(canvas, () => {
  if (app.screen !== 'play') advance();
});

let last = performance.now();
let acc = 0;
let stepSoundAt = 0;
let prevDetection = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.poll();

  // Edge-triggered actions.
  if (input.take('KeyM')) {
    const muted = audio.toggleMute();
    document.title = muted ? 'Lantern Row (muted)' : 'Lantern Row';
  }
  if (input.take('KeyR') && (app.screen === 'play' || app.screen === 'caught' || app.screen === 'pause')) {
    restartLevel();
  }
  if ((input.take('KeyP') || input.take('Escape')) && (app.screen === 'play' || app.screen === 'pause')) {
    app.screen = app.screen === 'play' ? 'pause' : 'play';
  }
  if (KEYS.confirm.some((code) => input.take(code))) {
    if (app.screen !== 'play' && app.screen !== 'pause') advance();
  }

  if (app.screen === 'play') {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      const events = stepWorld(app.world, input);
      if (events & EVENT_PICKUP) audio.pickup();
      if (events & EVENT_ALARM) audio.alarm();
      if (events & EVENT_CAUGHT) {
        app.totalSpotted = app.world.spotted;
        app.screen = 'caught';
      }
      if (events & EVENT_CLEAR) {
        app.totalTime += app.world.time;
        app.totalSpotted = app.world.spotted;
        app.totalScore += app.world.score;
        audio.clear();
        app.screen = 'clear';
      }
      if (events & EVENT_WIN) {
        app.totalTime += app.world.time;
        app.totalSpotted = app.world.spotted;
        app.world.score += app.totalScore;
        audio.win();
        app.screen = 'win';
      }
      if (app.world.phase !== 'play') break;
    }
    // Footsteps and the near-miss warning tick.
    const p = app.world.player;
    if (p.moving && now - stepSoundAt > (p.sneaking ? 520 : 320)) {
      stepSoundAt = now;
      audio.step();
    }
    let detection = 0;
    for (const g of app.world.guards) detection = Math.max(detection, g.suspicion);
    if (prevDetection < 0.35 && detection >= 0.35) audio.warn();
    prevDetection = detection;
  }

  drawGame(ctx, app);
  requestAnimationFrame(frame);
}

// Screenshot mode: stage one scene, draw it once, signal readiness.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot);
  app.world = staged.world;
  app.screen = staged.screen;
  if (staged.totalTime !== undefined) app.totalTime = staged.totalTime;
  if (staged.totalSpotted !== undefined) app.totalSpotted = staged.totalSpotted;
  drawGame(ctx, app);
  window.__shotReady = true;
} else {
  document.title = 'Lantern Row';
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  requestAnimationFrame(frame);
}
