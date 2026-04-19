import { ErrorBoundary } from '@mikata/kit/client';
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';

// Intentionally fails so the ErrorBoundary below can show its fallback.
// The throw happens on the server during SSR and — re-run on the client
// during navigation — also when a user clicks this link without a full
// page reload. Either way the error is serialised into the page shell
// and re-raised by `useLoaderData()` so a parent boundary catches it.
export async function load(_ctx: LoadContext) {
  throw new Error('boom — the server said no');
}

function BoomInner() {
  const data = useLoaderData<typeof load>();
  // Reading the signal throws because the loader errored. The parent
  // ErrorBoundary catches it and renders its fallback instead.
  return <p>should never render: {String(data())}</p>;
}

export default function BoomRoute() {
  return (
    <section class="page">
      <h2>Loader error demo</h2>
      <ErrorBoundary
        fallback={(err, reset) => (
          <div class="error">
            <p>
              <strong>Oops:</strong> {err.message}
            </p>
            <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <BoomInner />
      </ErrorBoundary>
    </section>
  );
}
