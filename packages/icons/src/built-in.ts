import type { IconNode } from './types';

const defaultAttrs = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

const icon = (...children: [string, Record<string, string | number>][]): IconNode =>
  ['svg', { ...defaultAttrs }, children];

/** X - close / dismiss. */
export const Close: IconNode = icon(
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }]
);

/** Checkmark. */
export const Check: IconNode = icon(['path', { d: 'M20 6 9 17l-5-5' }]);

/** Chevron pointing down. */
export const ChevronDown: IconNode = icon(['path', { d: 'm6 9 6 6 6-6' }]);
/** Chevron pointing up. */
export const ChevronUp: IconNode = icon(['path', { d: 'm18 15-6-6-6 6' }]);
/** Chevron pointing left. */
export const ChevronLeft: IconNode = icon(['path', { d: 'm15 18-6-6 6-6' }]);
/** Chevron pointing right. */
export const ChevronRight: IconNode = icon(['path', { d: 'm9 18 6-6-6-6' }]);

/** Eye - show password / reveal. */
export const Eye: IconNode = icon(
  ['path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }],
  ['circle', { cx: 12, cy: 12, r: 3 }]
);
/** Eye with slash - hide password. */
export const EyeOff: IconNode = icon(
  ['path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }],
  ['path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }],
  ['path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }],
  ['line', { x1: 2, x2: 22, y1: 2, y2: 22 }]
);

/** 5-point star. */
export const Star: IconNode = icon([
  'polygon',
  {
    points:
      '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
  },
]);

/** Magnifying glass. */
export const Search: IconNode = icon(
  ['circle', { cx: 11, cy: 11, r: 8 }],
  ['path', { d: 'm21 21-4.3-4.3' }]
);

/** Info circle. */
export const Info: IconNode = icon(
  ['circle', { cx: 12, cy: 12, r: 10 }],
  ['path', { d: 'M12 16v-4' }],
  ['path', { d: 'M12 8h.01' }]
);
/** Warning triangle with exclamation. */
export const Warning: IconNode = icon(
  ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }],
  ['path', { d: 'M12 9v4' }],
  ['path', { d: 'M12 17h.01' }]
);
/** Circle with an X - error. */
export const ErrorCircle: IconNode = icon(
  ['circle', { cx: 12, cy: 12, r: 10 }],
  ['path', { d: 'm15 9-6 6' }],
  ['path', { d: 'm9 9 6 6' }]
);
/** Circle with a check - success. */
export const CheckCircle: IconNode = icon(
  ['path', { d: 'M21.801 10A10 10 0 1 1 17 3.335' }],
  ['path', { d: 'm9 11 3 3L22 4' }]
);

/** Plus sign. */
export const Plus: IconNode = icon(
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'M12 5v14' }]
);
/** Minus sign. */
export const Minus: IconNode = icon(['path', { d: 'M5 12h14' }]);

/** Pencil - edit. */
export const Edit: IconNode = icon([
  'path',
  {
    d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
  },
]);
/** Trash can - delete. */
export const Trash: IconNode = icon(
  ['path', { d: 'M3 6h18' }],
  ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
  ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]
);

/** User silhouette. */
export const User: IconNode = icon(
  ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }],
  ['circle', { cx: 12, cy: 7, r: 4 }]
);
/** House. */
export const Home: IconNode = icon(
  ['path', { d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }],
  ['polyline', { points: '9 22 9 12 15 12 15 22' }]
);
/** Gear - settings. */
export const Settings: IconNode = icon(
  [
    'path',
    {
      d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    },
  ],
  ['circle', { cx: 12, cy: 12, r: 3 }]
);
/** Three horizontal lines - hamburger menu. */
export const Menu: IconNode = icon(
  ['line', { x1: 4, x2: 20, y1: 12, y2: 12 }],
  ['line', { x1: 4, x2: 20, y1: 6, y2: 6 }],
  ['line', { x1: 4, x2: 20, y1: 18, y2: 18 }]
);
/** Arrow out of a box - external link. */
export const ExternalLink: IconNode = icon(
  ['path', { d: 'M15 3h6v6' }],
  ['path', { d: 'M10 14 21 3' }],
  ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]
);
/** Three vertical dots - kebab menu. */
export const DotsVertical: IconNode = icon(
  ['circle', { cx: 12, cy: 12, r: 1 }],
  ['circle', { cx: 12, cy: 5, r: 1 }],
  ['circle', { cx: 12, cy: 19, r: 1 }]
);
/** Circular arrow - refresh. */
export const Refresh: IconNode = icon(
  ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
  ['path', { d: 'M21 3v5h-5' }],
  ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
  ['path', { d: 'M3 21v-5h5' }]
);
