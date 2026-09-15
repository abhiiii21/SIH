/**
 * TypeScript definitions for Sahayya Tactical Maritime Platform.
 */

export interface SpillFeatureProperties {
  slick_id: string;
  area_km2: number;
  perimeter_km: number;
  centroid: [number, number]; // [lat, lon]
  bounding_box: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  confidence_score: number;
  slick_classification: string;
  estimated_thickness_um: number;
}

export interface SpillFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: SpillFeatureProperties;
}

export interface SpillDetectionResponse {
  type: "FeatureCollection";
  features: SpillFeature[];
  summary: {
    filename: string;
    total_slicks: number;
    total_area_km2: number;
    total_perimeter_km: number;
    estimated_volume_m3: number;
    primary_centroid: [number, number]; // [lat, lon]
    bounding_box: [number, number, number, number];
    weathering_index: number;
    inference_mode: string;
    acquisition_satellite: string;
    polarization: string;
    status?: string;
  };
}

export interface EnvironmentalTelemetry {
  wind_speed_ms: number;
  wind_direction_deg: number;
  current_speed_ms: number;
  current_direction_deg: number;
  wave_height_m: number;
  temperature_c: number;
  u_wind: number;
  v_wind: number;
  u_current: number;
  v_current: number;
}

export interface DriftStep {
  step_index: number;
  relative_hour: number;
  coordinates: [number, number]; // [lat, lon]
  uncertainty_radius_km: number;
  evaporated_percentage: number;
  water_emulsification_percentage: number;
  relative_viscosity_factor: number;
}

export interface DriftSimulationResponse {
  hours: number;
  mode: "HINDCAST" | "FORECAST";
  net_drift_speed_ms: number;
  net_drift_speed_knots: number;
  net_drift_heading_deg: number;
  environmental_telemetry: EnvironmentalTelemetry;
  steps: DriftStep[];
  origin_window_bbox: [number, number, number, number];
  terminal_centroid: [number, number];
  geojson: {
    type: "FeatureCollection";
    features: any[];
  };
}

export interface AnomalyEvent {
  code: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  description: string;
  timestamp: string;
}

export interface AISVesselTrack {
  type: "Feature";
  id: string;
  geometry: {
    type: "LineString";
    coordinates: number[][]; // [[lon, lat], ...]
  };
  properties: {
    mmsi: number;
    vessel_name: string;
    liability_pct: number;
    cpa_km: number;
    avg_sog_kts: number;
  };
}

export interface SuspectVessel {
  attribution_rank: number;
  mmsi: number;
  imo: string;
  vessel_name: string;
  vessel_type: string;
  flag: string;
  callsign: string;
  dwt: number;
  liability_probability_pct: number;
  closest_approach_km: number;
  cpa_timestamp: string;
  min_sog_knots: number;
  avg_sog_knots: number;
  course_variance_deg: number;
  max_transponder_gap_mins: number;
  risk_classification: "PRIMARY_SUSPECT" | "MODERATE_SUSPECT" | "CLEAR_TRANSIT";
  type_risk_badge: string;
  anomalies: AnomalyEvent[];
  last_known_position: [number, number]; // [lat, lon]
  cpa_position: [number, number]; // [lat, lon]
  track_geojson: AISVesselTrack;
}

export interface AISAttributionResponse {
  suspects_count: number;
  primary_suspect: SuspectVessel | null;
  ranked_suspects: SuspectVessel[];
  tracks_geojson: {
    type: "FeatureCollection";
    features: AISVesselTrack[];
  };
}

export interface SystemHealth {
  status: string;
  system: string;
  sar_inference_mode: string;
  sample_geotiff_ready: boolean;
  sample_ais_ready: boolean;
  api_version: string;
}
