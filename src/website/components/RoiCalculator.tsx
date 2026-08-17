import React, { useState } from 'react';
import { Calculator, ShieldCheck, Crown, UserCheck, Settings } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { PRICING_PLANS } from '../../config/pricing';

const STARTER_MAX = PRICING_PLANS.starter.maxSeats;
const GROWTH_MAX = PRICING_PLANS.growth.maxSeats;
const PRO_MAX = PRICING_PLANS.pro.maxSeats;

export const RoiCalculator = () => {
  const [teamSize, setTeamSize] = useState(30);
  const [activeTab, setActiveTab] = useState<'starter' | 'growth' | 'pro'>('pro');

  // Conservative estimates based on actual telecalling workflows
  const dailyCallsPerAgent = 40;
  const minutesSavedPerCall = 2; // manual data entry time saved
  const workingDays = 22;

  const totalDailyCalls = teamSize * dailyCallsPerAgent;
  const hoursSavedPerMonth = Math.round((teamSize * dailyCallsPerAgent * minutesSavedPerCall * workingDays) / 60);
  const leadsPreventedFromRotting = Math.round(teamSize * 3.5 * workingDays);

  // Clicking a plan tab sets a representative team size within that tier
  const handleTabChange = (tab: 'starter' | 'growth' | 'pro') => {
    setActiveTab(tab);
    if (tab === 'starter') {
      setTeamSize((current) => Math.min(Math.max(current, 1), STARTER_MAX));
    } else if (tab === 'growth') {
      setTeamSize((current) => {
        if (current <= STARTER_MAX || current > GROWTH_MAX) return 18;
        return current;
      });
    } else if (tab === 'pro') {
      setTeamSize((current) => {
        if (current <= GROWTH_MAX) return 30;
        return current;
      });
    }
  };

  // Dragging slider forwards OR backwards dynamically syncs the active plan tier and org chart
  const handleSliderChange = (newSize: number) => {
    setTeamSize(newSize);
    if (newSize <= STARTER_MAX) {
      setActiveTab('starter');
    } else if (newSize <= GROWTH_MAX) {
      setActiveTab('growth');
    } else {
      setActiveTab('pro');
    }
  };

  // 2-Way Team Split for Growth Tier
  const growthA = Math.floor(teamSize / 2);
  const growthB = Math.ceil(teamSize / 2);

  // 3-Way Team Split across ALL 3 Admins for Pro Tier (Main Admin + Sub-Admin 1 + Sub-Admin 2)
  const proEach = Math.floor(teamSize / 3);
  const proRemainder = teamSize - (proEach * 2);
  const proMainTeam = proEach;
  const proSub1Team = proEach;
  const proSub2Team = proRemainder;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-12 bg-white border-b border-slate-200 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        <SectionHeader
          align="center"
          badge={{ icon: Calculator, text: 'Visual Hierarchy & Operational ROI' }}
          title="Interactive Team Org-Chart & Productivity Calculator"
          subtitle="Toggle plan tiers or adjust the telecaller slider to visualize how telecallers divide across Main Admin and Sub-Admins."
        />

        {/* Interactive Plan Toggle Switcher & Slider Controls */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-6">
          {/* Plan Toggle Switches */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-bold text-slate-800 font-sans">
              Select Plan Tier Architecture:
            </div>
            
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300 gap-1 w-full sm:w-auto">
              <button
                onClick={() => handleTabChange('starter')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                  activeTab === 'starter'
                    ? 'bg-white text-brand-700 shadow-xs border border-brand-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Starter (up to {STARTER_MAX} seats)
              </button>
              <button
                onClick={() => handleTabChange('growth')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                  activeTab === 'growth'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Growth (up to {GROWTH_MAX} seats)
              </button>
              <button
                onClick={() => handleTabChange('pro')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                  activeTab === 'pro'
                    ? 'bg-white text-violet-700 shadow-xs border border-violet-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pro (up to {PRO_MAX} seats)
              </button>
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
                Adjust Telecaller Team Count (1 to {PRO_MAX})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-brand-600 font-display">{teamSize}</span>
                <span className="text-xs font-bold text-slate-600 font-sans">Active Telecallers</span>
              </div>
            </div>

            <input
              type="range"
              min={1}
              max={PRO_MAX}
              value={teamSize}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />

            <div className="flex justify-between text-xs text-slate-500 font-sans font-medium">
              <span>1 Agent</span>
              <span>{STARTER_MAX} (Starter max)</span>
              <span>{GROWTH_MAX} (Growth max)</span>
              <span>{PRO_MAX} (Pro max)</span>
            </div>
          </div>
        </div>

        {/* Real Visual Org-Chart Tree (Connected SVG Nodes) */}
        <div className="p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-950 font-display">
                Team Organizational Tree ({teamSize} Telecallers)
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                {activeTab === 'pro'
                  ? 'Main Admin allocates telecallers across all 3 Admins (Main Admin + Sub-Admin 1 + Sub-Admin 2).'
                  : activeTab === 'growth'
                  ? 'Telecallers divided 50/50 between Main Admin & Sub-Admin.'
                  : 'Main Admin directly manages all telecallers.'}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold font-sans border shrink-0 ${
              activeTab === 'starter' ? 'bg-brand-50 text-brand-700 border-brand-200' :
              activeTab === 'growth' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-violet-50 text-violet-700 border-violet-200'
            }`}>
              {activeTab === 'starter' ? '1 Admin Structure' : activeTab === 'growth' ? '2 Admins Architecture' : '3 Admins 3-Way Split'}
            </span>
          </div>

          {/* Org Chart Visual Map */}
          <div className="py-6 flex flex-col items-center justify-center space-y-0">
            {/* Level 1: Main Admin Node */}
            <div className="flex flex-col items-center z-10">
              <div className="px-6 py-3.5 rounded-xl bg-slate-950 text-white font-bold text-sm shadow-md flex items-center gap-2 border border-slate-800 font-sans">
                <Crown className="w-4.5 h-4.5 text-amber-300" />
                <span>Main Admin (Company Owner)</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
                {activeTab === 'pro' ? 'Allocates Telecallers Across All 3 Admins & Governs Company' : 'Executive Dashboard & Lead Source Settings'}
              </span>
            </div>

            {/* Connecting Lines for Starter */}
            {activeTab === 'starter' && (
              <>
                <div className="w-0.5 h-10 bg-brand-300 my-1"></div>
                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 font-semibold text-xs font-sans shadow-2xs">
                    Direct Telecaller Pool ({teamSize} Telecallers)
                  </div>
                  <p className="text-xs text-slate-500 font-sans">Single tier direct management with zero manager salary overhead.</p>
                </div>
              </>
            )}

            {/* Connecting Lines for Growth (2-Way Split) */}
            {activeTab === 'growth' && (
              <div className="w-full max-w-3xl flex flex-col items-center">
                {/* SVG Connector Lines */}
                <svg className="w-full h-12 stroke-slate-300" fill="none">
                  <line x1="50%" y1="0" x2="50%" y2="16" strokeWidth="2" />
                  <line x1="25%" y1="16" x2="75%" y2="16" strokeWidth="2" />
                  <line x1="25%" y1="16" x2="25%" y2="48" strokeWidth="2" />
                  <line x1="75%" y1="16" x2="75%" y2="48" strokeWidth="2" />
                </svg>

                {/* Level 2: Dual Branch Nodes */}
                <div className="grid grid-cols-2 gap-6 sm:gap-12 w-full">
                  {/* Left Node: Main Admin (Team A) */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 font-sans">
                      <UserCheck className="w-3.5 h-3.5" /> Main Admin (Direct Team)
                    </div>
                    <div className="w-0.5 h-4 bg-slate-300"></div>
                    <div className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold font-mono">
                      Team A: {growthA} Telecallers
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">Main Admin Direct Management</span>
                  </div>

                  {/* Right Node: Sub-Admin 1 (Team B) */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 font-sans">
                      <ShieldCheck className="w-3.5 h-3.5" /> Sub-Admin 1 (Manager)
                    </div>
                    <div className="w-0.5 h-4 bg-slate-300"></div>
                    <div className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold font-mono">
                      Team B: {growthB} Telecallers
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">Assigned Sub-Admin Management</span>
                  </div>
                </div>
              </div>
            )}

            {/* Connecting Lines for Pro (3-Way Split Across All 3 Admins) */}
            {activeTab === 'pro' && (
              <div className="w-full max-w-4xl flex flex-col items-center">
                {/* SVG Connector Lines to 3 Nodes */}
                <svg className="w-full h-12 stroke-slate-300" fill="none">
                  <line x1="50%" y1="0" x2="50%" y2="48" strokeWidth="2" />
                  <line x1="16.6%" y1="16" x2="83.3%" y2="16" strokeWidth="2" />
                  <line x1="16.6%" y1="16" x2="16.6%" y2="48" strokeWidth="2" />
                  <line x1="83.3%" y1="16" x2="83.3%" y2="48" strokeWidth="2" />
                </svg>

                {/* Level 2: 3-Way Branch Nodes (Main Admin + Sub-Admin 1 + Sub-Admin 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
                  {/* Node 1: Main Admin Direct Team */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="px-3 py-1.5 rounded-lg bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 font-sans">
                      <Crown className="w-3.5 h-3.5 text-amber-300" /> Main Admin Team
                    </div>
                    <div className="w-0.5 h-3 bg-slate-300"></div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono">
                      {proMainTeam} Telecallers
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">Main Admin Direct Quota</span>
                  </div>

                  {/* Node 2: Sub-Admin 1 Team */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center gap-1.5 font-sans">
                      <ShieldCheck className="w-3.5 h-3.5" /> Sub-Admin 1 Team
                    </div>
                    <div className="w-0.5 h-3 bg-slate-300"></div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono">
                      {proSub1Team} Telecallers
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">Floor 1 Manager Quota</span>
                  </div>

                  {/* Node 3: Sub-Admin 2 Team */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center gap-1.5 font-sans">
                      <ShieldCheck className="w-3.5 h-3.5" /> Sub-Admin 2 Team
                    </div>
                    <div className="w-0.5 h-3 bg-slate-300"></div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono">
                      {proSub2Team} Telecallers
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">Floor 2 Manager Quota</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integrated Real Operational ROI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              {activeTab === 'starter' ? 1 : activeTab === 'growth' ? 2 : 3}
            </div>
            <div className="text-xs font-bold text-slate-800 font-sans font-sans">Admin Accounts</div>
            <div className="text-[11px] text-slate-500 font-sans">
              {activeTab === 'starter' ? '1 Main Admin' : activeTab === 'growth' ? 'Main Admin + 1 Sub-Admin' : 'Main Admin + 2 Sub-Admins'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-black text-slate-950 font-display">
              {totalDailyCalls.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-800 font-sans">Daily Calls Handled</div>
            <div className="text-[11px] text-slate-500 font-sans">40 Calls / Telecaller / Day</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-display">
              {hoursSavedPerMonth}h
            </div>
            <div className="text-xs font-bold text-slate-800 font-sans">Hours Saved / Month</div>
            <div className="text-[11px] text-slate-500 font-sans">Manual Data Entry Saved</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-black text-brand-600 font-display">
              {leadsPreventedFromRotting.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-800 font-sans">Auto Follow-Ups</div>
            <div className="text-[11px] text-slate-500 font-sans">Leads Handled On-Time</div>
          </div>
        </div>
      </div>
    </section>
  );
};
