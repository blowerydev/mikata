import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';

const todoList = await highlight(
  `import { signal, computed, render, show, each } from 'mikata';

function TodoList() {
  const [todos, setTodos] = signal<{ id: number; text: string; done: boolean }[]>([]);
  const [input, setInput] = signal('');
  const remaining = computed(() => todos().filter((t) => !t.done).length);

  const add = () => {
    if (!input().trim()) return;
    setTodos([...todos(), { id: Date.now(), text: input(), done: false }]);
    setInput('');
  };

  const toggle = (id: number) =>
    setTodos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div>
      <input
        value={input()}
        onInput={(e) => setInput(e.currentTarget.value)}
        onKeydown={(e) => e.key === 'Enter' && add()}
      />
      <button onClick={add}>Add</button>

      <ul>
        {each(todos, (todo) => (
          <li
            style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
            onClick={() => toggle(todo.id)}
          >
            {todo.text}
          </li>
        ))}
      </ul>

      {show(
        () => todos().length > 0,
        () => <p>{remaining()} remaining</p>
      )}
    </div>
  );
}

render(() => <TodoList />, document.getElementById('app')!);`,
  'tsx',
);

export default function FirstApp() {
  useMeta({ title: 'Your first app - Mikata' });
  return (
    <article>
      <h1>Your first app</h1>
      <p>
        A full todo list in one file. This is idiomatic Mikata - the
        component function runs once, signals drive updates, and
        <code> each()</code>/<code>show()</code> handle reactive lists and
        conditional branches without re-running the surrounding component.
      </p>
      <CodeBlock html={todoList} />
      <h2>What's happening</h2>
      <ul>
        <li>
          <code>signal</code> returns <code>[getter, setter]</code>. The
          getter is a function - call it to read, and Mikata tracks the
          read in the surrounding reactive context.
        </li>
        <li>
          <code>computed</code> is a derived signal. It re-runs only when
          a dependency it read changes.
        </li>
        <li>
          <code>each</code> renders a keyed reactive list without
          re-creating rows. <code>show</code> does the same for a single
          branch.
        </li>
        <li>
          Event handlers receive native events, typed against the element
          they're bound to - <code>e.currentTarget.value</code> is typed
          for you.
        </li>
      </ul>
    </article>
  );
}
