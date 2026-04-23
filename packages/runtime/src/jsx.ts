/**
 * JSX type definitions for Mikata.
 *
 * Provides IntrinsicElements, event types, and attribute interfaces
 * so that TypeScript catches invalid props, offers autocomplete, and
 * enforces correct event handler signatures in JSX.
 */

import type { Ref } from './component';

// ---------------------------------------------------------------------------
// Event handler types
// ---------------------------------------------------------------------------

/**
 * Event handler type with a narrowed `currentTarget`. The DOM typings widen
 * `currentTarget` to `EventTarget | null`; in JSX we know statically which
 * element the handler is attached to, so we re-narrow it to `T` to avoid
 * repetitive `(e.target as HTMLInputElement).value` casts.
 *
 * `target` stays `EventTarget` since bubbled events (e.g. onClick on a
 * parent) can originate from arbitrary descendants.
 */
type EventHandler<
  E extends Event = Event,
  T extends EventTarget = EventTarget
> = (event: E & { readonly currentTarget: T }) => void;

export interface DOMEventHandlers<T extends EventTarget = Element> {
  // Mouse events
  onClick?: EventHandler<MouseEvent, T>;
  onDblClick?: EventHandler<MouseEvent, T>;
  onMouseDown?: EventHandler<MouseEvent, T>;
  onMouseUp?: EventHandler<MouseEvent, T>;
  onMouseMove?: EventHandler<MouseEvent, T>;
  onMouseEnter?: EventHandler<MouseEvent, T>;
  onMouseLeave?: EventHandler<MouseEvent, T>;
  onMouseOver?: EventHandler<MouseEvent, T>;
  onMouseOut?: EventHandler<MouseEvent, T>;
  onContextMenu?: EventHandler<MouseEvent, T>;

  // Keyboard events
  onKeyDown?: EventHandler<KeyboardEvent, T>;
  onKeyUp?: EventHandler<KeyboardEvent, T>;
  onKeyPress?: EventHandler<KeyboardEvent, T>;

  // Focus events
  onFocus?: EventHandler<FocusEvent, T>;
  onBlur?: EventHandler<FocusEvent, T>;
  onFocusIn?: EventHandler<FocusEvent, T>;
  onFocusOut?: EventHandler<FocusEvent, T>;

  // Form events
  onInput?: EventHandler<InputEvent, T>;
  onChange?: EventHandler<Event, T>;
  onSubmit?: EventHandler<SubmitEvent, T>;
  onReset?: EventHandler<Event, T>;
  onInvalid?: EventHandler<Event, T>;
  onBeforeInput?: EventHandler<InputEvent, T>;

  // Touch events
  onTouchStart?: EventHandler<TouchEvent, T>;
  onTouchEnd?: EventHandler<TouchEvent, T>;
  onTouchMove?: EventHandler<TouchEvent, T>;
  onTouchCancel?: EventHandler<TouchEvent, T>;

  // Pointer events
  onPointerDown?: EventHandler<PointerEvent, T>;
  onPointerUp?: EventHandler<PointerEvent, T>;
  onPointerMove?: EventHandler<PointerEvent, T>;
  onPointerEnter?: EventHandler<PointerEvent, T>;
  onPointerLeave?: EventHandler<PointerEvent, T>;
  onPointerOver?: EventHandler<PointerEvent, T>;
  onPointerOut?: EventHandler<PointerEvent, T>;
  onPointerCancel?: EventHandler<PointerEvent, T>;
  onGotPointerCapture?: EventHandler<PointerEvent, T>;
  onLostPointerCapture?: EventHandler<PointerEvent, T>;

  // Drag events
  onDrag?: EventHandler<DragEvent, T>;
  onDragStart?: EventHandler<DragEvent, T>;
  onDragEnd?: EventHandler<DragEvent, T>;
  onDragEnter?: EventHandler<DragEvent, T>;
  onDragLeave?: EventHandler<DragEvent, T>;
  onDragOver?: EventHandler<DragEvent, T>;
  onDrop?: EventHandler<DragEvent, T>;

  // Wheel / scroll
  onWheel?: EventHandler<WheelEvent, T>;
  onScroll?: EventHandler<Event, T>;
  onScrollEnd?: EventHandler<Event, T>;

  // Animation / transition
  onAnimationStart?: EventHandler<AnimationEvent, T>;
  onAnimationEnd?: EventHandler<AnimationEvent, T>;
  onAnimationIteration?: EventHandler<AnimationEvent, T>;
  onTransitionStart?: EventHandler<TransitionEvent, T>;
  onTransitionEnd?: EventHandler<TransitionEvent, T>;
  onTransitionRun?: EventHandler<TransitionEvent, T>;
  onTransitionCancel?: EventHandler<TransitionEvent, T>;

  // Clipboard
  onCopy?: EventHandler<ClipboardEvent, T>;
  onCut?: EventHandler<ClipboardEvent, T>;
  onPaste?: EventHandler<ClipboardEvent, T>;

  // Composition
  onCompositionStart?: EventHandler<CompositionEvent, T>;
  onCompositionEnd?: EventHandler<CompositionEvent, T>;
  onCompositionUpdate?: EventHandler<CompositionEvent, T>;

  // Selection
  onSelect?: EventHandler<Event, T>;

  // Media events
  onLoad?: EventHandler<Event, T>;
  onError?: EventHandler<Event | ErrorEvent, T>;
  onAbort?: EventHandler<Event, T>;

}

// ---------------------------------------------------------------------------
// Class and style types (Mikata-specific)
// ---------------------------------------------------------------------------

type ClassValue =
  | string
  | Record<string, boolean | undefined | null>
  | ClassValue[]
  | false
  | null
  | undefined;

type StyleValue =
  | string
  | Record<string, string | number | false | null | undefined>
  | undefined;

// ---------------------------------------------------------------------------
// ARIA attributes
// ---------------------------------------------------------------------------

export interface AriaAttributes {
  role?: string;
  'aria-activedescendant'?: string;
  'aria-atomic'?: boolean | 'true' | 'false';
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-busy'?: boolean | 'true' | 'false';
  'aria-checked'?: boolean | 'true' | 'false' | 'mixed';
  'aria-colcount'?: number;
  'aria-colindex'?: number;
  'aria-colspan'?: number;
  'aria-controls'?: string;
  'aria-current'?: boolean | 'true' | 'false' | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-describedby'?: string;
  'aria-details'?: string;
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
  'aria-errormessage'?: string;
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-flowto'?: string;
  'aria-grabbed'?: boolean | 'true' | 'false';
  'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  'aria-keyshortcuts'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-level'?: number;
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-modal'?: boolean | 'true' | 'false';
  'aria-multiline'?: boolean | 'true' | 'false';
  'aria-multiselectable'?: boolean | 'true' | 'false';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-owns'?: string;
  'aria-placeholder'?: string;
  'aria-posinset'?: number;
  'aria-pressed'?: boolean | 'true' | 'false' | 'mixed';
  'aria-readonly'?: boolean | 'true' | 'false';
  'aria-relevant'?: 'additions' | 'all' | 'removals' | 'text' | 'additions text';
  'aria-required'?: boolean | 'true' | 'false';
  'aria-roledescription'?: string;
  'aria-rowcount'?: number;
  'aria-rowindex'?: number;
  'aria-rowspan'?: number;
  'aria-selected'?: boolean | 'true' | 'false';
  'aria-setsize'?: number;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
}

// ---------------------------------------------------------------------------
// HTML attributes
// ---------------------------------------------------------------------------

/**
 * Common HTML attributes shared by all elements.
 */
export interface HTMLAttributes<T extends HTMLElement = HTMLElement>
  extends AriaAttributes,
    DOMEventHandlers<T> {
  // Mikata-specific
  ref?: Ref<T> | ((el: T) => void);
  class?: ClassValue;
  style?: StyleValue;

  // Also accept className as alias
  className?: ClassValue;

  // Global HTML attributes
  accessKey?: string;
  autoCapitalize?: string;
  autoFocus?: boolean;
  contentEditable?: boolean | 'true' | 'false' | 'inherit' | 'plaintext-only';
  dir?: 'ltr' | 'rtl' | 'auto';
  draggable?: boolean | 'true' | 'false';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  hidden?: boolean | 'hidden' | 'until-found' | '';
  id?: string;
  inert?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  is?: string;
  itemId?: string;
  itemProp?: string;
  itemRef?: string;
  itemScope?: boolean;
  itemType?: string;
  lang?: string;
  nonce?: string;
  part?: string;
  popover?: 'auto' | 'manual' | '';
  slot?: string;
  spellcheck?: boolean | 'true' | 'false';
  tabIndex?: number;
  title?: string;
  translate?: 'yes' | 'no';

  // data-* attributes
  [key: `data-${string}`]: string | number | boolean | undefined;

  // Escape hatch for direct DOM property / attribute setting
  innerHTML?: string;
  textContent?: string;

  // Generic children slot. The compiler accepts any value as a JSX
  // child (Node, string, number, array, function accessor, nullish);
  // the type needs to be permissive enough to cover all shapes that
  // survive through `_insert`.
  children?: unknown;
}

// ---------------------------------------------------------------------------
// Element-specific attribute interfaces
// ---------------------------------------------------------------------------

export interface AnchorHTMLAttributes extends HTMLAttributes<HTMLAnchorElement> {
  download?: string | boolean;
  href?: string;
  hrefLang?: string;
  media?: string;
  ping?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  target?: '_self' | '_blank' | '_parent' | '_top' | (string & {});
  type?: string;
}

export interface AreaHTMLAttributes extends HTMLAttributes<HTMLAreaElement> {
  alt?: string;
  coords?: string;
  download?: string | boolean;
  href?: string;
  hrefLang?: string;
  media?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  shape?: 'rect' | 'circle' | 'poly' | 'default';
  target?: string;
}

export interface AudioHTMLAttributes extends HTMLAttributes<HTMLAudioElement> {
  autoPlay?: boolean;
  controls?: boolean;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  loop?: boolean;
  muted?: boolean;
  preload?: 'none' | 'metadata' | 'auto' | '';
  src?: string;
}

export interface BaseHTMLAttributes extends HTMLAttributes<HTMLBaseElement> {
  href?: string;
  target?: string;
}

export interface BlockquoteHTMLAttributes extends HTMLAttributes<HTMLQuoteElement> {
  cite?: string;
}

export interface ButtonHTMLAttributes extends HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  name?: string;
  popoverTarget?: string;
  popoverTargetAction?: 'hide' | 'show' | 'toggle';
  type?: 'submit' | 'reset' | 'button';
  value?: string | number | readonly string[];
}

export interface CanvasHTMLAttributes extends HTMLAttributes<HTMLCanvasElement> {
  height?: number | string;
  width?: number | string;
}

export interface ColHTMLAttributes extends HTMLAttributes<HTMLTableColElement> {
  span?: number;
  width?: number | string;
}

export interface ColgroupHTMLAttributes extends HTMLAttributes<HTMLTableColElement> {
  span?: number;
}

export interface DataHTMLAttributes extends HTMLAttributes<HTMLDataElement> {
  value?: string | number | readonly string[];
}

export interface DetailsHTMLAttributes extends HTMLAttributes<HTMLDetailsElement> {
  open?: boolean;
  name?: string;
}

export interface DelHTMLAttributes extends HTMLAttributes<HTMLModElement> {
  cite?: string;
  dateTime?: string;
}

export interface DialogHTMLAttributes extends HTMLAttributes<HTMLDialogElement> {
  open?: boolean;
}

export interface EmbedHTMLAttributes extends HTMLAttributes<HTMLEmbedElement> {
  height?: number | string;
  src?: string;
  type?: string;
  width?: number | string;
}

export interface FieldsetHTMLAttributes extends HTMLAttributes<HTMLFieldSetElement> {
  disabled?: boolean;
  form?: string;
  name?: string;
}

export interface FormHTMLAttributes extends HTMLAttributes<HTMLFormElement> {
  acceptCharset?: string;
  action?: string;
  autoComplete?: string;
  encType?: string;
  method?: 'get' | 'post' | 'dialog';
  name?: string;
  noValidate?: boolean;
  target?: string;
  rel?: string;
}

export interface HtmlHTMLAttributes extends HTMLAttributes<HTMLHtmlElement> {
  manifest?: string;
}

export interface IframeHTMLAttributes extends HTMLAttributes<HTMLIFrameElement> {
  allow?: string;
  allowFullScreen?: boolean;
  height?: number | string;
  loading?: 'eager' | 'lazy';
  name?: string;
  referrerPolicy?: ReferrerPolicy;
  sandbox?: string;
  src?: string;
  srcDoc?: string;
  width?: number | string;
}

export interface ImgHTMLAttributes extends HTMLAttributes<HTMLImageElement> {
  alt?: string;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  decoding?: 'async' | 'auto' | 'sync';
  fetchPriority?: 'high' | 'low' | 'auto';
  height?: number | string;
  loading?: 'eager' | 'lazy';
  referrerPolicy?: ReferrerPolicy;
  sizes?: string;
  src?: string;
  srcSet?: string;
  useMap?: string;
  width?: number | string;
}

export interface InputHTMLAttributes extends HTMLAttributes<HTMLInputElement> {
  accept?: string;
  alt?: string;
  autoComplete?: string;
  capture?: boolean | 'user' | 'environment';
  checked?: boolean;
  defaultChecked?: boolean;
  defaultValue?: string | number | readonly string[];
  disabled?: boolean;
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  height?: number | string;
  list?: string;
  max?: number | string;
  maxLength?: number;
  min?: number | string;
  minLength?: number;
  multiple?: boolean;
  name?: string;
  pattern?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  size?: number;
  src?: string;
  step?: number | string;
  type?:
    | 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local'
    | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number'
    | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit'
    | 'tel' | 'text' | 'time' | 'url' | 'week';
  value?: string | number | readonly string[];
  width?: number | string;
}

export interface InsHTMLAttributes extends HTMLAttributes<HTMLModElement> {
  cite?: string;
  dateTime?: string;
}

export interface LabelHTMLAttributes extends HTMLAttributes<HTMLLabelElement> {
  for?: string;
  htmlFor?: string;
  form?: string;
}

export interface LiHTMLAttributes extends HTMLAttributes<HTMLLIElement> {
  value?: number;
}

export interface LinkHTMLAttributes extends HTMLAttributes<HTMLLinkElement> {
  as?: string;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  disabled?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  href?: string;
  hrefLang?: string;
  integrity?: string;
  media?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  sizes?: string;
  type?: string;
}

export interface MapHTMLAttributes extends HTMLAttributes<HTMLMapElement> {
  name?: string;
}

export interface MenuHTMLAttributes extends HTMLAttributes<HTMLMenuElement> {
  type?: string;
}

export interface MetaHTMLAttributes extends HTMLAttributes<HTMLMetaElement> {
  charSet?: string;
  content?: string;
  httpEquiv?: string;
  media?: string;
  name?: string;
}

export interface MeterHTMLAttributes extends HTMLAttributes<HTMLMeterElement> {
  form?: string;
  high?: number;
  low?: number;
  max?: number | string;
  min?: number | string;
  optimum?: number;
  value?: number | string | readonly string[];
}

export interface ObjectHTMLAttributes extends HTMLAttributes<HTMLObjectElement> {
  data?: string;
  form?: string;
  height?: number | string;
  name?: string;
  type?: string;
  useMap?: string;
  width?: number | string;
}

export interface OlHTMLAttributes extends HTMLAttributes<HTMLOListElement> {
  reversed?: boolean;
  start?: number;
  type?: '1' | 'a' | 'A' | 'i' | 'I';
}

export interface OptgroupHTMLAttributes extends HTMLAttributes<HTMLOptGroupElement> {
  disabled?: boolean;
  label?: string;
}

export interface OptionHTMLAttributes extends HTMLAttributes<HTMLOptionElement> {
  disabled?: boolean;
  label?: string;
  selected?: boolean;
  value?: string | number | readonly string[];
}

export interface OutputHTMLAttributes extends HTMLAttributes<HTMLOutputElement> {
  for?: string;
  htmlFor?: string;
  form?: string;
  name?: string;
}

export interface ParamHTMLAttributes extends HTMLAttributes<HTMLElement> {
  name?: string;
  value?: string | number | readonly string[];
}

export interface ProgressHTMLAttributes extends HTMLAttributes<HTMLProgressElement> {
  max?: number | string;
  value?: number | string | readonly string[];
}

export interface QuoteHTMLAttributes extends HTMLAttributes<HTMLQuoteElement> {
  cite?: string;
}

export interface ScriptHTMLAttributes extends HTMLAttributes<HTMLScriptElement> {
  async?: boolean;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  defer?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  integrity?: string;
  noModule?: boolean;
  nonce?: string;
  referrerPolicy?: ReferrerPolicy;
  src?: string;
  type?: string;
}

export interface SelectHTMLAttributes extends HTMLAttributes<HTMLSelectElement> {
  autoComplete?: string;
  disabled?: boolean;
  form?: string;
  multiple?: boolean;
  name?: string;
  required?: boolean;
  size?: number;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
}

export interface SlotHTMLAttributes extends HTMLAttributes<HTMLSlotElement> {
  name?: string;
}

export interface SourceHTMLAttributes extends HTMLAttributes<HTMLSourceElement> {
  height?: number | string;
  media?: string;
  sizes?: string;
  src?: string;
  srcSet?: string;
  type?: string;
  width?: number | string;
}

export interface StyleHTMLAttributes extends HTMLAttributes<HTMLStyleElement> {
  media?: string;
  nonce?: string;
  scoped?: boolean;
}

export interface TableHTMLAttributes extends HTMLAttributes<HTMLTableElement> {
  align?: 'left' | 'center' | 'right';
  cellPadding?: number | string;
  cellSpacing?: number | string;
  summary?: string;
  width?: number | string;
}

export interface TdHTMLAttributes extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char';
  colSpan?: number;
  headers?: string;
  rowSpan?: number;
  scope?: string;
  abbr?: string;
  height?: number | string;
  width?: number | string;
  valign?: 'top' | 'middle' | 'bottom' | 'baseline';
}

export interface TextareaHTMLAttributes extends HTMLAttributes<HTMLTextAreaElement> {
  autoComplete?: string;
  cols?: number;
  defaultValue?: string;
  dirName?: string;
  disabled?: boolean;
  form?: string;
  maxLength?: number;
  minLength?: number;
  name?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  rows?: number;
  value?: string;
  wrap?: 'hard' | 'soft' | 'off';
}

export interface ThHTMLAttributes extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char';
  colSpan?: number;
  headers?: string;
  rowSpan?: number;
  scope?: 'col' | 'row' | 'rowgroup' | 'colgroup';
  abbr?: string;
}

export interface TimeHTMLAttributes extends HTMLAttributes<HTMLTimeElement> {
  dateTime?: string;
}

export interface TrackHTMLAttributes extends HTMLAttributes<HTMLTrackElement> {
  default?: boolean;
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  label?: string;
  src?: string;
  srcLang?: string;
}

export interface VideoHTMLAttributes extends HTMLAttributes<HTMLVideoElement> {
  autoPlay?: boolean;
  controls?: boolean;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  disablePictureInPicture?: boolean;
  disableRemotePlayback?: boolean;
  height?: number | string;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  poster?: string;
  preload?: 'none' | 'metadata' | 'auto' | '';
  src?: string;
  width?: number | string;
}

// ---------------------------------------------------------------------------
// SVG attributes (basic)
// ---------------------------------------------------------------------------

export interface SVGAttributes extends AriaAttributes, DOMEventHandlers<SVGElement> {
  // Mikata-specific
  ref?: Ref<SVGElement> | ((el: SVGElement) => void);
  class?: ClassValue;
  style?: StyleValue;
  className?: ClassValue;
  id?: string;
  tabIndex?: number;
  lang?: string;

  // data-* attributes
  [key: `data-${string}`]: string | number | boolean | undefined;

  // SVG-specific attributes
  viewBox?: string;
  xmlns?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeDasharray?: string | number;
  strokeDashoffset?: string | number;
  opacity?: number | string;
  transform?: string;
  d?: string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  x?: number | string;
  y?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  width?: number | string;
  height?: number | string;
  points?: string;
  pathLength?: number | string;
  clipPath?: string;
  clipRule?: 'nonzero' | 'evenodd' | 'inherit';
  fillRule?: 'nonzero' | 'evenodd' | 'inherit';
  fillOpacity?: number | string;
  strokeOpacity?: number | string;
  dominantBaseline?: string;
  textAnchor?: string;
  xlinkHref?: string;
}

// ---------------------------------------------------------------------------
// JSX namespace - this is what TypeScript resolves for JSX expressions
// ---------------------------------------------------------------------------

export namespace JSX {
  export type Element = Node;

  export interface ElementChildrenAttribute {
    children: {};
  }

  export interface IntrinsicElements {
    // Main root
    html: HtmlHTMLAttributes;

    // Document metadata
    base: BaseHTMLAttributes;
    head: HTMLAttributes<HTMLHeadElement>;
    link: LinkHTMLAttributes;
    meta: MetaHTMLAttributes;
    style: StyleHTMLAttributes;
    title: HTMLAttributes<HTMLTitleElement>;

    // Sectioning root
    body: HTMLAttributes<HTMLBodyElement>;

    // Content sectioning
    address: HTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    footer: HTMLAttributes;
    header: HTMLAttributes;
    h1: HTMLAttributes<HTMLHeadingElement>;
    h2: HTMLAttributes<HTMLHeadingElement>;
    h3: HTMLAttributes<HTMLHeadingElement>;
    h4: HTMLAttributes<HTMLHeadingElement>;
    h5: HTMLAttributes<HTMLHeadingElement>;
    h6: HTMLAttributes<HTMLHeadingElement>;
    hgroup: HTMLAttributes;
    main: HTMLAttributes;
    nav: HTMLAttributes;
    section: HTMLAttributes;
    search: HTMLAttributes;

    // Text content
    blockquote: BlockquoteHTMLAttributes;
    dd: HTMLAttributes;
    div: HTMLAttributes<HTMLDivElement>;
    dl: HTMLAttributes<HTMLDListElement>;
    dt: HTMLAttributes;
    figcaption: HTMLAttributes;
    figure: HTMLAttributes;
    hr: HTMLAttributes<HTMLHRElement>;
    li: LiHTMLAttributes;
    menu: MenuHTMLAttributes;
    ol: OlHTMLAttributes;
    p: HTMLAttributes<HTMLParagraphElement>;
    pre: HTMLAttributes<HTMLPreElement>;
    ul: HTMLAttributes<HTMLUListElement>;

    // Inline text semantics
    a: AnchorHTMLAttributes;
    abbr: HTMLAttributes;
    b: HTMLAttributes;
    bdi: HTMLAttributes;
    bdo: HTMLAttributes;
    br: HTMLAttributes<HTMLBRElement>;
    cite: HTMLAttributes;
    code: HTMLAttributes;
    data: DataHTMLAttributes;
    dfn: HTMLAttributes;
    em: HTMLAttributes;
    i: HTMLAttributes;
    kbd: HTMLAttributes;
    mark: HTMLAttributes;
    q: QuoteHTMLAttributes;
    rp: HTMLAttributes;
    rt: HTMLAttributes;
    ruby: HTMLAttributes;
    s: HTMLAttributes;
    samp: HTMLAttributes;
    small: HTMLAttributes;
    span: HTMLAttributes<HTMLSpanElement>;
    strong: HTMLAttributes;
    sub: HTMLAttributes;
    sup: HTMLAttributes;
    time: TimeHTMLAttributes;
    u: HTMLAttributes;
    var: HTMLAttributes;
    wbr: HTMLAttributes;

    // Image and multimedia
    area: AreaHTMLAttributes;
    audio: AudioHTMLAttributes;
    img: ImgHTMLAttributes;
    map: MapHTMLAttributes;
    track: TrackHTMLAttributes;
    video: VideoHTMLAttributes;

    // Embedded content
    embed: EmbedHTMLAttributes;
    iframe: IframeHTMLAttributes;
    object: ObjectHTMLAttributes;
    param: ParamHTMLAttributes;
    picture: HTMLAttributes<HTMLPictureElement>;
    portal: HTMLAttributes;
    source: SourceHTMLAttributes;

    // Scripting
    canvas: CanvasHTMLAttributes;
    noscript: HTMLAttributes;
    script: ScriptHTMLAttributes;

    // Demarcating edits
    del: DelHTMLAttributes;
    ins: InsHTMLAttributes;

    // Table content
    caption: HTMLAttributes<HTMLTableCaptionElement>;
    col: ColHTMLAttributes;
    colgroup: ColgroupHTMLAttributes;
    table: TableHTMLAttributes;
    tbody: HTMLAttributes<HTMLTableSectionElement>;
    td: TdHTMLAttributes;
    tfoot: HTMLAttributes<HTMLTableSectionElement>;
    th: ThHTMLAttributes;
    thead: HTMLAttributes<HTMLTableSectionElement>;
    tr: HTMLAttributes<HTMLTableRowElement>;

    // Forms
    button: ButtonHTMLAttributes;
    datalist: HTMLAttributes<HTMLDataListElement>;
    fieldset: FieldsetHTMLAttributes;
    form: FormHTMLAttributes;
    input: InputHTMLAttributes;
    label: LabelHTMLAttributes;
    legend: HTMLAttributes<HTMLLegendElement>;
    meter: MeterHTMLAttributes;
    optgroup: OptgroupHTMLAttributes;
    option: OptionHTMLAttributes;
    output: OutputHTMLAttributes;
    progress: ProgressHTMLAttributes;
    select: SelectHTMLAttributes;
    textarea: TextareaHTMLAttributes;

    // Interactive elements
    details: DetailsHTMLAttributes;
    dialog: DialogHTMLAttributes;
    summary: HTMLAttributes;

    // Web Components
    slot: SlotHTMLAttributes;
    template: HTMLAttributes<HTMLTemplateElement>;

    // SVG
    svg: SVGAttributes;
    animate: SVGAttributes;
    circle: SVGAttributes;
    clipPath: SVGAttributes;
    defs: SVGAttributes;
    desc: SVGAttributes;
    ellipse: SVGAttributes;
    feBlend: SVGAttributes;
    feColorMatrix: SVGAttributes;
    feComponentTransfer: SVGAttributes;
    feComposite: SVGAttributes;
    feConvolveMatrix: SVGAttributes;
    feDiffuseLighting: SVGAttributes;
    feDisplacementMap: SVGAttributes;
    feDistantLight: SVGAttributes;
    feFlood: SVGAttributes;
    feFuncA: SVGAttributes;
    feFuncB: SVGAttributes;
    feFuncG: SVGAttributes;
    feFuncR: SVGAttributes;
    feGaussianBlur: SVGAttributes;
    feImage: SVGAttributes;
    feMerge: SVGAttributes;
    feMergeNode: SVGAttributes;
    feMorphology: SVGAttributes;
    feOffset: SVGAttributes;
    fePointLight: SVGAttributes;
    feSpecularLighting: SVGAttributes;
    feSpotLight: SVGAttributes;
    feTile: SVGAttributes;
    feTurbulence: SVGAttributes;
    filter: SVGAttributes;
    foreignObject: SVGAttributes;
    g: SVGAttributes;
    image: SVGAttributes;
    line: SVGAttributes;
    linearGradient: SVGAttributes;
    marker: SVGAttributes;
    mask: SVGAttributes;
    metadata: SVGAttributes;
    path: SVGAttributes;
    pattern: SVGAttributes;
    polygon: SVGAttributes;
    polyline: SVGAttributes;
    radialGradient: SVGAttributes;
    rect: SVGAttributes;
    stop: SVGAttributes;
    switch: SVGAttributes;
    symbol: SVGAttributes;
    text: SVGAttributes;
    textPath: SVGAttributes;
    tspan: SVGAttributes;
    use: SVGAttributes;
  }
}
