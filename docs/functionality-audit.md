# Sahayya Maritime Intelligence & Forensic Attribution System
## End-to-End Functionality Audit Checklist & Verification Matrix

**Document Date:** September 14, 2026  
**Status:** 100% OPERATIONAL & VERIFIED (Zero Dead Clicks, Zero Mock-Only Placeholders)  
**Security Classification:** Restricted — Official Indian Coast Guard Use  

---

### Summary of System Architecture & Full-Stack Wiring
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + React-Leaflet + Recharts
- **Backend:** FastAPI (Python 3.11+) + PostgreSQL 16 + PostGIS + SQLAlchemy 2.0 (Async) + Alembic
- **Asynchronous Task Queue:** Celery + Redis + High-Performance Background Workers
- **Document Generation Engine:** ReportLab + Headless Matplotlib + SHA-256 Cryptographic Ledger
- **Storage:** MinIO S3 Object Store with local filesystem persistence fallback (`backend/storage/reports/`)
- **Real-Time Data Streams:** WebSocket broadcast (`/ws/telemetry`) & REST API (`/api/v1`)

---

## 1. Authentication (`/login` & `/register`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Login Form Submission** | Form / Submit | ✅ | Submits credentials to `POST /auth/login`, validates JWT token, caches `access_token` and redirects to `/dashboard`. Displays real validation errors from FastAPI backend on invalid credentials. |
| **Register Form Submission** | Form / Submit | ✅ | Submits to `POST /auth/register`, checks duplicate username/email, handles password confirmation, creates user record in Postgres, and auto-logs in. |
| **Password Visibility Toggle** | Icon Button | ✅ | Toggles password field input type between `password` and `text` with Eye / EyeOff icon transition. |
| **"Remember Me" Checkbox** | Checkbox | ✅ | Persists authentication token in `localStorage` vs `sessionStorage`. |
| **"Bypass / Demo Officer Mode"** | Secondary Button | ✅ | Authenticates immediately as seeded Indian Coast Guard Commander with role `admin`. |
| **Switch to Register / Switch to Login** | Nav Link | ✅ | Smoothly flips between Login and Register views with state preservation. |

---

## 2. Global Navigation & Layout (Header, Sidebar, Breadcrumbs)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Sidebar Hamburger / 2-Bar Toggle** | Button | ✅ | Collapses and expands sidebar width smoothly across all viewport resolutions. |
| **Sidebar Nav Items (7 Items)** | Nav Links | ✅ | `Dashboard`, `Incidents`, `Vessels`, `National Map`, `Analysis`, `Settings`, `Help`. All route to live, verified pages. Active item visually highlighted with navy gradient and sky ring. |
| **Breadcrumb Links** | Nav Links | ✅ | Breadcrumb items link to parent collections (e.g. `Incidents` &rarr; `/incidents`, `Vessels` &rarr; `/vessels`). |
| **Global ⌘K Search Bar** | Input / Keyboard | ✅ | Supports `Cmd+K` / `Ctrl+K` hotkey focus. Filters incidents, vessels, and coordinates in real-time. |
| **Notification Bell & Popover** | Popover / Button | ✅ | Toggles live notification feed displaying real alerts (SAR ingestion, AIS gap alerts, hindcast convergence). |
| **User Profile Dropdown** | Menu / Dropdown | ✅ | Displays user credentials, rank, and role. Includes working "Log Out" button calling auth logout and redirecting to `/login`. |
| **"Share Incident" Button** | Modal Trigger | ✅ | Opens command link dialog with one-click clipboard copy (`navigator.clipboard`). |
| **"Export" Button (Header)** | Action Button | ✅ | Generates and downloads authentic GeoJSON & telemetry JSON dataset (`Sahayya_IN-MH-2026_Intelligence_Telemetry.json`). |
| **"Generate Report" Button (Header)** | Modal Trigger | ✅ | Opens `ReportGenerationModal` connected to `POST /incidents/{id}/generate-report` with live 2s polling and full 9-page PDF pipeline. |
| **Overflow "⋮" Actions Menu** | Dropdown | ✅ | Includes "Duplicate Incident", "Archive Record", and protected "Delete Incident" with feedback toast. |

---

## 3. Operations Dashboard (`/dashboard`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **6 Live Stat Metric Cards** | Cards / Links | ✅ | Displays active area (276.04 km²), suspect rank, landfall ETA (16.4h), wind speed, and wave height. Clicking opens detailed forensic telemetry. |
| **Spill Area Popover Toggle** | Toggle Switch | ✅ | Toggles floating quantitative polygon metrics overlay directly over the live map. |
| **3D Slick Model Popover Toggle**| Toggle Switch | ✅ | Toggles floating thickness, shape index, and volume estimation overlay. |
| **Interactive Map Controls** | Map Buttons | ✅ | Zoom In (`+`), Zoom Out (`-`), Fullscreen toggle, Layer Switcher (Satellite vs Street vs Nautical), Re-center button. |
| **Observation vs Model Switcher** | Segmented Tab | ✅ | Toggles observed SAR polygon boundary vs OpenDrift particle advection simulation. |
| **Time Slider & Timeline Controls**| Slider / Buttons | ✅ | Rewinds and fast-forwards through time frames (-24h, -12h, Now, +12h, +24h, +48h). Includes auto-play/pause ticker. |
| **Attribution Roster Row Clicks** | Table Rows | ✅ | Clicking any suspect vessel opens detailed forensic profile modal. |
| **"View Evidence" (Rank #1 Suspect)**| Button / Modal | ✅ | Opens `EvidenceGraphModal` showing 7D multi-factor radar breakdown (Time, CPA, SOG, AIS Gap, Drift, Geometry, Spatio-Temporal). |
| **"Track Vessel" Action** | Button / Modal | ✅ | Opens historical voyage corridor and dark-window reconstruction with option to inspect in Fleet Tracking. |
| **"View All Candidates" Link** | Modal Trigger | ✅ | Opens modal showing all candidate vessels ranked by attribution confidence score. |
| **"Create Response Plan" Button** | Modal Trigger | ✅ | Opens tactical response plan modal with staged Coast Guard asset allocation. |
| **"Add Note" Command** | Form / Modal | ✅ | Submits operational note to `POST /incidents/{id}/notes`, appending to incident audit log in Postgres. |

---

## 4. Incident Detail Workspace (`/incidents/IN-MH-2026`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Status Stepper (5 Stages)** | Interactive Stepper | ✅ | Clicking any stage node displays timestamp, responsible authority, and operational findings. "Mark Stage Verified & Advance" sends `PATCH /incidents/{id}/status`. |
| **Environmental Telemetry Bar** | Metric Chips | ✅ | Displays real INCOIS/HYCOM live readings: Wind (5.1 m/s @ 289°), Waves (1.0 m), Current (0.67 m/s @ 189°), SST (28.3°C). |
| **Incident Workspace Tabs** | Tab Switcher | ✅ | Seamlessly switches between "Tactical Intelligence Dossier", "Recovery Monitoring", and "Marine Digital Twin Simulator". |
| **Editable Overview (Panel A)** | Form / Modal | ✅ | "Edit" button opens modal allowing modification of incident description and agency, saving directly to database. |
| **Hero Image Lightbox (Panel B)**| Image Click | ✅ | Clicking SAR radar or vessel thumbnail opens high-resolution modal with zoom. |
| **DNA Characteristics (Panel D)** | Action Button | ✅ | "View Detailed Analysis" opens full geometric breakdown (major/minor axis, thickness distribution). |
| **Spill Evolution (Panel E)** | Thumbnail Strip | ✅ | 6 interactive thumbnails update the main mini-map canvas to past hindcast and future forecast states. |
| **Vessel Candidates (Panel F)** | Cards / Buttons | ✅ | Displays top 3 suspect ships. "View 7D Evidence Graph" opens multi-factor radar chart. Clicking vessel opens forensic dossier. |
| **Probable Origin (Panel G)** | Card / Action | ✅ | Displays Lagrangian backward particle trajectory and release window confidence. |
| **Coastal Impact (Panel H)** | Card / Action | ✅ | "View Affected Areas" highlights ecologically sensitive mangrove zones and marine sanctuaries at risk. |
| **Activity Timeline (Panel I)** | Vertical Log | ✅ | "View All" modal displays complete timestamped audit trail from `activity_log` table. |
| **Coast Guard Asset Deploy (Panel J)**| Toggle Buttons| ✅ | "Deploy" / "Recall" toggles for *ICGS Vikram*, *ICGS Samarth*, *ICGS C-457*, and *ICGS Dornier* with instant state and command dispatch feedback. |
| **Tactical Response Plan (Panel J)**| Button / Modal | ✅ | "Execute Tactical Response Plan" dispatches containment orders. |
| **Recovery Monitoring (Tab 2)** | Controls / Sliders| ✅ | Water quality parameter selector (Dissolved Hydrocarbons, DO, Turbidity, Toxicity Index), sampling station dropdown, and milestone progress checklists. |
| **Digital Twin Simulator (Tab 3)** | Form / Run Button | ✅ | Wind slider, current deflection angle, dispersant efficiency toggles, and "Run Counterfactual Simulation" triggering `POST /incidents/{id}/counterfactual`. |

---

## 5. Fleet Surveillance & Vessels (`/vessels`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Search Input** | Text Input | ✅ | Real-time text filter matching vessel name, IMO number, MMSI, and callsign against 142 fleet vessels. |
| **Vessel Type Dropdown** | Select Filter | ✅ | Filters roster by `All Types`, `Tankers (Crude/Product)`, `Cargo & Container`, `Bulk Carrier`, `Tug / Offshore Supply`. |
| **Risk Level Filter Dropdown** | Select Filter | ✅ | Filters by `High Risk (Attributed)`, `Under Observation`, `Normal Traffic`. |
| **Flag State Filter Dropdown** | Select Filter | ✅ | Filters by flag country (India, Liberia, Panama, Marshall Islands, Singapore, etc.). |
| **Vessel Table Row Click** | Table Row | ✅ | Selects active ship, auto-centers interactive Leaflet map, and opens detailed Telemetry Drawer. |
| **Vessel Selection Checkbox** | Checkbox | ✅ | Multi-selects vessels for batch export or comparative risk scoring. |
| **Sortable Column Headers** | Table Headers | ✅ | Sorts roster by Name, Speed, Risk Score, and CPA. |
| **"Track Vessel" (Drawer & Card)** | Action Button | ✅ | Centers vessel on map and renders historical breadcrumb track with dark AIS gap indicators. |
| **"Generate Report" (Header)** | Action Button | ✅ | Opens `ReportGenerationModal` in `isFleetReport={true}` mode, generating authentic Fleet Surveillance PDF via `POST /vessels/generate-report`. |
| **Coast Guard Asset Contact** | Modal Trigger | ✅ | Opens direct communications modal to dispatch Coast Guard interceptor to selected coordinates. |

---

## 6. National Map (`/map`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Interactive Map Markers** | Leaflet Markers| ✅ | Clicking incident or vessel marker displays rich popup with live status, speed, coordinates, and "View Incident" link. |
| **Layer Switcher Toggles** | Checkboxes | ✅ | Toggles SAR slicks, AIS live vessels, backward hindcast cones, forward drift paths, port zones, and EEZ boundaries. |
| **Major Port Selector** | Dropdown / Buttons| ✅ | Selects major Indian ports (Mumbai, JNPT, Kandla, Cochin, Chennai, Visakhapatnam, Kolkata) and smoothly pans map to port jurisdiction. |
| **Map Base Tile Toggle** | Toggle | ✅ | Switches between Esri World Imagery (Satellite) and OpenStreetMap Carto (Streets/Nautical). |
| **Fullscreen Mode Button** | Icon Button | ✅ | Expands map canvas to true native fullscreen and handles window resize via `invalidateSize()`. |

---

## 7. Forensic Analysis (`/analysis`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Incident Scenario Selector** | Dropdown | ✅ | Loads multi-scenario incident data (`IN-MH-2026`, `IN-KO-2026`, `IN-VS-2026`, `IN-CH-2026`, `IN-KD-2026`). |
| **Suspect Vessel Selector** | Dropdown | ✅ | Selects target vessel for comparative trajectory counterfactual analysis. |
| **Advection Parameter Sliders** | Range Inputs | ✅ | Adjusts windage factor (1%–5%), Stokes drift coefficient, and turbulent diffusion. |
| **"Run Counterfactual Simulation"**| Action Button | ✅ | Calls `POST /incidents/{id}/counterfactual`, polls Celery task status, and renders simulated vs observed overlap polygon with match score. |
| **"Compare with Model" Button** | Toggle | ✅ | Overlays theoretical Lagrangian dispersion cone against radar polygon. |

---

## 8. Settings & Administration (`/settings`)

| Interactive Element | Type | Status | End-to-End Wiring & Result |
| :--- | :--- | :---: | :--- |
| **Settings Sub-Tabs** | Tab Switcher | ✅ | Switches between "Profile & Security", "Data Feeds & Sensors", "Notification Rules", and "User Management". |
| **Sensor Feed Toggle Switches** | Toggles | ✅ | Toggles Copernicus Sentinel-1A ingestion, DGLL AIS feed, and INCOIS Ocean Data stream with status updates. |
| **Alert Threshold Sliders** | Range Sliders | ✅ | Sets minimum slick area threshold (km²) and dark vessel duration (minutes) for automatic alerting. |
| **"Invite User / Add Officer" Form**| Form / Submit | ✅ | Validates name, official email, role (Analyst, Commander, Observer), submits to backend, and updates active roster. |
| **"Save Preferences" Button** | Action Button | ✅ | Persists settings changes with instant feedback toast and backend synchronization. |

---

## Part 2: Generate Report PDF Pipeline Verification

| Pipeline Component | Status | Details |
| :--- | :---: | :--- |
| **Endpoint: `POST /incidents/{id}/generate-report`** | ✅ | Enqueues task, returns `{ job_id, status: "processing" }`. |
| **Endpoint: `POST /vessels/generate-report`** | ✅ | Enqueues fleet surveillance task covering Indian EEZ. |
| **Endpoint: `GET /reports/{job_id}/status`** | ✅ | Returns `{ status: "processing"|"ready"|"failed", report_id, download_url, file_hash, filename, pages_count }`. |
| **Endpoint: `GET /reports/{id}/download`** | ✅ | Streams authentic PDF with `Content-Type: application/pdf` and `Content-Disposition`. Supports `?view=inline` for browser tab view. |
| **PDF Page 1: Cover Page** | ✅ | Official Emblem, Ministry of Defence header, Incident Code, Title, Severity Badge, Indian Coast Guard classification. |
| **PDF Page 2: Executive Summary** | ✅ | Plain investigative prose auto-generated from real data + quantitative summary table. |
| **PDF Page 3: Detection & Spill DNA** | ✅ | High-resolution sensor metadata, shape index, thickness distribution, and estimated volume table. |
| **PDF Page 4: Origin Reconstruction (Hindcast)** | ✅ | Embedded Matplotlib plot with backward drift vector cone and release window. |
| **PDF Page 5: Vessel Attribution & 7D Matrix** | ✅ | Candidate roster, multi-factor scoring table, and legal disclaimer. |
| **PDF Page 6: Forecast & Coastal Impact** | ✅ | Embedded forward advection trajectory map (+6h/+24h/+48h) and environmental vulnerability table. |
| **PDF Page 7: Response & Recovery Actions** | ✅ | Action checklist, asset deployment status, and cleanup milestones. |
| **PDF Page 8: Activity Audit Timeline** | ✅ | Chronological timestamped log from `activity_log` table. |
| **PDF Page 9: Provenance & Cryptographic Seal**| ✅ | Sensor sources, certified true record signature block, and 64-character SHA-256 tamper-proof seal. |
| **Frontend Modal UI (`ReportGenerationModal`)** | ✅ | 2s polling, step-by-step progress animation, "Download PDF" and "View in Browser" buttons, failure retry logic. |
