# Framework Comparison Benchmarks

This is an opt-in comparison suite for checking Mikata against other UI frameworks. It is intentionally separate from the normal `pnpm bench` regression suite:

- `bench/` answers "did Mikata get slower than itself?"
- `bench/frameworks/` answers "where does Mikata look strong or weak next to React, Vue, Svelte, and Solid?"

## Install Optional Frameworks

The root install does not include these dependencies. Install them only when you want to run cross-framework comparisons:

```sh
cd bench/frameworks
pnpm install --ignore-workspace
```

The runner skips any framework whose packages are not installed, so `pnpm bench:frameworks:quick` still works as a Mikata-only smoke test. The `--ignore-workspace` flag matters because this folder intentionally lives outside the root workspace package graph.

The Mikata adapter imports the built package output from `packages/*/dist`, which keeps the comparison close to published-package behavior. Rebuild the packages first when you want to compare fresh local implementation changes.

## Run

```sh
pnpm bench:frameworks
pnpm bench:frameworks:quick
pnpm bench:frameworks:json
```

Useful filters:

```sh
pnpm bench:frameworks -- --framework mikata,solid
pnpm bench:frameworks -- --category dom-update
pnpm bench:frameworks -- --mode stress
pnpm bench:frameworks -- --list
```

## Coverage

The suite favors workloads that mirror real app pressure:

- static component mount/unmount
- dynamic text updates
- keyed list reversal
- conditional branch toggles, including Mikata's retained `keepAlive` mode
- server rendering where a framework exposes a simple server renderer
- fanout and dependency-chain stress tests for reactive systems
- UI fanout stress where the framework model is component-render driven

Treat the numbers as directional. They are useful for finding suspicious gaps, validating optimizations, and tracking broad movement over time. They should not be used as a release gate or as marketing copy without a more controlled benchmark environment.
