import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  Radio,
  Search,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { venueShort } from "@/lib/engine/venue";
import { getMarket, getToken } from "@/lib/trench/api";
import { fmtAge, fmtInt, fmtMult, fmtPct, fmtUsd, shortMint } from "@/lib/trench/format";
import {
  axiomUrl,
  birdeyeUrl,
  dexUrl,
  gmgnUrl,
  jupUrl,
  photonUrl,
  pumpUrl,
  solscanUrl,
  xSearchUrl,
} from "@/lib/trench/links";
import type {
  EngineDecision,
  EngineStatus,
  Market,
  Phase,
  Token,
  TokenDetail,
  VenueStage,
  Verdict,
} from "@/lib/trench/types";
import { useWatch } from "@/lib/trench/watch";
import { cn } from "@/lib/utils";

type Tab = "tap" | "new" | "curve" | "migrated" | "watch" | "all";

export function Desk({ initial }: { initial: Market }) {
  const q = useQuery({
    queryKey: ["market"],
    queryFn: () => getMarket(),
    initialData: initial,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
  const data = q.data ?? initial;
  const [tab, setTab] = useState<Tab>("new");
  const [qtext, setQ] = useState("");
  const [hideNsfw, setHideNsfw] = useState(true);
  const [hideSkip, setHideSkip] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [clock, setClock] = useState("—");
  const [showEngine, setShowEngine] = useState(false);
  const watch = useWatch();
  const [mounted, setMounted] = useState(false);
  const keysOn = data.engine.keys.filter((k) => k.ok).length;

  useEffect(() => {
    setMounted(true);
    useWatch.getState().setHydrated();
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    let list = data.tokens;
    if (hideNsfw) list = list.filter((t) => !t.nsfw);
    if (hideSkip && tab !== "all") list = list.filter((t) => t.verdict !== "SKIP");
    if (tab === "tap") list = list.filter((t) => t.verdict === "TAP");
    else if (tab === "new") list = list.filter((t) => t.phase === "create");
    else if (tab === "curve") list = list.filter((t) => t.phase === "curve");
    else if (tab === "migrated") list = list.filter((t) => t.phase === "migrated");
    else if (tab === "watch") {
      const set = new Set(watch.items);
      list = list.filter((t) => set.has(t.mint));
    }
    const s = qtext.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(s) ||
          t.name.toLowerCase().includes(s) ||
          t.mint.toLowerCase().includes(s),
      );
    }
    return list;
  }, [data.tokens, tab, qtext, hideNsfw, hideSkip, watch.items]);

  const selected = data.tokens.find((t) => t.mint === sel) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("trench-search")?.focus();
      }
      if (e.key === "e" || e.key === "E") setShowEngine((v) => !v);
      if (e.key === "1") setTab("tap");
      if (e.key === "2") setTab("new");
      if (e.key === "3") setTab("curve");
      if (e.key === "4") setTab("migrated");
      if (e.key === "5") setTab("watch");
      if (e.key === "6") setTab("all");
      if (e.key === "Escape") {
        setShowEngine(false);
        setSel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-accent">
              TRENCH
            </span>
            <span className="hidden text-[11px] text-subtle sm:inline">meme traffic desk</span>
            <span className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted">
              <Lock className="size-2.5" />
              LIVE LOCKED
            </span>
            <span className="rounded-xs border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted">
              AUTO-BUY OFF
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums text-muted">
            <span>
              SOL{" "}
              <span className="text-fg">{data.solUsd ? fmtUsd(data.solUsd, 0) : "—"}</span>
            </span>
            <span>
              {data.stats.fresh} fresh ·{" "}
              <span className="text-tap">{data.stats.tap} TAP</span>
            </span>
            <button
              type="button"
              onClick={() => setShowEngine(true)}
              className="inline-flex h-7 items-center gap-1 rounded-xs border border-border px-1.5 text-[10px] hover:text-fg"
            >
              <KeyRound className="size-3" />
              {keysOn}/{data.engine.keys.length} keys
            </button>
            <span className="hidden sm:inline">
              {data.sources.pump ? "Pump" : "Pump down"} · {data.sources.dex ? "Dex" : "Dex down"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Radio className={cn("size-3", q.isFetching ? "text-up" : "text-subtle")} />
              <span suppressHydrationWarning>{clock}</span>
            </span>
          </div>
        </div>
        <Tape tape={data.tape} onPick={setSel} />
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 sm:px-4">
          <Tabs tab={tab} setTab={setTab} watchN={watch.items.length} stats={data.stats} />
          <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              id="trench-search"
              value={qtext}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ticker, name, mint"
              className="h-9 w-full rounded-sm border border-border bg-surface pr-3 pl-7 font-mono text-xs text-fg outline-none placeholder:text-subtle focus:border-accent"
            />
          </div>
          <label className="flex h-9 items-center gap-1.5 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={hideNsfw}
              onChange={(e) => setHideNsfw(e.target.checked)}
              className="accent-accent"
            />
            hide nsfw
          </label>
          <label className="flex h-9 items-center gap-1.5 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={hideSkip}
              onChange={(e) => setHideSkip(e.target.checked)}
              className="accent-accent"
            />
            hide skip
          </label>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-surface font-mono text-[10px] tracking-wide text-subtle uppercase">
              <tr className="border-b border-border">
                <th className="w-8 px-2 py-2 font-medium" />
                <th className="px-2 py-2 font-medium">Token</th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">Age</th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">MC</th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">5M VOL</th>
                <th className="hidden px-2 py-2 text-right font-medium whitespace-nowrap md:table-cell">
                  Accel
                </th>
                <th className="hidden px-2 py-2 text-right font-medium whitespace-nowrap md:table-cell">
                  Liq
                </th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">Tape</th>
                <th className="hidden px-2 py-2 font-medium lg:table-cell">Why</th>
                <th className="px-2 py-2 font-medium">Call</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-muted">
                    {q.isLoading ? "Loading tape…" : "Nothing in this band. Try All or clear search."}
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <TokenRow
                    key={t.mint}
                    t={t}
                    active={sel === t.mint}
                    onOpen={() => setSel(t.mint)}
                    watched={mounted && watch.has(t.mint)}
                    onWatch={() => watch.toggle(t.mint)}
                  />
                ))
              )}
            </tbody>
          </table>
        </main>
        {selected ? (
          <aside className="hidden w-[380px] shrink-0 border-l border-border bg-surface lg:block">
            <TokenPanel mint={selected.mint} fallback={selected} onClose={() => setSel(null)} />
          </aside>
        ) : null}
      </div>

      <div className="lg:hidden">
        <Drawer.Root open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-lg border-t border-border bg-surface">
              {selected ? (
                <TokenPanel mint={selected.mint} fallback={selected} onClose={() => setSel(null)} />
              ) : null}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {showEngine ? <EngineSheet engine={data.engine} onClose={() => setShowEngine(false)} /> : null}

      <footer className="border-t border-border px-3 py-1.5 font-mono text-[10px] text-subtle sm:px-4">
        Engine v{data.engine.policyVersion} · LIVE LOCKED · observe-only. Public Pump + Dex tape.
        On-chain stage needs Helius. {rows.length} on screen · E engine · / search · 1–6 tabs
      </footer>
    </div>
  );
}

function EngineSheet({ engine, onClose }: { engine: EngineStatus; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="close engine"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-border bg-surface p-4 sm:rounded-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent">ENGINE</p>
            <h2 className="text-base font-medium">Policy {engine.policyVersion} · observe</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              LIVE LOCKED. TAP is an alert, never a buy. PAPER_ELIGIBLE is unreachable. Signing
              keys never enter this desk. Add secrets on GitHub — values stay there.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center text-muted hover:text-fg"
            aria-label="close"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {engine.keys.map((k) => (
            <li key={k.provider} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <p className="font-mono text-[12px] text-fg">{k.provider}</p>
                <p className="text-[11px] text-subtle">{k.names.join(" + ")}</p>
                <p className="text-[11px] text-muted">{k.unlocks}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[10px]",
                  k.ok ? "bg-up/15 text-tap" : "bg-elevated text-subtle",
                )}
              >
                {k.ok ? "present" : "missing"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-subtle">
          GitHub Actions secret names only — never paste values in chat, issues, or this desk.
          Public Pump.fun + DexScreener keep the tape alive without keys.
        </p>
      </div>
    </div>
  );
}

function Tape({
  tape,
  onPick,
}: {
  tape: Market["tape"];
  onPick: (mint: string) => void;
}) {
  if (!tape.length) return null;
  const loop = [...tape, ...tape];
  return (
    <div className="overflow-hidden border-t border-border bg-elevated">
      <div className="animate-[trench-marquee_42s_linear_infinite] flex w-max gap-0 whitespace-nowrap font-mono text-[11px]">
        {loop.map((item, i) => (
          <button
            key={`${item.mint}-${i}`}
            type="button"
            onClick={() => onPick(item.mint)}
            className="flex items-center gap-2 border-r border-border px-3 py-1.5 text-muted hover:bg-surface hover:text-fg"
          >
            <VerdictDot v={item.verdict} />
            <span className="text-fg">{item.symbol}</span>
            <span>{fmtUsd(item.mc)}</span>
            <span className="text-subtle">{item.note}</span>
          </button>
        ))}
      </div>
      <style>{`@keyframes trench-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
  watchN,
  stats,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  watchN: number;
  stats: Market["stats"];
}) {
  const items: { id: Tab; label: string; n?: number }[] = [
    { id: "tap", label: "TAP", n: stats.tap },
    { id: "new", label: "New", n: stats.create },
    { id: "curve", label: "Curve", n: stats.curve },
    { id: "migrated", label: "Migrated", n: stats.migrated },
    { id: "watch", label: "Watch", n: watchN },
    { id: "all", label: "All", n: stats.tap + stats.watch + stats.skip },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={() => setTab(it.id)}
          className={cn(
            "h-9 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
            tab === it.id ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <span className="mr-1 hidden text-subtle sm:inline">{i + 1}</span>
          {it.label}
          {it.n != null ? <span className="ml-1 opacity-70">{it.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

function TokenRow({
  t,
  active,
  onOpen,
  watched,
  onWatch,
}: {
  t: Token;
  active: boolean;
  onOpen: () => void;
  watched: boolean;
  onWatch: () => void;
}) {
  const led = t.buys5m + t.sells5m > 0 ? t.buys5m >= t.sells5m : null;
  const hotAccel = (t.volAccel ?? 0) >= 10;
  return (
    <tr
      onClick={onOpen}
      className={cn(
        "cursor-pointer border-b border-border/80 hover:bg-elevated",
        active && "bg-elevated",
      )}
    >
      <td className="px-1 py-2">
        <button
          type="button"
          aria-label="watch"
          onClick={(e) => {
            e.stopPropagation();
            onWatch();
          }}
          className="grid size-8 place-items-center text-subtle hover:text-fg"
        >
          <Star className={cn("size-3.5", watched && "fill-watch text-watch")} />
        </button>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <Avatar t={t} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-fg">{t.symbol}</span>
              <PhaseChip p={t.phase} />
              <span className="hidden rounded-xs bg-elevated px-1 py-px font-mono text-[9px] tracking-wide text-subtle uppercase sm:inline">
                {venueShort(t.venueStage)}
              </span>
            </div>
            <div className="truncate text-[11px] text-subtle">{t.name}</div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 font-mono tabular-nums text-muted">{fmtAge(t.ageMs)}</td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtUsd(t.mc)}</td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">
        <div>{fmtUsd(t.vol5m)}</div>
        <div
          className={cn(
            "text-[10px]",
            (t.change5m ?? 0) > 0 ? "text-up" : (t.change5m ?? 0) < 0 ? "text-down" : "text-subtle",
          )}
        >
          {fmtPct(t.change5m)}
        </div>
      </td>
      <td
        className={cn(
          "hidden px-2 py-2 text-right font-mono tabular-nums md:table-cell",
          hotAccel ? "text-tap" : "text-muted",
        )}
      >
        {fmtMult(t.volAccel)}
      </td>
      <td className="hidden px-2 py-2 text-right font-mono tabular-nums text-muted md:table-cell">
        {fmtUsd(t.liq)}
      </td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">
        <div className="inline-flex items-center gap-1">
          {led == null ? (
            <Activity className="size-3 text-subtle" />
          ) : led ? (
            <ArrowUpRight className="size-3 text-up" />
          ) : (
            <ArrowDownRight className="size-3 text-down" />
          )}
          <span className="text-up">{fmtInt(t.buys5m)}</span>
          <span className="text-subtle">/</span>
          <span className="text-down">{fmtInt(t.sells5m)}</span>
        </div>
      </td>
      <td className="hidden max-w-[180px] truncate px-2 py-2 text-[11px] text-muted lg:table-cell">
        {t.rejects[0] || t.reasons[0] || t.dex || "—"}
      </td>
      <td className="px-2 py-2">
        <VerdictChip v={t.verdict} />
      </td>
    </tr>
  );
}

function Avatar({ t }: { t: Token }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-elevated font-mono text-[10px] text-muted">
      {t.symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}

function VerdictChip({ v }: { v: Verdict }) {
  return (
    <span
      className={cn(
        "inline-block rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide",
        v === "TAP" && "bg-up/15 text-tap",
        v === "WATCH" && "bg-watch/15 text-watch",
        v === "SKIP" && "bg-down/15 text-skip",
      )}
    >
      {v}
    </span>
  );
}

function VerdictDot({ v }: { v: Verdict }) {
  return (
    <span
      className={cn(
        "size-1.5 rounded-full",
        v === "TAP" && "bg-tap",
        v === "WATCH" && "bg-watch",
        v === "SKIP" && "bg-skip",
      )}
    />
  );
}

function PhaseChip({ p }: { p: Phase }) {
  return (
    <span className="rounded-xs bg-elevated px-1 py-px font-mono text-[9px] tracking-wide text-subtle uppercase">
      {p}
    </span>
  );
}

function DecisionChip({ d }: { d: EngineDecision }) {
  return (
    <span
      className={cn(
        "rounded-xs px-1.5 py-0.5 font-mono text-[10px] tracking-wide",
        d === "ALERT_ONLY" && "bg-watch/15 text-watch",
        d === "REJECT" && "bg-down/15 text-skip",
        d === "PAPER_ELIGIBLE" && "bg-up/15 text-tap",
      )}
    >
      {d.replaceAll("_", " ")}
    </span>
  );
}

function TokenPanel({
  mint,
  fallback,
  onClose,
}: {
  mint: string;
  fallback: Token;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["token", mint],
    queryFn: () => getToken({ data: { mint } }),
    staleTime: 12_000,
  });
  const t: Token | TokenDetail = q.data ?? fallback;
  const watch = useWatch();
  const [copied, setCopied] = useState(false);
  const detail = isDetail(t) ? t : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const links = [
    { label: "GMGN", href: gmgnUrl(t.mint) },
    { label: "Pump", href: pumpUrl(t.mint) },
    { label: "Dex", href: dexUrl(t.mint) },
    { label: "Jupiter", href: jupUrl(t.mint) },
    { label: "Photon", href: photonUrl(t.mint) },
    { label: "Axiom", href: axiomUrl(t.mint) },
    { label: "Birdeye", href: birdeyeUrl(t.mint) },
    { label: "Solscan", href: solscanUrl(t.mint) },
    { label: "X", href: t.twitter || xSearchUrl(`$${t.symbol} ${t.mint}`) },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <Avatar t={t} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-balance">{t.symbol}</h2>
            <VerdictChip v={t.verdict} />
            <PhaseChip p={t.phase} />
            <DecisionChip d={t.engineDecision} />
          </div>
          <p className="truncate text-sm text-muted">{t.name}</p>
          <button
            type="button"
            onClick={copy}
            className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-subtle hover:text-fg"
          >
            <Copy className="size-3" />
            {copied ? "copied" : shortMint(t.mint)}
          </button>
        </div>
        <button
          type="button"
          onClick={() => watch.toggle(t.mint)}
          className="grid size-9 place-items-center rounded-sm border border-border text-muted hover:text-fg"
          aria-label="watch"
        >
          <Star className={cn("size-4", watch.has(t.mint) && "fill-watch text-watch")} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-sm text-muted hover:text-fg"
          aria-label="close"
        >
          <X className="size-4" />
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-px bg-border text-[11px]">
        <Stat label="MC" value={fmtUsd(t.mc)} />
        <Stat label="Liq" value={fmtUsd(t.liq)} />
        <Stat label="Age" value={fmtAge(t.ageMs)} />
        <Stat label="5m vol" value={fmtUsd(t.vol5m)} />
        <Stat label="Accel" value={fmtMult(t.volAccel)} tone={(t.volAccel ?? 0) >= 10 ? "up" : undefined} />
        <Stat
          label="Buy %"
          value={t.buyPressure == null ? "—" : `${Math.round(t.buyPressure * 100)}%`}
          tone={(t.buyPressure ?? 0) >= 0.5 ? "up" : "down"}
        />
        <Stat
          label="5m tape"
          value={`${t.buys5m} / ${t.sells5m}`}
          tone={t.buys5m >= t.sells5m ? "up" : "down"}
        />
        <Stat label="5m %" value={fmtPct(t.change5m)} tone={(t.change5m ?? 0) >= 0 ? "up" : "down"} />
        <Stat label="Curve" value={t.curvePct == null ? "—" : `${Math.round(t.curvePct)}%`} />
      </dl>

      <div className="space-y-3 p-4">
        <p className="font-mono text-[11px] text-muted">
          Venue {venueLabel(t.venueStage)} · {t.provenance === "ON_CHAIN_FACT" ? "on-chain" : "provider tape"}
        </p>
        {t.reasons.length ? (
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-subtle uppercase">Confirms</p>
            <div className="flex flex-wrap gap-1">
              {t.reasons.map((r) => (
                <span key={r} className="rounded-xs bg-up/10 px-1.5 py-0.5 text-[11px] text-up">
                  {r}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {t.rejects.length ? (
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-subtle uppercase">Rejects</p>
            <div className="flex flex-wrap gap-1">
              {t.rejects.map((r) => (
                <span key={r} className="rounded-xs bg-down/10 px-1.5 py-0.5 text-[11px] text-down">
                  {r}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {detail?.observation ? (
          <div className="rounded-sm border border-border bg-elevated p-2.5">
            <p className="mb-1 font-mono text-[10px] tracking-wide text-subtle uppercase">
              Engine observe
            </p>
            {detail.observation.available ? (
              <p className="text-[11px] leading-relaxed text-muted">
                {detail.observation.reasons[0] || "ALERT_ONLY — live-locked"}
                {detail.observation.buyImpact != null
                  ? ` · buy impact ${detail.observation.buyImpact.toFixed(2)}%`
                  : ""}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-subtle">
                {detail.observation.abstention ||
                  "Helius + Jupiter keys unlock on-chain stage. Tape still runs without them."}
              </p>
            )}
          </div>
        ) : null}
        {detail?.rugRisks?.length || t.rugScore != null ? (
          <p className="font-mono text-[11px] text-muted">
            RugCheck {t.rugScore ?? "—"}
            {detail?.lpLockedPct != null ? ` · LP lock ${Math.round(detail.lpLockedPct)}%` : ""}
            {detail?.rugRisks?.length ? ` · ${detail.rugRisks.join(", ")}` : " · no named risks"}
          </p>
        ) : (
          <p className="text-[11px] text-subtle">RugCheck loads on inspect. Fail-closed if it ices out.</p>
        )}
        {detail?.description ? (
          <p className="line-clamp-4 text-[12px] leading-relaxed text-muted text-pretty">
            {detail.description}
          </p>
        ) : null}

        <div>
          <p className="mb-1.5 font-mono text-[10px] tracking-wide text-subtle uppercase">
            Open in your session
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1 rounded-sm border border-border bg-elevated text-[11px] text-fg hover:border-accent"
              >
                {l.label}
                <ExternalLink className="size-3 text-subtle" />
              </a>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-subtle">
          Human click only. Size and sign in GMGN / Phantom — this desk never holds a key and never
          sends a swap.
        </p>
      </div>
    </div>
  );
}

function venueLabel(stage: VenueStage): string {
  switch (stage) {
    case "pump_curve_active":
      return "pump curve active";
    case "migration_pending":
      return "migration pending";
    case "pumpswap_amm":
      return "PumpSwap AMM";
    case "other_amm":
      return "other AMM";
    default:
      return "unknown";
  }
}

function isDetail(t: Token | TokenDetail): t is TokenDetail {
  return Array.isArray((t as TokenDetail).rugRisks);
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">{label}</dt>
      <dd
        className={cn(
          "font-mono text-[13px] tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
