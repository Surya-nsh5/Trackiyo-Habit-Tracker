import React, { useMemo } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useFocusStore } from '../../store/useFocusStore';
import { FiArrowRight, FiZap, FiClock, FiAlertCircle } from 'react-icons/fi';

interface NextActionBannerProps {
  onStartFocus: (taskId: string) => void;
  onNavigateTasks: () => void;
}

function getPriorityScore(task: { priority: string; due_date: string | null; created_at: string }): number {
  let score = 0;
  if (task.priority === 'High') score += 100;
  else if (task.priority === 'Medium') score += 50;
  else score += 10;

  if (task.due_date) {
    const daysUntilDue = Math.floor((new Date(task.due_date).getTime() - Date.now()) / 86400000);
    if (daysUntilDue < 0) score += 200; // overdue
    else if (daysUntilDue === 0) score += 150;
    else if (daysUntilDue <= 2) score += 80;
    else if (daysUntilDue <= 7) score += 30;
  }

  return score;
}

export const NextActionBanner: React.FC<NextActionBannerProps> = ({ onStartFocus, onNavigateTasks }) => {
  const { tasks } = useTaskStore();
  const { setActiveTask } = useFocusStore();

  const nextTask = useMemo(() => {
    const pending = tasks.filter(t => !t.is_completed);
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0];
  }, [tasks]);

  if (!nextTask) {
    return (
      <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl w-full max-w-full min-w-0">
        <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
          <FiZap size={15} className="text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground break-words">All caught up!</p>
          <p className="text-[10px] text-muted break-words">No pending tasks. Take a break or plan your next sprint.</p>
        </div>
      </div>
    );
  }

  const isOverdue = nextTask.due_date && nextTask.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10);

  const handleStartWorking = () => {
    setActiveTask(nextTask.id);
    onStartFocus(nextTask.id);
  };

  return (
    <div className={`flex items-start sm:items-center gap-3 p-3 rounded-xl border w-full max-w-full min-w-0 ${
      isOverdue
        ? 'bg-danger/5 border-danger/20'
        : nextTask.priority === 'High'
          ? 'bg-accent/5 border-accent/20'
          : 'bg-surface border-border/70'
    }`}>
      {/* Priority indicator */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isOverdue ? 'bg-danger/15' : nextTask.priority === 'High' ? 'bg-accent/15' : 'bg-surface-secondary'
      }`}>
        {isOverdue
          ? <FiAlertCircle size={15} className="text-danger" />
          : <FiZap size={15} className={nextTask.priority === 'High' ? 'text-accent' : 'text-muted'} />
        }
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5 min-w-0">
          <p className="text-[9px] font-bold text-muted uppercase tracking-wider break-words">
            {isOverdue ? '⚠️ Overdue · ' : ''}Next Action
          </p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${
            nextTask.priority === 'High'
              ? 'bg-accent/10 text-accent'
              : nextTask.priority === 'Medium'
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-surface-secondary text-muted'
          }`}>
            {nextTask.priority}
          </span>
        </div>
        <p className="text-xs font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug">{nextTask.title}</p>
        {nextTask.due_date && (
          <p className={`text-[10px] mt-0.5 break-words ${isOverdue ? 'text-danger' : 'text-muted'}`}>
            <FiClock size={9} className="inline mr-1 shrink-0" />
            {isOverdue ? 'Overdue · ' : 'Due · '}{nextTask.due_date.slice(0, 10)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleStartWorking}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
            nextTask.priority === 'High' || isOverdue
              ? 'bg-accent text-accent-ink hover:brightness-110'
              : 'bg-surface-secondary border border-border text-foreground hover:bg-elevated'
          }`}
        >
          <FiZap size={11} />
          Start
        </button>
        <button
          onClick={onNavigateTasks}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          title="View all tasks"
        >
          <FiArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default NextActionBanner;
