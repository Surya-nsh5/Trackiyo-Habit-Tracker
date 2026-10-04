// ==============================================================================
// TRACKIYO 2.0 SYSTEM TYPES
// ==============================================================================

// Life Areas
export type LifeAreaName =
  | 'Career'
  | 'Learning'
  | 'Fitness'
  | 'Personal'
  | 'Finance'
  | 'Health'
  | 'General'
  | string;

export interface LifeArea {
  id: string;
  name: LifeAreaName;
  color?: string;
  icon?: string;
}

// Tasks
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'backlog' | 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  endAfterOccurrences?: number;
  endDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string; // area / category
  status?: TaskStatus;
  due_date: string | null;
  start_date?: string | null;
  goal_id?: string | null;
  estimated_duration?: number; // minutes
  actual_duration?: number; // minutes
  tags?: string[];
  subtasks?: Subtask[];
  recurrence?: RecurrenceRule | null;
  recurrence_parent_id?: string | null;
  parent_task_id?: string | null;
  depends_on_task_id?: string | null;
  priority_score?: number;
  energy_level?: EnergyLevel | string;
  notes?: string;
  order_index?: number;
  created_at: string;
  updated_at?: string;
  is_completed: boolean;
}

// Goals
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  description: string;
  area: LifeAreaName;
  priority: TaskPriority;
  target_date: string | null;
  status: GoalStatus;
  progress: number; // 0 - 100
  color: string;
  created_at?: string;
  updated_at?: string;
}


// Habits
export type HabitFrequency = 'daily' | 'weekdays' | 'weekend' | 'weekends' | 'weekly' | 'custom' | string;

export interface Habit {
  id: string;
  name: string;
  icon: string;
  monthly_goal: number;
  frequency?: HabitFrequency;
  target_days_per_week?: number;
  specific_days?: number[];
  area?: LifeAreaName;
  order_index?: number;
  created_at?: string;
}

// Key format for HabitLog: `${habitId}_${year}-${month}-${day}` (e.g. 'h1_2026-06-01')
export type HabitLog = Record<string, boolean>;

// Wellness
export interface WellnessData {
  mood: number | null; // 1-10
  sleep: number | null; // hours
  energy?: number | null; // 1-10
  water?: number | null; // glasses
  notes?: string;
  activities?: string[];
}

// Key format for WellnessLog: `${year}-${month}-${day}`
export type WellnessLog = Record<string, WellnessData>;

export interface MonthData {
  year: number;
  month: number; // 0-11
  habitLogs: HabitLog;
  wellnessLogs: WellnessLog;
}

// Focus Mode
export type FocusSessionType = 'pomodoro' | 'short_break' | 'long_break' | 'custom' | 'stopwatch';

export interface FocusSession {
  id: string;
  task_id?: string | null;
  duration: number; // seconds
  session_type: FocusSessionType;
  notes?: string;
  completed_at: string;
  created_at?: string;
}

// Journal
export interface JournalEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood?: number | null;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}



// Gamification
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  category?: 'consistency' | 'focus' | 'tasks' | 'goals' | 'habits' | 'productivity' | string;
  xp?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  gamification_enabled: boolean;
  unlocked_achievements: string[];
}

// Productivity / Life Score
export interface ProductivityScoreBreakdown {
  score: number; // 0-100
  tasksScore: number;
  habitsScore: number;
  focusScore: number;
  wellnessScore: number;
  dateStr: string;
}

// Search
export type SearchResultType = 'task' | 'habit' | 'journal';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  date?: string;
  badge?: string;
}

// ==============================================================================
// PHASE 1 TYPES – Quick Capture, Time Blocking, Deep Work, Command Palette
// ==============================================================================

export interface Capture {
  id: string;
  content: string;
  tags?: string[];
  source?: string;
  created_at: string;
}

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface TimeBlock {
  id: string;
  task_id?: string | null;
  title?: string | null;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  block_date?: string; // YYYY-MM-DD
  color?: string;
  created_at?: string;
}

export interface DeepWorkSession {
  id: string;
  task_id?: string | null;
  start_timestamp: string;
  end_timestamp?: string | null;
  duration_minutes?: number;
  created_at?: string;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  action: () => void;
  category: 'navigate' | 'task' | 'capture' | 'action' | 'ai';
}

export interface Distraction {
  id: string;
  focus_session_id?: string | null;
  reason: string;
  logged_at: string;
}

// ==============================================================================
// PHASE 2 TYPES – Habit Stacking, Templates, Achievements Log, Productivity Profile
// ==============================================================================

export interface HabitStack {
  id: string;
  name: string;
  habit_ids: string[];
  trigger?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  created_at?: string;
  updated_at?: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'task' | 'habit' | 'routine';
  template_data: Record<string, unknown>;
  is_public?: boolean;
  created_at?: string;
}

export interface AchievementLogEntry {
  id: string;
  achievement_id: string;
  earned_at: string;
  xp_awarded: number;
}

export interface ProductivityProfile {
  totalTasksCompleted: number;
  totalFocusMinutes: number;
  currentHabitStreaks: Record<string, number>;
  avgMood: number;
  avgSleep: number;
  productivityScore: number;
  level: number;
  xp: number;
  topCategory: string;
  weeklyTaskCompletion: number[];
}

// ==============================================================================
// PHASE 3 TYPES – AI Coaching, Natural Language, Predictive Blocking
// ==============================================================================

export type CoachingMode = 'balanced' | 'strict' | 'supportive' | 'minimal' | 'focus';

export interface CoachAction {
  id: string;
  type: 'create_task' | 'reschedule_task' | 'complete_task' | 'create_habit' | 'start_focus' | 'breakdown_goal';
  label: string;
  description?: string;
  payload: any;
  status?: 'pending' | 'applied' | 'cancelled';
}

export interface CoachMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: CoachAction[];
  mode?: CoachingMode;
}

export interface CoachSession {
  id: string;
  messages: CoachMessage[];
  created_at: string;
}

export interface DailyPlan {
  id?: string;
  plan_date: string;
  plan_json: DailyPlanBlock[];
  created_at?: string;
  updated_at?: string;
}

export interface DailyPlanBlock {
  time: string; // HH:MM
  duration_minutes: number;
  title: string;
  type: 'task' | 'habit' | 'break' | 'focus' | 'event';
  task_id?: string | null;
  habit_id?: string | null;
  is_suggested?: boolean;
}

export interface EnergyProfile {
  morning: EnergyLevel;
  afternoon: EnergyLevel;
  evening: EnergyLevel;
}

export interface SmartPrioritySuggestion {
  task_id: string;
  score: number;
  reasoning: string;
}

// Global build variables injected by Vite
declare global {
  const __TRACKIYO_VERSION__: string;
  const __TRACKIYO_BUILD__: string;
}


