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
  Calendar,
  DatePicker,
  MonthPicker,
  YearPicker,
  DateInput,
  DatePickerInput,
  MonthPickerInput,
  YearPickerInput,
  TimeInput,
  VirtualList,
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
// Demo 1: Counter (signals + computed + refs) - JSX version
// ============================================================
function Counter() {
  const { t } = useI18n();
  const [count, setCount] = signal(0);
  const doubled = computed(() => count() * 2);
  const displayRef = createRef<HTMLParagraphElement>();

  onMount(() => {
    console.log('Counter mounted! Display ref:', displayRef.current);
  });

  return (
    <div class="card">
      <h2>{t('counter.title')}</h2>
      <p ref={displayRef}>{t('counter.display', { count: count(), doubled: doubled() })}</p>
      <span
        class={{
          badge: true,
          'badge-positive': count() > 0,
          'badge-negative': count() < 0,
          'badge-zero': count() === 0,
        }}
      >
        {count() >= 0 ? t('counter.positive') : t('counter.negative')}
      </span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
      <button onClick={() => setCount(0)}>{t('counter.reset')}</button>
    </div>
  );
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

  return (
    <div class="card">
      <h2>{t('formBindings.title')}</h2>

      <label>
        {t('formBindings.name')}
        <input
          ref={nameRef}
          placeholder={t('formBindings.namePlaceholder')}
          {...model(name, setName)}
        />
      </label>

      <label>
        {t('formBindings.age')}
        <input type="number" {...model(age, setAge, 'number')} />
      </label>

      <label>
        <input type="checkbox" {...model(agree, setAgree, 'checkbox')} />
        {t('formBindings.agree')}
      </label>

      <label>
        {t('formBindings.color')}
        <select {...model(color, setColor, 'select')}>
          <option value="blue">{t('formBindings.colorBlue')}</option>
          <option value="red">{t('formBindings.colorRed')}</option>
          <option value="green">{t('formBindings.colorGreen')}</option>
        </select>
      </label>

      <p style={{ color: color(), fontWeight: 'bold' }}>
        {t('formBindings.statusLine', {
          name: name() || '?',
          age: age(),
          status: agree() ? t('formBindings.agreed') : t('formBindings.notAgreed'),
        })}
      </p>

      <button onClick={() => nameRef.current?.focus()}>
        {t('formBindings.focusName')}
      </button>
    </div>
  );
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
    state.todos = state.todos.map((td) =>
      td.id === id ? { ...td, done: !td.done } : td
    );
  }

  function removeTodo(id: number) {
    state.todos = state.todos.filter((td) => td.id !== id);
  }

  const completedText = () => {
    const total = state.todos.length;
    const doneCount = state.todos.filter((td) => td.done).length;
    return t('todo.completed', { done: doneCount, total });
  };

  return (
    <div class="card">
      <h2>{t('todo.title')}</h2>

      <div>
        <input
          placeholder={t('todo.placeholder')}
          value={state.input}
          onInput={(e) => {
            state.input = e.currentTarget.value;
          }}
          onKeydown={(e) => {
            if (e.key === 'Enter') addTodo();
          }}
        />
        <button onClick={addTodo}>{t('todo.add')}</button>
      </div>

      <div>
        {each(
          () => state.todos,
          (todo) => (
            <div class={['todo-item', { done: todo.done }]}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              <span
                style={
                  todo.done
                    ? { textDecoration: 'line-through', opacity: '0.6' }
                    : undefined
                }
              >
                {todo.text}
              </span>
              <button onClick={() => removeTodo(todo.id)}>x</button>
            </div>
          ),
          () => <p>{t('todo.empty')}</p>,
          { key: (td: Todo) => td.id }
        )}
      </div>

      <p>{completedText()}</p>
    </div>
  );
}

// ============================================================
// Demo 4: Conditional rendering (show + switchMatch)
// ============================================================
function ConditionalDemo() {
  const { t } = useI18n();
  const [status, setStatus] = signal<'loading' | 'success' | 'error'>('loading');

  return (
    <div class="card">
      <h2>{t('conditional.title')}</h2>
      <div>
        <button onClick={() => setStatus('loading')}>{t('conditional.btnLoading')}</button>
        <button onClick={() => setStatus('success')}>{t('conditional.btnSuccess')}</button>
        <button onClick={() => setStatus('error')}>{t('conditional.btnError')}</button>
      </div>
      <div>
        {switchMatch(() => status(), {
          loading: () => <p>{t('conditional.loading')}</p>,
          success: () => <p>{t('conditional.success')}</p>,
          error: () => <p>{t('conditional.error')}</p>,
        })}
      </div>
    </div>
  );
}

// ============================================================
// Demo 5: Portal (renders modal into document.body)
// ============================================================
function PortalDemo() {
  const { t } = useI18n();
  const [showModal, setShowModal] = signal(false);

  return (
    <div class="card">
      <h2>{t('portal.title')}</h2>
      <button onClick={() => setShowModal((v) => !v)}>
        {t('portal.toggle')}
      </button>
      <p>{showModal() ? t('portal.open') : t('portal.closed')}</p>
      <div>
        {show(
          () => showModal(),
          () =>
            portal(
              () => (
                <div
                  class="modal-overlay"
                  style={{
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
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setShowModal(false);
                  }}
                >
                  <div
                    style={{
                      background: 'white',
                      padding: '2rem',
                      borderRadius: '8px',
                      maxWidth: '400px',
                      color: '#333',
                    }}
                  >
                    <h3>{t('portal.modalTitle')}</h3>
                    <p>{t('portal.modalBody')}</p>
                    <button onClick={() => setShowModal(false)}>
                      {t('portal.close')}
                    </button>
                  </div>
                </div>
              ),
              document.body
            )
        )}
      </div>
    </div>
  );
}

// ============================================================
// Demo 6: Error Boundary
// ============================================================
function ErrorBoundaryDemo() {
  const { t } = useI18n();
  const [shouldThrow, setShouldThrow] = signal(false);

  return (
    <div class="card">
      <h2>{t('errorBoundary.title')}</h2>
      <button onClick={() => setShouldThrow((v) => !v)}>
        {t('errorBoundary.toggleError')}
      </button>
      <ErrorBoundary
        fallback={(err: Error, reset: () => void) => (
          <div
            style={{
              color: 'red',
              padding: '1rem',
              border: '1px solid red',
              borderRadius: '4px',
            }}
          >
            <p>{t('errorBoundary.caught', { message: err.message })}</p>
            <button
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              {t('errorBoundary.reset')}
            </button>
          </div>
        )}
      >
        {(() => {
          if (shouldThrow()) throw new Error('Something broke!');
          return <p>{t('errorBoundary.safe')}</p>;
        })()}
      </ErrorBoundary>
    </div>
  );
}

// ============================================================
// Demo 7: UI Component Library
// ============================================================
function UIComponentsDemo() {
  // Shares the App-level ThemeProvider - don't create a nested one, or the
  // dark-mode toggle's setColorScheme only flips this scope.
  return (
    <div
      style={{
        background: 'var(--mkt-color-bg)',
        color: 'var(--mkt-color-text)',
        padding: '1.5rem',
        borderRadius: '8px',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <UIContent />
    </div>
  );
}

/**
 * Inner content of the UI demo. Runs as a child component so it can
 * inject the ThemeContext provided by ThemeProvider above.
 */
function UIContent() {
  const { t, locale, setLocale } = useI18n();
  void locale;
  const { setColorScheme, resolvedColorScheme, direction, setDirection } = useTheme();
  const [progressVal, setProgressVal] = signal(0);
  const { opened: modalOpened, open: openModal, close: closeModal } = useDisclosure(false);
  const progressRef = createRef<HTMLElement>();

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

  effect(() => {
    const host = progressRef.current;
    if (!host) return;
    const bar = host.querySelector('.mkt-progress__bar') as HTMLElement | null;
    if (bar) bar.style.width = `${progressVal()}%`;
    host.setAttribute('aria-valuenow', String(progressVal()));
  });

  const section = { marginBottom: '1.5rem' } as const;

  return (
    <div>
      <div style={section}>
        <Title order={2}>{t('ui.title')}</Title>
        <Text size="sm">{t('ui.description')}</Text>
        <Group gap="md" align="end">
          <Switch
            label={t('ui.darkMode')}
            onChange={() => {
              const current = resolvedColorScheme();
              setColorScheme(current === 'dark' ? 'light' : 'dark');
            }}
          />
          <Select
            label={t('ui.language')}
            data={[
              { value: 'en', label: 'English' },
              { value: 'ja', label: '日本語' },
            ]}
            value="en"
            onChange={(e) => setLocale((e.target as HTMLSelectElement).value)}
          />
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>
              {t('ui.direction')}
            </label>
            <SegmentedControl
              data={[
                { value: 'ltr', label: t('ui.ltr') },
                { value: 'rtl', label: t('ui.rtl') },
              ]}
              defaultValue={direction()}
              onChange={(v) => setDirection(v as 'ltr' | 'rtl')}
            />
          </div>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t('badges.title')}</Title>
        <Group gap="sm" wrap>
          <Badge color="primary">{t('badges.primary')}</Badge>
          <Badge color="green">{t('badges.success')}</Badge>
          <Badge color="red">{t('badges.error')}</Badge>
          <Badge color="yellow" variant="light">{t('badges.warning')}</Badge>
          <Badge color="violet" variant="outline">{t('badges.new')}</Badge>
          <Badge variant="dot" color="green">{t('badges.online')}</Badge>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t('buttons.title')}</Title>
        <Group gap="sm" wrap>
          <Button variant="filled">{t('buttons.filled')}</Button>
          <Button variant="outline">{t('buttons.outline')}</Button>
          <Button variant="light">{t('buttons.light')}</Button>
          <Button variant="subtle">{t('buttons.subtle')}</Button>
          <Button variant="filled" color="red">{t('buttons.delete')}</Button>
          <Button variant="filled" color="green">{t('buttons.confirm')}</Button>
          <Button loading>{t('buttons.loading')}</Button>
          <Button disabled>{t('buttons.disabled')}</Button>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t('alerts.title')}</Title>
        <Stack gap="sm">
          <Alert color="blue" title={t('alerts.infoTitle')}>
            {t('alerts.infoMessage')}
          </Alert>
          <Alert color="green" title={t('alerts.successTitle')}>
            {t('alerts.successMessage')}
          </Alert>
          <Alert
            color="red"
            title={t('alerts.errorTitle')}
            closable
            onClose={() => console.log('Alert closed')}
          >
            {t('alerts.errorMessage')}
          </Alert>
          <Alert color="yellow" title={t('alerts.warningTitle')}>
            {t('alerts.warningMessage')}
          </Alert>
        </Stack>
      </div>

      <div style={section}>
        <Title order={3}>{t('progress.title')}</Title>
        <Progress ref={progressRef} value={0} color="primary" />
        <Button variant="light" onClick={startProgress}>
          {t('progress.start')}
        </Button>
      </div>

      <div style={section}>
        <Title order={3}>{t('loader.title')}</Title>
        <Group gap="md">
          <Loader size="xs" />
          <Loader size="sm" />
          <Loader size="md" />
          <Loader size="lg" />
          <Loader size="xl" />
        </Group>
      </div>

      <Divider />

      <div style={section}>
        <Title order={3}>{t('form.title')}</Title>
        <Stack gap="sm">
          <TextInput
            label={t('form.fullName')}
            placeholder={t('form.fullNamePlaceholder')}
            description={t('form.displayName')}
            required
          />
          <TextInput
            label={t('form.email')}
            placeholder={t('form.emailPlaceholder')}
            required
          />
          <PasswordInput
            label={t('form.password')}
            placeholder={t('form.passwordPlaceholder')}
            required
          />
          <Textarea
            label={t('form.bio')}
            placeholder={t('form.bioPlaceholder')}
            description={t('form.optional')}
          />
          <Select
            label={t('form.role')}
            data={[
              { value: 'admin', label: t('form.roleAdmin') },
              { value: 'editor', label: t('form.roleEditor') },
              { value: 'user', label: t('form.roleUser') },
              { value: 'viewer', label: t('form.roleViewer'), disabled: true },
            ]}
            value="user"
            placeholder={t('form.rolePlaceholder')}
          />
          <Checkbox label={t('form.agreeTerms')} color="primary" />
          <Switch label={t('form.emailNotifications')} color="primary" />
        </Stack>
        <Group gap="sm">
          <Button variant="filled" onClick={openModal}>
            {t('form.createAccount')}
          </Button>
          <Button variant="outline">{t('buttons.cancel')}</Button>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t('modal.title')}</Title>
        <Button variant="outline" onClick={openModal}>
          {t('modal.openModal')}
        </Button>
      </div>

      <div>
        {show(
          () => modalOpened(),
          () => (
            <Modal
              title={t('modal.exampleTitle')}
              size="md"
              centered
              onClose={closeModal}
            >
              <div>
                <Text>{t('modal.body')}</Text>
                <Text size="sm">{t('modal.bodyDetail')}</Text>
              </div>
            </Modal>
          )
        )}
      </div>

      <Divider />

      <div style={section}>
        <Title order={3}>{t('card.title')}</Title>
        <Group gap="md" wrap>
          <Card
            shadow="sm"
            padding="md"
            withBorder
            header={t('card.header')}
            footer={
              <Button variant="light" size="sm">
                {t('card.viewDetails')}
              </Button>
            }
          >
            <Text size="sm">{t('card.cardDescription')}</Text>
          </Card>
          <Card shadow="md" padding="lg">
            <Text>{t('card.simpleCard')}</Text>
          </Card>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t('table.title')}</Title>
        <Table
          striped
          highlightOnHover
          withBorder
          columns={[
            { key: 'name', title: t('table.colName') },
            { key: 'role', title: t('table.colRole') },
            { key: 'email', title: t('table.colEmail') },
            {
              key: 'status',
              title: t('table.colStatus'),
              render: (row: any) => (
                <Badge color={row.active ? 'green' : 'gray'} size="sm">
                  {row.active ? t('table.statusActive') : t('table.statusInactive')}
                </Badge>
              ),
            },
          ]}
          data={[
            { name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com', active: true },
            { name: 'Bob Smith', role: 'Editor', email: 'bob@example.com', active: true },
            { name: 'Carol White', role: 'Viewer', email: 'carol@example.com', active: false },
            { name: 'Dave Brown', role: 'Editor', email: 'dave@example.com', active: true },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('tabs.title')}</Title>
        <Tabs
          items={[
            { value: 'overview', label: t('tabs.overview'), content: <Text>{t('tabs.overviewContent')}</Text> },
            { value: 'features', label: t('tabs.features'), content: <Text>{t('tabs.featuresContent')}</Text> },
            { value: 'disabled', label: t('tabs.disabled'), content: '', disabled: true },
            { value: 'code', label: t('tabs.code'), content: <Text>{t('tabs.codeContent')}</Text> },
          ]}
          color="primary"
        />
        <Text size="sm" class="mkt-mt-2">{t('tabs.pillsVariant')}</Text>
        <Tabs
          variant="pills"
          color="violet"
          items={[
            { value: 'react', label: t('tabs.reactLabel'), content: t('tabs.reactContent') },
            { value: 'vue', label: t('tabs.vueLabel'), content: t('tabs.vueContent') },
            { value: 'solid', label: t('tabs.solidLabel'), content: t('tabs.solidContent') },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('accordion.title')}</Title>
        <Accordion
          variant="separated"
          items={[
            { value: 'a11y', label: t('accordion.a11yLabel'), content: t('accordion.a11yContent') },
            { value: 'theming', label: t('accordion.themingLabel'), content: t('accordion.themingContent') },
            { value: 'perf', label: t('accordion.perfLabel'), content: t('accordion.perfContent') },
          ]}
          defaultValue="a11y"
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('menu.title')}</Title>
        <Menu
          target={<Button variant="outline">{t('menu.actions')}</Button>}
          items={[
            { type: 'label', label: t('menu.appLabel') },
            { label: t('menu.settings'), onClick: () => console.log('Settings clicked') },
            { label: t('menu.messages'), onClick: () => console.log('Messages clicked') },
            { type: 'divider' },
            { type: 'label', label: t('menu.dangerLabel') },
            { label: t('menu.deleteAccount'), color: 'red', onClick: () => console.log('Delete clicked') },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('avatar.title')}</Title>
        <Group gap="md">
          <Avatar name="Alice Johnson" color="blue" />
          <Avatar name="Bob Smith" color="red" variant="filled" />
          <Avatar color="green" size="lg" />
          <Avatar name="Carol White" color="violet" size="xl" variant="outline" />
        </Group>
        <Text size="sm">{t('avatar.group')}</Text>
        <AvatarGroup spacing="sm">
          <Avatar name="A B" color="blue" variant="filled" />
          <Avatar name="C D" color="red" variant="filled" />
          <Avatar name="E F" color="green" variant="filled" />
          <Avatar name="+3" color="gray" variant="filled" />
        </AvatarGroup>
      </div>

      <div style={section}>
        <Title order={3}>{t('breadcrumb.title')}</Title>
        <Breadcrumb
          items={[
            { label: t('breadcrumb.home'), href: '#' },
            { label: t('breadcrumb.components'), href: '#' },
            { label: t('breadcrumb.title') },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('pagination.title')}</Title>
        <Pagination
          total={20}
          defaultValue={5}
          onChange={(page) => console.log('Page:', page)}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t('segmented.title')}</Title>
        <SegmentedControl
          data={[
            { value: 'preview', label: t('segmented.preview') },
            { value: 'code', label: t('segmented.code') },
            { value: 'export', label: t('segmented.export') },
          ]}
          defaultValue="preview"
          onChange={(val) => console.log('Segment:', val)}
        />
      </div>

      <div style={{ ...section, maxWidth: '280px' }}>
        <Title order={3}>{t('navlink.title')}</Title>
        <NavLink
          label={t('navlink.dashboard')}
          active
          onClick={() => console.log('Dashboard')}
        />
        <NavLink
          label={t('navlink.settings')}
          description={t('navlink.settingsDesc')}
        >
          <NavLink label={t('navlink.general')} onClick={() => console.log('General')} />
          <NavLink label={t('navlink.security')} onClick={() => console.log('Security')} />
          <NavLink label={t('navlink.notifications')} disabled />
        </NavLink>
        <NavLink label={t('navlink.users')} onClick={() => console.log('Users')} />
      </div>

      <div style={section}>
        <Title order={3}>{t('toast.title')}</Title>
        <Group gap="sm" wrap>
          <Button
            variant="filled"
            color="green"
            onClick={() => toast.success(t('toast.savedMessage'), { title: t('toast.savedTitle') })}
          >
            {t('toast.success')}
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={() => toast.error(t('toast.errorMessage'), { title: t('toast.errorTitle') })}
          >
            {t('toast.error')}
          </Button>
          <Button
            variant="filled"
            color="yellow"
            onClick={() => toast.warning(t('toast.warningMessage'))}
          >
            {t('toast.warning')}
          </Button>
          <Button
            variant="filled"
            color="blue"
            onClick={() => toast.info(t('toast.infoMessage'), { title: t('toast.infoTitle') })}
          >
            {t('toast.info')}
          </Button>
        </Group>
      </div>
    </div>
  );
}

// ============================================================
// Demo 8: Extras - new components showcase
// ============================================================
function ExtrasDemo() {
  // Shares the App-level ThemeProvider - avoid nesting providers so the
  // dark-mode toggle in the UI demo also affects this section.
  return (
    <div
      style={{
        background: 'var(--mkt-color-bg)',
        color: 'var(--mkt-color-text)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1.5rem',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <ExtrasContent />
    </div>
  );
}

function ExtrasContent() {
  const { t } = useI18n();
  const [activeStep, setActiveStep] = signal(1);
  const [opened, setOpened] = signal(false);
  const [burgerOpen, setBurgerOpen] = signal(false);
  const [overlayShown, setOverlayShown] = signal(false);

  const burgerRef = createRef<HTMLButtonElement>();
  function onBurgerClick() {
    const next = !burgerOpen();
    setBurgerOpen(next);
    const el = burgerRef.current;
    if (!el) return;
    if (next) el.dataset.opened = '';
    else delete el.dataset.opened;
    el.setAttribute('aria-expanded', String(next));
  }

  const icon = () => createIcon(Check, { size: 14 });

  return (
    <div>
      <Title order={2}>{t('extras.title')}</Title>
      <Text size="sm">{t('extras.description')}</Text>

      <Title order={3}>{t('extras.typographyTitle')}</Title>
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <Text size="sm">{t('extras.kbdTitle')}</Text>
          <Kbd>{t('extras.kbdCtrl')}</Kbd>
          <Text size="sm">+</Text>
          <Kbd>{t('extras.kbdShift')}</Kbd>
          <Text size="sm">+</Text>
          <Kbd>{t('extras.kbdK')}</Kbd>
        </Group>
        <Code>{t('extras.codeDemo')}</Code>
        <Text>
          <span>
            Contains <Mark color="yellow">{t('extras.markedText')}</Mark> text inline.
          </span>
        </Text>
        <Blockquote color="primary" cite={t('extras.blockquoteCite')}>
          {t('extras.blockquote')}
        </Blockquote>
        <Highlight highlight={t('extras.highlightTerm')} color="yellow">
          {t('extras.highlightText')}
        </Highlight>
        <Spoiler
          maxHeight={48}
          showLabel={t('extras.spoilerShow')}
          hideLabel={t('extras.spoilerHide')}
        >
          <p>{t('extras.spoilerContent') + ' ' + t('extras.spoilerContent')}</p>
        </Spoiler>
        <List>
          <ListItem>{t('extras.listFirst')}</ListItem>
          <ListItem>{t('extras.listSecond')}</ListItem>
          <ListItem>{t('extras.listThird')}</ListItem>
        </List>
      </Stack>

      <Title order={3}>{t('extras.themeIconTitle')}</Title>
      <Group gap="sm">
        <ThemeIcon color="primary">{icon()}</ThemeIcon>
        <ThemeIcon color="green" variant="light">{icon()}</ThemeIcon>
        <ThemeIcon color="red" variant="outline">{icon()}</ThemeIcon>
        <ThemeIcon color="violet" variant="gradient" size="lg">{icon()}</ThemeIcon>
      </Group>

      <Text size="sm">{t('extras.colorSwatchTitle')}</Text>
      <Group gap="xs">
        <ColorSwatch color="#7c3aed" />
        <ColorSwatch color="#10b981" />
        <ColorSwatch color="#ef4444" />
        <ColorSwatch color="#f59e0b" />
        <ColorSwatch color="transparent" />
      </Group>

      <Divider />

      <Title order={3}>{t('extras.layoutTitle')}</Title>
      <SimpleGrid cols={3} spacing="md">
        <Paper padding="md" withBorder shadow="sm">
          <Text>{t('extras.paperContent')}</Text>
        </Paper>
        <Center>
          <Badge color="primary">{t('extras.centerContent')}</Badge>
        </Center>
        <AspectRatio ratio={16 / 9}>
          <div
            style={{
              background: 'var(--mkt-color-primary-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--mkt-color-primary-7)',
              borderRadius: 'var(--mkt-radius-sm)',
            }}
          >
            {t('extras.aspect169')}
          </div>
        </AspectRatio>
      </SimpleGrid>

      <Flex gap="sm" wrap="wrap">
        <Indicator label="3" color="red">
          <Badge color="gray">{t('extras.indicatorContent')}</Badge>
        </Indicator>
        <RingProgress
          size={80}
          thickness={8}
          sections={[{ value: 70, color: 'primary' }]}
          label={<Text size="sm">{t('extras.ringProgressLabel')}</Text>}
        />
      </Flex>

      <Divider />

      <Title order={3}>{t('extras.chipsTitle')}</Title>
      <ChipGroup
        multiple
        defaultValue={['mikata']}
        onChange={(v) => console.log('Chips:', v)}
      >
        <Chip value="react">{t('extras.chipOption1')}</Chip>
        <Chip value="vue">{t('extras.chipOption2')}</Chip>
        <Chip value="solid">{t('extras.chipOption3')}</Chip>
        <Chip value="mikata" color="violet">{t('extras.chipOption4')}</Chip>
      </ChipGroup>

      <Title order={3}>{t('extras.ratingTitle')}</Title>
      <Rating defaultValue={4} fractions={2} color="#f59e0b" />

      <Title order={3}>{t('extras.pinTitle')}</Title>
      <PinInput length={6} onChange={(v) => console.log('PIN:', v)} />

      <Title order={3}>{t('extras.fileTitle')}</Title>
      <Stack gap="sm">
        <FileInput
          label={t('extras.fileTitle')}
          placeholder={t('extras.fileSelectBtn')}
          clearable
        />
        <FileButton onChange={(f) => console.log('Picked file:', f)}>
          {(open: () => void) => (
            <Button variant="outline" onClick={open}>
              {t('extras.fileSelectBtn')}
            </Button>
          )}
        </FileButton>
      </Stack>

      <Fieldset legend={t('extras.autocompleteTitle')}>
        <Stack gap="sm">
          <Autocomplete
            label={t('extras.autocompleteTitle')}
            placeholder={t('extras.autocompletePlaceholder')}
            data={['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry', 'Date', 'Grape', 'Lemon', 'Mango', 'Orange', 'Pear']}
            onOptionSubmit={(v) => console.log('Autocomplete:', v)}
          />
          <MultiSelect
            label={t('extras.multiSelectTitle')}
            placeholder={t('extras.multiSelectPlaceholder')}
            clearable
            data={[
              { value: 'js', label: 'JavaScript' },
              { value: 'ts', label: 'TypeScript' },
              { value: 'rs', label: 'Rust' },
              { value: 'go', label: 'Go' },
              { value: 'py', label: 'Python' },
            ]}
            onChange={(v) => console.log('Multi:', v)}
          />
          <TagsInput
            label={t('extras.tagsTitle')}
            placeholder={t('extras.tagsPlaceholder')}
            defaultValue={['one', 'two']}
            onChange={(v) => console.log('Tags:', v)}
          />
          <Input placeholder={t('extras.primitiveInputPlaceholder')} />
        </Stack>
      </Fieldset>

      <Divider />

      <Title order={3}>{t('extras.timelineTitle')}</Title>
      <Timeline
        active={1}
        color="primary"
        items={[
          { title: t('extras.timelineStep1'), children: <Text size="sm">{t('extras.timelineStep1Desc')}</Text> },
          { title: t('extras.timelineStep2'), children: <Text size="sm">{t('extras.timelineStep2Desc')}</Text> },
          { title: t('extras.timelineStep3'), children: <Text size="sm">{t('extras.timelineStep3Desc')}</Text> },
        ]}
      />

      <Title order={3}>{t('extras.stepperTitle')}</Title>
      <Stepper
        active={() => activeStep()}
        color="primary"
        onStepClick={(i) => setActiveStep(i)}
        steps={[
          { label: t('extras.stepperAccount'), description: t('extras.stepperAccountDesc') },
          { label: t('extras.stepperProfile'), description: t('extras.stepperProfileDesc') },
          { label: t('extras.stepperConfirm'), description: t('extras.stepperConfirmDesc') },
        ]}
      />
      <Group gap="sm">
        <Button variant="outline" onClick={() => setActiveStep(Math.max(0, activeStep() - 1))}>{t('extras.stepperPrev')}</Button>
        <Button onClick={() => setActiveStep(Math.min(3, activeStep() + 1))}>{t('extras.stepperNext')}</Button>
      </Group>

      <Title order={3}>{t('extras.treeTitle')}</Title>
      <Tree
        defaultExpanded={['src']}
        data={[
          {
            value: 'src',
            label: t('extras.treeSrc'),
            children: [
              {
                value: 'components',
                label: t('extras.treeComponents'),
                children: [
                  { value: 'button', label: t('extras.treeButton') },
                  { value: 'input', label: t('extras.treeInput') },
                ],
              },
              { value: 'utils', label: t('extras.treeUtils') },
            ],
          },
          { value: 'tests', label: t('extras.treeTests') },
        ]}
        onSelect={(v) => console.log('Tree:', v)}
      />

      <Divider />

      <Title order={3}>{t('extras.hoverCardTitle')}</Title>
      <HoverCard
        position="bottom"
        withArrow
        target={<Button variant="outline">{t('extras.hoverCardTitle')}</Button>}
      >
        <Text size="sm">{t('extras.hoverCardBody')}</Text>
      </HoverCard>

      <Notification
        title={t('extras.notificationTitle')}
        color="primary"
        onClose={() => console.log('Notification closed')}
      >
        {t('extras.notificationDesc')}
      </Notification>

      <Paper padding="md" withBorder>
        <div style={{ position: 'relative', minHeight: '100px' }}>
          <div>{t('extras.contentBehindOverlay')}</div>
          <LoadingOverlay visible />
        </div>
      </Paper>

      <Button variant="light" onClick={() => setOpened(!opened())}>
        {opened() ? t('extras.collapseHide') : t('extras.collapseShow')}
      </Button>
      <Collapse in={() => opened()}>
        <div style={{ padding: 'var(--mkt-space-3)' }}>
          <Text>{t('extras.collapseContent')}</Text>
        </div>
      </Collapse>

      <ScrollArea
        type="hover"
        height={120}
        style={{ border: '1px solid var(--mkt-color-border)', borderRadius: 'var(--mkt-radius-sm)' }}
      >
        <div style={{ padding: 'var(--mkt-space-3)' }}>
          {Array.from({ length: 30 }, (_, i) => (
            <p>{t('extras.scrollLine', { n: i + 1 })}</p>
          ))}
        </div>
      </ScrollArea>

      <Divider />

      <Title order={3}>{t('extras.unstyledTitle')}</Title>
      <Group gap="md" align="center">
        <Burger
          ref={burgerRef}
          opened={false}
          ariaLabel={t('extras.burgerAria')}
          onClick={onBurgerClick}
        />
        <UnstyledButton onClick={() => console.log('Unstyled clicked')}>
          {t('extras.unstyledButton')}
        </UnstyledButton>
      </Group>

      <Title order={3}>{t('extras.copyTitle')}</Title>
      <Group gap="sm" align="center">
        <Code>{t('extras.copyValue')}</Code>
        <CopyButton value={t('extras.copyValue')}>
          {({ copy, copied }) => (
            <Button
              variant={copied ? 'filled' : 'outline'}
              color={copied ? 'green' : 'primary'}
              size="sm"
              onClick={copy}
            >
              {copied ? t('extras.copyDone') : t('extras.copyIdle')}
            </Button>
          )}
        </CopyButton>
      </Group>

      <Title order={3}>{t('extras.overlayTitle')}</Title>
      <div
        style={{
          position: 'relative',
          padding: 'var(--mkt-space-4)',
          minHeight: '120px',
          border: '1px solid var(--mkt-color-border)',
          borderRadius: 'var(--mkt-radius-sm)',
          overflow: 'hidden',
        }}
      >
        <Text>{t('extras.overlayHidden')}</Text>
        <Text size="sm">{t('extras.overlayDim')}</Text>
        {show(
          () => overlayShown(),
          () => (
            <Overlay
              color="#000"
              opacity={0.55}
              blur={3}
              onClick={() => setOverlayShown(false)}
            >
              <Text>{t('extras.overlayContent')}</Text>
            </Overlay>
          )
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => setOverlayShown(!overlayShown())}>
        {t('extras.overlayToggle')}
      </Button>

      <Title order={3}>{t('extras.rangeTitle')}</Title>
      <RangeSlider
        defaultValue={[20, 80]}
        min={0}
        max={100}
        step={1}
        minRange={5}
        color="primary"
        label={([a, b]: [number, number]) => `${t('extras.rangeLabel')}: $${a} – $${b}`}
        onValueChange={(v) => console.log('Range:', v)}
      />
    </div>
  );
}

// ============================================================
// Demo 9: @mikata/form - signal-backed form handle
// ============================================================
function FormPackageDemo() {
  // Shares the App-level ThemeProvider.
  return (
    <div
      style={{
        background: 'var(--mkt-color-bg)',
        color: 'var(--mkt-color-text)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1.5rem',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <FormPackageContent />
    </div>
  );
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
          ? t('formPkg.errRequired')
          : /@/.test(v as string)
            ? null
            : t('formPkg.errEmail'),
      password: (v) =>
        (v as string).length < 8 ? t('formPkg.errMinPw') : null,
      address: {
        city: (v) => (v ? null : t('formPkg.errRequired')),
      },
      items: { name: (v) => (v ? null : t('formPkg.errRequired')) },
    },
    validateInputOnBlur: true,
  });

  const onSubmit = form.onSubmit(
    (values) => {
      toast.success(t('formPkg.submitted'));
      console.log('[form] submitted:', values);
    },
    (errors) => {
      toast.error(t('formPkg.hasErrors'));
      console.log('[form] invalid:', errors);
    }
  );
  const onReset = form.onReset();

  const submitDisabled = () => !form.isDirty() || !form.isValid();
  const statusText = () => {
    const dirty = form.isDirty() ? t('formPkg.yes') : t('formPkg.no');
    const valid = form.isValid() ? t('formPkg.yes') : t('formPkg.no');
    return `${t('formPkg.dirty')}: ${dirty} • ${t('formPkg.valid')}: ${valid}`;
  };

  return (
    <div>
      <Title order={2}>{t('formPkg.title')}</Title>
      <Text size="sm">{t('formPkg.description')}</Text>

      <form onSubmit={onSubmit} onReset={onReset}>
        <Stack gap="sm">
          <TextInput
            label={t('formPkg.email')}
            placeholder={t('formPkg.emailPlaceholder')}
            {...(form.getInputProps('email') as any)}
          />
          <PasswordInput
            label={t('formPkg.password')}
            {...(form.getInputProps('password') as any)}
          />
          <TextInput
            label={t('formPkg.city')}
            {...(form.getInputProps('address.city') as any)}
          />
          <Checkbox
            label={t('formPkg.remember')}
            {...(form.getInputProps('remember', { type: 'checkbox' }) as any)}
          />
        </Stack>

        <div style={{ marginTop: '1rem' }}>
          <Title order={4}>{t('formPkg.itemsTitle')}</Title>
          <div>
            {each(
              () => form.values.items,
              (_item, idx) => (
                <Group gap="sm" align="end">
                  <TextInput
                    label={t('formPkg.itemName')}
                    {...(form.getInputProps(`items.${idx()}.name`) as any)}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={String(t('formPkg.removeItemAria'))}
                    onClick={() => form.removeListItem('items', idx())}
                  >
                    {createIcon(Close, { size: 16 })}
                  </ActionIcon>
                </Group>
              ),
              () => <p>-</p>,
              { key: (item: { id: number }) => item.id }
            )}
          </div>
          <Button
            variant="light"
            onClick={() =>
              form.insertListItem('items', { id: nextItemId(), name: '' })
            }
          >
            {t('formPkg.addItem')}
          </Button>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" disabled={submitDisabled()}>
            {t('formPkg.save')}
          </Button>
          <Button type="reset" variant="subtle">
            {t('formPkg.reset')}
          </Button>
        </div>
      </form>

      <p style={{ fontSize: '0.875rem', opacity: '0.7', marginTop: '0.75rem' }}>
        {statusText()}
      </p>
    </div>
  );
}

// ============================================================
// DatesDemo - Calendar, DatePicker, pickers, TimeInput
// ============================================================
function DatesDemo() {
  return (
    <div
      style={{
        background: 'var(--mkt-color-bg)',
        color: 'var(--mkt-color-text)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1.5rem',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <DatesContent />
    </div>
  );
}

function DatesContent() {
  const { t } = useI18n();
  const bigData = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Row ${i + 1}`,
    detail: `Value ${(i * 7919) % 1000}`,
  }));

  const rowBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1rem',
    height: '44px',
    borderBottom: '1px solid var(--mkt-color-border)',
  } as const;

  return (
    <div>
      <Title order={2}>{t('dates.title')}</Title>
      <Text size="sm">{t('dates.description')}</Text>

      <Title order={3}>{t('dates.calendarInline')}</Title>
      <SimpleGrid cols={3} spacing="md">
        <Stack gap="xs">
          <Text size="sm" fw={500}>{t('dates.variantDefault')}</Text>
          <Calendar defaultValue={new Date()} />
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>{t('dates.variantMultiple')}</Text>
          <Calendar type="multiple" />
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>{t('dates.variantRange')}</Text>
          <Calendar type="range" />
        </Stack>
      </SimpleGrid>

      <Title order={3}>{t('dates.datePickerTitle')}</Title>
      <Group gap="md" align="flex-start">
        <DatePicker defaultValue={new Date()} />
        <DatePicker type="range" />
      </Group>

      <Title order={3}>{t('dates.monthYearPicker')}</Title>
      <Group gap="md" align="flex-start">
        <MonthPicker defaultValue={new Date()} />
        <YearPicker defaultValue={new Date()} />
      </Group>

      <Title order={3}>{t('dates.dateInputSection')}</Title>
      <SimpleGrid cols={2} spacing="md">
        <DateInput label={t('dates.dateInputTypeable')} placeholder={t('dates.dateInputPlaceholder')} defaultValue={new Date()} />
        <DatePickerInput label={t('dates.datePickerInput')} placeholder={t('dates.pickDate')} defaultValue={new Date()} />
        <DatePickerInput label={t('dates.rangeLabel')} type="range" placeholder={t('dates.pickRange')} />
        <MonthPickerInput label={t('dates.monthPickerInput')} placeholder={t('dates.pickMonth')} />
        <YearPickerInput label={t('dates.yearPickerInput')} placeholder={t('dates.pickYear')} />
        <TimeInput label={t('dates.timeInput')} defaultValue="14:30" withSeconds={false} />
      </SimpleGrid>

      <Divider />

      <Title order={2}>{t('dates.virtualizationTitle')}</Title>
      <Text size="sm">{t('dates.virtualizationDesc')}</Text>

      <VirtualList
        data={bigData}
        itemSize={44}
        size={320}
        renderItem={(item: { name: string; detail: string }) => (
          <div style={rowBaseStyle}>
            <div style={{ fontWeight: '500', flex: '1' }}>{item.name}</div>
            <div style={{ opacity: '0.7', fontSize: '0.875rem' }}>{item.detail}</div>
          </div>
        )}
      />

      <Title order={3}>{t('dates.variableSize')}</Title>
      <VirtualList
        data={Array.from({ length: 500 }, (_, i) => i)}
        itemSize={(i: number) => 30 + (i % 5) * 14}
        size={240}
        renderItem={(n: number, i: number) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 1rem',
              height: '100%',
              borderBottom: '1px solid var(--mkt-color-border)',
              background: i % 2 ? 'var(--mkt-color-bg-subtle)' : 'transparent',
            }}
          >
            {t('dates.virtualItem', { n, size: 30 + (i % 5) * 14 })}
          </div>
        )}
      />
    </div>
  );
}

// ============================================================
// IconsDemo - @mikata/icons + Lucide interop
// ============================================================
function IconsDemo() {
  return (
    <div
      style={{
        background: 'var(--mkt-color-bg)',
        color: 'var(--mkt-color-text)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1.5rem',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <IconsContent />
    </div>
  );
}

function IconsContent() {
  const { t } = useI18n();

  return (
    <div>
      <Title order={2}>{t('icons.title')}</Title>
      <Text size="sm">{t('icons.subtitle')}</Text>

      <Title order={4}>{t('icons.buttons')}</Title>
      <Group gap="sm">
        <Button leftIcon={createIcon(LucideDownload, { size: 16 })}>
          {t('icons.download')}
        </Button>
        <Button variant="outline" leftIcon={createIcon(LucideHeart, { size: 16 })}>
          {t('icons.like')}
        </Button>
        <Button variant="subtle" color="red" leftIcon={createIcon(LucideTrash, { size: 16 })}>
          {t('icons.delete')}
        </Button>
      </Group>

      <Title order={4}>{t('icons.inputs')}</Title>
      <TextInput
        placeholder={String(t('icons.searchPlaceholder'))}
        leftSection={createIcon(LucideSearch, { size: 16 })}
      />

      <Title order={4}>{t('icons.feedback')}</Title>
      <Alert
        variant="light"
        color="primary"
        icon={() => createIcon(LucideInfo, { size: 20 })}
        title={t('icons.alertTitle')}
      >
        {t('icons.alertBody')}
      </Alert>
      <Notification
        color="green"
        icon={createIcon(Check, { size: 18 })}
        title={t('icons.notifTitle')}
      >
        {t('icons.notifBody')}
      </Notification>

      <Title order={4}>{t('icons.navigation')}</Title>
      <div style={{ maxWidth: '240px' }}>
        <NavLink label={t('icons.navHome')} icon={createIcon(LucideHome, { size: 16 })} active />
        <NavLink label={t('icons.navSettings')} icon={createIcon(LucideSettings, { size: 16 })} />
        <NavLink label={t('icons.navNotifications')} icon={createIcon(LucideBell, { size: 16 })} />
      </div>

      <Title order={4}>{t('icons.actions')}</Title>
      <Group gap="sm">
        <ActionIcon variant="subtle" aria-label={String(t('icons.likeAria'))}>
          {createIcon(LucideHeart, { size: 18 })}
        </ActionIcon>
        <ActionIcon variant="light" color="blue" aria-label={String(t('icons.settingsAria'))}>
          {createIcon(LucideSettings, { size: 18 })}
        </ActionIcon>
        <ActionIcon variant="filled" color="red" aria-label={String(t('icons.deleteAria'))}>
          {createIcon(LucideTrash, { size: 18 })}
        </ActionIcon>
      </Group>
    </div>
  );
}

// ============================================================
// ThemingDemo - custom palette, primaryColor, primaryShade, component defaults
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
  const { t } = useI18n();
  const [primaryColor, setPrimaryColor] = signal<'brand' | 'teal' | 'primary'>('brand');
  const [primaryShade, setPrimaryShade] = signal<number>(6);

  const theme = (): MikataTheme => ({
    colors: { brand: BRAND_PALETTE, teal: TEAL_PALETTE },
    primaryColor: primaryColor(),
    primaryShade: primaryShade(),
  });

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div
        style={{
          background: 'var(--mkt-color-bg)',
          color: 'var(--mkt-color-text)',
          padding: '1rem 1.5rem',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Title order={2}>{t('theming.title')}</Title>
        <Text size="sm">{t('theming.description')}</Text>
        <Group gap="md" align="end">
          <Select
            label={t('theming.primaryColorLabel')}
            data={[
              { value: 'brand', label: t('theming.brandViolet') },
              { value: 'teal', label: t('theming.tealCustom') },
              { value: 'primary', label: t('theming.primaryBuiltIn') },
            ]}
            value={primaryColor()}
            onChange={(e) =>
              setPrimaryColor(
                (e.target as HTMLSelectElement).value as 'brand' | 'teal' | 'primary'
              )
            }
          />
          <Select
            label={t('theming.primaryShadeLabel')}
            data={['4', '5', '6', '7', '8', '9'].map((v) => ({ value: v, label: v }))}
            value={String(primaryShade())}
            onChange={(e) =>
              setPrimaryShade(Number((e.target as HTMLSelectElement).value))
            }
          />
        </Group>
      </div>

      <ThemeProvider theme={theme}>
        <div
          style={{
            background: 'var(--mkt-color-bg)',
            color: 'var(--mkt-color-text)',
            padding: '1.5rem',
            borderRadius: '0 0 8px 8px',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <Title order={4}>{t('theming.buttonsTitle')}</Title>
          <Group gap="sm" wrap>
            <Button>{t('theming.buttonPrimary')}</Button>
            <Button color="brand">{t('theming.buttonBrand')}</Button>
            <Button color="teal">{t('theming.buttonTeal')}</Button>
            <Button color="red">{t('theming.buttonRed')}</Button>
            <Button variant="filled">{t('theming.buttonFilled')}</Button>
          </Group>

          <Title order={4}>{t('theming.badgesAlertsTitle')}</Title>
          <Group gap="sm" wrap>
            <Badge>{t('theming.buttonPrimary')}</Badge>
            <Badge color="brand">{t('theming.buttonBrand')}</Badge>
            <Badge color="teal">{t('theming.buttonTeal')}</Badge>
          </Group>
          <Alert variant="light" color="brand" title={t('theming.brandPaletteTitle')}>
            {t('theming.brandPaletteMessage')}
          </Alert>
        </div>
      </ThemeProvider>
    </div>
  );
}

// ============================================================
// App - compose all demos
// ============================================================
function App() {
  provideI18n(i18n);
  const { t } = i18n;

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p style={{ marginBottom: '1rem', opacity: '0.7' }}>
        {t('app.subtitle')}
      </p>

      {/* Single ThemeProvider shared across UI demos so the dark-mode
          toggle affects every section below. */}
      <ThemeProvider>
        <UIComponentsDemo />
        <ExtrasDemo />
        <FormPackageDemo />
        <DatesDemo />
        <IconsDemo />
        <ThemingDemo />
      </ThemeProvider>

      <Counter />
      <FormDemo />
      <TodoList />
      <ConditionalDemo />
      <PortalDemo />
      <ErrorBoundaryDemo />
    </div>
  );
}

// ============================================================
// Mount
// ============================================================
const dispose = render(
  () => <App />,
  document.getElementById('root')!
);

console.log('Mikata app mounted! dispose() to unmount.');
