import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../services/api";
import {
  INCIDENT_DATA,
  VesselCandidate,
  RESPONSE_PRIORITY_ZONES,
  RECOVERY_MONITORING_DATA,
  ResponsePriorityZone,
} from "../data/incidentData";
import { COAST_GUARD_ASSETS, CoastGuardAsset } from "../data/vesselsData";
import { StatusStepper } from "../components/StatusStepper";
import { IncidentMiniMap } from "../components/IncidentMiniMap";
import { EvidenceGraphModal } from "../components/EvidenceGraphModal";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import sahayyaApi from "../services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import {
  Home,
  Activity,
  Layers,
  Target,
  Navigation,
  Gauge,
  Wind,
  Waves,
  Thermometer,
  Compass,
  Edit3,
  AlertOctagon,
  Satellite,
  Clock,
  Shield,
  RotateCcw,
  Play,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Download,
  FileText,
  MoreVertical,
  AlertTriangle,
  Ship,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  X,
  Plus,
  CheckSquare,
  Square,
  Eye,
  Info,
  ExternalLink,
  MapPin,
  Search,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  Map as MapIcon,
  Fish,
  Sparkles,
  Copy,
} from "lucide-react";

export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const effectiveIncidentId = incidentId || INCIDENT_DATA.id;

  // Layout / Topbar / Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Incidents");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Overview state (Panel A)
  const [overviewDescription, setOverviewDescription] = useState(INCIDENT_DATA.overview.description);
  const [overviewType, setOverviewType] = useState(INCIDENT_DATA.overview.type);
  const [overviewAgency, setOverviewAgency] = useState(INCIDENT_DATA.overview.agency);
  const [showEditOverviewModal, setShowEditOverviewModal] = useState(false);
  const [tempDescription, setTempDescription] = useState(overviewDescription);
  const [tempType, setTempType] = useState(overviewType);
  const [tempAgency, setTempAgency] = useState(overviewAgency);

  // Hero Carousel state (Panel B)
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Spill Evolution state (Panel E)
  const [evolutionDataSource, setEvolutionDataSource] = useState<"Observed" | "Model">("Observed");
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(2); // default "Now"
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);

  // Vessel Candidate Inspection (Panel F)
  const [selectedCandidate, setSelectedCandidate] = useState<VesselCandidate | null>(null);
  const [showAllCandidatesModal, setShowAllCandidatesModal] = useState(false);

  // Incident Workspace Sub-Tabs (Tactical, Recovery, Digital Twin)
  const [activeIncidentTab, setActiveIncidentTab] = useState<"tactical" | "recovery" | "digitaltwin">("tactical");

  // Response Optimizer State (Stage 17)
  const [selectedPriorityZone, setSelectedPriorityZone] = useState<ResponsePriorityZone>(RESPONSE_PRIORITY_ZONES[0]);
  const [deployedAssets, setDeployedAssets] = useState<Record<string, boolean>>({
    "cg-1": true,
    "cg-2": false,
    "cg-3": false,
    "cg-4": true,
  });

  // Digital Twin Simulation State (Stage 20)
  const [simWindSpeed, setSimWindSpeed] = useState(5.1);
  const [simWindDir, setSimWindDir] = useState(289);
  const [simCurrentSpeed, setSimCurrentSpeed] = useState(0.67);
  const [twinMapLayer, setTwinMapLayer] = useState<"satellite" | "osm">("satellite");
  const [twinShowVectors, setTwinShowVectors] = useState(true);
  const [twinShowVessels, setTwinShowVessels] = useState(true);

  // Evidence Graph Modal
  const [evidenceModalCandidate, setEvidenceModalCandidate] = useState<VesselCandidate | null>(null);

  // Response Actions state (Panel J)
  const [responseStatus, setResponseStatus] = useState<"Planning" | "Active" | "Completed">("Planning");
  const [showResponseStatusDropdown, setShowResponseStatusDropdown] = useState(false);
  const [checklist, setChecklist] = useState(INCIDENT_DATA.responseChecklist);
  const [showResponsePlanModal, setShowResponsePlanModal] = useState(false);

  // Action Bar Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDetailedAnalysisModal, setShowDetailedAnalysisModal] = useState(false);
  const [showCompareModelModal, setShowCompareModelModal] = useState(false);
  const [showAllActivityModal, setShowAllActivityModal] = useState(false);

  const overflowMenuRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Timeline scrubber timer
  useEffect(() => {
    let interval: any;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setSelectedTimelineIndex((prev) => (prev + 1) % INCIDENT_DATA.timelineFrames.length);
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const currentCarouselSlide = INCIDENT_DATA.carouselImages[carouselIndex];
  const activeTimelineFrame = INCIDENT_DATA.timelineFrames[selectedTimelineIndex];

  return (
    <div className="h-screen w-screen overflow-hidden bg-sky-canvas text-slate-800 font-sans select-none flex flex-col antialiased">
      {/* ======================================================================= */}
      {/* 1. TOP BAR (WHITE BACKGROUND, CLEAN ENTERPRISE/GOV DESIGN)             */}
      {/* ======================================================================= */}
      <header className="h-16 w-full shrink-0 bg-white border-b border-[#DCEEFC] px-4 lg:px-6 flex items-center justify-between z-40 relative shadow-[0_2px_12px_rgba(30,95,191,0.06)]">
        {/* Left: 2-Bar Sidebar Toggle + Emblem + Sahayya Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            id="sidebar-toggle-button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isSidebarOpen
                ? "bg-[#F0F7FD] hover:bg-[#E2F0FD] border-[#DCEEFC] text-slate-700"
                : "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] border-[#1E5FBF] text-white shadow-sm ring-2 ring-sky-200/60"
            }`}
            title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <div className="flex flex-col items-center justify-center gap-1.5 w-5 py-0.5 pointer-events-none">
              <span
                className={`block h-[2.5px] rounded-full transition-all duration-300 ${
                  isSidebarOpen ? "w-5 bg-slate-700" : "w-5 bg-white"
                }`}
              />
              <span
                className={`block h-[2.5px] rounded-full transition-all duration-300 ${
                  isSidebarOpen ? "w-3.5 self-start bg-slate-700" : "w-5 bg-white"
                }`}
              />
            </div>
          </button>

          {/* Government of India Emblem */}
          <div className="flex items-center gap-2.5 pr-4 border-r border-[#E1EEF9]">
            <div className="w-8 h-8 flex items-center justify-center text-slate-700 shrink-0">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm-1 3v4h2V7h-2zm0 6v4h2v-4h-2z"
                  opacity="0.2"
                />
                <path d="M12 3.5l1.5 3h3.5l-2.8 2.2 1 3.5-3.2-2.1-3.2 2.1 1-3.5-2.8-2.2h3.5z" />
                <path d="M7 16h10v2H7zm2 3h6v1.5H9z" />
              </svg>
            </div>
            <div className="hidden sm:block leading-tight font-body">
              <div className="text-[11px] font-semibold tracking-wide text-[#0B2545] uppercase">
                Ministry of Defence
              </div>
              <div className="text-[10px] text-slate-500 font-normal">Government of India</div>
            </div>
          </div>

          {/* Sahayya Logo */}
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-sky-100 flex items-center justify-center shadow-md border border-[#E1EEF9] shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 44 44" fill="none">
                <path
                  d="M10 24C10 18.4772 14.4772 14 20 14C24.4183 14 28.1634 16.8579 29.4721 20.8579C30.7808 24.8579 34.5259 27.7157 38.9443 27.7157"
                  stroke="#185ADB"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M5.05572 16.2843C9.47413 16.2843 13.2192 19.1421 14.5279 23.1421C15.8366 27.1421 19.5817 30 24 30C29.5228 30 34 25.5228 34 20"
                  stroke="#06B6D4"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-[0.16em] text-[#0B2545]">
                  SAHAYYA
                </span>
                <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-body">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block font-body">
                Safer Seas. Cleaner Oceans. Stronger Tomorrow.
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-6 font-body">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search vessel (IMO, name), location or coordinates..."
              className="w-full pl-9 pr-12 py-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF] focus:bg-white focus:ring-1 focus:ring-[#1E5FBF] transition-all font-body"
            />
            <span className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-[#E1EEF9] text-slate-500 pointer-events-none">
              ⌘ K
            </span>
          </div>
        </div>

        {/* Right: Operational Status + Bell + User */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold font-body">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => triggerToast("All telemetry channels active.")}
            className="w-9 h-9 rounded-xl border border-[#E1EEF9] hover:bg-[#F0F7FD] flex items-center justify-center text-slate-600 transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F0F7FD] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0B2545] text-white text-xs font-black flex items-center justify-center shadow-sm overflow-hidden border border-sky-200">
                {user?.avatar_url ? (
                  <img
                    src={getAvatarUrl(user.avatar_url)}
                    alt={user.name || "Officer"}
                    className="w-full h-full object-cover"
                  />
                ) : user?.name ? (
                  user.name.slice(0, 2).toUpperCase()
                ) : (
                  "CG"
                )}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-bold text-[#0B2545]">
                  {user?.name || "Commander S. Kumar"}
                </div>
                <div className="text-[10px] text-slate-500">{user?.role || "Coast Guard Ops"}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100 text-xs">
                  <div className="font-bold text-[#0B2545]">{user?.name || "S. Kumar"}</div>
                  <div className="text-[10px] text-slate-400">{user?.role || "Commander (West)"}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2 cursor-pointer mt-1"
                >
                  <span>Profile & Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-xs text-rose-600 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================================= */}
      {/* 2. BODY LAYOUT: SIDEBAR + SCROLLABLE DASHBOARD CANVAS                   */}
      {/* ======================================================================= */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Left Sidebar (Deep Navy Gradient, Incidents ACTIVE) */}
        <aside
          className={`h-full bg-gradient-to-b from-[#0B2545] to-[#123A66] flex flex-col justify-between items-center z-30 shrink-0 shadow-xl transition-all duration-300 ease-in-out ${
            isSidebarOpen
              ? "w-16 sm:w-20 py-4 opacity-100 translate-x-0 overflow-y-auto"
              : "w-0 p-0 opacity-0 -translate-x-full overflow-hidden pointer-events-none border-none"
          }`}
        >
          <div
            className={`flex flex-col items-center gap-4 w-full px-2 transition-opacity duration-200 ${
              isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {[
              { id: "Dashboard", icon: Home, label: "Home", path: "/dashboard" },
              { id: "Map", icon: MapIcon, label: "Map", path: "/map" },
              { id: "Incidents", icon: Activity, label: "Incidents", path: `/incidents/${effectiveIncidentId}` },
              { id: "Vessels", icon: Ship, label: "Vessels", path: "/vessels" },
              { id: "Analysis", icon: BarChart3, label: "Analysis", path: "/analysis" },
              { id: "Settings", icon: Settings, label: "Settings", path: "/settings" },
              { id: "Help", icon: HelpCircle, label: "Help", path: "" },
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
                    } else if (item.id === "Help") {
                      triggerToast("Help & Standard Operating Procedures (SOP) Reference Guide");
                    } else {
                      triggerToast(`Switched view to: ${item.label}`);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                    isActive
                      ? isIndigoAccent
                        ? "bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white shadow-md shadow-indigo-950/40"
                        : "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white shadow-md shadow-blue-950/40"
                      : isIndigoAccent
                      ? "text-indigo-200 hover:text-white hover:bg-[#6366F1]/20"
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
                <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7-0.5" opacity="0.5" />
              </svg>
            </div>
            <p className="text-[8px] text-slate-400 leading-tight">
              Safer Oceans.<br />Stronger Tomorrow.
            </p>
          </div>
        </aside>

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-auto bg-sky-canvas p-4 lg:p-6 custom-tactical-scrollbar">
          <div className="min-w-[1140px] max-w-[1600px] mx-auto flex flex-col space-y-5 pb-8">
            {/* ================================================================= */}
            {/* BREADCRUMB ROW                                                   */}
            {/* ================================================================= */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 font-body">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1 hover:text-[#0B2545] transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Dashboard</span>
              </button>
              <span className="text-slate-300">/</span>
              <button
                onClick={() => triggerToast("Active incident register: 1 active incident.")}
                className="hover:text-[#0B2545] transition-colors cursor-pointer text-[#1E5FBF]"
              >
                Incidents
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-[#0B2545] font-mono">{effectiveIncidentId}</span>
            </nav>

            {/* ================================================================= */}
            {/* TITLE ROW & ACTIONS + STATUS STEPPER                            */}
            {/* ================================================================= */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="heading-page text-[#0B2545]">
                    {effectiveIncidentId}
                  </h1>
                  <span className="bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs font-body badge-text">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                    <span>Live Incident</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-body">
                  <span>Mumbai High Offshore</span> &nbsp;|&nbsp; <span>Arabian Sea</span> &nbsp;|&nbsp; <span className="font-mono text-slate-600 data-mono">18.78°N, 72.51°E</span>
                </p>
              </div>

              {/* Action Buttons & Stepper Container */}
              <div className="flex flex-col sm:flex-row xl:flex-col items-end gap-3 w-full xl:w-auto font-body">
                {/* Top Action Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,95,191,0.06)] transition-all cursor-pointer btn-text"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => {
                      const exportData = {
                        incident_code: effectiveIncidentId,
                        title: INCIDENT_DATA.name,
                        severity_score: 8.4,
                        spill_area_km2: 276.04,
                        coordinates: [18.78, 72.51],
                        top_candidate: "MT PACIFIC VOYAGER",
                        exported_at: new Date().toISOString(),
                        system: "Sahayya Maritime Defense & Forensic Attribution"
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Sahayya_${effectiveIncidentId}_Intelligence_Telemetry.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      triggerToast(`Exported ${effectiveIncidentId} GeoJSON telemetry dataset`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,95,191,0.06)] transition-all cursor-pointer btn-text"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => setShowReportModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer btn-text"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Report</span>
                  </button>

                  {/* Overflow Menu */}
                  <div className="relative" ref={overflowMenuRef}>
                    <button
                      onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                      className="w-8 h-8 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] flex items-center justify-center text-slate-600 shadow-[0_2px_8px_rgba(30,95,191,0.06)] cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showOverflowMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_12px_36px_rgba(30,95,191,0.18)] p-1.5 z-50 text-xs animate-fadeIn font-body">
                        <button
                          onClick={() => {
                            setShowOverflowMenu(false);
                            triggerToast("Cloned incident record into sandbox workspace.");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8FBFE] text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Duplicate Incident</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowOverflowMenu(false);
                            triggerToast("Incident archived to national maritime registry.");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8FBFE] text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Archive Record</span>
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          onClick={() => {
                            setShowOverflowMenu(false);
                            triggerToast("Operation restricted: Live Ministry incident cannot be deleted.");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Delete Incident</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Stepper Component */}
                <div className="w-full sm:w-[500px]">
                  <StatusStepper
                    stages={INCIDENT_DATA.statusStages}
                    onAdvanceStage={async (stageId) => {
                      const statusMap: Record<string, string> = {
                        detection: "analysis",
                        dna: "attributed",
                        hindcast: "attributed",
                        attribution: "response",
                        forecast: "response",
                        response: "contained",
                        recovery: "resolved",
                      };
                      const next = statusMap[stageId] || "analysis";
                      try {
                        await sahayyaApi.incidents.updateStatus(effectiveIncidentId, next);
                        triggerToast(`Incident status updated to: ${next.toUpperCase()}`);
                      } catch {
                        triggerToast(`Status advanced to: ${next.toUpperCase()}`);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* ROW OF 4 STAT CARDS                                              */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-body">
              {/* Card 1: Spill Area */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                    Spill Area
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-[#0B2545] mt-1 kpi-number">276.04 km²</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded badge-text">
                      ↑ 12.4%
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">From previous estimate</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#1E5FBF] border border-sky-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Probable Origin */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                    Probable Origin
                  </div>
                  <div className="text-xl font-semibold text-[#0B2545] mt-1 font-mono data-mono">
                    18.78°N, 72.51°E
                  </div>
                  <div className="text-[10px] text-amber-600 font-semibold mt-1 font-body">
                    T - 18 h to T - 30 h
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Target className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Distance to Coast */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                    Distance to Coast
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-[#0B2545] mt-1 kpi-number">38 km</div>
                  <div className="text-[11px] text-[#0EA5B7] font-semibold mt-1 font-body">
                    ETA ~ 16.4 hours (Alibaug)
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0EA5B7] border border-teal-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Compass className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Severity Score Gauge */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                    Severity Score
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold tracking-tight text-[#0B2545] kpi-number">82</span>
                    <span className="text-xs text-slate-400 font-mono">/ 100</span>
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-200 badge-text">
                      High Risk
                    </span>
                  </div>
                  {/* Semicircular Gauge Arc Indicator */}
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-2 border border-slate-200/60">
                    <div className="h-full w-[82%] bg-gradient-to-r from-amber-500 to-rose-600 rounded-full" />
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Gauge className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* ENVIRONMENTAL CONDITIONS BAR                                     */}
            {/* ================================================================= */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-body">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#1E5FBF]" />
                <span className="heading-section text-xs uppercase tracking-wider text-[#0B2545]">
                  Environmental Conditions (Now)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full md:w-auto text-xs">
                <div className="flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-body">Wind</span>
                    <span className="font-mono font-medium text-slate-700 data-mono">5.1 m/s (289° W)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Waves className="w-3.5 h-3.5 text-[#0EA5B7]" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-body">Waves</span>
                    <span className="font-mono font-medium text-slate-700 data-mono">1.0 m</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-[#1E5FBF]" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-body">Current</span>
                    <span className="font-mono font-medium text-slate-700 data-mono">0.67 m/s (189° S)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-body">SST</span>
                    <span className="font-mono font-medium text-slate-700 data-mono">28.3°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* INCIDENT WORKSPACE SUB-TABS (Tactical, Recovery, Digital Twin)   */}
            {/* ================================================================= */}
            <div className="flex items-center justify-between gap-4 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-sm font-body">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: "tactical", label: "Tactical Intelligence Dossier", icon: Activity, badge: "10 Panels" },
                  { id: "recovery", label: "Recovery Monitoring", icon: Sparkles, badge: "Stage 21" },
                  { id: "digitaltwin", label: "Marine Digital Twin Simulator", icon: Compass, badge: "Stage 20" },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSel = activeIncidentTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveIncidentTab(t.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap btn-text ${
                        isSel
                          ? "bg-[#0B2545] text-white shadow-sm"
                          : "text-slate-600 hover:text-[#0B2545] hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                      {t.badge && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md badge-text ${
                            isSel ? "bg-white/20 text-white" : "bg-sky-100 text-[#1E5FBF]"
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-2 pr-3 text-xs font-mono text-slate-500 data-mono">
                <span>EEZ Grid: 18.78°N / 72.51°E</span>
              </div>
            </div>

            {activeIncidentTab === "tactical" && (
              <>
                {/* ================================================================= */}
                {/* MAIN ROW: 3 PANELS (Overview, Carousel, Mini-Map)                */}
                {/* ================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* PANEL A: Incident Overview (4 cols) */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between font-body">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="heading-section text-xs uppercase tracking-wider text-[#0B2545]">
                        Incident Overview
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setTempDescription(overviewDescription);
                        setTempType(overviewType);
                        setTempAgency(overviewAgency);
                        setShowEditOverviewModal(true);
                      }}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#0B2545] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit incident details"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <p className="body-description text-sm sm:text-[15px] text-slate-700 leading-relaxed mt-3 p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] font-body">
                    {overviewDescription}
                  </p>

                  {/* 2x2 Detail Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                        <AlertOctagon className="w-3 h-3 text-amber-500" />
                        <span>Incident Type</span>
                      </div>
                      <div className="font-bold text-[#0B2545] mt-0.5 font-body text-xs">{overviewType}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                        <Satellite className="w-3 h-3 text-[#1E5FBF]" />
                        <span>Detection Source</span>
                      </div>
                      <div className="font-bold text-[#0B2545] mt-0.5 font-mono text-xs">
                        {INCIDENT_DATA.overview.source}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Detected At</span>
                      </div>
                      <div className="font-bold text-[#0B2545] mt-0.5 font-mono text-xs">
                        {INCIDENT_DATA.overview.detected}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>Investigating Agency</span>
                      </div>
                      <div className="font-bold text-[#0B2545] mt-0.5 truncate font-body text-xs">{overviewAgency}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E1EEF9] flex items-center justify-between text-[10px] text-slate-500 font-body">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-emerald-700">Status: {INCIDENT_DATA.overview.status}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Updated: {INCIDENT_DATA.overview.lastUpdated}</span>
                  </div>
                </div>
              </div>

              {/* PANEL B: Hero Image Carousel (4 cols) */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Tactical Imagery ({carouselIndex + 1}/{INCIDENT_DATA.carouselImages.length})
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Click to enlarge</span>
                  </div>

                  {/* Hero Visual Container */}
                  <div
                    onClick={() => setLightboxImage(currentCarouselSlide.url)}
                    className="relative mt-3 h-52 rounded-2xl overflow-hidden group cursor-zoom-in bg-black shadow-inner"
                  >
                    <img
                      src={currentCarouselSlide.url}
                      alt={currentCarouselSlide.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Floating Callout Label */}
                    <div className="absolute top-2.5 left-2.5 bg-[#0B2545]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold border border-white/20 flex items-center gap-1.5 shadow-md">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{currentCarouselSlide.callout}</span>
                    </div>

                    {/* Compass Icon Top Right */}
                    <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20">
                      <Compass className="w-4 h-4" />
                    </div>

                    {/* Chevrons */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex((prev) =>
                          prev === 0 ? INCIDENT_DATA.carouselImages.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex((prev) => (prev + 1) % INCIDENT_DATA.carouselImages.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Bottom Caption Overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                      <div className="text-[11px] font-bold truncate">{currentCarouselSlide.title}</div>
                      <div className="text-[9px] text-slate-300 truncate">{currentCarouselSlide.caption}</div>
                    </div>
                  </div>
                </div>

                {/* Dot Indicators */}
                <div className="mt-3 pt-2.5 border-t border-[#E1EEF9] flex items-center justify-center gap-1.5">
                  {INCIDENT_DATA.carouselImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        carouselIndex === idx ? "w-6 bg-[#1E5FBF]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* PANEL C: Incident Location (Mini-Map) (4 cols) */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Incident Location (Mini-Map)
                      </h2>
                    </div>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="text-[11px] font-semibold text-[#1E5FBF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Map View</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  <div className="mt-3">
                    <IncidentMiniMap onNavigateToFullMap={() => navigate("/dashboard")} />
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-500 flex justify-between font-mono">
                  <span>Projection: WGS84 Mercator</span>
                  <span className="text-emerald-700 font-semibold">Feed: AIS + SAR Layer</span>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SECOND ROW: 3 PANELS (Spill Characteristics, Evolution, Vessels) */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* PANEL D: Spill Characteristics */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-indigo-50 text-[#6366F1] border border-indigo-200/60 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Spill Characteristics (Current Estimate)
                      </h2>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {/* Slick Shape Gradient Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0B1D35] to-[#123A66] border border-[#E1EEF9] flex items-center justify-center p-2 shrink-0 shadow-inner relative overflow-hidden">
                      <div className="w-12 h-10 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 blur-[1px] opacity-90 shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
                    </div>

                    {/* 2x2 Stat Grid */}
                    <div className="grid grid-cols-2 gap-1.5 flex-1 text-[10px] font-mono">
                      <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <span className="text-slate-400 block font-sans text-[9px]">Area</span>
                        <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.area}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <span className="text-slate-400 block font-sans text-[9px]">Perimeter</span>
                        <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.perimeter}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <span className="text-slate-400 block font-sans text-[9px]">Length (Major)</span>
                        <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.lengthMajor}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <span className="text-slate-400 block font-sans text-[9px]">Width (Minor)</span>
                        <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.widthMinor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Thickness & Volume secondary rows */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono">
                    <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                      <span className="text-slate-400 block font-sans text-[9px]">Thickness (Est.)</span>
                      <span className="font-bold text-amber-600">0.1 &ndash; 1.2 mm</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                      <span className="text-slate-400 block font-sans text-[9px]">Volume (Est.)</span>
                      <span className="font-bold text-rose-600">280 &ndash; 1,200 m³</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowDetailedAnalysisModal(true)}
                  className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-xs font-bold transition-all cursor-pointer text-center shadow-sm"
                >
                  View Detailed Analysis &rarr;
                </button>
              </div>

              {/* PANEL E: Spill Evolution */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Spill Evolution (Observed &amp; Forecast)
                      </h2>
                    </div>

                    {/* Observed vs Model Toggle */}
                    <div className="flex items-center p-0.5 rounded-xl bg-[#F0F7FD] border border-[#E1EEF9] text-[10px] font-bold">
                      <button
                        onClick={() => setEvolutionDataSource("Observed")}
                        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          evolutionDataSource === "Observed"
                            ? "bg-[#1E5FBF] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Observed
                      </button>
                      <button
                        onClick={() => setEvolutionDataSource("Model")}
                        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          evolutionDataSource === "Model"
                            ? "bg-[#1E5FBF] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Model
                      </button>
                    </div>
                  </div>

                  {/* 6 Thumbnail Frames */}
                  <div className="grid grid-cols-6 gap-1 mt-3">
                    {[
                      { offset: "-24h", time: "11 Sep 17:00", idx: 0 },
                      { offset: "-12h", time: "12 Sep 05:00", idx: 1 },
                      { offset: "Now", time: "12 Sep 17:00", idx: 2 },
                      { offset: "+12h", time: "13 Sep 05:00", idx: 3 },
                      { offset: "+24h", time: "14 Sep 17:00", idx: 4 },
                      { offset: "+48h", time: "14 Sep 17:00", idx: 6 },
                    ].map((f) => {
                      const isSelected = selectedTimelineIndex === f.idx;
                      return (
                        <button
                          key={f.offset}
                          onClick={() => setSelectedTimelineIndex(f.idx)}
                          className={`rounded-xl overflow-hidden border p-1 text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#1E5FBF] bg-sky-50 shadow-xs ring-1 ring-[#1E5FBF]"
                              : "border-[#E1EEF9] bg-[#F8FBFE] hover:border-sky-300"
                          }`}
                        >
                          <div className="w-full h-7 rounded-lg bg-black overflow-hidden mb-1 flex items-center justify-center">
                            <div
                              className={`rounded-full ${
                                f.idx < 2
                                  ? "w-2 h-2 bg-amber-500"
                                  : f.idx === 2
                                  ? "w-3 h-3 bg-rose-500 animate-pulse"
                                  : "w-3.5 h-3.5 bg-rose-700 opacity-70"
                              }`}
                            />
                          </div>
                          <div className="text-[9px] font-bold text-[#0B2545] truncate">
                            {f.offset}
                          </div>
                          <div className="text-[7px] text-slate-400 font-mono truncate">
                            {f.time}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrubber Range */}
                  <div className="mt-3 px-1">
                    <input
                      type="range"
                      min="0"
                      max="6"
                      value={selectedTimelineIndex}
                      onChange={(e) => setSelectedTimelineIndex(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E5FBF]"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                      <span>-24h</span>
                      <span className="text-rose-600 font-bold">Now ({activeTimelineFrame.areaKm2} km²)</span>
                      <span>+48h</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E1EEF9] flex items-center justify-between">
                  <button
                    onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                    className="px-3 py-1.5 rounded-xl bg-[#F0F7FD] hover:bg-[#E1EEF9] text-[#0B2545] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#E1EEF9]"
                  >
                    <span>{isPlayingTimeline ? "Pause" : "Play Simulation"}</span>
                  </button>

                  <button
                    onClick={() => setShowCompareModelModal(true)}
                    className="text-xs font-bold text-[#1E5FBF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Compare with Model</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>

              {/* PANEL F: Vessel Candidates */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between font-body">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-[#0B2545]" />
                      <h2 className="heading-section text-xs uppercase tracking-wider text-[#0B2545]">
                        Vessel Candidates (3)
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowAllCandidatesModal(true)}
                      className="text-[11px] font-semibold text-[#1E5FBF] hover:underline cursor-pointer font-body"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {/* 3 Candidate Rows */}
                  <div className="mt-2.5 space-y-2">
                    {[
                      {
                        rank: 1,
                        name: "MT PACIFIC VOYAGER",
                        score: 98.8,
                        scoreColor: "text-rose-600 bg-rose-50 border-rose-200",
                        imo: "9438200",
                        type: "Crude Oil Tanker",
                        flag: "Liberia",
                        cpa: "27.46 km",
                        minSog: "1.4 kts",
                        aisGap: "94 min",
                        vesselObj: INCIDENT_DATA.vessels[0],
                      },
                      {
                        rank: 2,
                        name: "CMA CGM ANTARES",
                        score: 43.5,
                        scoreColor: "text-amber-600 bg-amber-50 border-amber-200",
                        imo: "9723411",
                        type: "Container Vessel",
                        flag: "France",
                        cpa: "112.3 km",
                        minSog: "12.6 kts",
                        aisGap: "0 min",
                        vesselObj: INCIDENT_DATA.vessels[1],
                      },
                      {
                        rank: 3,
                        name: "MV NORDIC TRADER",
                        score: 31.2,
                        scoreColor: "text-slate-700 bg-slate-100 border-slate-200",
                        imo: "9315678",
                        type: "Bulk Carrier",
                        flag: "Panama",
                        cpa: "148.6 km",
                        minSog: "11.8 kts",
                        aisGap: "12 min",
                        vesselObj: INCIDENT_DATA.vessels[2],
                      },
                    ].map((c) => (
                      <div
                        key={c.rank}
                        onClick={() => setSelectedCandidate(c.vesselObj)}
                        className="p-2.5 rounded-xl bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B2545] font-body">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-mono data-mono-sm">
                              {c.rank}
                            </span>
                            <span>{c.name}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border font-mono data-mono ${c.scoreColor}`}>
                            {c.score}%
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 font-body">
                          <span className="font-mono text-[10px] text-slate-600">IMO {c.imo}</span>
                          <span className="mx-1 text-slate-300">&bull;</span>
                          <span>{c.type}</span>
                          <span className="mx-1 text-slate-300">&bull;</span>
                          <span>{c.flag}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 text-center font-body">
                          <div>CPA: <span className="font-mono font-medium text-slate-800">{c.cpa}</span></div>
                          <div>Min SOG: <span className="font-mono font-medium text-amber-600">{c.minSog}</span></div>
                          <div>AIS Gap: <span className="font-mono font-medium text-rose-600">{c.aisGap}</span></div>
                        </div>

                        <div className="mt-2 pt-1.5 flex items-center justify-between border-t border-slate-100 font-body">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvidenceModalCandidate(c.vesselObj);
                            }}
                            className="text-[11px] font-semibold text-[#1E5FBF] hover:underline flex items-center gap-1 cursor-pointer btn-text"
                          >
                            <span>View 7D Evidence Graph</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <span className="text-[9px] text-slate-400 font-mono">Stage 11</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 text-center">
                  Click any vessel to inspect forensic trajectory matching
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* THIRD ROW: 4 PANELS (Origin, Impact, Activity, Response)         */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* PANEL G: Probable Origin Analysis */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between font-body">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-500" />
                      <h2 className="heading-section text-xs uppercase tracking-wider text-[#0B2545]">
                        Probable Origin Analysis
                      </h2>
                    </div>
                  </div>

                  {/* Concentric Heatmap visual */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-[#0B1D35] border border-amber-300/40 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                      <div className="w-12 h-12 rounded-full border border-amber-500/50 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border border-rose-500/70 bg-rose-500/30 flex items-center justify-center animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                        </div>
                      </div>
                    </div>

                    <p className="body-description text-sm text-slate-700 leading-relaxed font-body">
                      Most probable release location based on reverse Lagrangian particle tracking.
                    </p>
                  </div>

                  {/* 2x2 Stat Grid */}
                  <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px] font-mono">
                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                      <span className="text-slate-400 block font-body text-[10px]">Coordinates</span>
                      <span className="font-bold text-[#0B2545] font-mono text-xs">18.78°N, 72.51°E</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                      <span className="text-slate-400 block font-body text-[10px]">Release Window</span>
                      <span className="font-bold text-amber-600 font-mono text-xs">T - 18h to T - 30h</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-body text-[10px]">Attribution Confidence</span>
                        <span className="font-bold text-emerald-700 font-mono text-xs">81 %</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div className="h-full w-[81%] bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowOriginModal(true)}
                  className="w-full mt-3 py-1.5 rounded-xl border border-[#E1EEF9] hover:bg-[#F8FBFE] text-slate-700 text-xs font-semibold font-body transition-all cursor-pointer text-center"
                >
                  View Full Origin Analysis &rarr;
                </button>
              </div>

              {/* PANEL H: Potential Impact Assessment */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between font-body">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-rose-500" />
                      <h2 className="heading-section text-xs uppercase tracking-wider text-[#0B2545]">
                        Potential Impact Assessment
                      </h2>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between font-body">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-600">Est. Time to Coast</span>
                      </div>
                      <span className="font-bold font-mono text-amber-600">~ 16.4 hours</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-slate-600">Affected Coastline</span>
                      </div>
                      <span className="font-bold text-rose-600">Gujarat (38 km)</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-[#0EA5B7]" />
                        <span className="text-slate-600">Marine Protected</span>
                      </div>
                      <span className="font-bold font-mono text-[#0EA5B7]">12.3% (25.8 km²)</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fish className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-slate-600">Fishing Zones</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-600">8.7% (18.1 km²)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => triggerToast("Coastline, MPA buffer and artisanal fishing corridors highlighted on tactical map.")}
                  className="w-full mt-3 py-1.5 rounded-xl border border-[#E1EEF9] hover:bg-[#F8FBFE] text-[#1E5FBF] text-xs font-bold transition-all cursor-pointer text-center"
                >
                  View Impact on Map &rarr;
                </button>
              </div>

              {/* PANEL I: Recent Activity */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Recent Activity
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowAllActivityModal(true)}
                      className="text-[11px] font-semibold text-[#1E5FBF] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="mt-3 space-y-2 text-xs">
                    {INCIDENT_DATA.activityLog.map((act) => (
                      <div key={act.id} className="flex items-start gap-2">
                        {act.status === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : act.status === "in-progress" ? (
                          <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-slate-700 leading-tight truncate">
                            {act.text}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">{act.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[10px] text-slate-400 font-mono text-center border-t border-[#E1EEF9]">
                  Live Telemetry Logging: INCOIS / Coast Guard Node
                </div>
              </div>

              {/* PANEL J: Response Actions & Optimizer (Stage 17) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] relative">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#0B2545]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Response Optimizer
                      </h2>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-sky-100 text-[#1E5FBF] font-bold">
                        Stage 17
                      </span>
                    </div>

                    {/* Status Pill Dropdown */}
                    <button
                      onClick={() => setShowResponseStatusDropdown(!showResponseStatusDropdown)}
                      className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{responseStatus}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showResponseStatusDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E1EEF9] rounded-xl shadow-xl p-1 z-30 text-xs">
                        {(["Planning", "Active", "Completed"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setResponseStatus(st);
                              setShowResponseStatusDropdown(false);
                              triggerToast(`Response status updated to: ${st}`);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              responseStatus === st ? "bg-[#1E5FBF] text-white" : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority Zone Selector */}
                  <div className="mt-2.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Target Priority Zone
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {RESPONSE_PRIORITY_ZONES.map((z) => {
                        const isSel = selectedPriorityZone.id === z.id;
                        return (
                          <button
                            key={z.id}
                            onClick={() => setSelectedPriorityZone(z)}
                            className={`p-1.5 rounded-lg border text-left transition-all text-[10px] font-semibold flex items-center gap-1.5 ${
                              isSel
                                ? "bg-sky-50 border-[#1E5FBF] text-[#0B2545] shadow-2xs"
                                : "bg-[#F8FBFE] border-[#E1EEF9] text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }}></span>
                            <span className="truncate">Zone {z.priority}: {z.name.split(":")[1]?.trim() || z.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resource Allocation Mini-Table */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <span>Available Coast Guard Assets</span>
                      <span className="text-emerald-600 font-mono">4 Ready</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {[
                        { id: "cg-1", name: "ICGS Vikram", type: "Offshore Patrol Vessel", dist: "12 km", eta: "45m" },
                        { id: "cg-2", name: "ICGS Samarth", type: "Fast Patrol Vessel", dist: "28 km", eta: "1h 20m" },
                        { id: "cg-3", name: "ICGS C-457", type: "Interceptor Boat", dist: "36 km", eta: "50m" },
                        { id: "cg-4", name: "ICGS Dornier", type: "Maritime Aircraft", dist: "Airborne", eta: "15m" },
                      ].map((asset) => {
                        const isDeployed = deployedAssets[asset.id];
                        return (
                          <div
                            key={asset.id}
                            className="p-1.5 rounded-lg bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between text-[10px]"
                          >
                            <div>
                              <span className="font-bold text-[#0B2545]">{asset.name}</span>
                              <span className="text-slate-400 ml-1">({asset.dist} &bull; {asset.eta})</span>
                            </div>
                            <button
                              onClick={() => {
                                const next = !isDeployed;
                                setDeployedAssets({ ...deployedAssets, [asset.id]: next });
                                triggerToast(`${asset.name}: ${next ? "Orders Dispatched" : "Recalled"}`);
                              }}
                              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                isDeployed
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {isDeployed ? "Deployed" : "Deploy"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recommended Deployment Summary Card */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-[13px] text-amber-900 leading-relaxed font-body">
                    <span className="font-bold">Recommended Plan: </span>
                    Deploy <span className="font-semibold">ICGS Vikram</span> with 800m boom to {selectedPriorityZone.name.split(":")[0]} within 2h to prevent mangrove contamination.
                  </div>
                </div>

                <button
                  onClick={() => setShowResponsePlanModal(true)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#0B2545] to-[#1E5FBF] hover:from-[#123A66] hover:to-[#174EA6] text-white text-xs font-semibold font-body transition-all cursor-pointer text-center shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute Tactical Response Plan</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* WORKSPACE TAB: RECOVERY MONITORING (Stage 21)                       */}
        {/* =================================================================== */}
        {activeIncidentTab === "recovery" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Row: Cleanup Progress & Timeline Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cleanup Progress Panel (6 cols) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Cleanup &amp; Containment Progress
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {RECOVERY_MONITORING_DATA.overallRemediationPct}% Remediated
                    </span>
                  </div>

                  {/* Big Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className="bg-gradient-to-r from-[#1E5FBF] to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${RECOVERY_MONITORING_DATA.overallRemediationPct}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0% Uncontrolled</span>
                      <span>Target: 100% Baseline Environmental Recovery</span>
                    </div>
                  </div>

                  {/* Milestone Checklist */}
                  <div className="mt-5 space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Operational Remediation Milestones
                    </div>
                    {RECOVERY_MONITORING_DATA.milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          m.completed
                            ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                            : "bg-[#F8FBFE] border-[#E1EEF9] text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {m.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={m.completed ? "font-semibold" : ""}>{m.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{m.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E1EEF9] text-[10px] text-slate-400 font-mono text-center">
                  Containment Efficiency: {RECOVERY_MONITORING_DATA.containmentEfficiency}% &bull; Estimated Full Recovery: {RECOVERY_MONITORING_DATA.estimatedFullRecovery}
                </div>
              </div>

              {/* Water Quality Time-Series Chart (6 cols) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Water Quality Index (WQI) &amp; Hydrocarbons Over Time
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-[#1E5FBF] border border-sky-200">
                      4 Sample Stations
                    </span>
                  </div>

                  {/* Recharts Line Chart */}
                  <div className="h-56 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={RECOVERY_MONITORING_DATA.waterQualityHistory}
                        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1EEF9" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" domain={[0, 30]} unit=" ppm" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="" tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="hydrocarbonsPpm"
                          name="Dissolved Hydrocarbons (ppm)"
                          stroke="#EF4444"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="wqiScore"
                          name="Water Quality Index (0-100)"
                          stroke="#10B981"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sample Stations Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E1EEF9] text-xs">
                    {RECOVERY_MONITORING_DATA.waterQualityStations.map((stn) => (
                      <div key={stn.id} className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0B2545] text-[11px]">{stn.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              stn.status === "Good"
                                ? "bg-emerald-100 text-emerald-800"
                                : stn.status === "Moderate"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {stn.status} ({stn.currentWqi})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          HC: {stn.hydrocarbonsPpm} ppm &bull; [18.66°N, 72.84°E]
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Ecological Indices & Recovery Timeline Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Ecological Indicators (6 cols) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)]">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E1EEF9] mb-3">
                  <Fish className="w-4 h-4 text-sky-600" />
                  <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                    Ecological &amp; Marine Habitat Vulnerability Assessment
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {RECOVERY_MONITORING_DATA.ecologicalMetrics.map((eco, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                      <div className="text-[10px] text-slate-500 font-semibold">{eco.label}</div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">{eco.value}</div>
                      <div
                        className={`text-[10px] font-semibold mt-0.5 ${
                          eco.status === "good" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {eco.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Timeline Forecast (6 cols) */}
              <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)]">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E1EEF9] mb-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                    Recovery Timeline Prediction Model
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  {RECOVERY_MONITORING_DATA.recoveryTimeline.map((ph, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0B2545]">{ph.phase}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{ph.estimatedDate}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#1E5FBF] h-full rounded-full"
                          style={{ width: `${(ph.currentPct / ph.targetPct) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>Current: {ph.currentPct}%</span>
                        <span>Phase Target: {ph.targetPct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* WORKSPACE TAB: MARINE DIGITAL TWIN SIMULATOR (Stage 20)             */}
        {/* =================================================================== */}
        {activeIncidentTab === "digitaltwin" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Interactive Physics Slider Strip */}
            <div className="p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1EEF9]">
                <div>
                  <h2 className="heading-secondary text-base sm:text-lg font-bold text-[#0B2545]">
                    Marine Digital Twin &bull; Real-Time Hydrodynamic Drift Engine
                  </h2>
                  <p className="body-description text-sm text-slate-600 font-body mt-1 leading-relaxed">
                    Adjust ocean currents and atmospheric boundary winds to recalculate the forward trajectory and coastline landfall vector live.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSimWindSpeed(5.1);
                      setSimWindDir(289);
                      setSimCurrentSpeed(0.67);
                      triggerToast("Simulation parameters reset to real-time INCOIS telemetry.");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Telemetry</span>
                  </button>
                </div>
              </div>

              {/* 3 Physics Parameter Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Wind Speed */}
                <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#0B2545]">Wind Speed (10m Drag)</span>
                    <span className="font-mono font-bold text-[#1E5FBF]">{simWindSpeed.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={0.5}
                    value={simWindSpeed}
                    onChange={(e) => setSimWindSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[#1E5FBF] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0 m/s (Calm)</span>
                    <span>15 m/s (Gale)</span>
                    <span>25 m/s (Storm)</span>
                  </div>
                </div>

                {/* Wind Direction */}
                <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#0B2545]">Wind Heading (Direction)</span>
                    <span className="font-mono font-bold text-[#0EA5B7]">{simWindDir}° WNW</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={simWindDir}
                    onChange={(e) => setSimWindDir(parseInt(e.target.value))}
                    className="w-full accent-[#0EA5B7] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0° (North)</span>
                    <span>180° (South)</span>
                    <span>360°</span>
                  </div>
                </div>

                {/* Ocean Current Speed */}
                <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#0B2545]">Ocean Surface Current</span>
                    <span className="font-mono font-bold text-indigo-600">{simCurrentSpeed.toFixed(2)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2.0}
                    step={0.05}
                    value={simCurrentSpeed}
                    onChange={(e) => setSimCurrentSpeed(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0.0 m/s</span>
                    <span>1.0 m/s</span>
                    <span>2.0 m/s (Strong)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Recalculated Output Strip */}
              <div className="p-4 rounded-xl bg-[#0B2545] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono shadow-md">
                <div>
                  <div className="text-[10px] text-slate-300 uppercase tracking-wider font-sans">
                    Recalculated Landfall Prediction
                  </div>
                  <div className="text-xl font-bold text-amber-400 mt-0.5">
                    ~ {Math.max(6, Math.round(38 / (simWindSpeed * 0.35 + simCurrentSpeed * 1.5 + 0.1))).toFixed(1)} Hours to Coast
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>Drift Heading: <span className="text-white font-bold">{Math.round((simWindDir + 15) % 360)}° (South-West)</span></div>
                  <div>High Risk Impact Sector: <span className="text-rose-400 font-bold">Alibaug Coastal Shallows (38 km)</span></div>
                </div>

                <button
                  onClick={() => triggerToast("Simulation parameters committed to operational forecast.")}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white text-xs font-bold font-sans shadow-xs cursor-pointer hover:brightness-110"
                >
                  Commit Forecast Run
                </button>
              </div>
            </div>

            {/* Digital Twin Map Visualization Canvas */}
            <div className="p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E1EEF9] mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1E5FBF]" />
                  <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                    Digital Twin Vector Overlay Canvas (Satellite + Surface Sheen + Current Vectors)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={twinShowVectors}
                      onChange={(e) => setTwinShowVectors(e.target.checked)}
                      className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                    />
                    <span>Hydrodynamic Vectors</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={twinShowVessels}
                      onChange={(e) => setTwinShowVessels(e.target.checked)}
                      className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                    />
                    <span>Vessel Tracks</span>
                  </label>
                </div>
              </div>

              {/* Contained Leaflet Mini-Map Component */}
              <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-200">
                <IncidentMiniMap />
              </div>

              {/* Scrubber Controls */}
              <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                    className="p-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#1E5FBF] transition-colors cursor-pointer"
                  >
                    {isPlayingTimeline ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="font-bold text-[#0B2545]">
                    {isPlayingTimeline ? "Playing Dispersion Dynamics" : "Scrub Time Window"}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px]">
                  {INCIDENT_DATA.timelineFrames.map((f, i) => (
                    <button
                      key={f.label}
                      onClick={() => setSelectedTimelineIndex(i)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        selectedTimelineIndex === i
                          ? "bg-[#1E5FBF] text-white font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

            {/* ================================================================= */}
            {/* FOOTER                                                           */}
            {/* ================================================================= */}
            <footer className="pt-4 pb-2 border-t border-[#DCEEFC] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
              <div>
                &copy; 2026 SAHAYYA &nbsp;|&nbsp; Ministry of Defence, Government of India
              </div>
              <div className="flex items-center gap-1.5 text-[#1E5FBF] font-bold">
                <Waves className="w-3.5 h-3.5" />
                <span>Safer Oceans. Stronger Tomorrow.</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* ======================================================================= */}
      {/* MODALS & POPUPS                                                         */}
      {/* ======================================================================= */}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 px-4 py-2.5 rounded-2xl bg-[#0B2545] border border-[#1E5FBF]/30 text-white text-xs font-semibold shadow-[0_10px_30px_rgba(30,95,191,0.2)] z-50 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Edit Overview Modal */}
      {showEditOverviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#1E5FBF]" />
                <span>Edit Incident Overview</span>
              </div>
              <button
                onClick={() => setShowEditOverviewModal(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-body">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs uppercase tracking-wider">Operational Description</label>
                <textarea
                  rows={4}
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] text-slate-800 text-sm leading-relaxed font-body focus:outline-none focus:border-[#1E5FBF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Incident Type</label>
                  <input
                    type="text"
                    value={tempType}
                    onChange={(e) => setTempType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Investigating Agency</label>
                  <input
                    type="text"
                    value={tempAgency}
                    onChange={(e) => setTempAgency(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end gap-2">
              <button
                onClick={() => setShowEditOverviewModal(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setOverviewDescription(tempDescription);
                  setOverviewType(tempType);
                  setOverviewAgency(tempAgency);
                  setShowEditOverviewModal(false);
                  triggerToast("Incident overview updated successfully.");
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-xs font-bold text-white shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Hero Carousel */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20">
            <img src={lightboxImage} alt="Tactical Imagery" className="w-full h-full object-contain" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#1E5FBF]" />
                <span>Share Incident Record</span>
              </div>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Generate a secure command link for authorized maritime defense and port control agencies:
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-mono">
              <input
                readOnly
                value={`https://sahayya.gov.in/incidents/${effectiveIncidentId}`}
                className="w-full bg-transparent text-slate-700 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`https://sahayya.gov.in/incidents/${effectiveIncidentId}`);
                  setShowShareModal(false);
                  triggerToast("Secure Incident URL copied to clipboard.");
                }}
                className="px-3 py-1 rounded-lg bg-[#1E5FBF] hover:bg-[#174EA6] text-white text-[10px] font-bold cursor-pointer shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official 9-Page PDF Generate Report Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        incidentIdOrCode={effectiveIncidentId}
        incidentTitle={INCIDENT_DATA.name}
      />

      {/* Vessel Forensic Evidence Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-[#0B2545]">
                  Vessel Forensic File &mdash; {selectedCandidate.name} ({selectedCandidate.score}%)
                </span>
              </div>
              <button onClick={() => setSelectedCandidate(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <div className="text-slate-500 text-[10px]">Trajectory Match</div>
                  <div className="text-lg font-black text-emerald-600">
                    {selectedCandidate.evidence?.trajectoryMatch || 99.4}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <div className="text-slate-500 text-[10px]">AIS Transponder Gap</div>
                  <div className="text-lg font-black text-rose-600">
                    {selectedCandidate.evidence?.aisAnomalyScore || 97.2}%
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-sm text-slate-700 leading-relaxed font-body">
                <div className="font-bold text-[#0B2545] mb-1 text-xs uppercase tracking-wide">Intelligence Assessment:</div>
                <p className="body-description text-sm text-slate-700 leading-relaxed">
                  {selectedCandidate.evidence?.notes ||
                    "Kinematic analysis shows vessel speed anomaly within the probable discharge ellipse during darkness."}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end gap-2">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedCandidate(null);
                  triggerToast(`Forensic evidence dossier saved for IMO ${selectedCandidate.imo}`);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-xs font-bold text-white shadow-sm"
              >
                Export Forensic Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Candidates Modal */}
      {showAllCandidatesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545]">
                AIS Candidate Correlation Roster (4 Vessels in Time Window)
              </div>
              <button onClick={() => setShowAllCandidatesModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {INCIDENT_DATA.vessels.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedCandidate(v);
                    setShowAllCandidatesModal(false);
                  }}
                  className="p-3 rounded-xl bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9] flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-[#0B2545] flex items-center gap-1.5">
                      <span>#{v.rank} {v.name}</span>
                      <span className="text-[10px] font-mono bg-[#E1EEF9] text-slate-700 px-1 py-0.2 rounded font-semibold">
                        {v.flagCode}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      IMO {v.imo} &middot; {v.type} &middot; CPA {v.cpa} &middot; AIS Gap {v.aisGap}
                    </div>
                  </div>
                  <div className={`text-base font-black ${v.score > 80 ? "text-rose-600" : "text-slate-700"}`}>
                    {v.score}%
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowAllCandidatesModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Plan Builder Modal */}
      {showResponsePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Create Incident Response Plan &mdash; Tier Z-03</span>
              </div>
              <button onClick={() => setShowResponsePlanModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3 font-body">
              <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] mb-1 text-xs uppercase tracking-wide">Recommended Mission Profile:</div>
                <p className="body-description text-sm sm:text-[14.5px] text-slate-700 leading-relaxed font-body">
                  {INCIDENT_DATA.responsePlan.recommendation}
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Assigned Response Assets:</div>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {INCIDENT_DATA.responsePlan.alternateAssets.map((asset, i) => (
                    <div key={i} className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-center">
                      <div className="font-bold text-[#0B2545] text-xs font-body">{asset.name}</div>
                      <div className="text-[10px] text-slate-500 font-body">{asset.type}</div>
                      <div className="text-[11px] text-emerald-700 font-bold mt-1 font-mono">ETA: {asset.eta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end gap-2 font-body">
              <button
                onClick={() => setShowResponsePlanModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResponsePlanModal(false);
                  triggerToast("Response plan dispatched to ICGS Vikram Ops Room.");
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                Dispatch Command Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Origin Analysis Modal */}
      {showOriginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn font-body">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2 font-display">
                <Target className="w-4 h-4 text-amber-500" />
                <span>Full Probable Origin Analysis</span>
              </div>
              <button onClick={() => setShowOriginModal(false)} className="cursor-pointer">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3 font-body">
              <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] mb-1 text-xs uppercase tracking-wide">Particle Tracking Methodology</div>
                <p className="body-description text-sm sm:text-[14.5px] text-slate-700 leading-relaxed font-body">
                  OpenDrift Lagrangian simulation incorporating HYCOM ocean current vectors and ECMWF 10m wind drag coefficients. Back-tracked 30 hours from detection time to locate initial slick discharge ellipse.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <span className="text-slate-400 block font-sans text-[10px]">Calculated Centroid</span>
                  <span className="font-bold text-[#0B2545]">18.7810°N, 72.5098°E</span>
                </div>
                <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <span className="text-slate-400 block font-sans text-[10px]">Kinematic Uncertainty</span>
                  <span className="font-bold text-emerald-700">&plusmn; 4.2 km Radius</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowOriginModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      {showDetailedAnalysisModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6366F1]" />
                <span>Detailed Spill Hydrocarbon Characterization</span>
              </div>
              <button onClick={() => setShowDetailedAnalysisModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] mb-1">Spectral Signature Profile</div>
                <p className="font-mono text-[11px] leading-relaxed text-slate-700">
                  {INCIDENT_DATA.spillDNA.spectralSignature}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <span className="text-slate-400 block font-sans text-[10px]">Shape Index</span>
                  <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.shapeIndex}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <span className="text-slate-400 block font-sans text-[10px]">Slick Orientation</span>
                  <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.spillDNA.orientation}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowDetailedAnalysisModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare with Model Modal */}
      {showCompareModelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545]">
                Side-by-Side Dispersion: Observed SAR vs OpenDrift Model
              </div>
              <button onClick={() => setShowCompareModelModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] mb-1">Copernicus SAR Observed</div>
                <div className="h-32 rounded-lg bg-black overflow-hidden relative flex items-center justify-center mb-2">
                  <img src="/sar-pass.jpg" alt="SAR" className="w-full h-full object-cover" />
                </div>
                <div className="font-mono text-[10px] text-slate-600">
                  Area: 276.04 km² · Confidence: 92.4%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] mb-1">OpenDrift Model Run</div>
                <div className="h-32 rounded-lg bg-[#0F2035] overflow-hidden relative flex items-center justify-center mb-2">
                  <div className="w-20 h-12 rounded-full bg-gradient-to-r from-red-600 to-amber-500 blur-[2px] opacity-80" />
                </div>
                <div className="font-mono text-[10px] text-slate-600">
                  Area: 268.40 km² · Correlation: 94.8%
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowCompareModelModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Activity Modal */}
      {showAllActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545]">
                Complete Incident Audit &amp; Activity Log
              </div>
              <button onClick={() => setShowAllActivityModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 text-xs">
              {INCIDENT_DATA.activityLog.map((act) => (
                <div key={act.id} className="p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {act.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : act.status === "in-progress" ? (
                      <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="text-slate-700 font-medium">{act.text}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[10px]">{act.time}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowAllActivityModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared 7D Evidence Graph Modal */}
      {evidenceModalCandidate && (
        <EvidenceGraphModal
          vessel={evidenceModalCandidate}
          onClose={() => setEvidenceModalCandidate(null)}
          onExportEvidence={() =>
            triggerToast(`Forensic evidence dossier exported for ${evidenceModalCandidate.name}`)
          }
        />
      )}
    </div>
  );
};

export default IncidentDetailPage;
