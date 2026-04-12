import { createIcon, Check } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import type { StepperProps } from './Stepper.types';
import './Stepper.css';

export function Stepper(props: StepperProps): HTMLElement {
  const {
    steps,
    active,
    onStepClick,
    allowStepClick = true,
    orientation = 'horizontal',
    size = 'md',
    color,
    completedContent,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-stepper', className, classNames?.root);
  root.dataset.orientation = orientation;
  root.dataset.size = size;
  if (color) root.style.setProperty('--_step-color', `var(--mkt-color-${color}-6)`);

  const stepsEl = document.createElement('div');
  stepsEl.className = mergeClasses('mkt-stepper__steps', classNames?.steps);

  steps.forEach((step, i) => {
    const state = step.error ? 'error' : i < active ? 'complete' : i === active ? 'active' : 'pending';

    const stepEl = document.createElement(allowStepClick && onStepClick ? 'button' : 'div');
    stepEl.className = mergeClasses('mkt-stepper__step', classNames?.step);
    stepEl.dataset.state = state;
    if (stepEl.tagName === 'BUTTON') {
      (stepEl as HTMLButtonElement).type = 'button';
      stepEl.addEventListener('click', () => onStepClick!(i));
    }

    const icon = document.createElement('span');
    icon.className = mergeClasses('mkt-stepper__step-icon', classNames?.stepIcon);
    if (step.icon) icon.appendChild(step.icon);
    else if (state === 'complete')
      icon.appendChild(createIcon(Check, { size: 14 }));
    else if (state === 'error') icon.textContent = '!';
    else icon.textContent = String(i + 1);
    stepEl.appendChild(icon);

    if (step.label != null || step.description != null) {
      const body = document.createElement('span');
      body.className = mergeClasses('mkt-stepper__step-body', classNames?.stepBody);
      if (step.label != null) {
        const lbl = document.createElement('span');
        lbl.className = mergeClasses('mkt-stepper__step-label', classNames?.stepLabel);
        if (step.label instanceof Node) lbl.appendChild(step.label);
        else lbl.textContent = step.label;
        body.appendChild(lbl);
      }
      if (step.description != null) {
        const desc = document.createElement('span');
        desc.className = mergeClasses('mkt-stepper__step-description', classNames?.stepDescription);
        if (step.description instanceof Node) desc.appendChild(step.description);
        else desc.textContent = step.description;
        body.appendChild(desc);
      }
      stepEl.appendChild(body);
    }

    stepsEl.appendChild(stepEl);

    if (i < steps.length - 1) {
      const sep = document.createElement('span');
      sep.className = mergeClasses('mkt-stepper__separator', classNames?.separator);
      if (i < active) sep.dataset.active = '';
      stepsEl.appendChild(sep);
    }
  });

  root.appendChild(stepsEl);

  const content = document.createElement('div');
  content.className = mergeClasses('mkt-stepper__content', classNames?.content);
  if (active >= steps.length && completedContent) {
    content.appendChild(completedContent);
  } else if (active >= 0 && active < steps.length && steps[active]?.children) {
    content.appendChild(steps[active].children!);
  }
  root.appendChild(content);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }
  return root;
}
