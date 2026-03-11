---
name: precog
description: "Trade on PrecogMasterV8 prediction markets on Base Sepolia. Create a local wallet, list markets, check prices, buy and sell outcome shares."
---

# Precog Prediction Markets

Prediction markets on Base Sepolia. No config needed — contract address and RPC are built in.

> **⚠️ Run scripts sequentially.** Parallel transactions will fail with nonce collisions.
>
> **⚠️ Do NOT create batch/automation scripts.** Use existing scripts one at a time. Work through tasks step-by-step rather than trying to automate everything into a single script.
>
> **⚠️ Do NOT edit skill files.** If you find bugs, issues, or missing functionality in these scripts/docs, report them to the user instead of fixing them yourself. Say what's broken and let them decide how to handle it.
>
> **Setup**: No config needed — contract address and RPC are built in. Always call `quote` before `buy` or `sell` and confirm cost with user.

---

## Wallet

Check status or create a new wallet:
```bash
node {baseDir}/scripts/setup.mjs
```
```bash
node {baseDir}/scripts/setup.mjs --generate
```
The private key is saved to `~/.openclaw/.env` and **never printed**. Only the address is shown.
Ask the user to fund the address with ETH (gas) and USDC (trading).

---

## List Markets

Show active markets with the current prediction (most likely outcome):
```bash
node {baseDir}/scripts/markets.mjs
```

Show all markets ever created (titles only, no prices):
```bash
node {baseDir}/scripts/markets.mjs --all
```

> **Always wrap script output in a fenced code block** (triple backticks) when showing it to the user. Never reformat, summarize, or convert to a table.

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

Always run before buy or sell. Show the output to the user and confirm before proceeding.

Quote by number of shares:
```bash
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --shares <amount> [--buy | --sell]
```

Quote by budget (how many shares can I get for $X?):
```bash
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --cost <usdc> [--buy | --sell]
```

Quote by target price (how many shares to move probability to X?):
```bash
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --price <0.0-1.0> [--buy | --sell]
```

`--outcome` is 1-based (1 = first outcome, usually YES).
`--buy` shows only buy info. `--sell` shows only sell info. Omit both to show buy and sell.

Example output (buy only — `--buy`):
```
📋  Quote — Market 4: Which AI model will be the top performer at the end of March?
─────────────────────────────────────────────────────────
  🎯  Outcome      : Claude
  🔢  Shares       : 47
  📊  Current prob : 15.1%

  🛒  Buy 47 shares
       💵  Cost           : ~38.4521 MATE
       📏  Price / share  : 0.8181 MATE
       📈  Prob after buy : 18.3%  (market moves up ↑)
       🏆  Max return     : 47.0000 MATE   (+8.5479 profit if "Claude" wins)

  ⚡  Suggested --max for buy  : 38.8366
```

Example output (sell only — `--sell`):
```
📋  Quote — Market 4: Which AI model will be the top performer at the end of March?
─────────────────────────────────────────────────────────
  🎯  Outcome      : Claude
  🔢  Shares       : 47
  📊  Current prob : 15.1%

  💸  Sell 47 shares
       💵  Return         : ~35.2341 MATE
       📏  Price / share  : 0.7497 MATE
       📉  Prob after sell: 13.1%  (market moves down ↓)

  ⚡  Suggested --min for sell : 34.8818
```

---

## Buy

```bash
node {baseDir}/scripts/buy.mjs --market <id> --outcome <n> --shares <amount> --max <usdc>
```
`--max` is the maximum USDC to spend (e.g. `40` for $40). USDC approval is handled automatically.

---

## Sell

```bash
node {baseDir}/scripts/sell.mjs --market <id> --outcome <n> --shares <amount> --min <usdc>
```
`--min` is the minimum USDC to receive.

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

User: "I want to buy YES on market 2 for $50"
→ node quote.mjs --market 2 --outcome 1 --shares 60
→ Show quote to user, ask to confirm
→ node buy.mjs --market 2 --outcome 1 --shares 60 --max 50

User: "What's my position?"
→ node positions.mjs --market 2
```

---

## Notes

- Contract: `0x61ec71F1Fd37ecc20d695E83F3D68e82bEfe8443` (Base Sepolia, hardcoded)
- RPC: public endpoints used by default. Set `PRECOG_RPC_URL` to override with a private one.
- Wallet: generated locally, stored in `~/.openclaw/.env`, never leaves the machine.
