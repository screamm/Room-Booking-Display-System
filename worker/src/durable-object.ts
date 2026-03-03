import type { Env } from './index';

export class BookingsBroadcaster implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // Called by Worker to broadcast a booking change to all connected clients
    if (request.method === 'POST' && new URL(request.url).pathname === '/broadcast') {
      const sockets = this.state.getWebSockets();
      const message = JSON.stringify({ type: 'bookings-updated' });
      for (const ws of sockets) {
        try {
          ws.send(message);
        } catch {
          // Socket already closed — DO cleanup handles it
        }
      }
      return new Response('ok');
    }

    // WebSocket upgrade — client wants real-time updates for this room
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // acceptWebSocket enables hibernation: DO can sleep between messages
    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Called by DO runtime on incoming message (ping/pong keepalive)
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (message === 'ping') ws.send('pong');
  }

  webSocketClose(_ws: WebSocket): void {
    // DO runtime handles cleanup automatically with hibernation
  }

  webSocketError(_ws: WebSocket, error: unknown): void {
    console.error('BookingsBroadcaster WebSocket error:', error);
  }
}
