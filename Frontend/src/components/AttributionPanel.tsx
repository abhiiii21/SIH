import React from "react";
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { AISAttributionResponse, SuspectVessel } from "../types";

interface AttributionPanelProps {
  aisData: AISAttributionResponse | null;
  selectedVessel: SuspectVessel | null;
  onSelectVessel: (vessel: SuspectVessel | null) => void;
  onOpenReportModal: () => void;
  isLoading: boolean;
}

export const AttributionPanel: React.FC<AttributionPanelProps> = ({
  aisData,
  selectedVessel,
  onSelectVessel,
  onOpenReportModal,
  isLoading,
}) => {
  return (
    <aside className="w-[400px] shrink-0 h-full overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 space-y-4 select-none">
      {/* PANEL HEADER & ATTRIBUTION SUMMARY */}
      <div className="rounded border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-200 uppercase">
              Vessel Attribution Feed
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
            {aisData ? `${aisData.suspects_count} TRACKED` : "READY"}
          </span>
        </div>

        {/* Primary Suspect Headline Banner */}
        {aisData && aisData.primary_suspect && (
          <div className="rounded border border-red-900/70 bg-red-950/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                PRIMARY SUSPECT IDENTIFIED
              </span>
              <span className="text-red-300 font-bold bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800 text-[10px]">
                {aisData.primary_suspect.liability_probability_pct}% LIABILITY
              </span>
            </div>
            <div className="text-xs font-bold text-zinc-100 font-mono">
              {aisData.primary_suspect.vessel_name} ({aisData.primary_suspect.imo})
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {aisData.primary_suspect.vessel_type} • {aisData.primary_suspect.flag} • CPA: {aisData.primary_suspect.closest_approach_km} km
            </div>
          </div>
        )}

        {/* Generate Forensic Evidence Brief Button */}
        <button
          onClick={onOpenReportModal}
          disabled={!aisData || aisData.ranked_suspects.length === 0}
          className="w-full flex items-center justify-center space-x-2 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 px-3 text-xs font-mono font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed touch-target"
        >
          <FileText className="h-4 w-4 text-zinc-300" />
          <span>GENERATE FORENSIC EVIDENCE BRIEF</span>
        </button>
      </div>

      {/* RANKED SUSPECT VESSEL CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-400 uppercase">
          <span>Candidate Vessels</span>
          <span>Liability Index</span>
        </div>

        {isLoading ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-6 text-center text-xs font-mono text-zinc-400 animate-pulse">
            Correlating AIS trajectories with hydrodynamic corridor...
          </div>
        ) : aisData && aisData.ranked_suspects.length > 0 ? (
          aisData.ranked_suspects.map((vessel) => {
            const isSelected = selectedVessel?.mmsi === vessel.mmsi;
            const isPrimary = vessel.attribution_rank === 1;
            const isModerate = vessel.risk_classification === "MODERATE_SUSPECT";

            return (
              <div
                key={vessel.mmsi}
                onClick={() => onSelectVessel(vessel)}
                className={`rounded border p-3 cursor-pointer transition select-none ${
                  isSelected
                    ? "border-zinc-400 bg-zinc-900 shadow-md"
                    : isPrimary
                    ? "border-red-900/60 bg-zinc-900/80 hover:border-red-700/80"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                {/* Header: Rank + Name + Liability % */}
                <div className="flex items-start justify-between font-mono">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          isPrimary
                            ? "bg-red-950/60 text-red-400 border-red-900/80"
                            : isModerate
                            ? "bg-amber-950/60 text-amber-400 border-amber-900/80"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        #{vessel.attribution_rank}{" "}
                        {isPrimary
                          ? "PRIMARY"
                          : isModerate
                          ? "MODERATE"
                          : "TRANSIT"}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {vessel.flag}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-100 mt-1">
                      {vessel.vessel_name}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        isPrimary
                          ? "text-red-400"
                          : isModerate
                          ? "text-amber-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {vessel.liability_probability_pct}%
                    </span>
                    <div className="text-[9px] text-zinc-500">
                      INDEX
                    </div>
                  </div>
                </div>

                {/* Liability Progress Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      isPrimary
                        ? "bg-red-600"
                        : isModerate
                        ? "bg-amber-500"
                        : "bg-zinc-600"
                    }`}
                    style={{ width: `${vessel.liability_probability_pct}%` }}
                  />
                </div>

                {/* Vessel Kinematics Grid */}
                <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[10px] font-mono bg-zinc-950 p-2 rounded border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-400">CPA Dist</span>
                    <div
                      className={`font-semibold ${
                        vessel.closest_approach_km < 1.0
                          ? "text-red-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {vessel.closest_approach_km} km
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Min SOG</span>
                    <div
                      className={`font-semibold ${
                        vessel.min_sog_knots < 3.0
                          ? "text-red-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {vessel.min_sog_knots} kts
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">AIS Gap</span>
                    <div
                      className={`font-semibold ${
                        vessel.max_transponder_gap_mins >= 30
                          ? "text-red-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {vessel.max_transponder_gap_mins}m
                    </div>
                  </div>
                </div>

                {/* Anomaly Badges */}
                {vessel.anomalies.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {vessel.anomalies.map((anom, aIdx) => (
                      <div
                        key={aIdx}
                        className={`text-[10px] font-mono p-1 rounded border flex items-start space-x-1.5 ${
                          anom.severity === "CRITICAL"
                            ? "bg-zinc-950 border-l-2 border-l-red-600 border-zinc-800 text-red-300"
                            : "bg-zinc-950 border-l-2 border-l-amber-500 border-zinc-800 text-amber-300"
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-zinc-400" />
                        <span>{anom.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer IMO & Type */}
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mt-2 pt-1 border-t border-zinc-800/60">
                  <span>{vessel.vessel_type}</span>
                  <span>
                    IMO: {vessel.imo} | MMSI: {vessel.mmsi}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs font-mono text-zinc-500">
            No candidate tracks correlated yet.
          </div>
        )}
      </div>
    </aside>
  );
};
