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
import {
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  MapPin,
  Compass,
  Navigation,
  Box,
  X,
} from "lucide-react";

// Fix Leaflet default marker icons
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

// Map Invalidation helper to prevent gray tiles
const MapResizer: React.FC<{ is3D: boolean }> = ({ is3D }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map, is3D]);
  return null;
};

// Custom Vessel Icon
const createMiniVesselIcon = (color: string, heading: number = 312) =>
  L.divIcon({
    className: "mini-vessel-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading}deg);
      ">
        <div style="width: 0; height: 0; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent; border-bottom: 7px solid white;"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// Coastline City Label Icon
const createCityLabelIcon = (name: string) =>
  L.divIcon({
    className: "city-label-marker",
    html: `
      <div style="
        background: rgba(11, 37, 69, 0.85);
        backdrop-filter: blur(4px);
        color: #FFFFFF;
        font-family: Inter, sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        white-space: nowrap;
      ">
        ${name}
      </div>
    `,
    iconSize: [60, 20],
    iconAnchor: [30, 10],
  });

interface IncidentMiniMapProps {
  onNavigateToFullMap?: () => void;
}

export const IncidentMiniMap: React.FC<IncidentMiniMapProps> = ({ onNavigateToFullMap }) => {
  const [tileMode, setTileMode] = useState<"street" | "satellite">("street");
  const [is3D, setIs3D] = useState(false);
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Geographic coordinates for Mumbai High incident
  const mapCenter: [number, number] = [19.05, 72.35];
  const originCoord: [number, number] = [18.78, 72.51];
  const spillCenter: [number, number] = [18.9997, 72.5502];

  // Slick Polygon Geometry
  const slickPolygon: [number, number][] = [
    [19.12, 72.38],
    [19.18, 72.52],
    [19.10, 72.68],
    [18.92, 72.65],
    [18.82, 72.58],
    [18.80, 72.45],
    [18.92, 72.36],
  ];

  // Forecast Drift Trajectory
  const forecastTrack: [number, number][] = [
    [18.9997, 72.5502],
    [18.91, 72.62],
    [18.84, 72.71],
    [18.76, 72.82],
    [18.68, 72.91], // Approaches Alibaug / Raigad coast
  ];

  // Vessel Candidate Positions
  const suspectVessel: [number, number] = [19.02, 72.46];
  const containerVessel: [number, number] = [19.35, 72.15];

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const toggleTileMode = () => {
    setTileMode((prev) => (prev === "street" ? "satellite" : "street"));
  };

  return (
    <>
      <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] bg-slate-100 flex flex-col">
        {/* Floating Top Label */}
        <div className="absolute top-2.5 left-2.5 z-[500] pointer-events-none">
          <div className="bg-[#0B2545]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl shadow-md border border-white/20 flex items-center gap-1.5 text-[11px] font-bold">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Spill Center 18.78°N, 72.51°E</span>
          </div>
        </div>

        {/* Right Vertical Control Stack */}
        <div className="absolute top-2.5 right-2.5 z-[500] flex flex-col gap-1.5 shadow-md">
          {/* 3D Toggle Button */}
          <button
            type="button"
            onClick={() => setIs3D(!is3D)}
            title="Toggle Tactical 3D Perspective"
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] transition-all cursor-pointer border ${
              is3D
                ? "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white border-sky-400 shadow-sm"
                : "bg-white/95 backdrop-blur-sm text-[#0B2545] border-[#E1EEF9] hover:bg-slate-50"
            }`}
          >
            3D
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-sm text-slate-700 hover:text-[#0B2545] hover:bg-slate-50 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-sm text-slate-700 hover:text-[#0B2545] hover:bg-slate-50 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Tile Layer Toggle */}
          <button
            type="button"
            onClick={toggleTileMode}
            title={tileMode === "street" ? "Switch to Esri Satellite Imagery" : "Switch to OpenStreetMap"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
              tileMode === "satellite"
                ? "bg-sky-500 text-white border-sky-600"
                : "bg-white/95 backdrop-blur-sm text-slate-700 border-[#E1EEF9] hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToFullMap) {
                onNavigateToFullMap();
              } else {
                setIsFullscreenModal(true);
              }
            }}
            title="Expand Full Interactive Tactical Map"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-sm text-slate-700 hover:text-[#0B2545] hover:bg-slate-50 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Map Container Canvas */}
        <div
          className={`w-full h-full transition-transform duration-500 ${
            is3D ? "scale-105 rotate-x-12 origin-bottom shadow-2xl" : ""
          }`}
          style={is3D ? { transform: "perspective(700px) rotateX(20deg)" } : undefined}
        >
          <MapContainer
            center={mapCenter}
            zoom={7}
            zoomControl={false}
            attributionControl={false}
            ref={mapRef}
            className="w-full h-full"
          >
            <MapResizer is3D={is3D} />

            {tileMode === "street" ? (
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            ) : (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            )}

            {/* Slick Polygon */}
            <Polygon
              positions={slickPolygon}
              pathOptions={{
                color: "#DC2626",
                fillColor: "#EF4444",
                fillOpacity: 0.55,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs font-sans">
                  <div className="font-bold text-rose-600">Active Hydrocarbon Slick</div>
                  <div>Area: 276.04 km²</div>
                  <div>Detected: 12 Sep 17:00 UTC</div>
                </div>
              </Popup>
            </Polygon>

            {/* Forecast Drift Track */}
            <Polyline
              positions={forecastTrack}
              pathOptions={{
                color: "#0EA5B7",
                weight: 2.5,
                dashArray: "6, 6",
              }}
            />

            {/* Probable Origin Point */}
            <Circle
              center={originCoord}
              radius={8000}
              pathOptions={{
                color: "#F59E0B",
                fillColor: "#FBBF24",
                fillOpacity: 0.4,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs font-sans">
                  <div className="font-bold text-amber-600">Probable Origin Zone</div>
                  <div>18.78°N, 72.51°E</div>
                  <div>Hindcast window: T - 18h to T - 30h</div>
                </div>
              </Popup>
            </Circle>

            {/* Suspect Vessel Marker */}
            <Marker position={suspectVessel} icon={createMiniVesselIcon("#EF4444", 312)}>
              <Popup>
                <div className="text-xs font-sans font-bold text-rose-600">
                  #1 MT PACIFIC VOYAGER (98.8%)
                </div>
              </Popup>
            </Marker>

            {/* Secondary Vessel Marker */}
            <Marker position={containerVessel} icon={createMiniVesselIcon("#10B981", 148)}>
              <Popup>
                <div className="text-xs font-sans font-bold text-slate-700">
                  #2 CMA CGM ANTARES (43.5%)
                </div>
              </Popup>
            </Marker>

            {/* Coastline Labels */}
            <Marker position={[20.5, 72.9]} icon={createCityLabelIcon("Gujarat Coast")} />
            <Marker position={[18.96, 72.82]} icon={createCityLabelIcon("Mumbai")} />
          </MapContainer>
        </div>

        {/* Bottom-Left Tactical Legend */}
        <div className="absolute bottom-2.5 left-2.5 z-[500] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E1EEF9] shadow-md text-[10px] text-slate-700 space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
              <span className="font-semibold text-[#0B2545]">Current Slick</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5B7] shadow-2xs" />
              <span className="font-semibold text-[#0B2545]">Forecast (24h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
              <span className="font-semibold text-[#0B2545]">Probable Origin</span>
            </div>
          </div>
          {/* Scale Bar */}
          <div className="pt-0.5 flex items-center justify-between font-mono text-[9px] text-slate-400 border-t border-slate-100">
            <span>0</span>
            <div className="flex-1 mx-2 h-1 bg-slate-300 rounded-full" />
            <span>100 km</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {isFullscreenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-5xl h-[85vh] bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#E1EEF9] flex items-center justify-between bg-[#F8FBFE]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-sm text-[#0B2545]">
                  Expanded Tactical Incident Map &mdash; Mumbai High (IN-MH-2026)
                </span>
              </div>
              <button
                onClick={() => setIsFullscreenModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body with Leaflet Map */}
            <div className="flex-1 relative w-full h-full">
              <MapContainer
                center={mapCenter}
                zoom={8}
                zoomControl={true}
                className="w-full h-full"
              >
                {tileMode === "street" ? (
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                ) : (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                )}
                <Polygon
                  positions={slickPolygon}
                  pathOptions={{ color: "#DC2626", fillColor: "#EF4444", fillOpacity: 0.6 }}
                />
                <Polyline
                  positions={forecastTrack}
                  pathOptions={{ color: "#0EA5B7", weight: 3, dashArray: "6,6" }}
                />
                <Circle
                  center={originCoord}
                  radius={12000}
                  pathOptions={{ color: "#F59E0B", fillColor: "#FBBF24", fillOpacity: 0.35 }}
                />
                <Marker position={suspectVessel} icon={createMiniVesselIcon("#EF4444", 312)}>
                  <Popup>#1 MT PACIFIC VOYAGER (98.8%)</Popup>
                </Marker>
                <Marker position={containerVessel} icon={createMiniVesselIcon("#10B981", 148)}>
                  <Popup>#2 CMA CGM ANTARES (43.5%)</Popup>
                </Marker>
                <Marker position={[20.5, 72.9]} icon={createCityLabelIcon("Gujarat Coast")} />
                <Marker position={[18.96, 72.82]} icon={createCityLabelIcon("Mumbai")} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
