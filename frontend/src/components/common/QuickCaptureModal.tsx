import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCaptureStore } from '../../store/useCaptureStore';
import { useTaskStore } from '../../store/useTaskStore';
import { parseNaturalLanguage } from '../../api/captures';
import { FiX, FiZap, FiArrowRight, FiTrash2, FiCheckSquare, FiHash } from 'react-icons/fi';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAG_SUGGESTIONS = ['work', 'personal', 'idea', 'urgent', 'review', 'later', 'general'];

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose }) => {
  const { captures, addCapture, deleteCapture, fetchCaptures } = useCaptureStore();
  const { addTask } = useTaskStore();
  const [input, setInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [view, setView] = useState<'capture' | 'inbox'>('capture');
  const [nlHint, setNlHint] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCaptures();
      setTimeout(() => textareaRef.current?.focus(), 80);
      setInput('');
      setTags([]);
      setView('capture');
    }
  }, [isOpen, fetchCaptures]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCapture = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addCapture(input.trim(), tags);
      setInput('');
      setTags([]);
      setTagInput('');
      setNlHint(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Natural-language smart task creation (Phase 3): "Call mom tomorrow 30min #personal"
  const handleSmartCreate = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const parsed = await parseNaturalLanguage(input.trim());
      await addTask({
        title: parsed.title || input.trim(),
        description: '',
        priority: parsed.priority || 'Medium',
        category: 'General',
        status: 'pending',
        due_date: parsed.due_date || null,
        estimated_duration: parsed.estimated_duration || 0,
        energy_level: parsed.energy_level,
        tags: [...tags, ...(parsed.tags || [])],
        subtasks: [],
      });
      setInput('');
      setTags([]);
      setNlHint(null);
      onClose();
    } catch {
      await handleCapture();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live NL preview (debounced lightly via onChange handler)
  const handleInputChange = async (value: string) => {
    setInput(value);
    if (value.trim().length > 12) {
      try {
        const parsed = await parseNaturalLanguage(value.trim());
        const bits: string[] = [];
        if (parsed.priority && parsed.priority !== 'Medium') bits.push(parsed.priority);
        if (parsed.due_date) bits.push(`due ${parsed.due_date}`);
        if (parsed.estimated_duration) bits.push(`${parsed.estimated_duration}m`);
        setNlHint(bits.length > 0 ? `Detected: ${bits.join(' • ')}` : null);
      } catch { setNlHint(null); }
    } else {
      setNlHint(null);
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCapture();
    }
  };

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (clean && !tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleConvertToTask = async (capture: { id: string; content: string }) => {
    setConvertingId(capture.id);
    try {
      await addTask({
        title: capture.content.slice(0, 120),
        description: capture.content.length > 120 ? capture.content : '',
        priority: 'Medium',
        category: 'General',
        status: 'pending',
        due_date: null,
        tags: [],
        subtasks: [],
      });
      await deleteCapture(capture.id);
    } finally {
      setConvertingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[max(10vh,var(--sat))] px-4 pb-[env(safe-area-inset-bottom,0px)]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-[min(36rem,calc(100vw-2rem))] min-w-0 bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col min-h-0 max-h-[calc(100dvh-2rem)]">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-border/60 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <FiZap size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground tracking-tight break-words">Quick Capture</h2>
              <p className="text-[10px] text-muted break-words">Capture now, organize later</p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="flex items-center bg-surface-secondary rounded-lg border border-border-subtle p-0.5">
              <button
                onClick={() => setView('capture')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  view === 'capture' ? 'bg-surface text-foreground border border-border/70' : 'text-muted hover:text-foreground'
                }`}
              >
                Capture
              </button>
              <button
                onClick={() => setView('inbox')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors relative ${
                  view === 'inbox' ? 'bg-surface text-foreground border border-border/70' : 'text-muted hover:text-foreground'
                }`}
              >
                Inbox
                {captures.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-accent text-accent-ink text-[8px] font-bold px-1">
                    {captures.length}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {view === 'capture' ? (
          <>
            {/* Capture input */}
            <div className="p-5 flex-shrink-0 min-w-0 overflow-y-auto">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="What's on your mind? Try 'Finish report tomorrow 30min #work'... (Ctrl+Enter to save)"
                rows={4}
                className="w-full max-w-full box-border min-w-0 bg-surface-secondary border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent transition-colors leading-relaxed break-words"
              />
              {nlHint && (
                <p className="mt-1.5 text-[11px] font-semibold text-accent break-words [overflow-wrap:anywhere] min-w-0">✨ {nlHint}</p>
              )}

              {/* Tags */}
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold border border-accent/20"
                    >
                      <FiHash size={9} />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-accent/70 hover:text-accent ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1 min-w-0 w-full max-w-full box-border h-8 text-xs bg-elevated border border-border/50 rounded-lg px-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {TAG_SUGGESTIONS.filter(t => !tags.includes(t)).slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold text-muted border border-border-subtle hover:text-foreground hover:border-border transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex-shrink-0 space-y-2 min-w-0">
              <button
                onClick={handleCapture}
                disabled={!input.trim() || isSubmitting}
                className="w-full h-11 flex items-center justify-center gap-2 bg-accent text-accent-ink font-bold text-xs tracking-[0.12em] uppercase rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              >
                {isSubmitting ? 'Saving...' : (
                  <>
                    <FiZap size={14} />
                    Capture
                  </>
                )}
              </button>
              <button
                onClick={handleSmartCreate}
                disabled={!input.trim() || isSubmitting}
                className="w-full h-9 flex items-center justify-center gap-2 bg-surface-secondary border border-border-subtle hover:border-accent text-foreground font-bold text-[11px] tracking-[0.1em] uppercase rounded-xl transition-all disabled:opacity-40"
              >
                <FiArrowRight size={13} />
                Smart Create Task (auto-detect date • priority • time)
              </button>
            </div>
          </>
        ) : (
          /* Inbox view */
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 min-w-0">
            {captures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border-subtle flex items-center justify-center mb-3">
                  <FiZap size={20} className="text-muted" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Inbox is empty</p>
                <p className="text-xs text-muted">Captured items appear here. Convert them to tasks when ready.</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {captures.map(capture => (
                  <div
                    key={capture.id}
                    className="group p-3.5 bg-surface-secondary border border-border/60 rounded-xl hover:border-border transition-colors min-w-0"
                  >
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3 mb-2 break-words [overflow-wrap:anywhere] min-w-0">
                      {capture.content}
                    </p>
                    {capture.tags && capture.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {capture.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold"
                          >
                            <FiHash size={8} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] text-muted break-words min-w-0">
                        {new Date(capture.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleConvertToTask(capture)}
                          disabled={convertingId === capture.id}
                          title="Convert to Task"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-bold hover:bg-accent/20 transition-colors disabled:opacity-40"
                        >
                          <FiCheckSquare size={11} />
                          {convertingId === capture.id ? '...' : 'Task'}
                        </button>
                        <button
                          onClick={() => deleteCapture(capture.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickCaptureModal;
