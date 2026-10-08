'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeEventPayload } from '@/lib/realtime';

export type RealtimeStatus = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

interface UseRealtimeOptions {
  channels?: string[];
  onEvent?: (event: RealtimeEventPayload) => void;
  enabled?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { channels = ['global'], onEvent, enabled = true } = options;

  const [status, setStatus] = useState<RealtimeStatus>('CONNECTING' as any);
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Deduplication cache storing processed eventIds
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const channelsKey = channels.sort().join(',');

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check navigator offline state
    if (!navigator.onLine) {
      setStatus('OFFLINE');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus(retryCountRef.current > 0 ? 'RECONNECTING' : 'CONNECTING' as any);

    const queryParams = new URLSearchParams();
    channels.forEach((c) => queryParams.append('channel', c));

    const url = `/api/realtime?${queryParams.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connection', (e: MessageEvent) => {
      setStatus('CONNECTED');
      retryCountRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const payload: RealtimeEventPayload = JSON.parse(e.data);

        // Deduplication Check
        if (payload.eventId && processedEventIdsRef.current.has(payload.eventId)) {
          return; // Skip duplicate event
        }

        if (payload.eventId) {
          processedEventIdsRef.current.add(payload.eventId);
          // Keep set bounded to last 50 events
          if (processedEventIdsRef.current.size > 50) {
            const firstKey = Array.from(processedEventIdsRef.current)[0];
            processedEventIdsRef.current.delete(firstKey);
          }
        }

        setLastEvent(payload);
        if (onEvent) {
          onEvent(payload);
        }
      } catch (err) {
        // SSE parse error
      }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      if (!navigator.onLine) {
        setStatus('OFFLINE');
        return;
      }

      setStatus('RECONNECTING');
      setReconnectCount((c) => c + 1);

      // Exponential backoff reconnect logic: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [channelsKey, enabled, onEvent]);

  useEffect(() => {
    connect();

    const handleOnline = () => {
      setStatus('RECONNECTING');
      retryCountRef.current = 0;
      connect();
    };

    const handleOffline = () => {
      setStatus('OFFLINE');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    status,
    lastEvent,
    reconnectCount,
  };
}
