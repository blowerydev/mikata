import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-app-shell', props.class, props.classNames?.root);
  });

  // Section presence/children are structural — read once at setup.
  const header = props.header;
  const footer = props.footer;
  const navbar = props.navbar;
  const aside = props.aside;

  const headerSize = toSize(header?.size, '60px');
  const footerSize = toSize(footer?.size, '60px');
  const navbarSize = toSize(navbar?.size, '260px');
  const asideSize = toSize(aside?.size, '260px');

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
    const el = document.createElement('header');
    renderEffect(() => {
      el.className = mergeClasses('mkt-app-shell__header', props.classNames?.header);
    });
    if (header.collapsed) el.dataset.collapsed = '';
    el.appendChild(header.children);
    root.appendChild(el);
  }

  if (navbar && !sectionHidden(navbar)) {
    const el = document.createElement('aside');
    renderEffect(() => {
      el.className = mergeClasses('mkt-app-shell__navbar', props.classNames?.navbar);
    });
    if (navbar.collapsed) el.dataset.collapsed = '';
    el.appendChild(navbar.children);
    root.appendChild(el);
  }

  if (aside && !sectionHidden(aside)) {
    const el = document.createElement('aside');
    renderEffect(() => {
      el.className = mergeClasses('mkt-app-shell__aside', props.classNames?.aside);
    });
    if (aside.collapsed) el.dataset.collapsed = '';
    el.appendChild(aside.children);
    root.appendChild(el);
  }

  const main = document.createElement('main');
  renderEffect(() => {
    main.className = mergeClasses('mkt-app-shell__main', props.classNames?.main);
  });
  main.appendChild(props.children);
  root.appendChild(main);

  if (footer && !sectionHidden(footer)) {
    const el = document.createElement('footer');
    renderEffect(() => {
      el.className = mergeClasses('mkt-app-shell__footer', props.classNames?.footer);
    });
    if (footer.collapsed) el.dataset.collapsed = '';
    el.appendChild(footer.children);
    root.appendChild(el);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }
  return root;
}
