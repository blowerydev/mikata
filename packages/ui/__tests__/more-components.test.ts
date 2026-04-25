import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetIdCounter } from '../src/utils/unique-id';

import { ActionIcon } from '../src/components/ActionIcon';
import { Anchor } from '../src/components/Anchor';
import { AspectRatio } from '../src/components/AspectRatio';
import { Blockquote } from '../src/components/Blockquote';
import { Box } from '../src/components/Box';
import { Burger } from '../src/components/Burger';
import { ButtonGroup } from '../src/components/ButtonGroup';
import { Center } from '../src/components/Center';
import { Chip } from '../src/components/Chip';
import { CloseButton } from '../src/components/CloseButton';
import { Code } from '../src/components/Code';
import { CopyButton } from '../src/components/CopyButton';
import { Fieldset } from '../src/components/Fieldset';
import { Flex } from '../src/components/Flex';
import { Grid } from '../src/components/Grid';
import { Highlight } from '../src/components/Highlight';
import { Image } from '../src/components/Image';
import { Kbd } from '../src/components/Kbd';
import { List } from '../src/components/List';
import { Mark } from '../src/components/Mark';
import { Notification } from '../src/components/Notification';
import { NumberInput } from '../src/components/NumberInput';
import { Paper } from '../src/components/Paper';
import { PasswordInput } from '../src/components/PasswordInput';
import { Radio } from '../src/components/Radio';
import { Rating } from '../src/components/Rating';
import { RingProgress } from '../src/components/RingProgress';
import { SimpleGrid } from '../src/components/SimpleGrid';
import { Textarea } from '../src/components/Textarea';
import { ThemeIcon } from '../src/components/ThemeIcon';
import { UnstyledButton } from '../src/components/UnstyledButton';
import { VisuallyHidden } from '../src/components/VisuallyHidden';

beforeEach(() => {
  _resetIdCounter();
  document.body.innerHTML = '';
});

// ─── ActionIcon ─────────────────────────────────────────────
describe('ActionIcon', () => {
  it('renders a button element with default variant and size', () => {
    const el = ActionIcon({});
    expect(el.tagName).toBe('BUTTON');
    expect(el.type).toBe('button');
    expect(el.classList.contains('mkt-action-icon')).toBe(true);
    expect(el.dataset.variant).toBe('subtle');
    expect(el.dataset.size).toBe('md');
    expect(el.dataset.color).toBe('primary');
  });

  it('applies aria-label', () => {
    const el = ActionIcon({ 'aria-label': 'Settings' });
    expect(el.getAttribute('aria-label')).toBe('Settings');
  });

  it('sets disabled when loading', () => {
    const el = ActionIcon({ loading: true });
    expect(el.disabled).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.mkt-action-icon__loader')).not.toBeNull();
  });

  it('wires onClick', () => {
    const fn = vi.fn();
    const el = ActionIcon({ onClick: fn });
    el.click();
    expect(fn).toHaveBeenCalled();
  });
});

// ─── Anchor ─────────────────────────────────────────────────
describe('Anchor', () => {
  it('renders an <a> with href', () => {
    const el = Anchor({ href: '/about', children: 'About' });
    expect(el.tagName).toBe('A');
    expect(el.getAttribute('href')).toBe('/about');
    expect(el.textContent).toBe('About');
  });

  it('adds rel=noopener noreferrer when target=_blank', () => {
    const el = Anchor({ href: 'https://x.com', target: '_blank' });
    expect(el.rel).toBe('noopener noreferrer');
  });

  it('applies underline data-attr', () => {
    const el = Anchor({ underline: 'always' });
    expect(el.dataset.underline).toBe('always');
  });
});

// ─── AspectRatio ────────────────────────────────────────────
describe('AspectRatio', () => {
  it('sets --_ratio custom property', () => {
    const el = AspectRatio({ ratio: 16 / 9 });
    expect(el.style.getPropertyValue('--_ratio')).toBe(String(16 / 9));
  });

  it('appends child', () => {
    const inner = document.createElement('img');
    const el = AspectRatio({ ratio: 1, children: inner });
    expect(el.firstElementChild).toBe(inner);
  });
});

// ─── Blockquote ─────────────────────────────────────────────
describe('Blockquote', () => {
  it('renders a blockquote with body', () => {
    const el = Blockquote({ children: 'Hello world' });
    expect(el.tagName).toBe('BLOCKQUOTE');
    expect(el.querySelector('.mkt-blockquote__body')!.textContent).toBe(
      'Hello world'
    );
  });

  it('applies color data-attr', () => {
    const el = Blockquote({ color: 'red' });
    expect(el.dataset.color).toBe('red');
  });

  it('renders cite when provided', () => {
    const el = Blockquote({ children: 'Quote', cite: 'Someone' });
    expect(el.querySelector('cite')!.textContent).toBe('Someone');
  });
});

// ─── Box ────────────────────────────────────────────────────
describe('Box', () => {
  it('renders a div with mkt-box class', () => {
    const el = Box({});
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-box')).toBe(true);
  });

  it('uses custom tag via component prop', () => {
    const el = Box({ component: 'section' });
    expect(el.tagName).toBe('SECTION');
  });

  it('appends array of children in order', () => {
    const a = document.createElement('span');
    const b = document.createElement('span');
    const el = Box({ children: [a, b] });
    expect(el.children[0]).toBe(a);
    expect(el.children[1]).toBe(b);
  });
});

// ─── Burger ─────────────────────────────────────────────────
describe('Burger', () => {
  it('renders a button with aria defaults', () => {
    const el = Burger({});
    expect(el.tagName).toBe('BUTTON');
    expect(el.type).toBe('button');
    expect(el.getAttribute('aria-label')).toBe('Toggle menu');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('reflects opened state on data-attr and aria', () => {
    const el = Burger({ opened: true });
    expect(el.dataset.opened).toBe('');
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('applies numeric size via CSS variable', () => {
    const el = Burger({ size: 42 });
    expect(el.dataset.size).toBeUndefined();
    expect(el.style.getPropertyValue('--_burger-size')).toBe('42px');
  });

  it('invokes onClick', () => {
    const fn = vi.fn();
    const el = Burger({ onClick: fn });
    el.click();
    expect(fn).toHaveBeenCalled();
  });
});

// ─── ButtonGroup ────────────────────────────────────────────
describe('ButtonGroup', () => {
  it('has role=group and horizontal default orientation', () => {
    const el = ButtonGroup({});
    expect(el.getAttribute('role')).toBe('group');
    expect(el.dataset.orientation).toBe('horizontal');
  });

  it('applies vertical orientation', () => {
    const el = ButtonGroup({ orientation: 'vertical' });
    expect(el.dataset.orientation).toBe('vertical');
  });
});

// ─── Center ─────────────────────────────────────────────────
describe('Center', () => {
  it('applies inline data-attr', () => {
    const el = Center({ inline: true });
    expect(el.dataset.inline).toBe('');
  });

  it('omits inline attr when false', () => {
    const el = Center({});
    expect(el.dataset.inline).toBeUndefined();
  });
});

// ─── Chip ───────────────────────────────────────────────────
describe('Chip', () => {
  it('renders a label wrapping an input', () => {
    const el = Chip({ children: 'Tag' });
    expect(el.tagName).toBe('LABEL');
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('checkbox');
    expect(el.querySelector('.mkt-chip__label')!.textContent).toBe('Tag');
  });

  it('honors type=radio', () => {
    const el = Chip({ type: 'radio', children: 'R' });
    expect((el.querySelector('input') as HTMLInputElement).type).toBe('radio');
  });

  it('sets initial checked from defaultChecked', () => {
    const el = Chip({ defaultChecked: true });
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('calls onChange with new state and value', () => {
    const fn = vi.fn();
    const el = Chip({ value: 'x', onChange: fn });
    const input = el.querySelector('input') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledWith(true, 'x');
  });
});

// ─── CloseButton ────────────────────────────────────────────
describe('CloseButton', () => {
  it('renders an ActionIcon button with close aria-label', () => {
    const el = CloseButton({});
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('mkt-close-button')).toBe(true);
    expect(el.getAttribute('aria-label')).toBeTruthy();
    expect(el.querySelector('svg')).not.toBeNull();
  });

  it('invokes onClick', () => {
    const fn = vi.fn();
    const el = CloseButton({ onClick: fn });
    el.click();
    expect(fn).toHaveBeenCalled();
  });
});

// ─── Code ───────────────────────────────────────────────────
describe('Code', () => {
  it('renders inline <code> by default', () => {
    const el = Code({ children: 'let x' });
    expect(el.tagName).toBe('CODE');
    expect(el.textContent).toBe('let x');
  });

  it('renders block as <pre><code>', () => {
    const el = Code({ block: true, children: 'fn()' });
    expect(el.tagName).toBe('PRE');
    expect(el.firstElementChild?.tagName).toBe('CODE');
    expect(el.textContent).toBe('fn()');
    expect(el.classList.contains('mkt-code--block')).toBe(true);
  });

  it('applies color data-attr', () => {
    const el = Code({ color: 'blue' });
    expect(el.dataset.color).toBe('blue');
  });
});

// ─── CopyButton ─────────────────────────────────────────────
describe('CopyButton', () => {
  it('renders the children callback with initial copied=false', () => {
    const seen: boolean[] = [];
    CopyButton({
      value: 'hello',
      children: ({ copied }) => {
        seen.push(copied);
        const b = document.createElement('button');
        b.textContent = copied ? 'Copied' : 'Copy';
        return b;
      },
    });
    expect(seen[0]).toBe(false);
  });
});

// ─── Fieldset ───────────────────────────────────────────────
describe('Fieldset', () => {
  it('renders a fieldset with legend', () => {
    const el = Fieldset({ legend: 'Profile' });
    expect(el.tagName).toBe('FIELDSET');
    expect(el.querySelector('legend')!.textContent).toBe('Profile');
  });

  it('sets disabled', () => {
    const el = Fieldset({ disabled: true });
    expect(el.disabled).toBe(true);
  });

  it('applies variant data-attr', () => {
    const el = Fieldset({ variant: 'filled' });
    expect(el.dataset.variant).toBe('filled');
  });
});

// ─── Flex ───────────────────────────────────────────────────
describe('Flex', () => {
  it('applies inline style properties from props', () => {
    const el = Flex({ direction: 'row', justify: 'center', align: 'stretch' });
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.justifyContent).toBe('center');
    expect(el.style.alignItems).toBe('stretch');
  });

  it('resolves size tokens for gap', () => {
    const el = Flex({ gap: 'md' });
    expect(el.style.gap).toBe('var(--mkt-space-4)');
  });

  it('passes raw gap values through unchanged', () => {
    const el = Flex({ gap: '10px' });
    expect(el.style.gap).toBe('10px');
  });
});

// ─── Grid ───────────────────────────────────────────────────
describe('Grid', () => {
  it('sets gridTemplateColumns based on columns prop', () => {
    const el = Grid({ columns: 4 });
    expect(el.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
  });

  it('defaults to 12 columns', () => {
    const el = Grid({});
    expect(el.style.gridTemplateColumns).toBe('repeat(12, 1fr)');
  });
});

// ─── Highlight ──────────────────────────────────────────────
describe('Highlight', () => {
  it('wraps matched terms in <mark>', () => {
    const el = Highlight({ children: 'the quick brown fox', highlight: 'quick' });
    const marks = el.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe('quick');
  });

  it('matches case-insensitively', () => {
    const el = Highlight({ children: 'Hello World', highlight: 'hello' });
    expect(el.querySelector('mark')!.textContent).toBe('Hello');
  });

  it('applies color to marks', () => {
    const el = Highlight({ children: 'red alert', highlight: 'red', color: 'pink' });
    expect(el.querySelector('mark')!.dataset.color).toBe('pink');
  });

  it('renders plain text when highlight is empty', () => {
    const el = Highlight({ children: 'nothing here', highlight: '' });
    expect(el.querySelector('mark')).toBeNull();
    expect(el.textContent).toBe('nothing here');
  });

  it('supports array of terms', () => {
    const el = Highlight({ children: 'foo bar baz', highlight: ['foo', 'baz'] });
    const marks = el.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe('foo');
    expect(marks[1].textContent).toBe('baz');
  });
});

// ─── Image ──────────────────────────────────────────────────
describe('Image', () => {
  it('renders an <img> when src provided', () => {
    const el = Image({ src: '/cat.png', alt: 'cat' });
    const img = el.querySelector('img')!;
    expect(img.src).toContain('/cat.png');
    expect(img.alt).toBe('cat');
  });

  it('applies numeric width/height as px', () => {
    const el = Image({ src: '/x.png', width: 100, height: 50 });
    expect(el.style.width).toBe('100px');
    expect(el.style.height).toBe('50px');
  });

  it('renders fallback when no src', () => {
    const fb = document.createElement('div');
    fb.textContent = 'no image';
    const el = Image({ fallback: fb });
    expect(el.dataset.failed).toBe('');
    expect(el.textContent).toBe('no image');
  });

  it('swaps to fallback on img error', () => {
    const fb = document.createElement('div');
    fb.textContent = 'broken';
    const el = Image({ src: '/missing.png', fallback: fb });
    const img = el.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    expect(el.dataset.failed).toBe('');
    expect(el.textContent).toBe('broken');
  });
});

// ─── Kbd ────────────────────────────────────────────────────
describe('Kbd', () => {
  it('renders a <kbd> with default size=sm', () => {
    const el = Kbd({ children: 'Ctrl' });
    expect(el.tagName).toBe('KBD');
    expect(el.textContent).toBe('Ctrl');
    expect(el.dataset.size).toBe('sm');
  });

  it('applies custom size', () => {
    const el = Kbd({ size: 'lg' });
    expect(el.dataset.size).toBe('lg');
  });
});

// ─── List ───────────────────────────────────────────────────
describe('List', () => {
  it('renders an unordered list by default', () => {
    const el = List({});
    expect(el.tagName).toBe('UL');
    expect(el.classList.contains('mkt-list')).toBe(true);
  });

  it('renders ordered list when type=ordered', () => {
    const el = List({ type: 'ordered' });
    expect(el.tagName).toBe('OL');
  });

  it('appends ListItem children', () => {
    const el = List({
      children: [List.Item({ children: 'a' }), List.Item({ children: 'b' })],
    });
    expect(el.querySelectorAll('li').length).toBe(2);
  });

  it('applies size data-attr', () => {
    const el = List({ size: 'lg' });
    expect(el.dataset.size).toBe('lg');
  });
});

// ─── Mark ───────────────────────────────────────────────────
describe('Mark', () => {
  it('renders a <mark> with default color=yellow', () => {
    const el = Mark({ children: 'important' });
    expect(el.tagName).toBe('MARK');
    expect(el.dataset.color).toBe('yellow');
    expect(el.textContent).toBe('important');
  });

  it('applies custom color', () => {
    const el = Mark({ children: 'x', color: 'red' });
    expect(el.dataset.color).toBe('red');
  });
});

// ─── Notification ───────────────────────────────────────────
describe('Notification', () => {
  it('renders a role=status container with defaults', () => {
    const el = Notification({ children: 'Saved' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.dataset.color).toBe('primary');
    expect(el.querySelector('.mkt-notification__description')!.textContent).toBe(
      'Saved'
    );
  });

  it('renders title', () => {
    const el = Notification({ title: 'Heads up', children: 'Body' });
    expect(el.querySelector('.mkt-notification__title')!.textContent).toBe(
      'Heads up'
    );
  });

  it('renders close button only when onClose provided', () => {
    const withClose = Notification({ children: 'x', onClose: () => {} });
    expect(withClose.querySelector('.mkt-notification__close')).not.toBeNull();

    const without = Notification({ children: 'x' });
    expect(without.querySelector('.mkt-notification__close')).toBeNull();
  });

  it('close button invokes onClose', () => {
    const fn = vi.fn();
    const el = Notification({ children: 'x', onClose: fn });
    (el.querySelector('.mkt-notification__close') as HTMLButtonElement).click();
    expect(fn).toHaveBeenCalled();
  });

  it('renders loader when loading=true', () => {
    const el = Notification({ loading: true });
    expect(el.querySelector('.mkt-notification__loader')).not.toBeNull();
  });
});

// ─── NumberInput ────────────────────────────────────────────
describe('NumberInput', () => {
  it('renders an input[type=number] wrapped', () => {
    const el = NumberInput({ label: 'Age' });
    const input = el.querySelector('input')!;
    expect(input.type).toBe('number');
  });

  it('reflects min/max/step', () => {
    const el = NumberInput({ label: 'X', min: 0, max: 10, step: 2 });
    const input = el.querySelector('input')!;
    expect(input.min).toBe('0');
    expect(input.max).toBe('10');
    expect(input.step).toBe('2');
  });

  it('up button increments and clamps to max via onValueChange', () => {
    const fn = vi.fn();
    const el = NumberInput({ label: 'X', max: 3, step: 1, onValueChange: fn });
    const input = el.querySelector('input')!;
    input.value = '3';
    const [upBtn] = el.querySelectorAll('.mkt-number-input__control');
    (upBtn as HTMLButtonElement).click();
    // Clamped at max=3
    expect(input.value).toBe('3');
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('down button decrements', () => {
    const fn = vi.fn();
    const el = NumberInput({ label: 'X', step: 1, onValueChange: fn });
    const input = el.querySelector('input')!;
    input.value = '5';
    const buttons = el.querySelectorAll('.mkt-number-input__control');
    (buttons[1] as HTMLButtonElement).click();
    expect(fn).toHaveBeenCalledWith(4);
  });

  it('sets aria-invalid when error is set', () => {
    const el = NumberInput({ label: 'X', error: 'bad' });
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('stepper buttons dispatch native input + change events for parity with typing', () => {
    // Consumers wired to native form semantics (e.g. validators reading
    // `input.addEventListener('input', ...)` directly) need to observe
    // stepper-driven changes the same way they observe typed edits.
    const inputEvents: Event[] = [];
    const changeEvents: Event[] = [];
    const el = NumberInput({ label: 'X', step: 1, defaultValue: 5 });
    const input = el.querySelector('input')!;
    input.addEventListener('input', (e) => inputEvents.push(e));
    input.addEventListener('change', (e) => changeEvents.push(e));

    const [upBtn] = el.querySelectorAll('.mkt-number-input__control');
    (upBtn as HTMLButtonElement).click();

    expect(input.value).toBe('6');
    expect(inputEvents).toHaveLength(1);
    expect(changeEvents).toHaveLength(1);
    expect(inputEvents[0]!.bubbles).toBe(true);
    expect(changeEvents[0]!.bubbles).toBe(true);
  });
});

// ─── Paper ──────────────────────────────────────────────────
describe('Paper', () => {
  it('applies default radius and padding', () => {
    const el = Paper({});
    expect(el.dataset.radius).toBe('sm');
    expect(el.dataset.padding).toBe('md');
  });

  it('applies shadow data-attr', () => {
    const el = Paper({ shadow: 'lg' });
    expect(el.dataset.shadow).toBe('lg');
  });

  it('adds bordered modifier class when withBorder', () => {
    const el = Paper({ withBorder: true });
    expect(el.classList.contains('mkt-paper--bordered')).toBe(true);
  });
});

// ─── PasswordInput ──────────────────────────────────────────
describe('PasswordInput', () => {
  it('renders password input with a toggle button', () => {
    const el = PasswordInput({ label: 'Password' });
    const input = el.querySelector('input')!;
    expect(input.type).toBe('password');
    expect(el.querySelector('.mkt-password-input__toggle')).not.toBeNull();
  });

  it('toggle flips type to text and back', () => {
    const el = PasswordInput({ label: 'P' });
    const input = el.querySelector('input')!;
    const toggle = el.querySelector(
      '.mkt-password-input__toggle'
    ) as HTMLButtonElement;
    toggle.click();
    expect(input.type).toBe('text');
    toggle.click();
    expect(input.type).toBe('password');
  });

  it('applies aria-invalid on error', () => {
    const el = PasswordInput({ label: 'P', error: 'weak' });
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });
});

// ─── Radio ──────────────────────────────────────────────────
describe('Radio', () => {
  it('renders a label wrapping a radio input', () => {
    const el = Radio({ label: 'One' });
    expect(el.tagName).toBe('LABEL');
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('radio');
    expect(input.id).not.toBe('');
  });

  it('reflects name, value, checked', () => {
    const el = Radio({ name: 'grp', value: 'a', defaultChecked: true });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.name).toBe('grp');
    expect(input.value).toBe('a');
    expect(input.checked).toBe(true);
  });

  it('adds disabled modifier class and disables input', () => {
    const el = Radio({ label: 'X', disabled: true });
    expect(el.classList.contains('mkt-radio--disabled')).toBe(true);
    expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('renders error with aria-invalid and role=alert', () => {
    const el = Radio({ label: 'X', error: 'Required' });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = el.querySelector('[role="alert"]');
    expect(alert!.textContent).toBe('Required');
  });

  it('calls onChange', () => {
    const fn = vi.fn();
    const el = Radio({ label: 'X', onChange: fn });
    el.querySelector('input')!.dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalled();
  });
});

// ─── Rating ─────────────────────────────────────────────────
describe('Rating', () => {
  it('renders 5 symbol groups by default', () => {
    const el = Rating({});
    expect(el.querySelectorAll('.mkt-rating__symbol-group').length).toBe(5);
    expect(el.getAttribute('role')).toBe('radiogroup');
  });

  it('honors custom count', () => {
    const el = Rating({ count: 3 });
    expect(el.querySelectorAll('.mkt-rating__symbol-group').length).toBe(3);
  });

  it('readOnly renders role=img and disables inputs', () => {
    const el = Rating({ readOnly: true, value: 2 });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.dataset.readonly).toBe('');
    for (const input of el.querySelectorAll('input')) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
  });

  it('generates fractions * count inputs', () => {
    const el = Rating({ count: 4, fractions: 2 });
    expect(el.querySelectorAll('input').length).toBe(8);
  });

  it('fires onChange when an input is selected', () => {
    const fn = vi.fn();
    const el = Rating({ count: 3, onChange: fn });
    const inputs = el.querySelectorAll('input');
    (inputs[1] as HTMLInputElement).checked = true;
    inputs[1].dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledWith(2);
  });
});

// ─── RingProgress ───────────────────────────────────────────
describe('RingProgress', () => {
  it('renders an svg sized by props', () => {
    const el = RingProgress({ size: 80, value: 50 });
    expect(el.style.width).toBe('80px');
    expect(el.style.height).toBe('80px');
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('80');
    expect(svg.getAttribute('viewBox')).toBe('0 0 80 80');
  });

  it('renders one background + one value segment', () => {
    const el = RingProgress({ value: 50 });
    expect(el.querySelectorAll('circle').length).toBe(2);
  });

  it('renders a segment per sections entry', () => {
    const el = RingProgress({ sections: [{ value: 30 }, { value: 40 }, { value: 10 }] });
    // 1 bg + 3 segments
    expect(el.querySelectorAll('circle').length).toBe(4);
  });

  it('adds <title> element for tooltips', () => {
    const el = RingProgress({
      sections: [{ value: 50, tooltip: 'Used' }],
    });
    expect(el.querySelector('title')!.textContent).toBe('Used');
  });

  it('renders label when provided', () => {
    const el = RingProgress({ value: 10, label: '10%' });
    expect(el.querySelector('.mkt-ring-progress__label')!.textContent).toBe('10%');
  });
});

// ─── SimpleGrid ─────────────────────────────────────────────
describe('SimpleGrid', () => {
  it('sets gridTemplateColumns from cols', () => {
    const el = SimpleGrid({ cols: 3 });
    expect(el.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('resolves spacing tokens', () => {
    const el = SimpleGrid({ cols: 2, spacing: 'lg' });
    expect(el.style.columnGap).toBe('var(--mkt-space-6)');
  });

  it('verticalSpacing overrides rowGap independently', () => {
    const el = SimpleGrid({ cols: 2, spacing: 'sm', verticalSpacing: 'xl' });
    expect(el.style.columnGap).toBe('var(--mkt-space-2)');
    expect(el.style.rowGap).toBe('var(--mkt-space-8)');
  });
});

// ─── Textarea ───────────────────────────────────────────────
describe('Textarea', () => {
  it('renders a textarea wrapped with label', () => {
    const el = Textarea({ label: 'Notes' });
    const ta = el.querySelector('textarea')!;
    expect(ta).not.toBeNull();
    expect(ta.id).not.toBe('');
    const label = el.querySelector('label');
    expect(label!.htmlFor).toBe(ta.id);
  });

  it('honors rows', () => {
    const el = Textarea({ label: 'N', rows: 10 });
    expect(el.querySelector('textarea')!.rows).toBe(10);
  });

  it('reflects value', () => {
    const el = Textarea({ label: 'N', value: 'hello' });
    expect(el.querySelector('textarea')!.value).toBe('hello');
  });

  it('fires onInput', () => {
    const fn = vi.fn();
    const el = Textarea({ label: 'N', onInput: fn });
    el.querySelector('textarea')!.dispatchEvent(new Event('input'));
    expect(fn).toHaveBeenCalled();
  });

  it('sets aria-invalid on error', () => {
    const el = Textarea({ label: 'N', error: 'bad' });
    expect(el.querySelector('textarea')!.getAttribute('aria-invalid')).toBe(
      'true'
    );
  });
});

// ─── ThemeIcon ──────────────────────────────────────────────
describe('ThemeIcon', () => {
  it('renders a span with defaults', () => {
    const el = ThemeIcon({});
    expect(el.tagName).toBe('SPAN');
    expect(el.dataset.variant).toBe('filled');
    expect(el.dataset.color).toBe('primary');
    expect(el.dataset.size).toBe('md');
  });

  it('applies numeric size via style', () => {
    const el = ThemeIcon({ size: 40 });
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
    expect(el.dataset.size).toBeUndefined();
  });

  it('applies numeric radius via style', () => {
    const el = ThemeIcon({ radius: 8 });
    expect(el.style.borderRadius).toBe('8px');
  });

  it('applies token radius via data-attr', () => {
    const el = ThemeIcon({ radius: 'full' });
    expect(el.dataset.radius).toBe('full');
  });
});

// ─── UnstyledButton ─────────────────────────────────────────
describe('UnstyledButton', () => {
  it('renders a button by default with type=button', () => {
    const el = UnstyledButton({ children: 'Go' });
    expect(el.tagName).toBe('BUTTON');
    expect((el as HTMLButtonElement).type).toBe('button');
    expect(el.textContent).toBe('Go');
  });

  it('renders custom tag with role=button and tabindex', () => {
    const el = UnstyledButton({ as: 'a', children: 'Link' });
    expect(el.tagName).toBe('A');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('disabled on <a> sets aria-disabled and tabindex=-1', () => {
    const el = UnstyledButton({ as: 'a', disabled: true });
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('invokes onClick, but not when disabled', () => {
    const fn = vi.fn();
    const el = UnstyledButton({ children: 'X', onClick: fn, disabled: true });
    el.click();
    expect(fn).not.toHaveBeenCalled();
  });

  it('activates on Enter/Space for non-button tags', () => {
    const fn = vi.fn();
    const el = UnstyledButton({ as: 'div', children: 'X', onClick: fn });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ─── VisuallyHidden ─────────────────────────────────────────
describe('VisuallyHidden', () => {
  it('renders a span with the hide class', () => {
    const el = VisuallyHidden({ children: 'sr only' });
    expect(el.tagName).toBe('SPAN');
    expect(el.classList.contains('mkt-visually-hidden')).toBe(true);
    expect(el.textContent).toBe('sr only');
  });
});
