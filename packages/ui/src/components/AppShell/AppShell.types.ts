import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type AppShellParts =
  | 'root'
  | 'header'
  | 'footer'
  | 'navbar'
  | 'aside'
  | 'main';

export interface AppShellSection {
  /** Content for this section */
  children: Node;
  /** Width/height in pixels or CSS length (default: 60 for header/footer, 260 for navbar/aside) */
  size?: number | string;
  /** Whether this section is collapsed (hidden while keeping layout reserved = false means removed) */
  collapsed?: boolean;
  /** If true, collapsing hides the space entirely (default). Otherwise keeps the space reserved. */
  collapseRemoves?: boolean;
}

export interface AppShellProps extends MikataBaseProps {
  /** Top bar */
  header?: AppShellSection;
  /** Bottom bar */
  footer?: AppShellSection;
  /** Left sidebar */
  navbar?: AppShellSection;
  /** Right sidebar */
  aside?: AppShellSection;
  /** Main content */
  children: Node;
  /** Optional padding for the main area */
  padding?: number | string;
  classNames?: ClassNamesInput<AppShellParts>;
}
