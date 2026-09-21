import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { THEME_IDS, getThemeTokens, type ThemeModeSetting } from '../theme/themes';
import { FiLogOut, FiUser, FiMail, FiMoon, FiSun, FiMonitor, FiCheck, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

const MODE_OPTIONS: { id: ThemeModeSetting; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <FiSun size={16} aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <FiMoon size={16} aria-hidden="true" /> },
  { id: 'system', label: 'System', icon: <FiMonitor size={16} aria-hidden="true" /> },
];

export const SettingsPage: React.FC = () => {
  const { user, updateUser, updatePassword, logout } = useAuthStore();
  const { themeId, modeSetting, setThemeId, setModeSetting, isDarkMode } = useThemeStore();
  const resolvedMode = isDarkMode ? 'dark' : 'light';
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, []);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name }); // email is locked — never updated
    // Show a small success animation on the button (theme-aware, transient)
    const success = getThemeTokens(themeId, resolvedMode).success;
    gsap.fromTo('.gsap-save-btn', 
      { scale: 0.95, backgroundColor: success, color: '#fff' }, 
      { scale: 1, duration: 0.8, ease: 'power2.out', clearProps: 'backgroundColor,color' }
    );
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

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar">
      
      {/* Header Removed */}

      <div className="max-w-5xl w-full mx-auto space-y-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Profile Section */}
        <section>
          <h2 className="text-xl font-bold text-foreground tracking-[0.12em] mb-6">PROFILE</h2>
          
          {/* Profile Form */}
          <form onSubmit={handleSave} className="w-full space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-2 tracking-[0.14em]">FULL NAME</label>
                <div className="flex items-center bg-elevated border border-border/70 rounded px-4 h-14 min-h-[44px] focus-within:border-accent transition-colors duration-200">
                  <FiUser className="text-muted mr-4" size={20} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent w-full h-full text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-2 tracking-[0.14em]">EMAIL ADDRESS</label>
                <div className="flex items-center bg-elevated border border-border/40 rounded px-4 h-14 min-h-[44px] opacity-60 cursor-not-allowed select-none">
                  <FiMail className="text-muted mr-4 shrink-0" size={20} />
                  <span className="text-muted text-sm truncate flex-1">{user?.email}</span>
                  <FiLock className="text-muted shrink-0 ml-2" size={14} />
                </div>
                <p className="mt-1.5 text-[10px] text-muted tracking-[0.08em]">Email address cannot be changed.</p>
              </div>
              
              <button 
                type="submit"
                className="gsap-save-btn w-full md:w-auto px-10 h-14 min-h-[44px] bg-accent text-accent-ink font-bold text-xs tracking-[0.14em] rounded hover:brightness-110 transition-colors duration-200 active:scale-[0.98]"
              >
                SAVE PROFILE
              </button>
            </form>
        </section>

        {/* Security: update password */}
        <section>
          <h2 className="text-xl font-bold text-foreground tracking-[0.12em] mb-6">SECURITY</h2>

          <form onSubmit={handlePasswordUpdate} className="w-full space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-2 tracking-[0.14em]">NEW PASSWORD</label>
              <div className="flex items-center bg-elevated border border-border/70 rounded px-4 h-14 min-h-[44px] focus-within:border-accent transition-colors duration-200">
                <FiLock className="text-muted mr-4 shrink-0" size={20} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwError(null); setPwSuccess(false); }}
                  placeholder="Minimum 6 characters"
                  className="bg-transparent w-full h-full text-foreground focus:outline-none placeholder:text-muted"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-muted hover:text-foreground transition-colors duration-200 focus:outline-none p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-1"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-2 tracking-[0.14em]">CONFIRM PASSWORD</label>
              <div className="flex items-center bg-elevated border border-border/70 rounded px-4 h-14 min-h-[44px] focus-within:border-accent transition-colors duration-200">
                <FiLock className="text-muted mr-4 shrink-0" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPwError(null); setPwSuccess(false); }}
                  placeholder="Repeat new password"
                  className="bg-transparent w-full h-full text-foreground focus:outline-none placeholder:text-muted"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-muted hover:text-foreground transition-colors duration-200 focus:outline-none p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-1"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {pwError && (
              <div role="alert" className="flex items-start gap-2 bg-error/10 border border-error/20 text-error text-xs p-3 rounded flex transition-colors duration-200">
                <FiAlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
                <p>{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div role="status" className="flex items-start gap-2 bg-success/10 border border-success/20 text-success text-xs p-3 rounded flex transition-colors duration-200">
                <FiCheck size={16} className="shrink-0 mt-px" aria-hidden="true" />
                <p>Password updated successfully.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full md:w-auto px-10 h-14 min-h-[44px] bg-accent text-accent-ink font-bold text-xs tracking-[0.14em] rounded hover:brightness-110 transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {pwLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        </section>
        </div>

        <hr className="border-border/60" />

        {/* Appearance: theme + mode */}
        <section>
          <h2 className="text-xl font-bold text-foreground tracking-[0.12em] mb-6">APPEARANCE</h2>

          <p className="block text-[11px] font-semibold text-muted mb-2 tracking-[0.14em]">MODE</p>
          <div
            role="radiogroup"
            aria-label="Appearance mode"
            className="grid grid-cols-3 gap-1 p-1 mb-6 bg-elevated border border-border/60 rounded"
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
                  className={`min-h-[44px] flex items-center justify-center gap-2 rounded-sm text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors duration-200 ${
                    active
                      ? 'bg-accent text-accent-ink'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {m.icon}
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted tracking-[0.14em]">THEME</p>
            <p className="text-[11px] text-muted tracking-[0.04em]">
              Previewing in {resolvedMode === 'dark' ? 'Dark' : 'Light'} mode
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {THEME_IDS.map((id) => {
              const tok = getThemeTokens(id, resolvedMode);
              const active = id === themeId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeId(id)}
                  aria-pressed={active}
                  aria-label={`${id} theme`}
                  title={id.charAt(0).toUpperCase() + id.slice(1)}
                  className={`flex flex-col gap-2 p-2.5 rounded border text-left transition-colors duration-200 min-h-[44px] ${
                    active
                      ? 'border-accent bg-accent/10'
                      : 'border-border/60 hover:border-muted'
                  }`}
                >
                  <span
                    className="flex h-8 rounded-sm overflow-hidden border border-border/60"
                    aria-hidden="true"
                  >
                    <span className="flex-1" style={{ background: tok.bg }} />
                    <span className="flex-1" style={{ background: tok.surface }} />
                    <span className="flex-1" style={{ background: tok.accent }} />
                    <span className="flex-1" style={{ background: tok.fg }} />
                  </span>
                  <span className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-semibold tracking-[0.1em] uppercase ${active ? 'text-accent' : 'text-muted'}`}>
                      {id}
                    </span>
                    {active && (
                      <FiCheck size={14} strokeWidth={3} aria-hidden="true" className="text-accent shrink-0" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <hr className="border-border/60" />

        {/* Danger Zone */}
        <section className="pb-8">
          <button 
            type="button"
            onClick={logout}
            className="w-full md:w-auto px-10 h-14 min-h-[44px] flex items-center justify-center gap-3 text-error border border-error/30 font-bold text-xs tracking-[0.14em] rounded hover:bg-error/10 hover:border-error/50 transition-colors duration-200 active:scale-[0.98]"
          >
            <FiLogOut size={18} />
            LOG OUT OF TRACKIYO
          </button>
        </section>

      </div>
    </div>
  );
};
