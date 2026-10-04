import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useCoachStore } from '../../store/useCoachStore';
import type { CoachingMode } from '../../types';
import {
  FiX,
  FiSend,
  FiZap,
  FiUser,
  FiCpu,
  FiTrash2,
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiTarget,
  FiLayers,
  FiRepeat,
  FiCheck,
  FiChevronDown
} from 'react-icons/fi';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const COACHING_MODES: { id: CoachingMode; label: string; icon: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Structured, objective reasoning' },
  { id: 'strict', label: 'Strict', icon: '🎯', desc: 'Direct accountability, zero excuses' },
  { id: 'supportive', label: 'Supportive', icon: '🤝', desc: 'Encouraging, momentum-focused' },
  { id: 'minimal', label: 'Minimal', icon: '⚡', desc: 'Laser-concise, action-first' },
  { id: 'focus', label: 'Focus', icon: '🧘', desc: 'Single priority, 25m timebox' },
];

const QUICK_ACTIONS = [
  { label: '🌅 Plan My Day', query: 'Give me my morning briefing and plan my day' },
  { label: '☀️ Midday Check-in', query: 'How is my progress so far today? Midday check-in' },
  { label: '🌙 Review Today', query: 'Evening review: What did I complete and what did I miss?' },
  { label: '🎯 Prioritize Tasks', query: 'Prioritize my pending tasks and tell me what to do first' },
  { label: '🔄 Fix My Habits', query: 'Analyze my habits and diagnose why my weakest habit is dropping' },
  { label: '🧩 Break Down Goal', query: 'Help me break down my largest goal into 25-minute actions' },
  { label: '⚡ Beat Procrastination', query: 'Give me a 3-step action plan to overcome procrastination right now' },
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const {
    messages,
    isLoading,
    isExecutingAction,
    mode,
    setMode,
    contextSummary,
    fetchContextSummary,
    sendMessage,
    executeAction,
    cancelAction,
    clearChat
  } = useCoachStore();

  const [input, setInput] = useState('');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch fresh context summary on open
  useEffect(() => {
    if (isOpen) {
      fetchContextSummary();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (window.innerWidth >= 768) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, fetchContextSummary]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Close mode dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isModeDropdownOpen) {
          setIsModeDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isModeDropdownOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const query = (queryText || input).trim();
    if (!query || isLoading) return;

    if (!queryText) setInput('');
    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentModeObj = COACHING_MODES.find((m) => m.id === mode) || COACHING_MODES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border-l border-border/90 w-full max-w-[min(34rem,100vw)] min-w-0 h-full max-h-[100dvh] flex flex-col shadow-2xl transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trackiyo AI Coach"
      >
        {/* ----------------------------------------------------------- */}
        {/* 1. HEADER                                                   */}
        {/* ----------------------------------------------------------- */}
        <div className="p-3 sm:p-4 border-b border-border/80 flex flex-col gap-2.5 bg-surface-secondary/50 flex-shrink-0 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-accent text-accent-ink flex items-center justify-center shadow-xs shrink-0 font-bold">
                <FiZap size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-xs font-bold text-foreground tracking-[0.1em] uppercase truncate">
                    Trackiyo AI Coach
                  </h2>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </div>
                <p className="text-[10px] text-muted truncate">
                  Personal productivity, habit & accountability coach
                </p>
              </div>
            </div>

            {/* Mode Selector Dropdown & Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border/80 text-[11px] font-semibold text-foreground hover:border-accent/60 transition-colors shadow-xs cursor-pointer"
                  title="Select coaching mode"
                  aria-haspopup="true"
                  aria-expanded={isModeDropdownOpen}
                >
                  <span>{currentModeObj.icon}</span>
                  <span className="capitalize hidden sm:inline">{currentModeObj.label}</span>
                  <FiChevronDown size={12} className="text-muted" />
                </button>

                {isModeDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                      Coaching Style
                    </div>
                    {COACHING_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMode(m.id);
                          setIsModeDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                          mode === m.id
                            ? 'bg-accent/10 text-foreground border border-accent/30 font-bold'
                            : 'hover:bg-surface-secondary text-secondary-text'
                        }`}
                      >
                        <span className="text-base leading-none">{m.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold">{m.label}</div>
                          <div className="text-[10px] text-muted leading-tight">{m.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                title="Clear conversation"
                aria-label="Clear chat"
              >
                <FiTrash2 size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                aria-label="Close AI Coach"
              >
                <FiX size={17} />
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* 2. LIVE CONTEXT SUMMARY BAR                                */}
          {/* --------------------------------------------------------- */}
          {contextSummary && (
            <div className="bg-surface border border-border/70 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <FiCheckCircle size={12} className="text-accent" />
                    <strong>{contextSummary.pendingTasks}</strong> pending
                  </span>

                  {contextSummary.overdueTasks > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold text-[10px]">
                      <FiAlertTriangle size={11} />
                      {contextSummary.overdueTasks} overdue
                    </span>
                  )}

                  {contextSummary.bestHabit && (
                    <span className="inline-flex items-center gap-1 text-muted text-[10px] hidden sm:inline-flex">
                      <FiRepeat size={11} className="text-emerald-500" />
                      {contextSummary.bestHabit.name} ({contextSummary.bestHabit.streak}d streak)
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-muted font-semibold">
                  <FiClock size={11} className="inline mr-1 text-accent" />
                  {contextSummary.focusMinutesToday}m deep work
                </div>
              </div>

              {contextSummary.suggestedNextAction && (
                <div className="text-[11px] bg-accent/8 border border-accent/20 rounded-lg px-2.5 py-1 text-foreground font-medium flex items-center justify-between gap-2">
                  <span className="truncate">
                    <strong className="text-accent uppercase text-[9px] tracking-wider mr-1">Next:</strong>
                    {contextSummary.suggestedNextAction}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSend(`How do I execute this: ${contextSummary.suggestedNextAction}`)}
                    className="text-[10px] font-bold text-accent hover:underline shrink-0"
                  >
                    Guide me →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 3. MESSAGE FEED                                             */}
        {/* ----------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar min-h-0 min-w-0 bg-background/50">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const msgId = m.id || `msg-${idx}`;

            return (
              <div
                key={msgId}
                className={`flex gap-2.5 text-xs leading-relaxed min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-md bg-accent text-accent-ink flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-xs">
                    <FiCpu size={13} />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[88%] min-w-0">
                  <div
                    className={`p-3.5 rounded-2xl min-w-0 break-words [overflow-wrap:anywhere] shadow-xs leading-relaxed ${
                      isUser
                        ? 'bg-accent text-accent-ink font-medium rounded-tr-xs'
                        : 'bg-surface border border-border/80 text-foreground rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="space-y-2 text-foreground text-xs leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-accent [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1.5 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:text-foreground [&_strong]:font-bold [&_hr]:my-2 [&_hr]:border-border/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:bg-surface-secondary [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px]">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Cards */}
                  {!isUser && m.actions && m.actions.length > 0 && (
                    <div className="space-y-2 mt-1">
                      {m.actions.map((act) => {
                        const isApplied = act.status === 'applied';
                        const isCancelled = act.status === 'cancelled';

                        return (
                          <div
                            key={act.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col gap-2 transition-all ${
                              isApplied
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground'
                                : isCancelled
                                ? 'bg-surface-secondary/40 border-border/50 text-muted opacity-60'
                                : 'bg-surface border-accent/40 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="p-1.5 rounded-lg bg-accent/15 text-accent shrink-0">
                                  {act.type === 'start_focus' && <FiZap size={14} />}
                                  {act.type === 'reschedule_task' && <FiCalendar size={14} />}
                                  {act.type === 'create_task' && <FiTarget size={14} />}
                                  {act.type === 'create_habit' && <FiRepeat size={14} />}
                                  {act.type === 'breakdown_goal' && <FiLayers size={14} />}
                                  {act.type === 'complete_task' && <FiCheckCircle size={14} />}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground truncate">{act.label}</div>
                                  {act.description && (
                                    <div className="text-[10px] text-muted truncate">{act.description}</div>
                                  )}
                                </div>
                              </div>

                              {isApplied && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                                  <FiCheck size={11} strokeWidth={3} />
                                  Applied
                                </span>
                              )}
                              {isCancelled && (
                                <span className="text-[10px] text-muted italic shrink-0">Dismissed</span>
                              )}
                            </div>

                            {!isApplied && !isCancelled && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isExecutingAction}
                                  onClick={() => executeAction(msgId, act.id)}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-accent text-accent-ink font-bold text-xs hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-center"
                                >
                                  {isExecutingAction ? 'Applying...' : 'Confirm & Apply'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelAction(msgId, act.id)}
                                  className="py-1.5 px-2.5 rounded-lg bg-surface-secondary text-secondary-text hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-md bg-surface-secondary text-secondary-text border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                    <FiUser size={13} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-muted py-2 px-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span className="italic">Coach is analyzing your queue & formulating advice...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 4. QUICK ACTION CHIPS                                       */}
        {/* ----------------------------------------------------------- */}
        <div className="px-3 py-2 border-t border-border/60 flex gap-1.5 overflow-x-auto custom-scrollbar flex-shrink-0 bg-surface">
          {QUICK_ACTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(item.query)}
              className="text-[11px] whitespace-nowrap bg-surface-secondary border border-border-subtle hover:border-accent/40 hover:text-accent text-secondary-text px-2.5 py-1.5 rounded-lg transition-colors font-semibold shrink-0 cursor-pointer disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 5. INPUT BAR                                                */}
        {/* ----------------------------------------------------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-border/80 bg-surface flex items-center gap-2 flex-shrink-0 min-w-0"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask your coach (priorities, habit fix, schedule)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 w-full max-w-full box-border h-11 bg-surface-secondary border border-border-subtle rounded-xl px-3.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent/80 transition-colors shadow-xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 bg-accent text-accent-ink rounded-xl flex items-center justify-center font-bold hover:brightness-105 active:scale-[0.98] disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-xs"
            title="Send prompt"
            aria-label="Send message"
          >
            <FiSend size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantDrawer;
