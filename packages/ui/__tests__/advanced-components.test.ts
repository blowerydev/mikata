import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createScope, flushSync, signal } from '@mikata/reactivity';
import { _resetIdCounter } from '../src/utils/unique-id';

import { Modal } from '../src/components/Modal';
import { Drawer } from '../src/components/Drawer';
import { Popover } from '../src/components/Popover';
import { Tooltip } from '../src/components/Tooltip';
import { HoverCard } from '../src/components/HoverCard';
import { Overlay } from '../src/components/Overlay';
import { LoadingOverlay } from '../src/components/LoadingOverlay';
import { Affix } from '../src/components/Affix';
import { ScrollArea } from '../src/components/ScrollArea';
import { Collapse } from '../src/components/Collapse';
import { Tree } from '../src/components/Tree';
import { Stepper } from '../src/components/Stepper';
import { Timeline } from '../src/components/Timeline';
import { Slider } from '../src/components/Slider';
import { RangeSlider } from '../src/components/RangeSlider';
import { Select } from '../src/components/Select';
import { TagsInput } from '../src/components/TagsInput';
import { PinInput } from '../src/components/PinInput';
import { FileInput } from '../src/components/FileInput';
import { FileButton } from '../src/components/FileButton';
import { ColorSwatch } from '../src/components/ColorSwatch';
import { BackgroundImage } from '../src/components/BackgroundImage';
import { Input } from '../src/components/Input';
import { Indicator } from '../src/components/Indicator';
import { AppShell } from '../src/components/AppShell';

beforeEach(() => {
  _resetIdCounter();
  document.body.innerHTML = '';
});

// ─── Modal ─────────────────────────────────────────────
describe('Modal', () => {
  it('appends a dialog to document.body and returns a comment marker', () => {
    createScope(() => {
      const content = document.createElement('p');
      content.textContent = 'Hello';
      const marker = Modal({ children: content, onClose: () => {} });
      expect(marker.nodeType).toBe(Node.COMMENT_NODE);
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.dataset.size).toBe('md');
      expect(dialog.textContent).toContain('Hello');
    });
  });

  it('renders title and close button by default', () => {
    createScope(() => {
      Modal({
        title: 'My Modal',
        children: document.createElement('div'),
        onClose: () => {},
      });
      expect(document.body.querySelector('.mkt-modal__title')?.textContent).toBe('My Modal');
      expect(document.body.querySelector('.mkt-modal__close')).toBeTruthy();
    });
  });

  it('hides close button when withCloseButton=false', () => {
    createScope(() => {
      Modal({
        children: document.createElement('div'),
        withCloseButton: false,
        onClose: () => {},
      });
      expect(document.body.querySelector('.mkt-modal__close')).toBeFalsy();
    });
  });

  it('invokes onClose when overlay is clicked (closeOnClickOutside default)', () => {
    createScope(() => {
      const onClose = vi.fn();
      Modal({ children: document.createElement('div'), onClose });
      const overlay = document.body.querySelector('.mkt-modal__overlay') as HTMLElement;
      overlay.click();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not invoke onClose when closeOnClickOutside=false', () => {
    createScope(() => {
      const onClose = vi.fn();
      Modal({
        children: document.createElement('div'),
        closeOnClickOutside: false,
        onClose,
      });
      const overlay = document.body.querySelector('.mkt-modal__overlay') as HTMLElement;
      overlay.click();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('invokes onClose on Escape key', () => {
    createScope(() => {
      const onClose = vi.fn();
      Modal({ children: document.createElement('div'), onClose });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('sets data-centered when centered=true', () => {
    createScope(() => {
      Modal({ children: document.createElement('div'), centered: true, onClose: () => {} });
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.dataset.centered).toBe('');
    });
  });

  it('keeps body scroll locked when one stacked overlay disposes', () => {
    const modalScope = createScope(() => {
      Modal({ children: document.createElement('div'), onClose: () => {} });
    });
    const drawerScope = createScope(() => {
      Drawer({ children: document.createElement('div'), onClose: () => {} });
    });

    expect(document.body.style.overflow).toBe('hidden');
    modalScope.dispose();
    expect(document.body.style.overflow).toBe('hidden');
    drawerScope.dispose();
  });
});

// ─── Drawer ─────────────────────────────────────────────
describe('Drawer', () => {
  it('appends a dialog with data-position=right by default', () => {
    createScope(() => {
      Drawer({ children: document.createElement('div'), onClose: () => {} });
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.dataset.position).toBe('right');
      expect(dialog.style.width).toBe('320px');
    });
  });

  it('sets height when position is top/bottom', () => {
    createScope(() => {
      Drawer({
        children: document.createElement('div'),
        position: 'top',
        size: '200px',
        onClose: () => {},
      });
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.dataset.position).toBe('top');
      expect(dialog.style.height).toBe('200px');
    });
  });

  it('invokes onClose when overlay clicked', () => {
    createScope(() => {
      const onClose = vi.fn();
      Drawer({ children: document.createElement('div'), onClose });
      const overlay = document.body.querySelector('.mkt-drawer__overlay') as HTMLElement;
      overlay.click();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

// ─── Popover ─────────────────────────────────────────────
describe('Popover', () => {
  it('wraps target and dropdown', () => {
    const target = document.createElement('button');
    target.textContent = 'Trigger';
    const content = document.createElement('div');
    content.textContent = 'Content';
    const el = Popover({ target, children: content, onClose: () => {} });
    expect(el.classList.contains('mkt-popover')).toBe(true);
    expect(el.contains(target)).toBe(true);
    const dropdown = el.querySelector('.mkt-popover__dropdown') as HTMLElement;
    expect(dropdown).toBeTruthy();
    expect(dropdown.getAttribute('role')).toBe('dialog');
    expect(dropdown.textContent).toContain('Content');
  });

  it('renders arrow when withArrow=true', () => {
    const el = Popover({
      target: document.createElement('div'),
      children: document.createElement('div'),
      withArrow: true,
      onClose: () => {},
    });
    expect(el.querySelector('.mkt-popover__arrow')).toBeTruthy();
  });

  it('closes on Escape when closeOnEscape default', () => {
    createScope(() => {
      const onClose = vi.fn();
      Popover({
        target: document.createElement('div'),
        children: document.createElement('div'),
        onClose,
      });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onClose).toHaveBeenCalled();
    });
  });
});

// ─── Tooltip ─────────────────────────────────────────────
describe('Tooltip', () => {
  it('wraps child and does not show tooltip until hovered', () => {
    const child = document.createElement('button');
    child.textContent = 'Trigger';
    const el = Tooltip({ label: 'Tip', children: child });
    expect(el.classList.contains('mkt-tooltip-wrapper')).toBe(true);
    expect(el.contains(child)).toBe(true);
    expect(el.querySelector('.mkt-tooltip')).toBeFalsy();
  });

  it('shows tooltip after delay on mouseenter', async () => {
    vi.useFakeTimers();
    const el = Tooltip({
      label: 'Hint',
      children: document.createElement('span'),
      delay: 100,
    });
    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(150);
    const tip = el.querySelector('.mkt-tooltip') as HTMLElement;
    expect(tip).toBeTruthy();
    expect(tip.textContent).toBe('Hint');
    expect(tip.getAttribute('role')).toBe('tooltip');
    vi.useRealTimers();
  });

  it('hides tooltip on mouseleave', async () => {
    vi.useFakeTimers();
    const el = Tooltip({ label: 'Hint', children: document.createElement('span'), delay: 10 });
    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(20);
    expect(el.querySelector('.mkt-tooltip')).toBeTruthy();
    el.dispatchEvent(new Event('mouseleave'));
    expect(el.querySelector('.mkt-tooltip')).toBeFalsy();
    vi.useRealTimers();
  });

  it('does not schedule duplicate tooltips before the delay resolves', () => {
    vi.useFakeTimers();
    const child = document.createElement('button');
    const el = Tooltip({ label: 'Hint', children: child, delay: 100 });

    el.dispatchEvent(new Event('mouseenter'));
    el.dispatchEvent(new Event('focusin'));
    vi.advanceTimersByTime(150);

    expect(el.querySelectorAll('.mkt-tooltip').length).toBe(1);
    vi.useRealTimers();
  });
});

// ─── HoverCard ─────────────────────────────────────────────
describe('HoverCard', () => {
  it('wraps target and configures dropdown role', () => {
    const target = document.createElement('span');
    const content = document.createElement('div');
    const el = HoverCard({ target, children: content });
    expect(el.classList.contains('mkt-hover-card')).toBe(true);
    expect(el.contains(target)).toBe(true);
    // dropdown isn't appended until show()
    expect(el.querySelector('.mkt-hover-card__dropdown')).toBeFalsy();
  });

  it('shows dropdown after openDelay on mouseenter', () => {
    vi.useFakeTimers();
    const el = HoverCard({
      target: document.createElement('span'),
      children: document.createElement('div'),
      openDelay: 50,
      closeDelay: 50,
    });
    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(100);
    expect(el.querySelector('.mkt-hover-card__dropdown')).toBeTruthy();
    vi.useRealTimers();
  });
});

// ─── Overlay ─────────────────────────────────────────────
describe('Overlay', () => {
  it('renders a div with overlay class and CSS vars', () => {
    const el = Overlay({ color: '#f00', opacity: 0.5, blur: 4 });
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('mkt-overlay')).toBe(true);
    expect(el.style.getPropertyValue('--_overlay-color')).toBe('#f00');
    expect(el.style.getPropertyValue('--_overlay-opacity')).toBe('0.5');
    expect(el.style.getPropertyValue('--_overlay-blur')).toBe('4px');
  });

  it('marks fixed with data attr', () => {
    const el = Overlay({ fixed: true });
    expect(el.dataset.fixed).toBe('');
  });

  it('wires onClick', () => {
    const onClick = vi.fn();
    const el = Overlay({ onClick });
    el.click();
    expect(onClick).toHaveBeenCalled();
  });

  it('wraps children when provided', () => {
    const child = document.createElement('span');
    child.textContent = 'x';
    const el = Overlay({ children: child });
    expect(el.querySelector('.mkt-overlay__content')?.contains(child)).toBe(true);
  });
});

// ─── LoadingOverlay ─────────────────────────────────────────────
describe('LoadingOverlay', () => {
  it('defaults to visible (aria-hidden=false)', () => {
    const el = LoadingOverlay({});
    expect(el.getAttribute('aria-hidden')).toBe('false');
    expect(el.classList.contains('mkt-loading-overlay')).toBe(true);
    expect(el.querySelector('.mkt-loading-overlay__loader')).toBeTruthy();
  });

  it('sets aria-hidden=true when visible=false', () => {
    const el = LoadingOverlay({ visible: false });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.dataset.hidden).toBe('');
  });

  it('applies blur to overlay via backdropFilter', () => {
    const el = LoadingOverlay({ overlayBlur: 5 });
    const overlay = el.querySelector('.mkt-loading-overlay__overlay') as HTMLElement;
    expect(overlay.style.backdropFilter).toBe('blur(5px)');
  });
});

// ─── Affix ─────────────────────────────────────────────
describe('Affix', () => {
  it('appends absolutely-positioned element to document.body', () => {
    createScope(() => {
      const content = document.createElement('span');
      content.textContent = 'Fab';
      const marker = Affix({ children: content, position: { top: 10, left: 20 } });
      expect(marker.nodeType).toBe(Node.COMMENT_NODE);
      const el = document.body.querySelector('.mkt-affix') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.top).toBe('10px');
      expect(el.style.left).toBe('20px');
      expect(el.contains(content)).toBe(true);
    });
  });

  it('applies zIndex as string', () => {
    createScope(() => {
      Affix({ children: document.createElement('div'), zIndex: 500 });
      const el = document.body.querySelector('.mkt-affix') as HTMLElement;
      expect(el.style.zIndex).toBe('500');
    });
  });
});

// ─── ScrollArea ─────────────────────────────────────────────
describe('ScrollArea', () => {
  it('renders root + viewport with default type/direction', () => {
    const child = document.createElement('p');
    child.textContent = 'body';
    const el = ScrollArea({ children: child });
    expect(el.classList.contains('mkt-scroll-area')).toBe(true);
    expect(el.dataset.type).toBe('hover');
    expect(el.dataset.direction).toBe('vertical');
    const viewport = el.querySelector('.mkt-scroll-area__viewport') as HTMLElement;
    expect(viewport.contains(child)).toBe(true);
  });

  it('applies width/height when provided', () => {
    const el = ScrollArea({
      children: document.createElement('div'),
      width: 200,
      height: '300px',
    });
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('300px');
  });

  it('emits scroll position changes', () => {
    const onScroll = vi.fn();
    const el = ScrollArea({
      children: document.createElement('div'),
      onScrollPositionChange: onScroll,
    });
    const viewport = el.querySelector('.mkt-scroll-area__viewport') as HTMLElement;
    Object.defineProperty(viewport, 'scrollTop', { value: 50, configurable: true });
    Object.defineProperty(viewport, 'scrollLeft', { value: 10, configurable: true });
    viewport.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalledWith({ x: 10, y: 50 });
  });
});

// ─── Collapse ─────────────────────────────────────────────
describe('Collapse', () => {
  it('initial state closed when in=false', () => {
    const child = document.createElement('div');
    child.textContent = 'hidden';
    const el = Collapse({ in: false, children: child });
    expect(el.classList.contains('mkt-collapse')).toBe(true);
    expect(el.style.height).toBe('0px');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('initial state open when in=true', () => {
    const el = Collapse({ in: true, children: document.createElement('div') });
    expect(el.style.height).toBe('auto');
    expect(el.getAttribute('aria-hidden')).toBe('false');
  });

  it('sets transition duration from duration prop', () => {
    const el = Collapse({
      in: true,
      children: document.createElement('div'),
      duration: 500,
    });
    expect(el.style.transitionDuration).toBe('500ms');
    expect(el.style.getPropertyValue('--_collapse-duration')).toBe('500ms');
  });
});

// ─── Tree ─────────────────────────────────────────────
describe('Tree', () => {
  const sample = [
    {
      label: 'Fruits',
      value: 'fruits',
      children: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ],
    },
    { label: 'Veggies', value: 'veggies' },
  ];

  it('renders tree with role=tree and nested items with role=treeitem', () => {
    const el = Tree({ data: sample });
    expect(el.tagName).toBe('UL');
    expect(el.getAttribute('role')).toBe('tree');
    expect(el.querySelectorAll('[role="treeitem"]').length).toBe(4);
  });

  it('collapsed children hidden by default (display:none)', () => {
    const el = Tree({ data: sample });
    const parentChildren = el.querySelector('.mkt-tree__node-children') as HTMLElement;
    expect(parentChildren.style.display).toBe('none');
  });

  it('expands by default when defaultExpanded contains value', () => {
    const el = Tree({ data: sample, defaultExpanded: ['fruits'] });
    const parent = el.querySelector('[role="treeitem"]') as HTMLElement;
    expect(parent.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles expansion on label click', () => {
    const el = Tree({ data: sample });
    const label = el.querySelector('.mkt-tree__node-label') as HTMLElement;
    const parent = el.querySelector('[role="treeitem"]') as HTMLElement;
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    label.click();
    expect(parent.getAttribute('aria-expanded')).toBe('true');
  });

  it('invokes onSelect with value and node on click', () => {
    const onSelect = vi.fn();
    const el = Tree({ data: sample, onSelect });
    const labels = el.querySelectorAll('.mkt-tree__node-label');
    (labels[labels.length - 1] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith('veggies', expect.objectContaining({ value: 'veggies' }));
  });
});

// ─── Stepper ─────────────────────────────────────────────
describe('Stepper', () => {
  const steps = [
    { label: 'One' },
    { label: 'Two' },
    { label: 'Three' },
  ];

  it('renders all steps with separators between them', () => {
    const el = Stepper({ active: 0, steps });
    expect(el.querySelectorAll('.mkt-stepper__step').length).toBe(3);
    expect(el.querySelectorAll('.mkt-stepper__separator').length).toBe(2);
  });

  it('marks steps with data-state based on active index', () => {
    const el = Stepper({ active: 1, steps });
    const stepEls = el.querySelectorAll('.mkt-stepper__step');
    expect((stepEls[0] as HTMLElement).dataset.state).toBe('complete');
    expect((stepEls[1] as HTMLElement).dataset.state).toBe('active');
    expect((stepEls[2] as HTMLElement).dataset.state).toBe('pending');
  });

  it('renders error state when step.error is set', () => {
    const el = Stepper({
      active: 1,
      steps: [{ label: 'A' }, { label: 'B', error: 'Bad' }, { label: 'C' }],
    });
    const stepEls = el.querySelectorAll('.mkt-stepper__step');
    expect((stepEls[1] as HTMLElement).dataset.state).toBe('error');
  });

  it('uses buttons with onClick when allowStepClick+onStepClick provided', () => {
    const onStepClick = vi.fn();
    const el = Stepper({ active: 0, steps, onStepClick });
    const first = el.querySelector('.mkt-stepper__step') as HTMLElement;
    expect(first.tagName).toBe('BUTTON');
    first.click();
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('shows completedContent when active > steps.length', () => {
    const completed = document.createElement('div');
    completed.textContent = 'Done!';
    const el = Stepper({ active: 3, steps, completedContent: completed });
    expect(el.querySelector('.mkt-stepper__content')?.contains(completed)).toBe(true);
  });
});

// ─── Timeline ─────────────────────────────────────────────
describe('Timeline', () => {
  const items = [
    { title: 'First' },
    { title: 'Second' },
    { title: 'Third' },
  ];

  it('renders item for each entry with bullet', () => {
    const el = Timeline({ items, active: 1 });
    expect(el.querySelectorAll('.mkt-timeline__item').length).toBe(3);
    expect(el.querySelectorAll('.mkt-timeline__item-bullet').length).toBe(3);
  });

  it('marks items up to active as data-active', () => {
    const el = Timeline({ items, active: 1 });
    const nodes = el.querySelectorAll('.mkt-timeline__item');
    expect((nodes[0] as HTMLElement).dataset.active).toBe('');
    expect((nodes[1] as HTMLElement).dataset.active).toBe('');
    expect((nodes[1] as HTMLElement).dataset.current).toBe('');
    expect((nodes[2] as HTMLElement).dataset.active).toBeUndefined();
  });

  it('applies line-width and bullet-size CSS vars', () => {
    const el = Timeline({ items, bulletSize: 30, lineWidth: 3 });
    expect(el.style.getPropertyValue('--_tl-bullet-size')).toBe('30px');
    expect(el.style.getPropertyValue('--_tl-line-width')).toBe('3px');
  });
});

// ─── Slider ─────────────────────────────────────────────
describe('Slider', () => {
  it('renders a range input with min/max/step', () => {
    const el = Slider({ min: 0, max: 50, step: 5, defaultValue: 20 });
    const input = el.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.min).toBe('0');
    expect(input.max).toBe('50');
    expect(input.step).toBe('5');
    expect(input.value).toBe('20');
  });

  it('fires onValueChange on input', () => {
    const onValueChange = vi.fn();
    const el = Slider({ defaultValue: 10, onValueChange });
    const input = el.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = '35';
    input.dispatchEvent(new Event('input'));
    expect(onValueChange).toHaveBeenCalledWith(35);
  });

  it('renders label row with function label', () => {
    const el = Slider({
      defaultValue: 40,
      label: (v) => `Value: ${v}`,
    });
    const labelText = el.querySelector('.mkt-slider__label span') as HTMLElement;
    expect(labelText.textContent).toBe('Value: 40');
  });
});

// ─── RangeSlider ─────────────────────────────────────────────
describe('RangeSlider', () => {
  it('renders two thumbs within track', () => {
    const el = RangeSlider({ min: 0, max: 100, defaultValue: [20, 80] });
    expect(el.classList.contains('mkt-range-slider')).toBe(true);
    const thumbs = el.querySelectorAll('.mkt-range-slider__thumb');
    expect(thumbs.length).toBe(2);
    expect(thumbs[0].getAttribute('aria-valuenow')).toBe('20');
    expect(thumbs[1].getAttribute('aria-valuenow')).toBe('80');
  });

  it('clamps values to min/max', () => {
    const el = RangeSlider({ min: 0, max: 100, defaultValue: [-10, 200] });
    const thumbs = el.querySelectorAll('.mkt-range-slider__thumb');
    expect(thumbs[0].getAttribute('aria-valuenow')).toBe('0');
    expect(thumbs[1].getAttribute('aria-valuenow')).toBe('100');
  });

  it('disables tabs when disabled', () => {
    const el = RangeSlider({ defaultValue: [10, 20], disabled: true });
    expect(el.dataset.disabled).toBe('');
    const thumbs = el.querySelectorAll('.mkt-range-slider__thumb');
    expect(thumbs[0].getAttribute('tabindex')).toBe('-1');
    expect(thumbs[1].getAttribute('tabindex')).toBe('-1');
  });

  it('adjusts value via keyboard ArrowRight', () => {
    const onValueChange = vi.fn();
    const el = RangeSlider({
      min: 0,
      max: 100,
      step: 1,
      defaultValue: [20, 80],
      onValueChange,
    });
    const lowThumb = el.querySelectorAll('.mkt-range-slider__thumb')[0] as HTMLElement;
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    lowThumb.dispatchEvent(ev);
    expect(onValueChange).toHaveBeenCalledWith([21, 80]);
  });
});

// ─── Select ─────────────────────────────────────────────
describe('Select', () => {
  it('renders options from sync data', () => {
    const el = Select({
      label: 'Pick',
      data: [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ],
    });
    const select = el.querySelector('select') as HTMLSelectElement;
    expect(select.children.length).toBe(2);
    expect(select.children[0].textContent).toBe('Apple');
  });

  it('renders placeholder option when placeholder given', () => {
    const el = Select({
      data: [{ value: 'a', label: 'Apple' }],
      placeholder: 'Choose…',
    });
    const select = el.querySelector('select') as HTMLSelectElement;
    const first = select.children[0] as HTMLOptionElement;
    expect(first.disabled).toBe(true);
    expect(first.textContent).toBe('Choose…');
  });

  it('fires onChange with native change event', () => {
    const onChange = vi.fn();
    const el = Select({
      data: [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ],
      onChange,
    });
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalled();
  });

  it('shows loading placeholder for async fetcher', () => {
    createScope(() => {
      const el = Select({
        data: () => new Promise(() => {}),
        loadingLabel: 'Loading tags',
      });
      const select = el.querySelector('select') as HTMLSelectElement;
      expect(select.dataset.loading).toBe('');
      expect(select.children[0].textContent).toBe('Loading tags');
    });
  });

  it('recovers when async fetcher rejects (re-enables, swaps placeholder)', async () => {
    const onError = vi.fn();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let select: HTMLSelectElement;
    createScope(() => {
      const el = Select({
        data: () => Promise.reject(new Error('boom')),
        loadingLabel: 'Loading…',
        errorLabel: 'Could not load',
        onError,
      });
      select = el.querySelector('select') as HTMLSelectElement;
    });
    expect(select!.dataset.loading).toBe('');
    expect(select!.disabled).toBe(true);

    // Two microtask hops: one for the awaited Promise.reject in the
    // fetcher's `.then` chain, one for the onRejected handler body.
    await Promise.resolve();
    await Promise.resolve();

    expect(select!.dataset.loading).toBeUndefined();
    expect(select!.dataset.error).toBe('');
    expect(select!.disabled).toBe(false);
    expect(select!.children[0]!.textContent).toBe('Could not load');
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toBe('boom');
    errSpy.mockRestore();
  });

  it('syncs controlled value updates to the native select', () => {
    const [value, setValue] = signal('a');
    const el = Select({
      data: [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ],
      get value() { return value(); },
    });
    const select = el.querySelector('select') as HTMLSelectElement;

    expect(select.value).toBe('a');
    setValue('b');
    flushSync();
    expect(select.value).toBe('b');
  });
});

// ─── TagsInput ─────────────────────────────────────────────
describe('TagsInput', () => {
  it('renders initial tags as pills', () => {
    const el = TagsInput({ defaultValue: ['foo', 'bar'] });
    const pills = el.querySelectorAll('.mkt-tags-input__pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toContain('foo');
    expect(pills[1].textContent).toContain('bar');
  });

  it('adds a new tag on Enter', () => {
    const onChange = vi.fn();
    const el = TagsInput({ defaultValue: [], onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'new';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onChange).toHaveBeenCalledWith(['new']);
  });

  it('removes last tag on Backspace when input is empty', () => {
    const onChange = vi.fn();
    const el = TagsInput({ defaultValue: ['one', 'two'], onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onChange).toHaveBeenCalledWith(['one']);
  });

  it('ignores duplicates when allowDuplicates is not set', () => {
    const onChange = vi.fn();
    const el = TagsInput({ defaultValue: ['a'], onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects maxTags', () => {
    const onChange = vi.fn();
    const el = TagsInput({ defaultValue: ['a', 'b'], maxTags: 2, onChange });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'c';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── PinInput ─────────────────────────────────────────────
describe('PinInput', () => {
  it('renders N inputs based on length', () => {
    const el = PinInput({ length: 6 });
    expect(el.querySelectorAll('input').length).toBe(6);
  });

  it('uses password type when mask=true', () => {
    const el = PinInput({ length: 4, mask: true });
    const inputs = el.querySelectorAll('input');
    inputs.forEach((i) => expect((i as HTMLInputElement).type).toBe('password'));
  });

  it('calls onChange and onComplete when all filled', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const el = PinInput({ length: 3, onChange, onComplete });
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    inputs[0].value = '1';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = '2';
    inputs[1].dispatchEvent(new Event('input'));
    inputs[2].value = '3';
    inputs[2].dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(onComplete).toHaveBeenCalledWith('123');
  });

  it('rejects non-matching chars in numeric mode', () => {
    const onChange = vi.fn();
    const el = PinInput({ length: 3, type: 'number', onChange });
    const first = el.querySelector('input') as HTMLInputElement;
    first.value = 'a';
    first.dispatchEvent(new Event('input'));
    expect(first.value).toBe('');
  });

  it('accepts initial value from defaultValue', () => {
    const el = PinInput({ length: 4, defaultValue: '12' });
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('');
  });
});

// ─── FileInput ─────────────────────────────────────────────
describe('FileInput', () => {
  it('renders trigger button with placeholder text', () => {
    const el = FileInput({ placeholder: 'Upload here' });
    const value = el.querySelector('.mkt-file-input__value') as HTMLElement;
    expect(value.textContent).toBe('Upload here');
    expect(value.dataset.placeholder).toBe('');
  });

  it('has hidden native input with multiple when multiple=true', () => {
    const el = FileInput({ multiple: true });
    const native = el.querySelector('input[type="file"]') as HTMLInputElement;
    expect(native.multiple).toBe(true);
  });

  it('sets accept attribute', () => {
    const el = FileInput({ accept: 'image/*' });
    const native = el.querySelector('input[type="file"]') as HTMLInputElement;
    expect(native.accept).toBe('image/*');
  });

  it('disables trigger and native input when disabled', () => {
    const el = FileInput({ disabled: true });
    const trigger = el.querySelector('.mkt-file-input__input') as HTMLButtonElement;
    const native = el.querySelector('input[type="file"]') as HTMLInputElement;
    expect(trigger.disabled).toBe(true);
    expect(native.disabled).toBe(true);
  });
});

// ─── FileButton ─────────────────────────────────────────────
describe('FileButton', () => {
  it('returns a DocumentFragment containing the trigger and hidden input', () => {
    const btn = document.createElement('button');
    const frag = FileButton({
      children: (open) => {
        btn.addEventListener('click', open);
        return btn;
      },
      onChange: () => {},
    });
    expect(frag.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    expect(frag.contains(btn)).toBe(true);
    const hidden = frag.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hidden).toBeTruthy();
    expect(hidden.style.display).toBe('none');
  });

  it('supports multiple and accept props', () => {
    const frag = FileButton({
      multiple: true,
      accept: '.png',
      children: () => document.createElement('button'),
      onChange: () => {},
    });
    const hidden = frag.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hidden.multiple).toBe(true);
    expect(hidden.accept).toBe('.png');
  });

  it('resetRef provides a reset function', () => {
    const resetRef: { current: (() => void) | null } = { current: null };
    const frag = FileButton({
      children: () => document.createElement('button'),
      onChange: () => {},
      resetRef,
    });
    const hidden = frag.querySelector('input[type="file"]') as HTMLInputElement;
    hidden.value = ''; // stays empty in jsdom but that's fine
    expect(typeof resetRef.current).toBe('function');
    resetRef.current!();
    expect(hidden.value).toBe('');
  });
});

// ─── ColorSwatch ─────────────────────────────────────────────
describe('ColorSwatch', () => {
  it('renders div when onClick not provided', () => {
    const el = ColorSwatch({ color: '#abcdef' });
    expect(el.tagName).toBe('DIV');
    const inner = el.querySelector('.mkt-color-swatch__color') as HTMLElement;
    expect(inner.style.backgroundColor).toBe('rgb(171, 205, 239)');
  });

  it('renders button when onClick provided and fires it', () => {
    const onClick = vi.fn();
    const el = ColorSwatch({ color: '#000', onClick });
    expect(el.tagName).toBe('BUTTON');
    el.click();
    expect(onClick).toHaveBeenCalled();
  });

  it('applies size as px', () => {
    const el = ColorSwatch({ color: '#000', size: 40 });
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });

  it('applies numeric radius via borderRadius', () => {
    const el = ColorSwatch({ color: '#000', radius: 4 });
    expect(el.style.borderRadius).toBe('4px');
    expect(el.dataset.radius).toBeUndefined();
  });

  it('sets data-radius for named radius', () => {
    const el = ColorSwatch({ color: '#000', radius: 'md' });
    expect(el.dataset.radius).toBe('md');
  });
});

// ─── BackgroundImage ─────────────────────────────────────────────
describe('BackgroundImage', () => {
  it('sets background-image url from src', () => {
    const el = BackgroundImage({ src: 'https://example.com/a.png', children: document.createElement('span') });
    expect(el.style.backgroundImage).toBe('url("https://example.com/a.png")');
  });

  it('escapes quotes in src', () => {
    const el = BackgroundImage({ src: 'a"b.png', children: document.createElement('span') });
    expect(el.style.backgroundImage).toBe('url("a\\"b.png")');
  });

  it('applies numeric radius', () => {
    const el = BackgroundImage({ src: 'x.png', radius: 8, children: document.createElement('div') });
    expect(el.style.borderRadius).toBe('8px');
  });

  it('applies named radius via data-radius', () => {
    const el = BackgroundImage({ src: 'x.png', radius: 'lg', children: document.createElement('div') });
    expect(el.dataset.radius).toBe('lg');
  });
});

// ─── Input ─────────────────────────────────────────────
describe('Input', () => {
  it('renders wrapper with input inside', () => {
    const el = Input({ placeholder: 'Name' });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(el.classList.contains('mkt-input')).toBe(true);
    expect(input.type).toBe('text');
    expect(input.placeholder).toBe('Name');
  });

  it('reads defaultValue into the input', () => {
    const el = Input({ defaultValue: 'hi' });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('hi');
  });

  it('wires leftSection/rightSection', () => {
    const left = document.createElement('span');
    left.textContent = 'L';
    const right = document.createElement('span');
    right.textContent = 'R';
    const el = Input({ leftSection: left, rightSection: right });
    expect(el.dataset.hasLeft).toBe('');
    expect(el.dataset.hasRight).toBe('');
    expect(el.querySelector('.mkt-input__section--left')?.contains(left)).toBe(true);
    expect(el.querySelector('.mkt-input__section--right')?.contains(right)).toBe(true);
  });

  it('fires onInput on native input event', () => {
    const onInput = vi.fn();
    const el = Input({ onInput });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalled();
  });

  it('marks aria-invalid when invalid=true', () => {
    const el = Input({ invalid: true });
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

// ─── Indicator ─────────────────────────────────────────────
describe('Indicator', () => {
  it('renders span with child and default indicator', () => {
    const child = document.createElement('div');
    const el = Indicator({ children: child });
    expect(el.tagName).toBe('SPAN');
    expect(el.contains(child)).toBe(true);
    const dot = el.querySelector('.mkt-indicator__indicator') as HTMLElement;
    expect(dot.dataset.position).toBe('top-end');
    expect(dot.dataset.color).toBe('primary');
  });

  it('omits indicator when disabled', () => {
    const el = Indicator({ children: document.createElement('div'), disabled: true });
    expect(el.querySelector('.mkt-indicator__indicator')).toBeFalsy();
  });

  it('renders label inside indicator', () => {
    const el = Indicator({ children: document.createElement('div'), label: '3' });
    const dot = el.querySelector('.mkt-indicator__indicator') as HTMLElement;
    expect(dot.textContent).toBe('3');
    expect(dot.dataset.withLabel).toBe('');
  });

  it('applies processing data-attr', () => {
    const el = Indicator({ children: document.createElement('div'), processing: true });
    const dot = el.querySelector('.mkt-indicator__indicator') as HTMLElement;
    expect(dot.dataset.processing).toBe('');
  });

  it('applies numeric radius via style', () => {
    const el = Indicator({ children: document.createElement('div'), radius: 4 });
    const dot = el.querySelector('.mkt-indicator__indicator') as HTMLElement;
    expect(dot.style.borderRadius).toBe('4px');
  });
});

// ─── AppShell ─────────────────────────────────────────────
describe('AppShell', () => {
  it('renders main with children by default', () => {
    const child = document.createElement('p');
    child.textContent = 'content';
    const el = AppShell({ children: child });
    expect(el.classList.contains('mkt-app-shell')).toBe(true);
    const main = el.querySelector('main') as HTMLElement;
    expect(main.contains(child)).toBe(true);
  });

  it('renders optional header, navbar, aside, footer in order', () => {
    const el = AppShell({
      header: { children: makeNode('H') },
      navbar: { children: makeNode('N') },
      aside: { children: makeNode('A') },
      footer: { children: makeNode('F') },
      children: makeNode('M'),
    });
    const kids = Array.from(el.children).map((c) => c.tagName);
    expect(kids).toEqual(['HEADER', 'ASIDE', 'ASIDE', 'MAIN', 'FOOTER']);
  });

  it('hides a section when collapsed and collapseRemoves default', () => {
    const el = AppShell({
      header: { children: makeNode('H'), collapsed: true },
      children: makeNode('M'),
    });
    expect(el.querySelector('header')).toBeFalsy();
    expect(el.style.getPropertyValue('--_shell-header')).toBe('0px');
  });

  it('keeps section rendered when collapsed with collapseRemoves=false', () => {
    const el = AppShell({
      header: { children: makeNode('H'), collapsed: true, collapseRemoves: false },
      children: makeNode('M'),
    });
    const header = el.querySelector('header') as HTMLElement;
    expect(header).toBeTruthy();
    expect(header.dataset.collapsed).toBe('');
  });

  it('applies custom size and padding via CSS vars', () => {
    const el = AppShell({
      header: { children: makeNode('H'), size: 80 },
      padding: 16,
      children: makeNode('M'),
    });
    expect(el.style.getPropertyValue('--_shell-header')).toBe('80px');
    expect(el.style.getPropertyValue('--_shell-padding')).toBe('16px');
  });
});

function makeNode(text: string): HTMLElement {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
}
