import { afterAll, bench, describe } from 'vitest';
import { createScope, effect, flushSync } from '@mikata/reactivity';
import {
  beginCollect,
  collectAll,
  createQuery,
  createStore,
  createSelector,
  endCollect,
  stableStringify,
} from '@mikata/store';

let sink = 0;

describe('@mikata/store', () => {
  const [state, setState] = createStore({
    count: 0,
    rows: Array.from({ length: 1_000 }, (_, id) => ({ id, value: id })),
  });

  let fanoutRuns = 0;
  const fanoutScope = createScope(() => {
    for (let i = 0; i < 1_000; i++) {
      effect(() => {
        fanoutRuns += state.count;
      });
    }
  });

  bench('update one store field with 1k subscribers', () => {
    setState((draft) => {
      draft.count += 1;
    });
    flushSync();
    sink = fanoutRuns;
  });

  const selector = createSelector(() => state.count % 1_000);

  bench('select keyed row from 1k ids 10k times', () => {
    let selected = 0;
    for (let i = 0; i < 10_000; i++) {
      if (selector((i * 17) % 1_000)) selected++;
    }
    sink = selected;
  });

  const complexKey = {
    page: 3,
    filters: {
      tags: ['runtime', 'compiler', 'router'],
      range: { from: 10, to: 90 },
    },
    sort: ['updated', 'title'],
  };

  bench('stable stringify nested query key 10k times', () => {
    let total = 0;
    for (let i = 0; i < 10_000; i++) {
      total += stableStringify(complexKey).length;
    }
    sink = total;
  });

  bench('SSR collect 100 registered queries', async () => {
    beginCollect();
    try {
      createScope(() => {
        for (let i = 0; i < 100; i++) {
          createQuery({
            key: () => ['item', i],
            fn: async () => ({ id: i, value: `Item ${i}` }),
            retry: false,
          });
        }
      }).dispose();

      const result = await collectAll();
      sink = Object.keys(result).length;
    } finally {
      endCollect();
    }
  });

  afterAll(() => {
    fanoutScope.dispose();
  });
});

void sink;
