import { describe, it, expect } from 'vitest';
import { fireEvent } from '../src/index';

describe('fireEvent.click', () => {
  it('dispatches a real MouseEvent with the actual element as target', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    let seenTarget: EventTarget | null = null;
    let seenType: string | null = null;
    button.addEventListener('click', (e) => {
      seenTarget = e.target;
      seenType = e.constructor.name;
    });
    fireEvent.click(button);
    expect(seenTarget).toBe(button);
    expect(seenType).toBe('MouseEvent');
    button.remove();
  });
});

describe('fireEvent.input', () => {
  it('sets element.value before dispatch and target points at the element', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let seenValue: string | null = null;
    let seenTarget: EventTarget | null = null;
    let seenType: string | null = null;
    input.addEventListener('input', (e) => {
      seenValue = (e.target as HTMLInputElement).value;
      seenTarget = e.target;
      seenType = e.constructor.name;
    });
    fireEvent.input(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
    expect(seenValue).toBe('hello');
    expect(seenTarget).toBe(input);
    expect(seenType).toBe('InputEvent');
    input.remove();
  });
});

describe('fireEvent.change', () => {
  it('dispatches a plain Event (NOT InputEvent) with target = element', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let seenType: string | null = null;
    let seenTarget: EventTarget | null = null;
    input.addEventListener('change', (e) => {
      seenType = e.constructor.name;
      seenTarget = e.target;
    });
    fireEvent.change(input, { target: { value: 'world' } });
    expect(input.value).toBe('world');
    // Real browsers dispatch Event for `change`, never InputEvent.
    expect(seenType).toBe('Event');
    expect(seenTarget).toBe(input);
    input.remove();
  });

  it('updates checkbox `checked` from init.target.checked', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    document.body.appendChild(input);
    fireEvent.change(input, { target: { checked: true } });
    expect(input.checked).toBe(true);
    input.remove();
  });
});

describe('fireEvent.focus', () => {
  it('moves document.activeElement to the focused input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(document.activeElement).not.toBe(input);
    fireEvent.focus(input);
    // Without the .focus() call, dispatching a FocusEvent leaves
    // document.activeElement unchanged - tests would silently miss
    // focus-management bugs. The helper now mirrors browser semantics.
    expect(document.activeElement).toBe(input);
    input.remove();
  });
});

describe('fireEvent.blur', () => {
  it('moves document.activeElement off the blurred input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.blur(input);
    expect(document.activeElement).not.toBe(input);
    input.remove();
  });
});
