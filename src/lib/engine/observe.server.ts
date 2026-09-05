import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { readEngineStatus } from "./credentials.server";
import type { EngineDecision, VenueStage } from "@/lib/trench/types";

export type Observation = {
  available: boolean;
  missing: string[];
  mint: string;
  venueStage: VenueStage | null;
  engineDecision: EngineDecision | null;
  reasons: string[];
  abstention: string | null;
  provenance: "ON_CHAIN_FACT" | "PROVIDER_OBSERVATION";
  buyImpact: number | null;
  sellImpact: number | null;
};

const EMPTY = (mint: string, missing: string[]): Observation => ({
  available: false,
  missing,
  mint,
  venueStage: null,
  engineDecision: null,
  reasons: [],
  abstention: missing.length ? `missing ${missing.join(", ")}` : "observer unavailable",
  provenance: "PROVIDER_OBSERVATION",
  buyImpact: null,
  sellImpact: null,
});

const STAGES: VenueStage[] = [
  "pump_curve_active",
  "migration_pending",
  "pumpswap_amm",
  "other_amm",
  "unknown",
];

export async function observeMint(mint: string): Promise<Observation> {
  const status = readEngineStatus();
  const helius = status.keys.find((k) => k.provider === "helius");
  const jupiter = status.keys.find((k) => k.provider === "jupiter");
  const missing: string[] = [];
  if (!helius?.ok) missing.push("HELIUS_API_KEY");
  if (!jupiter?.ok) missing.push("JUPITER_API_KEY");
  if (missing.length) return EMPTY(mint, missing);

  try {
    const href = pathToFileURL(
      join(process.cwd(), "engine/src/core/intelligence/observe-opportunity.mjs"),
    ).href;
    const mod = (await import(href)) as {
      observeOpportunity: (args: Record<string, unknown>) => Promise<{
        decision?: { decision?: string; reasons?: Array<{ code?: string; detail?: string }> };
        stage?: { venueStage?: string; abstentionReason?: string };
        quotes?: { buyPriceImpactPercent?: number; sellPriceImpactPercent?: number };
        quoteError?: string;
      }>;
    };
    const result = await mod.observeOpportunity({
      heliusApiKey: process.env.HELIUS_API_KEY,
      jupiterApiKey: process.env.JUPITER_API_KEY,
      mint,
    });
    const reasons = Array.isArray(result?.decision?.reasons)
      ? result.decision.reasons.map((r) => r.detail || r.code || "reason")
      : [];
    const decision = result?.decision?.decision;
    const engineDecision: EngineDecision =
      decision === "PAPER_ELIGIBLE" || decision === "ALERT_ONLY" || decision === "REJECT"
        ? decision
        : "REJECT";
    const venue = result?.stage?.venueStage;
    const venueStage: VenueStage | null = STAGES.includes(venue as VenueStage)
      ? (venue as VenueStage)
      : null;
    return {
      available: true,
      missing: [],
      mint,
      venueStage,
      engineDecision,
      reasons: reasons.slice(0, 8),
      abstention: result?.stage?.abstentionReason ?? result?.quoteError ?? null,
      provenance: result?.stage?.abstentionReason ? "PROVIDER_OBSERVATION" : "ON_CHAIN_FACT",
      buyImpact: result?.quotes?.buyPriceImpactPercent ?? null,
      sellImpact: result?.quotes?.sellPriceImpactPercent ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "observe failed";
    return { ...EMPTY(mint, []), abstention: message };
  }
}
