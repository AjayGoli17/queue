import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

class WebSocketService {
  private wss: WebSocketServer | null = null;

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📡 WebSocket client connected');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch {
          // ignore malformed ping
        }
      });

      ws.on('close', () => {
        console.log('📡 WebSocket client disconnected');
      });

      // Send initial welcome message
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Hospital Queue Realtime Connected' }));
    });

    console.log('🔌 WebSocket server attached on /ws');
  }

  broadcastQueueUpdate(doctorId: string = 'dr-kumar') {
    if (!this.wss) return;

    const payload = JSON.stringify({
      type: 'QUEUE_UPDATED',
      doctor_id: doctorId,
      timestamp: new Date().toISOString(),
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    console.log(`📢 Broadcasted QUEUE_UPDATED to ${this.wss.clients.size} clients`);
  }
}

export const wsService = new WebSocketService();
