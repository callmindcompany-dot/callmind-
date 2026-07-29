import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, TrendingUp, ShieldCheck, Award, Building2 } from 'lucide-react';

const testimonials = [
  {
    name: 'Vikramaditya Deshmukh',
    role: 'Managing Director',
    company: 'Astra Housing & Real Estate',
    location: 'Pune, Maharashtra',
    avatar: 'VD',
    avatarBg: 'bg-blue-600',
    rating: 5,
    metric: '+340% Lead Conversion',
    quote: 'Before CallMind, our 15 telecallers were manually typing numbers from Excel into their phones. Half the IndiaMART leads were going cold. With CallMind 1-click SIM dialing, our lead response time dropped from 4 hours to 90 seconds!',
  },
  {
    name: 'Ananya Roy',
    role: 'Head of Sales Operations',
    company: 'CapitalCare Financial Services',
    location: 'Mumbai, Maharashtra',
    avatar: 'AR',
    avatarBg: 'bg-emerald-600',
    rating: 5,
    metric: '85% Reduced Lead Rotting',
    quote: 'The automatic IndiaMART GLUSR webhook integration is a game-changer. Telecallers get instant push notifications on their Android app. We logged over 14,000 calls last month without storing any voice recordings — 100% compliant!',
  },
  {
    name: 'Rajesh Kulkarni',
    role: 'Founder & CEO',
    company: 'Apex Logistics & Freight',
    location: 'Bengaluru, Karnataka',
    avatar: 'RK',
    avatarBg: 'bg-violet-600',
    rating: 5,
    metric: '2.5x Faster First Call',
    quote: 'CallMind gave us complete visibility into daily telecaller quotas and attendance. The Kanban pipeline board makes sales reviews effortless. Best ROI of any software tool we adopted this year.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const Testimonials = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-white relative overflow-hidden font-sans border-b border-slate-100">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-brand-500/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <Award size={14} className="text-brand-600" />
            <span>Trusted by 500+ Indian Businesses</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            Loved by Sales Teams Across India
          </h2>
          <p className="text-base text-slate-500 font-medium">
            See how real estate agencies, financial services, and SME manufacturers scale telecalling revenue with CallMind.
          </p>
        </div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((item, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl space-y-6 hover:shadow-xl hover:border-brand-200 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Metric Badge & Stars */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-grotesk">
                    <TrendingUp size={12} />
                    {item.metric}
                  </span>
                </div>

                {/* Quote Text */}
                <div className="relative">
                  <Quote size={32} className="text-brand-500/15 absolute -top-3 -left-2 rotate-180" />
                  <p className="text-slate-600 text-sm leading-relaxed font-medium pt-2 pl-4 italic">
                    "{item.quote}"
                  </p>
                </div>
              </div>

              {/* Author Footer */}
              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${item.avatarBg} text-white font-bold font-display flex items-center justify-center text-sm shadow-md`}>
                  {item.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                    {item.name}
                    <ShieldCheck size={14} className="text-brand-600" />
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">{item.role} · {item.company}</p>
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                    <Building2 size={10} /> {item.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
