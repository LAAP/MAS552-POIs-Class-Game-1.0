import type { ComparisonResult, KPIData } from '../types';
import {
  performanceColor,
  directionLabel,
  directionColor,
  confidenceLabel,
  confidenceColor,
} from '../services/scoring';
import KPICards from './KPICards';
import ComparisonChart from './ComparisonChart';

interface Props {
  results: ComparisonResult[];
  kpis: KPIData;
  onReset: () => void;
  onPlayAgain: () => void;
}

function sourceTypeBadge(sourceType: string): { label: string; className: string } {
  switch (sourceType) {
    case 'thesis_exact':
      return { label: 'Thesis', className: 'bl-src-exact' };
    case 'thesis_approximation':
      return { label: 'Thesis ≈', className: 'bl-src-approx' };
    default:
      return { label: 'Placeholder', className: 'bl-src-placeholder' };
  }
}

export default function ResultsPanel({ results, kpis, onReset, onPlayAgain }: Props) {
  const sorted = [...results].sort((a, b) => {
    const deltaA = Math.abs(a.deltaGuessVsReal ?? a.deltaGuessVsBaseline ?? 99);
    const deltaB = Math.abs(b.deltaGuessVsReal ?? b.deltaGuessVsBaseline ?? 99);
    return deltaA - deltaB;
  });

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="a-panel">
        <div className="a-panel-header">
          <div>
            <div className="a-panel-title">Performance Summary</div>
            <div className="a-panel-subtitle">Aggregated estimation accuracy</div>
          </div>
          <div className="results-header-actions">
            <button className="btn btn-secondary" onClick={onPlayAgain}>
              ↺ Same location
            </button>
            <button className="btn btn-secondary" onClick={onReset}>
              New location
            </button>
          </div>
        </div>
        <KPICards kpis={kpis} />
      </div>

      {/* ── Results Table ── */}
      <div className="a-panel">
        <div className="a-panel-header">
          <div>
            <div className="a-panel-title">Accessibility Results</div>
            <div className="a-panel-subtitle">Ranked by estimation accuracy (best → worst)</div>
          </div>
        </div>

        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Amenity</th>
                <th className="num-col">Guess</th>
                <th className="num-col">Real</th>
                <th className="num-col" title="Thesis reference baseline — a benchmark derived from the thesis, not a universal local truth.">
                  Reference <span className="info-icon">i</span>
                </th>
                <th>Source</th>
                <th className="num-col">Δ Real</th>
                <th className="num-col">Δ Ref.</th>
                <th>Dir.</th>
                <th>Conf.</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const perf = r.performanceVsReal ?? r.performanceVsBaseline;
                const perfColor = perf ? performanceColor(perf) : '#999';
                const blSrc = sourceTypeBadge(r.baselineSourceType);

                return (
                  <tr key={r.categoryId}>
                    <td className="rank-cell">{i + 1}</td>
                    <td>
                      <span className="amenity-icon-sm">{r.icon}</span>
                      {r.label}
                    </td>
                    <td className="num-cell">{r.guessMinutes}</td>
                    <td className="num-cell">
                      {r.realWalkingMinutes !== null
                        ? r.realWalkingMinutes.toFixed(1)
                        : <span className="na-cell" title="Real walking time unavailable">N/A</span>}
                    </td>
                    <td className="num-cell">
                      {r.baselineMinutes !== null ? (
                        <>
                          {r.baselineMinutes.toFixed(1)}
                          {r.baselineDistanceKm !== null && (
                            <span className="baseline-km-hint">
                              {r.baselineDistanceKm.toFixed(3)} km
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="na-cell" title="No baseline available">N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`bl-src-badge ${blSrc.className}`}>
                        {blSrc.label}
                      </span>
                    </td>
                    <td className="num-cell">
                      {r.deltaGuessVsReal !== null ? (
                        <span style={{ color: perfColor, fontWeight: 600 }}>
                          {r.deltaGuessVsReal > 0 ? '+' : ''}
                          {r.deltaGuessVsReal.toFixed(1)}
                        </span>
                      ) : (
                        <span className="na-cell">—</span>
                      )}
                    </td>
                    <td className="num-cell">
                      {r.deltaGuessVsBaseline !== null ? (
                        <span>
                          {r.deltaGuessVsBaseline > 0 ? '+' : ''}
                          {r.deltaGuessVsBaseline.toFixed(1)}
                        </span>
                      ) : (
                        <span className="na-cell">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="direction-badge"
                        style={{ color: directionColor(r.direction) }}
                      >
                        {directionLabel(r.direction)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="confidence-dot-lg"
                        style={{ background: confidenceColor(r.confidence) }}
                        title={`Data confidence: ${confidenceLabel(r.confidence)}`}
                      />
                    </td>
                    <td>
                      {perf ? (
                        <span
                          className="perf-badge"
                          style={{ background: perfColor }}
                        >
                          {perf}
                        </span>
                      ) : (
                        <span className="na-cell">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="results-source-legend">
          <strong>Legend:</strong>
          <span className="source-tag osm">OSM route</span>
          <span className="source-tag estimate">Estimate</span>
          <span className="source-tag baseline">Thesis ref.</span>
          <span className="bl-src-badge bl-src-exact">Thesis</span>
          <span className="bl-src-badge bl-src-approx">Thesis ≈</span>
          <span className="bl-src-badge bl-src-placeholder">Placeholder</span>
          <span className="na-cell">N/A</span>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="a-panel">
        <div className="a-panel-header">
          <div>
            <div className="a-panel-title">Estimation Accuracy</div>
            <div className="a-panel-subtitle">Visual comparison of guess, real, and reference values</div>
          </div>
        </div>
        <ComparisonChart results={results} />
      </div>
    </div>
  );
}
