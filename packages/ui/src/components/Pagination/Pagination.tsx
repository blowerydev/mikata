import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { PaginationProps } from './Pagination.types';
import './Pagination.css';

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

function getPaginationRange(total: number, current: number, siblings: number, boundaries: number): (number | 'dots')[] {
  const totalPageNumbers = siblings * 2 + 3 + boundaries * 2;
  if (totalPageNumbers >= total) return range(1, total);

  const leftSiblingIndex = Math.max(current - siblings, boundaries + 1);
  const rightSiblingIndex = Math.min(current + siblings, total - boundaries);

  const showLeftDots = leftSiblingIndex > boundaries + 2;
  const showRightDots = rightSiblingIndex < total - boundaries - 1;

  if (!showLeftDots && showRightDots) {
    const leftCount = siblings * 2 + boundaries + 2;
    return [...range(1, leftCount), 'dots', ...range(total - boundaries + 1, total)];
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = siblings * 2 + boundaries + 2;
    return [...range(1, boundaries), 'dots', ...range(total - rightCount + 1, total)];
  }

  return [
    ...range(1, boundaries),
    'dots',
    ...range(leftSiblingIndex, rightSiblingIndex),
    'dots',
    ...range(total - boundaries + 1, total),
  ];
}

export function Pagination(userProps: PaginationProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as PaginationProps;

  // `total`, `siblings`, `boundaries` drive the page-range layout and are
  // read once — changing them after mount requires a full rebuild, which the
  // imperative renderItems() below already performs when the active page
  // changes.
  const total = props.total;
  const siblings = props.siblings ?? 1;
  const boundaries = props.boundaries ?? 1;

  let currentPage = props.value ?? props.defaultValue ?? 1;

  const nav = document.createElement('nav');
  renderEffect(() => {
    nav.className = mergeClasses('mkt-pagination', props.class, props.classNames?.root);
  });
  nav.setAttribute('aria-label', 'Pagination');
  renderEffect(() => { nav.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { nav.dataset.color = props.color ?? 'primary'; });

  const list = document.createElement('div');
  list.className = 'mkt-pagination__list';
  list.setAttribute('role', 'list');

  function setPage(page: number) {
    if (page < 1 || page > total || page === currentPage) return;
    currentPage = page;
    props.onChange?.(currentPage);
    renderItems();
  }

  function renderItems() {
    list.innerHTML = '';

    const prev = createButton('\u2039', 'Previous page', () => setPage(currentPage - 1));
    if (currentPage === 1) {
      prev.disabled = true;
      prev.setAttribute('aria-disabled', 'true');
    }
    list.appendChild(prev);

    const pages = getPaginationRange(total, currentPage, siblings, boundaries);
    pages.forEach((item) => {
      if (item === 'dots') {
        const dots = document.createElement('span');
        dots.className = mergeClasses('mkt-pagination__dots', props.classNames?.dots);
        dots.textContent = '\u2026';
        dots.setAttribute('aria-hidden', 'true');
        list.appendChild(dots);
      } else {
        const btn = createButton(String(item), `Page ${item}`, () => setPage(item));
        if (item === currentPage) {
          btn.dataset.active = '';
          btn.setAttribute('aria-current', 'page');
        }
        list.appendChild(btn);
      }
    });

    const next = createButton('\u203A', 'Next page', () => setPage(currentPage + 1));
    if (currentPage === total) {
      next.disabled = true;
      next.setAttribute('aria-disabled', 'true');
    }
    list.appendChild(next);
  }

  function createButton(text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = mergeClasses('mkt-pagination__item', props.classNames?.item);
    btn.type = 'button';
    btn.textContent = text;
    btn.setAttribute('aria-label', ariaLabel);
    btn.addEventListener('click', onClick);
    return btn;
  }

  renderItems();
  nav.appendChild(list);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(nav);
    else (ref as { current: HTMLElement | null }).current = nav;
  }

  return nav;
}
