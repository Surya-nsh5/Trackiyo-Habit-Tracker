import React, { useEffect } from 'react';
import { useDailyPlanStore } from '../../store/useDailyPlanStore';
import { FiRefreshCw, FiClock, FiTrash2, FiZap } from 'react-icons/fi';

const BLOCK_COLORS: Record<string, string> = {
  task: 'border-accent/40 bg-accent/5',
  habit: 'border-success/40 bg-success/5',
  break: 'border-info/40 bg-info/5',
  focus: 'border-warning/40 bg-warning/5',
  event: 'border-border bg-surface-secondary',
};

export const DailyPlannerView: React.FC = () => {
  const { planDate, blocks, source, isLoading, isGenerating, energyContext, fetchPlan, generatePlan, updateBlocks, setEnergyContext } = useDailyPlanStore();

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    updateBlocks(next);
  };

  const removeBlock = (idx: number) => updateBlocks(blocks.filter((_, i) => i !== idx));

  return (
    <div className="bg-surface border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs w-full max-w-full min-w-0">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle flex-wrap gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-secondary-text break-words">AI Daily Planner</span>
          <p className="text-[10px] text-muted mt-0.5 break-words [overflow-wrap:anywhere]">{planDate}{source !== 'none' ? ` • via ${source}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0 max-w-full">
          <div className="flex items-center bg-surface-secondary rounded-lg border border-border-subtle p-0.5" role="group" aria-label="Energy level">
            {(['low', 'medium', 'high'] as const).map(e => (
              <button key={e} onClick={() => setEnergyContext(e)} title={`${e} energy`}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${energyContext === e ? 'bg-surface text-foreground border border-border/70' : 'text-muted hover:text-foreground'}`}>
                {e === 'low' ? '🌙' : e === 'medium' ? '☀️' : '⚡'}
              </button>
            ))}
          </div>
          <button onClick={() => generatePlan()} disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 h-8 bg-accent text-accent-ink text-[10px] font-bold uppercase tracking-wider rounded-lg hover:brightness-110 disabled:opacity-50">
            <FiRefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Planning...' : 'Generate'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-elevated rounded-lg animate-pulse" />)}</div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-6">
          <FiZap size={22} className="mx-auto mb-2 text-accent opacity-60" />
          <p className="text-xs text-muted mb-3">No plan yet for today. Generate an AI schedule.</p>
          <button onClick={() => generatePlan()} className="px-4 h-9 bg-surface-secondary border border-border-subtle hover:border-accent text-xs font-bold rounded-lg">
            Generate Daily Plan
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar min-w-0">
          {blocks.map((b, i) => (
            <div key={i} className={`flex items-center gap-3 min-w-0 p-2.5 rounded-lg border ${BLOCK_COLORS[b.type] || BLOCK_COLORS.event}`}>
              <span className="text-xs font-bold text-accent tabular-nums shrink-0 w-12">{b.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate break-words">{b.title}</p>
                <p className="text-[10px] text-muted flex items-center gap-1 min-w-0"><FiClock size={9} className="shrink-0" />{b.duration_minutes}m • {b.type}{b.is_suggested ? ' • suggested' : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="px-1.5 text-muted hover:text-foreground disabled:opacity-30" aria-label="Move up">↑</button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="px-1.5 text-muted hover:text-foreground disabled:opacity-30" aria-label="Move down">↓</button>
                <button onClick={() => removeBlock(i)} className="p-1 text-muted hover:text-error" aria-label="Remove block"><FiTrash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyPlannerView;
