import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { TableProps } from './Table.types';
import './Table.css';

export function Table<T extends Record<string, any>>(userProps: TableProps<T>): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TableProps<T>;

  // `columns`, `data`, `onRowClick` are structural — they build the table
  // once at setup.
  const columns = props.columns;
  const data = props.data;
  const onRowClick = props.onRowClick;

  const wrapper = document.createElement('div');
  renderEffect(() => {
    wrapper.className = mergeClasses(
      'mkt-table',
      props.withBorder && 'mkt-table--bordered',
      props.class,
      props.classNames?.root,
    );
  });

  const table = document.createElement('table');
  renderEffect(() => {
    table.className = mergeClasses(
      'mkt-table__table',
      props.striped && 'mkt-table--striped',
      props.highlightOnHover && 'mkt-table--hover',
      props.withColumnBorders && 'mkt-table--col-borders',
      props.classNames?.table,
    );
  });
  renderEffect(() => { table.dataset.size = props.size ?? 'md'; });

  const thead = document.createElement('thead');
  renderEffect(() => {
    thead.className = mergeClasses('mkt-table__thead', props.classNames?.thead);
  });
  const headRow = document.createElement('tr');
  renderEffect(() => {
    headRow.className = mergeClasses(props.classNames?.tr);
  });

  columns.forEach((col, colIndex) => {
    const th = document.createElement('th');
    renderEffect(() => {
      th.className = mergeClasses('mkt-table__th', props.classNames?.th);
    });
    renderEffect(() => {
      th.textContent = props.columns[colIndex]?.title ?? '';
    });
    th.scope = 'col';
    if (col.width) th.style.width = col.width;
    if (col.align) th.style.textAlign = col.align;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  renderEffect(() => {
    tbody.className = mergeClasses('mkt-table__tbody', props.classNames?.tbody);
  });

  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    renderEffect(() => {
      tr.className = mergeClasses('mkt-table__tr', props.classNames?.tr);
    });

    if (onRowClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onRowClick(row, rowIndex));
    }

    columns.forEach((col) => {
      const td = document.createElement('td');
      renderEffect(() => {
        td.className = mergeClasses('mkt-table__td', props.classNames?.td);
      });
      if (col.align) td.style.textAlign = col.align;

      if (col.render) {
        const content = col.render(row, rowIndex);
        if (content instanceof Node) td.appendChild(content);
        else td.textContent = String(content);
      } else {
        td.textContent = String(row[col.key] ?? '');
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as { current: HTMLElement | null }).current = wrapper;
  }

  return wrapper;
}
