/**
 * ICU MessageFormat subset.
 *
 * Supports the forms that cover ~95% of real-world translation strings:
 *   - `{arg}`                            — interpolation
 *   - `{count, number[, style]}`         — Intl.NumberFormat
 *   - `{date, date[, style]}`            — Intl.DateTimeFormat (dateStyle)
 *   - `{when, time[, style]}`            — Intl.DateTimeFormat (timeStyle)
 *   - `{count, plural, one {#} other {# items}}` — CLDR plural rules
 *   - `{gender, select, female {...} male {...} other {...}}`
 *   - `#` inside a plural arm            — the selector, number-formatted
 *
 * Does NOT cover: selectordinal, `offset:`, `'` quote-escape, or rich-text
 * arms. For the full grammar, pass a custom `formatter` in `I18nOptions`
 * (e.g. one built on `intl-messageformat`).
 */

type Ast =
  | { k: 'text'; v: string }
  | { k: 'arg'; name: string }
  | { k: 'fn'; name: string; fn: 'number' | 'date' | 'time'; style: string | undefined }
  | { k: 'plural'; name: string; arms: Record<string, Ast[]> }
  | { k: 'select'; name: string; arms: Record<string, Ast[]> }
  | { k: 'pound' };

const ICU_PROBE = /\{\s*\w+\s*,\s*(?:plural|select|number|date|time)\b/;

/**
 * Cheap check — returns true if the message looks like it contains any
 * ICU tag. Used to skip the parser entirely for plain strings.
 */
export function looksLikeIcu(message: string): boolean {
  return ICU_PROBE.test(message);
}

const astCache = new Map<string, Ast[]>();

export function parseIcu(message: string): Ast[] {
  let cached = astCache.get(message);
  if (!cached) {
    cached = new Parser(message).parseBody();
    astCache.set(message, cached);
  }
  return cached;
}

class Parser {
  private i = 0;
  constructor(private src: string) {}

  parseBody(closer?: string): Ast[] {
    const out: Ast[] = [];
    while (this.i < this.src.length) {
      const ch = this.src[this.i];
      if (closer && ch === closer) break;
      if (ch === '{') {
        this.i++;
        out.push(this.parseArg());
      } else if (ch === '#') {
        out.push({ k: 'pound' });
        this.i++;
      } else {
        let text = '';
        while (this.i < this.src.length) {
          const c = this.src[this.i];
          if (c === '{' || c === '#') break;
          if (closer && c === closer) break;
          text += c;
          this.i++;
        }
        if (text) out.push({ k: 'text', v: text });
      }
    }
    return out;
  }

  private parseArg(): Ast {
    this.skipWs();
    const name = this.readIdent();
    this.skipWs();
    if (this.peek() === '}') {
      this.i++;
      return { k: 'arg', name };
    }
    this.expect(',');
    this.skipWs();
    const type = this.readIdent();
    this.skipWs();
    if (type === 'number' || type === 'date' || type === 'time') {
      let style: string | undefined;
      if (this.peek() === ',') {
        this.i++;
        this.skipWs();
        let s = '';
        while (this.i < this.src.length && this.peek() !== '}') {
          s += this.src[this.i++];
        }
        style = s.trim() || undefined;
      }
      this.expect('}');
      return { k: 'fn', name, fn: type, style };
    }
    if (type === 'plural' || type === 'select') {
      this.expect(',');
      this.skipWs();
      const arms: Record<string, Ast[]> = {};
      while (this.i < this.src.length && this.peek() !== '}') {
        this.skipWs();
        let arm: string;
        if (this.peek() === '=') {
          arm = '=';
          this.i++;
          while (/[0-9]/.test(this.peek() ?? '')) arm += this.src[this.i++];
        } else {
          arm = this.readIdent();
        }
        this.skipWs();
        this.expect('{');
        const body = this.parseBody('}');
        this.expect('}');
        arms[arm] = body;
        this.skipWs();
      }
      this.expect('}');
      return { k: type, name, arms } as Ast;
    }
    throw new Error(
      `[mikata/i18n] Unknown ICU argument type "${type}" in "${this.src}".`
    );
  }

  private peek(): string | undefined {
    return this.src[this.i];
  }

  private readIdent(): string {
    let s = '';
    while (this.i < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.i])) {
      s += this.src[this.i++];
    }
    return s;
  }

  private skipWs(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i])) this.i++;
  }

  private expect(ch: string): void {
    if (this.src[this.i] !== ch) {
      throw new Error(
        `[mikata/i18n] Expected "${ch}" at position ${this.i} in "${this.src}".`
      );
    }
    this.i++;
  }
}

// ─── Formatter caches ─────────────────────────────────────

const numberFmtCache = new Map<string, Intl.NumberFormat>();
const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getNumberFmt(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  let fmt = numberFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, opts);
    numberFmtCache.set(key, fmt);
  }
  return fmt;
}

function getDateFmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, opts);
    dateFmtCache.set(key, fmt);
  }
  return fmt;
}

function getPluralRules(locale: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

function numberOptionsFromStyle(style: string | undefined): Intl.NumberFormatOptions {
  if (!style) return {};
  if (style === 'integer') return { maximumFractionDigits: 0 };
  if (style === 'percent') return { style: 'percent' };
  if (style === 'currency') return { style: 'currency', currency: 'USD' };
  // Minimal ICU number skeleton: `::currency/USD`, `::percent`, `::.00`
  if (style.startsWith('::')) {
    const parts = style.slice(2).trim().split(/\s+/);
    const opts: Intl.NumberFormatOptions = {};
    for (const p of parts) {
      if (p.startsWith('currency/')) {
        opts.style = 'currency';
        opts.currency = p.slice('currency/'.length);
      } else if (p === 'percent') {
        opts.style = 'percent';
      } else if (/^\.0+$/.test(p)) {
        const n = p.length - 1;
        opts.minimumFractionDigits = n;
        opts.maximumFractionDigits = n;
      }
    }
    return opts;
  }
  return {};
}

function dateOptionsFromStyle(
  style: string | undefined,
  kind: 'date' | 'time'
): Intl.DateTimeFormatOptions {
  const key = kind === 'date' ? 'dateStyle' : 'timeStyle';
  if (!style) return kind === 'date' ? { dateStyle: 'medium' } : { timeStyle: 'medium' };
  if (style === 'short' || style === 'medium' || style === 'long' || style === 'full') {
    return { [key]: style } as Intl.DateTimeFormatOptions;
  }
  return {};
}

export function formatIcu(
  message: string,
  params: Record<string, unknown>,
  locale: string
): string {
  const ast = parseIcu(message);
  return render(ast, params, locale, undefined);
}

function render(
  ast: Ast[],
  params: Record<string, unknown>,
  locale: string,
  poundValue: number | undefined
): string {
  let out = '';
  for (const node of ast) {
    switch (node.k) {
      case 'text':
        out += node.v;
        break;
      case 'arg': {
        const v = params[node.name];
        out += v == null ? `{${node.name}}` : String(v);
        break;
      }
      case 'pound':
        out +=
          poundValue !== undefined
            ? getNumberFmt(locale, {}).format(poundValue)
            : '#';
        break;
      case 'fn': {
        const v = params[node.name];
        if (v == null) {
          out += `{${node.name}}`;
          break;
        }
        if (node.fn === 'number') {
          out += getNumberFmt(locale, numberOptionsFromStyle(node.style)).format(
            Number(v)
          );
        } else {
          const date = v instanceof Date ? v : new Date(v as number | string);
          out += getDateFmt(locale, dateOptionsFromStyle(node.style, node.fn)).format(
            date
          );
        }
        break;
      }
      case 'plural': {
        const count = Number(params[node.name]);
        const exact = node.arms[`=${count}`];
        const arm =
          exact ?? node.arms[getPluralRules(locale).select(count)] ?? node.arms.other;
        if (arm) out += render(arm, params, locale, count);
        break;
      }
      case 'select': {
        const v = String(params[node.name]);
        const arm = node.arms[v] ?? node.arms.other;
        if (arm) out += render(arm, params, locale, poundValue);
        break;
      }
    }
  }
  return out;
}
