import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noApiRouteDefaultExport } from '../src/rules/no-api-route-default-export';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-api-route-default-export', () => {
  it('runs', () => {
    ruleTester.run('no-api-route-default-export', noApiRouteDefaultExport, {
      valid: [
        // Pure API route: verbs only.
        {
          code: `
            export async function GET() { return new Response('ok'); }
            export async function POST() { return new Response('ok'); }
          `,
        },
        // Pure page route: default only.
        {
          code: `
            export default function Page() { return null; }
          `,
        },
        // Non-verb named export alongside default is fine.
        {
          code: `
            export default function Page() { return null; }
            export async function load() { return {}; }
          `,
        },
        // `const GET = ...` with no default is still a valid API route.
        {
          code: `
            export const GET = async () => new Response('ok');
          `,
        },
      ],
      invalid: [
        {
          code: `
            export default function Page() { return null; }
            export async function GET() { return new Response('ok'); }
          `,
          errors: [{ messageId: 'mixed', data: { verb: 'GET' } }],
        },
        {
          code: `
            export default function Page() { return null; }
            export const POST = async () => new Response('ok');
          `,
          errors: [{ messageId: 'mixed', data: { verb: 'POST' } }],
        },
        // Rename via `export { foo as GET }` is still a verb.
        {
          code: `
            export default function Page() { return null; }
            async function handler() { return new Response('ok'); }
            export { handler as GET };
          `,
          errors: [{ messageId: 'mixed', data: { verb: 'GET' } }],
        },
        // Multiple verbs → multiple reports.
        {
          code: `
            export default function Page() { return null; }
            export async function GET() { return new Response('ok'); }
            export async function POST() { return new Response('ok'); }
          `,
          errors: [
            { messageId: 'mixed', data: { verb: 'GET' } },
            { messageId: 'mixed', data: { verb: 'POST' } },
          ],
        },
      ],
    });
  });
});
