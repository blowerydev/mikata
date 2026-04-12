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

export function AppShell(props: AppShellProps): HTMLElement {
  const { header, footer, navbar, aside, children, padding, classNames, class: className, ref } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-app-shell', className, classNames?.root);

  const headerSize = toSize(header?.size, '60px');
  const footerSize = toSize(footer?.size, '60px');
  const navbarSize = toSize(navbar?.size, '260px');
  const asideSize = toSize(aside?.size, '260px');

  root.style.setProperty('--_shell-header', sectionHidden(header) ? '0px' : headerSize);
  root.style.setProperty('--_shell-footer', sectionHidden(footer) ? '0px' : footerSize);
  root.style.setProperty('--_shell-navbar', sectionHidden(navbar) ? '0px' : navbarSize);
  root.style.setProperty('--_shell-aside', sectionHidden(aside) ? '0px' : asideSize);
  if (padding != null) root.style.setProperty('--_shell-padding', toSize(padding, '0px'));

  if (header && !sectionHidden(header)) {
    const el = document.createElement('header');
    el.className = mergeClasses('mkt-app-shell__header', classNames?.header);
    if (header.collapsed) el.dataset.collapsed = '';
    el.appendChild(header.children);
    root.appendChild(el);
  }

  if (navbar && !sectionHidden(navbar)) {
    const el = document.createElement('aside');
    el.className = mergeClasses('mkt-app-shell__navbar', classNames?.navbar);
    if (navbar.collapsed) el.dataset.collapsed = '';
    el.appendChild(navbar.children);
    root.appendChild(el);
  }

  if (aside && !sectionHidden(aside)) {
    const el = document.createElement('aside');
    el.className = mergeClasses('mkt-app-shell__aside', classNames?.aside);
    if (aside.collapsed) el.dataset.collapsed = '';
    el.appendChild(aside.children);
    root.appendChild(el);
  }

  const main = document.createElement('main');
  main.className = mergeClasses('mkt-app-shell__main', classNames?.main);
  main.appendChild(children);
  root.appendChild(main);

  if (footer && !sectionHidden(footer)) {
    const el = document.createElement('footer');
    el.className = mergeClasses('mkt-app-shell__footer', classNames?.footer);
    if (footer.collapsed) el.dataset.collapsed = '';
    el.appendChild(footer.children);
    root.appendChild(el);
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }
  return root;
}
