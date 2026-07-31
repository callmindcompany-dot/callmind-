import React from 'react';
import { Phone } from 'lucide-react';

export interface CallMindPulseLoaderProps {
  text?: string;
  className?: string;
}

export const CallMindPulseLoader: React.FC<CallMindPulseLoaderProps> = ({
  text = 'SIM Telecalling Engine Syncing...',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-5 p-8 bg-white/90 backdrop-blur-md rounded-[32px] border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}>
      
      {/* Outer Pulse Container */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        
        {/* Signal Waves */}
        <div className="absolute inset-0 rounded-full bg-brand-500/20 callmind-pulse-wave" />
        <div className="absolute inset-0 rounded-full bg-brand-600/15 callmind-pulse-wave [animation-delay:0.6s]" />
        <div className="absolute inset-0 rounded-full bg-purple-500/10 callmind-pulse-wave [animation-delay:1.2s]" />

        {/* Orbit Path Track */}
        <div className="absolute w-20 h-20 rounded-full border border-dashed border-brand-200/60" />

        {/* Revolving Orbit Particles */}
        <div className="absolute inset-0 flex items-center justify-center callmind-orbit-particle pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-brand-600 shadow-md shadow-brand-500/40 ring-2 ring-white" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center callmind-orbit-particle [animation-delay:-1.6s] pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-purple-600 shadow-md shadow-purple-500/40 ring-2 ring-white" />
        </div>

        {/* Center Badge */}
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-white/40">
          <Phone size={20} className="text-white animate-bounce" />
        </div>
      </div>

      {/* Brand Title & Status Text */}
      <div className="flex flex-col items-center text-center space-y-1">
        <span className="text-base font-black text-slate-900 font-display tracking-tight">
          CallMind<span className="text-brand-500">.</span>
        </span>
        <p className="text-xs font-semibold text-brand-600 font-sans animate-pulse">
          {text}
        </p>
      </div>
    </div>
  );
};

export default CallMindPulseLoader;
