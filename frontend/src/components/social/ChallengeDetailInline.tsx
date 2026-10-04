import React, { useState } from 'react';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useShareStore } from '../../store/useShareStore';
import { FiCheck, FiShare2, FiExternalLink } from 'react-icons/fi';
import type { ChallengeDetail } from '../../types/friendsChallenges';

interface ChallengeDetailInlineProps {
  detail: ChallengeDetail;
}

/**
 * Inline expandable challenge detail — renders directly beneath the tapped
 * challenge card instead of a modal popup.
 */
export const ChallengeDetailInline: React.FC<ChallengeDetailInlineProps> = ({ detail }) => {
  const { sendReaction, generateShareLink, checkinToday, isCheckingIn } = useChallengeStore();
  const { openShareModal } = useShareStore();

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  const isCompleted = detail.status === 'completed';
  const won = detail.winnerId && ((detail.isCreator && detail.winnerId === detail.id) || (!detail.isCreator && detail.winnerId !== detail.id));
  const isDraw = detail.isDraw;
  const isLeading = detail.myScore > detail.theirScore;

  const handleShareClick = async () => {
    openShareModal({
      type: 'challenge',
      title: detail.title,
      subtitle: `${detail.myScore} — ${detail.theirScore} vs ${detail.opponent.name}`,
      metric: `${detail.myScore} PTS`,
      metricValue: `${detail.myScore}`,
      metricLabel: 'POINTS SCORED',
      icon: won ? '🏆' : isLeading ? '🔥' : '⚔️',
      challengeData: {
        opponentName: detail.opponent.name,
        myScore: detail.myScore,
        theirScore: detail.theirScore,
        targetMetric: detail.targetMetric,
        targetUnit: detail.targetUnit,
        durationDays: detail.durationDays,
        status: detail.status,
        winnerName: detail.winnerId ? (won ? 'You' : detail.opponent.name) : null,
        isLeading,
        isDraw: Boolean(isDraw),
        hasWon: Boolean(won),
        challengeType: detail.challengeType,
      }
    });
  };

  const handleGetPublicLink = async () => {
    setIsGeneratingShare(true);
    const link = await generateShareLink(detail.id);
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
    <div className="mt-4 pt-4 border-t border-border-subtle space-y-4 w-full max-w-full min-w-0">
      {/* Head to Head Comparison */}
      <div className="grid grid-cols-2 gap-3 min-w-0 text-center">
        <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0">
          <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
            You
          </span>
          <div className="text-3xl font-bold text-accent tabular-nums">
            {detail.myScore}
          </div>
          <span className="text-[10px] text-muted">points</span>
        </div>
        <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0">
          <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1 truncate max-w-full break-words">
            {detail.opponent.name}
          </span>
          <div className="text-3xl font-bold text-foreground tabular-nums">
            {detail.theirScore}
          </div>
          <span className="text-[10px] text-muted">points</span>
        </div>
      </div>

      {/* Today's Dual Check-in Card (Single Consolidated Section) */}
      {!isCompleted && (
        <div className="bg-surface-secondary/70 border border-border-subtle rounded-2xl p-4 space-y-3 w-full max-w-full min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
              <FiCheck className="text-accent" size={13} strokeWidth={2.5} />
              Today's Streak Check-in
            </span>
            <span className="text-[10px] text-muted font-medium">1 daily check-in = 1 point</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
            {/* You Check-in Action */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 min-w-0 transition-all ${
              detail.myCheckedIn
                ? 'bg-success/10 border-success/30'
                : 'bg-surface border-border/80'
            }`}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-bold text-foreground">You</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  detail.myCheckedIn
                    ? 'bg-success/20 text-success'
                    : 'bg-surface-secondary text-muted'
                }`}>
                  {detail.myCheckedIn ? <><FiCheck size={11} strokeWidth={3} /> Completed</> : 'Pending'}
                </span>
              </div>

              {detail.myCheckedIn ? (
                <div className="py-2 px-3 rounded-lg bg-success/20 text-success text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <FiCheck size={14} strokeWidth={3} />
                  <span>Streak Ticked for Today (+1 pt)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => checkinToday(detail.id)}
                  disabled={isCheckingIn}
                  className="py-2 px-3 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FiCheck size={13} strokeWidth={3} />
                  <span>{isCheckingIn ? 'Ticking...' : 'Check-in My Streak'}</span>
                </button>
              )}
            </div>

            {/* Friend Check-in Status */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 min-w-0 transition-all ${
              detail.theirCheckedIn
                ? 'bg-success/10 border-success/30'
                : 'bg-surface border-border/80'
            }`}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0 max-w-full break-words">{detail.opponent.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  detail.theirCheckedIn
                    ? 'bg-success/20 text-success'
                    : 'bg-surface-secondary text-muted'
                }`}>
                  {detail.theirCheckedIn ? <><FiCheck size={11} strokeWidth={3} /> Completed</> : 'Pending'}
                </span>
              </div>

              <div className={`py-2 px-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 ${
                detail.theirCheckedIn
                  ? 'bg-success/20 text-success'
                  : 'bg-surface-secondary/70 text-muted'
              }`}>
                {detail.theirCheckedIn ? (
                  <>
                    <FiCheck size={14} strokeWidth={3} />
                    <span className="truncate">{detail.opponent.name} checked in today</span>
                  </>
                ) : (
                  <span className="truncate">Waiting for {detail.opponent.name}</span>
                )}
              </div>
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
                ? `You finished ahead with ${detail.myScore} points to ${detail.theirScore}.`
                : `${detail.opponent.name} finished ahead with ${detail.theirScore} points.`}
          </p>
        </div>
      )}

      {/* Day Timeline with Dual User Check Indicators */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0 text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-2">
          <span className="break-words min-w-0">Progress Timeline</span>
          <div className="flex items-center gap-3 flex-wrap min-w-0 text-[10px] font-normal normal-case text-muted">
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-accent inline-block shrink-0" /> You
            </span>
            <span className="flex items-center gap-1 min-w-0 max-w-full">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block shrink-0" /> <span className="truncate max-w-[90px] sm:max-w-[140px] break-words">{detail.opponent.name}</span>
            </span>
            <span className="font-semibold text-foreground">
              {detail.days.filter(d => d.isPast || d.isToday).length} / {detail.durationDays}d
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 min-w-0 overflow-x-auto p-1.5 bg-surface-secondary/40 rounded-xl border border-border-subtle">
          {detail.days.map((d) => (
            <div
              key={d.date}
              className={`flex flex-col items-center justify-center min-w-0 py-2 px-1 rounded-lg border text-center relative transition-colors ${
                d.isToday
                  ? 'border-accent bg-accent/15 text-accent font-bold shadow-xs'
                  : d.isPast
                    ? 'border-border-subtle bg-surface text-foreground'
                    : 'border-transparent text-muted opacity-40'
              }`}
            >
              <span className="text-[9px] uppercase font-mono">D{d.dayNumber}</span>
              <span className="text-[10px] tabular-nums mt-0.5">{d.date.slice(8)}</span>

              {/* Dual checkmark badges */}
              <div className="flex items-center justify-center gap-1 mt-1">
                <span
                  title={`You: ${d.myChecked ? 'Checked in' : 'Missed'}`}
                  className={`w-2 h-2 rounded-full ${
                    d.myChecked ? 'bg-accent' : 'bg-border-subtle opacity-40'
                  }`}
                />
                <span
                  title={`${detail.opponent.name}: ${d.theirChecked ? 'Checked in' : 'Missed'}`}
                  className={`w-2 h-2 rounded-full ${
                    d.theirChecked ? 'bg-indigo-400' : 'bg-border-subtle opacity-40'
                  }`}
                />
              </div>
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
              onClick={() => sendReaction(detail.id, emoji)}
              className="flex-1 min-w-0 py-2 rounded-xl bg-surface-secondary hover:bg-surface border border-border-subtle hover:border-accent text-lg transition-all active:scale-95 cursor-pointer"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {detail.reactions.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 mt-2.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted mr-1 shrink-0">Activity:</span>
            {detail.reactions.slice(0, 8).map((r) => (
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

      {/* Share & Actions Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
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
  );
};

export default ChallengeDetailInline;
