// Synthesized sound: every effect is a few oscillators through one
// WebAudio graph — no audio files, no network. Desert-flavoured: dry
// plucks, horn calls, wind noise. Audio starts only after a user gesture
// (the browser's rule), so ensure() is called on first input.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || !master || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Cosmetic noise only — it never touches game state, so plain
  // Math.random is fine here; the simulation itself is fully seeded.
  function noise(dur, vol, cutoff) {
    if (!ctx || !master || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() { tone(740, 0.1, 'triangle', 0.4, 1180); noise(0.06, 0.1, 3000); },
    hit() { tone(200, 0.07, 'square', 0.22, 130); },
    kill() { tone(330, 0.16, 'triangle', 0.45, 70); noise(0.12, 0.18, 1400); },
    cannon() { noise(0.4, 0.4, 700); tone(90, 0.4, 'sine', 0.5, 45); },
    bridge() { tone(262, 0.12, 'triangle', 0.35, 262); tone(392, 0.16, 'triangle', 0.3, 392); },
    horn() { tone(233, 0.5, 'sawtooth', 0.35, 233); tone(349, 0.5, 'sawtooth', 0.25, 349); },
    hurt() { tone(120, 0.2, 'sawtooth', 0.45, 60); noise(0.15, 0.2, 800); },
    pickup() { tone(880, 0.08, 'sine', 0.3, 1320); },
    legStart() { tone(196, 0.4, 'triangle', 0.35, 196); tone(294, 0.4, 'triangle', 0.28, 294); },
    dawn() { tone(523, 0.3, 'sine', 0.35, 523); tone(659, 0.3, 'sine', 0.3, 659); tone(784, 0.5, 'sine', 0.3, 784); },
    boss() { tone(65, 0.9, 'sawtooth', 0.5, 40); tone(98, 0.9, 'sawtooth', 0.35, 49); noise(0.8, 0.15, 500); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sine', 0.35, f), i * 140)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.45, 'triangle', 0.35, f), i * 170)); },
  };
}
