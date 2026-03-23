# Drop-in Value Packs

**Copy. Run. Customize.** Three working agent workflows that demonstrate real x402 payment handling with human-in-the-loop approval.

## Quick Start

```bash
cd examples/value-packs
npm install
```

### Pack 1: Paid API Agent

Fetches data from free and paid APIs. When it hits a 402 paywall, it asks you before spending.

```bash
npx tsx paid-api-agent.ts
```

**What it does:**
- Queries free APIs (CoinGecko, wttr.in) and paid x402 endpoints
- On 402: shows cost, asks for your approval
- Pays on approval, caches results (no double-paying within 1 hour)
- Prints summary: data gathered + total spent

**Key pattern:** SpendingPolicy with $5/day cap, human approval over $0.50

### Pack 2: Research Agent

Gathers data on any topic — free sources first, paid sources to fill gaps.

```bash
npx tsx research-agent.ts "bitcoin ETF adoption"
```

**What it does:**
- Searches free sources first (Wikipedia, GitHub, news APIs)
- Identifies gaps in the research
- Estimates cost to fill gaps with paid sources
- Asks for your approval with cost breakdown
- Compiles a structured markdown report with source attribution

**Key pattern:** Free-first strategy with budget planning before spending

### Pack 3: Automation Agent

Plans a multi-step task, estimates cost, and executes on approval.

```bash
npx tsx automation-agent.ts "get BTC price and market sentiment analysis"
```

**What it does:**
- Breaks task into steps (which APIs to call, estimated cost per step)
- Shows you the full plan with cost estimate BEFORE executing
- On approval: executes each step with progress output
- Handles failures: retry with backoff, fallback to free alternatives
- Ctrl+C: cleanly stops and reports what was completed

**Key pattern:** Plan → approve → execute → report, with retry and fallback

## Configuration

Set environment variables to customize:

```bash
# Point to your own x402 endpoint (defaults to our demo)
export X402_DEMO_URL=https://x402-demo-pi.vercel.app

# Use mock mode (no network calls)
export X402_DEMO_URL=mock

# Override daily spend cap (default: $5)
export DAILY_CAP_USD=10

# Use a real wallet (optional — demo mode works without)
export AGENT_PRIVATE_KEY=0x...
export AGENT_WALLET_ADDRESS=0x...
```

## What You're Looking At

Each pack demonstrates the core pattern from the [revised strategy](https://github.com/up2itnow0822/agentpay-mcp):

```
Agent attempts task → hits payment boundary → shows cost → human approves → completes → result
```

The agent **never spends without asking.** SpendingPolicy enforces caps at the code level, and DraftThenApprove gates anything above your threshold.

## Shared Utilities (`shared/`)

| File | Purpose |
|------|---------|
| `x402-client.ts` | Handles 402 detection, payment construction, retry |
| `spending-policy.ts` | Wraps SpendingPolicy with sensible defaults |
| `cache.ts` | File-based cache with TTL (avoids double-paying) |
| `ui.ts` | Console output helpers (colored status, cost display, prompts) |

## Patent Notice

The payment infrastructure demonstrated in these examples is **Patent Pending** (USPTO provisional, March 2026).

---

*Built by [AI Agent Economy](https://github.com/up2itnow0822/agentpay-mcp) · [agentwallet-sdk](https://www.npmjs.com/package/agentwallet-sdk) · [agentpay-mcp](https://www.npmjs.com/package/agentpay-mcp)*
