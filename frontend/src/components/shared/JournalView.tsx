import React, { useState } from 'react';
import { useJournalStore } from '../../store/useJournalStore';
import { useToday } from '../../hooks/useToday';
import { formatDateDisplay } from '../../utils/dailyTracking';
import { DatePicker } from '../common/DatePicker';
import { FiSave, FiTrash2, FiSearch, FiSmile, FiTag } from 'react-icons/fi';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const JournalView: React.FC = () => {
  const todayStr = useToday();
  const { entries, selectedDate, setSelectedDate, saveEntry, deleteEntry, getEntryByDate } = useJournalStore();

  const currentEntry = getEntryByDate(selectedDate);
  const [title, setTitle] = useState(currentEntry?.title || '');
  const [content, setContent] = useState(currentEntry?.content || '');
  const [mood, setMood] = useState<number>(currentEntry?.mood || 7);
  const [tags, setTags] = useState<string>((currentEntry?.tags || []).join(', '));
  const [search, setSearch] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [mobileTab, setMobileTab] = useState<'EDITOR' | 'ENTRIES'>('EDITOR');

  // Sync state when selectedDate changes
  React.useEffect(() => {
    const entry = getEntryByDate(selectedDate);
    setTitle(entry?.title || '');
    setContent(entry?.content || '');
    setMood(entry?.mood || 7);
    setTags((entry?.tags || []).join(', '));
  }, [selectedDate, getEntryByDate]);

  useGSAP(() => {
    gsap.fromTo('.gsap-journal-card',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, [selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    await saveEntry({
      entry_date: selectedDate,
      title: title.trim(),
      content: content.trim(),
      mood,
      tags: tagsArray
    });

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const filteredEntries = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full min-h-0 p-3 md:p-4 lg:p-5 w-full max-w-full min-w-0 gap-3 md:gap-4 relative overflow-y-auto custom-scrollbar">

      {/* Mobile Tab Toggle (< lg) */}
      <div className="lg:hidden flex items-center bg-surface-secondary rounded-lg border border-border-subtle p-1 shrink-0 w-full max-w-full min-w-0">
        <button
          type="button"
          onClick={() => setMobileTab('EDITOR')}
          className={`flex-1 min-w-0 px-1 text-center break-words py-1.5 rounded-md text-[11px] font-bold tracking-[0.1em] uppercase transition-colors ${mobileTab === 'EDITOR' ? 'bg-surface text-foreground font-semibold border border-border/80 shadow-xs' : 'text-secondary-text hover:text-foreground'
            }`}
        >
          Editor & Reflection
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ENTRIES')}
          className={`flex-1 min-w-0 px-1 text-center break-words py-1.5 rounded-md text-[11px] font-bold tracking-[0.1em] uppercase transition-colors ${mobileTab === 'ENTRIES' ? 'bg-surface text-foreground font-semibold border border-border/80 shadow-xs' : 'text-secondary-text hover:text-foreground'
            }`}
        >
          Past Entries ({entries.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 w-full max-w-full min-w-0">

        {/* Left: Entries History & Date Picker */}
        <div className={`lg:col-span-4 w-full max-w-full min-w-0 flex flex-col gap-3 ${mobileTab === 'ENTRIES' ? 'flex' : 'hidden lg:flex'}`}>

          {/* Date Selector Card */}
          <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col gap-2 shadow-xs w-full max-w-full min-w-0">
            <label className="text-[11px] font-bold text-secondary-text uppercase tracking-[0.14em]">Select Journal Date</label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select Date"
            />
          </div>

          {/* Search & Entry List */}
          <div className="bg-surface border border-border/80 rounded-xl p-4 flex-1 flex flex-col min-h-[300px] shadow-xs w-full max-w-full min-w-0">
            <div className="flex items-center bg-surface-secondary rounded-lg border border-border-subtle px-3 py-2 mb-3 focus-within:border-accent transition-colors min-w-0">
              <FiSearch className="text-muted mr-2 shrink-0" size={14} />
              <input
                type="text"
                placeholder="Search reflections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent w-full max-w-full min-w-0 text-xs text-foreground focus:outline-none placeholder:text-muted/70"
              />
            </div>

            <div className="flex-1 min-w-0 overflow-y-auto space-y-2 custom-scrollbar">
              {filteredEntries.length === 0 ? (
                <p className="text-xs text-muted italic text-center py-8">No journal entries found.</p>
              ) : (
                filteredEntries.map(e => (
                  <div
                    key={e.id}
                    onClick={() => { setSelectedDate(e.entry_date); setMobileTab('EDITOR'); }}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${e.entry_date === selectedDate ? 'bg-surface-secondary border-accent/60 shadow-xs' : 'bg-surface-secondary/40 border-border-subtle hover:border-border hover:bg-surface-hover'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
                      <span className="font-bold text-foreground truncate flex-1 min-w-0 mr-2 break-words">{e.title}</span>
                      <span className="text-[10px] text-accent font-semibold shrink-0 whitespace-nowrap">{e.entry_date}</span>
                    </div>
                    <p className="text-secondary-text text-[11px] line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere]">{e.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right: Active Entry Editor */}
        <div className={`lg:col-span-8 w-full max-w-full min-w-0 bg-surface border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col shadow-xs ${mobileTab === 'EDITOR' ? 'flex' : 'hidden lg:flex'}`}>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-border-subtle min-w-0">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-accent tracking-[0.14em] uppercase">
                {selectedDate === todayStr ? 'TODAY\'S JOURNAL ENTRY' : 'HISTORICAL REFLECTION'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground break-words">{formatDateDisplay(selectedDate)}</h3>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {currentEntry && (
                <button
                  type="button"
                  onClick={() => deleteEntry(currentEntry.id)}
                  title="Delete Entry"
                  className="p-2 text-secondary-text hover:text-error rounded-lg hover:bg-error/10 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-5 h-10 bg-accent text-accent-ink font-bold text-xs tracking-[0.12em] uppercase rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <FiSave size={14} />
                {savedFeedback ? 'SAVED!' : 'SAVE ENTRY'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="min-w-0">
              <input
                type="text"
                placeholder="Entry Title (e.g. Weekly Reflections, Breakthrough on Architecture)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full max-w-full min-w-0 text-base font-bold bg-transparent border-b border-border-subtle pb-2 text-foreground focus:outline-none focus:border-accent placeholder:text-muted/70 transition-colors"
              />
            </div>

            {/* Meta row: Mood + Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="flex items-center gap-3 bg-surface-secondary px-3.5 py-2.5 rounded-lg border border-border-subtle min-w-0">
                <FiSmile size={16} className="text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-secondary-text uppercase tracking-[0.08em] shrink-0 whitespace-nowrap">Mood: {mood}/10</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mood}
                  onChange={(e) => setMood(parseInt(e.target.value))}
                  className="w-full flex-1 min-w-0 accent-[var(--t-accent)]"
                />
              </div>

              <div className="flex items-center gap-2 bg-surface-secondary px-3.5 py-2.5 rounded-lg border border-border-subtle min-w-0">
                <FiTag size={16} className="text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Tags (e.g. Mindset, Health, Win)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full flex-1 min-w-0 bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted/70"
                />
              </div>
            </div>

            {/* Content Textarea */}
            <div className="flex-1 flex flex-col min-h-[220px] min-w-0">
              <textarea
                placeholder="Write your thoughts, daily learnings, ideas, and accomplishments..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full max-w-full min-w-0 flex-1 p-3.5 bg-surface-secondary border border-border-subtle rounded-lg text-sm text-foreground focus:outline-none focus:border-accent placeholder:text-muted/70 custom-scrollbar resize-none leading-relaxed transition-colors"
              />
            </div>
          </form>

        </div>

      </div>

    </div>
  );
};
