/**
 * Centralized Theme Preset System for Trackiyo.
 *
 * 8 curated visual themes across Light and Dark appearance modes.
 * Semantic tokens are consumed via CSS variables (--background, --surface, --primary, etc.),
 * Tailwind semantic utilities (bg-background, bg-surface, text-foreground, bg-accent, etc.),
 * or useThemeTokens() hook for charts, SVG, and canvas.
 */

export type ThemeId =
  | 'monochrome'
  | 'midnight'
  | 'slate'
  | 'forest'
  | 'sage'
  | 'ocean'
  | 'lavender'
  | 'warm';

export type ThemeModeSetting = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export interface ThemeModeTokens {
  // Semantic design tokens
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySubtle: string;
  primaryInk: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  focusRing: string;

  // Backwards-compatible aliases for existing component utilities & charts
  bg: string;
  elevated: string;
  surfaceHover: string;
  fg: string;
  secondaryText: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentInk: string;
  error: string;
  shadow: string;
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  blurb: string;
  accentHex: string;
  modes: Record<ResolvedMode, ThemeModeTokens>;
}

function makeTokens(
  t: Omit<
    ThemeModeTokens,
    | 'bg'
    | 'elevated'
    | 'surfaceHover'
    | 'fg'
    | 'secondaryText'
    | 'muted'
    | 'accent'
    | 'accentHover'
    | 'accentInk'
    | 'error'
    | 'shadow'
  > & {
    surfaceHover?: string;
    shadow?: string;
  }
): ThemeModeTokens {
  return {
    ...t,
    bg: t.background,
    elevated: t.surfaceElevated,
    surfaceHover: t.surfaceHover || t.surfaceSecondary,
    fg: t.textPrimary,
    secondaryText: t.textSecondary,
    muted: t.textMuted,
    accent: t.primary,
    accentHover: t.primaryHover,
    accentInk: t.primaryInk,
    error: t.danger,
    shadow:
      t.shadow ||
      '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
  };
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  // 1. Monochrome (Default Trackiyo theme)
  monochrome: {
    id: 'monochrome',
    label: 'Monochrome',
    blurb: 'Minimal, professional, neutral, productivity-focused',
    accentHex: '#171717',
    modes: {
      light: makeTokens({
        background: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceSecondary: '#F5F5F5',
        surfaceElevated: '#FFFFFF',
        border: '#E5E5E5',
        borderSubtle: '#EEEEEE',
        textPrimary: '#111111',
        textSecondary: '#525252',
        textMuted: '#737373',
        textDisabled: '#A3A3A3',
        primary: '#171717',
        primaryHover: '#262626',
        primaryActive: '#0A0A0A',
        primarySubtle: 'rgba(23, 23, 23, 0.08)',
        primaryInk: '#FFFFFF',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        focusRing: '#171717',
      }),
      dark: makeTokens({
        background: '#0A0A0A',
        surface: '#111111',
        surfaceSecondary: '#181818',
        surfaceElevated: '#202020',
        border: '#292929',
        borderSubtle: '#1F1F1F',
        textPrimary: '#F5F5F5',
        textSecondary: '#A3A3A3',
        textMuted: '#737373',
        textDisabled: '#525252',
        primary: '#FFFFFF',
        primaryHover: '#E5E5E5',
        primaryActive: '#CCCCCC',
        primarySubtle: 'rgba(255, 255, 255, 0.12)',
        primaryInk: '#0A0A0A',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
        focusRing: '#FFFFFF',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 2. Midnight
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    blurb: 'Deep dark surfaces with a restrained technical blue accent',
    accentHex: '#7C9AFF',
    modes: {
      light: makeTokens({
        background: '#F4F6FB',
        surface: '#FFFFFF',
        surfaceSecondary: '#EBEEF7',
        surfaceElevated: '#FFFFFF',
        border: '#DDE2F0',
        borderSubtle: '#EBF0FA',
        textPrimary: '#0B1120',
        textSecondary: '#475569',
        textMuted: '#64748B',
        textDisabled: '#94A3B8',
        primary: '#3B5BDB',
        primaryHover: '#364FC7',
        primaryActive: '#2B3DA3',
        primarySubtle: 'rgba(59, 91, 219, 0.08)',
        primaryInk: '#FFFFFF',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        focusRing: '#3B5BDB',
      }),
      dark: makeTokens({
        background: '#070A12',
        surface: '#0D111C',
        surfaceSecondary: '#151B29',
        surfaceElevated: '#1D2538',
        border: '#222B3D',
        borderSubtle: '#141A26',
        textPrimary: '#F1F5F9',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        textDisabled: '#475569',
        primary: '#7C9AFF',
        primaryHover: '#96AEFF',
        primaryActive: '#6686FA',
        primarySubtle: 'rgba(124, 154, 255, 0.12)',
        primaryInk: '#070A12',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#7C9AFF',
        focusRing: '#7C9AFF',
        shadow: '0 2px 8px rgba(0,0,0,0.6), 0 12px 32px rgba(0,0,0,0.7)',
      }),
    },
  },

  // 3. Slate
  slate: {
    id: 'slate',
    label: 'Slate',
    blurb: 'Cool, modern, technical, with a muted blue-gray accent',
    accentHex: '#64748B',
    modes: {
      light: makeTokens({
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceSecondary: '#F1F5F9',
        surfaceElevated: '#FFFFFF',
        border: '#E2E8F0',
        borderSubtle: '#EDF2F7',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        textDisabled: '#94A3B8',
        primary: '#64748B',
        primaryHover: '#475569',
        primaryActive: '#334155',
        primarySubtle: 'rgba(100, 116, 139, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        focusRing: '#64748B',
      }),
      dark: makeTokens({
        background: '#0B0F17',
        surface: '#131924',
        surfaceSecondary: '#1C2433',
        surfaceElevated: '#242E40',
        border: '#2A364C',
        borderSubtle: '#182130',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        textDisabled: '#475569',
        primary: '#94A3B8',
        primaryHover: '#CBD5E1',
        primaryActive: '#64748B',
        primarySubtle: 'rgba(148, 163, 184, 0.12)',
        primaryInk: '#0B0F17',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
        focusRing: '#94A3B8',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 4. Forest
  forest: {
    id: 'forest',
    label: 'Forest',
    blurb: 'Natural, healthy, habit-focused, with restrained green accents',
    accentHex: '#3F7652',
    modes: {
      light: makeTokens({
        background: '#F7FAF8',
        surface: '#FFFFFF',
        surfaceSecondary: '#E8F0E9',
        surfaceElevated: '#FFFFFF',
        border: '#DCE9DF',
        borderSubtle: '#EBF2EC',
        textPrimary: '#111C14',
        textSecondary: '#3D5243',
        textMuted: '#5E7A66',
        textDisabled: '#8FA896',
        primary: '#3F7652',
        primaryHover: '#356345',
        primaryActive: '#2B5238',
        primarySubtle: 'rgba(63, 118, 82, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#2F6E44',
        warning: '#C97A16',
        danger: '#D33636',
        info: '#2F729E',
        focusRing: '#3F7652',
      }),
      dark: makeTokens({
        background: '#0B120D',
        surface: '#121C15',
        surfaceSecondary: '#17241A',
        surfaceElevated: '#1F3024',
        border: '#263C2C',
        borderSubtle: '#16241A',
        textPrimary: '#EDF5EF',
        textSecondary: '#9EB5A4',
        textMuted: '#6B8572',
        textDisabled: '#485E4E',
        primary: '#529E6C',
        primaryHover: '#65B380',
        primaryActive: '#428258',
        primarySubtle: 'rgba(82, 158, 108, 0.14)',
        primaryInk: '#0B120D',
        success: '#48BB78',
        warning: '#ECC94B',
        danger: '#F56565',
        info: '#4299E1',
        focusRing: '#529E6C',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 5. Sage
  sage: {
    id: 'sage',
    label: 'Sage',
    blurb: 'Soft, calm, wellness-oriented minimal sage green',
    accentHex: '#6F8F78',
    modes: {
      light: makeTokens({
        background: '#F9FAF9',
        surface: '#FFFFFF',
        surfaceSecondary: '#EFF2F0',
        surfaceElevated: '#FFFFFF',
        border: '#E1E6E2',
        borderSubtle: '#EDF1EE',
        textPrimary: '#1A211C',
        textSecondary: '#4A574E',
        textMuted: '#728276',
        textDisabled: '#9EAEA2',
        primary: '#6F8F78',
        primaryHover: '#5E7C67',
        primaryActive: '#4D6855',
        primarySubtle: 'rgba(111, 143, 120, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#529E6C',
        warning: '#D68F24',
        danger: '#D94848',
        info: '#3A83A6',
        focusRing: '#6F8F78',
      }),
      dark: makeTokens({
        background: '#0D110E',
        surface: '#141A16',
        surfaceSecondary: '#1B241E',
        surfaceElevated: '#232E27',
        border: '#2B3830',
        borderSubtle: '#18221B',
        textPrimary: '#F0F4F1',
        textSecondary: '#A1B0A6',
        textMuted: '#728276',
        textDisabled: '#4E5E52',
        primary: '#86A890',
        primaryHover: '#98B9A2',
        primaryActive: '#73937C',
        primarySubtle: 'rgba(134, 168, 144, 0.14)',
        primaryInk: '#0D110E',
        success: '#48BB78',
        warning: '#ECC94B',
        danger: '#F56565',
        info: '#4299E1',
        focusRing: '#86A890',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 6. Ocean
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    blurb: 'Focused, clean, energetic, with restrained blue-cyan tones',
    accentHex: '#3182A8',
    modes: {
      light: makeTokens({
        background: '#F8FAFB',
        surface: '#FFFFFF',
        surfaceSecondary: '#EEF4F7',
        surfaceElevated: '#FFFFFF',
        border: '#DDE8ED',
        borderSubtle: '#EAF0F4',
        textPrimary: '#0F1D24',
        textSecondary: '#3D5561',
        textMuted: '#617D8C',
        textDisabled: '#94ABB8',
        primary: '#3182A8',
        primaryHover: '#286C8C',
        primaryActive: '#1F556E',
        primarySubtle: 'rgba(49, 130, 168, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#2E8540',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        focusRing: '#3182A8',
      }),
      dark: makeTokens({
        background: '#0A1114',
        surface: '#101B20',
        surfaceSecondary: '#17252C',
        surfaceElevated: '#1F313A',
        border: '#273D48',
        borderSubtle: '#142229',
        textPrimary: '#EEF5F8',
        textSecondary: '#92B1C0',
        textMuted: '#628191',
        textDisabled: '#445D6B',
        primary: '#45A1CB',
        primaryHover: '#5EB2D9',
        primaryActive: '#358DB5',
        primarySubtle: 'rgba(69, 161, 203, 0.14)',
        primaryInk: '#0A1114',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#45A1CB',
        focusRing: '#45A1CB',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 7. Lavender
  lavender: {
    id: 'lavender',
    label: 'Lavender',
    blurb: 'Personal, calm, creative modern muted lavender',
    accentHex: '#7867A8',
    modes: {
      light: makeTokens({
        background: '#FAF9FC',
        surface: '#FFFFFF',
        surfaceSecondary: '#EFECF5',
        surfaceElevated: '#FFFFFF',
        border: '#E5E0F0',
        borderSubtle: '#F1EDF7',
        textPrimary: '#1B1724',
        textSecondary: '#4D455E',
        textMuted: '#766E87',
        textDisabled: '#A69EB6',
        primary: '#7867A8',
        primaryHover: '#655591',
        primaryActive: '#524378',
        primarySubtle: 'rgba(120, 103, 168, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#6366F1',
        focusRing: '#7867A8',
      }),
      dark: makeTokens({
        background: '#0F0D14',
        surface: '#17141F',
        surfaceSecondary: '#211C2B',
        surfaceElevated: '#2C263B',
        border: '#383049',
        borderSubtle: '#1E1929',
        textPrimary: '#F4F1F8',
        textSecondary: '#AFA6C2',
        textMuted: '#7C7391',
        textDisabled: '#554D66',
        primary: '#9A87D1',
        primaryHover: '#AB9CE0',
        primaryActive: '#8470BE',
        primarySubtle: 'rgba(154, 135, 209, 0.14)',
        primaryInk: '#0F0D14',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#818CF8',
        focusRing: '#9A87D1',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },

  // 8. Warm
  warm: {
    id: 'warm',
    label: 'Warm',
    blurb: 'Warm, comfortable, editorial cream and muted amber tones',
    accentHex: '#9A7653',
    modes: {
      light: makeTokens({
        background: '#FAF8F4',
        surface: '#FFFFFF',
        surfaceSecondary: '#F3EEE6',
        surfaceElevated: '#FFFFFF',
        border: '#E8E0D5',
        borderSubtle: '#F2ECE2',
        textPrimary: '#211B14',
        textSecondary: '#5C4F42',
        textMuted: '#877767',
        textDisabled: '#B3A495',
        primary: '#9A7653',
        primaryHover: '#836344',
        primaryActive: '#6C5136',
        primarySubtle: 'rgba(154, 118, 83, 0.1)',
        primaryInk: '#FFFFFF',
        success: '#2E8540',
        warning: '#C07018',
        danger: '#C53030',
        info: '#2563EB',
        focusRing: '#9A7653',
      }),
      dark: makeTokens({
        background: '#120F0C',
        surface: '#1B1713',
        surfaceSecondary: '#2A241E',
        surfaceElevated: '#352E27',
        border: '#423931',
        borderSubtle: '#241D17',
        textPrimary: '#F6F3EF',
        textSecondary: '#B5A89A',
        textMuted: '#85786C',
        textDisabled: '#5E5246',
        primary: '#BD9770',
        primaryHover: '#CCA883',
        primaryActive: '#A8815B',
        primarySubtle: 'rgba(189, 151, 112, 0.14)',
        primaryInk: '#120F0C',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
        focusRing: '#BD9770',
        shadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)',
      }),
    },
  },
};

export const THEME_IDS: ThemeId[] = [
  'monochrome',
  'midnight',
  'slate',
  'forest',
  'sage',
  'ocean',
  'lavender',
  'warm',
];

export const DEFAULT_THEME_ID: ThemeId = 'monochrome';
export const DEFAULT_MODE_SETTING: ThemeModeSetting = 'system';

export function isThemeId(value: string | null | undefined): value is ThemeId {
  if (!value) return false;
  return (THEME_IDS as string[]).includes(value);
}

export function isModeSetting(
  value: string | null | undefined
): value is ThemeModeSetting {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemeTokens(
  themeId: ThemeId,
  mode: ResolvedMode
): ThemeModeTokens {
  const selectedTheme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  return selectedTheme.modes[mode];
}
