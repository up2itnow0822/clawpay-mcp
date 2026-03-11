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
