import { render } from '@mikata/runtime';
import { signal, computed, reactive, effect, onCleanup } from '@mikata/reactivity';
import { createStore } from '@mikata/store';
import { createI18n, provideI18n, useI18n } from '@mikata/i18n';
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
import enMessages from './locales/en.json';
import jaMessages from './locales/ja.json';

// ============================================================
// i18n Setup
// ============================================================
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: enMessages,
    ja: jaMessages,
  },
});

// ============================================================
// Demo 1: Counter (signals + computed + refs)
// ============================================================
function Counter() {
  const { t } = useI18n();
  const [count, setCount] = signal(0);
  const doubled = computed(() => count() * 2);
  const displayRef = createRef<HTMLParagraphElement>();

  onMount(() => {
    console.log('Counter mounted! Display ref:', displayRef.current);
  });

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.appendChild(t.node('counter.title'));
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
  resetBtn.appendChild(t.node('counter.reset'));
  resetBtn.addEventListener('click', () => setCount(0));
  el.appendChild(resetBtn);

  return el;
}

// ============================================================
// Demo 2: Form bindings (model + refs)
// ============================================================
function FormDemo() {
  const { t } = useI18n();
  const [name, setName] = signal('');
  const [age, setAge] = signal(0);
  const [agree, setAgree] = signal(false);
  const [color, setColor] = signal('blue');
  const nameRef = createRef<HTMLInputElement>();

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.appendChild(t.node('formBindings.title'));
  el.appendChild(h2);

  // Text input with model()
  const nameLabel = _createElement('label');
  nameLabel.appendChild(t.node('formBindings.name'));
  const nameInput = _createElement('input') as HTMLInputElement;
  _setProp(nameInput, 'ref', nameRef);
  effect(() => { nameInput.placeholder = t('formBindings.namePlaceholder'); });
  _spread(nameInput, () => model(name, setName));
  nameLabel.appendChild(nameInput);
  el.appendChild(nameLabel);

  // Number input
  const ageLabel = _createElement('label');
  ageLabel.appendChild(t.node('formBindings.age'));
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
  agreeLabel.appendChild(t.node('formBindings.agree'));
  el.appendChild(agreeLabel);

  // Select
  const colorLabel = _createElement('label');
  colorLabel.appendChild(t.node('formBindings.color'));
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
  _insert(output, () => `${name() || '?'}, age ${age()}, ${agree() ? t('formBindings.agreed') : t('formBindings.notAgreed')}`);
  effect(() => {
    _setProp(output, 'style', { color: color(), fontWeight: 'bold' });
  });
  el.appendChild(output);

  // Focus button
  const focusBtn = _createElement('button');
  focusBtn.appendChild(t.node('formBindings.focusName'));
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
  const { t } = useI18n();
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
  h2.appendChild(t.node('todo.title'));
  el.appendChild(h2);

  // Input row
  const inputRow = _createElement('div');
  const input = _createElement('input') as HTMLInputElement;
  effect(() => { input.placeholder = t('todo.placeholder'); });
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
  addBtn.appendChild(t.node('todo.add'));
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
          empty.appendChild(t.node('todo.empty'));
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
    const doneCount = state.todos.filter((td) => td.done).length;
    return t('todo.completed', { done: doneCount, total });
  });
  el.appendChild(countDisplay);

  return el;
}

// ============================================================
// Demo 4: Conditional rendering (show + switchMatch)
// ============================================================
function ConditionalDemo() {
  const { t } = useI18n();
  const [status, setStatus] = signal<'loading' | 'success' | 'error'>('loading');

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.appendChild(t.node('conditional.title'));
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
        p.appendChild(t.node('conditional.loading'));
        return p;
      },
      success: () => {
        const p = _createElement('p');
        p.appendChild(t.node('conditional.success'));
        return p;
      },
      error: () => {
        const p = _createElement('p');
        p.appendChild(t.node('conditional.error'));
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
  const { t } = useI18n();
  const [showModal, setShowModal] = signal(false);

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.appendChild(t.node('portal.title'));
  el.appendChild(h2);

  const toggleBtn = _createElement('button');
  toggleBtn.appendChild(t.node('portal.toggle'));
  toggleBtn.addEventListener('click', () => setShowModal((v) => !v));
  el.appendChild(toggleBtn);

  const status = _createElement('p');
  _insert(status, () => showModal() ? t('portal.open') : t('portal.closed'));
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
          title.appendChild(t.node('portal.modalTitle'));
          modal.appendChild(title);

          const body = _createElement('p');
          body.appendChild(t.node('portal.modalBody'));
          modal.appendChild(body);

          const closeBtn = _createElement('button');
          closeBtn.appendChild(t.node('portal.close'));
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
  const { t } = useI18n();
  const [shouldThrow, setShouldThrow] = signal(false);

  const el = _createElement('div');
  _setProp(el, 'class', 'card');

  const h2 = _createElement('h2');
  h2.appendChild(t.node('errorBoundary.title'));
  el.appendChild(h2);

  const toggleBtn = _createElement('button');
  toggleBtn.appendChild(t.node('errorBoundary.toggleError'));
  toggleBtn.addEventListener('click', () => setShouldThrow((v) => !v));
  el.appendChild(toggleBtn);

  const boundaryContainer = _createElement('div');
  _insert(boundaryContainer, () =>
    _createComponent(ErrorBoundary, {
      fallback: (err: Error, reset: () => void) => {
        const wrapper = _createElement('div');
        _setProp(wrapper, 'style', { color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '4px' });

        const msg = _createElement('p');
        msg.appendChild(t.node('errorBoundary.caught', { message: err.message }));
        wrapper.appendChild(msg);

        const retryBtn = _createElement('button');
        retryBtn.appendChild(t.node('errorBoundary.reset'));
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
        safe.appendChild(t.node('errorBoundary.safe'));
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
  const { t, locale, setLocale } = useI18n();
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

  themeSection.appendChild(Title({ order: 2, children: t.node('ui.title') }));
  themeSection.appendChild(Text({ size: 'sm', children: t.node('ui.description') }));

  themeSection.appendChild(Group({ gap: 'md', align: 'end', children: [
    Switch({
      label: t.node('ui.darkMode'),
      onChange: () => {
        const current = resolvedColorScheme();
        setColorScheme(current === 'dark' ? 'light' : 'dark');
      },
    }),
    Select({
      label: t.node('ui.language'),
      data: [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
      ],
      value: 'en',
      onChange: (e) => setLocale((e.target as HTMLSelectElement).value),
    }),
  ] }));
  el.appendChild(themeSection);

  // ─── Section: Badges ──────────────────────────────
  const badgeSection = _createElement('div');
  _setProp(badgeSection, 'style', { marginBottom: '1.5rem' });
  badgeSection.appendChild(Title({ order: 3, children: t.node('badges.title') }));
  badgeSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Badge({ color: 'primary', children: t.node('badges.primary') }),
    Badge({ color: 'green', children: t.node('badges.success') }),
    Badge({ color: 'red', children: t.node('badges.error') }),
    Badge({ color: 'yellow', variant: 'light', children: t.node('badges.warning') }),
    Badge({ color: 'violet', variant: 'outline', children: t.node('badges.new') }),
    Badge({ variant: 'dot', color: 'green', children: t.node('badges.online') }),
  ] }));
  el.appendChild(badgeSection);

  // ─── Section: Buttons ─────────────────────────────
  const btnSection = _createElement('div');
  _setProp(btnSection, 'style', { marginBottom: '1.5rem' });
  btnSection.appendChild(Title({ order: 3, children: t.node('buttons.title') }));
  btnSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Button({ variant: 'filled', children: t.node('buttons.filled') }),
    Button({ variant: 'outline', children: t.node('buttons.outline') }),
    Button({ variant: 'light', children: t.node('buttons.light') }),
    Button({ variant: 'subtle', children: t.node('buttons.subtle') }),
    Button({ variant: 'filled', color: 'red', children: t.node('buttons.delete') }),
    Button({ variant: 'filled', color: 'green', children: t.node('buttons.confirm') }),
    Button({ loading: true, children: t.node('buttons.loading') }),
    Button({ disabled: true, children: t.node('buttons.disabled') }),
  ] }));
  el.appendChild(btnSection);

  // ─── Section: Alerts ──────────────────────────────
  const alertSection = _createElement('div');
  _setProp(alertSection, 'style', { marginBottom: '1.5rem' });
  alertSection.appendChild(Title({ order: 3, children: t.node('alerts.title') }));
  alertSection.appendChild(Stack({ gap: 'sm', children: [
    Alert({ color: 'blue', title: t.node('alerts.infoTitle'), children: t.node('alerts.infoMessage') }),
    Alert({ color: 'green', title: t.node('alerts.successTitle'), children: t.node('alerts.successMessage') }),
    Alert({
      color: 'red',
      title: t.node('alerts.errorTitle'),
      closable: true,
      onClose: () => console.log('Alert closed'),
      children: t.node('alerts.errorMessage'),
    }),
    Alert({ color: 'yellow', title: t.node('alerts.warningTitle'), children: t.node('alerts.warningMessage') }),
  ] }));
  el.appendChild(alertSection);

  // ─── Section: Progress ────────────────────────────
  const progressSection = _createElement('div');
  _setProp(progressSection, 'style', { marginBottom: '1.5rem' });
  progressSection.appendChild(Title({ order: 3, children: t.node('progress.title') }));

  const progressBar = Progress({ value: 0, color: 'primary' });
  effect(() => {
    const bar = progressBar.querySelector('.mkt-progress__bar') as HTMLElement;
    if (bar) bar.style.width = `${progressVal()}%`;
    progressBar.setAttribute('aria-valuenow', String(progressVal()));
  });
  progressSection.appendChild(progressBar);
  progressSection.appendChild(Button({
    variant: 'light',
    children: t.node('progress.start'),
    onClick: startProgress,
  }));
  el.appendChild(progressSection);

  // ─── Section: Loader ──────────────────────────────
  const loaderSection = _createElement('div');
  _setProp(loaderSection, 'style', { marginBottom: '1.5rem' });
  loaderSection.appendChild(Title({ order: 3, children: t.node('loader.title') }));
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
  formSection.appendChild(Title({ order: 3, children: t.node('form.title') }));

  const formStack = Stack({ gap: 'sm', children: [
    TextInput({
      label: t.node('form.fullName'),
      placeholder: t('form.fullNamePlaceholder'),
      description: t.node('form.displayName'),
      required: true,
    }),
    TextInput({
      label: t.node('form.email'),
      placeholder: t('form.emailPlaceholder'),
      required: true,
    }),
    PasswordInput({
      label: t.node('form.password'),
      placeholder: t('form.passwordPlaceholder'),
      required: true,
    }),
    Textarea({
      label: t.node('form.bio'),
      placeholder: t('form.bioPlaceholder'),
      description: t.node('form.optional'),
    }),
    Select({
      label: t.node('form.role'),
      data: [
        { value: 'admin', label: t('form.roleAdmin') },
        { value: 'editor', label: t('form.roleEditor') },
        { value: 'user', label: t('form.roleUser') },
        { value: 'viewer', label: t('form.roleViewer'), disabled: true },
      ],
      value: 'user',
      placeholder: t('form.rolePlaceholder'),
    }),
    Checkbox({ label: t.node('form.agreeTerms'), color: 'primary' }),
    Switch({ label: t.node('form.emailNotifications'), color: 'primary' }),
  ] });
  formSection.appendChild(formStack);

  const formSubmitRow = Group({ gap: 'sm', children: [
    Button({
      variant: 'filled',
      children: t.node('form.createAccount'),
      onClick: openModal,
    }),
    Button({ variant: 'outline', children: t.node('buttons.cancel') }),
  ] });
  formSection.appendChild(formSubmitRow);
  el.appendChild(formSection);

  // ─── Section: Modal ───────────────────────────────
  const modalSection = _createElement('div');
  _setProp(modalSection, 'style', { marginBottom: '1.5rem' });
  modalSection.appendChild(Title({ order: 3, children: t.node('modal.title') }));
  modalSection.appendChild(Button({
    variant: 'outline',
    children: t.node('modal.openModal'),
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
        bodyText.appendChild(Text({ children: t.node('modal.body') }));
        bodyText.appendChild(Text({ size: 'sm', children: t.node('modal.bodyDetail') }));

        return Modal({
          title: t.node('modal.exampleTitle'),
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
  cardSection.appendChild(Title({ order: 3, children: t.node('card.title') }));
  cardSection.appendChild(Group({ gap: 'md', wrap: true, children: [
    Card({
      shadow: 'sm',
      padding: 'md',
      withBorder: true,
      header: t.node('card.header'),
      footer: Button({ variant: 'light', size: 'sm', children: t.node('card.viewDetails') }),
      children: Text({ size: 'sm', children: t.node('card.cardDescription') }),
    }),
    Card({
      shadow: 'md',
      padding: 'lg',
      children: Text({ children: t.node('card.simpleCard') }),
    }),
  ] }));
  el.appendChild(cardSection);

  // ─── Section: Table ──────────────────────────────
  const tableSection = _createElement('div');
  _setProp(tableSection, 'style', { marginBottom: '1.5rem' });
  tableSection.appendChild(Title({ order: 3, children: t.node('table.title') }));
  tableSection.appendChild(Table({
    striped: true,
    highlightOnHover: true,
    withBorder: true,
    columns: [
      { key: 'name', title: t('table.colName') },
      { key: 'role', title: t('table.colRole') },
      { key: 'email', title: t('table.colEmail') },
      { key: 'status', title: t('table.colStatus'), render: (row: any) => Badge({ color: row.active ? 'green' : 'gray', size: 'sm', children: row.active ? t('table.statusActive') : t('table.statusInactive') }) },
    ],
    data: [
      { name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com', active: true },
      { name: 'Bob Smith', role: 'Editor', email: 'bob@example.com', active: true },
      { name: 'Carol White', role: 'Viewer', email: 'carol@example.com', active: false },
      { name: 'Dave Brown', role: 'Editor', email: 'dave@example.com', active: true },
    ],
  }));
  el.appendChild(tableSection);

  // ─── Section: Tabs ───────────────────────────────
  const tabsSection = _createElement('div');
  _setProp(tabsSection, 'style', { marginBottom: '1.5rem' });
  tabsSection.appendChild(Title({ order: 3, children: t.node('tabs.title') }));
  tabsSection.appendChild(Tabs({
    items: [
      { value: 'overview', label: t.node('tabs.overview'), content: Text({ children: t.node('tabs.overviewContent') }) },
      { value: 'features', label: t.node('tabs.features'), content: Text({ children: t.node('tabs.featuresContent') }) },
      { value: 'disabled', label: t.node('tabs.disabled'), content: '', disabled: true },
      { value: 'code', label: t.node('tabs.code'), content: Text({ children: t.node('tabs.codeContent') }) },
    ],
    color: 'primary',
  }));
  tabsSection.appendChild(Text({ size: 'sm', children: t.node('tabs.pillsVariant'), class: 'mkt-mt-2' }));
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
  accordionSection.appendChild(Title({ order: 3, children: t.node('accordion.title') }));
  accordionSection.appendChild(Accordion({
    variant: 'separated',
    items: [
      { value: 'a11y', label: t.node('accordion.a11yLabel'), content: t.node('accordion.a11yContent') },
      { value: 'theming', label: t.node('accordion.themingLabel'), content: t.node('accordion.themingContent') },
      { value: 'perf', label: t.node('accordion.perfLabel'), content: t.node('accordion.perfContent') },
    ],
    defaultValue: 'a11y',
  }));
  el.appendChild(accordionSection);

  // ─── Section: Menu ───────────────────────────────
  const menuSection = _createElement('div');
  _setProp(menuSection, 'style', { marginBottom: '1.5rem' });
  menuSection.appendChild(Title({ order: 3, children: t.node('menu.title') }));
  menuSection.appendChild(Menu({
    target: Button({ variant: 'outline', children: t.node('menu.actions') }),
    items: [
      { type: 'label', label: t.node('menu.appLabel') },
      { label: t.node('menu.settings'), onClick: () => console.log('Settings clicked') },
      { label: t.node('menu.messages'), onClick: () => console.log('Messages clicked') },
      { type: 'divider' },
      { type: 'label', label: t.node('menu.dangerLabel') },
      { label: t.node('menu.deleteAccount'), color: 'red', onClick: () => console.log('Delete clicked') },
    ],
  }));
  el.appendChild(menuSection);

  // ─── Section: Avatar ─────────────────────────────
  const avatarSection = _createElement('div');
  _setProp(avatarSection, 'style', { marginBottom: '1.5rem' });
  avatarSection.appendChild(Title({ order: 3, children: t.node('avatar.title') }));
  avatarSection.appendChild(Group({ gap: 'md', children: [
    Avatar({ name: 'Alice Johnson', color: 'blue' }),
    Avatar({ name: 'Bob Smith', color: 'red', variant: 'filled' }),
    Avatar({ color: 'green', size: 'lg' }),
    Avatar({ name: 'Carol White', color: 'violet', size: 'xl', variant: 'outline' }),
  ] }));
  avatarSection.appendChild(Text({ size: 'sm', children: t.node('avatar.group') }));
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
  breadcrumbSection.appendChild(Title({ order: 3, children: t.node('breadcrumb.title') }));
  breadcrumbSection.appendChild(Breadcrumb({
    items: [
      { label: t.node('breadcrumb.home'), href: '#' },
      { label: t.node('breadcrumb.components'), href: '#' },
      { label: t.node('breadcrumb.title') },
    ],
  }));
  el.appendChild(breadcrumbSection);

  // ─── Section: Pagination ─────────────────────────
  const paginationSection = _createElement('div');
  _setProp(paginationSection, 'style', { marginBottom: '1.5rem' });
  paginationSection.appendChild(Title({ order: 3, children: t.node('pagination.title') }));
  paginationSection.appendChild(Pagination({
    total: 20,
    defaultValue: 5,
    onChange: (page) => console.log('Page:', page),
  }));
  el.appendChild(paginationSection);

  // ─── Section: SegmentedControl ───────────────────
  const segmentedSection = _createElement('div');
  _setProp(segmentedSection, 'style', { marginBottom: '1.5rem' });
  segmentedSection.appendChild(Title({ order: 3, children: t.node('segmented.title') }));
  segmentedSection.appendChild(SegmentedControl({
    data: [
      { value: 'preview', label: t.node('segmented.preview') },
      { value: 'code', label: t.node('segmented.code') },
      { value: 'export', label: t.node('segmented.export') },
    ],
    defaultValue: 'preview',
    onChange: (val) => console.log('Segment:', val),
  }));
  el.appendChild(segmentedSection);

  // ─── Section: NavLink ────────────────────────────
  const navSection = _createElement('div');
  _setProp(navSection, 'style', { marginBottom: '1.5rem', maxWidth: '280px' });
  navSection.appendChild(Title({ order: 3, children: t.node('navlink.title') }));
  navSection.appendChild(NavLink({
    label: t.node('navlink.dashboard'),
    active: true,
    onClick: () => console.log('Dashboard'),
  }));
  navSection.appendChild(NavLink({
    label: t.node('navlink.settings'),
    description: t.node('navlink.settingsDesc'),
    children: [
      NavLink({ label: t.node('navlink.general'), onClick: () => console.log('General') }),
      NavLink({ label: t.node('navlink.security'), onClick: () => console.log('Security') }),
      NavLink({ label: t.node('navlink.notifications'), disabled: true }),
    ],
  }));
  navSection.appendChild(NavLink({
    label: t.node('navlink.users'),
    onClick: () => console.log('Users'),
  }));
  el.appendChild(navSection);

  // ─── Section: Toast ──────────────────────────────
  const toastSection = _createElement('div');
  _setProp(toastSection, 'style', { marginBottom: '1.5rem' });
  toastSection.appendChild(Title({ order: 3, children: t.node('toast.title') }));
  toastSection.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Button({
      variant: 'filled',
      color: 'green',
      children: t.node('toast.success'),
      onClick: () => toast.success(t('toast.savedMessage'), { title: t('toast.savedTitle') }),
    }),
    Button({
      variant: 'filled',
      color: 'red',
      children: t.node('toast.error'),
      onClick: () => toast.error(t('toast.errorMessage'), { title: t('toast.errorTitle') }),
    }),
    Button({
      variant: 'filled',
      color: 'yellow',
      children: t.node('toast.warning'),
      onClick: () => toast.warning(t('toast.warningMessage')),
    }),
    Button({
      variant: 'filled',
      color: 'blue',
      children: t.node('toast.info'),
      onClick: () => toast.info(t('toast.infoMessage'), { title: t('toast.infoTitle') }),
    }),
  ] }));
  el.appendChild(toastSection);

  return el;
}

// ============================================================
// App — compose all demos
// ============================================================
function App() {
  provideI18n(i18n);
  const { t } = i18n;

  const el = _createElement('div');

  const h1 = _createElement('h1');
  h1.appendChild(t.node('app.title'));
  el.appendChild(h1);

  const subtitle = _createElement('p');
  subtitle.appendChild(t.node('app.subtitle'));
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
