import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noSignalAssignment } from '../src/rules/no-signal-assignment';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-signal-assignment', () => {
  it('runs', () => {
    ruleTester.run('no-signal-assignment', noSignalAssignment, {
      valid: [
        // Using the setter is correct
        {
          code: `
            const [count, setCount] = signal(0);
            setCount(5);
          `,
        },
        // Reading with a call is fine
        {
          code: `
            const [count, setCount] = signal(0);
            const x = count();
          `,
        },
        // Reassigning a non-signal is fine
        {
          code: `
            let count = 0;
            count = 5;
            count++;
          `,
        },
        // Reassigning the setter itself is not the concern here
        // (it's just a normal function reference).
        {
          code: `
            const [count, setCount] = signal(0);
            const save = setCount;
          `,
        },
      ],
      invalid: [
        // Destructured signal getter reassignment
        // (also a const error, but the rule still reports it for clarity)
        {
          code: `
            const [count, setCount] = signal(0);
            count = 5;
          `,
          errors: [{ messageId: 'assignment' }],
        },
        // let-bound signal getter reassignment — silent bug without this rule
        {
          code: `
            let status = computed(() => 'idle');
            status = 'ready';
          `,
          errors: [{ messageId: 'assignment' }],
        },
        // Compound assignment
        {
          code: `
            const [count, setCount] = signal(0);
            count += 1;
          `,
          errors: [{ messageId: 'assignment' }],
        },
        // ++
        {
          code: `
            const [count, setCount] = signal(0);
            count++;
          `,
          errors: [{ messageId: 'update' }],
        },
        // createDerivedSignal result
        {
          code: `
            const label = createDerivedSignal(() => props.label, '');
            label = 'x';
          `,
          errors: [{ messageId: 'assignment' }],
        },
      ],
    });
  });
});
