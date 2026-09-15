import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  AlertTriangle,
  Ship,
  Anchor,
  Shield,
  Eye,
  ExternalLink,
} from "lucide-react";
import { ACTIVE_INCIDENTS, ActiveIncidentRecord } from "../data/incidentData";
import { VESSELS_DATA, VesselRecord } from "../data/vesselsData";

// Fix Leaflet icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Map controller for flyTo and resize invalidation
const MapController: React.FC<{
  centerTarget: [number, number] | null;
  zoomTarget?: number;
}> = ({ centerTarget, zoomTarget }) => {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    if (container) {
      ro.observe(container);
    }
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    if (centerTarget) {
      map.flyTo(centerTarget, zoomTarget || 8, { duration: 1.2 });
    }
  }, [centerTarget, zoomTarget, map]);

  return null;
};

// SVG Rotated Vessel Marker Icon
const createVesselIcon = (type: string, heading: number, isSelected: boolean) => {
  const colorMap: Record<string, string> = {
    Tanker: "#EF4444", // Red
    "Bulk Carrier": "#10B981", // Green
    "Container Ship": "#3B82F6", // Blue
    "General Cargo": "#F59E0B", // Orange
    Other: "#64748B", // Gray
  };

  const fill = colorMap[type] || "#64748B";
  const size = isSelected ? 34 : 26;

  const svgHtml = `
    <div style="transform: rotate(${heading}deg); transform-origin: center center; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px;">
      ${
        isSelected
          ? `<div style="position: absolute; width: ${size + 12}px; height: ${size + 12}px; border-radius: 50%; border: 2px solid ${fill}; opacity: 0.8; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ""
      }
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
        <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="${fill}" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="12" cy="11" r="2" fill="#FFFFFF"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: "custom-vessel-marker",
    html: svgHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// SVG Pulsing Incident Marker Icon
const createIncidentIcon = (severity: string, isSelected: boolean) => {
  const color =
    severity === "Critical"
      ? "#EF4444"
      : severity === "High"
      ? "#F97316"
      : severity === "Medium"
      ? "#F59E0B"
      : "#3B82F6";

  const size = isSelected ? 38 : 30;

  const svgHtml = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px;">
      <div style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; width: ${size - 10}px; height: ${size - 10}px; border-radius: 50%; background-color: ${color}; opacity: 0.6; animation: pulse 2s infinite;"></div>
      <div style="position: relative; width: ${size - 16}px; height: ${size - 16}px; border-radius: 50%; background-color: ${color}; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-incident-marker",
    html: svgHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Port Icon
const createPortIcon = (name: string) => {
  return L.divIcon({
    className: "custom-port-marker",
    html: `
      <div style="display: flex; align-items: center; gap: 4px; background: rgba(11, 37, 69, 0.85); color: #FFFFFF; padding: 2px 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.4); font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="3"/>
          <line x1="12" y1="22" x2="12" y2="8"/>
          <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
        </svg>
        <span>${name}</span>
      </div>
    `,
    iconSize: [80, 20],
    iconAnchor: [40, 10],
  });
};

// Major Indian Ports
const INDIAN_MAJOR_PORTS = [
  { name: "Kandla Port", pos: [23.01, 70.22] as [number, number] },
  { name: "Mumbai JNPT", pos: [18.95, 72.95] as [number, number] },
  { name: "Mormugao (Goa)", pos: [15.42, 73.80] as [number, number] },
  { name: "New Mangalore", pos: [12.92, 74.81] as [number, number] },
  { name: "Cochin Port", pos: [9.96, 76.27] as [number, number] },
  { name: "Tuticorin (V.O.C)", pos: [8.75, 78.18] as [number, number] },
  { name: "Chennai Port", pos: [13.09, 80.30] as [number, number] },
  { name: "Visakhapatnam", pos: [17.69, 83.29] as [number, number] },
  { name: "Paradip Port", pos: [20.26, 86.67] as [number, number] },
  { name: "Kolkata / Haldia", pos: [22.03, 88.08] as [number, number] },
];

// Indian EEZ Boundary coordinates (approximate representative boundary)
const INDIAN_EEZ_COORDS: [number, number][] = [
  [23.5, 68.0],
  [22.0, 66.5],
  [20.0, 66.8],
  [18.0, 68.5],
  [15.0, 70.0],
  [12.0, 71.5],
  [9.0, 72.8],
  [7.0, 75.5],
  [6.0, 77.5],
  [6.5, 80.5],
  [8.0, 82.5],
  [10.5, 84.5],
  [13.5, 86.0],
  [16.0, 87.5],
  [19.0, 89.0],
  [21.5, 89.2],
];

// Major International Shipping Corridors in Indian Ocean
const SHIPPING_CORRIDOR_WEST: [number, number][] = [
  [24.0, 62.0],
  [22.5, 66.0],
  [19.5, 70.5],
  [15.0, 72.5],
  [10.0, 75.0],
  [6.0, 77.8],
  [5.5, 80.5],
  [5.8, 85.0],
  [6.0, 93.0],
];

// Marine Protected Areas
const MALVAN_SANCTUARY_COORDS: [number, number][] = [
  [16.08, 73.40],
  [16.14, 73.48],
  [16.05, 73.55],
  [15.98, 73.46],
];

const GULF_OF_MANNAR_MPA: [number, number][] = [
  [9.25, 78.95],
  [9.35, 79.25],
  [8.95, 78.75],
  [8.80, 78.40],
];

interface NationalMapProps {
  vessels: VesselRecord[];
  incidents: ActiveIncidentRecord[];
  selectedIncidentId: string | null;
  onSelectIncident: (inc: ActiveIncidentRecord) => void;
  onSelectVessel: (vessel: VesselRecord) => void;
  flyToCoords: [number, number] | null;
  layerToggles: {
    shippingCorridors: boolean;
    ports: boolean;
    eezBoundary: boolean;
    mpas: boolean;
    fishingZones: boolean;
  };
}

export const NationalMap: React.FC<NationalMapProps> = ({
  vessels,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onSelectVessel,
  flyToCoords,
  layerToggles,
}) => {
  const [mapType, setMapType] = useState<"satellite" | "osm">("satellite");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-900">
      <MapContainer
        center={[16.0, 76.5]}
        zoom={5}
        minZoom={4}
        maxZoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapController centerTarget={flyToCoords} />

        {/* Base Tile Layer */}
        {mapType === "satellite" ? (
          <TileLayer
            key="satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            key="osm"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
        )}

        {/* EEZ Boundary */}
        {layerToggles.eezBoundary && (
          <Polyline
            positions={INDIAN_EEZ_COORDS}
            pathOptions={{
              color: "#FFFFFF",
              weight: 2,
              dashArray: "6, 8",
              opacity: 0.85,
            }}
          />
        )}

        {/* Shipping Corridors */}
        {layerToggles.shippingCorridors && (
          <Polyline
            positions={SHIPPING_CORRIDOR_WEST}
            pathOptions={{
              color: "#00F0FF",
              weight: 2.5,
              dashArray: "4, 6",
              opacity: 0.8,
            }}
          />
        )}

        {/* Marine Protected Areas (MPAs) */}
        {layerToggles.mpas && (
          <>
            <Polygon
              positions={MALVAN_SANCTUARY_COORDS}
              pathOptions={{
                color: "#10B981",
                fillColor: "#10B981",
                fillOpacity: 0.25,
                weight: 1.5,
              }}
            />
            <Polygon
              positions={GULF_OF_MANNAR_MPA}
              pathOptions={{
                color: "#10B981",
                fillColor: "#10B981",
                fillOpacity: 0.25,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* Major Ports */}
        {layerToggles.ports &&
          INDIAN_MAJOR_PORTS.map((p) => (
            <Marker
              key={p.name}
              position={p.pos}
              icon={createPortIcon(p.name)}
            />
          ))}

        {/* Active Incident Markers */}
        {incidents.map((inc) => {
          const isSel = selectedIncidentId === inc.id;
          return (
            <Marker
              key={inc.id}
              position={inc.coordinates}
              icon={createIncidentIcon(inc.severity, isSel)}
              eventHandlers={{
                click: () => onSelectIncident(inc),
              }}
            >
              <Popup className="custom-tactical-popup">
                <div className="p-3 w-64 text-slate-800">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="font-bold text-xs text-[#0B2545]">{inc.id}</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        inc.severity === "Critical"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {inc.severity} ({inc.severityScore}/100)
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-[#0B2545]">{inc.name}</div>
                  <div className="text-[10px] text-slate-500 mb-2">{inc.region}</div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg mb-2 font-mono">
                    <div>Area: <span className="font-bold text-rose-600">{inc.areaKm2} km²</span></div>
                    <div>Vessels: <span className="font-bold text-[#0B2545]">{inc.vesselsInAOI} in AOI</span></div>
                    <div className="col-span-2 text-[9px] text-slate-500">
                      Detected: {inc.detectedTime}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 mb-3 line-clamp-2">
                    {inc.description}
                  </div>

                  <a
                    href={`/incidents/${inc.id}`}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>View Full Tactical Incident</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Fleet Vessels */}
        {vessels.map((v) => (
          <Marker
            key={v.id}
            position={v.coordinates}
            icon={createVesselIcon(v.type, v.heading, false)}
            eventHandlers={{
              click: () => onSelectVessel(v),
            }}
          >
            <Popup className="custom-tactical-popup">
              <div className="p-3 w-60 text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <div className="font-bold text-xs text-[#0B2545]">{v.name}</div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    IMO {v.imo}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 mb-2">
                  {v.type} &nbsp;|&nbsp; {v.flag}
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-50 p-2 rounded-lg mb-2">
                  <div>Speed: <span className="font-bold">{v.speedKnots} kts</span></div>
                  <div>Heading: <span className="font-bold">{v.heading}°</span></div>
                  <div>Status: <span className="font-bold text-amber-600">{v.status}</span></div>
                  <div>ASI Risk: <span className="font-bold text-rose-600">{v.asiScore}%</span></div>
                </div>

                <button
                  onClick={() => onSelectVessel(v)}
                  className="w-full py-1 rounded bg-[#0B2545] hover:bg-[#1E5FBF] text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect Forensic File</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Compass "N" Top Right */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md border border-[#E1EEF9] shadow-lg flex flex-col items-center justify-center text-[#0B2545]">
          <Compass className="w-5 h-5 text-[#1E5FBF]" />
          <span className="text-[8px] font-black tracking-widest">N</span>
        </div>
      </div>

      {/* Map Control Stack (Bottom Right) */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-1.5">
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-[#E1EEF9] overflow-hidden flex flex-col divide-y divide-slate-100">
          <button
            onClick={() => setMapType(mapType === "satellite" ? "osm" : "satellite")}
            className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-[#1E5FBF] hover:bg-slate-50 transition-colors cursor-pointer"
            title={`Switch to ${mapType === "satellite" ? "Street Map" : "Satellite"}`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-[#1E5FBF] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Scale & Layer Indicators */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-[#0B2545]/85 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-white border border-white"></div>
            <span>EEZ Boundary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-cyan-400"></div>
            <span>Shipping Corridors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>MPAs</span>
          </div>
          <span>Scale: 0 &mdash; 100 &mdash; 200 km</span>
        </div>
      </div>
    </div>
  );
};
