import type { ResolvedBaseline, BaselineSourceType } from '../types';
import {
  BASELINE_AMENITIES,
  distanceKmToMinutes,
} from '../data/baselineData';

const SOURCE_LABELS: Record<BaselineSourceType, string> = {
  thesis_exact: 'Thesis exact',
  thesis_approximation: 'Thesis approx.',
  placeholder_external: 'External placeholder',
};

/**
 * Resolve the baseline for a game amenity category at a given walking speed.
 *
 * Returns null baselineMinutes when no data is available at all —
 * never silently invents a fallback number.
 */
export function getBaselineForAmenity(
  amenityId: string,
  walkingSpeedKmH = 4
): ResolvedBaseline {
  const entry = BASELINE_AMENITIES[amenityId];

  if (!entry || entry.baselineDistanceKm === null) {
    return {
      baselineMinutes: null,
      baselineDistanceKm: null,
      sourceType: 'placeholder_external',
      sourceLabel: entry
        ? SOURCE_LABELS[entry.sourceType]
        : 'No baseline available',
      sourceSubAmenityName: entry?.sourceSubAmenityName ?? 'Unknown',
      notes: entry?.notes ?? 'No baseline data available for this amenity',
    };
  }

  return {
    baselineMinutes: distanceKmToMinutes(entry.baselineDistanceKm, walkingSpeedKmH),
    baselineDistanceKm: entry.baselineDistanceKm,
    sourceType: entry.sourceType,
    sourceLabel: SOURCE_LABELS[entry.sourceType],
    sourceSubAmenityName: entry.sourceSubAmenityName,
    notes: entry.notes,
  };
}

/**
 * Recompute baseline minutes for a single amenity at a new walking speed.
 * Returns null when no distance data is available.
 */
export function recomputeBaselineMinutes(
  baselineDistanceKm: number | null,
  walkingSpeedKmH: number
): number | null {
  if (baselineDistanceKm === null) return null;
  return distanceKmToMinutes(baselineDistanceKm, walkingSpeedKmH);
}
