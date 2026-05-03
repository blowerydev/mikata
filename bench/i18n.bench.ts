import { bench, describe } from 'vitest';
import { createI18n, formatIcu, parseIcu } from '@mikata/i18n';

let sink = 0;

const messages = {
  en: {
    common: {
      hello: 'Hello {{name}}',
      inbox: '{count, plural, =0 {No messages} one {# message} other {# messages}}',
      invite: '{gender, select, female {{name} invited her team} male {{name} invited his team} other {{name} invited their team}}',
      total: 'Total: {value, number, ::currency/USD}',
    },
  },
  fr: {
    common: {
      hello: 'Bonjour {{name}}',
      inbox: '{count, plural, one {# message} other {# messages}}',
      invite: '{name} a invite son equipe',
      total: 'Total: {value, number, ::currency/USD}',
    },
  },
};

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages,
});

const pluralMessage = messages.en.common.inbox;
const selectMessage = messages.en.common.invite;
const numberMessage = messages.en.common.total;

describe('@mikata/i18n', () => {
  bench('translate simple key with interpolation 100k times', () => {
    let total = 0;
    for (let i = 0; i < 100_000; i++) {
      total += i18n.t('common.hello', { name: 'Ada' }).length;
    }
    sink = total;
  });

  bench('format cached ICU plural 10k times', () => {
    let total = 0;
    for (let i = 0; i < 10_000; i++) {
      total += formatIcu(pluralMessage, { count: i % 7 }, 'en').length;
    }
    sink = total;
  });

  bench('format ICU select and number 10k times', () => {
    let total = 0;
    for (let i = 0; i < 10_000; i++) {
      total += formatIcu(selectMessage, { gender: i % 2 ? 'female' : 'other', name: 'Ada' }, 'en').length;
      total += formatIcu(numberMessage, { value: i * 1.23 }, 'en').length;
    }
    sink = total;
  });

  bench('parse cached ICU message 100k times', () => {
    let total = 0;
    for (let i = 0; i < 100_000; i++) {
      total += parseIcu(pluralMessage).length;
    }
    sink = total;
  });
});

void sink;
