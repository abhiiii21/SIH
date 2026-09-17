/**
 * Maritime Geographic Boundary and Land-Sea Masking Service for Indian EEZ (Client-Side)
 *
 * Ensures no vessel coordinates, simulated AIS telemetry, fallback pins, or track waypoints
 * are rendered on inland landmass, farmland, or mountainous terrain.
 * Conforms to International Hydrographic Organization (IHO) and Indian Coast Guard definitions.
 */

// Polygon definition of the Indian Subcontinent landmass.
// Tracing counter-clockwise: Sir Creek / Kutch -> Saurashtra -> Western Seaboard -> Cape Comorin -> Eastern Seaboard -> Sundarbans.
const INDIAN_LANDMASS_POLYGON: [number, number][] = [
  // [longitude, latitude]
  [68.10, 23.65], // Sir Creek
  [68.50, 23.85],
  [69.50, 24.00],
  [71.00, 24.50],
  [72.50, 24.50],
  [88.50, 24.50],
  [89.15, 22.00], // Sundarbans East
  [88.80, 21.60], // Sundarbans Coast
  [87.80, 21.80], // Haldia / Digha
  [86.95, 20.80], // Dhamra
  [86.65, 20.25], // Paradip
  [85.10, 19.50], // Gopalpur
  [83.25, 17.65], // Visakhapatnam
  [82.25, 16.95], // Kakinada
  [81.20, 16.15], // Machilipatnam
  [80.20, 14.50], // Krishnapatnam
  [80.25, 13.15], // Chennai / Ennore
  [79.85, 10.30], // Point Calimere
  [78.80, 9.25],  // Mandapam / Rameswaram
  [78.18, 8.75],  // Tuticorin
  [77.55, 8.08],  // Kanyakumari
  [76.95, 8.45],  // Vizhinjam / Thiruvananthapuram
  [76.25, 9.95],  // Kochi Port
  [75.75, 11.25], // Kozhikode
  [75.35, 11.90], // Kannur
  [74.80, 12.90], // Mangalore
  [74.12, 14.80], // Karwar
  [73.78, 15.40], // Mormugao / Goa
  [73.55, 16.05], // Malvan / Vengurla
  [73.28, 17.00], // Ratnagiri
  [73.15, 17.60], // Dabhol / Guhagar
  [72.95, 18.30], // Murud / Janjira
  [72.85, 18.65], // Alibaug Coast
  [72.78, 18.95], // Mumbai Coastline
  [72.76, 19.25], // Vasai / Madh
  [72.72, 20.10], // Dahanu
  [72.78, 20.45], // Daman
  [72.70, 21.15], // Surat / Hazira
  [72.55, 21.70], // Dahej
  [72.60, 22.30], // Head of Gulf of Khambhat
  // Saurashtra Peninsula
  [72.15, 21.76], // Bhavnagar
  [72.05, 21.10], // Mahuva
  [71.50, 20.80], // Jafrabad
  [70.90, 20.70], // Diu
  [70.36, 20.90], // Veraval
  [69.60, 21.60], // Porbandar
  [68.80, 22.20], // West of Dwarka
  [68.75, 22.50], // West of Okha Point (Extended to enclose Okhamandal)
  [69.15, 22.52], // Okha / Bet Dwarka
  [69.30, 22.42], // Salaya
  [69.80, 22.52], // Sikka
  [70.30, 22.75], // Jodiya
  [70.45, 22.85], // Navlakhi
  [70.70, 23.10], // Little Rann
  [70.20, 23.00], // Kandla
  [69.75, 22.84], // Mundra
  [69.35, 22.82], // Mandvi
  [68.60, 23.25], // Jakhau
  [68.10, 23.65], // Closure
];

// Sri Lanka Landmass Polygon
const SRI_LANKA_POLYGON: [number, number][] = [
  [79.70, 9.80],
  [80.50, 9.80],
  [81.80, 7.50],
  [81.80, 6.90],
  [81.20, 6.00],
  [80.20, 6.00],
  [79.80, 6.90],
  [79.70, 9.00],
  [79.70, 9.80],
];

// Andaman Islands Landmass Polygon
const ANDAMAN_POLYGON: [number, number][] = [
  [92.60, 11.40],
  [92.85, 11.40],
  [92.85, 13.50],
  [92.60, 13.50],
];

/**
 * Standard ray-casting algorithm to test whether a point [lon, lat] is inside a polygon.
 */
function pointInPolygon(lon: number, lat: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Determines whether a given coordinate (lat, lon) is situated on the Indian landmass or islands.
 */
export function isPointOnLand(lat: number, lon: number): boolean {
  // Rapid bounding box exclusion
  if (lon < 68.0 || lon > 94.0 || lat < 5.8 || lat > 24.5) {
    return false;
  }

  return (
    pointInPolygon(lon, lat, INDIAN_LANDMASS_POLYGON) ||
    pointInPolygon(lon, lat, SRI_LANKA_POLYGON) ||
    pointInPolygon(lon, lat, ANDAMAN_POLYGON)
  );
}

/**
 * Validates and clamps a coordinate pair [lat, lon] to ensure the vessel is strictly situated
 * in navigable sea water (Arabian Sea, Bay of Bengal, or Andaman Sea).
 *
 * @param lat Latitude in degrees North
 * @param lon Longitude in degrees East
 * @returns [safeLat, safeLon] strictly in sea waters away from shore.
 */
export function clampToNavigableSea(lat: number, lon: number): [number, number] {
  // Strict coastal buffer clamping:
  // 1. Mumbai High / Central Maharashtra corridor (Lat 18.0 - 20.0)
  if (lat >= 18.0 && lat <= 20.0) {
    if (lon > 72.58) {
      return [Number(lat.toFixed(4)), 72.48];
    }
  }

  // 2. Saurashtra / Gujarat corridor (Lat 20.5 - 23.0)
  if (lat >= 20.5 && lat <= 23.0) {
    if (lon > 68.75 && lon < 72.45) {
      // If caught in Saurashtra peninsula or Okhamandal land, project into open Arabian Sea
      return [21.40, 69.10];
    }
  }

  // 3. Chennai / Tamil Nadu corridor (Lat 12.0 - 14.5)
  if (lat >= 12.0 && lat <= 14.5) {
    if (lon < 80.55 && lon >= 79.8) {
      return [Number(lat.toFixed(4)), 80.65];
    }
  }

  // 4. Visakhapatnam / Andhra corridor (Lat 16.5 - 18.5)
  if (lat >= 16.5 && lat <= 18.5) {
    if (lon < 83.55 && lon >= 82.5) {
      return [Number(lat.toFixed(4)), 83.65];
    }
  }

  // 5. Andaman & Nicobar Sea (Lat 10.0 - 14.0)
  if (lat >= 10.0 && lat <= 14.0 && lon >= 92.0 && lon <= 93.0) {
    return [Number(lat.toFixed(4)), 93.15];
  }

  // 6. General check via polygon
  const onLand = isPointOnLand(lat, lon);
  if (!onLand) {
    return [Number(lat.toFixed(4)), Number(lon.toFixed(4))];
  }

  // Clamping for any remaining on-land points
  if (lon < 77.5) {
    // West Coast (Arabian Sea)
    if (lat >= 20.5) return [21.40, 69.10];
    if (lat >= 18.0) return [Number(lat.toFixed(4)), 72.40];
    if (lat >= 15.0) return [Number(lat.toFixed(4)), 72.85];
    if (lat >= 11.5) return [Number(lat.toFixed(4)), 73.80];
    return [Number(lat.toFixed(4)), 75.60];
  } else if (lon >= 91.0) {
    // Andaman Sea
    return [Number(lat.toFixed(4)), 93.15];
  } else {
    // East Coast (Bay of Bengal)
    if (lat >= 19.0) return [Number(lat.toFixed(4)), 87.10];
    if (lat >= 16.0) return [Number(lat.toFixed(4)), 83.65];
    if (lat >= 12.0) return [Number(lat.toFixed(4)), 80.65];
    return [Number(lat.toFixed(4)), 80.20];
  }
}

