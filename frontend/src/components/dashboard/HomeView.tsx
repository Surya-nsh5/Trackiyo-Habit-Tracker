import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFocusStore } from '../../store/useFocusStore';
import { useStreakStore } from '../../store/useStreakStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToday } from '../../hooks/useToday';
import { getWeekDates, getDayCompletion, computeStreaks } from '../../utils/dailyTracking';
import {
  FiPlus, FiAlertCircle, FiCheck, FiClock, FiActivity,
  FiChevronRight, FiSmile, FiMoon, FiCheckSquare,
  FiArrowRight, FiCalendar
} from 'react-icons/fi';


export const HomeView: React.FC = () => {
  const todayStr = useToday();
  const { user } = useAuthStore();
  const { tasks, toggleTask, addTask } = useTaskStore();
  const { habits, habitLogs, wellnessLogs, toggleHabitLog, addHabit } = useHabitStore();
  const { todayTotalMinutes } = useFocusStore();
  const { overall, fetchStreaks } = useStreakStore();

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickHabitName, setQuickHabitName] = useState('');
  const habitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  // Tasks calculations
  const todayTasks = useMemo(() => {
    return tasks.filter(t => !t.due_date || t.due_date.slice(0, 10) === todayStr);
  }, [tasks, todayStr]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr);
  }, [tasks, todayStr]);

  const completedTodayTasks = useMemo(() => {
    return todayTasks.filter(t => t.is_completed).length;
  }, [todayTasks]);

  // Habits calculations
  const completedHabitsCount = useMemo(() => {
    return habits.filter(h => habitLogs[`${h.id}_${todayStr}`] === true).length;
  }, [habits, habitLogs, todayStr]);

  // Total daily percentage
  const totalItems = habits.length + todayTasks.length;
  const totalCompleted = completedHabitsCount + completedTodayTasks;
  const todayCompletionPercentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Wellness status
  const wellnessToday = wellnessLogs[todayStr];
  const isWellnessLogged = !!(wellnessToday?.mood || wellnessToday?.sleep);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Weekly progress (Mon -> Sun) for the week containing today
  const weekDays = useMemo(() => {
    const dates = getWeekDates(0, todayStr);
    return dates.map(d => ({
      ...d,
      ...getDayCompletion(d.dateStr, habits, habitLogs)
    }));
  }, [todayStr, habits, habitLogs]);



  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    await addTask({
      title: quickTaskTitle.trim(),
      description: '',
      priority: 'Medium',
      category: 'Work',
      due_date: todayStr
    });
    setQuickTaskTitle('');
  };

  const handleQuickAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHabitName.trim()) return;
    await addHabit(quickHabitName.trim(), '⚡', 28, 'daily');
    setQuickHabitName('');
  };

  const focusTargetMinutes = 120;
  const focusProgress = Math.min(Math.round((todayTotalMinutes / focusTargetMinutes) * 100), 100);

  return (
    <div className="h-full w-full max-w-full min-w-0 flex flex-col min-h-0 bg-background overflow-hidden transition-colors duration-200">
      <div className="w-full max-w-full min-w-0 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6">
        <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col space-y-4 sm:space-y-5">

        {/* ------------------------------------------------------------- */}
        {/* 1. TOP HEADER & GREETING HERO                                 */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4.5 flex-shrink-0 w-full max-w-full min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {/* Meta badges: Date & Live Execution Indicator */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-secondary border border-border-subtle text-secondary-text shadow-2xs">
                <FiCalendar size={12} className="text-accent" />
                {formattedDate}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors shadow-2xs ${
                todayCompletionPercentage >= 80
                  ? 'bg-success/15 border-success/30 text-success'
                  : todayCompletionPercentage >= 40
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'bg-warning/15 border-warning/30 text-warning'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  todayCompletionPercentage >= 80 ? 'bg-success animate-pulse' : todayCompletionPercentage >= 40 ? 'bg-accent' : 'bg-warning'
                }`} />
                {todayCompletionPercentage >= 80
                  ? 'High Execution'
                  : todayCompletionPercentage >= 40
                    ? 'Steady Momentum'
                    : 'Getting Started'}
              </span>
            </div>

            {/* Personalized Greeting */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex flex-wrap items-center gap-2 mt-0.5 min-w-0 break-words">
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{greeting}, {user?.name || 'Surya'}</span>
              <span className="text-lg sm:text-xl shrink-0">👋</span>
            </h1>

            {/* Motivational Execution Copy */}
            <p className="text-xs sm:text-sm text-secondary-text font-medium leading-relaxed min-w-0 break-words">
              {todayCompletionPercentage >= 80
                ? 'High execution today! All routines on track.'
                : todayCompletionPercentage >= 40
                  ? 'Steady momentum. Complete your routines to keep your streak.'
                  : 'One routine at a time to build your daily rhythm.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'HABITS' } }))}
              className="px-3.5 py-2 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-secondary-text hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              All Habits
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'FOCUS' } }))}
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiClock size={13} strokeWidth={2.5} />
              <span>Start Focus</span>
            </button>
          </div>
        </div>

        {/* Overdue alert banner if present */}
        {overdueTasks.length > 0 && (
          <div className="gsap-dash-card flex flex-col sm:flex-row sm:items-center justify-between bg-error/10 border border-error/25 text-error p-3.5 rounded-xl text-xs font-semibold gap-2.5 sm:gap-3 shadow-xs w-full max-w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <FiAlertCircle size={16} className="shrink-0 text-error" />
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} require attention: "{overdueTasks[0].title}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleTask(overdueTasks[0].id)}
              className="px-3 h-7 bg-error text-white font-bold text-[10px] tracking-wider uppercase rounded-md hover:brightness-110 shrink-0 transition-all cursor-pointer self-start sm:self-auto"
            >
              Done
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. PROGRESS SUMMARY (Streak, % Done, Habits, Tasks)           */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
          {/* Current Streak */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-1.5 text-muted mb-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text min-w-0 flex-1 break-words">Current Streak</span>
              <span className="text-sm shrink-0">🔥</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {overall?.currentStreak || 0}
              </span>
              <span className="text-xs font-semibold text-muted">days</span>
            </div>
            <span className="text-[10px] text-secondary-text mt-1 block">
              Best record: {overall?.longestStreak || 0}d
            </span>
          </div>

          {/* Today's Completion % */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-1.5 text-muted mb-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text min-w-0 flex-1 break-words">Daily Completion</span>
              <span className="text-xs font-bold text-accent shrink-0">Pulse</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-accent tabular-nums tracking-tight">
                {todayCompletionPercentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${todayCompletionPercentage}%` }}
              />
            </div>
          </div>

          {/* Habits Completed */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-1.5 text-muted mb-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text min-w-0 flex-1 break-words">Habits Completed</span>
              <FiCheck size={14} className="text-success shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {completedHabitsCount}
              </span>
              <span className="text-xs font-semibold text-muted">/ {habits.length}</span>
            </div>
            <span className="text-[10px] text-secondary-text mt-1 block">
              {habits.length - completedHabitsCount} remaining today
            </span>
          </div>

          {/* Tasks Completed */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-1.5 text-muted mb-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text min-w-0 flex-1 break-words">Tasks Completed</span>
              <FiCheckSquare size={14} className="text-info shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {completedTodayTasks}
              </span>
              <span className="text-xs font-semibold text-muted">/ {todayTasks.length}</span>
            </div>
            <span className="text-[10px] text-secondary-text mt-1 block">
              {todayTasks.length - completedTodayTasks} pending tasks
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. WEEKLY PROGRESS (Monday → Sunday visual indicators)        */}
        {/* ------------------------------------------------------------- */}
        <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider break-words">Weekly Progress</h3>
              <p className="text-[11px] text-secondary-text break-words">Visual rhythm across Monday → Sunday</p>
            </div>
            <span className="text-[11px] font-mono text-muted shrink-0 whitespace-nowrap tabular-nums">
              {weekDays[0]?.dateStr.slice(5)} – {weekDays[6]?.dateStr.slice(5)}
            </span>
          </div>

          {/* 7 Days Strip */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 sm:gap-2 pt-1 w-full max-w-full min-w-0">
            {weekDays.map((d) => {
              const isToday = d.status === 'today';
              const isFuture = d.status === 'future';
              const isFull = d.percent === 100;
              const hasData = d.percent !== null && d.percent > 0;

              return (
                <div
                  key={d.dateStr}
                  title={`${d.dateStr}: ${d.percent !== null ? `${d.percent}% done` : 'No data'}`}
                  className={`flex flex-col items-center justify-between min-w-0 p-1.5 sm:p-3 rounded-xl border text-center transition-all ${
                    isToday
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                      : isFull
                      ? 'border-border-subtle bg-surface-secondary/60'
                      : 'border-border-subtle/70 bg-surface'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider min-w-0 break-words ${isToday ? 'text-accent' : 'text-secondary-text'}`}>
                    {d.weekday}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums my-1 min-w-0">
                    {d.dayNum}
                  </span>

                  {/* Clean Visual Completion Indicator */}
                  <div className="h-6 flex items-center justify-center">
                    {isFuture ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    ) : isFull ? (
                      <span className="w-5 h-5 rounded-full bg-success text-white dark:text-black flex items-center justify-center text-[10px] font-bold">
                        <FiCheck size={12} strokeWidth={3.5} />
                      </span>
                    ) : hasData ? (
                      <span className="text-[10px] font-bold text-accent tabular-nums">
                        {d.percent}%
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. CORE DUAL SECTION: TODAY'S HABITS & TODAY'S TASKS          */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full max-w-full min-w-0">

          {/* Today's Habits */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs w-full max-w-full min-w-0">
            <div className="min-w-0 w-full max-w-full">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border-subtle min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-foreground break-words">Today's Habits</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/20 tabular-nums shrink-0 whitespace-nowrap">
                    {completedHabitsCount}/{habits.length} Done
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => habitInputRef.current?.focus()}
                  className="text-[11px] uppercase font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <FiPlus size={13} /> Add
                </button>
              </div>

              {/* Inline Quick Add Habit */}
              <form onSubmit={handleQuickAddHabit} className="flex items-center gap-2 mb-3 w-full max-w-full min-w-0">
                <input
                  ref={habitInputRef}
                  type="text"
                  placeholder="Add quick habit for today..."
                  value={quickHabitName}
                  onChange={(e) => setQuickHabitName(e.target.value)}
                  className="flex-1 min-w-0 w-full max-w-full h-9 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted transition-colors"
                />
                <button
                  type="submit"
                  disabled={!quickHabitName.trim()}
                  className="h-9 px-3 bg-accent text-accent-ink font-bold text-xs rounded-lg hover:brightness-110 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                  title="Add Habit"
                >
                  <FiPlus size={15} />
                </button>
              </form>

              {/* Habits List (One-click completion) */}
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                {habits.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted">No habits added yet.</p>
                    <p className="text-[10px] text-secondary-text mt-1">Add your daily habits to build consistency.</p>
                  </div>
                ) : (
                  habits.map((habit) => {
                    const isDone = habitLogs[`${habit.id}_${todayStr}`] === true;
                    const creationDate = habit.created_at ? habit.created_at.slice(0, 10) : '2026-01-01';
                    const streaks = computeStreaks(habit.id, habitLogs, creationDate, todayStr);

                    return (
                      <div
                        key={habit.id}
                        className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all w-full max-w-full min-w-0 ${
                          isDone
                            ? 'bg-surface-secondary/40 border-border-subtle/70'
                            : 'bg-surface border-border-subtle hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* ONE-CLICK COMPLETION BUTTON */}
                          <button
                            type="button"
                            onClick={() => toggleHabitLog(habit.id, todayStr)}
                            aria-label={`Mark ${habit.name} ${isDone ? 'incomplete' : 'complete'}`}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              isDone
                                ? 'bg-accent text-accent-ink shadow-xs scale-100'
                                : 'bg-surface-secondary border border-border-subtle hover:border-accent text-muted hover:text-accent'
                            }`}
                          >
                            <FiCheck size={15} strokeWidth={3} />
                          </button>

                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-bold block min-w-0 break-words [overflow-wrap:anywhere] leading-snug ${isDone ? 'text-secondary-text line-through opacity-80' : 'text-foreground'}`}>
                              {habit.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted font-medium mt-0.5 min-w-0">
                              <span className="capitalize break-words min-w-0">{habit.area || habit.frequency || 'Daily'}</span>
                              <span className="shrink-0">•</span>
                              <span className={`font-bold whitespace-nowrap shrink-0 ${streaks.current > 0 ? 'text-accent' : 'text-muted'}`}>
                                {streaks.current}d streak
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Frequency / Status Pill */}
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            isDone ? 'bg-success/15 text-success' : 'bg-surface-secondary text-secondary-text border border-border-subtle'
                          }`}>
                            {isDone ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle text-[11px] text-secondary-text flex flex-wrap items-center justify-between gap-2 mt-3 min-w-0">
              <span className="min-w-0 break-words">{completedHabitsCount} of {habits.length} habits done</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'HABITS' } }))}
                className="text-accent font-semibold flex items-center gap-1 cursor-pointer hover:underline shrink-0 whitespace-nowrap"
              >
                <span>Manage Habits</span>
                <FiChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs w-full max-w-full min-w-0">
            <div className="min-w-0 w-full max-w-full">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border-subtle min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-foreground break-words">Today's Tasks</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-secondary border border-border-subtle text-secondary-text tabular-nums shrink-0 whitespace-nowrap">
                    {completedTodayTasks}/{todayTasks.length} Done
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'TASKS' } }))}
                  className="text-[11px] uppercase font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <FiArrowRight size={13} /> All Tasks
                </button>
              </div>

              {/* Inline Quick Add Task */}
              <form onSubmit={handleQuickAddTask} className="flex items-center gap-2 mb-3 w-full max-w-full min-w-0">
                <input
                  type="text"
                  placeholder="Add a task for today..."
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  className="flex-1 min-w-0 w-full max-w-full h-9 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted transition-colors"
                />
                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim()}
                  className="h-9 px-3 bg-accent text-accent-ink font-bold text-xs rounded-lg hover:brightness-110 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                  title="Add Task"
                >
                  <FiPlus size={15} />
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted">No tasks scheduled for today.</p>
                    <p className="text-[10px] text-secondary-text mt-1">Add items above to plan your day.</p>
                  </div>
                ) : (
                  todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all w-full max-w-full min-w-0 ${
                        task.is_completed
                          ? 'bg-surface-secondary/40 border-border-subtle/70'
                          : 'bg-surface border-border-subtle hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          aria-label={`Toggle task ${task.title}`}
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            task.is_completed
                              ? 'bg-success border-success text-white dark:text-black'
                              : 'border-border-subtle hover:border-accent bg-surface'
                          }`}
                        >
                          {task.is_completed && <FiCheck size={12} strokeWidth={3} />}
                        </button>
                        <span className={`text-xs min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug ${task.is_completed ? 'line-through text-muted' : 'text-foreground font-medium'}`}>
                          {task.title}
                        </span>
                      </div>

                      {/* Priority pill */}
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                        task.priority === 'High'
                          ? 'text-error bg-error/15 border border-error/25'
                          : task.priority === 'Medium'
                          ? 'text-warning bg-warning/15 border border-warning/25'
                          : 'text-secondary-text bg-surface-secondary border border-border-subtle'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle text-[11px] text-secondary-text flex flex-wrap items-center justify-between gap-2 mt-3 min-w-0">
              <span className="min-w-0 break-words">{completedTodayTasks} of {todayTasks.length} tasks completed</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'TASKS' } }))}
                className="text-accent font-semibold flex items-center gap-1 cursor-pointer hover:underline shrink-0 whitespace-nowrap"
              >
                <span>Open Task Planner</span>
                <FiChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. FOCUS PROGRESS & SMALL WELLNESS SUMMARY                    */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full max-w-full min-w-0">
          {/* Focus Progress Widget */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs w-full max-w-full min-w-0">
            <div className="min-w-0 w-full max-w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border-subtle mb-3 min-w-0">
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-secondary-text flex items-center gap-1.5 min-w-0 break-words">
                  <FiClock size={13} className="text-accent shrink-0" /> Focus Progress
                </span>
                <span className="text-xs font-bold text-foreground tabular-nums shrink-0 whitespace-nowrap">
                  {todayTotalMinutes}m / {focusTargetMinutes}m Target
                </span>
              </div>

              <div className="w-full max-w-full h-2 bg-surface-secondary rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${focusProgress}%` }}
                />
              </div>

              <p className="text-xs text-secondary-text min-w-0 break-words">
                {todayTotalMinutes >= focusTargetMinutes
                  ? 'Daily deep work goal achieved! Great execution.'
                  : `${focusTargetMinutes - todayTotalMinutes} minutes remaining to reach your deep work target.`}
              </p>
            </div>

            <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 mt-3 min-w-0">
              <span className="text-xs text-muted min-w-0 break-words">{focusProgress}% of daily focus</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'FOCUS' } }))}
                className="text-xs text-accent font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>Launch Focus Timer</span>
                <FiChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Small Wellness Summary Widget */}
          <div className="gsap-dash-card bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs w-full max-w-full min-w-0">
            <div className="min-w-0 w-full max-w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border-subtle mb-3 min-w-0">
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-secondary-text flex items-center gap-1.5 min-w-0 break-words">
                  <FiActivity size={13} className="text-success shrink-0" /> Wellness Summary
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                  isWellnessLogged ? 'bg-success/15 text-success' : 'bg-surface-secondary text-muted'
                }`}>
                  {isWellnessLogged ? 'Logged' : 'Pending'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2 w-full max-w-full min-w-0">
                <div className="bg-surface-secondary/50 border border-border-subtle rounded-lg p-2.5 min-w-0 max-w-full">
                  <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider block break-words">Mood</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-foreground text-sm min-w-0">
                    <FiSmile className="text-accent shrink-0" size={14} />
                    <span className="min-w-0 break-words">{wellnessToday?.mood ? `${wellnessToday.mood}/10` : 'Not logged'}</span>
                  </div>
                </div>

                <div className="bg-surface-secondary/50 border border-border-subtle rounded-lg p-2.5 min-w-0 max-w-full">
                  <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider block break-words">Sleep</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-foreground text-sm min-w-0">
                    <FiMoon className="text-info shrink-0" size={14} />
                    <span className="min-w-0 break-words">{wellnessToday?.sleep ? `${wellnessToday.sleep} hrs` : 'Not logged'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 mt-3 min-w-0">
              <span className="text-xs text-muted min-w-0 break-words">Daily mind & body pulse</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'WELLNESS' } }))}
                className="text-xs text-accent font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>{isWellnessLogged ? 'View Tracker' : '+ Quick Check-in'}</span>
                <FiChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default HomeView;
