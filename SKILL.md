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

```bash
node {baseDir}/scripts/markets.mjs
```
Shows all markets with current prices and status.

---

## Quote a Trade

Always run before buy or sell. Show the output to the user and confirm before proceeding.
```bash
node {baseDir}/scripts/quote.mjs --market <id> --outcome <n> --shares <amount>
```
`--outcome` is 1-based (1 = first outcome, usually YES).

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
