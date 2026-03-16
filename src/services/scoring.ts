import type {
  AmenityResult,
  ComparisonResult,
  Performance,
  KPIData,
  EstimateDirection,
  DataConfidence,
} from '../types';

/* =====================================================================
   PERFORMANCE CLASSIFICATION — hybrid absolute + percentage
   ===================================================================== */

export function classifyPerformance(
  deltaMinutes: number,
  realMinutes: number | null
): Performance {
  const absDelta = Math.abs(deltaMinutes);
  const pctError =
    realMinutes !== null && realMinutes > 0
      ? (absDelta / realMinutes) * 100
      : null;

  if (absDelta <= 3 || (pctError !== null && pctError <= 20)) return 'good';
  if (absDelta <= 7 || (pctError !== null && pctError <= 40)) return 'average';
  return 'poor';
}

export function performanceColor(p: Performance): string {
  switch (p) {
    case 'good': return 'var(--color-good, #27ae60)';
    case 'average': return 'var(--color-average, #f39c12)';
    case 'poor': return 'var(--color-poor, #e74c3c)';
  }
}

export function performancePoints(p: Performance): number {
  switch (p) {
    case 'good': return 3;
    case 'average': return 1;
    case 'poor': return 0;
  }
}

/* =====================================================================
   DIRECTION LABELS
   ===================================================================== */

export function getDirection(delta: number): EstimateDirection {
  if (Math.abs(delta) <= 1) return 'close';
  return delta > 0 ? 'overestimated' : 'underestimated';
}

export function directionLabel(d: EstimateDirection): string {
  switch (d) {
    case 'overestimated': return 'Over';
    case 'underestimated': return 'Under';
    case 'close': return 'Close';
  }
}

export function directionColor(d: EstimateDirection): string {
  switch (d) {
    case 'overestimated': return 'var(--color-average, #f39c12)';
    case 'underestimated': return 'var(--color-poor, #e74c3c)';
    case 'close': return 'var(--color-good, #27ae60)';
  }
}

/* =====================================================================
   CONFIDENCE
   ===================================================================== */

export function computeConfidence(a: AmenityResult): DataConfidence {
  if (a.poiStatus === 'overpass_unavailable') return 'very_low';
  if (a.poi && a.source === 'osm-route') return 'high';
  if (a.poi && a.source === 'osm-estimate') return 'medium';
  if (a.baselineSourceType === 'placeholder_external') return 'very_low';
  if (!a.poi) return 'low';
  return 'medium';
}

export function confidenceLabel(c: DataConfidence): string {
  switch (c) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    case 'very_low': return 'Very low';
  }
}

export function confidenceColor(c: DataConfidence): string {
  switch (c) {
    case 'high': return 'var(--color-good, #27ae60)';
    case 'medium': return 'var(--color-primary, #4a6fa5)';
    case 'low': return 'var(--color-average, #f39c12)';
    case 'very_low': return 'var(--color-poor, #e74c3c)';
  }
}

/* =====================================================================
   COMPARISON LOGIC
   ===================================================================== */

export function calculateComparisons(
  amenities: AmenityResult[],
  guesses: Record<string, number | undefined>
): ComparisonResult[] {
  return amenities
    .filter((a) => guesses[a.categoryId] !== undefined)
    .map((a) => {
      const guess = guesses[a.categoryId]!;
      const realMinutes = a.realWalkingMinutes;
      const baselineMinutes = a.baselineMinutes;

      const deltaReal = realMinutes !== null ? guess - realMinutes : null;
      const deltaBaseline =
        baselineMinutes !== null ? guess - baselineMinutes : null;

      const primaryDelta = deltaReal ?? deltaBaseline;
      const direction = getDirection(primaryDelta ?? 0);

      return {
        ...a,
        guessMinutes: guess,
        deltaGuessVsReal: deltaReal,
        deltaGuessVsBaseline: deltaBaseline,
        performanceVsReal:
          deltaReal !== null
            ? classifyPerformance(deltaReal, realMinutes)
            : null,
        performanceVsBaseline:
          deltaBaseline !== null
            ? classifyPerformance(deltaBaseline, baselineMinutes)
            : null,
        direction,
      };
    });
}

/* =====================================================================
   KPI AGGREGATION
   ===================================================================== */

export function calculateKPIs(results: ComparisonResult[]): KPIData {
  if (results.length === 0) {
    return {
      totalScore: 0,
      maxScore: 0,
      averageDelta: 0,
      signedAverageDelta: 0,
      accuracyPercent: 0,
      message: 'No data',
      goodCount: 0,
      averageCount: 0,
      poorCount: 0,
    };
  }

  let totalScore = 0;
  let totalAbsDelta = 0;
  let totalSignedDelta = 0;
  let scoredCount = 0;
  let goodCount = 0;
  let averageCount = 0;
  let poorCount = 0;

  for (const r of results) {
    const perf = r.performanceVsReal ?? r.performanceVsBaseline;
    if (perf) {
      totalScore += performancePoints(perf);
      scoredCount++;
      switch (perf) {
        case 'good': goodCount++; break;
        case 'average': averageCount++; break;
        case 'poor': poorCount++; break;
      }
    }

    const signedDelta = r.deltaGuessVsReal ?? r.deltaGuessVsBaseline ?? 0;
    totalAbsDelta += Math.abs(signedDelta);
    totalSignedDelta += signedDelta;
  }

  const maxScore = scoredCount * 3;
  const averageDelta =
    results.length > 0 ? totalAbsDelta / results.length : 0;
  const signedAverageDelta =
    results.length > 0 ? totalSignedDelta / results.length : 0;
  const accuracyPercent =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let message: string;
  if (accuracyPercent >= 80) {
    message = 'Excellent urban intuition!';
  } else if (accuracyPercent >= 55) {
    message = 'Reasonable estimation — good spatial awareness';
  } else if (signedAverageDelta > 1) {
    message = 'You tend to overestimate walking distances';
  } else if (signedAverageDelta < -1) {
    message = 'You tend to underestimate accessibility';
  } else {
    message = 'Mixed results — keep practicing spatial estimation';
  }

  return {
    totalScore,
    maxScore,
    averageDelta: Math.round(averageDelta * 10) / 10,
    signedAverageDelta: Math.round(signedAverageDelta * 10) / 10,
    accuracyPercent,
    message,
    goodCount,
    averageCount,
    poorCount,
  };
}
