export const FEATURES = [
  'router',
  'ui',
  'icons',
  'form',
  'i18n',
  'store',
  'persist',
  'testing',
  'eslint',
  'tailwind',
] as const;

export type Feature = (typeof FEATURES)[number];

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface ResolvedConfig {
  name: string;
  features: Feature[];
  pm: PackageManager;
}
