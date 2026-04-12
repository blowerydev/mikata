// Theme
export { ThemeProvider, useTheme, createTheme, defaultTheme, darkTheme } from './theme';
export type { MikataTheme, ColorScheme, ThemeProviderProps, ThemeContextValue } from './theme';

// Types
export type { MikataSize, MikataColor, ClassNamesInput, MikataBaseProps } from './types';

// Utilities
export { mergeClasses } from './utils/class-merge';
export { useId } from './utils/use-id';
export { useDisclosure } from './utils/use-disclosure';
export { useClickOutside } from './utils/use-click-outside';
export { useFocusTrap } from './utils/use-focus-trap';
export { useScrollLock } from './utils/use-scroll-lock';
export { useMediaQuery } from './utils/use-media-query';
export { useLocalStorage } from './utils/use-local-storage';
export { provideUILabels, useUILabels } from './utils/use-i18n-optional';

// Layout
export { Box } from './components/Box';
export { Stack } from './components/Stack';
export { Group } from './components/Group';
export { Grid } from './components/Grid';
export { Container } from './components/Container';
export { Divider } from './components/Divider';
export { Space } from './components/Space';

// Typography
export { Text } from './components/Text';
export { Title } from './components/Title';
export { Anchor } from './components/Anchor';

// Buttons
export { Button } from './components/Button';
export { ActionIcon } from './components/ActionIcon';
export { CloseButton } from './components/CloseButton';
export { ButtonGroup } from './components/ButtonGroup';

// Feedback
export { Loader } from './components/Loader';
export { Alert } from './components/Alert';
export { Badge } from './components/Badge';
export { Progress } from './components/Progress';
export { Skeleton } from './components/Skeleton';

// Form Inputs
export { TextInput } from './components/TextInput';
export { Textarea } from './components/Textarea';
export { PasswordInput } from './components/PasswordInput';
export { NumberInput } from './components/NumberInput';
export { Checkbox } from './components/Checkbox';
export { Radio } from './components/Radio';
export { Switch } from './components/Switch';
export { Select } from './components/Select';
export { Slider } from './components/Slider';

// Overlays
export { Tooltip } from './components/Tooltip';
export { Popover } from './components/Popover';
export { Modal } from './components/Modal';
export { Drawer } from './components/Drawer';
