import { render } from '@mikata/runtime';
import { signal, computed, reactive, effect, onCleanup } from '@mikata/reactivity';
import { createStore } from '@mikata/store';
import '@mikata/ui/styles.css';
import '@mikata/ui/css';
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
import {
  ThemeProvider,
  useTheme,
  Button,
  TextInput,
  Textarea,
  PasswordInput,
  Stack,
  Group,
  Badge,
  Alert,
  Text,
  Title,
  Checkbox,
  Switch,
  Select,
  Progress,
  Loader,
  Divider,
  Modal,
  useDisclosure,
  Card,
  Table,
  Tabs,
  Menu,
  Accordion,
  Avatar,
  AvatarGroup,
  Pagination,
  SegmentedControl,
  Breadcrumb,
  NavLink,
  toast,
} from '@mikata/ui';

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
// Demo 7: UI Component Library
// ============================================================
function UIComponentsDemo() {
  // ThemeProvider sets CSS variables and provides context via provide()
  const themeEl = ThemeProvider({}) as HTMLElement;

  // ThemeProvider uses display:contents (no visual box), so add a wrapper
  // that picks up the CSS variables for background + text color
  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '8px',
    transition: 'background 150ms, color 150ms',
  });

  // Render inner content as a child component so it can access useTheme()
  wrapper.appendChild(_createComponent(UIContent, {}));
  themeEl.appendChild(wrapper);
  return themeEl;
}

/**
 * Inner content of the UI demo. Runs as a child component so it can
 * inject the ThemeContext provided by ThemeProvider above.
 */
function UIContent() {
  const { setColorScheme, resolvedColorScheme } = useTheme();
  const [progressVal, setProgressVal] = signal(0);
  const { opened: modalOpened, open: openModal, close: closeModal } = useDisclosure(false);

  // Animate progress bar
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  function startProgress() {
    setProgressVal(0);
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      setProgressVal((v) => {
        if (v >= 100) {
          if (progressTimer) clearInterval(progressTimer);
          return 100;
        }
        return v + 5;
      });
    }, 100);
  }

  const el = _createElement('div');

  // ─── Section: Theme Controls ──────────────────────
  const themeSection = _createElement('div');
  _setProp(themeSection, 'style', { marginBottom: '1.5rem' });

  themeSection.appendChild(Title({ order: 2, children: 'UI Component Library' }));
  themeSection.appendChild(Text({
    size: 'sm',
    children: 'These components are from @mikata/ui — fully themed, accessible, and composable.',
  }));

  themeSection.appendChild(Group({ gap: 'sm', children: [
    Switch({
      label: 'Dark mode',
      onChange: () => {
        const current = resolvedColorScheme();
        setColorScheme(current === 'dark' ? 'light' : 'dark');
      },
    }),
  ] }));
  el.appendChild(themeSection);

  // ─── Section: Badges ──────────────────────────────
  const badgeSection = _createElement('div');
  _setProp(badgeSection, 'style', { marginBottom: '1.5rem' });
  badgeSection.appendChild(Title({ order: 3, children: 'Badges' }));
  badgeSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Badge({ color: 'primary', children: 'Primary' }),
    Badge({ color: 'green', children: 'Success' }),
    Badge({ color: 'red', children: 'Error' }),
    Badge({ color: 'yellow', variant: 'light', children: 'Warning' }),
    Badge({ color: 'violet', variant: 'outline', children: 'New' }),
    Badge({ variant: 'dot', color: 'green', children: 'Online' }),
  ] }));
  el.appendChild(badgeSection);

  // ─── Section: Buttons ─────────────────────────────
  const btnSection = _createElement('div');
  _setProp(btnSection, 'style', { marginBottom: '1.5rem' });
  btnSection.appendChild(Title({ order: 3, children: 'Buttons' }));
  btnSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Button({ variant: 'filled', children: 'Filled' }),
    Button({ variant: 'outline', children: 'Outline' }),
    Button({ variant: 'light', children: 'Light' }),
    Button({ variant: 'subtle', children: 'Subtle' }),
    Button({ variant: 'filled', color: 'red', children: 'Delete' }),
    Button({ variant: 'filled', color: 'green', children: 'Confirm' }),
    Button({ loading: true, children: 'Loading...' }),
    Button({ disabled: true, children: 'Disabled' }),
  ] }));
  el.appendChild(btnSection);

  // ─── Section: Alerts ──────────────────────────────
  const alertSection = _createElement('div');
  _setProp(alertSection, 'style', { marginBottom: '1.5rem' });
  alertSection.appendChild(Title({ order: 3, children: 'Alerts' }));
  alertSection.appendChild(Stack({ gap: 'sm', children: [
    Alert({ color: 'blue', title: 'Information', children: 'This is a helpful notice for users.' }),
    Alert({ color: 'green', title: 'Success', children: 'Your changes have been saved.' }),
    Alert({
      color: 'red',
      title: 'Error',
      closable: true,
      onClose: () => console.log('Alert closed'),
      children: 'Something went wrong. Please try again.',
    }),
    Alert({ color: 'yellow', title: 'Warning', children: 'This action cannot be undone.' }),
  ] }));
  el.appendChild(alertSection);

  // ─── Section: Progress ────────────────────────────
  const progressSection = _createElement('div');
  _setProp(progressSection, 'style', { marginBottom: '1.5rem' });
  progressSection.appendChild(Title({ order: 3, children: 'Progress' }));

  const progressBar = Progress({ value: 0, color: 'primary' });
  effect(() => {
    const bar = progressBar.querySelector('.mkt-progress__bar') as HTMLElement;
    if (bar) bar.style.width = `${progressVal()}%`;
    progressBar.setAttribute('aria-valuenow', String(progressVal()));
  });
  progressSection.appendChild(progressBar);
  progressSection.appendChild(Button({
    variant: 'light',
    children: 'Start Progress',
    onClick: startProgress,
  }));
  el.appendChild(progressSection);

  // ─── Section: Loader ──────────────────────────────
  const loaderSection = _createElement('div');
  _setProp(loaderSection, 'style', { marginBottom: '1.5rem' });
  loaderSection.appendChild(Title({ order: 3, children: 'Loader' }));
  loaderSection.appendChild(Group({ gap: 'md', children: [
    Loader({ size: 'xs' }),
    Loader({ size: 'sm' }),
    Loader({ size: 'md' }),
    Loader({ size: 'lg' }),
    Loader({ size: 'xl' }),
  ] }));
  el.appendChild(loaderSection);

  el.appendChild(Divider({}));

  // ─── Section: Form ────────────────────────────────
  const formSection = _createElement('div');
  _setProp(formSection, 'style', { marginBottom: '1.5rem' });
  formSection.appendChild(Title({ order: 3, children: 'Form Inputs' }));

  const formStack = Stack({ gap: 'sm', children: [
    TextInput({
      label: 'Full Name',
      placeholder: 'John Doe',
      description: 'Your display name',
      required: true,
    }),
    TextInput({
      label: 'Email',
      placeholder: 'john@example.com',
      required: true,
    }),
    PasswordInput({
      label: 'Password',
      placeholder: 'At least 8 characters',
      required: true,
    }),
    Textarea({
      label: 'Bio',
      placeholder: 'Tell us about yourself...',
      description: 'Optional',
    }),
    Select({
      label: 'Role',
      data: [
        { value: 'admin', label: 'Administrator' },
        { value: 'editor', label: 'Editor' },
        { value: 'user', label: 'User' },
        { value: 'viewer', label: 'Viewer', disabled: true },
      ],
      value: 'user',
      placeholder: 'Select a role',
    }),
    Checkbox({ label: 'I agree to the terms and conditions', color: 'primary' }),
    Switch({ label: 'Enable email notifications', color: 'primary' }),
  ] });
  formSection.appendChild(formStack);

  const formSubmitRow = Group({ gap: 'sm', children: [
    Button({
      variant: 'filled',
      children: 'Create Account',
      onClick: openModal,
    }),
    Button({ variant: 'outline', children: 'Cancel' }),
  ] });
  formSection.appendChild(formSubmitRow);
  el.appendChild(formSection);

  // ─── Section: Modal ───────────────────────────────
  const modalSection = _createElement('div');
  _setProp(modalSection, 'style', { marginBottom: '1.5rem' });
  modalSection.appendChild(Title({ order: 3, children: 'Modal' }));
  modalSection.appendChild(Button({
    variant: 'outline',
    children: 'Open Modal',
    onClick: openModal,
  }));
  el.appendChild(modalSection);

  // Conditionally show modal (reactively)
  const modalContainer = _createElement('div');
  _insert(modalContainer, () =>
    show(
      () => modalOpened(),
      () => {
        const bodyText = _createElement('div');
        bodyText.appendChild(Text({ children: 'This is a modal dialog from @mikata/ui.' }));
        bodyText.appendChild(Text({ size: 'sm', children: 'It includes focus trapping, scroll lock, and closes on Escape.' }));

        return Modal({
          title: 'Example Modal',
          size: 'md',
          centered: true,
          onClose: closeModal,
          children: bodyText,
        });
      }
    )
  );
  el.appendChild(modalContainer);

  el.appendChild(Divider({}));

  // ─── Section: Card ───────────────────────────────
  const cardSection = _createElement('div');
  _setProp(cardSection, 'style', { marginBottom: '1.5rem' });
  cardSection.appendChild(Title({ order: 3, children: 'Card' }));
  cardSection.appendChild(Group({ gap: 'md', wrap: true, children: [
    Card({
      shadow: 'sm',
      padding: 'md',
      withBorder: true,
      header: 'Card Header',
      footer: Button({ variant: 'light', size: 'sm', children: 'View Details' }),
      children: Text({ size: 'sm', children: 'Cards are containers for grouping related content and actions.' }),
    }),
    Card({
      shadow: 'md',
      padding: 'lg',
      children: Text({ children: 'A simple card without header or footer.' }),
    }),
  ] }));
  el.appendChild(cardSection);

  // ─── Section: Table ──────────────────────────────
  const tableSection = _createElement('div');
  _setProp(tableSection, 'style', { marginBottom: '1.5rem' });
  tableSection.appendChild(Title({ order: 3, children: 'Table' }));
  tableSection.appendChild(Table({
    striped: true,
    highlightOnHover: true,
    withBorder: true,
    columns: [
      { key: 'name', title: 'Name' },
      { key: 'role', title: 'Role' },
      { key: 'email', title: 'Email' },
      { key: 'status', title: 'Status', render: (row: any) => Badge({ color: row.status === 'Active' ? 'green' : 'gray', size: 'sm', children: row.status }) },
    ],
    data: [
      { name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com', status: 'Active' },
      { name: 'Bob Smith', role: 'Editor', email: 'bob@example.com', status: 'Active' },
      { name: 'Carol White', role: 'Viewer', email: 'carol@example.com', status: 'Inactive' },
      { name: 'Dave Brown', role: 'Editor', email: 'dave@example.com', status: 'Active' },
    ],
  }));
  el.appendChild(tableSection);

  // ─── Section: Tabs ───────────────────────────────
  const tabsSection = _createElement('div');
  _setProp(tabsSection, 'style', { marginBottom: '1.5rem' });
  tabsSection.appendChild(Title({ order: 3, children: 'Tabs' }));
  tabsSection.appendChild(Tabs({
    items: [
      { value: 'overview', label: 'Overview', content: Text({ children: 'This is the overview panel. Tabs support keyboard navigation with arrow keys.' }) },
      { value: 'features', label: 'Features', content: Text({ children: 'Variants: default, outline, pills. Orientation: horizontal or vertical.' }) },
      { value: 'disabled', label: 'Disabled', content: 'This tab is disabled', disabled: true },
      { value: 'code', label: 'Code', content: Text({ children: 'Use the Tabs component with an items array defining value, label, and content.' }) },
    ],
    color: 'primary',
  }));
  tabsSection.appendChild(Text({ size: 'sm', children: 'Pills variant:', class: 'mkt-mt-2' }));
  tabsSection.appendChild(Tabs({
    variant: 'pills',
    color: 'violet',
    items: [
      { value: 'react', label: 'React', content: 'React content' },
      { value: 'vue', label: 'Vue', content: 'Vue content' },
      { value: 'solid', label: 'Solid', content: 'Solid content' },
    ],
  }));
  el.appendChild(tabsSection);

  // ─── Section: Accordion ──────────────────────────
  const accordionSection = _createElement('div');
  _setProp(accordionSection, 'style', { marginBottom: '1.5rem' });
  accordionSection.appendChild(Title({ order: 3, children: 'Accordion' }));
  accordionSection.appendChild(Accordion({
    variant: 'separated',
    items: [
      { value: 'a11y', label: 'Accessibility', content: 'All components follow WAI-ARIA guidelines with proper roles, keyboard navigation, and screen reader support.' },
      { value: 'theming', label: 'Theming', content: 'CSS variables power the entire theme system. Override tokens via ThemeProvider or plain CSS.' },
      { value: 'perf', label: 'Performance', content: 'No CSS-in-JS runtime. Styles are plain CSS with data-attribute selectors. Zero JavaScript overhead for styling.' },
    ],
    defaultValue: 'a11y',
  }));
  el.appendChild(accordionSection);

  // ─── Section: Menu ───────────────────────────────
  const menuSection = _createElement('div');
  _setProp(menuSection, 'style', { marginBottom: '1.5rem' });
  menuSection.appendChild(Title({ order: 3, children: 'Menu' }));
  menuSection.appendChild(Menu({
    target: Button({ variant: 'outline', children: 'Actions \u25BE' }),
    items: [
      { type: 'label', label: 'Application' },
      { label: 'Settings', onClick: () => console.log('Settings clicked') },
      { label: 'Messages', onClick: () => console.log('Messages clicked') },
      { type: 'divider' },
      { type: 'label', label: 'Danger zone' },
      { label: 'Delete account', color: 'red', onClick: () => console.log('Delete clicked') },
    ],
  }));
  el.appendChild(menuSection);

  // ─── Section: Avatar ─────────────────────────────
  const avatarSection = _createElement('div');
  _setProp(avatarSection, 'style', { marginBottom: '1.5rem' });
  avatarSection.appendChild(Title({ order: 3, children: 'Avatar' }));
  avatarSection.appendChild(Group({ gap: 'md', children: [
    Avatar({ name: 'Alice Johnson', color: 'blue' }),
    Avatar({ name: 'Bob Smith', color: 'red', variant: 'filled' }),
    Avatar({ color: 'green', size: 'lg' }),
    Avatar({ name: 'Carol White', color: 'violet', size: 'xl', variant: 'outline' }),
  ] }));
  avatarSection.appendChild(Text({ size: 'sm', children: 'Avatar Group:' }));
  avatarSection.appendChild(AvatarGroup({ spacing: 'sm', children: [
    Avatar({ name: 'A B', color: 'blue', variant: 'filled' }),
    Avatar({ name: 'C D', color: 'red', variant: 'filled' }),
    Avatar({ name: 'E F', color: 'green', variant: 'filled' }),
    Avatar({ name: '+3', color: 'gray', variant: 'filled' }),
  ] }));
  el.appendChild(avatarSection);

  // ─── Section: Breadcrumb ─────────────────────────
  const breadcrumbSection = _createElement('div');
  _setProp(breadcrumbSection, 'style', { marginBottom: '1.5rem' });
  breadcrumbSection.appendChild(Title({ order: 3, children: 'Breadcrumb' }));
  breadcrumbSection.appendChild(Breadcrumb({
    items: [
      { label: 'Home', href: '#' },
      { label: 'Components', href: '#' },
      { label: 'Breadcrumb' },
    ],
  }));
  el.appendChild(breadcrumbSection);

  // ─── Section: Pagination ─────────────────────────
  const paginationSection = _createElement('div');
  _setProp(paginationSection, 'style', { marginBottom: '1.5rem' });
  paginationSection.appendChild(Title({ order: 3, children: 'Pagination' }));
  paginationSection.appendChild(Pagination({
    total: 20,
    defaultValue: 5,
    onChange: (page) => console.log('Page:', page),
  }));
  el.appendChild(paginationSection);

  // ─── Section: SegmentedControl ───────────────────
  const segmentedSection = _createElement('div');
  _setProp(segmentedSection, 'style', { marginBottom: '1.5rem' });
  segmentedSection.appendChild(Title({ order: 3, children: 'Segmented Control' }));
  segmentedSection.appendChild(SegmentedControl({
    data: ['Preview', 'Code', 'Export'],
    defaultValue: 'Preview',
    onChange: (val) => console.log('Segment:', val),
  }));
  el.appendChild(segmentedSection);

  // ─── Section: NavLink ────────────────────────────
  const navSection = _createElement('div');
  _setProp(navSection, 'style', { marginBottom: '1.5rem', maxWidth: '280px' });
  navSection.appendChild(Title({ order: 3, children: 'NavLink' }));
  navSection.appendChild(NavLink({
    label: 'Dashboard',
    active: true,
    onClick: () => console.log('Dashboard'),
  }));
  navSection.appendChild(NavLink({
    label: 'Settings',
    description: 'App configuration',
    children: [
      NavLink({ label: 'General', onClick: () => console.log('General') }),
      NavLink({ label: 'Security', onClick: () => console.log('Security') }),
      NavLink({ label: 'Notifications', disabled: true }),
    ],
  }));
  navSection.appendChild(NavLink({
    label: 'Users',
    onClick: () => console.log('Users'),
  }));
  el.appendChild(navSection);

  // ─── Section: Toast ──────────────────────────────
  const toastSection = _createElement('div');
  _setProp(toastSection, 'style', { marginBottom: '1.5rem' });
  toastSection.appendChild(Title({ order: 3, children: 'Toast / Notifications' }));
  toastSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Button({
      variant: 'filled',
      color: 'green',
      children: 'Success',
      onClick: () => toast.success('Changes saved successfully!', { title: 'Saved' }),
    }),
    Button({
      variant: 'filled',
      color: 'red',
      children: 'Error',
      onClick: () => toast.error('Something went wrong!', { title: 'Error' }),
    }),
    Button({
      variant: 'filled',
      color: 'yellow',
      children: 'Warning',
      onClick: () => toast.warning('This action cannot be undone.'),
    }),
    Button({
      variant: 'filled',
      color: 'blue',
      children: 'Info',
      onClick: () => toast.info('New version available.', { title: 'Update' }),
    }),
  ] }));
  el.appendChild(toastSection);

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

  el.appendChild(_createComponent(UIComponentsDemo, {}));
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
