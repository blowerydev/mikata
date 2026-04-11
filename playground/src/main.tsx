import { render } from '@mikata/runtime';
import { signal, computed, reactive, effect, onCleanup } from '@mikata/reactivity';
import { createStore } from '@mikata/store';
import {
  _createElement,
  _setProp,
  _insert,
  _createComponent,
  _spread,
  show,
  each,
  switchMatch,
  onMount,
  createContext,
  provide,
  inject,
  createRef,
  model,
  portal,
  ErrorBoundary,
} from '@mikata/runtime';

// ============================================================
// Demo 1: Counter (signals + computed + refs)
// ============================================================
function Counter() {
  const [count, setCount] = signal(0);
  const doubled = computed(() => count() * 2);
  const displayRef = createRef<HTMLParagraphElement>();

  onMount(() => {
    console.log('Counter mounted! Display ref:', displayRef.current);
  });

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Counter';
  el.appendChild(h2);

  const display = _createElement('p');
  _setProp(display, 'ref', displayRef);
  _insert(display, () => `Count: ${count()} | Doubled: ${doubled()}`);
  el.appendChild(display);

  // Reactive class styling
  const badge = _createElement('span');
  effect(() => {
    _setProp(badge, 'class', {
      badge: true,
      'badge-positive': count() > 0,
      'badge-negative': count() < 0,
      'badge-zero': count() === 0,
    });
  });
  _insert(badge, () => count() >= 0 ? 'positive' : 'negative');
  el.appendChild(badge);

  const incBtn = _createElement('button');
  incBtn.textContent = '+1';
  incBtn.addEventListener('click', () => setCount((c) => c + 1));
  el.appendChild(incBtn);

  const decBtn = _createElement('button');
  decBtn.textContent = '-1';
  decBtn.addEventListener('click', () => setCount((c) => c - 1));
  el.appendChild(decBtn);

  const resetBtn = _createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => setCount(0));
  el.appendChild(resetBtn);

  return el;
}

// ============================================================
// Demo 2: Form bindings (model + refs)
// ============================================================
function FormDemo() {
  const [name, setName] = signal('');
  const [age, setAge] = signal(0);
  const [agree, setAgree] = signal(false);
  const [color, setColor] = signal('blue');
  const nameRef = createRef<HTMLInputElement>();

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Form Bindings (model)';
  el.appendChild(h2);

  // Text input with model()
  const nameLabel = _createElement('label');
  nameLabel.textContent = 'Name: ';
  const nameInput = _createElement('input') as HTMLInputElement;
  _setProp(nameInput, 'ref', nameRef);
  _setProp(nameInput, 'placeholder', 'Enter your name...');
  _spread(nameInput, () => model(name, setName));
  nameLabel.appendChild(nameInput);
  el.appendChild(nameLabel);

  // Number input
  const ageLabel = _createElement('label');
  ageLabel.textContent = 'Age: ';
  const ageInput = _createElement('input') as HTMLInputElement;
  _setProp(ageInput, 'type', 'number');
  _spread(ageInput, () => model(age, setAge, 'number'));
  ageLabel.appendChild(ageInput);
  el.appendChild(ageLabel);

  // Checkbox
  const agreeLabel = _createElement('label');
  const agreeInput = _createElement('input') as HTMLInputElement;
  _setProp(agreeInput, 'type', 'checkbox');
  _spread(agreeInput, () => model(agree, setAgree, 'checkbox'));
  agreeLabel.appendChild(agreeInput);
  agreeLabel.appendChild(document.createTextNode(' I agree'));
  el.appendChild(agreeLabel);

  // Select
  const colorLabel = _createElement('label');
  colorLabel.textContent = 'Color: ';
  const colorSelect = _createElement('select') as HTMLSelectElement;
  for (const c of ['blue', 'red', 'green']) {
    const opt = _createElement('option');
    _setProp(opt, 'value', c);
    opt.textContent = c;
    colorSelect.appendChild(opt);
  }
  _spread(colorSelect, () => model(color, setColor, 'select'));
  colorLabel.appendChild(colorSelect);
  el.appendChild(colorLabel);

  // Output with reactive style
  const output = _createElement('p');
  _insert(output, () => `${name() || '?'}, age ${age()}, ${agree() ? 'agreed' : 'not agreed'}`);
  effect(() => {
    _setProp(output, 'style', { color: color(), fontWeight: 'bold' });
  });
  el.appendChild(output);

  // Focus button
  const focusBtn = _createElement('button');
  focusBtn.textContent = 'Focus name input';
  focusBtn.addEventListener('click', () => nameRef.current?.focus());
  el.appendChild(focusBtn);

  return el;
}

// ============================================================
// Demo 3: Todo List (reactive + each)
// ============================================================
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function TodoList() {
  let nextId = 1;
  const state = reactive({
    todos: [] as Todo[],
    input: '',
  });

  function addTodo() {
    if (!state.input.trim()) return;
    state.todos = [...state.todos, { id: nextId++, text: state.input, done: false }];
    state.input = '';
  }

  function toggleTodo(id: number) {
    state.todos = state.todos.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }

  function removeTodo(id: number) {
    state.todos = state.todos.filter((t) => t.id !== id);
  }

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Todo List';
  el.appendChild(h2);

  // Input row
  const inputRow = _createElement('div');
  const input = _createElement('input') as HTMLInputElement;
  _setProp(input, 'placeholder', 'Add a todo...');
  input.addEventListener('input', (e) => {
    state.input = (e.target as HTMLInputElement).value;
  });
  effect(() => {
    input.value = state.input;
  });
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') addTodo();
  });
  inputRow.appendChild(input);

  const addBtn = _createElement('button');
  addBtn.textContent = 'Add';
  addBtn.addEventListener('click', addTodo);
  inputRow.appendChild(addBtn);
  el.appendChild(inputRow);

  // List
  const listContainer = _createElement('div');
  _insert(
    listContainer,
    () =>
      each(
        () => state.todos,
        (todo) => {
          const item = _createElement('div');
          // class array + object syntax
          _setProp(item, 'class', ['todo-item', { done: todo.done }]);

          const checkbox = _createElement('input') as HTMLInputElement;
          _setProp(checkbox, 'type', 'checkbox');
          checkbox.checked = todo.done;
          checkbox.addEventListener('change', () => toggleTodo(todo.id));
          item.appendChild(checkbox);

          const text = _createElement('span');
          text.textContent = todo.text;
          if (todo.done) _setProp(text, 'style', { textDecoration: 'line-through', opacity: '0.6' });
          item.appendChild(text);

          const removeBtn = _createElement('button');
          removeBtn.textContent = 'x';
          removeBtn.addEventListener('click', () => removeTodo(todo.id));
          item.appendChild(removeBtn);

          return item;
        },
        () => {
          const empty = _createElement('p');
          empty.textContent = 'No todos yet. Add one above!';
          return empty;
        },
        { key: (t: Todo) => t.id }
      )
  );
  el.appendChild(listContainer);

  // Count
  const countDisplay = _createElement('p');
  _insert(countDisplay, () => {
    const total = state.todos.length;
    const done = state.todos.filter((t) => t.done).length;
    return `${done}/${total} completed`;
  });
  el.appendChild(countDisplay);

  return el;
}

// ============================================================
// Demo 4: Conditional rendering (show + switchMatch)
// ============================================================
function ConditionalDemo() {
  const [status, setStatus] = signal<'loading' | 'success' | 'error'>('loading');

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Conditional Rendering';
  el.appendChild(h2);

  const btnRow = _createElement('div');
  for (const s of ['loading', 'success', 'error'] as const) {
    const btn = _createElement('button');
    btn.textContent = s;
    btn.addEventListener('click', () => setStatus(s));
    btnRow.appendChild(btn);
  }
  el.appendChild(btnRow);

  const display = _createElement('div');
  _insert(display, () =>
    switchMatch(() => status(), {
      loading: () => {
        const p = _createElement('p');
        p.textContent = 'Loading...';
        return p;
      },
      success: () => {
        const p = _createElement('p');
        p.textContent = 'Success! Data loaded.';
        return p;
      },
      error: () => {
        const p = _createElement('p');
        p.textContent = 'Error! Something went wrong.';
        return p;
      },
    })
  );
  el.appendChild(display);

  return el;
}

// ============================================================
// Demo 5: Portal (renders modal into document.body)
// ============================================================
function PortalDemo() {
  const [showModal, setShowModal] = signal(false);

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Portal (Modal)';
  el.appendChild(h2);

  const toggleBtn = _createElement('button');
  toggleBtn.textContent = 'Toggle Modal';
  toggleBtn.addEventListener('click', () => setShowModal((v) => !v));
  el.appendChild(toggleBtn);

  const status = _createElement('p');
  _insert(status, () => showModal() ? 'Modal is open (rendered in body via portal)' : 'Modal is closed');
  el.appendChild(status);

  // Portal renders the modal into document.body
  const portalContainer = _createElement('div');
  _insert(portalContainer, () =>
    show(
      () => showModal(),
      () => {
        return portal(() => {
          const overlay = _createElement('div');
          _setProp(overlay, 'class', 'modal-overlay');
          _setProp(overlay, 'style', {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
          });
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) setShowModal(false);
          });

          const modal = _createElement('div');
          _setProp(modal, 'style', {
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            color: '#333',
          });

          const title = _createElement('h3');
          title.textContent = 'Portal Modal';
          modal.appendChild(title);

          const body = _createElement('p');
          body.textContent = 'This modal is rendered into document.body via portal(), not inside the component tree.';
          modal.appendChild(body);

          const closeBtn = _createElement('button');
          closeBtn.textContent = 'Close';
          closeBtn.addEventListener('click', () => setShowModal(false));
          modal.appendChild(closeBtn);

          overlay.appendChild(modal);
          return overlay;
        }, document.body);
      }
    )
  );
  el.appendChild(portalContainer);

  return el;
}

// ============================================================
// Demo 6: Error Boundary
// ============================================================
function ErrorBoundaryDemo() {
  const [shouldThrow, setShouldThrow] = signal(false);

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.textContent = 'Error Boundary';
  el.appendChild(h2);

  const toggleBtn = _createElement('button');
  toggleBtn.textContent = 'Toggle error';
  toggleBtn.addEventListener('click', () => setShouldThrow((v) => !v));
  el.appendChild(toggleBtn);

  const boundaryContainer = _createElement('div');
  _insert(boundaryContainer, () =>
    _createComponent(ErrorBoundary, {
      fallback: (err: Error, reset: () => void) => {
        const wrapper = _createElement('div');
        _setProp(wrapper, 'style', { color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '4px' });

        const msg = _createElement('p');
        msg.textContent = `Caught error: ${err.message}`;
        wrapper.appendChild(msg);

        const retryBtn = _createElement('button');
        retryBtn.textContent = 'Reset';
        retryBtn.addEventListener('click', () => {
          setShouldThrow(false);
          reset();
        });
        wrapper.appendChild(retryBtn);

        return wrapper;
      },
      get children() {
        if (shouldThrow()) {
          throw new Error('Something broke!');
        }
        const safe = _createElement('p');
        safe.textContent = 'Everything is fine. Click "Toggle error" to trigger an error.';
        return safe;
      },
    })
  );
  el.appendChild(boundaryContainer);

  return el;
}

// ============================================================
// App — compose all demos
// ============================================================
function App() {
  const el = _createElement('div');

  const h1 = _createElement('h1');
  h1.textContent = 'Mikata Framework Playground';
  el.appendChild(h1);

  const subtitle = _createElement('p');
  subtitle.textContent = 'A reactive UI framework with signals, no VDOM, and ergonomic APIs.';
  _setProp(subtitle, 'style', { marginBottom: '1rem', opacity: '0.7' });
  el.appendChild(subtitle);

  el.appendChild(_createComponent(Counter, {}));
  el.appendChild(_createComponent(FormDemo, {}));
  el.appendChild(_createComponent(TodoList, {}));
  el.appendChild(_createComponent(ConditionalDemo, {}));
  el.appendChild(_createComponent(PortalDemo, {}));
  el.appendChild(_createComponent(ErrorBoundaryDemo, {}));

  return el;
}

// ============================================================
// Mount
// ============================================================
const dispose = render(
  () => _createComponent(App, {}),
  document.getElementById('root')!
);

console.log('Mikata app mounted! dispose() to unmount.');
