import { createI18n } from 'mikata';

const en = {
  greeting: 'Hello {name}',
  intro: 'Welcome to your new Mikata app.',
  items: '{count, plural, =0 {No items} one {# item} other {# items}}',
};

const fr = {
  greeting: 'Bonjour {name}',
  intro: 'Bienvenue dans votre nouvelle app Mikata.',
  items: '{count, plural, =0 {Aucun article} one {# article} other {# articles}}',
};

export const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, fr },
});
