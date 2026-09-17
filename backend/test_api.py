import asyncio
import io
from starlette.testclient import TestClient
from app.main import app
from app.services.tasks import execute_report_job


def run_tests():
    print("==================================================")
    print("RUNNING SAHAYYA BACKEND COMPREHENSIVE VERIFICATION")
    print("==================================================")

    # Use synchronous TestClient with lifespan context
    with TestClient(app) as client:
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
        assert len(vessels) >= 30, f"Expected 30+ vessels, got {len(vessels)}"
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
        assert len(assets) >= 3
        print(f"[PASS] Response assets verified: {len(assets)} SAR assets mobilized")

        # 10. PDF Report Generation
        print("Testing PDF report generation & cryptographic SHA-256 seal...")
        rep_result = asyncio.run(execute_report_job("test-rep-1", top_vessel["incident_id"], "INCIDENT_DOSSIER", None))
        assert rep_result["status"] in ("ready", "completed")
        assert len(rep_result["file_hash"]) == 64
        print(f"[PASS] PDF Report generated: File = {rep_result['file_url']}")
        print(f"[PASS] Cryptographic SHA-256 Seal = {rep_result['file_hash']}")

        # 11. Map Viewport query
        r = client.get("/map/incidents")
        assert r.status_code == 200
        map_incidents = r.json()
        assert len(map_incidents) >= 4
        print(f"[PASS] Map incidents endpoint verified: {len(map_incidents)} active map incidents")

        # 12. Auth Register and Login
        r = client.post("/auth/login", json={"email": "commander.patil@coastguard.gov.in", "password": "Patil@1234"})
        assert r.status_code == 200
        token_data = r.json()
        assert "access_token" in token_data
        print(f"[PASS] JWT Auth Login verified: Token issued for {token_data['user']['name']} ({token_data['user']['role']})")

        # 13. Settings Profile & Avatar Upload/Delete
        fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        r_avatar = client.post("/settings/profile/avatar", files={"file": ("test_avatar.png", fake_png, "image/png")}, headers=headers)
        assert r_avatar.status_code == 200
        avatar_res = r_avatar.json()
        assert "avatar_url" in avatar_res and avatar_res["avatar_url"].startswith("/storage/avatars/")
        print(f"[PASS] Profile Avatar upload verified: URL = {avatar_res['avatar_url']}")

        r_profile = client.get("/settings/profile", headers=headers)
        assert r_profile.status_code == 200
        prof = r_profile.json()
        assert prof["avatar_url"] == avatar_res["avatar_url"]
        print(f"[PASS] Profile fetch with updated avatar verified: {prof['name']} -> {prof['avatar_url']}")

        # 14. Avatar deletion test
        r_del = client.delete("/settings/profile/avatar", headers=headers)
        assert r_del.status_code == 200
        r_profile_del = client.get("/settings/profile", headers=headers)
        assert r_profile_del.json()["avatar_url"] is None
        print("[PASS] Profile Avatar deletion verified")

        print("==================================================")
        print("ALL 14 BACKEND INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
        print("==================================================")


if __name__ == "__main__":
    run_tests()
