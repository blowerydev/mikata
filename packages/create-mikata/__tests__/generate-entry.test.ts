import { describe, expect, it } from 'vitest';
import { generateAppTsx } from '../src/generate-entry';

describe('generateAppTsx', () => {
  it('uses exported icon helpers in the icons feature scaffold', () => {
    const source = generateAppTsx(new Set(['icons']));

    expect(source).toContain("import { createIcon, Star } from '@mikata/icons';");
    expect(source).toContain('createIcon(Star');
    expect(source).not.toContain('IconSparkles');
  });
});
