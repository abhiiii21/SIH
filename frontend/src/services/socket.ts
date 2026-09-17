const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

export interface LiveVesselPositionMessage {
  type: "POSITION_UPDATE";
  vessel_id: number;
  vessel_name: string;
  coordinates: [number, number]; // [lng, lat]
  speed_kts: number;
  heading_deg: number;
  timestamp: number;
}

export class SahayyaWebSocketClient {
  private vesselSocket: WebSocket | null = null;
  private incidentSockets: Map<string, WebSocket> = new Map();
  private vesselListeners: ((msg: LiveVesselPositionMessage) => void)[] = [];
  private isReconnecting: boolean = false;

  // Subscribe to live fleet vessel position updates
  public subscribeVesselPositions(callback: (msg: LiveVesselPositionMessage) => void): () => void {
    this.vesselListeners.push(callback);
    if (!this.vesselSocket || this.vesselSocket.readyState === WebSocket.CLOSED) {
      this.initVesselSocket();
    }

    return () => {
      this.vesselListeners = this.vesselListeners.filter((cb) => cb !== callback);
      if (this.vesselListeners.length === 0 && this.vesselSocket) {
        this.vesselSocket.close();
        this.vesselSocket = null;
      }
    };
  }

  private initVesselSocket() {
    try {
      this.vesselSocket = new WebSocket(`${WS_BASE_URL}/ws/vessel-positions`);

      this.vesselSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "POSITION_UPDATE") {
            this.vesselListeners.forEach((cb) => cb(data));
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      this.vesselSocket.onclose = () => {
        if (this.vesselListeners.length > 0 && !this.isReconnecting) {
          this.isReconnecting = true;
          setTimeout(() => {
            this.isReconnecting = false;
            this.initVesselSocket();
          }, 3000);
        }
      };

      this.vesselSocket.onerror = () => {
        // Socket closed/failed, gracefully fallback
      };
    } catch (e) {
      // WebSocket server not accessible
    }
  }

  // Subscribe to incident status and activity updates
  public subscribeIncident(incidentId: string | number, onMessage: (data: any) => void): () => void {
    const key = String(incidentId);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws/incidents/${key}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {}
      };
      this.incidentSockets.set(key, ws);
    } catch (e) {}

    return () => {
      if (ws) {
        ws.close();
        this.incidentSockets.delete(key);
      }
    };
  }
}

export const sahayyaSocket = new SahayyaWebSocketClient();
export default sahayyaSocket;
