import type { LatLng, FoundPOI, OverpassElement, AmenityCategory } from '../types';
import { AMENITY_CATEGORIES } from '../data/amenityCategories';
import { haversineDistance } from './routing';

/* =====================================================================
   OVERPASS CONFIGURATION
   ===================================================================== */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const FETCH_TIMEOUT_MS = 35_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 3_000, 5_000];
const INTER_BATCH_DELAY_MS = 500;

const CATEGORY_BATCHES: string[][] = [
  ['grocery', 'convenience_store', 'pharmacy'],
  ['school', 'hospital', 'gym'],
  ['cafe', 'restaurant', 'park'],
  ['bus_stop', 'train_station', 'bank', 'library'],
];

/* =====================================================================
   RETURN TYPE — never throws, always returns structured result
   ===================================================================== */

export interface POIFetchResult {
  pois: Record<string, FoundPOI>;
  overpassAvailable: boolean;
  failedCategories: string[];
  warnings: string[];
}

/* =====================================================================
   BOUNDING BOX
   ===================================================================== */

export function getBoundingBox(
  center: LatLng,
  halfSideMeters = 500
): [number, number, number, number] {
  const deltaLat = halfSideMeters / 111320;
  const deltaLng =
    halfSideMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return [
    center.lat - deltaLat,
    center.lng - deltaLng,
    center.lat + deltaLat,
    center.lng + deltaLng,
  ];
}

/* =====================================================================
   QUERY BUILDER — per-batch, lightweight
   ===================================================================== */

function buildBatchQuery(
  categories: AmenityCategory[],
  bbox: [number, number, number, number]
): string {
  const [south, west, north, east] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  const statements: string[] = [];
  for (const cat of categories) {
    for (const tag of cat.osmTags) {
      statements.push(`  node["${tag.key}"="${tag.value}"](${bboxStr});`);
      statements.push(`  way["${tag.key}"="${tag.value}"](${bboxStr});`);
    }
  }

  return `[out:json][timeout:30][maxsize:2097152];\n(\n${statements.join('\n')}\n);\nout center body qt;`;
}

/* =====================================================================
   FETCH HELPERS
   ===================================================================== */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/* =====================================================================
   CORE FETCH — multi-endpoint, retry with exponential backoff
   ===================================================================== */

async function fetchOverpassBatch(
  query: string,
  batchLabel: string
): Promise<{ elements: OverpassElement[]; success: boolean }> {
  for (let ep = 0; ep < OVERPASS_ENDPOINTS.length; ep++) {
    const endpoint = OVERPASS_ENDPOINTS[ep];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const wait = RETRY_DELAYS_MS[attempt - 1] ?? 5_000;
        console.log(
          `[Overpass] Retry ${attempt}/${MAX_RETRIES} for "${batchLabel}" on ${endpoint} (wait ${wait}ms)`
        );
        await delay(wait);
      }

      const t0 = performance.now();
      try {
        const res = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
          FETCH_TIMEOUT_MS
        );

        const elapsed = Math.round(performance.now() - t0);

        if (res.ok) {
          const data = await res.json();
          const elements: OverpassElement[] = data.elements || [];
          console.log(
            `[Overpass] ✓ "${batchLabel}" — ${elements.length} elements in ${elapsed}ms (${endpoint})`
          );
          return { elements, success: true };
        }

        if (isRetryableStatus(res.status)) {
          console.warn(
            `[Overpass] "${batchLabel}" HTTP ${res.status} in ${elapsed}ms — retryable`
          );
          continue;
        }

        console.warn(
          `[Overpass] "${batchLabel}" HTTP ${res.status} in ${elapsed}ms — non-retryable`
        );
        break;
      } catch (err: unknown) {
        const elapsed = Math.round(performance.now() - t0);
        const isTimeout =
          err instanceof DOMException && err.name === 'AbortError';

        if (isTimeout) {
          console.warn(
            `[Overpass] "${batchLabel}" timed out after ${elapsed}ms on ${endpoint}`
          );
        } else {
          console.warn(
            `[Overpass] "${batchLabel}" network error on ${endpoint}:`,
            err
          );
        }

        if (attempt < MAX_RETRIES) continue;
      }
    }

    if (ep < OVERPASS_ENDPOINTS.length - 1) {
      console.log(
        `[Overpass] Switching endpoint for "${batchLabel}" → ${OVERPASS_ENDPOINTS[ep + 1]}`
      );
    }
  }

  console.error(`[Overpass] ✗ All endpoints exhausted for "${batchLabel}"`);
  return { elements: [], success: false };
}

/* =====================================================================
   ELEMENT → POI PROCESSING
   ===================================================================== */

function getElementLocation(el: OverpassElement): LatLng | null {
  if (el.lat !== undefined && el.lon !== undefined) {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function matchCategory(
  el: OverpassElement,
  categories: AmenityCategory[]
): AmenityCategory | null {
  for (const cat of categories) {
    for (const tag of cat.osmTags) {
      if (el.tags[tag.key] === tag.value) return cat;
    }
  }
  return null;
}

function mergeClosest(
  target: Record<string, FoundPOI>,
  elements: OverpassElement[],
  categories: AmenityCategory[],
  center: LatLng
): void {
  for (const el of elements) {
    const cat = matchCategory(el, categories);
    if (!cat) continue;

    const loc = getElementLocation(el);
    if (!loc) continue;

    const dist = haversineDistance(center, loc);
    const name =
      el.tags.name || el.tags['name:en'] || el.tags.brand || cat.label;

    const existing = target[cat.id];
    if (!existing || dist < existing.distanceMeters) {
      target[cat.id] = {
        categoryId: cat.id,
        name,
        location: loc,
        distanceMeters: dist,
        source: 'osm',
      };
    }
  }
}

/* =====================================================================
   PUBLIC API — never throws
   ===================================================================== */

export async function fetchNearbyPOIs(
  center: LatLng
): Promise<POIFetchResult> {
  const bbox = getBoundingBox(center);
  const pois: Record<string, FoundPOI> = {};
  const failedCategories: string[] = [];
  const warnings: string[] = [];
  let anySuccess = false;

  console.log(`[Overpass] Starting batched POI fetch (${CATEGORY_BATCHES.length} batches)`);

  for (let i = 0; i < CATEGORY_BATCHES.length; i++) {
    const batchIds = CATEGORY_BATCHES[i];
    const categories = AMENITY_CATEGORIES.filter((c) =>
      batchIds.includes(c.id)
    );
    const batchLabel = batchIds.join(', ');
    const query = buildBatchQuery(categories, bbox);

    const { elements, success } = await fetchOverpassBatch(query, batchLabel);

    if (success) {
      anySuccess = true;
      mergeClosest(pois, elements, categories, center);
    } else {
      failedCategories.push(...batchIds);
      warnings.push(`Could not load: ${batchLabel}`);
    }

    if (i < CATEGORY_BATCHES.length - 1) {
      await delay(INTER_BATCH_DELAY_MS);
    }
  }

  const poiCount = Object.keys(pois).length;
  console.log(
    `[Overpass] Done — ${poiCount} POIs found, ${failedCategories.length} categories failed, overpassAvailable=${anySuccess}`
  );

  return { pois, overpassAvailable: anySuccess, failedCategories, warnings };
}
