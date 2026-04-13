/**
 * Scaffold engine — copy base template, overlay selected features, apply
 * conditional blocks and package.json merges, write to disk.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import type { Feature, ResolvedConfig } from './types.js';
import { generateAppTsx, generateMainTsx } from './generate-entry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(__dirname, '..', 'templates');

export interface ScaffoldResult {
  ok: boolean;
  error?: string;
  targetDir: string;
}

interface FeatureManifest {
  deps?: Record<string, string>;
  devDeps?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function scaffold(cfg: ResolvedConfig): Promise<ScaffoldResult> {
  const targetDir = resolve(process.cwd(), cfg.name);

  if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
    const files = readdirSync(targetDir);
    if (files.length > 0) {
      return {
        ok: false,
        targetDir,
        error: `Target directory "${cfg.name}" exists and is not empty.`,
      };
    }
  }

  mkdirSync(targetDir, { recursive: true });

  // Collect files from base + each feature overlay (later overlays win).
  const files = new Map<string, string>();
  copyTreeInto(join(TEMPLATES, 'base'), files);
  for (const feat of cfg.features) {
    const featDir = join(TEMPLATES, 'features', feat);
    if (existsSync(featDir)) copyTreeInto(featDir, files);
  }

  // Strip unselected conditional blocks and write to disk.
  const selected = new Set<Feature>(cfg.features);
  for (const [relPath, content] of files) {
    // feature.json files only carry package.json patches — not project output.
    if (relPath === 'feature.json') continue;
    // _package.json is the merge source — the final package.json is written below.
    if (relPath === '_package.json') continue;

    const processed = applyConditionalBlocks(content, selected);
    const outPath = join(targetDir, renameDotfiles(relPath));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, processed);
    process.stdout.write(pc.dim(`  ${pc.green('+')} ${renameDotfiles(relPath)}\n`));
  }

  // Generate the entrypoint + root component based on selected features.
  mkdirSync(join(targetDir, 'src'), { recursive: true });
  writeFileSync(join(targetDir, 'src', 'main.tsx'), generateMainTsx(selected));
  process.stdout.write(pc.dim(`  ${pc.green('+')} src/main.tsx\n`));
  writeFileSync(join(targetDir, 'src', 'App.tsx'), generateAppTsx(selected));
  process.stdout.write(pc.dim(`  ${pc.green('+')} src/App.tsx\n`));

  // Merge package.json from base + each feature manifest.
  const pkg = JSON.parse(readFileSync(join(TEMPLATES, 'base', '_package.json'), 'utf8'));
  pkg.name = cfg.name;
  for (const feat of cfg.features) {
    const manifestPath = join(TEMPLATES, 'features', feat, 'feature.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as FeatureManifest;
    if (manifest.deps) Object.assign((pkg.dependencies ??= {}), manifest.deps);
    if (manifest.devDeps) Object.assign((pkg.devDependencies ??= {}), manifest.devDeps);
    if (manifest.scripts) Object.assign((pkg.scripts ??= {}), manifest.scripts);
  }
  pkg.dependencies = sortKeys(pkg.dependencies);
  pkg.devDependencies = sortKeys(pkg.devDependencies);
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  return { ok: true, targetDir };
}

function copyTreeInto(sourceDir: string, acc: Map<string, string>, prefix = ''): void {
  if (!existsSync(sourceDir)) return;
  for (const entry of readdirSync(sourceDir)) {
    const abs = join(sourceDir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(abs).isDirectory()) {
      copyTreeInto(abs, acc, rel);
    } else {
      acc.set(rel, readFileSync(abs, 'utf8'));
    }
  }
}

/**
 * Filenames beginning with `_` (e.g. `_gitignore`, `_npmrc`, `_package.json`)
 * get mapped to dotfiles on write. npm strips dotfiles from published packages,
 * so we store the source with `_` and restore the dot at scaffold time.
 */
function renameDotfiles(path: string): string {
  return path.replace(/(^|\/)_(?=[a-zA-Z])/g, '$1.');
}

/**
 * Remove `/* @if:<feat> *\/ ... /* @endif *\/` blocks whose feature isn't
 * selected. A leading `!` negates (`@if:!ui` keeps the block when ui is NOT
 * selected). Also trims single-line `// @line-if:<feat>` tags.
 */
function applyConditionalBlocks(content: string, selected: Set<Feature>): string {
  const blockRe = /\/\*\s*@if:(!?)([a-z]+)\s*\*\/([\s\S]*?)\/\*\s*@endif\s*\*\//g;
  let out = content.replace(blockRe, (_, neg: string, feat: string, body: string) => {
    const isSelected = selected.has(feat as Feature);
    const keep = neg === '!' ? !isSelected : isSelected;
    return keep ? body : '';
  });

  out = out
    .split('\n')
    .filter((line) => {
      const m = line.match(/\/\/\s*@line-if:(!?)([a-z]+)\s*$/);
      if (!m) return true;
      const isSelected = selected.has(m[2] as Feature);
      return m[1] === '!' ? !isSelected : isSelected;
    })
    .map((line) => line.replace(/\s*\/\/\s*@line-if:!?[a-z]+\s*$/, ''))
    .join('\n');

  return out.replace(/\n{3,}/g, '\n\n');
}

function sortKeys<T extends Record<string, string> | undefined>(obj: T): T {
  if (!obj) return obj;
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) as T;
}
