import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Compass,
  Ship,
  MapPin,
} from "lucide-react";
import { VesselRecord, VesselType } from "../data/vesselsData";

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
const MapResizer: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

// Map Recenter Component
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Color mapping for vessel types
export const VESSEL_TYPE_COLORS: Record<VesselType, string> = {
  Tanker: "#EF4444", // Red
  "Bulk Carrier": "#10B981", // Green
  "Container Ship": "#3B82F6", // Blue
  "General Cargo": "#F97316", // Orange
  Other: "#64748B", // Gray/Slate
};

// Helper to create directional rotated vessel SVG markers
const createVesselMapIcon = (vessel: VesselRecord, isSelected: boolean) => {
  const color = VESSEL_TYPE_COLORS[vessel.type] || "#64748B";
  const heading = vessel.heading || 0;

  return L.divIcon({
    className: `custom-vessel-marker ${isSelected ? "selected-vessel" : ""}`,
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${
          isSelected
            ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
               <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; border: 2px dashed #EF4444;"></div>`
            : ""
        }
        <div style="
          width: ${isSelected ? "22px" : "18px"};
          height: ${isSelected ? "22px" : "18px"};
          border-radius: 9999px;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
          transition: transform 0.3s ease;
        ">
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 7.5px solid white;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// City / Coastline Label DivIcon
const createCoastLabelIcon = (cityName: string) =>
  L.divIcon({
    className: "custom-coast-label",
    html: `
      <div style="
        background: rgba(11, 37, 69, 0.85);
        backdrop-filter: blur(4px);
        color: #FFFFFF;
        font-family: Inter, sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        white-space: nowrap;
        pointer-events: none;
      ">
        ${cityName}
      </div>
    `,
    iconSize: [60, 20],
    iconAnchor: [30, 10],
  });

interface VesselsMapProps {
  vessels: VesselRecord[];
  selectedVessel: VesselRecord | null;
  onSelectVessel: (vessel: VesselRecord) => void;
}

export const VesselsMap: React.FC<VesselsMapProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
}) => {
  const [tileMode, setTileMode] = useState<"satellite" | "street">("satellite");
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([17.5, 71.2]);
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const mapRef = useRef<L.Map | null>(null);

  // Coastline & regional landmark coordinates
  const regionalLabels: { name: string; coordinates: [number, number] }[] = [
    { name: "Karachi", coordinates: [24.86, 67.0] },
    { name: "Gujarat", coordinates: [21.8, 71.4] },
    { name: "Mumbai", coordinates: [18.96, 72.82] },
    { name: "Goa", coordinates: [15.4, 73.8] },
    { name: "Mangalore", coordinates: [12.9, 74.8] },
    { name: "Lakshadweep", coordinates: [10.5, 72.6] },
  ];

  // EEZ Boundary approximation (Dashed White Polyline)
  const eezBoundaryCoords: [number, number][] = [
    [23.5, 66.5],
    [22.8, 67.2],
    [21.2, 68.4],
    [19.5, 69.8],
    [17.8, 70.8],
    [15.5, 71.5],
    [13.2, 71.8],
    [10.5, 70.5],
    [8.0, 71.2],
  ];

  // Indian Coastline guide line (Dashed white/cyan)
  const coastlineCoords: [number, number][] = [
    [23.0, 68.2],
    [22.2, 69.1],
    [20.8, 70.5],
    [20.9, 72.0],
    [19.5, 72.7],
    [18.9, 72.8],
    [16.0, 73.4],
    [15.0, 73.9],
    [12.8, 74.8],
    [10.0, 75.8],
  ];

  // Oil Slick Shape (Mumbai High Sector)
  const slickCoords: [number, number][] = [
    [19.15, 72.35],
    [19.22, 72.48],
    [19.16, 72.64],
    [18.98, 72.62],
    [18.82, 72.54],
    [18.78, 72.42],
    [18.92, 72.32],
  ];

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    setCurrentCenter([17.5, 71.2]);
    setCurrentZoom(6);
    if (mapRef.current) {
      mapRef.current.setView([17.5, 71.2], 6);
    }
  };

  const toggleTiles = () => {
    setTileMode((prev) => (prev === "satellite" ? "street" : "satellite"));
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] bg-slate-900 flex flex-col">
      {/* Top Right: Compass "N" Icon */}
      <div className="absolute top-3.5 right-3.5 z-[500] pointer-events-none">
        <div className="w-9 h-9 rounded-full bg-[#0B2545]/85 backdrop-blur-md text-white border border-white/30 flex flex-col items-center justify-center shadow-lg">
          <span className="text-[9px] font-black leading-none text-rose-400">N</span>
          <Compass className="w-4 h-4 text-white -mt-0.5" />
        </div>
      </div>

      {/* Right Vertical Control Stack */}
      <div className="absolute top-16 right-3.5 z-[500] flex flex-col gap-1.5 shadow-lg">
        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-[#0B2545] hover:bg-slate-100 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-[#0B2545] hover:bg-slate-100 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Layers (Satellite vs Street) */}
        <button
          type="button"
          onClick={toggleTiles}
          title={
            tileMode === "satellite"
              ? "Switch to OpenStreetMap"
              : "Switch to Esri Satellite Imagery"
          }
          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            tileMode === "satellite"
              ? "bg-[#1E5FBF] text-white border-sky-400"
              : "bg-white/95 backdrop-blur-md text-slate-700 border-[#E1EEF9] hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Recenter / Reset */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map View"
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-[#0B2545] hover:bg-slate-100 border border-[#E1EEF9] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Map Body */}
      <div className="w-full h-full relative">
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          zoomControl={false}
          attributionControl={false}
          ref={mapRef}
          className="w-full h-full"
        >
          <MapResizer center={currentCenter} zoom={currentZoom} />
          <MapController center={currentCenter} zoom={currentZoom} />

          {/* Base Tiles */}
          {tileMode === "satellite" ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          {/* EEZ Boundary Line (Dashed white/cyan) */}
          <Polyline
            positions={eezBoundaryCoords}
            pathOptions={{
              color: "#FFFFFF",
              weight: 2,
              dashArray: "6, 8",
              opacity: 0.75,
            }}
          />

          {/* Indian Coastline Indicator (Dashed) */}
          <Polyline
            positions={coastlineCoords}
            pathOptions={{
              color: "#38BDF8",
              weight: 1.8,
              dashArray: "4, 6",
              opacity: 0.6,
            }}
          />

          {/* Oil Slick Radial Gradient Polygon near Mumbai High */}
          <Polygon
            positions={slickCoords}
            pathOptions={{
              color: "#DC2626",
              fillColor: "#EF4444",
              fillOpacity: 0.65,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <div className="font-bold text-rose-600">Mumbai High Oil Spill Area</div>
                <div>Active Area: 276.04 km²</div>
                <div>Incident ID: IN-MH-2026</div>
              </div>
            </Popup>
          </Polygon>

          {/* Regional Coastal Landmark City Markers */}
          {regionalLabels.map((lbl) => (
            <Marker
              key={lbl.name}
              position={lbl.coordinates}
              icon={createCoastLabelIcon(lbl.name)}
            />
          ))}

          {/* Filtered AIS Vessel Markers */}
          {vessels.map((v) => {
            const isSelected = selectedVessel?.id === v.id;
            return (
              <Marker
                key={v.id}
                position={v.coordinates}
                icon={createVesselMapIcon(v, isSelected)}
                eventHandlers={{
                  click: () => onSelectVessel(v),
                }}
              >
                {/* Popup for Selected Vessel or when clicked */}
                <Popup autoPan={false}>
                  <div className="p-1 text-xs font-sans space-y-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                      <span className="font-bold text-[#0B2545]">{v.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          v.status === "Under Observation"
                            ? "bg-amber-100 text-amber-700"
                            : v.status === "Flagged"
                            ? "bg-rose-100 text-rose-700"
                            : v.status === "In AOI"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        ● {v.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      {v.type} &middot; IMO {v.imo}
                    </div>

                    <div className="text-[10px] font-mono font-semibold text-slate-700 flex justify-between">
                      <span>
                        {v.coordinates[0].toFixed(2)}°N, {v.coordinates[1].toFixed(2)}°E
                      </span>
                      <span className="text-[#1E5FBF]">{v.speedKnots} kts</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Floating Watermark: Arabian Sea */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none opacity-40">
        <span className="text-xl font-bold tracking-[0.25em] text-white/70 italic uppercase select-none">
          Arabian Sea
        </span>
      </div>

      {/* Bottom-Left Legend Card: Vessel Type with colored dot icons */}
      <div className="absolute bottom-3 left-3.5 z-[500] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#E1EEF9] shadow-lg text-[10px] text-slate-700 space-y-2">
        <div className="font-bold text-[#0B2545] border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
          <span>Vessel Type</span>
          <span className="text-[9px] text-slate-400 font-mono">({vessels.length} shown)</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-2xs" />
            <span className="font-medium text-slate-700">Tanker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-2xs" />
            <span className="font-medium text-slate-700">Bulk Carrier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-2xs" />
            <span className="font-medium text-slate-700">Container Ship</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] shadow-2xs" />
            <span className="font-medium text-slate-700">General Cargo</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] shadow-2xs" />
            <span className="font-medium text-slate-700">Other Ships</span>
          </div>
        </div>

        {/* Boundary Legend Lines */}
        <div className="pt-1 border-t border-slate-100 space-y-1 text-[9px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-4 border-b-2 border-dashed border-slate-400" />
            <span>EEZ Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 border-b-2 border-dashed border-sky-400" />
            <span>Indian Coastline</span>
          </div>
        </div>
      </div>

      {/* Bottom Scale Bar */}
      <div className="absolute bottom-3 right-3.5 z-[500] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E1EEF9] shadow-md text-[9px] font-mono text-slate-600 flex items-center gap-2 pointer-events-none">
        <span>0</span>
        <div className="w-24 h-1 bg-slate-400 rounded-full" />
        <span>200 km</span>
      </div>
    </div>
  );
};
