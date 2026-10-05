import React, { useState, useMemo } from 'react';
import { HabitGrid } from './HabitGrid';
import { MonthTabs } from './MonthTabs';
import { CreateHabitModal } from './CreateHabitModal';
import { FiCheckCircle, FiPlus, FiCheck, FiZap } from 'react-icons/fi';
import { useHabitStore } from '../../store/useHabitStore';
import { useToday } from '../../hooks/useToday';
import { computeStreaks, getHabitCreationDateStr, getApplicableDaysInMonth } from '../../utils/dailyTracking';

export const HabitsView: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { habits, habitLogs, currentMonthId } = useHabitStore();
  const todayStr = useToday();

  // Metrics
  const totalHabits = habits.length;
  const completedToday = useMemo(() => {
    return habits.filter(h => habitLogs[`${h.id}_${todayStr}`] === true).length;
  }, [habits, habitLogs, todayStr]);

  const bestStreak = useMemo(() => {
    let max = 0;
    habits.forEach(h => {
      const s = computeStreaks(h.id, habitLogs, getHabitCreationDateStr(h), todayStr);
      if (s.current > max) max = s.current;
    });
    return max;
  }, [habits, habitLogs, todayStr]);

  const { monthDone, monthGoal, monthRate } = useMemo(() => {
    if (!currentMonthId) return { monthDone: 0, monthGoal: 0, monthRate: 0 };
    let done = 0;
    let goal = 0;
    habits.forEach(h => {
      const applicable = getApplicableDaysInMonth(h, currentMonthId, todayStr);
      goal += applicable.length;
      applicable.forEach(ds => {
        if (habitLogs[`${h.id}_${ds}`] === true) done++;
      });
    });
    const rate = goal > 0 ? Math.round((done / goal) * 100) : 0;
    return { monthDone: done, monthGoal: goal, monthRate: rate };
  }, [habits, habitLogs, currentMonthId, todayStr]);

  return (
    <div className="h-full w-full max-w-full min-w-0 flex flex-col min-h-0 p-3 md:p-4 lg:p-5 overflow-hidden">
      <div className="w-full max-w-full min-w-0 h-full flex flex-col min-h-0 gap-3 md:gap-4 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 md:pb-4 flex-shrink-0 flex-wrap w-full max-w-full min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex flex-wrap items-center gap-2.5 min-w-0 break-words">
              <FiCheckCircle className="text-accent shrink-0" size={20} />
              <span className="min-w-0 break-words">Habits & Daily Routines</span>
            </h1>
            <p className="text-xs text-secondary-text mt-0.5 min-w-0 break-words">
              Track your daily consistency, build unbreakable streaks, and master routines.
            </p>
          </div>

          {/* Right Corner: + Habit Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <FiPlus size={14} strokeWidth={2.5} />
            <span>Habit</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 1. COMPACT METRICS & PROGRESS BANNER                          */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 flex-shrink-0 w-full max-w-full min-w-0">
          {/* Total Habits */}
          <div className="bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
            <div className="min-w-0 flex-1">
              <p className="text-secondary-text text-[10px] font-bold tracking-[0.14em] uppercase break-words">Total Habits</p>
              <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-0.5">{totalHabits}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-muted font-bold text-sm shrink-0">
              ∑
            </div>
          </div>

          {/* Completed Today */}
          <div className="bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
            <div className="min-w-0 flex-1">
              <p className="text-success text-[10px] font-bold tracking-[0.14em] uppercase break-words">Completed Today</p>
              <p className="text-2xl font-bold tracking-tight text-success tabular-nums mt-0.5">{completedToday}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center text-success shrink-0">
              <FiCheck size={15} strokeWidth={2.5} />
            </div>
          </div>

          {/* Best Streak (Desktop Only) */}
          <div className="hidden sm:flex bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
            <div className="min-w-0 flex-1">
              <p className="text-accent text-[10px] font-bold tracking-[0.14em] uppercase break-words">Top Streak</p>
              <p className="text-2xl font-bold tracking-tight text-accent tabular-nums mt-0.5">
                {bestStreak}<span className="text-xs font-semibold ml-1 text-muted">days</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <FiZap size={15} />
            </div>
          </div>

          {/* Monthly Consistency (Desktop Only) */}
          <div className="hidden sm:flex bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex-col justify-between gap-1 shadow-xs transition-colors min-w-0 max-w-full">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold tracking-[0.14em] uppercase min-w-0">
              <span className="text-secondary-text">Consistency</span>
              <span className="text-accent font-bold">{monthRate}% Rate</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${monthRate}%` }}
                />
              </div>
              <div className="text-[10px] text-muted font-medium text-right tabular-nums">
                {monthDone} of {monthGoal} checks done
              </div>
            </div>
          </div>
        </div>

        {/* 2. HABIT GRID */}
        <div className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-hidden relative">
          <HabitGrid onCreateHabit={() => setIsCreateModalOpen(true)} />
        </div>

        {/* 3. MONTH TABS */}
        <div className="flex-shrink-0 min-w-0 w-full max-w-full">
          <MonthTabs />
        </div>

        <CreateHabitModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default HabitsView;
