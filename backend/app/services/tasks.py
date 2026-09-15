import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.incident import Incident
from app.models.vessel import Vessel, CounterfactualRun
from app.models.response import Report
from app.services.counterfactual import run_counterfactual_simulation
from app.services.report_generator import generate_incident_report_pdf
from sqlalchemy import select


# In-memory dictionary for immediate job status tracking (works in local mode and as cache)
JOB_RESULTS: Dict[str, Dict[str, Any]] = {}


@celery_app.task(name="run_counterfactual_task")
def run_counterfactual_task(job_id: str, incident_id: int, vessel_id: int, params: Optional[Dict[str, Any]] = None):
    """Celery worker task for counterfactual simulation."""
    return asyncio.run(execute_counterfactual_job(job_id, incident_id, vessel_id, params))


@celery_app.task(name="generate_report_task")
def generate_report_task(job_id: str, incident_id: int, report_type: str = "INCIDENT_DOSSIER", user_id: Optional[int] = None):
    """Celery worker task for PDF report generation."""
    return asyncio.run(execute_report_job(job_id, incident_id, report_type, user_id))


async def execute_counterfactual_job(job_id: str, incident_id: int, vessel_id: int, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute counterfactual simulation asynchronously against database."""
    JOB_RESULTS[job_id] = {"status": "processing", "job_id": job_id, "incident_id": incident_id, "vessel_id": vessel_id}
    try:
        async with AsyncSessionLocal() as db:
            inc_res = await db.execute(select(Incident).where(Incident.id == incident_id))
            incident = inc_res.scalar_one_or_none()

            vessel_res = await db.execute(select(Vessel).where(Vessel.id == vessel_id))
            vessel = vessel_res.scalar_one_or_none()

            if not incident:
                raise ValueError("Incident not found")

            # Center coordinates
            center_lon = incident.location.get("coordinates", [72.51, 18.78])[0]
            center_lat = incident.location.get("coordinates", [72.51, 18.78])[1]

            # Perturb slightly based on vessel id to give distinct counterfactual paths
            vessel_lon = center_lon - 0.04 + ((vessel_id % 5) * 0.015)
            vessel_lat = center_lat - 0.03 + ((vessel_id % 4) * 0.012)

            observed_poly = incident.location  # fallback to point buffer if needed
            # Find spill geometry if exists
            from app.models.incident import SpillGeometry
            sg_res = await db.execute(select(SpillGeometry).where(SpillGeometry.incident_id == incident_id))
            sg = sg_res.scalars().first()
            if sg and sg.geometry:
                observed_poly = sg.geometry

            result = run_counterfactual_simulation(
                vessel_release_lon=vessel_lon,
                vessel_release_lat=vessel_lat,
                observed_spill_geojson=observed_poly,
                drift_hours=18.0,
                env_parameters=params
            )

            # Persist counterfactual run record
            run_record = CounterfactualRun(
                incident_id=incident_id,
                vessel_id=vessel_id,
                simulated_geometry=result["simulated_geometry"],
                match_score_pct=result["match_score_pct"],
                parameters=params or {},
                run_at=datetime.now(timezone.utc)
            )
            db.add(run_record)
            await db.commit()
            await db.refresh(run_record)

            final_data = {
                "job_id": job_id,
                "status": "completed",
                "incident_id": incident_id,
                "vessel_id": vessel_id,
                "match_score_pct": result["match_score_pct"],
                "simulated_geometry": result["simulated_geometry"],
                "run_at": run_record.run_at.isoformat(),
                "parameters": params,
            }
            JOB_RESULTS[job_id] = final_data
            return final_data

    except Exception as e:
        err_data = {"job_id": job_id, "status": "failed", "error": str(e)}
        JOB_RESULTS[job_id] = err_data
        return err_data


async def execute_report_job(job_id: str, incident_id: int, report_type: str = "INCIDENT_DOSSIER", user_id: Optional[int] = None) -> Dict[str, Any]:
    """Execute PDF report generation asynchronously against database."""
    JOB_RESULTS[job_id] = {"status": "processing", "job_id": job_id, "incident_id": incident_id}
    try:
        async with AsyncSessionLocal() as db:
            from app.models.incident import Incident, SpillDNA
            from app.models.vessel import VesselAttribution
            from sqlalchemy.orm import selectinload

            inc_res = await db.execute(
                select(Incident)
                .options(selectinload(Incident.spill_dna), selectinload(Incident.vessel_attributions).selectinload(VesselAttribution.vessel))
                .where(Incident.id == incident_id)
            )
            incident = inc_res.scalar_one_or_none()
            if not incident:
                raise ValueError("Incident not found")

            incident_dict = {
                "incident_code": incident.incident_code,
                "title": incident.title,
                "status": incident.status,
                "spill_area_km2": incident.spill_area_km2,
                "severity_score": incident.severity_score,
                "detection_source": incident.detection_source,
                "investigating_agency": incident.investigating_agency,
                "detected_at": incident.detected_at,
                "spill_dna": {
                    "perimeter_km": incident.spill_dna.perimeter_km if incident.spill_dna else 0.0,
                    "length_major_km": incident.spill_dna.length_major_km if incident.spill_dna else 0.0,
                    "width_minor_km": incident.spill_dna.width_minor_km if incident.spill_dna else 0.0,
                    "orientation_deg": incident.spill_dna.orientation_deg if incident.spill_dna else 0.0,
                    "shape_index": incident.spill_dna.shape_index if incident.spill_dna else 0.0,
                    "thickness_min_mm": incident.spill_dna.thickness_min_mm if incident.spill_dna else 0.0,
                    "thickness_max_mm": incident.spill_dna.thickness_max_mm if incident.spill_dna else 0.0,
                    "volume_min_m3": incident.spill_dna.volume_min_m3 if incident.spill_dna else 0.0,
                    "volume_max_m3": incident.spill_dna.volume_max_m3 if incident.spill_dna else 0.0,
                } if incident.spill_dna else None
            }

            attributions_list = []
            if incident.vessel_attributions:
                for va in sorted(incident.vessel_attributions, key=lambda x: x.rank):
                    attributions_list.append({
                        "rank": va.rank,
                        "vessel_name": va.vessel.name if va.vessel else f"Vessel #{va.vessel_id}",
                        "imo": va.vessel.imo_number if va.vessel else "N/A",
                        "cpa_km": va.cpa_km,
                        "min_sog_kts": va.min_sog_kts,
                        "ais_gap_minutes": va.ais_gap_minutes,
                        "physics_match_pct": va.physics_match_pct,
                        "overall_evidence_pct": va.overall_evidence_pct,
                        "verdict": va.verdict,
                    })

            report_meta = generate_incident_report_pdf(incident_dict, attributions_list, report_type)

            report_record = Report(
                incident_id=incident_id,
                report_type=report_type,
                file_url=report_meta["file_url"],
                file_hash=report_meta["file_hash"],
                generated_at=datetime.now(timezone.utc),
                generated_by=user_id
            )
            db.add(report_record)
            await db.commit()
            await db.refresh(report_record)

            final_data = {
                "job_id": job_id,
                "status": "ready",
                "report_id": report_record.id,
                "incident_id": incident_id,
                "download_url": f"/reports/{report_record.id}/download",
                "file_url": report_record.file_url,
                "file_hash": report_record.file_hash,
                "filename": report_meta["filename"],
                "pages_count": report_meta.get("pages_count", 9),
                "generated_at": report_record.generated_at.isoformat(),
            }
            JOB_RESULTS[job_id] = final_data
            return final_data

    except Exception as e:
        err_data = {"job_id": job_id, "status": "failed", "error": str(e)}
        JOB_RESULTS[job_id] = err_data
        return err_data


async def execute_fleet_report_job(job_id: str) -> Dict[str, Any]:
    """Execute fleet surveillance report generation asynchronously."""
    JOB_RESULTS[job_id] = {"status": "processing", "job_id": job_id}
    try:
        async with AsyncSessionLocal() as db:
            from app.models.vessel import Vessel, VesselPosition, ASIEvent
            from app.services.report_generator import generate_fleet_summary_pdf
            from sqlalchemy.orm import selectinload

            stmt = select(Vessel).options(selectinload(Vessel.asi_events), selectinload(Vessel.positions)).limit(100)
            vessels = (await db.execute(stmt)).scalars().all()

            v_dicts = []
            for v in vessels:
                latest_p = max(v.positions, key=lambda p: p.recorded_at) if v.positions else None
                v_dicts.append({
                    "name": v.name,
                    "vessel_type": v.vessel_type,
                    "imo_number": v.imo_number,
                    "mmsi": v.mmsi,
                    "flag_country": v.flag_country,
                    "speed_kts": latest_p.speed_kts if latest_p else 12.0,
                    "heading_deg": latest_p.heading_deg if latest_p else 45.0,
                    "asi_events": v.asi_events,
                })

            report_meta = generate_fleet_summary_pdf(v_dicts)

            # Store in reports table (incident_id=1 as master reference or null)
            report_record = Report(
                incident_id=1,
                report_type="FLEET_SURVEILLANCE",
                file_url=report_meta["file_url"],
                file_hash=report_meta["file_hash"],
                generated_at=datetime.now(timezone.utc),
                generated_by=None
            )
            db.add(report_record)
            await db.commit()
            await db.refresh(report_record)

            final_data = {
                "job_id": job_id,
                "status": "ready",
                "report_id": report_record.id,
                "download_url": f"/reports/{report_record.id}/download",
                "file_url": report_record.file_url,
                "file_hash": report_record.file_hash,
                "filename": report_meta["filename"],
                "pages_count": report_meta.get("pages_count", 2),
                "generated_at": report_record.generated_at.isoformat(),
            }
            JOB_RESULTS[job_id] = final_data
            return final_data
    except Exception as e:
        err_data = {"job_id": job_id, "status": "failed", "error": str(e)}
        JOB_RESULTS[job_id] = err_data
        return err_data

