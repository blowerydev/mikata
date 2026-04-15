// Generate src/main.tsx, src/App.tsx, src/pages/Home.tsx, and src/App.test.tsx
// based on the selected feature set. Programmatic generation avoids the
// combinatorial matrix in conditional template blocks - especially inside
// JSX where /* @if */ markers would leave orphan braces.
//
// main.tsx mounts Root, which wires whichever providers (ThemeProvider, i18n,
// router) are selected and renders App.
//
// App.tsx shows a simple demo that opts into ui / icons / store / form. When
// router is selected, App.tsx becomes the shell with nav + routeOutlet(), and
// routes live in src/pages/.
//
// pages/Home.tsx is generated only when router is selected; it mirrors the
// simple-app demo content (form, i18n, icons, store) so those features aren't
// orphaned when the router shell replaces the App demo.
//
// App.test.tsx is generated only when testing is selected, and it
// conditionally wires provideRouter so rendering App doesn't blow up.

import type { Feature } from './types.js';

export function generateMainTsx(features: Set<Feature>): string {
  const hasUi = features.has('ui');
  const hasI18n = features.has('i18n');
  const hasTailwind = features.has('tailwind');
  const hasRouter = features.has('router');

  const imports: string[] = [`import { render } from 'mikata';`];
  if (hasUi) imports.push(`import { ThemeProvider } from '@mikata/ui';`, `import '@mikata/ui/styles.css';`);
  if (hasTailwind) imports.push(`import './index.css';`);
  if (hasI18n) imports.push(`import { provideI18n } from 'mikata';`, `import { i18n } from './i18n';`);
  if (hasRouter) imports.push(`import { provideRouter } from 'mikata';`, `import { router } from './router';`);
  imports.push(`import { App } from './App';`);

  const body: string[] = [];
  if (hasI18n) body.push('  provideI18n(i18n);');
  if (hasRouter) body.push('  provideRouter(router);');

  const inner = '<App />';
  const wrapped = hasUi ? `<ThemeProvider>\n      ${inner}\n    </ThemeProvider>` : inner;
  body.push(`  return (\n    ${wrapped}\n  );`);

  return (
    imports.join('\n') +
    '\n\n' +
    'function Root() {\n' +
    body.join('\n') +
    '\n}\n\n' +
    `render(Root, document.getElementById('app')!);\n`
  );
}

export function generateAppTsx(features: Set<Feature>): string {
  if (features.has('router')) return generateRouterShell(features);
  return generateSimpleApp(features);
}

/**
 * Home page when router is selected - mirrors the simple-app demo so
 * form/i18n/icons/store aren't orphaned by the router shell.
 */
export function generateRouterHome(features: Set<Feature>): string {
  return generateDemoModule(features, { exportName: 'Home', contactFormPath: '../ContactForm' });
}

export function generateRouterAbout(): string {
  return (
    `export function About() {\n` +
    `  return (\n` +
    `    <section>\n` +
    `      <h1>About</h1>\n` +
    `      <p>Mikata is a signals-first framework with no virtual DOM.</p>\n` +
    `    </section>\n` +
    `  );\n` +
    `}\n`
  );
}

export function generateAppTest(features: Set<Feature>): string {
  const hasRouter = features.has('router');
  const hasUi = features.has('ui');

  const imports: string[] = [
    `import { describe, it, expect } from 'vitest';`,
    `import { renderComponent, flushSync } from '@mikata/testing';`,
  ];
  if (hasUi) imports.push(`import { ThemeProvider } from '@mikata/ui';`);
  if (hasRouter) imports.push(`import { provideRouter } from 'mikata';`, `import { router } from './router';`);
  imports.push(`import { App } from './App';`);

  const setup: string[] = [];
  if (hasRouter) setup.push(`    provideRouter(router);`);

  const rendered = hasUi
    ? `renderComponent(() => <ThemeProvider><App /></ThemeProvider>, {})`
    : `renderComponent(App, {})`;

  return (
    imports.join('\n') +
    '\n\n' +
    `describe('App', () => {\n` +
    `  it('renders without crashing', () => {\n` +
    (setup.length ? setup.join('\n') + '\n' : '') +
    `    const r = ${rendered};\n` +
    `    flushSync();\n` +
    `    expect(r.container.textContent?.length ?? 0).toBeGreaterThan(0);\n` +
    `    r.dispose();\n` +
    `  });\n` +
    `});\n`
  );
}

function generateRouterShell(features: Set<Feature>): string {
  const hasUi = features.has('ui');
  const imports: string[] = [`import { routeOutlet, Link } from 'mikata';`];
  if (hasUi) imports.push(`import { AppShell, Group, Anchor } from '@mikata/ui';`);

  const nav = hasUi
    ? `      <AppShell.Header>\n        <Group px="md" h="100%">\n          <Anchor component={Link} href="/">Home</Anchor>\n          <Anchor component={Link} href="/about">About</Anchor>\n        </Group>\n      </AppShell.Header>\n      <AppShell.Main>{routeOutlet()}</AppShell.Main>`
    : `      <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>\n        <Link href="/">Home</Link>{' · '}\n        <Link href="/about">About</Link>\n      </nav>\n      <main style={{ padding: '1rem' }}>{routeOutlet()}</main>`;

  const wrap = hasUi ? `<AppShell header={{ height: 56 }}>\n${nav}\n    </AppShell>` : `<div>\n${nav}\n    </div>`;

  return (
    imports.join('\n') +
    '\n\n' +
    'export function App() {\n' +
    '  return (\n' +
    '    ' +
    wrap +
    '\n  );\n' +
    '}\n'
  );
}

function generateSimpleApp(features: Set<Feature>): string {
  return generateDemoModule(features, { exportName: 'App', contactFormPath: './ContactForm' });
}

/**
 * Shared demo content used by the non-router App.tsx and by the router
 * Home.tsx. The only differences are the exported name and the relative
 * path used to import ContactForm.
 */
function generateDemoModule(
  features: Set<Feature>,
  opts: { exportName: string; contactFormPath: string }
): string {
  const hasUi = features.has('ui');
  const hasIcons = features.has('icons');
  const hasStore = features.has('store');
  const hasForm = features.has('form');
  const hasI18n = features.has('i18n');
  const hasPersist = features.has('persist');

  const imports: string[] = hasPersist
    ? []
    : [`import { signal } from 'mikata';`];
  if (hasPersist) imports.push(`import { persistedSignal } from '@mikata/persist';`);
  if (hasUi) imports.push(`import { Button, Card, Group, Stack, Text, Title } from '@mikata/ui';`);
  if (hasIcons) imports.push(`import { IconSparkles } from '@mikata/icons';`);
  if (hasStore) imports.push(`import { createQuery } from 'mikata';`);
  if (hasForm) imports.push(`import { ContactForm } from '${opts.contactFormPath}';`);
  if (hasI18n) imports.push(`import { useI18n } from 'mikata';`);

  const body: string[] = [];
  body.push(
    hasPersist
      ? `  const [count, setCount] = persistedSignal('count', 0);`
      : `  const [count, setCount] = signal(0);`
  );
  if (hasI18n) body.push(`  const { t } = useI18n();`);
  if (hasStore) {
    body.push(`
  const todos = createQuery({
    key: () => 'todos',
    fn: async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=3');
      return res.json() as Promise<{ id: number; title: string }[]>;
    },
  });`);
  }

  const titleText = hasI18n ? `{t('greeting' as any, { name: 'World' })}` : 'Hello, Mikata!';
  const introText = hasI18n ? `{t('intro' as any)}` : 'Edit src/App.tsx and save to reload.';

  const sections: string[] = [];
  const iconBit = hasIcons ? `<IconSparkles size={28}${hasUi ? ' color="var(--mkt-color-primary)"' : ''} /> ` : '';
  sections.push(
    hasUi
      ? `      <Group>\n        ${iconBit}<Title order={1}>${titleText}</Title>\n      </Group>`
      : `      <h1>${iconBit}${titleText}</h1>`
  );
  sections.push(hasUi ? `      <Text>${introText}</Text>` : `      <p>${introText}</p>`);

  sections.push(
    hasUi
      ? `      <Card>\n        <Stack gap="sm">\n          <Text>Count: {count()}</Text>\n          <Group>\n            <Button onClick={() => setCount(count() + 1)}>Increment</Button>\n            <Button variant="subtle" onClick={() => setCount(0)}>Reset</Button>\n          </Group>\n        </Stack>\n      </Card>`
      : `      <div>\n        <p>Count: {count()}</p>\n        <button onClick={() => setCount(count() + 1)}>Increment</button>{' '}\n        <button onClick={() => setCount(0)}>Reset</button>\n      </div>`
  );

  if (hasStore) {
    sections.push(
      hasUi
        ? `      <Card>\n        <Stack gap="sm">\n          <Title order={3}>Todos (from API)</Title>\n          {todos.isLoading() && <Text c="dimmed">Loading…</Text>}\n          {todos.error() && <Text c="red">{todos.error()?.message}</Text>}\n          {todos.data()?.map((t) => <Text key={t.id}>• {t.title}</Text>)}\n        </Stack>\n      </Card>`
        : `      <div>\n        <h3>Todos (from API)</h3>\n        {todos.isLoading() && <p>Loading…</p>}\n        {todos.error() && <p style={{ color: 'red' }}>{todos.error()?.message}</p>}\n        <ul>{todos.data()?.map((t) => <li key={t.id}>{t.title}</li>)}</ul>\n      </div>`
    );
  }

  if (hasForm) sections.push(`      <ContactForm />`);

  const wrap = hasUi
    ? `    <Stack p="xl" gap="lg" style={{ maxWidth: 720, margin: '0 auto' }}>\n${sections.join('\n')}\n    </Stack>`
    : `    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>\n${sections.join('\n')}\n    </main>`;

  return (
    imports.join('\n') +
    '\n\n' +
    `export function ${opts.exportName}() {\n` +
    body.join('\n') +
    '\n' +
    '  return (\n' +
    wrap +
    '\n  );\n' +
    '}\n'
  );
}
