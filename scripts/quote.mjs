#!/usr/bin/env node
// Quote the cost to buy or sell outcome shares in a Precog market.
// Always run before buy or sell — show the output to the user and confirm.
//
// Usage:
//   node quote.mjs --market <id> --outcome <n> --shares <amount>
//
// --outcome is 1-based (1 = first outcome, usually YES).
// Env: PRECOG_RPC_URL (optional)
import { fileURLToPath } from "url";
import * as client from "./lib/client.mjs";
import { parseArgs, requireArgs } from "./lib/args.mjs";

export async function main(deps = {}) {
  const { read, outcomes, pct, toFP64, fromFP64 } = { ...client, ...deps };
  const _parseArgs   = deps.parseArgs   ?? parseArgs;
  const _requireArgs = deps.requireArgs ?? requireArgs;
  const a = _parseArgs();
  _requireArgs(a, ["market", "outcome", "shares"]);

  const marketId = BigInt(a.market);
  const outcome  = parseInt(a.outcome);
  const sharesFP = toFP64(a.shares);

  const market = await read("markets", [marketId]);
  const [question, , , , outcomesRaw] = market;
  const [, , colSymbol] = await read("marketCollateralInfo", [marketId]);

  const outs  = outcomes(outcomesRaw);
  const label = outs[outcome - 1] ?? `Outcome ${outcome}`;

  const buyCostFP = await read("marketBuyPrice",  [marketId, BigInt(outcome), sharesFP]);
  const sellRetFP = await read("marketSellPrice", [marketId, BigInt(outcome), sharesFP]);

  const buyCost  = fromFP64(BigInt(buyCostFP));
  const sellRet  = fromFP64(BigInt(sellRetFP));
  const perShare = buyCost / Number(a.shares);

  let prob = "N/A";
  try {
    const [buyPrices] = await read("marketPrices", [marketId]);
    prob = pct(buyPrices[outcome]) + "%";
  } catch {}

  console.log(`\nQuote — Market ${a.market}: ${question}`);
  console.log(`${"─".repeat(55)}`);
  console.log(`  Outcome      : ${label}`);
  console.log(`  Shares       : ${a.shares}`);
  console.log(`  Implied prob : ${prob}`);
  console.log(`\n  Buy  ${a.shares} shares → costs  ~${buyCost.toFixed(4)} ${colSymbol}`);
  console.log(`  Sell ${a.shares} shares → returns ~${sellRet.toFixed(4)} ${colSymbol}`);
  console.log(`  Cost per share: ${perShare.toFixed(4)} ${colSymbol}`);
  console.log(`\n  Suggested --max for buy : ${(buyCost * 1.01).toFixed(4)}`);
  console.log(`  Suggested --min for sell: ${(sellRet * 0.99).toFixed(4)}`);
  console.log("");

  return { label, buyCost, sellRet, perShare, prob, suggestedMax: buyCost * 1.01, suggestedMin: sellRet * 0.99 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
