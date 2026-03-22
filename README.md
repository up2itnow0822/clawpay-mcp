# AgentPay MCP

[![npm version](https://img.shields.io/npm/v/agentpay-mcp.svg)](https://www.npmjs.com/package/agentpay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen.svg)](tests/)
[![Patent Pending](https://img.shields.io/badge/patent-pending-orange.svg)](https://uspto.gov)

> MCP server that gives AI agents a complete crypto wallet — send tokens, swap, bridge, manage budgets, verify identity.

**Patent Pending** — USPTO provisional filed March 2026.

Built by [AI Agent Economy](https://ai-agent-economy.com). Payment infrastructure integrated into **NVIDIA's official NeMo Agent Toolkit Examples catalog**.

---

## What's New in v4.0.0

**11 new MCP tools** powered by full **agentwallet-sdk v6.0.0** integration:

| Category | New Tools |
|---|---|
| Token Registry | `lookup_token`, `add_custom_token`, `list_chain_tokens` |
| Token Transfers | `send_token`, `get_balances` |
| DeFi | `swap_tokens` (Uniswap V3), `bridge_usdc` (CCTP V2) |
| Spending Controls | `set_spend_policy`, `check_budget` |
| Agent Identity | `verify_agent_identity`, `get_reputation` |
| Escrow | `create_escrow` |

Other highlights:
- **12 supported chains** — Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Linea, Unichain, Sonic, Worldchain, Base Sepolia, Arbitrum Sepolia
- **100+ pre-loaded tokens** via TokenRegistry
- **CCTP V2** cross-chain USDC bridging (10 EVM chains)
- **Uniswap V3** swaps on Base, Arbitrum, Optimism, Polygon
- **ERC-8004** on-chain agent identity verification
- 42 new tests (149 total), 99.6% type coverage

---

## Quick Start

### 1. Install

```bash
npm install -g agentpay-mcp
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
# Required
AGENT_PRIVATE_KEY=0x...          # Agent hot wallet private key (0x-prefixed hex)
AGENT_WALLET_ADDRESS=0x...       # Deployed AgentAccountV2 wallet address

# Optional (defaults shown)
CHAIN_ID=8453                    # 8453 = Base Mainnet (default)
RPC_URL=https://mainnet.base.org # Custom RPC URL

# For x402 session payments
SESSION_TTL_SECONDS=3600         # Session lifetime (default: 1 hour)

# For deploy_wallet tool
FACTORY_ADDRESS=0x...            # AgentAccountFactoryV2 address
NFT_CONTRACT_ADDRESS=0x...       # NFT contract that owns the wallet
```

### 3. MCP Configuration

#### Claude Desktop

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

#### Cursor

Add to `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally:

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

---

## All 23 Tools Reference

### Original Tools (v1.0.0–v3.1.0)

| Tool | Description | Key Parameters |
|---|---|---|
| `deploy_wallet` | Deploy a new AgentAccountV2 wallet via factory | `token_id`, `nft_contract_address?`, `factory_address?` |
| `get_wallet_info` | Wallet address, balances, spend limits, queue depth | `token?` (address) |
| `send_payment` | Send ETH or ERC-20 via AgentAccountV2 contract | `to`, `amount_eth`, `token?`, `token_decimals?`, `memo?` |
| `check_spend_limit` | Check remaining spend limit for a token | `token?` |
| `queue_approval` | Approve or cancel a queued transaction | `action`, `tx_id`, `token?` |
| `x402_pay` | Auto-pay x402 paywalled URLs | `url`, `method?`, `headers?`, `body?`, `max_payment_eth?` |
| `get_transaction_history` | Query on-chain event logs | `limit?`, `from_block?`, `to_block?`, `event_type?` |
| `x402_session_start` | Pay once, get reusable session token | `endpoint`, `scope?`, `ttl_seconds?`, `label?` |
| `x402_session_fetch` | Make calls within an active session | `url`, `method?`, `headers?`, `body?`, `session_id?` |
| `x402_session_status` | Inspect active sessions and TTL | `session_id?` |
| `x402_session_end` | Explicitly close a session | `session_id` |

### New Tools (v4.0.0)

| Tool | Description | Key Parameters |
|---|---|---|
| `lookup_token` | Look up token address and decimals by symbol | `symbol`, `chainId` |
| `add_custom_token` | Register a custom ERC-20 in the token registry | `symbol`, `address`, `decimals`, `chainId`, `name?` |
| `list_chain_tokens` | List all registered tokens for a chain | `chainId` |
| `send_token` | Send any registry token to a recipient | `tokenSymbol`, `chainId`, `recipientAddress`, `amount` |
| `get_balances` | Get balances for multiple tokens | `chainId`, `tokens?` |
| `swap_tokens` | Swap tokens via Uniswap V3 | `fromSymbol`, `toSymbol`, `amount`, `chainId`, `slippageBps?` |
| `bridge_usdc` | Bridge USDC cross-chain via CCTP V2 | `fromChain`, `toChain`, `amount` |
| `set_spend_policy` | Configure daily limits and recipient allowlists | `dailyLimitEth?`, `perTxCapEth?`, `allowedRecipients?` |
| `check_budget` | Query on-chain remaining budget | `token?`, `spender?` |
| `verify_agent_identity` | Verify agent ERC-8004 on-chain identity | `agentAddress` |
| `get_reputation` | Fetch agent reputation score | `agentAddress` |
| `create_escrow` | Create mutual-stake USDC escrow vault | `counterpartyAddress`, `stakeAmount`, `terms`, `factoryAddress?`, `deadlineDays?`, `challengeWindowHours?` |

---

## Detailed Tool Documentation

### `deploy_wallet`

Deploy a new AgentAccountV2 smart contract wallet. The wallet is deterministically addressed (CREATE2) and owned by an NFT.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `token_id` | string | ✅ | NFT token ID that will own the wallet (e.g. `"1"`) |
| `nft_contract_address` | string | ❌ | NFT contract address (defaults to `NFT_CONTRACT_ADDRESS` env) |
| `factory_address` | string | ❌ | Factory contract address (defaults to `FACTORY_ADDRESS` env) |

**Example:**
```json
// Request
{ "token_id": "42" }

// Response
{
  "walletAddress": "0xabc...def",
  "txHash": "0x123...456",
  "explorerUrl": "https://basescan.org/address/0xabc...def"
}
```

---

### `get_wallet_info`

Get comprehensive wallet information: address, on-chain balance, spend limits, period utilization, and pending queue depth.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | ❌ | Token address to check budget for. Omit for ETH. |

**Example:**
```json
// Request
{}

// Response (text)
"📊 Agent Wallet Info
📍 Address: 0xabc...def
🌐 Chain: Base Mainnet
💰 ETH Balance: 0.05 ETH
📈 Spend Limits (ETH)
  Per-tx limit: 0.01 ETH
  Period limit: 0.1 ETH
  Remaining: 0.085 ETH
  Utilization: 15% 🟢"
```

---

### `send_payment`

Execute an ETH or ERC-20 transfer via the AgentAccountV2 contract. Subject to on-chain spend limits.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `to` | string | ✅ | Recipient address (0x-prefixed) |
| `amount_eth` | string | ✅ | Amount in ETH (or token's human-readable units) |
| `token` | string | ❌ | ERC-20 contract address. Omit for native ETH. |
| `token_decimals` | number | ❌ | Token decimals (default: 18; use 6 for USDC) |
| `memo` | string | ❌ | Optional memo (logged locally, not on-chain) |

**Example:**
```json
// Request
{ "to": "0xrecipient...", "amount_eth": "0.01" }

// Response
"✅ Payment sent: 0.01 ETH → 0xrecipient...
Tx: 0xtxhash..."
```

---

### `check_spend_limit`

Check the remaining spend limit for the current period for a given token.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | ❌ | Token address (omit for ETH) |

---

### `queue_approval`

Approve or cancel a queued transaction that exceeded the per-tx cap.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `action` | string | ✅ | `"approve"` or `"cancel"` |
| `tx_id` | string | ✅ | Queued transaction ID |
| `token` | string | ❌ | Token address (omit for ETH) |

---

### `x402_pay`

Fetch a URL, automatically handling HTTP 402 Payment Required by paying with the Agent Wallet and retrying. Supports auto-session detection — if an active session covers the URL, no new payment is made.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✅ | URL to fetch |
| `method` | string | ❌ | HTTP method (default: `GET`) |
| `headers` | object | ❌ | Additional request headers |
| `body` | string | ❌ | Request body (JSON string for JSON APIs) |
| `max_payment_eth` | string | ❌ | Max ETH to pay (rejects if exceeded) |
| `timeout_ms` | number | ❌ | Timeout in ms (default: 30000) |
| `skip_session_check` | boolean | ❌ | Force fresh payment even if session exists |

**Example:**
```json
// Request
{ "url": "https://api.example.com/data", "max_payment_eth": "0.001" }

// Response
{ "status": 200, "body": "{ ... }" }
```

---

### `get_transaction_history`

Query on-chain event logs for the wallet's transaction history. Filter by event type or block range.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | number | ❌ | Max entries (default: 20, max: 100) |
| `from_block` | string | ❌ | Start block number (hex or decimal) |
| `to_block` | string | ❌ | End block (default: latest) |
| `event_type` | string | ❌ | Filter: `all`, `execution`, `queued`, `approved`, `cancelled`, `policy_update`, `operator_update` |

---

### `x402_session_start`

Pay once, receive a signed x402 V2 session token. Subsequent requests to the endpoint use the session token without additional payments.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `endpoint` | string | ✅ | Base URL to establish a session for |
| `scope` | string | ❌ | `"prefix"` (default) or `"exact"` |
| `ttl_seconds` | number | ❌ | Session lifetime in seconds (min: 60, max: 2592000) |
| `label` | string | ❌ | Human-readable session label |

**Example:**
```json
// Request
{ "endpoint": "https://api.example.com/", "ttl_seconds": 3600 }

// Response
{ "session_id": "sess_abc123", "token": "eyJ...", "expires_at": 1741000000 }
```

---

### `x402_session_fetch`

Make an HTTP call within an active session. No new payment required.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✅ | URL to fetch within the session |
| `method` | string | ❌ | HTTP method (default: `GET`) |
| `headers` | object | ❌ | Additional headers |
| `body` | string | ❌ | Request body |
| `session_id` | string | ❌ | Explicit session ID (auto-detected if omitted) |

---

### `x402_session_status`

Inspect active sessions, TTL remaining, and call counts.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | string | ❌ | Specific session to inspect (omit for all active sessions) |

---

### `x402_session_end`

Explicitly close and invalidate a session.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | string | ✅ | Session ID to close |

---

### `lookup_token`

Look up a token's address, decimals, and metadata from the global token registry by symbol and chain.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | ✅ | Token symbol (e.g. `"USDC"`, `"WETH"`) |
| `chainId` | number | ✅ | Chain ID (e.g. `8453` for Base Mainnet) |

**Example:**
```json
// Request
{ "symbol": "USDC", "chainId": 8453 }

// Response
{ "found": true, "symbol": "USDC", "address": "0x833589...", "decimals": 6, "chainId": 8453 }
```

---

### `add_custom_token`

Register a custom ERC-20 token in the global registry so it can be used by `send_token`, `get_balances`, and `swap_tokens`.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | ✅ | Token symbol |
| `address` | string | ✅ | Contract address (0x-prefixed) |
| `decimals` | number | ✅ | Token decimal precision (0–18) |
| `chainId` | number | ✅ | Chain ID |
| `name` | string | ❌ | Human-readable token name |

**Example:**
```json
// Request
{ "symbol": "MYTKN", "address": "0xabc...", "decimals": 18, "chainId": 8453 }

// Response
{ "success": true, "message": "Token MYTKN registered on chain 8453" }
```

---

### `list_chain_tokens`

List all tokens registered in the global registry for a specific chain.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `chainId` | number | ✅ | Chain ID (e.g. `8453`) |

**Example:**
```json
// Request
{ "chainId": 8453 }

// Response
{ "chainId": 8453, "count": 47, "tokens": [{ "symbol": "USDC", "address": "0x833589...", "decimals": 6 }, ...] }
```

---

### `send_token`

Send any ERC-20 token using the symbol-based registry. Resolves address and decimals automatically.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `tokenSymbol` | string | ✅ | Token symbol (e.g. `"USDC"`) |
| `chainId` | number | ✅ | Chain ID |
| `recipientAddress` | string | ✅ | Recipient wallet address (0x-prefixed) |
| `amount` | string | ✅ | Amount in human-readable units (e.g. `"10.5"`) |

**Example:**
```json
// Request
{ "tokenSymbol": "USDC", "chainId": 8453, "recipientAddress": "0xrecipient...", "amount": "100" }

// Response
{ "success": true, "txHash": "0x...", "amount": "100", "token": "USDC", "recipient": "0xrecipient..." }
```

---

### `get_balances`

Get token balances for the Agent Wallet across one or more tokens on a given chain.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `chainId` | number | ✅ | Chain ID |
| `tokens` | string[] | ❌ | Token symbols to check (omit for all registered tokens on chain) |

**Example:**
```json
// Request
{ "chainId": 8453, "tokens": ["USDC", "WETH"] }

// Response
{ "balances": [{ "symbol": "USDC", "balance": "500.00", "decimals": 6 }, { "symbol": "WETH", "balance": "0.05", "decimals": 18 }] }
```

---

### `swap_tokens`

Swap one ERC-20 token for another using Uniswap V3. Supported chains: Base, Arbitrum, Optimism, Polygon.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `fromSymbol` | string | ✅ | Symbol of token to sell (e.g. `"USDC"`) |
| `toSymbol` | string | ✅ | Symbol of token to buy (e.g. `"WETH"`) |
| `amount` | string | ✅ | Amount to sell in human-readable units |
| `chainId` | number | ✅ | Chain ID (8453, 42161, 10, or 137) |
| `slippageBps` | number | ❌ | Slippage in basis points (default: 50 = 0.5%) |

**Example:**
```json
// Request
{ "fromSymbol": "USDC", "toSymbol": "WETH", "amount": "100", "chainId": 8453 }

// Response
{ "success": true, "txHash": "0x...", "amountIn": "100 USDC", "amountOut": "0.0412 WETH" }
```

---

### `bridge_usdc`

Bridge USDC cross-chain using Circle's CCTP V2 protocol. Burns on source, polls Circle IRIS for attestation, mints on destination.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `fromChain` | string | ✅ | Source chain name (e.g. `"base"`) |
| `toChain` | string | ✅ | Destination chain name (e.g. `"arbitrum"`) |
| `amount` | string | ✅ | Amount of USDC in human-readable units (e.g. `"100"`) |

Supported chains: `base`, `ethereum`, `optimism`, `arbitrum`, `polygon`, `avalanche`, `linea`, `unichain`, `sonic`, `worldchain`

**Example:**
```json
// Request
{ "fromChain": "base", "toChain": "arbitrum", "amount": "500" }

// Response
{ "success": true, "burnTxHash": "0x...", "mintTxHash": "0x...", "amount": "500 USDC" }
```

---

### `set_spend_policy`

Configure the Agent Wallet spend policy. Sets a daily limit, per-transaction cap, and optional recipient allowlist. Enforced for the lifetime of the MCP server.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `dailyLimitEth` | string | ❌ | Daily spend limit in ETH-equivalent (e.g. `"0.1"`) |
| `perTxCapEth` | string | ❌ | Per-transaction cap in ETH-equivalent (e.g. `"0.01"`) |
| `allowedRecipients` | string[] | ❌ | Allowlist of recipient addresses. Empty = all allowed. |

**Example:**
```json
// Request
{ "dailyLimitEth": "0.5", "perTxCapEth": "0.05", "allowedRecipients": ["0xrecipient..."] }

// Response
{ "success": true, "policy": { "dailyLimitEth": "0.5", "perTxCapEth": "0.05" } }
```

---

### `check_budget`

Query the on-chain remaining budget for a given spender and token.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | ❌ | Token address (omit for ETH / zero address) |
| `spender` | string | ❌ | Spender address (defaults to Agent Wallet address) |

**Example:**
```json
// Request
{}

// Response
{ "remaining": "0.085 ETH", "spent": "0.015 ETH", "limit": "0.1 ETH", "periodEnds": "2026-03-23T00:00:00Z" }
```

---

### `verify_agent_identity`

Verify an agent's on-chain identity using ERC-8004. Returns identity details including agent ID, URI, and registration file.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `agentAddress` | string | ✅ | Agent owner address (0x-prefixed) |

**Example:**
```json
// Request
{ "agentAddress": "0xagent..." }

// Response
{ "found": true, "agentId": "42", "owner": "0xagent...", "uri": "ipfs://Qm...", "registrationFile": { "name": "MyAgent", "version": "1.0" } }
```

---

### `get_reputation`

Fetch an agent's on-chain reputation score and history.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `agentAddress` | string | ✅ | Agent address (0x-prefixed) |

**Example:**
```json
// Request
{ "agentAddress": "0xagent..." }

// Response
{ "agentAddress": "0xagent...", "score": 92, "level": "trusted", "totalInteractions": 1250, "successRate": 0.98 }
```

---

### `create_escrow`

Create a mutual-stake escrow vault between the Agent Wallet (buyer) and a counterparty (seller). Both parties lock collateral equal to the payment amount, ensuring aligned incentives. Uses USDC as the payment token.

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `counterpartyAddress` | string | ✅ | Seller/counterparty address (0x-prefixed) |
| `stakeAmount` | string | ✅ | Payment amount in USDC (e.g. `"100"`) |
| `terms` | string | ✅ | Human-readable escrow terms |
| `factoryAddress` | string | ❌ | StakeVaultFactory address (defaults to `FACTORY_ADDRESS` env) |
| `deadlineDays` | number | ❌ | Deadline in days (default: 7) |
| `challengeWindowHours` | number | ❌ | Challenge window in hours after fulfillment (default: 24) |

**Example:**
```json
// Request
{ "counterpartyAddress": "0xseller...", "stakeAmount": "100", "terms": "Deliver logo design by 2026-04-01" }

// Response
{ "success": true, "escrowAddress": "0xvault...", "txHash": "0x...", "deadline": "2026-03-29T00:00:00Z" }
```

---

## Supported Chains

| Chain | Chain ID | Features |
|---|---|---|
| Base Mainnet | 8453 | All features (recommended) |
| Ethereum Mainnet | 1 | Identity, bridge, transfers |
| Arbitrum One | 42161 | All features, swaps |
| Optimism | 10 | All features, swaps |
| Polygon | 137 | All features, swaps |
| Avalanche | 43114 | Bridge, transfers |
| Linea | 59144 | Bridge, transfers |
| Unichain | 1301 | Bridge, transfers |
| Sonic | 146 | Bridge, transfers |
| Worldchain | 480 | Bridge, transfers |
| Base Sepolia | 84532 | Testnet — all features |
| Arbitrum Sepolia | 421614 | Testnet — identity, transfers |

---

## Supported Tokens

AgentPay MCP ships with **100+ pre-loaded tokens** across all supported chains via `agentwallet-sdk`'s TokenRegistry. Common tokens available on every major chain include:

- **Stablecoins:** USDC, USDT, DAI, FRAX, LUSD
- **Native Wrapped:** WETH, WBTC, WMATIC, WAVAX
- **DeFi:** UNI, AAVE, LINK, CRV, LDO
- **L2 Tokens:** cbETH, rETH, weETH, ezETH

**Custom tokens** can be registered at runtime with `add_custom_token` and will be available to `send_token`, `get_balances`, and `swap_tokens` immediately.

---

## Configuration

| Env Var | Required | Default | Description |
|---|---|---|---|
| `AGENT_PRIVATE_KEY` | ✅ | — | Agent signing key (0x-prefixed hex). NOT the owner key. |
| `AGENT_WALLET_ADDRESS` | ✅ | — | Deployed AgentAccountV2 contract address |
| `CHAIN_ID` | ❌ | `8453` | Chain ID (8453 = Base Mainnet) |
| `RPC_URL` | ❌ | Public Base RPC | Custom RPC endpoint (Alchemy, Infura, etc. recommended) |
| `SESSION_TTL_SECONDS` | ❌ | `3600` | Default x402 session lifetime (60–2592000 seconds) |
| `FACTORY_ADDRESS` | ❌ | — | AgentAccountFactoryV2 address (for `deploy_wallet`, `create_escrow`) |
| `NFT_CONTRACT_ADDRESS` | ❌ | — | NFT contract address (for `deploy_wallet`) |

---

## Security

### Non-Custodial Design

AgentPay MCP is **non-custodial** — the agent signs all transactions locally with its private key. No third party holds or validates keys at any point.

### On-Chain Spending Controls

- **Per-transaction caps** — transactions exceeding the cap are queued for human approval via `queue_approval`
- **Daily period limits** — aggregate spending is enforced on-chain by the AgentAccountV2 contract
- **Recipient allowlists** — restrict which addresses the agent can send to via `set_spend_policy`

### Separation of Roles

The agent's signing key (`AGENT_PRIVATE_KEY`) can **only** transact within the limits set by the wallet owner. The owner (NFT holder) can:
- Adjust spend limits without redeploying
- Revoke the agent's operator access
- Cancel queued transactions

This means even if the agent's key is compromised, the attacker can only spend up to the configured limit.

### x402 Session Tokens

Session tokens are self-contained ECDSA-signed claims. Any server implementing x402 V2 can independently verify them — no central session store required.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  AI Agent (Claude / Cursor / Windsurf)  │
└────────────────┬────────────────────────┘
                 │  MCP (stdio/SSE)
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
│  │  ReputationClient  MutualStake...  │ │
│  └─────┬──────────────────────────────┘ │
└────────┼────────────────────────────────┘
         │  viem + RPC
┌────────▼────────────────────────────────┐
│  AgentAccountV2 Smart Contract          │
│  (12 chains — Base, ETH, ARB, OP, ...)  │
└─────────────────────────────────────────┘
```

**MCP Transport:** The server uses `stdio` transport by default (compatible with Claude Desktop, Cursor, Windsurf, any MCP-compatible host). SSE transport is available for remote/networked deployments.

**Tool Routing:** Each MCP tool call is routed to the corresponding handler in `src/tools/`. All handlers are typed with Zod schemas and return structured `{ content: [{ type: "text", text: "..." }] }` responses.

**Token Resolution:** `send_token`, `get_balances`, and `swap_tokens` use the agentwallet-sdk `TokenRegistry` to resolve symbols to on-chain addresses and decimals, eliminating the need for agents to manage contract addresses manually.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting issues and pull requests.

```bash
git clone https://github.com/up2itnow0822/agentpay-mcp
cd agentpay-mcp
npm install
npm run build
npm test
```

---

## License

MIT © [AI Agent Economy](https://ai-agent-economy.com)

---

## About

Built by **AI Agent Economy** — infrastructure for autonomous agent commerce.

> Payment infrastructure integrated into **NVIDIA's official NeMo Agent Toolkit Examples catalog**.

**Patent Pending** — USPTO provisional application filed March 2026.
