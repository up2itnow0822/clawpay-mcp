# AgentPay MCP

> _Formerly ClawPay MCP_ — Non-custodial x402 payment layer for AI agents on Base network.

[![npm version](https://img.shields.io/npm/v/agentpay-mcp)](https://www.npmjs.com/package/agentpay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)

> **Migration notice:** The npm package has been renamed from `clawpay-mcp` to `agentpay-mcp`. Install with `npm install -g agentpay-mcp`. The old package name will continue to redirect but receives no further updates.

---

## What is AgentPay MCP?

AgentPay MCP is a [Model Context Protocol](https://modelcontextprotocol.io) server that wraps the [Agent Wallet SDK (`agentwallet-sdk`)](https://www.npmjs.com/package/agentwallet-sdk) — enabling any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf, etc.) to make on-chain payments with built-in spend limit enforcement.

**Key properties:**

- 🔐 **Non-custodial** — You hold your keys. The wallet is a smart contract you own via NFT.
- 💸 **Spend-limited** — On-chain limits cap what agents can spend per-tx and per-period. Over-limit transactions queue for your approval.
- ⚡ **x402-native** — Automatic HTTP 402 payment handling (pay-per-API-call, pay-per-token, etc.)
- 🌐 **Base network** — Fast, cheap, EVM-compatible (Mainnet + Sepolia testnet)

**Part of the [Agent Wallet](https://github.com/up2itnow0822/agent-wallet-sdk) ecosystem.**

---

## Quick Start

### 1. Install

```bash
npm install -g agentpay-mcp
```

### 2. Configure environment

Create a `.env` file (or set env vars for your MCP client):

```bash
# Required
AGENT_PRIVATE_KEY=0x...     # Agent hot wallet private key
AGENT_WALLET_ADDRESS=0x...  # Your deployed AgentAccountV2 address

# Optional (defaults shown)
CHAIN_ID=8453               # 8453 = Base Mainnet, 84532 = Base Sepolia
RPC_URL=https://mainnet.base.org
```

> **Security note:** `AGENT_PRIVATE_KEY` is the agent's *hot wallet* signing key — not the owner key. On-chain spend limits protect your funds. Even if the key is compromised, the agent can only spend within your configured limits.

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "agentpay-mcp",
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```

Then restart Claude Desktop. You'll see the 🔧 AgentPay tools available in your conversation.

---

## Tools Reference

### 1. `deploy_wallet`

Deploy a new AgentAccountV2 wallet via the factory contract.

**Input:**

```json
{
  "token_id": "1",
  "factory_address": "0x...",
  "nft_contract_address": "0x..."
}
```

**Output:**

```text
✅ Agent Wallet deployed successfully!

📍 Wallet Address: 0xabc...
🔗 Explorer: https://basescan.org/address/0xabc...

📋 Transaction: 0xdef...
🔑 Owner NFT: 0xnft... #1
🌐 Chain: Base Mainnet

ℹ️  Next steps:
  1. Set AGENT_WALLET_ADDRESS=0xabc... in your .env
  2. Use set_spend_policy to configure spending limits
  3. Fund the wallet with ETH or USDC
```

---

### 2. `get_wallet_info`

Get wallet address, balance, spend limits, and remaining allowance.

**Input:**

```json
{
  "token": "0x0000000000000000000000000000000000000000"
}
```

*`token` is optional — omit for native ETH.*

**Output:**

```text
📊 Agent Wallet Info

📍 Address: 0xabc...
🌐 Chain: Base Mainnet
💰 ETH Balance: 0.5 ETH

📈 Spend Limits (ETH)
  Per-tx limit:  0.01 ETH
  Period limit:  0.1 ETH
  Period spent:  0.03 ETH
  Remaining:     0.07 ETH
  Utilization:   30% 🟢 Healthy
  Period length: 24h
  Resets in:     18h 22m
```

---

### 3. `send_payment`

Send ETH or ERC20 tokens within spend limits.

**Input:**

```json
{
  "to": "0xrecipient...",
  "amount_eth": "0.001",
  "memo": "Payment for API access"
}
```

For ERC20 (e.g. USDC):

```json
{
  "to": "0xrecipient...",
  "amount_eth": "5.00",
  "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "token_decimals": 6
}
```

**Output:**

```text
✅ Payment Sent

  To:      0xrecipient...
  Amount:  0.001 ETH
  Network: Base Mainnet
  TX Hash: 0xabc...
  🔗 https://basescan.org/tx/0xabc...
  📝 Memo: Payment for API access
```

> If the payment exceeds spend limits, it's automatically queued for your approval. Use `queue_approval` to manage the queue.

---

### 4. `check_spend_limit`

Check if a proposed payment is within autonomous limits before sending.

**Input:**

```json
{
  "amount_eth": "0.005"
}
```

**Output:**

```text
🔍 Spend Limit Check

  Token:            ETH
  Amount:           0.005 ETH

  Per-tx limit:     0.01 ETH
  Within per-tx:    ✅ Yes

  Remaining period: 0.07 ETH
  Within period:    ✅ Yes
  Resets in:        18h 22m

✅ APPROVED — This payment can execute autonomously.
```

---

### 5. `queue_approval`

Manage over-limit transactions queued for owner review.

**List pending:**

```json
{ "action": "list" }
```

**Approve:**

```json
{ "action": "approve", "tx_id": "0" }
```

**Cancel:**

```json
{ "action": "cancel", "tx_id": "0" }
```

---

### 6. `x402_pay`

Fetch a URL and automatically handle HTTP 402 Payment Required responses.

**Input:**

```json
{
  "url": "https://api.example.com/premium-data",
  "max_payment_eth": "0.001",
  "timeout_ms": 15000
}
```

---

### 7. `get_transaction_history`

Retrieve on-chain transaction history from event logs.

**Input:**

```json
{
  "limit": 10,
  "event_type": "execution"
}
```

---

## Security Model

### Non-Custodial Architecture

AgentPay MCP wraps **AgentAccountV2** — a smart contract wallet that you own via an NFT. The security model:

1. **You own the NFT** → You own the wallet. If you transfer the NFT, the new holder controls the wallet.
2. **Agent hot key** → `AGENT_PRIVATE_KEY` is a *limited* operator key. It can execute transactions only within the on-chain spend limits you set.
3. **On-chain spend limits** → Set via `setSpendPolicy`. Caps per-transaction and per-period spending. Even if the agent key is compromised, the attacker is limited to your configured spend limits.
4. **Approval queue** → Over-limit transactions are queued on-chain for your explicit approval. The agent cannot bypass this.

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Compromised agent private key | On-chain spend limits cap exposure |
| Runaway agent (infinite payment loop) | Period limits + queue-on-exceed |
| x402 price manipulation | `max_payment_eth` cap parameter |
| Over-spending a single service | x402 per-service budget controls |
| Lost private key | Owner (NFT holder) remains in control |

### Isolation Architecture — Why ContextCrush-Style Attacks Don't Apply

In March 2026, Noma Security disclosed "ContextCrush" (CVE-2026-31841): MCP servers delivering poisoned documentation into AI coding assistants (Claude Desktop, Cursor, Windsurf, VS Code). The attack injects malicious instructions via the context window, causing the AI to execute destructive commands — including deleting local files.

AgentPay MCP is architecturally immune to this class of attack. Here's why.

**ContextCrush attack vector:**
- A malicious MCP server (e.g. a documentation provider like Context7) returns poisoned content when the AI queries it
- That content contains hidden instructions injected into the AI's context window
- The AI, following what looks like legitimate documentation, executes the attacker's commands

**Why AgentPay MCP doesn't have this surface:**

1. **Payment-only tool surface** — AgentPay MCP exposes exactly 7 tools: `deploy_wallet`, `get_wallet_info`, `send_payment`, `check_spend_limit`, `queue_approval`, `x402_pay`, `get_transaction_history`. It does not fetch or return arbitrary content from external URLs. There is no documentation retrieval pathway, no web browsing tool, no file system access. The attack surface is bounded by the payment domain.

2. **No content pass-through** — ContextCrush works because the compromised MCP server passes external content (poisoned docs) directly into the AI's context. AgentPay MCP only returns structured JSON objects describing payment state and transaction results. It cannot inject arbitrary text into the AI's reasoning context.

3. **On-chain enforcement independent of context** — Even if an attacker somehow caused the AI to issue a malicious `send_payment` call, the on-chain spend limits enforce the authorization policy regardless of what the AI believes it's doing. The smart contract validates against the configured `SpendingPolicy` — it doesn't trust the AI's interpretation of the situation.

4. **Process isolation** — AgentPay MCP runs as a separate process (`npx agentpay-mcp`). It communicates with the AI client via stdio, not shared memory. It cannot read or write files in your project directory, cannot access your clipboard, cannot execute shell commands. The process has no filesystem permissions beyond reading its own `.env` configuration.

5. **No naming collisions** — CVE-2026-30856 (Tencent WeKnora) exploited tool naming collisions between MCP servers. AgentPay MCP's tool names are payment-specific and unlikely to collide with documentation or utility tools in legitimate agent setups.

**Summary:** AgentPay MCP cannot be weaponized as a ContextCrush-style vector because it serves no content, accesses no external URLs, writes no files, and executes no shell commands. Its on-chain authorization layer enforces payment policy independently of AI context. Enterprise teams evaluating MCP governance should treat payment-specific, isolated MCP servers differently from general-purpose documentation or utility servers.

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENT_PRIVATE_KEY` | ✅ | — | Agent hot wallet private key (0x-prefixed hex) |
| `AGENT_WALLET_ADDRESS` | ✅ | — | Deployed AgentAccountV2 contract address |
| `CHAIN_ID` | ⬜ | `8453` | Chain ID (8453 = Base Mainnet, 84532 = Base Sepolia) |
| `RPC_URL` | ⬜ | Public Base RPC | Custom RPC endpoint (recommended for production) |
| `FACTORY_ADDRESS` | ⬜ | — | Required for `deploy_wallet` only |
| `NFT_CONTRACT_ADDRESS` | ⬜ | — | Required for `deploy_wallet` only |

> **Minimum to get started:** Just `AGENT_PRIVATE_KEY` + `AGENT_WALLET_ADDRESS`. Everything else has sensible defaults.

---

## Integration Examples

### Cursor / Windsurf

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "agentpay-mcp"],
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

## Ecosystem

- **[Agent Wallet SDK](https://www.npmjs.com/package/agentwallet-sdk)** — Non-custodial wallet SDK for AI agents
- **[@agent-wallet/mastra-plugin](https://www.npmjs.com/package/@agent-wallet/mastra-plugin)** — Mastra framework integration
- **[AgentPay MCP](https://www.npmjs.com/package/agentpay-mcp)** — This package (MCP server)
- **[x402 Protocol](https://x402.org)** — HTTP 402 payment standard
- **[Base Network](https://base.org)** — L2 chain

---

## License

MIT — see [LICENSE](LICENSE)
