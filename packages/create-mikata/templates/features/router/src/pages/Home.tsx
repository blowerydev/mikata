import { signal } from 'mikata';

export function Home() {
  const [count, setCount] = signal(0);
  return (
    <section>
      <h1>Home</h1>
      <p>Welcome to your new Mikata app.</p>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
    </section>
  );
}
