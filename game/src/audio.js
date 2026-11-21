// Lantern Row — synthesized sound. One job: every sound the game makes,
// built with WebAudio oscillators. No audio files, no network. Audio starts
// only after the first user gesture; until then every call is a safe no-op.
export function createAudio() {
  let ctx = null;
  let muted = false;
  const audio = {
    get muted() {
      return muted;
    },
    unlock() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    tone(freq, dur, type, gain, when = 0) {
      if (!ctx || muted) return;
      try {
        const t0 = ctx.currentTime + when;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      } catch {
        // Sound never blocks the game.
      }
    },
    step() {
      this.tone(190, 0.05, 'triangle', 0.05);
    },
    pickup() {
      this.tone(660, 0.12, 'sine', 0.12);
      this.tone(990, 0.16, 'sine', 0.10, 0.07);
    },
    warn() {
      this.tone(440, 0.09, 'square', 0.06);
    },
    alarm() {
      this.tone(520, 0.16, 'sawtooth', 0.10);
      this.tone(392, 0.22, 'sawtooth', 0.10, 0.14);
    },
    clear() {
      this.tone(523, 0.14, 'sine', 0.12);
      this.tone(659, 0.14, 'sine', 0.12, 0.12);
      this.tone(784, 0.22, 'sine', 0.12, 0.24);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => this.tone(f, 0.24, 'sine', 0.12, i * 0.14));
    },
  };
  return audio;
}
