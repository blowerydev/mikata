/**
 * Scaffold engine — copy base template, overlay selected features, apply
 * conditional blocks and package.json merges, write to disk.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import type { Feature, ResolvedConfig } from './types.js';
import { FEATURES } from './types.js';
import {
  generateAppTest,
  generateAppTsx,
  generateMainTsx,
  generateRouterAbout,
  generateRouterHome,
} from './generate-entry.js';
import { isValidProjectName } from './validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(__dirname, '..', 'templates');

// Names we silently ignore when deciding whether a target directory is "empty".
const IGNORABLE_ENTRIES = new Set(['.DS_Store', 'Thumbs.db', '.git']);

const FEATURE_SET = new Set<string>(FEATURES);

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
  if (!isValidProjectName(cfg.name)) {
    return {
      ok: false,
      targetDir: '',
      error: `Invalid project name "${cfg.name}". Use lowercase letters, digits, and hyphens (must start with a letter or digit).`,
    };
  }

  const targetDir = resolve(process.cwd(), cfg.name);

  if (existsSync(targetDir)) {
    if (!statSync(targetDir).isDirectory()) {
      return { ok: false, targetDir, error: `"${cfg.name}" exists and is not a directory.` };
    }
    const files = readdirSync(targetDir).filter((e) => !IGNORABLE_ENTRIES.has(e));
    if (files.length > 0) {
      return {
        ok: false,
        targetDir,
        error: `Target directory "${cfg.name}" exists and is not empty.`,
      };
    }
  }

  const createdTarget = !existsSync(targetDir);
  mkdirSync(targetDir, { recursive: true });

  try {
    writeProject(cfg, targetDir);
    return { ok: true, targetDir };
  } catch (err) {
    if (createdTarget) {
      try {
        rmSync(targetDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
    return {
      ok: false,
      targetDir,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function writeProject(cfg: ResolvedConfig, targetDir: string): void {
  // Collect files from base + each feature overlay (later overlays win).
  const files = new Map<string, string>();
  copyTreeInto(join(TEMPLATES, 'base'), files);
  for (const feat of cfg.features) {
    const featDir = join(TEMPLATES, 'features', feat);
    if (existsSync(featDir)) copyTreeInto(featDir, files);
  }

  // Strip unselected conditional blocks and write to disk.
  const selected = new Set<Feature>(cfg.features);
  const unknownTags = new Set<string>();
  for (const [relPath, content] of files) {
    // feature.json files only carry package.json patches — not project output.
    if (relPath === 'feature.json') continue;
    // _package.json is the merge source — the final package.json is written below.
    if (relPath === '_package.json') continue;

    const processed = applyConditionalBlocks(content, selected, unknownTags);
    const outPath = join(targetDir, renameDotfiles(relPath));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, processed);
    process.stdout.write(pc.dim(`  ${pc.green('+')} ${renameDotfiles(relPath)}\n`));
  }

  if (unknownTags.size > 0) {
    process.stderr.write(
      pc.yellow(
        `  ! Unknown @if tags in templates: ${[...unknownTags].join(', ')} — blocks were stripped.\n`
      )
    );
  }

  // Generate the entrypoint + root component based on selected features.
  mkdirSync(join(targetDir, 'src'), { recursive: true });
  writeFileSync(join(targetDir, 'src', 'main.tsx'), generateMainTsx(selected));
  process.stdout.write(pc.dim(`  ${pc.green('+')} src/main.tsx\n`));
  writeFileSync(join(targetDir, 'src', 'App.tsx'), generateAppTsx(selected));
  process.stdout.write(pc.dim(`  ${pc.green('+')} src/App.tsx\n`));
  if (selected.has('testing')) {
    writeFileSync(join(targetDir, 'src', 'App.test.tsx'), generateAppTest(selected));
    process.stdout.write(pc.dim(`  ${pc.green('+')} src/App.test.tsx\n`));
  }
  if (selected.has('router')) {
    const pagesDir = join(targetDir, 'src', 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'Home.tsx'), generateRouterHome(selected));
    process.stdout.write(pc.dim(`  ${pc.green('+')} src/pages/Home.tsx\n`));
    writeFileSync(join(pagesDir, 'About.tsx'), generateRouterAbout());
    process.stdout.write(pc.dim(`  ${pc.green('+')} src/pages/About.tsx\n`));
  }

  // Merge package.json from base + each feature manifest.
  const pkg = JSON.parse(readFileSync(join(TEMPLATES, 'base', '_package.json'), 'utf8'));
  pkg.name = cfg.name;
  const depVersions = new Map<string, { version: string; source: string }>();
  for (const feat of cfg.features) {
    const manifestPath = join(TEMPLATES, 'features', feat, 'feature.json');
    if (!existsSync(manifestPath)) continue;
    let manifest: FeatureManifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as FeatureManifest;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse feature.json for "${feat}": ${reason}`);
    }
    mergeDeps(pkg, 'dependencies', manifest.deps, feat, depVersions);
    mergeDeps(pkg, 'devDependencies', manifest.devDeps, feat, depVersions);
    if (manifest.scripts) Object.assign((pkg.scripts ??= {}), manifest.scripts);
  }
  pkg.dependencies = sortKeys(pkg.dependencies);
  pkg.devDependencies = sortKeys(pkg.devDependencies);
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function mergeDeps(
  pkg: Record<string, Record<string, string> | undefined>,
  key: 'dependencies' | 'devDependencies',
  incoming: Record<string, string> | undefined,
  source: string,
  tracker: Map<string, { version: string; source: string }>
): void {
  if (!incoming) return;
  const target = (pkg[key] ??= {});
  for (const [name, version] of Object.entries(incoming)) {
    const prior = tracker.get(name);
    if (prior && prior.version !== version) {
      process.stderr.write(
        pc.yellow(
          `  ! Version conflict for ${name}: "${prior.version}" (${prior.source}) vs "${version}" (${source}). Using "${version}".\n`
        )
      );
    }
    target[name] = version;
    tracker.set(name, { version, source });
  }
}

function copyTreeInto(sourceDir: string, acc: Map<string, string>, prefix = ''): void {
  if (!existsSync(sourceDir)) return;
  for (const entry of readdirSync(sourceDir)) {
    if (IGNORABLE_ENTRIES.has(entry)) continue;
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
function applyConditionalBlocks(
  content: string,
  selected: Set<Feature>,
  unknownTags: Set<string>
): string {
  const blockRe = /\/\*\s*@if:(!?)([a-z]+)\s*\*\/([\s\S]*?)\/\*\s*@endif\s*\*\//g;
  let out = content.replace(blockRe, (_, neg: string, feat: string, body: string) => {
    if (!FEATURE_SET.has(feat)) {
      unknownTags.add(feat);
      return '';
    }
    const isSelected = selected.has(feat as Feature);
    const keep = neg === '!' ? !isSelected : isSelected;
    return keep ? body : '';
  });

  out = out
    .split('\n')
    .filter((line) => {
      const m = line.match(/\/\/\s*@line-if:(!?)([a-z]+)\s*$/);
      if (!m) return true;
      if (!FEATURE_SET.has(m[2])) {
        unknownTags.add(m[2]);
        return false;
      }
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
