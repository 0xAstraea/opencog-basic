#!/usr/bin/env node
// Sign a message with the local wallet private key.
//
// Usage:
//   node signer.mjs --address        → print wallet address
//   node signer.mjs <hex-message>    → sign as raw bytes (0x-prefixed hex)
//   node signer.mjs <utf8-message>   → sign as UTF-8 string
//
// Reads PRIVATE_KEY from env or ~/.openclaw/.env. Prints result to stdout.

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Load ~/.openclaw/.env ─────────────────────────────────────────────────────

const ENV_FILE = join(homedir(), ".openclaw", ".env");
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// ── Account ───────────────────────────────────────────────────────────────────

const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error("No PRIVATE_KEY found.\nRun: node scripts/setup.mjs --generate");
  process.exit(1);
}

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet  = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

// ── CLI ───────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === "--address") {
  process.stdout.write(account.address + "\n");
  process.exit(0);
}

// Sign — hex-prefixed messages are signed as raw bytes (Privy SIWE style);
// plain UTF-8 strings are signed as UTF-8.
const sig = arg.startsWith("0x")
  ? await wallet.signMessage({ message: { raw: arg }, account })
  : await wallet.signMessage({ message: arg, account });

process.stdout.write(sig + "\n");
