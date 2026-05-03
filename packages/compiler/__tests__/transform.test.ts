import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import { mikataJSXPlugin } from '../src/transform';

function transform(code: string): string {
  const result = transformSync(code, {
    filename: 'test.tsx',
    plugins: [
      ['@babel/plugin-syntax-typescript', { isTSX: true }],
      mikataJSXPlugin,
    ],
  });
  return result?.code ?? '';
}

describe('JSX transform', () => {
  it('emits a module-scope _template for a static element', () => {
    const output = transform(`const el = <div class="container">Hello</div>;`);
    expect(output).toContain('_template(');
    // Static string attr and text bake directly into the template HTML
    // (string-escaped inside the emitted JS source).
    expect(output).toContain('class=\\"container\\"');
    expect(output).toContain('Hello');
    // Per-instantiation: cloneNode(true) off the template.
    expect(output).toContain('.cloneNode(true)');
  });

  it('delegates bubbling event handlers via _delegate', () => {
    const output = transform(`const el = <button onClick={handler}>Click</button>;`);
    // Bubbling events compile to _delegate so the runtime can share a single
    // document-level listener per event type across the whole tree.
    expect(output).toContain('_delegate');
    expect(output).toContain('"click"');
    expect(output).toContain('handler');
    expect(output).not.toContain('addEventListener');
  });

  it('uses addEventListener for non-bubbling events', () => {
    const output = transform(`const el = <input onFocus={handler} />;`);
    expect(output).toContain('addEventListener');
    expect(output).toContain('"focus"');
  });

  it('wraps dynamic attributes in renderEffect', () => {
    const output = transform(`const el = <div class={active()}>test</div>;`);
    expect(output).toContain('renderEffect');
    expect(output).toContain('_setProp');
    expect(output).toContain('active()');
  });

  it('transforms components with _createComponent', () => {
    const output = transform(`const el = <Counter count={5} />;`);
    expect(output).toContain('_createComponent');
    expect(output).toContain('Counter');
    expect(output).toContain('count');
  });

  it('creates getters for reactive component props', () => {
    const output = transform(`const el = <Counter count={count()} />;`);
    expect(output).toContain('_createComponent');
    expect(output).toContain('get count');
  });

  it('wraps object-literal native attributes when nested values are reactive', () => {
    const output = transform(`const el = <div class={{ active: isActive() }} />;`);
    expect(output).toContain('renderEffect');
    expect(output).toContain('_setProp');
    expect(output).toContain('isActive()');
  });

  it('creates getters for component props with reactive object literals', () => {
    const output = transform(`const el = <Counter options={{ value: count() }} />;`);
    expect(output).toContain('_createComponent');
    expect(output).toMatch(/get\s+options\s*\(\s*\)/);
    expect(output).toContain('count()');
  });

  it('treats object and array literals with only static values as non-reactive', () => {
    const output = transform(`const el = <div class={{ active: true }} data-values={[1, 2]} />;`);
    expect(output).not.toContain('renderEffect');
  });

  it('creates string-literal getters for dashed reactive component props', () => {
    // Without the dashed-key getter, `aria-label={signal()}` snapshots
    // the value once at setup time and never sees subsequent updates.
    const output = transform(
      `const el = <Field aria-label={label()} data-id={id()} />;`,
    );
    expect(output).toContain('_createComponent');
    // Babel emits string-literal getters as `get "aria-label"() { ... }`
    expect(output).toMatch(/get\s+"aria-label"\s*\(\s*\)/);
    expect(output).toMatch(/get\s+"data-id"\s*\(\s*\)/);
    // The getter body still references the reactive call expression.
    expect(output).toContain('label()');
    expect(output).toContain('id()');
  });

  it('mixes identifier and dashed reactive props on the same component', () => {
    const output = transform(
      `const el = <Field count={count()} aria-label={label()} static="x" />;`,
    );
    // Identifier prop: bare-identifier getter.
    expect(output).toMatch(/get\s+count\s*\(\s*\)/);
    // Dashed prop: string-literal getter.
    expect(output).toMatch(/get\s+"aria-label"\s*\(\s*\)/);
    // Non-reactive static value stays an eager property.
    expect(output).toContain('static: "x"');
  });

  it('adds runtime imports', () => {
    const output = transform(`const el = <div>Hello</div>;`);
    expect(output).toContain(`from "@mikata/runtime"`);
    expect(output).toContain('_template');
  });

  it('inlines static element children into the template HTML', () => {
    const output = transform(`const el = <ul><li>One</li><li>Two</li></ul>;`);
    // Whole subtree bakes into one template — no per-child createElement.
    expect(output).toContain('<ul><li>One</li><li>Two</li></ul>');
    expect(output).not.toContain('appendChild');
  });

  it('bakes a text-node placeholder for only-child dynamic text', () => {
    // `<el>{expr}</el>` skips _insert / createTextNode / appendChild by
    // emitting a whitespace Text into the template and writing its `.data`.
    // Uses a bare identifier here because call-expression returns are
    // not statically known to be primitive — those go through `_insert`
    // (with a text-node fast path for the common primitive case).
    const output = transform(`const el = <span>{count}</span>;`);
    expect(output).toContain('<span> </span>');
    expect(output).toMatch(/\.data\s*=/);
    expect(output).not.toContain('_insert');
  });

  it('unwraps bare signal getters in text-baked children', () => {
    // `<span>{count}</span>` — `count` is a bare identifier; the compiler
    // can't know whether it's a signal getter or a plain value. The emitted
    // bake must call it if it's a function (to match `_insert`'s runtime
    // behaviour) and wrap in renderEffect so signal subscriptions work.
    const output = transform(`const el = <span>{count}</span>;`);
    expect(output).toContain('<span> </span>');
    expect(output).toContain('renderEffect');
    // typeof-guarded call so plain values still work as text.
    expect(output).toMatch(/typeof count === "function"/);
    expect(output).toMatch(/count\(\)/);
  });

  it('handles fragments', () => {
    const output = transform(`const el = <><span>A</span><span>B</span></>;`);
    expect(output).toContain('_createFragment');
  });

  it('bakes static props into the template without renderEffect', () => {
    const output = transform(`const el = <div id="main">test</div>;`);
    expect(output).toContain('id=\\"main\\"');
    expect(output).not.toContain('renderEffect');
    expect(output).not.toContain('_setProp');
  });

  it('emits anchor markers for dynamic children with siblings', () => {
    const output = transform(
      `const el = <p>Count: {count()} | Doubled: {doubled()}</p>;`
    );
    // Both dynamic slots have sibling content (static text and each other),
    // so each gets a `<!>` marker in the template HTML and a marker arg in
    // its `_insert(...)` call. The marker-less optimisation only fires for
    // sole-child dynamics where the hydration cursor at parent.childNodes[0]
    // naturally lands on the SSR slot.
    expect(output).toContain('<!>');
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*count\(\),\s*_el/);
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*doubled\(\),\s*_el/);
  });

  it('preserves inline whitespace in JSX text', () => {
    const output = transform(
      `const el = <p>Count: {count()} done</p>;`
    );
    // Trailing space after "Count:" and surrounding spaces around "done" must
    // survive inside the template HTML so rendered text doesn't squash.
    expect(output).toContain('Count: ');
    expect(output).toContain(' done');
  });

  it('walks via firstChild / nextSibling for wired descendants', () => {
    const output = transform(
      `const el = <div><span>static</span><a onClick={h}>click</a></div>;`
    );
    // Only the <a> needs wiring; walker reaches it via firstChild.nextSibling.
    expect(output).toContain('firstChild');
    expect(output).toContain('nextSibling');
    expect(output).toContain('_delegate');
  });

  it('captures sibling slot refs before inserting inline component children', () => {
    const output = transform(
      `const el = <p>Start <Link to="/a">A</Link>, then <Link to="/b">B</Link>.</p>;`,
    );
    const firstInsert = output.indexOf('_insert(');
    const secondSlotRef = output.indexOf('firstChild.nextSibling.nextSibling.nextSibling');

    expect(firstInsert).toBeGreaterThan(-1);
    expect(secondSlotRef).toBeGreaterThan(-1);
    expect(secondSlotRef).toBeLessThan(firstInsert);
  });

  it('auto-labels signal() with its destructured name', () => {
    const output = transform(`const [count, setCount] = signal(0);`);
    expect(output).toContain('signal(0, "count")');
  });

  it('auto-labels computed() with its binding name', () => {
    const output = transform(`const doubled = computed(() => count() * 2);`);
    expect(output).toContain('"doubled"');
  });

  it('does not re-label signal() when a label is already provided', () => {
    const output = transform(`const [count, setCount] = signal(0, "explicit");`);
    expect(output).toContain('"explicit"');
    expect(output).not.toContain('"count"');
  });

  it('does not re-label computed() when a label is already provided', () => {
    const output = transform(`const doubled = computed(() => count() * 2, "dbl");`);
    expect(output).toContain('"dbl"');
    expect(output).not.toContain('"doubled"');
  });

  it('treats property reads on each() callback params as non-reactive', () => {
    const output = transform(
      `const list = each(data, row => <td>{row.id}</td>);`
    );
    // `row.id` on a loop-param → plain data, no renderEffect wrap around
    // the text-bake assignment.
    expect(output).toContain('.data = row.id ?? ""');
    expect(output).not.toContain('renderEffect(() => {\n  _el$1.data = row.id');
  });

  it('keeps call expressions reactive even on loop params', () => {
    const output = transform(
      `const list = each(data, row => <td>{row.label()}</td>);`
    );
    expect(output).toContain('renderEffect');
    expect(output).toContain('row.label()');
  });

  it('leaves component props.x reactive', () => {
    // Component-body props are lazy-prop proxies — reads stay reactive.
    const output = transform(
      `function Comp(props) { return <td>{props.x}</td>; }`
    );
    expect(output).toContain('renderEffect');
    expect(output).toContain('props.x');
  });
});

describe('text-bake skip list', () => {
  // Text-bake writes a single dynamic child's value straight into a
  // text node via `.data = expr`. That's a huge win for primitives but
  // catastrophic for expressions that evaluate to a Node or node array
  // — they'd stringify to "[object HTMLElement]" or arrow source.
  // isNonPrimitiveExpr has to catch each shape before bake kicks in.

  function bakesAsText(code: string): boolean {
    const output = transform(code);
    return output.includes('.data =') && !output.includes('_insert(');
  }

  it('does not bake arrow functions', () => {
    expect(bakesAsText(`const el = <p>{() => count()}</p>;`)).toBe(false);
  });

  it('does not bake array literals', () => {
    expect(bakesAsText(`const el = <p>{[a, b]}</p>;`)).toBe(false);
  });

  it('does not bake array .map / .flatMap / .filter / .flat', () => {
    for (const m of ['map', 'flatMap', 'filter', 'flat']) {
      expect(bakesAsText(`const el = <p>{arr.${m}(x => x)}</p>;`)).toBe(false);
    }
  });

  it('does not bake array .concat / .slice / .sort / .reverse', () => {
    // These preserve element types so a node array stays a node array.
    for (const m of ['concat', 'slice', 'sort', 'reverse']) {
      expect(bakesAsText(`const el = <p>{arr.${m}()}</p>;`)).toBe(false);
    }
  });

  it('does not bake reduce / reduceRight', () => {
    // Accumulator can plausibly be a node list.
    expect(bakesAsText(`const el = <p>{arr.reduce(fn, [])}</p>;`)).toBe(false);
    expect(bakesAsText(`const el = <p>{arr.reduceRight(fn, [])}</p>;`)).toBe(
      false,
    );
  });

  it('does not bake Array.from / Array.of', () => {
    expect(bakesAsText(`const el = <p>{Array.from(set)}</p>;`)).toBe(false);
    expect(bakesAsText(`const el = <p>{Array.of(a, b)}</p>;`)).toBe(false);
  });

  it('does not bake conditional expressions with a node branch', () => {
    // `loading ? <Spinner/> : count` — text-bake would stringify the
    // spinner when `loading` is true.
    expect(
      bakesAsText(`const el = <p>{loading ? <span/> : count()}</p>;`),
    ).toBe(false);
  });

  it('bakes conditional expressions with only literal-primitive branches', () => {
    expect(
      bakesAsText(`const el = <p>{loading ? 'wait' : 'ready'}</p>;`),
    ).toBe(true);
  });

  it('does not bake bare-identifier call expressions (return type unknown)', () => {
    // `routeOutlet()`, `render()`, `useSomething()` — the compiler cannot
    // prove the return is a primitive, and stringifying a Node to `.data`
    // produces "[object HTMLElement]" garbage. Route these through
    // `_insert` which has a text-to-text fast path for the common case
    // where the return really is a primitive.
    expect(bakesAsText(`const el = <div>{routeOutlet()}</div>;`)).toBe(false);
    expect(bakesAsText(`const el = <p>{count()}</p>;`)).toBe(false);
  });

  it('bakes well-known primitive coercion calls', () => {
    // Explicit coercions we can trust to return primitives.
    expect(bakesAsText(`const el = <p>{String(count)}</p>;`)).toBe(true);
    expect(bakesAsText(`const el = <p>{Number(input)}</p>;`)).toBe(true);
  });

  it('does not bake logical || with a node branch', () => {
    expect(bakesAsText(`const el = <p>{name || <Default/>}</p>;`)).toBe(false);
  });

  it('does not bake logical ?? with a node branch', () => {
    expect(bakesAsText(`const el = <p>{value ?? <Fallback/>}</p>;`)).toBe(
      false,
    );
  });

  it('does not bake bare JSX expressions', () => {
    expect(bakesAsText(`const el = <p>{<span>hi</span>}</p>;`)).toBe(false);
  });

  it('does not bake node-returning helper calls (show, each, switchMatch, Dynamic)', () => {
    for (const helper of ['show', 'each', 'switchMatch', 'Dynamic']) {
      expect(bakesAsText(`const el = <p>{${helper}(a, b)}</p>;`)).toBe(false);
    }
  });

  it('unwraps TS type assertions before classifying', () => {
    // `arr.map(...) as Node[]` should still trip the skip list.
    expect(
      bakesAsText(`const el = <p>{arr.map(x => x) as unknown}</p>;`),
    ).toBe(false);
    expect(
      bakesAsText(`const el = <p>{(<span/>)!}</p>;`),
    ).toBe(false);
  });

  it('still bakes bare signal getters and member reads', () => {
    // Sanity: the skip list shouldn't be so eager that it kills the
    // common-case win on plain values. Bare identifiers and member
    // expressions stay on the bake path — the compiler inserts a
    // runtime typeof check for identifiers to unwrap function-shaped
    // values, and member reads don't trigger the non-primitive rule.
    expect(bakesAsText(`const el = <p>{count}</p>;`)).toBe(true);
    expect(bakesAsText(`const el = <p>{props.label}</p>;`)).toBe(true);
  });
});
