import type { FormErrors, ValidatorResolver } from '../types';

export interface JoiDetail {
  path: (string | number)[];
  message: string;
  type?: string;
}

export interface JoiResult {
  error?: { details: JoiDetail[] };
}

export interface JoiLike {
  validate: (value: unknown, options?: { abortEarly?: boolean }) => JoiResult;
}

export interface JoiResolverOptions {
  messages?: (detail: JoiDetail) => string | Node | null | undefined;
}

export function joiResolver<Values>(
  schema: JoiLike,
  options: JoiResolverOptions = {}
): ValidatorResolver<Values> {
  return (values: Values) => {
    const result = schema.validate(values, { abortEarly: false });
    if (!result.error) return {};
    const errors: FormErrors = {};
    for (const detail of result.error.details) {
      const key = detail.path.join('.');
      if (!(key in errors)) {
        const translated = options.messages?.(detail);
        errors[key] = translated != null ? translated : detail.message;
      }
    }
    return errors;
  };
}
