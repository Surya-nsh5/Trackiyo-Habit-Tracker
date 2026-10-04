export type ChallengeType = 'focus' | 'habit' | 'task' | 'consistency';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled';
export type ScoringMode = 'binary_daily' | 'capped_ratio';

export interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  allowChallenges: boolean;
  showStreaks: boolean;
  showAchievements: boolean;
  since?: string;
  streakCount?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId?: string;
  toUserId?: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  allowChallenges: boolean;
  relationship: 'none' | 'pending' | 'accepted' | 'declined' | 'blocked';
  isPendingSender?: boolean;
}

export interface ChallengeDayProgress {
  dayNumber: number;
  date: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  myChecked?: boolean;
  theirChecked?: boolean;
}

export interface ChallengeReaction {
  id: string;
  from_user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChallengeSummary {
  id: string;
  title: string;
  challengeType: ChallengeType;
  targetMetric: number;
  targetUnit: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  isCreator: boolean;
  myScore: number;
  theirScore: number;
  myTodayCheckedIn?: boolean;
  theirTodayCheckedIn?: boolean;
  opponent: {
    id: string;
    name: string;
    avatar: string | null;
  };
  winnerId: string | null;
  isDraw: boolean;
  shareToken?: string | null;
  createdAt: string;
}

export interface ChallengeDetail extends ChallengeSummary {
  myTodayMet: boolean;
  theirTodayMet: boolean;
  myCheckedIn: boolean;
  theirCheckedIn: boolean;
  days: ChallengeDayProgress[];
  reactions: ChallengeReaction[];
}

export interface PublicChallengeData {
  title: string;
  challengeType: ChallengeType;
  targetMetric: number;
  targetUnit: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  creatorName: string;
  opponentName: string;
  creatorScore: number;
  opponentScore: number;
  isDraw: boolean;
  winnerName: string | null;
  status: ChallengeStatus;
}
