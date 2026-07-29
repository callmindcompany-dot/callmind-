import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp } from 'lucide-react';

export const RoiCalculator = () => {
  const [teamSize, setTeamSize] = useState(10);

  // Conservative estimates based on actual telecalling workflows
  const dailyCallsPerAgent = 40;
  const minutesSavedPerCall = 2; // manual data entry time saved
  const workingDays = 22;

  const totalDailyCalls = teamSize * dailyCallsPerAgent;
  const hoursSavedPerMonth = Math.round((teamSize * dailyCallsPerAgent * minutesSavedPerCall * workingDays) / 60);
  const leadsPreventedFromRotting = Math.round(teamSize * 3.5 * workingDays); // 3.5 follow-ups saved per agent/day

  return (
    <section className="py-24 px-6 md:px-12 bg-white border-b border-slate-100 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Calculator */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
                <Calculator size={14} />
                ROI Calculator
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
                See How Much Time Your Team Saves
              </h2>
              <p className="text-base text-slate-500 font-medium max-w-lg">
                Adjust your team size to see estimated daily calls handled and manual data entry hours eliminated every month.
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-700">Telecaller Team Size</label>
                <span className="text-3xl font-bold text-brand-600 font-grotesk">{teamSize}</span>
              </div>
              <input
                type="range"
                min={2}
                max={100}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>2 agents</span>
                <span>100 agents</span>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <motion.div
            key={teamSize}
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            <div className="glass-card p-6 rounded-2xl text-center space-y-2">
              <div className="text-3xl font-bold text-slate-900 font-grotesk">
                {totalDailyCalls.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-slate-700">Daily Calls</div>
              <div className="text-xs text-slate-400">Handled via SIM</div>
            </div>

            <div className="glass-card p-6 rounded-2xl text-center space-y-2">
              <div className="text-3xl font-bold text-emerald-600 font-grotesk">
                {hoursSavedPerMonth}h
              </div>
              <div className="text-sm font-semibold text-slate-700">Hours Saved</div>
              <div className="text-xs text-slate-400">Per Month</div>
            </div>

            <div className="glass-card p-6 rounded-2xl text-center space-y-2">
              <div className="text-3xl font-bold text-brand-600 font-grotesk">
                {leadsPreventedFromRotting.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-slate-700">Follow-Ups</div>
              <div className="text-xs text-slate-400">Auto-Tracked / Month</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
