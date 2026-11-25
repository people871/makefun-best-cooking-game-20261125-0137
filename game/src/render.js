// EMBER & BASIL — everything the player sees, drawn on one 2D canvas.
// No images, no fonts to fetch: every ingredient, heart, flame and plate
// is a vector shape, so the game renders identically offline.
import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COOK_SECONDS,
  FIELD,
  INGREDIENT_BY_ID,
  INGREDIENTS,
  MAX_HEARTS,
  PLATE_SLOTS,
  PREP_CHOP,
  PREP_COOK,
  RECIPE_BY_ID,
  RECIPES,
  SHIFT_SECONDS,
} from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './state.js';

export const SCREEN_TITLE_ID = SCREEN_TITLE;
export const SCREEN_PLAY_ID = SCREEN_PLAY;
export const SCREEN_OVER_ID = SCREEN_OVER;

// Geometry the input layer shares (zones are exported for hit-testing).
export const ZONES = {
  hud: { x: 0, y: 0, w: 1280, h: 64 },
  board: { x: 16, y: 76, w: 284, h: 372 },
  menu: { x: 16, y: 460, w: 284, h: 244 },
  chop: { x: 316, y: 76, w: 648, h: 128 },
  stove: { x: 316, y: 216, w: 648, h: 140 },
  plate: { x: 316, y: 368, w: 400, h: 200 },
  serve: { x: 728, y: 368, w: 236, h: 200 },
  bins: { x: 980, y: 76, w: 284, h: 528 },
  trash: { x: 980, y: 616, w: 284, h: 88 },
  startButton: { x: 440, y: 560, w: 400, h: 64 },
  restartButton: { x: 440, y: 560, w: 400, h: 64 },
};

const BIN_COLS = 3;
const BIN_W = 88;
const BIN_H = 118;
const BIN_GAP = 10;

export function binRect(index) {
  const col = index % BIN_COLS;
  const row = Math.floor(index / BIN_COLS);
  return {
    x: ZONES.bins.x + 4 + col * (BIN_W + BIN_GAP),
    y: ZONES.bins.y + 34 + row * (BIN_H + BIN_GAP),
    w: BIN_W,
    h: BIN_H,
  };
}

export function burnerRect(index) {
  return {
    x: ZONES.stove.x + 24 + index * 330,
    y: ZONES.stove.y + 44,
    w: 290,
    h: 82,
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function mmss(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// --- Ingredient icons (vector, one per shape) ---

export function drawIngredient(ctx, id, cx, cy, r) {
  const ing = INGREDIENT_BY_ID[id];
  if (!ing) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  switch (ing.shape) {
    case 'round': {
      ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 0.75, r * 0.45, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.8, r * 0.4, r * 0.18, 0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'leaf': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.55, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.35, r * 0.7, r * 0.4, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ing.accent; ctx.lineWidth = Math.max(1, r * 0.09);
      ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.2); ctx.lineTo(r * 0.7, -r * 0.2); ctx.stroke();
      break;
    }
    case 'stick': {
      ctx.save(); ctx.rotate(-0.6);
      ctx.fillStyle = ing.color;
      rr(ctx, -r * 0.25, -r, r * 0.5, r * 1.9, r * 0.25); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.35, -r * 1.35); ctx.lineTo(r * 0.05, -r * 1.1); ctx.lineTo(r * 0.4, -r * 1.3); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'cap': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.9, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5efe2';
      rr(ctx, -r * 0.28, -r * 0.1, r * 0.56, r * 0.95, r * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.45, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.55, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bell': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      rr(ctx, -r * 0.12, -r * 0.95, r * 0.24, r * 0.4, r * 0.1); ctx.fill();
      break;
    }
    case 'wedge': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.6); ctx.lineTo(r * 0.9, r * 0.6); ctx.lineTo(r * 0.9, -r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.25, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.45, r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'oval': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.92, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.accent;
      ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.34, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'nest': {
      ctx.strokeStyle = ing.accent; ctx.lineWidth = Math.max(1.5, r * 0.14);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.arc(0, 0, r * (0.85 - i * 0.26), 0.3, Math.PI * 2 - 0.6); ctx.stroke();
      }
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'steak': {
      ctx.fillStyle = ing.color;
      rr(ctx, -r * 0.9, -r * 0.6, r * 1.8, r * 1.2, r * 0.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ing.accent; ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.quadraticCurveTo(0, r * 0.25, r * 0.55, -r * 0.15); ctx.stroke();
      break;
    }
    case 'fish': {
      ctx.fillStyle = ing.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.lineTo(r * 1.25, -r * 0.55); ctx.lineTo(r * 1.25, r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d3557';
      ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.08, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ing.accent; ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, -1.1, 1.1); ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHeart(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = filled ? '#ff5a5a' : 'rgba(255,255,255,0.18)';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.7, -r, 0, -r * 0.35);
  ctx.bezierCurveTo(r * 0.7, -r, r * 1.3, -r * 0.1, 0, r * 0.9);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawFlame(ctx, cx, cy, r, lit) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = lit ? '#ff9f1c' : 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.7, r * 0.7, 0, r * 0.9);
  ctx.bezierCurveTo(-r * 0.7, r * 0.7, -r * 0.9, -r * 0.2, 0, -r);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit ? '#ffd23f' : 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.3);
  ctx.bezierCurveTo(r * 0.45, r * 0.1, r * 0.35, r * 0.55, 0, r * 0.6);
  ctx.bezierCurveTo(-r * 0.35, r * 0.55, -r * 0.45, r * 0.1, 0, -r * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, frac, color, bg = 'rgba(0,0,0,0.3)') {
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    rr(ctx, x, y, Math.max(h, w * f), h, h / 2); ctx.fill();
  }
}

// --- Screens ---

function drawHud(ctx, state, now) {
  const z = ZONES.hud;
  ctx.fillStyle = '#3b2a1e';
  ctx.fillRect(z.x, z.y, z.w, z.h);
  ctx.fillStyle = '#ff9f1c';
  ctx.fillRect(z.x, z.y + z.h - 4, z.w, 4);
  text(ctx, 'EMBER & BASIL', 20, 26, 22, '#ffd23f');
  text(ctx, 'HEARTHSIDE RUSH', 20, 48, 11, '#f5e6d3', 'bold', 'left');
  // Shift timer, centre.
  const urgent = state.timeLeft <= 30 && state.screen === SCREEN_PLAY;
  const timerColor = urgent && Math.floor(now * 2) % 2 === 0 ? '#ff6b5e' : '#ffffff';
  text(ctx, `SHIFT ${mmss(state.timeLeft)}`, 640, 24, 26, timerColor, 'bold', 'center');
  drawProgressBar(ctx, 500, 44, 280, 10, state.timeLeft / SHIFT_SECONDS, urgent ? '#ff6b5e' : '#7fb069');
  // Coins, streak, hearts, right.
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(1000, 32, 13, 0, Math.PI * 2); ctx.fill();
  text(ctx, '$', 1000, 33, 16, '#3b2a1e', 'bold', 'center');
  text(ctx, String(state.coins), 1022, 32, 22, '#ffffff');
  drawFlame(ctx, 1115, 32, 13, state.streak > 0);
  text(ctx, `x${state.streak}`, 1134, 32, 20, state.streak > 0 ? '#ff9f1c' : '#cbb9a6');
  for (let i = 0; i < MAX_HEARTS; i += 1) drawHeart(ctx, 1200 + i * 26, 32, 10, i < state.hearts);
}

function drawOrderBoard(ctx, state) {
  const z = ZONES.board;
  ctx.fillStyle = '#234434';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, 'ORDER BOARD', z.x + z.w / 2, z.y + 20, 16, '#ffd23f', 'bold', 'center');
  ctx.strokeStyle = 'rgba(255,210,63,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(z.x + 14, z.y + 38); ctx.lineTo(z.x + z.w - 14, z.y + 38); ctx.stroke();
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet —', z.x + z.w / 2, z.y + 90, 14, '#f5e6d3', 'bold', 'center');
    text(ctx, 'the lunch crowd is coming.', z.x + z.w / 2, z.y + 112, 14, '#f5e6d3', 'bold', 'center');
  }
  state.orders.forEach((order, i) => {
    const recipe = RECIPE_BY_ID[order.recipeId];
    const y = z.y + 52 + i * 106;
    const cardH = 96;
    ctx.fillStyle = '#f5efe2';
    rr(ctx, z.x + 10, y, z.w - 20, cardH, 8); ctx.fill();
    ctx.fillStyle = recipe.color;
    rr(ctx, z.x + 10, y, 6, cardH, 3); ctx.fill();
    text(ctx, `#${order.id}  ${recipe.name}`, z.x + 26, y + 16, 15, '#2b2118');
    text(ctx, recipe.blurb, z.x + 26, y + 36, 11, '#6b5d4f', 'normal');
    recipe.needs.forEach((need, k) => {
      const ix = z.x + 40 + k * 44;
      const done = state.plate.includes(need);
      drawIngredient(ctx, need, ix, y + 62, 15);
      if (done) {
        ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ix - 8, y + 62); ctx.lineTo(ix - 2, y + 68); ctx.lineTo(ix + 9, y + 55); ctx.stroke();
      }
    });
    const frac = Math.max(0, order.patience / order.patienceMax);
    const pColor = frac > 0.5 ? '#7fb069' : frac > 0.25 ? '#ff9f1c' : '#ff6b5e';
    drawProgressBar(ctx, z.x + 168, y + 56, 92, 10, frac, pColor, 'rgba(0,0,0,0.15)');
    text(ctx, `${Math.ceil(order.patience)}s`, z.x + 214, y + 78, 12, '#2b2118', 'bold', 'center');
    text(ctx, `$${order.coins}`, z.x + z.w - 22, y + 16, 15, '#b97e1e', 'bold', 'right');
  });
}

function drawMenu(ctx, state) {
  const z = ZONES.menu;
  ctx.fillStyle = '#f5efe2';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#d9c7a7'; ctx.lineWidth = 2; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, "TONIGHT'S MENU — 8 RECIPES", z.x + z.w / 2, z.y + 20, 13, '#8a6d4b', 'bold', 'center');
  RECIPES.forEach((recipe, i) => {
    const y = z.y + 42 + i * 23;
    ctx.fillStyle = recipe.color;
    ctx.beginPath(); ctx.arc(z.x + 22, y, 6, 0, Math.PI * 2); ctx.fill();
    text(ctx, recipe.name, z.x + 36, y, 13, '#2b2118');
    recipe.needs.forEach((need, k) => drawIngredient(ctx, need, z.x + 196 + k * 26, y, 9));
  });
  text(ctx, 'Chop = board · Cook = stove · Cheese is ready', z.x + z.w / 2, z.y + z.h - 14, 11, '#8a6d4b', 'normal', 'center');
}

function drawChopBoard(ctx, state, now) {
  const z = ZONES.chop;
  ctx.fillStyle = '#e8d5b5';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, 'CHOPPING BOARD', z.x + 18, z.y + 22, 14, '#8a6d4b', 'bold');
  text(ctx, 'press C with a choppable in hand', z.x + 18, z.y + 44, 12, '#6b5d4f', 'normal');
  const boardX = z.x + z.w / 2;
  const boardY = z.y + 74;
  ctx.fillStyle = '#b98d4f';
  rr(ctx, boardX - 210, boardY - 26, 420, 52, 10); ctx.fill();
  ctx.fillStyle = '#d9b078';
  rr(ctx, boardX - 200, boardY - 20, 400, 40, 8); ctx.fill();
  if (state.chop) {
    const ing = INGREDIENT_BY_ID[state.chop.id];
    const done = state.chop.t >= CHOP_SECONDS;
    drawIngredient(ctx, state.chop.id, boardX - 120, boardY, 24);
    if (!done) {
      // Knife ticks: a little blade that swings while chopping.
      const swing = Math.sin(now * 10) * 0.5;
      ctx.save(); ctx.translate(boardX - 40, boardY - 10); ctx.rotate(swing);
      ctx.fillStyle = '#cfd6dd'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -8); ctx.lineTo(46, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b2a1e'; rr(ctx, -26, -5, 28, 10, 4); ctx.fill(); ctx.restore();
      drawProgressBar(ctx, boardX + 20, boardY - 8, 150, 14, state.chop.t / CHOP_SECONDS, '#7fb069');
      text(ctx, 'CHOPPING…', boardX + 95, boardY + 16, 12, '#2b2118', 'bold', 'center');
    } else {
      drawProgressBar(ctx, boardX + 20, boardY - 8, 150, 14, 1, '#2f9e44');
      text(ctx, `${ing.name} chopped — click to take`, boardX + 95, boardY + 16, 12, '#2f9e44', 'bold', 'center');
    }
  } else {
    text(ctx, 'empty — bring tomato, lettuce, carrot,', boardX + 40, boardY - 6, 13, '#8a6d4b', 'normal', 'center');
    text(ctx, 'mushroom, pepper or berry', boardX + 40, boardY + 14, 13, '#8a6d4b', 'normal', 'center');
  }
}

function drawStove(ctx, state, now) {
  const z = ZONES.stove;
  ctx.fillStyle = '#4a4a52';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#2e2e33'; ctx.lineWidth = 2; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, 'STOVE — 2 BURNERS', z.x + 18, z.y + 22, 14, '#ffd23f', 'bold');
  text(ctx, 'press V with a cookable in hand · take it off before it burns', z.x + 18, z.y + 42, 12, '#cfd6dd', 'normal');
  for (let i = 0; i < 2; i += 1) {
    const b = burnerRect(i);
    ctx.fillStyle = '#2e2e33';
    ctx.beginPath(); ctx.ellipse(b.x + b.w / 2 - 60, b.y + b.h / 2, 62, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a5a63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(b.x + b.w / 2 - 60, b.y + b.h / 2, 62, 30, 0, 0, Math.PI * 2); ctx.stroke();
    const slot = state.burners[i];
    if (slot) {
      const ing = INGREDIENT_BY_ID[slot.id];
      const cooking = slot.t < COOK_SECONDS;
      const done = !cooking && !slot.burnt;
      if (cooking) {
        const flick = 0.75 + Math.sin(now * 12 + i * 2) * 0.25;
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + 40 * flick)}, 30, ${0.55 * flick})`;
        ctx.beginPath(); ctx.ellipse(b.x + b.w / 2 - 60, b.y + b.h / 2 + 6, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
      }
      drawIngredient(ctx, slot.id, b.x + b.w / 2 - 60, b.y + b.h / 2 - 6, 22);
      if (slot.burnt) {
        ctx.fillStyle = 'rgba(20,20,20,0.75)';
        ctx.beginPath(); ctx.arc(b.x + b.w / 2 - 60, b.y + b.h / 2 - 6, 22, 0, Math.PI * 2); ctx.fill();
        text(ctx, 'BURNT!', b.x + b.w / 2 + 30, b.y + 22, 15, '#ff6b5e', 'bold', 'center');
        text(ctx, 'click to bin it', b.x + b.w / 2 + 30, b.y + 44, 11, '#ff9d94', 'normal', 'center');
      } else if (cooking) {
        drawProgressBar(ctx, b.x + 40, b.y + 14, 200, 12, slot.t / COOK_SECONDS, '#ff9f1c');
        text(ctx, `COOKING ${ing.name}…`, b.x + 140, b.y + 40, 12, '#ffffff', 'bold', 'center');
        text(ctx, `${Math.max(0, COOK_SECONDS - slot.t).toFixed(1)}s`, b.x + 140, b.y + 60, 12, '#ffd23f', 'bold', 'center');
      } else {
        drawProgressBar(ctx, b.x + 40, b.y + 14, 200, 12, 1 - (slot.t - COOK_SECONDS) / (BURN_SECONDS - COOK_SECONDS), '#2f9e44');
        text(ctx, `${ing.name} ready — click to take`, b.x + 140, b.y + 40, 12, '#7ddb8a', 'bold', 'center');
        text(ctx, `burns in ${Math.max(0, BURN_SECONDS - slot.t).toFixed(1)}s`, b.x + 140, b.y + 60, 12, '#ff9f1c', 'bold', 'center');
      }
    } else {
      text(ctx, `Burner ${i + 1} — empty`, b.x + b.w / 2, b.y + b.h / 2, 13, '#8f8f98', 'bold', 'center');
    }
  }
}

function drawPlateAndServe(ctx, state, now) {
  const zp = ZONES.plate;
  ctx.fillStyle = '#f5efe2';
  rr(ctx, zp.x, zp.y, zp.w, zp.h, 12); ctx.fill();
  ctx.strokeStyle = '#d9c7a7'; ctx.lineWidth = 2; rr(ctx, zp.x, zp.y, zp.w, zp.h, 12); ctx.stroke();
  text(ctx, 'PLATING COUNTER', zp.x + 18, zp.y + 22, 14, '#8a6d4b', 'bold');
  text(ctx, 'press X to add what is in hand', zp.x + 18, zp.y + 44, 12, '#6b5d4f', 'normal');
  // The plate itself.
  const px = zp.x + 130;
  const py = zp.y + 120;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(px, py, 92, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9b896'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(px, py, 92, 62, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#e3d5b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(px, py, 66, 44, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < PLATE_SLOTS; i += 1) {
    const sx = px - 52 + i * 52;
    if (state.plate[i]) {
      drawIngredient(ctx, state.plate[i], sx, py - 4, 20);
    } else {
      ctx.strokeStyle = '#d9c7a7'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(sx, py - 4, 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  const match = state.plate.length === PLATE_SLOTS ? plateMatchText(state) : null;
  if (match) {
    text(ctx, match, zp.x + zp.w - 18, zp.y + 110, 13, '#2f9e44', 'bold', 'right');
  } else if (state.plate.length > 0) {
    text(ctx, `${state.plate.length}/3 on the plate`, zp.x + zp.w - 18, zp.y + 110, 13, '#8a6d4b', 'bold', 'right');
  }
  text(ctx, 'click a plate item to take it back', zp.x + zp.w - 18, zp.y + 172, 11, '#8a6d4b', 'normal', 'right');

  // Serve window.
  const zs = ZONES.serve;
  const ready = state.plate.length === PLATE_SLOTS && match !== null;
  const glow = ready && Math.floor(now * 2) % 2 === 0;
  ctx.fillStyle = ready ? (glow ? '#ffe08a' : '#ffd23f') : '#e8dcc8';
  rr(ctx, zs.x, zs.y, zs.w, zs.h, 12); ctx.fill();
  ctx.strokeStyle = ready ? '#b97e1e' : '#c9b896'; ctx.lineWidth = 3; rr(ctx, zs.x, zs.y, zs.w, zs.h, 12); ctx.stroke();
  text(ctx, 'SERVE WINDOW', zs.x + zs.w / 2, zs.y + 24, 15, '#8a6d4b', 'bold', 'center');
  // Bell.
  ctx.fillStyle = '#b97e1e';
  ctx.beginPath(); ctx.arc(zs.x + zs.w / 2, zs.y + 78, 26, Math.PI, 0); ctx.closePath(); ctx.fill();
  rr(ctx, zs.x + zs.w / 2 - 32, zs.y + 78, 64, 8, 4); ctx.fill();
  ctx.beginPath(); ctx.arc(zs.x + zs.w / 2, zs.y + 96, 6, 0, Math.PI * 2); ctx.fill();
  if (ready) {
    text(ctx, 'READY TO SERVE!', zs.x + zs.w / 2, zs.y + 128, 16, '#2f9e44', 'bold', 'center');
    text(ctx, 'press SPACE or click', zs.x + zs.w / 2, zs.y + 152, 12, '#2b2118', 'normal', 'center');
  } else if (state.plate.length === PLATE_SLOTS) {
    text(ctx, 'No order wants this dish', zs.x + zs.w / 2, zs.y + 128, 13, '#a63d40', 'bold', 'center');
    text(ctx, 'swap an item or clear it', zs.x + zs.w / 2, zs.y + 152, 12, '#2b2118', 'normal', 'center');
  } else {
    text(ctx, 'Finish a plate first', zs.x + zs.w / 2, zs.y + 128, 13, '#8a6d4b', 'bold', 'center');
    text(ctx, `${state.plate.length}/3 items plated`, zs.x + zs.w / 2, zs.y + 152, 12, '#2b2118', 'normal', 'center');
  }
}

function plateMatchText(state) {
  const sorted = state.plate.slice().sort().join(',');
  for (const order of state.orders) {
    const needs = RECIPE_BY_ID[order.recipeId].needs.slice().sort().join(',');
    if (needs === sorted) return `Matches order #${order.id}!`;
  }
  return null;
}

function drawBins(ctx, state) {
  const z = ZONES.bins;
  ctx.fillStyle = '#e8d5b5';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, 'INGREDIENTS — ON THE COUNTER', z.x + z.w / 2, z.y + 20, 13, '#8a6d4b', 'bold', 'center');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  INGREDIENTS.forEach((ing, i) => {
    const b = binRect(i);
    const held = state.hand && state.hand.id === ing.id;
    ctx.fillStyle = held ? '#ffe08a' : '#fffaf0';
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.strokeStyle = held ? '#b97e1e' : '#d9c7a7'; ctx.lineWidth = held ? 3 : 1.5;
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.stroke();
    drawIngredient(ctx, ing.id, b.x + b.w / 2, b.y + 40, 24);
    text(ctx, ing.name, b.x + b.w / 2, b.y + 76, 12, '#2b2118', 'bold', 'center');
    const tag = ing.prep === PREP_CHOP ? 'CHOP' : ing.prep === PREP_COOK ? 'COOK' : 'READY';
    const tagColor = ing.prep === PREP_CHOP ? '#2f9e44' : ing.prep === PREP_COOK ? '#e8590c' : '#8a6d4b';
    text(ctx, tag, b.x + b.w / 2, b.y + 94, 10, tagColor, 'bold', 'center');
    ctx.fillStyle = '#8a6d4b';
    ctx.beginPath(); ctx.arc(b.x + 12, b.y + 12, 9, 0, Math.PI * 2); ctx.fill();
    text(ctx, keys[i], b.x + 12, b.y + 13, 10, '#fffaf0', 'bold', 'center');
  });
}

function drawTrash(ctx, state) {
  const z = ZONES.trash;
  ctx.fillStyle = '#6b5d4f';
  rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.fill();
  ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 2; rr(ctx, z.x, z.y, z.w, z.h, 12); ctx.stroke();
  text(ctx, 'TRASH — press T with something in hand', z.x + z.w / 2, z.y + 24, 13, '#f5e6d3', 'bold', 'center');
  text(ctx, `Burnt dishes binned so far: ${state.burnt} · trashed: ${state.trashed}`, z.x + z.w / 2, z.y + 52, 12, '#d9c7a7', 'normal', 'center');
}

function drawHandChip(ctx, state, mouse) {
  if (!state.hand) return;
  const ing = INGREDIENT_BY_ID[state.hand.id];
  const label = state.hand.prepared ? `${ing.name} — ready` : `${ing.name} — raw`;
  const x = mouse.x + 18;
  const y = mouse.y + 14;
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  rr(ctx, x, y, 150, 30, 8); ctx.fill();
  drawIngredient(ctx, state.hand.id, x + 18, y + 15, 11);
  text(ctx, label, x + 34, y + 16, 12, '#ffffff');
}

function drawKitchen(ctx, state, now, mouse) {
  // Wall + floor.
  ctx.fillStyle = '#f7ead7';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#e3cfa8';
  ctx.fillRect(0, 580, FIELD.width, 140);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < FIELD.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 580); ctx.lineTo(x - 30, 720); ctx.stroke();
  }
  drawHud(ctx, state, now);
  drawOrderBoard(ctx, state);
  drawMenu(ctx, state);
  drawChopBoard(ctx, state, now);
  drawStove(ctx, state, now);
  drawPlateAndServe(ctx, state, now);
  drawBins(ctx, state);
  drawTrash(ctx, state);
  // Serve banner + flash.
  if (state.lastServe && state.screen === SCREEN_PLAY) {
    text(ctx, `Served: ${state.lastServe.recipe}  +${state.lastServe.coins} coins`, 640, 600, 18, '#2f9e44', 'bold', 'center');
  }
  if (state.flash && state.elapsed < state.flash.until) {
    text(ctx, state.flash.text, 640, 628, 20, state.flash.color, 'bold', 'center');
  }
  if (state.paused) {
    ctx.fillStyle = 'rgba(43,33,24,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 640, 330, 48, '#ffd23f', 'bold', 'center');
    text(ctx, 'press P to keep cooking', 640, 380, 18, '#ffffff', 'normal', 'center');
  }
  drawHandChip(ctx, state, mouse);
  // Hint bar.
  text(ctx, 'Click a bin to take it · C chop · V stove · X plate · SPACE serve · T trash · P pause · M mute', 640, 706, 12, '#8a6d4b', 'normal', 'center');
}

function drawTitle(ctx, state, now) {
  drawKitchen(ctx, state, now, { x: -100, y: -100 });
  ctx.fillStyle = 'rgba(43,33,24,0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const pulse = 0.85 + Math.sin(now * 2.5) * 0.15;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(640, 128, 44, 0, Math.PI * 2); ctx.fill();
  drawFlame(ctx, 640, 128, 30 * pulse, true);
  text(ctx, 'EMBER & BASIL', 640, 210, 56, '#ffd23f', 'bold', 'center');
  text(ctx, 'HEARTHSIDE RUSH — a timed order cooking game', 640, 252, 20, '#ffffff', 'bold', 'center');
  text(ctx, '8 recipes · 12 ingredients · 3 stations · 180-second shift · 3 hearts', 640, 282, 15, '#f5e6d3', 'normal', 'center');
  const steps = [
    '1  TAKE an ingredient from the counter (click or keys 1–=)',
    '2  PREP it — chop on the board (C), cook on the stove (V)',
    '3  PLATE it (X), then SERVE it at the window (SPACE) before the order walks out',
  ];
  steps.forEach((s, i) => text(ctx, s, 640, 330 + i * 28, 16, '#ffffff', 'bold', 'center'));
  text(ctx, 'Burnt food goes in the trash. A full streak pays extra. Three missed orders ends the shift.', 640, 430, 14, '#ffd9a0', 'normal', 'center');
  const b = ZONES.startButton;
  ctx.fillStyle = '#ff9f1c';
  rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.strokeStyle = '#b97e1e'; ctx.lineWidth = 3; rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.stroke();
  text(ctx, 'START SHIFT  —  press SPACE', b.x + b.w / 2, b.y + b.h / 2, 22, '#3b2a1e', 'bold', 'center');
  if (state.best > 0) text(ctx, `Best shift so far: ${state.best} coins`, 640, 650, 15, '#f5e6d3', 'normal', 'center');
}

function drawOver(ctx, state) {
  ctx.fillStyle = '#f7ead7';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  drawHud(ctx, state, 0);
  const reason = state.hearts <= 0 ? 'Three orders walked out — the shift is over.' : 'The shift is over — the kitchen closes.';
  text(ctx, 'SHIFT COMPLETE', 640, 130, 44, '#3b2a1e', 'bold', 'center');
  text(ctx, reason, 640, 170, 17, '#6b5d4f', 'normal', 'center');
  // Grade badge.
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(640, 250, 52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b97e1e'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(640, 250, 52, 0, Math.PI * 2); ctx.stroke();
  text(ctx, state.grade || '?', 640, 252, 56, '#3b2a1e', 'bold', 'center');
  text(ctx, 'GRADE', 640, 316, 13, '#8a6d4b', 'bold', 'center');
  const stats = [
    [`${state.coins}`, 'coins earned'],
    [`${state.served}`, 'dishes served'],
    [`${state.missed}`, 'orders missed'],
    [`${state.bestStreak}`, 'best streak'],
    [`${state.burnt}`, 'dishes burnt'],
  ];
  stats.forEach(([value, label], i) => {
    const x = 240 + i * 200;
    text(ctx, value, x, 380, 34, '#2b2118', 'bold', 'center');
    text(ctx, label, x, 412, 13, '#8a6d4b', 'normal', 'center');
  });
  if (state.lastServe) text(ctx, `Last dish out: ${state.lastServe.recipe}`, 640, 460, 15, '#6b5d4f', 'normal', 'center');
  const b = ZONES.restartButton;
  ctx.fillStyle = '#ff9f1c';
  rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.strokeStyle = '#b97e1e'; ctx.lineWidth = 3; rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.stroke();
  text(ctx, 'COOK AGAIN  —  press R', b.x + b.w / 2, b.y + b.h / 2, 22, '#3b2a1e', 'bold', 'center');
  text(ctx, 'Your best shift is saved on this machine.', 640, 650, 14, '#8a6d4b', 'normal', 'center');
}

export function render(ctx, state, now, mouse) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, now);
  else if (state.screen === SCREEN_OVER) drawOver(ctx, state);
  else drawKitchen(ctx, state, now, mouse);
}
