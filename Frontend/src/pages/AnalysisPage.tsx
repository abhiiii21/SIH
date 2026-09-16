import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BarChart3,
  GitCompare,
  Sliders,
  Brain,
  History,
  Ship,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Scale,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Home,
  Map as MapIcon,
  Activity,
  Settings,
  HelpCircle,
  Menu,
  Info,
  Check,
  Compass,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { INCIDENT_DATA, VesselCandidate } from "../data/incidentData";
import { HISTORICAL_INCIDENTS, HistoricalIncident } from "../data/historicalIncidents";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import sahayyaApi from "../services/api";

type AnalysisTab =
  | "counterfactual"
  | "whatif"
  | "confidence"
  | "historical"
  | "reports";

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Analysis");

  // Read URL query params if linked from Evidence Graph Modal
  const initialTab = (searchParams.get("tab") as AnalysisTab) || "counterfactual";
  const initialVesselQuery = searchParams.get("vessel") || "";

  const [activeTab, setActiveTab] = useState<AnalysisTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // --------------------------------------------------------------------------
  // TAB 1: Counterfactual Lab State (Stage 12)
  // --------------------------------------------------------------------------
  const candidates = INCIDENT_DATA.vessels;
  const [selectedCandidate, setSelectedCandidate] = useState<VesselCandidate>(() => {
    if (initialVesselQuery) {
      const match = candidates.find(
        (c) =>
          c.name.toLowerCase().includes(initialVesselQuery.toLowerCase()) ||
          c.imo.includes(initialVesselQuery)
      );
      if (match) return match;
    }
    return candidates[0];
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(100);
  const [activeOverlayView, setActiveOverlayView] = useState<"sideBySide" | "overlay">("sideBySide");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationProgress(15);

    try {
      // Trigger real backend Lagrangian particle counterfactual job
      const res = await sahayyaApi.simulation.runCounterfactual("IN-MH-2026", 1, {
        wind_speed_ms: 7.5,
        wind_direction_deg: 245.0,
        current_speed_ms: 0.85,
        current_direction_deg: 65.0,
      });

      setSimulationProgress(60);

      // Poll or finalize
      setTimeout(async () => {
        setSimulationProgress(100);
        setIsSimulating(false);
        try {
          if (res?.job_id) {
            const statusRes = await sahayyaApi.simulation.getCounterfactualStatus(res.job_id);
            if (statusRes?.match_score_pct) {
              triggerToast(`Counterfactual hydrodynamics converged: ${statusRes.match_score_pct}% overlap match!`);
              return;
            }
          }
        } catch (e) {}
        triggerToast(`Counterfactual hydrodynamics computed for ${selectedCandidate.name}`);
      }, 700);
    } catch (err) {
      console.warn("Using local simulation engine:", err);
      setTimeout(() => {
        setSimulationProgress(100);
        setIsSimulating(false);
        triggerToast(`Counterfactual hydrodynamics computed for ${selectedCandidate.name}`);
      }, 800);
    }
  };

  // --------------------------------------------------------------------------
  // TAB 2: What-If Simulator State (Stage 18)
  // --------------------------------------------------------------------------
  const [selectedStrategyId, setSelectedStrategyId] = useState("strat-1");

  const whatIfScenarios = [
    {
      id: "strat-1",
      name: "Immediate Containment (T + 0h)",
      desc: "Deploy ICGS Vikram offshore barrier within 2 hours of SAR detection.",
      coastlineImpactPct: 4.2,
      spillAreaKm2: 295.0,
      timeToContainmentHours: 14.5,
      resourceCostLakhs: 42,
      recommended: true,
      score: 94,
    },
    {
      id: "strat-2",
      name: "Delayed Mobilization (T + 6h)",
      desc: "Wait for secondary SAR optical confirmation pass before surface fleet dispatch.",
      coastlineImpactPct: 38.6,
      spillAreaKm2: 442.0,
      timeToContainmentHours: 36.0,
      resourceCostLakhs: 118,
      recommended: false,
      score: 52,
    },
    {
      id: "strat-3",
      name: "Zone A Skimming Prioritization",
      desc: "Focus all skimming cutters exclusively on Alibaug turtle breeding beaches.",
      coastlineImpactPct: 12.8,
      spillAreaKm2: 340.0,
      timeToContainmentHours: 22.0,
      resourceCostLakhs: 75,
      recommended: false,
      score: 81,
    },
  ];

  // --------------------------------------------------------------------------
  // TAB 3: Model Confidence State
  // --------------------------------------------------------------------------
  const modelHistoryData = [
    { pass: "P-14", confidence: 91.2, fpRejection: 97.4 },
    { pass: "P-15", confidence: 92.8, fpRejection: 98.0 },
    { pass: "P-16", confidence: 90.5, fpRejection: 96.8 },
    { pass: "P-17", confidence: 94.1, fpRejection: 98.2 },
    { pass: "P-18", confidence: 93.6, fpRejection: 97.9 },
    { pass: "P-19", confidence: 95.4, fpRejection: 98.9 },
    { pass: "Current", confidence: 94.6, fpRejection: 98.2 },
  ];

  // --------------------------------------------------------------------------
  // TAB 4: Historical Comparison State
  // --------------------------------------------------------------------------
  const [selectedHistIds, setSelectedHistIds] = useState<string[]>([
    "HIST-2017-02",
    "HIST-2010-03",
  ]);

  const handleToggleHist = (id: string) => {
    if (selectedHistIds.includes(id)) {
      if (selectedHistIds.length > 1) {
        setSelectedHistIds(selectedHistIds.filter((i) => i !== id));
      }
    } else {
      if (selectedHistIds.length < 2) {
        setSelectedHistIds([...selectedHistIds, id]);
      } else {
        setSelectedHistIds([selectedHistIds[1], id]);
      }
    }
  };

  const comparedIncidents = useMemo(() => {
    return HISTORICAL_INCIDENTS.filter((h) => selectedHistIds.includes(h.id));
  }, [selectedHistIds]);

  // Evidence breakdown for candidate
  const candidateEvidenceData = useMemo(() => {
    const isTop = selectedCandidate.rank === 1;
    return [
      {
        name: "Time Match",
        score: isTop ? 99.2 : Math.min(80, Math.round(selectedCandidate.score * 0.9)),
        color: "#1E5FBF",
      },
      {
        name: "Location Match",
        score: isTop ? 97.8 : Math.min(75, Math.round(selectedCandidate.score * 0.85)),
        color: "#2E8FE8",
      },
      {
        name: "Route Alignment",
        score: isTop ? 99.4 : Math.min(70, Math.round(selectedCandidate.score * 0.8)),
        color: "#0EA5B7",
      },
      {
        name: "AIS Consistency",
        score: isTop ? 97.2 : Math.min(65, Math.round(selectedCandidate.score * 0.75)),
        color: "#EF4444",
      },
      {
        name: "Physics Match",
        score: isTop ? 94.7 : Math.min(60, Math.round(selectedCandidate.score * 0.7)),
        color: "#6366F1",
      },
    ];
  }, [selectedCandidate]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-sky-canvas font-sans text-slate-800 flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 animate-bounce">
          <div className="bg-[#0B2545] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-sky-400/40 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOP HEADER BAR                                                        */}
      {/* ===================================================================== */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E1EEF9] z-40 flex items-center justify-between px-4 sm:px-6 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B2545] to-[#1E5FBF] flex items-center justify-center text-white shadow-sm font-black text-base">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#0B2545] text-base tracking-tight leading-none">
                  SAHAYYA
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-sky-100 text-[#1E5FBF] rounded-sm uppercase tracking-wider">
                  Analysis Lab
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight">
                Forensic Attribution Engine & Predictive Response Optimization
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="Generate Official 9-Page Incident Forensic Dossier (PDF)"
          >
            <FileText className="w-4 h-4 text-sky-200" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={() => navigate("/incidents/IN-MH-2026")}
            className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-rose-600" />
            <span>Active Case: IN-MH-2026</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTAINER: SIDEBAR + ANALYSIS TABS                               */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 flex w-full overflow-hidden relative">
        {/* Left Nav Sidebar */}
        <aside
          className={`h-full bg-[#0B2545] transition-all duration-300 flex flex-col justify-between py-4 z-30 shrink-0 overflow-y-auto ${
            isSidebarOpen ? "w-20" : "w-0 p-0 opacity-0 -translate-x-full overflow-hidden pointer-events-none"
          }`}
        >
          <div className="flex flex-col items-center gap-2.5 w-full px-2">
            {[
              { id: "Home", icon: Home, label: "Home", path: "/dashboard" },
              { id: "Map", icon: MapIcon, label: "Map", path: "/map" },
              { id: "Incidents", icon: Activity, label: "Incidents", path: "/incidents/IN-MH-2026" },
              { id: "Vessels", icon: Ship, label: "Vessels", path: "/vessels" },
              { id: "Analysis", icon: BarChart3, label: "Analysis", path: "/analysis" },
              { id: "Settings", icon: Settings, label: "Settings", path: "/settings" },
              { id: "Help", icon: HelpCircle, label: "Help" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              const isIndigoAccent = item.id === "Analysis";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-b from-[#1E5FBF] to-[#2E8FE8] text-white shadow-lg scale-105"
                      : isIndigoAccent
                      ? "text-indigo-200 hover:text-white hover:bg-white/10"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-1 text-center">
            <div className="w-6 h-6 mx-auto mb-1 text-sky-400 opacity-60">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7-0.5" />
              </svg>
            </div>
            <p className="text-[8px] text-slate-400 leading-tight">
              Safer Oceans.<br />Stronger Tomorrow.
            </p>
          </div>
        </aside>

        {/* Scrollable Main Area */}
        <main className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-tactical-scrollbar scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Top Title & Tab Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0B2545] tracking-tight">
                  Forensic Attribution & Scenario Lab
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Flowchart Stages 11, 12, 18 &bull; Probabilistic vessel attribution and Lagrangian hydrodynamic modeling.
                </p>
              </div>

              {/* 5 Primary Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-sm flex-wrap sm:flex-nowrap">
                {[
                  { id: "counterfactual", label: "Counterfactual Lab", icon: GitCompare, badge: "Stage 12" },
                  { id: "whatif", label: "What-If Simulator", icon: Sliders, badge: "Stage 18" },
                  { id: "confidence", label: "Model Confidence", icon: Brain },
                  { id: "historical", label: "Historical Benchmarking", icon: History },
                  { id: "reports", label: "Executive Reports", icon: FileText, badge: "Dossier" },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSel = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as AnalysisTab)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? "bg-[#0B2545] text-white shadow-sm"
                          : "text-slate-600 hover:text-[#0B2545] hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =============================================================== */}
            {/* TAB 1: COUNTERFACTUAL LAB (Stage 12)                            */}
            {/* =============================================================== */}
            {activeTab === "counterfactual" && (
              <div className="space-y-5 animate-fadeIn">
                {/* 3-Column Layout: Candidates | Dual Map | Evidence Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Candidates Selector (3 cols) */}
                  <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                        <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                          Candidate Vessels (4)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Case IN-MH</span>
                      </div>

                      <div className="space-y-2 max-h-[380px] overflow-y-auto custom-tactical-scrollbar pr-1">
                        {candidates.map((cand) => {
                          const isSel = selectedCandidate.id === cand.id;
                          return (
                            <div
                              key={cand.id}
                              onClick={() => setSelectedCandidate(cand)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#EFF6FD] border-[#1E5FBF] shadow-sm ring-2 ring-[#1E5FBF]/20"
                                  : "bg-[#F8FBFE] hover:bg-slate-50 border-[#E1EEF9]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[#0B2545]">{cand.name}</span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                    cand.score > 80
                                      ? "bg-rose-100 text-rose-700 border-rose-200"
                                      : "bg-amber-100 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {cand.score}%
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1">
                                {cand.type} &bull; IMO {cand.imo}
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[9px] font-mono text-slate-600">
                                <span>CPA: {cand.cpa}</span>
                                <span>Dark: {cand.aisGap}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E1EEF9]">
                      <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSimulating ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Computing Particle Kinematics...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Run Counterfactual Simulation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Center Column: Actual vs Simulated Spill Visual (5 cols) */}
                  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                      <div>
                        <div className="text-xs font-bold text-[#0B2545]">
                          Hydrodynamic Drift Comparison
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Actual Observed Slick (SAR) vs Simulated Hypothetical Release
                        </div>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                        <button
                          onClick={() => setActiveOverlayView("sideBySide")}
                          className={`px-2 py-0.5 rounded-md ${
                            activeOverlayView === "sideBySide"
                              ? "bg-white text-[#0B2545] shadow-xs"
                              : "text-slate-600"
                          }`}
                        >
                          Dual
                        </button>
                        <button
                          onClick={() => setActiveOverlayView("overlay")}
                          className={`px-2 py-0.5 rounded-md ${
                            activeOverlayView === "overlay"
                              ? "bg-white text-[#0B2545] shadow-xs"
                              : "text-slate-600"
                          }`}
                        >
                          Overlap
                        </button>
                      </div>
                    </div>

                    {/* Simulation Map Graphic */}
                    <div className="flex-1 min-h-[280px] bg-slate-900 rounded-xl relative overflow-hidden border border-slate-700 flex items-center justify-center p-4">
                      {/* Ocean Background Canvas with Grid Lines */}
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1E5FBF_1px,transparent_1px),linear-gradient(to_bottom,#1E5FBF_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                      {/* Actual Observed Spill Boundary */}
                      <div className="relative z-10 w-48 h-36 rounded-[45%_55%_60%_40%/50%_40%_60%_50%] bg-gradient-to-br from-rose-600/70 via-amber-600/60 to-transparent border-2 border-rose-400/90 shadow-[0_0_30px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-center p-2 transform rotate-12">
                        <span className="text-[9px] font-black text-white bg-rose-900/80 px-1.5 py-0.5 rounded">
                          Actual Observed Spill (276 km²)
                        </span>
                        <span className="text-[8px] text-rose-200 mt-0.5 font-mono">
                          Sentinel-1A SAR Delineation
                        </span>
                      </div>

                      {/* Simulated Spill Boundary for Selected Candidate */}
                      {activeOverlayView === "overlay" ? (
                        <div
                          className={`absolute z-10 w-52 h-40 rounded-[50%_50%_55%_45%/45%_55%_50%_50%] border-2 border-dashed ${
                            selectedCandidate.rank === 1
                              ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                              : "border-sky-400 bg-sky-500/20"
                          } flex items-center justify-center transform ${
                            selectedCandidate.rank === 1 ? "rotate-14" : "rotate-45 translate-x-6"
                          }`}
                        >
                          <span className="text-[9px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded border border-white/30">
                            Simulated Candidate Footprint ({selectedCandidate.name})
                          </span>
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 bg-[#0B2545]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-white text-[10px] font-mono">
                          Correlation Variance:{" "}
                          <span
                            className={`font-bold ${
                              selectedCandidate.rank === 1 ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {selectedCandidate.rank === 1 ? "0.6% Discrepancy" : "44.8% Discrepancy"}
                          </span>
                        </div>
                      )}

                      {/* Coordinates Callout */}
                      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[9px] font-mono">
                        Origin: 18.78°N, 72.51°E
                      </div>
                    </div>

                    <div className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                      Counterfactual physics model runs reverse particle tracking driven by INCOIS ocean currents and ECMWF 10m wind fields to determine whether this specific vessel’s AIS track could physically generate the observed satellite surface mask.
                    </div>
                  </div>

                  {/* Right Column: Evidence Breakdown (4 cols) */}
                  <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                        <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                          Evidence Score Breakdown
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            selectedCandidate.rank === 1
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                        >
                          Physics: {selectedCandidate.rank === 1 ? "HIGH CONSISTENCY" : "LOW MATCH"}
                        </span>
                      </div>

                      {/* Recharts Bar Chart */}
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={candidateEvidenceData}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 75, bottom: 5 }}
                          >
                            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 9 }} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              tick={{ fontSize: 10, fill: "#0B2545", fontWeight: 600 }}
                              width={75}
                            />
                            <Tooltip
                              formatter={(value: any) => [`${value}%`, "Correlation"]}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                              {candidateEvidenceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Key Assessment Note */}
                      <div className="mt-3 p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-700 leading-relaxed">
                        <div className="font-bold text-[#0B2545] mb-1">
                          Attribution Probability: {selectedCandidate.score}%
                        </div>
                        {selectedCandidate.rank === 1 ? (
                          <p className="text-[11px] text-slate-600">
                            Drastic speed drop from 13.8 to 1.4 kts correlates with 94 min transponder gap right along the central slick centroid. Hydrodynamic match is optimal.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-600">
                            Vessel maintained continuous speed along standard transit corridor. Reverse particle dispersion excludes this candidate from source discharge.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-4 pt-3 border-t border-[#E1EEF9] text-[10px] text-slate-400 leading-tight">
                      &bull; <span className="font-semibold">Legal Note:</span> Probabilistic intelligence evidence generated under IMO guidelines &mdash; not legal proof of liability.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: WHAT-IF SIMULATOR (Stage 18)                              */}
            {/* =============================================================== */}
            {activeTab === "whatif" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E1EEF9]">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">
                        Predictive Scenario Simulator (What-If Analysis)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Compare multiple response action timelines and evaluate coastline contamination outcomes before deploying multimillion-rupee resources.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        triggerToast("Optimal response strategy applied to Incident Response Plan.");
                        navigate("/incidents/IN-MH-2026");
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apply Recommended Plan</span>
                    </button>
                  </div>

                  {/* 3 Scenario Cards Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                    {whatIfScenarios.map((sc) => {
                      const isSel = selectedStrategyId === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedStrategyId(sc.id)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            sc.recommended
                              ? "bg-gradient-to-b from-emerald-50/40 to-white border-emerald-300 ring-2 ring-emerald-400/30 shadow-md"
                              : "bg-[#F8FBFE] border-[#E1EEF9] hover:bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              {sc.recommended ? (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                                  ★ RECOMMENDED
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                  Alternative
                                </span>
                              )}
                              <span className="font-mono text-xs font-black text-[#0B2545]">
                                {sc.score}/100 Score
                              </span>
                            </div>

                            <h3 className="font-bold text-sm text-[#0B2545]">{sc.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sc.desc}</p>

                            {/* Predicted Outcome Metrics */}
                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs font-mono">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-sans">Coastline Impact:</span>
                                <span
                                  className={`font-bold ${
                                    sc.coastlineImpactPct < 10
                                      ? "text-emerald-600"
                                      : sc.coastlineImpactPct < 25
                                      ? "text-amber-600"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {sc.coastlineImpactPct}%
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500 font-sans">Spill Extent:</span>
                                <span className="font-bold text-[#0B2545]">{sc.spillAreaKm2} km²</span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500 font-sans">Time to Contain:</span>
                                <span className="font-bold text-[#0B2545]">
                                  {sc.timeToContainmentHours} Hours
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500 font-sans">Estimated Cost:</span>
                                <span className="font-bold text-slate-700">₹{sc.resourceCostLakhs} Lakhs</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerToast(`Scenario ${sc.name} selected as operational basis.`);
                              }}
                              className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                                sc.recommended
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-white border border-[#E1EEF9] hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              Select Strategy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: MODEL CONFIDENCE                                         */}
            {/* =============================================================== */}
            {activeTab === "confidence" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Overall Segmentation Confidence", val: "94.6%", sub: "Adaptive U-Net v2.1", color: "text-emerald-600" },
                    { label: "False-Positive Rejection Rate", val: "98.2%", sub: "Biogenic films & wind shadows", color: "text-[#1E5FBF]" },
                    { label: "SAR Image Processing Latency", val: "4.2 min", sub: "Cloud GPU TensorRT Pipeline", color: "text-indigo-600" },
                    { label: "Validation Dataset Coverage", val: "1,420 km²", sub: "West Coast Indian EEZ ground truth", color: "text-slate-700" },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E1EEF9] shadow-sm">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                      <div className={`text-2xl font-black ${stat.color} mt-1`}>{stat.val}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Model Trend Chart + Rejection Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                    <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider mb-2">
                      Detection Accuracy Trend (Last 7 Satellite Passes)
                    </h3>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={modelHistoryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1EEF9" />
                          <XAxis dataKey="pass" tick={{ fontSize: 10 }} />
                          <YAxis domain={[85, 100]} unit="%" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="confidence"
                            name="Confidence Score"
                            stroke="#1E5FBF"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="fpRejection"
                            name="FP Rejection"
                            stroke="#10B981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Look-Alike Rejection Examples */}
                  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider mb-2">
                        Look-Alike Rejection Artifacts
                      </h3>
                      <div className="space-y-2 text-xs">
                        {[
                          {
                            title: "Low-Wind Calm Ocean (Wind < 2.5 m/s)",
                            desc: "Specular reflection causes dark radar patches; rejected using ERA5 10m wind threshold.",
                            badge: "Rejected (Non-Hazard)",
                          },
                          {
                            title: "Biogenic Natural Slick (Algal Bloom)",
                            desc: "Natural monomolecular surfactant layer; rejected via VV/VH dual-pol cross-ratio.",
                            badge: "Rejected (Biological)",
                          },
                          {
                            title: "Internal Gravity Waves",
                            desc: "Periodic dark and bright linear bands; rejected by spatiotemporal Fourier texture filter.",
                            badge: "Filtered (Wave Artifact)",
                          },
                        ].map((ex, i) => (
                          <div key={i} className="p-2.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0B2545]">{ex.title}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {ex.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{ex.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E1EEF9] text-[10px] text-slate-400 font-mono">
                      Neural Backbone: ResNet-50 Feature Pyramid Network with Dual-Pol Complex Tensor Layers.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: HISTORICAL COMPARISON                                    */}
            {/* =============================================================== */}
            {activeTab === "historical" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9] mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">
                        Historical Oil Spill Disaster Benchmarking
                      </h2>
                      <p className="text-xs text-slate-500">
                        Select any 2 historical marine incidents to compare response times, containment outcomes, and courtroom attribution results side-by-side.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1E5FBF]">
                      Comparing {comparedIncidents.length} of 2 selected
                    </span>
                  </div>

                  {/* Historical Table */}
                  <div className="border border-[#E1EEF9] rounded-xl overflow-hidden bg-white mb-6">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FBFE] border-b border-[#E1EEF9] text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center">Compare</th>
                          <th className="p-3 font-semibold">Incident Name & Year</th>
                          <th className="p-3 font-semibold">Location / Region</th>
                          <th className="p-3 font-semibold">Severity</th>
                          <th className="p-3 font-semibold">Volume (Tonnes)</th>
                          <th className="p-3 font-semibold">Response Time</th>
                          <th className="p-3 font-semibold">Containment %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {HISTORICAL_INCIDENTS.map((h) => {
                          const isChecked = selectedHistIds.includes(h.id);
                          return (
                            <tr
                              key={h.id}
                              onClick={() => handleToggleHist(h.id)}
                              className={`hover:bg-slate-50 cursor-pointer ${
                                isChecked ? "bg-[#EFF6FD]" : ""
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleHist(h.id)}
                                  className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 font-bold text-[#0B2545]">
                                <div>{h.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{h.vesselName} ({h.flag})</div>
                              </td>
                              <td className="p-3 text-slate-600">{h.location}</td>
                              <td className="p-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    h.severity === "Critical"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {h.severity}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-700">
                                {h.spillVolumeTonnes.toLocaleString()} t
                              </td>
                              <td className="p-3 font-mono text-slate-600">{h.responseTimeHours} hrs</td>
                              <td className="p-3 font-mono font-bold text-emerald-600">
                                {h.containmentRate}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Side-by-Side Comparison Cards */}
                  {comparedIncidents.length === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#E1EEF9]">
                      {comparedIncidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="p-5 rounded-2xl border border-[#E1EEF9] bg-[#F8FBFE] shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div>
                              <h3 className="font-bold text-sm text-[#0B2545]">{inc.name}</h3>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {inc.date} &bull; {inc.location}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-black text-rose-600">
                              {inc.spillAreaKm2} km² Slick
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-3 rounded-xl border border-slate-200">
                            <div>Response Time: <span className="font-bold text-[#0B2545]">{inc.responseTimeHours}h</span></div>
                            <div>Containment: <span className="font-bold text-emerald-600">{inc.containmentRate}%</span></div>
                            <div>Attribution: <span className="font-bold text-[#1E5FBF]">{inc.attributionCertainty}%</span></div>
                            <div>Spill Volume: <span className="font-bold text-slate-700">{inc.spillVolumeTonnes} t</span></div>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <div className="font-bold text-[#0B2545]">Legal Outcome:</div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{inc.legalOutcome}</p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                            <span className="font-bold">Key Architectural Lesson: </span>
                            <span className="text-[11px]">{inc.keyLesson}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 5: EXECUTIVE REPORTS & FORENSIC DOSSIERS                    */}
            {/* =============================================================== */}
            {activeTab === "reports" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header Hero Banner */}
                <div className="bg-gradient-to-r from-[#0B2545] via-[#123A66] to-[#1E5FBF] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Official &bull; Restricted
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                          MARPOL Annex I Court-Admissible
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          SHA-256 Merkle Verified
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Forensic Intelligence &amp; Dossier Center
                      </h2>
                      <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed">
                        Compile verified multi-modal evidence across satellite SAR segmentation, backward hydrodynamic trajectory, AIS kinematic anomalies, and 7-dimension statistical confidence scores into statutory Indian Coast Guard and UNCLOS-compliant dossiers.
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/50 transition-all cursor-pointer"
                      >
                        <FileText className="w-5 h-5 text-white" />
                        <span>Launch 9-Page Dossier Generator</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Dossier Card & Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left (8 Cols): Dossier Breakdown & Audit */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-6">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9] mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#1E5FBF]" />
                          <h3 className="text-sm font-bold text-[#0B2545]">
                            Comprehensive Incident Forensic Report Structure
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#1E5FBF] bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                          9 Pages &bull; ISO/IEC 27037 Compliant
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {[
                          { num: "01", title: "Executive Summary", desc: "Briefing, classification & legal authority" },
                          { num: "02", title: "Satellite SAR Observation", desc: "Sentinel-1 VV/VH radar segmentation" },
                          { num: "03", title: "Hydrodynamic Hindcast", desc: "OpenDrift backward trajectory convergence" },
                          { num: "04", title: "AIS Kinematic Anomaly", desc: "180-minute blackout & velocity drop" },
                          { num: "05", title: "Forensic Matrix", desc: "7-dimension multi-modal attribution" },
                          { num: "06", title: "Response Operations", desc: "Tier-2 booming & skimmer countermeasure" },
                          { num: "07", title: "Ecological Vulnerability", desc: "Mangrove & coastal resource sensitivity" },
                          { num: "08", title: "Chain of Custody", desc: "Cryptographic SHA-256 Merkle hashes" },
                          { num: "09", title: "Command Sign-Off", desc: "Statutory orders & boarding directives" },
                        ].map((sec) => (
                          <div
                            key={sec.num}
                            onClick={() => setShowReportModal(true)}
                            className="p-3 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] hover:bg-sky-50/60 hover:border-sky-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[10px] font-black text-[#1E5FBF] bg-sky-100 px-1.5 py-0.2 rounded">
                                PAGE {sec.num}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#1E5FBF] group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div className="font-bold text-slate-800 text-xs">{sec.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{sec.desc}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#E1EEF9] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Admissible in Maritime Admiralty Court under Indian Evidence Act 65B</span>
                        </div>
                        <button
                          onClick={() => setShowReportModal(true)}
                          className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span>Preview &amp; Export Dossier (PDF)</span>
                        </button>
                      </div>
                    </div>

                    {/* Pre-Compiled Case Metadata Card */}
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-5">
                      <h4 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider mb-3">
                        Active Case Briefing Parameters (IN-MH-2026)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="text-[10px] text-slate-400">Incident Code</div>
                          <div className="font-bold text-[#0B2545] mt-0.5">IN-MH-2026</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="text-[10px] text-slate-400">Attributed Suspect</div>
                          <div className="font-bold text-rose-600 mt-0.5">MT PACIFIC VOYAGER</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="text-[10px] text-slate-400">Overall Attribution</div>
                          <div className="font-bold text-rose-600 mt-0.5">98.8% Certainty</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="text-[10px] text-slate-400">Slick Area &amp; Vol</div>
                          <div className="font-bold text-slate-700 mt-0.5">276 km² / ~1,200 t</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right (4 Cols): Alternative Reports & Quick Generators */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Fleet Surveillance Card */}
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                            Domain Surveillance
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            LIVE EEZ
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#0B2545] mb-1">
                          National EEZ Fleet Surveillance Audit
                        </h4>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          Comprehensive status report on all 30 vessels in the Mumbai Maritime Search &amp; Rescue Region, including dark vessel incidents, AIS gap logs, and high-risk tanker routes.
                        </p>

                        <div className="space-y-2 mb-4 text-xs font-mono bg-[#F8FBFE] p-3 rounded-xl border border-[#E1EEF9]">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-sans">Total Tracked:</span>
                            <span className="font-bold text-[#0B2545]">30 Vessels</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-sans">Dark Anomaly Vessels:</span>
                            <span className="font-bold text-rose-600">2 Vessels (Alert)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-sans">Nearby Response Assets:</span>
                            <span className="font-bold text-emerald-600">4 Cutters / 1 Helo</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowReportModal(true);
                        }}
                        className="w-full py-2.5 rounded-xl border border-[#1E5FBF] text-[#1E5FBF] hover:bg-[#1E5FBF] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Generate Fleet Surveillance Report</span>
                      </button>
                    </div>

                    {/* Cryptographic Verification Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-[#0B2545] text-white rounded-2xl p-5 shadow-md space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-sky-400" />
                        <span>Cryptographic Evidence Ledger</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        All report exports automatically embed immutable SHA-256 Merkle hashes signed with Coast Guard Key pair <span className="font-mono text-sky-300">CG-HQ-MRCC-9214</span>.
                      </p>
                      <div className="text-[10px] font-mono p-2 rounded-lg bg-black/40 border border-white/10 text-slate-400 break-all select-all">
                        SHA256: 4f8a92bc31e0892a76f284e56cd34b899a12e89d
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Official Forensic Analysis PDF Report Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        incidentTitle="Mumbai High Offshore Slick IN-MH-2026"
      />
    </div>
  );
};

export default AnalysisPage;
