import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { requireEffectCleanup } from '../src/rules/require-effect-cleanup';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-effect-cleanup', () => {
  it('runs', () => {
    ruleTester.run('require-effect-cleanup', requireEffectCleanup, {
      valid: [
        // addEventListener with a returned cleanup
        {
          code: `
            effect(() => {
              const handler = () => {};
              window.addEventListener('resize', handler);
              return () => window.removeEventListener('resize', handler);
            });
          `,
        },
        // onCleanup() inside the body counts as teardown
        {
          code: `
            effect(() => {
              const handler = () => {};
              window.addEventListener('resize', handler);
              onCleanup(() => window.removeEventListener('resize', handler));
            });
          `,
        },
        // setInterval with onCleanup
        {
          code: `
            onMount(() => {
              const id = setInterval(tick, 1000);
              onCleanup(() => clearInterval(id));
            });
          `,
        },
        // Arrow with expression body - no subscription possible
        { code: `effect(() => x());` },
        // Effect with no subscriptions
        {
          code: `
            effect(() => {
              const v = signal();
              console.log(v);
            });
          `,
        },
        // Nested function contains the subscription - inner callback's problem
        {
          code: `
            effect(() => {
              whenReady(() => {
                window.addEventListener('resize', () => {});
              });
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            effect(() => {
              window.addEventListener('resize', handler);
            });
          `,
          errors: [{ messageId: 'missingCleanup' }],
        },
        {
          code: `
            renderEffect(() => {
              socket.on('message', handleMessage);
            });
          `,
          errors: [{ messageId: 'missingCleanup' }],
        },
        {
          code: `
            onMount(() => {
              setInterval(tick, 1000);
            });
          `,
          errors: [{ messageId: 'missingCleanup' }],
        },
        {
          code: `
            effect(() => {
              setTimeout(fire, 100);
            });
          `,
          errors: [{ messageId: 'missingCleanup' }],
        },
        // Multiple subscriptions, no cleanup - both flagged
        {
          code: `
            effect(() => {
              window.addEventListener('resize', a);
              window.addEventListener('scroll', b);
            });
          `,
          errors: [
            { messageId: 'missingCleanup' },
            { messageId: 'missingCleanup' },
          ],
        },
      ],
    });
  });
});
