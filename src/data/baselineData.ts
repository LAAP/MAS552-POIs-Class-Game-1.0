import type { BaselineAmenity, BaselineSourceType } from '../types';

/**
 * =====================================================================
 * THESIS-DERIVED BASELINE DISTANCES
 * Source: "Memoria final.pdf" — Table 22 & Table 32
 * Sections 5.6 and 6.4 ("Optimal distances")
 * =====================================================================
 *
 * These baseline distances come from Memoria final.pdf, Table 22 /
 * Table 32 final distance results.
 *
 * These are NOT current observed distances; they are thesis-derived
 * target / recommended distances. The final distance is the correct
 * output because it combines:
 *   1. frequency of use, and
 *   2. walking boundary,
 * through an exponential function.
 * The thesis used 1 km as the maximum possible distance.
 *
 * Values are stored as miles (the thesis unit) and converted to km
 * at runtime. Walking minutes are computed dynamically from the
 * user-selected walking speed (default 4 km/h, per thesis reference
 * of ~10–14 min/km at moderate pace).
 * =====================================================================
 */

export const THESIS_BASELINE_DISTANCES_MILES: Record<string, number> = {
  restaurant_full_service: 0.229,
  cafe_snack_nonalcoholic: 0.263,
  fast_food_limited_service: 0.272,
  grocery_supermarket: 0.454,
  home_goods: 0.491,
  hotel_lodging: 0.287,
  parks_nature: 0.303,
  gym: 0.260,
  elementary_school: 0.383,
  drinking_places: 0.273,
  university: 0.433,
  clothing_store: 0.458,
  real_estate: 0.383,
  hospital: 0.318,
  convenience_store: 0.505,
  liquor_store: 0.479,
  car_dealer: 0.484,
  pharmacy: 0.440,
  less_frequented_stores: 0.492,
  recreation: 0.298,
  florist: 0.508,
  religious_center: 0.368,
  fuel_station: 0.468,
};

/**
 * =====================================================================
 * GAME AMENITY → THESIS BASELINE MAPPING
 * =====================================================================
 *
 * Some categories are exact mappings, others are approximations because
 * the game taxonomy (based on OSM tags) is simpler than the thesis
 * taxonomy (based on US NAICS codes).
 * =====================================================================
 */

interface BaselineMapping {
  thesisKey: string;
  sourceType: BaselineSourceType;
  sourceSubAmenityName: string;
  notes?: string;
}

export const GAME_AMENITY_TO_BASELINE: Record<string, BaselineMapping> = {
  restaurant: {
    thesisKey: 'restaurant_full_service',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Full-Service Restaurants',
  },
  cafe: {
    thesisKey: 'cafe_snack_nonalcoholic',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Snack and Nonalcoholic Beverage Bars',
  },
  grocery: {
    thesisKey: 'grocery_supermarket',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Grocery or Supermarket',
  },
  convenience_store: {
    thesisKey: 'convenience_store',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Convenience Corner Store',
  },
  school: {
    thesisKey: 'elementary_school',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Elementary School',
  },
  pharmacy: {
    thesisKey: 'pharmacy',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Pharmacy',
  },
  hospital: {
    thesisKey: 'hospital',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Hospitals',
  },
  gym: {
    thesisKey: 'gym',
    sourceType: 'thesis_exact',
    sourceSubAmenityName: 'Gym',
  },
  park: {
    thesisKey: 'parks_nature',
    sourceType: 'thesis_approximation',
    sourceSubAmenityName: 'Zoos and Nature Parks',
    notes: 'OSM leisure=park is broader than thesis "Zoos and Nature Parks"',
  },
  library: {
    thesisKey: 'recreation',
    sourceType: 'thesis_approximation',
    sourceSubAmenityName: 'Recreation Industries',
    notes: 'No direct thesis match; approximated via Recreation Industries',
  },
  bus_stop: {
    thesisKey: '',
    sourceType: 'placeholder_external',
    sourceSubAmenityName: 'Transit (no thesis value)',
    notes: 'Transit not covered in thesis; placeholder at 0.25 mi (~0.4 km)',
  },
  train_station: {
    thesisKey: '',
    sourceType: 'placeholder_external',
    sourceSubAmenityName: 'Transit (no thesis value)',
    notes: 'Transit not covered in thesis; placeholder at 0.5 mi (~0.8 km)',
  },
  bank: {
    thesisKey: '',
    sourceType: 'placeholder_external',
    sourceSubAmenityName: 'Financial (no thesis value)',
    notes: 'Banking not covered in thesis; placeholder at 0.35 mi (~0.56 km)',
  },
};

/**
 * Placeholder distances (in miles) for categories not found in the thesis.
 * These are NOT thesis-derived — they are rough external estimates.
 */
const PLACEHOLDER_DISTANCES_MILES: Record<string, number> = {
  bus_stop: 0.25,
  train_station: 0.5,
  bank: 0.35,
};

/* =====================================================================
   CONVERSION HELPERS
   ===================================================================== */

const MILES_TO_KM = 1.60934;

export function milesToKm(miles: number): number {
  return Math.round(miles * MILES_TO_KM * 1000) / 1000;
}

export function distanceKmToMinutes(
  distanceKm: number,
  walkingSpeedKmH: number
): number {
  return Math.round(((distanceKm / walkingSpeedKmH) * 60) * 10) / 10;
}

/* =====================================================================
   BUILD THE FULL BASELINE AMENITY TABLE
   ===================================================================== */

function buildBaselineAmenity(gameId: string): BaselineAmenity {
  const mapping = GAME_AMENITY_TO_BASELINE[gameId];
  if (!mapping) {
    return {
      id: gameId,
      label: gameId,
      sourceSubAmenityName: 'Unknown',
      baselineDistanceMiles: null,
      baselineDistanceKm: null,
      baselineWalkingMinutesAt4Kmh: null,
      sourceType: 'placeholder_external',
      notes: 'No baseline mapping defined for this amenity',
    };
  }

  let distMiles: number | null = null;

  if (mapping.sourceType === 'placeholder_external') {
    distMiles = PLACEHOLDER_DISTANCES_MILES[gameId] ?? null;
  } else {
    distMiles = THESIS_BASELINE_DISTANCES_MILES[mapping.thesisKey] ?? null;
  }

  const distKm = distMiles !== null ? milesToKm(distMiles) : null;
  const minAt4 = distKm !== null ? distanceKmToMinutes(distKm, 4) : null;

  return {
    id: gameId,
    label: mapping.sourceSubAmenityName,
    sourceSubAmenityName: mapping.sourceSubAmenityName,
    baselineDistanceMiles: distMiles,
    baselineDistanceKm: distKm,
    baselineWalkingMinutesAt4Kmh: minAt4,
    sourceType: mapping.sourceType,
    notes: mapping.notes,
  };
}

export const BASELINE_AMENITIES: Record<string, BaselineAmenity> = {};

for (const gameId of Object.keys(GAME_AMENITY_TO_BASELINE)) {
  BASELINE_AMENITIES[gameId] = buildBaselineAmenity(gameId);
}
