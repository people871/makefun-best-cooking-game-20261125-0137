// EMBER & BASIL — Hearthside Rush, entered in make.fun's best cooking game
// bounty. The game is plain static files under game/ (index.html plus ES
// modules, no library, no network request), and this Node 22 program is the
// hand-in: it copies game/ and screenshots/ next to this file into the
// output directory and writes dossier.json there with the vendored make.fun
// library. Standard library only; nothing is installed before it runs.
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, mirrored here so a bad entry is refused locally before
// it is ever uploaded: at most 4 screenshots of 256 KiB, game/ at most 993
// files and 48 MiB in all, no path under game/ over 1000 bytes. The dossier
// text itself is capped at 160 KiB by buildDossier.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(repoDir, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
  const shotsDir = join(outputDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  const repoShots = join(repoDir, 'screenshots');
  if (existsSync(repoShots)) cpSync(repoShots, shotsDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'dossier.json'),
    buildDossier(outputDir, DOSSIER_LIMITS),
  );
}

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(repoDir, outputDir);
