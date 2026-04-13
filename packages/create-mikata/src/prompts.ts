import prompts from 'prompts';
import pc from 'picocolors';
import type { Feature, PackageManager, ResolvedConfig } from './types.js';
import { isValidProjectName, PROJECT_NAME_HINT } from './validate.js';

interface PromptInput {
  name?: string;
  presetFeatures?: Feature[];
  includeFeatures: Feature[];
  excludeFeatures: Feature[];
  pm?: PackageManager;
}

const FEATURE_CHOICES: { value: Feature; title: string; description: string }[] = [
  { value: 'router',   title: 'Router',        description: 'File-like routes, nested layouts, typed search params' },
  { value: 'ui',       title: 'UI components', description: '@mikata/ui - 80+ components + ThemeProvider'           },
  { value: 'icons',    title: 'Icons',         description: '@mikata/icons - tree-shakable SVG set'                  },
  { value: 'form',     title: 'Form',          description: '@mikata/form - createForm with validation'              },
  { value: 'i18n',     title: 'i18n',          description: '@mikata/i18n - ICU, runtime loading, reactive locale'   },
  { value: 'store',    title: 'Store',         description: 'createQuery + createMutation example'                   },
  { value: 'testing',  title: 'Testing',       description: 'Vitest + jsdom + @mikata/testing'                        },
  { value: 'eslint',   title: 'ESLint',        description: 'ESLint with @mikata/eslint-plugin rules'                 },
  { value: 'tailwind', title: 'Tailwind CSS',  description: 'Tailwind + PostCSS preconfigured'                        },
];

export async function runPrompts(input: PromptInput): Promise<ResolvedConfig> {
  const answers = await prompts(
    [
      {
        type: input.name ? null : 'text',
        name: 'name',
        message: 'Project name',
        initial: 'mikata-app',
        validate: (v: string) => (isValidProjectName(v) ? true : PROJECT_NAME_HINT),
      },
      {
        type: 'multiselect',
        name: 'features',
        message: 'Which features do you want?',
        instructions: pc.dim(`\n  ${pc.cyan('space')} to toggle · ${pc.cyan('a')} to toggle all · ${pc.cyan('enter')} to confirm`),
        choices: FEATURE_CHOICES.map((c) => ({
          value: c.value,
          title: c.title,
          description: c.description,
          selected: selectedByDefault(c.value, input),
        })),
        hint: ' ',
      },
      {
        type: input.pm ? null : 'select',
        name: 'pm',
        message: 'Package manager',
        choices: [
          { value: 'pnpm', title: 'pnpm' },
          { value: 'npm', title: 'npm' },
          { value: 'yarn', title: 'yarn' },
          { value: 'bun', title: 'bun' },
        ],
        initial: 0,
      },
    ],
    {
      onCancel: () => {
        process.stdout.write(pc.yellow('\nCancelled.\n'));
        process.exit(0);
      },
    }
  );

  return {
    name: input.name ?? (answers.name as string),
    features: answers.features as Feature[],
    pm: input.pm ?? (answers.pm as PackageManager),
  };
}

function selectedByDefault(f: Feature, input: PromptInput): boolean {
  if (input.excludeFeatures.includes(f)) return false;
  if (input.includeFeatures.includes(f)) return true;
  if (input.presetFeatures?.includes(f)) return true;
  return false;
}
