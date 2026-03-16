import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import type { ComparisonResult } from '../types';

interface Props {
  results: ComparisonResult[];
}

const RADAR_MAX_MINUTES = 30;

const COLORS = {
  guess: '#2563eb',
  real: '#16a34a',
  thesisRef: '#ea580c',
  placeholder: '#cbd5e1',
  grid: '#e2e8f0',
};

function toAccessibilityScore(minutes: number | null): number {
  if (minutes == null) return 0;
  const clamped = Math.max(0, Math.min(RADAR_MAX_MINUTES, minutes));
  const score = 100 * (1 - clamped / RADAR_MAX_MINUTES);
  return Math.max(0, Math.round(score * 10) / 10);
}

export default function ComparisonChart({ results }: Props) {
  const barData = results.map((r) => ({
    name: r.label.split('/')[0].trim(),
    Guess: r.guessMinutes,
    Real: r.realWalkingMinutes,
    Reference: r.baselineMinutes,
    isPlaceholder: r.baselineSourceType === 'placeholder_external',
  }));

  const radarData = results.map((r) => {
    const category = r.label.split('/')[0].trim();
    const guessMinutes = r.guessMinutes ?? null;
    const realMinutes = r.realWalkingMinutes;
    const thesisMinutes = r.baselineMinutes;

    return {
      category,
      fullName: r.label,
      guessMinutes,
      realMinutes,
      thesisMinutes,
      guessScore: toAccessibilityScore(guessMinutes),
      realScore: toAccessibilityScore(realMinutes),
      thesisScore: toAccessibilityScore(thesisMinutes),
      realAvailable: realMinutes !== null,
      thesisAvailable: thesisMinutes !== null,
    };
  });

  return (
    <div className="charts-grid">
      <div className="chart-box">
        <h4 className="chart-title">Guess vs Real vs Reference (min)</h4>
        <p className="chart-subtitle">
          Gaps = unavailable data · Faded bars = external placeholder
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: COLORS.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                fontSize: '0.72rem',
              }}
              formatter={(value: number | null, name: string) => {
                if (value === null || value === undefined)
                  return ['N/A', name];
                return [`${value.toFixed(1)} min`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.62rem', paddingTop: 8 }} />
            <Bar dataKey="Guess" fill={COLORS.guess} radius={[2, 2, 0, 0]} maxBarSize={24} />
            <Bar dataKey="Real" fill={COLORS.real} radius={[2, 2, 0, 0]} maxBarSize={24} />
            <Bar dataKey="Reference" radius={[2, 2, 0, 0]} maxBarSize={24}>
              {barData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.isPlaceholder ? COLORS.placeholder : COLORS.thesisRef}
                  opacity={entry.isPlaceholder ? 0.4 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {radarData.length >= 1 && (
        <div className="chart-box">
          <h4 className="chart-title">Accessibility Profile by Amenity</h4>
          <p className="chart-subtitle">
            Lower walking times expand outward (0 min = 100, 30+ min = 0)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={COLORS.grid} />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 9, fill: '#64748b' }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 8, fill: '#94a3b8' }}
                axisLine={false}
              />
              <Radar
                name="Guess"
                dataKey="guessScore"
                stroke={COLORS.guess}
                fill={COLORS.guess}
                fillOpacity={0.12}
                strokeWidth={1.5}
              />
              <Radar
                name="Real"
                dataKey="realScore"
                stroke={COLORS.real}
                fill={COLORS.real}
                fillOpacity={0.08}
                strokeWidth={1.5}
              />
              <Radar
                name="Thesis Reference"
                dataKey="thesisScore"
                stroke={COLORS.thesisRef}
                fill={COLORS.thesisRef}
                fillOpacity={0.08}
                strokeWidth={1.5}
              />
              <Legend wrapperStyle={{ fontSize: '0.62rem', paddingTop: 8 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  fontSize: '0.72rem',
                }}
                formatter={(_value: number, _name: string, props: { payload: any }[]) => {
                  if (!props || !props[0] || !props[0].payload) return [];
                  const p = props[0].payload;
                  const guessM = p.guessMinutes;
                  const realM = p.realMinutes;
                  const thesisM = p.thesisMinutes;
                  const lines: string[] = [];
                  lines.push(`Guess: ${guessM ?? 'N/A'} min (score ${p.guessScore})`);
                  if (p.realAvailable) {
                    lines.push(`Real: ${realM} min (score ${p.realScore})`);
                  } else {
                    lines.push('Real: unavailable (no walking time)');
                  }
                  if (p.thesisAvailable) {
                    lines.push(`Thesis Ref.: ${thesisM} min (score ${p.thesisScore})`);
                  } else {
                    lines.push('Thesis Ref.: unavailable');
                  }
                  return [lines.join('\\n'), 'Accessibility'];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
