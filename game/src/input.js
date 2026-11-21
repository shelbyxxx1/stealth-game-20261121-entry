// Lantern Row — keyboard and mouse input. One job: turn keys into intent.
// The world reads {mx, my, sneak, run} every fixed step; the app reads the
// edge-triggered actions (confirm, restart, pause, mute) once per frame.
import { KEYS } from './config.js';

export function createInput() {
  const down = new Set();
  const pressed = new Set();
  const input = {
    mx: 0,
    my: 0,
    sneak: false,
    run: false,
    take(action) {
      const hit = pressed.has(action);
      pressed.delete(action);
      return hit;
    },
    attach(target) {
      target.addEventListener('keydown', (event) => {
        if (KEYS.confirm.includes(event.code) || KEYS.up.includes(event.code) || event.code === 'Space') {
          event.preventDefault();
        }
        if (!event.repeat) pressed.add(event.code);
        down.add(event.code);
      });
      target.addEventListener('keyup', (event) => {
        down.delete(event.code);
      });
      target.addEventListener('blur', () => {
        down.clear();
      });
    },
    attachClick(canvas, onClick) {
      canvas.addEventListener('click', onClick);
    },
    poll() {
      const has = (list) => list.some((code) => down.has(code));
      this.mx = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
      this.my = (has(KEYS.down) ? 1 : 0) - (has(KEYS.up) ? 1 : 0);
      this.sneak = has(KEYS.sneak);
      this.run = has(KEYS.run);
    },
  };
  return input;
}

export function codeIs(list, code) {
  return list.includes(code);
}
