import React, { useEffect, useMemo, useState } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { useThemeTokens } from '../../store/useThemeStore';
import { useToday } from '../../hooks/useToday';
import { getWeekDates, getWeekRangeLabel } from '../../utils/dailyTracking';
import {
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import {
  FiSmile, FiMoon, FiZap,
  FiDroplet, FiPlus, FiMinus, FiActivity,
  FiTrendingUp, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

export const WellnessTracker: React.FC = () => {
  const { wellnessLogs, updateWellnessLog } = useHabitStore();
  const t = useThemeTokens();
  const todayStr = useToday();

  const [weekOffset, setWeekOffset] = useState<number>(0);

  const todayLog = wellnessLogs[todayStr] || {};

  // Water tracking strictly bounded 0 to 8 glasses (8 x 250ml = 2000ml)
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    if (todayLog.water != null) return Math.min(8, Math.max(0, Number(todayLog.water)));
    try {
      const stored = localStorage.getItem(`trackiyo_water_${todayStr}`);
      return stored ? Math.min(8, Math.max(0, parseInt(stored, 10))) : 4;
    } catch {
      return 4;
    }
  });

  useEffect(() => {
    if (todayLog.water != null) {
      setWaterGlasses(Math.min(8, Math.max(0, Number(todayLog.water))));
    }
  }, [todayLog.water]);

  const handleWaterChange = (delta: number) => {
    const next = Math.max(0, Math.min(8, waterGlasses + delta));
    setWaterGlasses(next);
    updateWellnessLog(todayStr, 'water', next);
    try {
      localStorage.setItem(`trackiyo_water_${todayStr}`, String(next));
    } catch {}
  };

  const setWaterLevel = (level: number) => {
    const next = Math.max(0, Math.min(8, level));
    setWaterGlasses(next);
    updateWellnessLog(todayStr, 'water', next);
    try {
      localStorage.setItem(`trackiyo_water_${todayStr}`, String(next));
    } catch {}
  };

  // Week-wise 7-day strip (Monday to Sunday) based on weekOffset (0 = current week, -1 = last week, etc.)
  const weekDays = useMemo(() => {
    return getWeekDates(weekOffset, todayStr);
  }, [weekOffset, todayStr]);

  const weekRangeLabel = useMemo(() => {
    return getWeekRangeLabel(weekOffset, todayStr);
  }, [weekOffset, todayStr]);

  // Chart data for the 7 days of the selected week
  const chartData = useMemo(() => {
    return weekDays.map(({ dateStr, weekday, dayNum, status }) => {
      const log = wellnessLogs[dateStr];
      const isToday = dateStr === todayStr;
      const w = log?.water != null ? Number(log.water) : (isToday && waterGlasses > 0 ? waterGlasses : null);

      return {
        dateStr,
        weekday,
        dayNum,
        dayLabel: `${weekday} ${dayNum}`,
        isToday,
        status,
        mood: log?.mood != null ? Number(log.mood) : null,
        sleep: log?.sleep != null ? Number(log.sleep) : null,
        energy: log?.energy != null ? Number(log.energy) : null,
        water: w != null ? Math.min(8, Math.max(0, w)) : null,
      };
    });
  }, [weekDays, wellnessLogs, todayStr, waterGlasses]);

  return (
    <div className="wellness-view-container h-full w-full max-w-full min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 outline-none">
      <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col gap-3 md:gap-4 relative">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 flex-shrink-0 w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-[0.08em] uppercase flex items-center gap-2.5 break-words min-w-0">
            <FiActivity className="text-accent shrink-0" size={20} />
            Wellness & Energy
          </h1>
          <p className="text-xs text-secondary-text mt-0.5">
            Log daily mind, body, and recovery signals to sustain peak performance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/15 text-success border border-success/30 break-words max-w-full">
            Today: {todayStr}
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* 1. BALANCED QUICK SIGNAL ENTRY (Cohesive 4-Card Grid) */}
      {/* ----------------------------------------------------- */}
      <div className="bg-surface border border-border/80 rounded-xl p-3 sm:p-4 shadow-xs flex-shrink-0 space-y-3 w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-subtle min-w-0">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Quick Signal Entry
            </h2>
            <p className="text-xs text-secondary-text mt-0.5">
              One-click logging for mood, sleep, energy, and water hydration.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-muted">
            Auto-saves to daily log
          </span>
        </div>

        {/* 4 Perfectly Balanced Cards with Identical Layout & Height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">

          {/* CARD 1: MOOD (1 - 10) */}
          <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                <FiSmile size={15} className="text-accent" /> Mood
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                todayLog.mood ? 'bg-accent/15 text-accent border border-accent/25' : 'text-muted'
              }`}>
                {todayLog.mood ? `${todayLog.mood} / 10` : 'Not set'}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { score: 2, label: 'Low' },
                { score: 4, label: 'Fair' },
                { score: 6, label: 'OK' },
                { score: 8, label: 'Good' },
                { score: 10, label: 'Peak' }
              ].map(({ score, label }) => {
                const isSelected = todayLog.mood === score;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => updateWellnessLog(todayStr, 'mood', score)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-accent text-accent-ink shadow-xs ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover text-secondary-text hover:text-foreground border border-border-subtle'
                    }`}
                  >
                    <span>{score}</span>
                    <span className="text-[9px] opacity-75">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 2: SLEEP (Hours) */}
          <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                <FiMoon size={15} className="text-info" /> Sleep
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                todayLog.sleep ? 'bg-info/15 text-info border border-info/25' : 'text-muted'
              }`}>
                {todayLog.sleep ? `${todayLog.sleep} hrs` : 'Not set'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { hrs: 6, label: '6h' },
                { hrs: 7, label: '7h' },
                { hrs: 8, label: '8h' },
                { hrs: 9, label: '9h+' }
              ].map(({ hrs, label }) => {
                const isSelected = todayLog.sleep === hrs;
                return (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => updateWellnessLog(todayStr, 'sleep', hrs)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-info text-white shadow-xs ring-1 ring-info'
                        : 'bg-surface hover:bg-surface-hover text-secondary-text hover:text-foreground border border-border-subtle'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] opacity-75">{hrs === 8 ? 'Optimal' : `${hrs} hrs`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 3: ENERGY (Level 1 - 10) */}
          <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                <FiZap size={15} className="text-success" /> Energy
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                todayLog.energy ? 'bg-success/15 text-success border border-success/25' : 'text-muted'
              }`}>
                {todayLog.energy ? `${todayLog.energy} / 10` : 'Not set'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 3, label: 'Low' },
                { val: 6, label: 'Mid' },
                { val: 8, label: 'High' },
                { val: 10, label: 'Peak' }
              ].map((item) => {
                const isSelected = todayLog.energy === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateWellnessLog(todayStr, 'energy', item.val)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-success text-white dark:text-black shadow-xs ring-1 ring-success'
                        : 'bg-surface hover:bg-surface-hover text-secondary-text hover:text-foreground border border-border-subtle'
                    }`}
                  >
                    <span>{item.val}</span>
                    <span className="text-[9px] opacity-75">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 4: WATER HYDRATION (Strictly 8-Glass Goal) */}
          <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                <FiDroplet size={15} className="text-cyan-400" /> Water
              </span>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums bg-cyan-400/15 text-cyan-400 border border-cyan-400/25 shrink-0 whitespace-nowrap">
                  {waterGlasses} / 8 gls
                </span>
                {waterGlasses >= 8 && (
                  <span className="text-[10px] font-bold text-success animate-pulse">✨ Goal!</span>
                )}
              </div>
            </div>

            {/* Balanced Quick Level Buttons: 2, 4, 6, 8 glasses with - / + Steppers */}
            <div className="flex items-center gap-1.5 min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => handleWaterChange(-1)}
                disabled={waterGlasses <= 0}
                className="w-8 h-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-secondary-text hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
                title="Minus 1 glass"
              >
                <FiMinus size={13} />
              </button>

              <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
                {[
                  { gls: 2, label: '500ml' },
                  { gls: 4, label: '1.0L' },
                  { gls: 6, label: '1.5L' },
                  { gls: 8, label: '2.0L' }
                ].map(({ gls, label }) => {
                  const isReached = waterGlasses >= gls;
                  return (
                    <button
                      key={gls}
                      type="button"
                      onClick={() => setWaterLevel(gls === waterGlasses ? gls - 2 : gls)}
                      className={`h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isReached
                          ? 'bg-cyan-500 text-white shadow-xs ring-1 ring-cyan-400'
                          : 'bg-surface hover:bg-surface-hover text-secondary-text hover:text-foreground border border-border-subtle'
                      }`}
                    >
                      <span className="leading-tight">{gls}g</span>
                      <span className="text-[9px] opacity-80 leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleWaterChange(1)}
                disabled={waterGlasses >= 8}
                className="w-8 h-10 rounded-lg bg-cyan-500 text-white font-bold flex items-center justify-center hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs transition-all"
                title="Plus 1 glass"
              >
                <FiPlus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* 2. ADVANCED WELLNESS VISUALIZATION (Week-wise Bar Chart) */}
      {/* ----------------------------------------------------- */}
      <div className="w-full max-w-full min-w-0 bg-surface border border-border/80 rounded-xl overflow-hidden flex flex-col shadow-xs flex-shrink-0">
        
        {/* Header Strip with Week Navigator */}
        <div className="bg-surface-secondary border-b border-border/80 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <FiTrendingUp className="text-accent" size={16} />
              Weekly Wellness Analytics
            </h3>
            <p className="text-xs text-secondary-text mt-0.5">
              7-day correlation of mind, sleep duration, physical energy, and hydration.
            </p>
          </div>

          {/* Week Navigator (Previous / Current / Next) */}
          <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
            <div className="flex items-center bg-surface rounded-lg border border-border-subtle p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWeekOffset(w => w - 1)}
                className="p-1.5 hover:bg-surface-secondary text-secondary-text hover:text-foreground rounded-md transition-colors cursor-pointer"
                title="Previous Week"
              >
                <FiChevronLeft size={16} />
              </button>
              
              <span className="px-3 py-1 text-xs font-bold text-foreground whitespace-nowrap max-w-[160px] sm:max-w-none overflow-hidden text-ellipsis shrink-0">
                {weekRangeLabel}
              </span>

              <button
                type="button"
                onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                disabled={weekOffset >= 0}
                className="p-1.5 hover:bg-surface-secondary text-secondary-text hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
                title="Next Week"
              >
                <FiChevronRight size={16} />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
              >
                Current Week
              </button>
            )}
          </div>
        </div>

        {/* High-Definition Responsive Weekly Bar Chart */}
        <div className="w-full max-w-full min-w-0 h-[340px] sm:h-[380px] p-3 sm:p-4 bg-surface/30 outline-none">
          <ResponsiveContainer width="99%" height="100%" className="outline-none focus:outline-none">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 16, left: 6, bottom: 20 }}
              barCategoryGap="20%"
              barGap={3}
              style={{ outline: 'none' }}
            >
              <CartesianGrid stroke={t.border} strokeDasharray="3 3" opacity={0.25} vertical={false} />
              <XAxis
                dataKey="dayLabel"
                axisLine={{ stroke: t.border, strokeOpacity: 0.3 }}
                tickLine={false}
                tick={{ fill: t.muted, fontSize: 11, fontWeight: 600 }}
                height={32}
                dy={6}
              />
              <YAxis
                domain={[0, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: t.muted, fontSize: 10, fontWeight: 600 }}
                ticks={[0, 2, 4, 6, 8, 10]}
                width={36}
                dx={-2}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '12px',
                  color: t.fg,
                  fontSize: '11px',
                  padding: '10px 14px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                }}
                formatter={(value: any, name: any) => {
                  if (value == null) return ['--', name];
                  if (name === 'Sleep') return [`${value} hrs`, '🌙 Sleep'];
                  if (name === 'Water') return [`${value} / 8 glasses (${value * 250} ml)`, '💧 Water'];
                  if (name === 'Mood') return [`${value} / 10`, '💖 Mood'];
                  return [`${value} / 10`, '⚡ Energy'];
                }}
                labelFormatter={(label) => label}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                iconType="circle"
                iconSize={8}
              />

              {/* Target Benchmark Reference Lines */}
              <ReferenceLine y={8} stroke="#22d3ee" strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.7} />
              <ReferenceLine y={8} stroke={t.info} strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.7} />

              <Bar dataKey="mood" name="Mood" fill={t.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="sleep" name="Sleep" fill={t.info} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="energy" name="Energy" fill={t.success} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="water" name="Water" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
      </div>
    </div>
  );
};

export default WellnessTracker;
