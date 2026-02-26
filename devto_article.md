# ClawPay MCP v1.1.0: Pay Once Per Session, Not Per Call

Here's something I kept running into while building agent workflows on x402: every single API call triggers a full on-chain payment. One call, one payment. Ten calls, ten payments. Each one adds ~200-800ms of signing and broadcast latency, and if you're doing anything data-intensive — pulling a feed, querying an endpoint in a loop, enriching a batch of records — the costs compound fast.

The x402 protocol team shipped V2 in December 2025 with a fix: **wallet-based reusable sessions**. Pay once, establish a session token, skip payment for every call within that session's TTL. I built the first non-custodial MCP implementation of that pattern. It shipped yesterday as ClawPay MCP v1.1.0.

---

## What Actually Changed

Four new tools. One modified tool. 48 new tests — 107 passing total.

The new tools are:

- **`x402_session_start`** — Makes the initial payment, creates a signed session token, returns a `session_id`
- **`x402_session_fetch`** — Makes HTTP requests inside an active session. No payment. Injects session headers, tracks call count.
- **`x402_session_status`** — Lists all active sessions or shows full detail on one (TX hash, TTL progress, call count)
- **`x402_session_end`** — Closes a session early

The modified tool is `x402_pay`. It now auto-detects active sessions before executing a payment. If a live session covers the URL you're fetching, it injects the session headers and skips the payment entirely. You don't have to change your existing code — it just works.

---

## The Before/After

**Before (per-call payments, v1.0.0):**

```typescript
// Agent needs to hit an API endpoint 20 times in a batch
// Each call = one on-chain payment + 400ms+ latency
for (const item of batch) {
  const result = await mcpClient.callTool("x402_pay", {
    url: `https://api.example.com/enrich?id=${item.id}`,
    max_payment_eth: "0.0001"
  });
  // 20 payments × ~400ms = 8+ seconds just in payment overhead
}
```text

**After (session payments, v1.1.0):**

```typescript
// Step 1: Pay once to establish the session
const session = await mcpClient.callTool("x402_session_start", {
  url: "https://api.example.com/enrich",
  max_payment_eth: "0.001",   // one payment covers the whole session
  scope: "prefix"             // covers all paths under /enrich
});

const { session_id } = JSON.parse(session.content[0].text);

// Step 2: Call as many times as needed — zero additional payments
for (const item of batch) {
  const result = await mcpClient.callTool("x402_session_fetch", {
    session_id,
    url: `https://api.example.com/enrich?id=${item.id}`
  });
  // 20 calls, 1 payment total
}

// Step 3: Close it when done (or let TTL expire)
await mcpClient.callTool("x402_session_end", { session_id });
```text

For a batch of 20, that's the difference between 20 on-chain payments and 1.

---

## The Non-Custodial Part (Why It Matters)

I'm not going to ship a payment tool that holds your keys. The whole design of ClawPay has been non-custodial from day one — your keys never leave your machine.

Session tokens in v1.1.0 follow the same principle. When you call `x402_session_start`, the token is signed **locally** using your agent's private key via viem's `signMessage`. No third party is involved. The token itself is:

```text
X-Session-Token:  <base64url(canonical JSON payload)>.<hex ECDSA signature>
X-Session-Wallet: <your agent wallet address>
PAYMENT-SESSION:  <session UUID>
```text

The canonical payload — sorted alphabetically, signed via ECDSA:

```json
{
  "createdAt": 1708538400,
  "endpoint": "https://api.example.com/v1",
  "expiresAt": 1708542000,
  "paymentAmount": "1000000",
  "paymentTxHash": "0x...",
  "scope": "prefix",
  "sessionId": "uuid-v4",
  "version": "clawpay/1.1",
  "walletAddress": "0x..."
}
```text

API servers verify this by calling `ecrecover` on the signature — standard Ethereum crypto, no external service needed. The session manager lives in-process. No external database, no custody infrastructure, no "call home" step.

The session token is also time-bounded. Even if it's intercepted, it only grants access to one specific endpoint for the duration of the TTL — default 1 hour, configurable from 60 seconds to 30 days via `SESSION_TTL_SECONDS`.

---

## Quick Start

```bash
npm install -g clawpay-mcp
```text

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clawpay": {
      "command": "clawpay-mcp",
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x...",
        "CHAIN_ID": "8453",
        "SESSION_TTL_SECONDS": "3600"
      }
    }
  }
}
```text

That's it. Restart Claude Desktop, and you've got session payments.

---

## Where Things Stand

Latinum.ai is building the same thing — x402 V2 sessions in an MCP context. They're not live yet. I don't know their timeline, but we have a window right now where ClawPay is the only working, non-custodial implementation of this pattern.

That matters for developers who are already betting on x402 for their APIs. Session payment support is what makes x402 practical for high-frequency agent workflows. Per-call payments work for one-off fetches. For anything that looks like a loop, you want sessions.

The code is at [npmjs.com/package/clawpay-mcp](https://www.npmjs.com/package/clawpay-mcp). If you hit a 402 wall and need to batch through it, this is the cleanest path I know of right now.
