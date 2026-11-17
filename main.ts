// Solara Bay — make.fun entrypoint (program/v1).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// ./vendor/makefun-game.ts. Node 22, standard library only, deterministic.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function copyTree(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) return;
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, dereference: false });
}

function main(): void {
  mkdirSync(outputDir, { recursive: true });
  const gameOut = join(outputDir, 'game');
  const shotsOut = join(outputDir, 'screenshots');
  rmSync(gameOut, { recursive: true, force: true });
  rmSync(shotsOut, { recursive: true, force: true });
  copyTree(join(repoRoot, 'game'), gameOut);
  copyTree(join(repoRoot, 'screenshots'), shotsOut);
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

main();
