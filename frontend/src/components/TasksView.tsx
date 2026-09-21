import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTaskStore, type Task, type TaskPriority } from '../store/useTaskStore';
import { FiPlus, FiCheck, FiTrash2, FiClock, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';

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
  style: React.CSSProperties;
}

const TaskItem = React.memo(({ task, isSelected, onToggle, onSelect, onDelete, style }: TaskItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  // Animate on mount
  useGSAP(() => {
    if (!itemRef.current) return;
    gsap.fromTo(itemRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }, []);

  return (
    <div style={style} className="pr-2 pb-3">
      <div 
        ref={itemRef}
        className={`group flex items-center gap-4 p-4 rounded-xl border transition-colors will-change-transform ${
          task.is_completed 
            ? 'bg-zinc-100 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/30 opacity-60' 
            : isSelected
              ? 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-600'
              : 'bg-white dark:bg-[#111] border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm dark:shadow-none'
        }`}
      >
        <div 
          className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
            task.is_completed 
              ? 'bg-green-500 border-green-500 text-white' 
              : isSelected
                ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                : 'border-zinc-300 dark:border-zinc-600 text-transparent hover:border-zinc-900 dark:hover:border-white'
          }`}
          onClick={() => onToggle(task.id)}
        >
          <FiCheck size={14} strokeWidth={3} />
        </div>
        
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className={`text-sm truncate transition-colors ${task.is_completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-200'}`}>
            {task.title}
          </span>
          
          {task.priority === 'High' && !task.is_completed && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 flex-shrink-0">
              HIGH
            </span>
          )}
          {task.priority === 'Low' && !task.is_completed && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
              LOW
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
            {format(new Date(task.created_at), 'MMM d')}
          </span>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
            className={`p-1.5 rounded-md transition-colors ${isSelected ? 'text-white bg-zinc-900 dark:bg-zinc-700' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            title="Select for bulk action"
          >
            <div className={`w-3 h-3 rounded-full border ${isSelected ? 'border-white bg-white' : 'border-zinc-400 dark:border-zinc-500'}`}></div>
          </button>
          
          <button 
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 rounded-md transition-colors"
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
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'PRIORITY'>('DATE_DESC');
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

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

  const handleCreateTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    addTask({
      title: newTaskTitle.trim(),
      description: '',
      priority: newTaskPriority,
      category: newTaskCategory,
      due_date: null
    });
    
    setNewTaskTitle('');
  }, [newTaskTitle, newTaskPriority, newTaskCategory, addTask]);

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

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: processedTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76, // Approximate height of TaskItem + padding
    overscan: 5,
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  return (
    <div className="flex flex-col h-full p-3 md:p-6 max-w-6xl mx-auto w-full gap-4 md:gap-6 relative transition-colors duration-300">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 flex-shrink-0 w-full">
        <div className="gsap-task-stat bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
          <div>
            <p className="text-zinc-500 text-xs font-bold tracking-widest mb-1 uppercase">Total Tasks</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white transition-colors duration-300">{totalTasks}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
            <span className="font-bold text-lg">∑</span>
          </div>
        </div>
        <div className="gsap-task-stat bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
          <div>
            <p className="text-amber-600 dark:text-amber-500/80 text-xs font-bold tracking-widest mb-1 uppercase">Pending</p>
            <p className="text-3xl font-black text-amber-500 transition-colors duration-300">{totalTasks - completedTasks}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 transition-colors duration-300">
            <FiClock size={20} />
          </div>
        </div>
        <div className="gsap-task-stat bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm dark:shadow-xl transition-all hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
          <div>
            <p className="text-emerald-600 dark:text-emerald-500/80 text-xs font-bold tracking-widest mb-1 uppercase">Completed</p>
            <p className="text-3xl font-black text-emerald-500 transition-colors duration-300">{completedTasks}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 transition-colors duration-300">
            <FiCheck size={20} />
          </div>
        </div>
      </div>

      {/* Input Row */}
      <form onSubmit={handleCreateTask} className="gsap-task-input flex-shrink-0 flex flex-col md:flex-row gap-3 relative z-10 p-1">
        <div className="flex-1 bg-white dark:bg-zinc-900/60 backdrop-blur-lg border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 md:px-5 flex items-center focus-within:border-zinc-400 dark:focus-within:border-white focus-within:bg-zinc-50 dark:focus-within:bg-zinc-900/90 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all">
          <FiPlus className="text-zinc-400 dark:text-zinc-500 mr-2 md:mr-3 transition-colors duration-300" />
          <input 
            type="text" 
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full h-12 md:h-14 bg-transparent text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm transition-colors duration-300"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            className="w-28 md:w-32 bg-white dark:bg-zinc-900/60 backdrop-blur-lg border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none h-12 md:h-14 transition-colors hover:border-zinc-300 dark:hover:border-zinc-500 cursor-pointer"
          >
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Finance">Finance</option>
            <option value="Health">Health</option>
            <option value="Study">Study</option>
          </select>
          <select 
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
            className="w-28 md:w-32 bg-white dark:bg-zinc-900/60 backdrop-blur-lg border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none h-12 md:h-14 transition-colors hover:border-zinc-300 dark:hover:border-zinc-500 cursor-pointer"
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
          <button type="submit" className="bg-black text-white dark:bg-white dark:text-black font-black px-6 md:px-8 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all tracking-widest text-sm h-12 md:h-14 shadow-none dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95">
            ADD
          </button>
        </div>
      </form>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between flex-shrink-0 mt-2 gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800/50 p-1 overflow-x-auto transition-colors duration-300">
            <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${filterStatus === 'ALL' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>ALL</button>
            <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${filterStatus === 'PENDING' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>PENDING</button>
            <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider transition-colors ${filterStatus === 'COMPLETED' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>COMPLETED</button>
          </div>
          
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border border-zinc-200 dark:border-zinc-800/50 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-300">
            <option value="DATE_DESC">Newest First</option>
            <option value="DATE_ASC">Oldest First</option>
            <option value="PRIORITY">Highest Priority</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex items-center bg-transparent border-b border-zinc-200 dark:border-zinc-800 px-2 py-2 md:py-1 w-full md:w-48 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
            <FiSearch className="text-zinc-400 dark:text-zinc-500 mr-2" size={14} />
            <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent w-full text-xs text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
          </div>
          
          {selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <span className="text-xs font-bold text-zinc-500 mr-2">{selectedTaskIds.size} selected</span>
              <button onClick={handleBulkComplete} className="text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-100 dark:bg-green-400/10 hover:bg-green-200 dark:hover:bg-green-400/20 px-3 py-1.5 rounded-lg transition-colors border border-green-200 dark:border-green-400/20">
                Complete
              </button>
              <button onClick={handleBulkDelete} className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-100 dark:bg-red-400/10 hover:bg-red-200 dark:hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors border border-red-200 dark:border-red-400/20">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List (Virtualized) */}
      <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2 pb-20 w-full" style={{ contain: 'strict' }}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-[76px] w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 transition-colors duration-300">
            <FiCheck size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold tracking-widest">NO TASKS FOUND</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = processedTasks[virtualRow.index];
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskIds.has(task.id)}
                  onToggle={toggleTask}
                  onSelect={handleToggleSelection}
                  onDelete={deleteTask}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
