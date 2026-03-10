#!/usr/bin/env node
import { fileURLToPath } from "url";
import * as client from "./lib/client.mjs";

export async function main(deps = {}) {
  const { read, getWallet, outcomes, fromRaw, pct, args } = { ...client, ...deps };

  const a = args();
  if (!a.market) {
    console.error("Usage: node positions.mjs --market <id>");
    process.exit(1);
  }

  const marketId = BigInt(a.market);
  const { account } = getWallet();

  const market = await read("markets", [marketId]);
  const [question, , , , outcomesRaw] = market;
  const [, , colSymbol, colDecimals]  = await read("marketCollateralInfo", [marketId]);
  const dec  = Number(colDecimals);
  const outs = outcomes(outcomesRaw);

  const [totalBuys, totalSells, deposited, withdrawn, redeemed, balances] =
    await read("marketAccountInfo", [marketId, account.address]);

  const netCost = deposited - withdrawn - redeemed;

  console.log(`\nPositions — Market ${a.market}: ${question}`);
  console.log(`Wallet: ${account.address}`);
  console.log(`${"─".repeat(55)}`);
  console.log(`  Net cost : ${fromRaw(netCost < 0n ? 0n : netCost, dec)} ${colSymbol}`);
  console.log(`  Buys     : ${totalBuys}   Sells: ${totalSells}`);
  console.log(`\n  Shares held:`);

  const held = [];
  for (let i = 1; i < balances.length; i++) {
    if (balances[i] === 0n) continue;
    const label       = outs[i - 1] ?? `Outcome ${i}`;
    const sharesHuman = (Number(balances[i]) / 1e18).toFixed(4);

    let currentPrice = "";
    try {
      const [buyPrices] = await read("marketPrices", [marketId]);
      currentPrice = `  (${pct(buyPrices[i])}% implied)`;
    } catch {}

    console.log(`    [${i}] ${label}: ${sharesHuman} shares${currentPrice}`);
    held.push({ outcome: i, label, shares: sharesHuman });
  }

  if (held.length === 0) console.log("    No shares held in this market.");
  console.log("");
  return { netCost, totalBuys, totalSells, held };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
