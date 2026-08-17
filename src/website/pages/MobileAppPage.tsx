import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ArrowRight, QrCode, PhoneCall, WifiOff, FileEdit, CheckCircle2, Download, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';

const appFeatures = [
  {
    icon: PhoneCall,
    title: '1-Click SIM Dialing',
    description: 'Tap any lead to instantly dial via your mobile SIM. No VoIP, no internet calling needed.',
  },
  {
    icon: WifiOff,
    title: 'Offline Lead Access',
    description: 'View your assigned leads even without internet. Sync updates when you reconnect.',
  },
  {
    icon: FileEdit,
    title: 'Post-Call Quick Notes',
    description: 'Log call outcomes, stage changes, and follow-up notes immediately after hanging up.',
  },
  {
    icon: QrCode,
    title: 'QR Code Instant Join',
    description: 'Scan a QR code or enter a 6-digit join code to pair with your workspace in under 3 seconds.',
  },
];

const phoneSteps = [
  {
    title: 'Lead Assigned',
    content: (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-brand-600">New Lead via IndiaMART</div>
        <div className="text-sm font-bold text-slate-900">Rajesh Kumar</div>
        <div className="text-xs text-slate-500">+91 98XXX XXXXX · Interested in Product Demo</div>
      </div>
    ),
  },
  {
    title: 'Calling via SIM',
    content: (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-emerald-600">Call Connected</div>
        <div className="text-sm font-bold text-slate-900">Rajesh Kumar</div>
        <div className="text-2xl font-bold text-emerald-600 font-grotesk animate-pulse">02:34</div>
        <div className="text-xs text-slate-500">Connected via SIM 1</div>
      </div>
    ),
  },
  {
    title: 'Notes Saved',
    content: (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-violet-600">Call Completed</div>
        <div className="text-sm font-bold text-slate-900">Stage → Hot Lead</div>
        <p className="text-xs text-slate-500 italic">"Wants pricing quote and GST invoice details."</p>
      </div>
    ),
  },
];

export const MobileAppPage = () => {
  const navigate = useNavigate();
  const [phoneStep, setPhoneStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPhoneStep((s) => (s + 1) % 3), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="CallMind Telecaller App — 1-Click SIM Dialing for Android"
        description="The CallMind Android app lets telecallers dial leads with one tap over their own SIM, log call outcomes, and sync to the CRM. Zero call audio stored."
        path="/mobile-app"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-20 pb-24 px-6 md:px-12 bg-white border-b border-slate-100 relative">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-8">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
              >
                <ArrowLeft size={13} /> Back to Home
              </button>
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
                  <Smartphone size={14} />
                  Telecaller Mobile App
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                Your Team's Command Center — On Every Phone
              </h1>

              <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                Telecallers get their own mobile app for SIM dialing, lead management, and post-call notes. Founders get the web dashboard.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-7 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm btn-tactile flex items-center gap-3 shadow-xl"
                >
                  <Download size={18} />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-300 uppercase tracking-wider">Get It On</div>
                    <div className="text-sm font-bold">Google Play</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-7 py-3.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all btn-tactile"
                >
                  Download APK
                </button>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center">
              <div className="w-72 bg-white rounded-[40px] p-6 border-4 border-slate-200 shadow-2xl shadow-slate-200/50 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-slate-900 font-sans">CallMind App</div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={phoneStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-slate-50 rounded-2xl p-4 min-h-[120px]"
                  >
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {phoneSteps[phoneStep].title}
                    </div>
                    {phoneSteps[phoneStep].content}
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      onClick={() => setPhoneStep(i)}
                      className={`h-1.5 rounded-full transition-all ${phoneStep === i ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                      aria-label={`Step ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QR Code Pairing Flow */}
        <section className="py-20 px-6 md:px-12 bg-slate-50 border-b border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-14">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
                Pair in Under 3 Seconds
              </h2>
              <p className="text-base text-slate-500 max-w-xl mx-auto font-medium">
                Admins generate a 6-digit join code or QR code. Telecallers scan it to instantly join the workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { step: '1', title: 'Admin Generates Code', desc: 'Click "Invite Telecaller" in Settings to get a unique 6-digit join code or QR image.' },
                { step: '2', title: 'Telecaller Scans', desc: 'Open the CallMind mobile app → tap "Join Workspace" → scan QR or enter join code.' },
                { step: '3', title: 'Instant Access', desc: 'Telecaller is paired to the workspace in under 3 seconds. Leads are assigned immediately.' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-7 rounded-2xl text-center space-y-3"
                >
                  <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center mx-auto text-white font-bold text-sm font-grotesk">
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">{s.title}</h3>
                  <p className="text-sm text-slate-500">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* App Features Grid */}
        <section className="py-20 px-6 md:px-12 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-14">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
                Built for Telecallers
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {appFeatures.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <f.icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{f.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Web vs Mobile Comparison */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-4 mb-14">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
                Web Dashboard vs Mobile App
              </h2>
              <p className="text-base text-slate-500 font-medium">
                Founders manage from the web. Telecallers execute from their phones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-8 rounded-2xl space-y-5">
                <h3 className="text-lg font-black text-slate-900 font-display">🖥️ Web Dashboard</h3>
                <p className="text-sm text-slate-500 font-medium">For Founders & Admins</p>
                <div className="space-y-2.5">
                  {['Full analytics & reports', 'Team management & quotas', 'Billing & GST invoices', 'Integration settings', 'Pipeline board overview', 'Audit logs'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 size={16} className="text-brand-600 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-8 rounded-2xl space-y-5">
                <h3 className="text-lg font-black text-slate-900 font-display">📱 Mobile App</h3>
                <p className="text-sm text-slate-500 font-medium">For Telecallers</p>
                <div className="space-y-2.5">
                  {['Assigned lead list', '1-click SIM dialing', 'Post-call notes & stages', 'Offline lead access', 'QR workspace pairing', 'Call duration auto-log'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Download CTA */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
              Get the Telecaller App
            </h2>
            <p className="text-base text-slate-500 font-medium">
              Available on Google Play Store and as a direct APK download.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="px-7 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm btn-tactile flex items-center gap-3 shadow-xl"
              >
                <Download size={18} />
                <div className="text-left">
                  <div className="text-[10px] text-slate-300 uppercase tracking-wider">Get It On</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
