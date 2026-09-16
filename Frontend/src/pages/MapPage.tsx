import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Layers,
  Ship,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Filter,
  RefreshCw,
  Home,
  Map as MapIcon,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { NationalMap } from "../components/NationalMap";
import { EvidenceGraphModal } from "../components/EvidenceGraphModal";
import { ReportGenerationModal } from "../components/ReportGenerationModal";
import { ACTIVE_INCIDENTS, ActiveIncidentRecord } from "../data/incidentData";
import { VESSELS_DATA, VesselRecord, VesselType } from "../data/vesselsData";
import sahayyaApi from "../services/api";
import sahayyaSocket from "../services/socket";

export const MapPage: React.FC = () => {
  const navigate = useNavigate();

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Map");

  // Map focus & selected entities
  const [selectedIncident, setSelectedIncident] = useState<ActiveIncidentRecord | null>(null);
  const [selectedVesselForEvidence, setSelectedVesselForEvidence] = useState<VesselRecord | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Floating panel visibility toggles
  const [showLeftFilters, setShowLeftFilters] = useState(true);
  const [showRightIncidents, setShowRightIncidents] = useState(true);

  // Filters State
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>("All");
  const [vesselTypeFilter, setVesselTypeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Risk Layer Toggles
  const [layerToggles, setLayerToggles] = useState({
    shippingCorridors: true,
    ports: true,
    eezBoundary: true,
    mpas: true,
    fishingZones: true,
  });

  // Live backend data states with baseline fallback
  const [incidentsList, setIncidentsList] = useState<ActiveIncidentRecord[]>(ACTIVE_INCIDENTS);
  const [vesselsList, setVesselsList] = useState<VesselRecord[]>(VESSELS_DATA);

  // Load live incidents & fleet vessels on mount
  useEffect(() => {
    sahayyaApi.map.getIncidents()
      .then((apiIncidents) => {
        if (apiIncidents && apiIncidents.length > 0) {
          const mappedInc: ActiveIncidentRecord[] = apiIncidents.map((inc: any) => ({
            id: inc.incident_code,
            name: inc.title,
            region: inc.region_name,
            severity: inc.severity_score >= 8 ? "Critical" : inc.severity_score >= 6 ? "High" : inc.severity_score >= 4 ? "Medium" : "Low",
            severityScore: inc.severity_score * 10,
            areaKm2: inc.spill_area_km2,
            status: inc.status === "analysis" ? "Active" : inc.status === "response_planning" ? "Response" : inc.status === "detection" ? "Under Observation" : "Closed",
            coordinates: [inc.location.coordinates[1], inc.location.coordinates[0]],
            detectedTime: new Date(inc.detected_at).toUTCString().slice(5, 22),
            attributionSuspect: inc.incident_code === "IN-MH-2026" ? "MT Pacific Voyager (98.8%)" : "Under Investigation",
            confidenceScore: 92,
          }));
          setIncidentsList(mappedInc);
        }
      })
      .catch((err) => console.warn("Live map incidents offline, using baseline:", err));

    sahayyaApi.map.getVessels()
      .then((apiVessels) => {
        if (apiVessels && apiVessels.length > 0) {
          const typeMap: Record<string, VesselType> = {
            tanker: "Tanker",
            bulk_carrier: "Bulk Carrier",
            container: "Container Ship",
            general_cargo: "General Cargo",
            other: "Other"
          };
          const mappedVessels: VesselRecord[] = apiVessels.map((v: any, i: number) => {
            const coords = v.latest_position?.coordinates || [72.48 + (i % 10) * 0.1, 18.76 + (i % 8) * 0.1];
            const lat = Number(coords[1].toFixed(4));
            const lon = Number(coords[0].toFixed(4));
            const hasAnomalies = v.asi_events && v.asi_events.length > 0;
            const speed = Number((v.speed_kts || 12.0).toFixed(1));
            const heading = Math.round(v.heading_deg || 45);

            // Compute exact nautical distance and bearing to active incident core (18.78N, 72.51E)
            const dLat = (lat - 18.78) * 111.0;
            const dLon = (lon - 72.51) * 105.0;
            const distanceKm = Math.max(0.9, Number(Math.hypot(dLat, dLon).toFixed(1)));
            const bearingDeg = Math.round((Math.atan2(dLon, dLat) * (180 / Math.PI) + 360) % 360);

            // Dynamic realistic status & ASI Score
            let status: "Normal" | "Under Observation" | "In AOI" | "Flagged" = "Normal";
            let riskLevel: "Low" | "Medium" | "High" = "Low";
            let asiScore = 12;

            if (v.name.toUpperCase().includes("PACIFIC VOYAGER")) {
              status = "Flagged";
              riskLevel = "High";
              asiScore = 98;
            } else if (hasAnomalies && distanceKm < 15.0) {
              status = "Flagged";
              riskLevel = "High";
              asiScore = Math.min(94, Math.round(85 + (v.id % 8)));
            } else if (hasAnomalies || distanceKm < 18.0) {
              status = "Under Observation";
              riskLevel = "Medium";
              asiScore = Math.max(50, Math.min(80, Math.round(72 - distanceKm * 0.7 + (v.id % 6))));
            } else if (distanceKm < 45.0) {
              status = "In AOI";
              riskLevel = "Medium";
              asiScore = Math.max(25, Math.min(48, Math.round(44 - distanceKm * 0.3 + (v.id % 5))));
            } else {
              status = "Normal";
              riskLevel = "Low";
              asiScore = Math.max(5, Math.min(22, Math.round(18 - (distanceKm * 0.04) + (v.id % 4))));
            }

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
              lastAis: "Live AIS Stream",
              eta: "14 Sep 2026",
              image: (v.vessel_type || "").includes("tanker") ? "/tanker.jpg" : "/container-ship.jpg",
              destination: "JNPT / Mumbai",
              departurePort: "Ras Tanura",
              lengthMeters: 274,
              beamMeters: 48,
              draftMeters: 14.5,
              asiEvents: v.asi_events?.map((e: any) => ({
                id: String(e.id),
                time: e.occurred_at ? new Date(e.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
                event: (e.event_type || "anomaly").replace(/_/g, " "),
                severity: e.severity === "high" || e.severity === "High" ? "High" : e.severity === "medium" || e.severity === "Medium" ? "Medium" : "Low",
                details: e.description || e.details || ""
              })) || [],
              trackWaypoints: []
            };
          });
          setVesselsList(mappedVessels);
        }
      })
      .catch((err) => console.warn("Live map vessels offline, using baseline:", err));
  }, []);

  // WebSocket Live Vessel Movement
  useEffect(() => {
    const unsub = sahayyaSocket.subscribeVesselPositions((msg) => {
      setVesselsList((prev) =>
        prev.map((v) => {
          if (v.name === msg.vessel_name || v.id === `vessel-${msg.vessel_id}`) {
            return {
              ...v,
              coordinates: [msg.coordinates[1], msg.coordinates[0]] as [number, number],
              speedKnots: msg.speed_kts,
              heading: msg.heading_deg,
            };
          }
          return v;
        })
      );
    });
    return () => unsub();
  }, []);

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidentsList.filter((inc) => {
      if (incidentStatusFilter !== "All" && inc.status !== incidentStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inc.id.toLowerCase().includes(q) ||
          inc.name.toLowerCase().includes(q) ||
          inc.region.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidentsList, incidentStatusFilter, searchQuery]);

  // Filtered Vessels
  const filteredVessels = useMemo(() => {
    return vesselsList.filter((v) => {
      if (vesselTypeFilter !== "All" && v.type !== vesselTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.imo.toLowerCase().includes(q) ||
          v.mmsi.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vesselsList, vesselTypeFilter, searchQuery]);

  const handleIncidentClick = (inc: ActiveIncidentRecord) => {
    setSelectedIncident(inc);
    setFlyToCoords(inc.coordinates);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans select-none">
      {/* ===================================================================== */}
      {/* FIXED TOP BAR                                                         */}
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
                  National MDA
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight">
                National Maritime Domain Awareness & Situational Grid
              </div>
            </div>
          </div>
        </div>

        {/* Center Global Search */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident, vessel (IMO, name), port..."
            className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#0B2545] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Top Right System Status */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AIS Live Feeds: Active (30 Vessels)</span>
          </div>

          <button
            onClick={() => navigate("/incidents/IN-MH-2026")}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Active Incident: IN-MH-2026</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* WORKSPACE: SIDEBAR + FULL-BLEED MAP WITH FLOATING OVERLAYS           */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Fixed Collapsible Sidebar */}
        <aside
          className={`h-full bg-[#0B2545] transition-all duration-300 flex flex-col justify-between py-4 z-30 shrink-0 select-none ${
            isSidebarOpen ? "w-20" : "w-0 p-0 opacity-0 -translate-x-full overflow-hidden"
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

        {/* Main Canvas: FULL-BLEED LEAFLET MAP */}
        <div className="flex-1 h-full relative overflow-hidden">
          <NationalMap
            vessels={filteredVessels}
            incidents={filteredIncidents}
            selectedIncidentId={selectedIncident?.id || null}
            onSelectIncident={handleIncidentClick}
            onSelectVessel={(v) => setSelectedVesselForEvidence(v)}
            flyToCoords={flyToCoords}
            layerToggles={layerToggles}
          />

          {/* ================================================================= */}
          {/* FLOATING TOP STATS STRIP                                         */}
          {/* ================================================================= */}
          <div className="absolute top-4 left-4 sm:left-6 right-16 sm:right-20 z-20 pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-[#E1EEF9] rounded-2xl shadow-xl px-4 py-2 flex items-center gap-4 sm:gap-8 max-w-2xl text-[#0B2545]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Active Spills
                  </div>
                  <div className="text-base font-black text-rose-600 leading-none">
                    {ACTIVE_INCIDENTS.length} Incidents
                  </div>
                </div>
              </div>

              <div className="w-px h-7 bg-slate-200"></div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-[#1E5FBF]">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Vessels Tracked
                  </div>
                  <div className="text-base font-black text-[#0B2545] leading-none">
                    30 Vessels
                  </div>
                </div>
              </div>

              <div className="w-px h-7 bg-slate-200"></div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    High ASI Risk
                  </div>
                  <div className="text-base font-black text-amber-600 leading-none">
                    8 Flagged
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FLOATING LEFT FILTER PANEL                                       */}
          {/* ================================================================= */}
          <div className="absolute top-20 left-4 sm:left-6 z-20 max-w-xs w-72">
            {showLeftFilters ? (
              <div className="bg-white/92 backdrop-blur-md border border-[#E1EEF9] rounded-2xl shadow-xl overflow-hidden text-slate-800 transition-all animate-fadeIn">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E1EEF9] bg-[#F8FBFE]">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#0B2545]">
                    <SlidersHorizontal className="w-4 h-4 text-[#1E5FBF]" />
                    <span>Situational Filters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIncidentStatusFilter("All");
                        setVesselTypeFilter("All");
                        setSearchQuery("");
                      }}
                      className="text-[10px] text-[#1E5FBF] font-semibold hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowLeftFilters(false)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Incident Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Incident Status
                    </label>
                    <select
                      value={incidentStatusFilter}
                      onChange={(e) => setIncidentStatusFilter(e.target.value)}
                      className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-lg p-1.5 text-xs text-[#0B2545] font-semibold"
                    >
                      <option value="All">All Incident Statuses</option>
                      <option value="Live Incident">Live Incidents</option>
                      <option value="Under Investigation">Under Investigation</option>
                      <option value="Monitored">Monitored Only</option>
                      <option value="Contained">Contained</option>
                    </select>
                  </div>

                  {/* Vessel Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Vessel Type (Fleet)
                    </label>
                    <select
                      value={vesselTypeFilter}
                      onChange={(e) => setVesselTypeFilter(e.target.value)}
                      className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-lg p-1.5 text-xs text-[#0B2545] font-semibold"
                    >
                      <option value="All">All Ships ({filteredVessels.length})</option>
                      <option value="Tanker">Tankers (Crude / Chem)</option>
                      <option value="Bulk Carrier">Bulk Carriers</option>
                      <option value="Container Ship">Container Ships</option>
                      <option value="General Cargo">General Cargo</option>
                      <option value="Other">Other / Offshore</option>
                    </select>
                  </div>

                  {/* Layer Checkboxes */}
                  <div className="pt-2 border-t border-[#E1EEF9] space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Maritime Vector Layers
                    </label>

                    {[
                      { key: "shippingCorridors", label: "Shipping Corridors (Fairways)" },
                      { key: "ports", label: "Major Ports & Terminals" },
                      { key: "eezBoundary", label: "Indian EEZ 200 NM Boundary" },
                      { key: "mpas", label: "Marine Protected Areas (MPAs)" },
                    ].map((lyr) => (
                      <label
                        key={lyr.key}
                        className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={(layerToggles as any)[lyr.key]}
                          onChange={(e) =>
                            setLayerToggles({ ...layerToggles, [lyr.key]: e.target.checked })
                          }
                          className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                        />
                        <span>{lyr.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLeftFilters(true)}
                className="bg-white/90 backdrop-blur-md border border-[#E1EEF9] px-3 py-2 rounded-xl shadow-lg text-xs font-bold text-[#0B2545] flex items-center gap-1.5 hover:bg-white transition-all cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-[#1E5FBF]" />
                <span>Show Filters</span>
              </button>
            )}
          </div>

          {/* ================================================================= */}
          {/* FLOATING RIGHT INCIDENTS LIST PANEL                              */}
          {/* ================================================================= */}
          <div className="absolute top-20 right-4 sm:right-6 z-20 max-w-xs w-80">
            {showRightIncidents ? (
              <div className="bg-white/92 backdrop-blur-md border border-[#E1EEF9] rounded-2xl shadow-xl overflow-hidden text-slate-800 transition-all animate-fadeIn flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E1EEF9] bg-[#F8FBFE] shrink-0">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#0B2545]">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Active Incident Roster ({filteredIncidents.length})</span>
                  </div>
                  <button
                    onClick={() => setShowRightIncidents(false)}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 overflow-y-auto space-y-2.5 custom-tactical-scrollbar">
                  {filteredIncidents.map((inc) => {
                    const isSelected = selectedIncident?.id === inc.id;
                    return (
                      <div
                        key={inc.id}
                        onClick={() => handleIncidentClick(inc)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#EFF6FD] border-[#1E5FBF] shadow-sm"
                            : "bg-[#F8FBFE] hover:bg-white border-[#E1EEF9]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#0B2545]">
                            {inc.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              inc.severity === "Critical"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {inc.severity} ({inc.severityScore}%)
                          </span>
                        </div>

                        <div className="font-bold text-xs text-[#0B2545] mt-1">{inc.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{inc.region}</div>

                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-600 mt-2 pt-2 border-t border-slate-100">
                          <div>Slick Area: <span className="font-bold text-rose-600">{inc.areaKm2} km²</span></div>
                          <div>Suspects: <span className="font-bold text-[#0B2545]">{inc.vesselsInAOI} in AOI</span></div>
                        </div>

                        <div className="mt-2.5 pt-1.5 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">{inc.detectedTime}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/incidents/${inc.id}`);
                            }}
                            className="text-[10px] font-bold text-[#1E5FBF] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Open Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRightIncidents(true)}
                className="bg-white/90 backdrop-blur-md border border-[#E1EEF9] px-3 py-2 rounded-xl shadow-lg text-xs font-bold text-[#0B2545] flex items-center gap-1.5 hover:bg-white transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Show Incidents ({filteredIncidents.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shared Evidence Graph Modal if vessel selected */}
      {selectedVesselForEvidence && (
        <EvidenceGraphModal
          vessel={selectedVesselForEvidence}
          onClose={() => setSelectedVesselForEvidence(null)}
          onExportEvidence={() =>
            alert(`Intelligence evidence exported for ${selectedVesselForEvidence.name}`)
          }
        />
      )}

      {/* Official Map Domain PDF Report Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        incidentTitle="Indian EEZ Maritime Domain Assessment"
        isFleetReport={true}
      />
    </div>
  );
};

export default MapPage;
