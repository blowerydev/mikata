import { createContext, provide, inject } from '@mikata/runtime';

type ComponentDefaultsMap = Record<string, Record<string, unknown>>;

const EMPTY_DEFAULTS: ComponentDefaultsMap = {};
const ComponentDefaultsContext = createContext<ComponentDefaultsMap>(EMPTY_DEFAULTS);

/**
 * Install per-component default props. ThemeProvider wires this from
 * `theme.components` - callers should generally not use it directly.
 */
export function provideComponentDefaults(defaults: ComponentDefaultsMap | undefined): void {
  provide(ComponentDefaultsContext, defaults ?? EMPTY_DEFAULTS);
}

/**
 * Read the default props for `name` from the current ThemeProvider.
 * Returns an empty object when no defaults are configured.
 *
 * Usage:
 *   export function Button(userProps: ButtonProps = {}) {
 *     const defaults = useComponentDefaults<ButtonProps>('Button');
 *     const props = { ...defaults, ...userProps };
 *     ...
 *   }
 */
export function useComponentDefaults<P>(name: string): Partial<P> {
  const all = inject(ComponentDefaultsContext);
  return (all[name] ?? {}) as Partial<P>;
}
