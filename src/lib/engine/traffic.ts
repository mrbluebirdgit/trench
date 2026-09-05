/** Policy discovery: volumeAccelerationMinimumMultiple = 10. Missing stays null, never 0. */
export function volumeAcceleration(vol5m: number | null, vol1h: number | null): number | null {
  if (vol5m == null || !Number.isFinite(vol5m) || vol5m < 0) return null;
  if (vol1h == null || !Number.isFinite(vol1h) || vol1h <= 0) {
    return vol5m > 0 ? null : null;
  }
  const baseline = vol1h / 12;
  if (baseline <= 0) return null;
  return vol5m / baseline;
}

export function buyPressure(buys: number, sells: number): number | null {
  const n = buys + sells;
  if (n <= 0) return null;
  return buys / n;
}

export const POLICY = Object.freeze({
  version: "1.2.0",
  liveLocked: true as const,
  tradingMode: "observe" as const,
  volumeAccelerationMinimumMultiple: 10,
  holderGrowthMinimumPercent24h: 30,
  trendingWindowHours: 3,
  maximumPriceImpactPercent: 2,
  maximumSignalDataAgeSeconds: 15,
  socialViralityAloneCanAuthorize: false,
  paperEligibleUnreachable: true,
});
