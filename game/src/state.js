// EMBER & BASIL — the kitchen's state and every rule that changes it.
// Pure logic: no drawing, no sound, no DOM. The render and input layers
// call these functions; the self-test drives them directly.
import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COOK_SECONDS,
  INGREDIENT_BY_ID,
  MAX_HEARTS,
  MAX_ORDERS,
  ORDER_BASE_COINS,
  ORDER_TIME_BONUS,
  PLATE_SLOTS,
  PREP_CHOP,
  PREP_COOK,
  PREP_NONE,
  RECIPE_BY_ID,
  SHIFT_SECONDS,
  gradeFor,
  patienceAt,
  recipePoolAt,
  spawnIntervalAt,
} from './config.js';
import { makeRng, pickFrom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_SERVED = 1;
export const EVENT_MISSED = 2;
export const EVENT_OVER = 4;
export const EVENT_BURNT = 8;

export function createState(seed) {
  return {
    seed,
    rng: makeRng(seed),
    orderSeq: 0,
    screen: SCREEN_TITLE,
    paused: false,
    muted: false,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    served: 0,
    missed: 0,
    burnt: 0,
    trashed: 0,
    hearts: MAX_HEARTS,
    orders: [],
    spawnIn: 2,
    hand: null, // { id, prepared } — one carried item, raw or prepared
    chop: null, // { id, t } — the chopping board's one slot
    burners: [null, null], // { id, t, burnt } — the stove's two burners
    plate: [], // prepared ingredient ids on the plate, in order added
    flash: null, // { text, color, until } — floating feedback
    grade: null,
    best: 0,
    lastServe: null, // { recipe, coins, tip } for the serve banner
  };
}

export function resetState(state) {
  const fresh = createState(state.seed);
  fresh.best = state.best;
  Object.keys(fresh).forEach((key) => {
    state[key] = fresh[key];
  });
}

export function startShift(state) {
  resetState(state);
  state.screen = SCREEN_PLAY;
  spawnOrder(state);
  spawnOrder(state);
}

export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const pool = recipePoolAt(state.elapsed);
  const recipe = pickFrom(state.rng, pool);
  const patience = patienceAt(state.elapsed);
  const order = {
    id: state.orderSeq += 1,
    recipeId: recipe.id,
    patience,
    patienceMax: patience,
    coins: ORDER_BASE_COINS + Math.floor(state.rng() * 11),
  };
  state.orders.push(order);
  return order;
}

export function orderNeeds(state, order) {
  return RECIPE_BY_ID[order.recipeId].needs;
}

// Is the plate exactly one order's recipe (any order on the board)?
export function plateMatchesOrder(state) {
  if (state.plate.length !== PLATE_SLOTS) return null;
  const sorted = state.plate.slice().sort().join(',');
  for (const order of state.orders) {
    if (orderNeeds(state, order).slice().sort().join(',') === sorted) return order;
  }
  return null;
}

export function plateMatchesAnyRecipe(state) {
  if (state.plate.length !== PLATE_SLOTS) return null;
  const sorted = state.plate.slice().sort().join(',');
  for (const recipe of Object.values(RECIPE_BY_ID)) {
    if (recipe.needs.slice().sort().join(',') === sorted) return recipe;
  }
  return null;
}

// --- Player actions. Each returns true when it did something. ---

export function takeIngredient(state, id) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (state.hand !== null) return false;
  if (!INGREDIENT_BY_ID[id]) return false;
  state.hand = { id, prepared: INGREDIENT_BY_ID[id].prep === PREP_NONE };
  return true;
}

export function putOnChopBoard(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (!state.hand || state.hand.prepared) return false;
  if (INGREDIENT_BY_ID[state.hand.id].prep !== PREP_CHOP) return false;
  if (state.chop !== null) return false;
  state.chop = { id: state.hand.id, t: 0 };
  state.hand = null;
  return true;
}

export function takeFromChopBoard(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (!state.chop || state.chop.t < CHOP_SECONDS) return false;
  if (state.hand !== null) return false;
  state.hand = { id: state.chop.id, prepared: true };
  state.chop = null;
  return true;
}

export function putOnBurner(state, index) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (!state.hand || state.hand.prepared) return false;
  if (INGREDIENT_BY_ID[state.hand.id].prep !== PREP_COOK) return false;
  if (index < 0 || index > 1 || state.burners[index] !== null) return false;
  state.burners[index] = { id: state.hand.id, t: 0, burnt: false };
  state.hand = null;
  return true;
}

export function takeFromBurner(state, index) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  const slot = state.burners[index];
  if (!slot || slot.t < COOK_SECONDS) return false;
  if (state.hand !== null) return false;
  if (slot.burnt) return false;
  state.hand = { id: slot.id, prepared: true };
  state.burners[index] = null;
  return true;
}

export function trashBurner(state, index) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  const slot = state.burners[index];
  if (!slot || !slot.burnt) return false;
  state.burners[index] = null;
  state.trashed += 1;
  return true;
}

export function addToPlate(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (!state.hand || !state.hand.prepared) return false;
  if (state.plate.length >= PLATE_SLOTS) return false;
  if (state.plate.includes(state.hand.id)) return false;
  state.plate.push(state.hand.id);
  state.hand = null;
  return true;
}

export function removeFromPlate(state, index) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (index < 0 || index >= state.plate.length) return false;
  if (state.hand !== null) return false;
  state.hand = { id: state.plate[index], prepared: true };
  state.plate.splice(index, 1);
  return true;
}

export function clearPlate(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (state.plate.length === 0) return false;
  state.plate = [];
  return true;
}

export function trashHand(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  if (!state.hand) return false;
  state.hand = null;
  state.trashed += 1;
  return true;
}

export function servePlate(state) {
  if (state.screen !== SCREEN_PLAY || state.paused) return false;
  const order = plateMatchesOrder(state);
  if (!order) return false;
  const timeBonus = Math.round(ORDER_TIME_BONUS * (order.patience / order.patienceMax));
  const streakBonus = state.streak * 2;
  const earned = order.coins + timeBonus + streakBonus;
  state.coins += earned;
  state.served += 1;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.orders = state.orders.filter((o) => o !== order);
  state.plate = [];
  state.lastServe = { recipe: RECIPE_BY_ID[order.recipeId].name, coins: earned, tip: timeBonus };
  state.flash = { text: `+${earned} coins`, color: '#ffd23f', until: state.elapsed + 1.6 };
  return true;
}

// --- The clock: orders age, stations progress, the shift runs out. ---

export function tick(state, dt) {
  if (state.screen !== SCREEN_PLAY || state.paused) return EVENT_NONE;
  let events = EVENT_NONE;
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);

  if (state.chop) state.chop.t += dt;
  for (const slot of state.burners) {
    if (!slot) continue;
    slot.t += dt;
    if (!slot.burnt && slot.t >= BURN_SECONDS) {
      slot.burnt = true;
      state.burnt += 1;
      events |= EVENT_BURNT;
    }
  }

  for (const order of state.orders.slice()) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o !== order);
      state.missed += 1;
      state.streak = 0;
      state.hearts -= 1;
      events |= EVENT_MISSED;
      state.flash = { text: 'Order walked out!', color: '#ff6b5e', until: state.elapsed + 1.6 };
    }
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    spawnOrder(state);
    state.spawnIn = spawnIntervalAt(state.elapsed);
  }

  if (state.timeLeft <= 0 || state.hearts <= 0) {
    state.screen = SCREEN_OVER;
    state.grade = gradeFor(state.served, state.missed, state.coins);
    state.best = Math.max(state.best, state.coins);
    events |= EVENT_OVER;
  }
  return events;
}
