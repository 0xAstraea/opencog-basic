---
name: precog
description: "Trade on Precog prediction markets. List markets, buy and sell outcome shares, and create new markets."
metadata:
  openclaw:
    requires:
      env:
        PRIVATE_KEY: "Secp256k1 private key (0x-prefixed) for signing transactions. Created locally by running setup.mjs --generate and saved to ~/.openclaw/.env. Never transmitted over the network. Optional if you set it manually before first use."
        PRECOG_RPC_URL: "optional — override the default public Base Sepolia RPC endpoints (https://sepolia.base.org and fallbacks)."
      bins:
        - node
        - npm
        - npx
---

# Precog Prediction Markets

Precog is a fully onchain prediction market protocol on Base Sepolia (mainnet on Base, Ethereum, and Arbitrum coming soon). Anyone can create a market around a real-world question, fund it with liquidity, and trade outcome shares. Prices equal implied probabilities (0–1). Every action is a signed onchain transaction — no custody, no central party.

**MATE** is a non-monetary practice token (no real economic value). Markets denominated in MATE are safe to use for learning and experimentation. MATE can be claimed at [matetoken.xyz](https://matetoken.xyz).

**What you can do here:**
- Browse active prediction markets and outcome probabilities
- Get detailed market info including category and resolution criteria
- Quote, buy, and sell outcome shares using your local wallet
- Check your positions (shares held, net cost, trade history)
- Create new prediction markets (automated form submission via headless browser)

For full protocol documentation see `PRECOG.md` — it covers prediction markets 101, the LS-LMSR pricing curve, resolution via Reality.eth + Kleros, LP mechanics, MATE markets, and more.

No config needed — contract address and RPC are built in.

## Security and local state

- **`~/.openclaw/.env`** — created by `setup.mjs --generate`. Stores `PRIVATE_KEY` in plaintext. Treat it like a wallet key file: restrict permissions (`chmod 600`) and back it up. Losing it means losing access to any funds in that wallet.
- **No key is ever transmitted.** Transactions are signed locally; only the signed transaction is broadcast to the RPC.
- **Use a throwaway wallet.** The MATE markets use a practice token with no real value — ideal for testing. Do not load a high-value key into this skill.
- **Custom RPC risk.** If you set `PRECOG_RPC_URL`, use only a trusted endpoint. An untrusted RPC can observe signed transaction contents (but cannot extract your private key from them).

---

> **⚠️ Run scripts sequentially.** Parallel transactions will fail with nonce collisions.
>
> **⚠️ Do NOT create batch/automation scripts.** Use existing scripts one at a time.
>
> **⚠️ Do NOT edit skill files.** Report bugs or missing features to the user instead of fixing them.
>
> **⚠️ Never expose implementation details to the user.** Do not mention script names (`launchpad.mjs`, `markets.mjs`, etc.), CLI commands, flags, or error stack traces. If something fails, say "something went wrong" and describe what to try next — never show the raw command or suggest the user run it themselves.
>
> **⚠️ Never tell the user to run commands themselves.** If a dependency is missing or a setup step is needed, handle it silently (the script will auto-install what it can). If it still fails, say "I'm having a technical issue — let me know and I'll investigate" without exposing any commands.
>
> **⚠️ Never show raw script output when market creation fails.** If the script exits with an error or non-zero code, do NOT paste the log. Say: "I wasn't able to create the market right now — something went wrong on my end. Would you like to try again?" Do not describe the error (missing libraries, network issues, browser errors, etc.) and do not suggest workarounds, alternative approaches, or infrastructure changes. Never say things like "we could add a contract mode", "you could install Chrome", or "try running it locally".
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
After generating, ask the user to fund the address with ETH (for gas) and the market's collateral token (for trading).

Example output (wallet exists and funded):
```
Wallet: 0x77Ffa97c2dcDA0FF6c9393281993962FA633d9E1

  ETH:  0.004210 ✓
  MATE: 81.2300 ✓
```

Example output (wallet exists, no funds):
```
Wallet: 0x77Ffa97c2dcDA0FF6c9393281993962FA633d9E1

  ETH:  0.000000 ⚠️  needs gas
  MATE: 0.0000 (no funds)
```

---

## List Markets

```bash
node {baseDir}/scripts/markets.mjs
node {baseDir}/scripts/markets.mjs --all
```

Example output:
```
Active Markets (1)

[4] Which AI model will be the top performer at the end of March?
    📈 Claude  67.3%  💰 MATE  📅 Mar 31, 2026
    🏷️  AI / Leaderboard
    📝  This market will resolve based on the Text Arena AI Competition leaderboard
        rankings at arena.ai as of March 31, 2026, 23:59:59 UTC.

```

---

## Market Detail

When the user asks for more info / details about a specific market:

```bash
node {baseDir}/scripts/market.mjs --market <id>
```

Shows the title, category, status, end date, collateral, and all outcome probabilities ranked by price. After showing the output, **ask the user: "Would you like to see the resolution criteria?"** If they say yes:

```bash
node {baseDir}/scripts/market.mjs --market <id> --criteria
```

Example output (`--market 4`):
```
📊  Market 4  ·  AI / Leaderboard
Which AI model will be the top performer at the end of March?
🟢 Active  📅 Mar 31, 2026  💰 MATE

🥇  [1] Claude    16.3%
🥈  [2] Gemini    11.6%
🥉  [3] Grok      11.6%
    [4] ChatGPT   11.6%
    [5] Ernie     11.6%
    [6] GLM       11.6%
    [7] Kimi      11.6%
    [8] Qwen      11.6%
    [9] Other     11.6%

```

Example output (`--market 4 --criteria`):
```
📊  Market 4  ·  AI / Leaderboard
Which AI model will be the top performer at the end of March?
🟢 Active  📅 Mar 31, 2026  💰 MATE

🥇  [1] Claude    16.3%
🥈  [2] Gemini    11.6%
🥉  [3] Grok      11.6%
    [4] ChatGPT   11.6%
    [5] Ernie     11.6%
    [6] GLM       11.6%
    [7] Kimi      11.6%
    [8] Qwen      11.6%
    [9] Other     11.6%

📝  Resolution Criteria
This market will resolve based on the Text Arena AI Competition leaderboard
rankings at arena.ai as of March 31, 2026, 23:59:59 UTC.

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

Example output:
```
💼  Market 4
Which AI model will be the top performer at the end of March?

👛  0x77Ffa97c2dcDA0FF6c9393281993962FA633d9E1
💵  Net cost  19.03 MATE  ·  📥 8 buys  📤 7 sells

🎯  Shares held
🥇  [1] Claude   135 shares  ·  16.3%

```

---

## Responding to "what can I do?" questions

When the user asks what they can do, what Precog is, or how to get started — answer in plain prose with emojis, no tables. **Never mention script names or CLI commands.** Mention their current positions if you know them. Example:

> With Precog you can trade on the probability of real-world outcomes using MATE (a safe practice token — no real money).
>
> Here's what you can do:
>
> 🗂️ **Browse markets** — see what's open, leading outcomes, categories, and resolution criteria
> 💸 **Trade** — buy or sell outcome shares by amount, budget, or target probability
> 📋 **Check positions** — see your shares, net cost, and trade history
> 🏗️ **Create a market** — I can set up a new prediction market on any topic for you
>
> You currently hold 100 Claude shares on Market 4. Want to check the latest prices or make a move?

Adapt the last line to whatever you actually know about the user's positions and active markets.

---

## Standard flow

```
User: "What markets are open?"
→ node markets.mjs

User: "Tell me more about market 4" / "What are the outcomes on market 4?"
→ node market.mjs --market 4
→ After output, ask: "Would you like to see the resolution criteria?"
→ If yes: node market.mjs --market 4 --criteria

User: "What's my position on market 4?"
→ node positions.mjs --market 4

User: "Show all my positions" / "Do I have any shares?"
→ node markets.mjs --all   (get list of all market IDs)
→ node positions.mjs --market <id>   (repeat for each market)

User: "Use all my MATE to buy Claude on market 4"
→ node quote.mjs --market 4 --outcome 1 --all --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>
→ After trade: suggest checking positions or new market price

User: "Buy Claude for $50 on market 4"
→ node quote.mjs --market 4 --outcome 1 --cost 50 --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>
→ After trade: suggest checking positions or new market price

User: "Buy Claude to reach 25% on market 4"
→ node quote.mjs --market 4 --outcome 1 --price 0.25 --buy
→ Paste full output verbatim. Ask: "Confirm buy?"
→ Wait for user to confirm
→ node buy.mjs --market 4 --outcome 1 --shares <n from quote> --max <suggested-max>
→ After trade: suggest checking positions or new market price

User: "Sell my Claude shares on market 4"
→ node positions.mjs --market 4        (find share count)
→ node quote.mjs --market 4 --outcome 1 --shares <n> --sell
→ Paste full output verbatim. Ask: "Confirm sell?"
→ Wait for user to confirm
→ node sell.mjs --market 4 --outcome 1 --shares <n> --min <suggested-min>
→ After trade: suggest checking positions or remaining balance

User: "Create a market about X" / "Can you create a market for Y?"
→ DO NOT mention scripts, commands, or technical details to the user
→ Gather any missing required fields conversationally:
    question, resolution criteria, category, outcomes, start date, end date, collateral token
→ Propose sensible defaults based on the topic (e.g. YES/NO for binary, team names for a tournament)
→ Present a summary to the user and ask for confirmation, e.g.:
    "Here's what I'll create:
     ❓ Will Argentina win the 2026 FIFA World Cup?
     📝 Resolves YES if Argentina is crowned champion on July 19, 2026.
     🏷️ SPORTS
     🔘 Outcomes: YES / NO
     📅 Jun 1 – Jul 19, 2026
     🪙 MATE
     📧 you@email.com (optional — omit if not provided)
     Shall I go ahead?"
→ Also ask: "Would you like to receive email notifications about this market? If so, share your email." (optional — skip if user declines)
→ On confirmation: run launchpad.mjs with the gathered fields (internal — never shown to user)
→ Show the script output verbatim in a fenced code block
→ After 🎉 Market creation submitted!, tell the user in plain language:
    "✅ Market created and submitted for review!
     Next steps:
     1️⃣ Fund it with liquidity at https://core.precog.markets/84532/launchpad
     2️⃣ The Precog team will review and approve it before it goes live — this may take some time."

User asks about a topic/event and no matching market exists
→ After listing markets say naturally (no script names):
    "There's no market for [topic] yet. Want me to create one? 🏗️"
→ If yes: gather fields and proceed as above
```

---

## Create a Market

Markets are created via `launchpad.mjs`, which logs in to `core.precog.markets` automatically and submits the creation form using a headless browser.

**Prerequisites**
- The wallet must have at least **3,000 Precog Points** (creator status). If restricted, the script reports `⛔ Market Creation Restricted` and stops.
- A Chromium-based browser must be available on the machine (Chrome, Brave, Chromium, or Playwright's bundled browser). The script detects and connects automatically — no manual setup needed.

**Command**
```bash
node {baseDir}/scripts/launchpad.mjs \
  --question    "Will X happen?" \
  --description "Resolves YES if..." \
  --category    "SPORTS" \
  --outcomes    "YES,NO" \
  --start       "2026-04-01" \
  --end         "2026-06-30" \
  --token       "0x…"
```

**Flags**

| Flag | Required | Notes |
|---|---|---|
| `--question` | yes | The market title / question |
| `--description` | yes | Resolution criteria — be precise |
| `--category` | yes | e.g. `SPORTS`, `POLITICS`, `CRYPTO`, `AI` |
| `--outcomes` | yes | Comma-separated, e.g. `"YES,NO"` or `"TeamA,TeamB,Draw"` |
| `--start` | yes | Trading start date ISO: `2026-04-01` |
| `--end` | yes | Trading end / resolution date ISO: `2026-06-30` |
| `--token` | yes | Collateral token address. MATE (practice) = `0xC139C86de76DF41c041A30853C3958427fA7CEbD` |
| `--image` | no | IPFS or HTTPS image URL |
| `--email` | no | Creator contact email |
| `--headless` | no | Run without a visible browser window |

**What the script does**
1. Logs in via injected MetaMask provider (signs SIWE message automatically — no user action needed)
2. Fills all form fields
3. Clicks Review Market → Create Market → Confirm Creation
4. Prints `🎉 Market creation submitted!` on success

**After submission — two more steps required**

> ⚠️ The market is NOT live yet after the script finishes.

1. **Fund the market** — the creator must provide initial liquidity at:
   **https://core.precog.markets/84532/launchpad**
   Without funding the market has no liquidity and cannot be traded.

2. **Staff approval** — the Precog team reviews and approves markets before they go live. This is not instant; tell the user to expect a delay.

**Example output**
```
Wallet: 0x01BE…
Navigating to https://core.precog.markets/84532/create-market …
Session established.

📝  Filling market creation form …
  ✏️   question: Will Argentina beat Brazil?
  ✏️   description: Resolves YES if Argentina wins.
  ✏️   category: SPORTS
  🪙  token options: MATE, DACC, Custom Token
  🪙  custom token address: 0x…
  ➕  outcome: YES
  ➕  outcome: NO
  📅  start date set: 2026-06-01
  📅  end date set: 2026-07-15
  🔍  Clicked Review Market
  🚀  Clicked Create Market
  ✅  Clicked Confirm Creation

🎉  Market creation submitted!
```

---

## Notes

- Contract: `0x61ec71F1Fd37ecc20d695E83F3D68e82bEfe8443` (Base Sepolia, hardcoded)
- RPC: public endpoints used by default. Set `PRECOG_RPC_URL` to override.
- Wallet: generated locally, stored in `~/.openclaw/.env`, never leaves the machine.
