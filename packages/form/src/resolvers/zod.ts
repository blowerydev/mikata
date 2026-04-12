import type { FormErrors, ValidatorResolver } from '../types';

/**
 * Zod (v3/v4) resolver. Pass a Zod schema — returns a resolver that maps
 * ZodError's issues to a flat `FormErrors` map keyed by dotted path.
 *
 * Optional `messages` lets you override Zod's default English messages by
 * issue code. Return `null` to fall back to the issue's default message.
 */
export interface ZodLike {
  safeParse: (value: unknown) => { success: boolean; error?: { issues: ZodIssue[] } };
}

export interface ZodIssue {
  path: (string | number)[];
  message: string;
  code?: string;
}

export interface ZodResolverOptions {
  messages?: (issue: ZodIssue) => string | Node | null | undefined;
}

export function zodResolver<Values>(
  schema: ZodLike,
  options: ZodResolverOptions = {}
): ValidatorResolver<Values> {
  return (values: Values) => {
    const result = schema.safeParse(values);
    if (result.success) return {};
    const errors: FormErrors = {};
    const issues = result.error?.issues ?? [];
    for (const issue of issues) {
      const key = issue.path.join('.');
      if (!(key in errors)) {
        const translated = options.messages?.(issue);
        errors[key] = translated != null ? translated : issue.message;
      }
    }
    return errors;
  };
}
