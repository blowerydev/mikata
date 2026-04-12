import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { rulesOfSetup } from '../src/rules/rules-of-setup';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('rules-of-setup', () => {
  it('runs', () => {
    ruleTester.run('rules-of-setup', rulesOfSetup, {
      valid: [
        // Inside a PascalCase component
        { code: `function Counter() { onCleanup(() => {}); return null; }` },
        // Arrow component
        { code: `const Counter = () => { provide(Ctx, v); return null; };` },
        // Custom hook
        { code: `function useTheme() { return inject(Ctx); }` },
        // createScope wrapper
        { code: `createScope(() => { onCleanup(() => {}); });` },
        // render wrapper
        { code: `render(() => { provide(Ctx, v); return null; }, el);` },
        // Helper called inside a component — we allow unnamed/camelCase helpers
        // only when they bubble up to a component, so this nested form is valid.
        { code: `function App() { function setup() { onCleanup(() => {}); } setup(); }` },
        // Not a scope-required name — should be ignored entirely
        { code: `effect(() => { console.log('fine'); });` },
      ],
      invalid: [
        // Inside effect()
        {
          code: `function App() { effect(() => { onCleanup(() => {}); }); }`,
          errors: [{ messageId: 'insideEffect' }],
        },
        // Inside setTimeout
        {
          code: `function App() { setTimeout(() => { provide(Ctx, v); }, 0); }`,
          errors: [{ messageId: 'insideEffect' }],
        },
        // Inside Promise.then
        {
          code: `function App() { fetch('/').then(() => { onMount(() => {}); }); }`,
          errors: [{ messageId: 'insideEffect' }],
        },
        // Inside async function
        {
          code: `async function App() { await x; onCleanup(() => {}); }`,
          errors: [{ messageId: 'asyncComponent' }],
        },
        // At module top level
        {
          code: `onCleanup(() => {});`,
          errors: [{ messageId: 'atTopLevel' }],
        },
        // Inside a plain camelCase helper that is itself at top level
        {
          code: `function setup() { onCleanup(() => {}); } setup();`,
          errors: [{ messageId: 'insideHelper' }],
        },
      ],
    });
  });
});
