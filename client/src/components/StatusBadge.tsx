import React from 'react';
import type { PatientStatus } from '../types';

interface StatusBadgeProps {
  status: PatientStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-bold tracking-wider',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'IN_CONSULTATION':
        return {
          label: 'IN CONSULTATION',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40',
          dot: 'bg-emerald-500 animate-pulse',
        };
      case 'CALLED':
        return {
          label: 'CALLED',
          bg: 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-400/40',
          dot: 'bg-blue-500 animate-ping',
        };
      case 'WAITING':
        return {
          label: 'WAITING',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'CHECKED_IN':
        return {
          label: 'CHECKED IN',
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          dot: 'bg-sky-500',
        };
      case 'BOOKED':
        return {
          label: 'BOOKED',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-600',
        };
      case 'SKIPPED':
        return {
          label: 'SKIPPED',
          bg: 'bg-orange-100 text-orange-800 border-orange-300',
          dot: 'bg-orange-500',
        };
      case 'NO_SHOW':
        return {
          label: 'NO SHOW',
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${config.bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
