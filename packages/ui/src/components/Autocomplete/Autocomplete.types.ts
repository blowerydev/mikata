import type { MikataBaseProps, MikataSize, ClassNamesInput } from '../../types';

export type AutocompleteParts =
  | 'root'
  | 'label'
  | 'required'
  | 'description'
  | 'error'
  | 'input'
  | 'dropdown'
  | 'option'
  | 'loading';

/**
 * Async fetcher. Return the suggestions for `query`. `signal` aborts when a
 * newer query supersedes this one - respect it to avoid wasted work.
 */
export type AutocompleteFetcher = (
  query: string,
  signal: AbortSignal,
) => Promise<string[]>;

export interface AutocompleteProps extends MikataBaseProps {
  /**
   * List of suggestions, or an async fetcher for remote typeahead. When a
   * fetcher is supplied, input is debounced (300 ms default) and prior
   * in-flight requests are aborted.
   */
  data: string[] | AutocompleteFetcher;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Max number of suggestions to show */
  limit?: number;
  /** Debounce window for async fetchers, ms. Default: 300. */
  debounceMs?: number;
  /** Text shown while an async fetch is in flight. Default: 'Loading…'. */
  loadingLabel?: string;
  /** Fired on every input change */
  onChange?: (value: string) => void;
  /** Fired when user picks a suggestion */
  onOptionSubmit?: (value: string) => void;
  classNames?: ClassNamesInput<AutocompleteParts>;
}
