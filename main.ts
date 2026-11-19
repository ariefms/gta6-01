// Solara Bay — make.fun entrypoint (program/v1).
// Hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with
// buildDossier from ./vendor/makefun-game.ts. Node 22, standard library
// only, fully deterministic — two runs write identical bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function mirrorDir(from: string, to: string): void {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true, dereference: false });
}

function handIn(): void {
  mkdirSync(outDir, { recursive: true });
  const gameDir = join(outDir, 'game');
  const shotsDir = join(outDir, 'screenshots');
  rmSync(gameDir, { recursive: true, force: true });
  rmSync(shotsDir, { recursive: true, force: true });
  mirrorDir(join(here, 'game'), gameDir);
  mirrorDir(join(here, 'screenshots'), shotsDir);
  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

handIn();
