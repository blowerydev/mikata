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
        // Returning a named cleanup helper counts as teardown.
        {
          code: `
            effect(() => {
              function cleanup() {
                window.removeEventListener('resize', handler);
              }
              window.addEventListener('resize', handler);
              return cleanup;
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
        // Component body with addEventListener + onCleanup
        {
          code: `
            function MyComponent() {
              window.addEventListener('resize', handler);
              onCleanup(() => window.removeEventListener('resize', handler));
              return null;
            }
          `,
        },
        // Component body with no subscriptions
        {
          code: `
            function MyComponent() {
              const [count] = signal(0);
              return null;
            }
          `,
        },
        // Lowercase helper is NOT treated as a component (no leak rule)
        {
          code: `
            function helper() {
              window.addEventListener('resize', handler);
            }
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
        // Component body with addEventListener and no onCleanup - leak.
        // The return (JSX tree) does NOT count as cleanup.
        {
          code: `
            function MyComponent() {
              window.addEventListener('resize', handler);
              return null;
            }
          `,
          errors: [{ messageId: 'missingComponentCleanup' }],
        },
        // Component body with setInterval and no onCleanup
        {
          code: `
            function Counter() {
              setInterval(tick, 1000);
              return null;
            }
          `,
          errors: [{ messageId: 'missingComponentCleanup' }],
        },
        // Non-function returns do not count as teardown.
        {
          code: `
            effect(() => {
              window.addEventListener('resize', handler);
              return true;
            });
          `,
          errors: [{ messageId: 'missingCleanup' }],
        },
        // Anonymous default-export route components are still components.
        {
          code: `
            export default () => {
              window.addEventListener('resize', handler);
              return null;
            };
          `,
          errors: [{ messageId: 'missingComponentCleanup' }],
        },
      ],
    });
  });
});
