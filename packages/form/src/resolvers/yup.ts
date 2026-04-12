import type { FormErrors, ValidatorResolver } from '../types';

export interface YupLike {
  validateSync: (value: unknown, options?: { abortEarly?: boolean }) => unknown;
}

export interface YupError {
  inner: { path?: string; message: string; type?: string }[];
  path?: string;
  message: string;
}

export interface YupResolverOptions {
  messages?: (err: { path?: string; message: string; type?: string }) => string | Node | null | undefined;
}

export function yupResolver<Values>(
  schema: YupLike,
  options: YupResolverOptions = {}
): ValidatorResolver<Values> {
  return (values: Values) => {
    try {
      schema.validateSync(values, { abortEarly: false });
      return {};
    } catch (e) {
      const err = e as YupError;
      const errors: FormErrors = {};
      const list = err.inner && err.inner.length > 0 ? err.inner : [err];
      for (const item of list) {
        const key = item.path ?? '';
        if (key && !(key in errors)) {
          const translated = options.messages?.(item);
          errors[key] = translated != null ? translated : item.message;
        }
      }
      return errors;
    }
  };
}
