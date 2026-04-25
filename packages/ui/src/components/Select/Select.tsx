import { onCleanup, _mergeProps, adoptElement } from '@mikata/runtime';
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
  const errorLabel = props.errorLabel ?? 'Failed to load';

  // Factory form so the `adoptElement` call inside runs within
  // InputWrapper's setup - the wrapper's label/description slots push
  // through the cursor first, and this select adopts the next
  // server-rendered position.
  const buildChildren = () => adoptElement<HTMLDivElement>('div', (outer) => {
    outer.className = 'mkt-select';

    adoptElement<HTMLSelectElement>('select', (select) => {
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
        const opt = document.createElement('option') as HTMLOptionElement;
        // setAttribute so SSR HTML carries value / disabled / selected
        // into the client render; property assignment only touches the
        // JS side and the shim's serializer wouldn't see it.
        opt.setAttribute('value', '');
        opt.textContent = text;
        opt.setAttribute('disabled', '');
        if (preselect) opt.setAttribute('selected', '');
        select.appendChild(opt);
        placeholderOpt = opt;
      }
      renderEffect(() => {
        const p = props.placeholder;
        if (placeholderOpt && p != null) placeholderOpt.textContent = p;
      });

      function appendOptions(items: SelectOption[], selected?: string) {
        for (const item of items) {
          const option = document.createElement('option') as HTMLOptionElement;
          option.setAttribute('value', item.value);
          option.textContent = item.label;
          if (item.disabled) option.setAttribute('disabled', '');
          if (selected != null && item.value === selected) {
            option.setAttribute('selected', '');
          }
          select.appendChild(option);
        }
      }

      const initialValue = props.value;
      const initialDefault = props.defaultValue;
      const initialPlaceholder = props.placeholder;

      // Options are only written on a fresh render. On hydration the
      // adopted <select> already contains the SSR'd <option>s and
      // rewriting them would invalidate the node identity.
      const alreadyHasOptions = select.firstChild !== null;

      const selectedValue = initialValue ?? initialDefault ?? undefined;

      if (isAsync) {
        if (!alreadyHasOptions) {
          appendPlaceholder(loadingLabel, true);
          select.dataset.loading = '';
          select.disabled = true;
        }

        const controller = new AbortController();
        onCleanup(() => controller.abort());

        (data as SelectFetcher)(controller.signal).then(
          (items) => {
            if (controller.signal.aborted) return;
            select.textContent = '';
            if (initialPlaceholder) appendPlaceholder(initialPlaceholder, !initialValue && !initialDefault);
            appendOptions(items, selectedValue);
            // Mirror to the live select element so the browser picks
            // the right option visually; the attribute we set above
            // handles SSR and hydration's initial state.
            if (selectedValue != null) select.value = selectedValue;
            delete select.dataset.loading;
            if (!props.disabled) select.disabled = false;
          },
          (err) => {
            if (controller.signal.aborted) return;
            if (typeof console !== 'undefined') console.error('[mikata/Select] fetcher rejected:', err);
            // Replace the loading placeholder with an error placeholder
            // and re-enable the control so the user isn't stuck. Mark
            // the option-set as errored via `data-error` so callers /
            // CSS can show retry affordance if desired.
            select.textContent = '';
            appendPlaceholder(errorLabel, true);
            select.dataset.error = '';
            delete select.dataset.loading;
            if (!props.disabled) select.disabled = false;
            props.onError?.(err);
          },
        );
      } else if (!alreadyHasOptions) {
        if (initialPlaceholder) appendPlaceholder(initialPlaceholder, !initialValue && !initialDefault);
        appendOptions(data as SelectOption[], selectedValue);
        if (selectedValue != null) select.value = selectedValue;
      }

      const onChange = props.onChange;
      if (onChange) select.addEventListener('change', onChange as EventListener);

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(select as unknown as HTMLElement);
        else (ref as { current: HTMLSelectElement | null }).current = select;
      }
    });
  });

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: buildChildren,
  });
}
