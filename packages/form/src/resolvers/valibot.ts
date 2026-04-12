import type { FormErrors, ValidatorResolver } from '../types';

export interface ValibotIssue {
  path?: { key: string | number }[];
  message: string;
  type?: string;
}

export interface ValibotResult {
  success: boolean;
  issues?: ValibotIssue[];
}

export interface ValibotSafeParse {
  (schema: unknown, value: unknown): ValibotResult;
}

export interface ValibotResolverOptions {
  /** Provide the `safeParse` function from valibot: `import { safeParse } from 'valibot'`. */
  safeParse: ValibotSafeParse;
  messages?: (issue: ValibotIssue) => string | Node | null | undefined;
}

export function valibotResolver<Values>(
  schema: unknown,
  options: ValibotResolverOptions
): ValidatorResolver<Values> {
  return (values: Values) => {
    const result = options.safeParse(schema, values);
    if (result.success) return {};
    const errors: FormErrors = {};
    for (const issue of result.issues ?? []) {
      const key = (issue.path ?? []).map((p) => p.key).join('.');
      if (!(key in errors)) {
        const translated = options.messages?.(issue);
        errors[key] = translated != null ? translated : issue.message;
      }
    }
    return errors;
  };
}
