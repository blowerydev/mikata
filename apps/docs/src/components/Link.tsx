import { useRouter } from '@mikata/router';

export interface LinkProps {
  to: string;
  children?: unknown;
  class?: string;
}

/**
 * Internal `<a>` that honours Vite's `base` so server-rendered HTML,
 * right-click-open-in-new-tab, and JS-disabled browsers all land on the
 * correct URL. `@mikata/router`'s Link sets `href` to the raw route path,
 * which breaks when the site is served under `/mikata/` on GitHub Pages -
 * this wrapper prefixes the href and still delegates click-nav to the router.
 */
export function Link(props: LinkProps) {
  const router = useRouter();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.navigate(props.to);
  };

  const isActive = () => router.path() === props.to;

  return (
    <a
      href={base + props.to}
      class={props.class}
      aria-current={isActive() ? 'page' : 'false'}
      onClick={onClick}
    >
      {props.children}
    </a>
  );
}
