import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { calculateKPIs } from './services/scoring';
import LocationSearch from './components/LocationSearch';
import GameMap from './components/GameMap';
import AmenityPanel from './components/AmenityPanel';
import ResultsPanel from './components/ResultsPanel';
import NeighborhoodContextPanel from './components/NeighborhoodContextPanel';
import './App.css';

const SPEED_PRESETS = [
  { label: 'Slow', value: 3.5 },
  { label: 'Moderate', value: 4.0 },
  { label: 'Brisk', value: 5.0 },
];

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10;
}

export default function App() {
  const {
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
  } = useGameState();

  const [showRoutes, setShowRoutes] = useState(true);

  const isRevealed = state.phase === 'revealed';
  const isIdle = state.phase === 'idle';
  const showPanel = state.phase === 'guessing' || state.phase === 'loading_results' || isRevealed;
  const mapInteractionDisabled = isGeocoding || state.phase === 'loading_results' || isRevealed;

  const kpis = isRevealed ? calculateKPIs(state.results) : null;

  const avgReal = isRevealed
    ? average(state.amenities.map((a) => a.realWalkingMinutes))
    : null;
  const avgBaseline = isRevealed
    ? average(state.amenities.map((a) => a.baselineMinutes))
    : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">📐</span>
            POI Walking-Time Game
          </h1>
          <span className="app-subtitle">Urban Accessibility Analysis Tool · MAS.552</span>
        </div>
        <div className="header-controls">
          <div className="speed-control-group">
            <label className="speed-control" title="Walking speed (km/h)">
              {state.walkingSpeed} km/h
              <input
                type="range"
                min="3"
                max="6"
                step="0.5"
                value={state.walkingSpeed}
                onChange={(e) => setWalkingSpeed(parseFloat(e.target.value))}
                disabled={isRevealed || state.phase === 'loading_results'}
              />
            </label>
            <div className="speed-presets">
              {SPEED_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`speed-preset-btn ${state.walkingSpeed === p.value ? 'active' : ''}`}
                  onClick={() => setWalkingSpeed(p.value)}
                  disabled={isRevealed || state.phase === 'loading_results'}
                  title={`${p.value} km/h`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {isRevealed && (
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={showRoutes}
                onChange={(e) => setShowRoutes(e.target.checked)}
              />
              Routes
            </label>
          )}
        </div>
      </header>

      {state.error && (
        <div className={`error-banner ${isRevealed ? 'warning-banner' : ''}`}>
          {state.error}
          <button
            className="error-dismiss"
            onClick={() => (isRevealed ? setError(null) : reset())}
          >
            ✕
          </button>
        </div>
      )}

      <main className="app-main">
        <aside className="left-panel">
          <LocationSearch
            onSearch={selectLocationByQuery}
            onReset={reset}
            locationName={state.locationName}
            isLoading={isGeocoding}
            hasLocation={state.center !== null}
          />

          {showPanel && (
            <AmenityPanel
              phase={state.phase}
              amenities={state.amenities}
              guesses={state.guesses}
              onUpdateGuess={updateGuess}
              onReveal={handleReveal}
              onResetGuesses={resetGuesses}
              onChangeLocation={reset}
            />
          )}

          {isIdle && !state.error && (
            <div className="welcome-state">
              <div className="welcome-icon">🗺️</div>
              <h3>Welcome</h3>
              <p>
                Search for a location or click on the map to begin.
                Estimate walking times blind, then reveal the real data.
              </p>
              <div className="how-it-works">
                <h4>How it works</h4>
                <ol>
                  <li>Choose any place on Earth</li>
                  <li>Estimate walking time to each amenity (blind)</li>
                  <li>Reveal real amenities, routes, and thesis baselines</li>
                  <li>Compare your intuition against the data</li>
                </ol>
              </div>
            </div>
          )}
        </aside>

        <section className="map-section">
          <GameMap
            phase={state.phase}
            center={state.center}
            amenities={state.amenities}
            results={state.results}
            onMapClick={selectLocationByClick}
            interactionDisabled={mapInteractionDisabled}
            showRoutes={showRoutes && isRevealed}
          />
        </section>
      </main>

      {isRevealed && (
        <section className="results-section">
          <div className="results-grid">
            <div>
              {kpis && (
                <ResultsPanel
                  results={state.results}
                  kpis={kpis}
                  onReset={reset}
                  onPlayAgain={resetGuesses}
                />
              )}
            </div>
            <div>
              <NeighborhoodContextPanel
                censusSnapshot={censusSnapshot}
                averageRealMinutes={avgReal}
                averageBaselineMinutes={avgBaseline}
              />
            </div>
          </div>
        </section>
      )}

      <footer className="app-footer">
        MAS.552 — Spatial Analysis & Urban Form · Data: OpenStreetMap · Routing: OSRM · Thesis ref.: Memoria final
      </footer>
    </div>
  );
}
