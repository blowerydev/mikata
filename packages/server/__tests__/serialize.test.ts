import { describe, it, expect } from 'vitest';
import { escapeStateScript, renderStateScript } from '../src/serialize';

describe('escapeStateScript', () => {
  it('escapes < > & and the line/paragraph separators', () => {
    const raw = JSON.stringify({
      html: '</script>',
      comment: '<!-- break out -->',
      amp: 'a & b',
      sep: '\u2028\u2029',
    });
    const safe = escapeStateScript(raw);
    expect(safe).not.toContain('<');
    expect(safe).not.toContain('>');
    expect(safe).not.toContain('&');
    expect(safe).not.toContain('\u2028');
    expect(safe).not.toContain('\u2029');
    expect(safe).toContain('\\u003c');
    expect(safe).toContain('\\u003e');
    expect(safe).toContain('\\u0026');
  });

  it('round-trips back to the same value when parsed as JSON', () => {
    const input = {
      html: '</script>',
      comment: '<!-- break out -->',
      amp: 'a & b',
      sep: '\u2028\u2029',
    };
    const safe = escapeStateScript(JSON.stringify(input));
    // Browsers parse \uXXXX inside script text as the unescaped character,
    // so evaluating the safe JSON in a JS context yields the original value.
    const parsed = JSON.parse(safe);
    expect(parsed).toEqual(input);
  });
});

describe('renderStateScript', () => {
  it('wraps the payload in a <script> tag with a global assignment', () => {
    const script = renderStateScript({ a: 1 });
    expect(script).toBe('<script>window.__MIKATA_STATE__={"a":1}</script>');
  });

  it('honours a custom global name', () => {
    const script = renderStateScript({ a: 1 }, 'MY_STATE');
    expect(script).toBe('<script>window.MY_STATE={"a":1}</script>');
  });

  it('escapes state content so attackers can\'t close the script', () => {
    const script = renderStateScript({ payload: '</script><script>alert(1)</script>' });
    // No literal `</script>` run anywhere in the output — the closing
    // script tag at the end is the only one, and our payload uses \u003c.
    const occurrences = script.match(/<\/script>/gi) ?? [];
    expect(occurrences.length).toBe(1);
  });
});
