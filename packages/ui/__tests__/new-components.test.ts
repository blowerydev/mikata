import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@mikata/runtime';
import { _resetIdCounter } from '../src/utils/unique-id';

import { Card } from '../src/components/Card';
import { Tabs } from '../src/components/Tabs';
import { Menu } from '../src/components/Menu';
import { Table } from '../src/components/Table';
import { Accordion } from '../src/components/Accordion';
import { Avatar, AvatarGroup } from '../src/components/Avatar';
import { Pagination } from '../src/components/Pagination';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { Breadcrumb } from '../src/components/Breadcrumb';
import { NavLink } from '../src/components/NavLink';
import { toast } from '../src/components/Toast';
import { Autocomplete } from '../src/components/Autocomplete';
import { MultiSelect } from '../src/components/MultiSelect';

beforeEach(() => {
  _resetIdCounter();
  document.body.innerHTML = '';
});

// ── Card ──────────────────────────────────────────
describe('Card', () => {
  it('renders with default props', () => {
    const el = Card({});
    expect(el.classList.contains('mkt-card')).toBe(true);
    expect(el.querySelector('.mkt-card__body')).toBeTruthy();
  });

  it('applies shadow, padding, radius', () => {
    const el = Card({ shadow: 'lg', padding: 'xl', radius: 'md' });
    expect(el.dataset.shadow).toBe('lg');
    expect(el.dataset.padding).toBe('xl');
    expect(el.dataset.radius).toBe('md');
  });

  it('renders header and footer', () => {
    const el = Card({
      header: 'My Header',
      footer: 'My Footer',
      children: 'Body content',
    });
    expect(el.querySelector('.mkt-card__header')?.textContent).toBe('My Header');
    expect(el.querySelector('.mkt-card__footer')?.textContent).toBe('My Footer');
    expect(el.querySelector('.mkt-card__body')?.textContent).toBe('Body content');
  });

  it('applies withBorder class', () => {
    const el = Card({ withBorder: true });
    expect(el.classList.contains('mkt-card--bordered')).toBe(true);
  });
});

// ── Tabs ──────────────────────────────────────────
describe('Tabs', () => {
  const items = [
    { value: 'a', label: 'Tab A', content: 'Content A' },
    { value: 'b', label: 'Tab B', content: 'Content B' },
    { value: 'c', label: 'Tab C', content: 'Content C', disabled: true },
  ];

  it('renders tablist with correct roles', () => {
    const el = Tabs({ items });
    const tablist = el.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);
  });

  it('defaults to first tab active', () => {
    const el = Tabs({ items });
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('sets defaultValue', () => {
    const el = Tabs({ items, defaultValue: 'b' });
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('applies variant and color', () => {
    const el = Tabs({ items, variant: 'pills', color: 'red' });
    expect(el.dataset.variant).toBe('pills');
    expect(el.dataset.color).toBe('red');
  });

  it('disables tabs', () => {
    const el = Tabs({ items });
    const disabledTab = el.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    expect(disabledTab.disabled).toBe(true);
    expect(disabledTab.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows/hides panels on click', () => {
    const onChange = vi.fn();
    const el = Tabs({ items, onChange });
    const tabs = el.querySelectorAll('[role="tab"]');
    const panels = el.querySelectorAll('[role="tabpanel"]');

    (tabs[1] as HTMLButtonElement).click();

    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect((panels[0] as HTMLElement).hidden).toBe(true);
    expect((panels[1] as HTMLElement).hidden).toBe(false);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('has aria-controls and aria-labelledby linking tabs to panels', () => {
    const el = Tabs({ items });
    const tabs = el.querySelectorAll('[role="tab"]');
    const panels = el.querySelectorAll('[role="tabpanel"]');
    expect(tabs[0].getAttribute('aria-controls')).toBe(panels[0].id);
    expect(panels[0].getAttribute('aria-labelledby')).toBe(tabs[0].id);
  });
});

// ── Menu ──────────────────────────────────────────
describe('Menu', () => {
  it('renders with target and hidden dropdown', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Open';
    const el = Menu({
      target: btn,
      items: [{ label: 'Edit' }, { label: 'Delete' }],
    });
    expect(el.querySelector('[role="menu"]')).toBeTruthy();
    expect((el.querySelector('[role="menu"]') as HTMLElement).hidden).toBe(true);
  });

  it('opens on target click', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Open';
    const el = Menu({
      target: btn,
      items: [{ label: 'Edit' }],
    });
    document.body.appendChild(el);
    btn.click();
    expect((el.querySelector('[role="menu"]') as HTMLElement).hidden).toBe(false);
  });

  it('renders dividers and labels', () => {
    const btn = document.createElement('button');
    const el = Menu({
      target: btn,
      items: [
        { type: 'label', label: 'Group' },
        { label: 'Item' },
        { type: 'divider' },
      ],
    });
    expect(el.querySelector('.mkt-menu__label')?.textContent).toBe('Group');
    expect(el.querySelector('[role="separator"]')).toBeTruthy();
  });

  it('sets aria-haspopup on target button', () => {
    const btn = document.createElement('button');
    const el = Menu({ target: btn, items: [{ label: 'Item' }] });
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('removes its document click listener on disposal', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const dispose = render(() => {
      const btn = document.createElement('button');
      return Menu({ target: btn, items: [{ label: 'Item' }] });
    }, container);

    const addedClicks = addSpy.mock.calls.filter(([ev]) => ev === 'click').length;
    expect(addedClicks).toBeGreaterThan(0);

    dispose();

    const removedClicks = removeSpy.mock.calls.filter(([ev]) => ev === 'click').length;
    expect(removedClicks).toBe(addedClicks);

    addSpy.mockRestore();
    removeSpy.mockRestore();
    container.remove();
  });
});

// ── Table ─────────────────────────────────────────
describe('Table', () => {
  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'age', title: 'Age' },
  ];
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ];

  it('renders table with headers and rows', () => {
    const el = Table({ columns, data });
    const ths = el.querySelectorAll('.mkt-table__th');
    const tds = el.querySelectorAll('.mkt-table__td');
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toBe('Name');
    expect(tds.length).toBe(4);
    expect(tds[0].textContent).toBe('Alice');
    expect(tds[1].textContent).toBe('30');
  });

  it('applies striped and hover classes', () => {
    const el = Table({ columns, data, striped: true, highlightOnHover: true });
    const table = el.querySelector('table');
    expect(table?.classList.contains('mkt-table--striped')).toBe(true);
    expect(table?.classList.contains('mkt-table--hover')).toBe(true);
  });

  it('supports custom render function', () => {
    const cols = [
      { key: 'name', title: 'Name', render: (row: any) => {
        const b = document.createElement('b');
        b.textContent = row.name;
        return b;
      }},
    ];
    const el = Table({ columns: cols, data });
    expect(el.querySelector('b')?.textContent).toBe('Alice');
  });

  it('fires onRowClick', () => {
    const onClick = vi.fn();
    const el = Table({ columns, data, onRowClick: onClick });
    const row = el.querySelector('.mkt-table__tr') as HTMLElement;
    row.click();
    expect(onClick).toHaveBeenCalledWith(data[0], 0);
  });
});

// ── Accordion ─────────────────────────────────────
describe('Accordion', () => {
  const items = [
    { value: 'a', label: 'Section A', content: 'Content A' },
    { value: 'b', label: 'Section B', content: 'Content B' },
  ];

  it('renders items with aria-expanded', () => {
    const el = Accordion({ items });
    const controls = el.querySelectorAll('.mkt-accordion__control');
    expect(controls.length).toBe(2);
    expect(controls[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('opens defaultValue item', () => {
    const el = Accordion({ items, defaultValue: 'a' });
    const controls = el.querySelectorAll('.mkt-accordion__control');
    expect(controls[0].getAttribute('aria-expanded')).toBe('true');
    const panels = el.querySelectorAll('[role="region"]');
    expect((panels[0] as HTMLElement).hidden).toBe(false);
    expect((panels[1] as HTMLElement).hidden).toBe(true);
  });

  it('toggles on click', () => {
    const onChange = vi.fn();
    const el = Accordion({ items, onChange });
    const controls = el.querySelectorAll('.mkt-accordion__control');

    (controls[0] as HTMLButtonElement).click();
    expect(controls[0].getAttribute('aria-expanded')).toBe('true');
    expect(onChange).toHaveBeenCalledWith(['a']);

    // Click again to close
    (controls[0] as HTMLButtonElement).click();
    expect(controls[0].getAttribute('aria-expanded')).toBe('false');
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('closes others in single mode', () => {
    const el = Accordion({ items, defaultValue: 'a' });
    const controls = el.querySelectorAll('.mkt-accordion__control');
    const panels = el.querySelectorAll('[role="region"]');

    (controls[1] as HTMLButtonElement).click();
    expect(controls[0].getAttribute('aria-expanded')).toBe('false');
    expect(controls[1].getAttribute('aria-expanded')).toBe('true');
    expect((panels[0] as HTMLElement).hidden).toBe(true);
    expect((panels[1] as HTMLElement).hidden).toBe(false);
  });

  it('supports multiple mode', () => {
    const el = Accordion({ items, multiple: true });
    const controls = el.querySelectorAll('.mkt-accordion__control');

    (controls[0] as HTMLButtonElement).click();
    (controls[1] as HTMLButtonElement).click();
    expect(controls[0].getAttribute('aria-expanded')).toBe('true');
    expect(controls[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('applies variant', () => {
    const el = Accordion({ items, variant: 'separated' });
    expect(el.dataset.variant).toBe('separated');
  });
});

// ── Avatar ────────────────────────────────────────
describe('Avatar', () => {
  it('renders with initials from name', () => {
    const el = Avatar({ name: 'John Doe' });
    expect(el.classList.contains('mkt-avatar')).toBe(true);
    expect(el.querySelector('.mkt-avatar__placeholder')?.textContent).toBe('JD');
  });

  it('single name gets single initial', () => {
    const el = Avatar({ name: 'Alice' });
    expect(el.querySelector('.mkt-avatar__placeholder')?.textContent).toBe('A');
  });

  it('applies size, color, variant', () => {
    const el = Avatar({ size: 'lg', color: 'red', variant: 'filled' });
    expect(el.dataset.size).toBe('lg');
    expect(el.dataset.color).toBe('red');
    expect(el.dataset.variant).toBe('filled');
  });

  it('renders image when src provided', () => {
    const el = Avatar({ src: 'https://example.com/photo.jpg', alt: 'Photo' });
    const img = el.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toBe('https://example.com/photo.jpg');
  });

  it('has role=img and aria-label', () => {
    const el = Avatar({ name: 'Alice' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Alice');
  });
});

describe('AvatarGroup', () => {
  it('renders children with spacing', () => {
    const el = AvatarGroup({
      spacing: 'md',
      children: [Avatar({ name: 'A B' }), Avatar({ name: 'C D' })],
    });
    expect(el.classList.contains('mkt-avatar-group')).toBe(true);
    expect(el.dataset.spacing).toBe('md');
    expect(el.children.length).toBe(2);
  });
});

// ── Pagination ────────────────────────────────────
describe('Pagination', () => {
  it('renders nav with aria-label', () => {
    const el = Pagination({ total: 10 });
    expect(el.tagName).toBe('NAV');
    expect(el.getAttribute('aria-label')).toBe('Pagination');
  });

  it('renders correct number of page buttons', () => {
    const el = Pagination({ total: 5 });
    // prev + 5 pages + next = 7 buttons
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(7);
  });

  it('marks active page with aria-current', () => {
    const el = Pagination({ total: 5, defaultValue: 3 });
    const active = el.querySelector('[aria-current="page"]');
    expect(active?.textContent).toBe('3');
  });

  it('disables prev on first page', () => {
    const el = Pagination({ total: 5, defaultValue: 1 });
    const prev = el.querySelectorAll('button')[0] as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('fires onChange on page click', () => {
    const onChange = vi.fn();
    const el = Pagination({ total: 5, onChange });
    const buttons = el.querySelectorAll('button');
    // Click page 3 (index: prev=0, 1=1, 2=2, 3=3)
    (buttons[3] as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

// ── SegmentedControl ──────────────────────────────
describe('SegmentedControl', () => {
  it('renders radio inputs', () => {
    const el = SegmentedControl({ data: ['A', 'B', 'C'] });
    const inputs = el.querySelectorAll('input[type="radio"]');
    expect(inputs.length).toBe(3);
  });

  it('has radiogroup role', () => {
    const el = SegmentedControl({ data: ['A', 'B'] });
    expect(el.getAttribute('role')).toBe('radiogroup');
  });

  it('checks default value', () => {
    const el = SegmentedControl({ data: ['A', 'B', 'C'], defaultValue: 'B' });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].checked).toBe(false);
    expect(inputs[1].checked).toBe(true);
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    const el = SegmentedControl({ data: ['A', 'B'], onChange });
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('applies full width class', () => {
    const el = SegmentedControl({ data: ['A', 'B'], fullWidth: true });
    expect(el.classList.contains('mkt-segmented-control--full-width')).toBe(true);
  });

  it('writes --mkt-sc-count and --mkt-sc-index on the wrapper', () => {
    const el = SegmentedControl({ data: ['A', 'B', 'C'], defaultValue: 'B' });
    expect(el.style.getPropertyValue('--mkt-sc-count')).toBe('3');
    expect(el.style.getPropertyValue('--mkt-sc-index')).toBe('1');
  });

  it('updates --mkt-sc-index on change without measuring layout', () => {
    const el = SegmentedControl({ data: ['A', 'B', 'C'] });
    expect(el.style.getPropertyValue('--mkt-sc-index')).toBe('0');
    const inputs = el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs[2].checked = true;
    inputs[2].dispatchEvent(new Event('change'));
    expect(el.style.getPropertyValue('--mkt-sc-index')).toBe('2');
  });
});

// ── Breadcrumb ────────────────────────────────────
describe('Breadcrumb', () => {
  it('renders nav with aria-label', () => {
    const el = Breadcrumb({
      items: [{ label: 'Home' }, { label: 'Page' }],
    });
    expect(el.tagName).toBe('NAV');
    expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders items with separators', () => {
    const el = Breadcrumb({
      items: [{ label: 'Home' }, { label: 'Docs' }, { label: 'API' }],
    });
    const separators = el.querySelectorAll('.mkt-breadcrumb__separator');
    expect(separators.length).toBe(2);
    expect(separators[0].textContent).toBe('/');
  });

  it('marks last item as current page', () => {
    const el = Breadcrumb({
      items: [{ label: 'Home', href: '#' }, { label: 'Current' }],
    });
    const items = el.querySelectorAll('.mkt-breadcrumb__item');
    expect(items[1].getAttribute('aria-current')).toBe('page');
  });

  it('renders links for items with href', () => {
    const el = Breadcrumb({
      items: [{ label: 'Home', href: '/home' }, { label: 'Here' }],
    });
    const link = el.querySelector('a');
    expect(link?.href).toContain('/home');
  });

  it('uses custom separator', () => {
    const el = Breadcrumb({
      items: [{ label: 'A' }, { label: 'B' }],
      separator: '>',
    });
    expect(el.querySelector('.mkt-breadcrumb__separator')?.textContent).toBe('>');
  });
});

// ── NavLink ───────────────────────────────────────
describe('NavLink', () => {
  it('renders button by default', () => {
    const el = NavLink({ label: 'Home' });
    expect(el.tagName).toBe('BUTTON');
    expect(el.querySelector('.mkt-navlink__label')?.textContent).toBe('Home');
  });

  it('renders anchor when href provided', () => {
    const el = NavLink({ label: 'Link', href: '/page' });
    expect(el.tagName).toBe('A');
  });

  it('applies active class', () => {
    const el = NavLink({ label: 'Active', active: true });
    expect(el.classList.contains('mkt-navlink--active')).toBe(true);
  });

  it('renders description', () => {
    const el = NavLink({ label: 'Settings', description: 'Configure app' });
    expect(el.querySelector('.mkt-navlink__description')?.textContent).toBe('Configure app');
  });

  it('renders nested children with chevron', () => {
    const wrapper = NavLink({
      label: 'Parent',
      children: [
        NavLink({ label: 'Child 1' }),
        NavLink({ label: 'Child 2' }),
      ],
    });
    expect(wrapper.querySelector('.mkt-navlink__chevron')).toBeTruthy();
    expect(wrapper.querySelector('.mkt-navlink__children')).toBeTruthy();
    // Children hidden by default
    expect((wrapper.querySelector('.mkt-navlink__children') as HTMLElement).hidden).toBe(true);
  });

  it('toggles children on click', () => {
    const wrapper = NavLink({
      label: 'Parent',
      children: [NavLink({ label: 'Child' })],
    });
    const btn = wrapper.querySelector('.mkt-navlink') as HTMLButtonElement;
    btn.click();
    expect((wrapper.querySelector('.mkt-navlink__children') as HTMLElement).hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });
});

// ── Toast ─────────────────────────────────────────
describe('toast', () => {
  it('shows a toast and appends to body', () => {
    const instance = toast.show({ message: 'Hello' });
    expect(document.body.querySelector('.mkt-toast')).toBeTruthy();
    expect(document.body.querySelector('.mkt-toast__message')?.textContent).toBe('Hello');
    instance.close();
  });

  it('success sets green color', () => {
    const instance = toast.success('Done');
    const toastEl = document.body.querySelector('.mkt-toast');
    expect(toastEl?.getAttribute('data-color')).toBe('green');
    instance.close();
  });

  it('error sets red color', () => {
    const instance = toast.error('Fail');
    const toastEl = document.body.querySelector('.mkt-toast');
    expect(toastEl?.getAttribute('data-color')).toBe('red');
    instance.close();
  });

  it('renders title when provided', () => {
    const instance = toast.show({ message: 'Body', title: 'Title' });
    expect(document.body.querySelector('.mkt-toast__title')?.textContent).toBe('Title');
    instance.close();
  });

  it('closeAll removes all toasts', async () => {
    toast.success('One');
    toast.error('Two');
    toast.info('Three');
    expect(document.body.querySelectorAll('.mkt-toast').length).toBe(3);
    toast.closeAll();
    // After exit animation timeout (200ms)
    await new Promise((r) => setTimeout(r, 250));
    expect(document.body.querySelectorAll('.mkt-toast').length).toBe(0);
  });
});

// ── Autocomplete / MultiSelect keyed reconciliation ───────────
describe('Autocomplete keyed reconciliation', () => {
  it('reuses <li> nodes for options that survive filtering', () => {
    const el = Autocomplete({ data: ['apple', 'banana', 'apricot', 'avocado'] });
    document.body.appendChild(el);
    const input = el.querySelector('input')!;
    const dropdown = el.querySelector('ul')!;

    input.focus();
    input.dispatchEvent(new Event('focus'));
    const firstApple = dropdown.querySelector('li')!;
    expect(firstApple.textContent).toBe('apple');

    // Type "a" - apple/apricot/avocado still present; banana goes away
    input.value = 'a';
    input.dispatchEvent(new Event('input'));

    const applesAfter = Array.from(dropdown.querySelectorAll('li'))
      .find((li) => li.textContent === 'apple')!;
    expect(applesAfter).toBe(firstApple); // same node - reused
  });

  it('removes <li> nodes that no longer match', () => {
    const el = Autocomplete({ data: ['apple', 'banana'] });
    document.body.appendChild(el);
    const input = el.querySelector('input')!;
    const dropdown = el.querySelector('ul')!;

    input.dispatchEvent(new Event('focus'));
    expect(dropdown.querySelectorAll('li').length).toBe(2);

    input.value = 'app';
    input.dispatchEvent(new Event('input'));
    expect(dropdown.querySelectorAll('li').length).toBe(1);
    expect(dropdown.querySelector('li')?.textContent).toBe('apple');
  });
});

describe('MultiSelect keyed reconciliation', () => {
  it('reuses <li> nodes across filter changes', () => {
    const el = MultiSelect({
      data: [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: 'ap', label: 'Apricot' },
      ],
    });
    document.body.appendChild(el);
    const input = el.querySelector('input')!;
    const dropdown = el.querySelector('ul')!;

    input.dispatchEvent(new Event('focus'));
    const appleBefore = Array.from(dropdown.querySelectorAll('li'))
      .find((li) => li.textContent === 'Apple')!;

    input.value = 'ap';
    input.dispatchEvent(new Event('input'));
    const appleAfter = Array.from(dropdown.querySelectorAll('li'))
      .find((li) => li.textContent === 'Apple')!;

    expect(appleAfter).toBe(appleBefore);
  });
});
