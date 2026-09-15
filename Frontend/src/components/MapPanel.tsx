import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon resolution with bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import {
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Navigation,
  Compass,
  Wind,
  Waves,
  Thermometer,
  RotateCcw,
  ChevronDown,
  Anchor,
  Flag,
} from "lucide-react";
import { PortSelector } from "./PortSelector";
import { INDIAN_PORTS, IndianPort } from "../data/indianPorts";
import { INCIDENT_DATA } from "../data/incidentData";

// Configure default icon fallback
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

// Custom Anchor DivIcon for Indian Ports
const createPortIcon = (isSelected: boolean) =>
  L.divIcon({
    className: "custom-port-marker",
    html: `
      <div style="
        width: ${isSelected ? "34px" : "28px"};
        height: ${isSelected ? "34px" : "28px"};
        border-radius: 9999px;
        background: ${isSelected ? "#185ADB" : "#0284C7"};
        color: white;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="3"></circle>
          <line x1="12" y1="22" x2="12" y2="8"></line>
          <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 34 : 28, isSelected ? 34 : 28],
    iconAnchor: [isSelected ? 17 : 14, isSelected ? 17 : 14],
    popupAnchor: [0, -16],
  });

// Custom Vessel DivIcon
const createVesselIcon = (isSuspect: boolean, heading: number = 312) =>
  L.divIcon({
    className: "custom-vessel-marker",
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        ${
          isSuspect
            ? `<div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="
          width: ${isSuspect ? "22px" : "18px"};
          height: ${isSuspect ? "22px" : "18px"};
          border-radius: 9999px;
          background: ${isSuspect ? "#EF4444" : "#10B981"};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
        ">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });

// Incident Constants
const INCIDENT_CENTER: [number, number] = [18.9997, 72.5502];
const DEFAULT_ZOOM = 9;

// Child controller component to access Map instance and handle resizing/zoom
const MapController: React.FC<{
  targetCoords: [number, number] | null;
  targetZoom: number;
  mapMode: "Map" | "Satellite";
  onMapInstance?: (map: L.Map) => void;
}> = ({ targetCoords, targetZoom, mapMode, onMapInstance }) => {
  const map = useMap();

  useEffect(() => {
    if (onMapInstance) onMapInstance(map);

    // Immediate and staggered size invalidations for robust container mounting
    map.invalidateSize();
    const timers = [50, 150, 350, 750, 1500].map((delay) =>
      setTimeout(() => {
        map.invalidateSize();
      }, delay)
    );

    // Window resize event handler
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    // Scroll event listener on parent scrollable container
    const container = map.getContainer();
    const scrollParent = container?.closest("main");
    const handleScroll = () => {
      map.invalidateSize();
    };
    if (scrollParent) {
      scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    }

    // ResizeObserver on the map container, parent, and scrollParent
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
      if (container.parentElement) {
        resizeObserver.observe(container.parentElement);
      }
      if (scrollParent) {
        resizeObserver.observe(scrollParent);
      }
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
      window.removeEventListener("resize", handleResize);
      if (scrollParent) {
        scrollParent.removeEventListener("scroll", handleScroll);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [map, onMapInstance]);

  // Invalidate size on mapMode toggle
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 80);
    return () => clearTimeout(t);
  }, [mapMode, map]);

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, targetZoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [targetCoords, targetZoom, map]);

  return null;
};

interface MapPanelProps {
  onOpenTrackModal?: () => void;
  onOpenInfoModal?: () => void;
  onTriggerToast?: (msg: string) => void;
}

export const MapPanel: React.FC<MapPanelProps> = ({
  onOpenTrackModal,
  onOpenInfoModal,
  onTriggerToast,
}) => {
  const [mapMode, setMapMode] = useState<"Map" | "Satellite">("Map");
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [layers, setLayers] = useState({
    oilSlick: true,
    hindcastTrack: true,
    forecastTrack: true,
    probableOrigin: true,
    vesselsAis: true,
    protectedAreas: true,
    fishingZones: true,
    ports: true,
  });
  const [noFlyRestrictedZones, setNoFlyRestrictedZones] = useState(false);
  const [selectedPort, setSelectedPort] = useState<IndianPort | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ coords: [number, number]; zoom: number }>({
    coords: INCIDENT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  const mapInstanceRef = useRef<L.Map | null>(null);
  const selectedPortMarkerRef = useRef<L.Marker | null>(null);

  // Fullscreen expansion state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Exit fullscreen on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Invalidate map size when fullscreen mode toggles
  useEffect(() => {
    const timers = [30, 100, 250, 600].map((ms) =>
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, ms)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isFullscreen]);

  // Handle Port Selection
  const handleSelectPort = (port: IndianPort) => {
    setSelectedPort(port);
    setFlyTarget({ coords: [port.lat, port.lng], zoom: 11 });
    if (onTriggerToast) {
      onTriggerToast(`Navigating to ${port.name} (${port.city})`);
    }
  };

  // Reset to Incident View
  const handleResetIncidentView = () => {
    setSelectedPort(null);
    setFlyTarget({ coords: INCIDENT_CENTER, zoom: DEFAULT_ZOOM });
    if (onTriggerToast) {
      onTriggerToast("Reset view to Mumbai High Offshore Incident");
    }
  };

  // Zoom handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Mock vessel count calculation near port
  const getNearPortVesselCount = (port: IndianPort) => {
    // Deterministic pseudo-random count between 4 and 18
    const hash = Math.round(port.lat * 10 + port.lng * 10) % 15;
    return hash + 4;
  };

  // Coordinates for Incident Polygons & Tracks
  const oilSlickPolygon: [number, number][] = [
    [19.04, 72.51],
    [19.08, 72.58],
    [19.02, 72.63],
    [18.96, 72.60],
    [18.94, 72.54],
    [18.98, 72.48],
  ];

  const probableOriginCenter: [number, number] = [18.78, 72.51];

  const hindcastTrackCoords: [number, number][] = [
    [18.78, 72.51],
    [18.84, 72.53],
    [18.91, 72.54],
    [18.9997, 72.5502],
  ];

  const forecastTrackCoords: [number, number][] = [
    [18.9997, 72.5502],
    [18.97, 72.68],
    [18.94, 72.78],
    [18.92, 72.85],
  ];

  const forecastConePolygon: [number, number][] = [
    [18.9997, 72.5502],
    [19.08, 72.82],
    [18.86, 72.88],
  ];

  const restrictedZoneCoords: [number, number][] = [
    [19.15, 72.40],
    [19.18, 72.70],
    [18.90, 72.68],
    [18.88, 72.38],
  ];

  const mpaZoneCoords: [number, number][] = [
    [18.65, 72.80],
    [18.75, 72.95],
    [18.55, 73.05],
    [18.45, 72.85],
  ];

  const fishingZoneCoords: [number, number][] = [
    [19.20, 72.50],
    [19.30, 72.75],
    [19.10, 72.85],
    [19.05, 72.60],
  ];

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[9999] bg-white flex flex-col h-screen w-screen animate-fadeIn"
          : "rounded-2xl bg-white border border-[#E1EEF9] flex flex-col shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all relative min-h-[560px] w-full z-10"
      }
    >
      {/* Top Map Control Bar */}
      <div className="p-2.5 bg-white/95 backdrop-blur-md border-b border-[#E1EEF9] flex flex-wrap items-center justify-between gap-2 relative z-[1100]">
        {/* Left Cluster: Map/Sat, Layers, Port Selector, Reset Button */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Map / Satellite Toggle */}
          <div className="flex p-0.5 rounded-xl bg-slate-100/90 border border-[#E1EEF9]">
            <button
              type="button"
              onClick={() => setMapMode("Map")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mapMode === "Map"
                  ? "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapMode("Satellite")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mapMode === "Satellite"
                  ? "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Layers (6) Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayersDropdown(!showLayersDropdown)}
              className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-[#E1EEF9] text-xs font-semibold text-slate-700 shadow-[0_2px_8px_rgba(30,95,191,0.06)] flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Layers ({Object.values(layers).filter(Boolean).length})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLayersDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-3 z-50 animate-fadeIn text-xs">
                <div className="font-bold text-[#0B2545] mb-2 pb-1 border-b border-slate-100">
                  Tactical Map Layers
                </div>
                <div className="space-y-2">
                  {[
                    { key: "oilSlick", label: "Oil Slick (Current)" },
                    { key: "hindcastTrack", label: "Hindcast Track (Past)" },
                    { key: "forecastTrack", label: "Forecast Track (Future)" },
                    { key: "probableOrigin", label: "Probable Origin Zone" },
                    { key: "vesselsAis", label: "Vessels (AIS)" },
                    { key: "ports", label: "Major Ports (Harbors)" },
                    { key: "protectedAreas", label: "Protected Areas (MPA)" },
                    { key: "fishingZones", label: "Fishing Zones" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={layers[item.key as keyof typeof layers]}
                        onChange={(e) =>
                          setLayers({ ...layers, [item.key]: e.target.checked })
                        }
                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#185ADB] accent-[#185ADB]"
                      />
                      <span className="text-slate-700 text-xs">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Port Selector Dropdown */}
          <PortSelector
            onSelectPort={handleSelectPort}
            selectedPortName={selectedPort?.name}
          />

          {/* Contextual Back to Incident Button — only appears when navigated away */}
          {selectedPort && (
            <button
              type="button"
              id="back-to-incident-button"
              onClick={handleResetIncidentView}
              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer animate-fadeIn"
              title="Return to Mumbai High Offshore Incident View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Back to Incident</span>
            </button>
          )}
        </div>

        {/* Right Cluster: No-Fly Toggle & Fullscreen */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
              No-Fly / Restricted Zones
            </span>
            <input
              type="checkbox"
              checked={noFlyRestrictedZones}
              onChange={(e) => setNoFlyRestrictedZones(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#185ADB] relative cursor-pointer" />
          </label>

          <button
            type="button"
            id="fullscreen-map-button"
            onClick={() => {
              const nextState = !isFullscreen;
              setIsFullscreen(nextState);
              if (onTriggerToast) {
                onTriggerToast(
                  nextState
                    ? "Map expanded to full screen (Press Esc or click Exit to collapse)."
                    : "Map collapsed back to panel view."
                );
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isFullscreen
                ? "bg-[#0B2545] hover:bg-[#143966] text-white border-[#0B2545] shadow-sm"
                : "bg-white hover:bg-slate-50 border border-[#E1EEF9] text-slate-700 shadow-[0_2px_8px_rgba(30,95,191,0.06)]"
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="text-xs">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Body Container with defined explicit height and overflow-hidden for map canvas */}
      <div
        className={
          isFullscreen
            ? "relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden z-0"
            : "relative w-full h-[550px] min-h-[500px] overflow-hidden rounded-b-2xl z-0"
        }
      >
        <MapContainer
          center={INCIDENT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{
            width: "100%",
            height: isFullscreen ? "100%" : "550px",
            minHeight: isFullscreen ? "100%" : "500px",
          }}
        >
          {/* Dynamic Map Controller */}
          <MapController
            targetCoords={flyTarget.coords}
            targetZoom={flyTarget.zoom}
            mapMode={mapMode}
            onMapInstance={(map) => {
              mapInstanceRef.current = map;
            }}
          />

          {/* Conditional Tile Layers (Map vs Satellite) */}
          {mapMode === "Map" ? (
            <TileLayer
              key="osm-map-layer"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              subdomains={["a", "b", "c"]}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          ) : (
            <TileLayer
              key="esri-satellite-layer"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              maxNativeZoom={18}
              maxZoom={19}
            />
          )}

          {/* 1. Oil Slick Polygon Layer */}
          {layers.oilSlick && (
            <Polygon
              positions={oilSlickPolygon}
              pathOptions={{
                color: "#EF4444",
                fillColor: "#DC2626",
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-rose-600">Active Hydrocarbon Slick</div>
                  <div className="text-[11px] text-slate-600">Area: 276.04 km²</div>
                  <div className="text-[10px] text-slate-500 font-mono">18.9997°N, 72.5502°E</div>
                </div>
              </Popup>
            </Polygon>
          )}

          {/* 2. Probable Origin Zone Circle */}
          {layers.probableOrigin && (
            <Circle
              center={probableOriginCenter}
              radius={7000}
              pathOptions={{
                color: "#F59E0B",
                fillColor: "#FBBF24",
                fillOpacity: 0.25,
                weight: 2,
                dashArray: "4 4",
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-amber-600">Probable Origin Zone</div>
                  <div className="text-[10px] text-slate-600">Time Window: T-18 to T-30 h</div>
                  <div className="text-[10px] text-slate-500 font-mono">18.78°N, 72.51°E</div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* 3. Hindcast Track (Past) */}
          {layers.hindcastTrack && (
            <Polyline
              positions={hindcastTrackCoords}
              pathOptions={{
                color: "#F59E0B",
                weight: 3,
                dashArray: "6 6",
              }}
            />
          )}

          {/* 4. Forecast Track (Future) & Dispersion Cone */}
          {layers.forecastTrack && (
            <>
              <Polyline
                positions={forecastTrackCoords}
                pathOptions={{
                  color: "#38BDF8",
                  weight: 3,
                  dashArray: "4 4",
                }}
              />
              <Polygon
                positions={forecastConePolygon}
                pathOptions={{
                  color: "#F59E0B",
                  fillColor: "#EF4444",
                  fillOpacity: 0.3,
                  weight: 1,
                  dashArray: "2 2",
                }}
              />
            </>
          )}

          {/* 5. Restricted No-Fly Zone */}
          {noFlyRestrictedZones && (
            <Polygon
              positions={restrictedZoneCoords}
              pathOptions={{
                color: "#F43F5E",
                fillColor: "#F43F5E",
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "5 5",
              }}
            >
              <Popup>
                <div className="text-xs p-1 font-bold text-rose-600">
                  RESTRICTED MARITIME &amp; AIRSPACE SAFETY ZONE
                </div>
              </Popup>
            </Polygon>
          )}

          {/* 6. Marine Protected Area (MPA) */}
          {layers.protectedAreas && (
            <Polygon
              positions={mpaZoneCoords}
              pathOptions={{
                color: "#0284C7",
                fillColor: "#38BDF8",
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: "4 3",
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-sky-600">Marine Protected Area (Sanctuary)</div>
                  <div className="text-[10px] text-slate-500">12.3% overlap projected</div>
                </div>
              </Popup>
            </Polygon>
          )}

          {/* 7. Fishing Zone */}
          {layers.fishingZones && (
            <Polygon
              positions={fishingZoneCoords}
              pathOptions={{
                color: "#10B981",
                fillColor: "#34D399",
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: "3 3",
              }}
            />
          )}

          {/* 8. AIS Vessels Layer */}
          {layers.vesselsAis && (
            <>
              {/* Primary Suspect: MT PACIFIC VOYAGER */}
              <Marker
                position={[18.98, 72.58]}
                icon={createVesselIcon(true, 312)}
              >
                <Popup className="tactical-vessel-popup" minWidth={240}>
                  <div className="text-slate-800 p-1">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1.5">
                      <div className="text-xs font-bold text-[#0B2545] flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-slate-500 shrink-0 inline mr-1" />
                        <span>MT PACIFIC VOYAGER</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                        98.8% Suspect
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono mb-2">
                      IMO 9438200 &nbsp;|&nbsp; Crude Oil Tanker
                    </div>

                    <div className="w-full h-16 rounded-lg overflow-hidden border border-slate-200 mb-2">
                      <img src="/tanker.jpg" alt="Tanker" className="w-full h-full object-cover" />
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-center border-t border-slate-100 pt-1.5 mb-2">
                      <div>
                        <div className="text-slate-400">Speed</div>
                        <div className="font-bold text-rose-600">1.4 kts</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Course</div>
                        <div className="font-bold text-[#0B2545]">312°</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Last AIS</div>
                        <div className="font-bold text-slate-700">16:42 UTC</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={onOpenTrackModal}
                        className="py-1 px-2 rounded-lg bg-[#185ADB] text-[10px] font-bold text-white text-center cursor-pointer shadow-2xs"
                      >
                        View Track
                      </button>
                      <button
                        type="button"
                        onClick={onOpenInfoModal}
                        className="py-1 px-2 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 text-center cursor-pointer shadow-2xs"
                      >
                        More Info &rarr;
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Other AIS Vessels in sector */}
              <Marker position={[19.12, 72.45]} icon={createVesselIcon(false, 148)}>
                <Popup>
                  <div className="text-xs p-1">
                    <div className="font-bold text-[#0B2545]">CMA CGM ANTARES</div>
                    <div className="text-[10px] text-slate-500">Container Vessel · 14.8 kts</div>
                  </div>
                </Popup>
              </Marker>

              <Marker position={[18.82, 72.35]} icon={createVesselIcon(false, 180)}>
                <Popup>
                  <div className="text-xs p-1">
                    <div className="font-bold text-[#0B2545]">MV NORDIC TRADER</div>
                    <div className="text-[10px] text-slate-500">Bulk Carrier · 11.2 kts</div>
                  </div>
                </Popup>
              </Marker>

              <Marker position={[19.22, 72.65]} icon={createVesselIcon(false, 45)}>
                <Popup>
                  <div className="text-xs p-1">
                    <div className="font-bold text-[#0B2545]">SAGAR SHAKTI</div>
                    <div className="text-[10px] text-slate-500">Supply Vessel · 9.1 kts</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* 9. Major Indian Ports Markers */}
          {layers.ports &&
            INDIAN_PORTS.map((port) => {
              const isSelected = selectedPort?.name === port.name;
              const nearVesselCount = getNearPortVesselCount(port);

              return (
                <Marker
                  key={port.name}
                  position={[port.lat, port.lng]}
                  icon={createPortIcon(isSelected)}
                  ref={(ref) => {
                    if (isSelected) selectedPortMarkerRef.current = ref;
                  }}
                >
                  <Popup minWidth={210}>
                    <div className="text-slate-800 p-1">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 mb-1.5">
                        <Anchor className="w-4 h-4 text-sky-600 shrink-0" />
                        <div className="text-xs font-bold text-[#0B2545] leading-tight">
                          {port.name}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2">
                        {port.city}
                      </div>

                      <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-xs mb-2">
                        <div className="text-[10px] text-slate-500 font-sans">
                          Active Shipping Traffic
                        </div>
                        <div className="font-bold text-[#185ADB] mt-0.5">
                          {nearVesselCount} vessels currently near port (&lt;50km)
                        </div>
                      </div>

                      <div className="text-[9px] font-mono text-slate-400 mb-2">
                        Coords: {port.lat.toFixed(4)}°N, {port.lng.toFixed(4)}°E
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onTriggerToast) {
                            onTriggerToast(`Viewing Port Operations telemetry for ${port.name}`);
                          }
                        }}
                        className="w-full py-1 px-2 rounded-lg bg-[#0B2545] hover:bg-[#143966] text-white text-[10px] font-bold text-center cursor-pointer transition-colors shadow-2xs"
                      >
                        Inspect Port Operations &rarr;
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        {/* Environmental Conditions Mini-Card (Bottom-Left Floating Overlay) */}
        <div className="absolute bottom-3 left-3 bg-[#0B1D35]/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-2.5 shadow-xl text-[10px] text-white z-[500] max-w-[270px] pointer-events-auto">
          <div className="flex items-center gap-1.5 font-bold text-slate-200 pb-1 border-b border-slate-700/50 mb-1.5">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Environmental Conditions</span>
          </div>
          <div className="text-[9px] text-slate-300 font-mono mb-1">
            12 Sep 2026 17:00 UTC
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-sky-400" />
              <span>5.1 m/s (289°W)</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span>0.67 m/s (189°S)</span>
            </div>
            <div className="flex items-center gap-1">
              <Waves className="w-3 h-3 text-sky-300" />
              <span>1.0 m waves</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span>28.3°C SST</span>
            </div>
          </div>
        </div>

        {/* Tactical Scale Bar */}
        <div className="absolute bottom-3 left-[285px] hidden md:flex items-center gap-2 bg-[#0B1D35]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/60 text-[9px] font-mono text-slate-200 z-[500] pointer-events-none shadow-lg">
          <div className="w-14 border-b-2 border-l border-r border-sky-400 h-1.5" />
          <span>0 &nbsp; 25 &nbsp; 50 km</span>
        </div>

        {/* Zoom Controls (+ / - / Recenter) */}
        <div className="absolute right-3 bottom-12 flex flex-col gap-1.5 z-[1000]">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetIncidentView}
            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer"
            title="Recenter to Incident"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tactical Legend (Bottom-Right Overlay) */}
        <div className="absolute bottom-3 right-3 bg-[#0B1D35]/90 backdrop-blur-md border border-slate-700 rounded-2xl p-2.5 shadow-xl text-[9px] text-slate-200 z-[1000] max-w-[200px]">
          <div className="font-bold text-white mb-1 border-b border-slate-700/60 pb-0.5">
            Tactical Legend
          </div>
          <div className="grid grid-cols-1 gap-1 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span>Oil Slick (Current)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 border-b-2 border-dashed border-amber-400 shrink-0" />
              <span>Hindcast Track (Past)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 border-b-2 border-dashed border-sky-400 shrink-0" />
              <span>Forecast Track (Future)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded border border-dashed border-amber-400 shrink-0" />
              <span>Probable Origin Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rotate-45 bg-emerald-500 shrink-0" />
              <span>Vessels (AIS)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-white shrink-0" />
              <span>Indian Major Ports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
