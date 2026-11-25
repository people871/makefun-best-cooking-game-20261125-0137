// EMBER & BASIL — scripted checks against the real rules, run in the
// browser at ?selftest=1. Each check names what it proves; the page reports
// window.__selftest = { passed, total, checks: [{ name, pass, detail }] }.
import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COOK_SECONDS,
  INGREDIENTS,
  RECIPES,
  SHIFT_SECONDS,
} from './config.js';
import {
  addToPlate,
  clearPlate,
  createState,
  plateMatchesOrder,
  putOnBurner,
  putOnChopBoard,
  removeFromPlate,
  servePlate,
  spawnOrder,
  startShift,
  takeFromBurner,
  takeFromChopBoard,
  takeIngredient,
  tick,
  trashBurner,
  trashHand,
} from './state.js';

function step(state, seconds) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) tick(state, dt);
}

function chopReady(state, id) {
  takeIngredient(state, id);
  putOnChopBoard(state);
  step(state, CHOP_SECONDS + 0.1);
  return takeFromChopBoard(state);
}

function cookReady(state, id) {
  takeIngredient(state, id);
  putOnBurner(state, 0);
  step(state, COOK_SECONDS + 0.1);
  return takeFromBurner(state, 0);
}

function plateRecipe(state, recipeId) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  for (const need of recipe.needs) {
    const ing = INGREDIENTS.find((i) => i.id === need);
    if (ing.prep === 'chop') chopReady(state, need);
    else if (ing.prep === 'cook') cookReady(state, need);
    else takeIngredient(state, need);
    addToPlate(state);
  }
}

export function runSelftest() {
  const checks = [];
  function check(name, pass, detail = '') {
    checks.push({ name, pass: !!pass, detail: String(detail) });
  }

  // Data sanity.
  check('twelveIngredients', INGREDIENTS.length === 12, INGREDIENTS.length);
  check('eightRecipes', RECIPES.length === 8, RECIPES.length);
  check('recipesNeedThree', RECIPES.every((r) => r.needs.length === 3));
  check('recipesUseKnownIngredients', RECIPES.every((r) => r.needs.every((n) => INGREDIENTS.some((i) => i.id === n))));
  check('recipesDistinct', new Set(RECIPES.map((r) => r.needs.slice().sort().join(','))).size === 8);

  // A fresh shift.
  const s0 = createState(7);
  check('startsOnTitle', s0.screen === 'title');
  startShift(s0);
  check('startShiftPlays', s0.screen === 'play');
  check('startShiftTwoOrders', s0.orders.length === 2, s0.orders.length);
  check('startShiftHearts3', s0.hearts === 3);
  check('startShiftTimer180', s0.timeLeft === SHIFT_SECONDS);

  // Taking and hand rules.
  const s1 = createState(7);
  startShift(s1);
  check('takeCheeseReady', takeIngredient(s1, 'cheese') && s1.hand.prepared === true);
  check('handBlocksSecondTake', takeIngredient(s1, 'tomato') === false);
  check('trashHandEmpties', trashHand(s1) && s1.hand === null);
  check('takeUnknownRefused', takeIngredient(s1, 'gold') === false);

  // Chopping.
  const s2 = createState(7);
  startShift(s2);
  takeIngredient(s2, 'tomato');
  check('tomatoToBoard', putOnChopBoard(s2) && s2.chop !== null);
  check('chopTooEarlyRefused', takeFromChopBoard(s2) === false);
  step(s2, CHOP_SECONDS + 0.1);
  check('chopCompletes', takeFromChopBoard(s2) && s2.hand.prepared === true, s2.hand && s2.hand.id);
  check('cheeseCannotChop', (() => { takeIngredient(s2, 'cheese'); const r = putOnChopBoard(s2); trashHand(s2); return r === false; })());

  // Cooking and burning.
  const s3 = createState(7);
  startShift(s3);
  takeIngredient(s3, 'beef');
  check('beefToBurner', putOnBurner(s3, 0) && s3.burners[0] !== null);
  check('burnerBusyRefused', (() => { takeIngredient(s3, 'fish'); return putOnBurner(s3, 0) === false; })());
  trashHand(s3);
  step(s3, COOK_SECONDS + 0.1);
  check('cookCompletes', takeFromBurner(s3, 0) && s3.hand.prepared === true);
  trashHand(s3); // hand is full with the cooked beef; bin it to free it
  takeIngredient(s3, 'fish');
  putOnBurner(s3, 1);
  step(s3, BURN_SECONDS + 0.5);
  check('overcookedBurns', s3.burners[1] && s3.burners[1].burnt === true);
  check('burntCannotServe', takeFromBurner(s3, 1) === false);
  check('burntTrashed', trashBurner(s3, 1) && s3.burners[1] === null);

  // Plating rules.
  const s4 = createState(7);
  startShift(s4);
  takeIngredient(s4, 'cheese');
  check('plateReadyCheese', addToPlate(s4) && s4.plate.length === 1);
  check('plateNoDuplicates', (() => { takeIngredient(s4, 'cheese'); const r = addToPlate(s4); trashHand(s4); return r === false; })());
  check('plateRemoveReturnsToHand', removeFromPlate(s4, 0) && s4.hand.id === 'cheese' && s4.plate.length === 0);
  trashHand(s4);
  check('plateRawRefused', (() => { takeIngredient(s4, 'tomato'); const r = addToPlate(s4); trashHand(s4); return r === false; })());

  // Serving: force a known order, plate it, serve it.
  const s5 = createState(7);
  startShift(s5);
  s5.spawnIn = 999; // keep the board to the one order we force below
  s5.orders = [{ id: 99, recipeId: 'pasta', patience: 60, patienceMax: 60, coins: 25 }];
  plateRecipe(s5, 'pasta');
  check('plateMatchesOrder', plateMatchesOrder(s5) !== null);
  const coinsBefore = s5.coins;
  check('serveScores', servePlate(s5) && s5.coins > coinsBefore, `+${s5.coins - coinsBefore}`);
  check('serveClearsOrder', s5.orders.length === 0);
  check('serveCountsDish', s5.served === 1);
  check('serveBuildsStreak', s5.streak === 1);

  // A plate nobody ordered cannot be served.
  const s6 = createState(7);
  startShift(s6);
  s6.spawnIn = 999; // keep the board to the one order we force below
  s6.orders = [{ id: 98, recipeId: 'salad', patience: 60, patienceMax: 60, coins: 25 }];
  plateRecipe(s6, 'pasta');
  check('wrongPlateRefused', servePlate(s6) === false && s6.served === 0);

  // A missed order costs a heart and resets the streak.
  const s7 = createState(7);
  startShift(s7);
  s7.streak = 4;
  s7.orders[0].patience = 0.05;
  step(s7, 0.2);
  check('missLosesHeart', s7.hearts === 2 && s7.missed === 1, `hearts ${s7.hearts}`);
  check('missResetsStreak', s7.streak === 0);

  // Three missed orders end the shift.
  const s8 = createState(7);
  startShift(s8);
  for (const o of s8.orders) o.patience = 0.05;
  s8.spawnIn = 999;
  step(s8, 0.2);
  // Two orders missed; force the third by adding a dying order.
  s8.orders.push({ id: 97, recipeId: 'soup', patience: 0.05, patienceMax: 60, coins: 20 });
  step(s8, 0.2);
  check('threeMissesEndsShift', s8.screen === 'over' && s8.grade !== null, `grade ${s8.grade}`);

  // The clock ends the shift with a grade (no orders, so no early miss-out).
  const s9 = createState(7);
  startShift(s9);
  s9.orders = [];
  s9.spawnIn = 999;
  step(s9, SHIFT_SECONDS + 1);
  check('clockEndsShift', s9.screen === 'over' && s9.timeLeft === 0, `grade ${s9.grade}`);

  // Orders keep spawning while the shift runs.
  const s10 = createState(7);
  startShift(s10);
  s10.orders = [];
  s10.spawnIn = 0.05;
  step(s10, 0.2);
  check('ordersSpawn', s10.orders.length >= 1, s10.orders.length);

  // Determinism: same seed, same first orders.
  const a = createState(7);
  startShift(a);
  const b = createState(7);
  startShift(b);
  check('deterministicOrders', JSON.stringify(a.orders) === JSON.stringify(b.orders));

  // Clear plate.
  const s11 = createState(7);
  startShift(s11);
  takeIngredient(s11, 'cheese');
  addToPlate(s11);
  check('clearPlate', clearPlate(s11) && s11.plate.length === 0);

  // Spawning never exceeds three orders.
  const s12 = createState(7);
  startShift(s12);
  for (let i = 0; i < 10; i += 1) spawnOrder(s12);
  check('maxThreeOrders', s12.orders.length <= 3, s12.orders.length);

  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, checks };
}
