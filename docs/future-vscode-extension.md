# VS Code Extension — Future Plans

Mikata uses plain `.tsx` files with standard TypeScript, so **no editor extension is required** for core functionality. TypeScript's built-in LSP already provides type checking, autocompletion, go-to-definition, and refactoring. This is a competitive advantage over Vue (Volar), Svelte (svelte-language-tools), and Angular, which all require custom extensions to support their file formats.

A future VS Code extension would focus on developer ergonomics — surfacing reactivity information that's otherwise invisible.

---

## 1. Snippets

Expand shorthand into common Mikata patterns:

| Prefix | Expands to |
|--------|-----------|
| `sig` | `const [name, setName] = signal<type>(initial);` |
| `comp` | `computed(() => { ... })` |
| `eff` | `effect(() => { ... })` |
| `show` | `show(() => condition, (value) => render, () => fallback)` |
| `each` | `each(() => list, (item, index) => render, () => empty)` |
| `switch` | `switchMatch(() => value, { case: () => render })` |
| `store` | `const [store, setStore] = createStore({ ... });` |
| `query` | `createQuery({ key: () => ..., fn: async (key, { signal }) => ... })` |
| `ref` | `const ref = createRef<HTMLElement>();` |

**Effort:** Low. A snippet JSON file, no extension API needed.
**Impact:** Low. Users can define their own snippets. Worth including in a published extension as a freebie, but not worth publishing on its own.

---

## 2. Reactive Dependency Visualization

The most valuable feature. Shows which signals/reactive properties each effect and computed depends on, and which effects a signal triggers.

### Possible UI surfaces

**Hover tooltips** on `effect()` / `computed()` calls:
```
effect(() => { ... })
  ├─ reads: count, user.name, items.length
  └─ cleanup: yes
```

**CodeLens** above each reactive scope:
```
// 3 dependencies | 2 subscribers
effect(() => {
  console.log(count(), doubled(), state.name);
});
```

**Sidebar panel** with a dependency graph:
- Left column: signals and reactive sources
- Right column: effects and computeds
- Lines connecting readers to sources
- Highlight a node to see its immediate graph

**Warning highlights** for suspicious patterns:
- Unintentional dependencies (reading a reactive value in a branch that always short-circuits)
- Missing dependencies (a value used outside a tracked scope that looks like it should be reactive)
- Duplicate subscriptions (same signal read multiple times in one effect)

### Implementation approaches

**Static analysis (Babel/TS AST):**
- Parse effect/computed bodies, trace which signal getters and reactive property accesses occur
- Pros: works without running the app, fast
- Cons: can't follow dynamic property access, conditional reads, or values passed through functions. Will produce false positives/negatives for non-trivial code.

**Runtime debug protocol:**
- The dev server exposes a WebSocket endpoint reporting the actual dependency graph from the running reactivity system
- The extension connects and displays live data
- Pros: 100% accurate, reflects actual runtime behavior
- Cons: requires the app to be running, needs a debug server baked into the Vite plugin, more complex architecture

**Hybrid:**
- Static analysis for editor-time hints (best-effort, may be imprecise)
- Runtime protocol for a "live" mode when the dev server is running (accurate)
- Static hints get a subtle visual treatment (e.g., dimmed) to communicate uncertainty

**Effort:** High. The static analyzer needs to understand Mikata's API shape. The runtime protocol needs changes to `@mikata/reactivity` (debug hooks on `track`, `scheduleDirty`, `cleanupSources`) and a transport layer in `@mikata/compiler`'s Vite plugin.
**Impact:** High. Reactivity bugs are almost always "I thought this was tracked but it wasn't" or "this effect re-runs when it shouldn't." Making the invisible visible catches these before they become runtime issues.

---

## 3. Inline Reactive Hints

Annotate reactive values and tracked scopes directly in the editor, similar to TypeScript's inferred type hints:

```tsx
function Counter() {
  const [count, setCount] = signal(0);        // signal<number>
  const doubled = computed(() => count() * 2); // computed<number> <- count
  const state = reactive({ name: 'Alice' });   // reactive proxy

  effect(() => {        // tracks: count, doubled, state.name
    console.log(count(), doubled(), state.name);
  });

  untrack(() => {
    console.log(count()); // untracked read
  });
}
```

### Specific annotations

- **Signal declarations:** show the type and initial value
- **Computed declarations:** show the type and immediate sources
- **Effect bodies:** show all tracked reads
- **`untrack()` blocks:** dim or annotate reads as explicitly untracked
- **`batch()` blocks:** annotate as "writes deferred until batch completes"

This overlaps with the dependency visualization feature but is lighter-weight — it works from static analysis only and doesn't need a running app.

**Effort:** Medium. Needs a TS language service plugin or VS Code decorator provider that understands the Mikata API shape.
**Impact:** Medium. Less powerful than the full dependency graph but provides continuous passive awareness of reactivity flow.

---

## Priority Order

1. **Snippets** — trivial to implement, include as a baseline
2. **Inline reactive hints** — medium effort, continuous passive value
3. **Dependency visualization** — high effort, high value for debugging

## Prerequisites

Before building the extension:
- The core framework API should be stable (post-v1.0)
- For runtime debug protocol: add opt-in debug hooks to `@mikata/reactivity` behind a `__DEV__` flag
- For static analysis: document the exact set of reactive API functions the analyzer needs to recognize

## Why Not Now

The framework has zero users. Building editor tooling before the API is stable means rewriting the tooling every time the API changes. The "works with every TypeScript editor, zero setup" story is more valuable at this stage than framework-specific tooling. Revisit once the framework has users hitting real-world debugging scenarios.
