import React, { useState, useEffect } from "react";
import {
  Satellite,
  Clock,
  ChevronDown,
  Layers,
} from "lucide-react";
import { SystemHealth } from "../types";

interface HeaderProps {
  systemHealth: SystemHealth | null;
  activeIncident: string;
  onSelectIncident: (incident: string) => void;
  isLoading: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemHealth,
  activeIncident,
  onSelectIncident,
  isLoading,
  onLogout,
}) => {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 w-full shrink-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 select-none z-30">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-300 shadow-sm">
          <Satellite className="h-4 w-4 text-zinc-300" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-display text-base font-bold tracking-wider text-zinc-100">
              SAHAYYA
            </span>
            <span className="text-[10px] font-body font-semibold tracking-wider text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
              MDA OPS
            </span>
          </div>
          <p className="text-[10px] font-body text-zinc-400 tracking-wide font-medium">
            SAR OIL SPILL INTELLIGENCE &amp; AIS ATTRIBUTION
          </p>
        </div>
      </div>

      {/* Center Incident Selector & Telemetry */}
      <div className="flex items-center space-x-4">
        <div className="relative flex items-center">
          <Layers className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <select
            value={activeIncident}
            onChange={(e) => onSelectIncident(e.target.value)}
            disabled={isLoading}
            className="h-8 bg-zinc-900 border border-zinc-700 rounded text-xs font-body font-medium text-zinc-200 pl-8 pr-7 py-1 appearance-none focus:outline-none focus:border-zinc-500 cursor-pointer hover:bg-zinc-850 transition-colors"
          >
            <option value="IN-MH-2026">SECTOR: MUMBAI OFFSHORE (IN-MH-2026)</option>
            <option value="IN-GJ-2026">SECTOR: GULF OF KUTCH (IN-GJ-2026)</option>
            <option value="IN-KL-2026">SECTOR: KOCHI SEAWAY (IN-KL-2026)</option>
            <option value="IN-TN-2026">SECTOR: ENNORE CORRIDOR (IN-TN-2026)</option>
            <option value="IN-OD-2026">SECTOR: PARADIP CHANNELS (IN-OD-2026)</option>
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* Right Telemetry & Status Badges */}
      <div className="flex items-center space-x-3">
        {/* UTC Clock */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 font-mono text-xs text-zinc-300">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span>{utcTime}</span>
        </div>

        {/* Engine Mode Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 rounded border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-xs">
          <span className="text-[10px] font-body text-zinc-400">ENGINE:</span>
          <span className="font-mono text-xs font-semibold text-zinc-200">
            {systemHealth?.sar_inference_mode === "NEURAL_UNET"
              ? "U-NET SAR"
              : "ADAPTIVE SIGMA0"}
          </span>
        </div>

        {/* Alert / Health Status */}
        <div className="flex items-center space-x-1.5 rounded border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-xs font-body">
          {systemHealth?.status === "OPERATIONAL" ? (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-zinc-200 tracking-wide">OPERATIONAL</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-amber-400 tracking-wide">CONNECTING</span>
            </>
          )}
        </div>

        {/* Sign Out / Switch to Login */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 text-xs font-body font-semibold tracking-wider transition-colors cursor-pointer"
            title="Sign Out to Login Page"
          >
            <span>SIGN OUT</span>
          </button>
        )}
      </div>
    </header>
  );
};
