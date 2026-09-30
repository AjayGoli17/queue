type QueueUpdateCallback = (data: { doctor_id?: string; timestamp?: string }) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<QueueUpdateCallback> = new Set();
  private reconnectTimeout: number | null = null;
  private isConnecting: boolean = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in Vite dev server (port 3000), connect to backend (port 5001)
    const host = window.location.port === '3000' 
      ? `${window.location.hostname}:5001`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('⚡ Connected to Hospital Queue Realtime WebSocket');
        this.isConnecting = false;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'QUEUE_UPDATED') {
            console.log('🔔 Realtime Queue Update Received:', data);
            this.listeners.forEach((cb) => cb(data));
          }
        } catch {
          // ignore non-json messages
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected. Reconnecting in 2s...');
        this.ws = null;
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Failed to instantiate WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, 2000);
    }
  }

  subscribe(callback: QueueUpdateCallback): () => void {
    this.listeners.add(callback);
    this.connect();
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const wsClient = new WebSocketClient();
