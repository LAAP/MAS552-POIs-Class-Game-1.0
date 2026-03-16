import { useCallback, useRef, useState } from 'react';
import type {
  GameState,
  LatLng,
  AmenityResult,
  POIStatus,
} from '../types';
import type { CensusSnapshot } from '../types/census';
import { geocodeQuery, reverseGeocode } from '../services/geocoding';
import { fetchNearbyPOIs } from '../services/poi';
import { getWalkingTimeBatch } from '../services/routing';
import { getBaselineForAmenity, recomputeBaselineMinutes } from '../services/baseline';
import { calculateComparisons, computeConfidence } from '../services/scoring';
import { fetchCensusSnapshot } from '../services/census';
import { AMENITY_CATEGORIES } from '../data/amenityCategories';

const DEFAULT_WALKING_SPEED = 4;

const INITIAL_STATE: GameState = {
  phase: 'idle',
  center: null,
  locationName: '',
  amenities: [],
  guesses: {},
  results: [],
  error: null,
  walkingSpeed: DEFAULT_WALKING_SPEED,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [censusSnapshot, setCensusSnapshot] = useState<CensusSnapshot | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error }));

  /* ---------------------------------------------------------------
     LOCATION SELECTION — only saves center + name, no POI fetch
     --------------------------------------------------------------- */

  const selectLocationByQuery = useCallback(async (query: string) => {
    setIsGeocoding(true);
    setState((s) => ({ ...s, error: null }));
    try {
      const result = await geocodeQuery(query);
      if (!result) {
        setState((s) => ({ ...s, error: 'Location not found. Try a different search term.' }));
        return;
      }
      setCensusSnapshot(null);
      setState((s) => ({
        ...s,
        phase: 'guessing',
        center: result.location,
        locationName: result.displayName,
        amenities: [],
        guesses: {},
        results: [],
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: `Geocoding error: ${err instanceof Error ? err.message : 'Unknown'}`,
      }));
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const selectLocationByClick = useCallback(async (location: LatLng) => {
    setIsGeocoding(true);
    setState((s) => ({ ...s, error: null }));
    try {
      const name = await reverseGeocode(location);
      setCensusSnapshot(null);
      setState((s) => ({
        ...s,
        phase: 'guessing',
        center: location,
        locationName: name,
        amenities: [],
        guesses: {},
        results: [],
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      }));
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  /* ---------------------------------------------------------------
     GUESSING — update inputs (no data fetching)
     --------------------------------------------------------------- */

  const updateGuess = useCallback(
    (categoryId: string, value: number | undefined) => {
      setState((s) => ({
        ...s,
        guesses: { ...s.guesses, [categoryId]: value },
      }));
    },
    []
  );

  /* ---------------------------------------------------------------
     REVEAL — fetch POIs + routes + baselines + comparisons + census
     Always transitions to 'revealed', even if Overpass/Census fail.
     --------------------------------------------------------------- */

  const handleReveal = useCallback(async () => {
    const { center, walkingSpeed, guesses } = stateRef.current;
    if (!center) return;

    setState((s) => ({ ...s, phase: 'loading_results', error: null }));
    setCensusSnapshot({ status: 'loading' });

    console.log('[Reveal] Starting for', center.lat, center.lng);

    const { pois, overpassAvailable, failedCategories, warnings } =
      await fetchNearbyPOIs(center);

    const failedSet = new Set(failedCategories);

    const amenities: AmenityResult[] = AMENITY_CATEGORIES.map((cat) => {
      const poi = pois[cat.id] || null;
      const bl = getBaselineForAmenity(cat.id, walkingSpeed);

      let poiStatus: POIStatus;
      if (failedSet.has(cat.id)) {
        poiStatus = 'overpass_unavailable';
      } else if (poi) {
        poiStatus = 'found';
      } else {
        poiStatus = 'not_found';
      }

      const base: AmenityResult = {
        categoryId: cat.id,
        label: cat.label,
        icon: cat.icon,
        poi,
        poiStatus,
        realWalkingMinutes: null,
        routeDistanceMeters: null,
        baselineMinutes: bl.baselineMinutes,
        baselineDistanceKm: bl.baselineDistanceKm,
        baselineSourceType: bl.sourceType,
        baselineSourceLabel: bl.sourceLabel,
        routeGeometry: null,
        source: poi ? 'osm-estimate' : 'baseline-only',
        confidence: 'low',
      };
      base.confidence = computeConfidence(base);
      return base;
    });

    const destinations = amenities
      .filter((a) => a.poi !== null)
      .map((a) => ({ id: a.categoryId, location: a.poi!.location }));

    let routeError = false;

    const routePromise =
      destinations.length > 0
        ? getWalkingTimeBatch(center, destinations, walkingSpeed).catch(() => {
            routeError = true;
            console.warn('[Routes] Walking time calculation failed — using estimates');
            return null;
          })
        : Promise.resolve(null);

    const censusPromise = fetchCensusSnapshot(center.lat, center.lng).catch(
      (): CensusSnapshot => ({
        status: 'error',
        message: 'Census request failed unexpectedly.',
      })
    );

    const [routeResults, censusResult] = await Promise.all([
      routePromise,
      censusPromise,
    ]);

    console.log('[Reveal] Census snapshot:', censusResult);
    setCensusSnapshot(censusResult);

    if (routeResults) {
      for (const a of amenities) {
        const route = routeResults[a.categoryId];
        if (route) {
          a.realWalkingMinutes = Math.round(route.minutes * 10) / 10;
          a.routeDistanceMeters = route.routeDistanceMeters;
          a.routeGeometry = route.geometry;
          a.source = route.source;
          a.confidence = computeConfidence(a);
        }
      }
    }

    const results = calculateComparisons(amenities, guesses);

    let warningMessage: string | null = null;
    if (!overpassAvailable) {
      warningMessage =
        'Could not load nearby amenities from OpenStreetMap. ' +
        'This may be a temporary server issue. ' +
        'Results use thesis reference baselines only.';
    } else if (warnings.length > 0) {
      warningMessage =
        `Some amenity data could not be loaded (${failedCategories.length} categories). ` +
        'Those categories use thesis reference baseline only.';
    }
    if (routeError) {
      warningMessage =
        (warningMessage ? warningMessage + ' ' : '') +
        'Walking route calculation was unavailable — distance estimates used.';
    }

    setState((s) => ({
      ...s,
      phase: 'revealed',
      amenities,
      results,
      error: warningMessage,
    }));
  }, []);

  /* ---------------------------------------------------------------
     RESET ACTIONS
     --------------------------------------------------------------- */

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setCensusSnapshot(null);
  }, []);

  const resetGuesses = useCallback(() => {
    setCensusSnapshot(null);
    setState((s) => ({
      ...s,
      phase: 'guessing',
      amenities: [],
      guesses: {},
      results: [],
      error: null,
    }));
  }, []);

  const setWalkingSpeed = useCallback((speed: number) => {
    setState((s) => {
      const updatedAmenities = s.amenities.map((a) => ({
        ...a,
        baselineMinutes: recomputeBaselineMinutes(a.baselineDistanceKm, speed),
      }));
      return { ...s, walkingSpeed: speed, amenities: updatedAmenities };
    });
  }, []);

  return {
    state,
    censusSnapshot,
    isGeocoding,
    selectLocationByQuery,
    selectLocationByClick,
    updateGuess,
    handleReveal,
    reset,
    resetGuesses,
    setWalkingSpeed,
    setError,
  };
}
