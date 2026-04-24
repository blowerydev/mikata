import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { AppShellProps, AppShellSection } from './AppShell.types';
import './AppShell.css';

const toSize = (v: number | string | undefined, fallback: string): string => {
  if (v == null) return fallback;
  return typeof v === 'number' ? `${v}px` : v;
};

const sectionHidden = (s: AppShellSection | undefined): boolean => {
  if (!s) return true;
  return s.collapsed === true && s.collapseRemoves !== false;
};

export function AppShell(userProps: AppShellProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AppShellProps;

  // Section presence/children are structural - read once at setup.
  const header = props.header;
  const footer = props.footer;
  const navbar = props.navbar;
  const aside = props.aside;

  const headerSize = toSize(header?.size, '60px');
  const footerSize = toSize(footer?.size, '60px');
  const navbarSize = toSize(navbar?.size, '260px');
  const asideSize = toSize(aside?.size, '260px');

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-app-shell', props.class, props.classNames?.root);
    });

    renderEffect(() => {
      root.style.setProperty('--_shell-header', sectionHidden(header) ? '0px' : headerSize);
      root.style.setProperty('--_shell-footer', sectionHidden(footer) ? '0px' : footerSize);
      root.style.setProperty('--_shell-navbar', sectionHidden(navbar) ? '0px' : navbarSize);
      root.style.setProperty('--_shell-aside', sectionHidden(aside) ? '0px' : asideSize);
      const padding = props.padding;
      if (padding != null) root.style.setProperty('--_shell-padding', toSize(padding, '0px'));
      else root.style.removeProperty('--_shell-padding');
    });

    if (header && !sectionHidden(header)) {
      adoptElement<HTMLElement>('header', (el) => {
        renderEffect(() => {
          el.className = mergeClasses('mkt-app-shell__header', props.classNames?.header);
        });
        if (header.collapsed) el.dataset.collapsed = '';
        if (header.children.parentNode !== el) el.appendChild(header.children);
      });
    }

    if (navbar && !sectionHidden(navbar)) {
      adoptElement<HTMLElement>('aside', (el) => {
        renderEffect(() => {
          el.className = mergeClasses('mkt-app-shell__navbar', props.classNames?.navbar);
        });
        if (navbar.collapsed) el.dataset.collapsed = '';
        if (navbar.children.parentNode !== el) el.appendChild(navbar.children);
      });
    }

    if (aside && !sectionHidden(aside)) {
      adoptElement<HTMLElement>('aside', (el) => {
        renderEffect(() => {
          el.className = mergeClasses('mkt-app-shell__aside', props.classNames?.aside);
        });
        if (aside.collapsed) el.dataset.collapsed = '';
        if (aside.children.parentNode !== el) el.appendChild(aside.children);
      });
    }

    adoptElement<HTMLElement>('main', (main) => {
      renderEffect(() => {
        main.className = mergeClasses('mkt-app-shell__main', props.classNames?.main);
      });
      if (props.children.parentNode !== main) main.appendChild(props.children);
    });

    if (footer && !sectionHidden(footer)) {
      adoptElement<HTMLElement>('footer', (el) => {
        renderEffect(() => {
          el.className = mergeClasses('mkt-app-shell__footer', props.classNames?.footer);
        });
        if (footer.collapsed) el.dataset.collapsed = '';
        if (footer.children.parentNode !== el) el.appendChild(footer.children);
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
