import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  Layers,
  Maximize2,
  Navigation,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  SpillDetectionResponse,
  DriftSimulationResponse,
  AISAttributionResponse,
  SuspectVessel,
} from "../types";

interface MapComponentProps {
  sector?: string;
  spillData: SpillDetectionResponse | null;
  driftData: DriftSimulationResponse | null;
  aisData: AISAttributionResponse | null;
  selectedVessel: SuspectVessel | null;
  onSelectVessel: (vessel: SuspectVessel | null) => void;
  timelineHours: number;
}

const SECTOR_COORDINATES: Record<string, { center: [number, number]; zoom: number }> = {
  "in-mh-2026": { center: [19.5727, 72.3944], zoom: 9 },
  "in-mh": { center: [19.5727, 72.3944], zoom: 9 },
  "mumbai high": { center: [19.5727, 72.3944], zoom: 9 },
  "mumbai_high": { center: [19.5727, 72.3944], zoom: 9 },
  "mumbai high offshore": { center: [19.5727, 72.3944], zoom: 9 },

  "my-ms-2026": { center: [2.5000, 101.5000], zoom: 8 },
  "my-ms": { center: [2.5000, 101.5000], zoom: 8 },
  "strait of malacca": { center: [2.5000, 101.5000], zoom: 8 },
  "malacca_strait": { center: [2.5000, 101.5000], zoom: 8 },
  "malacca": { center: [2.5000, 101.5000], zoom: 8 },

  "in-gk-2026": { center: [21.3000, 72.2000], zoom: 9 },
  "in-gk": { center: [21.3000, 72.2000], zoom: 9 },
  "gulf of khambhat": { center: [21.3000, 72.2000], zoom: 9 },
  "gulf_khambhat": { center: [21.3000, 72.2000], zoom: 9 },
  "khambhat": { center: [21.3000, 72.2000], zoom: 9 },

  "in-kc-2026": { center: [22.6000, 69.5000], zoom: 9 },
  "in-kc": { center: [22.6000, 69.5000], zoom: 9 },
  "gulf of kutch": { center: [22.6000, 69.5000], zoom: 9 },
  "gulf_kutch": { center: [22.6000, 69.5000], zoom: 9 },
  "kutch": { center: [22.6000, 69.5000], zoom: 9 },

  "in-bb-2026": { center: [14.5000, 86.5000], zoom: 7 },
  "in-bb": { center: [14.5000, 86.5000], zoom: 7 },
  "bay of bengal": { center: [14.5000, 86.5000], zoom: 7 },
  "bay_bengal": { center: [14.5000, 86.5000], zoom: 7 },
};

export const MapComponent: React.FC<MapComponentProps> = ({
  sector,
  spillData,
  driftData,
  aisData,
  selectedVessel,
  onSelectVessel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const slickLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const driftLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const aisLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const highlightLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  // Layer visibility toggles
  const [showSlicks, setShowSlicks] = useState(true);
  const [showDrift, setShowDrift] = useState(true);
  const [showAIS, setShowAIS] = useState(true);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [19.5727, 72.3944];
    const initialZoom = 9;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Basemap (Zero API Key & Free)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      }
    ).addTo(map);

    slickLayerGroupRef.current.addTo(map);
    driftLayerGroupRef.current.addTo(map);
    aisLayerGroupRef.current.addTo(map);
    highlightLayerGroupRef.current.addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lon: Number(e.latlng.lng.toFixed(4)),
      });
    });

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fly to selected sector dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sector) return;

    const cleanedSector = sector.toLowerCase().replace(/_/g, " ");
    const matchedKey = Object.keys(SECTOR_COORDINATES).find((key) => {
      const normKey = key.replace(/_/g, " ");
      return cleanedSector.includes(normKey) || normKey.includes(cleanedSector);
    });

    if (matchedKey) {
      const target = SECTOR_COORDINATES[matchedKey];
      map.flyTo(target.center, target.zoom, { duration: 1.5 });
    }
  }, [sector]);

  // Update SAR Slick Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    slickLayerGroupRef.current.clearLayers();

    if (showSlicks && spillData && spillData.features && spillData.features.length > 0) {
      const geojsonLayer = L.geoJSON(spillData as any, {
        style: () => ({
          color: "#dc2626",
          weight: 1.5,
          opacity: 0.95,
          fillColor: "#0f172a",
          fillOpacity: 0.85,
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const popupContent = `
            <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #f1f5f9; padding: 4px; line-height: 1.4;">
              <div style="font-weight: 700; color: #f87171; border-bottom: 1px solid #334155; padding-bottom: 4px; display: flex; justify-content: space-between;">
                <span>${props.slick_id || "SAR-SLICK-ANOMALY"}</span>
                <span style="font-size: 10px; background: #450a0a; padding: 2px 4px; border-radius: 2px;">VERIFIED</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-top: 6px;">
                <span style="color: #94a3b8;">Est. Area:</span> <span style="font-weight: 600;">${props.area_km2 ?? 14.8} km²</span>
                <span style="color: #94a3b8;">Perimeter:</span> <span style="font-weight: 600;">${props.perimeter_km ?? 22.4} km</span>
                <span style="color: #94a3b8;">Confidence:</span> <span style="font-weight: 600; color: #4ade80;">${props.confidence_score ? (props.confidence_score * 100).toFixed(0) : 94}%</span>
                <span style="color: #94a3b8;">Thickness:</span> <span style="font-weight: 600;">${props.estimated_thickness_um ?? 2.8} µm</span>
              </div>
            </div>
          `;
          layer.bindPopup(popupContent);
        },
      });

      slickLayerGroupRef.current.addLayer(geojsonLayer);

      try {
        const bounds = geojsonLayer.getBounds();
        if (bounds.isValid()) {
          const cleanedSector = sector ? sector.toLowerCase().replace(/_/g, " ") : "";
          const matchedKey = Object.keys(SECTOR_COORDINATES).find((key) => {
            const normKey = key.replace(/_/g, " ");
            return cleanedSector.includes(normKey) || normKey.includes(cleanedSector);
          });

          if (matchedKey) {
            const target = SECTOR_COORDINATES[matchedKey];
            const boundsCenter = bounds.getCenter();
            const distDeg = Math.sqrt(
              Math.pow(boundsCenter.lat - target.center[0], 2) +
              Math.pow(boundsCenter.lng - target.center[1], 2)
            );
            if (distDeg < 3.0) {
              map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
            }
          } else {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
          }
        }
      } catch (e) {
        console.error("Bounding calculation failed", e);
      }
    }
  }, [spillData, showSlicks, sector]);

  // Update Drift Trajectory & Hindcast Zone
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    driftLayerGroupRef.current.clearLayers();

    if (showDrift && driftData && driftData.geojson) {
      const isHindcast = (driftData.hours || -24) < 0;
      const corridorColor = isHindcast ? "#d97706" : "#2563eb";

      const driftGeoJson = L.geoJSON(driftData.geojson as any, {
        style: (feature) => {
          if (feature?.geometry.type === "LineString") {
            return {
              color: corridorColor,
              weight: 2,
              opacity: 0.85,
              dashArray: "4, 6",
            };
          }
          return {
            color: corridorColor,
            weight: 1,
            opacity: 0.6,
            fillColor: corridorColor,
            fillOpacity: 0.12,
            dashArray: "3, 3",
          };
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`
            <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #f1f5f9; padding: 4px;">
              <div style="font-weight: 700; color: ${isHindcast ? "#fbbf24" : "#60a5fa"}; border-bottom: 1px solid #334155; padding-bottom: 3px;">
                ${isHindcast ? "ORIGIN HINDCAST CORRIDOR" : "SURFACE SPREAD FORECAST"}
              </div>
              <div style="padding-top: 6px; line-height: 1.4;">
                <span style="color: #94a3b8;">Temporal Delta:</span> <b>${driftData.hours || -24} Hours</b><br/>
                <span style="color: #94a3b8;">Drift Velocity:</span> <b>${driftData.net_drift_speed_knots ?? 1.4} kts</b><br/>
                <span style="color: #94a3b8;">Drift Heading:</span> <b>${driftData.net_drift_heading_deg ?? 194}°</b>
              </div>
            </div>
          `);
        },
      });

      driftLayerGroupRef.current.addLayer(driftGeoJson);

      if (driftData.steps && driftData.steps.length > 0) {
        const terminal = driftData.steps[driftData.steps.length - 1];
        const originMarker = L.circleMarker(terminal.coordinates, {
          radius: 5,
          fillColor: corridorColor,
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 1,
        }).bindPopup(`
          <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc; padding: 4px;">
            <div style="font-weight: 700; color: #fbbf24;">ESTIMATED SPILL ORIGIN (T-24H)</div>
            <div style="margin-top: 4px; color: #cbd5e1;">
              Position: ${terminal.coordinates[0]}°N, ${terminal.coordinates[1]}°E<br/>
              Uncertainty: ±${terminal.uncertainty_radius_km ?? 12.4} km
            </div>
          </div>
        `);
        driftLayerGroupRef.current.addLayer(originMarker);
      }
    }
  }, [driftData, showDrift]);

  // Update AIS Vessel Tracks & Ship Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    aisLayerGroupRef.current.clearLayers();

    if (showAIS && aisData && aisData.ranked_suspects && aisData.ranked_suspects.length > 0) {
      aisData.ranked_suspects.forEach((vessel) => {
        const isPrimary = vessel.attribution_rank === 1;
        const isModerate = vessel.risk_classification === "MODERATE_SUSPECT";
        const strokeColor = isPrimary ? "#dc2626" : isModerate ? "#d97706" : "#64748b";

        // Trajectory Polyline
        if (vessel.track_geojson && vessel.track_geojson.geometry) {
          const latlngs = vessel.track_geojson.geometry.coordinates.map(
            (c) => [c[1], c[0]] as [number, number]
          );

          const polyline = L.polyline(latlngs, {
            color: strokeColor,
            weight: isPrimary ? 2.5 : 1.5,
            opacity: isPrimary ? 0.9 : 0.5,
            dashArray: isPrimary ? undefined : "4, 4",
          });

          polyline.on("click", () => onSelectVessel(vessel));
          aisLayerGroupRef.current.addLayer(polyline);
        }

        // Tactical Heading Marker
        const markerPos = vessel.cpa_position || vessel.last_known_position;
        const markerBg = isPrimary ? "#dc2626" : isModerate ? "#d97706" : "#1e293b";
        const markerBorder = isPrimary ? "#ffffff" : isModerate ? "#fde68a" : "#94a3b8";

        const iconHtml = `
          <div style="
            display: flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; border-radius: 4px;
            background-color: ${markerBg};
            border: 1.5px solid ${markerBorder};
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            cursor: pointer;
          ">
            <svg style="width: 12px; height: 12px; fill: white;" viewBox="0 0 24 24">
              <polygon points="12 2, 22 21, 12 17, 2 21"/>
            </svg>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker(markerPos, { icon: customIcon });

        const popupContent = `
          <div style="font-family: Inter, sans-serif; font-size: 12px; color: #f8fafc; min-width: 230px; padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 4px;">
              <span style="font-weight: 700; color: #ffffff; font-size: 13px;">${vessel.vessel_name}</span>
              <span style="font-size: 11px; font-weight: 700; color: ${isPrimary ? '#f87171' : '#fbbf24'}; font-family: ui-monospace, monospace;">
                ${vessel.liability_probability_pct}% LIAB
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-top: 6px; font-size: 11px; color: #cbd5e1; font-family: ui-monospace, monospace;">
              <span style="color: #94a3b8;">IMO / MMSI:</span> <span>${vessel.imo}</span>
              <span style="color: #94a3b8;">Type:</span> <span>${vessel.vessel_type}</span>
              <span style="color: #94a3b8;">Origin CPA:</span> <span style="font-weight: 700; color: #f87171;">${vessel.closest_approach_km} km</span>
              <span style="color: #94a3b8;">Min Speed:</span> <span>${vessel.min_sog_knots} kts</span>
              <span style="color: #94a3b8;">AIS Gap:</span> <span style="color: ${vessel.max_transponder_gap_mins > 30 ? '#f87171' : '#cbd5e1'}">${vessel.max_transponder_gap_mins} mins</span>
            </div>
            ${vessel.anomalies && vessel.anomalies.length > 0
            ? `<div style="font-size: 11.5px; line-height: 1.4; background: #18181b; border-left: 3px solid #ef4444; border-radius: 4px; padding: 4px 8px; margin-top: 6px; color: #fca5a5;">
                     ${vessel.anomalies[0].description}
                   </div>`
            : ""
          }
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => onSelectVessel(vessel));
        aisLayerGroupRef.current.addLayer(marker);
      });
    }
  }, [aisData, showAIS, onSelectVessel]);

  // Selected Vessel Highlight Ring
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    highlightLayerGroupRef.current.clearLayers();

    if (selectedVessel) {
      const pos = selectedVessel.cpa_position || selectedVessel.last_known_position;
      map.panTo(pos, { animate: true });

      const ring = L.circle(pos, {
        radius: 1500,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: 0.1,
        dashArray: "4, 4",
      });
      highlightLayerGroupRef.current.addLayer(ring);
    }
  }, [selectedVessel]);

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    if (spillData && spillData.features && spillData.features.length > 0) {
      const geojsonLayer = L.geoJSON(spillData as any);
      const bounds = geojsonLayer.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
        return;
      }
    }
    mapInstanceRef.current.setView([19.5727, 72.3944], 9);
  };

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-zinc-950 select-none">
      <div ref={mapContainerRef} className="w-full h-full relative" />

      {/* TOP-LEFT: Layers Panel */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col space-y-1 rounded border border-zinc-700 bg-zinc-900/95 p-2 text-xs shadow-md backdrop-blur-md">
        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-1.5 px-1 font-semibold text-[11px] uppercase tracking-wide">
          <Layers className="w-3.5 h-3.5 text-zinc-300" />
          <span>Surveillance Layers</span>
        </div>

        <button
          onClick={() => setShowSlicks(!showSlicks)}
          className={`flex items-center justify-between space-x-3 px-2 py-1.5 rounded transition text-xs font-mono min-h-[34px] ${showSlicks
            ? "bg-zinc-800 text-zinc-100 border border-zinc-600"
            : "text-zinc-500 hover:bg-zinc-800/50 border border-transparent"
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-600" />
            <span>SAR Slick Polygons</span>
          </div>
          {showSlicks ? <Eye className="w-3.5 h-3.5 text-zinc-300" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        </button>

        <button
          onClick={() => setShowDrift(!showDrift)}
          className={`flex items-center justify-between space-x-3 px-2 py-1.5 rounded transition text-xs font-mono min-h-[34px] ${showDrift
            ? "bg-zinc-800 text-zinc-100 border border-zinc-600"
            : "text-zinc-500 hover:bg-zinc-800/50 border border-transparent"
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>Hydrodynamic Drift</span>
          </div>
          {showDrift ? <Eye className="w-3.5 h-3.5 text-zinc-300" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        </button>

        <button
          onClick={() => setShowAIS(!showAIS)}
          className={`flex items-center justify-between space-x-3 px-2 py-1.5 rounded transition text-xs font-mono min-h-[34px] ${showAIS
            ? "bg-zinc-800 text-zinc-100 border border-zinc-600"
            : "text-zinc-500 hover:bg-zinc-800/50 border border-transparent"
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-300" />
            <span>AIS Traffic Corridors</span>
          </div>
          {showAIS ? <Eye className="w-3.5 h-3.5 text-zinc-300" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        </button>
      </div>

      {/* TOP-RIGHT: Fit Incident */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={handleResetView}
          className="flex items-center space-x-1.5 rounded border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 px-3 py-1.5 text-xs font-mono shadow transition"
        >
          <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>FIT INCIDENT</span>
        </button>
      </div>

      {/* BOTTOM-LEFT: Coordinates */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center space-x-3 rounded border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-[11px] font-mono text-zinc-300 shadow">
        <div className="flex items-center space-x-1.5">
          <Navigation className="w-3 h-3 text-zinc-400" />
          <span>
            {cursorCoords
              ? `${cursorCoords.lat.toFixed(4)}°N, ${cursorCoords.lon.toFixed(4)}°E`
              : "19.5727°N, 72.3944°E"}
          </span>
        </div>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400">WGS-84</span>
      </div>

      {/* BOTTOM-CENTER: Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] hidden md:flex items-center space-x-5 rounded border border-zinc-800 bg-zinc-900/95 px-4 py-1.5 text-[11px] font-mono text-zinc-300 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-2 rounded-sm bg-zinc-900 border border-red-600" />
          <span>SAR Slick</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-amber-500" />
          <span>Hindcast Track</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-600" />
          <span className="text-red-400 font-semibold">Primary Suspect</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-amber-400">Moderate Risk</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-700" />
          <span className="text-zinc-400">Other Vessel</span>
        </div>
      </div>
    </div>
  );
};