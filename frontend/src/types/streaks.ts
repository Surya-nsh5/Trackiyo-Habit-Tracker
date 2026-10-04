export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type AchievementCategory = 'consistency' | 'focus' | 'tasks' | 'goals' | 'habits' | 'productivity';

export interface StreakSummary {
  id: string;
  type: 'habit' | 'focus' | 'tasks' | 'wellness' | 'overall' | 'custom';
  name: string;
  icon: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string | null;
  completedToday: boolean;
  thisMonthCompletions?: number;
  monthlyGoal?: number;
}

export interface StreakCalendarDay {
  date: string;
  isCompleted: boolean;
  isGrace: boolean;
  status: 'completed' | 'grace' | 'pending' | 'missed';
}

export interface StreakMilestone {
  days: number;
  reached: boolean;
  isCurrent: boolean;
  progressPercent: number;
}

export interface StreakDetailData {
  id: string;
  type: string;
  name: string;
  icon: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  calendarDays: StreakCalendarDay[];
  milestoneProgress: StreakMilestone[];
  totalCompletions: number;
}

export interface ExtendedAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  tier: AchievementTier;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: string | null;
  progress?: { done: number; total: number } | null;
}

export type ShareCardFormat = 'story' | 'square' | 'landscape';
export type ShareCardTheme = 'dark' | 'minimal' | 'focus' | 'gold';

export interface ChallengeShareData {
  opponentName: string;
  myScore: number;
  theirScore: number;
  targetMetric?: number;
  targetUnit?: string;
  durationDays?: number;
  status?: string;
  winnerName?: string | null;
  isLeading?: boolean;
  isDraw?: boolean;
  hasWon?: boolean;
  challengeType?: string;
}

export interface ShareCardConfig {
  title: string;
  subtitle?: string;
  metricValue?: string;
  metricLabel?: string;
  metric?: string;
  type?: string;
  icon?: string;
  streakCount?: number;
  tier?: AchievementTier;
  theme?: ShareCardTheme;
  themeId?: string;
  themeMode?: 'light' | 'dark';
  format?: ShareCardFormat;
  customMessage?: string;
  includeUsername?: boolean;
  username?: string;
  includeAvatar?: boolean;
  avatarUrl?: string | null;
  description?: string;
  xp?: number;
  category?: string;
  achievementId?: string;
  challengeData?: ChallengeShareData;
}

export interface PublicShareRecord {
  id?: string;
  token: string;
  title: string;
  subtitle?: string;
  metric_value?: string;
  metric_label?: string;
  streak_count?: number;
  tier: AchievementTier;
  theme: ShareCardTheme;
  custom_message?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  format?: ShareCardFormat;
  is_revoked?: boolean;
  views_count?: number;
  created_at?: string;
}
