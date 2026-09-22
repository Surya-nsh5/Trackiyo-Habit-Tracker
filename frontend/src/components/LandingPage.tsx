import React, { useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeTokens } from '../store/useThemeStore';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FiArrowRight, FiCheckCircle, FiBarChart2, FiHeart } from 'react-icons/fi';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { AndroidDownload } from './AndroidDownload';

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
  const t = useThemeTokens();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Hero Entrance (clearProps guarantees natural resting styles after play)
    const tl = gsap.timeline();
    tl.from('.gsap-hero-title', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform,opacity' })
      .from('.gsap-hero-subtitle', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.6')
      .from('.gsap-hero-btn', { scale: 0.9, opacity: 0, duration: 0.8, ease: 'back.out(1.5)', clearProps: 'transform,opacity' }, '-=0.6')
      .from('.gsap-showcase', { x: 50, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.8');

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
    <div ref={containerRef} className="bg-background min-h-screen text-muted font-sans overflow-x-hidden selection:bg-accent selection:text-accent-ink transition-colors duration-200">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-elevated blur-[150px] rounded-full transition-colors duration-200"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-elevated blur-[120px] rounded-full transition-colors duration-200"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center transition-colors duration-200">
            <span className="text-accent-ink font-bold text-xl leading-none pt-0.5">T</span>
          </div>
          <span className="text-foreground font-bold tracking-[0.18em] text-lg transition-colors duration-200">TRACKIYO</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => startOnboarding('login')}
            className="text-xs font-semibold min-h-[44px] px-3 text-muted hover:text-foreground transition-colors duration-200 tracking-[0.14em]"
          >
            LOG IN
          </button>
          <button 
            onClick={() => startOnboarding('signup')}
            className="text-xs font-bold min-h-[44px] px-5 py-2 bg-accent text-accent-ink rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 tracking-[0.14em]"
          >
            SIGN UP
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between min-h-[80vh] px-6 max-w-7xl mx-auto mt-10 lg:mt-0 gap-12">
        
        {/* Left: Text */}
        <div className="flex-1 text-left flex flex-col items-center lg:items-start text-center lg:text-left w-full">
          <div className="gsap-hero-title will-change-transform inline-block border border-border/70 bg-elevated rounded px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase mb-8 transition-colors duration-200">
            The Next Generation Habit Tracker
          </div>
          <h1 className="gsap-hero-title will-change-transform text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-[-0.03em] leading-[1.02] mb-6 transition-colors duration-200">
            Master Your <br/> <span className="text-accent">Daily Habits.</span>
          </h1>
          <p className="gsap-hero-subtitle will-change-transform text-base md:text-lg text-muted mb-10 max-w-xl leading-relaxed transition-colors duration-200">
            Trackiyo is a meticulously crafted tool designed to help you build better routines, analyze your progress, and optimize your wellness. Completely frictionless.
          </p>
          <button 
            onClick={() => startOnboarding('signup')}
            className="gsap-hero-btn will-change-transform group h-14 min-h-[44px] px-8 bg-accent text-accent-ink font-bold text-xs tracking-[0.16em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center gap-3"
          >
            START TRACKING
            <FiArrowRight className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        {/* Right: Visual Showcase */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none mt-12 lg:mt-0">
          <div className="gsap-showcase will-change-transform w-full h-[300px] md:h-[400px] bg-surface border border-border/70 rounded-md p-6 md:p-10 relative overflow-hidden group transition-colors duration-200">
            
            <div className="flex justify-between items-center mb-6 relative z-20">
              <div>
                <h3 className="text-foreground font-bold tracking-[0.12em] text-base transition-colors duration-200">CONSISTENCY SCORE</h3>
                <p className="text-muted text-[11px] tracking-[0.12em] uppercase mt-1">This Week vs Last Week</p>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-border transition-colors duration-200"></div>
                <div className="w-3 h-3 rounded-full bg-muted transition-colors duration-200"></div>
                <div className="w-3 h-3 rounded-full bg-accent group-hover:scale-110 transition-transform duration-200"></div>
              </div>
            </div>

            <div className="w-full h-[200px] md:h-[280px]">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={t.accent} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={t.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: t.surface, 
                      borderColor: t.border, 
                      borderRadius: '6px',
                      color: t.fg
                    }}
                    itemStyle={{ color: t.fg, fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke={t.accent} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 5, fill: t.accent }}
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
          
          <div className="gsap-feature bg-elevated border border-border/70 rounded-md p-6 sm:p-8 hover:border-accent/40 transition-colors duration-200">
            <div className="w-12 h-12 bg-accent rounded flex items-center justify-center text-accent-ink mb-6 transition-colors duration-200">
              <FiCheckCircle size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground mb-3 transition-colors duration-200">Seamless Tracking</h3>
            <p className="text-muted text-sm leading-relaxed">
              Log your habits instantly with our beautiful, borderless grid interface. Designed for absolute speed and zero friction.
            </p>
          </div>

          <div className="gsap-feature bg-elevated border border-border/70 rounded-md p-6 sm:p-8 hover:border-accent/40 transition-colors duration-200">
            <div className="w-12 h-12 bg-border/60 rounded flex items-center justify-center text-foreground mb-6 transition-colors duration-200">
              <FiBarChart2 size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground mb-3 transition-colors duration-200">Deep Analytics</h3>
            <p className="text-muted text-sm leading-relaxed">
              Visualize your consistency over time with stunning daily and weekly progress charts. Know exactly where you stand.
            </p>
          </div>

          <div className="gsap-feature bg-elevated border border-border/70 rounded-md p-6 sm:p-8 hover:border-accent/40 transition-colors duration-200">
            <div className="w-12 h-12 bg-border/60 rounded flex items-center justify-center text-foreground mb-6 transition-colors duration-200">
              <FiHeart size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground mb-3 transition-colors duration-200">Holistic Wellness</h3>
            <p className="text-muted text-sm leading-relaxed">
              Don't just track tasks. Log your mood and sleep hours to understand how your habits affect your overall wellbeing.
            </p>
          </div>

        </div>
      </section>

      {/* Android App Download */}
      <AndroidDownload />

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 py-10 text-center mt-20 transition-colors duration-200">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          © {new Date().getFullYear()} Trackiyo. All rights reserved.
        </p>
      </footer>

    </div>
  );
};
