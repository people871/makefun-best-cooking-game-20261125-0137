# EMBER & BASIL — 8 recipes, 12 ingredients, 3 stations, 180-second shift, combo streaks — timed order cooking game, offline

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/people871/makefun-best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/people871/makefun-best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

**EMBER & BASIL — Hearthside Rush** is an original timed order cooking game built for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). Orders land on the board with a patience timer; you take ingredients from the counter, chop them on the board or cook them on the stove, build the dish on the plate and serve it at the window before the customer walks out. One 180-second shift, 3 hearts, and a streak that pays extra the longer you keep it alive.

## What is in the game

- **8 recipes, 12 ingredients** — Tomato Pasta, Garden Salad, Mushroom Soup, Grilled Fish, Beef Steak, Veggie Noodles, Cheese Omelette, Berry Tart; every recipe needs exactly 3 ingredients, and the menu on screen lists them all.
- **3 stations with real timing** — chopping board (2.5 s a chop), stove with 2 burners (4 s a cook, burnt if left 8 s — burnt food goes in the trash), plating counter with 3 slots.
- **Orders that push you to plan a route** — up to 3 orders at once, each with its own patience bar and coin reward; spawn faster and patience shorter as the shift goes on; the full 8-recipe menu opens after the first minute.
- **Score, streaks and hearts** — serve fast for a time bonus, keep a streak for +2 coins a serve, lose a heart (and the streak) for every order that walks out; 3 missed orders ends the shift early.
- **Complete game** — title screen with the rules, live kitchen (order board, ingredients on the counter, dish mid-assembly, shift timer, plate ready to serve), pause, restart, results screen with a grade (S/A/B/C), dishes served, best streak and coins, best shift saved on the machine.
- **Synthesised sound only** — chop, sizzle, serve bell, miss and win/loss phrases from WebAudio oscillators. No audio files. M to mute.
- **Deterministic** — `?seed=N` fixes every order and shuffle; `?selftest=1` runs the scripted rule checks; `?shot=start|play|serve|end` stages the four screenshot scenes through the real action functions.

## How to run it (offline, no build step)

```sh
node serve.ts
# open http://localhost:8080 — click a bin to take an ingredient
# C chop · V stove · B take cooked food · X plate · SPACE serve · T trash
# P pause · R restart · M mute · keys 1-9,0,-,= take bins 1-12
# ?selftest=1 runs the scripted checks
```

## File map

- `game/index.html` — the page: one canvas, one module script, no network.
- `game/src/config.js` — ingredients, recipes, timings, difficulty ramp, grades.
- `game/src/random.js` — seeded RNG (mulberry32) for repeatable shifts.
- `game/src/state.js` — the kitchen's state and every rule: orders, stations, plating, serving, the clock.
- `game/src/render.js` — everything drawn: HUD, order board, menu, board, stove, plate, serve window, bins, trash, title and results screens.
- `game/src/input.js` — mouse zones and keyboard, routed to the state actions.
- `game/src/audio.js` — synthesised WebAudio phrases, no files.
- `game/src/shots.js` — the four screenshot scenes, played forward with the real actions.
- `game/src/selftest.js` — scripted checks against the real rules (`?selftest=1`).
- `game/src/main.js` — the loop: URL params, input wiring, tick, draw.
- `main.ts` — the hand-in program: copies game/ + screenshots/ to /output, writes dossier.json.
- `serve.ts` — tiny static server for local play.
- `vendor/makefun-game.ts` — the kit's library, copied unchanged.
- `screenshots/` — 4 real renders of the game's own code (1280×720 JPEG).
