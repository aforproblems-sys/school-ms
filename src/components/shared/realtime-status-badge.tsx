'use client';

import React from 'react';
import { RealtimeStatus } from '@/hooks/use-realtime';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface RealtimeStatusBadgeProps {
  status: RealtimeStatus;
  className?: string;
}

export function RealtimeStatusBadge({ status, className = '' }: RealtimeStatusBadgeProps) {
  if (status === 'CONNECTED') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800 animate-in fade-in-50 ${className}`}
        title="Real-time WebSockets / SSE connection active. Database changes update live."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span>Live Sync Active</span>
      </div>
    );
  }

  if (status === 'RECONNECTING') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800 animate-in fade-in-50 ${className}`}
        title="Reconnecting real-time stream using exponential backoff..."
      >
        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
        <span>Reconnecting Live Stream...</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800 animate-in fade-in-50 ${className}`}
      title="Network offline. Reconnection will resume automatically when connection recovers."
    >
      <WifiOff className="w-3 h-3 text-rose-400" />
      <span>Network Offline</span>
    </div>
  );
}
