import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusStore } from '../../store/useFocusStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useDistractionStore } from '../../store/useDistractionStore';
import api from '../../services/api';
import { FiX, FiClock, FiZap, FiBell, FiAlertCircle } from 'react-icons/fi';

interface DeepWorkModeProps {
  isActive: boolean;
  onExit: () => void;
}

const DISTRACTIONS = [
  'Social media urge',
  'Email check',
  'News check',
  'Phone',
  'Conversation',
  'Mind wandering',
  'Other',
];

export const DeepWorkMode: React.FC<DeepWorkModeProps> = ({ isActive, onExit }) => {
  const { isRunning, startTimer, pauseTimer, completeSession, activeTaskId } = useFocusStore();
  const { tasks } = useTaskStore();
  const [distractions, setDistractions] = useState<{ reason: string; time: Date }[]>([]);
  const [showDistLog, setShowDistLog] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deepSessionId, setDeepSessionId] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);
  const { logDistraction: persistDistraction } = useDistractionStore();
  const activeTask = tasks.find(t => t.id === activeTaskId);

  // Start timer automatically when deep work begins + persist session open
  useEffect(() => {
    if (isActive && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      if (!isRunning) {
        startTimer();
      }
      api.post('/focus/deep-work', { task_id: activeTaskId }).then(res => {
        if (res.data?.id && !String(res.data.id).startsWith('local')) setDeepSessionId(res.data.id);
      }).catch(() => {});
    } else if (!isActive) {
      sessionStartedRef.current = false;
    }
  }, [isActive, isRunning, startTimer, activeTaskId]);

  // Track elapsed time
  useEffect(() => {
    if (!isActive || !isRunning) return;
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive, isRunning]);

  const logDistraction = (reason: string) => {
    setDistractions(prev => [...prev, { reason, time: new Date() }]);
    persistDistraction(reason, null);
    setShowDistLog(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleExit = async () => {
    if (deepSessionId) {
      try { await api.post('/focus/deep-work', { end: true, session_id: deepSessionId, distraction_count: distractions.length }); } catch {}
      setDeepSessionId(null);
    }
    await completeSession();
    onExit();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onExit();
  }, [onExit]);

  useEffect(() => {
    if (isActive) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-background flex flex-col items-center justify-center gap-0 px-4 py-8 w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar">

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-5 right-5 p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
        title="Exit Deep Work Mode (Esc)"
        aria-label="Exit deep work mode"
      >
        <FiX size={20} />
      </button>

      {/* Mode badge */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-8 sm:mb-12 max-w-full min-w-0">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
        <span className="text-xs font-bold text-accent uppercase tracking-[0.2em] break-words text-center">Deep Work Active</span>
      </div>

      {/* Active task */}
      {activeTask && (
        <p className="text-sm text-secondary-text mb-3 w-full max-w-xs min-w-0 text-center break-words [overflow-wrap:anywhere] leading-snug px-2">
          Working on: <span className="font-bold text-foreground break-words [overflow-wrap:anywhere]">{activeTask.title}</span>
        </p>
      )}

      {/* Giant timer */}
      <div className="text-[64px] min-[400px]:text-[80px] sm:text-[120px] font-bold text-foreground tabular-nums tracking-tight leading-none mb-4 max-w-full break-words">
        {formatTime(elapsedSeconds)}
      </div>

      <p className="text-sm text-muted mb-8 sm:mb-12 break-words text-center max-w-full">Focus. Build. Ship.</p>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center flex-wrap justify-center gap-2 sm:gap-3 w-full max-w-md min-w-0 px-2">
        {isRunning ? (
          <button
            onClick={pauseTimer}
            className="flex items-center justify-center gap-2 px-6 h-11 w-full sm:w-auto bg-surface-secondary border border-border text-foreground font-bold text-xs tracking-wider uppercase rounded-xl hover:border-foreground/20 transition-colors"
          >
            <FiClock size={15} className="shrink-0" />
            Pause
          </button>
        ) : (
          <button
            onClick={startTimer}
            className="flex items-center justify-center gap-2 px-6 h-11 w-full sm:w-auto bg-accent text-accent-ink font-bold text-xs tracking-wider uppercase rounded-xl hover:brightness-110 transition-all"
          >
            <FiZap size={15} className="shrink-0" />
            Resume
          </button>
        )}

        <button
          onClick={() => setShowDistLog(true)}
          className="flex items-center justify-center gap-2 px-4 h-11 w-full sm:w-auto border border-border text-muted font-bold text-xs tracking-wider uppercase rounded-xl hover:text-foreground hover:border-border transition-colors"
        >
          <FiBell size={15} className="shrink-0" />
          Log Distraction
          {distractions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent text-accent-ink text-[9px] font-bold flex items-center justify-center shrink-0 tabular-nums">
              {distractions.length}
            </span>
          )}
        </button>

        <button
          onClick={handleExit}
          className="flex items-center justify-center gap-2 px-6 h-11 w-full sm:w-auto bg-success text-white dark:text-black font-bold text-xs tracking-wider uppercase rounded-xl hover:brightness-110 transition-all"
        >
          Finish Session
        </button>
      </div>

      {/* Distraction count recap */}
      {distractions.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted text-center max-w-full px-2">
          <FiAlertCircle size={13} className="shrink-0" />
          <span className="break-words">{distractions.length} distraction{distractions.length > 1 ? 's' : ''} logged this session</span>
        </div>
      )}

      {/* Distraction log modal */}
      {showDistLog && (
        <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowDistLog(false)} />
          <div className="relative bg-surface border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-xs min-w-0 z-10 max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-foreground mb-4 break-words">What distracted you?</h3>
            <div className="space-y-2 min-w-0">
              {DISTRACTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => logDistraction(d)}
                  className="w-full max-w-full min-w-0 text-left px-3 py-2.5 rounded-xl bg-surface-secondary hover:bg-elevated border border-border-subtle hover:border-border text-xs font-semibold text-foreground transition-colors break-words"
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDistLog(false)}
              className="w-full mt-3 h-9 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepWorkMode;
