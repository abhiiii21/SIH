import asyncio
from starlette.testclient import TestClient
from app.main import app
from app.core.database import engine, Base, AsyncSessionLocal
from app.db.seed import seed_database
from app.services.tasks import execute_counterfactual_job, execute_report_job


def run_tests():
    print("==================================================")
    print("RUNNING SAHAYYA BACKEND COMPREHENSIVE VERIFICATION")
    print("==================================================")

    # Use synchronous TestClient
    client = TestClient(app)
    # 1. Health
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] Health check passed:", r.json())

    # 2. Incidents List
    r = client.get("/incidents")
    assert r.status_code == 200
    incidents = r.json()
    assert len(incidents) >= 5, f"Expected 5 incidents, got {len(incidents)}"
    codes = [i["incident_code"] for i in incidents]
    print(f"[PASS] Incidents list verified: {len(incidents)} scenarios loaded: {codes}")
    assert "IN-MH-2026" in codes
    assert "IN-KD-2026" in codes
    assert "IN-VS-2026" in codes
    assert "IN-CH-2026" in codes
    assert "IN-KO-2026" in codes

    # 3. Incident Detail (IN-MH-2026)
    r = client.get("/incidents/IN-MH-2026")
    assert r.status_code == 200
    mh = r.json()
    assert mh["spill_area_km2"] == 276.04
    assert mh["spill_dna"] is not None
    assert mh["origin_zone"] is not None
    print(f"[PASS] Incident Detail verified: {mh['incident_code']} area={mh['spill_area_km2']} km2, DNA={mh['spill_dna']['area_km2']} km2")

    # 4. Spill Evolution Timeline
    r = client.get("/incidents/IN-MH-2026/spill-evolution")
    assert r.status_code == 200
    evo = r.json()
    assert len(evo["timeline"]) >= 6
    print(f"[PASS] Spill Evolution timeline verified: {len(evo['timeline'])} historical & forecast snapshots")

    # 5. Vessel Attributions
    r = client.get("/incidents/IN-MH-2026/vessel-attributions")
    assert r.status_code == 200
    attributions = r.json()
    assert len(attributions) >= 4
    top_vessel = attributions[0]
    assert top_vessel["attribution_pct"] == 98.8
    assert "Pacific Voyager" in top_vessel["vessel"]["name"]
    print(f"[PASS] Vessel Attribution verified: Rank #1 is {top_vessel['vessel']['name']} ({top_vessel['attribution_pct']}%)")

    # 6. Attribution Forensic Evidence
    va_id = top_vessel["id"]
    r = client.get(f"/vessel-attributions/{va_id}/evidence")
    assert r.status_code == 200
    evidence = r.json()
    assert "breakdown" in evidence
    assert "formula_weights" in evidence["breakdown"]
    print(f"[PASS] Evidence Scoring verified: Overall score={evidence['attribution']['overall_evidence_pct']}%, Verdict={evidence['attribution']['verdict']}")

    # 7. Vessels List & Filtering
    r = client.get("/vessels?limit=200")
    assert r.status_code == 200
    vessels = r.json()
    assert len(vessels) >= 140, f"Expected 140+ vessels, got {len(vessels)}"
    print(f"[PASS] Background Fleet verified: {len(vessels)} total vessels active in Indian waters")

    # 8. Ports
    r = client.get("/ports")
    assert r.status_code == 200
    ports = r.json()
    assert len(ports) == 13, f"Expected 13 major ports, got {len(ports)}"
    print(f"[PASS] 13 Major Indian Ports verified: {[p['name'].split()[0] for p in ports[:4]]}...")

    # 9. Coast Guard Assets
    r = client.get("/coast-guard-assets/nearby?lat=18.78&lng=72.51")
    assert r.status_code == 200
    assets = r.json()
    assert len(assets) >= 6
    closest = assets[0]
    print(f"[PASS] Coast Guard Assets verified: Closest asset to Mumbai High is {closest['name']} ({closest['distance_km']} km away)")

    # 10. Forecast Simulation
    r = client.get("/incidents/IN-MH-2026/forecast?hours=24")
    assert r.status_code == 200
    forecast = r.json()
    assert len(forecast["snapshots"]) >= 4
    print(f"[PASS] Lagrangian Particle Forecast verified: {len(forecast['snapshots'])} forecast steps generated")

    # 11. Counterfactual Test
    r = client.post("/incidents/IN-MH-2026/counterfactual", json={"vessel_id": top_vessel["vessel_id"]})
    assert r.status_code == 200
    cf_res = r.json()
    job_id = cf_res["job_id"]
    print(f"[PASS] Counterfactual Job Enqueued: {job_id}")

    # 12. Direct synchronous execution of jobs to verify math and PDF generation
    print("Testing direct counterfactual execution...")
    cf_result = asyncio.run(execute_counterfactual_job(job_id, top_vessel["incident_id"], top_vessel["vessel_id"], None))
    assert cf_result["status"] == "completed"
    print(f"[PASS] Counterfactual Overlap Simulation completed: Match Score = {cf_result['match_score_pct']}%")

    print("Testing PDF report generation & cryptographic SHA-256 seal...")
    rep_result = asyncio.run(execute_report_job("test-rep-1", top_vessel["incident_id"], "INCIDENT_DOSSIER", None))
    assert rep_result["status"] in ("ready", "completed")
    assert len(rep_result["file_hash"]) == 64
    print(f"[PASS] PDF Report generated: File = {rep_result['file_url']}")
    print(f"[PASS] Cryptographic SHA-256 Seal = {rep_result['file_hash']}")

    # 13. Map Viewport query
    r = client.get("/map/incidents")
    assert r.status_code == 200
    map_incidents = r.json()
    assert len(map_incidents) >= 4
    print(f"[PASS] Map incidents endpoint verified: {len(map_incidents)} active map incidents")

    # 14. Auth Register and Login
    r = client.post("/auth/login", json={"email": "commander.patil@coastguard.gov.in", "password": "Patil@1234"})
    assert r.status_code == 200
    token_data = r.json()
    assert "access_token" in token_data
    print(f"[PASS] JWT Auth Login verified: Token issued for {token_data['user']['name']} ({token_data['user']['role']})")

    print("==================================================")
    print("ALL 14 BACKEND INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
