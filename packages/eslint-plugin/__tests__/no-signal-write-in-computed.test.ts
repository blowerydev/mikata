import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noSignalWriteInComputed } from '../src/rules/no-signal-write-in-computed';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-signal-write-in-computed', () => {
  it('runs', () => {
    ruleTester.run('no-signal-write-in-computed', noSignalWriteInComputed, {
      valid: [
        // Setter in an effect is fine
        {
          code: `
            const [count, setCount] = signal(0);
            effect(() => setCount(1));
          `,
        },
        // Pure computed - no writes
        {
          code: `
            const [count, setCount] = signal(0);
            const doubled = computed(() => count() * 2);
          `,
        },
        // Setter inside a deferred callback (setTimeout) - runs after
        // computed returns, not flagged.
        {
          code: `
            const [count, setCount] = signal(0);
            computed(() => {
              setTimeout(() => setCount(1), 0);
              return count();
            });
          `,
        },
        // Unknown function that happens to start with "set" - not tracked,
        // so not flagged.
        {
          code: `
            computed(() => {
              setMyThing(1);
              return 0;
            });
          `,
        },
        // Shadowed parameter is not the outer signal setter.
        {
          code: `
            const [count, setCount] = signal(0);
            computed((setCount) => {
              setCount(1);
              return count();
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            const [count, setCount] = signal(0);
            computed(() => {
              setCount(1);
              return count();
            });
          `,
          errors: [{ messageId: 'write' }],
        },
        {
          code: `
            const [a, setA] = signal(0);
            const [b, setB] = signal(0);
            computed(() => {
              setA(1);
              setB(2);
              return a() + b();
            });
          `,
          errors: [{ messageId: 'write' }, { messageId: 'write' }],
        },
        // Setter called inside a for-loop still in computed scope
        {
          code: `
            const [n, setN] = signal(0);
            computed(() => {
              for (let i = 0; i < 3; i++) setN(i);
              return n();
            });
          `,
          errors: [{ messageId: 'write' }],
        },
      ],
    });
  });
});
