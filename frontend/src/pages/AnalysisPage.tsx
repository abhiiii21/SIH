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
  Download,
  Eye,
  Layers,
  Maximize2,
  X,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Lock,
  Radio,
  Crosshair,
  Wind,
  Clock,
  Droplets,
  Anchor,
  RefreshCw,
  Award,
  Target,
  FileCheck,
  Cpu,
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
  ReferenceLine,
  Legend,
} from "recharts";
import { INCIDENT_DATA, VesselCandidate } from "../data/incidentData";
import { HISTORICAL_INCIDENTS, HistoricalIncident } from "../data/historicalIncidents";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import { generateClientEvidenceBriefPdf } from "../services/evidencePdfGenerator";
import sahayyaApi from "../services/api";

// ----------------------------------------------------------------------------
// CONSTANTS & PALETTES
// ----------------------------------------------------------------------------
export const VESSEL_COLORS: Record<string, { primary: string; light: string; badge: string; border: string }> = {
  "vessel-1": { primary: "#E11D48", light: "#FFE4E6", badge: "bg-rose-100 text-rose-700 border-rose-200", border: "#E11D48" }, // MT Pacific Voyager
  "vessel-2": { primary: "#D97706", light: "#FEF3C7", badge: "bg-amber-100 text-amber-700 border-amber-200", border: "#D97706" }, // CMA CGM Antares
  "vessel-3": { primary: "#6366F1", light: "#EEF2FF", badge: "bg-indigo-100 text-indigo-700 border-indigo-200", border: "#6366F1" }, // MV Nordic Trader
  "vessel-4": { primary: "#059669", light: "#D1FAE5", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", border: "#059669" }, // Sagar Shakti
};

// Contradicting forensic explanations for candidate vessels
export const CANDIDATE_FORENSIC_EXPLANATIONS: Record<string, { verdict: string; summary: string; ruledOutPoints: string[] }> = {
  "vessel-1": {
    verdict: "ATTRIBUTED SUSPECT (Rank #1)",
    summary: "Drastic speed drop from 13.8 to 1.4 kts correlates directly with 94 min transponder blackout along central slick centroid.",
    ruledOutPoints: [
      "94-min AIS blackout right across origin coordinates (18.78°N, 72.51°E)",
      "Kinematic speed reduction to 1.4 kts (discharge maneuvering speed)",
      "Reverse hydrodynamic particle stream achieves 99.4% spatial IoU convergence",
    ],
  },
  "vessel-2": {
    verdict: "RULED OUT (Rank #2 - 43.5% Match)",
    summary: "Maintained continuous high cruising speed (14.8 kts) along international transit lane with zero transponder interruption.",
    ruledOutPoints: [
      "Divergent course (148° SE) with CPA offset of 41.2 km from slick centroid",
      "Continuous AIS broadcast (0 min gap) verifies steady passage without stoppage",
      "Lagrangian reverse particle stream misses vessel track by > 38 km",
    ],
  },
  "vessel-3": {
    verdict: "RULED OUT (Rank #3 - 43.5% Match)",
    summary: "Transited south-bound along peripheral hindcast boundary; 12-min transponder latency coincided with convective storm squall.",
    ruledOutPoints: [
      "Peripheral track 39.8 km west of core hydrocarbon emulsion footprint",
      "Maintained constant 11.2 kts transit speed during 12-min squall latency",
      "Discharge physics model shows negative buoyancy match for crude oil wash",
    ],
  },
  "vessel-4": {
    verdict: "RULED OUT (Rank #4 - 13.9% Match)",
    summary: "Dedicated offshore supply vessel operating within ONGC oilfield concession under continuous coastal VTS radar lock.",
    ruledOutPoints: [
      "Operating 54.1 km NE of discharge origin within licensed oilfield sector",
      "Course 045° directly opposite to INCOIS surface advection vector (068° / 245°)",
      "Vessel fuel log and operational profile refute heavy crude cargo carriage",
    ],
  },
};

// Look-Alike Rejection Artifacts dataset
export interface LookAlikeArtifact {
  id: string;
  title: string;
  category: string;
  badge: string;
  badgeColor: string;
  confidence: number;
  reason: string;
  sarAnalysis: {
    polarizationRatio: string;
    windThreshold: string;
    textureWavenumber: string;
    rejectionConfidence: string;
  };
  explanation: string;
}

export const LOOK_ALIKE_ARTIFACTS: LookAlikeArtifact[] = [
  {
    id: "artifact-1",
    title: "Low-Wind Calm Ocean (Wind < 2.5 m/s)",
    category: "Atmospheric Null",
    badge: "Rejected (Non-Hazard)",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    confidence: 99.4,
    reason: "Specular radar reflection causes uniform low backscatter (dark patch); rejected using ERA5 10m wind threshold.",
    sarAnalysis: {
      polarizationRatio: "VV/VH Cross-Ratio: 0.88 (Isotropic)",
      windThreshold: "ERA5 Surface Wind: 1.8 m/s (Below 2.5 m/s threshold)",
      textureWavenumber: "Fourier High-Freq Energy: Null (Glassy surface)",
      rejectionConfidence: "99.4% Certainty (Non-Hydrocarbon)",
    },
    explanation: "Under ultra-calm sea states (wind < 2.5 m/s), the ocean surface behaves as a specular mirror, reflecting radar pulses away from the satellite receiver and producing false dark patches indistinguishable from oil in single-pol SAR. Sahayya's ERA5 10m wind-field layer automatically flags and rejects these meteorological false alarms.",
  },
  {
    id: "artifact-2",
    title: "Biogenic Natural Slick (Algal Bloom)",
    category: "Biological Surfactant",
    badge: "Rejected (Biological)",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    confidence: 98.6,
    reason: "Natural monomolecular surfactant layer; rejected via VV/VH dual-pol cross-polarization ratio & spatial dispersion.",
    sarAnalysis: {
      polarizationRatio: "VV/VH Co-Polar Ratio: 0.12 (Monomolecular thin film)",
      windThreshold: "ERA5 Surface Wind: 4.8 m/s (Optimal radar bracket)",
      textureWavenumber: "Spectral Damping Slope: k^-2.5 (Surfactant elasticity)",
      rejectionConfidence: "98.6% Certainty (Organic Bloom)",
    },
    explanation: "Phytoplankton and algal blooms generate organic biogenic films that dampen capillary-gravity waves. However, biogenic films are strictly monomolecular (< 0.1 µm thick), producing distinct VV/VH co-polarization damping slopes compared to thick mineral crude emulsions (> 50 µm).",
  },
  {
    id: "artifact-3",
    title: "Internal Gravity Waves (Solibores)",
    category: "Oceanographic Wave Artifact",
    badge: "Filtered (Wave Artifact)",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    confidence: 97.9,
    reason: "Periodic dark and bright alternating linear crest bands; filtered by 2D spatiotemporal Fourier texture filter.",
    sarAnalysis: {
      polarizationRatio: "VV/VH Cross-Ratio: Alternating ±4.2 dB modulation",
      windThreshold: "Tidal Stratification: Shelf-break pycnocline active",
      textureWavenumber: "Spatial Wavelength: λ = 850m (Solitary packet)",
      rejectionConfidence: "97.9% Certainty (Ocean Wave Packet)",
    },
    explanation: "Subsurface internal waves interacting with continental shelf bathymetry produce surface convergence and divergence zones, creating alternating dark and bright linear bands. The 2D Fourier spatial wavenumber transform identifies the distinct packet periodicity (850m) and filters out the artifact.",
  },
  {
    id: "artifact-4",
    title: "Rain Cell Convective Squall Downburst",
    category: "Meteorological Damping",
    badge: "Rejected (Rain Squall)",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    confidence: 98.1,
    reason: "Atmospheric rain column attenuation and ring-wave turbulence; cross-verified with INSAT-3D thermal IR brightness.",
    sarAnalysis: {
      polarizationRatio: "Cross-Pol Depolarization: +3.8 dB (Rain drop scattering)",
      windThreshold: "INSAT-3D Cloud Top Temp: -58°C (Deep Convection)",
      textureWavenumber: "Ring-Wave Turbulence: High isotropic variance",
      rejectionConfidence: "98.1% Certainty (Tropical Squall)",
    },
    explanation: "Heavy tropical downpours attenuate C-band radar signals and create surface turbulence rings that dampen capillary waves. Sahayya cross-references real-time INSAT-3D cloud top brightness temperature to eliminate rain-induced radar shadows.",
  },
];

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

  // Read URL query params
  const initialTab = (searchParams.get("tab") as AnalysisTab) || "counterfactual";
  const initialVesselQuery = searchParams.get("vessel") || "";

  const [activeTab, setActiveTab] = useState<AnalysisTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // --------------------------------------------------------------------------
  // SHARED CANDIDATE STATE (Across all sub-tabs)
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // --------------------------------------------------------------------------
  // TAB 1: COUNTERFACTUAL LAB STATE (Stage 12)
  // --------------------------------------------------------------------------
  const [labMode, setLabMode] = useState<"single" | "runAll">("single");
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0.0); // -3.0h to +3.0h
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(100);
  const [activeOverlayView, setActiveOverlayView] = useState<"sideBySide" | "overlay">("sideBySide");

  // Live dynamic correlation calculation based on time offset
  const liveCorrelation = useMemo(() => {
    const isTop = selectedCandidate.rank === 1;
    const absOffset = Math.abs(timeOffsetHours);
    if (isTop) {
      const discrepancy = Math.min(25, 0.6 + absOffset * 3.4);
      const match = Math.max(75, 99.4 - absOffset * 3.4);
      return {
        discrepancy: discrepancy.toFixed(1),
        match: match.toFixed(1),
        status: absOffset < 1.0 ? "OPTIMAL CONVERGENCE" : "DEGRADED TIME-MATCH",
        timeLabel:
          timeOffsetHours === 0
            ? "T₀ = 02:45 UTC (Nominal Discharge)"
            : timeOffsetHours > 0
            ? `T₀ + ${timeOffsetHours.toFixed(1)}h (0${(2.75 + timeOffsetHours).toFixed(1).replace(".", ":")}0 UTC)`
            : `T₀ - ${absOffset.toFixed(1)}h (0${Math.max(0, 2.75 - absOffset).toFixed(1).replace(".", ":")}0 UTC)`,
      };
    } else {
      const discrepancy = Math.min(80, 44.8 + absOffset * 4.0);
      const match = Math.max(20, 55.2 - absOffset * 4.0);
      return {
        discrepancy: discrepancy.toFixed(1),
        match: match.toFixed(1),
        status: "DIVERGENT TRACK",
        timeLabel: `T₀ ${timeOffsetHours >= 0 ? "+" : ""}${timeOffsetHours.toFixed(1)}h Release Offset`,
      };
    }
  }, [selectedCandidate, timeOffsetHours]);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationProgress(20);

    try {
      const res = await sahayyaApi.simulation.runCounterfactual("IN-MH-2026", 1, {
        wind_speed_ms: 7.5,
        wind_direction_deg: 245.0,
        current_speed_ms: 0.85,
        current_direction_deg: 65.0,
      });
      setSimulationProgress(65);

      setTimeout(async () => {
        setSimulationProgress(100);
        setIsSimulating(false);
        try {
          if (res?.job_id) {
            const statusRes = await sahayyaApi.simulation.getCounterfactualStatus(res.job_id);
            if (statusRes?.match_score_pct) {
              triggerToast(`OpenDrift Hydrodynamic Hindcast: ${statusRes.match_score_pct}% overlap match!`);
              return;
            }
          }
        } catch (e) {}
        triggerToast(`Counterfactual hydrodynamics converged for ${selectedCandidate.name}`);
      }, 700);
    } catch (err) {
      setTimeout(() => {
        setSimulationProgress(100);
        setIsSimulating(false);
        triggerToast(`Counterfactual hydrodynamics computed for ${selectedCandidate.name}`);
      }, 800);
    }
  };

  // Evidence breakdown for candidate
  const candidateEvidenceData = useMemo(() => {
    const isTop = selectedCandidate.rank === 1;
    const absOffset = Math.abs(timeOffsetHours);
    const timePenalty = absOffset * 4.0;
    return [
      {
        name: "Time Match",
        score: isTop ? Math.max(70, Math.round(99.2 - timePenalty)) : Math.min(80, Math.round(selectedCandidate.score * 0.9)),
        color: "#1E5FBF",
      },
      {
        name: "Location Match",
        score: isTop ? Math.max(75, Math.round(97.8 - timePenalty * 0.5)) : Math.min(75, Math.round(selectedCandidate.score * 0.85)),
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
        color: "#E11D48",
      },
      {
        name: "Physics Match",
        score: isTop ? Math.max(70, Math.round(94.7 - timePenalty * 0.8)) : Math.min(60, Math.round(selectedCandidate.score * 0.7)),
        color: "#6366F1",
      },
    ];
  }, [selectedCandidate, timeOffsetHours]);

  // --------------------------------------------------------------------------
  // TAB 2: WHAT-IF SIMULATOR STATE (Stage 18 - Priority #1)
  // --------------------------------------------------------------------------
  const [selectedStrategyId, setSelectedStrategyId] = useState("strat-1");
  // Interactive assumption sliders:
  const [simWindSpeedKts, setSimWindSpeedKts] = useState<number>(14.2); // 5 to 30 kts (nominal 14.2)
  const [simDeployDelayHours, setSimDeployDelayHours] = useState<number>(2.0); // 0 to 8 h (nominal 2.0)
  const [simBoomMeters, setSimBoomMeters] = useState<number>(1500); // 500 to 3000 m (nominal 1500)

  // Live strategy recalculation engine with uncertainty ranges
  const dynamicScenarios = useMemo(() => {
    // Environmental perturbation multipliers
    const windFactor = simWindSpeedKts / 14.2; // 1.0 nominal
    const delayDelta = simDeployDelayHours - 2.0; // 0 nominal
    const boomFactor = 1500 / simBoomMeters; // 1.0 nominal

    // Base definition with mathematical perturbation
    const baseList = [
      {
        id: "strat-1",
        name: "Immediate Containment (T + 0h)",
        desc: "Deploy ICGS Vikram offshore barrier within 2 hours of SAR detection with high-speed ocean boom.",
        baseImpact: 4.2,
        baseArea: 295.0,
        baseTime: 14.5,
        baseCost: 42,
        recommended: true,
        baseScore: 94,
      },
      {
        id: "strat-2",
        name: "Delayed Mobilization (T + 6h)",
        desc: "Wait for secondary SAR optical confirmation pass before surface fleet dispatch.",
        baseImpact: 38.6,
        baseArea: 442.0,
        baseTime: 36.0,
        baseCost: 118,
        recommended: false,
        baseScore: 52,
      },
      {
        id: "strat-3",
        name: "Zone A Skimming Prioritization",
        desc: "Focus all skimming cutters exclusively on Alibaug turtle breeding beaches and mangrove nursery zones.",
        baseImpact: 12.8,
        baseArea: 340.0,
        baseTime: 22.0,
        baseCost: 75,
        recommended: false,
        baseScore: 81,
      },
    ];

    return baseList.map((sc) => {
      // Dynamic adjustments
      let impact = sc.baseImpact;
      let area = sc.baseArea;
      let time = sc.baseTime;
      let cost = sc.baseCost;

      // Wind pushes slick faster towards shore
      impact = impact * (0.6 + 0.4 * windFactor);
      area = area * (0.8 + 0.2 * windFactor);

      // Delay increases spread and containment difficulty
      if (delayDelta > 0) {
        impact += delayDelta * (sc.id === "strat-1" ? 1.8 : sc.id === "strat-3" ? 2.5 : 4.0);
        area += delayDelta * 18.0;
        time += delayDelta * 1.5;
        cost += delayDelta * 5.0;
      } else if (delayDelta < 0) {
        impact = Math.max(1.2, impact + delayDelta * 1.2);
        area = Math.max(250, area + delayDelta * 12.0);
        time = Math.max(8.0, time + delayDelta * 1.2);
      }

      // Boom length reduces impact
      impact = impact * (0.5 + 0.5 * boomFactor);

      // Best-case / worst-case bounds (±15% to ±30% depending on environmental turbulence)
      const bestImpact = Math.max(0.8, impact * 0.78).toFixed(1);
      const worstImpact = (impact * 1.32).toFixed(1);

      const bestArea = Math.round(area * 0.92);
      const worstArea = Math.round(area * 1.14);

      const bestTime = Math.max(6.0, time * 0.85).toFixed(1);
      const worstTime = (time * 1.2).toFixed(1);

      const bestCost = Math.round(cost * 0.9);
      const worstCost = Math.round(cost * 1.18);

      // Dynamic score
      let score = Math.round(100 - impact * 1.5 - (time / 40) * 20);
      score = Math.max(20, Math.min(98, score));

      return {
        ...sc,
        score,
        impactMean: impact.toFixed(1),
        bestImpact,
        worstImpact,
        areaMean: Math.round(area),
        bestArea,
        worstArea,
        timeMean: time.toFixed(1),
        bestTime,
        worstTime,
        costMean: Math.round(cost),
        bestCost,
        worstCost,
      };
    });
  }, [simWindSpeedKts, simDeployDelayHours, simBoomMeters]);

  // Auto-generated dynamic recommendation sentence
  const dynamicRecommendation = useMemo(() => {
    const strat1 = dynamicScenarios[0];
    const strat2 = dynamicScenarios[1];
    const savingsLakhs = Math.round(strat2.costMean - strat1.costMean);
    return `Fastest containment at lowest cost (₹${strat1.bestCost}L–₹${strat1.worstCost}L), restricting Maharashtra coastline impact to ${strat1.bestImpact}%–${strat1.worstImpact}% and saving ~₹${savingsLakhs}L vs delayed dispatch despite higher initial mobilization speed.`;
  }, [dynamicScenarios]);

  // --------------------------------------------------------------------------
  // TAB 3: MODEL CONFIDENCE STATE
  // --------------------------------------------------------------------------
  const [selectedArtifactModal, setSelectedArtifactModal] = useState<LookAlikeArtifact | null>(null);
  const [showFullModelMetrics, setShowFullModelMetrics] = useState(false);

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
  // TAB 4: HISTORICAL COMPARISON STATE
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

  // Comparative Track Record data for IN-MH-2026 vs Historical Average
  const benchmarkComparisonData = [
    { metric: "Attribution Certainty", thisCase: 98.8, historicalAvg: 64.6, bestPast: 100, unit: "%" },
    { metric: "SAR Detection Confidence", thisCase: 94.6, historicalAvg: 76.2, bestPast: 96.0, unit: "%" },
    { metric: "Containment Projection", thisCase: 92.0, historicalAvg: 58.5, bestPast: 91.0, unit: "%" },
    { metric: "Early Warning Lead Time", thisCase: 85.0, historicalAvg: 32.0, bestPast: 80.0, unit: "% Score" },
  ];

  // --------------------------------------------------------------------------
  // TAB 5: EXECUTIVE REPORTS STATE
  // --------------------------------------------------------------------------
  const [reportSections, setReportSections] = useState({
    sec1: true, // Executive Summary
    sec2: true, // Satellite SAR Observation
    sec3: true, // Hydrodynamic Hindcast
    sec4: true, // AIS Kinematic Anomaly
    sec5: true, // Multi-Candidate Attribution
    sec6: true, // Response Operations What-If
    sec7: true, // Ecological Vulnerability
    sec8: true, // Historical Benchmarking
    sec9: true, // Command Sign-Off & Chain of Custody
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const toggleSection = (key: keyof typeof reportSections) => {
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllSections = (val: boolean) => {
    setReportSections({
      sec1: val,
      sec2: val,
      sec3: val,
      sec4: val,
      sec5: val,
      sec6: val,
      sec7: val,
      sec8: val,
      sec9: val,
    });
  };

  const handleDownloadCustomPdf = async () => {
    setIsExportingPdf(true);
    try {
      const pdfBlob = await generateClientEvidenceBriefPdf({
        vesselName: selectedCandidate.name,
        vesselType: selectedCandidate.type,
        flag: selectedCandidate.flag,
        imo: selectedCandidate.imo,
        mmsi: "636019842",
        builtYear: "2018",
        speedKts: parseFloat(selectedCandidate.currentSpeed) || 1.4,
        headingDeg: parseInt(selectedCandidate.course) || 312,
        overallScore: selectedCandidate.score,
        cpaKm: parseFloat(selectedCandidate.cpa) || 27.46,
        darkDuration: selectedCandidate.aisGap,
        hindcastMatch: `${liveCorrelation.match}% IoU`,
        anomalyLevel: selectedCandidate.rank === 1 ? "CRITICAL (Severe AIS Disconnect)" : "LOW (Standard Transit)",
        dimensions: candidateEvidenceData.map((d) => ({ name: d.name, score: d.score, color: d.color })),
        incidentCode: "IN-MH-2026",
        incidentTitle: "Mumbai High Offshore Slick IN-MH-2026",
        incidentRegion: "Arabian Sea / West Coast Indian EEZ",
        spillAreaKm2: 276.04,
        severityScore: 82,
        detectionSensor: "Copernicus Sentinel-1A C-band IW",
        investigatingAgency: "Indian Coast Guard & Ministry of Defence (MDA)",
        counterfactualExecuted: true,
        counterfactualScore: parseFloat(liveCorrelation.match),
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ICG_Forensic_Dossier_IN-MH-2026_${selectedCandidate.name.replace(/[\s/]+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerToast(`Official 9-Page Dossier downloaded for ${selectedCandidate.name}!`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      triggerToast("Error generating PDF. Launching report pipeline...");
      setShowReportModal(true);
    } finally {
      setIsExportingPdf(false);
    }
  };

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
                <span className="font-display font-bold text-[#0B2545] text-base tracking-[0.14em] leading-none">
                  SAHAYYA
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-sky-100 text-[#1E5FBF] rounded-sm uppercase tracking-wider font-body badge-text">
                  Analysis Lab
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal leading-tight font-body">
                Forensic Attribution Engine &amp; Predictive Response Optimization
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-body">
          {/* Active Candidate Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400">Attribution Subject:</span>
            <span
              className="font-bold flex items-center gap-1.5"
              style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}
            >
              <Ship className="w-3.5 h-3.5" />
              {selectedCandidate.name} ({selectedCandidate.score}%)
            </span>
          </div>

          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer btn-text"
            title="Generate Official 9-Page Incident Forensic Dossier (PDF)"
          >
            <FileText className="w-4 h-4 text-sky-200" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={() => navigate("/incidents/IN-MH-2026")}
            className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer btn-text"
          >
            <Activity className="w-3.5 h-3.5 text-rose-600" />
            <span>Active Case: <span className="font-mono">IN-MH-2026</span></span>
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
              { id: "Help", icon: HelpCircle, label: "Help", path: "" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
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
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  <span className="text-[9px] font-medium tracking-tight font-body">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-1 text-center font-body">
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
                <h1 className="heading-page text-[#0B2545]">
                  Forensic Attribution &amp; Scenario Lab
                </h1>
                <p className="body-description text-sm sm:text-[15px] text-slate-600 mt-1 font-body leading-relaxed">
                  Flowchart Stages 11, 12, 18 &bull; Probabilistic vessel attribution and Lagrangian hydrodynamic modeling.
                </p>
              </div>

              {/* 5 Primary Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-sm flex-wrap sm:flex-nowrap font-body">
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer btn-text ${
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
                {/* Lab Mode Toggle & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider font-display">
                      Simulation Mode:
                    </span>
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setLabMode("single")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          labMode === "single"
                            ? "bg-[#0B2545] text-white shadow-xs"
                            : "text-slate-600 hover:text-[#0B2545]"
                        }`}
                      >
                        Single Vessel Deep-Dive
                      </button>
                      <button
                        onClick={() => setLabMode("runAll")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          labMode === "runAll"
                            ? "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white shadow-xs"
                            : "text-slate-600 hover:text-[#0B2545]"
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run All (4 Candidates Side-by-Side)</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
                      <span>{isSimulating ? "Re-running Lagrangian Hindcast..." : "Re-run Hydrodynamics"}</span>
                    </button>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* RUN ALL (4) CANDIDATES COMPARATIVE GRID VIEW                   */}
                {/* ------------------------------------------------------------- */}
                {labMode === "runAll" ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-gradient-to-r from-[#0B2545] to-[#1E5FBF] text-white rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>
                          <strong>Parallel Multi-Vessel Hindcast Matrix:</strong> Lagrangian reverse-particle advection executed across all 4 AIS tracks simultaneously.
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-sky-200">OpenDrift v1.9 + INCOIS Ocean Wave Coupling</span>
                    </div>

                    {/* 4 Small-Multiple Panels (2x2 Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidates.map((cand) => {
                        const isTop = cand.rank === 1;
                        const vColor = VESSEL_COLORS[cand.id] || VESSEL_COLORS["vessel-1"];
                        const explanation = CANDIDATE_FORENSIC_EXPLANATIONS[cand.id];

                        return (
                          <div
                            key={cand.id}
                            onClick={() => {
                              setSelectedCandidate(cand);
                              setLabMode("single");
                            }}
                            className={`p-4 rounded-2xl bg-white/95 backdrop-blur-md border transition-all cursor-pointer shadow-md hover:shadow-xl hover:scale-[1.01] ${
                              selectedCandidate.id === cand.id
                                ? "ring-2 ring-[#1E5FBF] border-[#1E5FBF]"
                                : "border-[#E1EEF9]"
                            }`}
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: vColor.primary }}
                                />
                                <div>
                                  <h3 className="font-display font-bold text-xs text-[#0B2545]">{cand.name}</h3>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    IMO {cand.imo} &bull; {cand.type} &bull; Rank #{cand.rank}
                                  </div>
                                </div>
                              </div>
                              <span className={`badge-text px-2.5 py-0.5 rounded-full border text-xs font-bold ${vColor.badge}`}>
                                {cand.score}% Match
                              </span>
                            </div>

                            {/* Small Miniature Map Graphic */}
                            <div className="h-44 bg-[#061220] rounded-xl relative overflow-hidden border border-[#172E4D] p-2 flex flex-col justify-between shadow-inner">
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 160">
                                {/* Grid lines */}
                                <g stroke="#1E5FBF" strokeWidth="0.5" opacity="0.25" strokeDasharray="3 3">
                                  <line x1="50" y1="0" x2="50" y2="160" />
                                  <line x1="140" y1="0" x2="140" y2="160" />
                                  <line x1="230" y1="0" x2="230" y2="160" />
                                  <line x1="0" y1="40" x2="280" y2="40" />
                                  <line x1="0" y1="80" x2="280" y2="80" />
                                  <line x1="0" y1="120" x2="280" y2="120" />
                                </g>

                                {/* Observed SAR Slick Boundary */}
                                <g transform="translate(140, 80) rotate(-24.6)">
                                  <path
                                    d="M-40,0 Q-30,-20 0,-18 Q30,-16 40,0 Q30,20 0,18 Q-30,16 -40,0 Z"
                                    fill="rgba(239, 68, 68, 0.4)"
                                    stroke="#EF4444"
                                    strokeWidth="1.5"
                                  />
                                  <circle cx="0" cy="0" r="2.5" fill="#FEF08A" />
                                </g>

                                {/* Vessel Specific Track and Envelope */}
                                {isTop ? (
                                  <>
                                    {/* MT Pacific Voyager - Gap and reachability envelope */}
                                    <path
                                      d="M40,25 L95,55 L140,80 L210,120 L260,150"
                                      fill="none"
                                      stroke="#F59E0B"
                                      strokeWidth="1.5"
                                      strokeDasharray="4 2"
                                    />
                                    {/* 94-min Gap Line in Red */}
                                    <line x1="95" y1="55" x2="140" y2="80" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
                                    {/* Reachability Envelope enclosing origin */}
                                    <circle
                                      cx="95"
                                      cy="55"
                                      r="58"
                                      fill="rgba(244, 63, 94, 0.12)"
                                      stroke="#F43F5E"
                                      strokeWidth="1.2"
                                      strokeDasharray="4 3"
                                    />
                                    {/* Reverse Particle Stream */}
                                    <path d="M80,50 Q110,65 140,80" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
                                  </>
                                ) : cand.id === "vessel-2" ? (
                                  <>
                                    {/* CMA CGM Antares - Continuous Transit Track */}
                                    <path d="M20,140 L120,95 L190,60 L270,25" fill="none" stroke="#D97706" strokeWidth="1.5" strokeDasharray="4 2" />
                                    {/* Reachability Envelope Missing Origin */}
                                    <circle cx="120" cy="95" r="16" fill="none" stroke="#D97706" strokeWidth="1" strokeDasharray="3 3" />
                                    {/* Divergent Particle Stream */}
                                    <path d="M60,40 Q90,55 120,68" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
                                  </>
                                ) : cand.id === "vessel-3" ? (
                                  <>
                                    {/* MV Nordic Trader */}
                                    <path d="M60,10 L60,80 L60,155" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 2" />
                                    <circle cx="60" cy="80" r="22" fill="none" stroke="#6366F1" strokeWidth="1" strokeDasharray="3 3" />
                                    <path d="M80,60 Q110,70 140,80" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                                  </>
                                ) : (
                                  <>
                                    {/* Sagar Shakti */}
                                    <path d="M200,20 L235,50 L210,80" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 2" />
                                    <circle cx="210" cy="80" r="12" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="3 3" />
                                    <path d="M160,110 Q150,95 140,80" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 2" opacity="0.3" />
                                  </>
                                )}
                              </svg>

                              {/* Mini HUD Badge */}
                              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono">
                                <span className={`px-1.5 py-0.5 rounded bg-black/70 text-white font-bold`}>
                                  {isTop ? "ENVELOPE COINCIDES (99.4%)" : `CPA OFFSET: ${cand.cpa}`}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded ${isTop ? "bg-rose-900/80 text-rose-200" : "bg-slate-800 text-slate-300"}`}>
                                  Gap: {cand.aisGap}
                                </span>
                              </div>

                              <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-slate-300">
                                <span>Speed: {cand.currentSpeed}</span>
                                <span className="text-sky-300">Click to Deep-Dive &rarr;</span>
                              </div>
                            </div>

                            {/* Why Ruled Out / Verdict Summary */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold">
                                {isTop ? (
                                  <span className="text-rose-600 flex items-center gap-1 font-body">
                                    <Target className="w-3.5 h-3.5" /> {explanation?.verdict}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 flex items-center gap-1 font-body">
                                    <Scale className="w-3.5 h-3.5 text-amber-600" /> {explanation?.verdict}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-body">
                                {explanation?.summary}
                              </p>
                              <div className="mt-2 space-y-1">
                                {explanation?.ruledOutPoints.slice(0, 2).map((pt, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500 font-body">
                                    <span className="text-[#1E5FBF] font-bold">&bull;</span>
                                    <span>{pt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ----------------------------------------------------------- */
                  /* SINGLE CANDIDATE INTERACTIVE DEEP-DIVE VIEW                 */
                  /* ----------------------------------------------------------- */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Candidates Selector & Ruled-Out Details (3 cols) */}
                    <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                          <span className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                            Candidate Vessels (4)
                          </span>
                          <span className="data-mono-sm text-slate-400 font-mono">Case IN-MH</span>
                        </div>

                        <div className="space-y-2.5 max-h-[440px] overflow-y-auto custom-tactical-scrollbar pr-1">
                          {candidates.map((cand) => {
                            const isSel = selectedCandidate.id === cand.id;
                            const vColor = VESSEL_COLORS[cand.id] || VESSEL_COLORS["vessel-1"];
                            const expl = CANDIDATE_FORENSIC_EXPLANATIONS[cand.id];

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
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: vColor.primary }}
                                    />
                                    <span className="font-body font-semibold text-xs text-[#0B2545]">{cand.name}</span>
                                  </div>
                                  <span className={`badge-text px-2 py-0.5 rounded-full border text-[10px] font-bold ${vColor.badge}`}>
                                    {cand.score}%
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
                                  <span>IMO: {cand.imo}</span>
                                  <span className="font-bold">Gap: {cand.aisGap}</span>
                                </div>

                                {/* Short Ruled Out Reason */}
                                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 font-body leading-snug">
                                  {cand.rank === 1 ? (
                                    <span className="text-rose-700 font-medium">★ Primary Forensic Suspect (94m gap + speed drop)</span>
                                  ) : (
                                    <span className="text-slate-500">
                                      <strong className="text-slate-700">Ruled Out:</strong> {expl?.ruledOutPoints[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex items-center justify-between">
                        <span className="micro-text text-slate-400 font-body">Selected for Hindcast</span>
                        <span className="font-mono text-xs font-bold text-[#1E5FBF]">
                          Rank #{selectedCandidate.rank} &bull; {selectedCandidate.flag}
                        </span>
                      </div>
                    </div>

                    {/* Middle Column: Interactive Hindcast Map + Live Time Slider (5 cols) */}
                    <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                          <div>
                            <span className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                              Reverse Particle Trajectory vs SAR Slick
                            </span>
                            <div className="data-mono-sm font-mono flex items-center gap-1.5 mt-0.5">
                              <span style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}>
                                ● {selectedCandidate.name}
                              </span>
                              <span className="text-slate-400">&bull;</span>
                              <span className="text-slate-500">{selectedCandidate.type}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold font-body">
                            <button
                              onClick={() => setActiveOverlayView("sideBySide")}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                activeOverlayView === "sideBySide"
                                  ? "bg-white text-[#0B2545] shadow-xs"
                                  : "text-slate-600"
                              }`}
                            >
                              Dual
                            </button>
                            <button
                              onClick={() => setActiveOverlayView("overlay")}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                activeOverlayView === "overlay"
                                  ? "bg-white text-[#0B2545] shadow-xs"
                                  : "text-slate-600"
                              }`}
                            >
                              Overlap
                            </button>
                          </div>
                        </div>

                        {/* Interactive Time-Offset Slider Bar */}
                        <div className="mb-3 p-2.5 rounded-xl bg-[#F0F7FF] border border-sky-200">
                          <div className="flex items-center justify-between text-xs mb-1 font-mono">
                            <span className="text-slate-600 font-body font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#1E5FBF]" />
                              Release Window Hindcast Offset:
                            </span>
                            <span className="font-bold text-[#1E5FBF]">
                              {timeOffsetHours >= 0 ? `+${timeOffsetHours.toFixed(1)}h` : `${timeOffsetHours.toFixed(1)}h`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-3.0"
                            max="3.0"
                            step="0.5"
                            value={timeOffsetHours}
                            onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
                            className="w-full accent-[#1E5FBF] cursor-pointer h-1.5 bg-sky-200 rounded-lg"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>-3.0h (Early)</span>
                            <span className="font-bold text-[#0B2545]">T₀ (Nominal: 02:45 UTC)</span>
                            <span>+3.0h (Late)</span>
                          </div>
                        </div>

                        {/* Simulation Map Graphic */}
                        <div className="min-h-[290px] bg-[#061220] rounded-xl relative overflow-hidden border border-[#172E4D] flex flex-col justify-between p-3 select-none shadow-inner">
                          {/* Background Satellite SAR Radar Texture */}
                          <img
                            src="/sar-oil-spill-radar.jpg"
                            alt="Sentinel-1 SAR Radar Analysis"
                            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen pointer-events-none scale-105"
                          />

                          {/* SVG Vector Canvas Over Simulation */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 460 280">
                            {/* Tactical Geographic Coordinates Grid */}
                            <g stroke="#1E5FBF" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4">
                              <line x1="80" y1="0" x2="80" y2="280" />
                              <line x1="180" y1="0" x2="180" y2="280" />
                              <line x1="280" y1="0" x2="280" y2="280" />
                              <line x1="380" y1="0" x2="380" y2="280" />
                              <line x1="0" y1="60" x2="460" y2="60" />
                              <line x1="0" y1="140" x2="460" y2="140" />
                              <line x1="0" y1="220" x2="460" y2="220" />
                            </g>

                            {/* Coordinate Numbers */}
                            <text x="85" y="14" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">72&deg;30'E</text>
                            <text x="185" y="14" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">72&deg;40'E</text>
                            <text x="285" y="14" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">72&deg;50'E</text>
                            <text x="385" y="14" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">73&deg;00'E</text>
                            <text x="4" y="65" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">18&deg;55'N</text>
                            <text x="4" y="145" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">18&deg;45'N</text>
                            <text x="4" y="225" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" opacity="0.7">18&deg;35'N</text>

                            {/* Bathymetry Shelf Lines */}
                            <path d="M0,190 Q180,165 460,180" fill="none" stroke="#0284C7" strokeWidth="0.8" opacity="0.4" />
                            <text x="390" y="175" fill="#0284C7" fontSize="6.5" fontFamily="monospace" opacity="0.6">50m ISO-BATH</text>

                            {/* Reverse Lagrangian Particle Trajectory Stream (Dynamic with slider) */}
                            <g opacity="0.85" transform={`translate(${timeOffsetHours * 6}, ${timeOffsetHours * 3})`}>
                              <path d="M120,80 Q160,110 220,135 T320,160" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 3" />
                              <path d="M110,90 Q150,118 215,140 T315,168" fill="none" stroke="#38BDF8" strokeWidth="0.9" strokeDasharray="4 2" />
                              <path d="M135,70 Q175,102 225,130 T328,152" fill="none" stroke="#38BDF8" strokeWidth="0.9" strokeDasharray="3 3" />
                              {/* Particle markers */}
                              {[
                                [140, 95], [165, 110], [190, 122], [220, 136], [250, 145], [280, 154], [305, 160]
                              ].map(([px, py], i) => (
                                <circle key={i} cx={px} cy={py} r="1.8" fill="#38BDF8" opacity="0.9" />
                              ))}
                            </g>

                            {/* Candidate Specific AIS Track & Reachability Envelope */}
                            {selectedCandidate.rank === 1 ? (
                              <g>
                                <path
                                  d="M60,40 L160,95 L220,135 L340,195 L420,240"
                                  fill="none"
                                  stroke="#F59E0B"
                                  strokeWidth="2"
                                  strokeDasharray="5 3"
                                  opacity="0.85"
                                />
                                <circle cx="60" cy="40" r="3" fill="#38BDF8" />
                                <circle cx="160" cy="95" r="3.5" fill="#E11D48" />
                                <circle cx="340" cy="195" r="3" fill="#38BDF8" />

                                {/* Critical AIS Silence Gap Highlight Sector */}
                                <line x1="160" y1="95" x2="220" y2="135" stroke="#E11D48" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                                <line x1="160" y1="95" x2="220" y2="135" stroke="#FEF08A" strokeWidth="2" strokeDasharray="3 3" />

                                {/* AIS REACHABILITY ENVELOPE (Radius = Max Speed 14.5 kts x 94 min gap = 22.7 NM) */}
                                <circle
                                  cx="160"
                                  cy="95"
                                  r="92"
                                  fill="rgba(225, 29, 72, 0.08)"
                                  stroke="#E11D48"
                                  strokeWidth="1.5"
                                  strokeDasharray="6 4"
                                />
                                <text x="160" y="20" fill="#FDA4AF" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                                  AIS GAP REACHABILITY ENVELOPE (22.7 NM CONE)
                                </text>

                                {/* Warning Tag */}
                                <rect x="135" y="70" width="118" height="18" rx="4" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1" />
                                <text x="194" y="82" fill="#FEF08A" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                                  CRITICAL AIS GAP: 94 MIN
                                </text>
                              </g>
                            ) : (
                              /* Non-Top Candidate Track with Non-Reaching Envelope */
                              <g>
                                <path
                                  d="M40,240 L150,170 L280,100 L400,40"
                                  fill="none"
                                  stroke={VESSEL_COLORS[selectedCandidate.id]?.primary || "#94A3B8"}
                                  strokeWidth="2"
                                  strokeDasharray="5 3"
                                  opacity="0.8"
                                />
                                <circle cx="150" cy="170" r="3.5" fill="#94A3B8" />
                                <circle cx="280" cy="100" r="3.5" fill="#94A3B8" />
                                {/* Reachability Envelope Missing Origin */}
                                <circle
                                  cx="280"
                                  cy="100"
                                  r="32"
                                  fill="rgba(148, 163, 184, 0.08)"
                                  stroke="#94A3B8"
                                  strokeWidth="1.2"
                                  strokeDasharray="4 3"
                                />
                                <text x="280" y="60" fill="#CBD5E1" fontSize="7" fontFamily="monospace" textAnchor="middle">
                                  LIMITED ENVELOPE (MISSES ORIGIN BY {selectedCandidate.cpa})
                                </text>
                              </g>
                            )}

                            {/* Actual Observed Spill Boundary (Sentinel-1A SAR) */}
                            <g transform="translate(220, 135) rotate(-24.6)">
                              {/* Outer Sheen Aura */}
                              <path
                                d="M-85,0 Q-70,-45 0,-40 Q70,-35 85,0 Q70,45 0,40 Q-70,35 -85,0 Z"
                                fill="none"
                                stroke="#06B6D4"
                                strokeWidth="1.5"
                                opacity="0.6"
                              />
                              {/* Main Delineated Slick Polygon */}
                              <path
                                d="M-75,0 Q-60,-35 0,-32 Q60,-28 75,0 Q60,35 0,32 Q-60,28 -75,0 Z"
                                fill="url(#observedSlickGradient)"
                                stroke="#EF4444"
                                strokeWidth="2"
                                filter="drop-shadow(0 0 12px rgba(239,68,68,0.7))"
                              />
                              {/* Emulsion Core */}
                              <path
                                d="M-45,0 Q-35,-18 0,-16 Q35,-14 45,0 Q35,18 0,16 Q-35,14 -45,0 Z"
                                fill="#7F1D1D"
                                stroke="#F59E0B"
                                strokeWidth="1"
                                opacity="0.9"
                              />
                            </g>

                            {/* Origin Reticle Point */}
                            <g transform="translate(220, 135)">
                              <circle cx="0" cy="0" r="3" fill="#FEF08A" />
                              <circle cx="0" cy="0" r="7" fill="none" stroke="#FEF08A" strokeWidth="1" className="animate-ping" />
                              <text x="9" y="3" fill="#FEF08A" fontSize="8" fontFamily="monospace" fontWeight="bold">
                                ORIGIN (18.78&deg;N, 72.51&deg;E)
                              </text>
                            </g>

                            {/* Gradient Definition */}
                            <defs>
                              <radialGradient id="observedSlickGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#991B1B" stopOpacity="0.95" />
                                <stop offset="45%" stopColor="#DC2626" stopOpacity="0.85" />
                                <stop offset="85%" stopColor="#EA580C" stopOpacity="0.7" />
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.4" />
                              </radialGradient>
                            </defs>
                          </svg>

                          {/* Top Floating HUD Callouts */}
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="bg-[#0B2545]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white data-mono-sm font-mono flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${selectedCandidate.rank === 1 ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                              <span>Correlation Variance: </span>
                              <span className={`font-bold ${selectedCandidate.rank === 1 ? "text-emerald-400" : "text-amber-400"}`}>
                                {liveCorrelation.discrepancy}% Discrepancy ({liveCorrelation.match}% Match)
                              </span>
                            </div>

                            <div className="bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-mono text-sky-200">
                              {activeOverlayView === "overlay" ? "OVERLAY DIFF VIEW" : "DUAL RECONSTRUCTION"}
                            </div>
                          </div>

                          {/* Bottom Floating Telemetry Bar */}
                          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono bg-[#0B1D35]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-300 font-bold">{liveCorrelation.timeLabel}</span>
                              <span className="text-slate-400">&bull;</span>
                              <span className="text-sky-300">INCOIS Current: 0.82 kts</span>
                            </div>
                            <div className={`font-bold ${selectedCandidate.rank === 1 ? "text-emerald-400" : "text-amber-400"}`}>
                              Status: {liveCorrelation.status}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 body-description text-xs sm:text-[13px] text-slate-600 leading-relaxed font-body">
                        Lagrangian reverse advection simulates backward dispersion envelopes to determine if vessel kinematics overlap with the Sentinel-1 SAR observation.
                      </div>
                    </div>

                    {/* Right Column: Evidence Breakdown & Dynamic Assessment (4 cols) */}
                    <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
                          <span className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                            Evidence Score Breakdown
                          </span>
                          <span
                            className={`badge-text px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                              selectedCandidate.rank === 1
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            Physics: {selectedCandidate.rank === 1 ? "HIGH CONSISTENCY" : "LOW MATCH"}
                          </span>
                        </div>

                        {/* Recharts Bar Chart */}
                        <div className="h-44 w-full font-body">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={candidateEvidenceData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <XAxis dataKey="name" tick={{ fontSize: 9.5, fontFamily: "Inter" }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 9.5, fontFamily: "Inter" }} />
                              <Tooltip />
                              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {candidateEvidenceData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Detailed Assessment Note */}
                        <div className="mt-3 p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] leading-relaxed font-body">
                          <div className="font-semibold text-xs text-[#0B2545] mb-1.5 uppercase tracking-wide flex items-center justify-between">
                            <span>Attribution Probability:</span>
                            <span
                              className="font-mono font-bold text-sm"
                              style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}
                            >
                              {selectedCandidate.score}%
                            </span>
                          </div>
                          {selectedCandidate.rank === 1 ? (
                            <p className="body-description text-xs text-slate-700 leading-relaxed font-body">
                              Vessel transited through the core discharge polygon. Speed drop to 1.4 kts correlates with 94 min transponder gap right along the central slick centroid. Hydrodynamic match is optimal ({liveCorrelation.match}% IoU).
                            </p>
                          ) : (
                            <div className="space-y-1 text-xs text-slate-700 font-body">
                              <p className="font-semibold text-slate-800">
                                {CANDIDATE_FORENSIC_EXPLANATIONS[selectedCandidate.id]?.verdict}:
                              </p>
                              <p className="text-slate-600">
                                {CANDIDATE_FORENSIC_EXPLANATIONS[selectedCandidate.id]?.summary}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <div className="mt-4 pt-3 border-t border-[#E1EEF9] micro-text text-slate-400 font-body leading-tight">
                        &bull; <span className="font-semibold">Legal Note:</span> Probabilistic intelligence evidence generated under IMO guidelines &mdash; not legal proof of liability.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: WHAT-IF SIMULATOR (Stage 18 - Priority #1)               */}
            {/* =============================================================== */}
            {activeTab === "whatif" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Top Control Panel with Live Interactive Assumption Sliders */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E1EEF9]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge-text px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          STAGE 18: REAL-TIME SIMULATOR
                        </span>
                        <h2 className="heading-secondary text-[#0B2545]">
                          Predictive Response Scenario Simulator
                        </h2>
                      </div>
                      <p className="body-description text-xs sm:text-[14px] text-slate-600 mt-1 font-body leading-relaxed">
                        Adjust environmental assumptions and response delays below to re-run the hydrodynamic containment model live across all 3 tactical operational plans.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSimWindSpeedKts(14.2);
                          setSimDeployDelayHours(2.0);
                          setSimBoomMeters(1500);
                          triggerToast("Assumption sliders reset to operational baseline.");
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                      </button>
                      <button
                        onClick={() => {
                          triggerToast("Optimal strategy applied to Active Incident Response Plan.");
                          navigate("/incidents/IN-MH-2026");
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white btn-text shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Apply Selected Strategy</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Interactive Assumption Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-1">
                    {/* Slider 1: Wind Speed */}
                    <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-sky-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-[#1E5FBF]" />
                          Surface Wind Speed (ECMWF):
                        </span>
                        <span className="data-mono font-bold text-[#1E5FBF] font-mono">
                          {simWindSpeedKts.toFixed(1)} kts
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5.0"
                        max="30.0"
                        step="0.5"
                        value={simWindSpeedKts}
                        onChange={(e) => setSimWindSpeedKts(parseFloat(e.target.value))}
                        className="w-full accent-[#1E5FBF] cursor-pointer h-1.5 bg-sky-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>5 kts (Calm)</span>
                        <span>14.2 kts (Baseline)</span>
                        <span>30 kts (Squall)</span>
                      </div>
                    </div>

                    {/* Slider 2: Response Delay */}
                    <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-sky-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Asset Mobilization Delay:
                        </span>
                        <span className="data-mono font-bold text-amber-600 font-mono">
                          +{simDeployDelayHours.toFixed(1)} Hours
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="8.0"
                        step="0.5"
                        value={simDeployDelayHours}
                        onChange={(e) => setSimDeployDelayHours(parseFloat(e.target.value))}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-amber-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0h (Immediate)</span>
                        <span>2.0h (Baseline)</span>
                        <span>8h (High Delay)</span>
                      </div>
                    </div>

                    {/* Slider 3: Boom Capacity */}
                    <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-sky-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                          <Anchor className="w-3.5 h-3.5 text-emerald-600" />
                          Containment Boom Length:
                        </span>
                        <span className="data-mono font-bold text-emerald-600 font-mono">
                          {simBoomMeters} meters
                        </span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="3000"
                        step="100"
                        value={simBoomMeters}
                        onChange={(e) => setSimBoomMeters(parseInt(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-emerald-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>500m (Light)</span>
                        <span>1500m (Standard)</span>
                        <span>3000m (Heavy Barrier)</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Recommendation Banner */}
                  <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 text-xs text-emerald-950 font-body flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 font-semibold">AI Recommendation (Live Recalculated):</strong>{" "}
                      <span>{dynamicRecommendation}</span>
                    </div>
                  </div>

                  {/* 3 Scenario Cards Side-by-Side with Map Thumbnails & Ranges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                    {dynamicScenarios.map((sc) => {
                      const isSel = selectedStrategyId === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedStrategyId(sc.id)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            sc.recommended
                              ? "bg-gradient-to-b from-emerald-50/40 to-white border-emerald-300 ring-2 ring-emerald-400/30 shadow-md"
                              : isSel
                              ? "bg-white border-[#1E5FBF] ring-2 ring-[#1E5FBF]/20 shadow-md"
                              : "bg-[#F8FBFE] border-[#E1EEF9] hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              {sc.recommended ? (
                                <span className="badge-text px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs font-body">
                                  ★ RECOMMENDED
                                </span>
                              ) : (
                                <span className="badge-text px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-body">
                                  Alternative Plan
                                </span>
                              )}
                              <span className="data-mono text-xs font-bold text-[#0B2545] font-mono">
                                {sc.score}/100 Score
                              </span>
                            </div>

                            <h3 className="heading-section text-sm sm:text-base text-[#0B2545]">{sc.name}</h3>
                            <p className="body-description text-xs text-slate-600 mt-1 leading-relaxed font-body">{sc.desc}</p>

                            {/* Containment Boundary Mini-Map Thumbnail SVG */}
                            <div className="my-3 h-28 bg-[#0B1D35] rounded-xl relative overflow-hidden border border-slate-700 p-1 flex items-center justify-center">
                              <svg className="w-full h-full" viewBox="0 0 240 100">
                                {/* Shoreline representation (right side) */}
                                <path d="M210,0 Q200,40 215,70 T205,100" fill="none" stroke="#D97706" strokeWidth="2.5" />
                                <text x="235" y="55" fill="#D97706" fontSize="6.5" fontFamily="monospace" textAnchor="end">COAST</text>

                                {/* Offshore Oil Slick Polygon */}
                                {sc.id === "strat-1" ? (
                                  <g transform="translate(100, 50)">
                                    <ellipse cx="0" cy="0" rx="35" ry="18" fill="rgba(239, 68, 68, 0.4)" stroke="#EF4444" strokeWidth="1.2" />
                                    {/* Containment Boom Arc encloses slick */}
                                    <path d="M-15,-22 Q40,0 -15,22" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="3 2" />
                                    <circle cx="35" cy="0" r="3" fill="#10B981" />
                                    <text x="-40" y="30" fill="#34D399" fontSize="6.5" fontFamily="monospace">BOOM SECURED</text>
                                  </g>
                                ) : sc.id === "strat-2" ? (
                                  <g transform="translate(140, 50)">
                                    {/* Widely dispersed slick touching coast */}
                                    <path d="M-60,-15 Q0,-30 45,0 Q0,30 -60,15 Z" fill="rgba(239, 68, 68, 0.6)" stroke="#EF4444" strokeWidth="1.5" />
                                    <line x1="20" y1="-25" x2="40" y2="-5" stroke="#E11D48" strokeWidth="2" strokeDasharray="2 2" />
                                    <text x="-50" y="32" fill="#F87171" fontSize="6.5" fontFamily="monospace">SHORELINE BREACH</text>
                                  </g>
                                ) : (
                                  <g transform="translate(110, 50)">
                                    <ellipse cx="-10" cy="0" rx="40" ry="20" fill="rgba(239, 68, 68, 0.35)" stroke="#EF4444" strokeWidth="1" />
                                    {/* Focused barrier protecting nursery zone */}
                                    <path d="M25,-25 Q45,0 25,25" fill="none" stroke="#0EA5E9" strokeWidth="2.5" />
                                    <text x="-45" y="32" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">ZONE A SHIELD</text>
                                  </g>
                                )}
                              </svg>
                            </div>

                            {/* Predicted Outcome Metrics with Best/Worst-Case Uncertainty Ranges */}
                            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs font-mono">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-body text-xs">Coastline Impact Range:</span>
                                <span
                                  className={`data-mono font-bold font-mono ${
                                    parseFloat(sc.worstImpact) < 10
                                      ? "text-emerald-600"
                                      : parseFloat(sc.worstImpact) < 25
                                      ? "text-amber-600"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {sc.bestImpact}% &ndash; {sc.worstImpact}%
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-body text-xs">Spill Extent Range:</span>
                                <span className="data-mono font-bold text-[#0B2545] font-mono">
                                  {sc.bestArea} &ndash; {sc.worstArea} km²
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-body text-xs">Time to Contain:</span>
                                <span className="data-mono font-bold text-[#0B2545] font-mono">
                                  {sc.bestTime} &ndash; {sc.worstTime} h
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-body text-xs">Estimated Cost:</span>
                                <span className="data-mono font-bold text-slate-700 font-mono">
                                  ₹{sc.bestCost} &ndash; ₹{sc.worstCost}L
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStrategyId(sc.id);
                                triggerToast(`Scenario ${sc.name} locked as operational basis.`);
                              }}
                              className={`w-full py-1.5 rounded-xl btn-text transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#0B2545] text-white"
                                  : sc.recommended
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-white border border-[#E1EEF9] hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              {isSel ? "Selected Strategy" : "Select Strategy"}
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
                      <div className="micro-text font-semibold text-slate-400 uppercase tracking-wider font-body">
                        {stat.label}
                      </div>
                      <div className={`kpi-number text-2xl sm:text-3xl ${stat.color} mt-1`}>{stat.val}</div>
                      <div className="data-mono-sm text-slate-500 font-mono mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Model Trend Chart + Clickable Rejection Artifacts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                        Detection Accuracy Trend (Last 7 Satellite Passes)
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Target Bar: 92.0% Admissibility Threshold
                      </span>
                    </div>

                    <div className="h-60 w-full font-body">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={modelHistoryData} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E1EEF9" />
                          <XAxis dataKey="pass" tick={{ fontSize: 10, fontFamily: "Inter" }} />
                          <YAxis domain={[85, 100]} unit="%" tick={{ fontSize: 10, fontFamily: "Inter" }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                          {/* Reference Line for IMO Minimum Confidence Threshold */}
                          <ReferenceLine
                            y={92.0}
                            stroke="#E11D48"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{ value: "IMO Admissibility Bar (92%)", fill: "#E11D48", fontSize: 10, position: "insideTopLeft" }}
                          />
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
                            name="False Positive Rejection"
                            stroke="#10B981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Expandable Technical Model Metrics Deep-Dive Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setShowFullModelMetrics(!showFullModelMetrics)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#1E5FBF] hover:text-[#0B2545] transition-colors cursor-pointer py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-4 h-4" />
                          <span>{showFullModelMetrics ? "Hide Deep Technical Model Metrics & Confusion Matrix" : "View Full Model Metrics & Technical Validation (Confusion Matrix)"}</span>
                        </span>
                        {showFullModelMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Expandable Technical Panel */}
                      {showFullModelMetrics && (
                        <div className="mt-3 p-4 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] space-y-4 animate-fadeIn text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-slate-400 text-[10px]">Precision:</div>
                              <div className="font-bold text-[#0B2545] text-sm">96.4%</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-slate-400 text-[10px]">Recall:</div>
                              <div className="font-bold text-[#0B2545] text-sm">93.1%</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-slate-400 text-[10px]">F1-Score:</div>
                              <div className="font-bold text-emerald-600 text-sm">94.7%</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-slate-400 text-[10px]">Mean IoU:</div>
                              <div className="font-bold text-[#1E5FBF] text-sm">89.2%</div>
                            </div>
                          </div>

                          {/* 2x2 Confusion Matrix */}
                          <div>
                            <div className="font-semibold text-slate-700 mb-1.5 font-body">Pixel-Level Confusion Matrix (1,420 km² Ground-Truth Validation):</div>
                            <table className="w-full border-collapse border border-slate-200 text-center font-mono text-[11px] bg-white rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600">
                                  <th className="p-1.5 border border-slate-200">Class</th>
                                  <th className="p-1.5 border border-slate-200">Predicted Oil</th>
                                  <th className="p-1.5 border border-slate-200">Predicted Non-Oil</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="p-1.5 font-semibold bg-slate-50 border border-slate-200 text-left">Actual Oil</td>
                                  <td className="p-1.5 border border-slate-200 text-emerald-700 font-bold bg-emerald-50/50">142 km² (TP - 93.1%)</td>
                                  <td className="p-1.5 border border-slate-200 text-rose-700 bg-rose-50/30">11 km² (FN - 6.9%)</td>
                                </tr>
                                <tr>
                                  <td className="p-1.5 font-semibold bg-slate-50 border border-slate-200 text-left">Actual Non-Oil</td>
                                  <td className="p-1.5 border border-slate-200 text-amber-700 bg-amber-50/30">3 km² (FP - 1.9%)</td>
                                  <td className="p-1.5 border border-slate-200 text-blue-700 font-bold bg-blue-50/50">812 km² (TN - 98.1%)</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono">
                            TensorRT FP16 Pipeline Latency: SAR Ingest (45s) &bull; U-Net Segment (78s) &bull; Hydrodynamic Coupling (95s) = 4.2 min total swath.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clickable Look-Alike Rejection Artifacts */}
                  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                          Look-Alike Rejection Artifacts
                        </h3>
                        <span className="text-[10px] text-slate-400 font-body">Click card to inspect SAR patch</span>
                      </div>

                      <div className="space-y-2.5 text-xs font-body">
                        {LOOK_ALIKE_ARTIFACTS.map((ex) => (
                          <div
                            key={ex.id}
                            onClick={() => setSelectedArtifactModal(ex)}
                            className="p-3 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] hover:bg-sky-50/70 hover:border-sky-300 transition-all cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#0B2545] font-body text-xs group-hover:text-[#1E5FBF] transition-colors flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1E5FBF]" />
                                {ex.title}
                              </span>
                              <span className={`badge-text px-2 py-0.5 rounded-full border text-[10px] font-bold ${ex.badgeColor}`}>
                                {ex.badge}
                              </span>
                            </div>
                            <p className="body-description text-xs text-slate-600 mt-1 leading-relaxed font-body">
                              {ex.reason}
                            </p>
                            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>Confidence: <strong className="text-emerald-600">{ex.confidence}%</strong></span>
                              <span className="text-[#1E5FBF] group-hover:underline">Inspect Radar Patch &rarr;</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E1EEF9] data-mono-sm text-slate-400 font-mono">
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
                {/* Incident vs Historical Track Record Benchmark */}
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1EEF9] mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge-text px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                          HISTORICAL BENCHMARK MATRIX
                        </span>
                        <h2 className="heading-secondary text-[#0B2545]">
                          Case IN-MH-2026 vs Historical Track Record
                        </h2>
                      </div>
                      <p className="body-description text-xs sm:text-[14px] text-slate-600 mt-1 font-body leading-relaxed">
                        Is this incident's forensic evidence stronger or weaker than past major Indian Ocean maritime disasters?
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Evidence Strength: <strong>Top 98th Percentile</strong></span>
                    </div>
                  </div>

                  {/* Comparative Track Record Metrics Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {benchmarkComparisonData.map((bm, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] space-y-2">
                        <div className="text-xs font-semibold text-[#0B2545] font-body">{bm.metric}</div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-xl font-bold font-mono text-[#1E5FBF]">
                            {bm.thisCase}{bm.unit}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Hist Avg: {bm.historicalAvg}{bm.unit}
                          </div>
                        </div>
                        {/* Comparison progress bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-[#1E5FBF] h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, bm.thisCase)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          +{((bm.thisCase - bm.historicalAvg)).toFixed(1)}{bm.unit} stronger than track record
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Historical Table Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <span className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em]">
                      Interactive Past Incident Comparator (Select Any 2)
                    </span>
                    <span className="data-mono text-xs font-semibold text-[#1E5FBF] font-mono">
                      Comparing {comparedIncidents.length} of 2 selected
                    </span>
                  </div>

                  {/* Historical Table */}
                  <div className="border border-[#E1EEF9] rounded-xl overflow-hidden bg-white mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="table-header bg-[#F8FBFE] border-b border-[#E1EEF9] text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center font-semibold">Compare</th>
                          <th className="p-3 font-semibold">Incident Name &amp; Year</th>
                          <th className="p-3 font-semibold">Location / Region</th>
                          <th className="p-3 font-semibold">Severity</th>
                          <th className="p-3 font-semibold">Volume (Tonnes)</th>
                          <th className="p-3 font-semibold">Response Time</th>
                          <th className="p-3 font-semibold">Containment %</th>
                        </tr>
                      </thead>
                      <tbody className="table-body divide-y divide-slate-100 text-xs font-body">
                        {HISTORICAL_INCIDENTS.map((h) => {
                          const isChecked = selectedHistIds.includes(h.id);
                          return (
                            <tr
                              key={h.id}
                              onClick={() => handleToggleHist(h.id)}
                              className={`hover:bg-slate-50 cursor-pointer transition-colors ${
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
                              <td className="p-3 font-semibold text-[#0B2545]">
                                <div>{h.name}</div>
                                <div className="data-mono-sm text-slate-400 font-mono mt-0.5">{h.vesselName} ({h.flag})</div>
                              </td>
                              <td className="p-3 text-slate-600 font-body">{h.location}</td>
                              <td className="p-3">
                                <span
                                  className={`badge-text px-2 py-0.5 rounded-full border ${
                                    h.severity === "Critical"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {h.severity}
                                </span>
                              </td>
                              <td className="p-3 data-mono font-bold text-slate-700 font-mono">
                                {h.spillVolumeTonnes.toLocaleString()} t
                              </td>
                              <td className="p-3 data-mono text-slate-600 font-mono">{h.responseTimeHours} hrs</td>
                              <td className="p-3 data-mono font-bold text-emerald-600 font-mono">
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
                              <h3 className="heading-section text-sm text-[#0B2545]">{inc.name}</h3>
                              <div className="data-mono-sm text-slate-500 font-mono mt-0.5">
                                {inc.date} &bull; {inc.location}
                              </div>
                            </div>
                            <span className="data-mono text-xs font-bold text-rose-600 font-mono">
                              {inc.spillAreaKm2} km² Slick
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-3 rounded-xl border border-slate-200">
                            <div className="data-mono-sm">Response Time: <span className="font-bold text-[#0B2545]">{inc.responseTimeHours}h</span></div>
                            <div className="data-mono-sm">Containment: <span className="font-bold text-emerald-600">{inc.containmentRate}%</span></div>
                            <div className="data-mono-sm">Attribution: <span className="font-bold text-[#1E5FBF]">{inc.attributionCertainty}%</span></div>
                            <div className="data-mono-sm">Spill Volume: <span className="font-bold text-slate-700">{inc.spillVolumeTonnes} t</span></div>
                          </div>

                          <div className="body-text text-xs text-slate-700 space-y-1 font-body">
                            <div className="font-semibold text-[#0B2545] text-xs">Legal Outcome:</div>
                            <p className="body-description text-xs sm:text-[13px] text-slate-700 leading-relaxed font-body">{inc.legalOutcome}</p>
                          </div>

                          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-body">
                            <div className="font-semibold text-[#0B2545] mb-0.5">Key Architectural Lesson: </div>
                            <p className="body-description text-xs sm:text-[13px] text-sky-900 leading-relaxed">{inc.keyLesson}</p>
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
                      <div className="flex flex-wrap items-center gap-2 font-body">
                        <span className="badge-text px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Official &bull; Restricted
                        </span>
                        <span className="badge-text px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
                          MARPOL Annex I Court-Admissible
                        </span>
                        <span className="badge-text px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          SHA-256 Merkle Verified
                        </span>
                      </div>
                      <h2 className="heading-page text-white text-2xl sm:text-3xl">
                        Forensic Intelligence &amp; Dossier Center
                      </h2>
                      <p className="body-description text-sm sm:text-[15px] text-sky-100/90 leading-relaxed font-body">
                        Compile verified multi-modal evidence across satellite SAR segmentation, backward hydrodynamic trajectory, AIS kinematic anomalies, and 7-dimension statistical confidence scores into statutory Indian Coast Guard and UNCLOS-compliant dossiers.
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDownloadCustomPdf}
                        disabled={isExportingPdf}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white btn-text flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Download className={`w-5 h-5 ${isExportingPdf ? "animate-bounce" : ""}`} />
                        <span>{isExportingPdf ? "Exporting PDF..." : "Download Official Brief (PDF)"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section Selector + Live PDF Document Preview Pane */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left (7 Cols): Modular Section Checkboxes & Controls */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-6">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9] mb-4">
                        <div>
                          <h3 className="heading-section text-sm text-[#0B2545] flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-[#1E5FBF]" />
                            <span>Modular Dossier Section Selector</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">Toggle which evidence sections to compile into the exported PDF briefing.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectAllSections(true)}
                            className="text-[11px] text-[#1E5FBF] hover:underline font-semibold cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => selectAllSections(false)}
                            className="text-[11px] text-slate-500 hover:underline font-semibold cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* 9 Interactive Checkboxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          { key: "sec1", num: "01", title: "Executive Summary & Classification", desc: "Incident metadata, statutory authority & classification" },
                          { key: "sec2", num: "02", title: "Satellite SAR Observation", desc: "Sentinel-1 VV/VH radar segmentation & mask geometry" },
                          { key: "sec3", num: "03", title: "Lagrangian Trajectory Hindcast", desc: "OpenDrift backward dispersion & origin cone" },
                          { key: "sec4", num: "04", title: "AIS Kinematic Blackout Analysis", desc: "Speed drop correlation & transponder gap logs" },
                          { key: "sec5", num: "05", title: "Forensic Attribution Matrix", desc: "7-dimension statistical candidate ranking & radar" },
                          { key: "sec6", num: "06", title: "Response Strategy What-If", desc: "Containment efficiency & coastline risk projection" },
                          { key: "sec7", num: "07", title: "Ecological Vulnerability Index", desc: "Alibaug turtle nesting & mangrove impact zones" },
                          { key: "sec8", num: "08", title: "Historical Incident Benchmarking", desc: "Track record comparative analysis & precedents" },
                          { key: "sec9", num: "09", title: "Chain of Custody & Sign-Off", desc: "SHA-256 cryptographic seal & boarding warrant" },
                        ].map((sec) => {
                          const isChecked = reportSections[sec.key as keyof typeof reportSections];
                          return (
                            <div
                              key={sec.key}
                              onClick={() => toggleSection(sec.key as keyof typeof reportSections)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                                isChecked
                                  ? "bg-[#EFF6FD] border-[#1E5FBF]/50 shadow-2xs"
                                  : "bg-[#F8FBFE] border-[#E1EEF9] opacity-60"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-0.5 rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="font-semibold text-slate-800 text-xs font-body flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-[#1E5FBF] font-bold">PAGE {sec.num}</span>
                                  <span>{sec.title}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 font-body leading-tight">{sec.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#E1EEF9] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-body">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Admissible in Maritime Admiralty Court under Indian Evidence Act 65B</span>
                        </div>
                        <button
                          onClick={handleDownloadCustomPdf}
                          disabled={isExportingPdf}
                          className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white btn-text flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span>Export Compiled Brief (PDF)</span>
                        </button>
                      </div>
                    </div>

                    {/* Pre-Compiled Case Metadata Card */}
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-5">
                      <h4 className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em] mb-3">
                        Active Case Briefing Parameters (IN-MH-2026)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="micro-text text-slate-400 font-body">Incident Code</div>
                          <div className="data-mono font-bold text-[#0B2545] mt-0.5 font-mono">IN-MH-2026</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="micro-text text-slate-400 font-body">Attributed Suspect</div>
                          <div
                            className="data-mono font-bold mt-0.5 font-mono"
                            style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}
                          >
                            {selectedCandidate.name}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="micro-text text-slate-400 font-body">Attribution Certainty</div>
                          <div
                            className="data-mono font-bold mt-0.5 font-mono"
                            style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}
                          >
                            {selectedCandidate.score}%
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                          <div className="micro-text text-slate-400 font-body">Slick Area &amp; Vol</div>
                          <div className="data-mono font-bold text-slate-700 mt-0.5 font-mono">276 km² / ~1,200 t</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right (5 Cols): Live PDF Document Preview Pane */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-md p-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                        <span className="font-display font-semibold text-xs text-[#0B2545] uppercase tracking-[0.06em] flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-[#1E5FBF]" />
                          <span>Live PDF Report Preview Pane</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {Object.values(reportSections).filter(Boolean).length} of 9 Pages Active
                        </span>
                      </div>

                      {/* Mockup PDF Sheet Canvas */}
                      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-lg p-5 aspect-[8.5/11] relative overflow-hidden flex flex-col justify-between select-none">
                        {/* Official Header */}
                        <div>
                          <div className="flex items-start justify-between border-b-2 border-[#0B2545] pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-[#0B2545] flex items-center justify-center text-white font-bold text-lg">
                                ICG
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-[#0B2545] uppercase tracking-wider">
                                  INDIAN COAST GUARD &bull; MINISTRY OF DEFENCE
                                </div>
                                <div className="text-xs font-bold text-[#0B2545]">
                                  FORENSIC EVIDENCE DOSSIER
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono">
                                  REF: ICG/MRCC/IN-MH-2026/BRIEF &bull; MARPOL ANNEX I
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                COURT ADMISSIBLE
                              </span>
                            </div>
                          </div>

                          {/* Subject Details */}
                          <div className="mt-3 p-2 bg-[#F8FBFE] rounded-lg border border-slate-200 text-[9px] font-mono space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">TARGET VESSEL:</span>
                              <span
                                className="font-bold"
                                style={{ color: VESSEL_COLORS[selectedCandidate.id]?.primary || "#E11D48" }}
                              >
                                {selectedCandidate.name} (IMO: {selectedCandidate.imo})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">OVERALL ATTRIBUTION:</span>
                              <span className="font-bold text-rose-600">{selectedCandidate.score}% CERTAINTY</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">INCIDENT SECTOR:</span>
                              <span className="text-slate-700">Mumbai High EEZ (18.78°N, 72.51°E)</span>
                            </div>
                          </div>

                          {/* Mini Evidence Summary Box */}
                          <div className="mt-3 space-y-1.5 text-[8.5px] text-slate-600 leading-normal">
                            <div className="font-bold text-slate-800 uppercase text-[9px] border-b border-slate-200 pb-0.5">
                              Forensic Synthesis Summary
                            </div>
                            <p>
                              Kinematic cross-correlation confirmed <strong>{selectedCandidate.aisGap}</strong> transponder blackout coinciding with reverse hydrodynamic hindcast convergence.
                            </p>
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[8px] font-mono space-y-0.5">
                              <div>&bull; SAR Spill Area: 276.04 km² (Copernicus Sentinel-1A)</div>
                              <div>&bull; Lagrangian Particle IoU: {liveCorrelation.match}%</div>
                              <div>&bull; Hydrodynamic Wind: ECMWF 10m 14.2 kts WSW</div>
                            </div>
                          </div>
                        </div>

                        {/* Official Sign-Off Footer */}
                        <div className="pt-3 border-t-2 border-slate-200">
                          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                            <div>
                              <div>DIGITAL SEAL: <strong className="text-emerald-700">SHA-256 VERIFIED</strong></div>
                              <div>COMMAND: MRCC MUMBAI WESTERN REGION</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-700">FLAG OFFICER COMMANDING</div>
                              <div>INDIAN COAST GUARD</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleDownloadCustomPdf}
                        disabled={isExportingPdf}
                        className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white btn-text flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isExportingPdf ? "Generating PDF..." : "Export Full Dossier (PDF)"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: LOOK-ALIKE SAR REJECTION ARTIFACT INSPECTOR                    */}
      {/* ===================================================================== */}
      {selectedArtifactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#0B2545] to-[#1E5FBF] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-sky-300" />
                <div>
                  <h3 className="font-display font-bold text-base">{selectedArtifactModal.title}</h3>
                  <div className="text-[11px] text-sky-200 font-mono">
                    Category: {selectedArtifactModal.category} &bull; Filtered SAR Scene
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedArtifactModal(null)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Synthetic Radar Patch Display */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6 bg-[#0B1D35] rounded-2xl overflow-hidden border border-slate-700 relative aspect-square flex flex-col justify-between p-3 shadow-inner">
                  {/* Radar grid lines */}
                  <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                    <circle cx="50%" cy="50%" r="30%" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="50%" cy="50%" r="60%" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#38BDF8" strokeWidth="0.8" />
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#38BDF8" strokeWidth="0.8" />
                  </svg>

                  {/* False Color Patch */}
                  <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center border border-sky-400/30">
                    <div className="text-center p-3">
                      <div className="text-[11px] font-mono text-amber-300 font-bold mb-1">
                        SAR BACKSCATTER NULL
                      </div>
                      <div className="text-[9px] text-slate-300 font-mono">
                        σ₀ = -24.8 dB (VV) &bull; -31.2 dB (VH)
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex justify-between text-[9px] font-mono text-sky-300">
                    <span>POL: DUAL VV+VH</span>
                    <span>RES: 10m / PIXEL</span>
                  </div>
                  <div className="relative z-10 text-center text-[9px] font-mono text-emerald-400 font-bold">
                    REJECTION VERIFIED: {selectedArtifactModal.confidence}%
                  </div>
                </div>

                {/* Spectral Metrics List */}
                <div className="sm:col-span-6 space-y-2.5 flex flex-col justify-between text-xs">
                  <div className="space-y-2">
                    <div className="font-semibold text-[#0B2545] font-body text-xs uppercase tracking-wide">
                      Multi-Spectral Rejection Metrics:
                    </div>
                    {Object.entries(selectedArtifactModal.sarAnalysis).map(([k, v], i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <span className="data-mono font-mono text-slate-700 font-semibold text-[11px]">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated False Alarm Filter Executed</span>
                  </div>
                </div>
              </div>

              {/* Technical Description */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-body">
                <div className="font-bold text-[#0B2545] mb-1">Neural Decision Rule &amp; Physical Justification:</div>
                <p>{selectedArtifactModal.explanation}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedArtifactModal(null)}
                className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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
