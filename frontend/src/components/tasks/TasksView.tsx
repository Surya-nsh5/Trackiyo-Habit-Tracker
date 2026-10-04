import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import api from '../../services/api';
import type { Task, TaskPriority, RecurrenceFrequency } from '../../types';
import {
  FiPlus, FiCheck, FiTrash2, FiClock, FiSearch, FiAlertCircle, FiX,
  FiEdit2, FiRepeat, FiCheckSquare, FiZap, FiRefreshCw,
  FiChevronDown
} from 'react-icons/fi';
import { Dropdown } from '../common/Dropdown';
import { DatePicker } from '../common/DatePicker';
import { format, parseISO } from 'date-fns';
import { getLocalTodayStr } from '../../utils/dailyTracking';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const TasksView: React.FC = () => {
  const { tasks, isLoading, addTask, updateTask, toggleTask, deleteTask, completeTasks, deleteTasks, addSubtask, toggleSubtask, deleteSubtask } = useTaskStore();
  const { promptDelete } = useDeleteConfirmStore();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'PRIORITY' | 'SMART'>('DATE_DESC');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [expandedSubtasksTaskIds, setExpandedSubtasksTaskIds] = useState<Set<string>>(new Set());

  const toggleSubtasksExpand = useCallback((taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedSubtasksTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Task Details Modal (Create & Edit)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('Medium');
  const [editCategory, setEditCategory] = useState('Work');
  const [editDueDate, setEditDueDate] = useState('');
  const [editEstDuration, setEditEstDuration] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editRecurrenceFreq, setEditRecurrenceFreq] = useState<string>('none');
  const [editEnergy, setEditEnergy] = useState<string>('medium');
  const [editDependsOn, setEditDependsOn] = useState<string>('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [createSubtasks, setCreateSubtasks] = useState<string[]>([]);

  const openCreateModal = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDesc('');
    setEditPriority('Medium');
    setEditCategory('Work');
    setEditDueDate('');
    setEditEstDuration(0);
    setEditNotes('');
    setEditRecurrenceFreq('none');
    setEditEnergy('medium');
    setEditDependsOn('');
    setNewSubtaskTitle('');
    setCreateSubtasks([]);
    setAddError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setIsCreateModalOpen(false);
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority);
    setEditCategory(task.category || 'General');
    setEditDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setEditEstDuration(task.estimated_duration || 0);
    setEditNotes(task.notes || '');
    setEditRecurrenceFreq(task.recurrence ? task.recurrence.frequency : 'none');
    setEditEnergy((task.energy_level as string) || 'medium');
    setEditDependsOn(task.depends_on_task_id || '');
    setNewSubtaskTitle('');
    setCreateSubtasks([]);
    setAddError(null);
  };

  const closeModal = () => {
    setEditingTask(null);
    setIsCreateModalOpen(false);
    setNewSubtaskTitle('');
    setCreateSubtasks([]);
    setAddError(null);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    if (!title || isSubmittingTask) return;

    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title,
          description: editDesc.trim(),
          priority: editPriority,
          category: editCategory.trim() || 'General',
          due_date: editDueDate || null,
          estimated_duration: editEstDuration,
          notes: editNotes.trim(),
          energy_level: editEnergy,
          depends_on_task_id: editDependsOn || null,
          recurrence: editRecurrenceFreq !== 'none' ? { frequency: editRecurrenceFreq as RecurrenceFrequency } : null
        });
        closeModal();
      } else {
        const initialSubtasks = createSubtasks.map((st, idx) => ({
          id: `temp-${Date.now()}-${idx}`,
          title: st,
          completed: false,
        }));

        const error = await addTask({
          title,
          description: editDesc.trim(),
          priority: editPriority,
          category: editCategory.trim() || 'General',
          due_date: editDueDate || null,
          estimated_duration: editEstDuration || 0,
          notes: editNotes.trim(),
          energy_level: editEnergy,
          depends_on_task_id: editDependsOn || null,
          recurrence: editRecurrenceFreq !== 'none' ? { frequency: editRecurrenceFreq as RecurrenceFrequency } : null,
          subtasks: initialSubtasks,
        });

        if (error) {
          setAddError(error);
          return;
        }
        closeModal();
      }
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleRecalculatePriority = useCallback(async () => {
    setIsRecalculating(true);
    try {
      await api.post('/ai/smart-priority');
      await useTaskStore.getState().fetchTasks();
    } catch { /* offline — scores stay local */ }
    setIsRecalculating(false);
  }, []);

  const handleSmartReschedule = useCallback(async () => {
    setIsRescheduling(true);
    try {
      await api.post('/tasks/reschedule');
      await useTaskStore.getState().fetchTasks();
    } catch { }
    setIsRescheduling(false);
  }, []);

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

  // Filtering & Sorting
  const processedTasks = useMemo(() => {
    const todayStr = getLocalTodayStr();
    let filtered = tasks.filter(t => {
      if (filterStatus === 'COMPLETED' && !t.is_completed) return false;
      if (filterStatus === 'TODAY') {
        if (t.is_completed) return false;
        const dueDay = t.due_date ? t.due_date.slice(0, 10) : null;
        if (dueDay && dueDay > todayStr) return false;
      }
      if (filterStatus === 'UPCOMING') {
        if (t.is_completed) return false;
        const dueDay = t.due_date ? t.due_date.slice(0, 10) : null;
        if (!dueDay || dueDay <= todayStr) return false;
      }
      if (debouncedSearch && !t.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'DATE_DESC') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'DATE_ASC') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'SMART') return (b.priority_score || 0) - (a.priority_score || 0);
      if (sortBy === 'PRIORITY') {
        const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return p[b.priority] - p[a.priority];
      }
      return 0;
    });
  }, [tasks, filterStatus, debouncedSearch, sortBy]);

  const todayStr = getLocalTodayStr();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const todayTasksCount = tasks.filter(t => !t.is_completed && (!t.due_date || t.due_date.slice(0, 10) <= todayStr)).length;
  const upcomingTasksCount = tasks.filter(t => !t.is_completed && !!t.due_date && t.due_date.slice(0, 10) > todayStr).length;
  const overdueTasksCount = tasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    return t.due_date.slice(0, 10) < todayStr;
  }).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full w-full max-w-full min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5">
      <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col gap-3 md:gap-4 relative">

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 md:pb-4 flex-shrink-0 flex-wrap w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base md:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex flex-wrap items-center gap-2.5 min-w-0 break-words">
            <FiCheckSquare className="text-accent shrink-0" size={20} />
            <span className="min-w-0 break-words">Tasks & Action Items</span>
          </h1>
          <p className="text-xs text-secondary-text mt-0.5 min-w-0 break-words">
            Organize high-priority work, manage subtasks, and track completion progress.
          </p>
        </div>

        {/* Right Corner: + Task Button */}
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <FiPlus size={14} strokeWidth={2.5} />
          <span>Task</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. COMPACT METRICS & PROGRESS BANNER                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 flex-shrink-0 w-full max-w-full min-w-0">
        {/* Total Tasks */}
        <div className="gsap-task-stat bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-secondary-text text-[10px] font-bold tracking-[0.14em] uppercase break-words">Total Tasks</p>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-0.5">{totalTasks}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border-subtle flex items-center justify-center text-muted font-bold text-sm shrink-0">
            ∑
          </div>
        </div>

        {/* Pending */}
        <div className="gsap-task-stat bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-warning text-[10px] font-bold tracking-[0.14em] uppercase break-words">Pending</p>
            <p className="text-2xl font-bold tracking-tight text-warning tabular-nums mt-0.5">{pendingTasks}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
            <FiClock size={15} />
          </div>
        </div>

        {/* Completed */}
        <div className="gsap-task-stat bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-colors min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-success text-[10px] font-bold tracking-[0.14em] uppercase break-words">Completed</p>
            <p className="text-2xl font-bold tracking-tight text-success tabular-nums mt-0.5">{completedTasks}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center text-success shrink-0">
            <FiCheck size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* Progress / Completion Rate */}
        <div className="gsap-task-stat bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-1 shadow-xs transition-colors min-w-0 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold tracking-[0.14em] uppercase min-w-0">
            <span className="text-secondary-text">Momentum</span>
            {overdueTasksCount > 0 ? (
              <span className="text-error font-bold">{overdueTasksCount} Overdue</span>
            ) : (
              <span className="text-accent font-bold">{completionRate}% Done</span>
            )}
          </div>
          <div className="mt-1.5 space-y-1">
            <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="text-[10px] text-muted font-medium text-right tabular-nums">
              {completedTasks} of {totalTasks} finished
            </div>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {addError && !isCreateModalOpen && !editingTask && (
        <div role="alert" className="flex-shrink-0 flex items-start gap-2 bg-error/10 border border-error/25 text-error text-xs font-medium rounded-lg px-4 py-2.5 w-full max-w-full min-w-0">
          <FiAlertCircle size={15} className="shrink-0 mt-0.5" />
          <p className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{addError}</p>
          <button type="button" onClick={() => setAddError(null)} className="shrink-0 p-1 hover:opacity-80 cursor-pointer">
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TOOLBAR: FILTERS + SEARCH + TOOLS                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between flex-shrink-0 gap-2.5 w-full max-w-full min-w-0">
        {/* Left: Status Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
          {/* Status Filter Chips with Counts */}
          <div className="flex items-center flex-wrap gap-0.5 bg-surface-secondary rounded-lg border border-border-subtle p-0.5 max-w-full min-w-0 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${filterStatus === 'ALL'
                ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                : 'text-muted hover:text-foreground'
                }`}
            >
              <span>ALL</span>
              <span className="text-[10px] opacity-75 font-semibold tabular-nums">({totalTasks})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('TODAY')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${filterStatus === 'TODAY'
                ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                : 'text-muted hover:text-foreground'
                }`}
            >
              <span>TODAY</span>
              <span className="text-[10px] opacity-75 font-semibold tabular-nums">({todayTasksCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('UPCOMING')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${filterStatus === 'UPCOMING'
                ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                : 'text-muted hover:text-foreground'
                }`}
            >
              <span>UPCOMING</span>
              <span className="text-[10px] opacity-75 font-semibold tabular-nums">({upcomingTasksCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${filterStatus === 'COMPLETED'
                ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                : 'text-muted hover:text-foreground'
                }`}
            >
              <span>COMPLETED</span>
              <span className="text-[10px] opacity-75 font-semibold tabular-nums">({completedTasks})</span>
            </button>
          </div>
        </div>

        {/* Right: Search, Sort, AI Tools */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
          {/* Search Box */}
          <div className="flex items-center bg-surface-secondary border border-border-subtle rounded-lg px-2.5 py-1.5 flex-1 min-w-0 sm:min-w-[140px] sm:w-44 sm:flex-none max-w-full focus-within:border-accent">
            <FiSearch className="text-muted mr-1.5 shrink-0" size={13} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent w-full max-w-full min-w-0 text-xs text-foreground focus:outline-none placeholder:text-muted/70"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted hover:text-foreground p-0.5 cursor-pointer shrink-0">
                <FiX size={12} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="w-28 sm:w-32 shrink-0 max-w-full">
            <Dropdown
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              ariaLabel="Sort"
              bare
              options={[
                { value: 'DATE_DESC', label: 'Newest' },
                { value: 'DATE_ASC', label: 'Oldest' },
                { value: 'PRIORITY', label: 'Priority' },
                { value: 'SMART', label: 'Smart Score' }
              ]}
            />
          </div>

          {/* AI Smart Rescore */}
          <button
            type="button"
            onClick={handleRecalculatePriority}
            disabled={isRecalculating}
            title="AI smart priority re-score"
            className="flex items-center gap-1 px-2.5 py-1.5 h-8 rounded-lg border border-border-subtle bg-surface-secondary text-[11px] font-bold text-accent hover:border-accent/60 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <FiZap size={12} />
            <span className="hidden sm:inline">{isRecalculating ? 'Scoring...' : 'Smart'}</span>
          </button>

          {/* Reschedule Overdue */}
          <button
            type="button"
            onClick={handleSmartReschedule}
            disabled={isRescheduling}
            title="Move overdue tasks forward by priority"
            className="flex items-center gap-1 px-2.5 py-1.5 h-8 rounded-lg border border-border-subtle bg-surface-secondary text-[11px] font-bold text-secondary-text hover:text-foreground hover:border-border disabled:opacity-50 cursor-pointer shrink-0"
          >
            <FiRefreshCw size={12} className={isRescheduling ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRescheduling ? 'Moving...' : 'Reschedule'}</span>
          </button>

          {/* Bulk Selection Bar */}
          {selectedTaskIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1.5 border-l border-border-subtle min-w-0">
              <button
                type="button"
                onClick={handleBulkComplete}
                className="text-[11px] font-bold text-success bg-success/15 px-2.5 py-1 rounded-md border border-success/30 hover:bg-success/25 transition-colors cursor-pointer"
              >
                Done ({selectedTaskIds.size})
              </button>
              <button
                type="button"
                onClick={() => promptDelete({
                  title: `Delete ${selectedTaskIds.size} Tasks?`,
                  message: `Are you sure you want to delete ${selectedTaskIds.size} selected tasks? This cannot be undone.`,
                  itemName: `${selectedTaskIds.size} tasks`,
                  onConfirm: handleBulkDelete
                })}
                className="text-[11px] font-bold text-error bg-error/15 px-2.5 py-1 rounded-md border border-error/30 hover:bg-error/25 transition-colors cursor-pointer"
              >
                Del
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TASKS LIST                                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full max-w-full min-w-0 mt-1 pb-6">
        {isLoading ? (
          <div className="flex flex-col gap-2.5 w-full max-w-full min-w-0">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 w-full max-w-full bg-surface-secondary/40 rounded-xl border border-border-subtle animate-pulse"></div>
            ))}
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-muted border border-dashed border-border/60 rounded-2xl bg-surface/50 text-center w-full max-w-full min-w-0">
            <FiCheckSquare size={40} className="mb-3 opacity-30 text-accent shrink-0" />
            <p className="text-xs font-bold tracking-[0.14em] uppercase text-foreground break-words">No tasks found</p>
            <p className="text-[11px] text-muted mt-1 break-words min-w-0 max-w-full">
              {search ? 'Try adjusting your search or filters' : 'Click "+ Task" above to add your first task'}
            </p>
          </div>
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-full min-w-0">
              {processedTasks.map((task) => {
                const dueDay = task.due_date ? task.due_date.slice(0, 10) : null;
                const isOverdue = !!dueDay && !task.is_completed && dueDay < getLocalTodayStr();
                const isDueToday = !!dueDay && !task.is_completed && dueDay === getLocalTodayStr();
                const isSelected = selectedTaskIds.has(task.id);
                const subtaskCount = task.subtasks?.length || 0;
                const subtasksDone = task.subtasks?.filter(s => s.completed).length || 0;
                const isSubtasksExpanded = expandedSubtasksTaskIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col bg-surface border rounded-xl p-3 sm:p-3.5 transition-all duration-200 shadow-xs group w-full max-w-full min-w-0 ${task.is_completed
                      ? 'border-border-subtle opacity-65 bg-surface-secondary/20'
                      : isSelected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-border/80 hover:border-border hover:shadow-xs'
                      }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 w-full max-w-full min-w-0">
                      {/* Interactive Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        title={task.is_completed ? 'Mark task pending' : 'Mark task complete'}
                        className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${task.is_completed
                          ? 'bg-success border-success text-white dark:text-black scale-100'
                          : 'border-border-subtle hover:border-accent bg-surface-secondary/30 text-transparent hover:scale-105'
                          }`}
                      >
                        <FiCheck size={12} strokeWidth={3} className={task.is_completed ? 'opacity-100' : 'opacity-0'} />
                      </button>

                      {/* Main Task Title & Info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(task)}>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`text-sm font-semibold min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug hover:text-accent transition-colors ${task.is_completed ? 'line-through text-muted' : 'text-foreground'
                            }`}>
                            {task.title}
                          </span>
                          {task.recurrence && (
                            <span title={`Repeats: ${task.recurrence.frequency}`} className="text-accent shrink-0 mt-0.5">
                              <FiRepeat size={12} />
                            </span>
                          )}
                        </div>

                        {/* Metadata Tag Row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] min-w-0 max-w-full">
                          {/* Priority Badge */}
                          <span className={`font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap ${task.priority === 'High'
                            ? 'bg-error/15 text-error border border-error/30'
                            : task.priority === 'Medium'
                              ? 'bg-warning/15 text-warning border border-warning/30'
                              : 'bg-info/10 text-info border border-info/25'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.priority === 'High' ? 'bg-error' : task.priority === 'Medium' ? 'bg-warning' : 'bg-info'
                              }`} />
                            {task.priority}
                          </span>

                          {/* Category Tag */}
                          <span className="font-semibold uppercase tracking-wider text-secondary-text px-1.5 py-0.5 bg-surface-secondary rounded border border-border-subtle min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                            {task.category || 'General'}
                          </span>

                          {/* Due Date Indicator */}
                          {dueDay && (
                            <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${isOverdue
                              ? 'bg-error/15 text-error font-bold border border-error/30'
                              : isDueToday
                                ? 'bg-warning/15 text-warning font-bold border border-warning/30'
                                : 'text-secondary-text bg-surface-secondary border border-border-subtle'
                              }`}>
                              <FiClock size={11} className="shrink-0" />
                              <span>{isOverdue ? 'Overdue ' : isDueToday ? 'Due Today' : 'Due '}{format(parseISO(dueDay), 'MMM d')}</span>
                            </span>
                          )}

                          {/* Est. duration */}
                          {task.estimated_duration ? (
                            <span className="text-secondary-text px-1.5 py-0.5 bg-surface-secondary rounded border border-border-subtle shrink-0 whitespace-nowrap tabular-nums">
                              ⏱️ {task.actual_duration || 0}/{task.estimated_duration}m
                            </span>
                          ) : null}

                          {/* Subtasks Count & Toggle */}
                          {subtaskCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => toggleSubtasksExpand(task.id, e)}
                              className="text-secondary-text hover:text-foreground font-semibold px-2 py-0.5 bg-surface-secondary rounded border border-border-subtle flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                            >
                              <span className="tabular-nums">{subtasksDone}/{subtaskCount} steps</span>
                              <FiChevronDown size={11} className={`transition-transform duration-200 ${isSubtasksExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Quick Actions (Comfortably in range) */}
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          title="Edit Task Details"
                          className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary-text hover:text-foreground transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={14} />
                        </button>

                        {/* Select for Bulk */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelection(task.id)}
                          title="Select for bulk action"
                          className={`p-1.5 rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer ${isSelected ? 'text-accent' : 'text-muted hover:text-foreground'
                            }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border transition-colors ${isSelected ? 'bg-accent border-accent text-accent-ink flex items-center justify-center' : 'border-border-subtle'
                            }`}>
                            {isSelected && <FiCheck size={10} strokeWidth={3} className="text-accent-ink" />}
                          </div>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => promptDelete({
                            title: 'Delete Task?',
                            message: `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
                            itemName: task.title,
                            onConfirm: () => deleteTask(task.id)
                          })}
                          title="Delete Task"
                          aria-label={`Delete task ${task.title}`}
                          className="p-1.5 rounded-lg hover:bg-error/15 text-secondary-text hover:text-error transition-colors cursor-pointer"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Inline Subtasks Checklist */}
                    {subtaskCount > 0 && isSubtasksExpanded && (
                      <div className="mt-3 pt-2.5 border-t border-border-subtle pl-4 sm:pl-8 space-y-1.5 animate-fadeIn w-full max-w-full min-w-0">
                        {task.subtasks!.map(s => (
                          <div key={s.id} className="flex items-center justify-between gap-2 text-xs py-0.5 group/sub min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleSubtask(task.id, s.id)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${s.completed ? 'bg-success border-success text-white dark:text-black' : 'border-border-subtle bg-surface hover:border-accent'
                                  }`}
                              >
                                {s.completed && <FiCheck size={9} strokeWidth={3} />}
                              </button>
                              <span className={`min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug ${s.completed ? 'line-through text-muted' : 'text-foreground'}`}>{s.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteSubtask(task.id, s.id)}
                              className="text-muted hover:text-error opacity-100 sm:opacity-0 sm:group-hover/sub:opacity-100 sm:focus-visible:opacity-100 transition-opacity p-0.5 cursor-pointer shrink-0"
                              title="Delete subtask"
                            >
                              <FiX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* ------------------------------------------------------------- */}
      {/* TASK DETAIL / ADD MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {(editingTask || isCreateModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border-t sm:border border-border rounded-t-xl sm:rounded-md p-4 sm:p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-lg min-w-0 max-h-[calc(100dvh-2rem)] sm:max-h-[92vh] overflow-y-auto custom-scrollbar shadow-[var(--t-shadow)]">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-border/60 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] min-w-0 flex-1 break-words">
                {editingTask ? 'TASK DETAILS' : 'ADD NEW TASK'}
              </h3>
              <button onClick={closeModal} className="p-1 text-muted hover:text-foreground cursor-pointer shrink-0" aria-label="Close task editor">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 w-full max-w-full min-w-0">
              <div className="min-w-0">
                <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Title</label>
                <input
                  type="text"
                  required
                  placeholder="What needs to be done?"
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); if (addError) setAddError(null); }}
                  className="w-full max-w-full min-w-0 h-11 bg-surface-secondary border border-border-subtle rounded-lg px-3.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                  autoFocus
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Description & Notes</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Task context, instructions, links..."
                  className="w-full max-w-full min-w-0 bg-surface-secondary border border-border-subtle rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-accent placeholder:text-muted/70 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Priority</label>
                  <Dropdown
                    value={editPriority}
                    onChange={(v) => setEditPriority(v as TaskPriority)}
                    options={[
                      { value: 'Low', label: 'Low Priority' },
                      { value: 'Medium', label: 'Medium Priority' },
                      { value: 'High', label: 'High Priority' }
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="e.g. Work, Health..."
                    className="w-full max-w-full min-w-0 h-11 bg-surface-secondary border border-border-subtle rounded-lg px-3.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Due Date</label>
                  <DatePicker
                    value={editDueDate}
                    onChange={setEditDueDate}
                    placeholder="Deadline"
                    align="left"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Est. Minutes</label>
                  <input
                    type="number"
                    min={0}
                    value={editEstDuration || ''}
                    placeholder="e.g. 45"
                    onChange={(e) => setEditEstDuration(parseInt(e.target.value) || 0)}
                    className="w-full max-w-full min-w-0 h-11 bg-surface-secondary border border-border-subtle rounded-lg px-3.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Recurrence */}
              <div className="min-w-0">
                <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Repeat Cadence</label>
                <Dropdown
                  value={editRecurrenceFreq}
                  onChange={setEditRecurrenceFreq}
                  options={[
                    { value: 'none', label: 'Do Not Repeat' },
                    { value: 'daily', label: 'Repeat Daily' },
                    { value: 'weekdays', label: 'Repeat Monday - Friday' },
                    { value: 'weekly', label: 'Repeat Weekly' },
                    { value: 'monthly', label: 'Repeat Monthly' },
                  ]}
                />
              </div>

              {/* Energy & Dependency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Energy Needed</label>
                  <Dropdown
                    value={editEnergy}
                    onChange={setEditEnergy}
                    options={[
                      { value: 'low', label: '🌙 Low energy' },
                      { value: 'medium', label: '☀️ Medium energy' },
                      { value: 'high', label: '⚡ High energy' },
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-1.5 break-words">Depends On</label>
                  <Dropdown
                    value={editDependsOn}
                    onChange={setEditDependsOn}
                    options={[
                      { value: '', label: 'No dependency' },
                      ...tasks.filter(t => (!editingTask || t.id !== editingTask.id) && !t.is_completed).slice(0, 50).map(t => ({ value: t.id, label: t.title.slice(0, 32) }))
                    ]}
                  />
                </div>
              </div>
              {editingTask && typeof editingTask.priority_score === 'number' && editingTask.priority_score > 0 && (
                <p className="text-[11px] text-accent font-semibold">Smart priority score: {editingTask.priority_score}</p>
              )}

              {/* Subtasks Section */}
              <div className="pt-2 border-t border-border-subtle min-w-0">
                <label className="block text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase mb-2 break-words">Subtasks</label>
                
                {/* Existing Subtasks (if editing) */}
                {editingTask && (
                  <div className="space-y-1.5 mb-3 min-w-0">
                    {(editingTask.subtasks || []).map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 bg-surface-secondary border border-border-subtle px-3 py-2 rounded-lg min-w-0 max-w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleSubtask(editingTask.id, s.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${s.completed ? 'bg-accent border-accent text-accent-ink' : 'border-border-subtle bg-surface'}`}
                          >
                            {s.completed && <FiCheck size={11} strokeWidth={3} />}
                          </button>
                          <span className={`text-xs min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug ${s.completed ? 'line-through text-muted' : 'text-foreground'}`}>{s.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSubtask(editingTask.id, s.id)}
                          className="text-muted hover:text-error transition-colors shrink-0"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtasks when creating new task */}
                {!editingTask && createSubtasks.length > 0 && (
                  <div className="space-y-1.5 mb-3 min-w-0">
                    {createSubtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-surface-secondary border border-border-subtle px-3 py-2 rounded-lg min-w-0 max-w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-4 h-4 rounded border border-border-subtle bg-surface flex items-center justify-center text-[10px] text-muted font-mono shrink-0">{idx + 1}</span>
                          <span className="text-xs text-foreground min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">{st}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreateSubtasks(prev => prev.filter((_, i) => i !== idx))}
                          className="text-muted hover:text-error transition-colors cursor-pointer shrink-0"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="text"
                    placeholder="Add a subtask step..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newSubtaskTitle.trim()) return;
                        if (editingTask) {
                          addSubtask(editingTask.id, newSubtaskTitle.trim());
                        } else {
                          setCreateSubtasks(prev => [...prev, newSubtaskTitle.trim()]);
                        }
                        setNewSubtaskTitle('');
                      }
                    }}
                    className="flex-1 min-w-0 w-full max-w-full h-9 bg-surface-secondary border border-border-subtle rounded-lg px-3 text-xs text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSubtaskTitle.trim()) return;
                      if (editingTask) {
                        addSubtask(editingTask.id, newSubtaskTitle.trim());
                      } else {
                        setCreateSubtasks(prev => [...prev, newSubtaskTitle.trim()]);
                      }
                      setNewSubtaskTitle('');
                    }}
                    className="h-9 px-3 bg-surface-secondary border border-border-subtle hover:border-accent text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    ADD
                  </button>
                </div>
              </div>

              {/* Error inside modal */}
              {addError && (
                <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/25 text-error text-xs font-medium rounded-lg px-3 py-2 w-full max-w-full min-w-0">
                  <FiAlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{addError}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-border-subtle min-w-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 h-11 text-xs font-semibold text-secondary-text hover:text-foreground hover:bg-surface-hover rounded-lg tracking-[0.1em] uppercase transition-colors cursor-pointer shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !editTitle.trim()}
                  className="px-6 h-11 bg-accent text-accent-ink font-bold text-xs tracking-[0.12em] uppercase rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0 max-w-full"
                >
                  {isSubmittingTask ? (editingTask ? 'SAVING...' : 'CREATING...') : (editingTask ? 'SAVE TASK' : 'CREATE TASK')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
