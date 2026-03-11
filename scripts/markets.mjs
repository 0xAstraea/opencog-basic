#!/usr/bin/env node
// List all Precog prediction markets with current prices and status.
//
// Usage:
//   node markets.mjs                    # list all markets
//   node markets.mjs --limit <n>        # show only first n markets
//   node markets.mjs --status active    # filter by status (active|ended)
//
// Env: PRECOG_RPC_URL (optional)
import { fileURLToPath } from "url";
import * as client from "./lib/client.mjs";
import { parseArgs } from "./lib/args.mjs";

export async function main(deps = {}) {
  const { read, outcomes, pct, status, date } = { ...client, ...deps };
  const _parseArgs = deps.parseArgs ?? parseArgs;

  const a = _parseArgs();
  const total = await read("createdMarkets");
  if (total === 0n) { console.log("No markets found."); return []; }

  const limit        = a.limit ? parseInt(a.limit) : Number(total);
  const filterStatus = a.status;
  const result       = [];

  console.log(`\nPrecog Markets (${total} total)\n${"─".repeat(60)}`);

  let shown = 0;
  for (let i = 0; i < Number(total) && shown < limit; i++) {
    const market = await read("markets", [BigInt(i)]);
    const [question, , , category, outcomesRaw, , , , , endTs] = market;
    const [, , colSymbol] = await read("marketCollateralInfo", [BigInt(i)]);

    const s = status(endTs);
    if (filterStatus && s !== filterStatus) continue;

    const outs   = outcomes(outcomesRaw);
    let   prices = null;
    try {
      const [buyPrices] = await read("marketPrices", [BigInt(i)]);
      prices = outs.map((o, idx) => `${o}: ${pct(buyPrices[idx + 1])}%`);
    } catch {}

    console.log(`\n[${i}] ${question}`);
    console.log(`    Category : ${category}`);
    console.log(`    Status   : ${s}  •  ends ${date(endTs)}`);
    console.log(`    Collateral: ${colSymbol}`);
    console.log(prices
      ? `    Prices   : ${prices.join("  |  ")}`
      : `    Outcomes : ${outs.join(" / ")}`);

    result.push({ id: i, question, category, status: s, outcomes: outs, prices });
    shown++;
  }

  if (shown === 0) console.log(`\nNo ${filterStatus ?? ""} markets found.`);
  console.log("");
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
