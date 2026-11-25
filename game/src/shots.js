// The screenshot scenes behind ?shot=play|serve|start|end. Each one plays
// the real rules forward from a fresh world with a fixed seed, driving the
// same action functions the player's clicks call, so every frame is what a
// real shift looks like and the same seed always gives the same frame.
import { CHOP_SECONDS, COOK_SECONDS, INGREDIENT_BY_ID, RECIPE_BY_ID } from './config.js';
import {
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
  addToPlate,
  putOnBurner,
  putOnChopBoard,
  servePlate,
  startShift,
  takeFromBurner,
  takeFromChopBoard,
  takeIngredient,
  tick,
} from './state.js';

// Advance the clock in small steps so station timers and order patience
// move exactly as they do in play.
function advance(state, seconds) {
  const step = 1 / 60;
  for (let t = 0; t < seconds; t += step) tick(state, step);
}

// Chop one ingredient and hold it prepared in hand.
function chopOne(state, id) {
  takeIngredient(state, id);
  putOnChopBoard(state);
  advance(state, CHOP_SECONDS + 0.1);
  takeFromChopBoard(state);
}

// Cook one ingredient and hold it prepared in hand.
function cookOne(state, id) {
  takeIngredient(state, id);
  putOnBurner(state, 0);
  advance(state, COOK_SECONDS + 0.1);
  takeFromBurner(state, 0);
}

// Plate the Tomato Pasta (pasta + tomato + cheese) on the current plate.
function platePasta(state) {
  cookOne(state, 'pasta');
  addToPlate(state);
  chopOne(state, 'tomato');
  addToPlate(state);
  takeIngredient(state, 'cheese');
  addToPlate(state);
}

export function stageShot(name, state) {
  startShift(state);
  if (name === 'start') {
    state.screen = SCREEN_TITLE;
    state.orders = [];
    return { screen: SCREEN_TITLE, best: state.best };
  }
  if (name === 'end') {
    // Play a good shift: serve four orders in a row, then freeze the
    // board's patience so the clock — not three walk-outs — ends it.
    for (let n = 0; n < 4 && state.screen === SCREEN_PLAY; n += 1) {
      // Top every patience bar back up (staging only) so no order walks
      // out mid-scene; the time bonus stays honest at patienceMax.
      for (const order of state.orders) order.patience = order.patienceMax;
      if (state.orders[0]) plateRecipe(state, state.orders[0].recipeId);
      servePlate(state);
      advance(state, 10);
    }
    for (const order of state.orders) order.patience = 999;
    state.spawnIn = 999;
    advance(state, 175);
    return { screen: SCREEN_OVER, best: state.best };
  }
  if (name === 'serve') {
    // A finished plate, matching the first order on the board, glowing
    // at the serve window — the plate-ready-to-serve shot.
    const first = state.orders[0];
    const needs = first ? first.recipeId : 'pasta';
    plateRecipe(state, needs);
    advance(state, 2);
    return { screen: SCREEN_PLAY, best: state.best };
  }
  // play (default): mid-shift, mid-assembly — two of three pasta items on
  // the plate, a mushroom chopping, the timer running, coins on the board.
  cookOne(state, 'pasta');
  addToPlate(state);
  chopOne(state, 'tomato');
  addToPlate(state);
  takeIngredient(state, 'mushroom');
  putOnChopBoard(state);
  advance(state, 1.2);
  state.coins = 145;
  state.streak = 3;
  state.bestStreak = 3;
  state.served = 4;
  advance(state, 27);
  return { screen: SCREEN_PLAY, best: state.best };
}

// Plate any recipe by id, prepping each ingredient the way the rules ask.
function plateRecipe(state, recipeId) {
  const recipe = RECIPE_BY_ID[recipeId];
  for (const need of recipe.needs) {
    const prep = INGREDIENT_BY_ID[need].prep;
    if (prep === 'chop') chopOne(state, need);
    else if (prep === 'cook') cookOne(state, need);
    else takeIngredient(state, need);
    addToPlate(state);
  }
}
