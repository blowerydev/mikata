import { createIcon, Check } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { StepperProps } from './Stepper.types';
import './Stepper.css';

export function Stepper(userProps: StepperProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as StepperProps;

  // `steps`, `allowStepClick`, `onStepClick`, `completedContent` are
  // structural — read once. Active index is still reactive via the renderEffect
  // that paints `data-state` onto each step below.
  const steps = props.steps;
  const allowStepClick = props.allowStepClick ?? true;
  const onStepClick = props.onStepClick;
  const completedContent = props.completedContent;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-stepper', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.orientation = props.orientation ?? 'horizontal'; });
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
  renderEffect(() => {
    const c = props.color;
    if (c) root.style.setProperty('--_step-color', `var(--mkt-color-${c}-6)`);
    else root.style.removeProperty('--_step-color');
  });

  const stepsEl = document.createElement('div');
  renderEffect(() => {
    stepsEl.className = mergeClasses('mkt-stepper__steps', props.classNames?.steps);
  });

  const stepEls: HTMLElement[] = [];
  const stepIcons: HTMLElement[] = [];
  const separators: HTMLElement[] = [];

  steps.forEach((step, i) => {
    const stepEl = document.createElement(allowStepClick && onStepClick ? 'button' : 'div');
    renderEffect(() => {
      stepEl.className = mergeClasses('mkt-stepper__step', props.classNames?.step);
    });
    if (stepEl.tagName === 'BUTTON') {
      (stepEl as HTMLButtonElement).type = 'button';
      stepEl.addEventListener('click', () => onStepClick!(i));
    }

    const icon = document.createElement('span');
    renderEffect(() => {
      icon.className = mergeClasses('mkt-stepper__step-icon', props.classNames?.stepIcon);
    });
    stepEl.appendChild(icon);
    stepIcons.push(icon);

    if (step.label != null || step.description != null) {
      const body = document.createElement('span');
      renderEffect(() => {
        body.className = mergeClasses('mkt-stepper__step-body', props.classNames?.stepBody);
      });
      if (step.label != null) {
        const lbl = document.createElement('span');
        renderEffect(() => {
          lbl.className = mergeClasses('mkt-stepper__step-label', props.classNames?.stepLabel);
        });
        renderEffect(() => {
          const l = props.steps[i]?.label;
          if (l == null) lbl.replaceChildren();
          else if (l instanceof Node) lbl.replaceChildren(l);
          else lbl.textContent = String(l);
        });
        body.appendChild(lbl);
      }
      if (step.description != null) {
        const desc = document.createElement('span');
        renderEffect(() => {
          desc.className = mergeClasses('mkt-stepper__step-description', props.classNames?.stepDescription);
        });
        renderEffect(() => {
          const d = props.steps[i]?.description;
          if (d == null) desc.replaceChildren();
          else if (d instanceof Node) desc.replaceChildren(d);
          else desc.textContent = String(d);
        });
        body.appendChild(desc);
      }
      stepEl.appendChild(body);
    }

    stepEls.push(stepEl);
    stepsEl.appendChild(stepEl);

    if (i < steps.length - 1) {
      const sep = document.createElement('span');
      renderEffect(() => {
        sep.className = mergeClasses('mkt-stepper__separator', props.classNames?.separator);
      });
      separators.push(sep);
      stepsEl.appendChild(sep);
    }
  });

  // Reactive state: active step, plus derived data-state and icon content.
  renderEffect(() => {
    const active = props.active;
    steps.forEach((step, i) => {
      const state = step.error ? 'error' : i < active ? 'complete' : i === active ? 'active' : 'pending';
      stepEls[i].dataset.state = state;

      const icon = stepIcons[i];
      icon.replaceChildren();
      if (step.icon) icon.appendChild(step.icon);
      else if (state === 'complete') icon.appendChild(createIcon(Check, { size: 14 }));
      else if (state === 'error') icon.textContent = '!';
      else icon.textContent = String(i + 1);
    });
    separators.forEach((sep, i) => {
      if (i < active) sep.dataset.active = '';
      else delete sep.dataset.active;
    });
  });

  root.appendChild(stepsEl);

  const content = document.createElement('div');
  renderEffect(() => {
    content.className = mergeClasses('mkt-stepper__content', props.classNames?.content);
  });
  // Content slot reacts to active index — swap in the right child node.
  renderEffect(() => {
    const active = props.active;
    content.replaceChildren();
    if (active >= steps.length && completedContent) {
      content.appendChild(completedContent);
    } else if (active >= 0 && active < steps.length && steps[active]?.children) {
      content.appendChild(steps[active].children!);
    }
  });
  root.appendChild(content);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }
  return root;
}
