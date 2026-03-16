export interface LatLng {
  lat: number;
  lng: number;
}

export interface AmenityCategory {
  id: string;
  label: string;
  icon: string;
  osmTags: OsmTagQuery[];
}

export interface OsmTagQuery {
  key: string;
  value: string;
}

export interface FoundPOI {
  categoryId: string;
  name: string;
  location: LatLng;
  distanceMeters: number;
  source: 'osm';
}

/* =====================================================================
   BASELINE TYPES — derived from "Memoria final" thesis
   ===================================================================== */

export type BaselineSourceType =
  | 'thesis_exact'
  | 'thesis_approximation'
  | 'placeholder_external';

export interface BaselineAmenity {
  id: string;
  label: string;
  sourceSubAmenityName: string;
  baselineDistanceMiles: number | null;
  baselineDistanceKm: number | null;
  baselineWalkingMinutesAt4Kmh: number | null;
  sourceType: BaselineSourceType;
  notes?: string;
}

export interface ResolvedBaseline {
  baselineMinutes: number | null;
  baselineDistanceKm: number | null;
  sourceType: BaselineSourceType;
  sourceLabel: string;
  sourceSubAmenityName: string;
  notes?: string;
}

/* =====================================================================
   CONFIDENCE & DIRECTION
   ===================================================================== */

export type POIStatus = 'found' | 'not_found' | 'overpass_unavailable';

export type DataConfidence = 'high' | 'medium' | 'low' | 'very_low';

export type EstimateDirection = 'overestimated' | 'underestimated' | 'close';

/* =====================================================================
   GAME STATE TYPES
   ===================================================================== */

export interface AmenityResult {
  categoryId: string;
  label: string;
  icon: string;
  poi: FoundPOI | null;
  poiStatus: POIStatus;
  realWalkingMinutes: number | null;
  routeDistanceMeters: number | null;
  baselineMinutes: number | null;
  baselineDistanceKm: number | null;
  baselineSourceType: BaselineSourceType;
  baselineSourceLabel: string;
  routeGeometry: [number, number][] | null;
  source: 'osm-route' | 'osm-estimate' | 'baseline-only';
  confidence: DataConfidence;
}

export interface ComparisonResult extends AmenityResult {
  guessMinutes: number;
  deltaGuessVsReal: number | null;
  deltaGuessVsBaseline: number | null;
  performanceVsReal: Performance | null;
  performanceVsBaseline: Performance | null;
  direction: EstimateDirection;
}

export type Performance = 'good' | 'average' | 'poor';

export type GamePhase =
  | 'idle'
  | 'guessing'
  | 'loading_results'
  | 'revealed';

export interface GameState {
  phase: GamePhase;
  center: LatLng | null;
  locationName: string;
  amenities: AmenityResult[];
  guesses: Record<string, number | undefined>;
  results: ComparisonResult[];
  error: string | null;
  walkingSpeed: number;
}

export interface KPIData {
  totalScore: number;
  maxScore: number;
  averageDelta: number;
  signedAverageDelta: number;
  accuracyPercent: number;
  message: string;
  goodCount: number;
  averageCount: number;
  poorCount: number;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}
