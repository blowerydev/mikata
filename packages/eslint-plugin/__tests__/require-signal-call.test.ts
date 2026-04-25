import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { requireSignalCall } from '../src/rules/require-signal-call';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('require-signal-call', () => {
  it('runs', () => {
    ruleTester.run('require-signal-call', requireSignalCall, {
      valid: [
        // Called correctly in JSX
        {
          code: `
            const [count, setCount] = signal(0);
            const x = <div>{count()}</div>;
          `,
        },
        // Computed called correctly
        {
          code: `
            const doubled = computed(() => 1);
            const x = <div>{doubled()}</div>;
          `,
        },
        // Called in template literal
        {
          code: `
            const [count, setCount] = signal(0);
            const s = \`Count: \${count()}\`;
          `,
        },
        // Unrelated identifier in JSX
        {
          code: `
            const name = 'Alice';
            const x = <div>{name}</div>;
          `,
        },
        // Signal passed to ref attribute - legal (it's a function slot)
        {
          code: `
            const ref = signal(null);
            const x = <input ref={ref} />;
          `,
        },
        // Signal passed as event handler - legal (onClick expects a fn)
        {
          code: `
            const handler = computed(() => () => {});
            const x = <button onClick={handler} />;
          `,
        },
        // Setter is not a signal getter - don't flag setCount on its own
        {
          code: `
            const [count, setCount] = signal(0);
            const x = <button onClick={() => setCount(1)}>{count()}</button>;
          `,
        },
        // Shadowed parameter is not the outer signal getter.
        {
          code: `
            const [count, setCount] = signal(0);
            function Row(count) {
              return <div>{count}</div>;
            }
          `,
        },
      ],
      invalid: [
        // Bare signal in JSX children
        {
          code: `
            const [count, setCount] = signal(0);
            const x = <div>{count}</div>;
          `,
          errors: [{ messageId: 'uncalled' }],
        },
        // Bare computed in JSX children
        {
          code: `
            const doubled = computed(() => 1);
            const x = <div>{doubled}</div>;
          `,
          errors: [{ messageId: 'uncalled' }],
        },
        // Bare signal in template literal
        {
          code: `
            const [count, setCount] = signal(0);
            const s = \`Count: \${count}\`;
          `,
          errors: [{ messageId: 'uncalled' }],
        },
        // Bare signal in non-handler JSX attribute
        {
          code: `
            const [value, setValue] = signal('');
            const x = <input value={value} />;
          `,
          errors: [{ messageId: 'uncalled' }],
        },
        // createDerivedSignal result
        {
          code: `
            const label = createDerivedSignal(() => props.label, '');
            const x = <span>{label}</span>;
          `,
          errors: [{ messageId: 'uncalled' }],
        },
      ],
    });
  });
});
