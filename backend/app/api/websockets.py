import asyncio
import json
import math
import random
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.incident_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def connect_incident(self, incident_id: str, websocket: WebSocket):
        await websocket.accept()
        if incident_id not in self.incident_connections:
            self.incident_connections[incident_id] = []
        self.incident_connections[incident_id].append(websocket)

    def disconnect_incident(self, incident_id: str, websocket: WebSocket):
        if incident_id in self.incident_connections and websocket in self.incident_connections[incident_id]:
            self.incident_connections[incident_id].remove(websocket)

    async def broadcast_vessel_update(self, data: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

    async def broadcast_incident_update(self, incident_id: str, data: Dict[str, Any]):
        conns = self.incident_connections.get(incident_id, [])
        for connection in list(conns):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect_incident(incident_id, connection)


ws_manager = ConnectionManager()


@router.websocket("/ws/vessel-positions")
async def websocket_vessel_positions(websocket: WebSocket):
    """
    Pushes periodic simulated live AIS position updates every 3-5 seconds
    to animate vessel positions across Indian waters in real-time on the map.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial confirmation
        await websocket.send_json({"type": "CONNECTION_ESTABLISHED", "message": "Live AIS position stream active"})
        
        # Sample vessels to simulate live drift for
        vessel_sim_pool = [
            {"id": 1, "name": "MT Pacific Voyager", "lat": 18.78, "lng": 72.51, "speed": 14.8, "heading": 215.0},
            {"id": 2, "name": "MV Gujarat Glory", "lat": 22.95, "lng": 69.85, "speed": 12.2, "heading": 135.0},
            {"id": 3, "name": "C/V Chennai Express", "lat": 13.25, "lng": 80.38, "speed": 16.5, "heading": 45.0},
            {"id": 4, "name": "ICGS Vikram", "lat": 18.84, "lng": 72.62, "speed": 18.0, "heading": 270.0},
            {"id": 5, "name": "MV Iron Baron", "lat": 18.92, "lng": 72.48, "speed": 11.5, "heading": 180.0},
        ]

        while True:
            await asyncio.sleep(4.0)
            # Pick a vessel to update
            target = random.choice(vessel_sim_pool)
            speed_knots = target["speed"]
            heading = target["heading"]

            # Small step displacement (4 seconds of transit)
            dist_deg = (speed_knots * 0.000514444 * 4.0) / 111320.0
            rad = math.radians(heading)
            target["lat"] = round(target["lat"] + dist_deg * math.cos(rad), 5)
            target["lng"] = round(target["lng"] + dist_deg * math.sin(rad), 5)
            # Small jitter in heading
            target["heading"] = round((target["heading"] + random.uniform(-2.0, 2.0)) % 360.0, 1)

            payload = {
                "type": "POSITION_UPDATE",
                "vessel_id": target["id"],
                "vessel_name": target["name"],
                "coordinates": [target["lng"], target["lat"]],
                "speed_kts": target["speed"],
                "heading_deg": target["heading"],
                "timestamp": asyncio.get_event_loop().time()
            }
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@router.websocket("/ws/incidents/{incident_id}")
async def websocket_incident_stream(websocket: WebSocket, incident_id: str):
    """
    Subscribes to live operational updates, new activity logs, or status changes
    for a specific incident.
    """
    await ws_manager.connect_incident(incident_id, websocket)
    try:
        await websocket.send_json({
            "type": "SUBSCRIBED",
            "incident_id": incident_id,
            "status": "connected"
        })
        while True:
            # Keep socket alive and echo any incoming telemetry or comments
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                await websocket.send_json({"type": "ACK", "received": parsed})
            except Exception:
                await websocket.send_json({"type": "ACK", "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect_incident(incident_id, websocket)
    except Exception:
        ws_manager.disconnect_incident(incident_id, websocket)
