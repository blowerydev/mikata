import { createIcon, ChevronRight } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { NavLinkProps } from './NavLink.types';
import './NavLink.css';

export function NavLink(userProps: NavLinkProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<NavLinkProps>('NavLink') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as NavLinkProps;

  // Structural props read once: href picks tag, icon/description slot
  // presence, and whether children turn this into a disclosure.
  const href = props.href;
  const icon = props.icon;
  const description = props.description;
  const children = props.children;
  const hasChildren = !!(children && children.length > 0);
  let isOpen = props.opened ?? props.defaultOpened ?? false;

  let chevronRef: HTMLSpanElement | null = null;
  let controlRef: HTMLElement | null = null;

  const buildControl = () =>
    adoptElement<HTMLElement>(href ? 'a' : 'button', (control) => {
      controlRef = control;
      renderEffect(() => {
        control.className = mergeClasses(
          'mkt-navlink',
          props.active && 'mkt-navlink--active',
          props.disabled && 'mkt-navlink--disabled',
          props.class,
          props.classNames?.root,
        );
      });
      renderEffect(() => { control.dataset.variant = props.variant ?? 'light'; });
      renderEffect(() => { control.dataset.color = props.color ?? 'primary'; });

      if (href) {
        control.setAttribute('href', href);
      } else {
        control.setAttribute('type', 'button');
      }

      renderEffect(() => {
        const disabled = !!props.disabled;
        if (control instanceof HTMLButtonElement) control.disabled = disabled;
        if (disabled) control.setAttribute('aria-disabled', 'true');
        else control.removeAttribute('aria-disabled');
      });

      if (icon) {
        adoptElement<HTMLSpanElement>('span', (iconWrap) => {
          renderEffect(() => {
            iconWrap.className = mergeClasses('mkt-navlink__icon', props.classNames?.icon);
          });
          if (!iconWrap.firstChild) iconWrap.appendChild(icon);
        });
      }

      adoptElement<HTMLDivElement>('div', (textWrap) => {
        textWrap.className = 'mkt-navlink__body';

        adoptElement<HTMLSpanElement>('span', (labelEl) => {
          renderEffect(() => {
            labelEl.className = mergeClasses('mkt-navlink__label', props.classNames?.label);
          });
          renderEffect(() => {
            const l = props.label;
            labelEl.replaceChildren();
            if (l instanceof Node) labelEl.appendChild(l);
            else if (l != null) labelEl.textContent = String(l);
          });
        });

        if (description) {
          adoptElement<HTMLSpanElement>('span', (descEl) => {
            renderEffect(() => {
              descEl.className = mergeClasses('mkt-navlink__description', props.classNames?.description);
            });
            renderEffect(() => {
              const d = props.description;
              if (d == null) descEl.replaceChildren();
              else if (d instanceof Node) descEl.replaceChildren(d);
              else descEl.textContent = d;
            });
          });
        }
      });

      if (hasChildren) {
        adoptElement<HTMLSpanElement>('span', (chevron) => {
          chevronRef = chevron;
          renderEffect(() => {
            chevron.className = mergeClasses('mkt-navlink__chevron', props.classNames?.chevron);
          });
          if (!chevron.firstChild) {
            chevron.appendChild(createIcon(ChevronRight, { size: 14, strokeWidth: 1.5 }));
          }
          if (isOpen) chevron.dataset.rotated = '';
        });
        control.setAttribute('aria-expanded', String(isOpen));
      }

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(control);
        else (ref as { current: HTMLElement | null }).current = control;
      }
    });

  if (!hasChildren) {
    return buildControl();
  }

  return adoptElement<HTMLDivElement>('div', (wrapper) => {
    wrapper.className = 'mkt-navlink-wrapper';

    const controlLink = buildControl();

    let childContainerEl: HTMLDivElement | null = null;
    adoptElement<HTMLDivElement>('div', (childContainer) => {
      childContainerEl = childContainer;
      renderEffect(() => {
        childContainer.className = mergeClasses('mkt-navlink__children', props.classNames?.children);
      });
      childContainer.hidden = !isOpen;
      for (const child of children!) {
        if (child.parentNode !== childContainer) childContainer.appendChild(child);
      }
    });

    controlLink.addEventListener('click', (e) => {
      if (props.disabled) return;
      isOpen = !isOpen;
      if (controlRef) controlRef.setAttribute('aria-expanded', String(isOpen));
      if (chevronRef) {
        if (isOpen) chevronRef.dataset.rotated = '';
        else delete chevronRef.dataset.rotated;
      }
      if (childContainerEl) childContainerEl.hidden = !isOpen;
      props.onClick?.(e as MouseEvent);
    });
  });
}
