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
pnpm bench:frameworks:all
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
- append/remove/clear list churn
- partial keyed list updates inside a 1k-row table
- conditional branch toggles, including Mikata's retained `keepAlive` mode
- stateful branch setup/disposal
- controlled text, checkbox, and select input interaction
- nested component/context-style updates
- event dispatch across 1k buttons
- SSR-to-client hydration where the harness can use real SSR markup
- server rendering where a framework exposes a simple server renderer
- mixed SSR pages with attributes, forms, links, lists, and conditionals
- route-style navigation through a persistent app shell with nested outlet text
- async data lifecycle: loading, success, refetch, error, and recovery states
- large validated forms with 75 fields
- table flows that sort, filter, paginate, edit one row, and select rows
- modal/popover-style mount disposal with document listener cleanup
- deep provider/context consumer updates
- full SSR app pages with shell, nav, form, table, links, and status regions
- hydration of full app pages where the framework harness can use real SSR markup
- mount/dispose leak sentinels that exercise cleanup paths
- scheduler/batching pressure from many state writes in one action
- fanout and dependency-chain stress tests for reactive systems
- UI fanout stress where the framework model is component-render driven

Some coverage is intentionally framework-specific:

- Svelte DOM and hydration cases need a compiled client-component harness. The current suite covers Svelte stores and compiled server rendering, including the full app-page SSR flow.
- Solid DOM cases use direct DOM construction to approximate compiled output in Node. Hydration is left out until the harness compiles Solid templates with hydration markers.
- React's reactivity fanout case uses 1k child component consumers because React does not expose signal-style subscriber primitives.

Temporary generated benchmark modules live in `bench/frameworks/.generated/`, and result JSON goes under `bench/frameworks/results/`; both are ignored by Git.

Treat the numbers as directional. They are useful for finding suspicious gaps, validating optimizations, and tracking broad movement over time. They should not be used as a release gate or as marketing copy without a more controlled benchmark environment.
