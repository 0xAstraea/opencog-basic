/**
 * Real chain reads against Base Sepolia.
 * No mocks. Fails loudly if the contract is broken or unreachable.
 *
 * npm test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { pub, read, MASTER_ADDRESS, toFP64, fromFP64 } from "../scripts/lib/client.mjs";

let total;
let markets = [];

beforeAll(async () => {
  total = await read("createdMarkets");
  expect(total).toBeGreaterThan(0n); // fail the whole suite if no markets

  for (let i = 0n; i < total; i++) {
    const data  = await read("markets", [i]);
    const col   = await read("marketCollateralInfo", [i]);
    markets.push({ id: i, data, col });
  }
}, 60_000);

// ── Connectivity ──────────────────────────────────────────────────────────────

describe("RPC + contract", () => {
  it("resolves Base Sepolia block number", async () => {
    const block = await pub.getBlockNumber();
    expect(block).toBeGreaterThan(0n);
  });

  it("contract has bytecode at the hardcoded address", async () => {
    const code = await pub.getBytecode({ address: MASTER_ADDRESS });
    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThan(2);
  });
});

// ── Market shape ──────────────────────────────────────────────────────────────

describe("every market has valid fields", () => {
  it("question is a non-empty string", () => {
    for (const { id, data } of markets) {
      const [question] = data;
      expect(question, `market ${id} question`).toBeTypeOf("string");
      expect(question.length, `market ${id} empty question`).toBeGreaterThan(0);
    }
  });


  it("endTimestamp is a positive bigint", () => {
    for (const { id, data } of markets) {
      expect(data[9], `market ${id} endTs`).toBeGreaterThan(0n);
    }
  });

  it("collateral token is a checksummed address", () => {
    for (const { id, col } of markets) {
      expect(col[0], `market ${id} token`).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it("collateral symbol is a non-empty string", () => {
    for (const { id, col } of markets) {
      expect(col[2], `market ${id} symbol`).toBeTypeOf("string");
      expect(col[2].length, `market ${id} empty symbol`).toBeGreaterThan(0);
    }
  });

  it("decimals are between 1 and 18", () => {
    for (const { id, col } of markets) {
      const dec = Number(col[3]);
      expect(dec, `market ${id} decimals`).toBeGreaterThanOrEqual(1);
      expect(dec, `market ${id} decimals`).toBeLessThanOrEqual(18);
    }
  });
});

// ── Prices ────────────────────────────────────────────────────────────────────

describe("prices on every market", () => {
  it("each outcome price is between 0 and 1e18", async () => {
    for (const { id } of markets) {
      const [buyPrices] = await read("marketPrices", [id]);
      for (let i = 1; i < buyPrices.length; i++) {
        expect(buyPrices[i], `market ${id} outcome ${i} price`).toBeGreaterThanOrEqual(0n);
        expect(buyPrices[i], `market ${id} outcome ${i} price`).toBeLessThanOrEqual(10n ** 18n);
      }
    }
  }, 60_000);

});

// ── Quotes ────────────────────────────────────────────────────────────────────

describe("buy/sell quotes on active markets", () => {
  let activeMarkets;

  beforeAll(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    activeMarkets = markets.filter(({ data }) => data[9] > now);
    expect(activeMarkets.length).toBeGreaterThan(0); // fail if no active markets
  });

  it("buy price is positive", async () => {
    for (const { id } of activeMarkets) {
      const cost = fromFP64(BigInt(await read("marketBuyPrice", [id, 1n, toFP64("10")])));
      expect(cost, `market ${id} buy cost`).toBeGreaterThan(0);
    }
  }, 60_000);

  it("sell price is lower than buy price (AMM spread)", async () => {
    for (const { id } of activeMarkets) {
      const fp     = toFP64("10");
      const buy    = fromFP64(BigInt(await read("marketBuyPrice",  [id, 1n, fp])));
      const sell   = fromFP64(BigInt(await read("marketSellPrice", [id, 1n, fp])));
      expect(sell, `market ${id} sell < buy`).toBeLessThan(buy);
    }
  }, 60_000);

  it("buy cost per share is a valid probability (0.01–0.99)", async () => {
    for (const { id } of activeMarkets) {
      const shares   = 10;
      const cost     = fromFP64(BigInt(await read("marketBuyPrice", [id, 1n, toFP64(String(shares))])));
      const perShare = cost / shares;
      expect(perShare, `market ${id} per-share cost`).toBeGreaterThan(0.01);
      expect(perShare, `market ${id} per-share cost`).toBeLessThan(0.99);
    }
  }, 60_000);

  it("larger share amounts cost more (price impact)", async () => {
    for (const { id } of activeMarkets) {
      const small = fromFP64(BigInt(await read("marketBuyPrice", [id, 1n, toFP64("5")])));
      const large = fromFP64(BigInt(await read("marketBuyPrice", [id, 1n, toFP64("50")])));
      expect(large, `market ${id} price impact`).toBeGreaterThan(small);
    }
  }, 60_000);
});
