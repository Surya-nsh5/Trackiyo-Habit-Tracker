import React, { useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FiArrowRight, FiCheckCircle, FiBarChart2, FiHeart } from 'react-icons/fi';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

const mockData = [
  { name: 'Mon', score: 30 },
  { name: 'Tue', score: 45 },
  { name: 'Wed', score: 40 },
  { name: 'Thu', score: 65 },
  { name: 'Fri', score: 55 },
  { name: 'Sat', score: 85 },
  { name: 'Sun', score: 95 },
];

gsap.registerPlugin(ScrollTrigger);

export const LandingPage: React.FC = () => {
  const { startOnboarding } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Hero Entrance
    const tl = gsap.timeline();
    tl.from('.gsap-hero-title', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 })
      .from('.gsap-hero-subtitle', { y: 30, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.6')
      .from('.gsap-hero-btn', { scale: 0.9, opacity: 0, duration: 0.8, ease: 'back.out(1.5)' }, '-=0.6')
      .from('.gsap-showcase', { x: 50, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.8');

    // Scroll Animations
    gsap.utils.toArray('.gsap-feature').forEach((el: any, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: i * 0.1
      });
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="bg-white dark:bg-black min-h-screen text-zinc-600 dark:text-zinc-300 font-sans overflow-x-hidden selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-200/50 dark:bg-zinc-900/40 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-colors duration-300"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-200/40 dark:bg-zinc-900/30 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-colors duration-300"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center transition-colors duration-300">
            <span className="text-white dark:text-black font-black text-xl leading-none pt-0.5">T</span>
          </div>
          <span className="text-zinc-900 dark:text-white font-bold tracking-widest text-lg transition-colors duration-300">TRACKIYO</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => startOnboarding('login')}
            className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors tracking-widest"
          >
            LOG IN
          </button>
          <button 
            onClick={() => startOnboarding('signup')}
            className="text-sm font-bold bg-black text-white dark:bg-white dark:text-black px-5 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors tracking-widest"
          >
            SIGN UP
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between min-h-[80vh] px-6 max-w-7xl mx-auto mt-10 lg:mt-0 gap-12">
        
        {/* Left: Text */}
        <div className="flex-1 text-left flex flex-col items-center lg:items-start text-center lg:text-left w-full">
          <div className="gsap-hero-title will-change-transform inline-block border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30 backdrop-blur-sm rounded-full px-4 py-1.5 text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-8 transition-colors duration-300">
            The Next Generation Habit Tracker
          </div>
          <h1 className="gsap-hero-title will-change-transform text-5xl md:text-7xl lg:text-8xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-6 transition-colors duration-300">
            Master Your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-800 dark:from-zinc-200 dark:to-zinc-600">Daily Habits.</span>
          </h1>
          <p className="gsap-hero-subtitle will-change-transform text-lg md:text-xl text-zinc-600 dark:text-zinc-500 mb-10 max-w-xl leading-relaxed transition-colors duration-300">
            Trackiyo is a meticulously crafted tool designed to help you build better routines, analyze your progress, and optimize your wellness. Completely frictionless.
          </p>
          <button 
            onClick={() => startOnboarding('signup')}
            className="gsap-hero-btn will-change-transform group h-14 px-8 bg-black text-white dark:bg-white dark:text-black font-bold text-sm tracking-widest rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-3"
          >
            START TRACKING
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right: Visual Showcase */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none mt-12 lg:mt-0">
          <div className="gsap-showcase will-change-transform w-full h-[300px] md:h-[400px] bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/60 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden group transition-colors duration-300">
            
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-white/80 dark:to-black/60 z-10 pointer-events-none transition-colors duration-300"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-20">
              <div>
                <h3 className="text-zinc-900 dark:text-white font-bold tracking-widest text-lg transition-colors duration-300">CONSISTENCY SCORE</h3>
                <p className="text-zinc-500 text-xs tracking-wider uppercase mt-1">This Week vs Last Week</p>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 transition-colors duration-300"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-900 dark:bg-white group-hover:scale-110 transition-all duration-300"></div>
              </div>
            </div>

            <div className="w-full h-[200px] md:h-[280px]">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDarkMode ? '#ffffff' : '#000000'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isDarkMode ? '#ffffff' : '#000000'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#0a0a0a' : '#ffffff', 
                      borderColor: isDarkMode ? '#27272a' : '#e4e4e7', 
                      borderRadius: '16px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke={isDarkMode ? '#ffffff' : '#000000'} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 6, fill: isDarkMode ? '#fff' : '#000' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="gsap-feature bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors duration-300">
            <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white mb-6 transition-colors duration-300">
              <FiCheckCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 transition-colors duration-300">Seamless Tracking</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Log your habits instantly with our beautiful, borderless grid interface. Designed for absolute speed and zero friction.
            </p>
          </div>

          <div className="gsap-feature bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors duration-300">
            <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white mb-6 transition-colors duration-300">
              <FiBarChart2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 transition-colors duration-300">Deep Analytics</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Visualize your consistency over time with stunning daily and weekly progress charts. Know exactly where you stand.
            </p>
          </div>

          <div className="gsap-feature bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors duration-300">
            <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white mb-6 transition-colors duration-300">
              <FiHeart size={24} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 transition-colors duration-300">Holistic Wellness</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Don't just track tasks. Log your mood and sleep hours to understand how your habits affect your overall wellbeing.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800/50 py-10 text-center mt-20 transition-colors duration-300">
        <p className="text-xs font-bold tracking-widest text-zinc-500 dark:text-zinc-600 uppercase">
          © {new Date().getFullYear()} Trackiyo. All rights reserved.
        </p>
      </footer>

    </div>
  );
};
