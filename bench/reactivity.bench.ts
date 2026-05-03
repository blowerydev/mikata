import { afterAll, bench, describe } from 'vitest';
import {
  batch,
  computed,
  createScope,
  effect,
  flushSync,
  signal,
} from '@mikata/reactivity';

let sink = 0;

describe('@mikata/reactivity', () => {
  bench('read one signal 10k times', () => {
    const [value] = signal(1);
    let total = 0;
    for (let i = 0; i < 10_000; i++) {
      total += value();
    }
    sink = total;
  });

  const [fanoutValue, setFanoutValue] = signal(0);
  let fanoutRuns = 0;
  const fanoutScope = createScope(() => {
    for (let i = 0; i < 1_000; i++) {
      effect(() => {
        fanoutRuns += fanoutValue();
      });
    }
  });

  bench('flush 1k effects from one signal write', () => {
    setFanoutValue((value) => value + 1);
    flushSync();
    sink = fanoutRuns;
  });

  const [chainSource, setChainSource] = signal(0);
  const chainScope = createScope(() => {
    let current = computed(() => chainSource());
    for (let i = 0; i < 100; i++) {
      const prev = current;
      current = computed(() => prev() + 1);
    }

    bench('invalidate and read 100 computed chain', () => {
      setChainSource((value) => value + 1);
      sink = current();
    });
  });

  const [batchA, setBatchA] = signal(0);
  const [batchB, setBatchB] = signal(0);
  let batchRuns = 0;
  const batchScope = createScope(() => {
    effect(() => {
      batchRuns += batchA() + batchB();
    });
  });

  bench('batch two writes into one effect flush', () => {
    batch(() => {
      setBatchA((value) => value + 1);
      setBatchB((value) => value + 1);
    });
    flushSync();
    sink = batchRuns;
  });

  afterAll(() => {
    fanoutScope.dispose();
    chainScope.dispose();
    batchScope.dispose();
  });
});

void sink;
