#!/usr/bin/env node
import { fileURLToPath } from "url";
import * as client from "./lib/client.mjs";

export async function main(deps = {}) {
  const { read, outcomes, pct, status, date, args } = { ...client, ...deps };

  const a = args();
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
