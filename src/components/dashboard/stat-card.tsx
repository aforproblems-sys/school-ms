import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-indigo-500',
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 text-[11px]">
          {trend && (
            <span
              className={cn(
                'font-semibold px-1.5 py-0.5 rounded text-[10px]',
                trend.isPositive
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              )}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span className="text-slate-400 font-medium truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
