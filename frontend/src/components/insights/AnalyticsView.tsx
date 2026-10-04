import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFocusStore } from '../../store/useFocusStore';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useToday } from '../../hooks/useToday';
import { addDaysStr, computeStreaks, isHabitApplicableOn } from '../../utils/dailyTracking';
import {
  FiZap, FiAlertTriangle, FiInfo,
  FiTrendingUp, FiCheckCircle, FiClock, FiSmile, FiMoon, FiActivity, FiBarChart2
} from 'react-icons/fi';
import { ContributionHeatmap, type ContributionDay } from './ContributionHeatmap';

const TopCharts = lazy(() => import('./TopCharts').then(m => ({ default: m.TopCharts })));

export const AnalyticsView: React.FC = () => {
  const todayStr = useToday();
  const { tasks } = useTaskStore();
  const { habits, habitLogs, wellnessLogs } = useHabitStore();
  const { sessions } = useFocusStore();
  const { calculateProductivityScore, generateSmartInsights } = useAnalyticsStore();

  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);
  const [heatmapTab, setHeatmapTab] = useState<'HABITS' | 'FOCUS'>('HABITS');

  const productivity = calculateProductivityScore();
  const smartInsights = generateSmartInsights();

  // 1. 53-week Habit Consistency Heatmap Data Map
  const habitHeatmapMap = useMemo(() => {
    const map: Record<string, { value: number; count: number; total: number; detailText?: string }> = {};
    for (let i = 0; i < 371; i++) {
      const d = addDaysStr(todayStr, -i);
      let done = 0;
      let applicable = 0;
      habits.forEach(h => {
        if (isHabitApplicableOn(h, d)) {
          applicable++;
          if (habitLogs[`${h.id}_${d}`] === true) done++;
        }
      });
      const pct = applicable > 0 ? Math.round((done / applicable) * 100) : 0;
      map[d] = {
        value: pct,
        count: done,
        total: applicable,
        detailText: applicable > 0 ? `${done}/${applicable} habits completed` : 'No active habits scheduled'
      };
    }
    return map;
  }, [habits, habitLogs, todayStr]);

  // 2. 53-week Focus Volume Heatmap Data Map
  const focusHeatmapMap = useMemo(() => {
    const map: Record<string, { value: number; count: number; total: number; detailText?: string }> = {};
    sessions.forEach(s => {
      if (s.completed_at) {
        const d = s.completed_at.slice(0, 10);
        const mins = Math.round((s.duration || 0) / 60);
        if (!map[d]) {
          map[d] = { value: 0, count: 0, total: 0 };
        }
        map[d].value += mins;
        map[d].count += 1;
      }
    });

    Object.keys(map).forEach(d => {
      const mins = map[d].value;
      const count = map[d].count;
      map[d].detailText = `${mins}m focus (${count} session${count === 1 ? '' : 's'})`;
    });

    return map;
  }, [sessions]);

  const totalYearHabits = useMemo(() => {
    return Object.values(habitHeatmapMap).reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [habitHeatmapMap]);

  const totalYearFocusMins = useMemo(() => {
    return Object.values(focusHeatmapMap).reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [focusHeatmapMap]);

  const calculateHabitLevel = (value: number, count?: number): 0 | 1 | 2 | 3 | 4 => {
    if (!count || value === 0) return 0;
    if (value <= 25) return 1;
    if (value <= 50) return 2;
    if (value <= 75) return 3;
    return 4;
  };

  const formatHabitTooltip = (day: ContributionDay) => {
    if (day.value === 0 || !day.count) {
      return `No habits completed on ${day.dateStr}`;
    }
    return `${day.dateStr}: ${day.value}% completion (${day.count}/${day.total} habits)`;
  };

  const calculateFocusLevel = (value: number): 0 | 1 | 2 | 3 | 4 => {
    if (value <= 0) return 0;
    if (value <= 25) return 1;
    if (value <= 50) return 2;
    if (value <= 90) return 3;
    return 4;
  };

  const formatFocusTooltip = (day: ContributionDay) => {
    if (day.value <= 0) {
      return `No focus sessions on ${day.dateStr}`;
    }
    return `${day.dateStr}: ${day.value} minutes of deep focus (${day.count || 1} session${(day.count || 1) === 1 ? '' : 's'})`;
  };



  // Date range
  const dateRange = useMemo(() => {
    const dates: string[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      dates.push(addDaysStr(todayStr, -i));
    }
    return dates;
  }, [periodDays, todayStr]);


  // Overall aggregates across period
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr).length;
  const totalFocusMins = sessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  // Consistency & Streak Computations
  const {
    overallCompletionRate,
    weeklyConsistency,
    monthlyConsistency,
    topCurrentStreak,
    topLongestStreak,
    habitStats
  } = useMemo(() => {
    let totalApplicable = 0;
    let totalDone = 0;
    let daysWithHabitsLast7 = 0;
    let daysWithHabitsLast30 = 0;

    // Last 7 days consistency
    for (let i = 0; i < 7; i++) {
      const d = addDaysStr(todayStr, -i);
      const doneToday = habits.some(h => habitLogs[`${h.id}_${d}`] === true);
      if (doneToday) daysWithHabitsLast7++;
    }

    // Last 30 days consistency
    for (let i = 0; i < 30; i++) {
      const d = addDaysStr(todayStr, -i);
      const doneToday = habits.some(h => habitLogs[`${h.id}_${d}`] === true);
      if (doneToday) daysWithHabitsLast30++;
    }

    let maxCurrent = 0;
    let maxLongest = 0;

    const stats = habits.map(h => {
      const streaks = computeStreaks(
        h.id,
        habitLogs,
        h.created_at?.slice(0, 10) || '2026-01-01',
        todayStr
      );
      if (streaks.current > maxCurrent) maxCurrent = streaks.current;
      if (streaks.longest > maxLongest) maxLongest = streaks.longest;

      // Period completion rate for this habit
      let hApplicable = 0;
      let hDone = 0;
      dateRange.forEach(d => {
        if (isHabitApplicableOn(h, d)) {
          hApplicable++;
          if (habitLogs[`${h.id}_${d}`] === true) {
            hDone++;
          }
        }
      });

      totalApplicable += hApplicable;
      totalDone += hDone;

      const rate = hApplicable > 0 ? Math.round((hDone / hApplicable) * 100) : 0;

      return {
        habit: h,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        completionRate: rate,
        completedCount: hDone,
        applicableCount: hApplicable
      };
    });

    const overallRate = totalApplicable > 0 ? Math.round((totalDone / totalApplicable) * 100) : 0;
    const weeklyConst = Math.round((daysWithHabitsLast7 / 7) * 100);
    const monthlyConst = Math.round((daysWithHabitsLast30 / 30) * 100);

    return {
      overallCompletionRate: overallRate,
      weeklyConsistency: weeklyConst,
      monthlyConsistency: monthlyConst,
      topCurrentStreak: maxCurrent,
      topLongestStreak: maxLongest,
      habitStats: stats
    };
  }, [habits, habitLogs, todayStr, dateRange]);

  // Wellness trends summary
  const wellnessAverages = useMemo(() => {
    let moodSum = 0, moodCount = 0;
    let sleepSum = 0, sleepCount = 0;
    let energySum = 0, energyCount = 0;

    dateRange.forEach(d => {
      const w = wellnessLogs[d];
      if (w) {
        if (typeof w.mood === 'number') { moodSum += w.mood; moodCount++; }
        if (typeof w.sleep === 'number') { sleepSum += w.sleep; sleepCount++; }
        if (typeof w.energy === 'number') { energySum += w.energy; energyCount++; }
      }
    });

    return {
      avgMood: moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '—',
      avgSleep: sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : '—',
      avgEnergy: energyCount > 0 ? (energySum / energyCount).toFixed(1) : '—',
      loggedDays: Math.max(moodCount, sleepCount)
    };
  }, [dateRange, wellnessLogs]);

  return (
    <div className="analytics-view-container h-full w-full max-w-full min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 outline-none">
      <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col gap-3 md:gap-4 relative">

      {/* Top Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 flex-shrink-0 w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex items-center gap-2.5 break-words min-w-0">
            <FiBarChart2 className="text-accent shrink-0" size={20} />
            Analytics & Insights
          </h1>
          <p className="text-xs text-secondary-text mt-0.5">
            Review your productivity score, habit consistency, and deep work trends.
          </p>
        </div>

        <div className="flex items-center flex-wrap max-w-full min-w-0 bg-surface-secondary rounded-lg border border-border-subtle p-0.5 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriodDays(7)}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${periodDays === 7 ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-muted hover:text-foreground'}`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriodDays(30)}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${periodDays === 30 ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-muted hover:text-foreground'}`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriodDays(90)}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${periodDays === 90 ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-muted hover:text-foreground'}`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* 1. Primary Metrics Grid (Fulfilling: Habit completion rate, Weekly/Monthly consistency, Current/Longest streak, Tasks, Focus) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 flex-shrink-0">
        {/* Habit Completion Rate */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Habit Rate</span>
            <FiCheckCircle size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold text-accent tabular-nums my-1">{overallCompletionRate}%</span>
          <span className="text-[10px] text-muted truncate">Past {periodDays} days</span>
        </div>

        {/* Weekly Consistency */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Weekly Run</span>
            <FiTrendingUp size={14} className="text-success" />
          </div>
          <span className="text-2xl font-bold text-success tabular-nums my-1">{weeklyConsistency}%</span>
          <span className="text-[10px] text-muted truncate">7-day active days</span>
        </div>

        {/* Monthly Consistency */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Monthly Run</span>
            <FiTrendingUp size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold text-foreground tabular-nums my-1">{monthlyConsistency}%</span>
          <span className="text-[10px] text-muted truncate">30-day active days</span>
        </div>

        {/* Current & Longest Streak */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Top Streak</span>
            <span className="text-warning text-xs">🔥</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold text-warning tabular-nums">{topCurrentStreak}d</span>
            <span className="text-[11px] text-muted">/ {topLongestStreak}d pb</span>
          </div>
          <span className="text-[10px] text-muted truncate">Current / Longest</span>
        </div>

        {/* Tasks Completed */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Tasks Done</span>
            <span className="w-2 h-2 rounded-full bg-success" />
          </div>
          <span className="text-2xl font-bold text-foreground tabular-nums my-1">{completedTasks}</span>
          <span className="text-[10px] text-muted truncate">{overdueTasks > 0 ? `${overdueTasks} overdue` : `${totalTasks} total`}</span>
        </div>

        {/* Focus Time */}
        <div className="gsap-stat-card bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-[0.1em]">Focus Time</span>
            <FiClock size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold text-accent tabular-nums my-1">{totalFocusMins}m</span>
          <span className="text-[10px] text-muted truncate">{sessions.length} sessions logged</span>
        </div>
      </div>

      {/* 2. Wellness Trends Banner */}
      <div className="bg-surface border border-border/80 rounded-xl p-4 md:p-5 shadow-xs w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FiSmile className="text-accent" size={16} />
            <h3 className="text-xs font-bold tracking-[0.14em] uppercase text-foreground">Wellness Vitality Averages</h3>
          </div>
          <span className="text-[10px] text-muted font-medium">Recorded across {wellnessAverages.loggedDays} days in window</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 min-w-0">
          <div className="bg-surface-secondary border border-border-subtle p-3 rounded-lg flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <FiSmile size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-secondary-text block">Avg Mood</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{wellnessAverages.avgMood} <span className="text-xs font-normal text-muted">/ 10</span></span>
            </div>
          </div>

          <div className="bg-surface-secondary border border-border-subtle p-3 rounded-lg flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-info/15 border border-info/30 flex items-center justify-center text-info shrink-0">
              <FiMoon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-secondary-text block">Avg Sleep</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{wellnessAverages.avgSleep} <span className="text-xs font-normal text-muted">hrs</span></span>
            </div>
          </div>

          <div className="bg-surface-secondary border border-border-subtle p-3 rounded-lg flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-warning/15 border border-warning/30 flex items-center justify-center text-warning shrink-0">
              <FiActivity size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-secondary-text block">Avg Energy</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{wellnessAverages.avgEnergy} <span className="text-xs font-normal text-muted">/ 10</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Smart Insights */}
      <div className="bg-surface border border-border/80 rounded-xl p-4 md:p-5 shadow-xs w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <FiZap className="text-accent" size={16} />
          <h3 className="text-xs font-bold tracking-[0.14em] uppercase text-foreground">Actionable Behavioral Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {smartInsights.map(ins => (
            <div
              key={ins.id}
              className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between min-w-0 break-words ${ins.type === 'positive' ? 'bg-success/5 border-success/30 text-foreground' :
                ins.type === 'warning' ? 'bg-warning/5 border-warning/30 text-foreground' :
                  'bg-surface-secondary border-border-subtle text-foreground'
                }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1 min-w-0">
                {ins.type === 'positive' && <FiZap className="text-success shrink-0" size={14} />}
                {ins.type === 'warning' && <FiAlertTriangle className="text-warning shrink-0" size={14} />}
                {ins.type === 'info' && <FiInfo className="text-accent shrink-0" size={14} />}
                <span className="min-w-0 flex-1 break-words">{ins.title}</span>
              </div>
              <p className="text-secondary-text text-[11px] leading-relaxed break-words [overflow-wrap:anywhere]">{ins.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TopCharts Monthly Breakdown */}
      <div className="w-full max-w-full min-w-0">
        <Suspense fallback={<div className="h-48 bg-surface border border-border/70 rounded-xl animate-pulse" />}>
          <TopCharts />
        </Suspense>
      </div>

      {/* 5. GitHub-Style Contribution Heatmap with Built-In Switcher (One Heatmap at a Time) */}
      {(() => {
        const heatmapSwitcher = (
          <div className="grid grid-cols-2 sm:flex sm:items-center bg-surface-secondary rounded-lg border border-border-subtle p-0.5 text-xs font-semibold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setHeatmapTab('HABITS')}
              className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap ${
                heatmapTab === 'HABITS'
                  ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FiCheckCircle size={13} className={heatmapTab === 'HABITS' ? 'text-accent shrink-0' : 'shrink-0'} />
              <span>Habit Consistency</span>
            </button>
            <button
              type="button"
              onClick={() => setHeatmapTab('FOCUS')}
              className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap ${
                heatmapTab === 'FOCUS'
                  ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FiClock size={13} className={heatmapTab === 'FOCUS' ? 'text-accent shrink-0' : 'shrink-0'} />
              <span>Focus Volume</span>
            </button>
          </div>
        );

        return (
          <div className="w-full max-w-full min-w-0">
            {heatmapTab === 'HABITS' ? (
              <ContributionHeatmap
                title="Habit Consistency Activity"
                subtitle="Daily Completion %"
                todayStr={todayStr}
                dataMap={habitHeatmapMap}
                calculateLevel={calculateHabitLevel}
                formatTooltip={formatHabitTooltip}
                totalSummaryLabel="habit completions in the last year"
                totalSummaryValue={totalYearHabits}
                infoNote="Daily habit completion percentage across all scheduled routines"
                colorScheme="theme"
                headerRight={heatmapSwitcher}
              />
            ) : (
              <ContributionHeatmap
                title="Focus Session Volume"
                subtitle="Minutes / Day"
                todayStr={todayStr}
                dataMap={focusHeatmapMap}
                calculateLevel={calculateFocusLevel}
                formatTooltip={formatFocusTooltip}
                totalSummaryLabel="hours of dedicated deep work logged"
                totalSummaryValue={`${(totalYearFocusMins / 60).toFixed(1)} hrs`}
                infoNote="Daily focus session minutes logged in flow timer"
                colorScheme="theme"
                headerRight={heatmapSwitcher}
              />
            )}
          </div>
        );
      })()}

      {/* 6. Habit-Specific Statistics Table (Requirement: Habit-specific statistics) */}
      <div className="bg-surface border border-border/80 rounded-xl p-4 md:p-5 shadow-xs w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0 mb-3">
          <h3 className="text-xs font-bold tracking-[0.14em] uppercase text-foreground">Habit-Specific Performance Breakdown</h3>
          <span className="text-[10px] text-muted">{habitStats.length} habits tracked</span>
        </div>

        {habitStats.length === 0 ? (
          <p className="text-xs text-muted italic py-6 text-center">No habits available yet. Add habits to view individual statistics.</p>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[420px] custom-scrollbar border border-border/40 rounded-lg w-full max-w-full min-w-0">
            <table className="w-full min-w-[560px] text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-surface border-b border-border/70 shadow-xs">
                <tr className="text-secondary-text text-[10px] uppercase font-bold tracking-[0.1em]">
                  <th className="py-2.5 px-3 bg-surface">Habit</th>
                  <th className="py-2.5 px-3 bg-surface">Category</th>
                  <th className="py-2.5 px-3 text-center bg-surface">Current Streak</th>
                  <th className="py-2.5 px-3 text-center bg-surface">Best Streak</th>
                  <th className="py-2.5 px-3 text-right bg-surface">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {habitStats.map(({ habit, currentStreak, longestStreak, completionRate, completedCount, applicableCount }) => (
                  <tr key={habit.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 font-medium text-foreground min-w-0 max-w-full">
                        <span className="text-base shrink-0">{habit.icon || '🎯'}</span>
                        <span className="truncate max-w-[120px] sm:max-w-[220px]">{habit.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[10px] uppercase tracking-wider text-secondary-text px-2 py-0.5 bg-surface-secondary rounded border border-border-subtle">
                        {habit.area || habit.frequency || 'Daily'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-bold text-foreground px-2 py-0.5 rounded bg-surface-secondary">
                        <span className={`text-[11px] ${currentStreak > 0 ? 'opacity-100' : 'opacity-40 grayscale'}`}>🔥</span>
                        {currentStreak}d
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted font-medium whitespace-nowrap">
                      {longestStreak}d
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border-subtle hidden sm:block">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-accent tabular-nums">{completionRate}%</span>
                        <span className="text-[10px] text-muted">({completedCount}/{applicableCount})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Life & Productivity Composite Score Breakdown */}
      <div className="bg-surface border border-border/80 rounded-xl p-4 md:p-5 text-xs shadow-xs">
        <h4 className="font-bold text-foreground uppercase tracking-[0.1em] mb-3">Composite Productivity Score Breakdown</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center min-w-0">
          <div className="bg-surface-secondary border border-border-subtle p-2.5 rounded-lg min-w-0 break-words">
            <span className="text-secondary-text block text-[10px] uppercase font-bold mb-0.5">Tasks</span>
            <span className="font-bold text-accent text-sm">{productivity.tasksScore} / 35</span>
          </div>
          <div className="bg-surface-secondary border border-border-subtle p-2.5 rounded-lg min-w-0 break-words">
            <span className="text-secondary-text block text-[10px] uppercase font-bold mb-0.5">Habits</span>
            <span className="font-bold text-accent text-sm">{productivity.habitsScore} / 35</span>
          </div>
          <div className="bg-surface-secondary border border-border-subtle p-2.5 rounded-lg min-w-0 break-words">
            <span className="text-secondary-text block text-[10px] uppercase font-bold mb-0.5">Focus</span>
            <span className="font-bold text-accent text-sm">{productivity.focusScore} / 15</span>
          </div>
          <div className="bg-surface-secondary border border-border-subtle p-2.5 rounded-lg min-w-0 break-words">
            <span className="text-secondary-text block text-[10px] uppercase font-bold mb-0.5">Wellness</span>
            <span className="font-bold text-accent text-sm">{productivity.wellnessScore} / 15</span>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
};
