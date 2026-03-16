import type { CensusSnapshot } from '../types/census';

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchCensusSnapshot(
  lat: number,
  lng: number
): Promise<CensusSnapshot> {
  console.log('[census] start', { lat, lng });

  try {
    const geoTimeout = withTimeout(10_000);
    const geoUrl =
      'https://geocoding.geo.census.gov/geocoder/geographies/coordinates' +
      `?x=${lng}&y=${lat}` +
      '&benchmark=Public_AR_Current' +
      '&vintage=Current_Current' +
      '&layers=Census%20Tracts' +
      '&format=json';

    const geoRes = await fetch(geoUrl, { signal: geoTimeout.signal });
    geoTimeout.clear();

    if (!geoRes.ok) {
      return {
        status: 'error',
        message: `Census geocoder failed (${geoRes.status}).`,
      };
    }

    const geoJson = await geoRes.json();
    console.log('[census] geography response', geoJson);

    const tracts =
      geoJson?.result?.geographies?.['Census Tracts'] ??
      geoJson?.result?.geographies?.['2020 Census Tracts'] ??
      [];

    if (!Array.isArray(tracts) || tracts.length === 0) {
      return {
        status: 'outside_us',
        message: 'Census demographics are available for US locations only.',
      };
    }

    const tract = tracts[0];
    const stateFips = String(tract.STATE ?? tract.STATEFP ?? '').padStart(2, '0');
    const countyFips = String(tract.COUNTY ?? tract.COUNTYFP ?? '').padStart(3, '0');
    const tractFips = String(tract.TRACT ?? tract.TRACTCE ?? tract.TRACTCODE ?? '').padStart(6, '0');

    if (!stateFips || !countyFips || !tractFips) {
      return {
        status: 'error',
        message: 'Could not parse Census tract identifiers.',
      };
    }

    const tractId = `${stateFips}${countyFips}${tractFips}`;
    console.log('[census] parsed fips', { stateFips, countyFips, tractFips, tractId });

    const acsTimeout = withTimeout(10_000);
    const acsUrl =
      'https://api.census.gov/data/2023/acs/acs5' +
      '?get=NAME,B19013_001E,B01002_001E,B01003_001E,B17001_002E' +
      `&for=tract:${tractFips}` +
      `&in=state:${stateFips}+county:${countyFips}`;

    const acsRes = await fetch(acsUrl, { signal: acsTimeout.signal });
    acsTimeout.clear();

    if (!acsRes.ok) {
      return {
        status: 'error',
        message: `ACS request failed (${acsRes.status}).`,
      };
    }

    const acsJson: string[][] = await acsRes.json();
    console.log('[census] acs response', acsJson);

    if (!Array.isArray(acsJson) || acsJson.length < 2) {
      return {
        status: 'error',
        message: 'ACS response was empty.',
      };
    }

    const headers = acsJson[0];
    const values = acsJson[1];
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i];
    }

    const medianIncome = toNumber(row.B19013_001E);
    const medianAge = toNumber(row.B01002_001E);
    const totalPopulation = toNumber(row.B01003_001E);
    const povertyPopulation = toNumber(row.B17001_002E);
    const povertyRate =
      totalPopulation && povertyPopulation != null
        ? Math.round((povertyPopulation / totalPopulation) * 1000) / 10
        : null;

    const snapshot: CensusSnapshot = {
      status: 'ok',
      tractId,
      stateFips,
      countyFips,
      tractFips,
      medianIncome,
      medianAge,
      totalPopulation,
      povertyPopulation,
      povertyRate,
    };

    console.log('[census] final snapshot', snapshot);
    return snapshot;
  } catch (error) {
    console.error('[census] error', error);
    return {
      status: 'error',
      message: 'Could not load Census data for this location.',
    };
  }
}
