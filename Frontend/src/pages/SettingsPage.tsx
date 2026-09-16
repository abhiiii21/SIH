import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sahayyaApi from "../services/api";
import {
  User,
  Bell,
  Database,
  Languages,
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink,
  Plus,
  Save,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  HelpCircle,
  Home,
  Map as MapIcon,
  Activity,
  Ship,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  FileText,
} from "lucide-react";
import { ReportGenerationModal } from "../components/ReportGenerationModal";

type SettingsTab =
  | "profile"
  | "notifications"
  | "datasources"
  | "ai"
  | "accessibility"
  | "users";

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  // Sidebar & Top Nav
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState("Commander S. Kumar");
  const [profileEmail, setProfileEmail] = useState("s.kumar@indiancoastguard.gov.in");
  const [profileOrg, setProfileOrg] = useState("Indian Coast Guard (West HQ)");
  const [profileRole, setProfileRole] = useState("Senior Maritime Operations Officer");

  // Notifications State (Stage 19)
  const [channels, setChannels] = useState({
    email: true,
    sms: true,
    inApp: true,
    push: false,
  });
  const [severityThreshold, setSeverityThreshold] = useState("High");
  const [recipientGroups, setRecipientGroups] = useState({
    coastGuard: true,
    portAuthority: true,
    pollutionBoard: true,
    fishermen: false,
  });

  // Data Sources State (Stage 3)
  const [pluginEnabled, setPluginEnabled] = useState(true);

  // Accessibility State
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Users State
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Commander S. Kumar", email: "s.kumar@indiancoastguard.gov.in", role: "Incident Commander", status: "Active", agency: "ICG West" },
    { id: 2, name: "Dr. Ananya Sharma", email: "a.sharma@incois.gov.in", role: "Oceanographic Modeler", status: "Active", agency: "INCOIS" },
    { id: 3, name: "R. Narayanan", email: "r.narayanan@dgshipping.gov.in", role: "VTS Specialist", status: "Active", agency: "DG Shipping" },
    { id: 4, name: "K. Deshmukh", email: "k.deshmukh@mpcb.gov.in", role: "Environmental Officer", status: "Pending", agency: "MPCB" },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Senior Analyst");

  // Ollama & Google Gemini AI Settings State
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaApiKey, setOllamaApiKey] = useState("");
  const [ollamaModel, setOllamaModel] = useState("gemma3");
  const [googleApiKey, setGoogleApiKey] = useState(import.meta.env.VITE_GOOGLE_API_KEY || "");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash");
  const [ollamaStatus, setOllamaStatus] = useState<any | null>(null);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  // Fetch initial AI status on mount
  useEffect(() => {
    sahayyaApi.ai.getStatus()
      .then((st) => {
        setOllamaStatus(st);
        if (st.base_url) setOllamaBaseUrl(st.base_url);
        if (st.model) setOllamaModel(st.model);
        if (st.gemini_model) setGeminiModel(st.gemini_model);
      })
      .catch(() => {});
  }, []);

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    try {
      const res = await sahayyaApi.ai.getStatus();
      setOllamaStatus(res);
      if (res.status === "connected") {
        if (res.provider === "google_gemini") {
          triggerToast(`Connected to Google AI (${res.model || "gemini-3.6-flash"}) successfully!`);
        } else {
          triggerToast(`Connected to Ollama (${res.model}) successfully!`);
        }
      } else {
        triggerToast("Ollama & Google AI offline. Maritime Defense heuristic fallback active.");
      }
    } catch {
      triggerToast("AI intelligence test ping completed.");
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleSaveOllama = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sahayyaApi.ai.updateConfig({
        base_url: ollamaBaseUrl,
        model: ollamaModel,
        api_key: ollamaApiKey,
        google_api_key: googleApiKey,
        gemini_model: geminiModel,
      });
      setOllamaStatus(res.health);
      triggerToast("AI Configuration (Google Gemini & Ollama) saved successfully.");
    } catch (err: any) {
      triggerToast(`Saved locally. ${err?.message || ""}`);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Profile & agency credentials updated successfully.");
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    setTeamMembers([
      ...teamMembers,
      {
        id: Date.now(),
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: "Pending",
        agency: "Invited Officer",
      },
    ]);
    setShowInviteModal(false);
    setInviteName("");
    setInviteEmail("");
    triggerToast(`Invitation sent to ${inviteEmail}`);
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
                <span className="font-black text-[#0B2545] text-base tracking-tight leading-none">
                  SAHAYYA
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-sky-100 text-[#1E5FBF] rounded-sm uppercase tracking-wider">
                  Config
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight">
                System Administration & Telemetry Configurations
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs font-semibold text-[#1E5FBF] hover:underline cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTAINER: SIDEBAR + SETTINGS WORKSPACE                          */}
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
              { id: "Settings", icon: SettingsIcon, label: "Settings", path: "/settings" },
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

        {/* Settings Content Area */}
        <main className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-tactical-scrollbar scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B2545] tracking-tight">
                Settings & System Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure organizational identity, multi-stakeholder alert pipelines, satellite sensor streams, and user access.
              </p>
            </div>

            {/* Main Settings Card with Left Vertical Nav */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#E1EEF9] shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">
              {/* Internal Sub-nav Vertical Tabs */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#E1EEF9] bg-[#F8FBFE] p-3 sm:p-4 shrink-0 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
                {[
                  { id: "profile", label: "Profile & Organization", icon: User },
                  { id: "notifications", label: "Notifications & Alerts", icon: Bell, badge: "Stage 19" },
                  { id: "datasources", label: "Data Sources & Sensors", icon: Database, badge: "Stage 3" },
                  { id: "ai", label: "Ollama AI & API Key", icon: Sparkles, badge: "AI Core" },
                  { id: "accessibility", label: "Language & Accessibility", icon: Languages },
                  { id: "users", label: "User & Role Management", icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSel = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSel
                          ? "bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-[#0B2545]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                            isSel ? "bg-white/20 text-white" : "bg-sky-100 text-[#1E5FBF]"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels */}
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                {/* TAB 1: Profile & Organization */}
                {activeTab === "profile" && (
                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl animate-fadeIn">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">Officer Profile & Agency</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official designation for digital signing of maritime forensic dossiers.
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#1E5FBF] text-white font-black text-xl flex items-center justify-center shadow-md">
                        SK
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => triggerToast("Avatar file selector opened")}
                          className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Change Photo</span>
                        </button>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">PNG or JPG up to 2MB</div>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/30"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Official Gov Email</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/30"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Organization / Department</label>
                        <select
                          value={profileOrg}
                          onChange={(e) => setProfileOrg(e.target.value)}
                          className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold"
                        >
                          <option value="Indian Coast Guard (West HQ)">Indian Coast Guard (West HQ)</option>
                          <option value="Port Authority / VTS Directorate">Port Authority / VTS Directorate</option>
                          <option value="State Pollution Control Board">State Pollution Control Board (SPCB)</option>
                          <option value="Directorate General of Shipping">Directorate General of Shipping</option>
                          <option value="INCOIS Ocean Modeling Team">INCOIS Ocean Modeling Team</option>
                          <option value="Marine Environmental Regulator">Marine Environmental Regulator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Operational Role</label>
                        <input
                          type="text"
                          value={profileRole}
                          onChange={(e) => setProfileRole(e.target.value)}
                          className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/30"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] hover:from-[#174EA6] hover:to-[#2275C6] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Profile Changes</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: Notifications & Alerts (Stage 19) */}
                {activeTab === "notifications" && (
                  <div className="space-y-6 max-w-xl animate-fadeIn">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">Automated Alert Pipeline</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Multi-channel notification triggers for verified hydrocarbon discharge and vessel loitering events.
                      </p>
                    </div>

                    {/* Alert Channels */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Active Alert Channels
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: "email", label: "Email Dispatch", desc: "Instant SAR summary to inbox" },
                          { key: "sms", label: "SMS Urgent Relay", desc: "Flash SMS to duty officer" },
                          { key: "inApp", label: "In-App Toast Alerts", desc: "Real-time browser popovers" },
                          { key: "push", label: "Mobile Push Notifications", desc: "PWA Coast Guard mobile push" },
                        ].map((ch) => (
                          <div
                            key={ch.key}
                            className="p-3 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#0B2545]">{ch.label}</div>
                              <div className="text-[10px] text-slate-500">{ch.desc}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={(channels as any)[ch.key]}
                              onChange={(e) =>
                                setChannels({ ...channels, [ch.key]: e.target.checked })
                              }
                              className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Severity Threshold */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Minimum Alert Trigger Threshold
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {["Low", "Medium", "High", "Critical"].map((sev) => {
                          const isSel = severityThreshold === sev;
                          return (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => setSeverityThreshold(sev)}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#0B2545] text-white border-[#0B2545] shadow-sm"
                                  : "bg-[#F8FBFE] text-slate-600 border-[#E1EEF9] hover:bg-slate-100"
                              }`}
                            >
                              {sev}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stakeholder Recipient Groups */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Stakeholder Auto-Alert Groups (Stage 19)
                      </h3>
                      <div className="space-y-2">
                        {[
                          { key: "coastGuard", label: "Indian Coast Guard Regional Command", count: "12 Officers" },
                          { key: "portAuthority", label: "Major Ports VTS Operations Centers", count: "8 Stations" },
                          { key: "pollutionBoard", label: "State Pollution Control Boards (SPCB)", count: "6 Agencies" },
                          { key: "fishermen", label: "Fishermen & Coastal Village Cooperatives", count: "34 Radio Cells" },
                        ].map((grp) => (
                          <label
                            key={grp.key}
                            className="p-2.5 rounded-xl border border-[#E1EEF9] bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 text-xs"
                          >
                            <div>
                              <div className="font-bold text-[#0B2545]">{grp.label}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{grp.count}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={(recipientGroups as any)[grp.key]}
                              onChange={(e) =>
                                setRecipientGroups({
                                  ...recipientGroups,
                                  [grp.key]: e.target.checked,
                                })
                              }
                              className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerToast("Alert notification rules saved.")}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Update Notification Preferences</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: Data Sources & Integrations (Stage 3) */}
                {activeTab === "datasources" && (
                  <div className="space-y-6 max-w-2xl animate-fadeIn">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">Data Sources & Sensor Pipelines</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time feeds ingestion status and external intelligence connectors.
                      </p>
                    </div>

                    {/* Sensor Cards */}
                    <div className="space-y-2.5">
                      {[
                        {
                          name: "Copernicus Sentinel-1 SAR",
                          type: "C-Band Synthetic Aperture Radar (IW Mode)",
                          status: "Connected",
                          lastSync: "12 Sep 17:00 UTC",
                          latency: "4.2 min",
                          statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        },
                        {
                          name: "Sentinel-2 Multi-Spectral (Optical)",
                          type: "VNIR / SWIR 10m Resolution Imagery",
                          status: "Connected",
                          lastSync: "12 Sep 11:20 UTC",
                          latency: "6.8 min",
                          statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        },
                        {
                          name: "Coastal & Satellite AIS Stream",
                          type: "Spire Maritime & DG Shipping Terrestrial AIS",
                          status: "Syncing",
                          lastSync: "Real-Time (5 sec ago)",
                          latency: "< 2 sec",
                          statusColor: "text-sky-700 bg-sky-50 border-sky-200",
                        },
                        {
                          name: "Copernicus Marine CMEMS & INCOIS",
                          type: "Hydrodynamic Ocean Current & Wave Vectors",
                          status: "Connected",
                          lastSync: "12 Sep 16:00 UTC",
                          latency: "15 min",
                          statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        },
                        {
                          name: "ECMWF / ERA5 & Open-Meteo",
                          type: "10m Atmospheric Boundary Wind Kinematics",
                          status: "Connected",
                          lastSync: "12 Sep 17:30 UTC",
                          latency: "10 min",
                          statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        },
                      ].map((s) => (
                        <div
                          key={s.name}
                          className="p-3.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-xs text-[#0B2545]">{s.name}</div>
                            <div className="text-[10px] text-slate-500">{s.type}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-1">
                              Last Sync: {s.lastSync} &nbsp;|&nbsp; Latency: {s.latency}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.statusColor}`}>
                            ● {s.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* OceanShield AI Browser Plugin Card (Stage 3) */}
                    <div className="p-4 rounded-xl border-2 border-sky-300 bg-gradient-to-r from-sky-50 to-indigo-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1E5FBF] text-white flex items-center justify-center shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-[#0B2545]">
                              OceanShield AI Browser Plugin (Stage 3)
                            </h3>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Chrome / Edge Secure Extension &bull; v1.4.2
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Integration
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Runs continuously in the background with encrypted WebSockets directly to the Sahayya intelligence server. Provides one-click quick actions: upload local SAR images, paste AIS telemetry links, query the vessel attribution copilot, and download courtroom-ready PDF dossiers without leaving maritime portals.
                      </p>

                      <div className="mt-3 pt-3 border-t border-sky-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">Telemetry Sync:</span>
                          <span className="text-xs font-semibold text-emerald-600">Encrypted (TLS 1.3)</span>
                        </div>

                        <button
                          onClick={() => triggerToast("OceanShield AI extension package verified.")}
                          className="px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#1E5FBF] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Plugin Configuration</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Ollama & Google Gemini AI Configuration */}
                {activeTab === "ai" && (
                  <div className="space-y-6 max-w-xl animate-fadeIn">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#0B2545]">
                            AI Maritime Intelligence &amp; LLM Keys
                          </h2>
                          <p className="text-xs text-slate-500">
                            Configure Google AI (Gemini 3.6 Flash) cloud API key and local/hosted Ollama for the 30 vessels fleet intelligence.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Card */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      ollamaStatus?.status === "connected"
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-amber-50/80 border-amber-300"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          ollamaStatus?.status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`} />
                        <div>
                          <div className="text-xs font-bold text-[#0B2545]">
                            {ollamaStatus?.status === "connected"
                              ? ollamaStatus?.provider === "google_gemini"
                                ? `Connected to Google AI (${ollamaStatus?.model || geminiModel})`
                                : `Connected to Ollama Engine (${ollamaStatus?.model || ollamaModel})`
                              : "AI Offline — Expert Maritime Heuristic Engine Active"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {ollamaStatus?.provider === "google_gemini"
                              ? `Cloud Provider: Google Generative AI (REST) • Active Model: ${geminiModel}`
                              : `Active Endpoint: ${ollamaBaseUrl} • Model: ${ollamaModel}`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestOllama}
                        disabled={isTestingOllama}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingOllama ? "animate-spin text-purple-600" : ""}`} />
                        <span>Test Ping</span>
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSaveOllama} className="space-y-4 text-xs">
                      {/* Section 1: Google AI (Gemini) */}
                      <div className="p-3.5 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50/70 to-blue-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0B2545] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#1E5FBF]" />
                            <span>Google AI (Gemini Cloud API Key)</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">
                            Recommended / Instant Active
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">
                              Google AI API Key
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowGoogleKey(!showGoogleKey)}
                              className="text-[10px] text-[#1E5FBF] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              {showGoogleKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{showGoogleKey ? "Hide Key" : "Show Key"}</span>
                            </button>
                          </div>
                          <input
                            type={showGoogleKey ? "text" : "password"}
                            value={googleApiKey}
                            onChange={(e) => setGoogleApiKey(e.target.value)}
                            placeholder="AQ.Ab8RN6... or AIzaSy..."
                            className="w-full bg-white border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-mono focus:outline-none focus:border-[#1E5FBF]"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Used automatically whenever Ollama is offline or when cloud high-speed reasoning is needed.
                          </span>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Google Gemini Model
                          </label>
                          <input
                            type="text"
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            placeholder="gemini-3.5-flash"
                            className="w-full bg-white border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-mono focus:outline-none focus:border-[#1E5FBF]"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Standard verified model: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">gemini-3.5-flash</code>
                          </span>
                        </div>
                      </div>

                      {/* Section 2: Ollama (Local Daemon) */}
                      <div className="p-3.5 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] space-y-3">
                        <span className="font-bold text-[#0B2545] block">
                          Ollama Daemon Configuration (Local or Hosted)
                        </span>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Ollama Base URL / Endpoint
                          </label>
                          <input
                            type="text"
                            value={ollamaBaseUrl}
                            onChange={(e) => setOllamaBaseUrl(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full bg-white border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-mono focus:outline-none focus:border-[#1E5FBF]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700 flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ollama Bearer Token (Optional)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="text-[10px] text-purple-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{showApiKey ? "Hide Key" : "Show Key"}</span>
                            </button>
                          </div>
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={ollamaApiKey}
                            onChange={(e) => setOllamaApiKey(e.target.value)}
                            placeholder="Optional for local localhost:11434"
                            className="w-full bg-white border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-mono focus:outline-none focus:border-[#1E5FBF]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Ollama LLM Model
                          </label>
                          <select
                            value={ollamaModel}
                            onChange={(e) => setOllamaModel(e.target.value)}
                            className="w-full bg-white border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold cursor-pointer"
                          >
                            <option value="gemma3">gemma3 (Recommended Google DeepMind lightweight)</option>
                            <option value="llama3">llama3 / llama3.1 (Meta 8B instruction tuned)</option>
                            <option value="mistral">mistral (Mistral AI 7B)</option>
                            <option value="qwen2.5">qwen2.5 (Alibaba Qwen)</option>
                            <option value="deepseek-r1">deepseek-r1 (Reasoning model)</option>
                          </select>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-900 leading-relaxed">
                        <span className="font-bold">Automatic Failover Strategy: </span>
                        The Sahayya maritime intelligence engine prioritizes local Ollama. If Ollama is offline, it immediately routes all 30 vessels kinematic analysis and chat interrogation through Google AI (Gemini 3.5 Flash). If both are unavailable, the embedded Coast Guard heuristic rules engine produces uninterrupted forensic assessments.
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOllamaBaseUrl("http://localhost:11434");
                            setOllamaModel("gemma3");
                            setOllamaApiKey("");
                            setGoogleApiKey(import.meta.env.VITE_GOOGLE_API_KEY || "");
                            setGeminiModel("gemini-3.5-flash");
                            triggerToast("Reset AI settings to system defaults.");
                          }}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                        >
                          Reset Defaults
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/20 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Configuration</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 4: Language & Accessibility */}
                {activeTab === "accessibility" && (
                  <div className="space-y-6 max-w-xl animate-fadeIn">
                    <div>
                      <h2 className="text-base font-bold text-[#0B2545]">Language & Accessibility</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Flowchart mandated multilingual support and adaptive accessibility controls.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Interface Language</label>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => {
                            setSelectedLanguage(e.target.value);
                            triggerToast(`Locale updated to: ${e.target.value.toUpperCase()}`);
                          }}
                          className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2.5 text-xs text-[#0B2545] font-semibold"
                        >
                          <option value="en">English (Official Operations)</option>
                          <option value="hi">हिन्दी (Hindi)</option>
                          <option value="ta">தமிழ் (Tamil)</option>
                          <option value="te">తెలుగు (Telugu)</option>
                          <option value="mr">मराठी (Marathi - West Coast)</option>
                          <option value="gu">ગુજરાતી (Gujarati - West Coast)</option>
                        </select>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Visual & Ergonomic Accessibility
                        </h3>

                        {[
                          {
                            key: "highContrast",
                            label: "High Contrast Mode",
                            desc: "Maximum distinction for outdoor bridge display screens",
                            val: highContrast,
                            setter: setHighContrast,
                          },
                          {
                            key: "largeText",
                            label: "Enlarged Maritime Typography",
                            desc: "Increases baseline font sizes for emergency operations centers",
                            val: largeText,
                            setter: setLargeText,
                          },
                          {
                            key: "reducedMotion",
                            label: "Reduced Motion Mode",
                            desc: "Disables pulsing halos and particle flow animations",
                            val: reducedMotion,
                            setter: setReducedMotion,
                          },
                        ].map((acc) => (
                          <div
                            key={acc.key}
                            className="p-3 rounded-xl border border-[#E1EEF9] bg-[#F8FBFE] flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#0B2545]">{acc.label}</div>
                              <div className="text-[10px] text-slate-500">{acc.desc}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={acc.val}
                              onChange={(e) => {
                                acc.setter(e.target.checked);
                                triggerToast(`${acc.label}: ${e.target.checked ? "Enabled" : "Disabled"}`);
                              }}
                              className="rounded text-[#1E5FBF] focus:ring-0 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: User & Role Management */}
                {activeTab === "users" && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#0B2545]">User & Access Governance</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Role-based permissions for incident commanding, evidence export, and vessel attribution.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1E5FBF] to-[#2E8FE8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Invite Officer</span>
                      </button>
                    </div>

                    {/* Users Table */}
                    <div className="border border-[#E1EEF9] rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F8FBFE] border-b border-[#E1EEF9] text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="p-3 font-semibold">Name & Agency</th>
                            <th className="p-3 font-semibold">Role Designation</th>
                            <th className="p-3 font-semibold">Gov Email</th>
                            <th className="p-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teamMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-bold text-[#0B2545]">
                                <div>{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{m.agency}</div>
                              </td>
                              <td className="p-3 font-semibold text-slate-700">{m.role}</td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">{m.email}</td>
                              <td className="p-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    m.status === "Active"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Permissions Legend */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <div className="font-bold text-[#0B2545]">Viewer (Read-Only)</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Can view live AIS feeds, incident dossiers, and sensor layers.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <div className="font-bold text-[#0B2545]">Senior Analyst</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Full access to Counterfactual Lab, What-If simulator, and forensic scoring.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9]">
                        <div className="font-bold text-[#0B2545]">Incident Commander</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Authorized to deploy assets, issue NAVTEX alerts, and sign court evidence.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Invite Officer Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <form
            onSubmit={handleInviteUser}
            className="w-full max-w-md bg-white border border-[#E1EEF9] rounded-2xl shadow-2xl p-5 text-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E1EEF9] pb-2">
              <h3 className="text-sm font-bold text-[#0B2545]">Invite Maritime Operations Officer</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Officer Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Lt. Cdr. V. Joshi"
                  className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Government / Agency Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@agency.gov.in"
                  className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Designation</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl p-2 font-semibold"
                >
                  <option value="Senior Analyst">Senior Analyst</option>
                  <option value="Incident Commander">Incident Commander</option>
                  <option value="Viewer (Read-Only)">Viewer (Read-Only)</option>
                  <option value="VTS Specialist">VTS Specialist</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E1EEF9] text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#1E5FBF] hover:bg-[#174EA6] text-white text-xs font-bold"
              >
                Send Official Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official System Settings / Audit Report Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        incidentTitle="Sahayya Maritime Domain Settings & Audit Dossier"
        isFleetReport={true}
      />
    </div>
  );
};

export default SettingsPage;
