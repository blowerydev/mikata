import type { FormErrors, ValidatorResolver } from '../types';

export interface SuperstructFailure {
  path: (string | number)[];
  message: string;
  type?: string;
}

export interface SuperstructLike {
  validate: (value: unknown, options?: unknown) => [{ failures: () => SuperstructFailure[] } | undefined, unknown];
}

export interface SuperstructResolverOptions {
  messages?: (failure: SuperstructFailure) => string | Node | null | undefined;
}

export function superstructResolver<Values>(
  struct: SuperstructLike,
  options: SuperstructResolverOptions = {}
): ValidatorResolver<Values> {
  return (values: Values) => {
    const [error] = struct.validate(values, { coerce: false });
    if (!error) return {};
    const errors: FormErrors = {};
    for (const failure of error.failures()) {
      const key = failure.path.join('.');
      if (!(key in errors)) {
        const translated = options.messages?.(failure);
        errors[key] = translated != null ? translated : failure.message;
      }
    }
    return errors;
  };
}
