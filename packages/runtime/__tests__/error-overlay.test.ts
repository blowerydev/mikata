import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  installErrorOverlay,
  uninstallErrorOverlay,
  reportOverlayError,
} from '../src/error-overlay';

function getOverlayHost(): Element | null {
  return document.querySelector('mikata-error-overlay');
}

function getEntries(host: Element): Element[] {
  const root = (host as HTMLElement).shadowRoot;
  if (!root) return [];
  return Array.from(root.querySelectorAll('.entry'));
}

describe('error overlay', () => {
  beforeEach(() => {
    installErrorOverlay();
  });

  afterEach(() => {
    uninstallErrorOverlay();
  });

  it('renders an overlay when reportOverlayError is called', () => {
    reportOverlayError('Test failure', new Error('boom'));
    const host = getOverlayHost();
    expect(host).not.toBeNull();
  });

  it('dismisses when the × button is clicked', () => {
    reportOverlayError('A', new Error('first'));
    reportOverlayError('B', new Error('second'));

    const host = getOverlayHost()!;
    let entries = getEntries(host);
    expect(entries.length).toBe(2);

    const dismiss = entries[0].querySelector('.dismiss') as HTMLButtonElement;
    dismiss.click();

    entries = getEntries(getOverlayHost()!);
    expect(entries.length).toBe(1);
  });

  it('collapses identical repeated errors into a count badge', () => {
    // Reuse one Error instance so message + stack are bit-identical.
    const err = new Error('same');
    reportOverlayError('Same', err);
    reportOverlayError('Same', err);
    reportOverlayError('Same', err);

    const host = getOverlayHost()!;
    const entries = getEntries(host);
    expect(entries.length).toBe(1);
    const count = entries[0].querySelector('.count');
    expect(count?.textContent).toBe('×3');
  });

  it('surfaces uncaught window errors via the error event', () => {
    const err = new Error('uncaught');
    window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }));

    const host = getOverlayHost();
    expect(host).not.toBeNull();
  });

  it('uninstall clears listeners and DOM', () => {
    reportOverlayError('keep', new Error('keep'));
    expect(getOverlayHost()).not.toBeNull();

    uninstallErrorOverlay();
    expect(getOverlayHost()).toBeNull();
  });

  it('escapes HTML in messages to avoid XSS in the overlay itself', () => {
    reportOverlayError('XSS', new Error('<img src=x onerror="alert(1)">'));
    const host = getOverlayHost()!;
    const root = (host as HTMLElement).shadowRoot!;
    expect(root.querySelector('img')).toBeNull();
    const msg = root.querySelector('.message')!;
    expect(msg.textContent).toContain('<img');
  });
});
