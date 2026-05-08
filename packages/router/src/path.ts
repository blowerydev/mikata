export function joinPaths(parent: string, child: string): string {
  if (!child || child === '/') return parent || '/';
  if (!parent || parent === '/') {
    return child.startsWith('/') ? child : '/' + child;
  }
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  const segment = child.startsWith('/') ? child : '/' + child;
  return base + segment;
}
