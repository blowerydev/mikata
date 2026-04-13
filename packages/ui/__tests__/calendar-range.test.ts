import { describe, it, expect, beforeEach } from 'vitest';
import { flushSync } from '@mikata/reactivity';
import { Calendar } from '../src/components/Calendar/Calendar';
import { DatePicker } from '../src/components/DatePicker/DatePicker';

describe('Calendar range selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('selects end date even after hovering between clicks', () => {
    const changes: Array<[Date | null, Date | null]> = [];
    const cal = Calendar({
      type: 'range',
      date: new Date(2026, 0, 1),
      onChange: (v) => changes.push(v as [Date | null, Date | null]),
    });
    document.body.appendChild(cal);
    flushSync();

    const getDay = (n: number) =>
      cal.querySelector<HTMLButtonElement>(`.mkt-calendar__day[data-date="2026-0-${n}"]`);

    getDay(10)!.click();
    flushSync();
    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), null]);

    // Simulate hover moving across days before clicking end
    for (const n of [11, 12, 13, 14, 15]) {
      getDay(n)!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      flushSync();
      getDay(n)!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      flushSync();
    }

    const d15 = getDay(15)!;
    d15.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    flushSync();
    d15.click();
    flushSync();

    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), new Date(2026, 0, 15)]);
  });

  it('selects start then end on successive clicks', () => {
    const changes: Array<[Date | null, Date | null]> = [];
    const cal = Calendar({
      type: 'range',
      date: new Date(2026, 0, 1),
      onChange: (v) => changes.push(v as [Date | null, Date | null]),
    });
    document.body.appendChild(cal);
    flushSync();

    const getDay = (n: number) =>
      cal.querySelector<HTMLButtonElement>(`.mkt-calendar__day[data-date="2026-0-${n}"]`);

    const d10 = getDay(10)!;
    expect(d10).toBeTruthy();
    d10.click();
    flushSync();

    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), null]);
    expect(getDay(10)?.dataset.selected).toBe('');

    const d15 = getDay(15)!;
    expect(d15).toBeTruthy();
    d15.click();
    flushSync();

    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), new Date(2026, 0, 15)]);
    expect(getDay(10)?.dataset.selected).toBe('');
    expect(getDay(15)?.dataset.selected).toBe('');
    expect(getDay(12)?.dataset.inRange).toBe('');
  });
});

describe('DatePicker range selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('selects start then end on successive clicks', () => {
    const changes: Array<[Date | null, Date | null]> = [];
    const dp = DatePicker({
      type: 'range',
      date: new Date(2026, 0, 1),
      onChange: (v) => changes.push(v as [Date | null, Date | null]),
    });
    document.body.appendChild(dp);
    flushSync();

    const getDay = (n: number) =>
      dp.querySelector<HTMLButtonElement>(`.mkt-calendar__day[data-date="2026-0-${n}"]`);

    getDay(10)!.click();
    flushSync();
    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), null]);
    expect(getDay(10)?.dataset.selected).toBe('');

    getDay(15)!.click();
    flushSync();
    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), new Date(2026, 0, 15)]);
    expect(getDay(10)?.dataset.selected).toBe('');
    expect(getDay(15)?.dataset.selected).toBe('');
  });

  it('keeps end selection after hover churn between clicks', () => {
    const changes: Array<[Date | null, Date | null]> = [];
    const dp = DatePicker({
      type: 'range',
      date: new Date(2026, 0, 1),
      onChange: (v) => changes.push(v as [Date | null, Date | null]),
    });
    document.body.appendChild(dp);
    flushSync();

    const getDay = (n: number) =>
      dp.querySelector<HTMLButtonElement>(`.mkt-calendar__day[data-date="2026-0-${n}"]`);

    getDay(10)!.click();
    flushSync();

    for (const n of [11, 12, 13, 14]) {
      getDay(n)!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      flushSync();
      getDay(n)!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      flushSync();
    }

    getDay(15)!.click();
    flushSync();
    expect(changes.at(-1)).toEqual([new Date(2026, 0, 10), new Date(2026, 0, 15)]);
  });
});
