import React from "react";
import {
  Wrench,
  X,
  Ruler,
  Square,
  FileText,
  Camera,
  Edit3,
  Crosshair,
  Grid,
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";

interface FloatingMapToolsPanelProps {
  onClose: () => void;
  activeTool: string | null;
  onSelectTool: (toolName: string) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  impactMode: boolean;
  onToggleImpactMode: () => void;
  onLocateVessel: () => void;
  onResetView: () => void;
  onAddNote: () => void;
  onScreenshot: () => void;
}

export const FloatingMapToolsPanel: React.FC<FloatingMapToolsPanelProps> = ({
  onClose,
  activeTool,
  onSelectTool,
  showGrid,
  onToggleGrid,
  impactMode,
  onToggleImpactMode,
  onLocateVessel,
  onResetView,
  onAddNote,
  onScreenshot,
}) => {
  return (
    <div className="w-[335px] bg-white/92 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-xl text-slate-800 p-3 pointer-events-auto transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
        <div className="flex items-center gap-1.5 font-display font-semibold text-xs tracking-wide text-[#0B2545]">
          <Wrench className="w-3.5 h-3.5 text-[#185ADB]" />
          <span>Map Tools</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          title="Close Map Tools"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-Column Tools Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3 font-body">
        {/* Measure Distance */}
        <button
          type="button"
          onClick={() => onSelectTool("measure-distance")}
          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
            activeTool === "measure-distance"
              ? "bg-sky-50 border-[#185ADB] text-[#185ADB] font-semibold shadow-2xs"
              : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700"
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="text-[12px] font-medium truncate">Measure Distance</span>
        </button>

        {/* Measure Area */}
        <button
          type="button"
          onClick={() => onSelectTool("measure-area")}
          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
            activeTool === "measure-area"
              ? "bg-sky-50 border-[#185ADB] text-[#185ADB] font-semibold shadow-2xs"
              : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700"
          }`}
        >
          <Square className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-[12px] font-medium truncate">Measure Area</span>
        </button>

        {/* Add Note */}
        <button
          type="button"
          onClick={onAddNote}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700 text-left flex items-center gap-2 transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[12px] font-medium truncate">Add Note</span>
        </button>

        {/* Screenshot */}
        <button
          type="button"
          onClick={onScreenshot}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700 text-left flex items-center gap-2 transition-all cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-[12px] font-medium truncate">Screenshot</span>
        </button>

        {/* Draw Polygon */}
        <button
          type="button"
          onClick={() => onSelectTool("draw-polygon")}
          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer col-span-2 ${
            activeTool === "draw-polygon"
              ? "bg-sky-50 border-[#185ADB] text-[#185ADB] font-semibold shadow-2xs"
              : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[12px] font-medium truncate">Draw Exclusion Polygon</span>
        </button>
      </div>

      {/* Quick Actions Section */}
      <div className="pt-2 border-t border-slate-100 font-body">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
          Quick Actions
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {/* Locate Vessel */}
          <button
            type="button"
            onClick={onLocateVessel}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Focus Suspect Vessel (MT PACIFIC VOYAGER)"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-500" />
            <span>Locate</span>
          </button>

          {/* Show Grid */}
          <button
            type="button"
            onClick={onToggleGrid}
            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              showGrid
                ? "bg-sky-50 border-[#185ADB] text-[#185ADB]"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Toggle WGS84 Lat/Long Grid Overlay"
          >
            <Grid className="w-3.5 h-3.5 text-sky-600" />
            <span>Grid</span>
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={onResetView}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Recenter Map to Mumbai High Incident"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset</span>
          </button>

          {/* Impact Mode (Highlighted Green Button) */}
          <button
            type="button"
            onClick={onToggleImpactMode}
            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              impactMode
                ? "bg-emerald-600 border-emerald-700 text-white shadow-sm ring-1 ring-emerald-400"
                : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            }`}
            title="Highlight Ecological & Fishery Risk Zones"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Impact</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingMapToolsPanel;
