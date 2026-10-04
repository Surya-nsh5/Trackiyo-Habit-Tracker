import React, { useState, useEffect } from 'react';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useFriendStore } from '../../store/useFriendStore';
import { useHabitStore } from '../../store/useHabitStore';
import { FiX, FiTarget, FiClock, FiCheckSquare, FiGrid, FiCalendar } from 'react-icons/fi';
import type { ChallengeType } from '../../types/friendsChallenges';

export const CreateChallengeModal: React.FC = () => {
  const { isCreateModalOpen, selectedOpponentId, prefillTitle, closeCreateModal, createChallenge } = useChallengeStore();
  const { friends } = useFriendStore();
  const { habits } = useHabitStore();

  const [opponentId, setOpponentId] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('focus');
  const [title, setTitle] = useState('14 Day Focus Challenge');
  const [targetMetric, setTargetMetric] = useState(45); // e.g. 45 min
  const [targetHabitId, setTargetHabitId] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync selections every time the modal opens: useState initializers run
  // only on first mount (when friends/habits are usually still loading), so
  // without this the dropdown can display a friend while opponentId is '' —
  // causing a false "Please select a friend" error on submit.
  useEffect(() => {
    if (!isCreateModalOpen) return;
    setError(null);
    if (prefillTitle) setTitle(prefillTitle);
    setOpponentId(prev => {
      if (prev && friends.some(f => f.id === prev)) return prev;
      return selectedOpponentId || friends[0]?.id || '';
    });
    setTargetHabitId(prev => {
      if (prev && habits.some(h => h.id === prev)) return prev;
      return habits[0]?.id || '';
    });
  }, [isCreateModalOpen, friends, habits, selectedOpponentId, prefillTitle]);

  if (!isCreateModalOpen) return null;

  const handleTypeChange = (type: ChallengeType) => {
    setChallengeType(type);
    if (type === 'focus') {
      setTitle(`${durationDays} Day Focus Challenge`);
      setTargetMetric(45);
    } else if (type === 'task') {
      setTitle(`${durationDays} Day Task Sprint`);
      setTargetMetric(3);
    } else if (type === 'habit') {
      const h = habits.find(x => x.id === targetHabitId);
      setTitle(`${durationDays} Day ${h?.name || 'Habit'} Streak`);
      setTargetMetric(1);
    } else {
      setTitle(`${durationDays} Day Consistency Target`);
      setTargetMetric(1);
    }
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    if (challengeType === 'focus') setTitle(`${days} Day Focus Challenge`);
    else if (challengeType === 'task') setTitle(`${days} Day Task Sprint`);
    else if (challengeType === 'habit') setTitle(`${days} Day Habit Streak`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) {
      setError('Please select a friend to challenge');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a challenge title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await createChallenge({
      opponentId,
      title: title.trim(),
      challengeType,
      targetMetric: Number(targetMetric),
      targetUnit: challengeType === 'focus' ? 'minutes_per_day' : challengeType === 'task' ? 'tasks_per_day' : 'habit_per_day',
      targetHabitId: challengeType === 'habit' ? targetHabitId : undefined,
      durationDays
    });

    setIsSubmitting(false);
    if (!success) {
      setError('Failed to create challenge. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 w-full max-w-[min(28rem,calc(100vw-2rem))] min-w-0 space-y-5 shadow-2xl my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto box-border">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FiTarget className="text-accent shrink-0" size={18} />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider break-words min-w-0">
              Create Streak Challenge
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCreateModal}
            aria-label="Close create challenge"
            className="p-1 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-medium break-words [overflow-wrap:anywhere] min-w-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs min-w-0">
          {/* Friend Selection */}
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
              Select Friend
            </label>
            {friends.length === 0 ? (
              <p className="text-muted italic py-1 break-words">
                You have not connected with any friends yet. Add a friend first!
              </p>
            ) : (
              <select
                value={opponentId}
                onChange={(e) => { setOpponentId(e.target.value); setError(null); }}
                className="w-full max-w-full box-border min-w-0 px-3 py-2 rounded-xl border border-border-subtle bg-surface-secondary text-foreground focus:outline-none focus:border-accent"
              >
                {opponentId === '' && (
                  <option value="" disabled>
                    Select a friend...
                  </option>
                )}
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Challenge Type */}
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
              Challenge Metric
            </label>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <button
                type="button"
                onClick={() => handleTypeChange('focus')}
                className={`p-2.5 min-w-0 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                  challengeType === 'focus'
                    ? 'border-accent bg-accent/10 text-foreground font-bold'
                    : 'border-border-subtle bg-surface-secondary text-muted hover:text-foreground'
                }`}
              >
                <FiClock size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">Daily Focus</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('task')}
                className={`p-2.5 min-w-0 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                  challengeType === 'task'
                    ? 'border-accent bg-accent/10 text-foreground font-bold'
                    : 'border-border-subtle bg-surface-secondary text-muted hover:text-foreground'
                }`}
              >
                <FiCheckSquare size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">Tasks Complete</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('habit')}
                className={`p-2.5 min-w-0 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                  challengeType === 'habit'
                    ? 'border-accent bg-accent/10 text-foreground font-bold'
                    : 'border-border-subtle bg-surface-secondary text-muted hover:text-foreground'
                }`}
              >
                <FiGrid size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">Daily Habit</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('consistency')}
                className={`p-2.5 min-w-0 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                  challengeType === 'consistency'
                    ? 'border-accent bg-accent/10 text-foreground font-bold'
                    : 'border-border-subtle bg-surface-secondary text-muted hover:text-foreground'
                }`}
              >
                <FiCalendar size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">Any Activity</span>
              </button>
            </div>
          </div>

          {/* Habit Dropdown if habit */}
          {challengeType === 'habit' && habits.length > 0 && (
            <div className="min-w-0">
              <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
                Target Habit
              </label>
              <select
                value={targetHabitId}
                onChange={(e) => setTargetHabitId(e.target.value)}
                className="w-full max-w-full box-border min-w-0 px-3 py-2 rounded-xl border border-border-subtle bg-surface-secondary text-foreground focus:outline-none focus:border-accent"
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.icon} {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Daily Target Metric */}
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
              Daily Target Requirement
            </label>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <input
                type="number"
                min="1"
                max={challengeType === 'focus' ? 300 : 50}
                value={targetMetric}
                onChange={(e) => setTargetMetric(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 max-w-full box-border px-3 py-2 rounded-xl border border-border-subtle bg-surface-secondary text-foreground font-bold tabular-nums focus:outline-none focus:border-accent shrink-0"
              />
              <span className="text-secondary-text break-words min-w-0 flex-1">
                {challengeType === 'focus' ? 'minutes per day' : challengeType === 'task' ? 'tasks completed per day' : 'completion per day'}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
              Challenge Duration
            </label>
            <div className="flex items-center gap-2 min-w-0">
              {[7, 14, 21, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleDurationChange(days)}
                  className={`flex-1 min-w-0 py-1.5 px-1 rounded-lg border text-center font-bold transition-colors ${
                    durationDays === days
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border-subtle bg-surface-secondary text-muted hover:text-foreground'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1.5">
              Challenge Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              className="w-full max-w-full box-border min-w-0 px-3 py-2 rounded-xl border border-border-subtle bg-surface-secondary text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Fairness Notice */}
          <div className="p-3 rounded-xl bg-surface-secondary/70 border border-border-subtle text-[11px] text-muted leading-relaxed break-words min-w-0">
            <span className="font-bold text-foreground">Scoring Rule: </span>
            1 point per day for meeting the daily target. Consistency across days wins the challenge.
          </div>

          <button
            type="submit"
            disabled={isSubmitting || friends.length === 0}
            className="w-full max-w-full py-2.5 min-h-[44px] px-3 rounded-xl bg-accent text-accent-ink text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 text-center break-words"
          >
            {isSubmitting ? 'Sending Invitation...' : 'Send Challenge Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
};
