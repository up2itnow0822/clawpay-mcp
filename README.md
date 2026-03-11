# ClawPay MCP

> MCP server that gives any AI agent autonomous, spend-limited crypto payments via the Agent Wallet SDK on Base network.

[![npm version](https://img.shields.io/npm/v/clawpay-mcp)](https://www.npmjs.com/package/clawpay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)

---

## What is ClawPay MCP?

ClawPay MCP is a [Model Context Protocol](https://modelcontextprotocol.io) server that wraps the [Agent Wallet SDK (`agentwallet-sdk`)](https://www.npmjs.com/package/agentwallet-sdk) — enabling any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf, etc.) to make on-chain payments with built-in spend limit enforcement.

**Key properties:**

- 🔐 **Non-custodial** — You hold your keys. The wallet is a smart contract you own via NFT.
- 💸 **Spend-limited** — On-chain limits cap what agents can spend per-tx and per-period. Over-limit transactions queue for your approval.
- ⚡ **x402-native** — Automatic HTTP 402 payment handling (pay-per-API-call, pay-per-token, etc.)
- 🌐 **Base network** — Fast, cheap, EVM-compatible (Mainnet + Sepolia testnet)

---

## Quick Start

### 1. Install

```bash
npm install -g clawpay-mcp
```text

### 2. Configure environment

Create a `.env` file (or set env vars for your MCP client):

```bash
# Required
AGENT_PRIVATE_KEY=0x...     # Agent hot wallet private key
AGENT_WALLET_ADDRESS=0x...  # Your deployed AgentAccountV2 address

# Optional (defaults shown)
CHAIN_ID=8453               # 8453 = Base Mainnet, 84532 = Base Sepolia
RPC_URL=https://mainnet.base.org
```text

> **Security note:** `AGENT_PRIVATE_KEY` is the agent's *hot wallet* signing key — not the owner key. On-chain spend limits protect your funds. Even if the key is compromised, the agent can only spend within your configured limits.

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clawpay": {
      "command": "clawpay-mcp",
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```text

Then restart Claude Desktop. You'll see the 🔧 ClawPay tools available in your conversation.

See [`claude_desktop_config.json`](claude_desktop_config.json) for a ready-to-copy template.

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
```text

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
```text

---

### 2. `get_wallet_info`

Get wallet address, balance, spend limits, and remaining allowance.

**Input:**

```json
{
  "token": "0x0000000000000000000000000000000000000000"
}
```text

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
```text

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
```text

For ERC20 (e.g. USDC):

```json
{
  "to": "0xrecipient...",
  "amount_eth": "5.00",
  "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "token_decimals": 6
}
```text

**Output:**

```text
✅ Payment Sent

  To:      0xrecipient...
  Amount:  0.001 ETH
  Network: Base Mainnet
  TX Hash: 0xabc...
  🔗 https://basescan.org/tx/0xabc...
  📝 Memo: Payment for API access
```text

> If the payment exceeds spend limits, it's automatically queued for your approval. Use `queue_approval` to manage the queue.

---

### 4. `check_spend_limit`

Check if a proposed payment is within autonomous limits before sending.

**Input:**

```json
{
  "amount_eth": "0.005"
}
```text

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
```text

---

### 5. `queue_approval`

Manage over-limit transactions queued for owner review.

**List pending:**

```json
{ "action": "list" }
```text

**Approve:**

```json
{ "action": "approve", "tx_id": "0" }
```text

**Cancel:**

```json
{ "action": "cancel", "tx_id": "0" }
```text

**Output (list):**

```text
📋 Pending Approvals (1 transaction)
─────────────────────────
  Queue ID:   0
  To:         0xrecipient...
  Value:      0.05 ETH
  Queued at:  2026-02-19T14:00:00.000Z

Use action="approve" with tx_id to approve, or action="cancel" to cancel.
```text

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
```text

**Output:**

```text
🌐 x402 Fetch Result

  URL:     https://api.example.com/premium-data
  Status:  200 OK
  Network: Base Mainnet

💳 Payment Made
  Amount:    1000000 (base units)
  Recipient: 0xpayee...
  TX Hash:   0xpaymenttx...

📄 Response Body
{"access": "granted", "data": "...premium content..."}
```text

---

### 7. `get_transaction_history`

Retrieve on-chain transaction history from event logs.

**Input:**

```json
{
  "limit": 10,
  "event_type": "execution"
}
```text

**Output:**

```text
📜 Transaction History (2 entries)
  Chain:       Base Mainnet
  Block range: 4000 → latest
  Filter:      execution

⚡ Transaction Executed
   Block:  4523
   TX:     0xabc...
   🔗 https://basescan.org/tx/0xabc...
   To:     0xrecipient...
   Value:  0.001 ETH
   By:     0xagent...
```text

---

## Security Model

### Non-Custodial Architecture

ClawPay MCP wraps **AgentAccountV2** — a smart contract wallet that you own via an NFT. The security model:

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

Add to your MCP settings:

```json
{
  "mcpServers": {
    "clawpay": {
      "command": "npx",
      "args": ["-y", "clawpay-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```text

### Using with a `.env` file

```bash
# Start with env file
AGENT_PRIVATE_KEY=$(cat ~/.clawpay/key) \
AGENT_WALLET_ADDRESS=0x... \
clawpay-mcp
```text

---

## Links

- **Agent Wallet SDK:** [agentwallet-sdk on npm](https://www.npmjs.com/package/agentwallet-sdk)
- **x402 Protocol:** [x402.org](https://x402.org)
- **Base Network:** [base.org](https://base.org)
- **MCP Spec:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## License

MIT — see [LICENSE](LICENSE)
