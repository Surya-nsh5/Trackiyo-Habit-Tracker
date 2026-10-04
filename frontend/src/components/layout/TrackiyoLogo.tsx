import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { getThemeTokens } from '../../theme/themes';

export interface TrackiyoLogoProps {
  /** Pixel size (width & height) of the logo icon. Default 32. */
  size?: number;
  /** Visual presentation style */
  variant?: 'accent' | 'gradient' | 'glyph' | 'monochrome';
  /** Additional CSS class for the logo icon/container */
  className?: string;
  /** Whether to display the TRACKIYO brand text beside the logo */
  showText?: boolean;
  /** Additional CSS classes for the brand text */
  textClassName?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional title attribute */
  title?: string;
}

export const TRACKIYO_PATH = "M 27 21 H 73 C 76.8 21 80 24.2 80 28 C 80 31.8 76.8 35 73 35 H 57 V 62 C 57 66.5 60 69.5 64.5 69.5 C 67.5 69.5 70.5 68 72.5 65.5 L 80 73.5 C 75.5 78.5 70 81.5 63 81.5 C 51.5 81.5 43 73 43 62 V 35 H 27 C 23.2 35 20 31.8 20 28 C 20 24.2 23.2 21 27 21 Z";

export const TrackiyoLogo: React.FC<TrackiyoLogoProps> = ({
  size = 32,
  variant = 'accent',
  className = '',
  showText = false,
  textClassName = '',
  onClick,
  title = 'Trackiyo',
}) => {
  const themeId = useThemeStore((s) => s.themeId);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const mode = isDarkMode ? 'dark' : 'light';
  const tokens = getThemeTokens(themeId, mode);

  const iconPixel = Math.round(size * 0.65);
  const cornerRadius = Math.max(6, Math.round(size * 0.28));

  const primary = tokens?.primary || 'var(--primary, #171717)';
  const primaryHover = tokens?.primaryHover || primary;
  const primaryActive = tokens?.primaryActive || primary;
  const primaryInk = tokens?.primaryInk || 'var(--primary-ink, #FFFFFF)';

  const renderIcon = () => {
    if (variant === 'glyph') {
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className={`shrink-0 max-w-full h-auto transition-colors duration-200 ${className}`}
          fill={className.includes('text-') ? 'currentColor' : primary}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d={TRACKIYO_PATH} />
        </svg>
      );
    }

    if (variant === 'gradient') {
      // Dynamic multi-stop theme gradient with glass shine & themed glow
      const gradBg =
        themeId === 'monochrome'
          ? isDarkMode
            ? 'linear-gradient(135deg, #FFFFFF 0%, #E5E5E5 50%, #CCCCCC 100%)'
            : 'linear-gradient(135deg, #262626 0%, #171717 50%, #0A0A0A 100%)'
          : `linear-gradient(135deg, ${primaryHover} 0%, ${primary} 50%, ${primaryActive} 100%)`;

      return (
        <div
          className={`shrink-0 relative overflow-hidden flex items-center justify-center select-none transition-all duration-200 ${className}`}
          style={{
            width: size,
            height: size,
            borderRadius: cornerRadius,
            background: gradBg,
            boxShadow: `0 4px 14px color-mix(in srgb, ${primary} 32%, transparent)`,
          }}
          title={title}
        >
          {/* Subtle inner glass highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: cornerRadius,
              border: `1.5px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.35)'}`,
            }}
          />
          <svg
            viewBox="0 0 100 100"
            width={iconPixel}
            height={iconPixel}
            fill={primaryInk}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="transition-colors duration-200"
          >
            <path d={TRACKIYO_PATH} />
          </svg>
        </div>
      );
    }

    if (variant === 'monochrome') {
      return (
        <div
          className={`shrink-0 flex items-center justify-center bg-foreground text-background shadow-xs select-none transition-all duration-200 ${className}`}
          style={{
            width: size,
            height: size,
            borderRadius: cornerRadius,
          }}
          title={title}
        >
          <svg
            viewBox="0 0 100 100"
            width={iconPixel}
            height={iconPixel}
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d={TRACKIYO_PATH} />
          </svg>
        </div>
      );
    }

    // Default: 'accent' - Dynamic theme squircle with subtle depth & theme glow
    const accentBg =
      themeId === 'monochrome'
        ? isDarkMode
          ? '#FFFFFF'
          : '#171717'
        : `linear-gradient(135deg, ${primaryHover} 0%, ${primary} 100%)`;

    return (
      <div
        className={`shrink-0 relative overflow-hidden flex items-center justify-center select-none transition-all duration-200 ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: cornerRadius,
          background: accentBg,
          boxShadow: `0 2px 8px color-mix(in srgb, ${primary} 25%, transparent)`,
        }}
        title={title}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: cornerRadius,
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.28)'}`,
          }}
        />
        <svg
          viewBox="0 0 100 100"
          width={iconPixel}
          height={iconPixel}
          fill={primaryInk}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="transition-colors duration-200"
        >
          <path d={TRACKIYO_PATH} />
        </svg>
      </div>
    );
  };

  if (!showText) {
    return onClick ? (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer bg-transparent border-none p-0 inline-flex items-center"
      >
        {renderIcon()}
      </button>
    ) : (
      renderIcon()
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 min-w-0 max-w-full ${onClick ? 'cursor-pointer group' : ''}`}
      title={title}
    >
      {renderIcon()}
      <span
        className={
          textClassName ||
          'font-bold text-sm tracking-[0.14em] text-foreground uppercase truncate min-w-0'
        }
      >
        TRACKIYO
      </span>
    </div>
  );
};
