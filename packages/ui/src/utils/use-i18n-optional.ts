import { createContext, provide, inject } from '@mikata/runtime';

export interface UILabels {
  close: string;
  loading: string;
  noResults: string;
  previous: string;
  next: string;
  required: string;
  optional: string;
  showPassword: string;
  hidePassword: string;
}

const defaultLabels: UILabels = {
  close: 'Close',
  loading: 'Loading...',
  noResults: 'No results',
  previous: 'Previous',
  next: 'Next',
  required: 'Required',
  optional: 'Optional',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
};

const UILabelsContext = createContext<UILabels>(defaultLabels);

/**
 * Provide custom UI labels for component text.
 * Call in your root component to translate or customize internal text.
 */
export function provideUILabels(labels: Partial<UILabels>): void {
  provide(UILabelsContext, { ...defaultLabels, ...labels });
}

/**
 * Get UI labels. Returns English defaults unless a UILabelsProvider is present.
 */
export function useUILabels(): UILabels {
  return inject(UILabelsContext);
}
