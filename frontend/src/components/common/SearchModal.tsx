import React, { useState, useEffect, useMemo } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useJournalStore } from '../../store/useJournalStore';
import type { SearchResult, SearchResultType } from '../../types';
import { FiSearch, FiX, FiCheckSquare, FiGrid, FiBookOpen } from 'react-icons/fi';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | SearchResultType>('ALL');

  const { tasks } = useTaskStore();
  const { habits } = useHabitStore();
  const { entries } = useJournalStore();

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Tasks
    if (activeFilter === 'ALL' || activeFilter === 'task') {
      tasks.forEach(t => {
        if (t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))) {
          results.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: `Priority: ${t.priority} • Category: ${t.category}`,
            badge: t.is_completed ? 'Completed' : 'Pending'
          });
        }
      });
    }

    // Habits
    if (activeFilter === 'ALL' || activeFilter === 'habit') {
      habits.forEach(h => {
        if (h.name.toLowerCase().includes(q)) {
          results.push({
            id: h.id,
            type: 'habit',
            title: `${h.icon} ${h.name}`,
            subtitle: `Monthly Goal: ${h.monthly_goal} days`,
            badge: 'Habit'
          });
        }
      });
    }


    // Journal
    if (activeFilter === 'ALL' || activeFilter === 'journal') {
      entries.forEach(j => {
        if (j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q)) {
          results.push({
            id: j.id,
            type: 'journal',
            title: j.title,
            subtitle: `Date: ${j.entry_date}`,
            badge: 'Journal'
          });
        }
      });
    }

    return results;
  }, [query, activeFilter, tasks, habits, entries]);

  if (!isOpen) return null;

  const handleSelectResult = (result: SearchResult) => {
    onClose();
    if (result.type === 'task') onNavigateTab('TASKS');
    else if (result.type === 'habit') onNavigateTab('GRID');
    else if (result.type === 'journal') onNavigateTab('JOURNAL');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[max(0.75rem,var(--sat))] sm:pt-20 px-2 sm:px-4 pb-[env(safe-area-inset-bottom,0px)] bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border/90 rounded-xl w-full max-w-[min(36rem,calc(100vw-2rem))] shadow-2xl overflow-hidden flex flex-col transition-colors min-h-0 max-h-[calc(100dvh-2rem)] min-w-0">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 h-14 border-b border-border-subtle gap-3 bg-surface-secondary/50 flex-shrink-0 min-w-0">
          <FiSearch className="text-secondary-text shrink-0" size={18} />
          <input
            type="text"
            autoFocus
            placeholder="Type to search tasks, habits, journal..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 w-full max-w-full box-border bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-secondary-text hover:text-foreground p-1 shrink-0">
              <FiX size={16} />
            </button>
          )}
          <span className="text-[10px] font-bold text-secondary-text bg-surface-secondary px-2 py-0.5 rounded border border-border-subtle shrink-0 whitespace-nowrap">
            ESC
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle bg-surface overflow-x-auto custom-scrollbar flex-shrink-0 min-w-0">
          {(['ALL', 'task', 'habit', 'journal'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeFilter === f
                  ? 'bg-surface-secondary text-foreground font-bold border border-border/80 shadow-xs'
                  : 'bg-transparent text-secondary-text hover:text-foreground hover:bg-surface-secondary/40'
              }`}
            >
              {f === 'ALL' ? 'ALL' : f + 's'}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar space-y-1 min-h-0 min-w-0">
          {!query.trim() ? (
            <p className="text-xs text-secondary-text text-center py-10">Start typing to search across your Trackiyo workspace.</p>
          ) : searchResults.length === 0 ? (
            <p className="text-xs text-secondary-text text-center py-10">No matching items found.</p>
          ) : (
            searchResults.map(res => (
              <div
                key={`${res.type}-${res.id}`}
                onClick={() => handleSelectResult(res)}
                className="flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-surface-secondary border border-transparent hover:border-border-subtle cursor-pointer transition-all min-w-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center shrink-0">
                    {res.type === 'task' && <FiCheckSquare size={14} className="text-accent" />}
                    {res.type === 'habit' && <FiGrid size={14} className="text-success" />}
                    {res.type === 'journal' && <FiBookOpen size={14} className="text-secondary-text" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate min-w-0">{res.title}</span>
                    <span className="text-[10px] text-secondary-text truncate block min-w-0">{res.subtitle}</span>
                  </div>
                </div>

                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-surface-secondary border border-border-subtle text-secondary-text shrink-0">
                  {res.badge}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
