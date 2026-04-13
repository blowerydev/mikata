import { describe, it, expect } from 'vitest';
import { renderComponent, flushSync } from '@mikata/testing';
import { App } from './App';

describe('App', () => {
  it('renders without crashing', () => {
    const r = renderComponent(App, {});
    flushSync();
    expect(r.container.textContent?.length ?? 0).toBeGreaterThan(0);
    r.dispose();
  });
});
