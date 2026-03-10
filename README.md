# precog-skill

OpenClaw skill for [PrecogMasterV8](https://precog.markets) prediction markets on Base Sepolia.

## Install

```bash
npm install
```

Copy this folder to your OpenClaw workspace:
```bash
cp -r . ~/.openclaw/workspace/skills/precog
```

## Config

Add to `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "precog": {
        "enabled": true,
        "env": {
          "PRECOG_RPC_URL": "https://base-sepolia.rpc",
          "PRECOG_MASTER_ADDRESS": "0xYOUR_CONTRACT"
        }
      }
    }
  }
}
```

Or set env vars directly:
```bash
export PRECOG_RPC_URL=https://...
export PRECOG_MASTER_ADDRESS=0x...
```

## First run

```bash
node scripts/setup.mjs --generate   # create wallet
node scripts/markets.mjs            # list markets
node scripts/quote.mjs --market 0 --outcome 1 --shares 50
node scripts/buy.mjs   --market 0 --outcome 1 --shares 50 --max 40
```

## Files

```
precog/
├── SKILL.md                  ← agent instructions
├── package.json
├── abi/
│   └── PrecogMasterV8.json   ← replace with real ABI
└── scripts/
    ├── setup.mjs             ← wallet create / status
    ├── markets.mjs           ← list all markets
    ├── quote.mjs             ← price a trade
    ├── buy.mjs               ← buy shares
    ├── sell.mjs              ← sell shares
    ├── positions.mjs         ← check holdings
    └── lib/
        └── client.mjs        ← shared viem setup
```
