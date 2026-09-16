import asyncio
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models import (
    User, Incident, SpillGeometry, SpillDNA, OriginZone,
    ForecastSnapshot, ImpactAssessment, ActivityLog,
    Vessel, VesselPosition, VesselAttribution, CounterfactualRun, ASIEvent,
    EnvironmentalReading, Port, CoastGuardAsset,
    ResponseAction, PriorityZone, RecoveryRecord, Report
)
from app.services.geo_boundary import ensure_navigable_water


def generate_blob_polygon(
    center_lon: float,
    center_lat: float,
    major_deg: float = 0.12,
    minor_deg: float = 0.05,
    rotation_deg: float = 30.0,
    points_count: int = 24,
    noise: float = 0.18,
    seed: int = 42
) -> Dict[str, Any]:
    """Generate a realistic, organic, elongated slick polygon with boundary perturbation."""
    rng = random.Random(seed)
    rad_rot = math.radians(rotation_deg)
    cos_r = math.cos(rad_rot)
    sin_r = math.sin(rad_rot)

    coords = []
    for i in range(points_count):
        theta = (2.0 * math.pi * i) / points_count
        r_noise = 1.0 + rng.uniform(-noise, noise) + 0.15 * math.sin(3.0 * theta)
        x_ell = (major_deg / 2.0) * math.cos(theta) * r_noise
        y_ell = (minor_deg / 2.0) * math.sin(theta) * r_noise

        # Rotate and translate
        x_rot = x_ell * cos_r - y_ell * sin_r
        y_rot = x_ell * sin_r + y_ell * cos_r

        coords.append([round(center_lon + x_rot, 5), round(center_lat + y_rot, 5)])

    coords.append(coords[0])  # Close polygon ring
    return {
        "type": "Polygon",
        "coordinates": [coords]
    }


async def seed_database():
    """Wipe and populate database with comprehensive, multi-scenario realistic seed data."""
    print("Beginning Sahayya database schema generation...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    print("Tables created. Starting data population...")
    async with AsyncSessionLocal() as session:
        # 1. Users
        pwd_hash = get_password_hash("Patil@1234")
        admin_pwd = get_password_hash("Admin@1234")
        users = [
            User(
                name="Inspector General Patil",
                email="commander.patil@coastguard.gov.in",
                password_hash=pwd_hash,
                role="coast_guard",
                organization="Indian Coast Guard - Maritime Rescue Coordination Centre",
            ),
            User(
                name="Dr. Sunita Rao",
                email="s.rao@nio.res.in",
                password_hash=pwd_hash,
                role="researcher",
                organization="National Institute of Oceanography (NIO)",
            ),
            User(
                name="Capt. Rajesh Varma",
                email="vts.chief@jnpt.gov.in",
                password_hash=pwd_hash,
                role="port_authority",
                organization="Jawaharlal Nehru Port Authority VTS",
            ),
            User(
                name="Super Admin",
                email="admin@sahayya.gov.in",
                password_hash=admin_pwd,
                role="coast_guard",
                organization="Directorate General of Shipping",
            ),
        ]
        session.add_all(users)
        await session.flush()

        # 2. Ports (13 Major Indian Ports)
        ports_data = [
            ("Jawaharlal Nehru Port (JNPT)", "Navi Mumbai", "Maharashtra", 72.9525, 18.9490),
            ("Mumbai Port", "Mumbai", "Maharashtra", 72.8347, 18.9220),
            ("Kandla / Deendayal Port", "Kandla", "Gujarat", 70.2167, 23.0333),
            ("Mundra Port", "Mundra", "Gujarat", 69.7047, 22.8394),
            ("Kolkata Port", "Kolkata", "West Bengal", 88.3247, 22.5497),
            ("Haldia Port", "Haldia", "West Bengal", 88.0667, 22.0333),
            ("Chennai Port", "Chennai", "Tamil Nadu", 80.2930, 13.0980),
            ("Ennore (Kamarajar) Port", "Chennai", "Tamil Nadu", 80.3333, 13.2333),
            ("V.O. Chidambaranar Port (Tuticorin)", "Thoothukudi", "Tamil Nadu", 78.1348, 8.7642),
            ("Visakhapatnam Port", "Visakhapatnam", "Andhra Pradesh", 83.2185, 17.6868),
            ("Paradip Port", "Paradip", "Odisha", 86.6910, 20.2650),
            ("Cochin Port", "Kochi", "Kerala", 76.2667, 9.9667),
            ("New Mangalore Port", "Mangaluru", "Karnataka", 74.8560, 12.9141),
        ]
        for name, city, state, lon, lat in ports_data:
            session.add(Port(
                name=name,
                city=city,
                state=state,
                location={"type": "Point", "coordinates": [lon, lat]},
                port_type="Major Port"
            ))

        # 3. Coast Guard Assets (8 active assets)
        cg_assets_data = [
            ("ICGS Vikram", "offshore_patrol_vessel", 72.62, 18.84, "operational"),
            ("ICGS Samarth", "offshore_patrol_vessel", 72.45, 18.72, "operational"),
            ("ICGS Shaunak", "offshore_patrol_vessel", 72.55, 18.90, "on_mission"),
            ("ICGS Rajdoot", "fast_patrol_vessel", 72.82, 18.91, "operational"),
            ("ICGS C-438", "interceptor_boat", 72.78, 18.85, "operational"),
            ("Dornier CG-782", "patrol_aircraft", 72.50, 18.78, "on_mission"),
            ("ICGS Varaha", "offshore_patrol_vessel", 70.15, 22.95, "operational"),
            ("ICGS Vajra", "offshore_patrol_vessel", 80.35, 13.20, "operational"),
        ]
        for name, atype, lon, lat, status in cg_assets_data:
            session.add(CoastGuardAsset(
                name=name,
                asset_type=atype,
                current_location={"type": "Point", "coordinates": [lon, lat]},
                status=status
            ))

        # 4. Background Fleet Vessels (Exactly 30 Distinct Fleet Vessels)
        # Tankers: 8, Bulk Carriers: 6, Container Ships: 7, General Cargo: 5, Other: 4
        now = datetime.now(timezone.utc)
        vessel_definitions = [
            # Tankers (8)
            ('MT Pacific Voyager', 'tanker', 'Gabon', 2008, '9438200', '636020564', 72.48, 18.76, 2.1, 208.4),
            ('MT Ocean Glory', 'tanker', 'Panama', 2014, '9654123', '354987000', 72.24, 18.95, 9.8, 45.0),
            ('MT Sindhu Pride', 'tanker', 'India', 2018, '9781234', '419000123', 72.38, 18.62, 11.2, 120.0),
            ('MT Persian Pearl', 'tanker', 'Marshall Islands', 2012, '9543210', '538000456', 72.15, 18.45, 12.5, 315.0),
            ('MT Nippon Maru', 'tanker', 'Singapore', 2019, '9876543', '563000789', 71.95, 19.12, 13.4, 60.0),
            ('MT Nordic Star', 'tanker', 'Liberia', 2016, '9723456', '636000987', 71.65, 18.25, 14.1, 180.0),
            ('MT Arabian Sun', 'tanker', 'Bahamas', 2015, '9687412', '311000654', 71.40, 19.35, 13.8, 225.0),
            ('MT Kaveri Spirit', 'tanker', 'India', 2020, '9898765', '419000456', 75.80, 9.86, 11.8, 190.0),
            # Bulk Carriers (6)
            ('MV Iron Baron', 'bulk_carrier', 'Panama', 2011, '9512345', '354000111', 72.42, 18.72, 12.8, 38.0),
            ('MV Gujarat Glory', 'bulk_carrier', 'India', 2017, '9754321', '419000789', 69.10, 21.40, 12.2, 160.0),
            ('MV Deccan Miner', 'bulk_carrier', 'Malta', 2013, '9623456', '248000222', 72.35, 18.35, 11.8, 145.0),
            ('MV Baltic Carrier', 'bulk_carrier', 'Liberia', 2015, '9712345', '636000333', 71.85, 18.15, 12.4, 210.0),
            ('MV Cape Horizon', 'bulk_carrier', 'Singapore', 2020, '9901234', '563000444', 71.25, 19.45, 14.0, 330.0),
            ('MV Steel Trader', 'bulk_carrier', 'India', 2016, '9734567', '419000888', 72.25, 17.95, 12.6, 95.0),
            # General Cargo (6)
            ('MV Vishva Nidhi', 'general_cargo', 'India', 2020, '9800068', '419700068', 72.32, 18.82, 10.2, 45.0),
            ('MV Goa Trader', 'general_cargo', 'India', 2012, '9567890', '419000555', 72.45, 18.92, 10.5, 75.0),
            ('MV Malabar Coast', 'general_cargo', 'India', 2016, '9756789', '419000222', 72.35, 18.25, 11.0, 160.0),
            ('MV Konkan Pioneer', 'general_cargo', 'Panama', 2014, '9645678', '354000333', 71.80, 19.20, 10.8, 280.0),
            ('MV Coromandel Sea', 'general_cargo', 'Singapore', 2018, '9845678', '563000222', 80.65, 13.20, 11.5, 30.0),
            ('MV Andaman Trader', 'general_cargo', 'India', 2015, '9723890', '419000777', 93.15, 11.60, 10.4, 60.0),
            # Container Ships (7)
            ('C/V Chennai Express', 'container', 'India', 2018, '9823456', '419000321', 72.32, 18.88, 15.2, 42.0),
            ('C/V Bharat Bridge', 'container', 'Singapore', 2016, '9745678', '563000555', 72.10, 18.52, 16.5, 175.0),
            ('C/V Mumbai Gateway', 'container', 'India', 2021, '9923456', '419000654', 72.35, 19.18, 15.8, 25.0),
            ('C/V Indus Pioneer', 'container', 'Panama', 2014, '9678901', '354000777', 71.70, 18.90, 17.2, 110.0),
            ('C/V Orient Trader', 'container', 'Liberia', 2017, '9789012', '636000888', 71.35, 18.40, 16.0, 240.0),
            ('C/V Pearl Bridge', 'container', 'Marshall Islands', 2019, '9838878', '538000999', 70.95, 19.25, 17.0, 305.0),
            ('C/V Kochi Star', 'container', 'India', 2015, '9701234', '419000987', 83.65, 17.50, 11.2, 55.0),
            # Specialized & Patrol (3)
            ('RV Sagar Kanya', 'other', 'India', 2010, '9456789', '419000001', 72.28, 18.65, 8.2, 135.0),
            ('Tug Bhim', 'other', 'India', 2019, '9887766', '419000002', 72.55, 18.82, 7.5, 45.0),
            ('ICGS Vikram', 'other', 'India', 2022, '9998877', '419000999', 72.48, 18.75, 18.5, 310.0),
        ]

        fleet_vessels = []
        all_positions = []

        for vname, vtype, flag, built, imo, mmsi, lon, lat, speed, heading in vessel_definitions:
            v = Vessel(
                imo_number=imo,
                mmsi=mmsi,
                name=vname,
                vessel_type=vtype,
                flag_country=flag,
                built_year=built,
            )
            fleet_vessels.append(v)

        session.add_all(fleet_vessels)
        await session.flush()

        # Add 3 historical AIS position fixes per vessel
        for idx, (vname, vtype, flag, built, imo, mmsi, lon, lat, speed, heading) in enumerate(vessel_definitions):
            v_obj = fleet_vessels[idx]
            for t_offset in [120, 60, 0]:
                p_time = now - timedelta(minutes=t_offset)
                d_lat = (speed * (t_offset / 60.0) * math.cos(math.radians(heading))) / 60.0
                d_lon = (speed * (t_offset / 60.0) * math.sin(math.radians(heading))) / 60.0
                safe_lat, safe_lon = ensure_navigable_water(lat - d_lat, lon - d_lon)
                all_positions.append(VesselPosition(
                    vessel_id=v_obj.id,
                    position={"type": "Point", "coordinates": [safe_lon, safe_lat]},
                    speed_kts=speed,
                    heading_deg=heading,
                    recorded_at=p_time,
                    source="AIS_TERRESTRIAL"
                ))

        session.add_all(all_positions)

        # Flag specific realistic ASI Events across vessels
        # 1. MT Pacific Voyager: Irregular movement + 94 min AIS blackout in slick corridor
        session.add(ASIEvent(vessel_id=fleet_vessels[0].id, event_type="irregular_movement", severity="high", description="Abrupt course alteration (>90°) and sharp speed reduction to 2.1 kts in slick corridor.", occurred_at=now - timedelta(hours=8)))
        session.add(ASIEvent(vessel_id=fleet_vessels[0].id, event_type="dark_activity", severity="high", description="Complete AIS transponder blackout for 94 minutes while crossing Mumbai High oil extraction block.", occurred_at=now - timedelta(hours=14)))

        # 2. MT Ocean Glory: Mild route deviation
        session.add(ASIEvent(vessel_id=fleet_vessels[1].id, event_type="irregular_movement", severity="medium", description="Zigzag track deviation 4.2 nm outside standard traffic separation scheme.", occurred_at=now - timedelta(hours=14)))

        # 3. MT Sindhu Pride: Deceleration
        session.add(ASIEvent(vessel_id=fleet_vessels[2].id, event_type="irregular_movement", severity="medium", description="Deceleration from 14.5 kts to 11.2 kts while traversing western fairway.", occurred_at=now - timedelta(hours=20)))

        # 4. MT Persian Pearl: Flag & MMSI mismatch
        session.add(ASIEvent(vessel_id=fleet_vessels[3].id, event_type="identity_anomaly", severity="high", description="MMSI broadcast mismatch: Transmitter reports foreign flag not matching IMO registry.", occurred_at=now - timedelta(hours=18)))

        # 5. MT Nippon Maru: Beacon collision
        session.add(ASIEvent(vessel_id=fleet_vessels[4].id, event_type="identity_anomaly", severity="medium", description="Dual AIS beacon collision detected under single physical radar signature.", occurred_at=now - timedelta(hours=26)))

        # 6. MV Iron Baron: Loitering drift
        session.add(ASIEvent(vessel_id=fleet_vessels[8].id, event_type="prolonged_loitering", severity="medium", description="Stationary drift for 4.5 hours inside sensitive maritime zone without anchor broadcast.", occurred_at=now - timedelta(hours=11)))

        # 7. C/V Bharat Bridge: Clean transit check (low severity latency)
        session.add(ASIEvent(vessel_id=fleet_vessels[15].id, event_type="irregular_movement", severity="low", description="Periodic 12-minute transponder latency recorded during open water leg.", occurred_at=now - timedelta(hours=32)))

        # 8. MV Andaman Trader: Fuel oil reduction in Gulf of Kutch
        session.add(ASIEvent(vessel_id=fleet_vessels[24].id, event_type="prolonged_loitering", severity="medium", description="Speed reduction to 3.4 kts near Kandla anchorage fairway.", occurred_at=now - timedelta(hours=10)))

        # 9. MT Kaveri Spirit: Kochi dark vessel event
        session.add(ASIEvent(vessel_id=fleet_vessels[7].id, event_type="dark_activity", severity="high", description="Deliberate AIS blackout for 225 minutes while stationary in Vembanad coastal ingress.", occurred_at=now - timedelta(hours=6)))

        await session.flush()

        # 5. Populate 5 Realistic Scenarios
        print("Generating 5 multi-scenario incidents...")

        # =========================================================================
        # Scenario 1: "IN-MH-2026" — Mumbai High Offshore (Primary Active Scenario)
        # =========================================================================
        mh_time = now - timedelta(hours=16)
        inc_mh = Incident(
            incident_code="IN-MH-2026",
            title="Mumbai High Offshore Oil Slick",
            status="analysis",
            severity_score=8.4,
            spill_area_km2=276.04,
            detected_at=mh_time,
            location={"type": "Point", "coordinates": [72.51, 18.78]},
            region_name="Mumbai High Offshore / Arabian Sea",
            description="Major heavy crude spill detected via Sentinel-1A Synthetic Aperture Radar (SAR) imagery pass in the Mumbai High offshore oil production basin.",
            detection_source="Sentinel-1A SAR",
            investigating_agency="Indian Coast Guard - Regional HQ (West)",
        )
        session.add(inc_mh)
        await session.flush()

        # Spill Geometry (organic elongated blob)
        poly_mh = generate_blob_polygon(72.51, 18.78, major_deg=0.22, minor_deg=0.08, rotation_deg=38.0, seed=101)
        session.add(SpillGeometry(
            incident_id=inc_mh.id,
            geometry=poly_mh,
            captured_at=mh_time,
            source="Sentinel-1A SAR StripMap Mode",
            confidence_score=0.96
        ))

        # Spill DNA
        session.add(SpillDNA(
            incident_id=inc_mh.id,
            area_km2=276.04,
            perimeter_km=94.6,
            length_major_km=32.4,
            width_minor_km=11.2,
            orientation_deg=38.5,
            shape_index=1.62,
            fragmentation=0.28,
            thickness_min_mm=0.05,
            thickness_max_mm=1.85,
            volume_min_m3=18500.0,
            volume_max_m3=42600.0,
        ))

        # Origin Zone
        origin_poly_mh = generate_blob_polygon(72.38, 18.69, major_deg=0.09, minor_deg=0.05, rotation_deg=35.0, seed=102)
        session.add(OriginZone(
            incident_id=inc_mh.id,
            zone_geometry=origin_poly_mh,
            center_point={"type": "Point", "coordinates": [72.38, 18.69]},
            release_window_start=mh_time - timedelta(hours=14),
            release_window_end=mh_time - timedelta(hours=8),
            confidence_pct=92.4,
            model_used="OpenDrift Lagrangian Hindcast v2.4"
        ))

        # Impact Assessment
        session.add(ImpactAssessment(
            incident_id=inc_mh.id,
            coastline_distance_km=82.5,
            coastline_region="Alibag - Murud Coastal Zone, Maharashtra",
            eta_hours=44.0,
            mpa_overlap_pct=8.5,
            mpa_overlap_km2=23.4,
            fishing_zone_overlap_pct=42.0,
            fishing_zone_overlap_km2=115.9,
            risk_level="HIGH"
        ))

        # Spill Evolution (8 snapshots: -24h to +48h)
        for offset_h, conf in [(-24, 0.70), (-12, 0.85), (-6, 0.92), (0, 0.96), (6, 0.90), (12, 0.85), (24, 0.80), (48, 0.72)]:
            drift_lon = 72.51 + (offset_h * 0.0035)
            drift_lat = 18.78 + (offset_h * 0.0028)
            scale_factor = 1.0 + (offset_h * 0.012)
            poly_step = generate_blob_polygon(drift_lon, drift_lat, major_deg=0.22 * scale_factor, minor_deg=0.08 * scale_factor, rotation_deg=38.0 + offset_h * 0.3, seed=150 + offset_h)
            if offset_h <= 0:
                session.add(SpillGeometry(
                    incident_id=inc_mh.id,
                    geometry=poly_step,
                    captured_at=mh_time + timedelta(hours=offset_h),
                    source="Satellite Pass / Reconstruction",
                    confidence_score=conf
                ))
            else:
                session.add(ForecastSnapshot(
                    incident_id=inc_mh.id,
                    forecast_geometry=poly_step,
                    forecast_for_time=mh_time + timedelta(hours=offset_h),
                    generated_at=now,
                    model_version="v2.1-lagrangian"
                ))

        # Environmental Readings (16 readings over 48 hours)
        for step in range(16):
            t = mh_time - timedelta(hours=24) + timedelta(hours=step * 3)
            session.add(EnvironmentalReading(
                incident_id=inc_mh.id,
                location={"type": "Point", "coordinates": [72.51, 18.78]},
                wind_speed_ms=round(6.2 + 2.5 * math.sin(step * 0.4), 1),
                wind_direction_deg=round(235.0 + 15.0 * math.cos(step * 0.3), 1),
                current_speed_ms=round(0.72 + 0.25 * math.sin(step * 0.5), 2),
                current_direction_deg=round(60.0 + 12.0 * math.sin(step * 0.3), 1),
                wave_height_m=round(1.8 + 0.6 * math.sin(step * 0.35), 2),
                sst_c=round(28.4 + 0.8 * math.cos(step * 0.25), 1),
                recorded_at=t
            ))

        # Candidate Vessels & Attributions for IN-MH-2026
        # Top candidate: MT Pacific Voyager (fleet_vessels[0])
        # #2: MV Iron Baron (fleet_vessels[8])
        # #3: C/V Chennai Express (fleet_vessels[14])
        # #4: MT Persian Pearl (fleet_vessels[3])
        attributions_mh = [
            (fleet_vessels[0], 1, 98.8, 1.2, 2.1, 180, 96.5, 98.2, 95.0, 42.0, 97.4, 98.8, "highly_consistent"),
            (fleet_vessels[8], 2, 46.2, 8.4, 12.8, 0, 72.0, 58.0, 68.5, 99.0, 48.5, 46.2, "inconsistent"),
            (fleet_vessels[14], 3, 31.0, 14.6, 15.2, 0, 55.0, 42.0, 51.0, 98.5, 32.0, 31.0, "inconsistent"),
            (fleet_vessels[3], 4, 18.5, 22.0, 14.0, 45, 40.0, 25.0, 45.0, 88.0, 19.5, 18.5, "inconsistent"),
        ]
        for v, rank, attr_pct, cpa, sog, gap, t_m, l_m, r_m, ais_m, phys_m, ov_m, verd in attributions_mh:
            session.add(VesselAttribution(
                incident_id=inc_mh.id,
                vessel_id=v.id,
                rank=rank,
                attribution_pct=attr_pct,
                cpa_km=cpa,
                min_sog_kts=sog,
                ais_gap_minutes=gap,
                time_match_pct=t_m,
                location_match_pct=l_m,
                route_match_pct=r_m,
                ais_consistency_pct=ais_m,
                physics_match_pct=phys_m,
                overall_evidence_pct=ov_m,
                verdict=verd
            ))

        # Response Actions & Priority Zones
        session.add(ResponseAction(incident_id=inc_mh.id, action_text="Deploy 1,200m inflatable oil containment boom around northern slick boundary", status="completed", sequence_order=1, completed_at=mh_time + timedelta(hours=4)))
        session.add(ResponseAction(incident_id=inc_mh.id, action_text="Task ICGS Vikram with sweeping disc skimmer operations in Sector Alpha", status="completed", sequence_order=2, completed_at=mh_time + timedelta(hours=7)))
        session.add(ResponseAction(incident_id=inc_mh.id, action_text="Aerial application of OSD (Oil Spill Dispersant) by Dornier CG-782 over leading edge", status="pending", sequence_order=3))
        session.add(ResponseAction(incident_id=inc_mh.id, action_text="Issue coastal alert to Alibag artisanal fisheries cooperative", status="completed", sequence_order=4, completed_at=mh_time + timedelta(hours=2)))

        session.add(PriorityZone(
            incident_id=inc_mh.id,
            zone_geometry=generate_blob_polygon(72.54, 18.82, major_deg=0.08, minor_deg=0.04, rotation_deg=40.0, seed=160),
            priority_rank=1,
            reasoning="Thickest emulsion core (>1.5mm) drifting northeast towards coastal fish breeding sanctuaries."
        ))

        # Recovery records
        session.add(RecoveryRecord(incident_id=inc_mh.id, cleanup_progress_pct=24.5, milestone="containment_deployed", water_quality_index=54.0, recorded_at=now - timedelta(hours=2)))

        # Activity Logs
        mh_logs = [
            ("Sentinel-1A SAR anomalous radar backscatter detected at 18.78°N, 72.51°E.", "done", mh_time),
            ("Automated Spill DNA morphology analysis generated: 276.04 km² slick.", "done", mh_time + timedelta(minutes=25)),
            ("MRCC Mumbai notified. Tactical alert dispatched to CG Regional HQ.", "done", mh_time + timedelta(hours=1)),
            ("Lagrangian backward drift simulation completed. Origin release window established.", "done", mh_time + timedelta(hours=2)),
            ("Vessel Attribution Engine identified MT Pacific Voyager as prime suspect (98.8% match).", "done", mh_time + timedelta(hours=3)),
            ("ICGS Vikram on scene deployed containment boom in Sector Alpha.", "done", mh_time + timedelta(hours=6)),
            ("Forensic Evidence Package exported for Ministry of Defense & DG Shipping.", "in_progress", now - timedelta(hours=1)),
        ]
        for txt, st, tm in mh_logs:
            session.add(ActivityLog(incident_id=inc_mh.id, event_text=txt, status=st, occurred_at=tm))

        # =========================================================================
        # Scenario 2: "IN-KD-2026" — Near Kandla/Gulf of Kutch (Response Planning)
        # =========================================================================
        kd_time = now - timedelta(hours=28)
        inc_kd = Incident(
            incident_code="IN-KD-2026",
            title="Gulf of Kutch Fuel Oil Discharge",
            status="response_planning",
            severity_score=6.2,
            spill_area_km2=64.8,
            detected_at=kd_time,
            location={"type": "Point", "coordinates": [69.85, 22.95]},
            region_name="Gulf of Kutch / Gujarat",
            description="Medium fuel oil discharge observed along bulk carrier navigational fairway into Kandla anchorage.",
            detection_source="RISAT-1A Radar",
            investigating_agency="Gujarat Maritime Board & Indian Coast Guard",
        )
        session.add(inc_kd)
        await session.flush()

        poly_kd = generate_blob_polygon(69.85, 22.95, major_deg=0.10, minor_deg=0.04, rotation_deg=65.0, seed=201)
        session.add(SpillGeometry(incident_id=inc_kd.id, geometry=poly_kd, captured_at=kd_time, source="RISAT-1A SAR", confidence_score=0.91))
        session.add(SpillDNA(
            incident_id=inc_kd.id, area_km2=64.8, perimeter_km=42.0, length_major_km=18.4, width_minor_km=5.2,
            orientation_deg=65.0, shape_index=1.45, fragmentation=0.15, thickness_min_mm=0.02, thickness_max_mm=0.95,
            volume_min_m3=3200.0, volume_max_m3=9800.0
        ))
        session.add(OriginZone(
            incident_id=inc_kd.id,
            zone_geometry=generate_blob_polygon(69.76, 22.90, major_deg=0.05, minor_deg=0.03, rotation_deg=60.0, seed=202),
            center_point={"type": "Point", "coordinates": [69.76, 22.90]},
            release_window_start=kd_time - timedelta(hours=8), release_window_end=kd_time - timedelta(hours=4),
            confidence_pct=88.5, model_used="OpenDrift Hindcast v2.4"
        ))
        session.add(ImpactAssessment(
            incident_id=inc_kd.id, coastline_distance_km=18.2, coastline_region="Marine National Park, Gulf of Kutch",
            eta_hours=16.5, mpa_overlap_pct=34.0, mpa_overlap_km2=22.0, fishing_zone_overlap_pct=28.0,
            fishing_zone_overlap_km2=18.1, risk_level="CRITICAL"
        ))
        session.add(VesselAttribution(
            incident_id=inc_kd.id, vessel_id=fleet_vessels[24].id, rank=1, attribution_pct=89.4,
            cpa_km=1.8, min_sog_kts=3.4, ais_gap_minutes=60, time_match_pct=92.0, location_match_pct=91.5,
            route_match_pct=88.0, ais_consistency_pct=78.0, physics_match_pct=89.0, overall_evidence_pct=89.4,
            verdict="highly_consistent"
        ))
        session.add(RecoveryRecord(incident_id=inc_kd.id, cleanup_progress_pct=48.0, milestone="skimming_active", water_quality_index=68.0, recorded_at=now - timedelta(hours=3)))
        session.add(ActivityLog(incident_id=inc_kd.id, event_text="Response planning phase activated. Multi-agency task force assembled.", status="done", occurred_at=kd_time + timedelta(hours=6)))

        # =========================================================================
        # Scenario 3: "IN-VS-2026" — Near Visakhapatnam (Low Confidence / Look-alike)
        # =========================================================================
        vs_time = now - timedelta(hours=6)
        inc_vs = Incident(
            incident_code="IN-VS-2026",
            title="Visakhapatnam Outer Harbor Anomaly",
            status="detection",
            severity_score=4.2,
            spill_area_km2=34.2,
            detected_at=vs_time,
            location={"type": "Point", "coordinates": [83.35, 17.65]},
            region_name="Andhra Coast / Bay of Bengal",
            description="Low-reflectivity surface anomaly detected. Suspected biological surfactant / algal look-alike undergoing radiometric verification.",
            detection_source="Sentinel-1B SAR",
            investigating_agency="Eastern Naval Command & Coast Guard Dist 6",
        )
        session.add(inc_vs)
        await session.flush()

        poly_vs = generate_blob_polygon(83.35, 17.65, major_deg=0.08, minor_deg=0.03, rotation_deg=110.0, seed=301)
        session.add(SpillGeometry(incident_id=inc_vs.id, geometry=poly_vs, captured_at=vs_time, source="Sentinel-1B SAR", confidence_score=0.64))
        session.add(SpillDNA(
            incident_id=inc_vs.id, area_km2=34.2, perimeter_km=28.4, length_major_km=12.1, width_minor_km=3.8,
            orientation_deg=110.0, shape_index=1.22, fragmentation=0.42, thickness_min_mm=0.01, thickness_max_mm=0.15,
            volume_min_m3=450.0, volume_max_m3=1200.0
        ))
        session.add(OriginZone(
            incident_id=inc_vs.id,
            zone_geometry=generate_blob_polygon(83.28, 17.60, major_deg=0.04, minor_deg=0.02, rotation_deg=100.0, seed=302),
            center_point={"type": "Point", "coordinates": [83.28, 17.60]},
            release_window_start=vs_time - timedelta(hours=4), release_window_end=vs_time - timedelta(hours=1),
            confidence_pct=64.2, model_used="Confidence Engine AI"
        ))
        session.add(ImpactAssessment(
            incident_id=inc_vs.id, coastline_distance_km=38.0, coastline_region="Bheemunipatnam Coastline",
            eta_hours=58.0, mpa_overlap_pct=0.0, mpa_overlap_km2=0.0, fishing_zone_overlap_pct=15.0,
            fishing_zone_overlap_km2=5.1, risk_level="LOW"
        ))
        session.add(VesselAttribution(
            incident_id=inc_vs.id, vessel_id=fleet_vessels[20].id, rank=1, attribution_pct=52.4,
            cpa_km=4.2, min_sog_kts=11.2, ais_gap_minutes=0, time_match_pct=65.0, location_match_pct=62.0,
            route_match_pct=58.0, ais_consistency_pct=98.0, physics_match_pct=45.0, overall_evidence_pct=52.4,
            verdict="consistent"
        ))
        session.add(ActivityLog(incident_id=inc_vs.id, event_text="Optical multispectral validation requested from IRS-Oceansat-3 to resolve biogenic look-alike.", status="in_progress", occurred_at=now - timedelta(hours=1)))

        # =========================================================================
        # Scenario 4: "IN-CH-2026" — Near Chennai/Ennore (Closed / 100% Remediated)
        # =========================================================================
        ch_time = now - timedelta(days=21)
        inc_ch = Incident(
            incident_code="IN-CH-2026",
            title="Ennore Port Channel Heavy Fuel Residue",
            status="closed",
            severity_score=7.8,
            spill_area_km2=112.5,
            detected_at=ch_time,
            location={"type": "Point", "coordinates": [80.38, 13.25]},
            region_name="Coromandel Coast / Bay of Bengal",
            description="Historical incident involving heavy fuel oil spill near Ennore Kamarajar harbor entrance. Remediation and shoreline restoration fully completed.",
            detection_source="RADARSAT-2",
            investigating_agency="Tamil Nadu Pollution Control Board & Coast Guard",
        )
        session.add(inc_ch)
        await session.flush()

        poly_ch = generate_blob_polygon(80.38, 13.25, major_deg=0.14, minor_deg=0.06, rotation_deg=15.0, seed=401)
        session.add(SpillGeometry(incident_id=inc_ch.id, geometry=poly_ch, captured_at=ch_time, source="RADARSAT-2", confidence_score=0.98))
        session.add(SpillDNA(
            incident_id=inc_ch.id, area_km2=112.5, perimeter_km=62.8, length_major_km=22.4, width_minor_km=7.8,
            orientation_deg=15.0, shape_index=1.58, fragmentation=0.22, thickness_min_mm=0.08, thickness_max_mm=2.10,
            volume_min_m3=14200.0, volume_max_m3=28500.0
        ))
        session.add(OriginZone(
            incident_id=inc_ch.id,
            zone_geometry=generate_blob_polygon(80.34, 13.22, major_deg=0.05, minor_deg=0.03, rotation_deg=15.0, seed=402),
            center_point={"type": "Point", "coordinates": [80.34, 13.22]},
            release_window_start=ch_time - timedelta(hours=6), release_window_end=ch_time - timedelta(hours=2),
            confidence_pct=96.0, model_used="Historical Calibration"
        ))
        session.add(ImpactAssessment(
            incident_id=inc_ch.id, coastline_distance_km=4.5, coastline_region="Ennore Shoals & Pulicat Wetland Buffer",
            eta_hours=0.0, mpa_overlap_pct=18.0, mpa_overlap_km2=20.2, fishing_zone_overlap_pct=65.0,
            fishing_zone_overlap_km2=73.1, risk_level="HIGH"
        ))
        # 100% Recovery Milestones
        session.add(RecoveryRecord(incident_id=inc_ch.id, cleanup_progress_pct=25.0, milestone="containment_deployed", water_quality_index=32.0, recorded_at=ch_time + timedelta(days=2)))
        session.add(RecoveryRecord(incident_id=inc_ch.id, cleanup_progress_pct=60.0, milestone="skimming_active", water_quality_index=55.0, recorded_at=ch_time + timedelta(days=6)))
        session.add(RecoveryRecord(incident_id=inc_ch.id, cleanup_progress_pct=88.0, milestone="shoreline_cleanup", water_quality_index=78.0, recorded_at=ch_time + timedelta(days=12)))
        session.add(RecoveryRecord(incident_id=inc_ch.id, cleanup_progress_pct=100.0, milestone="site_remediated", water_quality_index=94.5, recorded_at=ch_time + timedelta(days=18)))
        session.add(ActivityLog(incident_id=inc_ch.id, event_text="Final post-cleanup ecological audit approved. Case officially closed.", status="done", occurred_at=ch_time + timedelta(days=19)))

        # =========================================================================
        # Scenario 5: "IN-KO-2026" — Near Kochi (Dark Vessel Case)
        # =========================================================================
        ko_time = now - timedelta(hours=14)
        inc_ko = Incident(
            incident_code="IN-KO-2026",
            title="Kochi Offshore Dark-Vessel Discharge",
            status="attribution",
            severity_score=7.1,
            spill_area_km2=72.8,
            detected_at=ko_time,
            location={"type": "Point", "coordinates": [76.15, 9.92]},
            region_name="Malabar Coast / Arabian Sea",
            description="Active oil spill detected coincident with an unregistered radar target exhibiting deliberate AIS blackout. Forensics reconciling dark-vessel radar trace.",
            detection_source="NovaSAR-1 & Coastal Radar Chain",
            investigating_agency="Indian Coast Guard - Regional HQ (West/South)",
        )
        session.add(inc_ko)
        await session.flush()

        poly_ko = generate_blob_polygon(76.15, 9.92, major_deg=0.12, minor_deg=0.05, rotation_deg=45.0, seed=501)
        session.add(SpillGeometry(incident_id=inc_ko.id, geometry=poly_ko, captured_at=ko_time, source="NovaSAR-1", confidence_score=0.94))
        session.add(SpillDNA(
            incident_id=inc_ko.id, area_km2=72.8, perimeter_km=48.2, length_major_km=19.2, width_minor_km=6.4,
            orientation_deg=45.0, shape_index=1.52, fragmentation=0.20, thickness_min_mm=0.04, thickness_max_mm=1.20,
            volume_min_m3=5400.0, volume_max_m3=14800.0
        ))
        session.add(OriginZone(
            incident_id=inc_ko.id,
            zone_geometry=generate_blob_polygon(76.08, 9.86, major_deg=0.06, minor_deg=0.03, rotation_deg=45.0, seed=502),
            center_point={"type": "Point", "coordinates": [76.08, 9.86]},
            release_window_start=ko_time - timedelta(hours=10), release_window_end=ko_time - timedelta(hours=5),
            confidence_pct=91.0, model_used="OpenDrift Hindcast v2.4"
        ))
        session.add(ImpactAssessment(
            incident_id=inc_ko.id, coastline_distance_km=24.0, coastline_region="Vembanad Coastal Ingress",
            eta_hours=26.0, mpa_overlap_pct=12.0, mpa_overlap_km2=8.7, fishing_zone_overlap_pct=52.0,
            fishing_zone_overlap_km2=37.8, risk_level="HIGH"
        ))
        # Dark vessel attribution: top candidate has 225 min AIS blackout
        session.add(VesselAttribution(
            incident_id=inc_ko.id, vessel_id=fleet_vessels[7].id, rank=1, attribution_pct=94.6,
            cpa_km=0.9, min_sog_kts=1.8, ais_gap_minutes=225, time_match_pct=95.0, location_match_pct=97.0,
            route_match_pct=92.0, ais_consistency_pct=38.0, physics_match_pct=96.0, overall_evidence_pct=94.6,
            verdict="highly_consistent"
        ))
        session.add(ActivityLog(incident_id=inc_ko.id, event_text="Radar track correlation confirmed: Unidentified vessel was stationary in origin zone during AIS gap.", status="done", occurred_at=ko_time + timedelta(hours=3)))

        # Commit all populated seed data
        await session.commit()
        print("Database seed populated successfully! All 5 scenarios, 13 ports, 8 CG assets, and 30 distinct vessels active.")


if __name__ == "__main__":
    asyncio.run(seed_database())
