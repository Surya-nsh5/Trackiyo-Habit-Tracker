import React, { useState } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useOverlayClose } from '../../utils/overlayStack';
import type { HabitFrequency } from '../../types';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { FiX, FiPlus, FiAlertCircle } from 'react-icons/fi';
import { getFriendlyErrorMessage } from '../../utils/apiError';

interface CreateHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_EMOJIS = ['🏃', '💪', '📚', '💧', '🧘', '✍️', '🥑', '🎯', '⚡', '🌙', '🎨', '💻', '🚶', '🌱', '☀️'];

export const CreateHabitModal: React.FC<CreateHabitModalProps> = ({ isOpen, onClose }) => {
  const { addHabit } = useHabitStore();
  const { isDarkMode } = useThemeStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📌');
  const [hasPickedIcon, setHasPickedIcon] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(30);
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useOverlayClose(showEmojiPicker, () => setShowEmojiPicker(false));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a habit name');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalIcon = hasPickedIcon ? icon : (trimmed.charAt(0).toUpperCase() || '📌');
      await addHabit(trimmed, finalIcon, monthlyGoal, frequency);
      // Reset form
      setName('');
      setIcon('📌');
      setHasPickedIcon(false);
      setMonthlyGoal(30);
      setFrequency('daily');
      setError(null);
      onClose();
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err, 'Failed to create habit. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (emoji: string) => {
    setIcon(emoji);
    setHasPickedIcon(true);
    setShowEmojiPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] px-[env(safe-area-inset-left,0px)]">
      <div className="bg-surface border-t sm:border border-border rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md min-w-0 max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px))] sm:max-h-[88vh] overflow-y-auto custom-scrollbar shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-border/60 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase min-w-0 break-words flex-1">
            ADD NEW HABIT
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground cursor-pointer transition-colors shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-full min-w-0">
          {/* Error Message */}
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/25 text-error text-xs font-medium rounded-lg px-3 py-2 w-full max-w-full min-w-0">
              <FiAlertCircle size={15} className="shrink-0 mt-0.5" />
              <p className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{error}</p>
            </div>
          )}

          {/* Icon & Name Row */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">
              Habit Name & Icon
            </label>
            <div className="flex items-center gap-2 relative min-w-0 w-full max-w-full">
              {/* Emoji Trigger */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Choose habit icon"
                className="w-12 h-11 flex items-center justify-center text-2xl bg-surface-secondary border border-border-subtle hover:border-accent rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <span>{hasPickedIcon ? icon : (name.trim() ? name.trim().charAt(0).toUpperCase() : icon)}</span>
              </button>

              {/* Name Input */}
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Read 20 mins, Morning Run..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className="flex-1 min-w-0 w-full max-w-full h-11 bg-surface-secondary border border-border-subtle rounded-lg px-3.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              />

              {/* Floating Emoji Picker */}
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute top-[calc(100%+6px)] left-0 z-50 shadow-2xl rounded-xl overflow-hidden w-[280px] sm:w-[320px] max-w-[calc(100vw-40px)]">
                    <EmojiPicker
                      theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                      width="100%"
                      height={320}
                      onEmojiClick={(e) => handleSelectPreset(e.emoji)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Emoji Presets */}
          <div className="w-full max-w-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 min-w-0">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider">Quick Icons</span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-[10px] font-bold text-accent hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                {showEmojiPicker ? 'Close Picker' : 'Browse All Emojis →'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-full">
              {PRESET_EMOJIS.map((emoji) => {
                const isSelected = hasPickedIcon && icon === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectPreset(emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/20 border-2 border-accent scale-105'
                        : 'bg-surface-secondary border border-border-subtle hover:border-border hover:bg-surface-hover'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency Selector */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">
              Frequency Cadence
            </label>
            <div className="grid grid-cols-3 gap-2 w-full max-w-full min-w-0">
              {[
                { value: 'daily', label: 'Full Month', days: 30 },
                { value: 'weekdays', label: 'Weekdays', days: 22 },
                { value: 'weekend', label: 'Weekend Only', days: 8 },
              ].map((f) => {
                const isActive = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      setFrequency(f.value);
                      setMonthlyGoal(f.days);
                    }}
                    className={`py-2 px-1 sm:px-2.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center min-w-0 max-w-full ${
                      isActive
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border-subtle bg-surface-secondary text-secondary-text hover:text-foreground'
                    }`}
                  >
                    <span className="leading-tight break-words w-full max-w-full">{f.label}</span>
                    <span className="text-[10px] text-muted font-normal whitespace-nowrap">{f.days}d / mo</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Target Days Stepper */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">
              Monthly Target (Days)
            </label>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <input
                type="number"
                min={1}
                max={31}
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-24 max-w-full shrink-0 h-10 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-sm text-foreground text-center font-bold focus:outline-none focus:border-accent"
              />
              <span className="text-xs text-muted flex-1 min-w-0 break-words">days per month recommended for habit mastery</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border/60 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 text-xs font-semibold text-secondary-text hover:text-foreground hover:bg-surface-hover rounded-lg tracking-[0.1em] uppercase transition-colors cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 h-10 bg-accent text-accent-ink font-bold text-xs tracking-[0.12em] uppercase rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 max-w-full"
            >
              <FiPlus size={14} strokeWidth={2.5} />
              <span>{isSubmitting ? 'Creating...' : 'Create Habit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
