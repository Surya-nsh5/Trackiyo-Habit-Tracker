import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FiMail, FiLock, FiUser, FiArrowRight, FiAlertCircle, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';

export const AuthScreen: React.FC = () => {
  const { initialAuthMode, login, signup, resetOnboarding } = useAuthStore();
  const [isLogin, setIsLogin] = useState(initialAuthMode === 'login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="h-screen w-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-6 text-zinc-600 dark:text-zinc-300 font-sans transition-colors duration-300">
      
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-900/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse transition-colors duration-300"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/10 dark:bg-purple-900/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse transition-colors duration-300" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="gsap-auth-box will-change-transform w-full max-w-[420px] bg-white/80 dark:bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-200 dark:border-zinc-700/50 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10 flex flex-col items-center transition-colors duration-300">
        
        {/* Back Button */}
        <button 
          type="button"
          onClick={resetOnboarding}
          className="absolute top-6 left-6 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Back to Landing Page"
        >
          <FiArrowLeft size={18} />
        </button>

        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] mb-8 transition-colors duration-300">
          <span className="text-white dark:text-black text-3xl font-black font-sans leading-none pt-1">T</span>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-widest mb-2 text-center uppercase transition-colors duration-300">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-xs text-zinc-500 mb-6 text-center tracking-wider transition-colors duration-300">
          {isLogin ? 'Enter your details to access your dashboard.' : 'Start tracking your habits beautifully.'}
        </p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg mb-6 flex items-start gap-2 transition-colors duration-300">
            <FiAlertCircle className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {!isLogin && (
            <div className="gsap-auth-stagger flex items-center bg-zinc-50 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 h-12 focus-within:border-zinc-400 dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-zinc-900/90 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all">
              <FiUser className="text-zinc-400 dark:text-zinc-500 mr-3" size={18} />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="bg-transparent w-full h-full text-sm text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          )}

          <div className="gsap-auth-stagger flex items-center bg-zinc-50 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 h-12 focus-within:border-zinc-400 dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-zinc-900/90 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all">
            <FiMail className="text-zinc-400 dark:text-zinc-500 mr-3" size={18} />
            <input 
              type="email" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="bg-transparent w-full h-full text-sm text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="gsap-auth-stagger flex items-center bg-zinc-50 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 h-12 focus-within:border-zinc-400 dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-zinc-900/90 focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all mb-4">
            <FiLock className="text-zinc-400 dark:text-zinc-500 mr-3 shrink-0" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="bg-transparent w-full h-full text-sm text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none p-1 shrink-0 ml-2"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="gsap-auth-stagger group h-12 w-full bg-black text-white dark:bg-white dark:text-black font-black text-sm tracking-widest rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'SIGN UP')}
            {!loading && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
          </button>

        </form>

        <div className="mt-8 text-xs text-zinc-500 tracking-wider transition-colors duration-300">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-900 dark:text-white font-bold hover:underline underline-offset-4 transition-colors duration-300"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

      </div>
    </div>
  );
};
