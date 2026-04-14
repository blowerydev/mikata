import { onCleanup, _mergeProps } from '@mikata/runtime';
import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { SelectProps, SelectOption, SelectFetcher } from './Select.types';
import './Select.css';

export function Select(userProps: SelectProps): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<SelectProps>('Select') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as SelectProps;

  const id = uniqueId('select');
  // `data`'s shape (sync vs async) is fixed at setup — async requires a
  // different option-lifecycle. Read once.
  const data = props.data;
  const isAsync = typeof data === 'function';
  const loadingLabel = props.loadingLabel ?? 'Loading…';

  const select = document.createElement('select');
  select.id = id;
  renderEffect(() => {
    select.className = mergeClasses('mkt-select__input', props.classNames?.input);
  });
  renderEffect(() => { select.dataset.size = props.size ?? 'md'; });

  renderEffect(() => { select.disabled = !!props.disabled; });
  renderEffect(() => {
    if (props.required) select.setAttribute('aria-required', 'true');
    else select.removeAttribute('aria-required');
  });
  renderEffect(() => {
    if (props.error) {
      select.setAttribute('aria-invalid', 'true');
      select.setAttribute('aria-errormessage', `${id}-error`);
    } else {
      select.removeAttribute('aria-invalid');
      select.removeAttribute('aria-errormessage');
    }
  });
  renderEffect(() => {
    const parts: string[] = [];
    if (props.description) parts.push(`${id}-description`);
    if (props.error) parts.push(`${id}-error`);
    if (parts.length) select.setAttribute('aria-describedby', parts.join(' '));
    else select.removeAttribute('aria-describedby');
  });

  let placeholderOpt: HTMLOptionElement | null = null;
  function appendPlaceholder(text: string, preselect: boolean) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = text;
    opt.disabled = true;
    opt.selected = preselect;
    select.appendChild(opt);
    placeholderOpt = opt;
  }
  renderEffect(() => {
    const p = props.placeholder;
    if (placeholderOpt && p != null) placeholderOpt.textContent = p;
  });

  function appendOptions(items: SelectOption[]) {
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      if (item.disabled) option.disabled = true;
      select.appendChild(option);
    }
  }

  const initialValue = props.value;
  const initialDefault = props.defaultValue;
  const initialPlaceholder = props.placeholder;

  if (isAsync) {
    appendPlaceholder(loadingLabel, true);
    select.dataset.loading = '';
    select.disabled = true;

    const controller = new AbortController();
    onCleanup(() => controller.abort());

    (data as SelectFetcher)(controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        select.textContent = '';
        if (initialPlaceholder) appendPlaceholder(initialPlaceholder, !initialValue && !initialDefault);
        appendOptions(items);
        if (initialValue != null) select.value = initialValue;
        else if (initialDefault != null) select.value = initialDefault;
        delete select.dataset.loading;
        if (!props.disabled) select.disabled = false;
      },
      (err) => {
        if (controller.signal.aborted) return;
        if (typeof console !== 'undefined') console.error('[mikata/Select] fetcher rejected:', err);
      },
    );
  } else {
    if (initialPlaceholder) appendPlaceholder(initialPlaceholder, !initialValue && !initialDefault);
    appendOptions(data as SelectOption[]);
    if (initialValue != null) select.value = initialValue;
    else if (initialDefault != null) select.value = initialDefault;
  }

  const onChange = props.onChange;
  if (onChange) select.addEventListener('change', onChange as EventListener);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(select as unknown as HTMLElement);
    else (ref as { current: HTMLSelectElement | null }).current = select;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-select';
  wrapper.appendChild(select);

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: wrapper,
  });
}
