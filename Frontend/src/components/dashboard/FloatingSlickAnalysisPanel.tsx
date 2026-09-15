import React, { useState } from "react";
import { Activity, X, Layers, Sliders } from "lucide-react";

interface FloatingSlickAnalysisPanelProps {
  onClose: () => void;
  onTriggerToast?: (msg: string) => void;
}

export const FloatingSlickAnalysisPanel: React.FC<FloatingSlickAnalysisPanelProps> = ({
  onClose,
  onTriggerToast,
}) => {
  const [viewMode, setViewMode] = useState<"3D View" | "Cross-section">("3D View");

  return (
    <div className="w-[325px] bg-white/92 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-xl text-slate-800 p-3 pointer-events-auto transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-xs text-[#0B2545]">
          <Activity className="w-3.5 h-3.5 text-[#185ADB]" />
          <span>Slick Analysis</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          title="Close Slick Analysis"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Left (Visual Preview + Toggle) & Right (Stats List) */}
      <div className="flex items-start gap-3">
        {/* Left Side: Slick Visual Box + Mode Toggle */}
        <div className="w-[110px] shrink-0 flex flex-col items-center">
          <div className="w-full h-[95px] rounded-xl bg-gradient-to-br from-[#061528] to-[#0D284B] border border-slate-700/60 relative overflow-hidden flex items-center justify-center p-1 shadow-inner">
            {viewMode === "3D View" ? (
              <svg className="w-full h-full" viewBox="0 0 100 80">
                {/* 3D Isometric Wireframe Grid */}
                <path d="M 10 55 L 50 72 L 90 55 L 50 38 Z" fill="none" stroke="#1E3A5F" strokeWidth="1" />
                <path d="M 20 48 L 50 62 L 80 48 L 50 34 Z" fill="none" stroke="#1E3A5F" strokeWidth="0.8" />
                
                {/* Hydrocarbon Slick Heat Blob */}
                <ellipse cx="50" cy="50" rx="30" ry="14" fill="#0284C7" opacity="0.3" transform="rotate(-15 50 50)" />
                <ellipse cx="48" cy="49" rx="20" ry="9" fill="#F59E0B" opacity="0.6" transform="rotate(-15 48 49)" />
                <ellipse cx="46" cy="48" rx="11" ry="5" fill="#EF4444" opacity="0.9" transform="rotate(-15 46 48)" />
                
                {/* Peak height indicator */}
                <line x1="46" y1="48" x2="46" y2="30" stroke="#F87171" strokeWidth="1.5" strokeDasharray="1 1" />
                <circle cx="46" cy="30" r="1.5" fill="#FCA5A5" />
                <text x="50" y="32" fill="#FCA5A5" fontSize="6" fontFamily="monospace">1.2mm</text>
              </svg>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 100 80">
                {/* Cross-section water line */}
                <line x1="10" y1="42" x2="90" y2="42" stroke="#38BDF8" strokeWidth="1" />
                <text x="12" y="38" fill="#38BDF8" fontSize="6">Sea Surface</text>
                
                {/* Emulsion profile */}
                <path d="M 20 42 Q 35 34, 50 33 Q 65 34, 80 42 Q 65 48, 50 49 Q 35 48, 20 42 Z" fill="#DC2626" opacity="0.85" />
                <path d="M 30 42 Q 40 37, 50 36 Q 60 37, 70 42 Q 60 46, 50 47 Q 40 46, 30 42 Z" fill="#FBBF24" opacity="0.9" />
                
                {/* Under-surface droplet dispersion */}
                <circle cx="45" cy="56" r="1.5" fill="#F87171" opacity="0.6" />
                <circle cx="52" cy="62" r="1" fill="#F87171" opacity="0.4" />
                <circle cx="58" cy="58" r="1.2" fill="#F87171" opacity="0.5" />
              </svg>
            )}
          </div>

          {/* Toggle Button */}
          <div className="flex p-0.5 mt-1.5 w-full bg-slate-100 rounded-lg border border-slate-200 text-[9px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("3D View")}
              className={`flex-1 py-0.5 rounded-md text-center transition-all cursor-pointer ${
                viewMode === "3D View"
                  ? "bg-[#185ADB] text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3D View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("Cross-section")}
              className={`flex-1 py-0.5 rounded-md text-center transition-all cursor-pointer ${
                viewMode === "Cross-section"
                  ? "bg-[#185ADB] text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cross-sec
            </button>
          </div>
        </div>

        {/* Right Side: Morphometry Stats List */}
        <div className="flex-1 space-y-1 text-[11px]">
          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Area</span>
            <span className="font-mono font-bold text-[#0B2545]">276.04 km²</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Perimeter</span>
            <span className="font-mono text-slate-700">312.5 km</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Length (major)</span>
            <span className="font-mono text-slate-700">31.2 km</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Width (minor)</span>
            <span className="font-mono text-slate-700">12.8 km</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Orientation</span>
            <span className="font-mono text-slate-700">24.6° (NE-SW)</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
            <span className="text-slate-500 text-[10px]">Thickness (est.)</span>
            <span className="font-mono text-amber-700 font-semibold">0.1 – 1.2 mm</span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500 text-[10px]">Volume (est.)</span>
            <span className="font-mono font-bold text-rose-600">280 – 1,200 m³</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingSlickAnalysisPanel;
