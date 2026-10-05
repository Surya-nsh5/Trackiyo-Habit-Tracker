import React, { useState } from 'react';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useShareStore } from '../../store/useShareStore';
import {
  FiX, FiCheck, FiShare2, FiExternalLink
} from 'react-icons/fi';

export const ChallengeDetailModal: React.FC = () => {
  const { activeDetail, closeDetailModal, sendReaction, generateShareLink } = useChallengeStore();
  const { openShareModal } = useShareStore();

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  if (!activeDetail) return null;

  const isCompleted = activeDetail.status === 'completed';
  const won = activeDetail.winnerId && ((activeDetail.isCreator && activeDetail.winnerId === activeDetail.id) || (!activeDetail.isCreator && activeDetail.winnerId !== activeDetail.id));
  const isDraw = activeDetail.isDraw;
  const isLeading = activeDetail.myScore > activeDetail.theirScore;

  const handleShareClick = async () => {
    // Open share card modal with challenge result
    openShareModal({
      type: 'challenge',
      title: activeDetail.title,
      subtitle: `${activeDetail.myScore} — ${activeDetail.theirScore} vs ${activeDetail.opponent.name}`,
      metric: `${activeDetail.myScore} PTS`,
      metricValue: `${activeDetail.myScore}`,
      metricLabel: 'POINTS SCORED',
      icon: won ? '🏆' : isLeading ? '🔥' : '⚔️',
      challengeData: {
        opponentName: activeDetail.opponent.name,
        myScore: activeDetail.myScore,
        theirScore: activeDetail.theirScore,
        targetMetric: activeDetail.targetMetric,
        targetUnit: activeDetail.targetUnit,
        durationDays: activeDetail.durationDays,
        status: activeDetail.status,
        winnerName: activeDetail.winnerId ? (won ? 'You' : activeDetail.opponent.name) : null,
        isLeading,
        isDraw: Boolean(isDraw),
        hasWon: Boolean(won),
        challengeType: activeDetail.challengeType,
      }
    });
  };

  const handleGetPublicLink = async () => {
    setIsGeneratingShare(true);
    const link = await generateShareLink(activeDetail.id);
    setIsGeneratingShare(false);
    if (link) {
      setShareUrl(link);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto safe-pt safe-pb safe-px">
      <div className="bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 max-w-lg w-full min-w-0 space-y-5 shadow-2xl my-auto animate-fadeIn max-h-[calc(100dvh-2rem-var(--sat)-var(--sab))] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 min-w-0 border-b border-border-subtle pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${
                isCompleted
                  ? 'bg-muted/15 text-muted border border-border-subtle'
                  : 'bg-accent/10 text-accent border border-accent/20'
              }`}>
                {activeDetail.status}
              </span>
              <h2 className="text-sm font-bold text-foreground truncate flex-1 min-w-0 max-w-full">{activeDetail.title}</h2>
            </div>
            <p className="text-[11px] text-muted mt-0.5 break-words [overflow-wrap:anywhere]">
              Target: {activeDetail.targetMetric} {activeDetail.targetUnit.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDetailModal}
            aria-label="Close challenge details"
            className="p-1 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Head to Head Comparison */}
        <div className="grid grid-cols-2 gap-3 min-w-0 text-center">
          {/* User Score */}
          <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
              You
            </span>
            <div className="text-3xl font-bold text-accent tabular-nums">
              {activeDetail.myScore}
            </div>
            <span className="text-[10px] text-muted">points</span>
          </div>

          {/* Opponent Score */}
          <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1 truncate max-w-full break-words">
              {activeDetail.opponent.name}
            </span>
            <div className="text-3xl font-bold text-foreground tabular-nums">
              {activeDetail.theirScore}
            </div>
            <span className="text-[10px] text-muted">points</span>
          </div>
        </div>

        {/* Today's Status */}
        {!isCompleted && (
          <div className="bg-surface-secondary/50 border border-border-subtle rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-secondary-text uppercase tracking-wider mb-2">
              Today's Daily Target
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  activeDetail.myTodayMet ? 'bg-success text-white' : 'bg-surface border border-border-subtle text-muted'
                }`}>
                  {activeDetail.myTodayMet ? <FiCheck size={13} strokeWidth={3} /> : '—'}
                </span>
                <span className="font-semibold text-foreground break-words min-w-0">
                  You: {activeDetail.myTodayMet ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  activeDetail.theirTodayMet ? 'bg-success text-white' : 'bg-surface border border-border-subtle text-muted'
                }`}>
                  {activeDetail.theirTodayMet ? <FiCheck size={13} strokeWidth={3} /> : '—'}
                </span>
                <span className="font-semibold text-secondary-text truncate flex-1 min-w-0 max-w-full break-words">
                  {activeDetail.opponent.name}: {activeDetail.theirTodayMet ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Completed Outcome Banner */}
        {isCompleted && (
          <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 text-center space-y-1.5">
            <div className="text-base font-bold text-foreground">
              {isDraw ? 'Challenge Result: Draw' : won ? 'Congratulations! You Won' : 'Challenge Completed'}
            </div>
            <p className="text-xs text-muted">
              {isDraw
                ? 'Both participants showed equal dedication and completed the challenge.'
                : won
                  ? `You finished ahead with ${activeDetail.myScore} points to ${activeDetail.theirScore}.`
                  : `${activeDetail.opponent.name} finished ahead with ${activeDetail.theirScore} points.`}
            </p>
          </div>
        )}

        {/* Day Timeline */}
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0 text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-2">
            <span>Progress Timeline</span>
            <span>{activeDetail.days.filter(d => d.isPast || d.isToday).length} / {activeDetail.durationDays} Days</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 min-w-0 overflow-x-auto p-1 bg-surface-secondary/40 rounded-xl border border-border-subtle">
            {activeDetail.days.map((d) => (
              <div
                key={d.date}
                className={`flex flex-col items-center justify-center min-w-0 py-2 px-1 rounded-lg border text-center ${
                  d.isToday
                    ? 'border-accent bg-accent/15 text-accent font-bold'
                    : d.isPast
                      ? 'border-border-subtle bg-surface text-foreground'
                      : 'border-transparent text-muted opacity-40'
                }`}
              >
                <span className="text-[9px] uppercase font-mono">D{d.dayNumber}</span>
                <span className="text-[10px] tabular-nums mt-0.5">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Encouragement Reactions */}
        <div>
          <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-2">
            Send Encouragement
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {['🔥', '👏', '💪', '🎯'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(activeDetail.id, emoji)}
                className="flex-1 min-w-0 py-2 rounded-xl bg-surface-secondary hover:bg-surface border border-border-subtle hover:border-accent text-lg transition-all active:scale-95 cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Recent reactions */}
          {activeDetail.reactions.length > 0 && (
            <div className="flex items-center gap-1.5 min-w-0 mt-2.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-muted mr-1 shrink-0">Activity:</span>
              {activeDetail.reactions.slice(0, 8).map((r) => (
                <span
                  key={r.id}
                  className="px-2 py-0.5 rounded-full text-xs bg-surface-secondary border border-border-subtle shrink-0"
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Share & Actions Section (Available anytime, especially on completion) */}
        <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleShareClick}
            className="flex-1 py-2.5 rounded-xl bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiShare2 size={14} />
            Share Result Card
          </button>

          <button
            type="button"
            onClick={handleGetPublicLink}
            disabled={isGeneratingShare}
            className="py-2.5 px-3.5 rounded-xl border border-border-subtle bg-surface-secondary text-secondary-text hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FiExternalLink size={13} />
            {isGeneratingShare ? 'Generating...' : 'Public Link'}
          </button>
        </div>

        {shareUrl && (
          <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle flex items-center justify-between gap-2 min-w-0 max-w-full text-xs">
            <span className="truncate text-muted flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{shareUrl}</span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-2.5 py-1 rounded-md bg-accent text-accent-ink font-bold text-[11px] shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
