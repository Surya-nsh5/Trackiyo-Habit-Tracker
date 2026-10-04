import React, { useState, useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import {
  FiCheckSquare, FiGrid, FiBookOpen, FiClock, FiCalendar, FiX
} from 'react-icons/fi';

export type QuickAddKind = 'task' | 'habit';

interface QuickAddMenuProps {
  isOpen: boolean;
  initial?: QuickAddKind | null;
  onClose: () => void;
}

const KIND_META: { id: QuickAddKind | 'journal' | 'focus' | 'timeblock'; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'task', label: 'Task', hint: 'Title only — details later', icon: <FiCheckSquare size={16} /> },
  { id: 'habit', label: 'Habit', hint: 'Daily, 28-day goal', icon: <FiGrid size={16} /> },
  { id: 'journal', label: 'Journal entry', hint: 'Open journal', icon: <FiBookOpen size={16} /> },
  { id: 'focus', label: 'Focus session', hint: 'Open focus mode', icon: <FiClock size={16} /> },
  { id: 'timeblock', label: 'Time block', hint: 'Plan in calendar', icon: <FiCalendar size={16} /> },
];

function navigate(tab: string) {
  window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab } }));
}

export const QuickAddMenu: React.FC<QuickAddMenuProps> = ({ isOpen, initial = null, onClose }) => {
  const { addTask } = useTaskStore();
  const { addHabit } = useHabitStore();
  const [kind, setKind] = useState<QuickAddKind | null>(initial);
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setKind(initial);
      setValue('');
      setIsSaving(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, initial]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = value.trim();
    if (!title || !kind || isSaving) return;
    setIsSaving(true);
    try {
      if (kind === 'task') {
        await addTask({ title, description: '', priority: 'Medium', category: 'General', status: 'pending', due_date: null });
      } else if (kind === 'habit') {
        await addHabit(title, '⚡', 28);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const pick = (id: string) => {
    if (id === 'journal') { onClose(); navigate('JOURNAL'); }
    else if (id === 'focus') { onClose(); navigate('FOCUS'); }
    else if (id === 'timeblock') { onClose(); navigate('CALENDAR'); }
    else { setKind(id as QuickAddKind); setValue(''); setTimeout(() => inputRef.current?.focus(), 40); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Quick add">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[min(24rem,calc(100vw-2rem))] min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-surface border border-border/80 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 flex-shrink-0 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground min-w-0 flex-1 break-words">
            {kind ? `New ${kind}` : 'Quick add'}
          </p>
          <button onClick={onClose} aria-label="Close quick add" className="p-2 -m-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-muted hover:text-foreground rounded-lg shrink-0">
            <FiX size={16} />
          </button>
        </div>

        {kind ? (
          <form onSubmit={submit} className="p-4 space-y-3">
            <label htmlFor="quick-add-input" className="section-label">
              {kind === 'task' ? 'Task title' : kind === 'habit' ? 'Habit name' : 'Goal title'}
            </label>
            <input
              id="quick-add-input"
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={kind === 'task' ? 'What needs doing?' : kind === 'habit' ? 'e.g. Read 20 pages' : 'e.g. Run a marathon'}
              className="w-full max-w-full box-border min-w-0 h-11 bg-surface-secondary border border-border-subtle rounded-lg px-3.5 text-sm text-foreground focus:outline-none focus:border-accent placeholder:text-muted/70"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setKind(null)} className="text-xs font-semibold text-muted hover:text-foreground px-2 h-10">
                ← All types
              </button>
              <button type="submit" disabled={!value.trim() || isSaving}
                className="px-5 h-10 bg-accent text-accent-ink text-xs font-bold uppercase tracking-wider rounded-lg hover:brightness-110 disabled:opacity-40">
                {isSaving ? 'Saving…' : 'Add'}
              </button>
            </div>
          </form>
        ) : (
          <ul className="p-2 min-h-0 overflow-y-auto">
            {KIND_META.map(k => (
              <li key={k.id} className="min-w-0">
                <button onClick={() => pick(k.id)}
                  className="w-full min-w-0 flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-xl text-left hover:bg-surface-hover transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-accent shrink-0">
                    {k.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground break-words">{k.label}</span>
                    <span className="block text-[11px] text-muted break-words">{k.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuickAddMenu;
