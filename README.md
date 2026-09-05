# TRENCH

Solana meme traffic desk + live-locked research engine.

One product: the desk watches Pump.fun / DexScreener in real time, scores TAP / WATCH / SKIP, and runs the vendored `solana-trading-engine` decision contract. Auto-buy is off. Live trading cannot be unlocked by an env flag.

## What it is

- **Desk** — dense terminal for new / curve / migrated Solana memes. Alert-first.
- **Engine** — `engine/` is the research-governed observer from `solana-trading-engine`. Policy v1.2.0. Status: **LIVE_LOCKED**. Decisions are `REJECT` or `ALERT_ONLY`. `PAPER_ELIGIBLE` is reserved and unreachable.
- **Not in scope** — Robinhood / equities, wallet connect, signing, GMGN bot execution.

TAP is an alert, never a buy. Social virality alone cannot authorize a TAP. Volume acceleration uses the engine discovery floor (10× vs the 1h baseline). Pump stage follows the engine contract: completion ≠ migration.

## Public tape vs keyed intel

The desk runs without secrets on Pump.fun + DexScreener. Keys deepen the tape; they do not authorize trades.

| Secret | Unlocks |
| --- | --- |
| `HELIUS_API_KEY` | On-chain Pump stage, mint/freeze authority, logs |
| `JUPITER_API_KEY` | Read-only quotes (no wallet params, no signing) |
| `BIRDEYE_API_KEY` | Holder / flow tape |
| `GMGN_API_KEY` | Read-only intel — never strategy authority |
| `X_BEARER_TOKEN` | Narrative radar (alerts only) |
| `LUNARCRUSH_API_KEY` | Social topics (alerts only) |
| `NEWSAPI_KEY` | News discovery (alerts only) |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_CHAT_ID` | Alert delivery |

Add these as **GitHub Actions secrets** on this repo (Settings → Secrets and variables → Actions). Never commit them. Never paste values into issues, chat, or `.env` in git. GitHub does not expose secret values over the API — only you can set them.

`TELEGRAM_API_ID` / `TELEGRAM_API_HASH` stay local until the Telegram user client exists. Seed phrases and private keys are forbidden here.

Copy `engine/.env.example` to a local `engine/.env` only on your machine.

## Layout

```
engine/     live-locked observer, policy, tests
src/        TRENCH desk (TanStack Start)
```

Engine tests: `cd engine && node --test`

## Policy that the desk actually enforces

- `LIVE_TRADING_ENABLED` cannot unlock buys
- Curve names stay alert-only until independent market tape exists
- Wash tape / dead dust / unsellable tape / ticker clones hard-reject
- Venue labels from the public tape are `PROVIDER_OBSERVATION`, not on-chain facts, until Helius confirms
