import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTaskStore, type Task, type TaskPriority } from '../store/useTaskStore';
import { FiPlus, FiCheck, FiTrash2, FiClock, FiSearch, FiAlertCircle, FiX, FiChevronDown } from 'react-icons/fi';
import { Dropdown } from './Dropdown';
import { DatePicker } from './DatePicker';
import { format, parseISO } from 'date-fns';
import { getLocalTodayStr } from '../utils/dailyTracking';

// Custom hook for debouncing search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// -----------------------------------------------------------------------------
// Memoized Task Item Component
// -----------------------------------------------------------------------------
interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  style?: React.CSSProperties;
}

const TaskItem = React.memo(({ task, isSelected, onToggle, onSelect, onDelete, style }: TaskItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  // Animate on mount
  useGSAP(() => {
    if (!itemRef.current) return;
    gsap.fromTo(itemRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }, []);

  // Show the expand control only when the title actually overflows.
  // While expanded, measurement is skipped so the control stays put.
  useEffect(() => {
    if (expanded) return;
    const check = () => {
      const el = titleRef.current;
      setTruncated((prev) => {
        const next = !!el && el.scrollWidth > el.clientWidth + 1;
        return prev === next ? prev : next;
      });
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [task.title, expanded]);

  const dueDay = task.due_date ? task.due_date.slice(0, 10) : null;
  const isOverdue = !!dueDay && !task.is_completed && dueDay < getLocalTodayStr();
  const dateLabel = dueDay
    ? `${isOverdue ? 'Overdue ' : 'Due '}${format(parseISO(dueDay), 'MMM d')}`
    : format(new Date(task.created_at), 'MMM d');

  return (
    <div style={style} className="pr-2 pb-3">
      <div 
        ref={itemRef}
        className={`group flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-md border transition-colors duration-200 will-change-transform ${
          task.is_completed 
            ? 'bg-elevated border-border/40 opacity-60' 
            : isSelected
              ? 'bg-elevated border-accent/60'
              : 'bg-surface border-border/70 hover:border-border'
        }`}
      >
        <div 
          role="checkbox"
          aria-checked={task.is_completed}
          aria-label={`Mark ${task.title} as ${task.is_completed ? 'incomplete' : 'complete'}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(task.id);
            }
          }}
          className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-colors duration-200 flex-shrink-0 ${
            task.is_completed 
              ? 'bg-success border-success text-white dark:text-black' 
              : isSelected
                ? 'bg-accent border-accent text-accent-ink'
                : 'border-border text-transparent hover:border-muted dark:hover:border-accent/70'
          }`}
          onClick={() => onToggle(task.id)}
        >
          <FiCheck size={14} strokeWidth={3} />
        </div>
        
        <div className="flex-1 min-w-0">
          <span
            ref={titleRef}
            title={task.title}
            className={`block text-sm transition-colors duration-200 ${expanded ? 'whitespace-normal break-words' : 'truncate'} ${task.is_completed ? 'line-through text-muted' : 'text-foreground'}`}
          >
            {task.title}
          </span>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-2">
            {/* Row 1: category + priority */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted shrink-0">
                {task.category}
              </span>
              {!task.is_completed && (
                <>
                  <span aria-hidden="true" className="w-1 h-1 rounded-full bg-border shrink-0" />
                  {task.priority === 'High' && (
                    <span className="px-2 py-px rounded-sm text-[10px] font-bold tracking-[0.12em] bg-error/10 text-error border border-error/20 shrink-0">
                      HIGH
                    </span>
                  )}
                  {task.priority === 'Medium' && (
                    <span className="px-2 py-px rounded-sm text-[10px] font-bold tracking-[0.12em] bg-warning/10 text-warning border border-warning/20 shrink-0">
                      MEDIUM
                    </span>
                  )}
                  {task.priority === 'Low' && (
                    <span className="px-2 py-px rounded-sm text-[10px] font-bold tracking-[0.12em] bg-elevated text-muted border border-border/60 shrink-0">
                      LOW
                    </span>
                  )}
                </>
              )}
            </div>
            {/* Row 2 (mobile) / inline (sm+): date */}
            <span
              title={dueDay ? `Deadline: ${format(parseISO(dueDay), 'MMM d, yyyy')}` : `Created: ${format(new Date(task.created_at), 'MMM d, yyyy')}`}
              className={`flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] shrink-0 ${isOverdue ? 'text-error' : 'text-muted'}`}
            >
              <span aria-hidden="true" className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
              <FiClock size={10} aria-hidden="true" className="shrink-0" />
              {dateLabel}
            </span>
          </div>
        </div>

        {truncated && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Show less of this task' : 'Show full task text'}
            title={expanded ? 'Show less' : 'Show full task'}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 rounded text-muted hover:text-foreground hover:bg-elevated transition-colors duration-200"
          >
            <FiChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 transition-colors duration-200">
          
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
            aria-label={isSelected ? 'Deselect for bulk action' : 'Select for bulk action'}
            title="Select for bulk action"
            className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors duration-200 ${isSelected ? 'text-accent-ink bg-accent' : 'text-muted hover:text-foreground hover:bg-elevated'}`}
          >
            <div className={`w-3 h-3 rounded-full border ${isSelected ? 'border-accent-ink bg-accent-ink' : 'border-muted'}`}></div>
          </button>
          
          <button 
            onClick={() => onDelete(task.id)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-error hover:bg-error/10 rounded transition-colors duration-200"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.task === nextProps.task &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.style?.transform === nextProps.style?.transform &&
    prevProps.style?.height === nextProps.style?.height
  );
});

// -----------------------------------------------------------------------------
// Main TasksView Component
// -----------------------------------------------------------------------------
export const TasksView: React.FC = () => {
  const { tasks, isLoading, addTask, toggleTask, deleteTask, completeTasks, deleteTasks } = useTaskStore();
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('Work');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'PRIORITY'>('DATE_DESC');
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  // GSAP Entrance
  useGSAP(() => {
    gsap.fromTo('.gsap-task-stat', 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.2)' }
    );
    gsap.fromTo('.gsap-task-input', 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, delay: 0.3, ease: 'power3.out' }
    );
  }, []);

  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    
    const error = await addTask({
      title,
      description: '',
      priority: newTaskPriority,
      category: newTaskCategory,
      due_date: newTaskDueDate || null
    });

    // On failure the text is kept so nothing is lost, and the reason is shown.
    if (error) {
      setAddError(error);
      return;
    }
    setAddError(null);
    
    setNewTaskTitle('');
    setNewTaskDueDate('');
  }, [newTaskTitle, newTaskPriority, newTaskCategory, newTaskDueDate, addTask]);

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const handleBulkComplete = useCallback(() => {
    completeTasks(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, completeTasks]);

  const handleBulkDelete = useCallback(() => {
    deleteTasks(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, deleteTasks]);

  // Memoized Filtering and Sorting
  const processedTasks = useMemo(() => {
    let filtered = tasks.filter(t => {
      if (filterStatus === 'COMPLETED' && !t.is_completed) return false;
      if (filterStatus === 'PENDING' && t.is_completed) return false;
      if (debouncedSearch && !t.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'DATE_DESC') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'DATE_ASC') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'PRIORITY') {
        const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return p[b.priority] - p[a.priority];
      }
      return 0;
    });
  }, [tasks, filterStatus, debouncedSearch, sortBy]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  return (
    <div className="flex flex-col h-full p-3 md:p-4 lg:p-5 w-full gap-3 md:gap-4 relative overflow-y-auto custom-scrollbar">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 flex-shrink-0 w-full">
        <div className="gsap-task-stat bg-surface border border-border/70 rounded-md p-4 flex items-center justify-between transition-colors duration-200 hover:border-border">
          <div>
            <p className="text-muted text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase">Total Tasks</p>
            <p className="text-3xl font-bold tracking-tight text-accent tabular-nums transition-colors duration-200">{totalTasks}</p>
          </div>
          <div className="w-12 h-12 rounded bg-elevated flex items-center justify-center text-muted transition-colors duration-200">
            <span className="font-bold text-lg">∑</span>
          </div>
        </div>
        <div className="gsap-task-stat bg-surface border border-border/70 rounded-md p-4 flex items-center justify-between transition-colors duration-200 hover:border-border">
          <div>
            <p className="text-warning text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase">Pending</p>
            <p className="text-3xl font-bold tracking-tight text-warning tabular-nums transition-colors duration-200">{totalTasks - completedTasks}</p>
          </div>
          <div className="w-12 h-12 rounded bg-warning/10 flex items-center justify-center text-warning transition-colors duration-200">
            <FiClock size={20} />
          </div>
        </div>
        <div className="gsap-task-stat bg-surface border border-border/70 rounded-md p-4 flex items-center justify-between transition-colors duration-200 hover:border-border">
          <div>
            <p className="text-success text-[11px] font-semibold tracking-[0.14em] mb-1 uppercase">Completed</p>
            <p className="text-3xl font-bold tracking-tight text-success tabular-nums transition-colors duration-200">{completedTasks}</p>
          </div>
          <div className="w-12 h-12 rounded bg-success/10 flex items-center justify-center text-success transition-colors duration-200">
            <FiCheck size={20} />
          </div>
        </div>
      </div>

      {/* Input Row */}
      <form onSubmit={handleCreateTask} className="gsap-task-input flex-shrink-0 flex flex-col lg:flex-row lg:items-center gap-2 relative z-10">
        <div className="w-full h-16 bg-elevated border border-border/70 rounded px-4 flex items-center focus-within:border-accent transition-colors duration-200">
          <FiPlus className="text-muted mr-3 shrink-0 transition-colors duration-200" size={18} />
          <input 
            type="text" 
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => { setNewTaskTitle(e.target.value); if (addError) setAddError(null); }}
            aria-label="New task title"
            className="w-full h-full bg-transparent text-foreground focus:outline-none placeholder:text-muted text-sm leading-none transition-colors duration-200"
          />
        </div>
        <div className="grid grid-cols-1 min-[380px]:grid-cols-[1fr_1.45fr] gap-3 lg:flex lg:gap-2">
          <Dropdown
            value={newTaskCategory}
            onChange={setNewTaskCategory}
            ariaLabel="Task category"
            tall
            className="w-full lg:w-36"
            options={[
              { value: 'Work', label: 'Work' },
              { value: 'Personal', label: 'Personal' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Health', label: 'Health' },
              { value: 'Study', label: 'Study' },
            ]}
          />
          <Dropdown
            value={newTaskPriority}
            onChange={(v) => setNewTaskPriority(v as TaskPriority)}
            ariaLabel="Task priority"
            tall
            className="w-full lg:w-52"
            options={[
              { value: 'Low', label: 'Low Priority' },
              { value: 'Medium', label: 'Medium Priority' },
              { value: 'High', label: 'High Priority' },
            ]}
          />
          <DatePicker
            value={newTaskDueDate}
            onChange={setNewTaskDueDate}
            ariaLabel="Task deadline (optional)"
            placeholder="Deadline"
            tall
            className="w-full lg:w-44"
          />
          <button type="submit" className="shrink-0 h-16 px-6 md:px-8 flex items-center justify-center whitespace-nowrap bg-accent text-accent-ink font-bold rounded hover:brightness-110 transition-colors duration-200 tracking-[0.14em] text-xs active:scale-[0.98]">
            ADD
          </button>
        </div>
      </form>

      {/* Save-error notice (e.g. backend unreachable, session expired) */}
      {addError && (
        <div role="alert" className="flex-shrink-0 flex items-start gap-2 bg-error/10 border border-error/25 text-error text-xs font-medium rounded px-4 py-3 transition-colors duration-200">
          <FiAlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
          <p className="flex-1">{addError}</p>
          <button
            type="button"
            onClick={() => setAddError(null)}
            aria-label="Dismiss error"
            className="shrink-0 p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-error/10 transition-colors duration-200"
          >
            <FiX size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Filters & Bulk Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between flex-shrink-0 mt-2 gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center bg-elevated rounded border border-border/60 p-1 overflow-x-auto transition-colors duration-200">
            <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 min-h-[36px] rounded-sm text-[11px] font-semibold tracking-[0.12em] transition-colors duration-200 ${filterStatus === 'ALL' ? 'bg-surface dark:bg-accent text-foreground dark:text-accent-ink' : 'text-muted hover:text-foreground'}`}>ALL</button>
            <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-2 min-h-[36px] rounded-sm text-[11px] font-semibold tracking-[0.12em] transition-colors duration-200 ${filterStatus === 'PENDING' ? 'bg-surface dark:bg-accent text-foreground dark:text-accent-ink' : 'text-muted hover:text-foreground'}`}>PENDING</button>
            <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-2 min-h-[36px] rounded-sm text-[11px] font-semibold tracking-[0.12em] transition-colors duration-200 ${filterStatus === 'COMPLETED' ? 'bg-surface dark:bg-accent text-foreground dark:text-accent-ink' : 'text-muted hover:text-foreground'}`}>COMPLETED</button>
          </div>
          
          <div className="flex items-center bg-elevated rounded border border-border/60 p-1 transition-colors duration-200">
            <Dropdown
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              ariaLabel="Sort tasks"
              bare
              className="w-full sm:w-48"
              options={[
                { value: 'DATE_DESC', label: 'Newest First' },
                { value: 'DATE_ASC', label: 'Oldest First' },
                { value: 'PRIORITY', label: 'Highest Priority' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex items-center bg-transparent border-b border-border px-2 py-2 md:py-1 w-full md:w-48 focus-within:border-accent transition-colors duration-200">
            <FiSearch className="text-muted mr-2" size={14} />
            <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent w-full text-xs text-foreground focus:outline-none placeholder:text-muted" />
          </div>
          
          {selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.08em] text-muted mr-2">{selectedTaskIds.size} selected</span>
              <button onClick={handleBulkComplete} className="text-xs font-bold tracking-[0.08em] text-success hover:text-success bg-success/10 hover:bg-success/20 px-4 py-2 min-h-[44px] rounded transition-colors duration-200 border border-success/20">
                Complete
              </button>
              <button onClick={handleBulkDelete} className="text-xs font-bold tracking-[0.08em] text-error hover:text-error bg-error/10 hover:bg-error/20 px-4 py-2 min-h-[44px] rounded transition-colors duration-200 border border-error/20">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List (whole-section scroll) */}
      <div className="w-full mt-2 pb-4">
        {isLoading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[76px] w-full bg-elevated rounded-md animate-pulse mb-3"></div>
            ))}
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted transition-colors duration-200">
            <FiCheck size={48} className="mb-4 opacity-20" />
            <p className="text-xs font-semibold tracking-[0.2em]">NO TASKS FOUND</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {processedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskIds.has(task.id)}
                onToggle={toggleTask}
                onSelect={handleToggleSelection}
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
