import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach JWT token if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("sahayya_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Service Interface
export const sahayyaApi = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post("/auth/login", { email, password });
      if (response.data?.access_token) {
        localStorage.setItem("sahayya_token", response.data.access_token);
        localStorage.setItem("sahayya_user", JSON.stringify(response.data.user));
      }
      return response.data;
    },
    register: async (userData: { name: string; email: string; password: string; role?: string; organization?: string }) => {
      const response = await apiClient.post("/auth/register", userData);
      if (response.data?.access_token) {
        localStorage.setItem("sahayya_token", response.data.access_token);
        localStorage.setItem("sahayya_user", JSON.stringify(response.data.user));
      }
      return response.data;
    },
    logout: async () => {
      try {
        await apiClient.post("/auth/logout");
      } finally {
        localStorage.removeItem("sahayya_token");
        localStorage.removeItem("sahayya_user");
      }
    },
    getMe: async () => {
      const response = await apiClient.get("/auth/me");
      return response.data;
    },
  },

  // Incidents
  incidents: {
    list: async (params?: { status?: string; min_severity?: number; region?: string; search?: string; limit?: number; offset?: number }) => {
      const response = await apiClient.get("/incidents", { params });
      return response.data;
    },
    get: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}`);
      return response.data;
    },
    getSpillDNA: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}/spill-dna`);
      return response.data;
    },
    getOriginZone: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}/origin-zone`);
      return response.data;
    },
    getSpillEvolution: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}/spill-evolution`);
      return response.data;
    },
    getImpactAssessment: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}/impact-assessment`);
      return response.data;
    },
    getActivityLog: async (idOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${idOrCode}/activity-log`);
      return response.data;
    },
    addNote: async (idOrCode: string | number, note: string) => {
      const response = await apiClient.post(`/incidents/${idOrCode}/notes`, { note });
      return response.data;
    },
    updateStatus: async (idOrCode: string | number, status: string) => {
      const response = await apiClient.patch(`/incidents/${idOrCode}/status`, { status });
      return response.data;
    },
  },

  // Vessels
  vessels: {
    list: async (params?: { vessel_type?: string; flag?: string; search?: string; limit?: number; offset?: number }) => {
      const response = await apiClient.get("/vessels", { params });
      return response.data;
    },
    get: async (vesselId: number | string) => {
      const response = await apiClient.get(`/vessels/${vesselId}`);
      return response.data;
    },
    getPositions: async (vesselId: number | string, hours: number = 48) => {
      const response = await apiClient.get(`/vessels/${vesselId}/positions`, { params: { hours } });
      return response.data;
    },
    getAsiEvents: async (vesselId: number | string) => {
      const response = await apiClient.get(`/vessels/${vesselId}/asi-events`);
      return response.data;
    },
    getAttributions: async (incidentIdOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${incidentIdOrCode}/vessel-attributions`);
      return response.data;
    },
    getAttributionEvidence: async (attributionId: number | string) => {
      const response = await apiClient.get(`/vessel-attributions/${attributionId}/evidence`);
      return response.data;
    },
    getEvidence: async (
      vesselId: number | string,
      telemetry?: {
        speed_kts?: number;
        lat?: number;
        lon?: number;
        heading_deg?: number;
        vessel_type?: string;
        flag?: string;
        name?: string;
      }
    ) => {
      const cleanId = String(vesselId).replace("vessel-", "");
      const response = await apiClient.get(`/vessels/evidence/lookup`, {
        params: {
          identifier: cleanId,
          ...telemetry,
        },
      });
      return response.data;
    },
  },

  // Counterfactual & Forecast
  simulation: {
    runCounterfactual: async (incidentIdOrCode: string | number, vesselId: number, parameters?: Record<string, any>) => {
      const response = await apiClient.post(`/incidents/${incidentIdOrCode}/counterfactual`, {
        vessel_id: vesselId,
        parameters,
      });
      return response.data;
    },
    getCounterfactualStatus: async (jobId: string) => {
      const response = await apiClient.get(`/counterfactual-jobs/${jobId}`);
      return response.data;
    },
    getForecast: async (incidentIdOrCode: string | number, hours: number = 24) => {
      const response = await apiClient.get(`/incidents/${incidentIdOrCode}/forecast`, { params: { hours } });
      return response.data;
    },
  },

  // Response & Assets
  response: {
    getActions: async (incidentIdOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${incidentIdOrCode}/response-actions`);
      return response.data;
    },
    updateAction: async (actionId: number, status: string) => {
      const response = await apiClient.patch(`/response-actions/${actionId}`, { status });
      return response.data;
    },
    getPriorityZones: async (incidentIdOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${incidentIdOrCode}/priority-zones`);
      return response.data;
    },
    getNearbyAssets: async (lat?: number, lng?: number) => {
      const response = await apiClient.get("/coast-guard-assets/nearby", { params: { lat, lng } });
      return response.data;
    },
  },

  // Recovery
  recovery: {
    getRecords: async (incidentIdOrCode: string | number) => {
      const response = await apiClient.get(`/incidents/${incidentIdOrCode}/recovery`);
      return response.data;
    },
  },

  // Ports
  ports: {
    list: async () => {
      const response = await apiClient.get("/ports");
      return response.data;
    },
  },

  // Reports
  reports: {
    generate: async (incidentIdOrCode: string | number, reportType: string = "INCIDENT_DOSSIER") => {
      const response = await apiClient.post(`/incidents/${incidentIdOrCode}/generate-report`, { report_type: reportType });
      return response.data;
    },
    generateFleetReport: async () => {
      const response = await apiClient.post("/vessels/generate-report");
      return response.data;
    },
    getStatus: async (jobId: string) => {
      const response = await apiClient.get(`/reports/${jobId}/status`);
      return response.data;
    },
    getDownloadUrl: (reportId: number, inline: boolean = false) =>
      `${API_BASE_URL}/reports/${reportId}/download${inline ? "?view=inline" : ""}`,
  },

  // Map fleet
  map: {
    getIncidents: async () => {
      const response = await apiClient.get("/map/incidents");
      return response.data;
    },
    getVessels: async (bounds?: string) => {
      const response = await apiClient.get("/map/vessels", { params: { bounds } });
      return response.data;
    },
  },

  // Ollama AI Intelligence
  ai: {
    getStatus: async () => {
      const response = await apiClient.get("/ai/status");
      return response.data;
    },
    updateConfig: async (config: {
      base_url?: string;
      model?: string;
      api_key?: string;
      google_api_key?: string;
      gemini_model?: string;
    }) => {
      const response = await apiClient.post("/ai/config", config);
      return response.data;
    },
    getVesselAnalysis: async (vesselId: number | string) => {
      const numericId = typeof vesselId === "string" ? vesselId.replace("vessel-", "") : vesselId;
      const response = await apiClient.get(`/ai/vessels/${numericId}/analysis`);
      return response.data;
    },
    analyzeVesselPayload: async (vesselPayload: Record<string, any>) => {
      const response = await apiClient.post("/ai/vessels/analysis", vesselPayload);
      return response.data;
    },
    chat: async (prompt: string, vesselContext?: Record<string, any>, vesselId?: number) => {
      const response = await apiClient.post("/ai/chat", {
        prompt,
        vessel_id: vesselId,
        vessel_context: vesselContext,
      });
      return response.data;
    },
  },
};

export default sahayyaApi;
