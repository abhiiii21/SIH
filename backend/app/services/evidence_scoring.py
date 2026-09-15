from typing import Dict, Any


def calculate_evidence_breakdown(
    cpa_km: float,
    time_delta_hours: float,
    track_deviation_deg: float,
    min_sog_kts: float,
    ais_gap_minutes: int,
    counterfactual_match_score: float,
    has_asi_anomaly: bool = False
) -> Dict[str, Any]:
    """
    Calculate traceable, explainable multi-dimensional attribution evidence scores
    based on maritime forensics and physics-driven trajectory matching.
    """
    # 1. Time Match (%): penalize time delta from estimated release window
    # 0h delta = 100%, 10h delta = 55%, 22h+ = 0%
    time_match = max(5.0, min(100.0, 100.0 - (abs(time_delta_hours) * 4.5)))

    # 2. Location Match (%): Closest Point of Approach (CPA) to release centroid
    # 0 km = 100%, 5 km = 65%, 12+ km = 5%
    loc_match = max(5.0, min(100.0, 100.0 - (cpa_km * 7.5)))

    # 3. Route Match (%): Track consistency and speed reduction in slick corridor
    # Speed drop below 5 knots indicates slow steaming / loitering / discharge
    speed_factor = 25.0 if min_sog_kts < 5.0 else 10.0
    heading_factor = max(0.0, 30.0 - (track_deviation_deg * 0.5))
    route_match = max(10.0, min(98.5, 45.0 + speed_factor + heading_factor))

    # 4. AIS Consistency (%): Gaps in AIS transmission during corridor transit
    # Normal operations: 98-100%. Dark ship / loitering: < 40%
    gap_penalty = min(75.0, (ais_gap_minutes / 60.0) * 18.0)
    anomaly_penalty = 15.0 if has_asi_anomaly else 0.0
    ais_consistency = max(12.0, min(99.0, 98.0 - gap_penalty - anomaly_penalty))

    # 5. Physics Match (%): Lagrangian counterfactual backward-forward overlap
    physics_match = max(5.0, min(99.5, counterfactual_match_score))

    # Weighted Composite Overall Evidence:
    # 25% Time + 25% Location + 15% Route + 15% AIS + 20% Physics
    overall = (
        0.25 * time_match +
        0.25 * loc_match +
        0.15 * route_match +
        0.15 * ais_consistency +
        0.20 * physics_match
    )
    overall_score = round(min(99.5, max(5.0, overall)), 1)

    # Scientific Verdict
    if overall_score >= 80.0:
        verdict = "highly_consistent"
    elif overall_score >= 50.0:
        verdict = "consistent"
    else:
        verdict = "inconsistent"

    return {
        "time_match_pct": round(time_match, 1),
        "location_match_pct": round(loc_match, 1),
        "route_match_pct": round(route_match, 1),
        "ais_consistency_pct": round(ais_consistency, 1),
        "physics_match_pct": round(physics_match, 1),
        "overall_evidence_pct": overall_score,
        "verdict": verdict,
        "metrics": {
            "cpa_km": round(cpa_km, 2),
            "time_delta_hours": round(time_delta_hours, 2),
            "min_sog_kts": round(min_sog_kts, 1),
            "ais_gap_minutes": ais_gap_minutes,
            "counterfactual_match_score": round(counterfactual_match_score, 1),
        },
        "formula_weights": {
            "time_match": "25%",
            "location_match": "25%",
            "route_match": "15%",
            "ais_consistency": "15%",
            "physics_drift": "20%",
        }
    }
