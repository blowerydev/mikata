import type { MikataBaseProps, MikataSize, ClassNamesInput } from '../../types';

export type MultiSelectParts =
  | 'root'
  | 'label'
  | 'required'
  | 'description'
  | 'error'
  | 'control'
  | 'input'
  | 'pill'
  | 'pillRemove'
  | 'dropdown'
  | 'option'
  | 'loading';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type MultiSelectFetcher = (
  query: string,
  signal: AbortSignal,
) => Promise<(string | MultiSelectOption)[]>;

export interface MultiSelectProps extends MikataBaseProps {
  /**
   * Static options list, or an async fetcher for remote typeahead. When a
   * fetcher is supplied, input is debounced (300 ms default) and prior
   * in-flight requests are aborted.
   */
  data: (string | MultiSelectOption)[] | MultiSelectFetcher;
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Max number of selections */
  maxValues?: number;
  /** Whether to allow searching (filter dropdown by typing) */
  searchable?: boolean;
  /** Whether the picker can be cleared at once */
  clearable?: boolean;
  /** Debounce window for async fetchers, ms. Default: 300. */
  debounceMs?: number;
  /** Text shown while an async fetch is in flight. */
  loadingLabel?: string;
  onChange?: (value: string[]) => void;
  classNames?: ClassNamesInput<MultiSelectParts>;
}
