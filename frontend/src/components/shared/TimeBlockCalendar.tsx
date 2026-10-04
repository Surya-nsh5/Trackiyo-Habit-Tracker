import React, { useState, useEffect, useMemo } from 'react';
import { useTimeBlockStore } from '../../store/useTimeBlockStore';
import { useTaskStore } from '../../store/useTaskStore';
import api from '../../services/api';
import { FiPlus, FiTrash2, FiClock, FiX, FiChevronLeft, FiChevronRight, FiZap } from 'react-icons/fi';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM
const SLOT_HEIGHT = 60; // px per hour

function hourToY(hour: number, minutes = 0) {
  return (hour - 6 + minutes / 60) * SLOT_HEIGHT;
}

function isoToLocalDateStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BLOCK_COLORS = [
  '#4F46E5', '#0369A1', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'
];

export const TimeBlockCalendar: React.FC = () => {
  const { blocks, fetchBlocks, addBlock, deleteBlock } = useTimeBlockStore();
  const { tasks } = useTaskStore();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [suggestions, setSuggestions] = useState<{ task_id: string | null; title: string; start_time: string; end_time: string; reason?: string }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    task_id: '',
    start_hour: 9,
    start_min: 0,
    duration_hours: 1,
    duration_mins: 0,
    color: BLOCK_COLORS[0],
  });

  useEffect(() => {
    fetchBlocks(selectedDate);
  }, [selectedDate, fetchBlocks]);

  const todayBlocks = useMemo(() => {
    return blocks.filter(b => {
      const bd = b.block_date || isoToLocalDateStr(b.start_time);
      return bd === selectedDate;
    });
  }, [blocks, selectedDate]);

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setSuggestions([]);
  };

  // Predictive time-blocking: fetch AI-suggested blocks for this date
  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const res = await api.post('/time-blocks/suggest', { date: selectedDate });
      setSuggestions(res.data?.suggestions || []);
    } catch {}
    setIsSuggesting(false);
  };

  const acceptSuggestion = async (s: { task_id: string | null; title: string; start_time: string; end_time: string }) => {
    await addBlock({ task_id: s.task_id, title: s.title, start_time: s.start_time, end_time: s.end_time, color: BLOCK_COLORS[2] });
    setSuggestions(prev => prev.filter(x => x.start_time !== s.start_time || x.title !== s.title));
  };

  const handleAddBlock = async () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const startDt = new Date(year, month - 1, day, addForm.start_hour, addForm.start_min);
    const totalEndMins = addForm.start_min + addForm.duration_hours * 60 + addForm.duration_mins;
    const endDt = new Date(year, month - 1, day, addForm.start_hour, totalEndMins);

    if (endDt <= startDt) return;

    const linkedTask = tasks.find(t => t.id === addForm.task_id);
    await addBlock({
      task_id: addForm.task_id || null,
      title: addForm.title || linkedTask?.title || 'Focus Block',
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      color: addForm.color,
    });
    setShowAddModal(false);
    setAddForm({ title: '', task_id: '', start_hour: 9, start_min: 0, duration_hours: 1, duration_mins: 0, color: BLOCK_COLORS[0] });
  };

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const isToday = selectedDate === (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Current time marker
  const now = new Date();
  const currentTimeY = isToday
    ? hourToY(now.getHours(), now.getMinutes())
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full min-w-0">
      {/* Date Navigator */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 sm:px-5 py-4 border-b border-border/60 flex-shrink-0 w-full max-w-full min-w-0">
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
          >
            <FiChevronLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground break-words">{formattedDate}</p>
            {isToday && (
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Today</span>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0 max-w-full">
          {suggestions.length === 0 && (
            <button
              onClick={handleSuggest}
              disabled={isSuggesting}
              title="AI-suggested blocks based on tasks and energy"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:border-accent/60 text-secondary-text hover:text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
            >
              <FiZap size={13} className="text-accent" />
              {isSuggesting ? 'Suggesting...' : 'Suggest'}
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-ink font-bold text-[10px] uppercase tracking-wider rounded-lg hover:brightness-110 transition-all"
          >
            <FiPlus size={13} />
            Add Block
          </button>
        </div>
      </div>

      {/* Suggested blocks row */}
      {suggestions.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-accent/20 bg-accent/5 flex-shrink-0 w-full max-w-full min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2 break-words">✨ Suggested blocks — tap to accept</p>
          <div className="flex flex-wrap gap-2 min-w-0">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => acceptSuggestion(s)} title={s.reason || 'Suggested'}
                className="flex items-center gap-2 max-w-full min-w-0 px-3 py-1.5 rounded-lg border border-dashed border-accent/50 bg-surface text-xs hover:bg-accent/10 transition-colors">
                <span className="font-semibold text-foreground truncate min-w-0 max-w-[140px] sm:max-w-[220px]">{s.title}</span>
                <span className="text-[10px] text-muted tabular-nums shrink-0 whitespace-nowrap">{new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="text-[9px] font-bold uppercase text-accent border border-accent/40 rounded px-1 shrink-0 whitespace-nowrap">suggested</span>
              </button>
            ))}
            <button onClick={() => setSuggestions([])} className="text-[10px] text-muted hover:text-foreground px-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar">
        <div className="flex min-h-0 w-full max-w-full min-w-0" style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full flex items-start justify-end pr-2 text-[10px] text-muted font-semibold"
                style={{ top: (hour - 6) * SLOT_HEIGHT - 7 }}
              >
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div
            className="flex-1 relative border-l border-border/50"
            style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
          >
            {/* Hour grid lines */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/30"
                style={{ top: (hour - 6) * SLOT_HEIGHT }}
              />
            ))}

            {/* Current time line */}
            {currentTimeY !== null && currentTimeY >= 0 && currentTimeY <= HOURS.length * SLOT_HEIGHT && (
              <div
                className="absolute w-full flex items-center z-10 pointer-events-none"
                style={{ top: currentTimeY }}
              >
                <div className="w-2 h-2 rounded-full bg-danger shrink-0 -ml-1" />
                <div className="flex-1 h-px bg-danger" />
              </div>
            )}

            {/* Time blocks */}
            {todayBlocks.map(block => {
              const startDt = new Date(block.start_time);
              const endDt = new Date(block.end_time);
              const startH = startDt.getHours() + startDt.getMinutes() / 60;
              const endH = endDt.getHours() + endDt.getMinutes() / 60;
              const y = (startH - 6) * SLOT_HEIGHT;
              const h = (endH - startH) * SLOT_HEIGHT;
              const linkedTask = tasks.find(t => t.id === block.task_id);
              const color = block.color || '#4F46E5';

              if (y < 0 || h < 4) return null;

              return (
                <div
                  key={block.id}
                  className="absolute left-1 right-1 rounded-lg overflow-hidden group cursor-pointer"
                  style={{ top: y, height: Math.max(h, 24), backgroundColor: color + '22', borderLeft: `3px solid ${color}` }}
                >
                  <div className="p-1.5 flex items-start justify-between gap-1 min-w-0 h-full">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold truncate max-w-full break-words" style={{ color }}>
                        {block.title || linkedTask?.title || 'Focus Block'}
                      </p>
                      {h > 36 && (
                        <p className="text-[9px] text-muted">
                          {startDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                          {endDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-danger transition-all shrink-0"
                    >
                      <FiTrash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {todayBlocks.length === 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ top: 3 * SLOT_HEIGHT, height: 4 * SLOT_HEIGHT }}
              >
                <div className="text-center">
                  <FiClock size={24} className="text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted">No blocks scheduled</p>
                  <p className="text-[10px] text-muted/60">Click "Add Block" to plan your day</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-surface border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-sm min-w-0 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar z-10 my-auto">
            <div className="flex items-center justify-between gap-2 min-w-0 mb-5">
              <h3 className="text-sm font-bold text-foreground break-words flex-1 min-w-0">Add Time Block</h3>
              <button onClick={() => setShowAddModal(false)} aria-label="Close add time block dialog" className="p-1 rounded text-muted hover:text-foreground shrink-0">
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Title (optional)</label>
                <input
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Deep Work, Email, Gym"
                  className="w-full max-w-full min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Link to Task</label>
                <select
                  value={addForm.task_id}
                  onChange={e => setAddForm(f => ({ ...f, task_id: e.target.value }))}
                  className="w-full max-w-full min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="">None</option>
                  {tasks.filter(t => !t.is_completed).map(t => (
                    <option key={t.id} value={t.id}>{t.title.slice(0, 50)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Start Time</label>
                  <div className="flex gap-1 min-w-0">
                    <select
                      value={addForm.start_hour}
                      onChange={e => setAddForm(f => ({ ...f, start_hour: parseInt(e.target.value) }))}
                      className="flex-1 min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-2 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>{h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}</option>
                      ))}
                    </select>
                    <select
                      value={addForm.start_min}
                      onChange={e => setAddForm(f => ({ ...f, start_min: parseInt(e.target.value) }))}
                      className="w-14 h-9 bg-surface-secondary border border-border/60 rounded-lg px-1 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Duration</label>
                  <div className="flex gap-1 min-w-0">
                    <select
                      value={addForm.duration_hours}
                      onChange={e => setAddForm(f => ({ ...f, duration_hours: parseInt(e.target.value) }))}
                      className="flex-1 min-w-0 h-9 bg-surface-secondary border border-border/60 rounded-lg px-1 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      {[0, 1, 2, 3, 4].map(h => (
                        <option key={h} value={h}>{h}h</option>
                      ))}
                    </select>
                    <select
                      value={addForm.duration_mins}
                      onChange={e => setAddForm(f => ({ ...f, duration_mins: parseInt(e.target.value) }))}
                      className="w-14 h-9 bg-surface-secondary border border-border/60 rounded-lg px-1 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {BLOCK_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAddForm(f => ({ ...f, color }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${addForm.color === color ? 'ring-2 ring-offset-2 ring-offset-surface ring-foreground/50' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleAddBlock}
              className="w-full h-10 mt-5 bg-accent text-accent-ink font-bold text-xs tracking-wider uppercase rounded-xl hover:brightness-110 transition-all"
            >
              Add Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeBlockCalendar;
