#!/usr/bin/env node
// Headless Privy login for core.precog.markets using a fake EIP-1193 provider.
//
// Usage:
//   node scripts/launchpad.mjs              # headful (default, good for debugging)
//   node scripts/launchpad.mjs --headless   # headless
//   node scripts/launchpad.mjs --debug      # keep browser open after navigation
//
// First time: npx playwright install chromium

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import { chromium } from "playwright";
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

// ── Args ──────────────────────────────────────────────────────────────────────
// Usage for market creation:
//   node scripts/launchpad.mjs \
//     --question "Will X happen?" \
//     --description "Resolves YES if..." \
//     --category "SPORTS" \
//     --outcomes "YES,NO" \
//     --start "2026-04-01" \
//     --end "2026-06-30" \
//     --image "ipfs://..." \
//     --email "you@email.com" \
//     --token "0xABC…"         # custom ERC-20 collateral token address

const args     = process.argv.slice(2);
// Auto-headless on Linux servers where no display is available
const headless = args.includes("--headless") || (process.platform === "linux" && !process.env.DISPLAY);
const debug    = args.includes("--debug");

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const marketArgs = {
  question:    getArg("question"),
  description: getArg("description"),
  category:    getArg("category"),
  outcomes:    getArg("outcomes")?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
  start:       getArg("start"),   // ISO date: 2026-04-01
  end:         getArg("end"),
  image:       getArg("image"),
  email:       getArg("email"),
  token:       getArg("token"),   // custom ERC-20 token address
};
const createMode = !!marketArgs.question;

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

const ADDRESS = account.address;
console.log(`Wallet: ${ADDRESS}`);

// ── Browser ───────────────────────────────────────────────────────────────────

// --no-sandbox + --disable-dev-shm-usage let Chromium run on Linux servers
// without any system package installs (works in Docker, cloud VMs, etc.)
const CHROME_ARGS = process.platform === "linux"
  ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  : [];

let browser;
try {
  browser = await chromium.launch({ headless, args: CHROME_ARGS });
} catch (e) {
  if (/Executable doesn't exist|browserType\.launch|executable/i.test(e.message)) {
    console.log("Chromium not found — installing (this runs once) …");
    execSync("npx playwright install chromium", { stdio: "inherit" });
    browser = await chromium.launch({ headless, args: CHROME_ARGS });
  } else {
    throw e;
  }
}
const context = await browser.newContext();

// Inject window.ethereum into every page/popup that opens in this context
await context.addInitScript((addr) => {
  const log = (...a) => console.log("[ethereum]", ...a);
  if (window.ethereum) return; // already injected
  window.ethereum = {
    isMetaMask: true,
    chainId: "0x14a34",
    networkVersion: "84532",
    selectedAddress: addr,
    request: async ({ method, params }) => {
      log(method, JSON.stringify(params ?? null));
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":       return [addr];
        case "eth_chainId":        return "0x14a34";
        case "net_version":        return "84532";
        case "personal_sign":      return window.__signMessage?.(params[0]);
        case "eth_sign":           return window.__signMessage?.(params[1]);
        case "eth_signTypedData":
        case "eth_signTypedData_v3":
        case "eth_signTypedData_v4": {
          const d = typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
          return window.__signTypedData?.(d.domain, d.types, d.message);
        }
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain": return null;
        default: throw new Error(`Unsupported: ${method}`);
      }
    },
    on: () => {}, removeListener: () => {},
    _metamask: { isUnlocked: () => Promise.resolve(true) },
  };
  window.dispatchEvent(new Event("ethereum#initialized"));
  log("injected on", location.href);
}, ADDRESS);

const page = await context.newPage();

// Pipe browser console → Node stdout (shows all ethereum method calls)
page.on("console", msg => console.log(`[browser ${msg.type()}] ${msg.text()}`));
page.on("pageerror", err => console.error(`[browser error] ${err.message}`));

// Latch that resolves once any signing call completes — used to gate browser.close()
let signResolve;
const signDone = new Promise(resolve => { signResolve = resolve; });

// Sign a personal_sign message — handles both hex-encoded and plain UTF-8
await page.exposeFunction("__signMessage", async (message) => {
  console.log("[node] __signMessage called");
  // Privy sends hex-encoded bytes (0x…); sign as raw bytes not as UTF-8 string
  const sig = message.startsWith("0x")
    ? await wallet.signMessage({ message: { raw: message }, account })
    : await wallet.signMessage({ message, account });
  console.log("[node] signed:", sig.slice(0, 20) + "…");
  signResolve(sig);
  return sig;
});

// Sign typed data (EIP-712 / SIWE) — Privy may use this instead of personal_sign
await page.exposeFunction("__signTypedData", async (domain, types, value) => {
  console.log("[node] __signTypedData called");
  const sig = await wallet.signTypedData({
    domain, types,
    primaryType: Object.keys(types).find(k => k !== "EIP712Domain"),
    message: value, account,
  });
  console.log("[node] signed typed:", sig.slice(0, 20) + "…");
  signResolve(sig);
  return sig;
});

// context.addInitScript (set above) handles ethereum injection for all pages/popups.

// ── Navigate ──────────────────────────────────────────────────────────────────

// Arm a listener for Privy's real auth endpoint — ignore analytics/events noise.
// Privy POSTs the SIWE signature to something like /api/v1/siwe/authenticate or
// /api/v1/wallets; we exclude the analytics_events endpoint explicitly.
const privyAuthDone = page.waitForResponse(
  r => r.url().includes("auth.privy.io")
    && !r.url().includes("analytics_events")
    && r.request().method() === "POST"
    && r.status() === 200,
  { timeout: 60_000 }
).then(r => { console.log(`[privy] auth API: ${r.status()} ${r.url()}`); })
 .catch(() => { console.log("[privy] auth API not observed — proceeding on signDone"); });

console.log("Navigating to https://core.precog.markets/84532/create-market …");
await page.goto("https://core.precog.markets/84532/create-market", {
  waitUntil: "domcontentloaded",
  timeout: 30_000,
});

// Privy auto-connects when it detects window.ethereum — wait for it to call
// personal_sign (signDone) AND for its server to confirm (privyAuthDone).
console.log("Waiting for Privy to sign in …");

// If a Connect Wallet button appears first, click it + click MetaMask in the modal
const connectBtn = await page.waitForSelector(
  '[data-testid="privy-login-button"], button:has-text("Connect Wallet"), button:has-text("Connect"), button:has-text("Log in"), button:has-text("Sign in")',
  { timeout: 8_000 }
).catch(() => null);

if (connectBtn) {
  console.log("Connect button found — clicking …");
  await connectBtn.click();
  const metamaskBtn = await page.waitForSelector(
    '[data-testid="wallet-option-metamask"], button:has-text("MetaMask")',
    { timeout: 10_000 }
  ).catch(() => null);
  if (metamaskBtn) {
    console.log("Privy modal — clicking MetaMask …");

    // Arm popup handlers BEFORE clicking — popups open synchronously on click
    const popupQueue = [];
    context.on("page", async (popup) => {
      // Expose signing bridges on every popup so personal_sign works there too
      await popup.exposeFunction("__signMessage", async (message) => {
        console.log("[node] __signMessage called (popup)");
        const sig = message.startsWith("0x")
          ? await wallet.signMessage({ message: { raw: message }, account })
          : await wallet.signMessage({ message, account });
        console.log("[node] signed:", sig.slice(0, 20) + "…");
        signResolve(sig);
        return sig;
      }).catch(() => {});
      await popup.exposeFunction("__signTypedData", async (domain, types, value) => {
        console.log("[node] __signTypedData called (popup)");
        const sig = await wallet.signTypedData({
          domain, types,
          primaryType: Object.keys(types).find(k => k !== "EIP712Domain"),
          message: value, account,
        });
        signResolve(sig);
        return sig;
      }).catch(() => {});

      popup.on("console", msg => console.log(`[popup ${msg.type()}] ${msg.text()}`));
      await popup.waitForLoadState("domcontentloaded").catch(() => {});
      const url   = popup.url();
      const title = await popup.title().catch(() => "");
      console.log(`[popup] ${title || "(no title)"}  ${url}`);

      // Dump all button texts so we know what to click
      const btns = await popup.evaluate(() =>
        Array.from(document.querySelectorAll("button"))
          .map(b => b.innerText.trim()).filter(Boolean)
      ).catch(() => []);
      console.log(`[popup] buttons: ${btns.join(" | ")}`);

      // Click the primary action button: Connect first, then Sign/Confirm
      const primary = await popup.waitForSelector(
        'button:has-text("Connect"), button:has-text("Sign"), button:has-text("Confirm"), button:has-text("Verify"), button:has-text("Approve")',
        { timeout: 10_000 }
      ).catch(() => null);

      if (primary) {
        const txt = await primary.innerText().catch(() => "");
        console.log(`[popup] clicking "${txt}" …`);
        await primary.click().catch(() => {});
      } else {
        console.log("[popup] no primary button found — dumping full body text:");
        const body = await popup.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => "");
        console.log(body);
      }

      popupQueue.push(popup);
    });

    await metamaskBtn.click();
  }
}

// Now wait for: (1) signing to complete, (2) Privy server to respond
await Promise.all([
  Promise.race([
    signDone,
    new Promise((_, reject) => setTimeout(() => reject(new Error("sign timeout 45s")), 45_000)),
  ]),
  privyAuthDone,
]);

console.log("Session established — waiting for main page to reflect auth …");
// Privy sends the token back to the main page via postMessage from its iframe.
// Wait for the "Connect Your Wallet" span to leave the DOM (React state updated).
await page.waitForFunction(
  () => !Array.from(document.querySelectorAll("span"))
    .some(el => el.textContent.trim() === "Connect Your Wallet"),
  { timeout: 30_000 }
).catch(() => console.log("[warn] Connect Your Wallet span still present after 30s"));

console.log(`\nCurrent URL: ${page.url()}`);

// ── Dump form fields ──────────────────────────────────────────────────────────

await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

const fields = await page.evaluate(() => {
  const results = [];
  const seen = new Set();

  for (const el of document.querySelectorAll("input, textarea, select, [contenteditable='true']")) {
    // Find associated label text
    let label = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) label = lbl.innerText.trim();
    }
    if (!label) {
      const closest = el.closest("label");
      if (closest) label = closest.innerText.trim();
    }
    if (!label) {
      // look for a preceding sibling or parent label-like element
      const parent = el.parentElement;
      if (parent) {
        const prev = parent.querySelector("label, [class*='label'], [class*='Label']");
        if (prev && prev !== el) label = prev.innerText.trim();
      }
    }

    const key = `${el.tagName}|${el.type || ""}|${el.name || ""}|${el.id || ""}|${el.placeholder || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      tag:         el.tagName.toLowerCase(),
      type:        el.type        || null,
      name:        el.name        || null,
      id:          el.id          || null,
      placeholder: el.placeholder || null,
      label:       label          || null,
      required:    el.required    || false,
      value:       el.value !== undefined ? (el.value.slice(0, 80) || null) : null,
    });
  }
  return results;
});

// ── Wallet connection check ───────────────────────────────────────────────────

const walletPrompt = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll("span"));
  return spans.some(el => el.textContent.trim() === "Connect Your Wallet");
});

if (walletPrompt) {
  console.log("\n⚠️   'Connect Your Wallet' detected — login did not complete.");
} else {
  console.log("\n✅  No wallet-connect prompt — session established.");
}

// ── Access gate check ─────────────────────────────────────────────────────────

const restricted = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll("span"));
  const header = spans.find(el => el.textContent.trim() === "Market Creation Restricted");
  if (!header) return null;
  // Grab the accompanying paragraph if present
  const container = header.closest("div, section, article") ?? header.parentElement;
  const para = container?.querySelector("p") ?? null;
  return {
    title: header.textContent.trim(),
    body:  para ? para.textContent.trim() : null,
  };
});

if (restricted) {
  console.log("\n⛔  " + restricted.title);
  if (restricted.body) console.log("    " + restricted.body);
} else {
  console.log("\n✅  No creation restriction detected.");
}

if (fields.length === 0) {
  console.log("\nNo form fields found on page (page may still be loading or behind auth).");
} else {
  console.log(`\nForm fields on ${page.url()} (${fields.length} found):\n`);
  for (const f of fields) {
    const parts = [
      `<${f.tag}${f.type ? ` type="${f.type}"` : ""}>`,
      f.label       ? `label="${f.label}"`       : null,
      f.name        ? `name="${f.name}"`         : null,
      f.id          ? `id="${f.id}"`             : null,
      f.placeholder ? `placeholder="${f.placeholder}"` : null,
      f.required    ? "required"                 : null,
      f.value       ? `value="${f.value}"`       : null,
    ].filter(Boolean);
    console.log("  " + parts.join("  "));
  }
}

// ── Market creation ───────────────────────────────────────────────────────────

if (createMode && !restricted) {
  console.log("\n📝  Filling market creation form …");

  // Wrap each step so one failure doesn't abort the rest
  async function step(label, fn) {
    try {
      await fn();
    } catch (e) {
      console.error(`  ❌  ${label}: ${e.message}`);
    }
  }

  // Wait for the form to be fully rendered before touching it
  await page.waitForSelector('input[name="name"]', { timeout: 15_000 });

  // Helper: open date popover, navigate to correct month, click day
  async function pickDate(isoDate, which) {
    const [year, month, day] = isoDate.split("-").map(Number);

    // Click whichever trigger is for start/end
    const triggers = await page.$$('button[data-slot="popover-trigger"]');
    const idx = which === "start" ? 0 : 1;
    if (!triggers[idx]) throw new Error(`date trigger [${idx}] not found`);
    await triggers[idx].click();
    await page.waitForSelector(".rdp-day_button", { timeout: 10_000 });

    // Navigate months until the target month/year is visible
    for (let i = 0; i < 24; i++) {
      const heading = await page.evaluate(() => {
        const h = document.querySelector("[class*='rdp-caption_label'], [class*='rdp-month_caption'] span");
        return h?.innerText?.trim() ?? null;
      });
      if (!heading) break;
      const [mName, yStr] = heading.split(" ");
      const hMonth = new Date(`${mName} 1 2000`).getMonth() + 1;
      const hYear  = parseInt(yStr, 10);
      if (hYear === year && hMonth === month) break;
      const goNext = hYear < year || (hYear === year && hMonth < month);
      await page.click(goNext ? ".rdp-button_next" : ".rdp-button_previous");
      await page.waitForTimeout(250);
    }

    const dayStr   = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    await page.click(`td[data-day="${year}-${monthStr}-${dayStr}"]`);
    await page.waitForTimeout(400);
    console.log(`  📅  ${which} date set: ${isoDate}`);
  }

  // ── Text fields ──────────────────────────────────────────────────────────────
  if (marketArgs.question) await step("question", async () => {
    await page.fill('input[name="name"]', marketArgs.question);
    console.log(`  ✏️   question: ${marketArgs.question}`);
  });

  if (marketArgs.description) await step("description", async () => {
    await page.fill('textarea[name="description"]', marketArgs.description);
    console.log(`  ✏️   description: ${marketArgs.description}`);
  });

  if (marketArgs.category) await step("category", async () => {
    await page.fill('input[name="category"]', marketArgs.category);
    console.log(`  ✏️   category: ${marketArgs.category}`);
  });

  if (marketArgs.image) await step("image", async () => {
    await page.fill('input[name="image_url"]', marketArgs.image);
    console.log(`  ✏️   image: ${marketArgs.image}`);
  });

  if (marketArgs.email) await step("email", async () => {
    await page.fill('input[name="creator_email"]', marketArgs.email);
    console.log(`  ✏️   email: ${marketArgs.email}`);
  });

  // ── Collateral token ─────────────────────────────────────────────────────────
  if (marketArgs.token) await step("collateral token", async () => {
    // Open the Radix combobox
    await page.click("button.collateral-token-select");
    await page.waitForSelector('[role="option"]', { timeout: 10_000 });

    // Log all available options for debugging
    const opts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="option"]')).map(o => o.textContent.trim())
    );
    console.log(`  🪙  token options: ${opts.join(", ")}`);

    // Pick "Custom Token" to reveal the address input
    const customOpt = await page.$('[role="option"]:has-text("Custom Token")');
    if (customOpt) {
      await customOpt.click();
      // Wait for the address input (placeholder="0x...") to appear and fill it
      const tokenInput = await page.waitForSelector('input[placeholder="0x..."]', { timeout: 8_000 });
      await tokenInput.fill(marketArgs.token);
      console.log(`  🪙  custom token address: ${marketArgs.token}`);
    } else {
      // Not a custom token — try to find a matching option by address text
      const match = await page.$(`[role="option"]:has-text("${marketArgs.token}")`);
      if (match) { await match.click(); console.log(`  🪙  token selected by address`); }
      else { throw new Error(`No option matches token ${marketArgs.token}`); }
    }
  });

  // ── Outcomes ─────────────────────────────────────────────────────────────────
  for (const outcome of marketArgs.outcomes) {
    await step(`outcome "${outcome}"`, async () => {
      await page.fill('input[placeholder="Add an outcome"]', outcome);
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(400);
      console.log(`  ➕  outcome: ${outcome}`);
    });
  }

  // ── Date pickers ─────────────────────────────────────────────────────────────
  if (marketArgs.start) await step("start date", () => pickDate(marketArgs.start, "start"));
  if (marketArgs.end)   await step("end date",   () => pickDate(marketArgs.end,   "end"));

  console.log("\n✅  Form filled — submitting …");

  // ── Submit flow ──────────────────────────────────────────────────────────────

  // 1. Click "Review Market"
  await step("Review Market", async () => {
    await page.click('button.tour-create-market-button:has-text("Review Market")');
    console.log("  🔍  Clicked Review Market");
  });

  // 2. Wait for "Create Market" button and click it
  await step("Create Market", async () => {
    await page.waitForSelector('button.tour-create-market-button:has-text("Create Market")', { timeout: 15_000 });
    await page.click('button.tour-create-market-button:has-text("Create Market")');
    console.log("  🚀  Clicked Create Market");
  });

  // 3. Wait for the confirmation dialog and click "Confirm Creation"
  await step("Confirm Creation", async () => {
    await page.waitForSelector('button:has-text("Confirm Creation")', { timeout: 15_000 });
    await page.click('button:has-text("Confirm Creation")');
    console.log("  ✅  Clicked Confirm Creation");
  });

  console.log("\n🎉  Market creation submitted!");
} else if (createMode && restricted) {
  console.log("\n⛔  Cannot create market — wallet is restricted.");
}

if (debug || createMode) {
  console.log(createMode ? "Browser open — review form then Ctrl-C." : "--debug flag set — browser staying open. Press Ctrl-C to exit.");
} else {
  await browser.close();
}
