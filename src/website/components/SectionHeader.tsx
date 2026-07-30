import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  /** Optional pill badge above the heading. */
  badge?: { icon?: LucideIcon; text: string };
  /** Heading text. Accepts JSX so callers can highlight part of it. */
  title: React.ReactNode;
  /** Optional supporting line below the heading. */
  subtitle?: React.ReactNode;
  align?: 'center' | 'left';
  /** 'dark' recolours text for use on slate-900/950 sections. */
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * The canonical section header (pill badge + h2 + subtitle).
 *
 * This markup was previously copy-pasted into ~19 files, which had drifted into
 * five pill variants and two heading sizes. Routing them all through this
 * component fixes the size on `text-3xl md:text-5xl` and keeps the badge
 * consistent. For page hero headings (h1) use the page's own markup — this is
 * for in-page sections.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  subtitle,
  align = 'center',
  theme = 'light',
  className = '',
}) => {
  const isCenter = align === 'center';
  const isDark = theme === 'dark';
  const BadgeIcon = badge?.icon;

  return (
    <div
      className={`space-y-4 ${isCenter ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'} ${className}`}
    >
      {badge && (
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold ${
            isDark
              ? 'bg-white/10 border border-white/15 text-brand-200'
              : 'bg-brand-50 border border-brand-100 text-brand-700'
          }`}
        >
          {BadgeIcon && <BadgeIcon size={14} className={isDark ? 'text-brand-300' : 'text-brand-600'} />}
          <span>{badge.text}</span>
        </div>
      )}

      <h2
        className={`text-3xl md:text-5xl font-black tracking-tight font-display leading-[1.1] ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>

      {subtitle && (
        <p className={`text-base font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
