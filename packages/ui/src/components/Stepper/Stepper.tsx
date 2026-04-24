import { createIcon, Check } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { StepperProps } from './Stepper.types';
import './Stepper.css';

export function Stepper(userProps: StepperProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as StepperProps;

  const steps = props.steps;
  const allowStepClick = props.allowStepClick ?? true;
  const onStepClick = props.onStepClick;
  const completedContent = props.completedContent;

  const stepEls: HTMLElement[] = [];
  const stepIcons: HTMLElement[] = [];
  const separators: HTMLElement[] = [];

  return adoptElement<HTMLElement>('div', (root) => {
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

    adoptElement<HTMLDivElement>('div', (stepsEl) => {
      renderEffect(() => {
        stepsEl.className = mergeClasses('mkt-stepper__steps', props.classNames?.steps);
      });

      steps.forEach((step, i) => {
        const tag = allowStepClick && onStepClick ? 'button' : 'div';
        adoptElement<HTMLElement>(tag, (stepEl) => {
          renderEffect(() => {
            stepEl.className = mergeClasses('mkt-stepper__step', props.classNames?.step);
          });
          if (tag === 'button') {
            stepEl.setAttribute('type', 'button');
            stepEl.addEventListener('click', () => onStepClick!(i));
          }

          adoptElement<HTMLSpanElement>('span', (icon) => {
            renderEffect(() => {
              icon.className = mergeClasses('mkt-stepper__step-icon', props.classNames?.stepIcon);
            });
            stepIcons[i] = icon;
          });

          if (step.label != null || step.description != null) {
            adoptElement<HTMLSpanElement>('span', (body) => {
              renderEffect(() => {
                body.className = mergeClasses('mkt-stepper__step-body', props.classNames?.stepBody);
              });
              if (step.label != null) {
                adoptElement<HTMLSpanElement>('span', (lbl) => {
                  renderEffect(() => {
                    lbl.className = mergeClasses('mkt-stepper__step-label', props.classNames?.stepLabel);
                  });
                  renderEffect(() => {
                    const l = props.steps[i]?.label;
                    if (l == null) lbl.replaceChildren();
                    else if (l instanceof Node) lbl.replaceChildren(l);
                    else lbl.textContent = String(l);
                  });
                });
              }
              if (step.description != null) {
                adoptElement<HTMLSpanElement>('span', (desc) => {
                  renderEffect(() => {
                    desc.className = mergeClasses('mkt-stepper__step-description', props.classNames?.stepDescription);
                  });
                  renderEffect(() => {
                    const d = props.steps[i]?.description;
                    if (d == null) desc.replaceChildren();
                    else if (d instanceof Node) desc.replaceChildren(d);
                    else desc.textContent = String(d);
                  });
                });
              }
            });
          }

          stepEls[i] = stepEl;
        });

        if (i < steps.length - 1) {
          adoptElement<HTMLSpanElement>('span', (sep) => {
            renderEffect(() => {
              sep.className = mergeClasses('mkt-stepper__separator', props.classNames?.separator);
            });
            separators[i] = sep;
          });
        }
      });
    });

    // Active state painter: data-state on each step, rotation flag on
    // separators, icon content swaps.
    renderEffect(() => {
      const active = props.active;
      steps.forEach((step, i) => {
        const state = step.error ? 'error' : i < active ? 'complete' : i === active ? 'active' : 'pending';
        if (stepEls[i]) stepEls[i].dataset.state = state;

        const icon = stepIcons[i];
        if (!icon) return;
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

    adoptElement<HTMLDivElement>('div', (content) => {
      renderEffect(() => {
        content.className = mergeClasses('mkt-stepper__content', props.classNames?.content);
      });
      renderEffect(() => {
        const active = props.active;
        content.replaceChildren();
        if (active >= steps.length && completedContent) {
          content.appendChild(completedContent);
        } else if (active >= 0 && active < steps.length && steps[active]?.children) {
          content.appendChild(steps[active].children!);
        }
      });
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
