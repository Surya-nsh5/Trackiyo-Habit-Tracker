import React, { useEffect, useState } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { FiPlus, FiTrash2, FiCheck } from 'react-icons/fi';
import type { Template } from '../../types';

interface TemplatePickerProps {
  type?: Template['type'];
  onApply?: (data: unknown) => void;
  compact?: boolean;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ type, onApply, compact }) => {
  const { templates, isLoading, fetchTemplates, createTemplate, deleteTemplate, applyTemplate } = useTemplateStore();
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchTemplates(type); }, [fetchTemplates, type]);

  const handleApply = async (id: string) => {
    try {
      const res = await applyTemplate(id);
      onApply?.(res);
      useTaskStore.getState().fetchTasks(true);
      useHabitStore.getState().loadData(true);
    } catch {}
  };

  return (
    <div className={compact ? 'min-w-0 max-w-full' : 'bg-surface border border-border/80 rounded-xl p-4 shadow-xs min-w-0 max-w-full box-border'}>
      {!compact && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-secondary-text">Templates</span>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1 text-[10px] font-bold uppercase text-accent hover:underline">
            <FiPlus size={12} /> New
          </button>
        </div>
      )}
      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { createTemplate(name.trim(), type || 'task', { title: name.trim() }); setName(''); setShowForm(false); } }}
          className="flex items-center gap-2 mb-3 min-w-0">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name..."
            className="flex-1 min-w-0 w-full max-w-full box-border h-9 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
          <button type="submit" className="h-9 px-3 bg-accent text-accent-ink text-xs font-bold rounded-lg shrink-0 whitespace-nowrap">SAVE</button>
        </form>
      )}
      {isLoading ? (
        <div className="h-10 w-full max-w-full bg-elevated rounded-lg animate-pulse" />
      ) : templates.length === 0 ? (
        <p className="text-xs text-muted italic py-3 text-center break-words">No templates yet. Save one to reuse routines.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar min-h-0 min-w-0">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-secondary/50 border border-border-subtle text-xs min-w-0">
              <div className="min-w-0 flex-1 mr-2">
                <p className="font-semibold text-foreground truncate min-w-0">{t.name}</p>
                <p className="text-[10px] text-muted uppercase truncate min-w-0">{t.type}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleApply(t.id)} title="Apply template" className="p-1.5 text-success hover:bg-success/10 rounded"><FiCheck size={13} /></button>
                <button onClick={() => deleteTemplate(t.id)} title="Delete template" className="p-1.5 text-muted hover:text-error rounded"><FiTrash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatePicker;
