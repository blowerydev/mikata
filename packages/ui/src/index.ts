// Theme
export {
  ThemeProvider, useTheme, useDirection, createTheme, defaultTheme, darkTheme,
  flattenTheme, useComponentDefaults, BUILT_IN_COLORS,
} from './theme';
export { applyThemeToDocument } from './theme/apply-document';
export type { ApplyThemeToDocumentOptions } from './theme/apply-document';
export type {
  MikataTheme, ColorScheme, Direction, ThemeProviderProps, ThemeContextValue,
  HeadingConfig, HeadingsConfig, CSSVariablesOutput, CSSVariablesResolver,
  CSSVariablesResolverContext, PrimaryShade, ColorPalette, BuiltInColorName,
} from './theme';

// Types
export type { MikataSize, MikataColor, BuiltInColor, ClassNamesInput, MikataBaseProps } from './types';

// Utilities
export { mergeClasses } from './utils/class-merge';
export { uniqueId } from './utils/unique-id';
export { createDisclosure } from './utils/create-disclosure';
export type { DisclosureReturn } from './utils/create-disclosure';
export { onClickOutside } from './utils/on-click-outside';
export { onFocusTrap } from './utils/on-focus-trap';
export { onScrollLock } from './utils/on-scroll-lock';
export { createMediaQuery } from './utils/create-media-query';
export { createLocalStorage } from './utils/create-local-storage';
export { createClipboard } from './utils/create-clipboard';
export type { ClipboardReturn } from './utils/create-clipboard';
export { createToggle } from './utils/create-toggle';
export type { ToggleReturn } from './utils/create-toggle';
export { createInterval } from './utils/create-interval';
export type { IntervalReturn } from './utils/create-interval';
export { createTimeout } from './utils/create-timeout';
export type { TimeoutReturn } from './utils/create-timeout';
export { createDebouncedSignal } from './utils/create-debounced-signal';
export { createThrottledSignal } from './utils/create-throttled-signal';
export { createPrevious } from './utils/create-previous';
export { createViewportSize } from './utils/create-viewport-size';
export type { ViewportSize } from './utils/create-viewport-size';
export { createIdle } from './utils/create-idle';
export { createNetworkStatus } from './utils/create-network-status';
export { createOs } from './utils/create-os';
export type { OS } from './utils/create-os';
export { createReducedMotion } from './utils/create-reduced-motion';
export { createPageVisibility } from './utils/create-page-visibility';
export { createIntersection } from './utils/create-intersection';
export { createResizeObserver } from './utils/create-resize-observer';
export type { ElementSize } from './utils/create-resize-observer';
export { onHotkeys } from './utils/on-hotkeys';
export type { HotkeyHandler, HotkeyMap } from './utils/on-hotkeys';
export { onWindowEvent } from './utils/on-window-event';
export { onDocumentEvent } from './utils/on-document-event';
export { onPageLeave } from './utils/on-page-leave';
export { onDocumentTitle } from './utils/on-document-title';
export { mergeRefs } from './utils/merge-refs';
export { provideUILabels, useUILabels } from './utils/use-i18n-optional';

// Deprecated aliases - prefer the new names above.
/** @deprecated Use `uniqueId` instead. */
export { useId } from './utils/unique-id';
/** @deprecated Use `createDisclosure` instead. */
export { useDisclosure } from './utils/create-disclosure';
/** @deprecated Use `DisclosureReturn` instead. */
export type { UseDisclosureReturn } from './utils/create-disclosure';
/** @deprecated Use `onClickOutside` instead. */
export { useClickOutside } from './utils/on-click-outside';
/** @deprecated Use `onFocusTrap` instead. */
export { useFocusTrap } from './utils/on-focus-trap';
/** @deprecated Use `onScrollLock` instead. */
export { useScrollLock } from './utils/on-scroll-lock';
/** @deprecated Use `createMediaQuery` instead. */
export { useMediaQuery } from './utils/use-media-query';
/** @deprecated Use `createLocalStorage` instead. */
export { useLocalStorage } from './utils/use-local-storage';

// Layout
export { Box } from './components/Box';
export { Stack } from './components/Stack';
export { Group } from './components/Group';
export { Grid } from './components/Grid';
export { Flex } from './components/Flex';
export { SimpleGrid } from './components/SimpleGrid';
export { Container } from './components/Container';
export { Center } from './components/Center';
export { AspectRatio } from './components/AspectRatio';
export { Paper } from './components/Paper';
export { Divider } from './components/Divider';
export { Space } from './components/Space';
export { VisuallyHidden } from './components/VisuallyHidden';
export { AppShell } from './components/AppShell';
export { ScrollArea } from './components/ScrollArea';

// Typography
export { Text } from './components/Text';
export { Title } from './components/Title';
export { Anchor } from './components/Anchor';
export { Kbd } from './components/Kbd';
export { Code } from './components/Code';
export { Mark } from './components/Mark';
export { Blockquote } from './components/Blockquote';
export { List, ListItem } from './components/List';
export { ThemeIcon } from './components/ThemeIcon';
export { ColorSwatch } from './components/ColorSwatch';

// Buttons
export { Button } from './components/Button';
export { ActionIcon } from './components/ActionIcon';
export { CloseButton } from './components/CloseButton';
export { ButtonGroup } from './components/ButtonGroup';
export { UnstyledButton } from './components/UnstyledButton';
export { Burger } from './components/Burger';
export { CopyButton } from './components/CopyButton';

// Feedback
export { Loader } from './components/Loader';
export { LoadingOverlay } from './components/LoadingOverlay';
export { Alert } from './components/Alert';
export { Badge } from './components/Badge';
export { Indicator } from './components/Indicator';
export { Progress } from './components/Progress';
export { RingProgress } from './components/RingProgress';
export { Skeleton } from './components/Skeleton';
export { Notification } from './components/Notification';

// Form Inputs
export { Input } from './components/Input';
export { TextInput } from './components/TextInput';
export { Textarea } from './components/Textarea';
export { PasswordInput } from './components/PasswordInput';
export { NumberInput } from './components/NumberInput';
export { PinInput } from './components/PinInput';
export { Checkbox } from './components/Checkbox';
export { Radio } from './components/Radio';
export { Switch } from './components/Switch';
export { Select } from './components/Select';
export { Autocomplete } from './components/Autocomplete';
export { MultiSelect } from './components/MultiSelect';
export { TagsInput } from './components/TagsInput';
export { Slider } from './components/Slider';
export { RangeSlider } from './components/RangeSlider';
export { Rating } from './components/Rating';
export { Chip, ChipGroup } from './components/Chip';
export { Fieldset } from './components/Fieldset';
export { FileInput } from './components/FileInput';
export { FileButton } from './components/FileButton';

// Dates
export { Calendar } from './components/Calendar';
export type { CalendarProps, CalendarParts, CalendarLevel } from './components/Calendar';
export { MonthPicker } from './components/MonthPicker';
export type { MonthPickerProps } from './components/MonthPicker';
export { YearPicker } from './components/YearPicker';
export type { YearPickerProps } from './components/YearPicker';
export { DatePicker } from './components/DatePicker';
export type { DatePickerProps } from './components/DatePicker';
export { DateInput } from './components/DateInput';
export type { DateInputProps, DateInputParts } from './components/DateInput';
export {
  DatePickerInput,
  MonthPickerInput,
  YearPickerInput,
} from './components/DatePickerInput';
export type {
  DatePickerInputProps,
  MonthPickerInputProps,
  YearPickerInputProps,
  PickerInputParts,
} from './components/DatePickerInput';
export { TimeInput } from './components/TimeInput';
export type { TimeInputProps, TimeInputParts } from './components/TimeInput';

// Virtualization
export { VirtualList, createVirtualizer } from './components/VirtualList';
export type {
  VirtualListProps,
  VirtualListParts,
  VirtualizerOptions,
  VirtualItem,
  Virtualizer,
} from './components/VirtualList';

// Data Display
export { Card } from './components/Card';
export { Table } from './components/Table';
export { Avatar, AvatarGroup } from './components/Avatar';
export { Accordion } from './components/Accordion';
export { Image } from './components/Image';
export { BackgroundImage } from './components/BackgroundImage';
export { Highlight } from './components/Highlight';
export { Spoiler } from './components/Spoiler';
export { Timeline } from './components/Timeline';
export { Tree } from './components/Tree';

// Navigation
export { Tabs } from './components/Tabs';
export { Menu } from './components/Menu';
export { Pagination } from './components/Pagination';
export { SegmentedControl } from './components/SegmentedControl';
export { Breadcrumb } from './components/Breadcrumb';
export { NavLink } from './components/NavLink';
export { Stepper } from './components/Stepper';

// Notifications
export { toast } from './components/Toast';

// Overlays
export { Overlay } from './components/Overlay';
export { Tooltip } from './components/Tooltip';
export { Popover } from './components/Popover';
export { HoverCard } from './components/HoverCard';
export { Modal } from './components/Modal';
export { Drawer } from './components/Drawer';
export { Affix } from './components/Affix';

// Behavior
export { Collapse } from './components/Collapse';
