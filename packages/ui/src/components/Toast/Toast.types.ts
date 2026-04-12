import type { MikataColor } from '../../types';

export type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface ToastOptions {
  title?: string;
  message: string;
  color?: MikataColor;
  duration?: number;
  closable?: boolean;
  icon?: () => Node;
  position?: ToastPosition;
}

export interface ToastInstance {
  id: string;
  close: () => void;
}

export interface ToastManager {
  show: (options: ToastOptions) => ToastInstance;
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => ToastInstance;
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => ToastInstance;
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => ToastInstance;
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => ToastInstance;
  closeAll: () => void;
}
