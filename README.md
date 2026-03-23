# AgentPay MCP

[![npm version](https://img.shields.io/npm/v/agentpay-mcp.svg)](https://www.npmjs.com/package/agentpay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen.svg)](tests/)
[![Patent Pending](https://img.shields.io/badge/patent-pending-orange.svg)](https://uspto.gov)

**The MCP server that lets your agent pay for APIs safely.**

When your agent hits HTTP 402 Payment Required, it needs to pay and retry — with your approval, within limits you set. AgentPay MCP is a Model Context Protocol server that gives Claude, Cursor, and any MCP-compatible agent a payment wallet with hard spend caps, human-approval mode, and a full on-chain audit trail.

Payment infrastructure integrated into **[NVIDIA's official NeMo Agent Toolkit Examples](https://github.com/NVIDIA/NeMo-Agent-Toolkit-Examples/pull/17)**.

---

## The 402 Flow — What This Actually Does

```
Agent calls a paid API
        │
        ▼
   HTTP 402 ←── "Payment required: 0.50 USDC on Base"
        │
        ▼
AgentPay MCP evaluates your policy:
  • Is 0.50 USDC under your per-tx cap?  ($5 limit → ✅)
  • Is this recipient allowlisted?        (api.example.com → ✅)
  • Require human approval?              (under $1 threshold → auto)
        │
        ▼
  Payment sent → API retried with payment proof → 200 OK
        │
        ▼
Agent gets the data. Full tx on basescan.org.
```

---

## Quick Start

### 1. Install

```bash
npm install -g agentpay-mcp
```

### 2. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["agentpay-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```

### 3. Configure Cursor

Add to `.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["agentpay-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```

### 4. Set Spend Caps

Once running, tell your agent:

```
Set my spend policy: $1 per transaction, $10 per day, only send to allowlisted addresses.
```

Or call `set_spend_policy` directly:

```json
{
  "tool": "set_spend_policy",
  "arguments": {
    "perTxCapEth": "0.0004",
    "dailyLimitEth": "0.004",
    "allowedRecipients": ["0xapi-provider-address..."]
  }
}
```

Now your agent can pay for APIs — and can't spend more than $1 at a time or $10 in a day, regardless of what it's instructed to do.

---

## Human-Approval Mode (the Default)

By default, transactions above your auto-approve threshold queue for human review. The agent cannot bypass this.

```
$0.50 USDC request → under $1 threshold → auto-approved → paid → result returned
$5.00 USDC request → over $1 threshold → queued → you get notified → approve or reject
```

To approve a queued payment:

```json
{
  "tool": "queue_approval",
  "arguments": {
    "action": "approve",
    "tx_id": "0x..."
  }
}
```

To reject it:

```json
{
  "tool": "queue_approval",
  "arguments": {
    "action": "cancel",
    "tx_id": "0x..."
  }
}
```

The agent sees the outcome and decides what to do next (use cached data, ask user, abort).

---

## Value Packs — Three Production Workflow Patterns

### 1. Paid API Agent

**What it does:** Finds the right paid API for a data need, pays once, caches the result.

**When to use it:** Your agent needs data (market data, enrichment, geocoding) and you want it to handle payment automatically rather than failing with a 402.

```
Agent: "I need current options flow data for AAPL"
  │
  ├─ Tries free sources → insufficient data
  ├─ Finds paid API → gets 402 for $0.25 USDC
  ├─ Checks: $0.25 < $1 cap → auto-approved
  ├─ Pays with x402_pay → gets data
  ├─ Caches result at ~/.clawpowers/state/market:AAPL:options
  └─ Returns data + payment receipt
```

**Tools used:** `x402_pay`, `check_spend_limit`, `get_transaction_history`

**Example exchange:**
```
User: Get me the options flow for AAPL for the last 7 days.

Agent: Checking free sources... insufficient. Found paid API at data.example.com.
Cost: $0.25 USDC (under your $1 auto-approve cap). Paying now.
[x402_pay → 200 OK, paid 0.25 USDC, tx: 0xabc...]
Here's the options flow data: [results]
Total cost today: $0.25 of your $10 daily budget.
```

---

### 2. Research Agent

**What it does:** Gathers from free sources first, fills gaps with paid data, compiles a structured output.

**When to use it:** You need a comprehensive research report and want the agent to spend money only where free data is genuinely insufficient.

```
Agent: "Research competitive landscape for real-time flight tracking APIs"
  │
  ├─ Scrapes free sources (GitHub, HN, docs) → baseline data
  ├─ Identifies gaps: pricing data, SLA guarantees, enterprise contacts
  ├─ Proposes paid lookups totaling $2.75 USDC → presents for approval
  ├─ Human approves
  ├─ Pays for Apollo contact enrichment ($1.50) + Crunchbase data ($1.25)
  └─ Compiles: free data + paid data → structured report
```

**Tools used:** `x402_pay`, `x402_session_start`, `x402_session_fetch`, `check_budget`

**Example exchange:**
```
User: Research the real-time flight tracking API market. Budget up to $5.

Agent: Starting with free sources... [scrapes 12 sources, builds baseline]
Gaps identified:
  - Vendor pricing (not public for 3 of 5 vendors)
  - Contact info for enterprise sales at FlightAware
  - Recent funding data for two startups

To fill these I'd spend ~$2.75 USDC:
  - Apollo contact enrichment: $1.50
  - Crunchbase firmographics: $1.25

Approve? (y/n)

User: y

Agent: [pays, fetches, compiles]
Report ready. Spent $2.75 of your $5 budget. [structured report attached]
```

---

### 3. Automation Agent

**What it does:** Completes real tasks end-to-end, paying for whatever services are needed along the way.

**When to use it:** You want an agent that can actually finish work — book a call, run an enrichment pipeline, deploy something — not just research it.

```
Agent: "Enrich this list of 50 leads and add to CRM"
  │
  ├─ Processes first 10 free (from existing data)
  ├─ Remaining 40 need enrichment → $0.10/contact = $4.00 USDC
  ├─ Presents plan: 40 contacts × $0.10 = $4.00 total → user approves
  ├─ Runs enrichment in batches of 10 (staying under per-tx cap)
  ├─ Writes enriched data to CRM via API
  └─ Reports: 50 leads enriched, $4.00 spent, 47 successful
```

**Tools used:** `x402_pay`, `x402_session_start`, `set_spend_policy`, `get_transaction_history`

---

## Environment Variables

```bash
# Required
AGENT_PRIVATE_KEY=0x...          # Agent hot wallet key (0x-prefixed hex)
AGENT_WALLET_ADDRESS=0x...       # Deployed AgentAccountV2 contract address

# Optional
CHAIN_ID=8453                    # 8453 = Base Mainnet (default, recommended)
RPC_URL=https://mainnet.base.org # Custom RPC (Alchemy/Infura recommended for production)
SESSION_TTL_SECONDS=3600         # x402 session lifetime (default: 1 hour)
FACTORY_ADDRESS=0x...            # For deploy_wallet and create_escrow
NFT_CONTRACT_ADDRESS=0x...       # For deploy_wallet
```

---

## All 23 Tools

### Payments & 402 Flow

| Tool | What It Does |
|------|-------------|
| `x402_pay` | Fetch a URL, automatically pay 402, retry — the core use case |
| `x402_session_start` | Pay once, get reusable session token for a base URL |
| `x402_session_fetch` | Make calls within an active session (no new payment) |
| `x402_session_status` | Inspect active sessions and TTL |
| `x402_session_end` | Explicitly close a session |

### Wallet & Spend Control

| Tool | What It Does |
|------|-------------|
| `get_wallet_info` | Address, balances, spend limits, queue depth |
| `send_payment` | Send ETH or ERC-20 via the AgentAccountV2 contract |
| `check_spend_limit` | Remaining spend limit for current period |
| `set_spend_policy` | Configure daily limits, per-tx caps, recipient allowlists |
| `check_budget` | Query on-chain remaining budget |
| `queue_approval` | Approve or cancel a queued transaction |
| `get_transaction_history` | On-chain event logs with filtering |
| `deploy_wallet` | Deploy a new AgentAccountV2 smart contract wallet |

### Token Operations

| Tool | What It Does |
|------|-------------|
| `lookup_token` | Token address + decimals by symbol and chain |
| `add_custom_token` | Register a custom ERC-20 in the token registry |
| `list_chain_tokens` | All registered tokens for a chain |
| `send_token` | Send any registry token (resolves address + decimals automatically) |
| `get_balances` | Token balances across one or more tokens |

### DeFi

| Tool | What It Does |
|------|-------------|
| `swap_tokens` | Uniswap V3 swap on Base, Arbitrum, Optimism, or Polygon |
| `bridge_usdc` | CCTP V2 cross-chain USDC bridge (10 EVM chains, ~12s) |

### Identity & Trust

| Tool | What It Does |
|------|-------------|
| `verify_agent_identity` | ERC-8004 on-chain identity verification |
| `get_reputation` | On-chain reputation score and history |
| `create_escrow` | Mutual-stake USDC escrow — both parties lock collateral |

---

## Key Tool Examples

### `x402_pay` — The Core Tool

```json
// Request
{
  "tool": "x402_pay",
  "arguments": {
    "url": "https://api.example.com/premium-data",
    "max_payment_eth": "0.0002"
  }
}

// Response
{ "status": 200, "body": "{ ... }" }
```

If the cost exceeds `max_payment_eth`, the tool returns an error before paying — no surprise charges.

### `x402_session_start` — Pay Once for Multiple Calls

```json
// Request
{
  "tool": "x402_session_start",
  "arguments": {
    "endpoint": "https://api.example.com/",
    "ttl_seconds": 3600,
    "label": "market-data-session"
  }
}

// Response
{ "session_id": "sess_abc123", "token": "eyJ...", "expires_at": 1741000000 }
```

```json
// Subsequent calls — no new payment
{
  "tool": "x402_session_fetch",
  "arguments": {
    "url": "https://api.example.com/stocks/AAPL",
    "session_id": "sess_abc123"
  }
}
```

### `check_budget` — Know Before You Loop

```json
// Request — check before starting an expensive loop
{ "tool": "check_budget", "arguments": {} }

// Response
{
  "remaining": "7.50 USDC",
  "spent": "2.50 USDC",
  "limit": "10.00 USDC",
  "periodEnds": "2026-03-24T00:00:00Z"
}
```

---

## Supported Chains

| Chain | Chain ID | Recommended For |
|-------|----------|----------------|
| Base Mainnet | 8453 | Everything — lowest gas, most x402 activity |
| Arbitrum One | 42161 | High-throughput swaps |
| Optimism | 10 | Low-cost transfers |
| Polygon | 137 | High-frequency micro-payments |
| Ethereum Mainnet | 1 | Identity, large settlements |
| Avalanche | 43114 | Bridge, transfers |
| Linea / Unichain / Sonic / Worldchain | various | Bridge, transfers |
| Base Sepolia | 84532 | Testing |

---

## Security Model

**Non-custodial:** The agent signs all transactions locally with its private key. No third party holds or validates keys.

**On-chain enforcement:**
- Per-transaction caps — over-cap transactions queue for human approval via `queue_approval`
- Daily period limits — aggregate spending enforced by the AgentAccountV2 smart contract
- Recipient allowlists — restrict which addresses the agent can send to

**Role separation:**  
The agent's signing key (`AGENT_PRIVATE_KEY`) can only transact within limits set by the wallet owner. Even if the agent's key is leaked or the agent is compromised, an attacker can only spend up to the configured cap before the next reset.

**x402 sessions:**  
Session tokens are ECDSA-signed claims. Any x402 V2 server can independently verify them — no central session store required.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  AI Agent (Claude / Cursor / Windsurf)  │
└────────────────┬────────────────────────┘
                 │  MCP (stdio / SSE)
┌────────────────▼────────────────────────┐
│           AgentPay MCP Server           │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  23 Tools  │  │  Session Manager   │ │
│  └─────┬──────┘  └────────────────────┘ │
│        │                                │
│  ┌─────▼──────────────────────────────┐ │
│  │       agentwallet-sdk v6.0.0       │ │
│  │  TokenRegistry  SwapModule         │ │
│  │  BridgeModule   ERC8004Client      │ │
│  └─────┬──────────────────────────────┘ │
└────────┼────────────────────────────────┘
         │  viem + RPC
┌────────▼────────────────────────────────┐
│  AgentAccountV2 Smart Contract          │
│  SpendingPolicy  ·  Tx Queue            │
│  (12 chains — Base, ETH, ARB, OP, ...)  │
└─────────────────────────────────────────┘
```

Transport: `stdio` by default (Claude Desktop, Cursor, Windsurf). SSE available for remote deployments.

---

## Contributing

```bash
git clone https://github.com/up2itnow0822/agentpay-mcp
cd agentpay-mcp
npm install
npm run build
npm test
```

---

## Patent Notice

**Patent Pending** — USPTO provisional application filed March 2026: "Non-Custodial Multi-Chain Financial Infrastructure System for Autonomous AI Agents."

We support the open x402 standard. Our filing is defensive — to prevent hostile monopolization of open payment rails, not to restrict builders using open standards.

---

## License

MIT © [AI Agent Economy](https://ai-agent-economy.com)

Built by **AI Agent Economy** — infrastructure for production agent workflows.
