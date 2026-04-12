import { describe, it, expect } from 'vitest';
import { createScope } from '@mikata/reactivity';
import { createI18n } from '../src/core';
import { provideI18n, useI18n } from '../src/context';

describe('context', () => {
  const en = { greeting: 'Hello' };

  it('provides and injects i18n instance', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });

    createScope(() => {
      provideI18n(i18n);

      // Child scope can inject
      createScope(() => {
        const injected = useI18n();
        expect(injected).toBe(i18n);
        expect(injected.locale()).toBe('en');
      });
    });
  });

  it('throws when no provider exists', () => {
    createScope(() => {
      expect(() => useI18n()).toThrow('no provider found');
    });
  });

  it('works through nested scopes', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });

    createScope(() => {
      provideI18n(i18n);

      createScope(() => {
        createScope(() => {
          const injected = useI18n();
          expect(injected.t('greeting' as any)).toBe('Hello');
        });
      });
    });
  });
});
