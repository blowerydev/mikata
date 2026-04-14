import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetIdCounter } from '../src/utils/unique-id';

// Components
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';
import { Stack } from '../src/components/Stack';
import { Group } from '../src/components/Group';
import { Text } from '../src/components/Text';
import { Title } from '../src/components/Title';
import { Divider } from '../src/components/Divider';
import { Space } from '../src/components/Space';
import { Container } from '../src/components/Container';
import { Loader } from '../src/components/Loader';
import { Alert } from '../src/components/Alert';
import { Progress } from '../src/components/Progress';
import { Skeleton } from '../src/components/Skeleton';
import { TextInput } from '../src/components/TextInput';
import { Checkbox } from '../src/components/Checkbox';
import { Switch } from '../src/components/Switch';

beforeEach(() => {
  _resetIdCounter();
});

// ─── Button ────────────────────────────────────────────────

describe('Button', () => {
  it('renders a button element', () => {
    const el = Button({ children: 'Click me' });
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('mkt-button')).toBe(true);
  });

  it('applies default variant, size, and color', () => {
    const el = Button({});
    expect(el.dataset.variant).toBe('filled');
    expect(el.dataset.size).toBe('md');
    expect(el.dataset.color).toBe('primary');
  });

  it('applies custom variant and color', () => {
    const el = Button({ variant: 'outline', color: 'red', size: 'lg' });
    expect(el.dataset.variant).toBe('outline');
    expect(el.dataset.color).toBe('red');
    expect(el.dataset.size).toBe('lg');
  });

  it('sets type attribute', () => {
    const el = Button({ type: 'submit' });
    expect(el.type).toBe('submit');
  });

  it('defaults type to button', () => {
    const el = Button({});
    expect(el.type).toBe('button');
  });

  it('renders label content', () => {
    const el = Button({ children: 'Save' });
    const label = el.querySelector('.mkt-button__label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Save');
  });

  it('handles disabled state', () => {
    const el = Button({ disabled: true });
    expect(el.disabled).toBe(true);
  });

  it('handles loading state', () => {
    const el = Button({ loading: true });
    expect(el.disabled).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.dataset.loading).toBeDefined();
    expect(el.querySelector('.mkt-button__loader')).not.toBeNull();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    const el = Button({ onClick, children: 'Click' });
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges user class', () => {
    const el = Button({ class: 'my-btn', children: 'Hi' });
    expect(el.classList.contains('mkt-button')).toBe(true);
    expect(el.classList.contains('my-btn')).toBe(true);
  });

  it('applies classNames to inner parts', () => {
    const el = Button({
      classNames: { label: 'custom-label', root: 'custom-root' },
      children: 'Hi',
    });
    expect(el.classList.contains('custom-root')).toBe(true);
    expect(el.querySelector('.custom-label')).not.toBeNull();
  });

  it('applies fullWidth class', () => {
    const el = Button({ fullWidth: true });
    expect(el.classList.contains('mkt-button--full-width')).toBe(true);
  });

  it('supports ref callback', () => {
    let captured: HTMLElement | null = null;
    Button({ ref: (el: HTMLElement) => { captured = el; } });
    expect(captured).toBeInstanceOf(HTMLButtonElement);
  });

  it('reacts to getter-backed props', async () => {
    const { signal, flushSync } = await import('@mikata/reactivity');
    const [variant, setVariant] = signal<'filled' | 'outline'>('filled');
    const [loading, setLoading] = signal(false);
    const [label, setLabel] = signal('Save');

    const el = Button({
      get variant() { return variant(); },
      get loading() { return loading(); },
      get children() { return label(); },
    });

    expect(el.dataset.variant).toBe('filled');
    expect(el.getAttribute('aria-busy')).toBeNull();
    expect(el.querySelector('.mkt-button__label')!.textContent).toBe('Save');

    setVariant('outline');
    setLoading(true);
    setLabel('Saving…');
    flushSync();

    expect(el.dataset.variant).toBe('outline');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.disabled).toBe(true);
    expect(el.querySelector('.mkt-button__label')!.textContent).toBe('Saving…');
  });
});

// ─── Badge ─────────────────────────────────────────────────

describe('Badge', () => {
  it('renders a span with default props', () => {
    const el = Badge({ children: 'New' });
    expect(el.tagName).toBe('SPAN');
    expect(el.classList.contains('mkt-badge')).toBe(true);
    expect(el.dataset.variant).toBe('filled');
    expect(el.dataset.size).toBe('md');
    expect(el.dataset.color).toBe('primary');
  });

  it('renders text content', () => {
    const el = Badge({ children: 'Beta' });
    expect(el.textContent).toContain('Beta');
  });

  it('renders dot variant with dot element', () => {
    const el = Badge({ variant: 'dot', children: 'Status' });
    expect(el.dataset.variant).toBe('dot');
    expect(el.querySelector('.mkt-badge__dot')).not.toBeNull();
  });

  it('applies custom color', () => {
    const el = Badge({ color: 'green', children: 'Success' });
    expect(el.dataset.color).toBe('green');
  });
});

// ─── Stack ─────────────────────────────────────────────────

describe('Stack', () => {
  it('renders a div with mkt-stack class', () => {
    const el = Stack({});
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-stack')).toBe(true);
  });

  it('appends children', () => {
    const child1 = document.createElement('p');
    const child2 = document.createElement('p');
    const el = Stack({ children: [child1, child2] });
    expect(el.children.length).toBe(2);
  });

  it('sets gap data attribute', () => {
    const el = Stack({ gap: 'md' });
    expect(el.dataset.gap).toBe('md');
  });

  it('merges user class', () => {
    const el = Stack({ class: 'my-stack' });
    expect(el.classList.contains('mkt-stack')).toBe(true);
    expect(el.classList.contains('my-stack')).toBe(true);
  });
});

// ─── Group ─────────────────────────────────────────────────

describe('Group', () => {
  it('renders a div with mkt-group class', () => {
    const el = Group({});
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-group')).toBe(true);
  });
});

// ─── Text ──────────────────────────────────────────────────

describe('Text', () => {
  it('renders a p element by default', () => {
    const el = Text({ children: 'Hello' });
    expect(el.tagName).toBe('P');
    expect(el.classList.contains('mkt-text')).toBe(true);
    expect(el.textContent).toBe('Hello');
  });

  it('applies size data attribute', () => {
    const el = Text({ size: 'lg', children: 'Big text' });
    expect(el.dataset.size).toBe('lg');
  });
});

// ─── Title ─────────────────────────────────────────────────

describe('Title', () => {
  it('renders h1 by default', () => {
    const el = Title({ children: 'Heading' });
    expect(el.tagName).toBe('H1');
    expect(el.classList.contains('mkt-title')).toBe(true);
  });

  it('renders specified heading level', () => {
    const el = Title({ order: 3, children: 'H3' });
    expect(el.tagName).toBe('H3');
  });
});

// ─── Divider ───────────────────────────────────────────────

describe('Divider', () => {
  it('renders an hr element', () => {
    const el = Divider({});
    expect(el.tagName).toBe('HR');
    expect(el.classList.contains('mkt-divider')).toBe(true);
  });
});

// ─── Space ─────────────────────────────────────────────────

describe('Space', () => {
  it('renders a div with mkt-space class', () => {
    const el = Space({});
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-space')).toBe(true);
  });
});

// ─── Container ─────────────────────────────────────────────

describe('Container', () => {
  it('renders a div with mkt-container class', () => {
    const el = Container({});
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-container')).toBe(true);
  });
});

// ─── Loader ────────────────────────────────────────────────

describe('Loader', () => {
  it('renders with mkt-loader class', () => {
    const el = Loader({});
    expect(el.classList.contains('mkt-loader')).toBe(true);
  });

  it('sets aria-label for accessibility', () => {
    const el = Loader({});
    expect(el.getAttribute('role')).toBe('status');
  });
});

// ─── Alert ─────────────────────────────────────────────────

describe('Alert', () => {
  it('renders with role=alert', () => {
    const el = Alert({ children: 'Warning!' });
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.classList.contains('mkt-alert')).toBe(true);
  });

  it('renders title and message', () => {
    const el = Alert({ title: 'Heads up', children: 'Something happened' });
    expect(el.querySelector('.mkt-alert__title')!.textContent).toBe('Heads up');
    expect(el.querySelector('.mkt-alert__message')!.textContent).toBe('Something happened');
  });

  it('renders close button when closable', () => {
    const onClose = vi.fn();
    const el = Alert({ closable: true, onClose, children: 'Msg' });
    const closeBtn = el.querySelector('.mkt-alert__close-button') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');
    closeBtn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies color data attribute', () => {
    const el = Alert({ color: 'red', children: 'Error' });
    expect(el.dataset.color).toBe('red');
  });
});

// ─── Progress ──────────────────────────────────────────────

describe('Progress', () => {
  it('renders with correct ARIA attributes', () => {
    const el = Progress({ value: 65 });
    expect(el.classList.contains('mkt-progress')).toBe(true);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuenow')).toBe('65');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
  });
});

// ─── Skeleton ──────────────────────────────────────────────

describe('Skeleton', () => {
  it('renders with mkt-skeleton class', () => {
    const el = Skeleton({});
    expect(el.classList.contains('mkt-skeleton')).toBe(true);
  });
});

// ─── TextInput ─────────────────────────────────────────────

describe('TextInput', () => {
  it('renders an input inside a wrapper', () => {
    const el = TextInput({ label: 'Name' });
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('text');
  });

  it('connects label to input via for/id', () => {
    const el = TextInput({ label: 'Email' });
    const label = el.querySelector('label');
    const input = el.querySelector('input');
    expect(label).not.toBeNull();
    expect(label!.htmlFor).toBe(input!.id);
  });

  it('shows required indicator', () => {
    const el = TextInput({ label: 'Required field', required: true });
    const req = el.querySelector('.mkt-input-wrapper__required');
    expect(req).not.toBeNull();
    expect(req!.textContent).toBe('*');
  });

  it('shows error message with ARIA', () => {
    const el = TextInput({ label: 'Field', error: 'Something is wrong' });
    const input = el.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorEl = el.querySelector('[role="alert"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toBe('Something is wrong');
  });

  it('shows description', () => {
    const el = TextInput({ label: 'Name', description: 'Enter your full name' });
    const desc = el.querySelector('.mkt-input-wrapper__description');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toBe('Enter your full name');
  });

  it('sets aria-describedby pointing to description and error', () => {
    const el = TextInput({
      label: 'Field',
      description: 'Helpful text',
      error: 'Error text',
    });
    const input = el.querySelector('input')!;
    const describedBy = input.getAttribute('aria-describedby')!;
    expect(describedBy).toContain('-description');
    expect(describedBy).toContain('-error');
  });

  it('sets disabled state', () => {
    const el = TextInput({ label: 'Disabled', disabled: true });
    const input = el.querySelector('input')!;
    expect(input.disabled).toBe(true);
  });

  it('sets value', () => {
    const el = TextInput({ label: 'Name', value: 'John' });
    const input = el.querySelector('input')!;
    expect(input.value).toBe('John');
  });
});

// ─── Checkbox ──────────────────────────────────────────────

describe('Checkbox', () => {
  it('renders a checkbox input inside a label', () => {
    const el = Checkbox({ label: 'Accept terms' });
    expect(el.tagName).toBe('LABEL');
    const input = el.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
  });

  it('renders label text', () => {
    const el = Checkbox({ label: 'Check me' });
    expect(el.querySelector('.mkt-checkbox__label')!.textContent).toBe('Check me');
  });

  it('sets aria-invalid on error', () => {
    const el = Checkbox({ label: 'Field', error: 'Required' });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

// ─── Switch ────────────────────────────────────────────────

describe('Switch', () => {
  it('renders a checkbox with switch role', () => {
    const el = Switch({ label: 'Dark mode' });
    const input = el.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect(input!.getAttribute('role')).toBe('switch');
  });
});
