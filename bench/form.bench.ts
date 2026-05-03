import { bench, describe } from 'vitest';
import { createForm, getPath, setPath } from '@mikata/form';

let sink = 0;

const nestedValues = {
  user: {
    profile: {
      name: 'Ada',
      address: {
        city: 'London',
        postalCode: 'N1',
      },
    },
  },
  rows: Array.from({ length: 500 }, (_, id) => ({
    id,
    name: `Row ${id}`,
    meta: { active: id % 2 === 0 },
  })),
};

function makeForm() {
  return createForm({
    initialValues: nestedValues,
    validate: {
      user: {
        profile: {
          name: (value) => String(value ?? '').length > 0 ? null : 'Required',
          address: {
            city: (value) => String(value ?? '').length > 0 ? null : 'Required',
          },
        },
      },
      rows: (value) => Array.isArray(value) && value.length > 0 ? null : 'Rows required',
    },
  });
}

describe('@mikata/form', () => {
  bench('get nested paths 100k times', () => {
    let total = 0;
    for (let i = 0; i < 100_000; i++) {
      total += String(getPath(nestedValues, 'user.profile.address.city')).length;
      total += Number(getPath(nestedValues, `rows.${i % 500}.id`));
    }
    sink = total;
  });

  bench('set nested path 10k times', () => {
    let value = nestedValues;
    for (let i = 0; i < 10_000; i++) {
      value = setPath(value, `rows.${i % 500}.meta.active`, i % 2 === 0) as typeof nestedValues;
    }
    sink = Number(getPath(value, 'rows.0.id'));
  });

  bench('validate form with nested validator spec 1k times', () => {
    const form = makeForm();
    let errors = 0;
    for (let i = 0; i < 1_000; i++) {
      const result = form.validate();
      if (result.hasErrors) errors++;
    }
    sink = errors;
  });

  bench('field array move and entries across 500 rows', () => {
    const form = makeForm();
    const rows = form.fieldArray('rows');
    for (let i = 0; i < 250; i++) {
      rows.move(i, 499 - i);
      sink += rows.entries().length;
    }
  });
});

void sink;
