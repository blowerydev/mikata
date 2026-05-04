import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { preferSelectorInEach } from '../src/rules/prefer-selector-in-each';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('prefer-selector-in-each', () => {
  it('runs', () => {
    ruleTester.run('prefer-selector-in-each', preferSelectorInEach, {
      valid: [
        {
          code: `
            const [selectedId] = signal(null);
            const isSelected = createSelector(selectedId);
            const rows = each(items, (row) => (
              <tr aria-selected={isSelected(row.id)}>{row.label}</tr>
            ));
          `,
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, (row) => (
              <button onClick={() => selectedId() === row.id}>{row.label}</button>
            ));
          `,
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, (row) => {
              row.id === 1;
              return <tr>{row.label}</tr>;
            });
          `,
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = items.map((row) => (
              <tr aria-selected={selectedId() === row.id}>{row.label}</tr>
            ));
          `,
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, (row) => {
              renderEffect(() => {
                tr.toggleAttribute('aria-selected', selectedId() === otherId);
              });
              return tr;
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, (row) => (
              <tr aria-selected={selectedId() === row.id}>{row.label}</tr>
            ));
          `,
          errors: [{ messageId: 'preferSelector' }],
        },
        {
          code: `
            const selectedId = computed(() => active());
            const rows = runtime.each(items, (row) => (
              <tr class={{ active: row.id === selectedId() }}>{row.label}</tr>
            ));
          `,
          errors: [{ messageId: 'preferSelector' }],
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, (row) => {
              renderEffect(() => {
                tr.toggleAttribute('aria-selected', selectedId() === row.id);
              });
              return tr;
            });
          `,
          errors: [{ messageId: 'preferSelector' }],
        },
        {
          code: `
            const [selectedId] = signal(null);
            const rows = each(items, function rowRenderer(row) {
              effect(() => {
                tr.hidden = selectedId() != row.id;
              });
              return tr;
            });
          `,
          errors: [{ messageId: 'preferSelector' }],
        },
      ],
    });
  });
});
