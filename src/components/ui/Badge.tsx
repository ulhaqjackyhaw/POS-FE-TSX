import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    md: 'text-sm px-3.5 py-1.5 gap-2 font-extrabold',
    lg: 'text-base px-4 py-2 gap-2.5 font-black',
  }[size];

  const variantClasses = {
    success: 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm',
    warning: 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm',
    danger: 'bg-rose-100 text-rose-900 border border-rose-300 shadow-sm',
    info: 'bg-sky-100 text-sky-900 border border-sky-300 shadow-sm',
    neutral: 'bg-slate-200 text-slate-900 border border-slate-300 shadow-sm',
    purple: 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} ${variantClasses} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
