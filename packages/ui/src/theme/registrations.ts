/**
 * Static registration of built-in component per-palette rules. Imported by
 * ThemeProvider so `theme.colors` custom palettes get runtime CSS rules.
 * Built-in palettes are already covered by each component's stylesheet.
 */
import { registerColored } from './colored-registry';

registerColored({
  selector: '.mkt-action-icon[data-color="{name}"]',
  decls: {
    '--_ai-color': 'filled',
    '--_ai-color-hover': 'filled-hover',
    '--_ai-color-light': 'light',
    '--_ai-color-light-hover': 'light-hover',
  },
});

registerColored({
  selector: '.mkt-alert[data-color="{name}"]',
  decls: {
    '--_alert-color': 'filled',
    '--_alert-bg': 'light',
    '--_alert-border': 'filled',
  },
});

registerColored({
  selector: '.mkt-anchor[data-color="{name}"]',
  decls: { '--_anchor-color': 'filled' },
});

registerColored({
  selector: '.mkt-avatar[data-color="{name}"]',
  decls: {
    '--_avatar-color': 'filled',
    '--_avatar-bg': 'light',
  },
});

registerColored({
  selector: '.mkt-badge[data-color="{name}"]',
  decls: {
    '--_badge-color': 'filled',
    '--_badge-bg': 'light',
  },
});

registerColored({
  selector: '.mkt-blockquote[data-color="{name}"]',
  decls: { '--_bq-color': 'filled' },
});

registerColored({
  selector: '.mkt-button[data-color="{name}"]',
  decls: {
    '--_btn-color': 'filled',
    '--_btn-color-hover': 'filled-hover',
    '--_btn-color-light': 'light',
    '--_btn-color-light-hover': 'light-hover',
  },
});

registerColored({
  selector: '.mkt-checkbox[data-color="{name}"]',
  decls: { '--_cb-color': 'filled' },
});

registerColored({
  selector: '.mkt-chip[data-color="{name}"]',
  decls: {
    '--_chip-color': 'filled',
    '--_chip-color-subtle': 'light-hover',
  },
});

registerColored({
  selector: '.mkt-code[data-color="{name}"]',
  decls: {
    'background-color': 'light',
    'color': 8,
  },
});

registerColored({
  selector: '.mkt-indicator__indicator[data-color="{name}"]',
  decls: { '--_indicator-color': 'filled' },
});

registerColored({
  selector: '.mkt-loader[data-color="{name}"]',
  decls: { '--_loader-color': 'filled' },
});

registerColored({
  selector: '.mkt-mark[data-color="{name}"]',
  decls: { 'background-color': 2 },
});

registerColored({
  selector: '.mkt-menu__item[data-color="{name}"]',
  decls: { 'color': 'filled' },
});

registerColored({
  selector: '.mkt-menu__item[data-color="{name}"]:hover:not(:disabled)',
  decls: { 'background-color': 'light' },
});

registerColored({
  selector: '.mkt-navlink[data-color="{name}"]',
  decls: {
    '--_navlink-color': 'filled',
    '--_navlink-bg': 'light',
  },
});

registerColored({
  selector: '.mkt-notification[data-color="{name}"]',
  decls: { '--_notif-color': 'filled' },
});

registerColored({
  selector: '.mkt-pagination[data-color="{name}"] .mkt-pagination__item[data-active]',
  decls: { 'background-color': 'filled', 'color': '=#fff' },
});

registerColored({
  selector: '.mkt-progress[data-color="{name}"]',
  decls: { '--_progress-color': 'filled' },
});

registerColored({
  selector: '.mkt-radio[data-color="{name}"]',
  decls: { '--_radio-color': 'filled' },
});

registerColored({
  selector: '.mkt-range-slider[data-color="{name}"]',
  decls: { '--_rs-color': 'filled' },
});

registerColored({
  selector: '.mkt-slider[data-color="{name}"]',
  decls: { '--_slider-color': 'filled' },
});

registerColored({
  selector: '.mkt-switch[data-color="{name}"]',
  decls: { '--_switch-color': 'filled' },
});

registerColored({
  selector: '.mkt-tabs[data-variant="default"][data-color="{name}"] .mkt-tabs__tab[data-active]',
  decls: { 'border-color': 'filled', 'color': 'filled' },
});

registerColored({
  selector: '.mkt-text[data-color="{name}"]',
  decls: { 'color': 'filled' },
});

registerColored({
  selector: '.mkt-theme-icon[data-color="{name}"]',
  decls: {
    '--_color': 'filled',
    '--_color-subtle': 'light',
  },
});

registerColored({
  selector: '.mkt-toast[data-color="{name}"]',
  decls: { '--_toast-color': 'filled' },
});
