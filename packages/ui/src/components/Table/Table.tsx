import { mergeClasses } from '../../utils/class-merge';
import type { TableProps } from './Table.types';
import './Table.css';

export function Table<T extends Record<string, any>>(props: TableProps<T>): HTMLElement {
  const {
    columns,
    data,
    striped = false,
    highlightOnHover = false,
    withBorder = false,
    withColumnBorders = false,
    size = 'md',
    classNames,
    onRowClick,
    class: className,
    ref,
  } = props;

  const wrapper = document.createElement('div');
  wrapper.className = mergeClasses(
    'mkt-table',
    withBorder && 'mkt-table--bordered',
    className,
    classNames?.root,
  );

  const table = document.createElement('table');
  table.className = mergeClasses(
    'mkt-table__table',
    striped && 'mkt-table--striped',
    highlightOnHover && 'mkt-table--hover',
    withColumnBorders && 'mkt-table--col-borders',
    classNames?.table,
  );
  table.dataset.size = size;

  // thead
  const thead = document.createElement('thead');
  thead.className = mergeClasses('mkt-table__thead', classNames?.thead);
  const headRow = document.createElement('tr');
  headRow.className = mergeClasses(classNames?.tr);

  columns.forEach((col) => {
    const th = document.createElement('th');
    th.className = mergeClasses('mkt-table__th', classNames?.th);
    th.textContent = col.title;
    th.scope = 'col';
    if (col.width) th.style.width = col.width;
    if (col.align) th.style.textAlign = col.align;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');
  tbody.className = mergeClasses('mkt-table__tbody', classNames?.tbody);

  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.className = mergeClasses('mkt-table__tr', classNames?.tr);

    if (onRowClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onRowClick(row, rowIndex));
    }

    columns.forEach((col) => {
      const td = document.createElement('td');
      td.className = mergeClasses('mkt-table__td', classNames?.td);
      if (col.align) td.style.textAlign = col.align;

      if (col.render) {
        const content = col.render(row, rowIndex);
        if (content instanceof Node) {
          td.appendChild(content);
        } else {
          td.textContent = String(content);
        }
      } else {
        td.textContent = String(row[col.key] ?? '');
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as any).current = wrapper;
  }

  return wrapper;
}
