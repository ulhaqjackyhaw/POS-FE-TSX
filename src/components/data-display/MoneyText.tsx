import React from 'react';
import { formatRupiah } from '../../utils/currency';
import { MoneyMinor } from '../../types/money';

export interface MoneyTextProps {
  amount: MoneyMinor | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'success' | 'danger' | 'muted';
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'text-sm sm:text-base font-bold',
    md: 'text-base sm:text-lg font-extrabold',
    lg: 'text-xl sm:text-2xl font-black',
    xl: 'text-2xl sm:text-3xl font-black tracking-tight',
    '2xl': 'text-3xl sm:text-4xl font-black tracking-tight',
    '3xl': 'text-4xl sm:text-5xl font-black tracking-tight',
  }[size];

  const variantClasses = {
    default: 'text-slate-900',
    success: 'text-emerald-700 font-black',
    danger: 'text-rose-700 font-black',
    muted: 'text-slate-600 font-semibold',
  }[variant];

  return <span className={`font-mono ${sizeClasses} ${variantClasses} ${className}`}>{formatRupiah(amount)}</span>;
};
