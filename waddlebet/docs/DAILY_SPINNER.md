# Daily Spinner — Prize Wheel (Planned)

> **Status:** Not implemented — design notes only  
> **When we build it:** use **`$CP` only** for paid rolls (never `$KINS` or competitor tokens)

---

## Intent

A retention prize wheel in the **Today** panel. Players get a **free spin on a cooldown** and may optionally buy **extra rolls** paid in **`$CP`** (SPL transfer to treasury / rake wallet, same pattern as igloo rent and token wagers).

This document exists so we have a spec ready when we implement — **no client UI, server service, or WebSocket handlers exist yet.**

---

## Proposed modes

| Mode | Cost | Cooldown |
|:-----|:-----|:---------|
| **Free spin** | $0 | TBD (e.g. 12h rolling, per wallet) |
| **Paid roll** | TBD `$CP` amount (e.g. ~$5 USD equivalent at spot) | None (unlimited while player pays) |

Paid rolls must:

1. Quote price in **`$CP`** using on-chain mint + USD reference (Jupiter / cached price).
2. Require verified SPL transfer of `$CP` to `RAKE_WALLET` (or dedicated spinner treasury) before the server rolls.
3. Use the **same `$CP` mint** as wagers / igloo rent (`CPW3_TOKEN_ADDRESS` or project `$CP` mint env).

**Do not** use `KINS_*` env vars or any third-party competitor token.

---

## Proposed prize table (TBD at implementation)

| Prize | Target odds | Notes |
|:------|:------------|:------|
| Rare cosmetic | ~1% | Event-exclusive hat; not in pebble gacha |
| Gold | ~5% | Small random gold band (server credits) |
| Resources | Remainder | Logs / ore / charcoal stacks |

Exact items, duplicate payouts, and segment art are **not finalized**.

---

## Environment (paid rolls — when implemented)

| Variable | Purpose |
|:---------|:--------|
| `CPW3_TOKEN_ADDRESS` | `$CP` SPL mint (same as wagers / rent) |
| `CP_USD_PRICE` or price oracle | USD per `$CP` for paid-roll quote |
| `RAKE_WALLET` | Recipient for paid `$CP` rolls |

---

## Suggested WebSocket API (future)

| Client → Server | Server → Client |
|:----------------|:----------------|
| `daily_spinner_status` | `daily_spinner_status` |
| `daily_spinner_spin` `{ mode: 'free' }` | `daily_spinner_result` |
| `daily_spinner_spin` `{ mode: 'paid', txSignature }` | `daily_spinner_result` |

---

## Economy notes

- No pebbles from the wheel (premium stays SOL-backed).
- Free spin is a **bonus stipend** (like daily quest completion), not a primary gold faucet.
- Paid rolls are a **`$CP` sink** — optional whale / impatient-player spend, not required to progress.

---

## Related docs

- [ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md) — Step 2 retention
- [ECONOMY_README.md](./ECONOMY_README.md) — shipped vs planned index

*Last updated: June 2026*
