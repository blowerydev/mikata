import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noImperativeDomInUi } from '../src/rules/no-imperative-dom-in-ui';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-imperative-dom-in-ui', () => {
  it('runs', () => {
    ruleTester.run('no-imperative-dom-in-ui', noImperativeDomInUi, {
      valid: [
        // adoptElement wraps the root - fine
        {
          code: `
            export function Widget() {
              return adoptElement('div', (root) => {
                const span = document.createElement('span');
                root.appendChild(span);
              });
            }
          `,
        },
        // createElement inside a nested helper (renderPills-style)
        {
          code: `
            export function Widget() {
              const renderPills = () => {
                const pill = document.createElement('span');
                return pill;
              };
              return adoptElement('div', () => { renderPills(); });
            }
          `,
        },
        // createElement inside an effect callback
        {
          code: `
            export function Widget() {
              effect(() => {
                const li = document.createElement('li');
              });
              return adoptElement('div', () => {});
            }
          `,
        },
        // createElement in a non-component (camelCase) function - untouched
        {
          code: `
            export function createToastEl() {
              const el = document.createElement('div');
              return el;
            }
          `,
        },
        // createElement at module top-level (not inside any function)
        {
          code: `const containerTemplate = document.createElement('div');`,
        },
        // Hook (lowercase 'use' prefix) - not a component
        {
          code: `
            export function useToast() {
              const el = document.createElement('div');
              return el;
            }
          `,
        },
        // createTextNode / createComment / createDocumentFragment - not flagged
        {
          code: `
            export function Widget() {
              const t = document.createTextNode('hi');
              const c = document.createComment('x');
              const f = document.createDocumentFragment();
              return t;
            }
          `,
        },
      ],
      invalid: [
        // Classic imperative root
        {
          code: `
            export function Widget() {
              const root = document.createElement('div');
              return root;
            }
          `,
          errors: [{ messageId: 'imperativeRoot' }],
        },
        // Arrow function component
        {
          code: `
            export const Widget = () => {
              const root = document.createElement('div');
              return root;
            };
          `,
          errors: [{ messageId: 'imperativeRoot' }],
        },
        // SVG namespace element creation is equally problematic
        {
          code: `
            export function Widget() {
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              return svg;
            }
          `,
          errors: [{ messageId: 'imperativeRoot' }],
        },
        // Multiple top-level imperative calls
        {
          code: `
            export function Widget() {
              const root = document.createElement('div');
              const child = document.createElement('span');
              root.appendChild(child);
              return root;
            }
          `,
          errors: [{ messageId: 'imperativeRoot' }, { messageId: 'imperativeRoot' }],
        },
        // Top-level inside a conditional still flags
        {
          code: `
            export function Widget(props) {
              let root;
              if (props.variant) {
                root = document.createElement('div');
              } else {
                root = document.createElement('span');
              }
              return root;
            }
          `,
          errors: [{ messageId: 'imperativeRoot' }, { messageId: 'imperativeRoot' }],
        },
        // Anonymous default-export arrow component (route file shape)
        {
          code: `
            export default () => {
              const root = document.createElement('div');
              return root;
            };
          `,
          errors: [{ messageId: 'imperativeRoot' }],
        },
        // Anonymous default-export function expression
        {
          code: `
            export default function () {
              const root = document.createElement('div');
              return root;
            }
          `,
          errors: [{ messageId: 'imperativeRoot' }],
        },
      ],
    });
  });
});
