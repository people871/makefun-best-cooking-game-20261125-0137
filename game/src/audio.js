// Synthesised sound only: short WebAudio phrases, no audio files, no
// network. Created lazily on the first user gesture (browsers block audio
// before one); every call is a no-op while muted or before that gesture.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, gain, when = 0, lowpass = 1200) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start(t0);
}

export const sfx = {
  pick() { tone(520, 0.07, 'triangle', 0.12); },
  chop() { noise(0.09, 0.22, 0, 2400); tone(180, 0.06, 'square', 0.06); },
  chopped() { tone(660, 0.08, 'triangle', 0.12); tone(880, 0.1, 'triangle', 0.12, 0.07); },
  sizzle() { noise(0.35, 0.1, 0, 3200); },
  cooked() { tone(740, 0.09, 'sine', 0.14); tone(988, 0.12, 'sine', 0.14, 0.08); },
  plate() { tone(440, 0.07, 'triangle', 0.12); tone(587, 0.09, 'triangle', 0.12, 0.06); },
  serve() { tone(523, 0.1, 'triangle', 0.14); tone(659, 0.1, 'triangle', 0.14, 0.09); tone(784, 0.16, 'triangle', 0.16, 0.18); },
  bell() { tone(1175, 0.35, 'sine', 0.12); tone(1568, 0.4, 'sine', 0.08, 0.02); },
  miss() { tone(330, 0.18, 'sawtooth', 0.07, 0, 220); },
  burnt() { tone(196, 0.25, 'sawtooth', 0.09, 0, 130); },
  denied() { tone(220, 0.08, 'square', 0.06); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.11)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.16)); },
};
