/** Deterministic formatters — no Intl compact (Node vs browser diverge). */

export function fmtUsd(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs === 0) return "$0";
  if (abs >= 1_000_000_000)
    return `${sign}$${trim(abs / 1_000_000_000, digits)}B`;
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000, digits)}M`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000, digits)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2)}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(3)}`;
  return `${sign}$${abs.toPrecision(2)}`;
}

function trim(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(Math.abs(n) >= 10 ? 0 : 1)}%`;
}

export function fmtAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

export function fmtMult(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100) return `${n.toFixed(0)}x`;
  if (n >= 10) return `${n.toFixed(1)}x`;
  return `${n.toFixed(2)}x`;
}

export function shortMint(mint: string): string {
  if (mint.length < 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
