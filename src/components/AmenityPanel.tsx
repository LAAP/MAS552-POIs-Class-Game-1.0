import type { AmenityResult, GamePhase } from '../types';
import { AMENITY_CATEGORIES } from '../data/amenityCategories';
import { confidenceLabel, confidenceColor } from '../services/scoring';

interface Props {
  phase: GamePhase;
  amenities: AmenityResult[];
  guesses: Record<string, number | undefined>;
  onUpdateGuess: (categoryId: string, value: number | undefined) => void;
  onReveal: () => void;
  onResetGuesses: () => void;
  onChangeLocation: () => void;
}

function blBadgeClass(sourceType: string): string {
  switch (sourceType) {
    case 'thesis_exact': return 'bl-badge-exact';
    case 'thesis_approximation': return 'bl-badge-approx';
    default: return 'bl-badge-placeholder';
  }
}

export default function AmenityPanel({
  phase,
  amenities,
  guesses,
  onUpdateGuess,
  onReveal,
  onResetGuesses,
  onChangeLocation,
}: Props) {
  const isBlind = phase === 'guessing' || phase === 'loading_results';
  const isRevealed = phase === 'revealed';
  const isLoading = phase === 'loading_results';

  const filledCount = AMENITY_CATEGORIES.filter(
    (c) => guesses[c.id] !== undefined
  ).length;

  if (isBlind) {
    return (
      <div className="amenity-panel">
        <h3 className="panel-title step-title">
          <span className="step-badge">Step 1</span>
          Blind Estimation
        </h3>
        <p className="panel-subtitle">
          Estimate walking time to each amenity before seeing what is nearby.
        </p>

        <div className="amenity-list">
          {AMENITY_CATEGORIES.map((cat) => (
            <div key={cat.id} className="amenity-row amenity-row-blind">
              <div className="amenity-info">
                <span className="amenity-icon">{cat.icon}</span>
                <span className="amenity-label">{cat.label}</span>
              </div>
              <div className="guess-input-wrapper">
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  placeholder="—"
                  className="guess-input"
                  value={guesses[cat.id] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateGuess(
                      cat.id,
                      val === '' ? undefined : Math.max(0, parseFloat(val))
                    );
                  }}
                  disabled={isLoading}
                />
                <span className="guess-unit">min</span>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-submit"
          onClick={onReveal}
          disabled={filledCount === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-inline" /> Fetching amenities & routes…
            </>
          ) : (
            `Reveal nearby amenities (${filledCount}/${AMENITY_CATEGORIES.length})`
          )}
        </button>

        <button
          className="btn btn-secondary btn-change-location"
          onClick={onChangeLocation}
          disabled={isLoading}
        >
          Choose a different point
        </button>
      </div>
    );
  }

  if (isRevealed) {
    return (
      <div className="amenity-panel">
        <h3 className="panel-title step-title">
          <span className="step-badge step-badge-reveal">Step 2</span>
          Results
        </h3>

        <div className="amenity-list">
          {amenities.map((a) => (
            <div
              key={a.categoryId}
              className={`amenity-row ${a.source === 'baseline-only' ? 'baseline-only' : ''}`}
            >
              <div className="amenity-info">
                <span className="amenity-icon">{a.icon}</span>
                <div className="amenity-details">
                  <span className="amenity-label">{a.label}</span>
                  {a.poiStatus === 'found' && a.poi ? (
                    <span className="amenity-name" title={a.poi.name}>
                      {a.poi.name} · {Math.round(a.poi.distanceMeters)} m
                    </span>
                  ) : a.poiStatus === 'overpass_unavailable' ? (
                    <span className="amenity-name status-unavailable">
                      POI data unavailable
                    </span>
                  ) : (
                    <span className="amenity-name baseline-tag">
                      Not found in OSM
                    </span>
                  )}
                  <span className="amenity-meta-row">
                    <span className={`bl-badge ${blBadgeClass(a.baselineSourceType)}`}>
                      {a.baselineSourceLabel}
                      {a.baselineDistanceKm !== null && (
                        <> · {a.baselineDistanceKm.toFixed(3)} km</>
                      )}
                    </span>
                    <span
                      className="confidence-dot"
                      style={{ background: confidenceColor(a.confidence) }}
                      title={`Confidence: ${confidenceLabel(a.confidence)}`}
                    />
                  </span>
                </div>
              </div>
              <div className="guess-input-wrapper">
                <input
                  type="number"
                  className="guess-input"
                  value={guesses[a.categoryId] ?? ''}
                  disabled
                />
                <span className="guess-unit">min</span>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal-actions">
          <button className="btn btn-secondary" onClick={onResetGuesses}>
            ↺ Same location
          </button>
          <button className="btn btn-secondary" onClick={onChangeLocation}>
            New location
          </button>
        </div>
      </div>
    );
  }

  return null;
}
