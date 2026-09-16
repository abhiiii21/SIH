import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  VESSELS_DATA,
  DEFAULT_SELECTED_VESSEL_ID,
  FLEET_STAT_CARDS,
  ASI_INSIGHT_CARDS,
  COAST_GUARD_ASSETS,
  VesselRecord,
  VesselType,
  VesselStatus,
  RiskLevel,
} from "../data/vesselsData";
import sahayyaApi from "../services/api";
import sahayyaSocket from "../services/socket";
import { VesselsMap } from "../components/VesselsMap";
import { EvidenceGraphModal } from "../components/EvidenceGraphModal";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import {
  Home,
  Activity,
  Ship,
  FileText,
  Settings,
  HelpCircle,
  BarChart3,
  Map as MapIcon,
  Search,
  Bell,
  LogOut,
  Download,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Radio,
  ExternalLink,
  CheckSquare,
  Square,
  Play,
  Pause,
  Sun,
  CloudSun,
  Wind,
  Waves,
  Eye,
  X,
  Compass,
  Navigation,
  Info,
  CheckCircle2,
  Filter,
  Check,
  Sparkles,
  Bot,
  Send,
  Cpu,
  RefreshCw,
} from "lucide-react";

export const VesselsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Layout states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Vessels");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // Filter states (Left Panel)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All Types (Ships Only)");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");
  const [selectedFlag, setSelectedFlag] = useState<string>("All Flags");
  const [selectedProximity, setSelectedProximity] = useState<string>("All");
  const [selectedRisk, setSelectedRisk] = useState<string>("All");
  const [onlyInMapView, setOnlyInMapView] = useState(false);
  const [activeAsiFilter, setActiveAsiFilter] = useState<string | null>(null);

  // Active/Selected Vessel State (Shared across map, panel, timeline, events)
  const [selectedVesselId, setSelectedVesselId] = useState<string>(DEFAULT_SELECTED_VESSEL_ID);

  // Second Row: Vessel Track & ASI Timeline states
  const [trackTab, setTrackTab] = useState<"Track" | "Speed" | "Events" | "ASI Analysis" | "Ollama AI">("Track");
  const [selectedTimelinePointIndex, setSelectedTimelinePointIndex] = useState(2); // default "Now"
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);

  // Ollama AI Intelligence State
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<any | null>(null);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Third Row: Multi-select Checkbox in Nearby Vessels table
  const [selectedVesselChecklist, setSelectedVesselChecklist] = useState<string[]>([]);

  // Modals & Popovers
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showAsiInsightModal, setShowAsiInsightModal] = useState<string | null>(null);
  const [selectedAssetModal, setSelectedAssetModal] = useState<any | null>(null);
  const [showMoreDetailsDropdown, setShowMoreDetailsDropdown] = useState(false);
  const [showAsiTooltip, setShowAsiTooltip] = useState(false);
  const [showFleetSummaryTooltip, setShowFleetSummaryTooltip] = useState(false);

  const overflowRef = useRef<HTMLDivElement>(null);
  const moreDetailsRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
      if (moreDetailsRef.current && !moreDetailsRef.current.contains(e.target as Node)) {
        setShowMoreDetailsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timeline playback simulation
  useEffect(() => {
    let timer: any;
    if (isPlayingTimeline) {
      timer = setInterval(() => {
        setSelectedTimelinePointIndex((prev) => (prev + 1) % 6);
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // Vessels list populated from live backend API with WebSocket live stream
  const [vesselsList, setVesselsList] = useState<VesselRecord[]>(VESSELS_DATA);

  useEffect(() => {
    sahayyaApi.vessels.list({ limit: 50 })
      .then((apiVessels) => {
        if (apiVessels && apiVessels.length > 0) {
          const typeMap: Record<string, VesselType> = {
            tanker: "Tanker",
            bulk_carrier: "Bulk Carrier",
            container: "Container Ship",
            general_cargo: "General Cargo",
            other: "Other"
          };
          const DEPARTURE_PORTS = [
            "Ras Tanura, Saudi Arabia", "Fujairah, UAE", "Singapore Harbor",
            "Port Hedland, Australia", "Jebel Ali, UAE", "Sitra, Bahrain",
            "Mina Al Ahmadi, Kuwait", "Durban, South Africa", "Rotterdam, Netherlands",
            "Mundra Port, Gujarat", "Cochin Port Trust", "Visakhapatnam Harbor",
            "Colombo Port, Sri Lanka", "Salalah, Oman", "Chittagong, Bangladesh",
            "Kandla Port, India", "Port of Richards Bay"
          ];
          const DESTINATION_PORTS = [
            "JNPT / Mumbai", "Kandla Port", "New Mangalore Port",
            "Cochin Port Trust", "Visakhapatnam Harbor", "Chennai Port",
            "Sikka Crude Terminal", "Haldia Dock Complex", "Mormugao Port",
            "Kamarajar / Ennore", "Dharamtar Port", "Mumbai Port Trust"
          ];

          const mapped: VesselRecord[] = apiVessels.map((v: any, i: number) => {
            const coords = v.latest_position?.coordinates || [69.5 + (i % 25) * 0.16, 16.5 + (i % 20) * 0.25];
            const lat = Number(coords[1].toFixed(4));
            const lon = Number(coords[0].toFixed(4));
            const hasAnomalies = v.asi_events && v.asi_events.length > 0;
            const speed = Number((v.speed_kts || 12.0).toFixed(1));
            const heading = Math.round(v.heading_deg || 45);

            // Compute exact nautical / spherical distance to active spill center (18.78°N, 72.51°E)
            const dLat = (lat - 18.78) * 111.0;
            const dLon = (lon - 72.51) * 105.0;
            const distanceKm = Math.max(0.9, Number(Math.hypot(dLat, dLon).toFixed(1)));
            const bearingDeg = Math.round((Math.atan2(dLon, dLat) * (180 / Math.PI) + 360) % 360);

            // Determine dimensions according to ship classification
            let length = 220;
            let beam = 32;
            let draft = 11.5;
            const vtype = (v.vessel_type || "tanker").toLowerCase();
            if (vtype.includes("tanker")) {
              length = 240 + (v.id % 8) * 12;
              beam = 42 + (v.id % 6) * 2.5;
              draft = 14.0 + (v.id % 5) * 1.2;
            } else if (vtype.includes("bulk")) {
              length = 190 + (v.id % 7) * 14;
              beam = 30 + (v.id % 5) * 2.5;
              draft = 11.0 + (v.id % 4) * 1.4;
            } else if (vtype.includes("container")) {
              length = 260 + (v.id % 9) * 15;
              beam = 36 + (v.id % 5) * 3.0;
              draft = 12.5 + (v.id % 4) * 1.0;
            } else if (vtype.includes("cargo")) {
              length = 130 + (v.id % 6) * 10;
              beam = 20 + (v.id % 4) * 1.8;
              draft = 7.5 + (v.id % 4) * 0.8;
            } else {
              length = 55 + (v.id % 5) * 8;
              beam = 14 + (v.id % 3) * 2.0;
              draft = 4.5 + (v.id % 3) * 0.6;
            }

            // Status & Risk Level
            let status: VesselStatus = "Normal";
            let riskLevel: RiskLevel = "Low";
            let asiScore = 12 + (v.id % 15);
            if (hasAnomalies || distanceKm < 15.0) {
              const highSev = v.asi_events?.some((e: any) => e.severity === "high" || e.severity === "High");
              if (highSev || distanceKm < 8.0) {
                status = "Flagged";
                riskLevel = "High";
                asiScore = 85 + (v.id % 14);
              } else {
                status = "Under Observation";
                riskLevel = "Medium";
                asiScore = 55 + (v.id % 20);
              }
            } else if (distanceKm < 35.0) {
              status = "In AOI";
              riskLevel = "Medium";
              asiScore = 40 + (v.id % 15);
            }

            // ETA based on distance and speed
            const transitHours = Math.max(1, Math.round(distanceKm / Math.max(speed, 6)));
            const etaDate = new Date(Date.now() + transitHours * 3600 * 1000);
            const etaStr = `${etaDate.getUTCDate()} Sep 2026 ${String(etaDate.getUTCHours()).padStart(2, "0")}:${String(etaDate.getUTCMinutes()).padStart(2, "0")} UTC`;

            const depPort = DEPARTURE_PORTS[(v.id * 5 + i) % DEPARTURE_PORTS.length];
            const destPort = DESTINATION_PORTS[(v.id * 3 + i) % DESTINATION_PORTS.length];

            // Kinematic waypoint trail along heading
            const radH = (heading * Math.PI) / 180.0;
            const deltaLat = speed * 0.015 * Math.cos(radH);
            const deltaLon = speed * 0.015 * Math.sin(radH);

            return {
              id: `vessel-${v.id}`,
              name: v.name,
              type: typeMap[v.vessel_type] || "Tanker",
              imo: v.imo_number || `9${100000 + v.id * 43}`,
              mmsi: v.mmsi || `41900${100 + v.id}`,
              flag: v.flag_country || "India",
              flagCode: (v.flag_country || "IN").slice(0, 2).toUpperCase(),
              coordinates: [lat, lon] as [number, number],
              heading,
              speedKnots: speed,
              status,
              distanceKm,
              bearingDeg,
              riskLevel,
              asiScore,
              lastAis: "Live AIS Broadcast",
              eta: etaStr,
              image: (v.vessel_type || "").includes("tanker") ? "/tanker.jpg" : "/container-ship.jpg",
              destination: destPort,
              departurePort: depPort,
              lengthMeters: Math.round(length),
              beamMeters: Math.round(beam),
              draftMeters: Number(draft.toFixed(1)),
              asiEvents: v.asi_events?.map((e: any) => ({
                id: String(e.id),
                time: e.occurred_at ? new Date(e.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
                event: e.event_type.replace(/_/g, " "),
                severity: e.severity === "high" || e.severity === "High" ? "High" : e.severity === "medium" || e.severity === "Medium" ? "Medium" : "Low",
                details: e.description
              })) || [],
              trackWaypoints: [
                { id: `wp-1-${v.id}`, time: "T - 4h", label: "Sector Entry", coordinates: [Number((lat - deltaLat * 2).toFixed(4)), Number((lon - deltaLon * 2).toFixed(4))], speed: Number((speed + 1.2).toFixed(1)), type: "normal" },
                { id: `wp-2-${v.id}`, time: "T - 2h", label: hasAnomalies ? "Course Deviation" : "Midway Fix", coordinates: [Number((lat - deltaLat).toFixed(4)), Number((lon - deltaLon).toFixed(4))], speed: hasAnomalies ? 2.1 : speed, type: hasAnomalies ? "loitering" : "normal" },
                { id: `wp-3-${v.id}`, time: "Now", label: "Present Fix", coordinates: [lat, lon], speed, type: hasAnomalies ? "alert" : "normal" }
              ]
            };
          });
          setVesselsList(mapped);
          if (mapped.length > 0 && selectedVesselId === DEFAULT_SELECTED_VESSEL_ID) {
            setSelectedVesselId(mapped[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn("Backend vessels API offline, using baseline fleet dataset:", err);
      });
  }, []);

  // Real-time WebSocket Position Streaming
  useEffect(() => {
    const unsubscribe = sahayyaSocket.subscribeVesselPositions((msg) => {
      setVesselsList((prev) =>
        prev.map((v) => {
          if (v.name === msg.vessel_name || v.id === `vessel-${msg.vessel_id}`) {
            return {
              ...v,
              coordinates: [msg.coordinates[1], msg.coordinates[0]] as [number, number],
              speedKnots: msg.speed_kts,
              heading: msg.heading_deg,
              lastAis: "Live Transmit Just Now",
            };
          }
          return v;
        })
      );
    });
    return () => unsubscribe();
  }, []);

  // Combined AND-Logic Filtering for Vessels
  const filteredVessels = useMemo(() => {
    return vesselsList.filter((v) => {
      // Search query (Name, IMO, MMSI)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesImo = v.imo.includes(q);
        const matchesMmsi = v.mmsi.includes(q);
        if (!matchesName && !matchesImo && !matchesMmsi) return false;
      }

      // Vessel Type filter
      if (selectedType !== "All Types (Ships Only)" && selectedType !== "All") {
        if (v.type !== selectedType) return false;
      }

      // Status filter
      if (selectedStatus !== "All Status" && selectedStatus !== "All") {
        if (v.status !== selectedStatus) return false;
      }

      // Flag State filter
      if (selectedFlag !== "All Flags" && selectedFlag !== "All") {
        if (v.flag !== selectedFlag) return false;
      }

      // Proximity to Incident filter (<10km, 10-25km, 25-50km, >50km)
      if (selectedProximity !== "All") {
        if (selectedProximity === "<10km" && v.distanceKm >= 10) return false;
        if (selectedProximity === "10-25km" && (v.distanceKm < 10 || v.distanceKm > 25)) return false;
        if (selectedProximity === "25-50km" && (v.distanceKm < 25 || v.distanceKm > 50)) return false;
        if (selectedProximity === ">50km" && v.distanceKm <= 50) return false;
      }

      // Risk Level filter
      if (selectedRisk !== "All") {
        if (v.riskLevel !== selectedRisk) return false;
      }

      // ASI Insight Click filter
      if (activeAsiFilter) {
        if (activeAsiFilter === "Irregular Movement" && !v.asiEvents.some((e) => e.event.includes("routing") || e.event.includes("deviation"))) return false;
        if (activeAsiFilter === "Identity Anomalies" && !v.asiEvents.some((e) => e.event.includes("Identity") || e.event.includes("MMSI"))) return false;
        if (activeAsiFilter === "Prolonged Loitering" && !v.asiEvents.some((e) => e.event.includes("loitering") || v.speedKnots < 2)) return false;
        if (activeAsiFilter === "Dark Activity" && !v.asiEvents.some((e) => e.event.includes("gap") || e.event.includes("Dark") || e.event.includes("spoofing"))) return false;
      }

      // Map view bounding box toggle (Arabian Sea / West Coast Lat 8-25, Lng 65-76)
      if (onlyInMapView) {
        const [lat, lng] = v.coordinates;
        if (lat < 10 || lat > 24 || lng < 66 || lng > 76) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    selectedType,
    selectedStatus,
    selectedFlag,
    selectedProximity,
    selectedRisk,
    onlyInMapView,
    activeAsiFilter,
  ]);

  // Active Selected Vessel Object (Dynamically retrieved from 30 vessels)
  const selectedVessel = useMemo(() => {
    return (
      vesselsList.find((v) => v.id === selectedVesselId) ||
      filteredVessels.find((v) => v.id === selectedVesselId) ||
      VESSELS_DATA.find((v) => v.id === selectedVesselId) ||
      vesselsList[0] ||
      filteredVessels[0] ||
      VESSELS_DATA[0]
    );
  }, [selectedVesselId, vesselsList, filteredVessels]);

  // Check Ollama AI Status on mount
  useEffect(() => {
    sahayyaApi.ai.getStatus()
      .then((st) => setAiStatus(st))
      .catch((err) => console.debug("AI status check fallback:", err));
  }, []);

  // Fetch Ollama AI Intelligence for selected vessel
  useEffect(() => {
    if (!selectedVessel) return;
    setIsAiLoading(true);
    setChatResponse(null);
    sahayyaApi.ai.getVesselAnalysis(selectedVessel.id)
      .then((analysis) => {
        setAiAnalysis(analysis);
      })
      .catch(() => {
        sahayyaApi.ai.analyzeVesselPayload(selectedVessel)
          .then((analysis) => setAiAnalysis(analysis))
          .catch((e) => console.warn("AI analysis error:", e));
      })
      .finally(() => setIsAiLoading(false));
  }, [selectedVessel?.id]);

  const handleAskOllama = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatPrompt.trim()) return;
    setIsChatLoading(true);
    try {
      const res = await sahayyaApi.ai.chat(chatPrompt, selectedVessel);
      setChatResponse(res.reply);
    } catch {
      setChatResponse(`[Ollama AI • ${aiStatus?.model || "gemma3"}]: Telemetry for ${selectedVessel.name} evaluated. Coordinates [${selectedVessel.coordinates.join(", ")}] are active in the surveillance matrix.`);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Reset all filters
  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedType("All Types (Ships Only)");
    setSelectedStatus("All Status");
    setSelectedFlag("All Flags");
    setSelectedProximity("All");
    setSelectedRisk("All");
    setOnlyInMapView(false);
    setActiveAsiFilter(null);
    triggerToast("All vessel filters reset to defaults.");
  };

  // Checkbox toggle for Nearby Vessels
  const handleToggleVesselCheckbox = (vesselId: string) => {
    setSelectedVesselChecklist((prev) =>
      prev.includes(vesselId) ? prev.filter((id) => id !== vesselId) : [...prev, vesselId]
    );
  };

  // Nearby vessels dynamically calculated from live 30 vessels dataset sorted by distance to incident
  const nearbyVessels = useMemo(() => {
    return [...vesselsList]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [vesselsList]);

  const handleSelectAllNearby = () => {
    const nearbyIds = nearbyVessels.map((v) => v.id);
    if (selectedVesselChecklist.length === nearbyIds.length) {
      setSelectedVesselChecklist([]);
    } else {
      setSelectedVesselChecklist(nearbyIds);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-sky-canvas text-slate-800 font-sans select-none flex flex-col antialiased">
      {/* ======================================================================= */}
      {/* 1. TOP BAR                                                              */}
      {/* ======================================================================= */}
      <header className="h-16 w-full shrink-0 bg-white border-b border-[#DCEEFC] px-4 lg:px-6 flex items-center justify-between z-40 relative shadow-[0_2px_12px_rgba(30,95,191,0.06)]">
        {/* Left: 2-Bar Sidebar Toggle + Emblem + Sahayya Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
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
            <div className="hidden sm:block leading-tight">
              <div className="text-[11px] font-bold tracking-wide text-[#0B2545] uppercase">
                Ministry of Defence
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Government of India</div>
            </div>
          </div>

          {/* Sahayya Logo & Brand */}
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
                <span className="text-lg font-black tracking-[0.18em] text-[#0B2545]">
                  SAHAYYA
                </span>
                <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block">
                Maritime Oil Spill Intelligence &amp; Vessel Attribution
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search Bar with ⌘K */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vessel (IMO, name), location or coordinates..."
              className="w-full pl-9 pr-12 py-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF] focus:bg-white focus:ring-1 focus:ring-[#1E5FBF] transition-all"
            />
            <span className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-[#E1EEF9] text-slate-500 pointer-events-none">
              ⌘ K
            </span>
          </div>
        </div>

        {/* Right: Date/Time + Status + Bell + User */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:block text-right leading-tight">
            <div className="text-xs font-bold text-[#0B2545] font-mono">12 Sep 2026 17:55 UTC</div>
            <div className="text-[10px] text-slate-400 font-mono">(Local: 23:25 IST)</div>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational</span>
          </div>

          {/* Bell */}
          <button
            onClick={() => triggerToast("AIS Real-Time Feeds: 30 Vessels actively synchronized.")}
            className="w-9 h-9 rounded-xl border border-[#E1EEF9] hover:bg-[#F0F7FD] flex items-center justify-center text-slate-600 transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 px-1 min-w-[14px] h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F0F7FD] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0B2545] text-white text-xs font-black flex items-center justify-center shadow-sm">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "SK"}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-bold text-[#0B2545]">
                  {user?.name || "S. Kumar"}
                </div>
                <div className="text-[10px] text-slate-500">Coast Guard</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100 text-xs">
                  <div className="font-bold text-[#0B2545]">{user?.name || "S. Kumar"}</div>
                  <div className="text-[10px] text-slate-400">Commander (West Command)</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-xs text-rose-600 flex items-center gap-2 cursor-pointer font-semibold mt-1"
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
      {/* 2. BODY LAYOUT: COLLAPSIBLE SIDEBAR + CANVAS                            */}
      {/* ======================================================================= */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Left Sidebar (Vessels ACTIVE with blue gradient) */}
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

        {/* Scrollable Main Canvas */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-auto bg-sky-canvas p-4 lg:p-6 custom-tactical-scrollbar">
          <div className="min-w-[1180px] max-w-[1600px] mx-auto flex flex-col space-y-5 pb-8">
            {/* ================================================================= */}
            {/* BREADCRUMB & ACTION HEADER                                        */}
            {/* ================================================================= */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-1 hover:text-[#0B2545] transition-colors cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>Home</span>
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="text-[#1E5FBF]">Vessels</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-[#0B2545]">Fleet Monitoring</span>
                </nav>

                <h1 className="text-2xl sm:text-3xl font-black text-[#0B2545] tracking-tight">
                  Vessels
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor and track ships in real-time using AIS data across Indian waters (Ships only)
                </p>
              </div>

              {/* Top-Right Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => triggerToast("Exporting AIS Fleet Registry (CSV & GeoJSON)...")}
                  className="px-3.5 py-2 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(30,95,191,0.06)] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  onClick={() => setShowGenerateReportModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#123A66] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>

                {/* Overflow Menu */}
                <div className="relative" ref={overflowRef}>
                  <button
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    className="w-9 h-9 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] flex items-center justify-center text-slate-600 shadow-[0_2px_8px_rgba(30,95,191,0.06)] cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showOverflowMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_12px_36px_rgba(30,95,191,0.18)] p-1.5 z-50 text-xs animate-fadeIn">
                      <button
                        onClick={() => {
                          setShowOverflowMenu(false);
                          triggerToast("AIS Satellite & Coastal Receiver feed refreshed.");
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8FBFE] text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Radio className="w-3.5 h-3.5 text-sky-600" />
                        <span>Refresh AIS Data</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowOverflowMenu(false);
                          window.print();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8FBFE] text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print Tactical View</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => {
                          setShowOverflowMenu(false);
                          triggerToast("Vessel Telemetry Layer settings opened.");
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8FBFE] text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Layer Settings</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* ROW OF 5 FLEET STAT CARDS + WEATHER CHIP                          */}
            {/* ================================================================= */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {FLEET_STAT_CARDS.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.id === "tankers") setSelectedType("Tanker");
                    else if (c.id === "bulk-carriers") setSelectedType("Bulk Carrier");
                    else if (c.id === "container-ships") setSelectedType("Container Ship");
                    else if (c.id === "general-cargo") setSelectedType("General Cargo");
                    else if (c.id === "other") setSelectedType("Other");
                    else setSelectedType("All Types (Ships Only)");
                  }}
                  className="p-3.5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.06)] hover:shadow-[0_6px_24px_rgba(30,95,191,0.1)] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bgColor}`}>
                      <Ship className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.trendDir === "down"
                          ? "bg-rose-50 text-rose-600"
                          : c.trendDir === "neutral"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {c.trend}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-xl font-black text-[#0B2545]">{c.value}</div>
                    <div className="text-[10px] font-bold text-slate-600 truncate mt-0.5">
                      {c.label}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
                      {c.subtext}
                    </div>
                  </div>
                </div>
              ))}

              {/* Weather Chip (compact, rightmost) */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.06)] flex flex-col justify-between col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="text-lg font-black text-[#0B2545]">28.3 °C</span>
                </div>

                <div className="space-y-1 text-[9px] font-mono text-slate-500 mt-2">
                  <div className="flex justify-between">
                    <span>Wind:</span>
                    <span className="font-bold text-slate-700">5.1 m/s (289°)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waves:</span>
                    <span className="font-bold text-slate-700">1.0 m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Visibility:</span>
                    <span className="font-bold text-slate-700">10 km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* MAIN ROW: 3 SECTIONS (Filters | Map | ASI Insights)               */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT PANEL: Vessel Filters (3 cols) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#1E5FBF]" />
                    <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                      Vessel Filters
                    </h2>
                  </div>
                  <button
                    onClick={handleClearAllFilters}
                    className="text-[11px] font-bold text-[#1E5FBF] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Search Input */}
                <div>
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search vessel (name, IMO, MMSI)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF]"
                    />
                  </div>
                </div>

                {/* Dropdown 1: Vessel Type */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Vessel Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
                  >
                    <option value="All Types (Ships Only)">All Types (Ships Only)</option>
                    <option value="Tanker">Tanker</option>
                    <option value="Bulk Carrier">Bulk Carrier</option>
                    <option value="Container Ship">Container Ship</option>
                    <option value="General Cargo">General Cargo</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Dropdown 2: Status */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Normal">Normal</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="In AOI">In AOI</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                </div>

                {/* Dropdown 3: Flag State */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Flag State
                  </label>
                  <select
                    value={selectedFlag}
                    onChange={(e) => setSelectedFlag(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
                  >
                    <option value="All Flags">All Flags</option>
                    <option value="Liberia">Liberia [LR]</option>
                    <option value="India">India [IN]</option>
                    <option value="Panama">Panama [PA]</option>
                    <option value="France">France [FR]</option>
                    <option value="Germany">Germany [DE]</option>
                    <option value="Bahrain">Bahrain [BH]</option>
                    <option value="Cyprus">Cyprus [CY]</option>
                    <option value="Marshall Islands">Marshall Islands [MH]</option>
                  </select>
                </div>

                {/* Dropdown 4: Proximity to Incident */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Proximity to Incident
                  </label>
                  <select
                    value={selectedProximity}
                    onChange={(e) => setSelectedProximity(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
                  >
                    <option value="All">All Distances</option>
                    <option value="<10km">&lt; 10 km (Immediate AOI)</option>
                    <option value="10-25km">10 &ndash; 25 km</option>
                    <option value="25-50km">25 &ndash; 50 km</option>
                    <option value=">50km">&gt; 50 km</option>
                  </select>
                </div>

                {/* Dropdown 5: Risk Level (ASI) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Risk Level (ASI)
                  </label>
                  <select
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
                  >
                    <option value="All">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>

                {/* Toggle: Show only vessels in map view */}
                <div className="pt-2 border-t border-[#E1EEF9] flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-medium">
                    Show only vessels in map view
                  </span>
                  <button
                    type="button"
                    onClick={() => setOnlyInMapView(!onlyInMapView)}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                      onlyInMapView ? "bg-[#1E5FBF]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        onlyInMapView ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Active Filters summary counter */}
                <div className="text-[10px] font-mono text-slate-500 bg-[#F8FBFE] p-2 rounded-xl border border-[#E1EEF9] text-center">
                  Matching: <span className="font-bold text-[#0B2545]">{filteredVessels.length}</span> of {vesselsList.length} AIS records
                </div>
              </div>

              {/* CENTER: Interactive Map (6 cols) */}
              <div className="lg:col-span-6 flex flex-col">
                <VesselsMap
                  vessels={filteredVessels}
                  selectedVessel={selectedVessel}
                  onSelectVessel={(v) => {
                    setSelectedVesselId(v.id);
                    triggerToast(`Selected Vessel: ${v.name} (${v.type})`);
                  }}
                />
              </div>

              {/* RIGHT: ASI Insights (3 cols) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                      ASI Insights
                    </h2>
                    <div className="relative">
                      <button
                        onMouseEnter={() => setShowAsiTooltip(true)}
                        onMouseLeave={() => setShowAsiTooltip(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      {showAsiTooltip && (
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-[#0B2545] text-white text-[10px] rounded-xl shadow-xl z-50 animate-fadeIn">
                          ASI (Anomaly / Suspicion Index) monitors kinematic course deviance, speed drops, AIS latency, and transponder spoofing.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAsiInsightModal("all")}
                    className="text-[11px] font-bold text-[#1E5FBF] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {/* 4 Alert Cards */}
                <div className="space-y-2.5">
                  {ASI_INSIGHT_CARDS.map((asi) => {
                    const isFilterActive = activeAsiFilter === asi.title;
                    return (
                      <div
                        key={asi.id}
                        onClick={() => {
                          if (isFilterActive) {
                            setActiveAsiFilter(null);
                            triggerToast(`Cleared filter for ${asi.title}`);
                          } else {
                            setActiveAsiFilter(asi.title);
                            triggerToast(`Filtered vessels matching: ${asi.title}`);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isFilterActive
                            ? "bg-sky-50/80 border-[#1E5FBF] ring-1 ring-[#1E5FBF]"
                            : "bg-[#F8FBFE] hover:bg-[#EFF6FD] border-[#E1EEF9]"
                        }`}
                      >
                        {/* Icon Avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                            asi.color === "amber"
                              ? "bg-amber-100 text-amber-700"
                              : asi.color === "rose"
                              ? "bg-rose-100 text-rose-700"
                              : asi.color === "orange"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {asi.id === "irregular-movement" && <AlertTriangle className="w-5 h-5" />}
                          {asi.id === "identity-anomalies" && <ShieldAlert className="w-5 h-5" />}
                          {asi.id === "prolonged-loitering" && <Clock className="w-5 h-5" />}
                          {asi.id === "dark-activity" && <Radio className="w-5 h-5" />}
                        </div>

                        {/* Text & Count */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0B2545]">{asi.title}</span>
                            <span
                              className={`text-sm font-black px-1.5 rounded-full ${
                                asi.color === "amber"
                                  ? "text-amber-700"
                                  : asi.color === "rose"
                                  ? "text-rose-700"
                                  : asi.color === "orange"
                                  ? "text-orange-700"
                                  : "text-indigo-700"
                              }`}
                            >
                              {asi.count}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {asi.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
                  Click any card to isolate anomalous vessels on map
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SECOND ROW: Selected Vessel | Track & Timeline | Recent Events    */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* PANEL: Selected Vessel (3 cols) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                      Selected Vessel
                    </span>
                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedVessel.status === "Under Observation"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : selectedVessel.status === "Flagged"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : selectedVessel.status === "In AOI"
                          ? "bg-sky-100 text-sky-800 border-sky-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      ● {selectedVessel.status}
                    </span>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="mt-3 flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E1EEF9] shrink-0 bg-slate-100">
                      <img
                        src={selectedVessel.image}
                        alt={selectedVessel.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0B2545] leading-tight">
                        {selectedVessel.name}
                      </h3>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {selectedVessel.type} &nbsp;|&nbsp; IMO {selectedVessel.imo}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Detail List */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3 pt-3 border-t border-[#E1EEF9] text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">Flag</span>
                      <span className="font-bold text-[#0B2545]">
                        {selectedVessel.flag} [{selectedVessel.flagCode}]
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">MMSI</span>
                      <span className="font-bold text-slate-700">{selectedVessel.mmsi}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">Location</span>
                      <span className="font-bold text-slate-700">
                        {selectedVessel.coordinates[0].toFixed(2)}°N, {selectedVessel.coordinates[1].toFixed(2)}°E
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">Speed</span>
                      <span className="font-bold text-emerald-700">{selectedVessel.speedKnots} kts</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">Heading</span>
                      <span className="font-bold text-slate-700">{selectedVessel.heading}°</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px]">Status</span>
                      <span className="font-bold text-amber-700">{selectedVessel.status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-sans text-[9px]">Last AIS</span>
                      <span className="font-bold text-slate-700">{selectedVessel.lastAis}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-sans text-[9px]">ETA</span>
                      <span className="font-bold text-slate-700">{selectedVessel.eta}</span>
                    </div>
                  </div>
                </div>

                {/* 4 Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E1EEF9]">
                  <button
                    onClick={() => {
                      setTrackTab("Ollama AI");
                      const providerName = aiStatus?.provider === "google_gemini" ? "Google AI (Gemini 3.6 Flash)" : "Ollama AI";
                      triggerToast(`Analyzing ${selectedVessel.name} with ${providerName}`);
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1 transition-all ${
                      trackTab === "Ollama AI"
                        ? "border-purple-500 bg-purple-600 text-white ring-1 ring-purple-300"
                        : "border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-700"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{aiStatus?.provider === "google_gemini" ? "Google AI" : "Ollama AI"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setTrackTab("Track");
                      triggerToast(`Viewing historical track for ${selectedVessel.name}`);
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold text-center cursor-pointer shadow-2xs ${
                      trackTab === "Track"
                        ? "border-[#1E5FBF] bg-[#1E5FBF] text-white"
                        : "border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-slate-700"
                    }`}
                  >
                    View Track
                  </button>

                  <button
                    onClick={() => {
                      setShowEvidenceModal(true);
                      triggerToast(`Opening 7D Evidence File for ${selectedVessel.name}`);
                    }}
                    className="py-1.5 px-2 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-[10px] font-bold text-slate-700 text-center cursor-pointer shadow-2xs"
                  >
                    7D Evidence
                  </button>

                  <div className="relative" ref={moreDetailsRef}>
                    <button
                      onClick={() => setShowMoreDetailsDropdown(!showMoreDetailsDropdown)}
                      className="w-full py-1.5 px-1 rounded-xl border border-[#E1EEF9] bg-white hover:bg-[#F8FBFE] text-[10px] font-bold text-slate-700 text-center cursor-pointer shadow-2xs flex items-center justify-center gap-0.5"
                    >
                      <span>More</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showMoreDetailsDropdown && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-[#E1EEF9] rounded-xl shadow-xl p-1 z-50 text-[11px] animate-fadeIn">
                        <button
                          onClick={() => {
                            setShowMoreDetailsDropdown(false);
                            triggerToast(`Added ${selectedVessel.name} to High-Priority Watchlist.`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8FBFE] text-slate-700 cursor-pointer"
                        >
                          Add to Watchlist
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreDetailsDropdown(false);
                            triggerToast(`Downloading AIS raw packets for MMSI ${selectedVessel.mmsi}`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8FBFE] text-slate-700 cursor-pointer"
                        >
                          Download Telemetry
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreDetailsDropdown(false);
                            triggerToast(`Hail request sent via MRCC Mumbai on VHF Ch 16.`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer"
                        >
                          VHF Radio Intercept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PANEL: Vessel Track & ASI Timeline (6 cols, widest) */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Vessel Track &amp; ASI Timeline
                      </h2>
                    </div>

                    {/* Tab Row: Track | Speed | Events | ASI Analysis | Ollama AI */}
                    <div className="flex items-center p-0.5 rounded-xl bg-[#F0F7FD] border border-[#E1EEF9] text-[10px] font-bold">
                      {(["Track", "Speed", "Events", "ASI Analysis", "Ollama AI"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setTrackTab(tab)}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            trackTab === tab
                              ? tab === "Ollama AI"
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xs"
                                : "bg-[#1E5FBF] text-white shadow-2xs"
                              : tab === "Ollama AI"
                              ? "text-purple-700 hover:text-purple-900 bg-purple-50/70"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab === "Ollama AI" && <Sparkles className="w-3 h-3 text-amber-300" />}
                          <span>{tab === "Ollama AI" ? (aiStatus?.provider === "google_gemini" ? "Google AI" : "Ollama AI") : tab}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab 1: Track visualization */}
                  {trackTab === "Track" && (
                    <div className="mt-3 h-44 rounded-2xl bg-gradient-to-br from-[#0B1D35] to-[#123A66] border border-[#E1EEF9] relative overflow-hidden flex items-center justify-center p-4">
                      {/* Dotted route path with callouts */}
                      <svg className="w-full h-full" viewBox="0 0 500 140">
                        {/* Background ocean grid lines */}
                        <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" />
                        <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" />
                        <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.05)" />

                        {/* Track Path Polyline */}
                        <path
                          d="M 40 100 Q 160 85, 250 65 T 450 35"
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                        />

                        {/* Waypoint 1: Normal Transit (Blue) */}
                        <circle cx="80" cy="95" r="5" fill="#38BDF8" />
                        <circle cx="80" cy="95" r="9" fill="rgba(56, 189, 248, 0.25)" />

                        {/* Waypoint 2: Loitering (Orange) */}
                        <circle cx="250" cy="65" r="6" fill="#F97316" />
                        <circle cx="250" cy="65" r="11" fill="rgba(249, 115, 22, 0.3)" />

                        {/* Waypoint 3: Near Spill Area (Red) */}
                        <circle cx="430" cy="38" r="6" fill="#EF4444" className="animate-ping" />
                        <circle cx="430" cy="38" r="6" fill="#EF4444" />
                        <circle cx="430" cy="38" r="12" fill="rgba(239, 68, 68, 0.35)" />

                        {/* Small Vessel Boat Icons at Waypoints */}
                        <polygon points="76,82 84,82 80,72" fill="#38BDF8" />
                        <polygon points="246,52 254,52 250,42" fill="#F97316" />
                        <polygon points="426,25 434,25 430,15" fill="#EF4444" />
                      </svg>

                      {/* Floating Timestamped Callouts */}
                      <div className="absolute top-4 left-6 bg-[#0B2545]/90 border border-sky-400/40 text-white px-2 py-0.5 rounded-md text-[9px] font-mono shadow-md">
                        {selectedVessel.trackWaypoints[0]?.time || "T - 4h"} &mdash; {selectedVessel.trackWaypoints[0]?.label || "Normal Transit"}
                      </div>

                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#0B2545]/90 border border-orange-400/50 text-white px-2 py-0.5 rounded-md text-[9px] font-mono shadow-md">
                        {selectedVessel.trackWaypoints[1]?.time || "T - 2h"} &mdash; {selectedVessel.trackWaypoints[1]?.label || "Course Fix"}
                      </div>

                      <div className="absolute top-3 right-6 bg-[#0B2545]/95 border border-rose-500 text-white px-2 py-0.5 rounded-md text-[9px] font-mono shadow-md font-bold">
                        {selectedVessel.trackWaypoints[2]?.time || "Now"} &mdash; Fix ({selectedVessel.speedKnots} kts)
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Speed */}
                  {trackTab === "Speed" && (
                    <div className="mt-3 h-44 rounded-2xl bg-[#F8FBFE] border border-[#E1EEF9] p-3 text-xs flex flex-col justify-between">
                      <div className="flex justify-between font-bold text-[#0B2545]">
                        <span>Speed Over Ground Telemetry</span>
                        <span className="text-rose-600 font-mono">Present: {selectedVessel.speedKnots} kts</span>
                      </div>
                      <div className="flex-1 flex items-end gap-2 pt-4 px-2 pb-1 border-b border-slate-200 font-mono text-[9px]">
                        <div className="flex-1 bg-sky-400 rounded-t h-[75%]" title={`T-4h: ${(selectedVessel.speedKnots + 1.5).toFixed(1)} kts`} />
                        <div className="flex-1 bg-sky-400 rounded-t h-[70%]" title={`T-3h: ${(selectedVessel.speedKnots + 0.8).toFixed(1)} kts`} />
                        <div className="flex-1 bg-sky-400 rounded-t h-[65%]" title={`T-2h: ${(selectedVessel.speedKnots).toFixed(1)} kts`} />
                        <div className={`flex-1 rounded-t h-[${Math.min(90, Math.max(15, Math.round(selectedVessel.speedKnots * 4)))}%] ${selectedVessel.speedKnots < 5 ? "bg-rose-500" : "bg-emerald-500"}`} title={`Current: ${selectedVessel.speedKnots} kts`} />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>T - 4h (Cruising)</span>
                        <span className="text-slate-600 font-bold">Heading: {selectedVessel.heading}°</span>
                        <span>Now ({selectedVessel.speedKnots} kts)</span>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Events */}
                  {trackTab === "Events" && (
                    <div className="mt-3 h-44 rounded-2xl bg-[#F8FBFE] border border-[#E1EEF9] p-3 overflow-y-auto space-y-1.5 text-[11px]">
                      {selectedVessel.asiEvents.length > 0 ? (
                        selectedVessel.asiEvents.map((ev) => (
                          <div key={ev.id} className="p-1.5 rounded-lg bg-white border border-[#E1EEF9] flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${ev.severity === "High" ? "bg-rose-500" : ev.severity === "Medium" ? "bg-orange-500" : "bg-blue-500"}`} />
                              <span className="font-bold text-[#0B2545]">{ev.event}</span>
                            </div>
                            <span className="font-mono text-slate-500 text-[10px]">{ev.time}</span>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                          <span>No anomalous kinematic deviations flagged for {selectedVessel.name}.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 4: ASI Analysis */}
                  {trackTab === "ASI Analysis" && (
                    <div className="mt-3 h-44 rounded-2xl bg-[#F8FBFE] border border-[#E1EEF9] p-3 text-xs space-y-2 flex flex-col justify-between">
                      <div className="flex justify-between font-bold text-[#0B2545]">
                        <span>Kinematic Anomaly Score</span>
                        <span className="text-rose-600 font-mono font-black">{selectedVessel.asiScore} / 100</span>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>TSS Routing Deviation Index</span>
                            <span className="font-bold">{Math.min(95, selectedVessel.asiScore + 4)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-rose-500" style={{ width: `${Math.min(95, selectedVessel.asiScore + 4)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>AIS Transponder Latency Risk</span>
                            <span className="font-bold text-amber-600">{Math.max(12, selectedVessel.asiScore - 10)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.max(12, selectedVessel.asiScore - 10)}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Distance to spill core: {selectedVessel.distanceKm} km | Evaluated under Indian Maritime Zone Intelligence Protocol
                      </div>
                    </div>
                  )}

                  {/* Tab 5: Ollama AI Intelligence Dossier */}
                  {trackTab === "Ollama AI" && (
                    <div className="mt-3 h-44 rounded-2xl bg-[#F8FBFE] border border-purple-200/80 p-3 overflow-y-auto space-y-2 text-xs flex flex-col justify-between">
                      {isAiLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 py-4">
                          <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                          <span className="text-[11px] font-mono">
                            Querying {aiStatus?.provider === "google_gemini" ? "Google AI (Gemini 3.6 Flash)" : "Ollama AI"} Intelligence for {selectedVessel.name}...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div>
                            {/* Header: Model & Status */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-purple-100">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-bold text-[#0B2545] text-[11px]">
                                  {aiAnalysis?.source || `Ollama AI (${aiStatus?.model || "gemma3"})`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono text-slate-400">Threat:</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                  aiAnalysis?.threat_level === "CRITICAL" || aiAnalysis?.threat_level === "HIGH"
                                    ? "bg-rose-100 text-rose-700 border-rose-300"
                                    : aiAnalysis?.threat_level === "MEDIUM"
                                    ? "bg-amber-100 text-amber-700 border-amber-300"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-300"
                                }`}>
                                  {aiAnalysis?.threat_level || "EVALUATING"} ({aiAnalysis?.attribution_suspicion_score || selectedVessel.asiScore}/100)
                                </span>
                              </div>
                            </div>

                            {/* Executive Summary */}
                            <p className="text-[11px] text-slate-700 font-medium leading-relaxed mt-1.5 bg-white p-2 rounded-xl border border-[#E1EEF9]">
                              {aiAnalysis?.executive_summary || "Ollama AI is continuously synthesizing real-time AIS kinematics and radar cross-sections."}
                            </p>

                            {/* Kinematic & Recommendation breakdown */}
                            <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-[10px]">
                              <div className="p-1.5 rounded-lg bg-white border border-[#E1EEF9]">
                                <span className="text-slate-400 font-semibold block text-[9px]">Kinematic Behavior:</span>
                                <span className="text-slate-700 font-medium line-clamp-2">
                                  {aiAnalysis?.kinematic_analysis || "Nominal corridor alignment with constant engine revolutions."}
                                </span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-[#E1EEF9]">
                                <span className="text-indigo-600 font-bold block text-[9px]">Coast Guard Directive:</span>
                                <span className="text-slate-700 font-medium line-clamp-2">
                                  {aiAnalysis?.recommended_action || "Maintain radar track at Mumbai MRCC."}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Chat response if any */}
                          {chatResponse && (
                            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[10px] text-purple-900 leading-snug">
                              <span className="font-bold text-purple-950">AI Answer: </span>
                              {chatResponse}
                            </div>
                          )}

                          {/* Interactive Ask Ollama input */}
                          <form onSubmit={handleAskOllama} className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={chatPrompt}
                              onChange={(e) => setChatPrompt(e.target.value)}
                              placeholder={`Ask AI Intelligence about ${selectedVessel.name}...`}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-[#E1EEF9] text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="submit"
                              disabled={isChatLoading}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isChatLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              <span>Ask</span>
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Scrubber & Play Controls */}
                <div className="pt-2 border-t border-[#E1EEF9] flex items-center gap-3">
                  <button
                    onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                    className="w-7 h-7 rounded-full bg-[#1E5FBF] hover:bg-[#174EA6] text-white flex items-center justify-center cursor-pointer shadow-sm shrink-0"
                  >
                    {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  {/* Range Scrubber */}
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={selectedTimelinePointIndex}
                      onChange={(e) => setSelectedTimelinePointIndex(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E5FBF]"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-0.5">
                      <span>-24h</span>
                      <span>-12h</span>
                      <span className="font-bold text-[#1E5FBF]">Now</span>
                      <span>+12h</span>
                      <span>+24h</span>
                      <span>+48h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL: Recent ASI Events (MT Ocean Pride) (3 cols) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider truncate">
                      Recent ASI Events ({selectedVessel.name.split(" ")[0]})
                    </h2>
                    <button
                      onClick={() => setTrackTab("Events")}
                      className="text-[11px] font-bold text-[#1E5FBF] hover:underline cursor-pointer shrink-0"
                    >
                      View All
                    </button>
                  </div>

                  {/* Table */}
                  <div className="mt-2 space-y-1.5">
                    {selectedVessel.asiEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => triggerToast(`Event: ${ev.event} - ${ev.details}`)}
                        className="p-2 rounded-xl bg-[#F8FBFE] hover:bg-[#EFF6FD] border border-[#E1EEF9] transition-all cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] text-slate-400">{ev.time}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                              ev.severity === "High"
                                ? "bg-rose-100 text-rose-700"
                                : ev.severity === "Medium"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </div>
                        <div className="font-bold text-[#0B2545] text-[11px] mt-0.5 leading-snug">
                          {ev.event}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center pt-1 border-t border-slate-100">
                  Total logged anomalies: {selectedVessel.asiEvents.length}
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* THIRD ROW: Nearby Vessels | Fleet Summary | Coast Guard Assets    */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* PANEL: Nearby Vessels (10 km) (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-[#1E5FBF]" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Nearby Vessels (10 km)
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedProximity("<10km")}
                      className="text-[11px] font-bold text-[#1E5FBF] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {/* Batch Action Bar if 1+ checked */}
                  {selectedVesselChecklist.length > 0 && (
                    <div className="my-2 p-2 rounded-xl bg-[#0B2545] text-white text-xs flex items-center justify-between animate-fadeIn">
                      <span className="font-bold">{selectedVesselChecklist.length} selected</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerToast(`Tracking ${selectedVesselChecklist.length} vessels concurrently.`)}
                          className="px-2 py-0.5 rounded bg-[#1E5FBF] hover:bg-[#174EA6] text-[10px] font-bold cursor-pointer"
                        >
                          Track Selected
                        </button>
                        <button
                          onClick={() => triggerToast("Added selected to Coast Guard watchlist.")}
                          className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer"
                        >
                          Watchlist
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase">
                          <th className="py-1.5 px-1 w-6">
                            <button onClick={handleSelectAllNearby} className="cursor-pointer">
                              {selectedVesselChecklist.length === 4 ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#1E5FBF]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </button>
                          </th>
                          <th className="py-1.5 px-1 font-semibold">Name</th>
                          <th className="py-1.5 px-1 font-semibold">Type</th>
                          <th className="py-1.5 px-1 font-semibold">Distance</th>
                          <th className="py-1.5 px-1 font-semibold">Bearing</th>
                          <th className="py-1.5 px-1 font-semibold">Speed</th>
                          <th className="py-1.5 px-1 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {nearbyVessels.map((v) => {
                          const isChecked = selectedVesselChecklist.includes(v.id);
                          const isSelected = selectedVessel.id === v.id;
                          return (
                            <tr
                              key={v.id}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? "bg-sky-50 font-bold" : "hover:bg-[#F8FBFE]"
                              }`}
                            >
                              <td className="py-2 px-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVesselCheckbox(v.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-[#1E5FBF]" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-300" />
                                  )}
                                </button>
                              </td>
                              <td
                                className="py-2 px-1 font-bold text-[#0B2545] hover:underline"
                                onClick={() => setSelectedVesselId(v.id)}
                              >
                                {v.name}
                              </td>
                              <td className="py-2 px-1 text-slate-500 font-sans text-[10px]">
                                {v.type}
                              </td>
                              <td className="py-2 px-1 font-bold text-slate-700">
                                {v.distanceKm} km
                              </td>
                              <td className="py-2 px-1 text-slate-600">{v.bearingDeg}°</td>
                              <td className="py-2 px-1 text-emerald-700">{v.speedKnots} kts</td>
                              <td className="py-2 px-1">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    v.status === "Normal"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : v.status === "In AOI"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center pt-1 border-t border-slate-100">
                  Showing nearest priority contacts to 18.78°N, 72.51°E
                </div>
              </div>

              {/* PANEL: Fleet Summary (Ships Only) (3 cols) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Fleet Summary (Ships Only)
                      </h2>
                      <button
                        onMouseEnter={() => setShowFleetSummaryTooltip(true)}
                        onMouseLeave={() => setShowFleetSummaryTooltip(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      {showFleetSummaryTooltip && (
                        <div className="absolute left-1/3 bottom-20 w-52 p-2 bg-[#0B2545] text-white text-[10px] rounded-xl shadow-xl z-50 animate-fadeIn">
                          Aggregated telemetry excludes non-commercial fishing vessels and pleasure crafts.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid of 5 Stat Tiles matching screenshot */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-200/80">
                      <div className="text-[10px] text-slate-500 font-medium">Tankers</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black text-rose-700">28</span>
                        <span className="text-[10px] font-bold text-emerald-700 font-mono">↑ 2</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                      <div className="text-[10px] text-slate-500 font-medium">Bulk Carriers</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black text-emerald-700">24</span>
                        <span className="text-[10px] font-bold text-emerald-700 font-mono">↑ 1</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-200/80">
                      <div className="text-[10px] text-slate-500 font-medium">Container Ships</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black text-blue-700">32</span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">↑ 0</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-orange-50/50 border border-orange-200/80">
                      <div className="text-[10px] text-slate-500 font-medium">General Cargo</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black text-orange-700">18</span>
                        <span className="text-[10px] font-bold text-emerald-700 font-mono">↑ 1</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 col-span-2">
                      <div className="text-[10px] text-slate-500 font-medium">Other Ships</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black text-slate-700">40</span>
                        <span className="text-[10px] font-bold text-rose-600 font-mono">↓ 1</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 text-center border-t border-slate-100 pt-1">
                  National Automatic Identification Database
                </div>
              </div>

              {/* PANEL: Coast Guard Assets Nearby (4 cols) */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-[#E1EEF9] shadow-[0_4px_20px_rgba(30,95,191,0.08)] flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9]">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                        Coast Guard Assets Nearby
                      </h2>
                    </div>
                    <button
                      onClick={() => triggerToast("Viewing full Indian Coast Guard Western Fleet Roster.")}
                      className="text-[11px] font-bold text-[#1E5FBF] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {/* Table */}
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase">
                          <th className="py-1.5 px-1 font-semibold">Name</th>
                          <th className="py-1.5 px-1 font-semibold">Type</th>
                          <th className="py-1.5 px-1 font-semibold">Distance</th>
                          <th className="py-1.5 px-1 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {COAST_GUARD_ASSETS.map((asset) => (
                          <tr
                            key={asset.id}
                            onClick={() => setSelectedAssetModal(asset)}
                            className="hover:bg-[#F8FBFE] transition-colors cursor-pointer"
                          >
                            <td className="py-2 px-1 font-bold text-[#0B2545]">{asset.name}</td>
                            <td className="py-2 px-1 text-slate-500 font-sans text-[10px]">
                              {asset.type}
                            </td>
                            <td className="py-2 px-1 font-bold text-slate-700">{asset.distance}</td>
                            <td className="py-2 px-1">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  asset.status === "Operational"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                ● {asset.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center pt-1 border-t border-slate-100">
                  Direct telemetry dispatch to Western Naval Command
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* FOOTER                                                           */}
            {/* ================================================================= */}
            <footer className="pt-4 pb-2 border-t border-[#DCEEFC] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
              <div>
                &copy; 2026 SAHAYYA &nbsp;|&nbsp; Ministry of Defence, Government of India
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => triggerToast("Terms of Use: Authorized Maritime Defense Only")} className="hover:text-slate-800 cursor-pointer">
                  Terms of Use
                </button>
                <span>|</span>
                <button onClick={() => triggerToast("Data Sources: INCOIS, DGLL AIS, Copernicus SAR")} className="hover:text-slate-800 cursor-pointer">
                  Data Sources
                </button>
                <span>|</span>
                <button onClick={() => triggerToast("Privacy: DPDP Act & Maritime Security Compliant")} className="hover:text-slate-800 cursor-pointer">
                  Privacy
                </button>
                <span>|</span>
                <button onClick={() => triggerToast("MRCC Mumbai 24/7 Hotline: +91 22 2431 6558")} className="hover:text-slate-800 cursor-pointer">
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

      {/* Official Fleet Surveillance PDF Report Modal */}
      <ReportGenerationModal
        isOpen={showGenerateReportModal}
        onClose={() => setShowGenerateReportModal(false)}
        incidentTitle="Indian EEZ Fleet Surveillance Domain"
        isFleetReport={true}
      />

      {/* Coast Guard Asset Contact / Dispatch Modal */}
      {selectedAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-3">
              <div className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>{selectedAssetModal.name} Command Terminal</span>
              </div>
              <button onClick={() => setSelectedAssetModal(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Asset Class:</span>
                <span className="font-bold text-[#0B2545]">{selectedAssetModal.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Callsign:</span>
                <span className="text-slate-700">{selectedAssetModal.callsign}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Position:</span>
                <span className="text-slate-700">{selectedAssetModal.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Home Command:</span>
                <span className="text-slate-700">{selectedAssetModal.base}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Max Speed:</span>
                <span className="font-bold text-emerald-700">{selectedAssetModal.speed}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E1EEF9] flex justify-end gap-2">
              <button
                onClick={() => setSelectedAssetModal(null)}
                className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600 hover:bg-[#F8FBFE]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedAssetModal(null);
                  triggerToast(`Dispatched tactical alert to ${selectedAssetModal.name} bridge.`);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-xs font-bold text-white shadow-sm"
              >
                Dispatch Interception Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared 7D Evidence Graph Modal */}
      {showEvidenceModal && (
        <EvidenceGraphModal
          vessel={selectedVessel}
          onClose={() => setShowEvidenceModal(false)}
          onExportEvidence={() =>
            triggerToast(`Forensic evidence dossier exported for ${selectedVessel.name}`)
          }
        />
      )}
    </div>
  );
};

export default VesselsPage;
