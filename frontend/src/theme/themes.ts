/**
 * Centralized theme system — single source of truth for all visual tokens.
 *
 * 10 themes x 2 modes (light/dark). Components must consume these tokens
 * (via Tailwind semantic utilities backed by CSS variables, or via
 * `useThemeTokens()` for canvas/SVG colors). No hard-coded theme colors
 * in individual components.
 */

export type ThemeId =
  | 'modern'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'royal'
  | 'rose'
  | 'monochrome'
  | 'amber'
  | 'cyber'
  | 'kinetic';

export type ThemeModeSetting = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export interface ThemeModeTokens {
  bg: string;
  surface: string;
  elevated: string;
  fg: string;
  muted: string;
  border: string;
  accent: string;
  accentInk: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  blurb: string;
  radiusSm: number;
  radiusMd: number;
  modes: Record<ResolvedMode, ThemeModeTokens>;
}

export const THEME_IDS: ThemeId[] = [
  'modern',
  'ocean',
  'forest',
  'sunset',
  'royal',
  'rose',
  'monochrome',
  'amber',
  'cyber',
  'kinetic',
];

export const DEFAULT_THEME_ID: ThemeId = 'kinetic';
export const DEFAULT_MODE_SETTING: ThemeModeSetting = 'dark';

export const THEMES: Record<ThemeId, ThemeDef> = {
  modern: {
    id: 'modern',
    label: 'Modern',
    blurb: 'Clean everyday productivity',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#F7F7F8', surface: '#FFFFFF', elevated: '#EFEFF1',
        fg: '#18181B', muted: '#63636B', border: '#E2E2E6',
        accent: '#4F46E5', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#1D4ED8',
        shadow: '0 1px 2px rgb(24 24 27 / 0.06), 0 4px 16px rgb(24 24 27 / 0.06)',
      },
      dark: {
        bg: '#131316', surface: '#1C1C21', elevated: '#26262C',
        fg: '#F4F4F5', muted: '#A7A7B0', border: '#333338',
        accent: '#818CF8', accentInk: '#0B0B10',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#60A5FA',
        shadow: '0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.35)',
      },
    },
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    blurb: 'Calm blue focus',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#F2F7FA', surface: '#FFFFFF', elevated: '#E6EFF5',
        fg: '#0B1F33', muted: '#4E6A84', border: '#D8E5EE',
        accent: '#0369A1', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#0369A1',
        shadow: '0 1px 2px rgb(11 31 51 / 0.07), 0 6px 20px rgb(11 31 51 / 0.08)',
      },
      dark: {
        bg: '#081420', surface: '#0E2033', elevated: '#14304A',
        fg: '#EAF3FA', muted: '#8FA9C2', border: '#1E3A55',
        accent: '#22D3EE', accentInk: '#04121C',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#22D3EE',
        shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 8px 24px rgb(0 0 0 / 0.4)',
      },
    },
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    blurb: 'Natural green calm',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#F6F7F2', surface: '#FFFFFF', elevated: '#E9EFE2',
        fg: '#16241A', muted: '#5A6E5F', border: '#DEE6D6',
        accent: '#047857', accentInk: '#FFFFFF',
        success: '#047857', warning: '#B45309', error: '#DC2626', info: '#0369A1',
        shadow: '0 1px 2px rgb(22 36 26 / 0.07), 0 6px 20px rgb(22 36 26 / 0.07)',
      },
      dark: {
        bg: '#0A140F', surface: '#10201A', elevated: '#163026',
        fg: '#E9F3EC', muted: '#93AC9C', border: '#1E3A2E',
        accent: '#34D399', accentInk: '#04120C',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#67E8F9',
        shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 8px 24px rgb(0 0 0 / 0.4)',
      },
    },
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    blurb: 'Warm energetic coral',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#FBF6EF', surface: '#FFFFFF', elevated: '#F5EAD9',
        fg: '#241A12', muted: '#6E5F4E', border: '#EADDC8',
        accent: '#C2410C', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#0369A1',
        shadow: '0 1px 2px rgb(36 26 18 / 0.07), 0 6px 20px rgb(36 26 18 / 0.07)',
      },
      dark: {
        bg: '#161210', surface: '#221B17', elevated: '#2E2520',
        fg: '#F7EFE6', muted: '#AE9C8A', border: '#3A2F28',
        accent: '#FB923C', accentInk: '#170D04',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#67E8F9',
        shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 8px 24px rgb(0 0 0 / 0.4)',
      },
    },
  },
  royal: {
    id: 'royal',
    label: 'Royal',
    blurb: 'Premium violet',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#F6F4FB', surface: '#FFFFFF', elevated: '#ECE7F7',
        fg: '#1E1B33', muted: '#655E85', border: '#DED7F0',
        accent: '#7C3AED', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#4F46E5',
        shadow: '0 2px 4px rgb(30 27 51 / 0.08), 0 10px 28px rgb(124 58 237 / 0.12)',
      },
      dark: {
        bg: '#120F22', surface: '#1B1733', elevated: '#262047',
        fg: '#EFEAFF', muted: '#A79ED1', border: '#322A5C',
        accent: '#A78BFA', accentInk: '#120C26',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#818CF8',
        shadow: '0 2px 4px rgb(0 0 0 / 0.45), 0 10px 28px rgb(0 0 0 / 0.4)',
      },
    },
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    blurb: 'Distinctive magenta',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#FAF5F7', surface: '#FFFFFF', elevated: '#F5E6EC',
        fg: '#2A161F', muted: '#7D5A68', border: '#EDD5DF',
        accent: '#BE185D', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#4F46E5',
        shadow: '0 1px 2px rgb(42 22 31 / 0.07), 0 6px 20px rgb(42 22 31 / 0.07)',
      },
      dark: {
        bg: '#170F14', surface: '#241820', elevated: '#33232E',
        fg: '#F9ECF2', muted: '#B795A4', border: '#402C39',
        accent: '#F472B6', accentInk: '#1C0A13',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#818CF8',
        shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 8px 24px rgb(0 0 0 / 0.4)',
      },
    },
  },
  monochrome: {
    id: 'monochrome',
    label: 'Mono',
    blurb: 'Distraction-free gray',
    radiusSm: 2,
    radiusMd: 4,
    modes: {
      light: {
        bg: '#FFFFFF', surface: '#FFFFFF', elevated: '#F1F1F1',
        fg: '#000000', muted: '#5C5C5C', border: '#D4D4D4',
        accent: '#000000', accentInk: '#FFFFFF',
        success: '#166534', warning: '#92400E', error: '#B91C1C', info: '#1E40AF',
        shadow: 'none',
      },
      dark: {
        bg: '#0A0A0A', surface: '#141414', elevated: '#212121',
        fg: '#FFFFFF', muted: '#A3A3A3', border: '#333333',
        accent: '#FAFAFA', accentInk: '#000000',
        success: '#4ADE80', warning: '#FACC15', error: '#F87171', info: '#93C5FD',
        shadow: 'none',
      },
    },
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    blurb: 'Warm premium gold',
    radiusSm: 4,
    radiusMd: 8,
    modes: {
      light: {
        bg: '#FBF7EE', surface: '#FFFDF8', elevated: '#F4EAD2',
        fg: '#221A0C', muted: '#6E5F45', border: '#E7D9B8',
        accent: '#B45309', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#0369A1',
        shadow: '0 1px 2px rgb(34 26 12 / 0.07), 0 6px 20px rgb(34 26 12 / 0.07)',
      },
      dark: {
        bg: '#14100A', surface: '#1F1810', elevated: '#2C2317',
        fg: '#F7EFDF', muted: '#B3A184', border: '#3B3020',
        accent: '#FBBF24', accentInk: '#160F02',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#67E8F9',
        shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 8px 24px rgb(0 0 0 / 0.4)',
      },
    },
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber',
    blurb: 'High-contrast future',
    radiusSm: 2,
    radiusMd: 4,
    modes: {
      light: {
        bg: '#F2F7FB', surface: '#FFFFFF', elevated: '#E4EFF7',
        fg: '#0A1830', muted: '#45607E', border: '#D2E3F0',
        accent: '#0E7490', accentInk: '#FFFFFF',
        success: '#15803D', warning: '#B45309', error: '#DC2626', info: '#7C3AED',
        shadow: 'none',
      },
      dark: {
        bg: '#05070D', surface: '#0A1220', elevated: '#101B30',
        fg: '#EAF2FC', muted: '#8CA3C2', border: '#1B2C47',
        accent: '#22D3EE', accentInk: '#031318',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#A78BFA',
        shadow: 'none',
      },
    },
  },
  kinetic: {
    id: 'kinetic',
    label: 'Kinetic',
    blurb: 'Acid high-contrast type',
    radiusSm: 4,
    radiusMd: 6,
    modes: {
      light: {
        bg: '#FAFAF7', surface: '#FFFFFF', elevated: '#F0EFE9',
        fg: '#111110', muted: '#63635E', border: '#131311',
        accent: '#4D7C0F', accentInk: '#FFFFFF',
        success: '#4D7C0F', warning: '#B45309', error: '#DC2626', info: '#1D4ED8',
        shadow: 'none',
      },
      dark: {
        bg: '#09090B', surface: '#101013', elevated: '#27272A',
        fg: '#FAFAFA', muted: '#A1A1AA', border: '#3F3F46',
        accent: '#DFE104', accentInk: '#000000',
        success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#60A5FA',
        shadow: 'none',
      },
    },
  },
};

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && (THEME_IDS as string[]).includes(value);
}

export function isModeSetting(value: string | null | undefined): value is ThemeModeSetting {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemeTokens(themeId: ThemeId, mode: ResolvedMode): ThemeModeTokens {
  return THEMES[themeId].modes[mode];
}
