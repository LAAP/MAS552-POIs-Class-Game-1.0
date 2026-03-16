import { useState } from 'react';
import type { CensusSnapshot } from '../types/census';

interface Props {
  censusSnapshot: CensusSnapshot | null;
  averageRealMinutes: number | null;
  averageBaselineMinutes: number | null;
}

type Reflection = 'better' | 'same' | 'worse';

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtNumber(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toLocaleString('en-US');
}

function fmtPercent(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(1) + '%';
}

function fmtAge(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(1) + ' yrs';
}

function accessibilityMessage(
  avgReal: number | null,
  avgBaseline: number | null
): string {
  if (avgReal === null || avgBaseline === null || avgBaseline === 0) {
    return 'Insufficient data to assess overall accessibility.';
  }
  const ratio = avgReal / avgBaseline;
  if (ratio <= 0.8) return 'This neighborhood has higher-than-reference accessibility.';
  if (ratio <= 1.2) return 'This neighborhood has moderate accessibility.';
  return 'This neighborhood has lower-than-reference accessibility.';
}

export default function NeighborhoodContextPanel({
  censusSnapshot,
  averageRealMinutes,
  averageBaselineMinutes,
}: Props) {
  const [reflection, setReflection] = useState<Reflection | null>(null);

  const snap = censusSnapshot;
  const status = snap?.status ?? 'idle';
  const message = accessibilityMessage(averageRealMinutes, averageBaselineMinutes);

  return (
    <div className="neighborhood-panel">
      <h3 className="panel-title">Neighborhood Context</h3>

      {status === 'loading' && (
        <p className="census-status-msg">Loading Census data…</p>
      )}

      {status === 'ok' && snap && (
        <div className="census-grid">
          <div className="census-card">
            <div className="census-value">{fmtCurrency(snap.medianIncome)}</div>
            <div className="census-label">Median Income</div>
          </div>
          <div className="census-card">
            <div className="census-value">{fmtAge(snap.medianAge)}</div>
            <div className="census-label">Median Age</div>
          </div>
          <div className="census-card">
            <div className="census-value">{fmtNumber(snap.totalPopulation)}</div>
            <div className="census-label">Population</div>
          </div>
          <div className="census-card">
            <div className="census-value">{fmtPercent(snap.povertyRate)}</div>
            <div className="census-label">Poverty Rate</div>
          </div>
          {snap.tractId && (
            <div className="census-source">
              Tract {snap.tractId} · ACS 5-Year (2023)
            </div>
          )}
        </div>
      )}

      {status === 'outside_us' && (
        <p className="census-status-msg">
          {snap?.message ?? 'Census demographics are available for US locations only.'}
        </p>
      )}

      {status === 'error' && (
        <p className="census-status-msg census-error">
          {snap?.message ?? 'Could not load Census data for this location.'}
        </p>
      )}

      {(status === 'idle' || !snap) && status !== 'loading' && (
        <p className="census-status-msg">Census data not loaded yet.</p>
      )}

      <div className="accessibility-snapshot">
        <h4>Accessibility Snapshot</h4>
        <div className="snapshot-row">
          <span className="snapshot-label">Avg. walk time (real)</span>
          <span className="snapshot-value">
            {averageRealMinutes !== null ? `${averageRealMinutes} min` : 'N/A'}
          </span>
        </div>
        <div className="snapshot-row">
          <span className="snapshot-label">Avg. walk time (thesis ref.)</span>
          <span className="snapshot-value">
            {averageBaselineMinutes !== null ? `${averageBaselineMinutes} min` : 'N/A'}
          </span>
        </div>
        <p className="snapshot-message">{message}</p>
      </div>

      <div className="reflection-block">
        <p className="reflection-question">
          Did this neighborhood have better or worse amenity access than you
          expected?
        </p>
        <div className="reflection-options">
          {(['better', 'same', 'worse'] as Reflection[]).map((opt) => (
            <button
              key={opt}
              className={`reflection-btn ${reflection === opt ? 'active' : ''}`}
              onClick={() => setReflection(opt)}
            >
              {opt === 'better'
                ? 'Better'
                : opt === 'same'
                  ? 'About the same'
                  : 'Worse'}
            </button>
          ))}
        </div>
        {reflection && (
          <p className="reflection-thanks">Thanks for reflecting!</p>
        )}
      </div>

      <div className="census-debug">
        census: {status}
      </div>
    </div>
  );
}
