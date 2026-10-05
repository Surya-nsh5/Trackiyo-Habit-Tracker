import React, { useEffect, useState } from 'react';
import { useFriendStore } from '../../store/useFriendStore';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  FiUsers, FiSearch, FiUserPlus, FiCheck, FiX,
  FiTrash2, FiClock, FiAward, FiTarget, FiZap,
  FiChevronDown, FiChevronUp, FiPlus, FiTrendingUp
} from 'react-icons/fi';
import { ChallengeDetailInline } from './ChallengeDetailInline';

const formatChallengeUnit = (unit?: string): string => {
  if (!unit) return 'min';
  if (unit === 'habit_per_day') return 'habit';
  if (unit === 'minutes_per_day') return 'min';
  if (unit === 'tasks_per_day') return 'task';
  return unit.replace(/_/g, ' ');
};

export const FriendsView: React.FC = () => {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    isSearching,
    selectedFriendProfile,
    fetchFriends,
    fetchRequests,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    viewFriendProfile,
    closeFriendProfile,
    clearSearch
  } = useFriendStore();

  const {
    activeChallenges,
    pendingChallenges,
    historyChallenges,
    fetchChallenges,
    fetchChallengeDetail,
    activeDetail,
    isDetailLoading,
    closeDetailModal,
    checkinToday,
    respondToChallenge,
    deleteChallenge,
    openCreateModal,
    isCheckingIn
  } = useChallengeStore();

  const { promptDelete } = useDeleteConfirmStore();

  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'find'>('friends');
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [expandedHistoryFriendId, setExpandedHistoryFriendId] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchChallenges();
  }, [fetchFriends, fetchRequests, fetchChallenges]);

  useEffect(() => {
    if (activeTab !== 'find') return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, searchUsers, clearSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      searchUsers(searchQuery.trim());
    }
  };

  const toggleExpandChallenge = (challengeId: string) => {
    if (expandedChallengeId === challengeId) {
      setExpandedChallengeId(null);
      closeDetailModal();
    } else {
      setExpandedChallengeId(challengeId);
      fetchChallengeDetail(challengeId);
    }
  };

  const handleCheckin = async (challengeId: string) => {
    setCheckingInId(challengeId);
    try {
      await checkinToday(challengeId);
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="h-full w-full max-w-full min-w-0 min-h-0 p-3 md:p-4 lg:p-5 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-full min-w-0 flex flex-col gap-3 md:gap-4">
      {/* Top Header & Tab Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex items-center gap-2.5 break-words min-w-0">
            <FiUsers className="text-accent shrink-0" size={20} />
            Friends & Accountability
          </h1>
          <p className="text-xs text-secondary-text mt-0.5">
            Connect with friends for mutual focus, streak challenges, and healthy accountability.
          </p>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center flex-wrap max-w-full min-w-0 bg-surface-secondary rounded-lg border border-border-subtle p-0.5 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('friends'); clearSearch(); }}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'friends'
              ? 'bg-surface text-foreground border border-border/80 shadow-xs'
              : 'text-muted hover:text-foreground'
              }`}
          >
            Friends ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-md transition-colors relative cursor-pointer ${activeTab === 'requests'
              ? 'bg-surface text-foreground border border-border/80 shadow-xs'
              : 'text-muted hover:text-foreground'
              }`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-accent text-accent-ink font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('find')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'find'
              ? 'bg-surface text-foreground border border-border/80 shadow-xs'
              : 'text-muted hover:text-foreground'
              }`}
          >
            Find Friends
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: FRIENDS LIST WITH EMBEDDED STREAK CHALLENGES */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="bg-surface border border-border/70 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto text-muted">
                <FiUsers size={22} />
              </div>
              <h3 className="text-sm font-bold text-foreground">No friends connected yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Add a study partner, colleague, or friend to start mutual streak challenges.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('find')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-ink text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                <FiUserPlus size={14} />
                Find Friends
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
              {friends.map((friend) => {
                const friendActiveChallenges = activeChallenges.filter(c => c.opponent?.id === friend.id);
                const friendPendingChallenges = pendingChallenges.filter(c => c.opponent?.id === friend.id);
                const friendHistoryChallenges = historyChallenges.filter(c => c.opponent?.id === friend.id);
                const totalChallenges = friendActiveChallenges.length + friendPendingChallenges.length;

                return (
                  <div
                    key={friend.id}
                    className="bg-surface border border-border/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-border transition-all shadow-xs w-full max-w-full min-w-0"
                  >
                    {/* Friend Header Card Row */}
                    <div className="flex items-center justify-between gap-3 min-w-0 pb-3 border-b border-border-subtle">
                      <div
                        onClick={() => viewFriendProfile(friend.id)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
                        title="Click to view accountability profile"
                      >
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-11 h-11 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold text-sm flex items-center justify-center shrink-0">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0 max-w-full">
                            <h4 className="text-sm font-bold text-foreground truncate max-w-full flex-1 min-w-0 group-hover:text-accent transition-colors">
                              {friend.name}
                            </h4>
                            {friend.streakCount !== undefined && friend.streakCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning border border-warning/30 shrink-0 whitespace-nowrap">
                                🔥 {friend.streakCount}d
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted flex items-center flex-wrap gap-1.5 mt-0.5 min-w-0 break-words [overflow-wrap:anywhere]">
                            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            Accountability Partner
                            {friend.username && <span className="text-muted/70">@{friend.username}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {friend.allowChallenges ? (
                          <button
                            type="button"
                            onClick={() => openCreateModal(friend.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            <FiPlus size={13} strokeWidth={2.5} />
                            <span>Challenge</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted italic">Challenges off</span>
                        )}
                        <button
                          type="button"
                          onClick={() => promptDelete({
                            title: 'Remove Friend?',
                            message: `Are you sure you want to remove ${friend.name} from your friends list?`,
                            itemName: friend.name,
                            onConfirm: async () => {
                              await removeFriend(friend.id);
                            }
                          })}
                          className="p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove Friend"
                          aria-label={`Remove friend ${friend.name}`}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Streak Challenges Section inside this Friend */}
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0 text-xs">
                        <span className="font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5 text-[11px] min-w-0 max-w-full flex-1">
                          <FiTarget className="text-accent" size={14} />
                          Streak Challenges
                          {totalChallenges > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent/20 text-accent font-bold">
                              {totalChallenges}
                            </span>
                          )}
                        </span>
                        {friendActiveChallenges.length > 2 ? (
                          <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                            <span>Scroll for all ({friendActiveChallenges.length})</span>
                            <FiChevronDown size={11} className="text-accent" />
                          </span>
                        ) : friendHistoryChallenges.length > 0 ? (
                          <span className="text-[10px] text-muted">
                            {friendHistoryChallenges.length} past {friendHistoryChallenges.length === 1 ? 'duel' : 'duels'}
                          </span>
                        ) : null}
                      </div>

                      {/* 1. Pending Challenges with this Friend */}
                      {friendPendingChallenges.length > 0 && (
                        <div className="space-y-2">
                          {friendPendingChallenges.map((c) => {
                            const userIsCreator = c.isCreator;

                            return (
                              <div
                                key={c.id}
                                className="bg-surface-secondary/70 border border-warning/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full max-w-full min-w-0"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning shrink-0 whitespace-nowrap">
                                      Pending
                                    </span>
                                    <h5 className="text-xs font-bold text-foreground truncate flex-1 min-w-0 break-words">
                                      {c.title}
                                    </h5>
                                  </div>
                                  <p className="text-[11px] text-muted mt-0.5 break-words [overflow-wrap:anywhere]">
                                    {userIsCreator
                                      ? `Waiting for ${friend.name} to accept`
                                      : `${friend.name} challenged you! (${c.targetMetric} ${formatChallengeUnit(c.targetUnit)} • ${c.durationDays}d)`}
                                  </p>
                                </div>

                                {userIsCreator ? (
                                  <button
                                    type="button"
                                    onClick={() => promptDelete({
                                      title: 'Cancel Challenge Invite?',
                                      message: `Are you sure you want to cancel and delete this pending invite to ${friend.name}?`,
                                      itemName: c.title,
                                      onConfirm: async () => {
                                        await deleteChallenge(c.id);
                                      }
                                    })}
                                    className="px-2.5 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                    title="Cancel Invite"
                                  >
                                    <FiTrash2 size={12} />
                                    <span>Cancel Invite</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => respondToChallenge(c.id, 'accept')}
                                      className="px-2.5 py-1 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                                    >
                                      <FiCheck size={12} strokeWidth={3} />
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => respondToChallenge(c.id, 'decline')}
                                      className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface text-secondary-text hover:text-foreground text-xs font-semibold cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => promptDelete({
                                        title: 'Decline & Delete Challenge?',
                                        message: `Are you sure you want to decline and remove this challenge invite?`,
                                        itemName: c.title,
                                        onConfirm: async () => {
                                          await deleteChallenge(c.id);
                                        }
                                      })}
                                      className="p-1 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                                      title="Delete Invite"
                                    >
                                      <FiTrash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Active Challenges with this Friend */}
                      {friendActiveChallenges.length > 0 ? (
                        <div className={`space-y-3 ${
                          friendActiveChallenges.length > 2
                            ? 'max-h-[465px] overflow-y-auto custom-scrollbar pr-1 overscroll-contain'
                            : ''
                        }`}>
                          {friendActiveChallenges.map((c) => {
                            const totalScore = (c.myScore || 0) + (c.theirScore || 0);
                            let myRatio = 50;
                            if (totalScore > 0) {
                              if (c.myScore > 0 && c.theirScore > 0) {
                                myRatio = Math.max(14, Math.min(86, Math.round(((c.myScore || 0) / totalScore) * 100)));
                              } else if (c.myScore > 0) {
                                myRatio = 86;
                              } else {
                                myRatio = 14;
                              }
                            }
                            const isLeading = c.myScore > c.theirScore;
                            const isTied = c.myScore === c.theirScore;
                            const isExpanded = expandedChallengeId === c.id;
                            const myCheckedInToday = Boolean(c.myTodayCheckedIn);
                            const theirCheckedInToday = Boolean(c.theirTodayCheckedIn);

                            return (
                              <div
                                key={c.id}
                                className="bg-surface-secondary border border-border/80 rounded-xl p-3.5 space-y-3 shadow-xs w-full max-w-full min-w-0"
                              >
                                {/* Top Title & Meta */}
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent shrink-0 whitespace-nowrap">
                                        {c.challengeType}
                                      </span>
                                      <h5 className="text-xs font-bold text-foreground truncate flex-1 min-w-0 max-w-full break-words">
                                        {c.title}
                                      </h5>
                                    </div>
                                    <p className="text-[11px] text-muted mt-1 break-words [overflow-wrap:anywhere]">
                                      Goal: {c.targetMetric} {formatChallengeUnit(c.targetUnit)} daily • {c.durationDays} Days Streak
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-full">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full max-w-full break-words ${
                                      isLeading
                                        ? 'bg-success/15 text-success border border-success/30'
                                        : isTied
                                        ? 'bg-warning/15 text-warning border border-warning/30'
                                        : 'bg-muted/15 text-muted border border-border-subtle'
                                    }`}>
                                      {isLeading ? "🔥 You're Leading" : isTied ? '⚡ Tied' : `🏃 ${friend.name} leads`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => promptDelete({
                                        title: 'Delete Challenge?',
                                        message: 'Are you sure you want to delete this challenge? This will remove all progress, points, and streak check-ins for both participants.',
                                        itemName: c.title,
                                        onConfirm: async () => {
                                          await deleteChallenge(c.id);
                                        }
                                      })}
                                      className="p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Delete Challenge"
                                      aria-label={`Delete challenge ${c.title}`}
                                    >
                                      <FiTrash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Head-to-Head Streak Scoreboard */}
                                <div className="bg-surface/80 rounded-lg p-2.5 border border-border/60 space-y-2 min-w-0">
                                  <div className="flex items-center justify-between gap-2 min-w-0 text-xs font-bold">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-accent">You</span>
                                      <span className="text-base font-extrabold text-foreground tabular-nums">
                                        {c.myScore}
                                      </span>
                                      <span className="text-[10px] text-muted font-normal">pts</span>
                                    </div>

                                    <div className="text-[10px] text-muted uppercase font-bold tracking-widest">
                                      VS
                                    </div>

                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-base font-extrabold text-foreground tabular-nums">
                                        {c.theirScore}
                                      </span>
                                      <span className="text-[10px] text-muted font-normal">pts</span>
                                      <span className="text-secondary-text truncate max-w-[80px] break-words">
                                        {friend.name}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Head-to-Head Visual Progress Bar */}
                                  <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden flex border border-border-subtle">
                                    <div
                                      style={{ width: `${myRatio}%` }}
                                      className="h-full bg-accent transition-all duration-300"
                                      title={`Your score share: ${myRatio}%`}
                                    />
                                    <div
                                      style={{ width: `${100 - myRatio}%` }}
                                      className="h-full bg-indigo-500/70 transition-all duration-300"
                                      title={`${friend.name}'s score share: ${100 - myRatio}%`}
                                    />
                                  </div>

                                  {/* Today's Dual Check-in Badges: Both You and Friend always visible */}
                                  <div className="grid grid-cols-2 gap-2 min-w-0 pt-1 border-t border-border-subtle/60">
                                    <div className={`p-1.5 px-2 rounded-md border text-xs flex items-center gap-1.5 transition-colors min-w-0 ${
                                      myCheckedInToday
                                        ? 'bg-success/10 border-success/30 text-success'
                                        : 'bg-surface/60 border-border-subtle text-muted'
                                    }`}>
                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                        myCheckedInToday ? 'bg-success text-white' : 'bg-surface-secondary text-muted border border-border-subtle'
                                      }`}>
                                        {myCheckedInToday ? <FiCheck size={10} strokeWidth={3} /> : '—'}
                                      </span>
                                      <div className="min-w-0">
                                        <span className="font-bold text-[10px] block leading-tight truncate">You</span>
                                        <span className="text-[9px] block leading-tight opacity-80">
                                          {myCheckedInToday ? 'Ticked today' : 'Pending tick'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className={`p-1.5 px-2 rounded-md border text-xs flex items-center gap-1.5 transition-colors min-w-0 ${
                                      theirCheckedInToday
                                        ? 'bg-success/10 border-success/30 text-success'
                                        : 'bg-surface/60 border-border-subtle text-muted'
                                    }`}>
                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                        theirCheckedInToday ? 'bg-success text-white' : 'bg-surface-secondary text-muted border border-border-subtle'
                                      }`}>
                                        {theirCheckedInToday ? <FiCheck size={10} strokeWidth={3} /> : '—'}
                                      </span>
                                      <div className="min-w-0">
                                        <span className="font-bold text-[10px] block leading-tight truncate">{friend.name}</span>
                                        <span className="text-[9px] block leading-tight opacity-80">
                                          {theirCheckedInToday ? 'Ticked today' : 'Pending tick'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Challenge Action Strip */}
                                <div className="flex items-center justify-between gap-2 min-w-0 pt-1">
                                  {myCheckedInToday ? (
                                    <div className="flex-1 min-w-0 py-1.5 px-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                                      <FiCheck size={13} strokeWidth={3} />
                                      <span>Streak Ticked Today (+1 pt)</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCheckin(c.id)}
                                      disabled={checkingInId === c.id || isCheckingIn}
                                      className="flex-1 min-w-0 py-1.5 px-3 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <FiCheck size={13} strokeWidth={3} />
                                      <span>
                                        {checkingInId === c.id ? 'Checking in...' : "Check-in Today's Streak"}
                                      </span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => toggleExpandChallenge(c.id)}
                                    className="p-1.5 px-2.5 rounded-lg border border-border-subtle bg-surface text-secondary-text hover:text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                                    title="View challenge days and reactions"
                                  >
                                    <span className="text-[11px]">{isExpanded ? 'Collapse' : 'Breakdown'}</span>
                                    {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                                  </button>
                                </div>

                                {/* Inline Expanded Days & Breakdown */}
                                {isExpanded && (
                                  <div className="pt-2 border-t border-border-subtle">
                                    {isDetailLoading && (!activeDetail || activeDetail.id !== c.id) ? (
                                      <div className="h-20 rounded-xl bg-surface animate-pulse flex items-center justify-center text-xs text-muted">
                                        Loading streak details...
                                      </div>
                                    ) : activeDetail && activeDetail.id === c.id ? (
                                      <ChallengeDetailInline detail={activeDetail} />
                                    ) : (
                                      <div className="h-20 rounded-xl bg-surface animate-pulse flex items-center justify-center text-xs text-muted">
                                        Loading streak details...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : friendPendingChallenges.length === 0 ? (
                        /* Empty State: Prompt to start a challenge directly with this friend */
                        <div className="border border-dashed border-border/80 rounded-xl p-3.5 text-center bg-surface-secondary/30 space-y-2">
                          <p className="text-xs text-muted">
                            No active streak challenge with <strong className="text-foreground">{friend.name}</strong> yet.
                          </p>
                          {friend.allowChallenges ? (
                            <button
                              type="button"
                              onClick={() => openCreateModal(friend.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-foreground hover:text-accent text-xs font-bold transition-colors cursor-pointer"
                            >
                              <FiZap className="text-accent" size={13} />
                              Start a Streak Challenge
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted italic">This friend has disabled challenge invites</span>
                          )}
                        </div>
                      ) : null}

                      {/* 3. Past Completed Duels with this Friend */}
                      {friendHistoryChallenges.length > 0 && (
                        <div className="pt-2 border-t border-border-subtle/70">
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryFriendId(prev => prev === friend.id ? null : friend.id)}
                            className="text-[11px] font-semibold text-muted hover:text-foreground flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <FiAward size={13} className="text-warning" />
                              Past Completed Duels ({friendHistoryChallenges.length})
                            </span>
                            {expandedHistoryFriendId === friend.id ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                          </button>

                          {expandedHistoryFriendId === friend.id && (
                            <div className="space-y-2 mt-2">
                              {friendHistoryChallenges.map((hc) => {
                                const won = hc.winnerId === user?.id;
                                return (
                                  <div
                                    key={hc.id}
                                    className="bg-surface/90 border border-border-subtle rounded-xl p-3 space-y-1.5 w-full max-w-full min-w-0"
                                  >
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                      <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0 max-w-full break-words">
                                        {hc.title}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          hc.isDraw
                                            ? 'bg-warning/20 text-warning'
                                            : won
                                              ? 'bg-success/20 text-success'
                                              : 'bg-surface-secondary text-muted'
                                        }`}>
                                          {hc.isDraw ? '⚡ Draw' : won ? '🏆 You Won' : `🏅 ${friend.name} Won`}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => promptDelete({
                                            title: 'Delete Duel Record?',
                                            message: 'Are you sure you want to delete this completed challenge record?',
                                            itemName: hc.title,
                                            onConfirm: async () => {
                                              await deleteChallenge(hc.id);
                                            }
                                          })}
                                          className="p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          title="Delete Duel Record"
                                          aria-label={`Delete record for ${hc.title}`}
                                        >
                                          <FiTrash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-w-0 text-xs text-muted">
                                      <span>
                                        Final: <strong className="text-foreground">{hc.myScore}</strong> vs <strong className="text-foreground">{hc.theirScore}</strong> pts
                                      </span>
                                      <span className="text-[10px]">
                                        {hc.durationDays} Days
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary-text uppercase tracking-wider">
              Incoming Invitations ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-muted italic bg-surface border border-border/70 rounded-xl p-4 text-center">
                No pending friend requests.
              </p>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-surface border border-border/70 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap min-w-0 w-full max-w-full"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-xs shrink-0">
                        {req.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-foreground block break-words [overflow-wrap:anywhere]">{req.name}</span>
                        <span className="text-[10px] text-muted">Sent {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => respondToRequest(req.id, 'accept')}
                        className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                      >
                        <FiCheck size={13} strokeWidth={3} />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToRequest(req.id, 'decline')}
                        className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-secondary text-secondary-text hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          {outgoingRequests.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <h3 className="text-xs font-bold text-secondary-text uppercase tracking-wider">
                Sent Invitations ({outgoingRequests.length})
              </h3>
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-surface border border-border/70 rounded-xl p-3 flex items-center justify-between gap-2 min-w-0 text-xs"
                  >
                    <span className="font-semibold text-foreground flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{req.name}</span>
                    <span className="text-[11px] text-muted italic shrink-0">Waiting for response</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: FIND FRIENDS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'find' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full max-w-full min-w-0">
            <div className="relative flex-1 min-w-0">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username..."
                className="w-full max-w-full min-w-0 pl-10 pr-4 py-2.5 rounded-xl border border-border/80 bg-surface text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-accent text-accent-ink text-xs font-bold uppercase tracking-wider shrink-0 hover:opacity-90 cursor-pointer"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="bg-surface border border-border/70 rounded-xl p-3.5 flex items-center justify-between gap-3 min-w-0 w-full max-w-full text-xs"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block truncate max-w-full">{user.name}</span>
                    {user.username && (
                      <span className="text-[10px] text-muted block truncate max-w-full break-words">@{user.username}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {user.relationship === 'accepted' ? (
                    <span className="text-[11px] text-success font-semibold flex items-center gap-1">
                      <FiCheck size={13} />
                      Friends
                    </span>
                  ) : user.relationship === 'pending' ? (
                    <span className="text-[11px] text-muted italic">
                      {user.isPendingSender ? 'Request sent' : 'Invited you'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border-subtle hover:border-accent text-foreground hover:text-accent font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FiUserPlus size={13} />
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            ))}
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-xs text-muted text-center py-6 break-words [overflow-wrap:anywhere]">
                No users found matching "{searchQuery}".
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* RICH FRIEND PROFILE & CHALLENGES MODAL */}
      {/* ---------------------------------------------------- */}
      {selectedFriendProfile && (() => {
        const friendId = selectedFriendProfile.id;
        const profileActive = activeChallenges.filter(c => c.opponent?.id === friendId);
        const profileHistory = historyChallenges.filter(c => c.opponent?.id === friendId);
        const wins = profileHistory.filter(c => !c.isDraw && (c.winnerId === user?.id || (c.myScore > c.theirScore))).length;
        const losses = profileHistory.filter(c => !c.isDraw && c.winnerId && c.winnerId !== user?.id && c.theirScore > c.myScore).length;
        const draws = profileHistory.filter(c => c.isDraw || c.myScore === c.theirScore).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto safe-pt safe-pb safe-px">
            <div className="bg-surface border border-border/80 rounded-2xl p-6 max-w-md w-full min-w-0 space-y-4 shadow-xl max-h-[calc(100dvh-2rem-var(--sat)-var(--sab))] overflow-y-auto custom-scrollbar my-auto">
              <div className="flex items-center justify-between gap-3 min-w-0 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-accent/20 text-accent font-bold text-base flex items-center justify-center border border-accent/40 shrink-0">
                    {selectedFriendProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground break-words">{selectedFriendProfile.name}</h3>
                    <span className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      Accountability Partner
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFriendProfile}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground cursor-pointer shrink-0"
                  title="Close"
                  aria-label="Close friend profile"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Quick Accountability Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 min-w-0">
                <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3 text-center min-w-0 break-words">
                  <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                    <FiClock size={11} />
                    Focus Time
                  </div>
                  <div className="text-base font-bold text-accent tabular-nums">
                    {selectedFriendProfile.focusHoursThisMonth}h
                  </div>
                  <span className="text-[9px] text-muted">this month</span>
                </div>

                <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3 text-center min-w-0 break-words">
                  <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                    <FiAward size={11} />
                    Challenges
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {selectedFriendProfile.allowChallenges ? 'Open' : 'Closed'}
                  </div>
                  <span className="text-[9px] text-muted">availability</span>
                </div>

                <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3 text-center min-w-0 break-words col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                    <FiTrendingUp size={11} />
                    Record
                  </div>
                  <div className="text-xs font-bold text-foreground tabular-nums">
                    {wins}W - {losses}L - {draws}D
                  </div>
                  <span className="text-[9px] text-muted">head-to-head</span>
                </div>
              </div>

              {/* Challenges directly inside Friend Profile */}
              <div className="space-y-2.5 pt-1">
                <div className="text-xs font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                  <FiTarget className="text-accent" size={13} />
                  Active Challenges With {selectedFriendProfile.name}
                </div>

                {profileActive.length > 0 ? (
                  <div className="space-y-2">
                    {profileActive.map((c) => (
                      <div
                        key={c.id}
                        className="bg-surface-secondary border border-border-subtle rounded-xl p-3 text-xs space-y-2 w-full max-w-full min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="font-bold text-foreground flex-1 min-w-0 break-words">{c.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent font-bold shrink-0 whitespace-nowrap">
                            {c.durationDays}d
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 min-w-0 text-muted text-[11px]">
                          <span>You: <strong className="text-accent font-bold">{c.myScore}</strong></span>
                          <span>{selectedFriendProfile.name}: <strong className="text-foreground font-bold">{c.theirScore}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic bg-surface-secondary/50 rounded-xl p-3 text-center border border-border-subtle">
                    No active streak challenges with {selectedFriendProfile.name}.
                  </p>
                )}
              </div>

              <div className="pt-2">
                {selectedFriendProfile.allowChallenges && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedFriendProfile.id;
                      closeFriendProfile();
                      openCreateModal(id);
                    }}
                    className="w-full py-2.5 rounded-xl bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <FiZap size={14} />
                    Start Streak Challenge
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
};
