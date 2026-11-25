// EMBER & BASIL — the loop: read the URL (?seed=, ?shot=, ?selftest=),
// wire canvas input to the state, tick the clock, draw every frame.
import { FIELD } from './config.js';
import { createState, plateMatchesOrder, startShift, tick } from './state.js';
import { handleClick, handleKey } from './input.js';
import { render } from './render.js';
import { runSelftest } from './selftest.js';
import { stageShot } from './shots.js';
import { ensureAudio, setMuted, sfx } from './audio.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7') || 7;

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const ctx = canvas.getContext('2d');

const state = createState(seed);
try {
  state.best = Number(window.localStorage.getItem('ember-basil-best') || '0') || 0;
} catch {
  state.best = 0;
}

const mouse = { x: -100, y: -100 };
let last = performance.now();
let lastEvents = 0;

function toGameCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (FIELD.width / rect.width),
    y: (event.clientY - rect.top) * (FIELD.height / rect.height),
  };
}

canvas.addEventListener('mousemove', (event) => {
  const p = toGameCoords(event);
  mouse.x = p.x;
  mouse.y = p.y;
});
canvas.addEventListener('click', (event) => {
  const p = toGameCoords(event);
  mouse.x = p.x;
  mouse.y = p.y;
  handleClick(state, p.x, p.y);
});
window.addEventListener('keydown', (event) => {
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
  handleKey(state, event.key);
});

// Debug handle for the scripted playtest (read-only from the page's own
// console): the live state and the order-matching rule.
window.__game = { state, plateMatchesOrder };
// screenshot always shows the staged state and never a half-built one.
const shot = params.get('shot');
if (shot) {
  stageShot(shot, state);
  window.__shotReady = true;
}
if (params.get('selftest') === '1') {
  window.__selftest = runSelftest();
  window.__shotReady = true;
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shot) {
    const events = tick(state, dt);
    if (events !== lastEvents) {
      lastEvents = events;
      if (events & 2) sfx.miss();
      if (events & 8) sfx.burnt();
      if (events & 4) {
        if (state.grade === 'S' || state.grade === 'A') sfx.win();
        else sfx.lose();
        try {
          window.localStorage.setItem('ember-basil-best', String(state.best));
        } catch { /* private mode: best score just does not persist */ }
      }
    }
  }
  setMuted(state.muted);
  render(ctx, state, now / 1000, mouse);
  requestAnimationFrame(frame);
}

ensureAudio();
requestAnimationFrame(frame);
