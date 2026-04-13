/**
 * create-mikata — scaffold a new Mikata app.
 *
 * Usage:
 *   pnpm create mikata my-app [--router] [--ui] [--icons] ...
 *   pnpm create mikata my-app --template spa
 */

import mri from 'mri';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';
import { runPrompts } from './prompts.js';
import { FEATURES } from './types.js';
import type { Feature, PackageManager, ResolvedConfig } from './types.js';
import { isValidProjectName, PROJECT_NAME_HINT } from './validate.js';

const PRESETS: Record<string, Feature[]> = {
  minimal: [],
  spa: ['router', 'testing'],
  full: ['router', 'ui', 'icons', 'form', 'i18n', 'store', 'testing', 'eslint'],
};

const HELP = `
${pc.bold(pc.cyan('create-mikata'))} — scaffold a new Mikata app

${pc.bold('Usage')}
  ${pc.dim('$')} pnpm create mikata ${pc.italic('<name>')} [options]
  ${pc.dim('$')} npm  create mikata@latest ${pc.italic('<name>')} [options]

${pc.bold('Options')}
  --template <preset>     minimal | spa | full
  --router                add @mikata/router
  --ui                    add @mikata/ui + ThemeProvider
  --icons                 add @mikata/icons
  --form                  add form example
  --i18n                  add @mikata/i18n with en/fr
  --store                 add createQuery example
  --testing               add Vitest + @mikata/testing
  --eslint                add ESLint + @mikata/eslint-plugin
  --tailwind              add Tailwind CSS
  --pm <pnpm|npm|yarn|bun>  package manager for the install hint
  --yes, -y               skip prompts (use defaults)
  --help, -h              show this
`;

async function main(): Promise<void> {
  const args = mri(process.argv.slice(2), {
    alias: { h: 'help', y: 'yes', t: 'template' },
    boolean: [
      'help',
      'yes',
      ...FEATURES,
      ...FEATURES.map((f) => `no-${f}`),
    ],
    string: ['template', 'pm'],
  });

  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const cwdName = args._[0] as string | undefined;
  const preset = args.template as string | undefined;

  if (cwdName !== undefined && !isValidProjectName(cwdName)) {
    process.stderr.write(pc.red(`✗ Invalid project name "${cwdName}". ${PROJECT_NAME_HINT}\n`));
    process.exitCode = 1;
    return;
  }

  // Explicit --feature / --no-feature flags beat the preset; everything else
  // falls through to the preset's defaults, then to the interactive prompt.
  const flagFeatures = new Set<Feature>();
  const flagExclusions = new Set<Feature>();
  for (const f of FEATURES) {
    if (args[f] === true) flagFeatures.add(f);
    if (args[`no-${f}`] === true) flagExclusions.add(f);
  }

  if (preset && !(preset in PRESETS)) {
    process.stderr.write(
      pc.red(`Unknown template "${preset}". Choose one of: ${Object.keys(PRESETS).join(', ')}.\n`)
    );
    process.exitCode = 1;
    return;
  }

  const hasAnyFeatureFlag = flagFeatures.size > 0 || flagExclusions.size > 0;

  let config: ResolvedConfig;

  // Fast path: --yes with enough flags given → skip prompts entirely.
  if (args.yes && cwdName && (preset || hasAnyFeatureFlag)) {
    const base = preset ? new Set<Feature>(PRESETS[preset]) : new Set<Feature>();
    for (const f of flagFeatures) base.add(f);
    for (const f of flagExclusions) base.delete(f);
    config = {
      name: cwdName,
      features: [...base],
      pm: (args.pm as PackageManager) ?? 'pnpm',
    };
  } else {
    config = await runPrompts({
      name: cwdName,
      presetFeatures: preset ? PRESETS[preset] : undefined,
      includeFeatures: [...flagFeatures],
      excludeFeatures: [...flagExclusions],
      pm: args.pm as PackageManager | undefined,
    });
  }

  const result = await scaffold(config);
  if (!result.ok) {
    process.stderr.write(pc.red(`✗ ${result.error}\n`));
    process.exitCode = 1;
    return;
  }

  printSuccess(config, result.targetDir);
}

function printSuccess(cfg: ResolvedConfig, targetDir: string): void {
  const pmRun = cfg.pm === 'npm' ? 'npm run' : cfg.pm;
  const pmInstall = cfg.pm === 'yarn' ? 'yarn' : `${cfg.pm} install`;
  process.stdout.write(
    `\n${pc.green(pc.bold('✓'))} Scaffolded ${pc.bold(cfg.name)} at ${pc.dim(targetDir)}\n\n` +
      `${pc.bold('Next steps')}\n` +
      `  ${pc.cyan(`cd ${cfg.name}`)}\n` +
      `  ${pc.cyan(pmInstall)}\n` +
      `  ${pc.cyan(`${pmRun} dev`)}\n\n` +
      (cfg.features.includes('testing')
        ? `  ${pc.dim(`${pmRun} test    # run the sample test`)}\n`
        : '') +
      `${pc.dim('Docs:')} ${pc.underline('https://github.com/blowerydev/mikata')}\n`
  );
}

main().catch((err) => {
  process.stderr.write(pc.red(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`));
  process.exitCode = 1;
});
