import React from 'react';
import { RentStatusType } from '../../types';
import { useLanguage } from '../../i18n';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: RentStatusType;
  isDueToday?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isDueToday = false,
  className = '',
  size = 'md'
}) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-bold gap-2'
  };

  if (status === 'paid') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ${sizeClasses[size]} ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{t.paid}</span>
      </span>
    );
  }

  if (status === 'overdue') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm animate-pulse ${sizeClasses[size]} ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>{t.overdue}</span>
      </span>
    );
  }

  // Pending
  if (isDueToday) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-sm ${sizeClasses[size]} ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>{t.dueToday}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span>{t.pending}</span>
    </span>
  );
};
