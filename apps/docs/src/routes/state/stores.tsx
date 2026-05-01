import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Stores', section: 'State & Data', order: 1 };

const storeExample = await highlight(
  `import { createStore, derived } from '@mikata/store';

const [cart, setCart] = createStore({
  items: [
    { id: 'tea', name: 'Tea', price: 6, quantity: 2 },
  ],
  coupon: '',
});

const subtotal = derived(() =>
  cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

setCart((draft) => {
  draft.items.push({ id: 'mug', name: 'Mug', price: 14, quantity: 1 });
});

setCart({ coupon: 'WELCOME' });`,
  'ts',
);

const componentExample = await highlight(
  `import { createStore, createSelector } from '@mikata/store';

const [todos, setTodos] = createStore({
  items: [
    { id: 'a', title: 'Ship docs', done: false },
    { id: 'b', title: 'Tag release', done: true },
  ],
});

const isSelected = createSelector(() => activeTodoId());

export function TodoList() {
  return (
    <ul>
      {todos.items.map((todo) => (
        <li class={{ selected: isSelected(todo.id) }}>
          <label>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() =>
                setTodos((draft) => {
                  draft.items.find((item) => item.id === todo.id)!.done = !todo.done;
                })
              }
            />
            {todo.title}
          </label>
        </li>
      ))}
    </ul>
  );
}`,
  'tsx',
);

export default function Stores() {
  useMeta({
    title: 'Stores - @mikata/store',
    description: 'Manage structured reactive state with Mikata stores, selectors, and derived values.',
  });

  return (
    <article>
      <h1>Stores</h1>
      <p>
        <code>@mikata/store</code> adds a small structured-state layer on top of
        Mikata reactivity. Use it when a feature wants one object-shaped state
        model instead of several separate signals.
      </p>

      <h2>Create a store</h2>
      <p>
        <code>createStore()</code> returns a read-only reactive object and a
        setter. The setter accepts a partial object or a draft callback, and
        updates are batched so dependent computations run once.
      </p>
      <CodeBlock html={storeExample} />

      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>createStore(initial)</code>
            </td>
            <td>Creates a reactive object and <code>setStore</code> function.</td>
          </tr>
          <tr>
            <td>
              <code>setStore(partial)</code>
            </td>
            <td>Assigns one or more top-level fields.</td>
          </tr>
          <tr>
            <td>
              <code>setStore(draft =&gt; ...)</code>
            </td>
            <td>Mutates the internal reactive draft inside a batch.</td>
          </tr>
          <tr>
            <td>
              <code>derived(fn)</code>
            </td>
            <td>Alias for <code>computed()</code> named for store use cases.</td>
          </tr>
        </tbody>
      </table>

      <h2>Selectors</h2>
      <p>
        <code>createSelector()</code> is re-exported from
        <code>@mikata/reactivity</code>. It is useful for keyed UI state, where
        many rows need to ask whether they match the same selected value.
      </p>
      <CodeBlock html={componentExample} />

      <h2>Mutation rules</h2>
      <p>
        Update stores through the setter. In development, direct writes to the
        returned store proxy report a clear error. Arrays are supported inside a
        store object, but creating a store from an array root is discouraged.
      </p>

      <h2>SSR registry</h2>
      <p>
        The package also exports query registry helpers used by server rendering:
        <code>beginCollect</code>, <code>collectAll</code>, <code>endCollect</code>,
        <code>readHydratedData</code>, and <code>stableStringify</code>. Most apps
        use these indirectly through queries and the server integration.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/state/queries">Queries &amp; mutations</Link> adds async
          data fetching and invalidation.
        </li>
        <li>
          <Link to="/core/reactivity">Reactivity</Link> covers the signals and
          computations stores build on.
        </li>
      </ul>
    </article>
  );
}
