import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noDestructuredProps } from '../src/rules/no-destructured-props';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-destructured-props', () => {
  it('runs', () => {
    ruleTester.run('no-destructured-props', noDestructuredProps, {
      valid: [
        { code: `function Button(props) { return props.label; }` },
        { code: `const Button = (props) => props.label;` },
        // Non-component function is unaffected
        { code: `function helper({ a, b }) { return a + b; }` },
        // No params
        { code: `function Blank() { return null; }` },
      ],
      invalid: [
        {
          code: `function Button({ label }) { return label; }`,
          errors: [{ messageId: 'destructured' }],
        },
        {
          code: `const Button = ({ label, onClick }) => null;`,
          errors: [{ messageId: 'destructured' }],
        },
        {
          code: `function Button({ label } = {}) { return label; }`,
          errors: [{ messageId: 'destructured' }],
        },
      ],
    });
  });
});
