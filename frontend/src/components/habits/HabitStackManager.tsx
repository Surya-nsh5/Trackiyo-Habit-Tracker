import React, { useState, useEffect } from 'react';
import { useHabitStackStore } from '../../store/useHabitStackStore';
import { useHabitStore } from '../../store/useHabitStore';
import type { HabitStack } from '../../types';
import { FiPlus, FiTrash2, FiX, FiEdit2, FiCheck, FiLayers } from 'react-icons/fi';

const TIME_OF_DAY_OPTIONS = [
  { value: 'morning', label: '🌅 Morning', sub: 'Before 12 PM' },
  { value: 'afternoon', label: '☀️ Afternoon', sub: '12 PM – 5 PM' },
  { value: 'evening', label: '🌆 Evening', sub: '5 PM – 9 PM' },
  { value: 'night', label: '🌙 Night', sub: 'After 9 PM' },
];

export const HabitStackManager: React.FC = () => {
  const { stacks, fetchStacks, addStack, updateStack, deleteStack } = useHabitStackStore();
  const { habits } = useHabitStore();
  const [showModal, setShowModal] = useState(false);
  const [editingStack, setEditingStack] = useState<HabitStack | null>(null);
  const [form, setForm] = useState({
    name: '',
    habit_ids: [] as string[],
    trigger: '',
    time_of_day: 'morning' as HabitStack['time_of_day'],
  });

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  const openAdd = () => {
    setEditingStack(null);
    setForm({ name: '', habit_ids: [], trigger: '', time_of_day: 'morning' });
    setShowModal(true);
  };

  const openEdit = (stack: HabitStack) => {
    setEditingStack(stack);
    setForm({
      name: stack.name,
      habit_ids: stack.habit_ids || [],
      trigger: stack.trigger || '',
      time_of_day: stack.time_of_day || 'morning',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.habit_ids.length === 0) return;
    if (editingStack) {
      await updateStack(editingStack.id, form);
    } else {
      await addStack(form);
    }
    setShowModal(false);
  };

  const toggleHabit = (id: string) => {
    setForm(f => ({
      ...f,
      habit_ids: f.habit_ids.includes(id) ? f.habit_ids.filter(h => h !== id) : [...f.habit_ids, id]
    }));
  };

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border-subtle flex items-center justify-center mb-3">
          <FiLayers size={20} className="text-muted" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">No habits to stack</p>
        <p className="text-xs text-muted">Add some habits first, then create stacks to chain them together.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground break-words">Habit Stacks</h3>
          <p className="text-[11px] text-muted break-words">Chain habits together with a trigger and time of day</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-ink font-bold text-[10px] uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shrink-0 whitespace-nowrap"
        >
          <FiPlus size={13} />
          New Stack
        </button>
      </div>

      {/* Stack list */}
      {stacks.length === 0 ? (
        <div className="py-10 text-center w-full max-w-full min-w-0 px-4">
          <FiLayers size={28} className="text-muted mx-auto mb-3 opacity-50" />
          <p className="text-xs text-muted break-words">No habit stacks yet</p>
          <p className="text-[10px] text-muted/60 mt-1 break-words">Create a stack to build powerful habit chains</p>
        </div>
      ) : (
        <div className="space-y-3 w-full max-w-full min-w-0">
          {stacks.map(stack => {
            const stackHabits = habits.filter(h => stack.habit_ids.includes(h.id));
            const timeOpt = TIME_OF_DAY_OPTIONS.find(t => t.value === stack.time_of_day);
            return (
              <div
                key={stack.id}
                className="group p-4 bg-surface border border-border/70 rounded-xl hover:border-border transition-colors w-full max-w-full min-w-0"
              >
                <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug">{stack.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 min-w-0">
                      {timeOpt && (
                        <span className="text-[10px] text-muted break-words">{timeOpt.label}</span>
                      )}
                      {stack.trigger && (
                        <span className="text-[10px] text-muted/70 min-w-0 break-words [overflow-wrap:anywhere]">• After: {stack.trigger}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(stack)}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteStack(stack.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Habit chain visualization */}
                <div className="flex items-center flex-wrap gap-2 min-w-0 max-w-full">
                  {stackHabits.map((habit, idx) => (
                    <React.Fragment key={habit.id}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-secondary border border-border-subtle rounded-lg min-w-0 max-w-[160px]">
                        <span className="text-sm shrink-0">{habit.icon}</span>
                        <span className="text-[10px] font-semibold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug">{habit.name}</span>
                      </div>
                      {idx < stackHabits.length - 1 && (
                        <span className="text-muted text-xs shrink-0">→</span>
                      )}
                    </React.Fragment>
                  ))}
                  {stackHabits.length === 0 && (
                    <p className="text-[10px] text-muted italic break-words">No habits selected</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md min-w-0 z-10 max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between gap-2 mb-5 min-w-0">
              <h3 className="text-sm font-bold text-foreground min-w-0 flex-1 break-words">
                {editingStack ? 'Edit Stack' : 'New Habit Stack'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-muted hover:text-foreground shrink-0" aria-label="Close stack editor">
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-4 w-full max-w-full min-w-0">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 break-words">Stack Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning Power Routine"
                  className="w-full max-w-full min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 break-words">Time of Day</label>
                <div className="grid grid-cols-2 gap-2 w-full max-w-full min-w-0">
                  {TIME_OF_DAY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, time_of_day: opt.value as HabitStack['time_of_day'] }))}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors min-w-0 max-w-full ${
                        form.time_of_day === opt.value
                          ? 'bg-accent/10 border-accent/40 text-foreground'
                          : 'bg-surface-secondary border-border-subtle text-secondary-text hover:border-border'
                      }`}
                    >
                      <span className="font-bold block min-w-0 break-words">{opt.label}</span>
                      <span className="text-[10px] text-muted break-words">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 break-words">Trigger (optional)</label>
                <input
                  value={form.trigger}
                  onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                  placeholder="e.g. After waking up, After lunch"
                  className="w-full max-w-full min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2 break-words">
                  Select Habits * ({form.habit_ids.length} selected)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 min-w-0">
                  {habits.map(habit => {
                    const selected = form.habit_ids.includes(habit.id);
                    return (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabit(habit.id)}
                        className={`w-full max-w-full min-w-0 flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                          selected
                            ? 'bg-accent/10 border-accent/30 text-foreground'
                            : 'bg-surface-secondary border-border-subtle text-secondary-text hover:border-border hover:text-foreground'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'bg-accent border-accent' : 'border-border-subtle'
                        }`}>
                          {selected && <FiCheck size={12} className="text-accent-ink" strokeWidth={3} />}
                        </div>
                        <span className="text-base shrink-0">{habit.icon}</span>
                        <span className="text-xs font-semibold flex-1 min-w-0 break-words [overflow-wrap:anywhere] leading-snug">{habit.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-5 min-w-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 border border-border text-xs font-semibold text-muted rounded-xl hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || form.habit_ids.length === 0}
                className="flex-1 h-10 bg-accent text-accent-ink font-bold text-xs tracking-wider uppercase rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {editingStack ? 'Update Stack' : 'Create Stack'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitStackManager;
