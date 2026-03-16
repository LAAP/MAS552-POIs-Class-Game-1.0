export type CensusStatus = 'idle' | 'loading' | 'ok' | 'outside_us' | 'error';

export interface CensusSnapshot {
  status: CensusStatus;
  tractId?: string;
  stateFips?: string;
  countyFips?: string;
  tractFips?: string;
  medianIncome?: number | null;
  medianAge?: number | null;
  totalPopulation?: number | null;
  povertyPopulation?: number | null;
  povertyRate?: number | null;
  message?: string;
}
