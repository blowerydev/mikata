/**
 * Hydration adoption cursor.
 *
 * During `hydrate()` the runtime needs to reuse the DOM nodes the server
 * already produced instead of building fresh ones. The cursor tracks, for
 * each open parent, which child should be claimed by the next
 * `cloneNode` / `createElement` call the compiler emits.
 *
 * Shape:
 *   cursorStack = [{ parent, next }, { parent, next }, ...]
 *
 * `parent` is a DOM node whose children are candidates for adoption;
 * `next` is the index of the next unclaimed child. Pushing a parent
 * while adopting lets nested components descend into their adopted root
 * without colliding with sibling adoption.
 */

interface Frame {
  parent: Node;
  next: number;
}

let hydrating = false;
const stack: Frame[] = [];

export function isHydrating(): boolean {
  return hydrating;
}

/**
 * Begin a hydration pass with `root` (the container the user handed to
 * `hydrate`) as the top-level parent. All `adoptNext` calls until
 * `endHydration()` pop from this parent's children first.
 */
export function beginHydration(root: Node): void {
  hydrating = true;
  stack.length = 0;
  stack.push({ parent: root, next: 0 });
}

export function endHydration(): void {
  hydrating = false;
  stack.length = 0;
}

/**
 * Pop the next child at the current cursor level. Returns `null` if the
 * cursor has run past the end of the current parent's children — callers
 * fall back to creating a fresh node, which happens whenever the client
 * tree renders more nodes than the server produced (e.g. dev-only
 * branches, or client-only effects).
 *
 * Skips text nodes whose data is whitespace — the HTML parser emits
 * those around pretty-printed server output but the compiled client
 * tree rarely contains them.
 */
export function adoptNext(): Node | null {
  if (!hydrating || stack.length === 0) return null;
  const frame = stack[stack.length - 1]!;
  const children = frame.parent.childNodes;
  while (frame.next < children.length) {
    const node = children[frame.next]!;
    frame.next++;
    // Only adopt element / text / comment nodes the compiler actually
    // produces. DocumentType and friends never appear in compiled output.
    const t = node.nodeType;
    if (t === 1 || t === 3 || t === 8) return node;
  }
  return null;
}

/**
 * Push a new cursor frame so subsequent `adoptNext()` calls pull from
 * `parent`'s children. Callers must `popFrame()` once they finish
 * adopting the subtree.
 */
export function pushFrame(parent: Node): void {
  stack.push({ parent, next: 0 });
}

export function popFrame(): void {
  stack.pop();
}

/**
 * Return the current cursor frame's remaining unclaimed children as an
 * array. Used by `_insert` to skip appending when the server already
 * emitted the equivalent nodes — the accessor will drive itself against
 * the existing DOM via `adoptNext()`.
 */
export function peekRemaining(): Node[] {
  if (!hydrating || stack.length === 0) return [];
  const frame = stack[stack.length - 1]!;
  const out: Node[] = [];
  const children = frame.parent.childNodes;
  for (let i = frame.next; i < children.length; i++) {
    out.push(children[i]!);
  }
  return out;
}
