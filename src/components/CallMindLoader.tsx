import React from 'react';
import { Loader2 } from 'lucide-react';

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

  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 48,
    lg: 64
  };

  const hasGlassBackground = size === 'md' || size === 'lg';

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${hasGlassBackground ? 'bg-white/60 backdrop-blur-md rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80' : ''} ${className}`}>
      <Loader2 className="text-brand-600 animate-spin" size={sizeMap[size]} />
      {text && (
        <p className={`text-brand-600 font-medium animate-pulse ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default CallMindLoader;
