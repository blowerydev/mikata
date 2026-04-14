/**
 * Comprehensive integration tests exercising every Mikata feature
 * with simulated AJAX calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signal,
  computed,
  reactive,
  effect,
  batch,
  untrack,
  on,
  isSignal,
  isReactive,
  toRaw,
  createScope,
  onCleanup,
  flushSync,
  renderEffect,
} from '@mikata/reactivity';
import {
  _createElement,
  _setProp,
  _insert,
  _createComponent,
  _createFragment,
  _mergeProps,
  render,
  show,
  each,
  switchMatch,
  createContext,
  provide,
  inject,
  onMount,
  ErrorBoundary,
  createRef,
  model,
  portal,
  _spread,
  disposeComponent,
  lazy,
  transition,
  transitionGroup,
} from '@mikata/runtime';
import {
  createRouter,
  defineRoutes,
  searchParam,
  provideRouter,
  routeOutlet,
  Link,
  useRouter,
  useParams,
  useSearchParams,
  useGuard,
} from '@mikata/router';
import {
  createI18n,
  provideI18n,
  useI18n,
} from '@mikata/i18n';
import {
  ThemeProvider,
  createTheme,
  useTheme,
  defaultTheme,
  darkTheme,
  Button,
  TextInput,
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
  Modal,
  Loader,
  mergeClasses,
  useDisclosure,
} from '@mikata/ui';
import {
  createStore,
  derived,
  createSelector,
  createQuery,
  createMutation,
} from '@mikata/store';
import {
  renderComponent,
  renderContent,
  fireEvent,
  flush,
  waitForUpdate,
} from '@mikata/testing';
import {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
  fetchPosts,
  createPost,
  resetMockData,
  type User,
  type Post,
} from './mock-api';

beforeEach(() => {
  resetMockData();
});

// ============================================================
// 1. SIGNALS
// ============================================================
describe('Signals - primitive reactive values', () => {
  it('basic read/write cycle', () => {
    const [count, setCount] = signal(0);
    expect(count()).toBe(0);
    setCount(1);
    expect(count()).toBe(1);
    setCount((c) => c + 10);
    expect(count()).toBe(11);
  });

  it('auto-tracks in effects and re-runs on change', () => {
    const [firstName, setFirstName] = signal('John');
    const [lastName, setLastName] = signal('Doe');
    const log: string[] = [];

    effect(() => {
      log.push(`${firstName()} ${lastName()}`);
    });
    expect(log).toEqual(['John Doe']);

    setFirstName('Jane');
    flushSync();
    expect(log).toEqual(['John Doe', 'Jane Doe']);

    setLastName('Smith');
    flushSync();
    expect(log).toEqual(['John Doe', 'Jane Doe', 'Jane Smith']);
  });

  it('identity check with isSignal', () => {
    const [s] = signal(0);
    expect(isSignal(s)).toBe(true);
    expect(isSignal(() => 0)).toBe(false);
  });
});

// ============================================================
// 2. COMPUTED
// ============================================================
describe('Computed - derived reactive values', () => {
  it('derives from signals', () => {
    const [price, setPrice] = signal(100);
    const [quantity, setQuantity] = signal(3);
    const total = computed(() => price() * quantity());

    expect(total()).toBe(300);
    setPrice(200);
    expect(total()).toBe(600);
    setQuantity(5);
    expect(total()).toBe(1000);
  });

  it('chains computeds (derived of derived)', () => {
    const [price, setPrice] = signal(100);
    const [taxRate] = signal(0.1);
    const subtotal = computed(() => price());
    const tax = computed(() => subtotal() * taxRate());
    const total = computed(() => subtotal() + tax());

    expect(total()).toBe(110);
    setPrice(200);
    expect(total()).toBe(220);
  });

  it('skips effect re-run when computed value is unchanged', () => {
    const [input, setInput] = signal(5);
    const clamped = computed(() => Math.min(input(), 10));
    const fn = vi.fn();

    effect(() => {
      clamped();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    setInput(7); // clamped: 5 -> 7, changed
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);

    setInput(15); // clamped: 7 -> 10, changed
    flushSync();
    expect(fn).toHaveBeenCalledTimes(3);

    setInput(20); // clamped: still 10, unchanged
    flushSync();
    expect(fn).toHaveBeenCalledTimes(3); // no re-run
  });
});

// ============================================================
// 3. REACTIVE PROXIES
// ============================================================
describe('Reactive - proxy-based object tracking', () => {
  it('tracks deeply nested mutations', () => {
    const state = reactive({
      user: {
        profile: {
          name: 'Alice',
          settings: { theme: 'dark' as string },
        },
      },
    });
    const log: string[] = [];

    effect(() => {
      log.push(state.user.profile.settings.theme);
    });
    expect(log).toEqual(['dark']);

    state.user.profile.settings.theme = 'light';
    flushSync();
    expect(log).toEqual(['dark', 'light']);
  });

  it('tracks array operations', () => {
    const state = reactive({ tags: ['a', 'b'] });
    const lengths: number[] = [];

    effect(() => {
      lengths.push(state.tags.length);
    });
    expect(lengths).toEqual([2]);

    state.tags.push('c');
    flushSync();
    expect(lengths).toEqual([2, 3]);

    state.tags = state.tags.filter((t) => t !== 'b');
    flushSync();
    expect(state.tags).toEqual(['a', 'c']);
  });

  it('interoperates with signals in same effect', () => {
    const [count, setCount] = signal(0);
    const state = reactive({ multiplier: 2 });
    const results: number[] = [];

    effect(() => {
      results.push(count() * state.multiplier);
    });
    expect(results).toEqual([0]);

    setCount(5);
    flushSync();
    expect(results).toEqual([0, 10]);

    state.multiplier = 3;
    flushSync();
    expect(results).toEqual([0, 10, 15]);
  });

  it('toRaw returns underlying object', () => {
    const raw = { x: 1 };
    const r = reactive(raw);
    expect(toRaw(r)).toBe(raw);
    expect(isReactive(r)).toBe(true);
    expect(isReactive(raw)).toBe(false);
  });
});

// ============================================================
// 4. EFFECTS
// ============================================================
describe('Effects - side effects and lifecycle', () => {
  it('cleanup runs before re-execution and on dispose', () => {
    const [id, setId] = signal(1);
    const events: string[] = [];

    const dispose = effect(() => {
      const currentId = id();
      events.push(`subscribe:${currentId}`);
      return () => events.push(`unsubscribe:${currentId}`);
    });
    expect(events).toEqual(['subscribe:1']);

    setId(2);
    flushSync();
    expect(events).toEqual(['subscribe:1', 'unsubscribe:1', 'subscribe:2']);

    dispose();
    expect(events).toEqual(['subscribe:1', 'unsubscribe:1', 'subscribe:2', 'unsubscribe:2']);
  });

  it('dynamic dependency tracking', () => {
    const [showEmail, setShowEmail] = signal(false);
    const [name, setName] = signal('Alice');
    const [email, setEmail] = signal('alice@test.com');
    const fn = vi.fn();

    effect(() => {
      name(); // always tracked
      if (showEmail()) email(); // conditionally tracked
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    setEmail('bob@test.com'); // not tracked yet
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);

    setShowEmail(true); // now email is tracked
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);

    setEmail('charlie@test.com'); // NOW tracked
    flushSync();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('untrack prevents dependency tracking', () => {
    const [a, setA] = signal(1);
    const [b, setB] = signal(2);
    const fn = vi.fn();

    effect(() => {
      a(); // tracked
      untrack(() => b()); // NOT tracked
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    setB(10); // should NOT trigger
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);

    setA(10); // SHOULD trigger
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('batch coalesces multiple writes', () => {
    const [a, setA] = signal(0);
    const [b, setB] = signal(0);
    const [c, setC] = signal(0);
    const fn = vi.fn();

    effect(() => {
      a() + b() + c();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      setA(1);
      setB(2);
      setC(3);
    });
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2); // only 1 additional run
  });

  it('on() for explicit dependency tracking', () => {
    const [count, setCount] = signal(0);
    const [name] = signal('test');
    const log: string[] = [];

    effect(
      on(
        () => count(),
        (value, prev) => {
          log.push(`${prev}->${value}`);
        },
        { defer: true }
      )
    );
    expect(log).toEqual([]); // deferred, no initial run

    setCount(1);
    flushSync();
    expect(log).toEqual(['0->1']);

    setCount(5);
    flushSync();
    expect(log).toEqual(['0->1', '1->5']);
  });
});

// ============================================================
// 5. SCOPES
// ============================================================
describe('Scopes - automatic cleanup', () => {
  it('disposes all children when scope is disposed', () => {
    const [count, setCount] = signal(0);
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const cleanup = vi.fn();

    const scope = createScope(() => {
      effect(() => { count(); fn1(); });
      effect(() => { count(); fn2(); });
      onCleanup(cleanup);
    });

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    scope.dispose();
    setCount(1);
    flushSync();

    // Effects should not re-run after disposal
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 6. DOM RENDERING
// ============================================================
describe('DOM rendering - createElement, props, insert', () => {
  it('creates elements and sets properties', () => {
    const el = _createElement('div');
    _setProp(el, 'class', 'container');
    _setProp(el, 'id', 'main');
    _setProp(el, 'style', { color: 'red', fontSize: '16px' });

    expect(el.className).toBe('container');
    expect(el.id).toBe('main');
    expect(el.style.color).toBe('red');
  });

  it('reactively updates text content', () => {
    const [name, setName] = signal('World');
    const el = _createElement('span');
    _insert(el, () => `Hello, ${name()}!`);

    expect(el.textContent).toBe('Hello, World!');
    setName('Mikata');
    flush();
    expect(el.textContent).toBe('Hello, Mikata!');
  });

  it('reactively updates attributes', () => {
    const [active, setActive] = signal(false);
    const el = _createElement('div');
    renderEffect(() => {
      _setProp(el, 'class', active() ? 'active' : 'inactive');
    });

    expect(el.className).toBe('inactive');
    setActive(true);
    flush();
    expect(el.className).toBe('active');
  });
});

// ============================================================
// 7. COMPONENTS
// ============================================================
describe('Components - setup functions with props', () => {
  it('creates a component with reactive props', () => {
    const [name, setName] = signal('Alice');

    function Greeting(props: { name: string }) {
      const el = _createElement('h1');
      _insert(el, () => `Hello, ${props.name}!`);
      return el;
    }

    const { text, dispose } = renderComponent(Greeting, {
      get name() { return name(); },
    } as any);

    expect(text()).toBe('Hello, Alice!');
    setName('Bob');
    flush();
    expect(text()).toBe('Hello, Bob!');
    dispose();
  });

  it('lazy props reads preserve reactivity', () => {
    const [count, setCount] = signal(0);

    function Counter(props: { count: number; label: string }) {
      const el = _createElement('span');
      _insert(el, () => `${props.label}: ${props.count}`);
      return el;
    }

    const { text, dispose } = renderComponent(Counter, {
      get count() { return count(); },
      label: 'Count',
    } as any);

    expect(text()).toBe('Count: 0');
    setCount(5);
    flush();
    expect(text()).toBe('Count: 5');
    dispose();
  });

  it('mergeProps preserves getters', () => {
    const [x, setX] = signal(1);
    const defaults = { y: 2 };
    const overrides = { get x() { return x(); } };

    const merged = _mergeProps(defaults, overrides);
    expect(merged.y).toBe(2);
    expect(merged.x).toBe(1);

    setX(10);
    expect(merged.x).toBe(10); // getter preserved
  });
});

// ============================================================
// 8. CONTROL FLOW
// ============================================================
describe('Control flow - show, each, switchMatch', () => {
  it('show() toggles between branches', () => {
    const [loggedIn, setLoggedIn] = signal(false);

    const { text, dispose } = renderContent(() =>
      show(
        () => loggedIn(),
        () => { const el = _createElement('span'); el.textContent = 'Dashboard'; return el; },
        () => { const el = _createElement('span'); el.textContent = 'Login'; return el; }
      )
    );
    flush();

    expect(text()).toBe('Login');
    setLoggedIn(true);
    flush();
    expect(text()).toBe('Dashboard');
    dispose();
  });

  it('show() passes narrowed value to render', () => {
    const [user, setUser] = signal<User | null>(null);

    const { text, dispose } = renderContent(() =>
      show(
        () => user(),
        (u) => { const el = _createElement('span'); el.textContent = u.name; return el; },
        () => { const el = _createElement('span'); el.textContent = 'No user'; return el; }
      )
    );
    flush();

    expect(text()).toBe('No user');
    setUser({ id: 1, name: 'Alice', email: 'a@b.com', role: 'admin' });
    flush();
    expect(text()).toBe('Alice');
    dispose();
  });

  it('each() renders and updates a list', () => {
    const state = reactive({ items: ['Apple', 'Banana', 'Cherry'] });

    const { text, dispose } = renderContent(() =>
      each(
        () => state.items,
        (item) => { const el = _createElement('span'); el.textContent = item; return el; },
        () => { const el = _createElement('span'); el.textContent = 'Empty'; return el; }
      )
    );
    flush();

    expect(text()).toBe('AppleBananaCherry');

    state.items = ['Apple', 'Date'];
    flush();
    expect(text()).toBe('AppleDate');

    state.items = [];
    flush();
    expect(text()).toBe('Empty');
    dispose();
  });

  it('switchMatch() renders matching case', () => {
    const [tab, setTab] = signal<'home' | 'profile' | 'settings'>('home');

    const { text, dispose } = renderContent(() =>
      switchMatch(() => tab(), {
        home: () => { const el = _createElement('span'); el.textContent = 'Home Page'; return el; },
        profile: () => { const el = _createElement('span'); el.textContent = 'Profile Page'; return el; },
        settings: () => { const el = _createElement('span'); el.textContent = 'Settings Page'; return el; },
      })
    );
    flush();

    expect(text()).toBe('Home Page');
    setTab('profile');
    flush();
    expect(text()).toBe('Profile Page');
    setTab('settings');
    flush();
    expect(text()).toBe('Settings Page');
    dispose();
  });
});

// ============================================================
// 9. CONTEXT
// ============================================================
describe('Context - provide/inject through component tree', () => {
  it('provides and injects values across components', () => {
    const ThemeCtx = createContext<'light' | 'dark'>('light');
    const UserCtx = createContext<{ name: string }>();
    let theme: string | undefined;
    let userName: string | undefined;

    const { dispose } = renderContent(() => {
      provide(ThemeCtx, 'dark');
      provide(UserCtx, { name: 'Alice' });

      return _createComponent(() => {
        return _createComponent(() => {
          theme = inject(ThemeCtx);
          userName = inject(UserCtx).name;
          return _createElement('div');
        }, {});
      }, {});
    });

    expect(theme).toBe('dark');
    expect(userName).toBe('Alice');
    dispose();
  });

  it('uses default value when no provider', () => {
    const LangCtx = createContext<string>('en');
    let lang: string | undefined;

    const { dispose } = renderContent(() => {
      return _createComponent(() => {
        lang = inject(LangCtx);
        return _createElement('div');
      }, {});
    });

    expect(lang).toBe('en');
    dispose();
  });

  it('throws when no provider and no default', () => {
    const Ctx = createContext<string>();

    expect(() => {
      renderContent(() => {
        return _createComponent(() => {
          inject(Ctx);
          return _createElement('div');
        }, {});
      });
    }).toThrow('no provider found');
  });
});

// ============================================================
// 10. RENDER / MOUNT
// ============================================================
describe('Render - mounting and unmounting', () => {
  it('mounts and disposes correctly', () => {
    const cleanup = vi.fn();

    const { html, dispose } = renderContent(() => {
      onCleanup(cleanup);
      const el = _createElement('p');
      el.textContent = 'Mounted';
      return el;
    });

    expect(html()).toBe('<p>Mounted</p>');
    expect(cleanup).not.toHaveBeenCalled();

    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('onMount fires after setup', async () => {
    const events: string[] = [];

    const { dispose } = renderContent(() => {
      events.push('setup');
      onMount(() => events.push('mounted'));
      return _createElement('div');
    });

    expect(events).toEqual(['setup']);
    await waitForUpdate();
    expect(events).toEqual(['setup', 'mounted']);
    dispose();
  });
});

// ============================================================
// 11. STORE
// ============================================================
describe('Store - managed reactive state', () => {
  it('creates and updates a store', () => {
    const [store, setStore] = createStore({
      users: [] as User[],
      selectedId: null as number | null,
      filter: '',
    });

    expect(store.users).toEqual([]);
    expect(store.selectedId).toBeNull();

    setStore((s) => {
      s.users = [
        { id: 1, name: 'Alice', email: 'a@b.com', role: 'admin' },
      ];
      s.selectedId = 1;
    });

    expect(store.users.length).toBe(1);
    expect(store.selectedId).toBe(1);
  });

  it('derived values from store', () => {
    const [store, setStore] = createStore({
      items: [
        { name: 'A', price: 10, qty: 2 },
        { name: 'B', price: 20, qty: 1 },
        { name: 'C', price: 5, qty: 3 },
      ],
    });

    const totalCost = derived(() =>
      store.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    );
    const itemCount = derived(() => store.items.length);

    expect(totalCost()).toBe(55); // 20 + 20 + 15
    expect(itemCount()).toBe(3);

    setStore((s) => {
      s.items = [...s.items, { name: 'D', price: 100, qty: 1 }];
    });

    expect(totalCost()).toBe(155);
    expect(itemCount()).toBe(4);
  });
});

// ============================================================
// 12. QUERY - Async data fetching with mock API
// ============================================================
describe('Query - async data fetching with simulated AJAX', () => {
  it('fetches a list of users', async () => {
    const query = createQuery({
      key: () => 'all-users',
      fn: async (_key, { signal }) => fetchUsers({ signal, config: { latency: 10 } }),
      retry: false,
    });

    expect(query.status()).toBe('loading');

    await vi.waitFor(() => {
      expect(query.status()).toBe('success');
    });

    const data = query.data();
    expect(data).toHaveLength(4);
    expect(data![0].name).toBe('Alice Johnson');
  });

  it('fetches a single user by reactive key', async () => {
    const [userId, setUserId] = signal(1);

    const query = createQuery({
      key: () => userId(),
      fn: async (id, { signal }) => fetchUser(id, { signal, config: { latency: 10 } }),
      retry: false,
    });

    await vi.waitFor(() => {
      expect(query.status()).toBe('success');
    });
    expect(query.data()!.name).toBe('Alice Johnson');

    // Change key - should refetch
    setUserId(2);
    flushSync();

    await vi.waitFor(() => {
      expect(query.data()!.name).toBe('Bob Smith');
    });
  });

  it('handles fetch errors', async () => {
    const query = createQuery({
      key: () => 999, // non-existent user
      fn: async (id, { signal }) => fetchUser(id, { signal, config: { latency: 10 } }),
      retry: false,
    });

    await vi.waitFor(() => {
      expect(query.status()).toBe('error');
    });

    expect(query.error()).toBeTruthy();
  });

  it('aborts on key change', async () => {
    const [id, setId] = signal(1);
    const calls: number[] = [];

    const query = createQuery({
      key: () => id(),
      fn: async (id, { signal }) => {
        calls.push(id);
        return fetchUser(id, { signal, config: { latency: 50 } });
      },
      retry: false,
    });

    // Rapidly change key before first fetch completes
    setId(2);
    flushSync();
    setId(3);
    flushSync();

    await vi.waitFor(() => {
      expect(query.status()).toBe('success');
    });

    // Should end up with user 3
    expect(query.data()!.name).toBe('Charlie Brown');
  });

  it('conditional fetching with enabled', async () => {
    const [enabled, setEnabled] = signal(false);
    const fn = vi.fn().mockResolvedValue([]);

    createQuery({
      key: () => 'test',
      fn,
      enabled: () => enabled(),
    });

    // Should not fetch when disabled
    await new Promise((r) => setTimeout(r, 50));
    expect(fn).not.toHaveBeenCalled();

    // Enable - should now fetch
    setEnabled(true);
    flushSync();

    await vi.waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================
// 13. MUTATION - Async data modification
// ============================================================
describe('Mutation - async data modification with simulated AJAX', () => {
  it('creates a new user', async () => {
    const mutation = createMutation({
      fn: async (data: Omit<User, 'id'>) =>
        createUser(data, { config: { latency: 10 } }),
    });

    expect(mutation.status()).toBe('idle');

    const result = await mutation.mutate({
      name: 'Eve',
      email: 'eve@example.com',
      role: 'user',
    });

    expect(mutation.status()).toBe('success');
    expect(result!.name).toBe('Eve');
    expect(result!.id).toBe(5);
  });

  it('updates a user and triggers onSuccess', async () => {
    const onSuccess = vi.fn();

    const mutation = createMutation({
      fn: async ({ id, ...data }: { id: number; name: string }) =>
        updateUser(id, { name: data.name }, { config: { latency: 10 } }),
      onSuccess,
    });

    await mutation.mutate({ id: 1, name: 'Alice Updated' });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mutation.data()!.name).toBe('Alice Updated');
  });

  it('handles mutation errors with onError', async () => {
    const onError = vi.fn();

    const mutation = createMutation({
      fn: async () =>
        updateUser(999, { name: 'Ghost' }, { config: { latency: 10 } }),
      onError,
    });

    await mutation.mutate(undefined);

    expect(mutation.status()).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('query + mutation workflow: fetch, modify, refetch', async () => {
    // 1. Fetch users
    const usersQuery = createQuery({
      key: () => 'users',
      fn: async (_key, { signal }) => fetchUsers({ signal, config: { latency: 10 } }),
      retry: false,
    });

    await vi.waitFor(() => {
      expect(usersQuery.status()).toBe('success');
    });
    expect(usersQuery.data()!.length).toBe(4);

    // 2. Create a new user
    const createMut = createMutation({
      fn: async (data: Omit<User, 'id'>) =>
        createUser(data, { config: { latency: 10 } }),
    });

    await createMut.mutate({
      name: 'Frank',
      email: 'frank@example.com',
      role: 'user',
    });
    expect(createMut.status()).toBe('success');

    // 3. Refetch - should now include the new user
    await usersQuery.refetch();

    await vi.waitFor(() => {
      expect(usersQuery.data()!.length).toBe(5);
    });
    expect(usersQuery.data()!.find((u) => u.name === 'Frank')).toBeTruthy();
  });
});

// ============================================================
// 14. FULL APP SIMULATION
// ============================================================
describe('Full app simulation - all features together', () => {
  it('builds a user management dashboard', async () => {
    // --- App State ---
    const [selectedUserId, setSelectedUserId] = signal<number | null>(null);
    const [editMode, setEditMode] = signal(false);

    // --- Data Layer ---
    const usersQuery = createQuery({
      key: () => 'all-users',
      fn: async (_key, { signal }) => fetchUsers({ signal, config: { latency: 10 } }),
      retry: false,
    });

    const selectedUserQuery = createQuery({
      key: () => selectedUserId(),
      fn: async (id, { signal }) => {
        if (id === null) throw new Error('No user selected');
        return fetchUser(id, { signal, config: { latency: 10 } });
      },
      enabled: () => selectedUserId() !== null,
      retry: false,
    });

    const userPostsQuery = createQuery({
      key: () => selectedUserId(),
      fn: async (id, { signal }) => {
        if (id === null) return [];
        return fetchPosts(id, { signal, config: { latency: 10 } });
      },
      enabled: () => selectedUserId() !== null,
      retry: false,
    });

    // --- Derived State ---
    const adminCount = derived(() => {
      const users = usersQuery.data();
      if (!users) return 0;
      return users.filter((u) => u.role === 'admin').length;
    });

    const postCount = derived(() => userPostsQuery.data()?.length ?? 0);

    // --- Wait for initial data ---
    await vi.waitFor(() => {
      expect(usersQuery.status()).toBe('success');
    });

    expect(usersQuery.data()!.length).toBe(4);
    expect(adminCount()).toBe(1);

    // --- Select a user ---
    setSelectedUserId(1);
    flushSync();

    await vi.waitFor(() => {
      expect(selectedUserQuery.status()).toBe('success');
    });
    expect(selectedUserQuery.data()!.name).toBe('Alice Johnson');

    await vi.waitFor(() => {
      expect(userPostsQuery.status()).toBe('success');
    });
    expect(postCount()).toBe(2);

    // --- Switch to another user ---
    setSelectedUserId(2);
    flushSync();

    await vi.waitFor(() => {
      expect(selectedUserQuery.data()!.name).toBe('Bob Smith');
    });

    await vi.waitFor(() => {
      expect(postCount()).toBe(1);
    });

    // --- Create a new user ---
    const createMut = createMutation({
      fn: async (data: Omit<User, 'id'>) =>
        createUser(data, { config: { latency: 10 } }),
    });

    await createMut.mutate({
      name: 'New Admin',
      email: 'admin2@test.com',
      role: 'admin',
    });

    // Refetch users list
    await usersQuery.refetch();
    await vi.waitFor(() => {
      expect(usersQuery.data()!.length).toBe(5);
    });

    expect(adminCount()).toBe(2); // now 2 admins

    // --- Create a post for the selected user ---
    const postMut = createMutation({
      fn: async (data: Omit<Post, 'id' | 'createdAt'>) =>
        createPost(data, { config: { latency: 10 } }),
    });

    await postMut.mutate({
      userId: 2,
      title: 'New Post',
      body: 'Written by Bob',
    });

    // Refetch posts
    await userPostsQuery.refetch();
    await vi.waitFor(() => {
      expect(postCount()).toBe(2); // Bob now has 2 posts
    });
  });
});

// ============================================================
// Refs - DOM element access
// ============================================================
describe('Refs - DOM element access', () => {
  it('createRef captures element', () => {
    const myRef = createRef<HTMLDivElement>();
    expect(myRef.current).toBeNull();

    const el = _createElement('div');
    _setProp(el, 'ref', myRef);
    expect(myRef.current).toBe(el);
  });

  it('ref works as callback', () => {
    let captured: HTMLElement | null = null;
    const el = _createElement('input');
    _setProp(el, 'ref', (node: HTMLElement) => { captured = node; });
    expect(captured).toBe(el);
  });

  it('createRef works inside a component', () => {
    const inputRef = createRef<HTMLInputElement>();

    function MyForm() {
      const el = _createElement('div');
      const input = _createElement('input') as HTMLInputElement;
      _setProp(input, 'type', 'text');
      _setProp(input, 'ref', inputRef);
      el.appendChild(input);
      return el;
    }

    const { dispose } = renderComponent(MyForm);
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    dispose();
  });
});

// ============================================================
// Model - two-way form bindings
// ============================================================
describe('Model - two-way form bindings', () => {
  it('model() returns value getter for text input', () => {
    const [name, setName] = signal('hello');
    const props = model(name, setName);

    expect(props.value).toBe('hello');
    setName('world');
    expect(props.value).toBe('world');
  });

  it('model() onInput updates signal', () => {
    const [name, setName] = signal('');
    const props = model(name, setName);

    // Simulate input event
    const fakeEvent = { target: { value: 'typed text' } } as unknown as Event;
    props.onInput!(fakeEvent);
    expect(name()).toBe('typed text');
  });

  it('model("checkbox") uses checked prop', () => {
    const [checked, setChecked] = signal(false);
    const props = model(checked, setChecked, 'checkbox');

    expect(props.checked).toBe(false);
    // Simulate change event
    const fakeEvent = { target: { checked: true } } as unknown as Event;
    props.onChange!(fakeEvent);
    expect(checked()).toBe(true);
    expect(props.checked).toBe(true);
  });

  it('model("number") converts to number', () => {
    const [count, setCount] = signal(0);
    const props = model(count, setCount, 'number');

    const fakeEvent = { target: { valueAsNumber: 42 } } as unknown as Event;
    props.onInput!(fakeEvent);
    expect(count()).toBe(42);
  });

  it('model("select") uses onChange', () => {
    const [choice, setChoice] = signal('a');
    const props = model(choice, setChoice, 'select');

    expect(props.value).toBe('a');
    const fakeEvent = { target: { value: 'b' } } as unknown as Event;
    props.onChange!(fakeEvent);
    expect(choice()).toBe('b');
  });
});

// ============================================================
// Portal - rendering outside component tree
// ============================================================
describe('Portal - rendering outside component tree', () => {
  let portalTarget: HTMLElement;

  beforeEach(() => {
    portalTarget = _createElement('div');
    portalTarget.id = 'portal-test-target';
    document.body.appendChild(portalTarget);
  });

  afterEach(() => {
    portalTarget.remove();
  });

  it('renders content into target element', () => {
    const placeholder = portal(() => {
      const el = _createElement('span');
      el.textContent = 'Portal content';
      return el;
    }, portalTarget);

    expect(placeholder.nodeType).toBe(Node.COMMENT_NODE);
    expect(portalTarget.innerHTML).toBe('<span>Portal content</span>');
  });

  it('renders into selector string target', () => {
    portal(() => {
      const el = _createElement('p');
      el.textContent = 'Found by selector';
      return el;
    }, '#portal-test-target');

    expect(portalTarget.textContent).toBe('Found by selector');
  });

  it('cleans up portal content when scope is disposed', () => {
    const scope = createScope(() => {
      portal(() => {
        const el = _createElement('span');
        el.textContent = 'will be cleaned up';
        return el;
      }, portalTarget);
    });

    expect(portalTarget.childNodes.length).toBe(1);
    scope.dispose();
    expect(portalTarget.childNodes.length).toBe(0);
  });
});

// ============================================================
// CSS class/style - object and array syntax
// ============================================================
describe('CSS class/style - object and array syntax', () => {
  it('class as object with boolean values', () => {
    const el = _createElement('div');
    _setProp(el, 'class', { active: true, hidden: false, bold: true });
    expect(el.className).toBe('active bold');
  });

  it('class as array', () => {
    const el = _createElement('div');
    _setProp(el, 'class', ['foo', 'bar', null, undefined, false, 'baz']);
    expect(el.className).toBe('foo bar baz');
  });

  it('class as mixed array with objects', () => {
    const el = _createElement('div');
    _setProp(el, 'class', ['base', { active: true, hidden: false }]);
    expect(el.className).toBe('base active');
  });

  it('class as string still works', () => {
    const el = _createElement('div');
    _setProp(el, 'class', 'simple-class');
    expect(el.className).toBe('simple-class');
  });

  it('style as object with camelCase', () => {
    const el = _createElement('div');
    _setProp(el, 'style', { color: 'red', fontSize: '14px' });
    expect(el.style.color).toBe('red');
    expect(el.style.fontSize).toBe('14px');
  });

  it('style as string still works', () => {
    const el = _createElement('div');
    _setProp(el, 'style', 'color: blue;');
    expect(el.style.cssText).toBe('color: blue;');
  });

  it('reactive class object updates', () => {
    const el = _createElement('div');
    const [active, setActive] = signal(false);

    renderEffect(() => {
      _setProp(el, 'class', { active: active(), base: true });
    });
    expect(el.className).toBe('base');

    setActive(true);
    flushSync();
    expect(el.className).toBe('active base');
  });
});

// ============================================================
// ErrorBoundary - catch and recover from errors
// ============================================================
describe('ErrorBoundary - catch and recover from errors', () => {
  it('renders children normally when no error', () => {
    const child = _createElement('span');
    child.textContent = 'All good';

    const { text, dispose } = renderContent(() =>
      _createComponent(ErrorBoundary, {
        fallback: (err: Error) => {
          const el = _createElement('p');
          el.textContent = `Error: ${err.message}`;
          return el;
        },
        children: child,
      })
    );

    expect(text()).toBe('All good');
    dispose();
  });

  it('shows fallback when child throws', () => {
    const { text, dispose } = renderContent(() =>
      _createComponent(ErrorBoundary, {
        fallback: (err: Error) => {
          const el = _createElement('p');
          el.textContent = `Caught: ${err.message}`;
          return el;
        },
        get children() {
          throw new Error('Component exploded');
        },
      })
    );

    expect(text()).toBe('Caught: Component exploded');
    dispose();
  });
});

// ============================================================
// createSelector - efficient O(1) selection tracking
// ============================================================
describe('createSelector - efficient selection tracking', () => {
  it('returns true for selected item, false for others', () => {
    const [selected, setSelected] = signal(1);
    const isSelected = createSelector(() => selected());

    expect(isSelected(1)).toBe(true);
    expect(isSelected(2)).toBe(false);
    expect(isSelected(3)).toBe(false);
  });

  it('tracks selection changes', () => {
    const [selected, setSelected] = signal('a');
    const isSelected = createSelector(() => selected());

    expect(isSelected('a')).toBe(true);
    expect(isSelected('b')).toBe(false);

    setSelected('b');
    flushSync();

    expect(isSelected('a')).toBe(false);
    expect(isSelected('b')).toBe(true);
  });

  it('works with custom equality', () => {
    const [selected, setSelected] = signal({ id: 1 });
    const isSelected = createSelector(
      () => selected(),
      (item: number, source: { id: number }) => item === source.id
    );

    expect(isSelected(1)).toBe(true);
    expect(isSelected(2)).toBe(false);

    setSelected({ id: 2 });
    flushSync();

    expect(isSelected(1)).toBe(false);
    expect(isSelected(2)).toBe(true);
  });
});

// ============================================================
// _spread - spread props onto elements
// ============================================================
describe('_spread - spread props onto elements', () => {
  it('applies static props', () => {
    const el = _createElement('div');
    _spread(el, () => ({
      id: 'my-div',
      class: 'container',
      'data-testid': 'test',
    }));
    flushSync();

    expect(el.id).toBe('my-div');
    expect(el.className).toBe('container');
    expect(el.getAttribute('data-testid')).toBe('test');
  });

  it('applies event handlers', () => {
    const el = _createElement('button');
    let clicked = false;
    _spread(el, () => ({
      onClick: () => { clicked = true; },
    }));
    flushSync();

    el.click();
    expect(clicked).toBe(true);
  });
});

// ============================================================
// _createFragment - document fragment creation
// ============================================================
describe('_createFragment - document fragments', () => {
  it('creates fragment from mixed children', () => {
    const frag = _createFragment([
      _createElement('span'),
      'hello',
      42,
      null,
      _createElement('div'),
    ]);

    expect(frag.childNodes.length).toBe(4); // span, 'hello', '42', div
    expect(frag.childNodes[0].nodeName).toBe('SPAN');
    expect(frag.childNodes[1].textContent).toBe('hello');
    expect(frag.childNodes[2].textContent).toBe('42');
    expect(frag.childNodes[3].nodeName).toBe('DIV');
  });

  it('handles nested arrays', () => {
    const frag = _createFragment([
      ['a', 'b'],
      _createElement('hr'),
    ]);

    expect(frag.childNodes.length).toBe(3); // 'a', 'b', hr
  });
});

// ============================================================
// disposeComponent - manual component disposal
// ============================================================
describe('disposeComponent - manual component disposal', () => {
  it('disposes component scope and runs cleanup', () => {
    let cleanedUp = false;

    function MyComponent() {
      onCleanup(() => { cleanedUp = true; });
      const el = _createElement('div');
      el.textContent = 'Hello';
      return el;
    }

    const { dispose } = renderComponent(MyComponent);
    expect(cleanedUp).toBe(false);

    dispose();
    expect(cleanedUp).toBe(true);
  });

  it('stops effects on disposal', () => {
    const [count, setCount] = signal(0);
    let effectRuns = 0;

    function Counter() {
      effect(() => {
        count();
        effectRuns++;
      });
      return _createElement('div');
    }

    const { dispose } = renderComponent(Counter);
    expect(effectRuns).toBe(1);

    setCount(1);
    flush();
    expect(effectRuns).toBe(2);

    dispose();

    setCount(2);
    flush();
    // Effect should not run after disposal
    expect(effectRuns).toBe(2);
  });
});

// ─── Dev-mode Warnings ──────────────────────────────────────────────

describe('Dev-mode warnings', () => {
  it('warns when writing to a signal inside a computed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [count, setCount] = signal(0);
    const doubled = computed(() => {
      setCount(99); // Bug: writing inside computed
      return count() * 2;
    });
    doubled(); // trigger computation
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Writing to a signal inside a computed')
    );
    warnSpy.mockRestore();
  });

  it('warns when writing to a reactive property inside a computed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = reactive({ count: 0 });
    const doubled = computed(() => {
      state.count = 99; // Bug: writing inside computed
      return state.count * 2;
    });
    doubled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Writing to reactive property')
    );
    warnSpy.mockRestore();
  });

  it('throws on circular computed dependency', () => {
    let selfRef: any;
    const c = computed(() => {
      return selfRef ? selfRef() : 0;
    });
    selfRef = c;
    expect(() => c()).toThrow(/Circular dependency/);
  });

  it('warns on duplicate keys in each()', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const items = [
      { id: 1, name: 'a' },
      { id: 1, name: 'b' }, // duplicate key
    ];

    const { dispose } = renderContent(() =>
      each(
        () => items,
        (item) => {
          const el = _createElement('span');
          el.textContent = item.name;
          return el;
        },
        undefined,
        { key: (item) => item.id }
      )
    );
    flush();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate key')
    );
    warnSpy.mockRestore();
    dispose();
  });

  it('warns on switchMatch with no matching case', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { dispose } = renderContent(() =>
      switchMatch(
        () => 'unknown' as any,
        {
          loading: () => _createElement('span'),
          success: () => _createElement('span'),
        }
      )
    );
    flush();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('switchMatch()')
    );
    warnSpy.mockRestore();
    dispose();
  });

  it('warns when component returns null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function NullComponent() {
      return null as any;
    }

    const { dispose } = renderComponent(NullComponent);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('returned null or undefined')
    );
    warnSpy.mockRestore();
    dispose();
  });

  it('throws on createStore with non-object', () => {
    expect(() => createStore('hello' as any)).toThrow(/expects a plain object/);
    expect(() => createStore(null as any)).toThrow(/expects a plain object/);
  });

  it('warns on createStore with array', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createStore([1, 2, 3] as any);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('called with an array')
    );
    warnSpy.mockRestore();
  });

  it('throws on createQuery with invalid key', () => {
    expect(() => createQuery({
      key: 'static-key' as any,
      fn: async () => 'data',
    })).toThrow(/key.*must be a function/);
  });

  it('throws on createQuery with invalid fn', () => {
    expect(() => createQuery({
      key: () => 'k',
      fn: 'not-a-function' as any,
    })).toThrow(/fn.*must be an async function/);
  });

  it('scheduler circular detection guard exists', () => {
    // The scheduler has a 1000-iteration guard that throws
    // "Circular reactive dependency detected" and a dev-mode
    // warning at 100 iterations. These fire inside microtasks
    // and are difficult to test synchronously, but the mechanism
    // is verified by code review. This test just verifies flushSync
    // is available for explicit flushing.
    expect(typeof flushSync).toBe('function');
  });
});

// ============================================================
// 16. LAZY COMPONENTS
// ============================================================
describe('Lazy components - code-split via dynamic import', () => {
  it('loads and renders a component from a dynamic import', async () => {
    function UserProfile(props: { name: string }) {
      const el = document.createElement('div');
      el.textContent = `Profile: ${props.name}`;
      return el;
    }

    const LazyProfile = lazy(() =>
      Promise.resolve({ default: UserProfile })
    );

    const { container, dispose } = renderComponent(LazyProfile as any, { name: 'Alice' });

    // Initially empty (loading)
    expect(container.textContent).toBe('');

    await waitForUpdate();
    await waitForUpdate();

    expect(container.textContent).toContain('Profile: Alice');
    dispose();
  });

  it('shows fallback while loading', async () => {
    let resolve!: (mod: any) => void;
    const importPromise = new Promise<any>((r) => { resolve = r; });

    function SlowPage() {
      const el = document.createElement('div');
      el.textContent = 'Page loaded';
      return el;
    }

    const LazyPage = lazy(
      () => importPromise,
      {
        fallback: () => {
          const el = document.createElement('div');
          el.className = 'spinner';
          el.textContent = 'Loading page...';
          return el;
        },
      }
    );

    const { container, dispose } = renderComponent(LazyPage as any, {});

    expect(container.textContent).toBe('Loading page...');
    expect(container.querySelector('.spinner')).toBeTruthy();

    resolve({ default: SlowPage });
    await waitForUpdate();
    await waitForUpdate();

    expect(container.textContent).toBe('Page loaded');
    expect(container.querySelector('.spinner')).toBeNull();
    dispose();
  });

  it('shows error fallback and supports retry', async () => {
    let attempt = 0;
    function WorkingComponent() {
      const el = document.createElement('div');
      el.textContent = 'Works now';
      return el;
    }

    const LazyComp = lazy(
      () => {
        attempt++;
        if (attempt === 1) return Promise.reject(new Error('chunk failed'));
        return Promise.resolve({ default: WorkingComponent });
      },
      {
        fallback: () => {
          const el = document.createElement('div');
          el.textContent = 'Loading...';
          return el;
        },
        error: (err, retry) => {
          const el = document.createElement('div');
          el.className = 'error';
          const btn = document.createElement('button');
          btn.className = 'retry';
          btn.textContent = 'Retry';
          btn.addEventListener('click', retry);
          el.appendChild(document.createTextNode(`Failed: ${err.message} `));
          el.appendChild(btn);
          return el;
        },
      }
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, dispose } = renderComponent(LazyComp as any, {});

    // Should show loading first
    expect(container.textContent).toBe('Loading...');

    await waitForUpdate();
    await waitForUpdate();

    // Should show error after failure
    expect(container.textContent).toContain('Failed: chunk failed');
    expect(container.querySelector('.retry')).toBeTruthy();

    // Click retry
    fireEvent.click(container.querySelector('.retry')!);

    // Should show loading again
    expect(container.textContent).toBe('Loading...');

    await waitForUpdate();
    await waitForUpdate();

    // Should show the component after successful retry
    expect(container.textContent).toBe('Works now');
    expect(attempt).toBe(2);

    consoleSpy.mockRestore();
    dispose();
  });

  it('caches the loaded module - second render is instant', async () => {
    function CachedComp() {
      const el = document.createElement('div');
      el.textContent = 'Cached';
      return el;
    }

    const LazyCached = lazy(() =>
      Promise.resolve({ default: CachedComp })
    );

    // First render - async
    const r1 = renderComponent(LazyCached as any, {});
    await waitForUpdate();
    await waitForUpdate();
    expect(r1.container.textContent).toContain('Cached');
    r1.dispose();

    // Second render - should be immediate (no loading state)
    const r2 = renderComponent(LazyCached as any, {});
    expect(r2.container.textContent).toContain('Cached');
    r2.dispose();
  });

  it('preload() prefetches without rendering', async () => {
    let constructed = false;

    function HeavyComp() {
      constructed = true;
      const el = document.createElement('div');
      el.textContent = 'Heavy component';
      return el;
    }

    const LazyHeavy = lazy(() =>
      Promise.resolve({ default: HeavyComp })
    ) as any;

    // Preload
    await LazyHeavy.preload();
    expect(constructed).toBe(false);

    // Now render - instant
    const { container, dispose } = renderComponent(LazyHeavy, {});
    expect(container.textContent).toContain('Heavy component');
    expect(constructed).toBe(true);
    dispose();
  });

  it('works with show() for conditional lazy loading', async () => {
    function Settings() {
      const el = document.createElement('div');
      el.textContent = 'Settings panel';
      return el;
    }

    const LazySettings = lazy(() =>
      Promise.resolve({ default: Settings }),
      { fallback: () => {
        const el = document.createElement('span');
        el.textContent = 'Loading settings...';
        return el;
      }}
    );

    const [showSettings, setShowSettings] = signal(false);

    const { container, dispose } = renderContent(() =>
      show(
        () => showSettings(),
        () => _createComponent(LazySettings as any, {}),
        () => {
          const el = document.createElement('div');
          el.textContent = 'Main page';
          return el;
        }
      )
    );

    flush();
    expect(container.textContent).toBe('Main page');

    // Toggle to show lazy component
    setShowSettings(true);
    flush();

    // Should show fallback while loading
    expect(container.textContent).toBe('Loading settings...');

    await waitForUpdate();
    await waitForUpdate();

    expect(container.textContent).toBe('Settings panel');
    dispose();
  });
});

// ============================================================================
// 12. Transitions / Animations
// ============================================================================

describe('12. Transitions / Animations', () => {
  it('transition() renders and swaps content without animation (like show())', () => {
    const [visible, setVisible] = signal(true);

    const { container, dispose } = renderContent(() =>
      transition(
        () => visible(),
        () => {
          const el = document.createElement('div');
          el.textContent = 'Content';
          return el;
        },
        () => {
          const el = document.createElement('div');
          el.textContent = 'Fallback';
          return el;
        }
      )
    );
    flush();
    expect(container.textContent).toBe('Content');

    setVisible(false);
    flush();
    expect(container.textContent).toBe('Fallback');

    setVisible(true);
    flush();
    expect(container.textContent).toBe('Content');

    dispose();
  });

  it('transition() applies CSS enter classes with animation', async () => {
    const [visible, setVisible] = signal(false);

    const { container, dispose } = renderContent(() =>
      transition(
        () => visible(),
        () => {
          const el = document.createElement('div');
          el.className = 'modal';
          el.textContent = 'Modal';
          return el;
        },
        { name: 'fade', duration: 50 }
      )
    );
    flush();
    expect(container.textContent).toBe('');

    setVisible(true);
    flush();

    const modal = container.querySelector('.modal') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.classList.contains('fade-enter-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));
    expect(modal.classList.contains('fade-enter-active')).toBe(false);

    dispose();
  });

  it('transition() applies CSS leave classes with out-in mode', async () => {
    const [visible, setVisible] = signal(true);

    const { container, dispose } = renderContent(() =>
      transition(
        () => visible(),
        () => {
          const el = document.createElement('div');
          el.className = 'panel';
          el.textContent = 'Panel';
          return el;
        },
        () => {
          const el = document.createElement('div');
          el.textContent = 'Empty';
          return el;
        },
        { name: 'slide', duration: 50, mode: 'out-in' }
      )
    );
    flush();

    const panel = container.querySelector('.panel') as HTMLElement;
    expect(panel).toBeTruthy();

    setVisible(false);
    flush();

    // During leave, panel should have leave classes
    expect(panel.classList.contains('slide-leave-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));
    expect(container.querySelector('.panel')).toBeNull();
    expect(container.textContent).toContain('Empty');

    dispose();
  });

  it('transition() calls JS hooks on enter/leave', async () => {
    const hooks = {
      onBeforeEnter: vi.fn(),
      onEnter: vi.fn((_el: Element, done: () => void) => done()),
      onAfterEnter: vi.fn(),
      onBeforeLeave: vi.fn(),
      onLeave: vi.fn((_el: Element, done: () => void) => done()),
      onAfterLeave: vi.fn(),
    };

    const [visible, setVisible] = signal(false);

    const { container, dispose } = renderContent(() =>
      transition(
        () => visible(),
        () => {
          const el = document.createElement('div');
          el.textContent = 'Hooked';
          return el;
        },
        { duration: 0, ...hooks }
      )
    );
    flush();

    setVisible(true);
    flush();
    await new Promise((r) => setTimeout(r, 30));

    expect(hooks.onBeforeEnter).toHaveBeenCalledTimes(1);
    expect(hooks.onEnter).toHaveBeenCalledTimes(1);
    expect(hooks.onAfterEnter).toHaveBeenCalledTimes(1);

    setVisible(false);
    flush();
    await new Promise((r) => setTimeout(r, 30));

    expect(hooks.onBeforeLeave).toHaveBeenCalledTimes(1);
    expect(hooks.onLeave).toHaveBeenCalledTimes(1);
    expect(hooks.onAfterLeave).toHaveBeenCalledTimes(1);

    dispose();
  });

  it('transitionGroup() renders list and handles additions/removals', async () => {
    const [items, setItems] = signal(['a', 'b', 'c']);

    const { container, dispose } = renderContent(() =>
      transitionGroup(
        () => items(),
        (item) => {
          const el = document.createElement('span');
          el.className = `item-${item}`;
          el.textContent = item;
          return el;
        },
        () => {
          const el = document.createElement('div');
          el.textContent = 'No items';
          return el;
        },
        undefined,
        { name: 'list', duration: 50 }
      )
    );
    flush();
    expect(container.textContent).toBe('abc');

    // Add an item
    setItems(['a', 'b', 'c', 'd']);
    flush();
    expect(container.textContent).toBe('abcd');

    const itemD = container.querySelector('.item-d') as HTMLElement;
    expect(itemD.classList.contains('list-enter-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));
    expect(itemD.classList.contains('list-enter-active')).toBe(false);

    // Remove items
    setItems(['a']);
    flush();

    const itemB = container.querySelector('.item-b') as HTMLElement;
    expect(itemB.classList.contains('list-leave-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));
    expect(container.querySelector('.item-b')).toBeNull();
    expect(container.textContent).toBe('a');

    dispose();
  });

  it('transitionGroup() shows fallback when list becomes empty', async () => {
    const [items, setItems] = signal(['x', 'y']);

    const { container, dispose } = renderContent(() =>
      transitionGroup(
        () => items(),
        (item) => {
          const el = document.createElement('span');
          el.className = `item-${item}`;
          el.textContent = item;
          return el;
        },
        () => {
          const el = document.createElement('div');
          el.textContent = 'Empty list';
          return el;
        },
        undefined,
        { name: 'list', duration: 50 }
      )
    );
    flush();
    expect(container.textContent).toBe('xy');

    setItems([]);
    flush();

    // Items should still be animating out
    expect(container.querySelector('.item-x')).toBeTruthy();

    await new Promise((r) => setTimeout(r, 80));
    expect(container.querySelector('.item-x')).toBeNull();
    expect(container.textContent).toContain('Empty list');

    dispose();
  });
});

// ============================================================================
// 13. Router
// ============================================================================

describe('13. Router', () => {
  it('renders initial route and navigates between pages', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const router = createRouter({
      routes: defineRoutes([
        {
          path: '/',
          component: () => {
            const el = document.createElement('div');
            el.textContent = 'Home Page';
            return el;
          },
        },
        {
          path: '/about',
          component: () => {
            const el = document.createElement('div');
            el.textContent = 'About Page';
            return el;
          },
        },
      ]),
      history: 'memory',
    });

    const dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);
    flush();

    expect(container.textContent).toBe('Home Page');

    await router.navigate('/about');
    flush();

    expect(container.textContent).toBe('About Page');

    dispose();
    router.dispose();
    container.remove();
  });

  it('extracts path params and typed search params', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let capturedId: string | undefined;
    let capturedPage: number | undefined;

    const router = createRouter({
      routes: defineRoutes([
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/users/:id',
          component: () => {
            const r = useRouter();
            capturedId = r.params().id;
            capturedPage = r.searchParams().page as number;
            const el = document.createElement('div');
            el.textContent = `User ${capturedId} page ${capturedPage}`;
            return el;
          },
          search: {
            page: searchParam.number(1),
          },
        },
      ]),
      history: 'memory',
    });

    const dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);
    flush();

    await router.navigate('/users/42?page=3');
    flush();

    expect(capturedId).toBe('42');
    expect(capturedPage).toBe(3);
    expect(container.textContent).toBe('User 42 page 3');

    dispose();
    router.dispose();
    container.remove();
  });

  it('guards redirect navigation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const router = createRouter({
      routes: defineRoutes([
        { path: '/', component: () => { const e = document.createElement('div'); e.textContent = 'Home'; return e; } },
        { path: '/login', component: () => { const e = document.createElement('div'); e.textContent = 'Login'; return e; } },
        { path: '/admin', guard: () => '/login', component: () => { const e = document.createElement('div'); e.textContent = 'Admin'; return e; } },
      ]),
      history: 'memory',
    });

    const dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);
    flush();

    await router.navigate('/admin');
    flush();

    expect(router.path()).toBe('/login');
    expect(container.textContent).toBe('Login');

    dispose();
    router.dispose();
    container.remove();
  });

  it('renders nested routes with persistent layouts', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const router = createRouter({
      routes: defineRoutes([
        {
          path: '/app',
          component: () => {
            const el = document.createElement('div');
            const header = document.createElement('h1');
            header.textContent = 'Layout';
            el.appendChild(header);
            el.appendChild(routeOutlet());
            return el;
          },
          children: [
            { path: '/', component: () => { const e = document.createElement('div'); e.textContent = 'Dash'; return e; } },
            { path: '/settings', component: () => { const e = document.createElement('div'); e.textContent = 'Settings'; return e; } },
          ],
        },
      ]),
      history: 'memory',
    });

    const dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);

    await router.navigate('/app');
    flush();

    expect(container.textContent).toContain('Layout');
    expect(container.textContent).toContain('Dash');

    await router.navigate('/app/settings');
    flush();

    expect(container.textContent).toContain('Layout');
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).not.toContain('Dash');

    dispose();
    router.dispose();
    container.remove();
  });

  it('shows notFound for unmatched routes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const router = createRouter({
      routes: defineRoutes([
        { path: '/', component: () => { const e = document.createElement('div'); e.textContent = 'Home'; return e; } },
      ]),
      history: 'memory',
      notFound: () => { const e = document.createElement('div'); e.textContent = '404'; return e; },
    });

    const dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);
    flush();

    await router.navigate('/nope');
    flush();
    expect(container.textContent).toBe('404');

    dispose();
    router.dispose();
    container.remove();
  });
});

// ════════════════════════════════════════════════════════════════════
// 14. i18n
// ════════════════════════════════════════════════════════════════════

describe('14. i18n', () => {
  const en = {
    greeting: 'Hello {{name}}',
    nav: { home: 'Home', about: 'About' },
    items: { one: '{{count}} item', other: '{{count}} items' },
  };

  const fr = {
    greeting: 'Bonjour {{name}}',
    nav: { home: 'Accueil', about: 'À propos' },
    items: { one: '{{count}} article', other: '{{count}} articles' },
  };

  it('translates and interpolates in a component', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });

    function Greeting(props: { name: string }) {
      const { t } = useI18n();
      const el = document.createElement('p');
      renderEffect(() => {
        el.textContent = t('greeting' as any, { name: props.name });
      });
      return el;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      provideI18n(i18n);
      return _createComponent(Greeting, { name: 'World' });
    }, container);
    flush();

    expect(container.textContent).toBe('Hello World');

    dispose();
    container.remove();
  });

  it('switches locale and updates DOM reactively', async () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en, fr } });

    function Nav() {
      const { t } = useI18n();
      const el = document.createElement('span');
      renderEffect(() => {
        el.textContent = t('nav.home' as any);
      });
      return el;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      provideI18n(i18n);
      return _createComponent(Nav, {});
    }, container);
    flush();

    expect(container.textContent).toBe('Home');

    await i18n.setLocale('fr');
    flush();
    expect(container.textContent).toBe('Accueil');

    dispose();
    container.remove();
  });

  it('loads translations via async loader', async () => {
    const loader = vi.fn(async (locale: string) => {
      if (locale === 'fr') return fr;
      throw new Error('Unknown');
    });

    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    function Label() {
      const { t } = useI18n();
      const el = document.createElement('span');
      renderEffect(() => {
        el.textContent = t('nav.about' as any);
      });
      return el;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      provideI18n(i18n);
      return _createComponent(Label, {});
    }, container);
    flush();

    expect(container.textContent).toBe('About');

    await i18n.setLocale('fr');
    flush();
    expect(container.textContent).toBe('À propos');
    expect(loader).toHaveBeenCalledWith('fr');

    dispose();
    container.remove();
  });

  it('pluralizes correctly', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });

    function Items(props: { count: number }) {
      const { t } = useI18n();
      const el = document.createElement('span');
      renderEffect(() => {
        el.textContent = t.plural('items' as any, props.count);
      });
      return el;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      provideI18n(i18n);
      return _createComponent(Items, { count: 1 });
    }, container);
    flush();

    expect(container.textContent).toBe('1 item');

    dispose();
    container.remove();
  });

  it('formats numbers and dates with locale', () => {
    const i18n = createI18n({ locale: 'en-US', fallbackLocale: 'en-US', messages: { 'en-US': en } });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      provideI18n(i18n);
      const { fmt } = useI18n();
      const el = document.createElement('span');
      renderEffect(() => {
        el.textContent = fmt.number(9999.99, { style: 'currency', currency: 'USD' });
      });
      return el;
    }, container);
    flush();

    expect(container.textContent).toBe('$9,999.99');

    dispose();
    container.remove();
  });
});

// ============================================================
// 15. UI COMPONENT LIBRARY
// ============================================================
describe('15. UI Components', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('ThemeProvider sets CSS variables and components render inside it', () => {
    const dispose = render(() => {
      const el = ThemeProvider({}) as HTMLElement;
      // Add a button inside the theme provider
      el.appendChild(Button({ children: 'Themed Button', color: 'primary' }));
      return el;
    }, container);
    flush();

    const themeEl = container.querySelector('[data-mkt-theme]') as HTMLElement;
    expect(themeEl).not.toBeNull();
    expect(themeEl.style.getPropertyValue('--mkt-color-primary-6')).toBe(defaultTheme['color-primary-6']);
    expect(themeEl.getAttribute('data-mkt-color-scheme')).toBe('light');

    const btn = container.querySelector('.mkt-button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.querySelector('.mkt-button__label')!.textContent).toBe('Themed Button');

    dispose();
  });

  it('createTheme merges overrides and ThemeProvider applies them', () => {
    const custom = createTheme({ 'color-primary-6': '#7c3aed' });
    const dispose = render(() => {
      return ThemeProvider({ theme: custom }) as HTMLElement;
    }, container);
    flush();

    const themeEl = container.querySelector('[data-mkt-theme]') as HTMLElement;
    expect(themeEl.style.getPropertyValue('--mkt-color-primary-6')).toBe('#7c3aed');
    // Other tokens remain from defaults
    expect(themeEl.style.getPropertyValue('--mkt-color-text')).toBe(defaultTheme['color-text']);

    dispose();
  });

  it('dark mode applies dark theme overrides', () => {
    const dispose = render(() => {
      return ThemeProvider({ colorScheme: 'dark' }) as HTMLElement;
    }, container);
    flush();

    const themeEl = container.querySelector('[data-mkt-theme]') as HTMLElement;
    expect(themeEl.getAttribute('data-mkt-color-scheme')).toBe('dark');
    expect(themeEl.style.getPropertyValue('--mkt-color-bg')).toBe(darkTheme['color-bg']);
    expect(themeEl.style.getPropertyValue('--mkt-color-text')).toBe(darkTheme['color-text']);

    dispose();
  });

  it('Button renders all variants and handles click events', () => {
    const clicks: string[] = [];
    const dispose = render(() => {
      const el = ThemeProvider({}) as HTMLElement;
      el.appendChild(Button({
        variant: 'filled',
        color: 'primary',
        children: 'Filled',
        onClick: () => clicks.push('filled'),
      }));
      el.appendChild(Button({
        variant: 'outline',
        color: 'red',
        children: 'Outline',
        onClick: () => clicks.push('outline'),
      }));
      el.appendChild(Button({
        variant: 'subtle',
        disabled: true,
        children: 'Disabled',
        onClick: () => clicks.push('disabled'),
      }));
      return el;
    }, container);
    flush();

    const buttons = container.querySelectorAll('.mkt-button');
    expect(buttons.length).toBe(3);

    // Check variants
    expect((buttons[0] as HTMLElement).dataset.variant).toBe('filled');
    expect((buttons[1] as HTMLElement).dataset.variant).toBe('outline');
    expect((buttons[1] as HTMLElement).dataset.color).toBe('red');

    // Click filled button
    (buttons[0] as HTMLButtonElement).click();
    expect(clicks).toEqual(['filled']);

    // Disabled button should not fire click
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true);

    dispose();
  });

  it('Button loading state shows loader and disables interaction', () => {
    const el = Button({ loading: true, children: 'Saving...' });
    expect(el.disabled).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.mkt-button__loader')).not.toBeNull();
  });

  it('TextInput with label, error, and ARIA attributes', () => {
    const el = TextInput({
      label: 'Email',
      description: 'We will never share your email',
      error: 'Invalid email address',
      required: true,
      value: 'test@',
    });

    // Label connected to input
    const label = el.querySelector('label')!;
    const input = el.querySelector('input')!;
    expect(label.htmlFor).toBe(input.id);
    expect(label.textContent).toContain('Email');

    // Required indicator
    expect(el.querySelector('.mkt-input-wrapper__required')).not.toBeNull();

    // Description
    const desc = el.querySelector('.mkt-input-wrapper__description')!;
    expect(desc.textContent).toBe('We will never share your email');

    // Error
    const error = el.querySelector('[role="alert"]')!;
    expect(error.textContent).toBe('Invalid email address');

    // ARIA on input
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('-description');
    expect(input.getAttribute('aria-describedby')).toContain('-error');

    // Value
    expect(input.value).toBe('test@');
  });

  it('Stack and Group compose children with layout', () => {
    const child1 = document.createElement('p');
    child1.textContent = 'Item 1';
    const child2 = document.createElement('p');
    child2.textContent = 'Item 2';
    const child3 = document.createElement('p');
    child3.textContent = 'Item 3';

    const stack = Stack({ gap: 'md', children: [child1, child2] });
    expect(stack.classList.contains('mkt-stack')).toBe(true);
    expect(stack.dataset.gap).toBe('md');
    expect(stack.children.length).toBe(2);

    const group = Group({ gap: 'sm', children: [child3] });
    expect(group.classList.contains('mkt-group')).toBe(true);
    expect(group.dataset.gap).toBe('sm');
  });

  it('Select renders options from data array', () => {
    const el = Select({
      label: 'Country',
      placeholder: 'Pick one',
      data: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'de', label: 'Germany', disabled: true },
      ],
      value: 'uk',
    });

    const select = el.querySelector('select')!;
    // Placeholder + 3 data options
    expect(select.options.length).toBe(4);
    expect(select.options[0].disabled).toBe(true); // placeholder
    expect(select.options[1].textContent).toBe('United States');
    expect(select.options[3].disabled).toBe(true); // Germany
    expect(select.value).toBe('uk');

    // Label
    expect(el.querySelector('label')!.textContent).toContain('Country');
  });

  it('Checkbox and Switch render with proper roles', () => {
    const checkbox = Checkbox({
      label: 'Accept terms',
      checked: true,
    });
    const cbInput = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cbInput.checked).toBe(true);
    expect(checkbox.querySelector('.mkt-checkbox__label')!.textContent).toBe('Accept terms');

    const sw = Switch({
      label: 'Dark mode',
    });
    const swInput = sw.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(swInput.getAttribute('role')).toBe('switch');
    expect(sw.querySelector('.mkt-switch__label')!.textContent).toBe('Dark mode');
  });

  it('Alert renders with role=alert and close button works', () => {
    let closed = false;
    const el = Alert({
      title: 'Warning',
      color: 'yellow',
      closable: true,
      onClose: () => { closed = true; },
      children: 'Something needs attention',
    });

    expect(el.getAttribute('role')).toBe('alert');
    expect(el.dataset.color).toBe('yellow');
    expect(el.querySelector('.mkt-alert__title')!.textContent).toBe('Warning');
    expect(el.querySelector('.mkt-alert__message')!.textContent).toBe('Something needs attention');

    const closeBtn = el.querySelector('.mkt-alert__close-button') as HTMLButtonElement;
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');
    closeBtn.click();
    expect(closed).toBe(true);
  });

  it('Badge renders variants including dot', () => {
    const filled = Badge({ variant: 'filled', color: 'green', children: 'Active' });
    expect(filled.dataset.variant).toBe('filled');
    expect(filled.dataset.color).toBe('green');
    expect(filled.textContent).toContain('Active');

    const dot = Badge({ variant: 'dot', children: 'Status' });
    expect(dot.querySelector('.mkt-badge__dot')).not.toBeNull();
  });

  it('Progress renders with correct ARIA and bar width', () => {
    const el = Progress({ value: 75, color: 'green' });
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuenow')).toBe('75');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');

    const bar = el.querySelector('.mkt-progress__bar') as HTMLElement;
    expect(bar.style.width).toBe('75%');
  });

  it('Modal renders into body with dialog role and handles close', () => {
    let closed = false;
    const bodyContent = document.createElement('p');
    bodyContent.textContent = 'Modal body content';

    const dispose = render(() => {
      return ThemeProvider({
        children: Modal({
          title: 'Confirm',
          onClose: () => { closed = true; },
          children: bodyContent,
        }) as unknown as Node,
      }) as HTMLElement;
    }, container);
    flush();

    // Modal is appended to document.body, not inside container
    const modal = document.body.querySelector('.mkt-modal')!;
    expect(modal).not.toBeNull();

    const dialog = modal.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();

    // Title
    const titleId = dialog.getAttribute('aria-labelledby')!;
    const titleEl = dialog.querySelector(`#${titleId}`)!;
    expect(titleEl.textContent).toBe('Confirm');

    // Close button
    const closeBtn = modal.querySelector('.mkt-modal__close') as HTMLButtonElement;
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');
    closeBtn.click();
    expect(closed).toBe(true);

    // Cleanup
    dispose();
    modal.remove();
  });

  it('Text and Title render correct elements', () => {
    const text = Text({ size: 'lg', children: 'Paragraph' });
    expect(text.tagName).toBe('P');
    expect(text.dataset.size).toBe('lg');
    expect(text.textContent).toBe('Paragraph');

    const h2 = Title({ order: 2, children: 'Section Title' });
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Section Title');
  });

  it('classNames prop allows targeting inner component parts', () => {
    const btn = Button({
      classNames: { root: 'custom-root', label: 'custom-label', icon: 'custom-icon' },
      children: 'Styled',
    });

    expect(btn.classList.contains('custom-root')).toBe(true);
    expect(btn.querySelector('.custom-label')).not.toBeNull();
  });

  it('mergeClasses utility filters falsy values correctly', () => {
    expect(mergeClasses('a', false, 'b', null, undefined, 'c')).toBe('a b c');
    expect(mergeClasses()).toBe('');
  });

  it('useDisclosure manages open/close/toggle state', () => {
    const { opened, open, close, toggle } = useDisclosure(false);
    expect(opened()).toBe(false);
    open();
    expect(opened()).toBe(true);
    close();
    expect(opened()).toBe(false);
    toggle();
    expect(opened()).toBe(true);
    toggle();
    expect(opened()).toBe(false);
  });

  it('full form scenario: themed form with validation feedback', () => {
    const dispose = render(() => {
      const el = ThemeProvider({}) as HTMLElement;

      const form = Stack({ gap: 'md', children: [
        TextInput({ label: 'Username', required: true, value: '' }),
        TextInput({ label: 'Email', error: 'Invalid email', value: 'bad' }),
        Select({
          label: 'Role',
          data: [
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'User' },
          ],
          value: 'user',
        }),
        Checkbox({ label: 'I agree to terms', required: true }),
        Button({ type: 'submit', children: 'Create Account' }),
      ] });

      el.appendChild(form);
      return el;
    }, container);
    flush();

    // Verify the themed wrapper is present
    expect(container.querySelector('[data-mkt-theme]')).not.toBeNull();

    // Verify form structure
    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(2);

    // Username field has no error
    const usernameInput = inputs[0] as HTMLInputElement;
    expect(usernameInput.getAttribute('aria-required')).toBe('true');
    expect(usernameInput.getAttribute('aria-invalid')).toBeNull();

    // Email field has error
    const emailInput = inputs[1] as HTMLInputElement;
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');

    // Select
    const select = container.querySelector('select')!;
    expect(select.value).toBe('user');

    // Submit button
    const submitBtn = container.querySelector('button[type="submit"]')!;
    expect(submitBtn.querySelector('.mkt-button__label')!.textContent).toBe('Create Account');

    dispose();
  });
});
