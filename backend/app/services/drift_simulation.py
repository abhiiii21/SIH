import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
import numpy as np
from shapely.geometry import Polygon, MultiPoint, mapping, Point


def degrees_to_meters(lat: float) -> Tuple[float, float]:
    """Return meters per degree latitude and meters per degree longitude."""
    m_per_deg_lat = 111320.0
    m_per_deg_lon = 111320.0 * math.cos(math.radians(lat))
    return m_per_deg_lat, max(m_per_deg_lon, 1000.0)


def generate_initial_particles(center_lon: float, center_lat: float, radius_km: float = 2.0, num_particles: int = 60) -> np.ndarray:
    """Generate random particles clustered around a center location."""
    m_per_deg_lat, m_per_deg_lon = degrees_to_meters(center_lat)
    
    # Generate random points in ellipse/circle
    radii = np.random.uniform(0, radius_km * 1000.0, num_particles)
    angles = np.random.uniform(0, 2 * np.pi, num_particles)
    
    dx = radii * np.cos(angles)
    dy = radii * np.sin(angles)
    
    lons = center_lon + (dx / m_per_deg_lon)
    lats = center_lat + (dy / m_per_deg_lat)
    
    return np.column_stack([lons, lats])


def step_particles(
    particles: np.ndarray,
    wind_speed_ms: float,
    wind_dir_deg: float,
    current_speed_ms: float,
    current_dir_deg: float,
    dt_seconds: float,
    diffusion_coeff: float = 8.0,
    direction_sign: float = 1.0  # +1.0 for forward forecast, -1.0 for backward hindcast
) -> np.ndarray:
    """
    Apply 2D Lagrangian advection-diffusion:
    V_total = V_current + 0.03 * V_wind + Brownian diffusion
    """
    mean_lat = float(np.mean(particles[:, 1]))
    m_per_deg_lat, m_per_deg_lon = degrees_to_meters(mean_lat)

    # Meteorological wind direction is 'from', nautical is 'towards'
    # Convert to mathematical angle (0 deg = East, 90 deg = North)
    # Nautical convention: 0 = North, 90 = East
    wind_rad = math.radians((90.0 - wind_dir_deg + 180.0) % 360.0)
    curr_rad = math.radians((90.0 - current_dir_deg) % 360.0)

    # Wind drift factor is typically 3% of 10m wind
    wind_factor = 0.03
    vx = direction_sign * (current_speed_ms * math.cos(curr_rad) + wind_factor * wind_speed_ms * math.cos(wind_rad))
    vy = direction_sign * (current_speed_ms * math.sin(curr_rad) + wind_factor * wind_speed_ms * math.sin(wind_rad))

    # Displacement in meters
    dx_advection = vx * dt_seconds
    dy_advection = vy * dt_seconds

    # Brownian diffusion dispersion
    num_particles = len(particles)
    sigma = math.sqrt(2.0 * diffusion_coeff * abs(dt_seconds))
    dx_diffusion = np.random.normal(0, sigma, num_particles)
    dy_diffusion = np.random.normal(0, sigma, num_particles)

    # Total displacement converted to degrees lon/lat
    d_lon = (dx_advection + dx_diffusion) / m_per_deg_lon
    d_lat = (dy_advection + dy_diffusion) / m_per_deg_lat

    new_particles = np.copy(particles)
    new_particles[:, 0] += d_lon
    new_particles[:, 1] += d_lat

    return new_particles


def particles_to_polygon(particles: np.ndarray, buffer_deg: float = 0.008) -> Dict[str, Any]:
    """Convert particle cloud to a smoothed GeoJSON polygon."""
    points = [Point(p[0], p[1]) for p in particles]
    mp = MultiPoint(points)
    hull = mp.convex_hull
    if hull.geom_type == "Polygon":
        buffered = hull.buffer(buffer_deg).simplify(0.002)
        return mapping(buffered)
    elif hull.geom_type == "Point":
        return mapping(hull.buffer(0.02))
    else:
        return mapping(mp.buffer(0.02).convex_hull)


def simulate_forecast(
    center_lon: float,
    center_lat: float,
    hours: int = 24,
    env_readings: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Run forward Lagrangian forecast simulation for given hours.
    Returns list of snapshot dictionaries containing time, polygon, centroid.
    """
    if not env_readings:
        env_readings = [{
            "wind_speed_ms": 7.5,
            "wind_direction_deg": 245.0,
            "current_speed_ms": 0.85,
            "current_direction_deg": 65.0,
        }]

    particles = generate_initial_particles(center_lon, center_lat, radius_km=3.0, num_particles=75)
    snapshots = []
    
    # Capture initial t0
    now = datetime.now(timezone.utc)
    snapshots.append({
        "hours_from_now": 0,
        "forecast_time": now.isoformat(),
        "centroid": [round(float(np.mean(particles[:, 0])), 4), round(float(np.mean(particles[:, 1])), 4)],
        "polygon": particles_to_polygon(particles),
    })

    # Time steps: 6h increments up to hours
    step_hours = 6
    total_steps = max(1, hours // step_hours)

    current_particles = np.copy(particles)
    sim_time = now

    for step in range(1, total_steps + 1):
        env = env_readings[min(step, len(env_readings) - 1)]
        dt_sec = step_hours * 3600.0
        
        current_particles = step_particles(
            particles=current_particles,
            wind_speed_ms=float(env.get("wind_speed_ms", 7.5)),
            wind_dir_deg=float(env.get("wind_direction_deg", 245.0)),
            current_speed_ms=float(env.get("current_speed_ms", 0.85)),
            current_dir_deg=float(env.get("current_direction_deg", 65.0)),
            dt_seconds=dt_sec,
            diffusion_coeff=12.0,
            direction_sign=1.0
        )
        sim_time += timedelta(hours=step_hours)

        poly = particles_to_polygon(current_particles, buffer_deg=0.008 + (step * 0.003))
        centroid = [round(float(np.mean(current_particles[:, 0])), 4), round(float(np.mean(current_particles[:, 1])), 4)]

        snapshots.append({
            "hours_from_now": step * step_hours,
            "forecast_time": sim_time.isoformat(),
            "centroid": centroid,
            "polygon": poly,
        })

    return snapshots


def simulate_hindcast(
    observed_lon: float,
    observed_lat: float,
    hours_back: int = 18,
    env_readings: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run backward Lagrangian hindcast simulation to estimate origin release zone.
    """
    if not env_readings:
        env_readings = [{
            "wind_speed_ms": 7.5,
            "wind_direction_deg": 245.0,
            "current_speed_ms": 0.85,
            "current_direction_deg": 65.0,
        }]

    particles = generate_initial_particles(observed_lon, observed_lat, radius_km=2.5, num_particles=60)
    current_particles = np.copy(particles)

    # Step backwards in 3h chunks
    step_hours = 3
    num_steps = max(1, hours_back // step_hours)

    for i in range(num_steps):
        env = env_readings[min(i, len(env_readings) - 1)]
        current_particles = step_particles(
            particles=current_particles,
            wind_speed_ms=float(env.get("wind_speed_ms", 7.5)),
            wind_dir_deg=float(env.get("wind_direction_deg", 245.0)),
            current_speed_ms=float(env.get("current_speed_ms", 0.85)),
            current_dir_deg=float(env.get("current_direction_deg", 65.0)),
            dt_seconds=step_hours * 3600.0,
            diffusion_coeff=10.0,
            direction_sign=-1.0  # Backward!
        )

    origin_poly = particles_to_polygon(current_particles, buffer_deg=0.015)
    origin_centroid = [round(float(np.mean(current_particles[:, 0])), 4), round(float(np.mean(current_particles[:, 1])), 4)]

    return {
        "origin_centroid": origin_centroid,
        "zone_geometry": origin_poly,
        "hours_back": hours_back
    }
