/**
 * Utility functions for geographic calculations.
 * Used to filter Overpass API results against OSRM route polylines.
 */

// Earth radius in meters
const R = 6371e3;

/**
 * Convert degrees to radians
 */
export const toRad = (value: number) => (value * Math.PI) / 180;

/**
 * Convert radians to degrees
 */
export const toDeg = (value: number) => (value * 180) / Math.PI;

/**
 * Haversine formula to calculate the great-circle distance between two points on a sphere.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculates the shortest distance from a point to a line segment defined by two points.
 * Uses cross-track distance if the projection falls on the segment, otherwise distance to closest endpoint.
 * 
 * @param pLat Point Latitude
 * @param pLon Point Longitude
 * @param aLat Segment Start Latitude
 * @param aLon Segment Start Longitude
 * @param bLat Segment End Latitude
 * @param bLon Segment End Longitude
 * @returns Distance in meters
 */
export const pointToSegmentDistance = (
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number
): number => {
  // Convert to radians
  const pLatR = toRad(pLat), pLonR = toRad(pLon);
  const aLatR = toRad(aLat), aLonR = toRad(aLon);
  const bLatR = toRad(bLat), bLonR = toRad(bLon);

  // Distance from A to B
  const dAB = getDistance(aLat, aLon, bLat, bLon);
  if (dAB === 0) return getDistance(pLat, pLon, aLat, aLon);

  // Distance from A to P
  const dAP = getDistance(aLat, aLon, pLat, pLon);
  // Distance from B to P
  const dBP = getDistance(bLat, bLon, pLat, pLon);

  // Calculate bearing from A to B
  const y1 = Math.sin(bLonR - aLonR) * Math.cos(bLatR);
  const x1 = Math.cos(aLatR) * Math.sin(bLatR) - Math.sin(aLatR) * Math.cos(bLatR) * Math.cos(bLonR - aLonR);
  const bearingAB = Math.atan2(y1, x1);

  // Calculate bearing from A to P
  const y2 = Math.sin(pLonR - aLonR) * Math.cos(pLatR);
  const x2 = Math.cos(aLatR) * Math.sin(pLatR) - Math.sin(aLatR) * Math.cos(pLatR) * Math.cos(pLonR - aLonR);
  const bearingAP = Math.atan2(y2, x2);

  // Angle between AB and AP
  const angle = Math.abs(bearingAB - bearingAP);

  // Cross-track distance
  const dxt = Math.asin(Math.sin(dAP / R) * Math.sin(angle)) * R;

  // Along-track distance
  const dat = Math.acos(Math.cos(dAP / R) / Math.cos(dxt / R)) * R;

  // If projection falls outside the segment, return distance to closest endpoint
  if (dat < 0 || dat > dAB || isNaN(dat)) {
    return Math.min(dAP, dBP);
  }

  return Math.abs(dxt);
};

/**
 * Calculates a bounding box that encompasses an array of coordinates.
 * @param coords Array of [longitude, latitude]
 * @param paddingMeters Padding to add around the box (approximate)
 * @returns [south, west, north, east]
 */
export const getBoundingBox = (coords: [number, number][], paddingMeters: number = 2000): [number, number, number, number] => {
  if (coords.length === 0) return [0, 0, 0, 0];

  let minLon = coords[0][0];
  let maxLon = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];

  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Very rough approximation: 1 degree lat ~ 111km. 
  // Longitude varies by cos(lat), but we'll use a safe over-estimation for the bbox.
  const latPadding = paddingMeters / 111000;
  const lonPadding = paddingMeters / (111000 * Math.cos(toRad((minLat + maxLat) / 2)));

  return [
    minLat - latPadding, // South
    minLon - Math.abs(lonPadding), // West
    maxLat + latPadding, // North
    maxLon + Math.abs(lonPadding)  // East
  ];
};
