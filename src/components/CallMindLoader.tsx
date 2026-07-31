import React from 'react';
import { Phone } from 'lucide-react';

export interface CallMindLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  duration?: number;
  onComplete?: () => void;
}

const CallMindLoader: React.FC<CallMindLoaderProps> = ({
  size = 'md',
  text,
  className = '',
  duration,
  onComplete
}) => {
  React.useEffect(() => {
    if (duration && onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  const dimensionMap = {
    xs: 40,
    sm: 56,
    md: 80,
    lg: 104
  };

  const currentSize = dimensionMap[size] || 80;
  const hasGlassBackground = size === 'md' || size === 'lg';

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${
      hasGlassBackground 
        ? 'bg-white/90 backdrop-blur-md rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80' 
        : ''
    } ${className}`}>
      
      {/* Animated SVG Ring Container with Centered CallMind Logo */}
      <div className="relative flex items-center justify-center">
        {/* SVG Definition Gradients */}
        <svg height="0" width="0" className="absolute">
          <defs>
            <linearGradient id="callmind-blue-grad" x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3350e0" />
              <stop stopColor="#5570ee" offset="1" />
            </linearGradient>
            <linearGradient id="callmind-purple-grad" x1="0" y1="64" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5570ee" />
              <stop stopColor="#8b5cf6" offset="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Outer Spinning SVG Dashing Ring */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height={currentSize}
          width={currentSize}
          className="callmind-loader-spin"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="5"
            stroke="url(#callmind-blue-grad)"
            d="M 32 32 m 0 -27 a 27 27 0 1 1 0 54 a 27 27 0 1 1 0 -54"
            className="callmind-loader-dash"
            pathLength="360"
          />
        </svg>

        {/* Center CallMind Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-xs">
            <Phone size={15} className="text-white" />
          </div>
        </div>
      </div>

      {/* Brand Text & Status */}
      <div className="flex flex-col items-center text-center space-y-1">
        <span className="text-base font-black text-slate-900 font-display tracking-tight">
          CallMind<span className="text-brand-500">.</span>
        </span>
        
        {text ? (
          <p className="text-xs font-semibold text-brand-600 font-sans animate-pulse">
            {text}
          </p>
        ) : (
          <span className="text-[11px] font-medium text-slate-500 font-sans tracking-wide">
            Connecting workspace...
          </span>
        )}
      </div>
    </div>
  );
};

export default CallMindLoader;
