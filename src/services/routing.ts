import type { LatLng } from '../types';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot';

/**
 * Haversine formula: straight-line distance in meters between two points.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const DETOUR_FACTOR = 1.3;

/**
 * Estimate walking time from straight-line distance.
 * Uses a detour factor of 1.3 to approximate street-network distance.
 * Literature ranges from 1.2 (grid cities) to 1.6 (irregular layouts).
 */
export function estimateWalkingMinutes(
  straightLineMeters: number,
  speedKmh = 4
): number {
  const streetMeters = straightLineMeters * DETOUR_FACTOR;
  const speedMpm = (speedKmh * 1000) / 60;
  return streetMeters / speedMpm;
}

interface RouteResult {
  durationSeconds: number;
  distanceMeters: number;
  geometry: [number, number][];
}

/**
 * OSRM's foot profile assumes approximately 5 km/h.
 * We rescale the returned duration by (OSRM_BASE_SPEED / userSpeed)
 * so that user speed selection is reflected.
 */
const OSRM_FOOT_PROFILE_SPEED = 5;

async function fetchOSRMRoute(
  from: LatLng,
  to: LatLng
): Promise<RouteResult | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const geometry: [number, number][] =
      route.geometry?.coordinates?.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      ) || [];

    return {
      durationSeconds: route.duration,
      distanceMeters: route.distance,
      geometry,
    };
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface WalkingTimeResult {
  minutes: number;
  routeDistanceMeters: number | null;
  geometry: [number, number][] | null;
  source: 'osm-route' | 'osm-estimate';
}

/**
 * Calculate walking time from center to a POI.
 * Tries real OSRM routing first, falls back to straight-line estimate.
 */
export async function getWalkingTime(
  from: LatLng,
  to: LatLng,
  speedKmh = 4
): Promise<WalkingTimeResult> {
  const route = await fetchOSRMRoute(from, to);

  if (route) {
    const speedFactor = OSRM_FOOT_PROFILE_SPEED / speedKmh;
    return {
      minutes: (route.durationSeconds / 60) * speedFactor,
      routeDistanceMeters: route.distanceMeters,
      geometry: route.geometry,
      source: 'osm-route',
    };
  }

  const dist = haversineDistance(from, to);
  return {
    minutes: estimateWalkingMinutes(dist, speedKmh),
    routeDistanceMeters: null,
    geometry: null,
    source: 'osm-estimate',
  };
}

/**
 * Calculate walking times for multiple POIs with a small delay between
 * requests to avoid rate-limiting the OSRM demo server.
 */
export async function getWalkingTimeBatch(
  from: LatLng,
  destinations: { id: string; location: LatLng }[],
  speedKmh = 4
): Promise<Record<string, WalkingTimeResult>> {
  const results: Record<string, WalkingTimeResult> = {};

  for (let i = 0; i < destinations.length; i++) {
    results[destinations[i].id] = await getWalkingTime(
      from,
      destinations[i].location,
      speedKmh
    );
    if (i < destinations.length - 1) {
      await delay(250);
    }
  }

  return results;
}
