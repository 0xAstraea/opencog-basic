---
name: precog
description: "Trade on PrecogMasterV8 prediction markets on Base Sepolia. Create a local wallet, list markets, check prices, buy and sell outcome shares. IMPORTANT: always paste script output verbatim inside a fenced code block — never summarize, shorten, or reformat it."
---

# Precog Prediction Markets

Prediction markets on Base Sepolia. No config needed — contract address and RPC are built in.

> **⚠️ Run scripts sequentially.** Parallel transactions will fail with nonce collisions.
>
> **⚠️ Do NOT create batch/automation scripts.** Use existing scripts one at a time.
>
> **⚠️ Do NOT edit skill files.** Report bugs or missing features to the user instead of fixing them.
>
> **⚠️ Always show script output verbatim in a fenced code block.** Never reformat, summarize, or convert to bullet points or tables. The user must see exactly what the script printed — every emoji, every line.
>
> **⚠️ Always run `quote` before `buy` or `sell`.** Show the full quote output to the user and wait for explicit confirmation before executing the trade.
>
> **⚠️ Never modify trade parameters.** If a script fails, show the exact error and stop. Do not retry with a different share count or any workaround. Token approval is handled automatically — never use allowance as a reason to change the trade size.

---

## Wallet

Check status or create a new wallet:
```bash
node {baseDir}/scripts/setup.mjs
node {baseDir}/scripts/setup.mjs --generate
```
The private key is saved to `~/.openclaw/.env` and **never printed**. Only the address is shown.
Ask the user to fund the address with ETH (gas) and collateral token (trading).

---

## List Markets

```bash
node {baseDir}/scripts/markets.mjs
node {baseDir}/scripts/markets.mjs --all
```

Example output:
```
Active Markets (2)

[4] Which AI model will be the top performer at the end of March?
    📈 Claude  67.3%  💰 USDC  📅 Mar 31, 2026

[5] Will ETH hit $5k by Q2?
    📈 YES  58.1%  💰 USDC  📅 Jun 30, 2026

```

---

## Quote a Trade

**Always run before buy or sell.** Show the full output verbatim in a fenced code block. Ask the user to confirm before proceeding.

### Choosing the right flag — CRITICAL

| What the user says | Flag to use | Example command |
|---|---|---|
| "buy N shares" | `--shares N` | `--shares 50` |
| "spend $X" / "for $X" / "budget $X" | `--cost X` | `--cost 50` |
| "reach X%" / "move to X%" / "push to X%" / "target X%" | `--price 0.X` | `--price 0.25` |
| "use all my balance" / "all in" / "spend everything" | `--all` | `--all` |

**Do NOT guess share counts manually. Use the correct flag — the script computes the exact answer.**

```bash
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --shares <amount> --buy
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --cost <usdc>     --buy
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --price <0.0-1.0> --buy
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --all             --buy
```

- `--outcome` is 1-based (1 = first outcome, usually YES)
- `--buy` shows only the buy side; `--sell` shows only the sell side; omit both to show both sides

Example output (`--price 0.25 --buy`):
```
📋  Quote — Market 4: Which AI model will be the top performer at the end of March?
─────────────────────────────────────────────────────────
  🎯  Outcome      : Claude
  🔢  Shares       : 312
  📊  Current prob : 14.2%

  🛒  Buy 312 shares
       💵  Cost           : ~98.4521 MATE
       📏  Price / share  : 0.3156 MATE
       📈  Prob after buy : 25.0%  (market moves up ↑)
       🏆  Max return     : 312.0000 MATE   (+213.5479 profit if "Claude" wins)

  ⚡  Suggested --max for buy  : 99.4366
─── Paste ALL lines above verbatim to the user before asking to confirm ───
```

---

## Buy

```bash
node {baseDir}/scripts/buy.mjs --market <id> --outcome <n> --shares <amount> --max <usdc>
```

- `--shares` — number of shares (from the quote output)
- `--max` — maximum collateral to spend; use the `Suggested --max` value from the quote output
- Token approval is handled automatically — never adjust `--max` or `--shares` for allowance reasons

---

## Sell

```bash
node {baseDir}/scripts/sell.mjs --market <id> --outcome <n> --shares <amount> --min <usdc>
```

- `--shares` — number of shares to sell (check `positions.mjs` if unsure)
- `--min` — minimum collateral to accept; use the `Suggested --min` value from the quote output

---

## Positions

```bash
node {baseDir}/scripts/positions.mjs --market <id>
```

---

## Standard flow

```
User: "What markets are open?"
→ node markets.mjs

User: "Use all my MATE to buy Claude on market 4"
→ node quote.mjs --market 4 --outcome 1 --all --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>

User: "Buy Claude for $50 on market 4"
→ node quote.mjs --market 4 --outcome 1 --cost 50 --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>

User: "Buy Claude to reach 25% on market 4"
→ node quote.mjs --market 4 --outcome 1 --price 0.25 --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>

User: "Sell my Claude shares on market 4"
→ node positions.mjs --market 4        (find share count)
→ node quote.mjs --market 4 --outcome 1 --shares <n> --sell
→ Paste full output verbatim. Ask: "Confirm sell?"
→ Wait for user to confirm
→ node sell.mjs --market 4 --outcome 1 --shares <n> --min <suggested-min>

User: "What's my position on market 4?"
→ node positions.mjs --market 4
```

---

## Notes

- Contract: `0x61ec71F1Fd37ecc20d695E83F3D68e82bEfe8443` (Base Sepolia, hardcoded)
- RPC: public endpoints used by default. Set `PRECOG_RPC_URL` to override.
- Wallet: generated locally, stored in `~/.openclaw/.env`, never leaves the machine.
