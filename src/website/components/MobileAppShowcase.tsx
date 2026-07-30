import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Zap, Shield, WifiOff, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Phone, PhoneCall, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SITE_URL } from '../siteConfig';
import { useInViewAutoplay } from '../hooks/useInViewAutoplay';

const mobileScreens = [
  {
    id: 'dashboard',
    title: 'Telecaller Mobile Dashboard',
    badge: 'Mobile Dashboard',
    desc: 'Live telecalling queue with online readiness status toggle, daily target progress bar, and AI Next Best Lead recommendations.',
    bullets: [
      'Live daily target progress tracker (42 / 60 calls completed)',
      'Online readiness status toggle & AI Next Best Lead prompt',
    ],
    imageSrc: '/ui-images/mobile-ui-1.png',
  },
  {
    id: 'calling',
    title: 'Active Calling & SIM 1/2 Dialing',
    badge: 'Native SIM Dialing',
    desc: 'Telecallers tap to dial via SIM 1 or SIM 2 directly from device with native caller ID pass-through.',
    bullets: [
      '1-Tap native SIM 1 / SIM 2 selection & live call timer overlay',
      'Runs over carrier channels — zero VoIP delay, zero audio storage',
    ],
    imageSrc: '/ui-images/mobile-ui-2.png',
  },
  {
    id: 'feedback',
    title: 'Post-Call Disposition & Notes',
    badge: 'Call Disposition',
    desc: 'Log call outcomes (Connected, Interested, Callback), add customer notes, and schedule follow-ups in 2 taps.',
    bullets: [
      'Log call outcome & follow-up notes in 2 taps right after call',
      'Automated callback calendar reminders',
    ],
    imageSrc: '/ui-images/mobile-ui-3.png',
  },
  {
    id: 'history',
    title: 'Telecaller Activity & Call History',
    badge: 'Call History',
    desc: 'View comprehensive history of completed, missed, and scheduled calls with duration badges and masked numbers.',
    bullets: [
      'Masked recipient phone numbers for lead data privacy',
      'Cloud auto-sync once device connects online',
    ],
    imageSrc: '/ui-images/mobile-ui-4.png',
  },
];

export const MobileAppShowcase = () => {
  const { ref, index: activeScreenIndex, setIndex: setActiveScreenIndex } = useInViewAutoplay(mobileScreens.length);

  const currentScreen = mobileScreens[activeScreenIndex];

  return (
    <section ref={ref} className="py-24 px-6 md:px-12 bg-slate-50 text-slate-900 relative overflow-hidden font-sans border-b border-slate-100">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
        
        {/* Left Side: Mobile Companion Details & Screen Navigation */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-brand-200 bg-brand-50">
            <Smartphone size={16} className="text-brand-600" />
            <span className="text-xs font-bold text-brand-700 tracking-wide font-sans">
              TELECALLER MOBILE COMPANION APP
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 font-display leading-[1.12]">
            Android App Built For{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
              1-Click SIM Dialing
            </span>
          </h2>

          <p className="text-slate-500 text-base font-medium leading-relaxed max-w-xl">
            Give your telecallers an intuitive Android app. Auto-log call durations, follow AI talk scripts, schedule callbacks, and sync queue data seamlessly.
          </p>

          {/* Interactive Screen Selector Tabs */}
          <div className="space-y-3 pt-2">
            {mobileScreens.map((screen, idx) => {
              const isActive = activeScreenIndex === idx;
              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreenIndex(idx)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 border-brand-500 shadow-md'
                      : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-brand-700' : 'text-slate-400'}`}>
                      {screen.badge}
                    </span>
                    {isActive && <ChevronRight size={16} className="text-brand-600" />}
                  </div>
                  <h4 className={`text-sm font-bold font-display mt-0.5 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    {screen.title}
                  </h4>
                  <div className="pt-2 space-y-1">
                    {screen.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-1.5 text-xs text-slate-600 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Custom Generated Mobile UI Screenshot Image & QR Scan */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6">
          {/* Phone Device Frame */}
          <div className="w-[310px] h-[590px] bg-slate-900 border-4 border-slate-800 rounded-[44px] p-4 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Notch */}
            <div className="w-32 h-5 bg-slate-800 rounded-full mx-auto mb-3" />

            {/* Custom Generated Mobile UI Screenshot Container */}
            <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col justify-between shadow-inner relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full overflow-hidden flex items-center justify-center"
                >
                  <img
                    src={currentScreen.imageSrc}
                    alt={currentScreen.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top hover:scale-[1.03] transition-transform duration-500"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Phone Bottom Notch */}
            <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
          </div>

          {/* QR Banner — points at the public mobile app page. Never ship a
              localhost URL here; a scanned code that resolves to nothing reads
              as a broken product to the person holding the phone. */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 w-full max-w-[320px] shadow-sm">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <QRCodeSVG value={`${SITE_URL}/mobile-app`} size={64} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 font-display">Get the Telecaller App</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Scan with your Android camera to open the CallMind telecaller app page.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
