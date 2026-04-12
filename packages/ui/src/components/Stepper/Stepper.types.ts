import type { MikataBaseProps, MikataSize, MikataColor, ClassNamesInput } from '../../types';

export type StepperParts =
  | 'root'
  | 'steps'
  | 'step'
  | 'stepIcon'
  | 'stepBody'
  | 'stepLabel'
  | 'stepDescription'
  | 'separator'
  | 'content';

export interface StepperStep {
  label?: string | Node;
  description?: string | Node;
  icon?: Node;
  /** Content to show when this step is active */
  children?: Node;
  /** If true, step is displayed as error */
  error?: boolean;
}

export interface StepperProps extends MikataBaseProps {
  steps: StepperStep[];
  /** Active step index */
  active: number;
  /** Triggered when a step icon is clicked */
  onStepClick?: (index: number) => void;
  /** Prevent clicking on steps */
  allowStepClick?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: MikataSize;
  color?: MikataColor;
  /** Content to show after the last step is complete */
  completedContent?: Node;
  classNames?: ClassNamesInput<StepperParts>;
}
