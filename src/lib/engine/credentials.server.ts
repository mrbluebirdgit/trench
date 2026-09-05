import { POLICY } from "./traffic";
import type { EngineStatus, KeyStatus } from "@/lib/trench/types";

const PROVIDERS: Array<{
  provider: string;
  names: string[];
  unlocks: string;
  check: (env: NodeJS.ProcessEnv) => boolean;
}> = [
  {
    provider: "helius",
    names: ["HELIUS_API_KEY"],
    unlocks: "on-chain Pump stage, authorities, logs",
    check: (e) => /^[A-Za-z0-9_-]{16,128}$/.test(e.HELIUS_API_KEY?.trim() ?? ""),
  },
  {
    provider: "jupiter",
    names: ["JUPITER_API_KEY"],
    unlocks: "read-only quotes — never signing",
    check: (e) => /^[!-~]{16,512}$/.test(e.JUPITER_API_KEY?.trim() ?? ""),
  },
  {
    provider: "birdeye",
    names: ["BIRDEYE_API_KEY"],
    unlocks: "holder / flow tape",
    check: (e) => /^[!-~]{16,512}$/.test(e.BIRDEYE_API_KEY?.trim() ?? ""),
  },
  {
    provider: "gmgn",
    names: ["GMGN_API_KEY"],
    unlocks: "read-only intel — not authority",
    check: (e) => /^[!-~]{16,512}$/.test(e.GMGN_API_KEY?.trim() ?? ""),
  },
  {
    provider: "x",
    names: ["X_BEARER_TOKEN"],
    unlocks: "narrative radar (alerts only)",
    check: (e) => /^[!-~]{20,2048}$/.test(e.X_BEARER_TOKEN?.trim() ?? ""),
  },
  {
    provider: "lunarcrush",
    names: ["LUNARCRUSH_API_KEY"],
    unlocks: "social topics (alerts only)",
    check: (e) => /^[!-~]{16,512}$/.test(e.LUNARCRUSH_API_KEY?.trim() ?? ""),
  },
  {
    provider: "newsapi",
    names: ["NEWSAPI_KEY"],
    unlocks: "news discovery (alerts only)",
    check: (e) => /^[!-~]{16,512}$/.test(e.NEWSAPI_KEY?.trim() ?? ""),
  },
  {
    provider: "telegram-bot",
    names: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_CHAT_ID"],
    unlocks: "alert delivery only",
    check: (e) =>
      Boolean(e.TELEGRAM_BOT_TOKEN?.trim()) && Boolean(e.TELEGRAM_ALLOWED_CHAT_ID?.trim()),
  },
];

export function readEngineStatus(env: NodeJS.ProcessEnv = process.env): EngineStatus {
  const keys: KeyStatus[] = PROVIDERS.map((p) => ({
    provider: p.provider,
    ok: p.check(env),
    names: p.names,
    unlocks: p.unlocks,
  }));
  return {
    liveLocked: true,
    tradingMode: POLICY.tradingMode,
    liveTrading: false,
    policyVersion: POLICY.version,
    keys,
  };
}
