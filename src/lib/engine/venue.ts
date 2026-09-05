import type { Phase, VenueStage } from "@/lib/trench/types";

/** Engine contract: completion ≠ migration. Provider labels are not on-chain facts. */
export function resolveVenueStage(opts: {
  complete: boolean;
  dex: string | null;
  pair: string | null;
  curvePct: number | null;
}): VenueStage {
  const dex = (opts.dex || "").toLowerCase();
  if (opts.complete) {
    if (dex.includes("pumpswap") || opts.pair) return "pumpswap_amm";
    if (dex.includes("raydium") || dex.includes("meteora") || dex.includes("orca")) {
      return "other_amm";
    }
    return "migration_pending";
  }
  if (dex.includes("pump") || opts.curvePct != null) return "pump_curve_active";
  return "unknown";
}

export function venueShort(stage: VenueStage): string {
  switch (stage) {
    case "pump_curve_active":
      return "curve";
    case "migration_pending":
      return "migr-pend";
    case "pumpswap_amm":
      return "pumpswap";
    case "other_amm":
      return "amm";
    default:
      return "unk";
  }
}

export function phaseFromVenue(stage: VenueStage, fallback: Phase): Phase {
  if (stage === "pump_curve_active") return fallback === "create" ? "create" : "curve";
  if (stage === "migration_pending" || stage === "pumpswap_amm" || stage === "other_amm") {
    return "migrated";
  }
  return fallback;
}
