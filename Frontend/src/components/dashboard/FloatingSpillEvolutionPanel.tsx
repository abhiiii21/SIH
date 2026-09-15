import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, SplitSquareVertical, Clock } from "lucide-react";

export interface TimelinePoint {
  id: string;
  offsetHours: number;
  label: string;
  timeLabel: string;
  slickAreaKm2: number;
  coords: [number, number];
  isCurrent?: boolean;
}

export const TIMELINE_POINTS: TimelinePoint[] = [
  { id: "t-24", offsetHours: -24, label: "-24h", timeLabel: "11 Sep 17:00", slickAreaKm2: 48.2, coords: [18.78, 72.51] },
  { id: "t-18", offsetHours: -18, label: "-18h", timeLabel: "12 Sep 00:00", slickAreaKm2: 95.6, coords: [18.84, 72.53] },
  { id: "t-12", offsetHours: -12, label: "-12h", timeLabel: "12 Sep 05:00", slickAreaKm2: 154.3, coords: [18.88, 72.52] },
  { id: "t-6", offsetHours: -6, label: "-6h", timeLabel: "12 Sep 11:00", slickAreaKm2: 212.8, coords: [18.94, 72.54] },
  { id: "now", offsetHours: 0, label: "Now", timeLabel: "12 Sep 17:00", slickAreaKm2: 276.04, coords: [18.9997, 72.5502], isCurrent: true },
  { id: "t+6", offsetHours: 6, label: "+6h", timeLabel: "12 Sep 23:00", slickAreaKm2: 320.1, coords: [18.98, 72.64] },
  { id: "t+12", offsetHours: 12, label: "+12h", timeLabel: "13 Sep 05:00", slickAreaKm2: 368.5, coords: [18.96, 72.72] },
  { id: "t+24", offsetHours: 24, label: "+24h", timeLabel: "13 Sep 17:00", slickAreaKm2: 412.0, coords: [18.94, 72.78] },
  { id: "t+48", offsetHours: 48, label: "+48h", timeLabel: "14 Sep 17:00", slickAreaKm2: 485.4, coords: [18.92, 72.85] },
];

// 6 Thumbnails preview matching the reference design
export const THUMBNAIL_FRAMES = [
  { id: "t-24", label: "-24h", subLabel: "11 Sep 17:00", previewType: "early" },
  { id: "t-12", label: "-12h", subLabel: "12 Sep 05:00", previewType: "mid-past" },
  { id: "now", label: "Now", subLabel: "12 Sep 17:00", previewType: "current", isCurrent: true },
  { id: "t+12", label: "+12h", subLabel: "13 Sep 05:00", previewType: "forecast-1" },
  { id: "t+24", label: "+24h", subLabel: "13 Sep 17:00", previewType: "forecast-2" },
  { id: "t+48", label: "+48h", subLabel: "14 Sep 17:00", previewType: "landfall" },
];

interface FloatingSpillEvolutionPanelProps {
  activePointId: string;
  onSelectPoint: (point: TimelinePoint) => void;
  onOpenCompareView?: () => void;
}

export const FloatingSpillEvolutionPanel: React.FC<FloatingSpillEvolutionPanelProps> = ({
  activePointId,
  onSelectPoint,
  onOpenCompareView,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentIndex = TIMELINE_POINTS.findIndex((p) => p.id === activePointId);
      const nextIndex = (currentIndex + 1) % TIMELINE_POINTS.length;
      onSelectPoint(TIMELINE_POINTS[nextIndex]);
    }, 1800 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, activePointId, playbackSpeed, onSelectPoint]);

  const activePoint = TIMELINE_POINTS.find((p) => p.id === activePointId) || TIMELINE_POINTS[4];

  return (
    <div className="w-[560px] max-w-[calc(100vw-360px)] bg-white/92 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-xl text-slate-800 p-3 pointer-events-auto transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#185ADB]" />
            <span className="text-xs font-bold text-[#0B2545]">Spill Evolution</span>
            <span className="text-[10px] text-slate-400 font-medium">Hindcast (past) and Forecast (future)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">12 Sep 2026 17:00 UTC</span>

          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-slate-700 cursor-pointer"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>

          <button
            type="button"
            onClick={onOpenCompareView}
            className="px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#185ADB] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Side-by-side or difference comparison"
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Compare View</span>
          </button>
        </div>
      </div>

      {/* Timeline Scrubber Row */}
      <div className="flex items-center gap-3 px-1 py-1 mb-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded-xl bg-[#185ADB] hover:bg-[#1448B0] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-all active:scale-95"
          title={isPlaying ? "Pause Timeline" : "Play Timeline"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
        </button>

        {/* Scrubber Line with 9 Points */}
        <div className="flex-1 relative flex items-center justify-between px-2">
          <div className="absolute left-2 right-2 h-0.5 bg-slate-200 z-0" />
          {TIMELINE_POINTS.map((pt) => {
            const isSelected = pt.id === activePointId;
            const isCurrentNow = pt.isCurrent;

            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onSelectPoint(pt);
                }}
                className="relative z-10 flex flex-col items-center group cursor-pointer"
                title={`${pt.label} · ${pt.timeLabel} · Area: ${pt.slickAreaKm2} km²`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    isSelected
                      ? "bg-[#185ADB] ring-4 ring-sky-200 scale-125"
                      : isCurrentNow
                      ? "bg-rose-500 ring-2 ring-rose-200"
                      : "bg-slate-300 group-hover:bg-slate-500"
                  }`}
                />
                <span
                  className={`text-[9px] font-mono mt-1 ${
                    isSelected ? "font-bold text-[#185ADB]" : "text-slate-400"
                  }`}
                >
                  {pt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Preview Thumbnail Frames */}
      <div className="grid grid-cols-6 gap-2">
        {THUMBNAIL_FRAMES.map((thumb) => {
          const isSelected = thumb.id === activePointId;
          const isNow = thumb.isCurrent;

          return (
            <button
              key={thumb.id}
              type="button"
              onClick={() => {
                const target = TIMELINE_POINTS.find((p) => p.id === thumb.id);
                if (target) {
                  setIsPlaying(false);
                  onSelectPoint(target);
                }
              }}
              className={`rounded-xl p-1 text-left transition-all cursor-pointer border ${
                isSelected
                  ? "bg-sky-50/80 border-[#185ADB] shadow-sm ring-1 ring-[#185ADB]"
                  : isNow
                  ? "bg-slate-50 border-rose-300"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Synthetic SAR Thumbnail Visual */}
              <div className="w-full h-11 rounded-lg overflow-hidden relative bg-[#09182A] flex items-center justify-center mb-1">
                {thumb.id === "now" ? (
                  <div className="w-full h-full relative">
                    <img src="/sar-pass.jpg" alt="Now SAR" className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-rose-500/20 mix-blend-overlay" />
                    <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  </div>
                ) : (
                  <svg className="w-full h-full" viewBox="0 0 80 40">
                    <rect width="80" height="40" fill="#09182A" />
                    {/* Faint coastal boundary line */}
                    <path d="M 65 0 Q 60 20, 70 40" stroke="#334155" strokeWidth="1" fill="none" />
                    {/* Slick dispersion footprint */}
                    {thumb.id === "t-24" && (
                      <circle cx="25" cy="22" r="4" fill="#EAB308" opacity="0.8" />
                    )}
                    {thumb.id === "t-12" && (
                      <ellipse cx="32" cy="20" rx="9" ry="5" fill="#F59E0B" opacity="0.8" />
                    )}
                    {thumb.id === "t+12" && (
                      <ellipse cx="44" cy="18" rx="14" ry="7" fill="#06B6D4" opacity="0.75" />
                    )}
                    {thumb.id === "t+24" && (
                      <ellipse cx="52" cy="16" rx="18" ry="8" fill="#38BDF8" opacity="0.75" />
                    )}
                    {thumb.id === "t+48" && (
                      <path d="M 40 18 Q 55 15, 68 18 L 65 24 Z" fill="#F43F5E" opacity="0.85" />
                    )}
                  </svg>
                )}
              </div>

              <div className="text-[10px] font-bold text-[#0B2545] truncate leading-tight">
                {thumb.label}
              </div>
              <div className="text-[8px] text-slate-400 font-mono truncate leading-tight">
                {thumb.subLabel}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FloatingSpillEvolutionPanel;
