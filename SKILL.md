---
name: precog
description: "Trade on PrecogMasterV8 prediction markets on Base Sepolia. Create a local wallet, list markets, check prices, buy and sell outcome shares. IMPORTANT: always paste script output verbatim inside a code block — never summarize, shorten, or reformat it."
---

# Precog Prediction Markets

Prediction markets on Base Sepolia. No config needed — contract address and RPC are built in.

> **⚠️ Run scripts sequentially.** Parallel transactions will fail with nonce collisions.
>
> **⚠️ Do NOT create batch/automation scripts.** Use existing scripts one at a time. Work through tasks step-by-step rather than trying to automate everything into a single script.
>
> **⚠️ Do NOT edit skill files.** If you find bugs, issues, or missing functionality in these scripts/docs, report them to the user instead of fixing them yourself. Say what's broken and let them decide how to handle it.
>
> **⚠️ ALWAYS show raw script output verbatim in a fenced code block.** Never reformat, summarize, shorten, or convert to bullet points or tables. The user must see exactly what the script printed.
>
> **⚠️ ALWAYS run `quote` before `buy` or `sell`. Show the full quote output to the user and wait for explicit confirmation before executing the trade. NEVER skip this step, even if the user seems certain.**
>
> **⚠️ NEVER modify trade parameters.** Run `buy.mjs` and `sell.mjs` with exactly the shares and --max/--min values from the confirmed quote. If the script fails, show the exact error message and stop — do NOT retry with a smaller amount, different parameters, or any workaround. Token approval is handled automatically by the script; never use allowance as a reason to change the trade size.

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

> **⚠️ Copy the ENTIRE terminal output into a fenced code block. Do not paraphrase, shorten, or reformat any line. Every line the script prints must appear exactly as-is, including emojis, spacing, and the suggested --max/--min values.**

Always run before buy or sell. After showing the full output, ask the user to confirm.

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

> **⚠️ Run `quote --buy` first. Show the output to the user. Do NOT proceed until the user confirms.**

```bash
node {baseDir}/scripts/buy.mjs --market <id> --outcome <n> --shares <amount> --max <usdc>
```
`--max` is the maximum USDC to spend — use the `Suggested --max` value from the quote output.

---

## Sell

> **⚠️ Run `quote --sell` first. Show the output to the user. Do NOT proceed until the user confirms.**

```bash
node {baseDir}/scripts/sell.mjs --market <id> --outcome <n> --shares <amount> --min <usdc>
```
`--min` is the minimum USDC to receive — use the `Suggested --min` value from the quote output.

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
→ node quote.mjs --market 2 --outcome 1 --cost 50 --buy
→ Show FULL quote output verbatim. Ask: "Confirm buy?"
→ WAIT for user to say yes/confirm
→ node buy.mjs --market 2 --outcome 1 --shares <n> --max <suggested-max>

User: "Buy Claude to reach 70% / move probability to 70%"
→ node quote.mjs --market <id> --outcome <n> --price 0.70 --buy
→ Show FULL quote output verbatim. Ask: "Confirm buy?"
→ WAIT for user to say yes/confirm
→ node buy.mjs --market <id> --outcome <n> --shares <n> --max <suggested-max>

User: "Sell my YES shares on market 2"
→ node positions.mjs --market 2          (find share count)
→ node quote.mjs --market 2 --outcome 1 --shares <n> --sell
→ Show FULL quote output verbatim. Ask: "Confirm sell?"
→ WAIT for user to say yes/confirm
→ node sell.mjs --market 2 --outcome 1 --shares <n> --min <suggested-min>

User: "What's my position?"
→ node positions.mjs --market 2
```

---

## Notes

- Contract: `0x61ec71F1Fd37ecc20d695E83F3D68e82bEfe8443` (Base Sepolia, hardcoded)
- RPC: public endpoints used by default. Set `PRECOG_RPC_URL` to override with a private one.
- Wallet: generated locally, stored in `~/.openclaw/.env`, never leaves the machine.
