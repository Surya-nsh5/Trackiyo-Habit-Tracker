import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FiMail, FiLock, FiUser, FiArrowRight, FiAlertCircle, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { TrackiyoLogo } from '../layout/TrackiyoLogo';
import { getFriendlyErrorMessage } from '../../utils/apiError';

export const AuthScreen: React.FC<{ modal?: boolean }> = ({ modal = false }) => {
  const { initialAuthMode, login, signup, resetOnboarding } = useAuthStore();
  const [isLogin, setIsLogin] = useState(initialAuthMode === 'login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isMounted = useRef(false);

  useGSAP(() => {
    // Initial entrance animation
    const tl = gsap.timeline();
    tl.fromTo('.gsap-auth-box', 
      { y: 40, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, ease: 'expo.out' }
    )
    .fromTo('.gsap-auth-stagger', 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }, 
      '-=0.6'
    );
  }, { scope: containerRef });

  // Animate form elements when switching between login and signup
  useGSAP(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    gsap.fromTo('.gsap-auth-stagger', 
      { y: 10, opacity: 0 }, 
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power2.out', overwrite: 'auto' }
    );
  }, { dependencies: [isLogin], scope: formRef });

  const validate = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }
    if (!isLogin && !name.trim()) {
      return 'Please enter your full name.';
    }
    if (!password) {
      return 'Please enter your password.';
    }
    if (!isLogin && password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        await login(email.trim().toLowerCase(), password, rememberMe);
      } else {
        await signup(name.trim(), email.trim().toLowerCase(), password, rememberMe);
      }
    } catch (err: unknown) {
      const fallback = isLogin
        ? 'Incorrect email or password. Please try again.'
        : 'Unable to create account. Please verify your details.';
      setError(getFriendlyErrorMessage(err, fallback));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        modal
          ? 'relative w-full max-w-[min(420px,calc(100vw-2rem))] min-w-0 font-sans'
          : 'h-dvh w-full max-w-full box-border bg-background flex items-center justify-center p-4 sm:p-6 pt-[max(1rem,var(--sat))] pb-[max(1rem,var(--sab))] text-muted font-sans transition-colors duration-200'
      }
    >

      {/* Abstract Background Elements (full page only; the modal has its own backdrop) */}
      {!modal && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-accent/[0.06] blur-[120px] rounded-full transition-colors duration-200"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-accent/[0.04] blur-[100px] rounded-full transition-colors duration-200"></div>
      </div>
      )}

      <div className="gsap-auth-box will-change-transform w-full max-w-[min(420px,calc(100vw-2rem))] box-border bg-surface rounded-md border border-border/70 p-6 sm:p-8 relative z-10 flex flex-col items-center transition-colors duration-200 min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        
        {/* Back Button */}
        <button 
          type="button"
          onClick={resetOnboarding}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-elevated text-muted hover:text-accent transition-colors duration-200"
          title={modal ? 'Close' : 'Back to Landing Page'}
        >
          <FiArrowLeft size={18} />
        </button>

        {/* Logo */}
        <TrackiyoLogo size={56} variant="gradient" className="mb-8" />

        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-[0.08em] mb-2 text-center uppercase transition-colors duration-200 text-balance break-words max-w-full">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-sm text-muted mb-6 text-center tracking-[0.02em] transition-colors duration-200 text-pretty break-words max-w-full">
          {isLogin ? 'Enter your details to access your dashboard.' : 'Start tracking your habits beautifully.'}
        </p>

        {error && (
          <div className="w-full max-w-full box-border bg-error/10 border border-error/20 text-error text-xs p-3 rounded mb-6 flex items-start gap-2 transition-colors duration-200 min-w-0">
            <FiAlertCircle className="flex-shrink-0 mt-0.5" />
            <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{error}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {!isLogin && (
            <div className="gsap-auth-stagger flex items-center bg-elevated border border-border/70 rounded px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200 min-w-0 max-w-full box-border">
              <FiUser className="text-muted mr-3 shrink-0" size={18} />
              <input 
                type="text" 
                placeholder="Full Name" 
                aria-label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="bg-transparent w-full max-w-full min-w-0 box-border h-full text-sm text-foreground focus:outline-none placeholder:text-muted"
              />
            </div>
          )}

          <div className="gsap-auth-stagger flex items-center bg-elevated border border-border/70 rounded px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200 min-w-0 max-w-full box-border">
            <FiMail className="text-muted mr-3 shrink-0" size={18} />
            <input 
              type="email" 
              placeholder="Email Address"
              aria-label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="bg-transparent w-full max-w-full min-w-0 box-border h-full text-sm text-foreground focus:outline-none placeholder:text-muted"
            />
          </div>

          <div className="gsap-auth-stagger flex items-center bg-elevated border border-border/70 rounded px-4 h-12 min-h-[44px] focus-within:border-accent transition-colors duration-200 mb-4 min-w-0 max-w-full box-border">
            <FiLock className="text-muted mr-3 shrink-0" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="bg-transparent w-full max-w-full min-w-0 box-border h-full text-sm text-foreground focus:outline-none placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted hover:text-foreground transition-colors duration-200 focus:outline-none p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>

          <div className="gsap-auth-stagger flex items-center justify-between text-xs text-muted -mt-2 mb-2 select-none">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border/70 accent-accent cursor-pointer"
              />
              <span className="text-secondary-text font-medium text-xs">Remember me on this device</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="gsap-auth-stagger group h-12 min-h-[44px] w-full bg-accent text-accent-ink font-bold text-xs tracking-[0.16em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'SIGN UP')}
            {!loading && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
          </button>

        </form>

        <div className="mt-8 text-sm text-muted tracking-[0.02em] transition-colors duration-200 text-center break-words max-w-full">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-accent font-semibold hover:underline underline-offset-4 transition-colors duration-200"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

      </div>
    </div>
  );
};
