const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_RE.test(name);
}

export const PROJECT_NAME_HINT =
  'Use lowercase letters, digits, and hyphens (must start with a letter or digit).';
