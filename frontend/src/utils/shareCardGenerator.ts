import type { ShareCardConfig, ShareCardFormat, AchievementTier } from '../types/streaks';
import { TRACKIYO_PATH } from '../components/layout/TrackiyoLogo';
import { getThemeTokens, isThemeId, type ThemeId, type ResolvedMode } from '../theme/themes';

interface Dimensions {
  width: number;
  height: number;
}

// Strictly 1:1 Square format (1080x1080) for optimal Instagram, WhatsApp, X, and LinkedIn sharing
const DIMENSIONS: Record<ShareCardFormat, Dimensions> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1080 },
  landscape: { width: 1080, height: 1080 }
};

interface ThemeColors {
  bgGradientStart: string;
  bgGradientEnd: string;
  cardBg: string;
  cardBorder: string;
  cardInnerGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  defaultAccent: string;
  defaultGlow: string;
  logoStart: string;
  logoEnd: string;
  logoInk: string;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(99, 102, 241, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveShareCardColors(themeId?: string, mode: ResolvedMode = 'dark'): ThemeColors {
  const isDark = mode === 'dark';
  let tid: ThemeId = 'midnight';
  if (themeId && isThemeId(themeId)) {
    tid = themeId;
  } else if (themeId === 'focus') {
    tid = 'forest';
  } else if (themeId === 'gold') {
    tid = 'warm';
  } else if (themeId === 'minimal') {
    tid = 'monochrome';
  }

  const tokens = getThemeTokens(tid, mode);

  if (isDark) {
    return {
      bgGradientStart: tokens.background,
      bgGradientEnd: tokens.surfaceSecondary || tokens.surface,
      cardBg: tokens.surface,
      cardBorder: tokens.border || 'rgba(255, 255, 255, 0.12)',
      cardInnerGlow: tokens.primarySubtle || 'rgba(255, 255, 255, 0.04)',
      textPrimary: tokens.textPrimary || '#FFFFFF',
      textSecondary: tokens.textSecondary || '#CBD5E1',
      textMuted: tokens.textMuted || '#64748B',
      defaultAccent: tokens.primary || '#6366F1',
      defaultGlow: hexToRgba(tokens.primary, 0.3),
      logoStart: tokens.primaryHover || tokens.primary,
      logoEnd: tokens.primaryActive || tokens.primary,
      logoInk: tokens.primaryInk || '#FFFFFF'
    };
  } else {
    return {
      bgGradientStart: tokens.background,
      bgGradientEnd: tokens.surfaceSecondary || '#ECEFF4',
      cardBg: tokens.surface,
      cardBorder: tokens.border || 'rgba(203, 213, 225, 0.85)',
      cardInnerGlow: tokens.primarySubtle || 'rgba(0, 0, 0, 0.02)',
      textPrimary: tokens.textPrimary || '#0F172A',
      textSecondary: tokens.textSecondary || '#475569',
      textMuted: tokens.textMuted || '#64748B',
      defaultAccent: tokens.primary || '#4F46E5',
      defaultGlow: hexToRgba(tokens.primary, 0.18),
      logoStart: tokens.primaryHover || tokens.primary,
      logoEnd: tokens.primaryActive || tokens.primary,
      logoInk: tokens.primaryInk || '#FFFFFF'
    };
  }
}

interface TierPalette {
  name: string;
  accent: string;
  accentLight: string;
  glow: string;
  pillBg: string;
  pillBorder: string;
  badgeBg: string;
}

const TIER_PALETTES: Record<AchievementTier, TierPalette> = {
  bronze: {
    name: 'BRONZE',
    accent: '#D97706',
    accentLight: '#F59E0B',
    glow: 'rgba(217, 119, 6, 0.35)',
    pillBg: 'rgba(180, 83, 9, 0.2)',
    pillBorder: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'rgba(180, 83, 9, 0.15)'
  },
  silver: {
    name: 'SILVER',
    accent: '#94A3B8',
    accentLight: '#E2E8F0',
    glow: 'rgba(148, 163, 184, 0.35)',
    pillBg: 'rgba(148, 163, 184, 0.2)',
    pillBorder: 'rgba(203, 213, 225, 0.5)',
    badgeBg: 'rgba(148, 163, 184, 0.15)'
  },
  gold: {
    name: 'GOLD',
    accent: '#F59E0B',
    accentLight: '#FDE047',
    glow: 'rgba(245, 158, 11, 0.38)',
    pillBg: 'rgba(245, 158, 11, 0.22)',
    pillBorder: 'rgba(251, 191, 36, 0.55)',
    badgeBg: 'rgba(245, 158, 11, 0.18)'
  },
  platinum: {
    name: 'PLATINUM',
    accent: '#06B6D4',
    accentLight: '#38BDF8',
    glow: 'rgba(6, 182, 212, 0.38)',
    pillBg: 'rgba(6, 182, 212, 0.22)',
    pillBorder: 'rgba(56, 189, 248, 0.55)',
    badgeBg: 'rgba(6, 182, 212, 0.18)'
  }
};

/**
 * Splits text into lines fitting within a given max pixel width.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[n];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Draws a rounded rectangle path with cross-browser fallback.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * High-performance 1:1 HTML5 Canvas Share Card Renderer.
 * Tailored specifically for achievements, streaks, and focus records in pure square (1080x1080) format.
 */
export async function generateShareCardCanvas(config: ShareCardConfig): Promise<HTMLCanvasElement> {
  const resolvedMode: ResolvedMode = config.themeMode || (config.theme === 'minimal' ? 'light' : 'dark');
  const targetThemeId = config.themeId || (isThemeId(config.theme) ? config.theme : (config.theme as string));
  const { width, height } = DIMENSIONS.square;
  const colors = resolveShareCardColors(targetThemeId, resolvedMode);

  // Resolve tier and tier palette
  const rawTier = (config.tier || 'bronze').toLowerCase() as AchievementTier;
  const tierPalette = TIER_PALETTES[rawTier] || TIER_PALETTES.bronze;

  // Determine type: is this an achievement card?
  const isAchievement =
    config.type === 'achievement' ||
    Boolean(config.achievementId) ||
    Boolean(config.xp) ||
    (typeof config.metricValue === 'string' &&
      (config.metricValue.includes('XP') ||
        config.metricValue.includes('TIER') ||
        config.metricValue.includes('UNLOCKED') ||
        config.metricValue.includes('AWARDED')));

  const isFocus = config.type === 'focus';
  const isChallenge = config.type === 'challenge';

  // Resolve challenge attributes if challenge card
  const challengeData = config.challengeData;
  let chMyScore = challengeData?.myScore;
  let chTheirScore = challengeData?.theirScore;
  let chOpponent = challengeData?.opponentName;

  if (chMyScore === undefined || chTheirScore === undefined || !chOpponent) {
    const match = config.subtitle?.match(/^(\d+)\s*[-—]\s*(\d+)\s+vs\s+(.+)$/i);
    if (match) {
      if (chMyScore === undefined) chMyScore = parseInt(match[1], 10);
      if (chTheirScore === undefined) chTheirScore = parseInt(match[2], 10);
      if (!chOpponent) chOpponent = match[3].trim();
    }
  }

  const myScore = typeof chMyScore === 'number' && !isNaN(chMyScore) ? chMyScore : 0;
  const theirScore = typeof chTheirScore === 'number' && !isNaN(chTheirScore) ? chTheirScore : 0;
  const opponentName = chOpponent || 'Opponent';
  const isCompleted = challengeData?.status === 'completed';
  const hasWon = Boolean(challengeData?.hasWon || (isCompleted && myScore > theirScore));
  const isDraw = Boolean(challengeData?.isDraw || (isCompleted && myScore === theirScore));
  const isLeading = challengeData?.isLeading !== undefined ? challengeData.isLeading : (myScore > theirScore);
  const isBehind = myScore < theirScore;

  // Primary accent & glow for this card
  let cardAccent = isAchievement ? tierPalette.accent : colors.defaultAccent;
  let cardAccentLight = isAchievement ? tierPalette.accentLight : colors.defaultAccent;
  let cardGlow = isAchievement ? tierPalette.glow : colors.defaultGlow;

  if (isChallenge) {
    if (hasWon) {
      cardAccent = '#10B981';
      cardAccentLight = '#34D399';
      cardGlow = 'rgba(16, 185, 129, 0.35)';
    } else if (isLeading) {
      cardAccent = colors.defaultAccent;
      cardAccentLight = colors.defaultAccent;
      cardGlow = colors.defaultGlow;
    } else if (isDraw) {
      cardAccent = '#F59E0B';
      cardAccentLight = '#FBBF24';
      cardGlow = 'rgba(245, 158, 11, 0.35)';
    } else if (isBehind) {
      cardAccent = '#F43F5E';
      cardAccentLight = '#FDA4AF';
      cardGlow = 'rgba(244, 63, 94, 0.35)';
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from canvas');

  // Enable crisp text rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Outer Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, colors.bgGradientStart);
  bgGrad.addColorStop(1, colors.bgGradientEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient radial glow behind the card
  const bgGlow = ctx.createRadialGradient(width * 0.5, height * 0.42, 20, width * 0.5, height * 0.42, width * 0.48);
  bgGlow.addColorStop(0, cardGlow);
  bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Central Framed Card Container (1:1 with 64px padding)
  const pad = 64;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const cardRadius = 36;
  const centerX = width / 2;

  // Draw Card Shadow & Fill
  ctx.save();
  drawRoundRect(ctx, pad, pad, cardW, cardH, cardRadius);
  ctx.fillStyle = colors.cardBg;
  ctx.fill();

  // Draw Card Border
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.cardBorder;
  ctx.stroke();

  // Subtle inner highlight line along the top inside of the card
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.cardInnerGlow;
  ctx.stroke();
  ctx.restore();

  // 4. Subtle decorative geometric corner sparkles
  ctx.save();
  ctx.fillStyle = cardAccentLight;
  ctx.globalAlpha = 0.35;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', pad + 38, pad + 38);
  ctx.fillText('✦', pad + cardW - 38, pad + 38);
  ctx.restore();

  // 5. Branding Header (Logo + Brand Name)
  ctx.save();
  const headerY = pad + 54;
  const logoSize = 34;
  const logoX = centerX - 82;
  const logoY = headerY - 17;

  // Logo squircle
  drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 9);
  const logoGrad = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
  logoGrad.addColorStop(0, colors.logoStart || colors.defaultAccent);
  logoGrad.addColorStop(1, colors.logoEnd || colors.defaultAccent);
  ctx.fillStyle = logoGrad;
  ctx.fill();

  // Subtle border on squircle
  ctx.strokeStyle = colors.logoInk === '#FFFFFF' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw modern vector logomark
  const iconPixel = Math.round(logoSize * 0.65);
  const iconOffset = (logoSize - iconPixel) / 2;
  ctx.save();
  ctx.translate(logoX + iconOffset, logoY + iconOffset);
  ctx.scale(iconPixel / 100, iconPixel / 100);
  ctx.fillStyle = colors.logoInk || '#FFFFFF';
  if (typeof Path2D !== 'undefined') {
    ctx.fill(new Path2D(TRACKIYO_PATH));
  } else {
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', 50, 50);
  }
  ctx.restore();

  // Brand text
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = colors.textPrimary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRACKIYO', logoX + logoSize + 12, headerY);
  ctx.restore();

  // 6. Tier / Milestone Pill Badge
  let pillText = '';
  if (isAchievement) {
    pillText = `✦ ${tierPalette.name} ACHIEVEMENT ✦`;
  } else if (isFocus) {
    pillText = `⚡ DEEP FOCUS SESSION`;
  } else if (isChallenge) {
    if (hasWon) {
      pillText = `🏆 CHALLENGE VICTORY ✦`;
    } else if (isCompleted && isDraw) {
      pillText = `⚡ TIED SHOWDOWN ✦`;
    } else if (isLeading) {
      pillText = `🔥 LEADING THE DUEL ✦`;
    } else if (isBehind) {
      pillText = `⚔️ STREAK DUEL IN PROGRESS`;
    } else {
      pillText = `⚔️ HEAD-TO-HEAD DUEL`;
    }
  } else {
    pillText = `🔥 ${tierPalette.name} STREAK RECORD`;
  }

  ctx.save();
  const pillY = pad + 115;
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  const pillTextWidth = ctx.measureText(pillText).width;
  const pillW = pillTextWidth + 36;
  const pillH = 32;
  const pillX = centerX - pillW / 2;

  drawRoundRect(ctx, pillX, pillY - pillH / 2, pillW, pillH, 16);
  ctx.fillStyle = isAchievement ? tierPalette.pillBg : 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isAchievement ? tierPalette.pillBorder : cardAccent;
  ctx.stroke();

  ctx.fillStyle = cardAccentLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, centerX, pillY + 0.5);
  ctx.restore();

  // 7. Hero Badge Ornament & Icon Position Calculation
  // Dynamically centers content vertically if no custom quote is provided,
  // and smoothly adjusts upward when a custom quote is present.
  const outerBadgeRadius = 66;
  const topLimit = pad + 155; // ~219 (just below top milestone pill)
  const bottomLimit = pad + cardH - 100; // ~916 (just above footer divider line)
  const usableHeight = bottomLimit - topLimit; // ~697px
  const hasQuote = Boolean(!isChallenge && config.customMessage && config.customMessage.trim());

  let badgeCenterY = pad + 235; // Default for challenge cards (which fill canvas with arena box)

  if (isAchievement) {
    const titleText = (config.title || 'Achievement Unlocked').toUpperCase();
    let titleFontSize = 46;
    if (titleText.length > 24) titleFontSize = 36;
    else if (titleText.length > 18) titleFontSize = 40;
    const titleH = titleFontSize + 20;

    const rewardH = 34 + 28; // pill height + gap
    const descText = config.subtitle || config.description || 'Milestone achieved with consistency on Trackiyo';
    const descLines = wrapText(ctx, descText, 740);
    const descH = Math.min(3, descLines.length) * 32;

    const quoteLines = hasQuote ? wrapText(ctx, `“${config.customMessage!.trim().slice(0, 110)}”`, 700) : [];
    const quoteH = hasQuote ? (32 + Math.min(2, quoteLines.length) * 28) : 0;

    // Total content block height: Badge (132) + Gap (26) + Title + Reward + Description + Quote
    const totalBlockH = (outerBadgeRadius * 2) + 26 + titleH + rewardH + descH + quoteH;
    const startY = topLimit + Math.max(0, (usableHeight - totalBlockH) / 2);
    badgeCenterY = Math.round(startY + outerBadgeRadius);

  } else if (isFocus) {
    const metricH = 64 + 22; // metric font + gap
    const titleH = 26 + 18;  // title font + gap
    const subH = config.subtitle ? 24 : 0;

    const quoteLines = hasQuote ? wrapText(ctx, `“${config.customMessage!.trim().slice(0, 110)}”`, 700) : [];
    const quoteH = hasQuote ? (32 + Math.min(2, quoteLines.length) * 28) : 0;

    const totalBlockH = (outerBadgeRadius * 2) + 26 + metricH + titleH + subH + quoteH;
    const startY = topLimit + Math.max(0, (usableHeight - totalBlockH) / 2);
    badgeCenterY = Math.round(startY + outerBadgeRadius);

  } else if (!isChallenge) {
    // Streak cards
    const metricH = 66 + 22;
    const titleH = 26 + 18;
    const subH = config.subtitle ? 24 : 0;

    const quoteLines = hasQuote ? wrapText(ctx, `“${config.customMessage!.trim().slice(0, 110)}”`, 700) : [];
    const quoteH = hasQuote ? (32 + Math.min(2, quoteLines.length) * 28) : 0;

    const totalBlockH = (outerBadgeRadius * 2) + 26 + metricH + titleH + subH + quoteH;
    const startY = topLimit + Math.max(0, (usableHeight - totalBlockH) / 2);
    badgeCenterY = Math.round(startY + outerBadgeRadius);
  }

  ctx.save();
  // Radial glow around badge
  const badgeGlow = ctx.createRadialGradient(
    centerX, badgeCenterY, 20,
    centerX, badgeCenterY, outerBadgeRadius + 60
  );
  badgeGlow.addColorStop(0, cardGlow);
  badgeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = badgeGlow;
  ctx.fillRect(centerX - 150, badgeCenterY - 150, 300, 300);

  // Outer decorative halo ring
  ctx.beginPath();
  ctx.arc(centerX, badgeCenterY, outerBadgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = isAchievement ? tierPalette.badgeBg : 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = cardAccent;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(centerX, badgeCenterY, outerBadgeRadius - 9, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.stroke();

  // Flanking micro-sparkles around badge
  ctx.fillStyle = cardAccentLight;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', centerX - outerBadgeRadius - 20, badgeCenterY);
  ctx.fillText('✦', centerX + outerBadgeRadius + 20, badgeCenterY);

  // Hero Emoji Icon
  let heroIcon = config.icon;
  if (!heroIcon || heroIcon === '🎯') {
    if (isAchievement) heroIcon = '🏆';
    else if (isFocus) heroIcon = '⚡';
    else if (isChallenge) {
      heroIcon = hasWon ? '🏆' : isLeading ? '🔥' : isDraw ? '⚡' : '⚔️';
    } else heroIcon = '🔥';
  }

  ctx.font = '64px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(heroIcon, centerX, badgeCenterY + 4);
  ctx.restore();

  // 8. Main Content Layout (Tailored for Achievement vs Streak vs Focus vs Challenge)
  let cursorY = isChallenge ? (pad + 348) : (badgeCenterY + outerBadgeRadius + 26);

  if (isAchievement) {
    // =========================================================================
    // ACHIEVEMENT CARD LAYOUT
    // Prominent Title -> XP / Reward Pill -> Description -> Custom Quote
    // =========================================================================

    // A. Achievement Title (The Hero!)
    ctx.save();
    const titleText = (config.title || 'Achievement Unlocked').toUpperCase();
    let titleFontSize = 46;
    if (titleText.length > 24) titleFontSize = 36;
    else if (titleText.length > 18) titleFontSize = 40;

    ctx.font = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Drop shadow for crispness
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillText(titleText, centerX, cursorY);
    ctx.restore();

    cursorY += titleFontSize + 20;

    // B. Reward / Metric Pill (e.g. "+80 XP EARNED" or "ACHIEVEMENT UNLOCKED")
    ctx.save();
    const rewardText = config.metricValue || (config.xp ? `+${config.xp} XP EARNED` : 'ACHIEVEMENT UNLOCKED');
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    const rewardW = ctx.measureText(rewardText).width + 36;
    const rewardH = 34;

    drawRoundRect(ctx, centerX - rewardW / 2, cursorY, rewardW, rewardH, 17);
    ctx.fillStyle = isAchievement ? tierPalette.pillBg : 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = cardAccent;
    ctx.stroke();

    ctx.fillStyle = cardAccentLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rewardText, centerX, cursorY + rewardH / 2);
    ctx.restore();

    cursorY += rewardH + 28;

    // C. Achievement Description (Wrapped cleanly)
    const descriptionText = config.subtitle || config.description || 'Milestone achieved with consistency on Trackiyo';
    ctx.save();
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const descLines = wrapText(ctx, descriptionText, 740);
    const lineHeight = 32;
    descLines.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, centerX, cursorY + index * lineHeight);
    });
    ctx.restore();

    cursorY += descLines.length * lineHeight;

  } else if (isFocus) {
    // =========================================================================
    // FOCUS CARD LAYOUT
    // Focus Minutes Highlight -> Focus Session Title -> Subtitle
    // =========================================================================
    ctx.save();
    const focusMetric = config.metricValue || `${config.metric || 'Focus Time'}`;
    ctx.font = '900 64px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(focusMetric.toUpperCase(), centerX, cursorY);
    ctx.restore();

    cursorY += 72;

    ctx.save();
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = cardAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((config.title || 'Deep Focus Session').toUpperCase(), centerX, cursorY);
    ctx.restore();

    cursorY += 36;

    if (config.subtitle) {
      ctx.save();
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(config.subtitle, centerX, cursorY);
      ctx.restore();
      cursorY += 28;
    }

  } else if (isChallenge) {
    // =========================================================================
    // HIGH-IMPACT HEAD-TO-HEAD DUEL SHOWDOWN CARD LAYOUT
    // =========================================================================

    // 1. Challenge Title
    const titleText = (config.title || 'Friend Challenge').toUpperCase();
    ctx.save();
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillText(titleText, centerX, 372);
    ctx.restore();

    // 2. Subtitle with Parameters
    let subtitleText = '';
    if (challengeData?.targetMetric && challengeData?.durationDays) {
      subtitleText = `🎯 Target: ${challengeData.targetMetric} ${challengeData.targetUnit || 'daily'} • 📅 ${challengeData.durationDays}-Day Battle`;
    } else if (challengeData?.durationDays) {
      subtitleText = `📅 ${challengeData.durationDays}-Day Consistency Duel`;
    } else {
      subtitleText = '⚔️ Head-to-Head Streak Duel';
    }

    ctx.save();
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(subtitleText, centerX, 418);
    ctx.restore();

    // 3. Head-to-Head Arena Container (Glassmorphic Showdown Box)
    const boxX = centerX - 380;
    const boxY = 452;
    const boxW = 760;
    const boxH = 236;
    const isLight = resolvedMode === 'light';

    ctx.save();
    drawRoundRect(ctx, boxX, boxY, boxW, boxH, 24);
    const arenaGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
    arenaGrad.addColorStop(0, isLight ? 'rgba(0, 0, 0, 0.035)' : 'rgba(255, 255, 255, 0.05)');
    arenaGrad.addColorStop(1, isLight ? 'rgba(0, 0, 0, 0.015)' : 'rgba(255, 255, 255, 0.015)');
    ctx.fillStyle = arenaGrad;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Top border soft highlight
    ctx.beginPath();
    ctx.moveTo(boxX + 24, boxY);
    ctx.lineTo(boxX + boxW - 24, boxY);
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Left Column: YOU
    const leftCenterX = centerX - 190;
    ctx.save();
    ctx.font = '800 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = (hasWon || isLeading) ? cardAccentLight : colors.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const youTag = hasWon ? '👑 YOU (WINNER)' : isLeading ? '🔥 YOU (LEADING)' : 'YOU';
    ctx.fillText(youTag, leftCenterX, 474);

    // Your Big Score
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.shadowColor = (hasWon || isLeading) ? cardGlow : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = (hasWon || isLeading) ? 14 : 4;
    ctx.fillText(`${myScore}`, leftCenterX, 498);

    // Your Metric Label
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.shadowBlur = 0;
    ctx.fillText('POINTS', leftCenterX, 576);
    ctx.restore();

    // Center Vertical Lines & "VS" Emblem
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, 472);
    ctx.lineTo(centerX, 508);
    ctx.moveTo(centerX, 562);
    ctx.lineTo(centerX, 596);
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // VS Circle Badge
    const vsY = 534;
    const vsRadius = 24;
    ctx.beginPath();
    ctx.arc(centerX, vsY, vsRadius, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? '#FFFFFF' : '#0B0F19';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cardAccent;
    ctx.stroke();

    ctx.font = '900 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = cardAccentLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', centerX, vsY + 1);
    ctx.restore();

    // Right Column: OPPONENT
    const rightCenterX = centerX + 190;
    ctx.save();
    ctx.font = '800 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = (!hasWon && isCompleted && !isDraw) ? '#34D399' : (isBehind ? '#FDA4AF' : colors.textSecondary);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const oppTag = (!hasWon && isCompleted && !isDraw)
      ? `👑 ${opponentName.slice(0, 12).toUpperCase()} (WINNER)`
      : opponentName.slice(0, 16).toUpperCase();
    ctx.fillText(oppTag, rightCenterX, 474);

    // Opponent's Big Score
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${theirScore}`, rightCenterX, 498);

    // Opponent's Metric Label
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.shadowBlur = 0;
    ctx.fillText('POINTS', rightCenterX, 576);
    ctx.restore();

    // Duel Progress Split Bar
    const barX = centerX - 330;
    const barY = 612;
    const barW = 660;
    const barH = 14;
    const totalPoints = myScore + theirScore;
    const myRatio = totalPoints === 0 ? 0.5 : Math.max(0.12, Math.min(0.88, myScore / totalPoints));
    const myBarW = Math.round(barW * myRatio);

    ctx.save();
    // Track background
    drawRoundRect(ctx, barX, barY, barW, barH, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    // Left Bar (You)
    drawRoundRect(ctx, barX, barY, myBarW, barH, 7);
    const leftBarGrad = ctx.createLinearGradient(barX, barY, barX + myBarW, barY);
    leftBarGrad.addColorStop(0, cardAccent);
    leftBarGrad.addColorStop(1, '#38BDF8');
    ctx.fillStyle = leftBarGrad;
    ctx.fill();

    // Right Bar (Opponent)
    const oppBarX = barX + myBarW + 2;
    const oppBarW = Math.max(0, barW - myBarW - 2);
    if (oppBarW > 0) {
      drawRoundRect(ctx, oppBarX, barY, oppBarW, barH, 7);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fill();
    }

    // Split Bar Micro-labels
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const myPct = totalPoints === 0 ? 50 : Math.round((myScore / totalPoints) * 100);
    ctx.fillText(`${myPct}% (${myScore} pts)`, barX, 636);

    ctx.textAlign = 'center';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.fillText(`TOTAL ${totalPoints} PTS`, centerX, 637);

    ctx.textAlign = 'right';
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textSecondary;
    const theirPct = totalPoints === 0 ? 50 : 100 - myPct;
    ctx.fillText(`${theirPct}% (${theirScore} pts)`, barX + barW, 636);
    ctx.restore();

    // 4. Match Status Banner Capsule (Y = 712)
    ctx.save();
    let bannerText = '';
    let bannerBg = 'rgba(255, 255, 255, 0.08)';
    let bannerBorder = 'rgba(255, 255, 255, 0.2)';
    let bannerColor = colors.textPrimary;

    if (hasWon) {
      bannerText = `🏆 VICTORY ACHIEVED • ${myScore} — ${theirScore}`;
      bannerBg = 'rgba(16, 185, 129, 0.16)';
      bannerBorder = 'rgba(16, 185, 129, 0.5)';
      bannerColor = '#34D399';
    } else if (isCompleted && isDraw) {
      bannerText = `⚡ TIED SHOWDOWN • HONORABLE DRAW (${myScore} — ${theirScore})`;
      bannerBg = 'rgba(245, 158, 11, 0.16)';
      bannerBorder = 'rgba(245, 158, 11, 0.5)';
      bannerColor = '#FBBF24';
    } else if (isLeading) {
      const diff = myScore - theirScore;
      bannerText = `🔥 CURRENTLY IN THE LEAD (+${diff} ${diff === 1 ? 'POINT' : 'POINTS'} AHEAD)`;
      bannerBg = 'rgba(99, 102, 241, 0.18)';
      bannerBorder = 'rgba(99, 102, 241, 0.5)';
      bannerColor = '#A5B4FC';
    } else if (isBehind) {
      const diff = theirScore - myScore;
      bannerText = `⚔️ IN THE HUNT • ${diff} ${diff === 1 ? 'POINT' : 'POINTS'} TO EQUALIZE`;
      bannerBg = 'rgba(244, 63, 94, 0.15)';
      bannerBorder = 'rgba(244, 63, 94, 0.45)';
      bannerColor = '#FDA4AF';
    } else {
      bannerText = `⚡ NECK AND NECK • TIED AT ${myScore} — ${theirScore}`;
      bannerBg = 'rgba(255, 255, 255, 0.08)';
      bannerBorder = 'rgba(255, 255, 255, 0.22)';
      bannerColor = colors.textPrimary;
    }

    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const bannerW = ctx.measureText(bannerText).width + 48;
    const bannerH = 38;
    const bannerY = 712;

    drawRoundRect(ctx, centerX - bannerW / 2, bannerY, bannerW, bannerH, 19);
    ctx.fillStyle = bannerBg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = bannerBorder;
    ctx.stroke();

    ctx.fillStyle = bannerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, centerX, bannerY + bannerH / 2);
    ctx.restore();

    // 5. Metadata Feature Ribbon Chips (Y = 774)
    ctx.save();
    const chipW = 236;
    const chipH = 36;
    const chipGap = 26;
    const ribbonStartX = boxX;
    const ribbonY = 774;

    const chips = [
      { text: `🎯 Target: ${challengeData?.targetMetric || 1} ${challengeData?.targetUnit || 'daily'}`, x: ribbonStartX },
      { text: `📅 ${challengeData?.durationDays || 7} Days Challenge`, x: ribbonStartX + chipW + chipGap },
      { text: '🛡️ Trackiyo Verified Duel', x: ribbonStartX + (chipW + chipGap) * 2 }
    ];

    chips.forEach(chip => {
      drawRoundRect(ctx, chip.x, ribbonY, chipW, chipH, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.stroke();

      ctx.font = '600 12.5px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chip.text, chip.x + chipW / 2, ribbonY + chipH / 2);
    });
    ctx.restore();

    // 6. Custom or Motivational Quote (Y = 836)
    ctx.save();
    const challengeQuote = config.customMessage
      ? `“${config.customMessage.trim().slice(0, 110)}”`
      : '“Consistency beats talent when talent forgets to show up.”';
    ctx.font = 'italic 500 17px system-ui, -apple-system, Georgia, serif';
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(challengeQuote, centerX, 836);
    ctx.restore();

  } else {
    // =========================================================================
    // STREAK CARD LAYOUT
    // Streak Number Days -> Streak Name -> Subtitle
    // =========================================================================
    ctx.save();
    const streakHeadline = config.metricValue || `${config.streakCount || 1} DAYS`;
    ctx.font = '900 66px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(streakHeadline.toUpperCase(), centerX, cursorY);
    ctx.restore();

    cursorY += 72;

    ctx.save();
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = cardAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((config.title || 'Consistency Streak').toUpperCase(), centerX, cursorY);
    ctx.restore();

    cursorY += 36;

    if (config.subtitle) {
      ctx.save();
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(config.subtitle, centerX, cursorY);
      ctx.restore();
      cursorY += 28;
    }
  }

  // 9. Optional Personal Custom Quote (non-challenge cards)
  if (!isChallenge && config.customMessage && config.customMessage.trim()) {
    ctx.save();
    ctx.font = 'italic 500 20px system-ui, -apple-system, Georgia, serif';
    ctx.fillStyle = colors.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const quoteY = cursorY + 30;
    const quoteLines = wrapText(ctx, `“${config.customMessage.trim().slice(0, 110)}”`, 700);
    const qLineHeight = 28;
    quoteLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, centerX, quoteY + i * qLineHeight);
    });
    ctx.restore();
  }

  // 10. Card Footer: User Handle & Verified Trackiyo Branding
  const footerY = pad + cardH - 52;
  const footerLineY = footerY - 26;

  ctx.save();
  // Divider line
  ctx.beginPath();
  ctx.moveTo(pad + 44, footerLineY);
  ctx.lineTo(pad + cardW - 44, footerLineY);
  ctx.strokeStyle = colors.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Left side: User Handle / Member tag
  if (config.includeUsername && config.username) {
    const handle = `@${config.username.toLowerCase().replace(/\s+/g, '')}`;
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(handle, pad + 44, footerY);
  } else {
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Verified Consistency Record', pad + 44, footerY);
  }

  // Right side: trackiyo.com branding mark
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = colors.textMuted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('trackiyo.com', pad + cardW - 44, footerY);

  // Tiny dot next to trackiyo.com
  ctx.beginPath();
  ctx.arc(pad + cardW - 44 - ctx.measureText('trackiyo.com').width - 12, footerY, 4, 0, Math.PI * 2);
  ctx.fillStyle = cardAccent;
  ctx.fill();
  ctx.restore();

  return canvas;
}

export async function generateShareCardBlob(config: ShareCardConfig): Promise<Blob> {
  const canvas = await generateShareCardCanvas(config);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image blob from canvas'));
    }, 'image/png', 1.0);
  });
}

export async function generateShareCardDataUrl(config: ShareCardConfig): Promise<string> {
  const canvas = await generateShareCardCanvas(config);
  return canvas.toDataURL('image/png', 1.0);
}

export function downloadBlob(blob: Blob, filename = 'trackiyo-achievement.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
