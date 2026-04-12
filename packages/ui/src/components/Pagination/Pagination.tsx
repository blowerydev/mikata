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

export function Pagination(props: PaginationProps): HTMLElement {
  const {
    total,
    value,
    defaultValue = 1,
    siblings = 1,
    boundaries = 1,
    size = 'md',
    color = 'primary',
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  let currentPage = value ?? defaultValue;

  const nav = document.createElement('nav');
  nav.className = mergeClasses('mkt-pagination', className, classNames?.root);
  nav.setAttribute('aria-label', 'Pagination');
  nav.dataset.size = size;
  nav.dataset.color = color;

  const list = document.createElement('div');
  list.className = 'mkt-pagination__list';
  list.setAttribute('role', 'list');

  function setPage(page: number) {
    if (page < 1 || page > total || page === currentPage) return;
    currentPage = page;
    onChange?.(currentPage);
    renderItems();
  }

  function renderItems() {
    list.innerHTML = '';

    // Prev button
    const prev = createButton('\u2039', 'Previous page', () => setPage(currentPage - 1));
    if (currentPage === 1) {
      prev.disabled = true;
      prev.setAttribute('aria-disabled', 'true');
    }
    list.appendChild(prev);

    // Page items
    const pages = getPaginationRange(total, currentPage, siblings, boundaries);
    pages.forEach((item) => {
      if (item === 'dots') {
        const dots = document.createElement('span');
        dots.className = mergeClasses('mkt-pagination__dots', classNames?.dots);
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

    // Next button
    const next = createButton('\u203A', 'Next page', () => setPage(currentPage + 1));
    if (currentPage === total) {
      next.disabled = true;
      next.setAttribute('aria-disabled', 'true');
    }
    list.appendChild(next);
  }

  function createButton(text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = mergeClasses('mkt-pagination__item', classNames?.item);
    btn.type = 'button';
    btn.textContent = text;
    btn.setAttribute('aria-label', ariaLabel);
    btn.addEventListener('click', onClick);
    return btn;
  }

  renderItems();
  nav.appendChild(list);

  if (ref) {
    if (typeof ref === 'function') ref(nav);
    else (ref as any).current = nav;
  }

  return nav;
}
