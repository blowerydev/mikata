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
      <h2>{t.node('counter.title')}</h2>
      <p ref={displayRef}>Count: {count()} | Doubled: {doubled()}</p>
      <span
        class={{
          badge: true,
          'badge-positive': count() > 0,
          'badge-negative': count() < 0,
          'badge-zero': count() === 0,
        }}
      >
        {count() >= 0 ? 'positive' : 'negative'}
      </span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
      <button onClick={() => setCount(0)}>{t.node('counter.reset')}</button>
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
      <h2>{t.node('formBindings.title')}</h2>

      <label>
        {t.node('formBindings.name')}
        <input
          ref={nameRef}
          placeholder={t('formBindings.namePlaceholder')}
          {...model(name, setName)}
        />
      </label>

      <label>
        {t.node('formBindings.age')}
        <input type="number" {...model(age, setAge, 'number')} />
      </label>

      <label>
        <input type="checkbox" {...model(agree, setAgree, 'checkbox')} />
        {t.node('formBindings.agree')}
      </label>

      <label>
        {t.node('formBindings.color')}
        <select {...model(color, setColor, 'select')}>
          <option value="blue">blue</option>
          <option value="red">red</option>
          <option value="green">green</option>
        </select>
      </label>

      <p style={{ color: color(), fontWeight: 'bold' }}>
        {`${name() || '?'}, age ${age()}, ${agree() ? t('formBindings.agreed') : t('formBindings.notAgreed')}`}
      </p>

      <button onClick={() => nameRef.current?.focus()}>
        {t.node('formBindings.focusName')}
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
      <h2>{t.node('todo.title')}</h2>

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
        <button onClick={addTodo}>{t.node('todo.add')}</button>
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
          () => <p>{t.node('todo.empty')}</p>,
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
      <h2>{t.node('conditional.title')}</h2>
      <div>
        {(['loading', 'success', 'error'] as const).map((s) => (
          <button onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>
      <div>
        {switchMatch(() => status(), {
          loading: () => <p>{t.node('conditional.loading')}</p>,
          success: () => <p>{t.node('conditional.success')}</p>,
          error: () => <p>{t.node('conditional.error')}</p>,
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
      <h2>{t.node('portal.title')}</h2>
      <button onClick={() => setShowModal((v) => !v)}>
        {t.node('portal.toggle')}
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
                    <h3>{t.node('portal.modalTitle')}</h3>
                    <p>{t.node('portal.modalBody')}</p>
                    <button onClick={() => setShowModal(false)}>
                      {t.node('portal.close')}
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
      <h2>{t.node('errorBoundary.title')}</h2>
      <button onClick={() => setShouldThrow((v) => !v)}>
        {t.node('errorBoundary.toggleError')}
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
            <p>{t.node('errorBoundary.caught', { message: err.message })}</p>
            <button
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              {t.node('errorBoundary.reset')}
            </button>
          </div>
        )}
      >
        {(() => {
          if (shouldThrow()) throw new Error('Something broke!');
          return <p>{t.node('errorBoundary.safe')}</p>;
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
        <Title order={2}>{t.node('ui.title')}</Title>
        <Text size="sm">{t.node('ui.description')}</Text>
        <Group gap="md" align="end">
          <Switch
            label={t.node('ui.darkMode')}
            onChange={() => {
              const current = resolvedColorScheme();
              setColorScheme(current === 'dark' ? 'light' : 'dark');
            }}
          />
          <Select
            label={t.node('ui.language')}
            data={[
              { value: 'en', label: 'English' },
              { value: 'ja', label: '日本語' },
            ]}
            value="en"
            onChange={(e) => setLocale((e.target as HTMLSelectElement).value)}
          />
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>
              Direction
            </label>
            <SegmentedControl
              data={[
                { value: 'ltr', label: 'LTR' },
                { value: 'rtl', label: 'RTL' },
              ]}
              defaultValue={direction()}
              onChange={(v) => setDirection(v as 'ltr' | 'rtl')}
            />
          </div>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('badges.title')}</Title>
        <Group gap="sm" wrap>
          <Badge color="primary">{t.node('badges.primary')}</Badge>
          <Badge color="green">{t.node('badges.success')}</Badge>
          <Badge color="red">{t.node('badges.error')}</Badge>
          <Badge color="yellow" variant="light">{t.node('badges.warning')}</Badge>
          <Badge color="violet" variant="outline">{t.node('badges.new')}</Badge>
          <Badge variant="dot" color="green">{t.node('badges.online')}</Badge>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('buttons.title')}</Title>
        <Group gap="sm" wrap>
          <Button variant="filled">{t.node('buttons.filled')}</Button>
          <Button variant="outline">{t.node('buttons.outline')}</Button>
          <Button variant="light">{t.node('buttons.light')}</Button>
          <Button variant="subtle">{t.node('buttons.subtle')}</Button>
          <Button variant="filled" color="red">{t.node('buttons.delete')}</Button>
          <Button variant="filled" color="green">{t.node('buttons.confirm')}</Button>
          <Button loading>{t.node('buttons.loading')}</Button>
          <Button disabled>{t.node('buttons.disabled')}</Button>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('alerts.title')}</Title>
        <Stack gap="sm">
          <Alert color="blue" title={t.node('alerts.infoTitle')}>
            {t.node('alerts.infoMessage')}
          </Alert>
          <Alert color="green" title={t.node('alerts.successTitle')}>
            {t.node('alerts.successMessage')}
          </Alert>
          <Alert
            color="red"
            title={t.node('alerts.errorTitle')}
            closable
            onClose={() => console.log('Alert closed')}
          >
            {t.node('alerts.errorMessage')}
          </Alert>
          <Alert color="yellow" title={t.node('alerts.warningTitle')}>
            {t.node('alerts.warningMessage')}
          </Alert>
        </Stack>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('progress.title')}</Title>
        <Progress ref={progressRef} value={0} color="primary" />
        <Button variant="light" onClick={startProgress}>
          {t.node('progress.start')}
        </Button>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('loader.title')}</Title>
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
        <Title order={3}>{t.node('form.title')}</Title>
        <Stack gap="sm">
          <TextInput
            label={t.node('form.fullName')}
            placeholder={t('form.fullNamePlaceholder')}
            description={t.node('form.displayName')}
            required
          />
          <TextInput
            label={t.node('form.email')}
            placeholder={t('form.emailPlaceholder')}
            required
          />
          <PasswordInput
            label={t.node('form.password')}
            placeholder={t('form.passwordPlaceholder')}
            required
          />
          <Textarea
            label={t.node('form.bio')}
            placeholder={t('form.bioPlaceholder')}
            description={t.node('form.optional')}
          />
          <Select
            label={t.node('form.role')}
            data={[
              { value: 'admin', label: t('form.roleAdmin') },
              { value: 'editor', label: t('form.roleEditor') },
              { value: 'user', label: t('form.roleUser') },
              { value: 'viewer', label: t('form.roleViewer'), disabled: true },
            ]}
            value="user"
            placeholder={t('form.rolePlaceholder')}
          />
          <Checkbox label={t.node('form.agreeTerms')} color="primary" />
          <Switch label={t.node('form.emailNotifications')} color="primary" />
        </Stack>
        <Group gap="sm">
          <Button variant="filled" onClick={openModal}>
            {t.node('form.createAccount')}
          </Button>
          <Button variant="outline">{t.node('buttons.cancel')}</Button>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('modal.title')}</Title>
        <Button variant="outline" onClick={openModal}>
          {t.node('modal.openModal')}
        </Button>
      </div>

      <div>
        {show(
          () => modalOpened(),
          () => (
            <Modal
              title={t.node('modal.exampleTitle')}
              size="md"
              centered
              onClose={closeModal}
            >
              <div>
                <Text>{t.node('modal.body')}</Text>
                <Text size="sm">{t.node('modal.bodyDetail')}</Text>
              </div>
            </Modal>
          )
        )}
      </div>

      <Divider />

      <div style={section}>
        <Title order={3}>{t.node('card.title')}</Title>
        <Group gap="md" wrap>
          <Card
            shadow="sm"
            padding="md"
            withBorder
            header={t.node('card.header')}
            footer={
              <Button variant="light" size="sm">
                {t.node('card.viewDetails')}
              </Button>
            }
          >
            <Text size="sm">{t.node('card.cardDescription')}</Text>
          </Card>
          <Card shadow="md" padding="lg">
            <Text>{t.node('card.simpleCard')}</Text>
          </Card>
        </Group>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('table.title')}</Title>
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
        <Title order={3}>{t.node('tabs.title')}</Title>
        <Tabs
          items={[
            { value: 'overview', label: t.node('tabs.overview'), content: <Text>{t.node('tabs.overviewContent')}</Text> },
            { value: 'features', label: t.node('tabs.features'), content: <Text>{t.node('tabs.featuresContent')}</Text> },
            { value: 'disabled', label: t.node('tabs.disabled'), content: '', disabled: true },
            { value: 'code', label: t.node('tabs.code'), content: <Text>{t.node('tabs.codeContent')}</Text> },
          ]}
          color="primary"
        />
        <Text size="sm" class="mkt-mt-2">{t.node('tabs.pillsVariant')}</Text>
        <Tabs
          variant="pills"
          color="violet"
          items={[
            { value: 'react', label: 'React', content: 'React content' },
            { value: 'vue', label: 'Vue', content: 'Vue content' },
            { value: 'solid', label: 'Solid', content: 'Solid content' },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('accordion.title')}</Title>
        <Accordion
          variant="separated"
          items={[
            { value: 'a11y', label: t.node('accordion.a11yLabel'), content: t.node('accordion.a11yContent') },
            { value: 'theming', label: t.node('accordion.themingLabel'), content: t.node('accordion.themingContent') },
            { value: 'perf', label: t.node('accordion.perfLabel'), content: t.node('accordion.perfContent') },
          ]}
          defaultValue="a11y"
        />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('menu.title')}</Title>
        <Menu
          target={<Button variant="outline">{t.node('menu.actions')}</Button>}
          items={[
            { type: 'label', label: t.node('menu.appLabel') },
            { label: t.node('menu.settings'), onClick: () => console.log('Settings clicked') },
            { label: t.node('menu.messages'), onClick: () => console.log('Messages clicked') },
            { type: 'divider' },
            { type: 'label', label: t.node('menu.dangerLabel') },
            { label: t.node('menu.deleteAccount'), color: 'red', onClick: () => console.log('Delete clicked') },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('avatar.title')}</Title>
        <Group gap="md">
          <Avatar name="Alice Johnson" color="blue" />
          <Avatar name="Bob Smith" color="red" variant="filled" />
          <Avatar color="green" size="lg" />
          <Avatar name="Carol White" color="violet" size="xl" variant="outline" />
        </Group>
        <Text size="sm">{t.node('avatar.group')}</Text>
        <AvatarGroup spacing="sm">
          <Avatar name="A B" color="blue" variant="filled" />
          <Avatar name="C D" color="red" variant="filled" />
          <Avatar name="E F" color="green" variant="filled" />
          <Avatar name="+3" color="gray" variant="filled" />
        </AvatarGroup>
      </div>

      <div style={section}>
        <Title order={3}>{t.node('breadcrumb.title')}</Title>
        <Breadcrumb
          items={[
            { label: t.node('breadcrumb.home'), href: '#' },
            { label: t.node('breadcrumb.components'), href: '#' },
            { label: t.node('breadcrumb.title') },
          ]}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('pagination.title')}</Title>
        <Pagination
          total={20}
          defaultValue={5}
          onChange={(page) => console.log('Page:', page)}
        />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('segmented.title')}</Title>
        <SegmentedControl
          data={[
            { value: 'preview', label: t.node('segmented.preview') },
            { value: 'code', label: t.node('segmented.code') },
            { value: 'export', label: t.node('segmented.export') },
          ]}
          defaultValue="preview"
          onChange={(val) => console.log('Segment:', val)}
        />
      </div>

      <div style={{ ...section, maxWidth: '280px' }}>
        <Title order={3}>{t.node('navlink.title')}</Title>
        <NavLink
          label={t.node('navlink.dashboard')}
          active
          onClick={() => console.log('Dashboard')}
        />
        <NavLink
          label={t.node('navlink.settings')}
          description={t.node('navlink.settingsDesc')}
        >
          <NavLink label={t.node('navlink.general')} onClick={() => console.log('General')} />
          <NavLink label={t.node('navlink.security')} onClick={() => console.log('Security')} />
          <NavLink label={t.node('navlink.notifications')} disabled />
        </NavLink>
        <NavLink label={t.node('navlink.users')} onClick={() => console.log('Users')} />
      </div>

      <div style={section}>
        <Title order={3}>{t.node('toast.title')}</Title>
        <Group gap="sm" wrap>
          <Button
            variant="filled"
            color="green"
            onClick={() => toast.success(t('toast.savedMessage'), { title: t('toast.savedTitle') })}
          >
            {t.node('toast.success')}
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={() => toast.error(t('toast.errorMessage'), { title: t('toast.errorTitle') })}
          >
            {t.node('toast.error')}
          </Button>
          <Button
            variant="filled"
            color="yellow"
            onClick={() => toast.warning(t('toast.warningMessage'))}
          >
            {t.node('toast.warning')}
          </Button>
          <Button
            variant="filled"
            color="blue"
            onClick={() => toast.info(t('toast.infoMessage'), { title: t('toast.infoTitle') })}
          >
            {t.node('toast.info')}
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
      <Title order={2}>{t.node('extras.title')}</Title>
      <Text size="sm">{t.node('extras.description')}</Text>

      <Title order={3}>{t.node('extras.typographyTitle')}</Title>
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <Text size="sm">{t.node('extras.kbdTitle')}</Text>
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
          {t.node('extras.blockquote')}
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
          <ListItem>First item</ListItem>
          <ListItem>Second item</ListItem>
          <ListItem>Third item</ListItem>
        </List>
      </Stack>

      <Title order={3}>{t.node('extras.themeIconTitle')}</Title>
      <Group gap="sm">
        <ThemeIcon color="primary">{icon()}</ThemeIcon>
        <ThemeIcon color="green" variant="light">{icon()}</ThemeIcon>
        <ThemeIcon color="red" variant="outline">{icon()}</ThemeIcon>
        <ThemeIcon color="violet" variant="gradient" size="lg">{icon()}</ThemeIcon>
      </Group>

      <Text size="sm">{t.node('extras.colorSwatchTitle')}</Text>
      <Group gap="xs">
        <ColorSwatch color="#7c3aed" />
        <ColorSwatch color="#10b981" />
        <ColorSwatch color="#ef4444" />
        <ColorSwatch color="#f59e0b" />
        <ColorSwatch color="transparent" />
      </Group>

      <Divider />

      <Title order={3}>{t.node('extras.layoutTitle')}</Title>
      <SimpleGrid cols={3} spacing="md">
        <Paper padding="md" withBorder shadow="sm">
          <Text>{t.node('extras.paperContent')}</Text>
        </Paper>
        <Center>
          <Badge color="primary">{t.node('extras.centerContent')}</Badge>
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
            16:9
          </div>
        </AspectRatio>
      </SimpleGrid>

      <Flex gap="sm" wrap="wrap">
        <Indicator label="3" color="red">
          <Badge color="gray">{t.node('extras.indicatorContent')}</Badge>
        </Indicator>
        <RingProgress
          size={80}
          thickness={8}
          sections={[{ value: 70, color: 'primary' }]}
          label={<Text size="sm">{t.node('extras.ringProgressLabel')}</Text>}
        />
      </Flex>

      <Divider />

      <Title order={3}>{t.node('extras.chipsTitle')}</Title>
      <ChipGroup
        multiple
        defaultValue={['mikata']}
        onChange={(v) => console.log('Chips:', v)}
      >
        <Chip value="react">{t.node('extras.chipOption1')}</Chip>
        <Chip value="vue">{t.node('extras.chipOption2')}</Chip>
        <Chip value="solid">{t.node('extras.chipOption3')}</Chip>
        <Chip value="mikata" color="violet">{t.node('extras.chipOption4')}</Chip>
      </ChipGroup>

      <Title order={3}>{t.node('extras.ratingTitle')}</Title>
      <Rating defaultValue={4} fractions={2} color="#f59e0b" />

      <Title order={3}>{t.node('extras.pinTitle')}</Title>
      <PinInput length={6} onChange={(v) => console.log('PIN:', v)} />

      <Title order={3}>{t.node('extras.fileTitle')}</Title>
      <Stack gap="sm">
        <FileInput
          label={t.node('extras.fileTitle')}
          placeholder={t('extras.fileSelectBtn')}
          clearable
        />
        <FileButton onChange={(f) => console.log('Picked file:', f)}>
          {(open: () => void) => (
            <Button variant="outline" onClick={open}>
              {t.node('extras.fileSelectBtn')}
            </Button>
          )}
        </FileButton>
      </Stack>

      <Fieldset legend={t.node('extras.autocompleteTitle')}>
        <Stack gap="sm">
          <Autocomplete
            label={t.node('extras.autocompleteTitle')}
            placeholder={t('extras.autocompletePlaceholder')}
            data={['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry', 'Date', 'Grape', 'Lemon', 'Mango', 'Orange', 'Pear']}
            onOptionSubmit={(v) => console.log('Autocomplete:', v)}
          />
          <MultiSelect
            label={t.node('extras.multiSelectTitle')}
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
            label={t.node('extras.tagsTitle')}
            placeholder={t('extras.tagsPlaceholder')}
            defaultValue={['one', 'two']}
            onChange={(v) => console.log('Tags:', v)}
          />
          <Input placeholder="Primitive Input" />
        </Stack>
      </Fieldset>

      <Divider />

      <Title order={3}>{t.node('extras.timelineTitle')}</Title>
      <Timeline
        active={1}
        color="primary"
        items={[
          { title: t.node('extras.timelineStep1'), children: <Text size="sm">{t.node('extras.timelineStep1Desc')}</Text> },
          { title: t.node('extras.timelineStep2'), children: <Text size="sm">{t.node('extras.timelineStep2Desc')}</Text> },
          { title: t.node('extras.timelineStep3'), children: <Text size="sm">{t.node('extras.timelineStep3Desc')}</Text> },
        ]}
      />

      <Title order={3}>{t.node('extras.stepperTitle')}</Title>
      <Stepper
        active={() => activeStep()}
        color="primary"
        onStepClick={(i) => setActiveStep(i)}
        steps={[
          { label: t.node('extras.stepperAccount'), description: t.node('extras.stepperAccountDesc') },
          { label: t.node('extras.stepperProfile'), description: t.node('extras.stepperProfileDesc') },
          { label: t.node('extras.stepperConfirm'), description: t.node('extras.stepperConfirmDesc') },
        ]}
      />
      <Group gap="sm">
        <Button variant="outline" onClick={() => setActiveStep(Math.max(0, activeStep() - 1))}>Prev</Button>
        <Button onClick={() => setActiveStep(Math.min(3, activeStep() + 1))}>Next</Button>
      </Group>

      <Title order={3}>{t.node('extras.treeTitle')}</Title>
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
                  { value: 'button', label: 'Button' },
                  { value: 'input', label: 'Input' },
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

      <Title order={3}>{t.node('extras.hoverCardTitle')}</Title>
      <HoverCard
        position="bottom"
        withArrow
        target={<Button variant="outline">{t.node('extras.hoverCardTitle')}</Button>}
      >
        <Text size="sm">{t.node('extras.hoverCardBody')}</Text>
      </HoverCard>

      <Notification
        title={t.node('extras.notificationTitle')}
        color="primary"
        onClose={() => console.log('Notification closed')}
      >
        {t.node('extras.notificationDesc')}
      </Notification>

      <Paper padding="md" withBorder>
        <div style={{ position: 'relative', minHeight: '100px' }}>
          <div>Content behind overlay</div>
          <LoadingOverlay visible />
        </div>
      </Paper>

      <Button variant="light" onClick={() => setOpened(!opened())}>
        {opened() ? 'Hide details' : 'Show details'}
      </Button>
      <Collapse in={() => opened()}>
        <div style={{ padding: 'var(--mkt-space-3)' }}>
          <Text>This content is animated via Collapse.</Text>
        </div>
      </Collapse>

      <ScrollArea
        type="hover"
        height={120}
        style={{ border: '1px solid var(--mkt-color-border)', borderRadius: 'var(--mkt-radius-sm)' }}
      >
        <div style={{ padding: 'var(--mkt-space-3)' }}>
          {Array.from({ length: 30 }, (_, i) => (
            <p>{`Line ${i + 1} - scroll to see custom scrollbars.`}</p>
          ))}
        </div>
      </ScrollArea>

      <Divider />

      <Title order={3}>{t.node('extras.unstyledTitle')}</Title>
      <Group gap="md" align="center">
        <Burger
          ref={burgerRef}
          opened={false}
          ariaLabel="Toggle navigation"
          onClick={onBurgerClick}
        />
        <UnstyledButton onClick={() => console.log('Unstyled clicked')}>
          {t.node('extras.unstyledButton')}
        </UnstyledButton>
      </Group>

      <Title order={3}>{t.node('extras.copyTitle')}</Title>
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
              {copied ? t.node('extras.copyDone') : t.node('extras.copyIdle')}
            </Button>
          )}
        </CopyButton>
      </Group>

      <Title order={3}>{t.node('extras.overlayTitle')}</Title>
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
        <Text>Hidden content under overlay.</Text>
        <Text size="sm">Click the button below to dim.</Text>
        {show(
          () => overlayShown(),
          () => (
            <Overlay
              color="#000"
              opacity={0.55}
              blur={3}
              onClick={() => setOverlayShown(false)}
            >
              <Text>{t.node('extras.overlayContent')}</Text>
            </Overlay>
          )
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => setOverlayShown(!overlayShown())}>
        {t.node('extras.overlayToggle')}
      </Button>

      <Title order={3}>{t.node('extras.rangeTitle')}</Title>
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
      <Title order={2}>{t.node('formPkg.title')}</Title>
      <Text size="sm">{t.node('formPkg.description')}</Text>

      <form onSubmit={onSubmit} onReset={onReset}>
        <Stack gap="sm">
          <TextInput
            label={t.node('formPkg.email')}
            placeholder="you@example.com"
            {...(form.getInputProps('email') as any)}
          />
          <PasswordInput
            label={t.node('formPkg.password')}
            {...(form.getInputProps('password') as any)}
          />
          <TextInput
            label={t.node('formPkg.city')}
            {...(form.getInputProps('address.city') as any)}
          />
          <Checkbox
            label={t.node('formPkg.remember')}
            {...(form.getInputProps('remember', { type: 'checkbox' }) as any)}
          />
        </Stack>

        <div style={{ marginTop: '1rem' }}>
          <Title order={4}>{t.node('formPkg.itemsTitle')}</Title>
          <div>
            {each(
              () => form.values.items,
              (_item, idx) => (
                <Group gap="sm" align="end">
                  <TextInput
                    label={t.node('formPkg.itemName')}
                    {...(form.getInputProps(`items.${idx()}.name`) as any)}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Remove item"
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
            {t.node('formPkg.addItem')}
          </Button>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" disabled={submitDisabled()}>
            {t.node('formPkg.save')}
          </Button>
          <Button type="reset" variant="subtle">
            {t.node('formPkg.reset')}
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
      <Title order={2}>Dates & Time</Title>
      <Text size="sm">
        Calendar, DatePicker, Month/YearPicker, DateInput, TimeInput - all powered by Intl with zero date-library deps.
      </Text>

      <Title order={3}>Calendar (inline)</Title>
      <SimpleGrid cols={3} spacing="md">
        <Stack gap="xs">
          <Text size="sm" fw={500}>Default</Text>
          <Calendar defaultValue={new Date()} />
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>Multiple</Text>
          <Calendar type="multiple" />
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>Range</Text>
          <Calendar type="range" />
        </Stack>
      </SimpleGrid>

      <Title order={3}>DatePicker (drills day → month → year)</Title>
      <Group gap="md" align="flex-start">
        <DatePicker defaultValue={new Date()} />
        <DatePicker type="range" />
      </Group>

      <Title order={3}>MonthPicker / YearPicker</Title>
      <Group gap="md" align="flex-start">
        <MonthPicker defaultValue={new Date()} />
        <YearPicker defaultValue={new Date()} />
      </Group>

      <Title order={3}>DateInput / DatePickerInput</Title>
      <SimpleGrid cols={2} spacing="md">
        <DateInput label="DateInput (typeable)" placeholder="YYYY-MM-DD" defaultValue={new Date()} />
        <DatePickerInput label="DatePickerInput" placeholder="Pick a date" defaultValue={new Date()} />
        <DatePickerInput label="Range" type="range" placeholder="Pick a range" />
        <MonthPickerInput label="MonthPickerInput" placeholder="Pick a month" />
        <YearPickerInput label="YearPickerInput" placeholder="Pick a year" />
        <TimeInput label="TimeInput" defaultValue="14:30" withSeconds={false} />
      </SimpleGrid>

      <Divider />

      <Title order={2}>Virtualization</Title>
      <Text size="sm">
        VirtualList renders only the items in view. Scroll the list below - only ~12 nodes exist in the DOM at any time despite 10,000 items.
      </Text>

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

      <Title order={3}>Variable-size items</Title>
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
            {`Item ${n} (size ${30 + (i % 5) * 14}px)`}
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
      <Title order={2}>{t.node('icons.title')}</Title>
      <Text size="sm">{t.node('icons.subtitle')}</Text>

      <Title order={4}>{t.node('icons.buttons')}</Title>
      <Group gap="sm">
        <Button leftIcon={createIcon(LucideDownload, { size: 16 })}>
          {t.node('icons.download')}
        </Button>
        <Button variant="outline" leftIcon={createIcon(LucideHeart, { size: 16 })}>
          {t.node('icons.like')}
        </Button>
        <Button variant="subtle" color="red" leftIcon={createIcon(LucideTrash, { size: 16 })}>
          {t.node('icons.delete')}
        </Button>
      </Group>

      <Title order={4}>{t.node('icons.inputs')}</Title>
      <TextInput
        placeholder={String(t('icons.searchPlaceholder'))}
        leftSection={createIcon(LucideSearch, { size: 16 })}
      />

      <Title order={4}>{t.node('icons.feedback')}</Title>
      <Alert
        variant="light"
        color="primary"
        icon={() => createIcon(LucideInfo, { size: 20 })}
        title={t.node('icons.alertTitle')}
      >
        {t.node('icons.alertBody')}
      </Alert>
      <Notification
        color="green"
        icon={createIcon(Check, { size: 18 })}
        title={t.node('icons.notifTitle')}
      >
        {t.node('icons.notifBody')}
      </Notification>

      <Title order={4}>{t.node('icons.navigation')}</Title>
      <div style={{ maxWidth: '240px' }}>
        <NavLink label={t.node('icons.navHome')} icon={createIcon(LucideHome, { size: 16 })} active />
        <NavLink label={t.node('icons.navSettings')} icon={createIcon(LucideSettings, { size: 16 })} />
        <NavLink label={t.node('icons.navNotifications')} icon={createIcon(LucideBell, { size: 16 })} />
      </div>

      <Title order={4}>{t.node('icons.actions')}</Title>
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
        <Title order={2}>Theming demo</Title>
        <Text size="sm">
          Custom palettes + reactive primaryColor / primaryShade. Changes flow through CSS variables without remounting the provider.
        </Text>
        <Group gap="md" align="end">
          <Select
            label="primaryColor"
            data={[
              { value: 'brand', label: 'brand (violet)' },
              { value: 'teal', label: 'teal (custom)' },
              { value: 'primary', label: 'primary (built-in)' },
            ]}
            value={primaryColor()}
            onChange={(e) =>
              setPrimaryColor(
                (e.target as HTMLSelectElement).value as 'brand' | 'teal' | 'primary'
              )
            }
          />
          <Select
            label="primaryShade"
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
          <Title order={4}>Buttons</Title>
          <Group gap="sm" wrap>
            <Button>Primary</Button>
            <Button color="brand">Brand</Button>
            <Button color="teal">Teal</Button>
            <Button color="red">Red</Button>
            <Button variant="filled">Filled</Button>
          </Group>

          <Title order={4}>Badges & Alerts with custom palettes</Title>
          <Group gap="sm" wrap>
            <Badge>Primary</Badge>
            <Badge color="brand">Brand</Badge>
            <Badge color="teal">Teal</Badge>
          </Group>
          <Alert variant="light" color="brand" title="Brand palette">
            This Alert uses the custom brand palette via the runtime-emitted rules.
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
      <h1>{t.node('app.title')}</h1>
      <p style={{ marginBottom: '1rem', opacity: '0.7' }}>
        {t.node('app.subtitle')}
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
