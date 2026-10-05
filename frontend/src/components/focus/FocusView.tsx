import React, { useEffect, useState } from 'react';
import { useFocusStore } from '../../store/useFocusStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useShareStore } from '../../store/useShareStore';
import type { FocusSessionType } from '../../types';
import { Dropdown } from '../common/Dropdown';
import {
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiCheck,
  FiClock,
  FiCheckSquare,
  FiAward,
  FiShare2,
  FiMinus,
  FiPlus,
  FiAlertCircle
} from 'react-icons/fi';

export const FocusView: React.FC = () => {
  const {
    sessionType,
    timeLeft,
    initialDuration,
    isRunning,
    activeTaskId,
    sessions,
    todayTotalMinutes,
    setSessionType,
    setActiveTask,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    completeSession,
    fetchSessions
  } = useFocusStore();

  const { tasks } = useTaskStore();
  const { openShareModal } = useShareStore();

  const [customMins, setCustomMins] = useState(30);
  const [customMinsInput, setCustomMinsInput] = useState('30');

  const MIN_CUSTOM_MINS = 1;
  const MAX_CUSTOM_MINS = 180; // 3 hours maximum limit

  const handleCustomMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input up to 3 digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCustomMinsInput(digits);

    if (digits) {
      const num = parseInt(digits, 10);
      const clamped = Math.min(MAX_CUSTOM_MINS, Math.max(MIN_CUSTOM_MINS, num));
      setCustomMins(clamped);
      setSessionType('custom', clamped);
    }
  };

  const handleCustomMinsBlur = () => {
    const num = parseInt(customMinsInput, 10);
    let finalVal = 30;
    if (isNaN(num) || num < MIN_CUSTOM_MINS) {
      finalVal = MIN_CUSTOM_MINS;
    } else if (num > MAX_CUSTOM_MINS) {
      finalVal = MAX_CUSTOM_MINS;
    } else {
      finalVal = num;
    }
    setCustomMinsInput(String(finalVal));
    setCustomMins(finalVal);
    setSessionType('custom', finalVal);
  };

  const adjustCustomMins = (delta: number) => {
    const current = parseInt(customMinsInput, 10) || customMins || 30;
    const next = Math.min(MAX_CUSTOM_MINS, Math.max(MIN_CUSTOM_MINS, current + delta));
    setCustomMinsInput(String(next));
    setCustomMins(next);
    setSessionType('custom', next);
  };

  const selectCustomPreset = (mins: number) => {
    setCustomMinsInput(String(mins));
    setCustomMins(mins);
    setSessionType('custom', mins);
  };

  const handleCompleteSession = async () => {
    if (!activeTaskId) return;
    await completeSession();
  };

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = sessionType === 'stopwatch'
    ? 100
    : initialDuration > 0
      ? Math.round(((initialDuration - timeLeft) / initialDuration) * 100)
      : 0;

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="h-full w-full max-w-full min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5">
      <div className="w-full max-w-full min-w-0 flex flex-col gap-3 md:gap-4 relative">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 flex-shrink-0 w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex flex-wrap items-center gap-2.5 min-w-0 break-words">
            <FiClock className="text-accent shrink-0" size={20} />
            <span className="min-w-0 break-words">Deep Focus & Flow</span>
          </h1>
          <p className="text-xs text-secondary-text mt-0.5 min-w-0 break-words">
            Master flow states with Pomodoro cycles, customizable timers, and focused execution.
          </p>
        </div>
      </div>

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 flex-shrink-0 w-full max-w-full min-w-0">
        <div className="bg-surface border border-border/80 rounded-xl p-4 flex items-center justify-between gap-2 transition-colors shadow-xs min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-secondary-text text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase break-words">Today's Focus Time</p>
            <p className="text-3xl font-bold tracking-tight text-accent tabular-nums">{todayTotalMinutes}m</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {todayTotalMinutes > 0 && (
              <button
                type="button"
                onClick={() => openShareModal({
                  type: 'focus',
                  title: 'Deep Focus Session',
                  subtitle: "Today's Dedicated Focus Time",
                  metric: `${todayTotalMinutes}m`,
                  metricValue: `${todayTotalMinutes}m Focused`,
                  metricLabel: 'Focus Time Logged',
                  icon: '⚡',
                  format: 'square',
                })}
                className="w-9 h-9 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-muted hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                title="Share Focus Progress"
                aria-label="Share focus progress"
              >
                <FiShare2 size={15} />
              </button>
            )}
            <div className="w-12 h-12 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-accent shrink-0">
              <FiClock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-xl p-4 flex items-center justify-between gap-2 transition-colors shadow-xs min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-secondary-text text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase break-words">Total Sessions</p>
            <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{sessions.length}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-muted shrink-0">
            <FiCheckSquare size={20} />
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-xl p-4 flex items-center justify-between gap-2 transition-colors shadow-xs min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-secondary-text text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase break-words">Active Target</p>
            <p className="text-sm font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug line-clamp-2">
              {activeTask ? activeTask.title : 'Free Focus'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <FiAward size={20} />
          </div>
        </div>
      </div>

      {/* Main Focus Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 w-full max-w-full min-w-0">

        {/* Left Timer Panel */}
        <div className="lg:col-span-8 bg-surface border border-border/80 rounded-xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xs w-full max-w-full min-w-0">

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-surface-secondary rounded-xl border border-border-subtle p-1 mb-6 sm:mb-8 max-w-lg w-full max-w-full min-w-0 overflow-x-auto custom-scrollbar touch-pan-x justify-start sm:justify-center">
            {(['pomodoro', 'short_break', 'long_break', 'custom', 'stopwatch'] as FocusSessionType[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSessionType(mode, mode === 'custom' ? customMins : undefined)}
                className={`shrink-0 flex-1 sm:flex-initial py-1.5 px-2.5 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-[0.06em] uppercase whitespace-nowrap transition-all cursor-pointer text-center ${
                  sessionType === mode
                    ? 'bg-accent text-accent-ink font-bold shadow-xs'
                    : 'text-secondary-text hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {mode === 'pomodoro' ? '25m' :
                 mode === 'short_break' ? (
                   <>5m <span className="hidden min-[400px]:inline">Break</span></>
                 ) :
                 mode === 'long_break' ? (
                   <>15m <span className="hidden min-[400px]:inline">Break</span></>
                 ) :
                 mode === 'custom' ? 'Custom' : 'Stopwatch'}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 max-w-full flex flex-col items-center justify-center my-4 min-w-0">
            {/* Circular Progress Ring */}
            <svg className="w-full h-full max-w-full transform -rotate-90" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <circle
                cx="50%"
                cy="50%"
                r="44%"
                className="stroke-surface-secondary fill-none"
                strokeWidth="8"
              />
              <circle
                cx="50%"
                cy="50%"
                r="44%"
                className="stroke-accent fill-none transition-all duration-300"
                strokeWidth="8"
                strokeDasharray="276%"
                strokeDashoffset={`${276 - (276 * progressPercent) / 100}%`}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner Digits */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 min-w-0 max-w-full">
              <span className={`font-bold font-sans tracking-tight text-foreground tabular-nums transition-all max-w-full break-words ${
                formatTime(timeLeft).length > 5
                  ? 'text-3xl sm:text-4xl md:text-5xl'
                  : 'text-4xl sm:text-5xl md:text-6xl'
              }`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-secondary-text uppercase tracking-[0.16em] mt-2 break-words max-w-full">
                {sessionType === 'stopwatch' ? 'STOPWATCH ELAPSED' : `${progressPercent}% COMPLETED`}
              </span>
            </div>
          </div>

          {/* Timer Control Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 mt-6 flex-wrap justify-center w-full max-w-full min-w-0">
            {!isRunning ? (
              <button
                type="button"
                onClick={startTimer}
                className="flex items-center gap-2 px-6 sm:px-8 h-11 sm:h-12 bg-accent text-accent-ink font-bold text-xs tracking-[0.14em] uppercase rounded-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <FiPlay size={16} fill="currentColor" />
                <span>START</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseTimer}
                className="flex items-center gap-2 px-6 sm:px-8 h-11 sm:h-12 bg-surface-secondary border border-border-subtle hover:border-border text-foreground font-bold text-xs tracking-[0.14em] uppercase rounded-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <FiPause size={16} />
                <span>PAUSE</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetTimer}
              title="Reset Timer"
              className="p-3 sm:p-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-secondary border border-border-subtle hover:border-border text-secondary-text hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <FiRotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={handleCompleteSession}
              disabled={!activeTaskId}
              title={!activeTaskId ? 'Select a task to log your session' : 'Finish & Log Session'}
              className={`flex items-center gap-2 px-4 sm:px-5 h-11 sm:h-12 font-bold text-xs tracking-[0.12em] uppercase rounded-lg transition-all shadow-xs ${
                !activeTaskId
                  ? 'bg-surface-secondary text-muted border border-border-subtle cursor-not-allowed opacity-60'
                  : 'bg-success text-white dark:text-black hover:brightness-110 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <FiCheck size={16} strokeWidth={3} />
              <span>LOG SESSION</span>
            </button>
          </div>

          {!activeTaskId && (
            <div className="flex items-center gap-1.5 text-[11px] text-warning/90 mt-3.5 bg-warning/10 border border-warning/25 px-3 py-1.5 rounded-lg w-full max-w-full sm:max-w-sm min-w-0">
              <FiAlertCircle size={13} className="shrink-0 text-warning" />
              <span className="min-w-0 flex-1 break-words">Select a task on the right to enable session logging</span>
            </div>
          )}
        </div>

        {/* Right Configuration & History Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full max-w-full min-w-0">

          {/* Target Linkage Card */}
          <div className="bg-surface border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs w-full max-w-full min-w-0">
            <h4 className="text-[11px] font-bold text-secondary-text uppercase tracking-[0.14em] mb-3 break-words">Link Focus Session</h4>

            <div className="space-y-3 min-w-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1 min-w-0">
                  <label className="text-[10px] font-semibold text-muted tracking-[0.1em] uppercase break-words">
                    Associate with Task
                  </label>
                  {!activeTaskId && (
                    <span className="text-[9px] font-bold text-warning uppercase tracking-wider shrink-0 whitespace-nowrap">
                      Required to log
                    </span>
                  )}
                </div>
                <Dropdown
                  value={activeTaskId || ''}
                  onChange={setActiveTask}
                  ariaLabel="Associate with task"
                  options={[
                    { value: '', label: 'None (Untracked Session)' },
                    ...tasks.filter((t) => !t.is_completed).map((t) => ({ value: t.id, label: t.title }))
                  ]}
                />
                {!activeTaskId && (
                  <p className="text-[10px] text-secondary-text mt-1.5 leading-normal break-words min-w-0">
                    Untracked sessions run freely for practice or breaks, but cannot be logged to history.
                  </p>
                )}
              </div>

              {sessionType === 'custom' && (
                <div className="pt-2 border-t border-border-subtle/80 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5 min-w-0">
                    <label className="text-[10px] font-semibold text-muted tracking-[0.1em] uppercase break-words">
                      Custom Duration (Minutes)
                    </label>
                    <span className="text-[10px] text-muted font-mono shrink-0 whitespace-nowrap tabular-nums">1 – 180 min</span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2.5 min-w-0 max-w-full">
                    <button
                      type="button"
                      onClick={() => adjustCustomMins(-5)}
                      disabled={customMins <= MIN_CUSTOM_MINS}
                      className="w-10 h-10 shrink-0 bg-surface-secondary border border-border-subtle hover:border-border text-foreground font-bold text-sm rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                      title="Minus 5 minutes"
                      aria-label="Decrease custom duration by 5 minutes"
                    >
                      <FiMinus size={14} />
                    </button>

                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={customMinsInput}
                        onChange={handleCustomMinsChange}
                        onBlur={handleCustomMinsBlur}
                        placeholder="30"
                        className="w-full max-w-full min-w-0 h-10 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-center text-sm font-bold text-foreground focus:outline-none focus:border-accent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
                        min
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustCustomMins(5)}
                      disabled={customMins >= MAX_CUSTOM_MINS}
                      className="w-10 h-10 shrink-0 bg-surface-secondary border border-border-subtle hover:border-border text-foreground font-bold text-sm rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                      title="Add 5 minutes"
                      aria-label="Increase custom duration by 5 minutes"
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 flex-wrap min-w-0 max-w-full">
                    {[15, 25, 30, 45, 60, 90, 120].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => selectCustomPreset(preset)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer shrink-0 whitespace-nowrap tabular-nums ${
                          customMins === preset
                            ? 'bg-accent text-accent-ink border-accent font-bold shadow-xs'
                            : 'bg-surface-secondary border-border-subtle text-secondary-text hover:text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Focus Log Card */}
          <div className="bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex-1 flex flex-col min-w-0 w-full max-w-full shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
              <h4 className="text-[11px] font-bold text-secondary-text uppercase tracking-[0.14em] break-words">
                Recent Focus Logs
              </h4>
              {sessions.length > 0 && (
                <span className="text-[10px] text-muted font-semibold bg-surface-secondary px-2 py-0.5 rounded-md border border-border-subtle shrink-0">
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
              )}
            </div>
            <div className="max-h-[280px] sm:max-h-[340px] overflow-y-auto space-y-2 custom-scrollbar pr-1 min-w-0">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted italic py-6 text-center break-words">No focus sessions logged yet.</p>
              ) : (
                sessions.map((s) => {
                  const linkedTask = tasks.find((t) => t.id === s.task_id);
                  const mins = Math.max(1, Math.round(s.duration / 60));

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 p-2.5 bg-surface-secondary hover:bg-surface-secondary/80 transition-colors rounded-lg border border-border-subtle text-xs w-full max-w-full min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-foreground block min-w-0 break-words [overflow-wrap:anywhere] leading-snug">
                          {linkedTask ? linkedTask.title : 'Deep Focus'}
                        </span>
                        <span className="text-[9px] text-muted uppercase tracking-[0.08em] break-words">
                          {s.session_type} • {s.completed_at ? s.completed_at.slice(0, 10) : 'Today'}
                        </span>
                      </div>
                      <span className="font-bold text-accent tabular-nums shrink-0 whitespace-nowrap">{mins}m</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
      </div>
    </div>
  );
};
