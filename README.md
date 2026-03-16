# POI Walking-Time Game — MAS.552

A web-based classroom game that teaches students to estimate walking times to
daily amenities from any chosen location on Earth. Students pick a point,
discover nearby amenities, guess the walking times, and compare their estimates
against real routing calculations and thesis-derived baseline reference values.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in a browser.

## How to Play

1. **Choose a location** — type a city/address in the search bar or click
   anywhere on the map.
2. **See amenities** — the app fetches nearby POIs inside a 1 km × 1 km study
   window using OpenStreetMap.
3. **Guess walking times** — enter your estimate (in minutes) for each amenity
   in the left panel.
4. **Compare** — click *"Compare my guess"* to compute real walking routes and
   see how your intuition compares.
5. **Review results** — check the KPI cards, comparison table, bar chart, and
   radar chart in the results panel.

## APIs Used

| Service | Purpose | URL |
|---------|---------|-----|
| **Nominatim** | Geocoding (text → coordinates) | `nominatim.openstreetmap.org` |
| **Overpass API** | POI extraction from OpenStreetMap | `overpass-api.de` |
| **OSRM** | Walking route calculation (distance + time) | `router.project-osrm.org` |
| **OpenStreetMap tiles** | Base map | `tile.openstreetmap.org` |

All APIs are free and require no API key for moderate classroom use.

### Swapping APIs

Each external service is isolated in its own module under `src/services/`:

- `geocoding.ts` — replace `geocodeQuery()` / `reverseGeocode()` to use
  Google Maps, Mapbox, etc.
- `poi.ts` — replace `fetchNearbyPOIs()` to use Google Places or any other POI
  source.
- `routing.ts` — replace `getWalkingTime()` to use OpenRouteService, Mapbox
  Directions, Google Routes, etc.
- `baseline.ts` — wrapper around the baseline data file.

## Baseline Data — "Memoria Final" Thesis

The baseline values come from the thesis document **"Memoria final.pdf"**,
specifically the **final distance** results in:

- **Section 5.6** — "Optimal distances"
- **Section 6.4** — "Optimal distances"
- **Table 22** — "Output table of the final distances for each sub amenity"
- **Table 32** — "Results obtained from the frequency, logistic regression and
  final distance analysis"

### How the thesis baseline works

The thesis derives an **optimal walking distance** for each amenity type by
combining:
1. **Frequency of use** (how often people visit that amenity)
2. **Walking boundary** (the distance at which walking drops off)

through an exponential function, with **1 km as the maximum possible distance**.

The thesis reports these final distances in **miles**. The app converts them to
**kilometers** and then to **walking minutes** using:

```
baselineMinutes = (distanceKm / walkingSpeedKmH) × 60
```

Default walking speed is **4 km/h** (the thesis references ~10–14 min/km at
a moderate pace around 4 km/h).

### Mapping between game and thesis categories

Because the game's amenity taxonomy (based on OSM tags) doesn't match 1-to-1
with the thesis taxonomy (based on US NAICS codes), each game category is
mapped to the closest thesis sub-amenity. Each mapping is labeled as:

| Label | Meaning |
|-------|---------|
| **Exact thesis match** | Direct correspondence between game category and thesis row |
| **Approximate thesis match** | Game category approximated by a related thesis row |
| **External placeholder** | No thesis data exists; a rough external estimate is used |

### Thesis baseline values

| Game category | Thesis sub-amenity | Distance (mi) | Distance (km) |
|---------------|-------------------|----------------|----------------|
| Restaurant | Full-Service Restaurants | 0.229 | 0.369 |
| Café | Snack and Nonalcoholic Beverage Bars | 0.263 | 0.423 |
| Grocery | Grocery or Supermarket | 0.454 | 0.731 |
| School | Elementary School | 0.383 | 0.616 |
| Pharmacy | Pharmacy | 0.440 | 0.708 |
| Hospital | Hospitals | 0.318 | 0.512 |
| Gym | Gym | 0.260 | 0.418 |
| Park | Zoos and Nature Parks | 0.303 | 0.488 |
| Library | Recreation Industries (≈) | 0.298 | 0.480 |
| Bus Stop | *placeholder* | 0.250 | 0.402 |
| Train/Metro | *placeholder* | 0.500 | 0.805 |
| Bank/ATM | *placeholder* | 0.350 | 0.563 |

### Updating baseline data

The baseline data lives in:

```
src/data/baselineData.ts
```

- `THESIS_BASELINE_DISTANCES_MILES` — raw distances from the thesis (in miles)
- `GAME_AMENITY_TO_BASELINE` — mapping from each game category to a thesis row
- `PLACEHOLDER_DISTANCES_MILES` — external estimates for categories not in thesis

To add new thesis categories or refine mappings, edit the mapping object and
add the corresponding thesis key + distance.

## Project Structure

```
src/
├── types/index.ts            # TypeScript interfaces (incl. BaselineAmenity)
├── data/
│   ├── amenityCategories.ts  # 12 amenity types + OSM tag queries
│   └── baselineData.ts       # Thesis-derived baseline distances + mappings
├── services/
│   ├── geocoding.ts          # Nominatim integration
│   ├── poi.ts                # Overpass API integration
│   ├── routing.ts            # OSRM walking routes + Haversine fallback
│   ├── baseline.ts           # Resolves baseline per amenity at given speed
│   └── scoring.ts            # Comparison logic, KPIs, performance ranking
├── hooks/
│   └── useGameState.ts       # Central game state (speed → baseline recompute)
├── components/
│   ├── LocationSearch.tsx     # Search bar + location display
│   ├── GameMap.tsx            # Leaflet map with markers, routes, popups
│   ├── AmenityPanel.tsx      # Amenity list + guess inputs + baseline badges
│   ├── ResultsPanel.tsx      # Results table + baseline source column
│   ├── KPICards.tsx           # Aggregated score cards
│   └── ComparisonChart.tsx   # Bar chart + radar chart (recharts)
├── App.tsx                   # Main layout
├── App.css                   # All component styles
├── index.css                 # Global reset + CSS variables
└── main.tsx                  # Entry point
```

## Scoring

For each amenity, the delta between guess and real walking time determines a
performance rating:

| Rating | Delta (absolute) | Points |
|--------|-----------------|--------|
| Good (green) | ≤ 3 min | 3 |
| Average (yellow) | 3–7 min | 1 |
| Poor (red) | > 7 min | 0 |

Aggregated KPIs:

- **Total Score**: sum of points / maximum possible
- **Accuracy %**: percentage of maximum score
- **Avg. Delta**: mean absolute error across all guesses
- **Message**: qualitative feedback based on overall performance

## Tech Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Leaflet** + **react-leaflet** — interactive map
- **Recharts** — bar & radar charts
- No other runtime dependencies

## Configuration

Walking speed can be adjusted via the slider in the header (default: **4 km/h**,
per thesis reference). When the speed changes, baseline walking minutes are
recomputed dynamically from the stored distances.

The study window is 1 km × 1 km (configurable in `poi.ts`).

## Data Confidence System

Every amenity result is tagged with a **confidence level** that reflects how
the walking-time value was obtained:

| Level | Meaning | When |
|-------|---------|------|
| **High** | POI found in OSM + real OSRM walking route | Best case: full data |
| **Medium** | POI found in OSM + Haversine estimate (OSRM failed) | Route unavailable; distance × detour factor used |
| **Low** | POI not found; thesis baseline used | No local OSM data; thesis reference distance shown |
| **Very low** | External placeholder (not from thesis) | Transit, banking, or unmapped categories |

Confidence is shown as a colored dot in the amenity panel, results table, and
map popups. This helps students understand which values are observed vs.
estimated vs. theoretical.

## Fallback Behavior

| Scenario | What happens |
|----------|-------------|
| **OSRM route succeeds** | Real walking time + network distance displayed (confidence: high) |
| **OSRM route fails** | Haversine distance × 1.3 detour factor / walking speed (confidence: medium) |
| **POI not found in OSM** | Thesis reference baseline used; row marked "baseline-only" (confidence: low) |
| **No thesis mapping** | `baselineMinutes` is `null`; UI shows "N/A" (confidence: very low) |
| **External placeholder** | Invented distance used for transit/banking; clearly labeled (confidence: very low) |
| **Nominatim geocode fails** | Error message shown; user prompted to try again |
| **Overpass batch fails** | Auto-retry with backoff, try fallback endpoints; other batches continue |
| **All Overpass fails** | App continues in baseline-only mode; amber warning shown |

No value is ever silently invented. Every fallback is labeled in the UI.

## Overpass Robustness

The Overpass API is a public OpenStreetMap service that can timeout under heavy
load. The app includes multiple layers of protection for classroom reliability:

1. **Batched queries** — Instead of one large query, amenity categories are
   fetched in 4 small batches (3–4 categories each). If one batch fails, the
   others still succeed.

2. **Automatic retry** — Each batch retries up to 2 times with exponential
   backoff (1s, 2s) before giving up.

3. **Multi-endpoint fallback** — Three Overpass endpoints are tried in order:
   - `overpass-api.de` (primary)
   - `overpass.kumi.systems` (mirror)
   - `maps.mail.ru` (mirror)

4. **Client-side timeout** — Each request is aborted after 12 seconds to avoid
   hanging indefinitely.

5. **Baseline-only mode** — If all Overpass endpoints fail, the app still
   transitions to revealed mode using thesis reference baselines only. Students
   can see their guesses vs. the baseline and get directional feedback.

6. **Per-amenity status** — Each amenity shows whether its POI was `found`,
   `not_found`, or `overpass_unavailable`, with clear UI labels.

7. **Console logging** — Endpoint, batch, response time, retry count, and
   error type are logged for debugging.

## Scoring

### Hybrid performance metric

For each amenity, performance is classified using both absolute and relative
error:

| Rating | Condition |
|--------|-----------|
| **Good** (green) | absolute error ≤ 3 min **OR** % error ≤ 20% |
| **Average** (yellow) | absolute error ≤ 7 min **OR** % error ≤ 40% |
| **Poor** (red) | otherwise |

Percentage error is computed against the real walking time when available. This
ensures short walks (2 min) and long walks (12 min) are evaluated fairly.

### Direction labels

Each guess is also tagged with a direction:
- **Over** — guess > real (student overestimated distance)
- **Under** — guess < real (student underestimated distance)
- **Close** — |guess − real| ≤ 1 min

### KPI cards

- **Total Score**: points / maximum (good=3, average=1, poor=0)
- **Accuracy %**: percentage of maximum score
- **Avg. |Error|**: mean absolute delta in minutes
- **Avg. Bias**: signed average delta (positive = tends to overestimate)
- **Message**: directional feedback based on signed bias

## Changelog: Reliability and Transparency Improvements

### Bugs fixed
- Default walking speed in routing functions changed from 5 to 4 km/h
  (consistent with thesis reference and UI default)
- KPI "underestimating" message was unreachable because average delta was
  computed from absolute values; now uses signed average delta for direction
- Bar chart rendered missing real walking times as 0; now shows gaps with
  "Unavailable" tooltip

### Trust and pedagogy
- Removed silent 8-minute fallback for unknown amenities; `baselineMinutes`
  is now `null` when no data exists, and the UI shows "N/A"
- Split convenience stores from grocery in OSM tag mapping and baseline
  comparison (thesis has separate values: grocery 0.454 mi, convenience
  0.505 mi)
- Removed dead `showMeters` code path that was never wired to the UI
- Walking speed slider narrowed to 3–6 km/h (was 3–7; 7 is jogging) with
  preset buttons: Slow (3.5), Moderate (4.0), Brisk (5.0)

### Model transparency
- Added data confidence field (high / medium / low / very low) to every
  amenity result, displayed in all panels and map popups
- Renamed "Baseline" to "Thesis ref." / "Thesis reference baseline"
  throughout the UI
- Added ℹ tooltip on results table header explaining the baseline concept
- Updated source legend to show all five source categories
- Park baseline reclassified from "thesis exact" to "thesis approx." since
  OSM leisure=park is broader than thesis "Zoos and Nature Parks"

### Scoring improvements
- Performance classification now uses hybrid absolute + percentage error
  (good if ≤3 min OR ≤20%, average if ≤7 min OR ≤40%)
- Added direction labels (Over / Under / Close) per amenity and in the
  results table
- KPI cards now show signed average bias alongside absolute error

### Chart and display improvements
- Bar chart: missing Real values render as gaps, not zeros; placeholder
  baseline bars shown with reduced opacity
- Radar chart: uses fixed 15-min reference scale for stable accuracy metric
- Map popups now show straight-line distance, network distance, and walking
  time when available
- Chart subtitles explain the visualization methodology

## Building for Production

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## License

Academic use — MAS.552 Spatial Analysis & Urban Form.
