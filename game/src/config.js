// EMBER & BASIL — Hearthside Rush: the game's data.
// Every ingredient, recipe, station timing and difficulty number lives here,
// so the rules can be read (and tuned) without touching the engine.
export const FIELD = { width: 1280, height: 720 };

export const SHIFT_SECONDS = 180;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 3;
export const PLATE_SLOTS = 3;

// Prep a raw ingredient needs before it can go on a plate.
export const PREP_NONE = 'ready';
export const PREP_CHOP = 'chop';
export const PREP_COOK = 'cook';

export const CHOP_SECONDS = 2.5;
export const COOK_SECONDS = 4;
export const BURN_SECONDS = 8; // cooked past this long on the burner: burnt

export const ORDER_BASE_COINS = 20;
export const ORDER_TIME_BONUS = 20;
export const STREAK_BONUS_PER = 2;

// 12 ingredients. `color` is the icon's main fill, `accent` its detail,
// `prep` the station it must visit, `shape` picks its vector icon.
export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', prep: PREP_CHOP, color: '#e23b2e', accent: '#7fb069', shape: 'round' },
  { id: 'lettuce', name: 'Lettuce', prep: PREP_CHOP, color: '#7fb069', accent: '#4c956c', shape: 'leaf' },
  { id: 'carrot', name: 'Carrot', prep: PREP_CHOP, color: '#f4842b', accent: '#7fb069', shape: 'stick' },
  { id: 'mushroom', name: 'Mushroom', prep: PREP_CHOP, color: '#d9c7a7', accent: '#8a6d4b', shape: 'cap' },
  { id: 'pepper', name: 'Pepper', prep: PREP_CHOP, color: '#f2c230', accent: '#7fb069', shape: 'bell' },
  { id: 'berry', name: 'Berry', prep: PREP_CHOP, color: '#7b2f8b', accent: '#4a1d52', shape: 'round' },
  { id: 'cheese', name: 'Cheese', prep: PREP_NONE, color: '#ffd23f', accent: '#f4a900', shape: 'wedge' },
  { id: 'egg', name: 'Egg', prep: PREP_COOK, color: '#fff3d6', accent: '#f4a900', shape: 'oval' },
  { id: 'pasta', name: 'Pasta', prep: PREP_COOK, color: '#f2d492', accent: '#d9a441', shape: 'nest' },
  { id: 'noodle', name: 'Noodle', prep: PREP_COOK, color: '#e8b04b', accent: '#b97e1e', shape: 'nest' },
  { id: 'beef', name: 'Beef', prep: PREP_COOK, color: '#a63d40', accent: '#6e2a2c', shape: 'steak' },
  { id: 'fish', name: 'Fish', prep: PREP_COOK, color: '#7fb8c9', accent: '#3e7d92', shape: 'fish' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

// 8 recipes, 3 ingredients each. `station` is the flavour line the order
// board prints; `color` tints the recipe's card.
export const RECIPES = [
  { id: 'pasta', name: 'Tomato Pasta', needs: ['pasta', 'tomato', 'cheese'], color: '#e23b2e', blurb: 'Boil, chop, grate' },
  { id: 'salad', name: 'Garden Salad', needs: ['lettuce', 'tomato', 'carrot'], color: '#7fb069', blurb: 'Fresh off the board' },
  { id: 'soup', name: 'Mushroom Soup', needs: ['mushroom', 'pepper', 'cheese'], color: '#d9c7a7', blurb: 'Simmered and grated' },
  { id: 'fish', name: 'Grilled Fish', needs: ['fish', 'pepper', 'carrot'], color: '#7fb8c9', blurb: 'Charred, not burnt' },
  { id: 'steak', name: 'Beef Steak', needs: ['beef', 'mushroom', 'pepper'], color: '#a63d40', blurb: 'Seared to order' },
  { id: 'noodles', name: 'Veggie Noodles', needs: ['noodle', 'carrot', 'mushroom'], color: '#e8b04b', blurb: 'Wok-tossed fast' },
  { id: 'omelette', name: 'Cheese Omelette', needs: ['egg', 'cheese', 'pepper'], color: '#ffd23f', blurb: 'Fluffy and golden' },
  { id: 'tart', name: 'Berry Tart', needs: ['berry', 'egg', 'cheese'], color: '#7b2f8b', blurb: 'Baked, berries on top' },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Difficulty ramp over the 180-second shift.
export function spawnIntervalAt(elapsed) {
  if (elapsed < 45) return 14;
  if (elapsed < 100) return 11;
  return 8;
}

export function patienceAt(elapsed) {
  if (elapsed < 45) return 60;
  if (elapsed < 100) return 50;
  return 40;
}

// Only the first four recipes circulate in the opening minute; the full
// menu opens once the cook has found their feet.
export function recipePoolAt(elapsed) {
  return elapsed < 60 ? RECIPES.slice(0, 4) : RECIPES;
}

export function gradeFor(served, missed, coins) {
  if (served >= 12 && missed === 0) return 'S';
  if (served >= 10 && coins >= 350) return 'A';
  if (served >= 7) return 'B';
  if (served >= 4) return 'C';
  return 'D';
}
