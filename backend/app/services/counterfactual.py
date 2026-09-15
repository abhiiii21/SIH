from datetime import datetime
from typing import Dict, Any, List, Optional
from shapely.geometry import shape, mapping, Polygon, Point
from app.services.drift_simulation import step_particles, generate_initial_particles, particles_to_polygon


def run_counterfactual_simulation(
    vessel_release_lon: float,
    vessel_release_lat: float,
    observed_spill_geojson: Dict[str, Any],
    drift_hours: float = 18.0,
    env_parameters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run forward Lagrangian particle drift starting from the vessel's release point,
    and compute spatial intersection/overlap with the observed spill polygon.
    """
    if not env_parameters:
        env_parameters = {
            "wind_speed_ms": 7.5,
            "wind_direction_deg": 245.0,
            "current_speed_ms": 0.85,
            "current_direction_deg": 65.0,
            "diffusion_coeff": 10.0,
        }

    # Generate particles at vessel release location
    particles = generate_initial_particles(vessel_release_lon, vessel_release_lat, radius_km=1.5, num_particles=70)

    # Advect forward in steps
    steps = max(1, int(drift_hours / 3))
    dt_sec = (drift_hours * 3600.0) / steps

    current_particles = particles
    for _ in range(steps):
        current_particles = step_particles(
            particles=current_particles,
            wind_speed_ms=float(env_parameters.get("wind_speed_ms", 7.5)),
            wind_dir_deg=float(env_parameters.get("wind_direction_deg", 245.0)),
            current_speed_ms=float(env_parameters.get("current_speed_ms", 0.85)),
            current_dir_deg=float(env_parameters.get("current_direction_deg", 65.0)),
            dt_seconds=dt_sec,
            diffusion_coeff=float(env_parameters.get("diffusion_coeff", 10.0)),
            direction_sign=1.0
        )

    # Form simulated polygon
    simulated_geom_dict = particles_to_polygon(current_particles, buffer_deg=0.012)
    simulated_poly = shape(simulated_geom_dict)

    # Load observed polygon
    try:
        observed_poly = shape(observed_spill_geojson)
    except Exception:
        # Fallback if observed shape invalid
        observed_poly = Point(vessel_release_lon, vessel_release_lat).buffer(0.04)

    # Compute intersection and IoU / Dice Overlap
    if not simulated_poly.is_valid:
        simulated_poly = simulated_poly.buffer(0)
    if not observed_poly.is_valid:
        observed_poly = observed_poly.buffer(0)

    sim_area = simulated_poly.area
    obs_area = observed_poly.area
    intersection_poly = simulated_poly.intersection(observed_poly)
    intersection_area = intersection_poly.area if not intersection_poly.is_empty else 0.0

    # Sorensen-Dice spatial similarity: (2 * |A ∩ B|) / (|A| + |B|)
    denominator = sim_area + obs_area
    if denominator > 0:
        overlap_ratio = (2.0 * intersection_area) / denominator
    else:
        overlap_ratio = 0.0

    # Distance penalty between centroids
    sim_centroid = simulated_poly.centroid
    obs_centroid = observed_poly.centroid
    centroid_dist_deg = sim_centroid.distance(obs_centroid)
    dist_penalty = max(0.0, 1.0 - (centroid_dist_deg / 0.15))

    # Combined match score (0% to 100%)
    raw_score = (overlap_ratio * 0.7 + dist_penalty * 0.3) * 100.0
    match_score_pct = round(min(99.4, max(4.5, raw_score)), 1)

    return {
        "match_score_pct": match_score_pct,
        "simulated_geometry": simulated_geom_dict,
        "simulated_centroid": [round(sim_centroid.x, 4), round(sim_centroid.y, 4)],
        "overlap_area_ratio": round(overlap_ratio, 4),
        "centroid_distance_km": round(centroid_dist_deg * 111.0, 2),
        "parameters": env_parameters,
    }
