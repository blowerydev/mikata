import { describe, it, expect } from 'vitest';
import { installShim } from '../src/dom-shim';
import { serializeNode } from '../src/serialize';

describe('dom-shim: element basics', () => {
  it('creates an element with attributes, class and style', () => {
    const shim = installShim();
    try {
      const el = shim.document.createElement('div') as unknown as {
        setAttribute(k: string, v: string): void;
        className: string;
        style: { cssText: string };
      };
      el.setAttribute('id', 'root');
      el.className = 'a b';
      el.style.cssText = 'color: red;';
      expect(serializeNode(el as any)).toBe('<div class="a b" style="color: red;" id="root"></div>');
    } finally {
      shim.restore();
    }
  });

  it('appendChild / removeChild / replaceChild maintain parentNode', () => {
    const shim = installShim();
    try {
      const parent = shim.document.createElement('ul');
      const a = shim.document.createElement('li');
      const b = shim.document.createElement('li');
      parent.appendChild(a);
      parent.appendChild(b);
      expect(a.parentNode).toBe(parent);
      parent.removeChild(a);
      expect(a.parentNode).toBeNull();
      expect(parent.childNodes.length).toBe(1);

      const c = shim.document.createElement('li');
      parent.replaceChild(c, b);
      expect(b.parentNode).toBeNull();
      expect(c.parentNode).toBe(parent);
    } finally {
      shim.restore();
    }
  });

  it('insertBefore inserts at the right index and inlines fragments', () => {
    const shim = installShim();
    try {
      const parent = shim.document.createElement('div');
      const a = shim.document.createElement('span');
      const c = shim.document.createElement('span');
      parent.appendChild(a);
      parent.appendChild(c);

      const frag = shim.document.createDocumentFragment();
      const b1 = shim.document.createElement('b');
      const b2 = shim.document.createElement('i');
      frag.appendChild(b1);
      frag.appendChild(b2);
      parent.insertBefore(frag, c);

      expect(parent.childNodes.length).toBe(4);
      expect(parent.childNodes[0]).toBe(a);
      expect(parent.childNodes[1]).toBe(b1);
      expect(parent.childNodes[2]).toBe(b2);
      expect(parent.childNodes[3]).toBe(c);
      expect(frag.childNodes.length).toBe(0);
    } finally {
      shim.restore();
    }
  });
});

describe('dom-shim: template parsing + cloneNode', () => {
  it('parses a simple template and clones deeply', () => {
    const shim = installShim();
    try {
      const tpl = shim.document.createElement('template') as unknown as {
        innerHTML: string;
        content: { firstChild: any };
        firstChild: any;
      };
      tpl.innerHTML = '<div class="row"><span>a</span></div>';

      const first = tpl.content.firstChild;
      expect(first).toBeTruthy();
      expect(first.tagName).toBe('DIV');
      expect(first.className).toBe('row');
      const child = first.firstChild;
      expect(child.tagName).toBe('SPAN');
      expect(child.firstChild.data).toBe('a');

      const clone = first.cloneNode(true);
      // Deep clone: separate identity
      expect(clone).not.toBe(first);
      expect(clone.firstChild).not.toBe(first.firstChild);
      expect(clone.className).toBe('row');
      expect(serializeNode(clone)).toBe('<div class="row"><span>a</span></div>');
    } finally {
      shim.restore();
    }
  });

  it('parses compiler-emitted <!> placeholders as comment nodes but drops them on serialize', () => {
    // The DOM shim must parse `<!>` as a comment so the runtime can use it
    // as an insertion anchor on the server. Serialization, however, strips
    // empty comments: after rendering, the tree looks like
    // `[static, content, <!>, static]` — keeping the `<!>` in the HTML
    // would desync the client's index-based navigation, which walks
    // template-structure (`[static, <!>, static]`).
    const shim = installShim();
    try {
      const tpl = shim.document.createElement('template') as unknown as {
        innerHTML: string;
        content: any;
      };
      tpl.innerHTML = '<p>Count: <!>!</p>';
      const p = tpl.content.firstChild;
      expect(p.childNodes.length).toBe(3);
      expect(p.childNodes[1].nodeType).toBe(8); // Comment
      expect(serializeNode(tpl.content)).toBe('<p>Count: !</p>');
    } finally {
      shim.restore();
    }
  });

  it('handles void elements without a closing tag', () => {
    const shim = installShim();
    try {
      const tpl = shim.document.createElement('template') as unknown as {
        innerHTML: string;
        content: any;
      };
      tpl.innerHTML = '<div><br><input type="text"></div>';
      const out = serializeNode(tpl.content);
      expect(out).toBe('<div><br><input type="text"></div>');
    } finally {
      shim.restore();
    }
  });
});
