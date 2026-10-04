import React, { useEffect, useState } from 'react';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';
import { useFriendStore } from '../../store/useFriendStore';
import {
  FiTarget, FiPlus, FiCheck, FiChevronDown, FiTrash2
} from 'react-icons/fi';
import { ChallengeDetailInline } from './ChallengeDetailInline';

export const ChallengesView: React.FC = () => {
  const {
    activeChallenges,
    pendingChallenges,
    historyChallenges,
    activeDetail,
    isDetailLoading,
    fetchChallenges,
    fetchChallengeDetail,
    closeDetailModal,
    respondToChallenge,
    deleteChallenge,
    openCreateModal,
    openCreateModalWithTitle
  } = useChallengeStore();

  const { promptDelete } = useDeleteConfirmStore();

  const { fetchFriends } = useFriendStore();
  const [filter, setFilter] = useState<'active' | 'pending' | 'history'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  useEffect(() => {
    fetchChallenges();
    fetchFriends();
  }, [fetchChallenges, fetchFriends]);

  // Quick-add: name what you're challenging yourself to do, then pick a
  // friend + target in the modal (title comes prefilled).
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    openCreateModalWithTitle(quickTitle.trim().slice(0, 60));
    setQuickTitle('');
  };

  // Inline expansion replaces the detail popup: tapping a card reveals its
  // detail directly beneath it; tapping again (or Collapse) hides it.
  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      closeDetailModal();
    } else {
      setExpandedId(id);
      fetchChallengeDetail(id);
    }
  };

  const renderExpandedDetail = (challengeId: string) => {
    if (expandedId !== challengeId) return null;
    if (isDetailLoading || !activeDetail || activeDetail.id !== challengeId) {
      return (
        <div className="mt-4 pt-4 border-t border-border-subtle" role="status" aria-label="Loading challenge detail">
          <div className="h-24 rounded-xl bg-surface-secondary animate-pulse" />
        </div>
      );
    }
    return <ChallengeDetailInline detail={activeDetail} />;
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full min-w-0 gap-3 md:gap-4 p-3 md:p-4 lg:p-5 overflow-y-auto custom-scrollbar">
      {/* View Header with Single Dominant Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex items-center gap-2.5 break-words min-w-0">
            <FiTarget className="text-accent shrink-0" size={20} />
            Streak Challenges
          </h1>
          <p className="text-xs text-secondary-text mt-0.5">
            Compete on daily consistency and deep work with friends. Based on actual Trackiyo activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-ink text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <FiPlus size={15} strokeWidth={2.5} />
          Challenge Friend
        </button>
      </div>

      {/* Quick-add: name the challenge first, details in the modal */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 w-full max-w-full min-w-0">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="What are you challenging yourself to do? e.g. Morning run"
          aria-label="Challenge name"
          className="flex-1 min-w-0 max-w-full h-10 bg-surface border border-border/70 rounded-xl px-3.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="h-10 px-4 rounded-xl bg-surface-secondary border border-border-subtle hover:border-accent text-xs font-bold text-foreground transition-colors disabled:opacity-40 shrink-0"
        >
          Name it →
        </button>
      </form>

      {/* Segmented Filter */}
      <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'active'
            ? 'bg-surface text-foreground border border-border/80 shadow-xs'
            : 'text-muted hover:text-foreground'
            }`}
        >
          Active ({activeChallenges.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors relative ${filter === 'pending'
            ? 'bg-surface text-foreground border border-border/80 shadow-xs'
            : 'text-muted hover:text-foreground'
            }`}
        >
          Pending
          {pendingChallenges.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-accent text-accent-ink font-bold">
              {pendingChallenges.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'history'
            ? 'bg-surface text-foreground border border-border/80 shadow-xs'
            : 'text-muted hover:text-foreground'
            }`}
        >
          History ({historyChallenges.length})
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ACTIVE CHALLENGES */}
      {/* ---------------------------------------------------- */}
      {filter === 'active' && (
        <div className="space-y-4">
          {activeChallenges.length === 0 ? (
            <div className="bg-surface border border-border/70 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto text-muted">
                <FiTarget size={22} />
              </div>
              <h3 className="text-sm font-bold text-foreground">No active challenges</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Invite a friend to a 7, 14, or 30-day focus or habit challenge to stay mutually accountable.
              </p>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-secondary border border-border-subtle hover:border-accent text-foreground text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <FiPlus size={14} />
                Create Challenge
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeChallenges.map((challenge) => {
                const total = challenge.durationDays || 14;
                const myRatio = Math.min(100, Math.round((challenge.myScore / total) * 100));
                const theirRatio = Math.min(100, Math.round((challenge.theirScore / total) * 100));
                // Day counter is date-based (elapsed days), independent of score
                const startDay = new Date((challenge.startDate || '').slice(0, 10) + 'T00:00:00');
                const todayDay = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
                const elapsedDay = Number.isNaN(startDay.getTime())
                  ? 1
                  : Math.min(total, Math.max(1, Math.floor((todayDay.getTime() - startDay.getTime()) / 86400000) + 1));

                return (
                  <div
                    key={challenge.id}
                    className="bg-surface border border-border/70 hover:border-border rounded-xl p-4 sm:p-5 transition-all shadow-xs group w-full max-w-full min-w-0"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-[10px] font-bold text-accent uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 border border-accent/20 shrink-0 whitespace-nowrap">
                            {challenge.challengeType}
                          </span>
                          <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                            {challenge.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-1 break-words [overflow-wrap:anywhere]">
                          Target: {challenge.targetMetric} {challenge.targetUnit.replace(/_/g, ' ')} • Ends {new Date(challenge.endDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="text-xs font-bold text-foreground">
                          Day {elapsedDay} of {total}
                        </span>
                        <button
                          type="button"
                          onClick={() => promptDelete({
                            title: 'Delete Challenge?',
                            message: 'Are you sure you want to delete this challenge? This will remove all progress and history for both participants.',
                            itemName: challenge.title,
                            onConfirm: async () => {
                              await deleteChallenge(challenge.id);
                            }
                          })}
                          className="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Challenge"
                          aria-label={`Delete challenge ${challenge.title}`}
                        >
                          <FiTrash2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExpand(challenge.id)}
                          aria-expanded={expandedId === challenge.id}
                          aria-label={expandedId === challenge.id ? `Collapse ${challenge.title}` : `Expand ${challenge.title}`}
                          className="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                          <FiChevronDown
                            size={16}
                            className={`transition-transform ${expandedId === challenge.id ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Head to Head Score Cards */}
                    <div className="grid grid-cols-2 gap-3 min-w-0 pt-2 border-t border-border-subtle">
                      {/* You */}
                      <div className="bg-surface-secondary border border-border-subtle rounded-lg p-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 min-w-0 text-xs font-semibold mb-1.5">
                          <span className="text-foreground">You</span>
                          <span className="text-accent font-bold tabular-nums text-sm">{challenge.myScore} pts</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border-subtle">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${myRatio}%` }} />
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="bg-surface-secondary border border-border-subtle rounded-lg p-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 min-w-0 text-xs font-semibold mb-1.5">
                          <span className="text-secondary-text truncate max-w-full flex-1 min-w-0 mr-2 break-words">{challenge.opponent.name}</span>
                          <span className="text-foreground font-bold tabular-nums text-sm">{challenge.theirScore} pts</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border-subtle">
                          <div className="h-full bg-muted rounded-full transition-all" style={{ width: `${theirRatio}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Inline expanded detail (replaces popup) */}
                    {renderExpandedDetail(challenge.id)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PENDING INVITATIONS */}
      {/* ---------------------------------------------------- */}
      {filter === 'pending' && (
        <div className="space-y-3">
          {pendingChallenges.length === 0 ? (
            <p className="text-xs text-muted italic bg-surface border border-border/70 rounded-xl p-6 text-center">
              No pending challenge invitations.
            </p>
          ) : (
            pendingChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-surface border border-border/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-full min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 shrink-0 whitespace-nowrap">
                      Invitation
                    </span>
                    <h3 className="text-xs font-bold text-foreground break-words flex-1 min-w-0">{challenge.title}</h3>
                  </div>
                  <p className="text-[11px] text-muted mt-1 break-words [overflow-wrap:anywhere]">
                    {challenge.isCreator
                      ? `Waiting for ${challenge.opponent.name} to accept`
                      : `${challenge.opponent.name} invited you to a ${challenge.durationDays}-day challenge`}
                  </p>
                </div>

                {challenge.isCreator ? (
                  <button
                    type="button"
                    onClick={() => promptDelete({
                      title: 'Cancel Challenge Invite?',
                      message: `Are you sure you want to cancel and delete this pending invite to ${challenge.opponent.name}?`,
                      itemName: challenge.title,
                      onConfirm: async () => {
                        await deleteChallenge(challenge.id);
                      }
                    })}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                    title="Cancel Invite"
                  >
                    <FiTrash2 size={13} />
                    <span>Cancel Invite</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => respondToChallenge(challenge.id, 'accept')}
                      className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiCheck size={13} strokeWidth={3} />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToChallenge(challenge.id, 'decline')}
                      className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-secondary text-secondary-text hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => promptDelete({
                        title: 'Decline & Delete Challenge?',
                        message: 'Are you sure you want to decline and remove this challenge invitation?',
                        itemName: challenge.title,
                        onConfirm: async () => {
                          await deleteChallenge(challenge.id);
                        }
                      })}
                      className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Delete Invite"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CHALLENGE HISTORY */}
      {/* ---------------------------------------------------- */}
      {filter === 'history' && (
        <div className="space-y-3">
          {historyChallenges.length === 0 ? (
            <p className="text-xs text-muted italic bg-surface border border-border/70 rounded-xl p-6 text-center">
              No completed challenges yet.
            </p>
          ) : (
            historyChallenges.map((challenge) => {
              const won = challenge.winnerId && ((challenge.isCreator && challenge.winnerId === challenge.id) || (!challenge.isCreator && challenge.winnerId !== challenge.id));
              const isDraw = challenge.isDraw;

              return (
                <div
                  key={challenge.id}
                  className="bg-surface border border-border/70 hover:border-border rounded-xl p-4 transition-colors w-full max-w-full min-w-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${isDraw
                        ? 'bg-muted/15 text-muted border border-border-subtle'
                        : won
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-surface-secondary text-secondary-text border border-border-subtle'
                        }`}>
                        {isDraw ? 'Draw' : won ? 'Completed • Won' : 'Completed'}
                      </span>
                      <h3 className="text-xs font-bold text-foreground break-words flex-1 min-w-0 [overflow-wrap:anywhere]">{challenge.title}</h3>
                    </div>
                    <p className="text-[11px] text-muted mt-1 break-words [overflow-wrap:anywhere]">
                      vs {challenge.opponent.name} • {challenge.durationDays} Days
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {challenge.myScore} — {challenge.theirScore}
                      </span>
                      <span className="text-[10px] text-muted block">Final Score</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => promptDelete({
                        title: 'Delete History Record?',
                        message: 'Are you sure you want to delete this completed challenge record?',
                        itemName: challenge.title,
                        onConfirm: async () => {
                          await deleteChallenge(challenge.id);
                        }
                      })}
                      className="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Challenge Record"
                      aria-label={`Delete record for ${challenge.title}`}
                    >
                      <FiTrash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(challenge.id)}
                      aria-expanded={expandedId === challenge.id}
                      aria-label={expandedId === challenge.id ? `Collapse ${challenge.title}` : `Expand ${challenge.title}`}
                      className="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <FiChevronDown
                        size={16}
                        className={`transition-transform ${expandedId === challenge.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                  </div>

                  {/* Inline expanded detail (replaces popup) */}
                  {renderExpandedDetail(challenge.id)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
