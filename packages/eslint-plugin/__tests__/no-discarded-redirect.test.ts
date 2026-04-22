import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noDiscardedRedirect } from '../src/rules/no-discarded-redirect';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-discarded-redirect', () => {
  it('runs', () => {
    ruleTester.run('no-discarded-redirect', noDiscardedRedirect, {
      valid: [
        {
          code: `
            import { redirect } from '@mikata/kit/action';
            export async function action() { return redirect('/'); }
          `,
        },
        {
          code: `
            import { redirect } from '@mikata/kit/action';
            export async function action() { throw redirect('/'); }
          `,
        },
        {
          code: `
            import { redirect } from '@mikata/kit/action';
            export async function action() { const r = redirect('/'); return r; }
          `,
        },
        // Renamed import still covered by return.
        {
          code: `
            import { redirect as goTo } from '@mikata/kit/action';
            export async function action() { return goTo('/'); }
          `,
        },
        // User-defined redirect - not ours to police.
        {
          code: `
            function redirect(url) { return url; }
            function thing() { redirect('/'); }
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { redirect } from '@mikata/kit/action';
            export async function action() {
              redirect('/login');
            }
          `,
          errors: [{ messageId: 'discarded' }],
        },
        {
          code: `
            import { redirect } from '@mikata/kit';
            export async function action({ cookies }) {
              if (!cookies.get('sid')) redirect('/login');
              return new Response('ok');
            }
          `,
          errors: [{ messageId: 'discarded' }],
        },
        // Rename is tracked.
        {
          code: `
            import { redirect as goTo } from '@mikata/kit/action';
            export async function action() {
              goTo('/');
            }
          `,
          errors: [{ messageId: 'discarded' }],
        },
      ],
    });
  });
});
