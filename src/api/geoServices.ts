import type { GeocodeResult } from '../types/models';

// Nominatim Geocoding API (OpenStreetMap)
export type { GeocodeResult };

// OSRM Routing API
export interface RouteResult {
  code: string;
  routes: Array<{
    geometry: {
      coordinates: [number, number][]; // [lon, lat][]
      type: string;
    };
    distance: number; // Meters
    duration: number; // Seconds
  }>;
}

// Overpass API (Railroad Crossings)
export interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: {
    railway?: string;
  };
}

export interface OverpassResult {
  elements: OverpassElement[];
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const OSRM_URL = 'https://router.project-osrm.org';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export const geoServices = {
  /**
   * Search for an address, biased towards Quebec.
   */
  async searchAddress(query: string): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      viewbox: '-79.8,62.6,-57.1,44.9', // left,top,right,bottom
      bounded: '0',
      countrycodes: 'ca'
    });

    const response = await fetch(`${NOMINATIM_URL}/search?${params.toString()}`, {
      headers: {
        'Accept-Language': 'fr-CA,fr;q=0.9',
        'User-Agent': 'LeJeuDuTrainApp/1.0'
      }
    });

    if (!response.ok) throw new Error('Geocoding failed');
    return response.json();
  },

  /**
   * Reverse geocode coordinates to an address using Nominatim
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodeResult> {
    const response = await fetch(
      `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'Accept-Language': 'fr-CA,fr;q=0.9',
          'User-Agent': 'LeJeuDuTrainApp/1.0'
        }
      }
    );
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    return {
      place_id: data.place_id || Date.now(),
      lat: data.lat,
      lon: data.lon,
      display_name: data.display_name,
    };
  },

  /**
   * Get driving route between two coordinates.
   * Coordinates must be [longitude, latitude].
   */
  async getRoute(start: [number, number], end: [number, number]): Promise<RouteResult> {
    const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const response = await fetch(`${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    
    if (!response.ok) throw new Error('Routing failed');
    return response.json();
  },

  /**
   * Find all railroad crossings within a bounding box.
   * BBox format: [south, west, north, east]
   */
  async getCrossingsInBBox(bbox: [number, number, number, number], retries = 1): Promise<OverpassResult> {
    const [s, w, n, e] = bbox;
    // Overpass QL to find railway=level_crossing or railway=crossing
    // BBox format in Overpass QL: (south, west, north, east)
    const query = `[out:json][timeout:60];node["railway"~"^(level_crossing|crossing)$"](${s},${w},${n},${e});out body;`;

    try {
      // Overpass API often prefers GET requests with the query URL-encoded
      const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Overpass Error Response:", text);
        throw new Error('Overpass API failed');
      }
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.warn("Overpass API failed, retrying...", error);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getCrossingsInBBox(bbox, retries - 1);
      }
      throw new Error("Le serveur de cartes est surchargé. Réessaie dans quelques instants.");
    }
  }
};
