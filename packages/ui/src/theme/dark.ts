import type { MikataTheme } from './types';

/**
 * Dark theme overrides. Only overrides semantic colors and
 * shade mappings — palette base colors remain the same.
 */
export const darkTheme: MikataTheme = {
  'color-text': '#c1c2c5',
  'color-text-dimmed': '#909296',
  'color-text-inverse': '#1a1b1e',
  'color-bg': '#1a1b1e',
  'color-bg-subtle': '#25262b',
  'color-border': '#373a40',
  'color-border-strong': '#495057',
  'color-focus-ring': '#339af0',

  'shadow-xs': '0 1px 2px rgba(0,0,0,0.3)',
  'shadow-sm': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  'shadow-md': '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
  'shadow-lg': '0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.3)',
  'shadow-xl': '0 20px 25px rgba(0,0,0,0.4), 0 10px 10px rgba(0,0,0,0.3)',
};
