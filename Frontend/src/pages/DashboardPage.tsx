import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  Minus,
  Navigation,
  Compass,
  Wind,
  Waves,
  Thermometer,
  Anchor,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Play,
  Pause,
  ExternalLink,
  MoreVertical,
  X,
  Home,
  Map as MapIcon,
  Activity,
  Ship,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Share2,
  CheckCircle2,
  Fish,
  Flag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../services/api";
import { INCIDENT_DATA, VesselCandidate } from "../data/incidentData";
import sahayyaApi from "../services/api";
import sahayyaSocket from "../services/socket";
import { MapPanel } from "../components/MapPanel";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import { EvidenceGraphModal } from "../components/EvidenceGraphModal";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation state
  const [activeNav, setActiveNav] = useState("Dashboard");

  // Search state & ⌘K shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Notifications dropdown
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Sentinel-1 SAR ingestion complete: IN-MH-2026", time: "5m ago" },
    { id: 2, title: "AIS Gap Alert: MT PACIFIC VOYAGER (94m darkness)", time: "18m ago" },
    { id: 3, title: "OpenDrift particle hindcast converged at 18.78°N, 72.51°E", time: "32m ago" },
  ]);

  // User menu dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Add Note Modal
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [notes, setNotes] = useState<string[]>([
    "Initial SAR segmentation confirms heavy crude slick spanning 276 km² heading 24° East-Southeast.",
    "Coast Guard District HQ alerted. Air Squadron 848 placed on standby.",
  ]);
  const [newNoteText, setNewNoteText] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  // Progressive Disclosure: Collapsible Full Technical Report
  const [showFullTechnicalReport, setShowFullTechnicalReport] = useState<boolean>(() => {
    return sessionStorage.getItem("sahayya_home_tech_report") === "true";
  });
  const toggleTechReport = () => {
    setShowFullTechnicalReport((prev) => {
      const next = !prev;
      sessionStorage.setItem("sahayya_home_tech_report", String(next));
      return next;
    });
  };

  // Actions dropdown & Toast
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Popovers (matching screenshot: Spill Area popover and 3D Slick Model popover open by default or toggleable!)
  const [showSpillAreaPopover, setShowSpillAreaPopover] = useState(true);
  const [show3DModelPopover, setShow3DModelPopover] = useState(true);
  const [activeInfoPopover, setActiveInfoPopover] = useState<string | null>(null);
  const [showSeverityModal, setShowSeverityModal] = useState(false);

  // Left Column: Satellite pass & polarizations
  const [currentPassIndex, setCurrentPassIndex] = useState(0);
  const [polarizationMode, setPolarizationMode] = useState<"VV" | "VH" | "Composite">("Composite");
  const [showFullImageModal, setShowFullImageModal] = useState(false);

  // Center Column map controls are handled inside MapPanel

  // Modals for Vessel Track & Evidence
  const [showVesselTrackModal, setShowVesselTrackModal] = useState(false);
  const [showVesselInfoModal, setShowVesselInfoModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showAllCandidatesModal, setShowAllCandidatesModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<VesselCandidate>(INCIDENT_DATA.vessels[0]);

  // Response Recommendation Popovers & Modal
  const [showResponsePlanModal, setShowResponsePlanModal] = useState(false);
  const [activeResponsePopover, setActiveResponsePopover] = useState<"assets" | "route" | "weather" | null>(null);

  // Bottom Row: Slick Evolution Timeline
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(2); // "Now" is index 2
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingTimeline) {
      const intervalMs = 1500 / playbackSpeed;
      timer = setInterval(() => {
        setActiveTimelineIndex((prev) => (prev + 1) % INCIDENT_DATA.timelineFrames.length);
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlayingTimeline, playbackSpeed]);

  // Bottom Row: Spill DNA 3D Viewer Tab
  const [dnaTab, setDnaTab] = useState<"3D View" | "Cross-section" | "Thickness (est.)" | "Spectral Signature">("3D View");
  const [dnaViewType, setDnaViewType] = useState<"SAR" | "3D">("SAR");
  const [modelPitch, setModelPitch] = useState(22);
  const [modelYaw, setModelYaw] = useState(-30);

  // Footer Modal state
  const [footerModalContent, setFooterModalContent] = useState<{ title: string; body: string } | null>(null);

  // Sidebar visibility state (toggleable via 2-bar menu button)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Trigger smooth resize/reflow for Leaflet Map when sidebar toggles
  useEffect(() => {
    const timers = [40, 150, 310].map((delay) =>
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, delay)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isSidebarOpen]);

  const currentPass = INCIDENT_DATA.satelliteObservation.passes[currentPassIndex];
  const activeTimelineFrame = INCIDENT_DATA.timelineFrames[activeTimelineIndex];

  return (
    <div className="h-screen w-screen overflow-hidden bg-sky-canvas text-slate-800 font-sans select-none flex flex-col antialiased">
      
      {/* ========================================================================= */}
      {/* 1. TOP BAR (WHITE BACKGROUND, CLEAN ENTERPRISE/GOV DESIGN)               */}
      {/* ========================================================================= */}
      <header className="h-16 w-full shrink-0 bg-white border-b border-[#DCEEFC] px-4 lg:px-6 flex items-center justify-between z-40 relative shadow-[0_2px_12px_rgba(30,95,191,0.06)]">
        {/* Left: 2-Bar Sidebar Toggle + Emblem + Sahayya Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* 2-bar button which toggles the sidebar */}
          <button
            type="button"
            id="sidebar-toggle-button"
            data-testid="sidebar-toggle-button"
            onClick={() => {
              setIsSidebarOpen((prev) => {
                const next = !prev;
                triggerToast(next ? "Sidebar restored" : "Sidebar hidden (canvas expanded)");
                return next;
              });
            }}
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 shrink-0 touch-manipulation ${
              isSidebarOpen
                ? "bg-[#F0F7FD] hover:bg-[#E2F0FD] border-[#DCEEFC] text-slate-700 hover:text-[#0B2545] shadow-[0_2px_8px_rgba(30,95,191,0.06)]"
                : "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] border-[#1E5FBF] text-white shadow-sm ring-2 ring-sky-200/60"
            }`}
            title={isSidebarOpen ? "Hide sidebar (2-bar button)" : "Show sidebar (2-bar button)"}
            aria-label={isSidebarOpen ? "Collapse sidebar navigation" : "Expand sidebar navigation"}
            aria-expanded={isSidebarOpen}
          >
            {/* 2 Horizontal Bars */}
            <div className="flex flex-col items-center justify-center gap-1.5 w-5 py-0.5 pointer-events-none">
              <span
                className={`block h-[2.5px] rounded-full transition-all duration-300 ease-in-out ${
                  isSidebarOpen ? "w-5 bg-slate-700" : "w-5 bg-white"
                }`}
              />
              <span
                className={`block h-[2.5px] rounded-full transition-all duration-300 ease-in-out ${
                  isSidebarOpen ? "w-3.5 self-start bg-slate-700" : "w-5 bg-white"
                }`}
              />
            </div>
          </button>

          {/* Government of India Emblem (Ashoka Lion Capital SVG) */}
          <div className="flex items-center gap-2.5 pr-4 border-r border-[#E1EEF9]">
            <div className="w-8 h-8 flex items-center justify-center text-slate-700 shrink-0">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm-1 3v4h2V7h-2zm0 6v4h2v-4h-2z" opacity="0.2" />
                <path d="M12 3.5l1.5 3h3.5l-2.8 2.2 1 3.5-3.2-2.1-3.2 2.1 1-3.5-2.8-2.2h3.5z" />
                <path d="M7 16h10v2H7zm2 3h6v1.5H9z" />
              </svg>
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[11px] font-bold tracking-wide text-[#0B2545] uppercase">
                Ministry of Defence
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Government of India
              </div>
            </div>
          </div>

          {/* Sahayya Logo & Tagline */}
          <div className="flex items-center gap-3">
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
                <span className="font-display text-lg font-bold tracking-[0.14em] text-[#0B2545]">
                  SAHAYYA
                </span>
                <span className="badge-text bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  BETA
                </span>
              </div>
              <p className="text-[11px] font-body text-slate-500 hidden md:block">
                Safer Seas. Cleaner Oceans. Stronger Tomorrow.
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search Bar with ⌘K */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search vessel (IMO, name), location or coordinates..."
              className="w-full pl-9 pr-12 py-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-body text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF] focus:bg-white focus:ring-1 focus:ring-[#1E5FBF] transition-all"
            />
            <span className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white border border-[#E1EEF9] text-slate-500 shadow-2xs pointer-events-none">
              ⌘ K
            </span>

            {/* Quick Search Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Suggestions
                </div>
                <div
                  onMouseDown={() => {
                    setSelectedCandidate(INCIDENT_DATA.vessels[0]);
                    setShowVesselInfoModal(true);
                  }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Ship className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-semibold text-[#0B2545]">MT PACIFIC VOYAGER</span>
                    <span className="text-[10px] font-mono text-slate-400">(IMO 9438200)</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-600 font-bold">98.8% Suspect</span>
                </div>
                <div
                  onMouseDown={() => {
                    triggerToast("Focused map coordinates: 18.9997°N, 72.5502°E");
                  }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-body">Mumbai High Offshore Slick</span>
                  </div>
                  <span className="text-[10px] text-sky-600 font-mono font-medium">18.9997°N, 72.5502°E</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Clock, Systems Operational, Notifications & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* UTC & IST Live Clock */}
          <div className="hidden xl:flex flex-col text-right">
            <div className="text-xs font-mono font-semibold text-[#0B2545]">
              12 Sep 2026 17:55 UTC (Local: 23:25 IST)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              GPS Satellite Lock · Sync 4ms
            </div>
          </div>

          {/* Operational Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-left leading-tight">
              <div className="text-xs font-bold text-emerald-700">
                Systems Operational
              </div>
              <div className="text-[9px] text-emerald-600">
                Last data update: 5 min ago
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-[#F0F7FD] hover:bg-[#E2F0FD] border border-[#DCEEFC] text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-[0_2px_8px_rgba(30,95,191,0.06)]"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                3
              </span>
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-3 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#0B2545]">Notifications</span>
                  <span
                    className="text-[10px] text-sky-600 cursor-pointer hover:underline"
                    onClick={() => setNotifications([])}
                  >
                    Clear all
                  </span>
                </div>
                <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-2 rounded-xl bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9] text-xs transition-colors">
                      <div className="font-semibold text-[#0B2545]">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.time}</div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400">No new notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F0F7FD] transition-colors cursor-pointer"
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
                  "SK"
                )}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-bold text-[#0B2545]">
                  {user?.name || "S. Kumar"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {user?.role || "Coast Guard"}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs font-bold text-[#0B2545]">{user?.name || "S. Kumar"}</div>
                  <div className="text-[10px] text-slate-400">{user?.email || "s.kumar@coastguard.gov.in"}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Information</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>System Preferences</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
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

      {/* ========================================================================= */}
      {/* 2. BODY LAYOUT: COLLAPSIBLE DEEP NAVY SIDEBAR + SCROLLABLE CONTENT CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Collapsible Left Sidebar (Deep Navy Blue Vertical Gradient) */}
        <aside
          id="dashboard-sidebar"
          data-testid="dashboard-sidebar"
          aria-hidden={!isSidebarOpen}
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
              { id: "Incidents", icon: Activity, label: "Incidents", path: "/incidents/IN-MH-2026" },
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
                    } else if (item.id !== "Home") {
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
                  <span className="text-[10px] font-body font-medium tracking-normal">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className={`px-1 text-center transition-opacity duration-200 ${
              isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="w-6 h-6 mx-auto mb-1 text-sky-400 opacity-60">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7-0.5" />
                <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7-0.5" opacity="0.5" />
              </svg>
            </div>
            <p className="text-[9px] font-body text-slate-400 leading-tight">
              Safer Oceans.<br />Stronger Tomorrow.
            </p>
          </div>
        </aside>

        {/* Main Content Area (Scrolls both vertically down to footer AND horizontally if zoomed) */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-auto bg-sky-canvas p-4 lg:p-6 custom-tactical-scrollbar">
          <div className="min-w-[1200px] flex flex-col space-y-5 pb-6">
          
          {/* ======================================================================= */}
          {/* 3. INCIDENT HEADER BAR                                                  */}
          {/* ======================================================================= */}
          <section className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-1">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="heading-page text-2xl sm:text-3xl font-display font-bold text-[#0B2545] tracking-tight">
                  {INCIDENT_DATA.name}
                </h2>
                <span className="badge-text bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Live Incident
                </span>
                <button
                  onClick={() => setShowAddNoteModal(true)}
                  className="ml-2 px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-white hover:bg-slate-50 text-xs font-body font-semibold text-slate-700 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,95,191,0.06)] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add Note ({notes.length})</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 font-body mt-1">
                {INCIDENT_DATA.subtitle}
              </p>
            </div>

            {/* Right Side: Weather Chip & Actions */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Weather Chip */}
              <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E1EEF9] text-xs font-body font-medium text-slate-700 shadow-[0_2px_8px_rgba(30,95,191,0.06)] flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{INCIDENT_DATA.weather.summary} &mdash; {INCIDENT_DATA.weather.wind}</span>
              </div>

              {/* Incident Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-[#E1EEF9] text-xs font-body font-semibold text-slate-700 shadow-[0_2px_8px_rgba(30,95,191,0.06)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Incident Actions</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showActionsDropdown && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-2 z-50 animate-fadeIn">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        triggerToast("Incident escalated to Tier-1 National Maritime Disaster Response.");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-xs text-rose-600 flex items-center gap-2 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Escalate Incident</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        triggerToast("Assigned Task Force 54 (Western Seaboard Response Team)");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2 font-medium"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-600" />
                      <span>Assign Team</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        triggerToast("Secure briefing link copied to clipboard.");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2 font-medium"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Share Briefing</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        triggerToast("Cannot close: active slick containment in progress.");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-400 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Close Incident</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Overflow ⋮ Menu */}
              <button
                onClick={() => triggerToast("Incident audit log verified by Indian Coast Guard Cryptographic Key.")}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E1EEF9] text-slate-600 transition-colors shadow-[0_2px_8px_rgba(30,95,191,0.06)] cursor-pointer"
                title="More Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 4. PROGRESSIVE DISCLOSURE: 3 HEADLINE EXECUTIVE CARDS                   */}
          {/* ======================================================================= */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: What happened */}
            <div className="p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <span className="heading-section text-xs font-display font-semibold text-slate-500 uppercase tracking-wider">
                    What Happened
                  </span>
                  <span className="badge-text bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Active Spill &bull; +12%
                  </span>
                </div>
                <div className="kpi-number text-2xl sm:text-3xl font-body font-bold text-[#0B2545] tracking-tight mt-2.5">
                  276 km² Spill Area
                </div>
                <p className="body-text text-xs text-slate-600 font-body mt-2 leading-relaxed">
                  Heavy crude oil slick observed at Mumbai High Offshore basin, approximately 160 km West of Mumbai shoreline.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Vol: ~1,200 Tonnes Crude</span>
                <button
                  onClick={toggleTechReport}
                  className="btn-text text-xs font-body font-semibold text-[#1E5FBF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFullTechnicalReport ? "Hide Metrics" : "View Details"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFullTechnicalReport ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Card 2: How urgent */}
            <div className="p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <span className="heading-section text-xs font-display font-semibold text-slate-500 uppercase tracking-wider">
                    Urgency &amp; Coastline Threat
                  </span>
                  <span className="badge-text bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Critical (88/100)
                  </span>
                </div>
                <div className="kpi-number text-2xl sm:text-3xl font-body font-bold text-rose-600 tracking-tight mt-2.5">
                  High Risk &bull; ~16h
                </div>
                <p className="body-text text-xs text-slate-600 font-body mt-2 leading-relaxed">
                  Spill reaches coast in ~16 hours — drift models forecast high threat to Alibaug sensitive mangroves and coastal nurseries.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Drift: 1.2 kts &bull; 114° ESE</span>
                <button
                  onClick={() => setShowSeverityModal(true)}
                  className="btn-text text-xs font-body font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Risk Breakdown &rarr;</span>
                </button>
              </div>
            </div>

            {/* Card 3: Top suspect */}
            <div className="p-5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <span className="heading-section text-xs font-display font-semibold text-slate-500 uppercase tracking-wider">
                    Top Attributed Suspect
                  </span>
                  <span className="badge-text bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    98.8% Attribution
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-body font-bold text-[#0B2545] tracking-tight mt-2.5 truncate">
                  MT PACIFIC VOYAGER
                </div>
                <p className="body-text text-xs text-slate-600 font-body mt-2 leading-relaxed">
                  Crude tanker went dark for 94 minutes with speed dropping from 13.8 to 1.4 kts right across the slick origin centroid.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">IMO 9438200 &bull; Liberia</span>
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="btn-text text-xs font-body font-semibold text-[#1E5FBF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Evidence &rarr;</span>
                </button>
              </div>
            </div>
          </section>

          {/* Progressive Disclosure Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-[#E1EEF9] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-xs font-bold text-[#0B2545]">
                {showFullTechnicalReport ? "Full Technical Report Active" : "Simplified Commander View Active"}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {showFullTechnicalReport
                  ? "— Showing all 6 calibrated sensor metrics, satellite pass imagery & environmental telemetry."
                  : "— High-level situation summary shown. Sensor telemetry and satellite calibration collapsed below."}
              </span>
            </div>

            <button
              onClick={toggleTechReport}
              className="px-3.5 py-1.5 rounded-xl border border-[#1E5FBF]/30 bg-sky-50/80 hover:bg-sky-100 text-[#1E5FBF] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <span>{showFullTechnicalReport ? "Collapse Technical Report" : "Expand Full Technical Report"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFullTechnicalReport ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Collapsible 6 Stat Cards Section */}
          {showFullTechnicalReport && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 animate-fadeIn">
              {INCIDENT_DATA.statCards.map((card) => {
                const isSpillArea = card.id === "spill-area";
                const isPopoverVisible = isSpillArea ? showSpillAreaPopover : activeInfoPopover === card.id;

                return (
                  <div
                    key={card.id}
                    className="relative p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] flex flex-col justify-between transition-all duration-200"
                  >
                    <div>
                      {/* Header: Label + Info Button */}
                      <div className="flex items-center justify-between text-xs text-slate-500 font-body font-semibold">
                        <span>{card.label}</span>
                        <button
                          onClick={() => {
                            if (isSpillArea) {
                              setShowSpillAreaPopover(!showSpillAreaPopover);
                            } else {
                              setActiveInfoPopover(activeInfoPopover === card.id ? null : card.id);
                            }
                          }}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Big Value */}
                      <div
                        className={`kpi-number text-2xl font-body font-bold tracking-tight mt-1.5 ${
                          card.id === "severity-score"
                            ? "text-rose-600"
                            : card.id === "detection-confidence"
                            ? "text-emerald-700"
                            : "text-[#0B2545]"
                        }`}
                      >
                        {card.value}
                      </div>

                      {/* Trend Line */}
                      <div className="text-[11px] font-body font-semibold mt-1">
                        {card.id === "severity-score" ? (
                          <span className="badge-text bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {card.trend}
                          </span>
                        ) : card.trendType === "danger" ? (
                          <span className="text-rose-600 font-bold">{card.trend}</span>
                        ) : card.trendType === "success" ? (
                          <span className="text-emerald-600 font-bold">{card.trend}</span>
                        ) : (
                          <span className="text-slate-600">{card.trend}</span>
                        )}
                      </div>
                    </div>

                    {/* Footer Tag */}
                    <div className="mt-3 pt-2.5 border-t border-[#EBF3FA] text-[11px] text-slate-500 font-body flex items-center justify-between font-medium">
                      {card.isBreakdown ? (
                        <button
                          onClick={() => setShowSeverityModal(true)}
                          className="text-sky-600 hover:underline font-bold cursor-pointer"
                        >
                          {card.footer}
                        </button>
                      ) : (
                        <span>{card.footer}</span>
                      )}
                    </div>

                    {/* Technical Info Popover */}
                    {isPopoverVisible && (
                      <div className="absolute top-full left-0 mt-2 w-80 sm:w-[340px] bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_12px_36px_rgba(30,95,191,0.18)] p-4 z-50 animate-fadeIn text-xs text-slate-700">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5 font-bold text-[#0B2545]">
                          <span className="text-sm font-display font-semibold">{card.info.title}</span>
                          <button
                            onClick={() => {
                              if (isSpillArea) setShowSpillAreaPopover(false);
                              else setActiveInfoPopover(null);
                            }}
                            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="body-description text-sm sm:text-[14.5px] text-slate-700 leading-relaxed font-body">
                          {card.info.description}
                        </p>
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5 font-body">
                          {card.info.method && (
                            <div><span className="font-semibold text-slate-800">Method:</span> {card.info.method}</div>
                          )}
                          {card.info.source && (
                            <div><span className="font-semibold text-slate-800">Source:</span> {card.info.source}</div>
                          )}
                          {card.info.lastUpdated && (
                            <div><span className="font-semibold text-slate-800">Last Updated:</span> <span className="font-mono text-xs">{card.info.lastUpdated}</span></div>
                          )}
                        </div>
                        {card.info.linkText && (
                          <button
                            onClick={() => {
                              if (isSpillArea) setShowSpillAreaPopover(false);
                              setShowFullImageModal(true);
                            }}
                            className="mt-2 text-sky-600 font-body font-bold hover:underline block text-[11px] cursor-pointer"
                          >
                            {card.info.linkText}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ======================================================================= */}
          {/* 5. MAIN GRID (3 COLUMNS, WHITE CARDS, CLEAN DESIGN)                     */}
          {/* ======================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-[1200px]">
            
            {/* ------------------------------------------------------------------- */}
            {/* LEFT COLUMN: Satellite Observation (Tactical Imagery)               */}
            {/* ------------------------------------------------------------------- */}
            {showFullTechnicalReport && (
              <div className="lg:col-span-3 rounded-2xl bg-white border border-[#E1EEF9] p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all animate-fadeIn">
                <div>
                  <div className="flex items-center gap-2 pb-1 border-b border-[#EBF3FA]">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="heading-section text-xs font-display font-semibold text-[#0B2545] uppercase tracking-wider">
                        Satellite Observation
                      </h3>
                      <p className="text-[11px] text-slate-500 font-body font-medium">
                        {INCIDENT_DATA.satelliteObservation.instrument}
                      </p>
                    </div>
                  </div>

                  {/* SAR Thumbnail with Paging Arrows */}
                  <div className="relative mt-3 rounded-xl overflow-hidden border border-[#E1EEF9] bg-black group">
                    <img
                      src={currentPass.image}
                      alt="Satellite SAR radar pass"
                      className={`w-full h-44 object-cover transition-all duration-300 ${
                        polarizationMode === "VV"
                          ? "contrast-150 brightness-90"
                          : polarizationMode === "VH"
                          ? "contrast-125 brightness-110 grayscale"
                          : "contrast-125 saturate-150"
                      }`}
                    />

                    {/* Left/Right Pass Navigation */}
                    <button
                      onClick={() =>
                        setCurrentPassIndex((prev) =>
                          prev === 0 ? INCIDENT_DATA.satelliteObservation.passes.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                      title="Previous Pass"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPassIndex((prev) =>
                          (prev + 1) % INCIDENT_DATA.satelliteObservation.passes.length
                        )
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                      title="Next Pass"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Pass Counter Tag */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono font-medium">
                      Pass {currentPassIndex + 1} of {INCIDENT_DATA.satelliteObservation.passes.length}
                    </div>

                    {/* Sensor Specs Chip */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-sky-300 text-[9px] font-mono font-medium">
                      C-Band SAR · 10m res
                    </div>
                  </div>

                  {/* Polarization Toggle Chips */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-slate-500 font-body font-medium">Polarization:</span>
                    <div className="flex items-center gap-1">
                      {(["VV", "VH", "Composite"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPolarizationMode(mode)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-body font-bold transition-all cursor-pointer ${
                            polarizationMode === mode
                              ? "bg-[#1E5FBF] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Satellite Metadata List */}
                  <div className="mt-3 space-y-1.5 text-[11px] border-t border-[#E1EEF9] pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-body">Acquisition:</span>
                      <span className="font-semibold text-slate-700 font-mono text-xs">{currentPass.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-body">Centroid:</span>
                      <span className="font-semibold text-slate-700 font-mono text-xs">{currentPass.centroid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-body">Polygons:</span>
                      <span className="font-semibold text-slate-700 font-mono text-xs">{currentPass.polygons}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-body">Cloud Cover:</span>
                      <span className="font-semibold text-emerald-600 font-body">Radar (All-Weather)</span>
                    </div>
                  </div>
                </div>

                {/* Satellite Footer Links */}
                <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex items-center justify-between text-xs">
                  <a
                    href="https://dataspace.copernicus.eu"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-sky-600 flex items-center gap-1 transition-colors font-body font-medium"
                  >
                    <span>Copernicus Data Space</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => setShowFullImageModal(true)}
                    className="px-3 py-1 rounded-lg bg-white border border-[#E1EEF9] hover:bg-sky-50/50 text-[#1E5FBF] font-body font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>View Full Image</span>
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* CENTER COLUMN: Contained Leaflet Map Panel                           */}
            {/* ------------------------------------------------------------------- */}
            <div className={`${showFullTechnicalReport ? "lg:col-span-6" : "lg:col-span-8"} flex flex-col transition-all duration-300`}>
              <MapPanel
                onOpenTrackModal={() => setShowVesselTrackModal(true)}
                onOpenInfoModal={() => {
                  setSelectedCandidate(INCIDENT_DATA.vessels[0]);
                  setShowVesselInfoModal(true);
                }}
                onTriggerToast={triggerToast}
              />
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: Vessel Attribution                                    */}
            {/* ------------------------------------------------------------------- */}
            <div className={`${showFullTechnicalReport ? "lg:col-span-3" : "lg:col-span-4"} rounded-2xl bg-white border border-[#E1EEF9] p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all space-y-3`}>
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#0B2545]" />
                    <h3 className="heading-section text-xs font-display font-semibold text-[#0B2545] uppercase tracking-wider">
                      Vessel Attribution
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-text bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      4 Candidates
                    </span>
                    <button
                      onClick={() => setShowAllCandidatesModal(true)}
                      className="text-[11px] font-body font-semibold text-[#1E5FBF] hover:underline cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>
                </div>

                {/* Candidate #1: Highlighted in Red tint */}
                <div className="mt-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    {/* Ship Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-rose-200 shrink-0">
                      <img src="/tanker.jpg" alt="Tanker" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-body font-bold text-rose-700">#1 MT PACIFIC VOYAGER</span>
                        <span className="text-base font-mono font-bold text-rose-600">98.8 %</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        IMO 9438200 &nbsp;|&nbsp; Crude Oil Tanker &nbsp;|&nbsp; Liberia [LR]
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 my-2 py-1.5 px-2 rounded-xl bg-white/90 border border-rose-100 text-center">
                    <div>
                      <div className="text-slate-400 text-[9px] font-body font-medium">CPA</div>
                      <div className="font-mono font-bold text-xs text-slate-700">27.46 km</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[9px] font-body font-medium">Min SOG</div>
                      <div className="font-mono font-bold text-xs text-amber-600">1.4 kts</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[9px] font-body font-medium">AIS Gap</div>
                      <div className="font-mono font-bold text-xs text-rose-600">94 min</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowEvidenceModal(true)}
                      className="btn-text py-1.5 px-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-body font-semibold shadow-sm transition-all cursor-pointer text-center"
                    >
                      View Evidence &rarr;
                    </button>
                    <button
                      onClick={() => setShowVesselTrackModal(true)}
                      className="btn-text py-1.5 px-2 rounded-xl bg-white hover:bg-[#F8FBFE] border border-[#E1EEF9] text-slate-700 text-xs font-body font-semibold transition-all cursor-pointer text-center"
                    >
                      Track Vessel
                    </button>
                  </div>
                </div>

                {/* Candidates #2, #3, #4 */}
                <div className="mt-2.5 space-y-1.5">
                  {[
                    {
                      rank: 2,
                      name: "CMA CGM ANTARES",
                      score: "43.5 %",
                      type: "Container Vessel",
                      flag: "France [FR]",
                      imo: "9723411",
                      image: "/container-ship.jpg",
                    },
                    {
                      rank: 3,
                      name: "MV NORDIC TRADER",
                      score: "43.5 %",
                      type: "Bulk Carrier",
                      flag: "Panama [PA]",
                      imo: "9315678",
                      image: "/tanker.jpg",
                    },
                    {
                      rank: 4,
                      name: "SAGAR SHAKTI",
                      score: "13.9 %",
                      type: "Supply Vessel",
                      flag: "India [IN]",
                      imo: "9554410",
                      image: "/container-ship.jpg",
                    },
                  ].map((c) => (
                    <div
                      key={c.rank}
                      onClick={() => triggerToast(`Viewing details for: ${c.name}`)}
                      className="p-2 rounded-xl bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#E1EEF9] shrink-0">
                          <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-xs font-body font-semibold text-[#0B2545]">
                            #{c.rank} {c.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            IMO {c.imo} &nbsp;|&nbsp; {c.type} &nbsp;|&nbsp; {c.flag}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-700">
                        <span>{c.score}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Recommendation Card */}
              <div className="p-3 rounded-2xl bg-[#F8FBFE] border border-[#E1EEF9] relative">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#0B2545]">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Response Recommendation</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    {INCIDENT_DATA.responsePlan.tier}
                  </span>
                </div>

                <div className="text-xs text-slate-700 font-medium">
                  Asset: <span className="font-bold text-[#0B2545]">{INCIDENT_DATA.responsePlan.designatedAsset}</span>
                  <span className="text-[10px] text-slate-500 ml-2">(ETA {INCIDENT_DATA.responsePlan.eta})</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {INCIDENT_DATA.responsePlan.mission}
                </p>

                <button
                  onClick={() => setShowResponsePlanModal(true)}
                  className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <span>View Full Response Plan</span>
                  <span>&rarr;</span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <button
                    onClick={() => setActiveResponsePopover(activeResponsePopover === "assets" ? null : "assets")}
                    className="py-1 px-1 rounded-lg bg-white hover:bg-[#EFF6FD] border border-[#E1EEF9] text-[10px] font-semibold text-slate-700 text-center cursor-pointer shadow-2xs"
                  >
                    Nearest Assets
                  </button>
                  <button
                    onClick={() => setActiveResponsePopover(activeResponsePopover === "route" ? null : "route")}
                    className="py-1 px-1 rounded-lg bg-white hover:bg-[#EFF6FD] border border-[#E1EEF9] text-[10px] font-semibold text-slate-700 text-center cursor-pointer shadow-2xs"
                  >
                    Route Analysis
                  </button>
                  <button
                    onClick={() => setActiveResponsePopover(activeResponsePopover === "weather" ? null : "weather")}
                    className="py-1 px-1 rounded-lg bg-white hover:bg-[#EFF6FD] border border-[#E1EEF9] text-[10px] font-semibold text-slate-700 text-center cursor-pointer shadow-2xs"
                  >
                    Weather Window
                  </button>
                </div>

                {/* Popovers */}
                {activeResponsePopover && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-3 z-50 animate-fadeIn text-xs text-slate-800">
                    <div className="flex items-center justify-between pb-1 border-b border-[#E1EEF9] mb-2 font-bold text-[#0B2545]">
                      <span>
                        {activeResponsePopover === "assets"
                          ? "Available Maritime Assets"
                          : activeResponsePopover === "route"
                          ? "Interception Route"
                          : "Operational Weather Window"}
                      </span>
                      <button onClick={() => setActiveResponsePopover(null)}>
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                      </button>
                    </div>

                    {activeResponsePopover === "assets" && (
                      <div className="space-y-1.5 text-[11px]">
                        {INCIDENT_DATA.responsePlan.alternateAssets.map((a, i) => (
                          <div key={i} className="flex justify-between border-b border-[#E1EEF9] pb-1">
                            <div>
                              <div className="font-bold text-[#0B2545]">{a.name}</div>
                              <div className="text-[9px] text-slate-500">{a.type} · {a.port || a.base}</div>
                            </div>
                            <span className="font-mono text-emerald-600 font-bold">{a.eta}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeResponsePopover === "route" && (
                      <div className="space-y-1 text-[11px] font-mono">
                        <div>Bearing: {INCIDENT_DATA.responsePlan.routeAnalysis.interceptBearing}</div>
                        <div>Sea State: {INCIDENT_DATA.responsePlan.routeAnalysis.seaState}</div>
                        <div>Distance: {INCIDENT_DATA.responsePlan.routeAnalysis.transitDistance}</div>
                        <div className="text-emerald-700 font-bold mt-1">
                          Efficiency: {INCIDENT_DATA.responsePlan.routeAnalysis.containmentEfficiency}
                        </div>
                      </div>
                    )}

                    {activeResponsePopover === "weather" && (
                      <div className="space-y-1 text-[11px]">
                        <div className="text-slate-700">{INCIDENT_DATA.responsePlan.weatherWindow.next24Hours}</div>
                        <div className="text-slate-500 text-[10px]">{INCIDENT_DATA.responsePlan.weatherWindow.windForecast}</div>
                        <div className="text-emerald-700 font-bold mt-1">
                          Status: {INCIDENT_DATA.responsePlan.weatherWindow.operationalStatus}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 6. BOTTOM ROW (3 PANELS, WHITE CARDS)                                   */}
          {/* ======================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* PANEL 1: Affected Zones (Proximity Analysis) */}
            <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0EA5B7]" />
                    <h3 className="heading-section text-xs font-display font-semibold text-[#0B2545] uppercase tracking-wider">
                      Affected Zones (Proximity Analysis)
                    </h3>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Anchor className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="text-xs font-body font-semibold text-[#0B2545]">Closest Coastline</div>
                        <div className="text-[10px] font-body text-slate-500">{INCIDENT_DATA.proximityAnalysis.closestCoastline.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-600">
                      {INCIDENT_DATA.proximityAnalysis.closestCoastline.value}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-[#0EA5B7]" />
                      <div>
                        <div className="text-xs font-body font-semibold text-[#0B2545]">Marine Protected Area</div>
                        <div className="text-[10px] font-body text-slate-500">{INCIDENT_DATA.proximityAnalysis.mpa.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0EA5B7]">
                      {INCIDENT_DATA.proximityAnalysis.mpa.value}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Fish className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="text-xs font-body font-semibold text-[#0B2545]">Fishing Zone</div>
                        <div className="text-[10px] font-body text-slate-500">{INCIDENT_DATA.proximityAnalysis.fishingZone.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      {INCIDENT_DATA.proximityAnalysis.fishingZone.value}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#E1EEF9] flex justify-end">
                <button
                  onClick={() => triggerToast("Highlighting Coastline, MPA, and Fishing corridors on tactical map.")}
                  className="btn-text text-xs font-body font-semibold text-[#1E5FBF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View on Map</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* PANEL 2: Slick Evolution (Hindcast & Forecast) */}
            <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1E5FBF]" />
                    <h3 className="heading-section text-xs font-display font-semibold text-[#0B2545] uppercase tracking-wider">
                      Slick Evolution (Hindcast &amp; Forecast)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-medium">
                    Step: {activeTimelineFrame.label}
                  </span>
                </div>

                {/* 7 Thumbnail Frames */}
                <div className="grid grid-cols-7 gap-1 mt-3">
                  {INCIDENT_DATA.timelineFrames.map((frame, idx) => {
                    const isSelected = activeTimelineIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveTimelineIndex(idx)}
                        className={`rounded-xl overflow-hidden border p-1 text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#1E5FBF] bg-sky-50 shadow-xs ring-2 ring-[#1E5FBF]/40"
                            : "border-[#E1EEF9] bg-[#F8FBFE] hover:border-[#1E5FBF]/40"
                        }`}
                      >
                        <div className="w-full h-8 rounded-lg bg-[#061220] border border-[#132A4A] overflow-hidden mb-1 flex items-center justify-center relative shadow-inner">
                          <div className="absolute inset-0 bg-[radial-gradient(#1E5FBF_1px,transparent_1px)] bg-[size:6px_6px] opacity-20" />
                          <svg viewBox="0 0 44 24" className="w-full h-full p-0.5 relative z-10">
                            {idx === 0 && (
                              <g>
                                <circle cx="16" cy="14" r="3.5" fill="#F59E0B" opacity="0.85" />
                                <circle cx="16" cy="14" r="1.5" fill="#FEF3C7" />
                                <line x1="16" y1="14" x2="26" y2="9" stroke="#F59E0B" strokeWidth="1" strokeDasharray="1.5 1.5" />
                              </g>
                            )}
                            {idx === 1 && (
                              <g>
                                <path d="M13,15 Q20,13 27,10" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                                <circle cx="27" cy="10" r="2" fill="#FBBF24" />
                              </g>
                            )}
                            {idx === 2 && (
                              <g>
                                <ellipse cx="22" cy="12" rx="14" ry="5.5" fill="#EF4444" opacity="0.35" transform="rotate(-18 22 12)" />
                                <ellipse cx="22" cy="12" rx="8.5" ry="3" fill="#EF4444" opacity="0.9" transform="rotate(-18 22 12)" />
                                <circle cx="22" cy="12" r="1.8" fill="#FDE047" className="animate-pulse" />
                              </g>
                            )}
                            {idx === 3 && (
                              <g>
                                <ellipse cx="24" cy="11" rx="15" ry="6" fill="#BE123C" opacity="0.5" transform="rotate(-14 24 11)" />
                                <ellipse cx="24" cy="11" rx="9" ry="3.2" fill="#E11D48" opacity="0.85" transform="rotate(-14 24 11)" />
                              </g>
                            )}
                            {idx === 4 && (
                              <g>
                                <ellipse cx="26" cy="10" rx="16" ry="7" fill="#9F1239" opacity="0.5" transform="rotate(-10 26 10)" />
                                <path d="M12,15 Q24,10 34,7" stroke="#FB7185" strokeWidth="1.2" strokeDasharray="1 1" opacity="0.8" />
                              </g>
                            )}
                            {idx === 5 && (
                              <g>
                                <ellipse cx="28" cy="9" rx="17" ry="7.5" fill="#881337" opacity="0.55" transform="rotate(-5 28 9)" />
                                <line x1="39" y1="2" x2="39" y2="22" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="2 1" />
                              </g>
                            )}
                            {idx === 6 && (
                              <g>
                                <ellipse cx="30" cy="9" rx="18" ry="8" fill="#701A75" opacity="0.6" />
                                <line x1="39" y1="2" x2="39" y2="22" stroke="#0284C7" strokeWidth="2" />
                              </g>
                            )}
                          </svg>
                        </div>
                        <div className="text-[10px] font-body font-semibold text-slate-700 leading-tight">
                          {frame.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Scrubber */}
                <div className="mt-3 px-1">
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={activeTimelineIndex}
                    onChange={(e) => setActiveTimelineIndex(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E5FBF]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>-24h (T-24)</span>
                    <span className="text-rose-600 font-bold">Now (T-0)</span>
                    <span>+48h (Forecast)</span>
                  </div>
                </div>

                {/* Interactive OpenDrift Trajectory Simulation Display */}
                <div className="mt-3 h-32 rounded-xl bg-[#061220] border border-[#172E4D] relative overflow-hidden shadow-inner flex flex-col justify-between p-2.5">
                  {/* Background Hydrodynamic Map Graphic */}
                  <img
                    src="/opendrift-trajectory-simulation.jpg"
                    alt="OpenDrift Hydrodynamic Simulation"
                    className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-screen pointer-events-none scale-105"
                  />

                  {/* SVG Vector Canvas Over Simulation */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 120">
                    {/* Tactical Coordinate Grid */}
                    <g stroke="#1E5FBF" strokeWidth="0.5" opacity="0.25" strokeDasharray="3 3">
                      <line x1="70" y1="0" x2="70" y2="120" />
                      <line x1="150" y1="0" x2="150" y2="120" />
                      <line x1="230" y1="0" x2="230" y2="120" />
                      <line x1="0" y1="40" x2="340" y2="40" />
                      <line x1="0" y1="80" x2="340" y2="80" />
                    </g>

                    {/* Coastal Barrier & 12 NM Baseline */}
                    <path
                      d="M310,0 Q305,60 320,120"
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="2.5"
                      opacity="0.85"
                    />
                    <path
                      d="M280,0 Q275,60 290,120"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                      opacity="0.6"
                    />
                    <text x="282" y="15" fill="#38BDF8" fontSize="6.5" fontFamily="monospace" opacity="0.9">
                      12NM SHORE BUFFER
                    </text>

                    {/* Full Hindcast-Forecast Drift Spine */}
                    <path
                      d="M60,82 Q120,68 180,56 T295,38"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      opacity="0.5"
                    />

                    {/* Active Slick Plume (Dynamically morphed with activeTimelineIndex) */}
                    {(() => {
                      const positions = [
                        { cx: 60, cy: 82, rx: 14, ry: 7, rot: -18, fill: "#F59E0B", opacity: 0.8 },
                        { cx: 105, cy: 72, rx: 20, ry: 9, rot: -20, fill: "#EA580C", opacity: 0.85 },
                        { cx: 155, cy: 62, rx: 28, ry: 12, rot: -24.6, fill: "#DC2626", opacity: 0.95 },
                        { cx: 195, cy: 54, rx: 34, ry: 15, rot: -22, fill: "#BE123C", opacity: 0.9 },
                        { cx: 235, cy: 47, rx: 40, ry: 18, rot: -18, fill: "#9F1239", opacity: 0.85 },
                        { cx: 268, cy: 42, rx: 46, ry: 20, rot: -14, fill: "#881337", opacity: 0.8 },
                        { cx: 295, cy: 38, rx: 52, ry: 22, rot: -10, fill: "#701A75", opacity: 0.75 },
                      ];
                      const p = positions[activeTimelineIndex];
                      return (
                        <g transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}>
                          {/* Outer Sheen Envelope */}
                          <ellipse
                            cx={p.cx}
                            cy={p.cy}
                            rx={p.rx * 1.3}
                            ry={p.ry * 1.3}
                            fill="#06B6D4"
                            opacity="0.25"
                          />
                          {/* Main Plume Body */}
                          <ellipse
                            cx={p.cx}
                            cy={p.cy}
                            rx={p.rx}
                            ry={p.ry}
                            fill={p.fill}
                            opacity={p.opacity}
                          />
                          {/* Heavy Emulsion Core */}
                          <ellipse
                            cx={p.cx}
                            cy={p.cy}
                            rx={p.rx * 0.55}
                            ry={p.ry * 0.55}
                            fill="#7F1D1D"
                            opacity="0.95"
                          />
                          {/* Centroid Reticle */}
                          <circle cx={p.cx} cy={p.cy} r="2" fill="#FEF08A" />
                        </g>
                      );
                    })()}

                    {/* Origin Point Marker */}
                    <g transform="translate(60, 82)">
                      <circle cx="0" cy="0" r="3" fill="#F59E0B" opacity="0.9" />
                      <circle cx="0" cy="0" r="6" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" className="animate-ping" />
                      <text x="8" y="3" fill="#FDE68A" fontSize="7" fontFamily="monospace" fontWeight="bold">
                        ORIGIN (18.78°N, 72.51°E)
                      </text>
                    </g>
                  </svg>

                  {/* Top Tactical HUD Badges */}
                  <div className="relative z-10 flex items-center justify-between text-[9px] font-mono">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-sky-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>INCOIS CURRENT: 0.82 kts @ 068° &bull; WIND: 14.2 kts WSW</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                      activeTimelineIndex === 2
                        ? "bg-rose-950/80 border-rose-500/60 text-rose-300"
                        : activeTimelineIndex < 2
                        ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                        : "bg-sky-950/80 border-sky-500/60 text-sky-300"
                    }`}>
                      {activeTimelineIndex === 2
                        ? "SENTINEL-1A SAR TRUTH (T-0)"
                        : activeTimelineIndex < 2
                        ? `HINDCAST ORIGIN (${activeTimelineFrame.label})`
                        : `OPENDRIFT FORECAST (${activeTimelineFrame.label})`}
                    </div>
                  </div>

                  {/* Bottom Tactical Telemetry Bar */}
                  <div className="relative z-10 flex items-center justify-between text-[9px] font-mono bg-black/70 backdrop-blur-xs px-2 py-1 rounded border border-white/10 text-slate-300">
                    <div>
                      <span>SURFACE AREA: </span>
                      <strong className="text-amber-300 font-bold">{INCIDENT_DATA.timelineFrames[activeTimelineIndex].areaKm2} km²</strong>
                      <span className="text-slate-500 ml-1.5">| VOL: </span>
                      <strong className="text-slate-200">{Math.round(2260 * (1 - activeTimelineIndex * 0.045))} m³</strong>
                    </div>
                    <div>
                      <span>DIST TO COAST: </span>
                      <strong className={`${activeTimelineIndex > 4 ? "text-rose-400 font-bold" : "text-sky-300"}`}>
                        {[54.2, 38.6, 24.5, 18.2, 13.9, 9.4, 4.8][activeTimelineIndex]} NM
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Player Controls & Speed */}
              <div className="mt-3 pt-2.5 border-t border-[#E1EEF9] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                    className="w-7 h-7 rounded-full bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white flex items-center justify-center cursor-pointer shadow-2xs transition-all"
                  >
                    {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Simulation: OpenDrift v1.9 (Lagrangian)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-body text-slate-500">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="bg-white border border-[#E1EEF9] rounded text-[10px] font-mono text-slate-700 px-1.5 py-0.5"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PANEL 3: Spill DNA — Geometry & Fingerprint Analysis */}
            <div className="p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.12)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-50 text-[#6366F1] border border-indigo-200/60 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                    </div>
                    <h3 className="heading-section text-xs font-display font-semibold text-[#0B2545] uppercase tracking-wider">
                      Spill DNA &mdash; Geometry &amp; Fingerprint
                    </h3>
                  </div>
                  <button
                    onClick={() => triggerToast("Spill DNA: Heavy Arabian crude signature.")}
                    className="text-[11px] font-body font-semibold text-[#1E5FBF] hover:underline cursor-pointer"
                  >
                    View Details &rarr;
                  </button>
                </div>

                {/* 6 Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Area</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.area}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Perimeter</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.perimeter}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Length (major)</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.lengthMajor}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Width (minor)</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.widthMinor}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Orientation</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.orientation}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                    <div className="text-slate-500 text-[10px] font-body font-medium">Shape Index</div>
                    <div className="font-mono font-bold text-xs text-[#0B2545]">{INCIDENT_DATA.spillDNA.shapeIndex}</div>
                  </div>
                </div>

                {/* 3D Slick Model Area */}
                <div
                  className="mt-3 h-36 rounded-xl bg-[#061220] border border-[#172E4D] relative overflow-hidden flex items-center justify-center cursor-move select-none shadow-inner"
                  onMouseMove={(e) => {
                    if (e.buttons === 1) {
                      setModelPitch((p) => Math.max(0, Math.min(60, p + e.movementY * 0.5)));
                      setModelYaw((y) => y + e.movementX * 0.5);
                    }
                  }}
                  title="Click & Drag to rotate 3D slick geometry"
                >
                  {/* Mode 1: 3D View (SAR Radar vs 3D Terrain) */}
                  {dnaTab === "3D View" && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {dnaViewType === "SAR" ? (
                        <>
                          {/* Satellite SAR Radar Texture Underlay */}
                          <img
                            src="/sar-oil-spill-radar.jpg"
                            alt="Sentinel-1 SAR Radar Oil Slick"
                            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen pointer-events-none"
                          />

                          {/* Technical Calipers & Dimension Vectors */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 144">
                            {/* Radar Coordinate Reticle */}
                            <g stroke="#38BDF8" strokeWidth="0.6" opacity="0.4" strokeDasharray="3 3">
                              <line x1="170" y1="0" x2="170" y2="144" />
                              <line x1="0" y1="72" x2="340" y2="72" />
                              <circle cx="170" cy="72" r="45" fill="none" />
                              <circle cx="170" cy="72" r="65" fill="none" />
                            </g>

                            {/* Delineated Oil Slick Contours (Bonn Code 5 Core & Sheen) */}
                            <g transform="rotate(-24.6 170 72)">
                              {/* Outer Sheen Contour */}
                              <path
                                d="M100,72 Q110,48 140,42 Q180,38 215,48 Q245,58 240,74 Q235,92 205,98 Q165,102 125,94 Z"
                                fill="none"
                                stroke="#F59E0B"
                                strokeWidth="1.2"
                                opacity="0.8"
                              />
                              {/* Heavy Emulsion Core Contour */}
                              <path
                                d="M125,72 Q135,56 160,52 Q185,50 205,58 Q220,66 215,76 Q210,86 185,90 Q155,92 135,84 Z"
                                fill="url(#coreGradient)"
                                stroke="#EF4444"
                                strokeWidth="1.8"
                                opacity="0.9"
                              />

                              {/* Major Axis Caliper Vector (31.2 km) */}
                              <line x1="90" y1="72" x2="250" y2="72" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 1" />
                              <polygon points="90,72 95,69 95,75" fill="#38BDF8" />
                              <polygon points="250,72 245,69 245,75" fill="#38BDF8" />
                              <text x="170" y="65" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                                MAJOR: 31.2 km &bull; 24.6&deg;
                              </text>

                              {/* Minor Axis Caliper Vector (12.8 km) */}
                              <line x1="170" y1="36" x2="170" y2="108" stroke="#FBBF24" strokeWidth="0.8" strokeDasharray="2 1" />
                              <text x="178" y="104" fill="#FBBF24" fontSize="7" fontFamily="monospace">
                                MINOR: 12.8 km
                              </text>
                            </g>

                            <defs>
                              <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#DC2626" stopOpacity="0.85" />
                                <stop offset="50%" stopColor="#EA580C" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.9" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Tactical Radar HUD Callouts */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-[9px] font-mono text-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            <span>SAR C-BAND &bull; &sigma;&deg;: -24.8 dB</span>
                          </div>

                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-[9px] font-mono text-amber-300">
                            Bonn Code 5: Heavy Emulsion (&gt;200 &mu;m)
                          </div>
                        </>
                      ) : (
                        /* 3D Isometric Terrain Mesh */
                        <div
                          className="relative transition-transform duration-75 flex items-center justify-center w-full h-full"
                          style={{
                            transform: `perspective(240px) rotateX(${modelPitch}deg) rotateY(${modelYaw}deg)`,
                          }}
                        >
                          <svg viewBox="0 0 200 120" className="w-48 h-32 overflow-visible">
                            {/* Tier 1: Sheen Fringe Base */}
                            <ellipse
                              cx="100"
                              cy="60"
                              rx="80"
                              ry="36"
                              fill="#0E7490"
                              opacity="0.3"
                              transform="rotate(-20 100 60)"
                            />
                            {/* Tier 2: Viscous True Oil Body */}
                            <ellipse
                              cx="100"
                              cy="58"
                              rx="62"
                              ry="26"
                              fill="#EA580C"
                              opacity="0.75"
                              transform="rotate(-20 100 58)"
                            />
                            {/* Tier 3: Dense Emulsion Core */}
                            <ellipse
                              cx="100"
                              cy="55"
                              rx="42"
                              ry="18"
                              fill="#DC2626"
                              opacity="0.95"
                              transform="rotate(-20 100 55)"
                            />
                            {/* Core Highlight */}
                            <ellipse
                              cx="98"
                              cy="52"
                              rx="22"
                              ry="9"
                              fill="#FEF08A"
                              opacity="0.5"
                              transform="rotate(-20 98 52)"
                            />
                          </svg>

                          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
                            Pitch: {Math.round(modelPitch)}&deg; &bull; Yaw: {Math.round(modelYaw)}&deg;
                          </div>
                        </div>
                      )}

                      {/* Sub-Switch: SAR vs 3D Terrain */}
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-xs p-0.5 rounded-lg border border-white/10 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDnaViewType("SAR");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all ${
                            dnaViewType === "SAR"
                              ? "bg-[#1E5FBF] text-white font-bold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          SAR Radar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDnaViewType("3D");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all ${
                            dnaViewType === "3D"
                              ? "bg-[#1E5FBF] text-white font-bold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          3D Mesh
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Cross-section (High-res 3D Cutaway with Stratigraphy) */}
                  {dnaTab === "Cross-section" && (
                    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between p-2.5">
                      <img
                        src="/spill-dna-3d-cross-section.jpg"
                        alt="3D Spill Stratigraphy Cross-Section"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen pointer-events-none"
                      />
                      <div className="relative z-10 flex justify-between items-center text-[9px] font-mono bg-black/70 px-2 py-1 rounded border border-white/10">
                        <span className="text-sky-300 font-bold">BONN STRATIGRAPHY PROFILE</span>
                        <span className="text-amber-300">Core: 1.5mm &bull; Mean: 142 &mu;m</span>
                      </div>
                      <div className="relative z-10 grid grid-cols-3 gap-1 text-[8.5px] font-mono text-center">
                        <div className="bg-black/70 p-1 rounded border border-white/10 text-rose-300">
                          <strong>Emulsion Core</strong>
                          <div>1.5 mm (81% vol)</div>
                        </div>
                        <div className="bg-black/70 p-1 rounded border border-white/10 text-amber-300">
                          <strong>True Oil Sheen</strong>
                          <div>50&ndash;142 &mu;m</div>
                        </div>
                        <div className="bg-black/70 p-1 rounded border border-white/10 text-sky-300">
                          <strong>Pycnocline Depth</strong>
                          <div>12.5 m (Mixing)</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Thickness (est.) Breakdown */}
                  {dnaTab === "Thickness (est.)" && (
                    <div className="w-full h-full px-3 py-2 flex flex-col justify-between text-[9px] font-mono">
                      <div className="flex justify-between items-center text-slate-200 border-b border-white/10 pb-1">
                        <span className="text-amber-300 font-bold">BONN AGREEMENT VOLUMETRIC AUDIT</span>
                        <span className="text-rose-400 font-bold">Total: 2,260 m&sup3;</span>
                      </div>
                      <div className="space-y-1 my-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-rose-600 inline-block" />
                            Code 5 (Dark Emulsion &gt;200 &mu;m):
                          </span>
                          <span className="text-white font-bold">1,840 m&sup3; (81.4%) &bull; 27.6 km&sup2;</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                          <div className="bg-rose-600 h-full w-[81%]" />
                          <div className="bg-amber-500 h-full w-[12%]" />
                          <div className="bg-sky-400 h-full w-[7%]" />
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[8.5px]">
                          <span>Code 4 True Oil: 280 m&sup3; (12.4%)</span>
                          <span>Code 1-3 Sheen: 140 m&sup3; (6.2%)</span>
                        </div>
                      </div>
                      <div className="text-[8.5px] text-slate-400 bg-black/40 px-2 py-0.5 rounded">
                        Class: Heavy Crude Petroleum &bull; Viscosity: 480 cSt @ 28&deg;C
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Spectral Signature Graph */}
                  {dnaTab === "Spectral Signature" && (
                    <div className="w-full h-full p-2 flex flex-col justify-between text-[9px] font-mono">
                      <div className="flex justify-between items-center border-b border-white/10 pb-1 text-slate-200">
                        <span className="text-indigo-300 font-bold">RADAR BACKSCATTER (&sigma;&deg; ATTENUATION)</span>
                        <span className="text-sky-300">VV/VH Dual-Pol</span>
                      </div>
                      {/* SVG Spectral Attenuation Curve */}
                      <svg viewBox="0 0 280 60" className="w-full h-12">
                        <line x1="20" y1="50" x2="260" y2="50" stroke="#334155" strokeWidth="1" />
                        <line x1="20" y1="10" x2="20" y2="50" stroke="#334155" strokeWidth="1" />
                        {/* Clean Sea Level Reference */}
                        <line x1="20" y1="18" x2="260" y2="18" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
                        <text x="25" y="16" fill="#38BDF8" fontSize="6.5">Clean Sea (-16.2 dB)</text>
                        {/* Oil Damping Curve */}
                        <path
                          d="M20,18 Q80,18 110,44 Q140,52 170,44 Q200,18 260,18"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2"
                        />
                        <circle cx="140" cy="50" r="2.5" fill="#FEF08A" />
                        <text x="145" y="47" fill="#FEF08A" fontSize="7" fontWeight="bold">-24.8 dB (Trough)</text>
                      </svg>
                      <div className="text-[8.5px] text-slate-300 bg-black/50 px-2 py-0.5 rounded truncate">
                        Aliphatic C-H peak @ 3.42 &mu;m &bull; Mineral crude confirmed (Damping: -8.6 dB)
                      </div>
                    </div>
                  )}

                  {/* 3D Slick Model Popover */}
                  {show3DModelPopover && (
                    <div className="absolute inset-2 bg-[#0B1D35]/95 backdrop-blur-md rounded-xl p-2.5 text-white text-[10px] shadow-2xl flex flex-col justify-between z-20">
                      <div>
                        <div className="flex items-center justify-between pb-1 border-b border-slate-700/60 mb-1 font-bold text-slate-200">
                          <span className="font-display">3D Slick Intelligence</span>
                          <button onClick={() => setShow3DModelPopover(false)}>
                            <X className="w-3 h-3 text-slate-400 hover:text-white" />
                          </button>
                        </div>
                        <p className="text-[10px] font-body text-slate-300 leading-tight">
                          Copernicus Sentinel-1 SAR calibrated mask with Bonn Agreement thickness delineation. Toggle between SAR Radar Scan and 3D Mesh.
                        </p>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 space-y-0.5 border-t border-slate-700/50 pt-1">
                        <div>Sensor: Sentinel-1A C-Band SAR (IW Mode)</div>
                        <div>Segmentation: Deep U-Net v2.1 (IoU: 94.2%)</div>
                        <div>Last Ingest: 12 Sep 2026 17:00 UTC</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Tabs below the viewer */}
              <div className="mt-3 pt-2 border-t border-[#E1EEF9] grid grid-cols-4 gap-1">
                {(["3D View", "Cross-section", "Thickness (est.)", "Spectral Signature"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setDnaTab(tab);
                      setShow3DModelPopover(false);
                    }}
                    className={`py-1 text-[10px] font-body font-semibold rounded-lg transition-all cursor-pointer truncate px-1 ${
                      dnaTab === tab
                        ? tab === "Spectral Signature"
                          ? "bg-[#6366F1] text-white shadow-xs"
                          : "bg-[#0B2545] text-white shadow-xs"
                        : tab === "Spectral Signature"
                        ? "text-[#6366F1] hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100/60 border border-indigo-200/50"
                        : "text-slate-600 hover:text-slate-900 bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9]"
                    }`}
                    title={tab}
                  >
                    {tab.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 7. DASHBOARD FOOTER                                                     */}
          {/* ======================================================================= */}
          <footer className="pt-4 pb-2 border-t border-[#DCEEFC] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
            <div>
              &copy; 2026 SAHAYYA &nbsp;|&nbsp; Ministry of Defence, Government of India
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setFooterModalContent({
                    title: "Terms of Use",
                    body: "The Sahayya Marine Incident Command System is designated for authorized maritime security, port operations, and marine environmental defense personnel under the Government of India Ministry of Defence.",
                  })
                }
                className="hover:text-[#0B2545] cursor-pointer"
              >
                Terms of Use
              </button>
              <span>|</span>
              <button
                onClick={() =>
                  setFooterModalContent({
                    title: "Data Sources",
                    body: "Integrated Telemetry feeds include: European Space Agency Copernicus Sentinel-1 SAR constellation, Indian National Centre for Ocean Information Services (INCOIS) ocean currents, Directorate General of Lighthouses and Lightships Coastal AIS, and ECMWF 10m Marine Boundary Layer wind models.",
                  })
                }
                className="hover:text-[#0B2545] cursor-pointer"
              >
                Data Sources
              </button>
              <span>|</span>
              <button
                onClick={() =>
                  setFooterModalContent({
                    title: "Privacy & Compliance",
                    body: "All maritime position records, radar raw imagery, and attribution confidence algorithms conform strictly with national security guidelines and the Digital Personal Data Protection Act.",
                  })
                }
                className="hover:text-[#0B2545] cursor-pointer"
              >
                Privacy
              </button>
              <span>|</span>
              <button
                onClick={() =>
                  setFooterModalContent({
                    title: "Contact Incident Operations",
                    body: "Coast Guard Maritime Rescue Coordination Centre (MRCC) Mumbai 24/7 Hotline: +91 22 2431 6558 · Email: ops-center@sahayya.gov.in",
                  })
                }
                className="hover:text-[#0B2545] cursor-pointer"
              >
                Contact
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[#1E5FBF] font-bold">
              <Waves className="w-3.5 h-3.5" />
              <span>Safer Oceans. Stronger Tomorrow.</span>
            </div>
          </footer>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 8. MODALS & POPUPS                                                        */}
      {/* ========================================================================= */}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 px-4 py-2.5 rounded-2xl bg-[#0B2545] border border-[#1E5FBF]/30 text-white text-xs font-semibold shadow-[0_10px_30px_rgba(30,95,191,0.2)] z-50 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ADD NOTE MODAL */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#0B2545]">
                <FileText className="w-4 h-4 text-[#1E5FBF]" />
                <span>Incident Log &amp; Notes &mdash; {INCIDENT_DATA.name}</span>
              </div>
              <button onClick={() => setShowAddNoteModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {notes.map((n, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-700">
                  <span className="text-[10px] text-[#1E5FBF] font-mono font-bold block mb-0.5">Note #{i + 1}</span>
                  {n}
                </div>
              ))}
            </div>

            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Enter operational note (e.g., vessel communication logs, containment action)..."
              className="w-full p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF] focus:bg-white"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newNoteText.trim()) {
                    setNotes([...notes, newNoteText.trim()]);
                    setNewNoteText("");
                    triggerToast("New note added to incident log.");
                  }
                  setShowAddNoteModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-xs font-bold text-white shadow-sm"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEVERITY BREAKDOWN MODAL */}
      {showSeverityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Severity Score Breakdown (82 / 100)</span>
              </div>
              <button onClick={() => setShowSeverityModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3">
              {INCIDENT_DATA.statCards[5].breakdown?.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                  <div className="flex justify-between text-xs font-bold text-[#0B2545]">
                    <span>{item.name}</span>
                    <span className="font-mono text-rose-600">{item.score}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">{item.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowSeverityModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SAR IMAGE MODAL */}
      {showFullImageModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-3xl bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-4 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-xs font-bold text-[#0B2545]">
                Full-Resolution SAR Pass &mdash; {currentPass.label} ({currentPass.polarization})
              </div>
              <button onClick={() => setShowFullImageModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="w-full max-h-[70vh] rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img src="/sar-pass.jpg" alt="High Resolution SAR" className="w-full h-full object-contain" />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Centroid: {currentPass.centroid}</span>
              <span>Product ID: {currentPass.productId}</span>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE MODAL */}
      {showEvidenceModal && (
        <EvidenceGraphModal
          vessel={selectedCandidate || INCIDENT_DATA.vessels[0]}
          onClose={() => setShowEvidenceModal(false)}
          onExportEvidence={() => triggerToast("Evidence brief exported as legal affidavit.")}
        />
      )}

      {/* VESSEL TRACK MODAL */}
      {showVesselTrackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B2545]">
                <Navigation className="w-4 h-4 text-[#1E5FBF]" />
                <span>Historical AIS Track &mdash; MT PACIFIC VOYAGER</span>
              </div>
              <button onClick={() => setShowVesselTrackModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="h-44 rounded-xl bg-[#0B1D35] border border-slate-700 relative overflow-hidden flex items-center justify-center p-3">
              <svg className="w-full h-full" viewBox="0 0 400 150">
                <path d="M 30 120 Q 120 100, 200 60 T 370 30" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="200" cy="60" r="5" fill="#ef4444" className="animate-ping" />
                <circle cx="200" cy="60" r="4" fill="#ef4444" />
                <text x="210" y="55" fill="#ef4444" fontSize="9" fontWeight="bold">02:14 UTC (Dark Window Begins)</text>
                <circle cx="280" cy="45" r="4" fill="#10b981" />
                <text x="290" y="40" fill="#10b981" fontSize="9" fontWeight="bold">03:48 UTC (AIS Resumed)</text>
              </svg>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-1 font-mono">
              <div>Voyage Corridor: Ras Tanura &rarr; JNPT / Mumbai</div>
              <div>Last Fix: 18.89°N, 72.48°E (12 Sep 16:42 UTC)</div>
              <div>Flag State: Monrovia, Liberia</div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowVesselTrackModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MORE INFO VESSEL MODAL */}
      {showVesselInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-slate-500 shrink-0 inline mr-1" />
                <span>{selectedCandidate.name} Registry Information</span>
              </div>
              <button onClick={() => setShowVesselInfoModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">Vessel Type:</span>
                <span className="font-bold text-[#0B2545]">{selectedCandidate.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">IMO Number:</span>
                <span className="font-mono text-slate-800">{selectedCandidate.imo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">Flag State:</span>
                <span className="text-slate-800">{selectedCandidate.flag} [{selectedCandidate.flagCode}]</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">Current Speed:</span>
                <span className="font-mono text-rose-600 font-bold">{selectedCandidate.currentSpeed}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">Heading / Course:</span>
                <span className="font-mono text-slate-800">{selectedCandidate.course}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1EEF9]">
                <span className="text-slate-500 font-medium">Closest Approach (CPA):</span>
                <span className="font-mono text-slate-800">{selectedCandidate.cpa}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowVesselInfoModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL CANDIDATES MODAL */}
      {showAllCandidatesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545]">
                AIS Candidate Correlation Roster (4 Vessels In Window)
              </div>
              <button onClick={() => setShowAllCandidatesModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {INCIDENT_DATA.vessels.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#0B2545] flex items-center gap-1.5">
                      <span>#{v.rank} {v.name}</span>
                      <span className="text-[10px] font-mono bg-[#E1EEF9] text-slate-700 px-1 py-0.2 rounded font-semibold">{v.flagCode}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      IMO {v.imo} · {v.type} · CPA {v.cpa} · Gap {v.aisGap}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-black ${v.score > 80 ? "text-rose-600" : "text-slate-700"}`}>
                      {v.score} %
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setShowAllCandidatesModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE PLAN MODAL */}
      {showResponsePlanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Full Tactical Response Plan &mdash; Tier Z-03</span>
              </div>
              <button onClick={() => setShowResponsePlanModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                <div className="font-bold text-[#0B2545] text-sm">Primary Action Order</div>
                <p className="text-slate-600 mt-1">
                  {INCIDENT_DATA.responsePlan.recommendation}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#0B2545]">Staged Assets:</div>
                <div className="grid grid-cols-3 gap-2">
                  {INCIDENT_DATA.responsePlan.alternateAssets.map((asset, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-center">
                      <div className="font-bold text-[#0B2545] text-[11px]">{asset.name}</div>
                      <div className="text-[9px] text-slate-500">{asset.type}</div>
                      <div className="text-[10px] text-emerald-700 font-mono font-bold mt-1">ETA: {asset.eta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowResponsePlanModal(false);
                  triggerToast("Command Order Dispatched to ICGS Vikram Ops Room.");
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-xs font-bold text-white shadow-sm"
              >
                Authorize &amp; Dispatch Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER INFO MODAL */}
      {footerModalContent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_20px_50px_rgba(30,95,191,0.18)] p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545]">{footerModalContent.title}</div>
              <button onClick={() => setFooterModalContent(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{footerModalContent.body}</p>
            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end">
              <button
                onClick={() => setFooterModalContent(null)}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official 9-Page PDF Report Generation Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        incidentIdOrCode="IN-MH-2026"
        incidentTitle="Mumbai High Offshore Oil Slick"
      />
    </div>
  );
};

export default DashboardPage;
