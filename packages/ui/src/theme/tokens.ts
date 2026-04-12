import type { MikataTheme } from './types';

/**
 * Default light theme token values.
 * Keys map to CSS variable names: `color-primary-6` → `--mkt-color-primary-6`
 */
export const defaultTheme: MikataTheme = {
  // ─── Primary (Blue) ─────────────────────────────
  'color-primary-0': '#e7f5ff',
  'color-primary-1': '#d0ebff',
  'color-primary-2': '#a5d8ff',
  'color-primary-3': '#74c0fc',
  'color-primary-4': '#4dabf7',
  'color-primary-5': '#339af0',
  'color-primary-6': '#228be6',
  'color-primary-7': '#1c7ed6',
  'color-primary-8': '#1971c2',
  'color-primary-9': '#1864ab',

  // ─── Gray ────────────────────────────────────────
  'color-gray-0': '#f8f9fa',
  'color-gray-1': '#f1f3f5',
  'color-gray-2': '#e9ecef',
  'color-gray-3': '#dee2e6',
  'color-gray-4': '#ced4da',
  'color-gray-5': '#adb5bd',
  'color-gray-6': '#868e96',
  'color-gray-7': '#495057',
  'color-gray-8': '#343a40',
  'color-gray-9': '#212529',

  // ─── Red ─────────────────────────────────────────
  'color-red-0': '#fff5f5',
  'color-red-1': '#ffe3e3',
  'color-red-2': '#ffc9c9',
  'color-red-3': '#ffa8a8',
  'color-red-4': '#ff8787',
  'color-red-5': '#ff6b6b',
  'color-red-6': '#fa5252',
  'color-red-7': '#f03e3e',
  'color-red-8': '#e03131',
  'color-red-9': '#c92a2a',

  // ─── Green ───────────────────────────────────────
  'color-green-0': '#ebfbee',
  'color-green-1': '#d3f9d8',
  'color-green-2': '#b2f2bb',
  'color-green-3': '#8ce99a',
  'color-green-4': '#69db7c',
  'color-green-5': '#51cf66',
  'color-green-6': '#40c057',
  'color-green-7': '#37b24d',
  'color-green-8': '#2f9e44',
  'color-green-9': '#2b8a3e',

  // ─── Yellow ──────────────────────────────────────
  'color-yellow-0': '#fff9db',
  'color-yellow-1': '#fff3bf',
  'color-yellow-2': '#ffec99',
  'color-yellow-3': '#ffe066',
  'color-yellow-4': '#ffd43b',
  'color-yellow-5': '#fcc419',
  'color-yellow-6': '#fab005',
  'color-yellow-7': '#f59f00',
  'color-yellow-8': '#f08c00',
  'color-yellow-9': '#e67700',

  // ─── Blue ────────────────────────────────────────
  'color-blue-0': '#e7f5ff',
  'color-blue-1': '#d0ebff',
  'color-blue-2': '#a5d8ff',
  'color-blue-3': '#74c0fc',
  'color-blue-4': '#4dabf7',
  'color-blue-5': '#339af0',
  'color-blue-6': '#228be6',
  'color-blue-7': '#1c7ed6',
  'color-blue-8': '#1971c2',
  'color-blue-9': '#1864ab',

  // ─── Cyan ────────────────────────────────────────
  'color-cyan-0': '#e3fafc',
  'color-cyan-1': '#c5f6fa',
  'color-cyan-2': '#99e9f2',
  'color-cyan-3': '#66d9e8',
  'color-cyan-4': '#3bc9db',
  'color-cyan-5': '#22b8cf',
  'color-cyan-6': '#15aabf',
  'color-cyan-7': '#1098ad',
  'color-cyan-8': '#0c8599',
  'color-cyan-9': '#0b7285',

  // ─── Teal ────────────────────────────────────────
  'color-teal-0': '#e6fcf5',
  'color-teal-1': '#c3fae8',
  'color-teal-2': '#96f2d7',
  'color-teal-3': '#63e6be',
  'color-teal-4': '#38d9a9',
  'color-teal-5': '#20c997',
  'color-teal-6': '#12b886',
  'color-teal-7': '#0ca678',
  'color-teal-8': '#099268',
  'color-teal-9': '#087f5b',

  // ─── Violet ──────────────────────────────────────
  'color-violet-0': '#f3f0ff',
  'color-violet-1': '#e5dbff',
  'color-violet-2': '#d0bfff',
  'color-violet-3': '#b197fc',
  'color-violet-4': '#9775fa',
  'color-violet-5': '#845ef7',
  'color-violet-6': '#7950f2',
  'color-violet-7': '#7048e8',
  'color-violet-8': '#6741d9',
  'color-violet-9': '#5f3dc4',

  // ─── Pink ────────────────────────────────────────
  'color-pink-0': '#fff0f6',
  'color-pink-1': '#ffdeeb',
  'color-pink-2': '#fcc2d7',
  'color-pink-3': '#faa2c1',
  'color-pink-4': '#f783ac',
  'color-pink-5': '#f06595',
  'color-pink-6': '#e64980',
  'color-pink-7': '#d6336c',
  'color-pink-8': '#c2255c',
  'color-pink-9': '#a61e4d',

  // ─── Orange ──────────────────────────────────────
  'color-orange-0': '#fff4e6',
  'color-orange-1': '#ffe8cc',
  'color-orange-2': '#ffd8a8',
  'color-orange-3': '#ffc078',
  'color-orange-4': '#ffa94d',
  'color-orange-5': '#ff922b',
  'color-orange-6': '#fd7e14',
  'color-orange-7': '#f76707',
  'color-orange-8': '#e8590c',
  'color-orange-9': '#d9480f',

  // ─── Semantic colors ─────────────────────────────
  'color-text': '#212529',
  'color-text-dimmed': '#868e96',
  'color-text-inverse': '#ffffff',
  'color-bg': '#ffffff',
  'color-bg-subtle': '#f8f9fa',
  'color-border': '#dee2e6',
  'color-border-strong': '#ced4da',
  'color-focus-ring': '#228be6',
  'color-error': '#fa5252',
  'color-success': '#40c057',
  'color-warning': '#fab005',
  'color-info': '#228be6',

  // ─── Spacing ─────────────────────────────────────
  'space-0': '0',
  'space-1': '0.25rem',
  'space-2': '0.5rem',
  'space-3': '0.75rem',
  'space-4': '1rem',
  'space-5': '1.5rem',
  'space-6': '2rem',
  'space-7': '2.5rem',
  'space-8': '3rem',

  // ─── Typography ──────────────────────────────────
  'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  'font-family-mono': "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
  'font-size-xs': '0.75rem',
  'font-size-sm': '0.875rem',
  'font-size-md': '1rem',
  'font-size-lg': '1.125rem',
  'font-size-xl': '1.25rem',
  'font-weight-normal': '400',
  'font-weight-medium': '500',
  'font-weight-semibold': '600',
  'font-weight-bold': '700',
  'line-height-xs': '1.4',
  'line-height-sm': '1.45',
  'line-height-md': '1.55',
  'line-height-lg': '1.6',

  // ─── Sizing (component heights) ──────────────────
  'size-xs': '1.75rem',
  'size-sm': '2rem',
  'size-md': '2.25rem',
  'size-lg': '2.625rem',
  'size-xl': '3rem',

  // ─── Border radius ──────────────────────────────
  'radius-xs': '0.125rem',
  'radius-sm': '0.25rem',
  'radius-md': '0.5rem',
  'radius-lg': '1rem',
  'radius-xl': '2rem',
  'radius-full': '9999px',

  // ─── Shadows ─────────────────────────────────────
  'shadow-xs': '0 1px 2px rgba(0,0,0,0.05)',
  'shadow-sm': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  'shadow-md': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
  'shadow-lg': '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.06)',
  'shadow-xl': '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',

  // ─── Transitions ─────────────────────────────────
  'transition-duration': '150ms',
  'transition-timing': 'cubic-bezier(0.4, 0, 0.2, 1)',

  // ─── Z-index ─────────────────────────────────────
  'z-dropdown': '100',
  'z-sticky': '200',
  'z-overlay': '300',
  'z-modal': '400',
  'z-popover': '500',
  'z-tooltip': '600',
  'z-toast': '700',
};
