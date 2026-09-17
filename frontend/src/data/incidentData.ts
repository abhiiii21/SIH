export interface VesselCandidate {
  id: string;
  rank: number;
  name: string;
  score: number;
  imo: string;
  type: string;
  flag: string;
  flagCode: string;
  flagEmoji: string;
  cpa: string;
  minSog: string;
  aisGap: string;
  currentSpeed: string;
  course: string;
  lastAis: string;
  image?: string;
  evidence?: {
    trajectoryMatch: number;
    aisAnomalyScore: number;
    speedDropCorrelation: number;
    dischargePhysicsMatch: number;
    notes: string;
  };
}

export interface SatellitePass {
  id: number;
  label: string;
  time: string;
  polarization: string;
  polygons: string;
  centroid: string;
  productId: string;
  image: string;
}

export interface TimelinePoint {
  label: string;
  timeOffset: string;
  timestamp: string;
  areaKm2: number;
  confidence: number;
  status: "Past (Hindcast)" | "Detected (Present)" | "Forecast (Projected)";
}

export const INCIDENT_DATA = {
  id: "IN-MH-2026",
  name: "Mumbai High Offshore",
  subtitle: "IN-MH-2026  |  Detected 12 Sep 2026 17:00 UTC  |  Arabian Sea",
  sector: "Arabian Sea / Western EEZ",
  detectedTime: "12 Sep 2026 17:00 UTC",
  reportedTime: "12 Sep 2026 17:55 UTC",
  status: "Live Incident",
  coordinates: "18.9997°N, 72.5502°E",
  
  weather: {
    summary: "Moderate Conditions",
    wind: "5.1 m/s · Waves 1.0 m · SST 28.3°C",
    windDetail: "5.1 m/s (289°W)",
    currentDetail: "0.67 m/s (189°S)",
    waves: "1.0 m",
    sst: "28.3°C",
  },

  statCards: [
    {
      id: "spill-area",
      label: "Spill Area",
      value: "276.04 km²",
      trend: "+12.4% vs previous pass",
      trendType: "danger",
      footer: "Sentinel-1 SAR · 12 Sep 17:00 UTC",
      info: {
        title: "Spill Area",
        description: "Total surface area of detected oil slick from SAR segmentation mask.",
        method: "U-Net v2.1 (SAR)",
        source: "Copernicus Sentinel-1",
        lastUpdated: "12 Sep 2026 17:00 UTC",
        linkText: "View Technical Details →",
      },
    },
    {
      id: "detection-confidence",
      label: "Detection Confidence",
      value: "92.4 %",
      trend: "High confidence",
      trendType: "success",
      footer: "U-Net v2.1 (SAR) · 12 Sep 17:00 UTC",
      info: {
        title: "Detection Confidence",
        description: "Machine learning segmentation certainty based on VV/VH dual-pol speckle ratio and wind backscatter thresholding.",
        method: "Adaptive Sigma0 + Deep U-Net",
        source: "Copernicus Sentinel-1",
        lastUpdated: "12 Sep 2026 17:00 UTC",
      },
    },
    {
      id: "probable-origin",
      label: "Probable Origin",
      value: "18.78°N, 72.51°E",
      trend: "Window: 18–30 hours ago",
      trendType: "neutral",
      footer: "OpenDrift (Hindcast) · 12 Sep 17:00 UTC",
      info: {
        title: "Probable Origin Zone",
        description: "Reverse Lagrangian particle tracking calculated with HYCOM ocean currents and ECMWF 10m wind fields.",
        method: "OpenDrift Lagrangian Particle Tracker v1.9",
        source: "INCOIS / ECMWF Current Vectors",
        lastUpdated: "12 Sep 2026 17:00 UTC",
      },
    },
    {
      id: "top-candidate",
      label: "Top Source Candidate",
      value: "MT PACIFIC VOYAGER",
      trend: "98.8 % attribution",
      trendType: "danger",
      footer: "IMO 9438200 | Crude Oil Tanker",
      info: {
        title: "Vessel Attribution Confidence",
        description: "Correlated kinematic AIS track with hindcast dispersion cone, speed anomaly detection, and dark ship gap matching.",
        method: "Spatiotemporal AIS Cross-Correlator",
        source: "Coast Guard Coastal Radar & Satellite AIS",
        lastUpdated: "12 Sep 2026 16:42 UTC",
      },
    },
    {
      id: "time-to-coast",
      label: "Time to Coast",
      value: "~ 16.4 hours",
      trend: "Distance: 38 km",
      trendType: "warning",
      footer: "OpenDrift (Forecast)",
      info: {
        title: "Estimated Shoreline Impact Window",
        description: "Projected time before heavy leading slick edges make landfall on the Maharashtra coastal belt without containment intervention.",
        method: "Eulerian Dispersion Model",
        source: "OpenDrift v1.9 + INCOIS Wave Model",
        lastUpdated: "12 Sep 2026 17:00 UTC",
      },
    },
    {
      id: "severity-score",
      label: "Severity Score",
      value: "82 / 100",
      trend: "High Risk",
      trendType: "danger",
      footer: "See breakdown →",
      isBreakdown: true,
      breakdown: [
        { name: "Spill Volume Index", score: 88, weight: "30%", detail: "Slick area exceeds 250 km² with heavy central sheen" },
        { name: "Coastal Proximity Risk", score: 84, weight: "25%", detail: "Landfall projected < 18 hours at Maharashtra shoreline" },
        { name: "Ecological Vulnerability", score: 76, weight: "25%", detail: "Direct heading towards sensitive Marine Protected Area" },
        { name: "Weather Escalation", score: 68, weight: "20%", detail: "Winds shifting westward increasing dispersion spread" },
      ],
      info: {
        title: "Severity Risk Index",
        description: "Multi-parameter environmental impact and legal attribution priority rating computed under IMO OPRC guidelines.",
        method: "Multi-Criteria Maritime Risk Assessment",
        source: "Ministry of Defence Automated MDA Engine",
        lastUpdated: "12 Sep 2026 17:00 UTC",
      },
    },
  ],

  satelliteObservation: {
    instrument: "Sentinel-1A (C-band, IW)",
    passes: [
      {
        id: 1,
        label: "12 Sep 17:00 UTC (Current)",
        time: "12 Sep 17:00 UTC",
        polarization: "VV + VH (Dual-Pol)",
        polygons: "3 (1 primary, 2 fragments)",
        centroid: "18.9997°N, 72.5502°E",
        productId: "S1A_IW_GRDH_1SDV",
        image: "/sar-pass.jpg",
      },
      {
        id: 2,
        label: "12 Sep 05:00 UTC (-12h)",
        time: "12 Sep 05:00 UTC",
        polarization: "VV (Single-Pol)",
        polygons: "2 (initial slick)",
        centroid: "18.8841°N, 72.5210°E",
        productId: "S1B_IW_GRDH_1SDV",
        image: "/sar-pass.jpg",
      },
      {
        id: 3,
        label: "11 Sep 17:00 UTC (-24h)",
        time: "11 Sep 17:00 UTC",
        polarization: "VV + VH (Dual-Pol)",
        polygons: "1 (nascent discharge)",
        centroid: "18.7810°N, 72.5098°E",
        productId: "S1A_IW_GRDH_1SDV",
        image: "/sar-pass.jpg",
      },
    ],
  },

  vessels: [
    {
      id: "vessel-1",
      rank: 1,
      name: "MT PACIFIC VOYAGER",
      score: 98.8,
      imo: "9438200",
      type: "Crude Oil Tanker",
      flag: "Liberia",
      flagCode: "LR",
      flagEmoji: "LR",
      cpa: "27.46 km",
      minSog: "1.4 kts",
      aisGap: "94 min",
      currentSpeed: "1.4 kts",
      course: "312°",
      lastAis: "12 Sep 16:42 UTC",
      image: "/tanker.jpg",
      evidence: {
        trajectoryMatch: 99.4,
        aisAnomalyScore: 97.2,
        speedDropCorrelation: 98.2,
        dischargePhysicsMatch: 94.7,
        notes: "Vessel reduced speed drastically from 13.8 kts to 1.4 kts inside probable discharge ellipse between 21:00 UTC and 01:30 UTC. AIS transponder was inactive for 94 consecutive minutes during darkness. Ballast tank capacity and crude wash signature highly consistent with detected hydrocarbon slick composition.",
      },
    },
    {
      id: "vessel-2",
      rank: 2,
      name: "CMA CGM ANTARES",
      score: 43.5,
      imo: "9723411",
      type: "Container Vessel",
      flag: "France",
      flagCode: "FR",
      flagEmoji: "FR",
      cpa: "41.2 km",
      minSog: "14.2 kts",
      aisGap: "0 min",
      currentSpeed: "14.8 kts",
      course: "148°",
      lastAis: "12 Sep 16:55 UTC",
      evidence: {
        trajectoryMatch: 41.5,
        aisAnomalyScore: 12.0,
        speedDropCorrelation: 18.4,
        dischargePhysicsMatch: 35.0,
        notes: "Maintained steady speed on standard shipping corridor. No AIS interruptions recorded. Low probability of intentional bilge or ballast release.",
      },
    },
    {
      id: "vessel-3",
      rank: 3,
      name: "MV NORDIC TRADER",
      score: 43.5,
      imo: "9315678",
      type: "Bulk Carrier",
      flag: "Panama",
      flagCode: "PA",
      flagEmoji: "PA",
      cpa: "39.8 km",
      minSog: "11.5 kts",
      aisGap: "12 min",
      currentSpeed: "11.2 kts",
      course: "180°",
      lastAis: "12 Sep 16:50 UTC",
      evidence: {
        trajectoryMatch: 46.2,
        aisAnomalyScore: 28.5,
        speedDropCorrelation: 22.0,
        dischargePhysicsMatch: 42.1,
        notes: "Vessel transited south-bound along peripheral hindcast boundary. Minor 12-minute transponder latency during storm squall.",
      },
    },
    {
      id: "vessel-4",
      rank: 4,
      name: "SAGAR SHAKTI",
      score: 13.9,
      imo: "9554410",
      type: "Supply Vessel",
      flag: "India",
      flagCode: "IN",
      flagEmoji: "IN",
      cpa: "54.1 km",
      minSog: "8.9 kts",
      aisGap: "0 min",
      currentSpeed: "9.1 kts",
      course: "045°",
      lastAis: "12 Sep 16:30 UTC",
      evidence: {
        trajectoryMatch: 12.0,
        aisAnomalyScore: 5.0,
        speedDropCorrelation: 8.5,
        dischargePhysicsMatch: 15.0,
        notes: "Offshore platform support vessel operating within designated oilfield concession. Clear radar and AIS tracking record throughout period.",
      },
    },
  ],

  responsePlan: {
    tier: "Z-03 (High)",
    designatedAsset: "ICGS Vikram",
    eta: "2h 18m",
    mission: "Deploy for surveillance & containment",
    recommendation: "Immediate interception, forensic fuel/ballast sampling, and deployment of ocean containment boom (500m) with high-capacity skimmers.",
    alternateAssets: [
      { name: "ICGS Samarth", type: "Offshore Patrol Vessel", eta: "3h 45m", port: "Mumbai Naval Dockyard" },
      { name: "Dornier-228", type: "Maritime Recon Aircraft", eta: "45m", base: "INS Shikra" },
      { name: "ICGS Samudra Prahari", type: "Specialized PCV", eta: "4h 10m", port: "JNPT Harbor" },
    ],
    routeAnalysis: {
      interceptBearing: "308° NW",
      seaState: "Beaufort Scale 3 (Slight seas)",
      transitDistance: "41.8 NM",
      containmentEfficiency: "94% optimal within 4-hour window",
    },
    weatherWindow: {
      next24Hours: "Favorable sea state (1.0m to 1.3m waves)",
      windForecast: "Backing to NW 12-15 kts by 13 Sep 06:00 UTC",
      operationalStatus: "GO for all air & surface containment assets",
    },
  },

  proximityAnalysis: {
    closestCoastline: {
      name: "Closest Coastline",
      value: "38 km (Maharashtra)",
      detail: "Alibaug & Raigad district coastal belt",
    },
    mpa: {
      name: "Marine Protected Area",
      value: "12.3% overlap (25.8 km²)",
      detail: "Malvan Marine Sanctuary buffer sector",
    },
    fishingZone: {
      name: "Fishing Zone",
      value: "8.7% overlap (18.1 km²)",
      detail: "Trawler nursery & artisanal fishing boundary",
    },
  },

  spillDNA: {
    area: "276.04 km²",
    perimeter: "312.5 km",
    lengthMajor: "31.2 km",
    widthMinor: "12.8 km",
    orientation: "24.6° (NE-SW)",
    shapeIndex: "0.73 (elongated)",
    fragmentation: "Moderate",
    crossSectionMaxThickness: "142 µm (core)",
    crossSectionAvgThickness: "48 µm",
    spectralSignature: "Hydrocarbon aliphatic absorption peak at 3.42 µm, low radar roughness normalized backscatter -24.8 dB",
  },

  timelineFrames: [
    { label: "-24h", timeOffset: "-24h", timestamp: "11 Sep 17:00 UTC", areaKm2: 84.5, confidence: 94.2, status: "Past (Hindcast)" },
    { label: "-12h", timeOffset: "-12h", timestamp: "12 Sep 05:00 UTC", areaKm2: 172.1, confidence: 93.8, status: "Past (Hindcast)" },
    { label: "Now", timeOffset: "0h", timestamp: "12 Sep 17:00 UTC", areaKm2: 276.04, confidence: 92.4, status: "Detected (Present)" },
    { label: "+12h", timeOffset: "+12h", timestamp: "13 Sep 05:00 UTC", areaKm2: 345.8, confidence: 88.0, status: "Forecast (Projected)" },
    { label: "+24h", timeOffset: "+24h", timestamp: "13 Sep 17:00 UTC", areaKm2: 412.0, confidence: 84.5, status: "Forecast (Projected)" },
    { label: "+36h", timeOffset: "+36h", timestamp: "14 Sep 05:00 UTC", areaKm2: 480.2, confidence: 79.2, status: "Forecast (Projected)" },
    { label: "+48h", timeOffset: "+48h", timestamp: "14 Sep 17:00 UTC", areaKm2: 524.6, confidence: 73.0, status: "Forecast (Projected)" },
  ],

  overview: {
    description: "A large oil slick was detected in the Mumbai High offshore region using Sentinel-1 SAR imagery. Preliminary analysis suggests a possible vessel-related discharge. The spill is currently drifting south-west and may approach the Indian coastline within ~16.4 hours.",
    type: "Oil Spill (Suspected)",
    source: "Sentinel-1A (SAR)",
    detected: "12 Sep 2026 17:00 UTC",
    agency: "Indian Coast Guard",
    status: "Live",
    lastUpdated: "12 Sep 2026 17:55 UTC",
  },

  statusStages: [
    {
      id: "detection",
      title: "Detection",
      sublabel: "12 Sep 17:00",
      status: "completed" as const,
      timestamp: "12 Sep 2026 17:00 UTC",
      agency: "Copernicus Sentinel-1 / INCOIS",
      details: "Synthetic Aperture Radar (SAR) pass detected a 276.04 km² anomalous hydrocarbon backscatter signature in the Arabian Sea.",
    },
    {
      id: "analysis",
      title: "Analysis",
      sublabel: "In Progress",
      status: "current" as const,
      timestamp: "12 Sep 2026 17:35 UTC",
      agency: "Sahayya Automated MDA Engine",
      details: "U-Net v2.1 machine learning segmentation, particle dispersion kinematics, and atmospheric wind drift modeling active.",
    },
    {
      id: "attribution",
      title: "Attribution",
      sublabel: "Pending",
      status: "upcoming" as const,
      timestamp: "Estimated: 12 Sep 18:30 UTC",
      agency: "Directorate General of Shipping / Coastal AIS",
      details: "Spatiotemporal trajectory intersection and AIS anomaly correlation for top candidate MT PACIFIC VOYAGER (98.8%).",
    },
    {
      id: "response-planning",
      title: "Response Planning",
      sublabel: "Upcoming",
      status: "upcoming" as const,
      timestamp: "Estimated: 12 Sep 19:00 UTC",
      agency: "Coast Guard Regional HQ (West)",
      details: "Tier Z-03 offshore containment orders prepared for ICGS Vikram and ICGS Samudra Prahari.",
    },
    {
      id: "closed",
      title: "Closed",
      sublabel: "Upcoming",
      status: "upcoming" as const,
      timestamp: "Pending Incident Containment",
      agency: "Ministry of Defence",
      details: "Final containment verification, environmental restoration assessment, and maritime court documentation.",
    },
  ],

  carouselImages: [
    {
      id: "platform-hero",
      title: "Mumbai High (B-Platform) ~120 NE",
      caption: "Offshore production installation with visible hydrocarbon surface sheen and response cutter on station",
      url: "/offshore-platform.jpg",
      callout: "Mumbai High (B-Platform) ~120 NE",
    },
    {
      id: "aerial-drone",
      title: "Aerial Drone Reconnaissance (FLT-07)",
      caption: "High-altitude reconnaissance showing core dark emulsion (14.5 km²) and iridescent rainbow sheen boundary",
      url: "/aerial-slick-recon.jpg",
      callout: "Core Crude (CR): 14.5 km²",
    },
    {
      id: "sar-radar-composite",
      title: "Sentinel-1A SAR Pass Composite",
      caption: "VV + VH dual-polarization SAR surface roughness decrease delineating slick outer periphery",
      url: "/sar-pass.jpg",
      callout: "Centroid: 18.78°N, 72.51°E",
    },
  ],

  activityLog: [
    { id: 1, text: "Sentinel-1A image analysed", time: "12 Sep 17:05", status: "completed" as const },
    { id: 2, text: "Oil slick delineated (Area: 276.04 km²)", time: "12 Sep 17:20", status: "completed" as const },
    { id: 3, text: "Environmental model run completed", time: "12 Sep 17:35", status: "completed" as const },
    { id: 4, text: "Vessel candidates identified", time: "12 Sep 18:10", status: "pending" as const },
    { id: 5, text: "Impact assessment initiated", time: "12 Sep 18:25", status: "in-progress" as const },
    { id: 6, text: "Response plan drafting started", time: "12 Sep 18:40", status: "pending" as const },
  ],

  responseChecklist: [
    { id: "act-1", label: "Alert relevant authorities", completed: true },
    { id: "act-2", label: "Initiate surveillance (satellite / aerial)", completed: true },
    { id: "act-3", label: "Deploy response assets", completed: false },
    { id: "act-4", label: "Coordinate with Indian Coast Guard", completed: false },
    { id: "act-5", label: "Prepare containment strategy", completed: false },
    { id: "act-6", label: "Issue navigational warning (NAVTEX)", completed: false },
  ],
};

export interface ActiveIncidentRecord {
  id: string;
  name: string;
  region: string;
  coordinates: [number, number];
  severity: "Critical" | "High" | "Medium" | "Low";
  severityScore: number;
  areaKm2: number;
  status: "Live Incident" | "Under Investigation" | "Monitored" | "Contained";
  detectedTime: string;
  vesselsInAOI: number;
  topSuspect: string;
  source: string;
  description: string;
}

export const ACTIVE_INCIDENTS: ActiveIncidentRecord[] = [
  {
    id: "IN-MH-2026",
    name: "Mumbai High Offshore",
    region: "Arabian Sea (Maharashtra EEZ)",
    coordinates: [18.78, 72.51],
    severity: "Critical",
    severityScore: 82,
    areaKm2: 276.04,
    status: "Live Incident",
    detectedTime: "12 Sep 2026 17:00 UTC",
    vesselsInAOI: 4,
    topSuspect: "MT PACIFIC VOYAGER (98.8%)",
    source: "Sentinel-1A SAR",
    description: "Extensive surface hydrocarbon slick drifting southwest toward Maharashtra coastal zone.",
  },
  {
    id: "IN-GJ-2026",
    name: "Gulf of Khambhat Shoals",
    region: "Northern Arabian Sea (Gujarat)",
    coordinates: [21.15, 72.10],
    severity: "Medium",
    severityScore: 58,
    areaKm2: 64.2,
    status: "Under Investigation",
    detectedTime: "11 Sep 2026 09:20 UTC",
    vesselsInAOI: 2,
    topSuspect: "Unknown Tanker (Bilge Discharge)",
    source: "Sentinel-2 Multi-Spectral",
    description: "Fragmented iridescent sheen detected adjacent to major petrochemical tanker channel.",
  },
  {
    id: "IN-KL-2026",
    name: "Cochin Port Anchorage",
    region: "Southwest Coast (Kerala EEZ)",
    coordinates: [9.94, 76.12],
    severity: "Low",
    severityScore: 34,
    areaKm2: 18.5,
    status: "Monitored",
    detectedTime: "10 Sep 2026 14:15 UTC",
    vesselsInAOI: 6,
    topSuspect: "Bunkering Barge Leak",
    source: "ICG Aerial Dornier Patrol",
    description: "Localized light bunker fuel rainbow sheen under active port boom containment.",
  },
  {
    id: "IN-TN-2026",
    name: "Gulf of Mannar Biosphere",
    region: "Palk Strait / Tamil Nadu",
    coordinates: [8.85, 78.45],
    severity: "Medium",
    severityScore: 52,
    areaKm2: 42.1,
    status: "Contained",
    detectedTime: "09 Sep 2026 22:30 UTC",
    vesselsInAOI: 1,
    topSuspect: "General Cargo MV Star (Resolved)",
    source: "Sentinel-1B SAR",
    description: "Contained sheen sector near coral reef marine national park boundary.",
  },
  {
    id: "IN-OD-2026",
    name: "Paradip Coastal Approach",
    region: "Bay of Bengal (Odisha Coast)",
    coordinates: [20.22, 86.68],
    severity: "Low",
    severityScore: 28,
    areaKm2: 12.0,
    status: "Monitored",
    detectedTime: "08 Sep 2026 11:00 UTC",
    vesselsInAOI: 3,
    topSuspect: "Natural Biogenic / Microscopic Seep",
    source: "Sentinel-1A SAR",
    description: "Minor low-wind backscatter depression verified non-hazardous by coastal patrol.",
  },
];

export interface ResponsePriorityZone {
  id: string;
  name: string;
  priority: 1 | 2 | 3 | 4;
  color: string;
  areaKm2: number;
  sensitivity: "Extreme" | "High" | "Moderate" | "Low";
  reasoning: string;
  recommendedAsset: string;
  coordinates: [number, number][];
}

export const RESPONSE_PRIORITY_ZONES: ResponsePriorityZone[] = [
  {
    id: "zone-1",
    name: "Priority Zone 1: Alibaug Shoreline & Turtle Grounds",
    priority: 1,
    color: "#EF4444",
    areaKm2: 48.6,
    sensitivity: "Extreme",
    reasoning: "Imminent landfall within ~16 hours; direct threat to sandy nesting beaches, mudflats, and village fishing cooperatives.",
    recommendedAsset: "ICGS Vikram (Deploy 800m shoreline boom + skimmers)",
    coordinates: [
      [18.65, 72.82],
      [18.72, 72.78],
      [18.68, 72.90],
      [18.60, 72.88],
    ],
  },
  {
    id: "zone-2",
    name: "Priority Zone 2: JNPT Deepwater Shipping Fairway",
    priority: 2,
    color: "#F97316",
    areaKm2: 62.4,
    sensitivity: "High",
    reasoning: "High-density container carrier navigation corridor; contamination could shut down national port ingress.",
    recommendedAsset: "ICGS Samarth (Stationary skimming & water-spray barrier)",
    coordinates: [
      [18.82, 72.68],
      [18.95, 72.65],
      [18.90, 72.78],
      [18.78, 72.75],
    ],
  },
  {
    id: "zone-3",
    name: "Priority Zone 3: Colaba & Marine Drive Outer Bay",
    priority: 3,
    color: "#F59E0B",
    areaKm2: 35.1,
    sensitivity: "Moderate",
    reasoning: "Metropolitan shoreline visual impact and urban recreational water contamination risk.",
    recommendedAsset: "ICGS C-457 (High-speed barrier surveillance & dispersant patrol)",
    coordinates: [
      [18.88, 72.75],
      [18.96, 72.72],
      [18.94, 72.83],
      [18.86, 72.80],
    ],
  },
  {
    id: "zone-4",
    name: "Priority Zone 4: Offshore Dispersion Core",
    priority: 4,
    color: "#3B82F6",
    areaKm2: 129.9,
    sensitivity: "Moderate",
    reasoning: "Deepwater source slick core; heavy emulsion can be mechanically skimmed before drifting toward coast.",
    recommendedAsset: "ICGS Samudra Prahari (Dynamic offshore sweeping with 1,200m sweep arms)",
    coordinates: [
      [18.72, 72.45],
      [18.84, 72.48],
      [18.80, 72.58],
      [18.70, 72.54],
    ],
  },
];

export const RECOVERY_MONITORING_DATA = {
  overallRemediationPct: 42,
  containmentEfficiency: 78,
  estimatedFullRecovery: "18 Nov 2026 (65 Days remaining)",
  milestones: [
    { id: "m1", label: "Primary Discharge Isolation & Source Capping", date: "12 Sep 18:00 UTC", completed: true },
    { id: "m2", label: "Offshore Containment Boom Deployment (1,200m)", date: "13 Sep 04:30 UTC", completed: true },
    { id: "m3", label: "Mechanical Skimming & Recovery (Phase 1)", date: "13 Sep 16:00 UTC", completed: true },
    { id: "m4", label: "Sensitive Shoreline Barrier Protection", date: "14 Sep 08:00 UTC", completed: false },
    { id: "m5", label: "Microbial Bioremediation & Sediment Neutralization", date: "Estimated 22 Sep 2026", completed: false },
    { id: "m6", label: "Post-Incident Ecological Baseline Restoration", date: "Estimated 18 Nov 2026", completed: false },
  ],
  waterQualityStations: [
    { id: "STN-A", name: "Alibaug Outer Buoy (W-01)", coordinates: [18.66, 72.84] as [number, number], currentWqi: 48, status: "Poor" as const, hydrocarbonsPpm: 14.8 },
    { id: "STN-B", name: "Kashid Coastal Station (W-02)", coordinates: [18.52, 72.90] as [number, number], currentWqi: 74, status: "Moderate" as const, hydrocarbonsPpm: 4.2 },
    { id: "STN-C", name: "Murud Marine Sanctuary (W-03)", coordinates: [18.33, 72.95] as [number, number], currentWqi: 88, status: "Good" as const, hydrocarbonsPpm: 1.1 },
    { id: "STN-D", name: "Mumbai Harbor Entrance (W-04)", coordinates: [18.90, 72.78] as [number, number], currentWqi: 56, status: "Moderate" as const, hydrocarbonsPpm: 8.5 },
  ],
  waterQualityHistory: [
    { time: "T - 36h", hydrocarbonsPpm: 0.2, dissolvedOxygen: 7.2, wqiScore: 94 },
    { time: "T - 24h", hydrocarbonsPpm: 1.8, dissolvedOxygen: 6.8, wqiScore: 88 },
    { time: "T - 12h", hydrocarbonsPpm: 18.4, dissolvedOxygen: 4.1, wqiScore: 38 },
    { time: "T - 0h", hydrocarbonsPpm: 24.6, dissolvedOxygen: 3.4, wqiScore: 29 },
    { time: "T + 12h", hydrocarbonsPpm: 16.2, dissolvedOxygen: 4.6, wqiScore: 46 },
    { time: "T + 24h", hydrocarbonsPpm: 10.5, dissolvedOxygen: 5.5, wqiScore: 61 },
    { time: "T + 36h", hydrocarbonsPpm: 6.8, dissolvedOxygen: 6.1, wqiScore: 72 },
    { time: "Current", hydrocarbonsPpm: 4.4, dissolvedOxygen: 6.5, wqiScore: 78 },
  ],
  ecologicalMetrics: [
    { label: "Mangrove Sanctuary Proximity", value: "14.2 km Buffer", change: "Safe / Monitored", status: "good" as const },
    { label: "Coastal Fish Biomass Index", value: "71 / 100", change: "-12% temporary displacement", status: "warning" as const },
    { label: "Benthic Sediment Toxicity", value: "0.42 mg/kg", change: "Within IMO MARPOL threshold", status: "good" as const },
    { label: "Avian Protection Quadrant", value: "98.4% Secured", change: "No direct oiling observed", status: "good" as const },
  ],
  recoveryTimeline: [
    { phase: "Triage & Containment", estimatedDate: "Sep 12 - 16", targetPct: 35, currentPct: 35 },
    { phase: "High-Volume Skimming", estimatedDate: "Sep 17 - 28", targetPct: 65, currentPct: 42 },
    { phase: "Shoreline Polish & Bio-treat", estimatedDate: "Sep 29 - Oct 20", targetPct: 85, currentPct: 0 },
    { phase: "Ecological Certification", estimatedDate: "Oct 21 - Nov 18", targetPct: 100, currentPct: 0 },
  ],
};


