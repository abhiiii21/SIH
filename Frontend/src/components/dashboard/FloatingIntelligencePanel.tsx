import React, { useState } from "react";
import {
  ChevronDown,
  Shield,
  MapPin,
  Clock,
  Navigation,
  Wind,
  Hourglass,
  Compass,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  Fish,
  Waves,
  FileCheck,
} from "lucide-react";

interface FloatingIntelligencePanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAffectedAreas?: () => void;
  onOpenDataDetails?: () => void;
  onTriggerToast?: (msg: string) => void;
}

export const FloatingIntelligencePanel: React.FC<FloatingIntelligencePanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenAffectedAreas,
  onOpenDataDetails,
  onTriggerToast,
}) => {
  const [activeTab, setActiveTab] = useState<"Overview" | "Impact" | "Environment" | "Evidence">("Overview");
  const [showProvenance, setShowProvenance] = useState(true);
  const [forecastHours, setForecastHours] = useState<"12 hours" | "24 hours" | "48 hours">("24 hours");

  return (
    <div className="w-[335px] bg-white/92 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-xl text-slate-800 pointer-events-auto transition-all duration-200 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#185ADB]" />
          <span className="text-xs font-bold text-[#0B2545]">Incident Intelligence</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isCollapsed ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>

      {!isCollapsed && (
        <div className="p-3 max-h-[calc(100vh-270px)] overflow-y-auto custom-port-scrollbar space-y-3 text-xs">
          {/* Tabs */}
          <div className="flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold">
            {(["Overview", "Impact", "Environment", "Evidence"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#185ADB] text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "Overview" && (
            <div className="space-y-3">
              {/* Primary Stat Rows */}
              <div className="space-y-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5">
                {/* Spill Area */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Spill Area</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#0B2545] text-xs">276.04 km²</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 font-bold text-[9px]">
                      High Risk
                    </span>
                  </div>
                </div>

                {/* Probable Origin */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>Probable Origin</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">18.78°N, 72.51°E</span>
                </div>

                {/* Release Window */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Release Window</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">T - 18 h to T - 30 h</span>
                </div>

                {/* Current (Surface) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Navigation className="w-3 h-3 text-cyan-600" />
                    <span>Current (Surface)</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">0.67 m/s → 189°</span>
                </div>

                {/* Wind */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Wind className="w-3 h-3 text-sky-600" />
                    <span>Wind</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">5.1 m/s → 289°</span>
                </div>

                {/* Time to Coast */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Hourglass className="w-3 h-3 text-amber-600" />
                    <span>Time to Coast</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700 text-[11px]">~16.4 hours</span>
                </div>

                {/* Distance to Coast */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Compass className="w-3 h-3 text-slate-400" />
                    <span>Distance to Coast</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">38 km</span>
                </div>

                {/* Severity Score */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Severity Score</span>
                  </div>
                  <span className="font-mono font-black text-rose-600 text-sm">82 / 100</span>
                </div>
              </div>

              {/* Sub-Card: Impact Preview (Model) */}
              <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B2545] flex items-center gap-1.5">
                    <Waves className="w-3 h-3 text-[#185ADB]" />
                    <span>Impact Preview (Model)</span>
                  </span>

                  <select
                    value={forecastHours}
                    onChange={(e) => setForecastHours(e.target.value as any)}
                    className="text-[10px] font-semibold bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="12 hours">12 hours</option>
                    <option value="24 hours">24 hours</option>
                    <option value="48 hours">48 hours</option>
                  </select>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Coastline Impact</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px]">
                      Moderate Risk
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Estimated Arrival</span>
                    <span className="font-mono font-semibold text-slate-700">~16.4 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Protected Area Overlap</span>
                    <span className="font-mono font-bold text-[#185ADB]">12.3 %</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fishing Zone Overlap</span>
                    <span className="font-mono font-bold text-emerald-600">8.7 %</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenAffectedAreas}
                  className="w-full py-1.5 mt-1 rounded-lg bg-[#0B2545] hover:bg-[#143966] text-white text-[10px] font-bold text-center cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1"
                >
                  <span>View Affected Areas</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Sub-Card: Data Provenance (Dismissible) */}
              {showProvenance && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 relative text-[10px] text-slate-600">
                  <button
                    type="button"
                    onClick={() => setShowProvenance(false)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="font-bold text-[#0B2545] flex items-center gap-1 mb-1">
                    <FileCheck className="w-3 h-3 text-[#185ADB]" />
                    <span>Data Provenance</span>
                  </div>
                  <div className="space-y-0.5 font-mono text-[9px] text-slate-500">
                    <div>Sentinel-1A (Slick Detection) · 12 Sep 2026 17:00 UTC</div>
                    <div>Copernicus Marine (Environmental)</div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDataDetails}
                    className="text-[10px] font-bold text-[#185ADB] hover:underline mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Details</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPACT */}
          {activeTab === "Impact" && (
            <div className="space-y-2.5 text-[11px]">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-800">Shoreline Vulnerability: High</div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Estuary &amp; Mangrove belts between Alibaug and Mumbai Harbor within 38 km strike perimeter.
                </div>
              </div>
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                <div className="font-bold text-[#185ADB]">Marine Sanctuary Overlap</div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  12.3% of peripheral slick edge entering coastal turtle nesting corridor.
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-800">Commercial Artisanal Fisheries</div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Notice to Mariners (NOTAM) broadcasted to 42 active trawlers.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENVIRONMENT */}
          {activeTab === "Environment" && (
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-1.5 font-mono text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[9px] text-slate-400">Wind Vector</div>
                  <div className="font-bold text-slate-700">5.1 m/s 289°W</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[9px] text-slate-400">Surface Current</div>
                  <div className="font-bold text-slate-700">0.67 m/s 189°S</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[9px] text-slate-400">Wave Height</div>
                  <div className="font-bold text-slate-700">1.0 m Significant</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[9px] text-slate-400">Sea Surface Temp</div>
                  <div className="font-bold text-slate-700">28.3 °C</div>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                Net drift calculated with INCOIS hydrodynamic modeling: <span className="font-mono font-bold">V_drift = V_curr + 0.035 × V_wind</span>.
              </div>
            </div>
          )}

          {/* TAB 4: EVIDENCE */}
          {activeTab === "Evidence" && (
            <div className="space-y-2 text-[11px]">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <div className="font-bold text-rose-700">MT PACIFIC VOYAGER · 98.8% Attribution</div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  94-minute AIS transponder silence coincident with discharge point. Speed reduction from 13.8 to 1.4 kts.
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
                <div className="font-bold text-[#0B2545]">Chain of Custody Verifications:</div>
                <div>✓ Spatiotemporal kinematic intersection: 99.4%</div>
                <div>✓ Bilge wash crude signature correlation: 94.7%</div>
                <div>✓ Cryptographic digital audit hash: SHA-256</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingIntelligencePanel;
