import React from 'react';
import { formatDateTime, formatDate, formatTime } from '../../utils/date';

export interface DateTimeTextProps {
  value?: string | null;
  mode?: 'datetime' | 'date' | 'time';
  className?: string;
}

export const DateTimeText: React.FC<DateTimeTextProps> = ({
  value,
  mode = 'datetime',
  className = '',
}) => {
  const formatted =
    mode === 'date'
      ? formatDate(value)
      : mode === 'time'
      ? formatTime(value)
      : formatDateTime(value);

  return <span className={`text-slate-700 font-mono text-sm sm:text-base font-semibold ${className}`}>{formatted}</span>;
};
