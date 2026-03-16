import type { KPIData } from '../types';

interface Props {
  kpis: KPIData;
}

export default function KPICards({ kpis }: Props) {
  const directionIcon =
    kpis.signedAverageDelta > 1 ? '↑' :
    kpis.signedAverageDelta < -1 ? '↓' : '≈';

  return (
    <div className="kpi-cards">
      <div className="kpi-card kpi-score">
        <div className="kpi-value">
          {kpis.totalScore}/{kpis.maxScore}
        </div>
        <div className="kpi-label">Score</div>
      </div>

      <div className="kpi-card kpi-accuracy">
        <div className="kpi-value">{kpis.accuracyPercent}%</div>
        <div className="kpi-label">Accuracy</div>
      </div>

      <div className="kpi-card kpi-delta">
        <div className="kpi-value">{kpis.averageDelta} min</div>
        <div className="kpi-label">Avg |Error|</div>
      </div>

      <div className="kpi-card kpi-direction">
        <div className="kpi-value">
          {directionIcon} {kpis.signedAverageDelta > 0 ? '+' : ''}
          {kpis.signedAverageDelta} min
        </div>
        <div className="kpi-label">Avg Bias</div>
      </div>

      <div className="kpi-card kpi-breakdown">
        <div className="kpi-breakdown-row">
          <span className="perf-dot good" /> {kpis.goodCount}
          <span className="perf-dot average" /> {kpis.averageCount}
          <span className="perf-dot poor" /> {kpis.poorCount}
        </div>
        <div className="kpi-label">Good / Avg / Poor</div>
      </div>

      <div className="kpi-message">
        {kpis.message}
      </div>
    </div>
  );
}
