// EMBER & BASIL — mouse and keyboard. Every click lands in a zone from
// render.js; every key maps to one kitchen action. The handlers call the
// state functions only, so the same actions drive play, tests and shots.
import { CHOP_SECONDS, COOK_SECONDS, INGREDIENTS } from './config.js';
import { ZONES, binRect, burnerRect } from './render.js';
import {
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
  addToPlate,
  clearPlate,
  putOnBurner,
  putOnChopBoard,
  removeFromPlate,
  servePlate,
  startShift,
  takeFromBurner,
  takeFromChopBoard,
  takeIngredient,
  trashBurner,
  trashHand,
} from './state.js';
import { ensureAudio, setMuted, sfx } from './audio.js';

function inside(x, y, zone) {
  return x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h;
}

function plateSlotAt(state, x, y) {
  const px = ZONES.plate.x + 130;
  const py = ZONES.plate.y + 120;
  for (let i = 0; i < 3; i += 1) {
    const sx = px - 52 + i * 52;
    if (Math.hypot(x - sx, y - (py - 4)) <= 24) return i;
  }
  return -1;
}

// One click, routed to the zone it lands in. Returns true when the click
// did something (so the caller can play a sound or shake the target).
export function handleClick(state, x, y) {
  ensureAudio();
  if (state.screen === SCREEN_TITLE) {
    if (inside(x, y, ZONES.startButton)) {
      startShift(state);
      sfx.bell();
      return true;
    }
    return false;
  }
  if (state.screen === SCREEN_OVER) {
    if (inside(x, y, ZONES.restartButton)) {
      startShift(state);
      sfx.bell();
      return true;
    }
    return false;
  }
  if (state.paused) return false;

  // Ingredient bins first: taking is the most common click.
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (inside(x, y, binRect(i))) {
      if (takeIngredient(state, INGREDIENTS[i].id)) sfx.pick();
      else sfx.denied();
      return true;
    }
  }
  if (inside(x, y, ZONES.chop)) {
    if (state.chop && state.chop.t >= CHOP_SECONDS) {
      if (takeFromChopBoard(state)) sfx.chopped();
      else sfx.denied();
    } else if (putOnChopBoard(state)) {
      sfx.chop();
    } else sfx.denied();
    return true;
  }
  if (inside(x, y, ZONES.stove)) {
    for (let i = 0; i < 2; i += 1) {
      if (inside(x, y, burnerRect(i))) {
        const slot = state.burners[i];
        if (slot && slot.burnt) {
          if (trashBurner(state, i)) sfx.denied();
        } else if (slot && slot.t >= COOK_SECONDS) {
          if (takeFromBurner(state, i)) sfx.cooked();
          else sfx.denied();
        } else if (putOnBurner(state, i)) {
          sfx.sizzle();
        } else sfx.denied();
        return true;
      }
    }
    return true;
  }
  if (inside(x, y, ZONES.plate)) {
    const slot = plateSlotAt(state, x, y);
    if (slot >= 0 && slot < state.plate.length) {
      if (removeFromPlate(state, slot)) sfx.pick();
      else sfx.denied();
    } else if (addToPlate(state)) {
      sfx.plate();
    } else sfx.denied();
    return true;
  }
  if (inside(x, y, ZONES.serve)) {
    if (servePlate(state)) {
      sfx.serve();
      sfx.bell();
    } else sfx.denied();
    return true;
  }
  if (inside(x, y, ZONES.trash)) {
    if (trashHand(state)) sfx.denied();
    else sfx.denied();
    return true;
  }
  return false;
}

const BIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

export function handleKey(state, key) {
  ensureAudio();
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === 'm') {
    state.muted = !state.muted;
    setMuted(state.muted);
    return true;
  }
  if (state.screen === SCREEN_TITLE) {
    if (k === ' ' || k === 'enter') {
      startShift(state);
      sfx.bell();
      return true;
    }
    return false;
  }
  if (state.screen === SCREEN_OVER) {
    if (k === 'r') {
      startShift(state);
      sfx.bell();
      return true;
    }
    return false;
  }
  if (k === 'p' || k === 'escape') {
    state.paused = !state.paused;
    return true;
  }
  if (state.paused) return false;
  if (k === ' ') {
    if (servePlate(state)) { sfx.serve(); sfx.bell(); }
    else sfx.denied();
    return true;
  }
  if (k === 'c') {
    if (state.chop && state.chop.t >= CHOP_SECONDS) {
      if (takeFromChopBoard(state)) sfx.chopped();
      else sfx.denied();
    } else if (putOnChopBoard(state)) sfx.chop();
    else sfx.denied();
    return true;
  }
  if (k === 'v') {
    const free = state.burners[0] === null ? 0 : state.burners[1] === null ? 1 : -1;
    if (free >= 0 && putOnBurner(state, free)) sfx.sizzle();
    else sfx.denied();
    return true;
  }
  if (k === 'b') {
    // Take the first cooked burner, if any.
    for (let i = 0; i < 2; i += 1) {
      const slot = state.burners[i];
      if (slot && slot.t >= COOK_SECONDS && !slot.burnt) {
        if (takeFromBurner(state, i)) sfx.cooked();
        else sfx.denied();
        return true;
      }
    }
    sfx.denied();
    return true;
  }
  if (k === 'x') {
    if (addToPlate(state)) sfx.plate();
    else sfx.denied();
    return true;
  }
  if (k === 't') {
    if (trashHand(state)) sfx.denied();
    else if (clearPlate(state)) sfx.denied();
    else sfx.denied();
    return true;
  }
  const binIndex = BIN_KEYS.indexOf(k);
  if (binIndex >= 0) {
    if (takeIngredient(state, INGREDIENTS[binIndex].id)) sfx.pick();
    else sfx.denied();
    return true;
  }
  return false;
}
