import { render } from '@mikata/runtime';
import { signal, computed, reactive, effect, onCleanup } from '@mikata/reactivity';
import { createStore } from '@mikata/store';
import { createI18n, provideI18n, useI18n } from '@mikata/i18n';
import { createForm } from '@mikata/form';
import { createIcon, Check, Close } from '@mikata/icons';
import {
  Download as LucideDownload,
  Search as LucideSearch,
  Bell as LucideBell,
  Info as LucideInfo,
  Home as LucideHome,
  Trash2 as LucideTrash,
  Heart as LucideHeart,
  Settings as LucideSettings,
} from 'lucide';
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
  useDirection,
  createTheme,
  type MikataTheme,
  type ColorPalette,
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
  // New components
  Flex,
  SimpleGrid,
  Center,
  AspectRatio,
  Paper,
  VisuallyHidden,
  Kbd,
  Code,
  Mark,
  Blockquote,
  List,
  ListItem,
  ThemeIcon,
  ColorSwatch,
  Image,
  BackgroundImage,
  Highlight,
  Spoiler,
  Indicator,
  RingProgress,
  LoadingOverlay,
  Notification,
  Input,
  PinInput,
  Rating,
  Chip,
  ChipGroup,
  Fieldset,
  FileInput,
  FileButton,
  Collapse,
  ScrollArea,
  HoverCard,
  Timeline,
  Stepper,
  Tree,
  Autocomplete,
  MultiSelect,
  TagsInput,
  AppShell,
  Affix,
  UnstyledButton,
  Burger,
  CopyButton,
  Overlay,
  RangeSlider,
  ActionIcon,
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
  // Shares the App-level ThemeProvider — don't create a nested one, or the
  // dark-mode toggle's setColorScheme only flips this scope.
  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '8px',
    transition: 'background 150ms, color 150ms',
  });

  wrapper.appendChild(_createComponent(UIContent, {}));
  return wrapper;
}

/**
 * Inner content of the UI demo. Runs as a child component so it can
 * inject the ThemeContext provided by ThemeProvider above.
 */
function UIContent() {
  const { t, locale, setLocale } = useI18n();
  const { setColorScheme, resolvedColorScheme, direction, setDirection } = useTheme();
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
    (() => {
      const wrapper = _createElement('div');
      const label = _createElement('label');
      _setProp(label, 'style', { fontSize: '0.875rem', display: 'block', marginBottom: '4px' });
      label.textContent = 'Direction';
      wrapper.appendChild(label);
      wrapper.appendChild(SegmentedControl({
        data: [
          { value: 'ltr', label: 'LTR' },
          { value: 'rtl', label: 'RTL' },
        ],
        defaultValue: direction(),
        onChange: (v) => setDirection(v as 'ltr' | 'rtl'),
      }));
      return wrapper;
    })(),
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
// Demo 8: Extras — new components showcase
// ============================================================
function ExtrasDemo() {
  // Shares the App-level ThemeProvider — avoid nesting providers so the
  // dark-mode toggle in the UI demo also affects this section.
  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1.5rem',
    transition: 'background 150ms, color 150ms',
  });

  wrapper.appendChild(_createComponent(ExtrasContent, {}));
  return wrapper;
}

function ExtrasContent() {
  const { t } = useI18n();
  const el = _createElement('div');

  el.appendChild(Title({ order: 2, children: t.node('extras.title') }));
  el.appendChild(Text({ size: 'sm', children: t.node('extras.description') }));

  // ─── Typography ────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.typographyTitle') }));

  const typoStack = Stack({ gap: 'sm', children: [
    Group({ gap: 'xs', align: 'center', children: [
      Text({ size: 'sm', children: t.node('extras.kbdTitle') }),
      Kbd({ children: t('extras.kbdCtrl') }),
      Text({ size: 'sm', children: '+' }),
      Kbd({ children: t('extras.kbdShift') }),
      Text({ size: 'sm', children: '+' }),
      Kbd({ children: t('extras.kbdK') }),
    ] }),
    Code({ children: t('extras.codeDemo') }),
    Text({ children: (() => {
      const span = document.createElement('span');
      span.textContent = 'Contains ';
      span.appendChild(Mark({ color: 'yellow', children: t('extras.markedText') }));
      span.appendChild(document.createTextNode(' text inline.'));
      return span;
    })() }),
    Blockquote({
      color: 'primary',
      cite: t('extras.blockquoteCite'),
      children: t.node('extras.blockquote'),
    }),
    Highlight({
      highlight: t('extras.highlightTerm'),
      color: 'yellow',
      children: t('extras.highlightText'),
    }),
    Spoiler({
      maxHeight: 48,
      showLabel: t('extras.spoilerShow'),
      hideLabel: t('extras.spoilerHide'),
      children: (() => {
        const p = document.createElement('p');
        p.textContent = t('extras.spoilerContent') + ' ' + t('extras.spoilerContent');
        return p;
      })(),
    }),
    List({ children: [
      ListItem({ children: 'First item' }),
      ListItem({ children: 'Second item' }),
      ListItem({ children: 'Third item' }),
    ] }),
  ] });
  el.appendChild(typoStack);

  // ─── ThemeIcons & ColorSwatch ──────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.themeIconTitle') }));
  const icon = () => createIcon(Check, { size: 14 });
  el.appendChild(Group({ gap: 'sm', children: [
    ThemeIcon({ color: 'primary', children: icon() }),
    ThemeIcon({ color: 'green', variant: 'light', children: icon() }),
    ThemeIcon({ color: 'red', variant: 'outline', children: icon() }),
    ThemeIcon({ color: 'violet', variant: 'gradient', size: 'lg', children: icon() }),
  ] }));

  el.appendChild(Text({ size: 'sm', children: t.node('extras.colorSwatchTitle') }));
  el.appendChild(Group({ gap: 'xs', children: [
    ColorSwatch({ color: '#7c3aed' }),
    ColorSwatch({ color: '#10b981' }),
    ColorSwatch({ color: '#ef4444' }),
    ColorSwatch({ color: '#f59e0b' }),
    ColorSwatch({ color: 'transparent' }),
  ] }));

  el.appendChild(Divider({}));

  // ─── Layout ───────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.layoutTitle') }));

  const layoutGrid = SimpleGrid({ cols: 3, spacing: 'md', children: [
    Paper({ padding: 'md', withBorder: true, shadow: 'sm', children: Text({ children: t.node('extras.paperContent') }) }),
    Center({ children: Badge({ color: 'primary', children: t.node('extras.centerContent') }) }),
    AspectRatio({ ratio: 16 / 9, children: (() => {
      const d = document.createElement('div');
      d.style.background = 'var(--mkt-color-primary-1)';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'center';
      d.style.color = 'var(--mkt-color-primary-7)';
      d.style.borderRadius = 'var(--mkt-radius-sm)';
      d.textContent = '16:9';
      return d;
    })() }),
  ] });
  el.appendChild(layoutGrid);

  el.appendChild(Flex({ gap: 'sm', wrap: 'wrap', children: [
    Indicator({ label: '3', color: 'red', children: Badge({ color: 'gray', children: t.node('extras.indicatorContent') }) }),
    RingProgress({ size: 80, thickness: 8, sections: [{ value: 70, color: 'primary' }], label: Text({ size: 'sm', children: t.node('extras.ringProgressLabel') }) }),
  ] }));

  el.appendChild(Divider({}));

  // ─── Inputs & Forms ────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.chipsTitle') }));
  el.appendChild(ChipGroup({
    multiple: true,
    defaultValue: ['mikata'],
    onChange: (v) => console.log('Chips:', v),
    children: [
      Chip({ value: 'react', children: t.node('extras.chipOption1') }),
      Chip({ value: 'vue', children: t.node('extras.chipOption2') }),
      Chip({ value: 'solid', children: t.node('extras.chipOption3') }),
      Chip({ value: 'mikata', color: 'violet', children: t.node('extras.chipOption4') }),
    ],
  }));

  el.appendChild(Title({ order: 3, children: t.node('extras.ratingTitle') }));
  el.appendChild(Rating({ defaultValue: 4, fractions: 2, color: '#f59e0b' }));

  el.appendChild(Title({ order: 3, children: t.node('extras.pinTitle') }));
  el.appendChild(PinInput({ length: 6, onChange: (v) => console.log('PIN:', v) }));

  el.appendChild(Title({ order: 3, children: t.node('extras.fileTitle') }));
  el.appendChild(Stack({ gap: 'sm', children: [
    FileInput({ label: t.node('extras.fileTitle'), placeholder: t('extras.fileSelectBtn'), clearable: true }),
    FileButton({
      onChange: (f) => console.log('Picked file:', f),
      children: (open: () => void) => Button({ variant: 'outline', children: t.node('extras.fileSelectBtn'), onClick: open }),
    }),
  ] }));

  el.appendChild(Fieldset({ legend: t.node('extras.autocompleteTitle'), children: Stack({ gap: 'sm', children: [
    Autocomplete({
      label: t.node('extras.autocompleteTitle'),
      placeholder: t('extras.autocompletePlaceholder'),
      data: ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry', 'Date', 'Grape', 'Lemon', 'Mango', 'Orange', 'Pear'],
      onOptionSubmit: (v) => console.log('Autocomplete:', v),
    }),
    MultiSelect({
      label: t.node('extras.multiSelectTitle'),
      placeholder: t('extras.multiSelectPlaceholder'),
      clearable: true,
      data: [
        { value: 'js', label: 'JavaScript' },
        { value: 'ts', label: 'TypeScript' },
        { value: 'rs', label: 'Rust' },
        { value: 'go', label: 'Go' },
        { value: 'py', label: 'Python' },
      ],
      onChange: (v) => console.log('Multi:', v),
    }),
    TagsInput({
      label: t.node('extras.tagsTitle'),
      placeholder: t('extras.tagsPlaceholder'),
      defaultValue: ['one', 'two'],
      onChange: (v) => console.log('Tags:', v),
    }),
    Input({ placeholder: 'Primitive Input' }),
  ] }) }));

  el.appendChild(Divider({}));

  // ─── Navigation ────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.timelineTitle') }));
  el.appendChild(Timeline({
    active: 1,
    color: 'primary',
    items: [
      { title: t.node('extras.timelineStep1'), children: Text({ size: 'sm', children: t.node('extras.timelineStep1Desc') }) },
      { title: t.node('extras.timelineStep2'), children: Text({ size: 'sm', children: t.node('extras.timelineStep2Desc') }) },
      { title: t.node('extras.timelineStep3'), children: Text({ size: 'sm', children: t.node('extras.timelineStep3Desc') }) },
    ],
  }));

  el.appendChild(Title({ order: 3, children: t.node('extras.stepperTitle') }));
  const [activeStep, setActiveStep] = signal(1);
  const stepperContainer = _createElement('div');
  effect(() => {
    stepperContainer.textContent = '';
    stepperContainer.appendChild(Stepper({
      active: activeStep(),
      color: 'primary',
      onStepClick: (i) => setActiveStep(i),
      steps: [
        { label: t.node('extras.stepperAccount'), description: t.node('extras.stepperAccountDesc') },
        { label: t.node('extras.stepperProfile'), description: t.node('extras.stepperProfileDesc') },
        { label: t.node('extras.stepperConfirm'), description: t.node('extras.stepperConfirmDesc') },
      ],
    }));
    stepperContainer.appendChild(Group({ gap: 'sm', children: [
      Button({ variant: 'outline', children: 'Prev', onClick: () => setActiveStep(Math.max(0, activeStep() - 1)) }),
      Button({ children: 'Next', onClick: () => setActiveStep(Math.min(3, activeStep() + 1)) }),
    ] }));
  });
  el.appendChild(stepperContainer);

  el.appendChild(Title({ order: 3, children: t.node('extras.treeTitle') }));
  el.appendChild(Tree({
    defaultExpanded: ['src'],
    data: [
      {
        value: 'src',
        label: t('extras.treeSrc'),
        children: [
          { value: 'components', label: t('extras.treeComponents'), children: [
            { value: 'button', label: 'Button' },
            { value: 'input', label: 'Input' },
          ] },
          { value: 'utils', label: t('extras.treeUtils') },
        ],
      },
      { value: 'tests', label: t('extras.treeTests') },
    ],
    onSelect: (v) => console.log('Tree:', v),
  }));

  el.appendChild(Divider({}));

  // ─── Overlays & Feedback ───────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.hoverCardTitle') }));
  el.appendChild(HoverCard({
    position: 'bottom',
    withArrow: true,
    target: Button({ variant: 'outline', children: t.node('extras.hoverCardTitle') }),
    children: Text({ size: 'sm', children: t.node('extras.hoverCardBody') }),
  }));

  el.appendChild(Notification({
    title: t.node('extras.notificationTitle'),
    color: 'primary',
    onClose: () => console.log('Notification closed'),
    children: t.node('extras.notificationDesc'),
  }));

  // Loading overlay demo inside a Paper wrapper
  const loadingWrap = Paper({ padding: 'md', withBorder: true, children: (() => {
    const inner = _createElement('div');
    _setProp(inner, 'style', { position: 'relative', minHeight: '100px' });
    const label = _createElement('div');
    label.textContent = 'Content behind overlay';
    inner.appendChild(label);
    inner.appendChild(LoadingOverlay({ visible: true }));
    return inner;
  })() });
  el.appendChild(loadingWrap);

  // ─── Collapse + ScrollArea ─────────────────
  const [opened, setOpened] = signal(false);
  const toggleBtn = Button({
    variant: 'light',
    children: 'Show details',
    onClick: () => setOpened(!opened()),
  });
  effect(() => {
    const label = toggleBtn.querySelector('.mkt-button__label');
    if (label) label.textContent = opened() ? 'Hide details' : 'Show details';
  });
  el.appendChild(toggleBtn);
  el.appendChild(Collapse({
    in: () => opened(),
    children: (() => {
      const d = _createElement('div');
      _setProp(d, 'style', { padding: 'var(--mkt-space-3)' });
      d.appendChild(Text({ children: 'This content is animated via Collapse.' }));
      return d;
    })(),
  }));

  const scrollArea = ScrollArea({
    type: 'hover',
    height: 120,
    children: (() => {
      const frag = _createElement('div');
      _setProp(frag, 'style', { padding: 'var(--mkt-space-3)' });
      for (let i = 1; i <= 30; i++) {
        const p = _createElement('p');
        p.textContent = `Line ${i} — scroll to see custom scrollbars.`;
        frag.appendChild(p);
      }
      return frag;
    })(),
  });
  _setProp(scrollArea, 'style', { border: '1px solid var(--mkt-color-border)', borderRadius: 'var(--mkt-radius-sm)' });
  el.appendChild(scrollArea);

  el.appendChild(Divider({}));

  // ─── UnstyledButton + Burger ────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.unstyledTitle') }));
  const [burgerOpen, setBurgerOpen] = signal(false);
  const burgerEl = Burger({
    opened: false,
    ariaLabel: 'Toggle navigation',
    onClick: () => {
      const next = !burgerOpen();
      setBurgerOpen(next);
      if (next) burgerEl.dataset.opened = '';
      else delete burgerEl.dataset.opened;
      burgerEl.setAttribute('aria-expanded', String(next));
    },
  });
  el.appendChild(Group({ gap: 'md', align: 'center', children: [
    burgerEl,
    UnstyledButton({
      children: t.node('extras.unstyledButton'),
      onClick: () => console.log('Unstyled clicked'),
    }),
  ] }));

  // ─── CopyButton ────────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.copyTitle') }));
  el.appendChild(Group({ gap: 'sm', align: 'center', children: [
    Code({ children: t('extras.copyValue') }),
    CopyButton({
      value: t('extras.copyValue'),
      children: ({ copy, copied }) => Button({
        variant: copied ? 'filled' : 'outline',
        color: copied ? 'green' : 'primary',
        size: 'sm',
        onClick: copy,
        children: copied ? t.node('extras.copyDone') : t.node('extras.copyIdle'),
      }),
    }),
  ] }));

  // ─── Overlay ───────────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.overlayTitle') }));
  const [overlayShown, setOverlayShown] = signal(false);
  const overlayHost = _createElement('div');
  _setProp(overlayHost, 'style', {
    position: 'relative',
    padding: 'var(--mkt-space-4)',
    minHeight: '120px',
    border: '1px solid var(--mkt-color-border)',
    borderRadius: 'var(--mkt-radius-sm)',
    overflow: 'hidden',
  });
  overlayHost.appendChild(Text({ children: 'Hidden content under overlay.' }));
  overlayHost.appendChild(Text({ size: 'sm', children: 'Click the button below to dim.' }));
  effect(() => {
    const existing = overlayHost.querySelector('.mkt-overlay');
    if (existing) existing.remove();
    if (overlayShown()) {
      overlayHost.appendChild(Overlay({
        color: '#000',
        opacity: 0.55,
        blur: 3,
        onClick: () => setOverlayShown(false),
        children: Text({ children: t.node('extras.overlayContent') }),
      }));
    }
  });
  el.appendChild(overlayHost);
  el.appendChild(Button({
    variant: 'outline',
    size: 'sm',
    children: t.node('extras.overlayToggle'),
    onClick: () => setOverlayShown(!overlayShown()),
  }));

  // ─── RangeSlider ───────────────────────────────
  el.appendChild(Title({ order: 3, children: t.node('extras.rangeTitle') }));
  el.appendChild(RangeSlider({
    defaultValue: [20, 80],
    min: 0,
    max: 100,
    step: 1,
    minRange: 5,
    color: 'primary',
    label: ([a, b]) => `${t('extras.rangeLabel')}: $${a} – $${b}`,
    onValueChange: (v) => console.log('Range:', v),
  }));

  return el;
}

// ============================================================
// Demo 9: @mikata/form — signal-backed form handle
// ============================================================
function FormPackageDemo() {
  // Shares the App-level ThemeProvider.
  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1.5rem',
    transition: 'background 150ms, color 150ms',
  });
  wrapper.appendChild(_createComponent(FormPackageContent, {}));
  return wrapper;
}

let __itemCounter = 0;
const nextItemId = () => ++__itemCounter;

function FormPackageContent() {
  const { t } = useI18n();

  const form = createForm<{
    email: string;
    password: string;
    remember: boolean;
    address: { city: string };
    items: { id: number; name: string }[];
  }>({
    initialValues: {
      email: '',
      password: '',
      remember: false,
      address: { city: '' },
      items: [{ id: nextItemId(), name: '' }],
    },
    validate: {
      email: (v) =>
        !v
          ? t.node('formPkg.errRequired')
          : /@/.test(v as string)
            ? null
            : t.node('formPkg.errEmail'),
      password: (v) =>
        (v as string).length < 8 ? t.node('formPkg.errMinPw') : null,
      address: {
        city: (v) => (v ? null : t.node('formPkg.errRequired')),
      },
      items: { name: (v) => (v ? null : t.node('formPkg.errRequired')) },
    },
    validateInputOnBlur: true,
  });

  const el = _createElement('div');
  el.appendChild(Title({ order: 2, children: t.node('formPkg.title') }));
  el.appendChild(Text({ size: 'sm', children: t.node('formPkg.description') }));

  const formEl = _createElement('form') as HTMLFormElement;
  formEl.addEventListener(
    'submit',
    form.onSubmit(
      (values) => {
        toast.success(t('formPkg.submitted'));
        console.log('[form] submitted:', values);
      },
      (errors) => {
        toast.error(t('formPkg.hasErrors'));
        console.log('[form] invalid:', errors);
      }
    )
  );
  formEl.addEventListener('reset', form.onReset());

  const fields = Stack({
    gap: 'sm',
    children: [
      TextInput({
        label: t.node('formPkg.email'),
        placeholder: 'you@example.com',
        ...(form.getInputProps('email') as any),
      }),
      PasswordInput({
        label: t.node('formPkg.password'),
        ...(form.getInputProps('password') as any),
      }),
      TextInput({
        label: t.node('formPkg.city'),
        ...(form.getInputProps('address.city') as any),
      }),
      Checkbox({
        label: t.node('formPkg.remember'),
        ...(form.getInputProps('remember', { type: 'checkbox' }) as any),
      }),
    ],
  });
  formEl.appendChild(fields);

  // Dynamic list — each item bound via `items.${i}.name`.
  const listWrap = _createElement('div');
  _setProp(listWrap, 'style', { marginTop: '1rem' });
  listWrap.appendChild(
    Title({ order: 4, children: t.node('formPkg.itemsTitle') })
  );

  const listContainer = _createElement('div');
  _insert(
    listContainer,
    () =>
      each(
        () => form.values.items,
        (item, idx) => {
          const row = Group({
            gap: 'sm',
            align: 'end',
            children: [
              TextInput({
                label: t.node('formPkg.itemName'),
                ...(form.getInputProps(`items.${idx()}.name`) as any),
              }),
              ActionIcon({
                variant: 'subtle',
                color: 'red',
                'aria-label': 'Remove item',
                onClick: () => form.removeListItem('items', idx()),
                children: createIcon(Close, { size: 16 }),
              }),
            ],
          });
          return row;
        },
        () => {
          const p = _createElement('p');
          p.textContent = '—';
          return p;
        },
        { key: (item: { id: number }) => item.id }
      )
  );
  listWrap.appendChild(listContainer);

  const addBtn = Button({
    variant: 'light',
    onClick: () =>
      form.insertListItem('items', { id: nextItemId(), name: '' }),
    children: t.node('formPkg.addItem'),
  });
  listWrap.appendChild(addBtn);
  formEl.appendChild(listWrap);

  // Submit / reset row. Gate submit on isDirty + isValid.
  const submitRow = _createElement('div');
  _setProp(submitRow, 'style', {
    marginTop: '1rem',
    display: 'flex',
    gap: '0.5rem',
  });

  const submitBtn = Button({
    type: 'submit',
    children: t.node('formPkg.save'),
  }) as HTMLElement;
  const nativeSubmit =
    submitBtn.tagName === 'BUTTON'
      ? (submitBtn as HTMLButtonElement)
      : (submitBtn.querySelector('button') as HTMLButtonElement);
  effect(() => {
    const disabled = !form.isDirty() || !form.isValid();
    if (nativeSubmit) nativeSubmit.disabled = disabled;
  });
  submitRow.appendChild(submitBtn);

  submitRow.appendChild(
    Button({
      type: 'reset',
      variant: 'subtle',
      children: t.node('formPkg.reset'),
    })
  );
  formEl.appendChild(submitRow);

  el.appendChild(formEl);

  // Live status — shows dirty/valid/touched reactively so reviewers can see
  // the signals doing their job.
  const status = _createElement('p');
  _setProp(status, 'style', {
    fontSize: '0.875rem',
    opacity: '0.7',
    marginTop: '0.75rem',
  });
  _insert(status, () => {
    const dirty = form.isDirty() ? t('formPkg.yes') : t('formPkg.no');
    const valid = form.isValid() ? t('formPkg.yes') : t('formPkg.no');
    return `${t('formPkg.dirty')}: ${dirty} • ${t('formPkg.valid')}: ${valid}`;
  });
  el.appendChild(status);

  return el;
}

// ============================================================
// IconsDemo — @mikata/icons + Lucide interop
// ============================================================
function IconsDemo() {
  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1.5rem',
    transition: 'background 150ms, color 150ms',
  });
  wrapper.appendChild(_createComponent(IconsContent, {}));
  return wrapper;
}

function IconsContent() {
  const { t } = useI18n();
  const el = _createElement('div');

  el.appendChild(Title({ order: 2, children: t.node('icons.title') }));
  el.appendChild(Text({ size: 'sm', children: t.node('icons.subtitle') }));

  // Button with Lucide leftIcon
  el.appendChild(Title({ order: 4, children: t.node('icons.buttons') }));
  el.appendChild(Group({ gap: 'sm', children: [
    Button({ leftIcon: createIcon(LucideDownload, { size: 16 }), children: t.node('icons.download') }),
    Button({ variant: 'outline', leftIcon: createIcon(LucideHeart, { size: 16 }), children: t.node('icons.like') }),
    Button({ variant: 'subtle', color: 'red', leftIcon: createIcon(LucideTrash, { size: 16 }), children: t.node('icons.delete') }),
  ] }));

  // TextInput leftSection
  el.appendChild(Title({ order: 4, children: t.node('icons.inputs') }));
  el.appendChild(TextInput({
    placeholder: String(t('icons.searchPlaceholder')),
    leftSection: createIcon(LucideSearch, { size: 16 }),
  }));

  // Alert + Notification with icons
  el.appendChild(Title({ order: 4, children: t.node('icons.feedback') }));
  el.appendChild(Alert({
    variant: 'light',
    color: 'primary',
    icon: () => createIcon(LucideInfo, { size: 20 }),
    title: t.node('icons.alertTitle'),
    children: t.node('icons.alertBody'),
  }));
  el.appendChild(Notification({
    color: 'green',
    icon: createIcon(Check, { size: 18 }),
    title: t.node('icons.notifTitle'),
    children: t.node('icons.notifBody'),
  }));

  // NavLink with icon
  el.appendChild(Title({ order: 4, children: t.node('icons.navigation') }));
  const nav = _createElement('div');
  _setProp(nav, 'style', { maxWidth: '240px' });
  nav.appendChild(NavLink({
    label: t.node('icons.navHome'),
    icon: createIcon(LucideHome, { size: 16 }),
    active: true,
  }));
  nav.appendChild(NavLink({
    label: t.node('icons.navSettings'),
    icon: createIcon(LucideSettings, { size: 16 }),
  }));
  nav.appendChild(NavLink({
    label: t.node('icons.navNotifications'),
    icon: createIcon(LucideBell, { size: 16 }),
  }));
  el.appendChild(nav);

  // ActionIcon wrapping a Lucide icon
  el.appendChild(Title({ order: 4, children: t.node('icons.actions') }));
  el.appendChild(Group({ gap: 'sm', children: [
    ActionIcon({
      variant: 'subtle',
      'aria-label': String(t('icons.likeAria')),
      children: createIcon(LucideHeart, { size: 18 }),
    }),
    ActionIcon({
      variant: 'light',
      color: 'blue',
      'aria-label': String(t('icons.settingsAria')),
      children: createIcon(LucideSettings, { size: 18 }),
    }),
    ActionIcon({
      variant: 'filled',
      color: 'red',
      'aria-label': String(t('icons.deleteAria')),
      children: createIcon(LucideTrash, { size: 18 }),
    }),
  ] }));

  return el;
}

// ============================================================
// ThemingDemo — custom palette, primaryColor, primaryShade, component defaults
// ============================================================
const BRAND_PALETTE: ColorPalette = [
  '#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa',
  '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4',
];
const TEAL_PALETTE: ColorPalette = [
  '#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9',
  '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b',
];

function ThemingDemo() {
  const [primaryColor, setPrimaryColor] = signal<'brand' | 'teal' | 'primary'>('brand');
  const [primaryShade, setPrimaryShade] = signal<number>(6);

  const wrapper = _createElement('div');
  _setProp(wrapper, 'style', { marginTop: '1.5rem' });

  // Controls live outside the nested provider so they don't inherit its palette.
  const controls = _createElement('div');
  _setProp(controls, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1rem 1.5rem',
    borderRadius: '8px 8px 0 0',
  });
  controls.appendChild(Title({ order: 2, children: 'Theming demo' }));
  controls.appendChild(Text({
    size: 'sm',
    children: 'Custom palettes + reactive primaryColor / primaryShade. Changes flow through CSS variables without remounting the provider.',
  }));
  controls.appendChild(Group({ gap: 'md', align: 'end', children: [
    Select({
      label: 'primaryColor',
      data: [
        { value: 'brand', label: 'brand (violet)' },
        { value: 'teal', label: 'teal (custom)' },
        { value: 'primary', label: 'primary (built-in)' },
      ],
      value: primaryColor(),
      onChange: (e) => setPrimaryColor((e.target as HTMLSelectElement).value as 'brand' | 'teal' | 'primary'),
    }),
    Select({
      label: 'primaryShade',
      data: ['4', '5', '6', '7', '8', '9'].map((v) => ({ value: v, label: v })),
      value: String(primaryShade()),
      onChange: (e) => setPrimaryShade(Number((e.target as HTMLSelectElement).value)),
    }),
  ] }));
  wrapper.appendChild(controls);

  // Single provider with a reactive theme getter — CSS vars + palette rules
  // update live when the signals above change.
  const provider = ThemeProvider({
    theme: (): MikataTheme => ({
      colors: { brand: BRAND_PALETTE, teal: TEAL_PALETTE },
      primaryColor: primaryColor(),
      primaryShade: primaryShade(),
    }),
  }) as HTMLElement;

  const content = _createElement('div');
  _setProp(content, 'style', {
    background: 'var(--mkt-color-bg)',
    color: 'var(--mkt-color-text)',
    padding: '1.5rem',
    borderRadius: '0 0 8px 8px',
    transition: 'background 150ms, color 150ms',
  });

  content.appendChild(Title({ order: 4, children: 'Buttons' }));
  content.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Button({ children: 'Primary' }),
    Button({ color: 'brand', children: 'Brand' }),
    Button({ color: 'teal', children: 'Teal' }),
    Button({ color: 'red', children: 'Red' }),
    Button({ variant: 'filled', children: 'Filled' }),
  ] }));

  content.appendChild(Title({ order: 4, children: 'Badges & Alerts with custom palettes' }));
  content.appendChild(Group({ gap: 'sm', wrap: true, children: [
    Badge({ children: 'Primary' }),
    Badge({ color: 'brand', children: 'Brand' }),
    Badge({ color: 'teal', children: 'Teal' }),
  ] }));
  content.appendChild(Alert({
    variant: 'light',
    color: 'brand',
    title: 'Brand palette',
    children: 'This Alert uses the custom brand palette via the runtime-emitted rules.',
  }));

  provider.appendChild(content);
  wrapper.appendChild(provider);

  return wrapper;
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

  // Single ThemeProvider shared across both UI demos so the dark-mode toggle
  // affects the Extras section too.
  const theme = ThemeProvider({}) as HTMLElement;
  theme.appendChild(_createComponent(UIComponentsDemo, {}));
  theme.appendChild(_createComponent(ExtrasDemo, {}));
  theme.appendChild(_createComponent(FormPackageDemo, {}));
  theme.appendChild(_createComponent(IconsDemo, {}));
  theme.appendChild(_createComponent(ThemingDemo, {}));
  el.appendChild(theme);

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
