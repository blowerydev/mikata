import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noAsyncComponent } from '../src/rules/no-async-component';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-async-component', () => {
  it('runs', () => {
    ruleTester.run('no-async-component', noAsyncComponent, {
      valid: [
        { code: `function App() { return null; }` },
        { code: `async function fetchData() { return await fetch('/'); }` },
        { code: `const App = () => null;` },
      ],
      invalid: [
        {
          code: `async function App() { return null; }`,
          errors: [{ messageId: 'async' }],
        },
        {
          code: `const App = async () => null;`,
          errors: [{ messageId: 'async' }],
        },
      ],
    });
  });
});
