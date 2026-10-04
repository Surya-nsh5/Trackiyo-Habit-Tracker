import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import {
  FiSearch, FiCheckSquare, FiZap, FiHome, FiGrid, FiClock,
  FiActivity, FiBarChart2, FiUsers, FiSettings
} from 'react-icons/fi';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenAI: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenAI,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tasks } = useTaskStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const navItems: PaletteItem[] = useMemo(() => [
    {
      id: 'nav-home',
      label: 'Today Overview',
      sublabel: "Today's pulse, progress and quick stats",
      icon: <FiHome size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('TODAY'); onClose(); },
      keywords: ['home', 'dashboard', 'overview', 'today']
    },
    {
      id: 'nav-habits',
      label: 'Habits Matrix',
      sublabel: 'Routines, streaks & monthly consistency',
      icon: <FiGrid size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('HABITS'); onClose(); },
      keywords: ['habits', 'grid', 'streak', 'routines']
    },
    {
      id: 'nav-tasks',
      label: 'Tasks & Planner',
      sublabel: 'Task manager, priorities & calendar timeline',
      icon: <FiCheckSquare size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('TASKS'); onClose(); },
      keywords: ['tasks', 'todo', 'work', 'planner', 'calendar']
    },
    {
      id: 'nav-focus',
      label: 'Focus Chamber',
      sublabel: 'Pomodoro timer & flow session logs',
      icon: <FiClock size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('FOCUS'); onClose(); },
      keywords: ['focus', 'pomodoro', 'timer', 'chamber']
    },
    {
      id: 'nav-wellness',
      label: 'Wellness Vitality',
      sublabel: 'Mood, sleep, energy & water hydration',
      icon: <FiActivity size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('WELLNESS'); onClose(); },
      keywords: ['wellness', 'mood', 'sleep', 'energy', 'water']
    },
    {
      id: 'nav-analytics',
      label: 'Analytics & Insights',
      sublabel: 'Productivity trends & contribution heatmaps',
      icon: <FiBarChart2 size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('INSIGHTS'); onClose(); },
      keywords: ['analytics', 'stats', 'data', 'insights', 'heatmap']
    },
    {
      id: 'nav-friends',
      label: 'Friends & Challenges',
      sublabel: 'Social accountability & streak duels',
      icon: <FiUsers size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('CONNECT'); onClose(); },
      keywords: ['friends', 'social', 'accountability', 'challenges', 'connect']
    },
    {
      id: 'nav-settings',
      label: 'Settings & Themes',
      sublabel: 'Visual themes, account profile & preferences',
      icon: <FiSettings size={14} />,
      category: 'Navigate',
      action: () => { onNavigate('SETTINGS'); onClose(); },
      keywords: ['settings', 'preferences', 'themes', 'profile', 'appearance']
    },
  ], [onNavigate, onClose]);

  const actionItems: PaletteItem[] = useMemo(() => [
    {
      id: 'action-ai',
      label: 'Ask AI Coach & Assistant',
      sublabel: 'Coaching, task priority audit & habit insights',
      icon: <FiZap size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onOpenAI(); onClose(); },
      keywords: ['ai', 'coach', 'assistant', 'help', 'ask', 'coaching', 'advice', 'productivity']
    },
    {
      id: 'action-focus',
      label: 'Start Pomodoro / Focus',
      sublabel: '25 min deep work flow session',
      icon: <FiClock size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onNavigate('FOCUS'); onClose(); },
      keywords: ['pomodoro', 'start', 'focus', 'timer', 'chamber']
    },
    {
      id: 'action-habits',
      label: "Log Today's Habits",
      sublabel: 'Mark habits completed on the consistency grid',
      icon: <FiGrid size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onNavigate('HABITS'); onClose(); },
      keywords: ['habits', 'log', 'today', 'check', 'streak', 'matrix']
    },
    {
      id: 'action-wellness',
      label: 'Log Wellness Check-in',
      sublabel: 'Mood, sleep hours, water & energy levels',
      icon: <FiActivity size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onNavigate('WELLNESS'); onClose(); },
      keywords: ['wellness', 'water', 'sleep', 'mood', 'energy', 'log']
    },
    {
      id: 'action-reschedule',
      label: 'Smart Reschedule Overdue',
      sublabel: 'Move overdue tasks forward by priority',
      icon: <FiCheckSquare size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onNavigate('TASKS'); onClose(); },
      keywords: ['reschedule', 'overdue', 'smart', 'tasks']
    },
    {
      id: 'action-heatmaps',
      label: 'View Consistency Heatmap',
      sublabel: 'Annual activity rhythm for habits & focus',
      icon: <FiBarChart2 size={14} className="text-accent" />,
      category: 'Actions',
      action: () => { onNavigate('INSIGHTS'); onClose(); },
      keywords: ['heatmap', 'consistency', 'analytics', 'insights', 'annual', 'activity']
    }
  ], [onOpenAI, onNavigate, onClose]);

  // Task items from store
  const taskItems: PaletteItem[] = useMemo(() => {
    return tasks
      .filter(t => !t.is_completed)
      .slice(0, 30)
      .map(t => ({
        id: `task-${t.id}`,
        label: t.title,
        sublabel: `${t.priority} • ${t.category}${t.due_date ? ` • Due ${t.due_date.slice(0, 10)}` : ''}`,
        icon: <FiCheckSquare size={14} className="text-muted" />,
        category: 'Tasks',
        keywords: [t.title.toLowerCase(), t.category?.toLowerCase(), t.priority?.toLowerCase()],
        action: () => { onNavigate('TASKS'); onClose(); },
      }));
  }, [tasks, onNavigate, onClose]);

  const allItems = useMemo(() => [...actionItems, ...navItems, ...taskItems], [actionItems, navItems, taskItems]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel || '').toLowerCase().includes(q) ||
      (item.keywords || []).some(k => k?.includes(q))
    );
  }, [query, allItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  const flatFiltered = filtered;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatFiltered[selectedIdx]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [flatFiltered, selectedIdx, onClose]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Reliable scroll selected into view using exact element ID
  useEffect(() => {
    const el = document.getElementById(`palette-item-${selectedIdx}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIdx]);

  if (!isOpen) return null;

  let flatCounter = 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[max(5vh,var(--sat))] sm:pt-[7vh] pb-[max(1.5rem,var(--sab))] px-3 sm:px-4 min-w-0">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Palette panel with strict viewport containment */}
      <div className="relative w-full max-w-[min(34rem,calc(100vw-1.5rem))] bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col min-h-0 max-h-[82vh] animate-fadeIn">
        {/* Search input header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 flex-shrink-0 min-w-0 bg-surface">
          <FiSearch size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, tasks, views..."
            className="flex-1 min-w-0 w-full max-w-full box-border bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="text-[10px] text-muted bg-surface-secondary border border-border-subtle px-1.5 py-0.5 rounded font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Scrollable Results List */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain py-2 pr-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-muted">
              No matching commands or tasks found
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <div className="px-4 py-1">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-[0.14em]">{category}</span>
                  </div>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const currentIdx = flatCounter++;
                      const isSelected = currentIdx === selectedIdx;
                      return (
                        <div
                          key={item.id}
                          id={`palette-item-${currentIdx}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIdx(currentIdx)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors min-w-0 mx-1.5 rounded-lg ${
                            isSelected
                              ? 'bg-surface-secondary text-foreground'
                              : 'text-secondary-text hover:bg-surface-hover hover:text-foreground'
                          }`}
                        >
                          <span className={`shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}>
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold truncate">{item.label}</span>
                            {item.sublabel && (
                              <span className="block text-[10px] text-muted truncate mt-0.5">{item.sublabel}</span>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="text-[9px] text-muted bg-elevated border border-border-subtle px-1.5 py-0.5 rounded font-mono shrink-0">
                              ↵
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Footer Bar */}
        <div className="px-4 py-2.5 border-t border-border/50 flex-shrink-0 flex items-center justify-between gap-2 min-w-0 bg-surface text-secondary-text">
          <span className="text-[10px] text-muted truncate">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3 text-[10px] text-muted shrink-0 font-medium">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
