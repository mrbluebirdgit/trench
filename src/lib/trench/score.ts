import { POLICY } from "@/lib/engine/traffic";
import type { EngineDecision, Phase, Token, Verdict } from "./types";

const KNOWN_TICKERS = new Set(
  [
    "bonk",
    "wif",
    "popcat",
    "mew",
    "pnput",
    "trump",
    "melania",
    "official trump",
    "pump",
    "sol",
    "usdc",
    "usdt",
  ].map((s) => s.toLowerCase()),
);

const SOCIAL_REASONS = new Set(["has X", "livestream", "pump replies", "comments"]);

export function detectPhase(opts: {
  complete: boolean;
  curvePct: number | null;
  ageMs: number;
  dex: string | null;
}): Phase {
  if (opts.complete) return "migrated";
  const dex = (opts.dex || "").toLowerCase();
  if (dex.includes("pumpswap") || dex.includes("raydium") || dex.includes("meteora")) {
    if ((opts.curvePct ?? 0) >= 95) return "migrated";
  }
  if ((opts.curvePct ?? 0) >= 12 || opts.ageMs > 8 * 60_000) return "curve";
  return "create";
}

function toEngineDecision(verdict: Verdict, rejects: string[]): EngineDecision {
  if (verdict === "SKIP" && rejects.length > 0) return "REJECT";
  return "ALERT_ONLY";
}

export function scoreToken(
  t: Omit<Token, "verdict" | "reasons" | "rejects" | "engineDecision">,
): Pick<Token, "verdict" | "reasons" | "rejects" | "engineDecision"> {
  const rejects: string[] = [];
  const reasons: string[] = [];
  const mc = t.mc ?? 0;
  const liq = t.liq ?? 0;
  const vol5 = t.vol5m ?? 0;
  const vol1h = t.vol1h ?? 0;
  const vol24 = t.vol24h ?? 0;
  const ageMin = t.ageMs / 60_000;
  const tx = t.txns5m;
  const buys = t.buys5m;
  const sells = t.sells5m;
  const accel = t.volAccel;
  const pressure = t.buyPressure;

  if (t.nsfw) rejects.push("nsfw");
  if (KNOWN_TICKERS.has(t.symbol.toLowerCase()) && t.ageMs < 2 * 3600_000 && !t.complete) {
    rejects.push("ticker clone");
  }
  if (vol5 >= 4000 && tx > 0 && tx < 8) rejects.push("wash tape");
  if (ageMin > 20 && mc < 4000 && vol5 < 50) rejects.push("dead dust");
  if (buys > 6 && sells === 0 && ageMin > 3 && vol5 > 200) rejects.push("unsellable tape");
  if (t.complete && liq > 0 && liq < 8000) rejects.push("thin graduated liq");
  if (t.venueStage === "unknown") rejects.push("stage unknown");

  const buyLed = pressure == null ? true : pressure >= 0.5;
  const volMc = mc > 0 ? vol24 / mc : 0;

  if (t.phase === "create") {
    if (mc >= 5000 && mc <= 40000) reasons.push("early band");
    if (t.replies >= 1) reasons.push("pump replies");
    if (buyLed && tx >= 8) reasons.push("buy tape");
    if (t.twitter) reasons.push("has X");
    if (vol5 >= 400) reasons.push("5m volume");
  } else if (t.phase === "curve") {
    if (mc >= 15000 && mc <= 55000) reasons.push("curve band");
    const p = t.curvePct ?? 0;
    if (p >= 15 && p <= 75) reasons.push("fill 15–75%");
    if (buyLed) reasons.push("buy ≥ sell");
    if (t.replies >= 8) reasons.push("comments");
    if (p >= 80) reasons.push("near grad — no add");
  } else {
    if (liq >= 20000) reasons.push("liq floor");
    if (volMc >= 0.3) reasons.push("turnover");
    if (buyLed) reasons.push("buy side");
    if (ageMin < 60 * 24) reasons.push("fresh migrate");
    if (t.venueStage === "migration_pending") reasons.push("migration pending");
  }

  if (accel != null && accel >= POLICY.volumeAccelerationMinimumMultiple) {
    reasons.push("10x vol accel");
  } else if (accel != null && accel >= 1.6) {
    reasons.push("vol accel");
  }
  if (t.boosted) reasons.push("dex boost");
  if (t.live) reasons.push("livestream");
  if ((t.rugScore ?? 100) <= 3 && t.rugScore != null) reasons.push("rugcheck clean");

  let verdict: Verdict = "SKIP";
  if (rejects.length >= 2) verdict = "SKIP";
  else if (t.phase === "create") {
    if (rejects.includes("dead dust") || rejects.includes("wash tape")) verdict = "SKIP";
    else if (mc >= 5000 && mc <= 40000 && ageMin <= 30 && reasons.length >= 2 && rejects.length === 0)
      verdict = "TAP";
    else if (ageMin <= 40 && mc >= 2000 && mc <= 80000) verdict = "WATCH";
    else verdict = "SKIP";
  } else if (t.phase === "curve") {
    const p = t.curvePct ?? 0;
    if (p >= 80) verdict = "WATCH";
    else if (
      mc >= 12000 &&
      mc <= 60000 &&
      buyLed &&
      rejects.length === 0 &&
      reasons.length >= 2
    )
      verdict = "TAP";
    else if (mc >= 6000) verdict = "WATCH";
    else verdict = "SKIP";
  } else {
    if (liq < 15000 && vol24 < 8000) verdict = "SKIP";
    else if (liq >= 20000 && volMc >= 0.25 && rejects.length === 0 && ageMin < 72 * 60)
      verdict = "TAP";
    else if (liq >= 10000 || vol24 >= 15000) verdict = "WATCH";
    else verdict = "SKIP";
  }

  // Policy: social virality alone cannot authorize a TAP (alert).
  if (verdict === "TAP" && !POLICY.socialViralityAloneCanAuthorize) {
    const material = reasons.filter((r) => !SOCIAL_REASONS.has(r));
    if (material.length === 0) verdict = "WATCH";
  }

  const engineDecision = toEngineDecision(verdict, rejects);
  return {
    verdict,
    reasons: reasons.slice(0, 5),
    rejects: rejects.slice(0, 4),
    engineDecision,
  };
}
