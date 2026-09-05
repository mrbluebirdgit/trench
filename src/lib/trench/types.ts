export type Phase = "create" | "curve" | "migrated";
export type Verdict = "TAP" | "WATCH" | "SKIP";
export type VenueStage =
  | "pump_curve_active"
  | "migration_pending"
  | "pumpswap_amm"
  | "other_amm"
  | "unknown";
export type EngineDecision = "REJECT" | "ALERT_ONLY" | "PAPER_ELIGIBLE";
export type Provenance = "ON_CHAIN_FACT" | "PROVIDER_OBSERVATION";

export type Token = {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  phase: Phase;
  verdict: Verdict;
  reasons: string[];
  rejects: string[];
  createdAt: number;
  ageMs: number;
  priceUsd: number | null;
  mc: number | null;
  liq: number | null;
  vol5m: number | null;
  vol1h: number | null;
  vol24h: number | null;
  buys5m: number;
  sells5m: number;
  buys1h: number;
  sells1h: number;
  txns5m: number;
  replies: number;
  curvePct: number | null;
  dex: string | null;
  pair: string | null;
  twitter: string | null;
  website: string | null;
  telegram: string | null;
  creator: string | null;
  complete: boolean;
  live: boolean;
  nsfw: boolean;
  boosted: boolean;
  rugScore: number | null;
  change5m: number | null;
  change1h: number | null;
  change24h: number | null;
  source: "pump" | "dex";
  venueStage: VenueStage;
  engineDecision: EngineDecision;
  volAccel: number | null;
  buyPressure: number | null;
  provenance: Provenance;
};

export type TokenDetail = Token & {
  description: string | null;
  rugRisks: string[];
  lpLockedPct: number | null;
  observation?: {
    available: boolean;
    missing: string[];
    reasons: string[];
    abstention: string | null;
    buyImpact: number | null;
    sellImpact: number | null;
  };
};

export type TapeItem = {
  mint: string;
  symbol: string;
  verdict: Verdict;
  phase: Phase;
  mc: number | null;
  note: string;
};

export type KeyStatus = {
  provider: string;
  ok: boolean;
  names: string[];
  unlocks: string;
};

export type EngineStatus = {
  liveLocked: true;
  tradingMode: "observe";
  liveTrading: false;
  policyVersion: string;
  keys: KeyStatus[];
};

export type Market = {
  fetchedAt: number;
  solUsd: number | null;
  tokens: Token[];
  tape: TapeItem[];
  stats: {
    fresh: number;
    tap: number;
    watch: number;
    skip: number;
    create: number;
    curve: number;
    migrated: number;
  };
  sources: { pump: boolean; dex: boolean; rug: boolean };
  engine: EngineStatus;
};
