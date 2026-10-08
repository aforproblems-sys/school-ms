import { NextRequest } from 'next/server';
import { realtimeEmitter, RealtimeEventPayload } from '@/lib/realtime';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const requestedChannels = searchParams.getAll('channel');
  if (searchParams.get('channel') && !requestedChannels.includes(searchParams.get('channel')!)) {
    requestedChannels.push(searchParams.get('channel')!);
  }

  // Fallback to default channels if none provided
  const channels = requestedChannels.length > 0 ? requestedChannels : ['global', 'dashboard'];

  // Authorization Check for User-Private Channels
  const authorizedChannels = channels.filter((c) => {
    if (c.startsWith('user:')) {
      const targetUserId = c.replace('user:', '');
      // Only allow if session user matches target or user is Admin
      return session?.userId === targetUserId || session?.role === 'SUPER_ADMIN' || session?.role === 'SCHOOL_ADMIN';
    }
    return true;
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to enqueue SSE message
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          // Controller might be closed
        }
      };

      // 1. Send Connection Established confirmation
      sendEvent('connection', {
        status: 'CONNECTED',
        userId: session?.userId || 'anonymous',
        channels: authorizedChannels,
        timestamp: new Date().toISOString(),
      });

      // 2. Realtime Event Listener
      const listener = (eventPayload: RealtimeEventPayload) => {
        const isAuthorized = authorizedChannels.some(
          (c) =>
            c === 'global' ||
            c === eventPayload.channel ||
            eventPayload.channel === 'global' ||
            (c.startsWith('section:') && eventPayload.channel === c)
        );

        if (isAuthorized) {
          sendEvent('message', eventPayload);
        }
      };

      realtimeEmitter.on('realtime_event', listener);

      // 3. Keep-alive ping every 15s to maintain HTTP SSE connection
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (err) {
          clearInterval(interval);
        }
      }, 15000);

      // 4. Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        realtimeEmitter.off('realtime_event', listener);
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
