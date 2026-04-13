/**
 * Simulated API with configurable latency and failure rates.
 * Exercises async patterns, abort handling, and error states.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface ApiError {
  status: number;
  message: string;
}

// In-memory database
let users: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
  { id: 4, name: 'Diana Ross', email: 'diana@example.com', role: 'guest' },
];

let posts: Post[] = [
  { id: 1, userId: 1, title: 'Hello World', body: 'First post!', createdAt: '2024-01-01' },
  { id: 2, userId: 1, title: 'Mikata Rules', body: 'Building a framework', createdAt: '2024-01-02' },
  { id: 3, userId: 2, title: 'Testing 123', body: 'Is this thing on?', createdAt: '2024-01-03' },
];

let nextUserId = 5;
let nextPostId = 4;

interface MockConfig {
  /** Simulated latency in ms (default: 50) */
  latency?: number;
  /** Probability of random failure (0-1, default: 0) */
  failureRate?: number;
}

const defaultConfig: MockConfig = { latency: 50, failureRate: 0 };

async function simulateNetwork(
  signal?: AbortSignal,
  config: MockConfig = defaultConfig
): Promise<void> {
  const latency = config.latency ?? 50;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      if (Math.random() < (config.failureRate ?? 0)) {
        reject({ status: 500, message: 'Internal Server Error' });
        return;
      }
      resolve();
    }, latency);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

// --- User API ---

export async function fetchUsers(
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<User[]> {
  await simulateNetwork(options?.signal, options?.config);
  return [...users];
}

export async function fetchUser(
  id: number,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<User> {
  await simulateNetwork(options?.signal, options?.config);
  const user = users.find((u) => u.id === id);
  if (!user) throw { status: 404, message: `User ${id} not found` };
  return { ...user };
}

export async function createUser(
  data: Omit<User, 'id'>,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<User> {
  await simulateNetwork(options?.signal, options?.config);
  const user: User = { ...data, id: nextUserId++ };
  users.push(user);
  return { ...user };
}

export async function updateUser(
  id: number,
  data: Partial<Omit<User, 'id'>>,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<User> {
  await simulateNetwork(options?.signal, options?.config);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw { status: 404, message: `User ${id} not found` };
  users[index] = { ...users[index], ...data };
  return { ...users[index] };
}

export async function deleteUser(
  id: number,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<void> {
  await simulateNetwork(options?.signal, options?.config);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw { status: 404, message: `User ${id} not found` };
  users.splice(index, 1);
}

// --- Post API ---

export async function fetchPosts(
  userId?: number,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<Post[]> {
  await simulateNetwork(options?.signal, options?.config);
  if (userId !== undefined) {
    return posts.filter((p) => p.userId === userId).map((p) => ({ ...p }));
  }
  return [...posts];
}

export async function createPost(
  data: Omit<Post, 'id' | 'createdAt'>,
  options?: { signal?: AbortSignal; config?: MockConfig }
): Promise<Post> {
  await simulateNetwork(options?.signal, options?.config);
  const post: Post = {
    ...data,
    id: nextPostId++,
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  return { ...post };
}

// --- Reset (for tests) ---

export function resetMockData(): void {
  users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
    { id: 4, name: 'Diana Ross', email: 'diana@example.com', role: 'guest' },
  ];
  posts = [
    { id: 1, userId: 1, title: 'Hello World', body: 'First post!', createdAt: '2024-01-01' },
    { id: 2, userId: 1, title: 'Mikata Rules', body: 'Building a framework', createdAt: '2024-01-02' },
    { id: 3, userId: 2, title: 'Testing 123', body: 'Is this thing on?', createdAt: '2024-01-03' },
  ];
  nextUserId = 5;
  nextPostId = 4;
}
