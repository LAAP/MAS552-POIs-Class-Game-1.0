import type { LatLng } from '../types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocode a text query (city, address, landmark) into coordinates.
 * Uses the free Nominatim API from OpenStreetMap.
 *
 * To swap with another geocoding provider:
 * - Replace this function body
 * - Keep the same return type: { location, displayName }
 */
export async function geocodeQuery(
  query: string
): Promise<{ location: LatLng; displayName: string } | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      'User-Agent': 'MAS552-POI-Game/1.0 (academic use)',
    },
  });

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data: NominatimResult[] = await res.json();
  if (data.length === 0) return null;

  return {
    location: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
    displayName: data[0].display_name,
  };
}

/**
 * Reverse geocode: get a place name from coordinates.
 */
export async function reverseGeocode(location: LatLng): Promise<string> {
  const params = new URLSearchParams({
    lat: location.lat.toString(),
    lon: location.lng.toString(),
    format: 'json',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        'User-Agent': 'MAS552-POI-Game/1.0 (academic use)',
      },
    });

    if (!res.ok) return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;

    const data = await res.json();
    return data.display_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  } catch {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
}
