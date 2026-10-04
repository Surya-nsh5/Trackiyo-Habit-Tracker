import { create } from 'zustand';
import type { ProductivityScoreBreakdown } from '../types';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';
import { useFocusStore } from './useFocusStore';
import { getLocalTodayStr } from '../utils/dailyTracking';

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
}

interface AnalyticsState {
  calculateProductivityScore: () => ProductivityScoreBreakdown;
  generateSmartInsights: () => SmartInsight[];
}

export const useAnalyticsStore = create<AnalyticsState>(() => ({

  calculateProductivityScore: () => {
    const todayStr = getLocalTodayStr();
    const tasks = useTaskStore.getState().tasks;
    const { habits, habitLogs, wellnessLogs } = useHabitStore.getState();
    const { todayTotalMinutes } = useFocusStore.getState();

    // 1. Task Score (0-35 points)
    const todayTasks = tasks.filter(t => t.due_date && t.due_date.slice(0, 10) === todayStr);
    let taskScore = 20; // baseline
    if (todayTasks.length > 0) {
      const completed = todayTasks.filter(t => t.is_completed).length;
      taskScore = Math.round((completed / todayTasks.length) * 35);
    } else if (tasks.length > 0) {
      const completedTotal = tasks.filter(t => t.is_completed).length;
      taskScore = Math.min(35, Math.round((completedTotal / tasks.length) * 35));
    }

    // 2. Habit Score (0-35 points)
    let habitScore = 20;
    if (habits.length > 0) {
      const completedHabits = habits.filter(h => habitLogs[`${h.id}_${todayStr}`] === true).length;
      habitScore = Math.round((completedHabits / habits.length) * 35);
    }

    // 3. Focus Score (0-15 points)
    // 50 minutes of focus earns full 15 points
    const focusScore = Math.min(15, Math.round((todayTotalMinutes / 50) * 15));

    // 4. Wellness Score (0-15 points)
    const todayWellness = wellnessLogs[todayStr];
    let wellnessScore = 5;
    if (todayWellness) {
      if (todayWellness.mood != null) wellnessScore += 5;
      if (todayWellness.sleep != null) wellnessScore += 5;
    }

    const total = Math.min(100, Math.max(10, taskScore + habitScore + focusScore + wellnessScore));

    return {
      score: total,
      tasksScore: taskScore,
      habitsScore: habitScore,
      focusScore: focusScore,
      wellnessScore: wellnessScore,
      dateStr: todayStr
    };
  },

  generateSmartInsights: () => {
    const tasks = useTaskStore.getState().tasks;
    const { habits, habitLogs, wellnessLogs } = useHabitStore.getState();
    const { sessions } = useFocusStore.getState();
    const todayStr = getLocalTodayStr();

    const insights: SmartInsight[] = [];

    // Insight 1: Task completion velocity
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr);

    if (overdueTasks.length > 0) {
      insights.push({
        id: 'ins-overdue',
        type: 'warning',
        title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        description: `Prioritize "${overdueTasks[0].title}" to prevent bottlenecking your sprint progress.`
      });
    } else if (completedTasks > 5) {
      insights.push({
        id: 'ins-tasks-velocity',
        type: 'positive',
        title: 'Strong Task Execution',
        description: `You've closed ${completedTasks} tasks with zero overdue items. Great momentum!`
      });
    }

    // Insight 2: Habit consistency
    if (habits.length > 0) {
      const todayDone = habits.filter(h => habitLogs[`${h.id}_${todayStr}`] === true).length;
      if (todayDone === habits.length) {
        insights.push({
          id: 'ins-habits-perfect',
          type: 'positive',
          title: '100% Habits Kept Today',
          description: `All ${habits.length} daily habits checked off. Your routine consistency is exceptional.`
        });
      } else {
        insights.push({
          id: 'ins-habits-pending',
          type: 'info',
          title: `${habits.length - todayDone} Habit(s) Pending`,
          description: 'Keep your streak alive by checking off remaining habits before midnight.'
        });
      }
    }

    // Insight 3: Deep work focus
    const totalFocusMinutes = Math.round(sessions.reduce((a, b) => a + (b.duration || 0), 0) / 60);
    if (totalFocusMinutes > 60) {
      insights.push({
        id: 'ins-focus-high',
        type: 'positive',
        title: 'Deep Work Champion',
        description: `Logged over ${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m of distraction-free focus sessions.`
      });
    } else {
      insights.push({
        id: 'ins-focus-tip',
        type: 'info',
        title: 'Focus Stacking Tip',
        description: 'Link your next 25-minute Pomodoro session to a high-priority task for rapid progress.'
      });
    }

    // Insight 4: Wellness correlation
    const recentWellness = Object.entries(wellnessLogs)
      .filter(([d]) => d >= todayStr.slice(0, 7))
      .map(([, val]) => val);

    if (recentWellness.length >= 3) {
      const validSleep = recentWellness.filter(w => w.sleep != null).map(w => w.sleep as number);
      if (validSleep.length > 0) {
        const avgSleep = (validSleep.reduce((a, b) => a + b, 0) / validSleep.length).toFixed(1);
        insights.push({
          id: 'ins-wellness-corr',
          type: 'info',
          title: 'Rest & Stamina',
          description: `You are averaging ${avgSleep} hours of sleep this month. Consistent rest correlates with 28% higher focus efficiency.`
        });
      }
    }

    return insights;
  }
}));
