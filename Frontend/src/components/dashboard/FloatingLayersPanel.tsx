import React from "react";
import {
  Layers,
  ChevronDown,
  Info,
  Plus,
  Compass,
  Ship,
  Anchor,
  Shield,
  Fish,
  AlertTriangle,
  Clock,
  Navigation,
} from "lucide-react";

export interface LayerItem {
  key: string;
  label: string;
  color: string;
  category: "Incident" | "Movement" | "Maritime" | "Risk & Environment";
  iconType: "dot" | "dash" | "ring" | "arrow" | "ship" | "anchor" | "shield" | "fish" | "alert" | "clock";
}

export const LAYER_DEFINITIONS: LayerItem[] = [
  // Incident
  { key: "oilSlick", label: "Current Oil Slick (SAR)", color: "#EF4444", category: "Incident", iconType: "dot" },
  { key: "spillBoundary", label: "Spill Boundary", color: "#F87171", category: "Incident", iconType: "dash" },
  { key: "spillProbability", label: "Spill Probability", color: "#F59E0B", category: "Incident", iconType: "ring" },
  { key: "probableOrigin", label: "Probable Origin Zone", color: "#EAB308", category: "Incident", iconType: "ring" },
  
  // Movement
  { key: "hindcastTrack", label: "Hindcast Track (Past)", color: "#F59E0B", category: "Movement", iconType: "dash" },
  { key: "forecastTrack", label: "Forecast Track (Future)", color: "#06B6D4", category: "Movement", iconType: "dash" },
  { key: "driftVectors", label: "Drift Vectors", color: "#38BDF8", category: "Movement", iconType: "arrow" },
  { key: "spillEvolution", label: "Spill Evolution", color: "#8B5CF6", category: "Movement", iconType: "clock" },

  // Maritime
  { key: "vesselsAis", label: "AIS Vessels", color: "#10B981", category: "Maritime", iconType: "ship" },
  { key: "vesselTracks", label: "Vessel Tracks", color: "#6366F1", category: "Maritime", iconType: "dash" },
  { key: "shippingCorridors", label: "Shipping Corridors", color: "#3B82F6", category: "Maritime", iconType: "dash" },
  { key: "ports", label: "Ports & Terminals", color: "#0284C7", category: "Maritime", iconType: "anchor" },

  // Risk & Environment
  { key: "coastline", label: "Coastline", color: "#06B6D4", category: "Risk & Environment", iconType: "dash" },
  { key: "protectedAreas", label: "Marine Protected Areas", color: "#0284C7", category: "Risk & Environment", iconType: "shield" },
  { key: "fishingZones", label: "Fishing Zones", color: "#10B981", category: "Risk & Environment", iconType: "fish" },
  { key: "restrictedZones", label: "Restricted / No-Go Zones", color: "#F43F5E", category: "Risk & Environment", iconType: "alert" },
];

interface FloatingLayersPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  layers: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
  onTriggerToast?: (msg: string) => void;
}

export const FloatingLayersPanel: React.FC<FloatingLayersPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  layers,
  onToggleLayer,
  onTriggerToast,
}) => {
  const categories: Array<"Incident" | "Movement" | "Maritime" | "Risk & Environment"> = [
    "Incident",
    "Movement",
    "Maritime",
    "Risk & Environment",
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;

  const renderIcon = (item: LayerItem) => {
    switch (item.iconType) {
      case "dot":
        return <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />;
      case "ring":
        return <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed shrink-0" style={{ borderColor: item.color }} />;
      case "dash":
        return <div className="w-3 border-b-2 border-dashed shrink-0" style={{ borderColor: item.color }} />;
      case "arrow":
        return <Navigation className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "ship":
        return <Ship className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "anchor":
        return <Anchor className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "shield":
        return <Shield className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "fish":
        return <Fish className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "alert":
        return <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      case "clock":
        return <Clock className="w-2.5 h-2.5 shrink-0" style={{ color: item.color }} />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />;
    }
  };

  return (
    <div className="w-[275px] bg-white/92 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-xl text-slate-800 pointer-events-auto transition-all duration-200 overflow-hidden">
      {/* Panel Header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#185ADB]" />
          <span className="text-xs font-bold text-[#0B2545]">Layers</span>
          <span className="px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-mono font-bold text-[#185ADB]">
            {activeCount}/{LAYER_DEFINITIONS.length}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isCollapsed ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="p-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-port-scrollbar space-y-3.5 text-xs">
          {categories.map((cat) => {
            const catLayers = LAYER_DEFINITIONS.filter((l) => l.category === cat);
            return (
              <div key={cat} className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                  {cat}
                </div>
                <div className="space-y-1">
                  {catLayers.map((item) => {
                    const isChecked = !!layers[item.key];
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-slate-50/80 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {renderIcon(item)}
                          <span
                            className={`text-[11px] truncate leading-tight ${
                              isChecked ? "font-semibold text-slate-700" : "text-slate-400"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onTriggerToast) {
                                onTriggerToast(`Layer Info: ${item.label}`);
                              }
                            }}
                            className="text-slate-300 hover:text-slate-500 p-0.5 cursor-pointer"
                            title={`Details on ${item.label}`}
                          >
                            <Info className="w-3 h-3" />
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleLayer(item.key)}
                              className="sr-only peer"
                            />
                            <div className="w-7 h-3.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#185ADB]" />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (onTriggerToast) onTriggerToast("Add Custom Map Layer: WMS / GeoJSON / XYZ endpoint modal opened.");
              }}
              className="text-[11px] font-bold text-[#185ADB] hover:text-[#0B2545] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Layer</span>
            </button>
            <span className="text-[9px] text-slate-400 font-mono">EPSG:4326</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingLayersPanel;
