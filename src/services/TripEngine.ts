import { geoServices, type GeocodeResult, type RouteResult, type OverpassElement } from '../api/geoServices';
import { getBoundingBox, pointToSegmentDistance } from '../utils/geoUtils';

export interface ProcessedTrip {
  routeName: string;
  distanceKm: number;
  durationMinutes: number;
  crossings: OverpassElement[];
  routeCoordinates: [number, number][]; // [lon, lat]
}

export class TripEngine {
  /**
   * Maximum distance (in meters) a crossing can be from the route polyline
   * to be considered "on" the route.
   * 150m is a safe buffer for GPS inaccuracies and wide intersections.
   */
  private static MAX_CROSSING_DISTANCE_METERS = 150;

  /**
   * Orchestrates the entire trip planning process.
   * 1. Gets route from OSRM
   * 2. Calculates bounding box
   * 3. Fetches crossings from Overpass
   * 4. Filters crossings that are actually on the route
   */
  static async planTrip(start: GeocodeResult, end: GeocodeResult): Promise<ProcessedTrip> {
    try {
      // 1. Get driving route
      const startCoords: [number, number] = [parseFloat(start.lon), parseFloat(start.lat)];
      const endCoords: [number, number] = [parseFloat(end.lon), parseFloat(end.lat)];
      
      const routeData = await geoServices.getRoute(startCoords, endCoords);
      
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error("Impossible de trouver un itinéraire entre ces deux points.");
      }

      const primaryRoute = routeData.routes[0];
      const routeCoordinates = primaryRoute.geometry.coordinates; // [lon, lat][]

      // Prevent absurdly large queries that will crash the Overpass API
      if (primaryRoute.distance > 500000) { // 500km
        throw new Error("Ce trajet est trop long pour être analysé (maximum 500 km).");
      }

      // 2. Calculate bounding box for the route with a 500m padding (reduced from 2km to prevent timeouts)
      const bbox = getBoundingBox(routeCoordinates, 500);

      // 3. Fetch all crossings within that bounding box
      const overpassData = await geoServices.getCrossingsInBBox(bbox);
      const allCrossings = overpassData.elements || [];

      // 4. Filter crossings that are actually ON the route
      const validCrossings = this.filterCrossingsOnRoute(allCrossings, routeCoordinates);

      // 5. Format the result
      return {
        routeName: `${this.formatAddress(start.display_name)} ➔ ${this.formatAddress(end.display_name)}`,
        distanceKm: primaryRoute.distance / 1000,
        durationMinutes: Math.round(primaryRoute.duration / 60),
        crossings: validCrossings,
        routeCoordinates: routeCoordinates
      };

    } catch (error) {
      console.error("TripEngine Error:", error);
      throw new Error("Erreur lors de la planification du trajet. Vérifie ta connexion.");
    }
  }

  /**
   * Filters a list of crossings to only include those that fall within 
   * MAX_CROSSING_DISTANCE_METERS of any segment of the route polyline.
   */
  private static filterCrossingsOnRoute(
    crossings: OverpassElement[], 
    routeCoords: [number, number][]
  ): OverpassElement[] {
    if (routeCoords.length < 2) return [];

    return crossings.filter(crossing => {
      // Check distance against every segment of the route
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const [lonA, latA] = routeCoords[i];
        const [lonB, latB] = routeCoords[i + 1];

        const distance = pointToSegmentDistance(
          crossing.lat, crossing.lon,
          latA, lonA,
          latB, lonB
        );

        if (distance <= this.MAX_CROSSING_DISTANCE_METERS) {
          return true; // Keep this crossing
        }
      }
      return false; // Discard, too far from route
    });
  }

  /**
   * Cleans up Nominatim display names to be more readable.
   * Takes the first two parts of the address (e.g., "123 Rue Principale, Montréal")
   */
  private static formatAddress(displayName: string): string {
    const parts = displayName.split(',');
    if (parts.length >= 2) {
      return `${parts[0].trim()}, ${parts[1].trim()}`;
    }
    return displayName;
  }
}
