import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noStaleSignalReadInEffect } from '../src/rules/no-stale-signal-read-in-effect';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-stale-signal-read-in-effect', () => {
  it('runs', () => {
    ruleTester.run('no-stale-signal-read-in-effect', noStaleSignalReadInEffect, {
      valid: [
        // Reading the signal directly inside the effect — tracked.
        {
          code: `
            const [schemaLoading] = signal(true);
            effect(() => {
              if (schemaLoading()) return;
              doWork();
            });
          `,
        },
        // Capture declared INSIDE the effect — fine (not reactive, but not "stale" either).
        {
          code: `
            const [schemaLoading] = signal(true);
            effect(() => {
              const loading = schemaLoading();
              if (loading) return;
              doWork();
            });
          `,
        },
        // Non-signal capture — don't flag.
        {
          code: `
            const x = getUserName();
            effect(() => {
              console.log(x);
            });
          `,
        },
        // Capture used outside any reactive wrapper — fine.
        {
          code: `
            const [schemaLoading] = signal(true);
            const loading = schemaLoading();
            console.log(loading);
          `,
        },
        // Signal getter passed as argument, not captured into a local.
        {
          code: `
            const [count] = signal(0);
            effect(() => {
              console.log(count());
            });
          `,
        },
        // Property access on captured value — MemberExpression should not
        // falsely flag the property name. (Property name here is not a signal.)
        {
          code: `
            const [user] = signal({ name: 'alice' });
            effect(() => {
              console.log(user().name);
            });
          `,
        },
        // Shadowed parameter is not the stale outer capture.
        {
          code: `
            const [schemaLoading] = signal(true);
            const loading = schemaLoading();
            function run(loading) {
              effect(() => {
                console.log(loading);
              });
            }
          `,
        },
        // Callback-local names are not stale outer captures.
        {
          code: `
            const [schemaLoading] = signal(true);
            const loading = schemaLoading();
            effect((loading) => {
              console.log(loading);
            });
          `,
        },
      ],
      invalid: [
        // Classic stale capture.
        {
          code: `
            const [schemaLoading] = signal(true);
            const loading = schemaLoading();
            effect(() => {
              if (loading) return;
              doWork();
            });
          `,
          errors: [{ messageId: 'stale' }],
        },
        // Stale inside renderEffect.
        {
          code: `
            const count = computed(() => 1);
            const snapshot = count();
            renderEffect(() => {
              el.textContent = snapshot;
            });
          `,
          errors: [{ messageId: 'stale' }],
        },
        // Stale inside computed.
        {
          code: `
            const [a] = signal(1);
            const snap = a();
            const doubled = computed(() => snap * 2);
          `,
          errors: [{ messageId: 'stale' }],
        },
        // Multiple references — each flagged.
        {
          code: `
            const [loading] = signal(true);
            const l = loading();
            effect(() => {
              if (l) return;
              doSomething(l);
            });
          `,
          errors: [{ messageId: 'stale' }, { messageId: 'stale' }],
        },
      ],
    });
  });
});
