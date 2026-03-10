#!/usr/bin/env node
import { fileURLToPath } from "url";
import * as client from "./lib/client.mjs";

export async function main(deps = {}) {
  const { read, write, getWallet, outcomes, toFP64, toRaw, args } = { ...client, ...deps };

  const a = args();
  if (!a.market || !a.outcome || !a.shares || !a.min) {
    console.error("Usage: node sell.mjs --market <id> --outcome <n> --shares <amount> --min <usdc>");
    process.exit(1);
  }

  const marketId = BigInt(a.market);
  const outcome  = parseInt(a.outcome);
  const sharesFP = toFP64(a.shares);
  const slippage = parseFloat(a.slippage ?? "1");

  const { account, wallet } = getWallet();

  const [, , colSymbol, colDecimals] = await read("marketCollateralInfo", [marketId]);
  const dec    = Number(colDecimals);
  const minRaw = toRaw((parseFloat(a.min) * (1 - slippage / 100)).toFixed(dec), dec);

  const market = await read("markets", [marketId]);
  const [, , , , outcomesRaw] = market;
  const outs  = outcomes(outcomesRaw);
  const label = outs[outcome - 1] ?? `Outcome ${outcome}`;

  console.log(`\nSelling ${a.shares} shares of [${label}] on market ${a.market}`);
  console.log(`Min receive: ${a.min} ${colSymbol} (-${slippage}% slippage)`);
  console.log(`Wallet: ${account.address}\n`);

  await write(wallet, account, "marketSell", [marketId, BigInt(outcome), sharesFP, minRaw]);

  console.log(`\n✓ Sold ${a.shares} shares of ${label} on market ${a.market}`);
  return { label, shares: a.shares, market: a.market };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
