import type { types as BabelTypes, NodePath } from '@babel/core';

export type Scope = NonNullable<NodePath['scope']>;
export type Binding = NonNullable<ReturnType<Scope['getBinding']>>;

export const RUNTIME_MODULE = '@mikata/runtime';
export const REACTIVITY_MODULE = '@mikata/reactivity';
export const PUBLIC_RUNTIME_MODULES = new Set([RUNTIME_MODULE, 'mikata']);

export const STATIC_CALLBACK_CALLEES = new Set([
  'each',
  'show',
  'switchMatch',
  'For',
]);

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

export const DELEGATED_EVENTS = new Set([
  'beforeinput', 'click', 'dblclick', 'contextmenu', 'focusin', 'focusout',
  'input', 'keydown', 'keyup', 'mousedown', 'mousemove', 'mouseout',
  'mouseover', 'mouseup', 'pointerdown', 'pointermove', 'pointerout',
  'pointerover', 'pointerup', 'touchend', 'touchmove', 'touchstart',
]);

export interface TemplateDecl {
  name: string;
  html: string;
}

export interface PluginState {
  runtimeImports: Set<string>;
  reactivityImports: Set<string>;
  templateCount: number;
  templateDeclarations: TemplateDecl[];
}

export type Plan =
  | ElementPlan
  | { kind: 'text'; text: string }
  | { kind: 'dynamic'; expr: BabelTypes.Expression; reactive: boolean; bakeText?: boolean }
  | { kind: 'node'; expr: BabelTypes.Expression };

export interface ElementPlan {
  kind: 'element';
  tag: string;
  bakedAttrs: Array<[string, string]>;
  deferredOps: DeferredOp[];
  children: Plan[];
}

export type DeferredOp =
  | { kind: 'event'; eventName: string; expr: BabelTypes.Expression }
  | { kind: 'reactive-attr'; name: string; expr: BabelTypes.Expression }
  | { kind: 'runtime-attr'; name: string; expr: BabelTypes.Expression }
  | { kind: 'ref'; expr: BabelTypes.Expression }
  | { kind: 'spread'; expr: BabelTypes.Expression };
