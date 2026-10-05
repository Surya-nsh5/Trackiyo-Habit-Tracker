import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFocusStore } from '../../store/useFocusStore';
import { useChallengeStore } from '../../store/useChallengeStore';
import { useShareStore } from '../../store/useShareStore';
import api from '../../services/api';
import {
  THEME_IDS,
  THEMES,
  getThemeTokens,
  type ThemeModeSetting
} from '../../theme/themes';
import { addDaysStr, getLocalTodayStr } from '../../utils/dailyTracking';
import {
  FiLogOut, FiUser, FiMail, FiMoon, FiSun, FiMonitor, FiCheck, FiLock,
  FiEye, FiEyeOff, FiAlertCircle, FiDownload, FiUpload, FiAward,
  FiFileText, FiRefreshCw, FiBell, FiZap,
  FiChevronDown, FiChevronUp, FiShield, FiShare2, FiExternalLink, FiCopy, FiCamera, FiSettings,
  FiSmartphone
} from 'react-icons/fi';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const MODE_OPTIONS: { id: ThemeModeSetting; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <FiSun size={16} aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <FiMoon size={16} aria-hidden="true" /> },
  { id: 'system', label: 'System', icon: <FiMonitor size={16} aria-hidden="true" /> },
];

const ACHIEVEMENT_GROUPS: { id: string; title: string; ids: string[] }[] = [
  { id: 'consistency', title: 'Streaks & Consistency', ids: ['streak_3', 'habit_streak_7', 'streak_14', 'habit_streak_30', 'streak_50', 'streak_100'] },
  { id: 'tasks', title: 'Tasks & Execution', ids: ['first_task', 'task_10', 'task_50', 'century_club', 'task_500', 'inbox_zero', 'week_warrior', 'perfect_day'] },
  { id: 'focus', title: 'Focus & Deep Work', ids: ['first_focus', 'deep_worker', 'focus_60', 'focus_300', 'focus_1500', 'focus_3000'] },
  { id: 'habits', title: 'Habits & Wellness', ids: ['first_habit', 'habit_100', 'wellness_champion', 'hydration_hero'] },
  { id: 'productivity', title: 'Community & Challenges', ids: ['challenge_pro', 'share_pro'] },
];

const PlanningPreferences: React.FC = () => {
  const [energy, setEnergy] = useState({ morning: 'high', afternoon: 'medium', evening: 'low' });
  const [aiAssist, setAiAssist] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profiles');
        if (res.data?.energy_profile) setEnergy(res.data.energy_profile);
        if (res.data?.ai_assist_enabled !== undefined) setAiAssist(res.data.ai_assist_enabled);
        if (res.data?.daily_summary_enabled !== undefined) setDailySummary(res.data.daily_summary_enabled);
      } catch { }
    })();
  }, []);

  const save = async (patch: Record<string, unknown>) => {
    try {
      await api.patch('/profiles', patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch { }
  };

  const setSlot = (slot: 'morning' | 'afternoon' | 'evening', level: string) => {
    const next = { ...energy, [slot]: level };
    setEnergy(next);
    save({ energy_profile: next });
  };

  return (
    <div className="space-y-4">
      {(['morning', 'afternoon', 'evening'] as const).map(slot => (
        <div key={slot} className="flex items-center justify-between gap-3 flex-wrap min-w-0">
          <span className="text-xs font-bold text-foreground capitalize break-words">{slot}</span>
          <div className="flex items-center flex-wrap max-w-full min-w-0 shrink-0 bg-surface-secondary rounded-lg border border-border-subtle p-0.5">
            {(['low', 'medium', 'high'] as const).map(l => (
              <button key={l} onClick={() => setSlot(slot, l)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase ${energy[slot] === l ? 'bg-surface text-foreground border border-border/70' : 'text-muted hover:text-foreground'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground break-words">Enable AI Assist</p>
          <p className="text-[11px] text-muted break-words">Gates all AI planner, priority and coaching calls.</p>
        </div>
        <button onClick={() => { const v = !aiAssist; setAiAssist(v); save({ ai_assist_enabled: v }); }}
          className={`w-11 h-6 shrink-0 rounded-full border border-border-subtle relative transition-colors ${aiAssist ? 'bg-accent' : 'bg-surface-secondary'}`}>
          <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${aiAssist ? 'left-[22px]' : 'left-[2px]'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground break-words">Daily Summary</p>
          <p className="text-[11px] text-muted break-words">Nightly productivity recap (email when configured).</p>
        </div>
        <button onClick={() => { const v = !dailySummary; setDailySummary(v); save({ daily_summary_enabled: v }); }}
          className={`w-11 h-6 shrink-0 rounded-full border border-border-subtle relative transition-colors ${dailySummary ? 'bg-accent' : 'bg-surface-secondary'}`}>
          <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${dailySummary ? 'left-[22px]' : 'left-[2px]'}`} />
        </button>
      </div>
      {saved && <p className="text-[11px] text-success font-semibold">Preferences saved.</p>}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user, updateUser, updatePassword, logout } = useAuthStore();
  const { themeId, modeSetting, setThemeId, setModeSetting, isDarkMode } = useThemeStore();
  const { xp, level, achievements, checkAndUnlock, fetchGamification } = useGamificationStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { habits, habitLogs, wellnessLogs, loadData: loadHabitData } = useHabitStore();
  const { sessions } = useFocusStore();
  const { activeChallenges, pendingChallenges, historyChallenges, fetchChallenges } = useChallengeStore();
  const { openShareModal, history, fetchHistory, revokeShare } = useShareStore();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();

  const resolvedMode = isDarkMode ? 'dark' : 'light';
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Achievements section toggle state (Compact by default, opens to view more)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [selectedAchievementCategory, setSelectedAchievementCategory] = useState<string>('all');
  const achievementsSectionRef = useRef<HTMLDivElement>(null);

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    taskReminders: true,
    habitReminders: true,
    wellnessReminders: true,
    ...(user?.notification_preferences || {})
  });
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Data Portability
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Profile picture upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id) return;
    setAvatarError(null);
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2MB.');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      // Read as base64 and upload via backend (service_role bypasses storage RLS)
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
      });
      const dataBase64 = dataUrl.split(',')[1];
      if (!dataBase64) throw new Error('Could not read image.');
      const res = await api.post('/profiles/avatar', {
        fileName: file.name,
        contentType: file.type,
        dataBase64,
      });
      if (!res.data?.avatar) throw new Error('Upload failed.');
      await updateUser({ avatar: res.data.avatar });
    } catch (err: any) {
      setAvatarError(err?.response?.data?.error || err?.message || 'Upload failed. Please retry.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const todayStr = getLocalTodayStr();

  // Calculate live productivity statistics for gamification milestones and badges
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.is_completed);
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const totalFocusMinutes = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60);
    const categories: Record<string, number> = {};
    completed.forEach(t => { const cat = t.category || 'General'; categories[cat] = (categories[cat] || 0) + 1; });
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
    const completedHabitsToday = habits.filter(h => habitLogs[`${h.id}_${todayStr}`] === true).length;
    const habitRate = habits.length > 0 ? Math.round((completedHabitsToday / habits.length) * 100) : 0;
    const overdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr).length;
    const todayTasks = tasks.filter(t => t.due_date && t.due_date.slice(0, 10) === todayStr);
    const perfectDay = todayTasks.length > 0 && todayTasks.every(t => t.is_completed);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekCount = completed.filter(t => t.created_at && new Date(t.created_at).getTime() >= weekAgo).length;

    let bestStreak = 0;
    habits.forEach(h => {
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = addDaysStr(todayStr, -(i === 0 ? 0 : i));
        if (habitLogs[`${h.id}_${d}`] === true) streak++;
        else if (i === 0) continue;
        else break;
      }
      bestStreak = Math.max(bestStreak, streak);
    });

    const monthPrefix = todayStr.slice(0, 7);
    const wellnessDays = Object.keys(wellnessLogs).filter(d => d.startsWith(monthPrefix) && (wellnessLogs[d]?.mood || wellnessLogs[d]?.sleep)).length;
    const waterLoggedDays = Object.keys(wellnessLogs).filter(d => (wellnessLogs[d]?.water || 0) > 0).length;
    const completedHabitsCount = Object.values(habitLogs).filter(Boolean).length;

    const shareCount = Math.max(
      history.length,
      typeof window !== 'undefined' && localStorage.getItem('trackiyo_card_shared') === 'true' ? 1 : 0
    );
    const totalChallengesCount = activeChallenges.length + pendingChallenges.length + historyChallenges.length;

    return {
      completed: completed.length, total, completionRate, totalFocusMinutes, topCategory,
      habitRate, completedHabitsToday, overdue, perfectDay, weekCount, bestStreak,
      wellnessDays, waterLoggedDays, completedHabitsCount, shareCount, totalChallengesCount,
    };
  }, [tasks, sessions, habits, habitLogs, wellnessLogs, history, activeChallenges, pendingChallenges, historyChallenges, todayStr]);

  // Automatically check and award achievements based on live user activity
  useEffect(() => {
    const met: string[] = [];
    if (stats.completed >= 1) met.push('first_task');
    if (stats.completed >= 10) met.push('task_10');
    if (stats.completed >= 50) met.push('task_50');
    if (stats.completed >= 100) met.push('century_club');
    if (stats.completed >= 500) met.push('task_500');
    if (sessions.length >= 1) met.push('first_focus');
    if (sessions.length >= 10) met.push('deep_worker');
    if (stats.totalFocusMinutes >= 60) met.push('focus_60');
    if (stats.totalFocusMinutes >= 300) met.push('focus_300');
    if (stats.totalFocusMinutes >= 1500) met.push('focus_1500');
    if (stats.totalFocusMinutes >= 3000) met.push('focus_3000');
    if (stats.bestStreak >= 3) met.push('streak_3');
    if (stats.bestStreak >= 7) met.push('habit_streak_7');
    if (stats.bestStreak >= 14) met.push('streak_14');
    if (stats.bestStreak >= 30) met.push('habit_streak_30');
    if (stats.bestStreak >= 50) met.push('streak_50');
    if (stats.bestStreak >= 100) met.push('streak_100');
    if (stats.completedHabitsCount >= 1) met.push('first_habit');
    if (stats.completedHabitsCount >= 100) met.push('habit_100');
    if (stats.wellnessDays >= 7) met.push('wellness_champion');
    if (stats.waterLoggedDays >= 3) met.push('hydration_hero');
    if (stats.weekCount >= 5) met.push('week_warrior');
    if (stats.perfectDay) met.push('perfect_day');
    if (stats.overdue === 0 && stats.total > 0) met.push('inbox_zero');
    if (stats.shareCount >= 1) met.push('share_pro');
    if (stats.totalChallengesCount >= 1) met.push('challenge_pro');
    met.forEach(id => { void checkAndUnlock(id); });
  }, [stats, sessions.length, checkAndUnlock]);

  const progressFor = (id: string): { done: number; total: number } | null => {
    switch (id) {
      case 'first_task': return { done: Math.min(stats.completed, 1), total: 1 };
      case 'task_10': return { done: Math.min(stats.completed, 10), total: 10 };
      case 'task_50': return { done: Math.min(stats.completed, 50), total: 50 };
      case 'century_club': return { done: Math.min(stats.completed, 100), total: 100 };
      case 'task_500': return { done: Math.min(stats.completed, 500), total: 500 };
      case 'first_focus': return { done: Math.min(sessions.length, 1), total: 1 };
      case 'deep_worker': return { done: Math.min(sessions.length, 10), total: 10 };
      case 'focus_60': return { done: Math.min(stats.totalFocusMinutes, 60), total: 60 };
      case 'focus_300': return { done: Math.min(stats.totalFocusMinutes, 300), total: 300 };
      case 'focus_1500': return { done: Math.min(stats.totalFocusMinutes, 1500), total: 1500 };
      case 'focus_3000': return { done: Math.min(stats.totalFocusMinutes, 3000), total: 3000 };
      case 'streak_3': return { done: Math.min(stats.bestStreak, 3), total: 3 };
      case 'habit_streak_7': return { done: Math.min(stats.bestStreak, 7), total: 7 };
      case 'streak_14': return { done: Math.min(stats.bestStreak, 14), total: 14 };
      case 'habit_streak_30': return { done: Math.min(stats.bestStreak, 30), total: 30 };
      case 'streak_50': return { done: Math.min(stats.bestStreak, 50), total: 50 };
      case 'streak_100': return { done: Math.min(stats.bestStreak, 100), total: 100 };
      case 'first_habit': return { done: Math.min(stats.completedHabitsCount, 1), total: 1 };
      case 'habit_100': return { done: Math.min(stats.completedHabitsCount, 100), total: 100 };
      case 'wellness_champion': return { done: Math.min(stats.wellnessDays, 7), total: 7 };
      case 'hydration_hero': return { done: Math.min(stats.waterLoggedDays, 3), total: 3 };
      case 'week_warrior': return { done: Math.min(stats.weekCount, 5), total: 5 };
      case 'perfect_day': return { done: stats.perfectDay ? 1 : 0, total: 1 };
      case 'inbox_zero': return { done: stats.overdue === 0 && stats.total > 0 ? 1 : 0, total: 1 };
      case 'challenge_pro': return { done: Math.min(stats.totalChallengesCount, 1), total: 1 };
      case 'share_pro': return { done: Math.min(stats.shareCount, 1), total: 1 };
      default: return null;
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      if (user.notification_preferences) {
        setNotifPrefs({
          taskReminders: true,
          habitReminders: true,
          wellnessReminders: true,
          ...user.notification_preferences
        });
      }
    }
  }, [user]);

  useEffect(() => {
    fetchGamification();
    fetchHistory();
    fetchChallenges();
  }, [fetchGamification, fetchHistory, fetchChallenges]);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    );
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername && !/^[a-z0-9_.-]{3,20}$/.test(cleanUsername)) {
      setProfileError('Username must be 3–20 chars: letters, numbers, _ . -');
      return;
    }
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const payload: { name: string; username?: string } = { name: name.trim() };
      if (cleanUsername && cleanUsername !== (user?.username || '')) {
        payload.username = cleanUsername;
      }
      await updateUser(payload);
      setProfileSaved(true);
      const success = getThemeTokens(themeId, resolvedMode).success;
      gsap.fromTo('.gsap-save-btn',
        { scale: 0.95, backgroundColor: success, color: '#fff' },
        { scale: 1, duration: 0.8, ease: 'power2.out', clearProps: 'backgroundColor,color' }
      );
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.error || err.message || 'Failed to save profile. Please verify your connection.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess(true);
    } catch (err: any) {
      setPwError(err.message || 'Could not update password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleToggleNotif = async (key: 'taskReminders' | 'habitReminders' | 'wellnessReminders') => {
    const nextPrefs = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(nextPrefs);
    setIsSavingNotif(true);
    try {
      await updateUser({ notification_preferences: nextPrefs });
    } catch {
      console.warn('Notification preferences saved locally');
    } finally {
      setIsSavingNotif(false);
    }
  };

  // Export JSON
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/data/export/json');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trackiyo-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please verify your connection.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async (type: 'tasks' | 'habits') => {
    try {
      const res = await api.get(`/data/export/csv?type=${type}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trackiyo-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert(`Could not export ${type} CSV.`);
    }
  };

  // Import JSON Backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const payload = parsed.data ? parsed : { data: parsed };

        const res = await api.post('/data/import/json', payload);
        const { summary } = res.data;
        setImportStatus(
          `Import complete! Imported ${summary?.importedTasks || 0} tasks and ${summary?.importedHabits || 0} habits.`
        );
        fetchTasks();
        loadHabitData();
      } catch (err: any) {
        setImportError(err.response?.data?.error || err.message || 'Failed to parse or import backup file.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const nextLevelXp = Math.pow(level, 2) * 100;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
  const xpInCurrentLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpNeededForNext = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  const toggleAchievements = () => {
    setIsAchievementsOpen(prev => {
      const next = !prev;
      if (!next && achievementsSectionRef.current) {
        setTimeout(() => {
          achievementsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
      return next;
    });
  };

  return (
    <div ref={containerRef} className="h-full w-full max-w-full min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5">
      <div className="w-full max-w-full min-w-0 space-y-6 pb-20">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 flex-shrink-0 w-full max-w-full min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex items-center gap-2.5 break-words min-w-0">
              <FiSettings className="text-accent shrink-0" size={20} />
              Preferences & Settings
            </h1>
            <p className="text-xs text-secondary-text mt-0.5">
              Customize your profile, visual themes, notifications, and data backups.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* UNIFIED PROFILE & IDENTITY HERO CARD                              */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 min-w-0">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Avatar with Level Badge + upload */}
              <div className="relative shrink-0">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-border shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-accent text-accent-ink flex items-center justify-center text-2xl font-black shadow-xs">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent text-accent-ink border-2 border-surface flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 shadow-xs"
                >
                  {isUploadingAvatar ? (
                    <span className="w-4 h-4 rounded-full border-2 border-accent-ink/40 border-t-accent-ink animate-spin" />
                  ) : (
                    <FiCamera size={14} strokeWidth={2.25} />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-accent text-accent-ink text-[10px] font-black uppercase tracking-wider rounded-md border border-surface shadow-xs">
                  LVL {level}
                </span>
              </div>

              {/* Identity details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-bold text-foreground truncate max-w-full">
                    {user?.name || 'My Profile'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider hidden sm:inline-block shrink-0 whitespace-nowrap">
                    Active Member
                  </span>
                </div>
                <p className="text-xs text-secondary-text truncate max-w-full mt-0.5 break-words">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted font-medium">
                  <span className="text-foreground font-semibold tabular-nums">{stats.completed} tasks finished</span>
                  <span>•</span>
                  <span className="text-foreground font-semibold tabular-nums">{stats.totalFocusMinutes}m deep focus</span>
                  <span>•</span>
                  <span className="text-foreground font-semibold tabular-nums">{stats.bestStreak}-day best streak</span>
                </div>
                {avatarError && (
                  <p role="alert" className="text-[11px] text-error font-semibold mt-1.5">{avatarError}</p>
                )}
              </div>
            </div>

            {/* Quick XP & Level Progress */}
            <div className="w-full sm:w-56 max-w-full min-w-0 shrink-0 bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-foreground">Level {level}</span>
                <span className="text-accent font-bold tabular-nums">{xp} XP</span>
              </div>
              <div className="h-2 rounded-full bg-surface border border-border-subtle overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted">
                <span>Next Rank</span>
                <span className="tabular-nums">{Math.max(0, nextLevelXp - xp)} XP needed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* COMPACT & EXPANDABLE ACHIEVEMENTS SECTION (MERGED FROM PROFILE)    */}
        {/* ------------------------------------------------------------------ */}
        <section
          ref={achievementsSectionRef}
          className="bg-surface border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs transition-all duration-300"
        >
          {/* Section Header & Toggle Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <FiAward size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.08em] uppercase break-words">
                    Achievements & Milestones
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-accent text-accent-ink uppercase tracking-wider shrink-0 whitespace-nowrap">
                    {unlockedCount}/{achievements.length} Unlocked
                  </span>
                </div>
                <p className="text-xs text-secondary-text mt-0.5">
                  Badges automatically unlock as you build habits, complete tasks, and focus.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              {/* View More / Close Button */}
              <button
                type="button"
                onClick={toggleAchievements}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isAchievementsOpen
                    ? 'bg-surface-secondary border border-border/90 text-foreground hover:bg-surface-hover'
                    : 'bg-accent text-accent-ink hover:brightness-110 active:scale-95 shadow-xs'
                  }`}
                aria-expanded={isAchievementsOpen}
              >
                <span>{isAchievementsOpen ? 'View Less' : 'View All'}</span>
                {isAchievementsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </button>
            </div>
          </div>

          {isAchievementsOpen && (
            <div className="pt-4 space-y-6 animate-fadeIn">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0 p-1 bg-surface-secondary/60 rounded-xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedAchievementCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedAchievementCategory === 'all'
                      ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                      : 'text-muted hover:text-foreground'
                    }`}
                >
                  All ({achievements.length})
                </button>
                {ACHIEVEMENT_GROUPS.map((g) => {
                  const count = achievements.filter(a => a.category === g.id || g.ids.includes(a.id)).length;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedAchievementCategory(g.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedAchievementCategory === g.id
                          ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                          : 'text-muted hover:text-foreground'
                        }`}
                    >
                      {g.title} ({count})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedAchievementCategory('unlocked')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedAchievementCategory === 'unlocked'
                      ? 'bg-surface text-foreground border border-border/80 shadow-xs'
                      : 'text-muted hover:text-foreground'
                    }`}
                >
                  Unlocked ({unlockedCount})
                </button>
              </div>

              {/* Render Categories */}
              {ACHIEVEMENT_GROUPS.filter(g =>
                selectedAchievementCategory === 'all' ||
                selectedAchievementCategory === g.id ||
                selectedAchievementCategory === 'unlocked'
              ).map((group) => {
                const groupItems = achievements.filter(a => a.category === group.id || group.ids.includes(a.id));
                let items = groupItems;
                if (selectedAchievementCategory === 'unlocked') {
                  items = items.filter(a => a.unlocked);
                }
                if (items.length === 0) return null;

                // Sort: Unlocked first
                const sorted = [...items].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-secondary-text uppercase tracking-[0.14em]">
                        {group.title}
                      </h3>
                      <span className="text-[11px] text-muted font-semibold">
                        {items.filter(i => i.unlocked).length}/{items.length} completed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
                      {sorted.map((ach) => {
                        const prog = progressFor(ach.id);
                        return (
                          <div
                            key={ach.id}
                            className={`p-4 rounded-xl border transition-all min-w-0 max-w-full ${ach.unlocked
                                ? 'bg-accent/5 border-accent/40 shadow-xs'
                                : 'bg-surface-secondary/40 border-border-subtle opacity-80'
                              }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span
                                className={`text-2xl select-none p-1.5 rounded-lg bg-surface border shrink-0 ${ach.unlocked ? 'border-accent/40' : 'border-border-subtle grayscale opacity-60'
                                  }`}
                                role="img"
                                aria-label={ach.title}
                              >
                                {ach.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0 max-w-full">
                                    {ach.title}
                                  </span>
                                  {ach.unlocked ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                                        <FiCheck size={12} strokeWidth={3} />
                                        <span>Earned</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openShareModal({
                                          type: 'achievement',
                                          title: ach.title,
                                          subtitle: ach.description,
                                          description: ach.description,
                                          metricValue: `+${ach.xp || 50} XP EARNED`,
                                          metricLabel: 'Achievement Unlocked',
                                          tier: (ach.tier as any) || 'bronze',
                                          icon: ach.icon || '🏆',
                                          achievementId: ach.id,
                                          xp: ach.xp,
                                          format: 'square',
                                        })}
                                        className="p-1 rounded-md text-muted hover:text-accent hover:bg-surface border border-transparent hover:border-border-subtle transition-colors cursor-pointer"
                                        title="Share Achievement Card"
                                        aria-label={`Share ${ach.title} achievement`}
                                      >
                                        <FiShare2 size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-muted shrink-0 flex items-center gap-1">
                                      {ach.tier && (
                                        <span className="uppercase text-[9px] px-1 py-0.2 rounded border border-border-subtle text-muted">
                                          {ach.tier}
                                        </span>
                                      )}
                                      <span>+{ach.xp || 50} XP</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-secondary-text mt-1 leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]">
                                  {ach.description}
                                </p>
                              </div>
                            </div>

                            {/* Progress bar if still locked and measurable */}
                            {!ach.unlocked && prog && (
                              <div className="mt-3 pt-2 border-t border-border-subtle/50">
                                <div className="flex justify-between text-[10px] font-semibold text-muted mb-1">
                                  <span>Progress</span>
                                  <span className="tabular-nums text-foreground">{prog.done} / {prog.total}</span>
                                </div>
                                <div className="h-1.5 bg-surface border border-border-subtle rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent rounded-full transition-all"
                                    style={{ width: `${Math.round((prog.done / prog.total) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Close View Action */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={toggleAchievements}
                  className="px-6 py-2.5 rounded-xl border border-border/80 bg-surface text-xs font-bold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-2 shadow-xs"
                >
                  <FiChevronUp size={15} />
                  <span>Close Achievements View</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PROFILE DETAILS & SECURITY (SIDE-BY-SIDE ON DESKTOP)               */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start min-w-0">
          {/* Profile Section */}
          <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
            <h2 className="text-base font-bold text-foreground tracking-[0.12em] uppercase mb-5 flex items-center gap-2">
              <FiUser className="text-accent" size={18} />
              <span>PROFILE SETTINGS</span>
            </h2>
            <form onSubmit={handleSave} className="w-full space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">FULL NAME</label>
                <div className="flex items-center bg-surface-secondary border border-border-subtle rounded-lg px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200 min-w-0">
                  <FiUser className="text-muted mr-3 shrink-0" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent w-full max-w-full min-w-0 h-full text-foreground text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">USERNAME</label>
                <div className="flex items-center bg-surface-secondary border border-border-subtle rounded-lg px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200 min-w-0">
                  <span className="text-muted mr-1 text-sm font-bold select-none shrink-0">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder={user?.username || 'pick-a-username'}
                    maxLength={20}
                    className="bg-transparent w-full max-w-full min-w-0 h-full text-foreground text-sm focus:outline-none placeholder:text-muted/60"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted tracking-[0.08em]">3–20 chars: letters, numbers, _ . - Friends find you by this.</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">EMAIL ADDRESS</label>
                <div className="flex items-center bg-surface-secondary/50 border border-border-subtle rounded-lg px-4 h-12 min-h-[44px] opacity-70 cursor-not-allowed select-none">
                  <FiMail className="text-muted mr-3 shrink-0" size={18} />
                  <span className="text-secondary-text text-sm truncate flex-1">{user?.email}</span>
                  <FiLock className="text-muted shrink-0 ml-2" size={14} />
                </div>
                <p className="mt-1 text-[10px] text-muted tracking-[0.08em]">Email address is managed by your authentication provider.</p>
              </div>

              {profileError && (
                <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/20 text-error text-xs p-3 rounded-lg">
                  <FiAlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
                  <p>{profileError}</p>
                </div>
              )}
              {profileSaved && (
                <div role="status" className="flex items-start gap-2 bg-success/10 border border-success/20 text-success text-xs p-3 rounded-lg">
                  <FiCheck size={16} className="shrink-0 mt-px" aria-hidden="true" />
                  <p>Profile saved to cloud.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="gsap-save-btn w-full md:w-auto px-8 h-12 min-h-[44px] bg-accent text-accent-ink font-bold text-xs tracking-[0.14em] rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={14} />
                    <span>SAVING...</span>
                  </>
                ) : profileSaved ? (
                  <>
                    <FiCheck size={14} />
                    <span>SAVED</span>
                  </>
                ) : (
                  <span>SAVE PROFILE</span>
                )}
              </button>
            </form>
          </section>

          {/* Security: update password */}
          <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
            <h2 className="text-base font-bold text-foreground tracking-[0.12em] uppercase mb-5 flex items-center gap-2">
              <FiShield className="text-accent" size={18} />
              <span>SECURITY & PASSWORD</span>
            </h2>
            <form onSubmit={handlePasswordUpdate} className="w-full space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">NEW PASSWORD</label>
                <div className="flex items-center bg-surface-secondary border border-border-subtle rounded-lg px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200">
                  <FiLock className="text-muted mr-3 shrink-0" size={18} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPwError(null); setPwSuccess(false); }}
                    placeholder="Minimum 6 characters"
                    className="bg-transparent w-full max-w-full min-w-0 h-full text-foreground text-sm focus:outline-none placeholder:text-muted/70"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-muted hover:text-foreground transition-colors duration-200 p-2 shrink-0 ml-1"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">CONFIRM PASSWORD</label>
                <div className="flex items-center bg-surface-secondary border border-border-subtle rounded-lg px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200">
                  <FiLock className="text-muted mr-3 shrink-0" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPwError(null); setPwSuccess(false); }}
                    placeholder="Repeat new password"
                    className="bg-transparent w-full max-w-full min-w-0 h-full text-foreground text-sm focus:outline-none placeholder:text-muted/70"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted hover:text-foreground transition-colors duration-200 p-2 shrink-0 ml-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {pwError && (
                <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/20 text-error text-xs p-3 rounded-lg">
                  <FiAlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
                  <p>{pwError}</p>
                </div>
              )}
              {pwSuccess && (
                <div role="status" className="flex items-start gap-2 bg-success/10 border border-success/20 text-success text-xs p-3 rounded-lg">
                  <FiCheck size={16} className="shrink-0 mt-px" aria-hidden="true" />
                  <p>Password updated successfully.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full md:w-auto px-8 h-12 min-h-[44px] bg-accent text-accent-ink font-bold text-xs tracking-[0.14em] rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {pwLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          </section>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* NOTIFICATION PREFERENCES                                           */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap min-w-0 mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FiBell className="text-accent shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words">NOTIFICATION PREFERENCES</h2>
                <p className="text-xs text-secondary-text break-words">Configure alerts for deadlines, habits, daily reflections, and reviews.</p>
              </div>
            </div>
            {isSavingNotif && (
              <span className="text-[11px] text-accent flex items-center gap-1">
                <FiRefreshCw className="animate-spin" size={12} />
                Saving...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 min-w-0">
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3.5 flex items-center justify-between gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-foreground break-words">Task Reminders</h3>
                <p className="text-[11px] text-secondary-text break-words">Alerts for overdue tasks and upcoming deadlines</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={notifPrefs.taskReminders ?? true}
                  onChange={() => handleToggleNotif('taskReminders')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted peer-checked:after:bg-accent-ink after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
              </label>
            </div>

            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3.5 flex items-center justify-between gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-foreground break-words">Habit Alerts</h3>
                <p className="text-[11px] text-secondary-text break-words">Reminders for uncompleted daily habits</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={notifPrefs.habitReminders ?? true}
                  onChange={() => handleToggleNotif('habitReminders')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted peer-checked:after:bg-accent-ink after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
              </label>
            </div>

            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-3.5 flex items-center justify-between gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-foreground break-words">Wellness Check-ins</h3>
                <p className="text-[11px] text-secondary-text break-words">Daily prompt to record mood, energy, and sleep</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={notifPrefs.wellnessReminders ?? true}
                  onChange={() => handleToggleNotif('wellnessReminders')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted peer-checked:after:bg-accent-ink after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
              </label>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ENERGY PROFILE, AI ASSIST & DAILY SUMMARY                          */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <FiZap className="text-accent shrink-0" size={20} />
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words flex-1 min-w-0">ENERGY, AI & DAILY SUMMARY</h2>
          </div>
          <p className="text-xs text-secondary-text mb-6">
            Tell Trackiyo when your energy peaks so the AI planner schedules hard tasks at the right time.
          </p>
          <PlanningPreferences />
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* STREAKS & PROGRESS SHARING CONTROLS                                */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap min-w-0 mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FiShare2 className="text-accent shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words">STREAKS & PROGRESS SHARING</h2>
                <p className="text-xs text-secondary-text break-words">Manage your streak rules, grace days, and active public progress share links.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchHistory()}
              aria-label="Refresh share history"
              className="p-1.5 rounded-lg border border-border-subtle bg-surface-secondary text-muted hover:text-accent hover:border-accent/40 transition-colors shrink-0"
              title="Refresh share history"
            >
              <FiRefreshCw size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 min-w-0">
            {/* Grace Day Information */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🛡️</span>
                <h3 className="text-xs font-bold text-foreground">Grace Day Policy</h3>
              </div>
              <p className="text-[11px] text-secondary-text leading-relaxed">
                Life happens. Trackiyo gives you 1 Grace Day per streak to preserve your hard-earned progress if you miss an unexpected day. Grace days must be explicitly applied from the streak calendar and cannot be used back-to-back.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px]">
                <span className="text-muted font-medium">Streak Protection</span>
                <span className="font-bold text-accent">1 Available / Streak</span>
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words">
              <div className="flex items-center gap-2 mb-2">
                <FiShield className="text-accent" size={16} />
                <h3 className="text-xs font-bold text-foreground">Privacy by Default</h3>
              </div>
              <p className="text-[11px] text-secondary-text leading-relaxed">
                All activities remain strictly private. Public share links use cryptographically random tokens, contain no personal task notes or journal entries, and can be revoked at any moment below.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px]">
                <span className="text-muted font-medium">Data Exposure</span>
                <span className="font-bold text-success">Zero Private Data</span>
              </div>
            </div>
          </div>

          {/* Active Public Shares History */}
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Your Public Share Links ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted italic">
                No public links created yet. Click "Share Progress" on any streak or achievement to generate one.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => {
                  const shareUrl = `${window.location.origin}/#/share/${item.token}`;
                  return (
                    <div
                      key={item.id || item.token}
                      className="bg-surface-secondary border border-border-subtle rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs w-full max-w-full min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="font-bold text-foreground truncate flex-1 min-w-0 max-w-full break-words">{item.title}</span>
                          {item.is_revoked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 shrink-0 whitespace-nowrap">
                              Revoked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20 shrink-0 whitespace-nowrap">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2 flex-wrap mt-0.5 min-w-0">
                          <span>{item.views_count ?? 0} views</span>
                          <span>•</span>
                          <span>Created {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap max-w-full">
                        {!item.is_revoked && (
                          <>
                            <a
                              href={`/#/share/${item.token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface text-secondary-text hover:text-foreground text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <FiExternalLink size={12} />
                              <span>View</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface text-secondary-text hover:text-foreground text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                              title="Copy Public Link"
                            >
                              <FiCopy size={12} />
                              <span>Copy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => revokeShare(item.token)}
                              className="px-2.5 py-1.5 rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 text-[11px] font-semibold transition-colors"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DATA PORTABILITY & BACKUP                                          */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <FiDownload className="text-accent shrink-0" size={20} />
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words flex-1 min-w-0">DATA PORTABILITY & BACKUP</h2>
          </div>
          <p className="text-xs text-secondary-text mb-6">
            You own your data. Export your entire life database as clean JSON or CSV files, or restore from an existing backup without duplicates.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 min-w-0">
            {/* Export Card */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2 mb-1">
                  <FiFileText className="text-accent" size={16} />
                  Export Data
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Download a complete JSON snapshot (tasks, habits, wellness, focus, journal) or tabular CSVs.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={isExporting}
                  className="w-full h-11 px-4 bg-accent text-accent-ink font-bold text-xs tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <FiDownload size={15} />
                  <span>{isExporting ? 'GENERATING SNAPSHOT...' : 'EXPORT FULL BACKUP (JSON)'}</span>
                </button>
                <div className="grid grid-cols-2 gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleExportCSV('tasks')}
                    className="h-10 px-3 min-w-0 bg-surface border border-border-subtle text-foreground font-semibold text-xs rounded-lg hover:border-border transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FiDownload size={13} />
                    <span>Tasks CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCSV('habits')}
                    className="h-10 px-3 min-w-0 bg-surface border border-border-subtle text-foreground font-semibold text-xs rounded-lg hover:border-border transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FiDownload size={13} />
                    <span>Habits CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Import Card */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2 mb-1">
                  <FiUpload className="text-accent" size={16} />
                  Restore / Import Backup
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Restore tasks, habits, and goals from a JSON export. Duplicate titles/names are safely skipped automatically.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full h-11 px-4 bg-surface border border-border-subtle text-foreground hover:border-border font-bold text-xs tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isImporting ? <FiRefreshCw className="animate-spin" size={15} /> : <FiUpload size={15} />}
                  <span>{isImporting ? 'IMPORTING DATA...' : 'SELECT BACKUP FILE (.JSON)'}</span>
                </button>
                <p className="text-[10px] text-muted text-center">Supported formats: Trackiyo v1 & v2 JSON exports</p>
              </div>
            </div>
          </div>

          {importStatus && (
            <div role="status" className="flex items-start gap-2 bg-success/10 border border-success/20 text-success text-xs p-3.5 rounded-lg mb-4">
              <FiCheck size={16} className="shrink-0 mt-0.5" />
              <p>{importStatus}</p>
            </div>
          )}
          {importError && (
            <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/20 text-error text-xs p-3.5 rounded-lg mb-4">
              <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{importError}</p>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* APPEARANCE & THEME PRESETS                                         */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words">APPEARANCE & THEME</h2>
              <p className="text-xs text-secondary-text mt-0.5 break-words">
                Configure your appearance rendering and select from 8 centralized Trackiyo theme presets.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider shrink-0 self-start sm:self-auto">
              8 Themes
            </span>
          </div>

          {/* Color Mode Radiogroup */}
          <div className="mb-6">
            <p className="block text-[11px] font-semibold text-secondary-text mb-2 tracking-[0.14em]">APPEARANCE</p>
            <div
              role="radiogroup"
              aria-label="Appearance mode"
              className="grid grid-cols-3 gap-1 p-1 bg-surface-secondary border border-border-subtle rounded-lg max-w-md w-full min-w-0"
            >
              {MODE_OPTIONS.map((m) => {
                const active = modeSetting === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setModeSetting(m.id)}
                    className={`min-h-[42px] min-w-0 px-1 flex items-center justify-center gap-2 rounded-md text-[11px] font-semibold tracking-[0.12em] uppercase transition-all duration-200 cursor-pointer ${active
                        ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs'
                        : 'text-secondary-text hover:text-foreground hover:bg-surface-hover/50'
                      }`}
                  >
                    {m.icon}
                    <span className="truncate min-w-0">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8 Themes Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-secondary-text tracking-[0.14em] uppercase">
                THEME PRESET
              </p>
              <span className="text-[11px] text-muted">
                Previewing in <span className="font-semibold text-foreground capitalize">{resolvedMode}</span> mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
              {THEME_IDS.map((id) => {
                const themeDef = THEMES[id];
                const tok = getThemeTokens(id, resolvedMode);
                const active = id === themeId;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    aria-pressed={active}
                    aria-label={`${themeDef.label} theme`}
                    title={themeDef.blurb}
                    className={`group flex flex-col gap-3 min-w-0 max-w-full w-full p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${active
                        ? 'border-primary bg-surface-secondary/70 shadow-xs ring-1 ring-primary/40'
                        : 'border-border-subtle bg-surface hover:border-border hover:bg-surface-secondary/30'
                      }`}
                  >
                    {/* Header: Selected Indicator + Theme Name */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border transition-all ${active
                              ? 'border-primary bg-primary'
                              : 'border-muted/60 bg-transparent group-hover:border-foreground/60'
                            }`}
                        >
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-ink" />
                          )}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${active ? 'text-primary' : 'text-foreground'
                            }`}
                        >
                          {themeDef.label}
                        </span>
                      </div>
                      {id === 'monochrome' && !active && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted px-1.5 py-0.5 rounded border border-border-subtle">
                          Default
                        </span>
                      )}
                      {active && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Preview Swatches: Background, Surface, Accent */}
                    <div className="grid grid-cols-3 gap-1.5 min-w-0 p-1 rounded-lg bg-surface border border-border-subtle">
                      {/* Small background preview */}
                      <div
                        className="h-7 rounded border border-border/60 flex items-center justify-center transition-colors"
                        style={{ backgroundColor: tok.background }}
                        title={`Background: ${tok.background}`}
                      >
                        <span
                          className="text-[8px] font-mono font-medium opacity-60 select-none"
                          style={{ color: tok.textSecondary }}
                        >
                          Bg
                        </span>
                      </div>

                      {/* Surface preview */}
                      <div
                        className="h-7 rounded border border-border/60 flex items-center justify-center transition-colors"
                        style={{ backgroundColor: tok.surface }}
                        title={`Surface: ${tok.surface}`}
                      >
                        <span
                          className="text-[8px] font-mono font-medium opacity-60 select-none"
                          style={{ color: tok.textSecondary }}
                        >
                          Sur
                        </span>
                      </div>

                      {/* Accent preview with dot indicator */}
                      <div
                        className="h-7 rounded border border-border/60 flex items-center justify-center relative shadow-2xs transition-colors"
                        style={{ backgroundColor: tok.primary }}
                        title={`Accent: ${tok.primary}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tok.primaryInk }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DESKTOP APP (WINDOWS PWA) & MOBILE                                  */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <FiMonitor className="text-accent shrink-0" size={20} />
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase break-words flex-1 min-w-0">
              DESKTOP & MOBILE APPS
            </h2>
          </div>
          <p className="text-xs text-secondary-text mb-6">
            Install Trackiyo as a native desktop application on Windows or download the Android mobile app.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            {/* Windows Desktop PWA Card */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                    <FiMonitor className="text-accent" size={16} />
                    Windows Desktop App (PWA)
                  </h3>
                  {isInstalled && (
                    <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded border border-success/20">
                      <FiCheck size={12} /> INSTALLED
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Pin Trackiyo to your Windows Taskbar and Start Menu. Enjoy a distraction-free window, taskbar jump lists, and instant offline launch.
                </p>
              </div>

              <div>
                {isInstalled ? (
                  <div className="h-10 px-4 bg-success/10 border border-success/25 text-success font-semibold text-xs rounded-lg flex items-center justify-center gap-2">
                    <FiCheck size={14} />
                    <span>Running as Desktop App</span>
                  </div>
                ) : canInstall ? (
                  <button
                    type="button"
                    onClick={() => promptInstall()}
                    className="w-full h-10 px-4 bg-accent text-accent-ink font-bold text-xs tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition-all"
                  >
                    <FiDownload size={14} />
                    <span>INSTALL FOR WINDOWS</span>
                  </button>
                ) : (
                  <div className="h-10 px-3 bg-surface border border-border-subtle text-secondary-text text-xs rounded-lg flex items-center justify-center text-center">
                    <span>Edge / Chrome: Click <strong>Install App (⊕)</strong> in address bar</span>
                  </div>
                )}
              </div>
            </div>

            {/* Android Mobile App Card */}
            <div className="bg-surface-secondary border border-border-subtle rounded-xl p-4 min-w-0 break-words flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2 mb-1">
                  <FiSmartphone className="text-accent" size={16} />
                  Android Native App
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Direct APK download featuring hardware-backed Keystore security, persistent session, and automatic live web updates.
                </p>
              </div>

              <a
                href="/downloads/trackiyo-v1.0.0.apk"
                download
                className="w-full h-10 px-4 bg-surface border border-border text-foreground font-bold text-xs tracking-wider rounded-lg flex items-center justify-center gap-2 hover:bg-surface-hover active:scale-[0.99] transition-all"
              >
                <FiDownload size={14} />
                <span>DOWNLOAD ANDROID APK</span>
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DANGER ZONE: LOG OUT                                               */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-surface border border-border/80 rounded-xl p-5 md:p-6 shadow-xs w-full max-w-full min-w-0">
          <h2 className="text-base md:text-lg font-bold text-foreground tracking-[0.12em] uppercase mb-4">ACCOUNT ACTIONS</h2>
          <button
            type="button"
            onClick={logout}
            className="w-full md:w-auto px-8 h-12 min-h-[44px] flex items-center justify-center gap-3 text-error border border-error/30 font-bold text-xs tracking-[0.14em] rounded-lg hover:bg-error/10 hover:border-error/50 transition-colors duration-200 active:scale-[0.98]"
          >
            <FiLogOut size={18} />
            LOG OUT OF TRACKIYO
          </button>
        </section>

      </div>
    </div>
  );
};

export default SettingsPage;
