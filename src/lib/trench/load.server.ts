import { readEngineStatus } from "@/lib/engine/credentials.server";
import { observeMint } from "@/lib/engine/observe.server";
import { buyPressure, volumeAcceleration } from "@/lib/engine/traffic";
import { resolveVenueStage } from "@/lib/engine/venue";
import { detectPhase, scoreToken } from "./score";
import type { Market, TapeItem, Token, TokenDetail } from "./types";

const UA = { "User-Agent": "TrenchDesk/1.0", Accept: "application/json" };
const STABLES = new Set([
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "USD1ttGY1N17NEEHLmELoaybftRJYTxFGqHTp6dthG7",
]);

type Cache<T> = { at: number; value: T; inflight: Promise<T> | null };
const feedCache: Cache<Market> = { at: 0, value: emptyMarket(), inflight: null };
const TTL = 8_000;

function emptyMarket(): Market {
  return {
    fetchedAt: Date.now(),
    solUsd: null,
    tokens: [],
    tape: [],
    stats: { fresh: 0, tap: 0, watch: 0, skip: 0, create: 0, curve: 0, migrated: 0 },
    sources: { pump: false, dex: false, rug: false },
    engine: readEngineStatus(),
  };
}

async function getJson<T>(url: string, ms = 8000): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

type PumpCoin = {
  mint: string;
  name?: string;
  symbol?: string;
  image_uri?: string;
  description?: string;
  usd_market_cap?: number;
  market_cap?: number;
  complete?: boolean;
  created_timestamp?: number;
  reply_count?: number;
  twitter?: string | null;
  website?: string | null;
  telegram?: string | null;
  creator?: string;
  nsfw?: boolean;
  is_currently_live?: boolean;
  virtual_sol_reserves?: number;
  real_sol_reserves?: number;
  last_trade_timestamp?: number;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  pairCreatedAt?: number;
  url?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  priceChange?: { m5?: number; h1?: number; h24?: number };
  info?: { imageUrl?: string };
  boosts?: { active?: number };
};

function curvePct(c: PumpCoin): number | null {
  const real = num(c.real_sol_reserves);
  if (real == null) return c.complete ? 100 : null;
  return Math.max(0, Math.min(100, (real / 1e9 / 85) * 100));
}

function finish(
  base: Omit<Token, "verdict" | "reasons" | "rejects" | "engineDecision" | "volAccel" | "buyPressure" | "venueStage" | "provenance">,
): Token {
  const volAccel = volumeAcceleration(base.vol5m, base.vol1h);
  const pressure = buyPressure(base.buys5m, base.sells5m);
  const venueStage = resolveVenueStage({
    complete: base.complete,
    dex: base.dex,
    pair: base.pair,
    curvePct: base.curvePct,
  });
  const row = {
    ...base,
    volAccel,
    buyPressure: pressure,
    venueStage,
    provenance: "PROVIDER_OBSERVATION" as const,
  };
  return { ...row, ...scoreToken(row) };
}

function fromPump(c: PumpCoin, now: number): Token | null {
  const mint = c.mint;
  if (!mint || STABLES.has(mint)) return null;
  const symbol = (c.symbol || mint.slice(0, 4)).slice(0, 12);
  const name = (c.name || symbol).slice(0, 40);
  if (/^(w?sol|usdc|usdt)$/i.test(symbol)) return null;
  const createdAt = Number(c.created_timestamp) || now;
  const ageMs = Math.max(0, now - createdAt);
  const mc = num(c.usd_market_cap);
  const pct = curvePct(c);
  const phase = detectPhase({
    complete: !!c.complete,
    curvePct: pct,
    ageMs,
    dex: c.complete ? "pumpswap" : "pump-fun",
  });
  return finish({
    mint,
    name,
    symbol,
    image: c.image_uri || null,
    phase,
    createdAt,
    ageMs,
    priceUsd: mc != null && mc > 0 ? mc / 1_000_000_000 : null,
    mc,
    liq: pct != null ? ((num(c.real_sol_reserves) ?? 0) / 1e9) * 2 * 100 : null,
    vol5m: null,
    vol1h: null,
    vol24h: null,
    buys5m: 0,
    sells5m: 0,
    buys1h: 0,
    sells1h: 0,
    txns5m: 0,
    replies: Number(c.reply_count) || 0,
    curvePct: pct,
    dex: c.complete ? "pumpswap" : "pump-fun",
    pair: null,
    twitter: c.twitter || null,
    website: c.website || null,
    telegram: c.telegram || null,
    creator: c.creator || null,
    complete: !!c.complete,
    live: !!c.is_currently_live,
    nsfw: !!c.nsfw,
    boosted: false,
    rugScore: null,
    change5m: null,
    change1h: null,
    change24h: null,
    source: "pump",
  });
}

function fromDex(p: DexPair, now: number): Token | null {
  if (p.chainId && p.chainId !== "solana") return null;
  const mint = p.baseToken?.address;
  if (!mint || STABLES.has(mint)) return null;
  const symbol = (p.baseToken?.symbol || mint.slice(0, 4)).slice(0, 12);
  if (/^(w?sol|usdc|usdt)$/i.test(symbol)) return null;
  const createdAt = Number(p.pairCreatedAt) || now;
  const ageMs = Math.max(0, now - createdAt);
  const buys5 = p.txns?.m5?.buys ?? 0;
  const sells5 = p.txns?.m5?.sells ?? 0;
  const complete = /raydium|meteora|pumpswap|orca/i.test(p.dexId || "");
  const phase = detectPhase({
    complete: complete && ageMs > 20 * 60_000,
    curvePct: complete ? 100 : 40,
    ageMs,
    dex: p.dexId || null,
  });
  return finish({
    mint,
    name: (p.baseToken?.name || symbol).slice(0, 40),
    symbol,
    image: p.info?.imageUrl || null,
    phase,
    createdAt,
    ageMs,
    priceUsd: num(p.priceUsd),
    mc: num(p.marketCap) ?? num(p.fdv),
    liq: num(p.liquidity?.usd),
    vol5m: num(p.volume?.m5),
    vol1h: num(p.volume?.h1),
    vol24h: num(p.volume?.h24),
    buys5m: buys5,
    sells5m: sells5,
    buys1h: p.txns?.h1?.buys ?? 0,
    sells1h: p.txns?.h1?.sells ?? 0,
    txns5m: buys5 + sells5,
    replies: 0,
    curvePct: complete ? 100 : null,
    dex: p.dexId || null,
    pair: p.pairAddress || null,
    twitter: null,
    website: null,
    telegram: null,
    creator: null,
    complete,
    live: false,
    nsfw: false,
    boosted: (p.boosts?.active ?? 0) > 0,
    rugScore: null,
    change5m: num(p.priceChange?.m5),
    change1h: num(p.priceChange?.h1),
    change24h: num(p.priceChange?.h24),
    source: "dex",
  });
}

function merge(a: Token, b: Token): Token {
  const pick = <K extends keyof Token>(k: K, preferB = false): Token[K] => {
    const av = a[k];
    const bv = b[k];
    if (preferB && bv != null && bv !== "" && bv !== 0) return bv;
    if (av == null || av === "" || av === 0) return bv;
    return av;
  };
  const merged = {
    mint: a.mint,
    name: a.name.length >= b.name.length ? a.name : b.name,
    symbol: a.symbol.length >= 2 ? a.symbol : b.symbol,
    image: a.image || b.image,
    phase: (a.phase === "migrated" || b.phase === "migrated"
      ? "migrated"
      : a.ageMs <= b.ageMs
        ? a.phase
        : b.phase) as Token["phase"],
    createdAt: Math.min(a.createdAt, b.createdAt),
    ageMs: Math.min(a.ageMs, b.ageMs),
    priceUsd: pick("priceUsd"),
    mc: pick("mc"),
    liq: pick("liq", true),
    vol5m: pick("vol5m", true),
    vol1h: pick("vol1h", true),
    vol24h: pick("vol24h", true),
    buys5m: Math.max(a.buys5m, b.buys5m),
    sells5m: Math.max(a.sells5m, b.sells5m),
    buys1h: Math.max(a.buys1h, b.buys1h),
    sells1h: Math.max(a.sells1h, b.sells1h),
    txns5m: Math.max(a.txns5m, b.txns5m),
    replies: Math.max(a.replies, b.replies),
    curvePct: pick("curvePct"),
    dex: a.dex === "pump-fun" ? b.dex || a.dex : a.dex || b.dex,
    pair: a.pair || b.pair,
    twitter: a.twitter || b.twitter,
    website: a.website || b.website,
    telegram: a.telegram || b.telegram,
    creator: a.creator || b.creator,
    complete: a.complete || b.complete,
    live: a.live || b.live,
    nsfw: a.nsfw || b.nsfw,
    boosted: a.boosted || b.boosted,
    rugScore: a.rugScore ?? b.rugScore,
    change5m: pick("change5m", true),
    change1h: pick("change1h", true),
    change24h: pick("change24h", true),
    source: a.source === "pump" ? ("pump" as const) : b.source,
  };
  return finish(merged);
}

function pumpUrl(sort: string, extra = "") {
  return `https://frontend-api-v3.pump.fun/coins?offset=0&limit=40&sort=${sort}&order=DESC&includeNsfw=false${extra}`;
}

export async function loadFeed(): Promise<Market> {
  const now = Date.now();
  if (feedCache.value.tokens.length && now - feedCache.at < TTL) return feedCache.value;
  if (feedCache.inflight) return feedCache.inflight;
  const job = (async () => {
    const [latest, hot, graduated, boosts, dexSearch] = await Promise.all([
      getJson<PumpCoin[]>(pumpUrl("created_timestamp")),
      getJson<PumpCoin[]>(pumpUrl("last_trade_timestamp")),
      getJson<PumpCoin[]>(pumpUrl("market_cap", "&complete=true")),
      getJson<Array<{ chainId?: string; tokenAddress?: string }>>(
        "https://api.dexscreener.com/token-boosts/latest/v1",
      ),
      getJson<{ pairs?: DexPair[] }>("https://api.dexscreener.com/latest/dex/search?q=SOL"),
    ]);

    const map = new Map<string, Token>();
    const add = (t: Token | null) => {
      if (!t) return;
      const prev = map.get(t.mint);
      map.set(t.mint, prev ? merge(prev, t) : t);
    };

    let solUsd: number | null = null;
    for (const list of [latest, hot, graduated]) {
      for (const c of list || []) {
        if (!solUsd && c.usd_market_cap && c.market_cap && c.market_cap > 1) {
          const px = c.usd_market_cap / c.market_cap;
          if (px > 20 && px < 500) solUsd = px;
        }
        add(fromPump(c, now));
      }
    }

    const solBoosts = (boosts || []).filter((b) => b.chainId === "solana").slice(0, 25);
    const boostSet = new Set(solBoosts.map((b) => b.tokenAddress).filter(Boolean) as string[]);

    for (const p of dexSearch?.pairs || []) add(fromDex(p, now));

    const need = [...map.values()]
      .sort((a, b) => (b.mc ?? 0) - (a.mc ?? 0))
      .slice(0, 28)
      .map((t) => t.mint);
    const batch = need.length
      ? await getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${need.join(",")}`)
      : null;
    for (const p of batch || []) add(fromDex(p, now));

    for (const mint of boostSet) {
      const t = map.get(mint);
      if (t) map.set(mint, finish({ ...t, boosted: true }));
    }

    if (solUsd) {
      for (const t of map.values()) {
        if ((t.liq == null || t.liq < 50) && t.curvePct != null && !t.complete) {
          t.liq = (t.curvePct / 100) * 85 * solUsd * 2;
        }
      }
    }

    const tokens = [...map.values()]
      .filter((t) => t.symbol && t.mint)
      .sort((a, b) => {
        const rank = (v: Token["verdict"]) => (v === "TAP" ? 0 : v === "WATCH" ? 1 : 2);
        const r = rank(a.verdict) - rank(b.verdict);
        if (r !== 0) return r;
        return a.ageMs - b.ageMs;
      })
      .slice(0, 120);

    const tape: TapeItem[] = (hot || []).slice(0, 24).map((c) => {
      const t = map.get(c.mint);
      return {
        mint: c.mint,
        symbol: (c.symbol || "????").slice(0, 10),
        verdict: t?.verdict ?? "WATCH",
        phase: t?.phase ?? "create",
        mc: t?.mc ?? num(c.usd_market_cap),
        note: t?.reasons[0] || (c.complete ? "migrated" : "print"),
      };
    });

    const stats = {
      fresh: tokens.filter((t) => t.ageMs < 30 * 60_000).length,
      tap: tokens.filter((t) => t.verdict === "TAP").length,
      watch: tokens.filter((t) => t.verdict === "WATCH").length,
      skip: tokens.filter((t) => t.verdict === "SKIP").length,
      create: tokens.filter((t) => t.phase === "create").length,
      curve: tokens.filter((t) => t.phase === "curve").length,
      migrated: tokens.filter((t) => t.phase === "migrated").length,
    };

    const market: Market = {
      fetchedAt: now,
      solUsd,
      tokens,
      tape,
      stats,
      sources: {
        pump: !!(latest || hot),
        dex: !!(batch || dexSearch),
        rug: false,
      },
      engine: readEngineStatus(),
    };
    feedCache.at = Date.now();
    feedCache.value = market;
    return market;
  })();
  feedCache.inflight = job;
  try {
    return await job;
  } finally {
    feedCache.inflight = null;
  }
}

export async function loadToken(mint: string): Promise<TokenDetail | null> {
  const feed = await loadFeed();
  const base = feed.tokens.find((t) => t.mint === mint);
  const [pairs, rug, pump, observation] = await Promise.all([
    getJson<DexPair[]>(`https://api.dexscreener.com/token-pairs/v1/solana/${mint}`),
    getJson<{
      score?: number;
      score_normalised?: number;
      risks?: Array<{ name?: string; description?: string }>;
      lpLockedPct?: number;
    }>(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`),
    getJson<PumpCoin>(`https://frontend-api-v3.pump.fun/coins/${mint}`),
    observeMint(mint),
  ]);
  let token = base ?? null;
  if (pump) {
    const p = fromPump(pump, Date.now());
    token = token && p ? merge(token, p) : p ?? token;
  }
  const solPair = (pairs || []).find((p) => p.chainId === "solana") || (pairs || [])[0];
  if (solPair) {
    const d = fromDex(solPair, Date.now());
    token = token && d ? merge(token, d) : d ?? token;
  }
  if (!token) return null;
  const risks = (rug?.risks || []).map((r) => r.name || r.description || "risk").filter(Boolean);
  if (rug?.score_normalised != null) {
    token = finish({ ...token, rugScore: rug.score_normalised });
  }
  if (observation.available && observation.venueStage) {
    token = {
      ...token,
      venueStage: observation.venueStage,
      provenance: observation.provenance,
      engineDecision: observation.engineDecision ?? token.engineDecision,
    };
  }
  return {
    ...token,
    description: pump?.description || null,
    rugRisks: risks.slice(0, 6),
    lpLockedPct: rug?.lpLockedPct ?? null,
    observation: {
      available: observation.available,
      missing: observation.missing,
      reasons: observation.reasons,
      abstention: observation.abstention,
      buyImpact: observation.buyImpact,
      sellImpact: observation.sellImpact,
    },
  };
}
