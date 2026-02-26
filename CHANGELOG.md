# Changelog

All notable changes to ClawPay MCP are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.1.0] — 2026-02-21

### Added — x402 V2 Session Payment Support

x402 V2 introduced "wallet-based access & reusable sessions": agents pay once
to establish a session token, then make N subsequent calls without any additional
on-chain transactions. ClawPay MCP v1.1.0 implements this pattern fully and
non-custodially.

#### New Tools

| Tool | Description |
|------|-------------|
| `x402_session_start` | Pay once to establish an x402 V2 session. Returns a signed `session_id`. |
| `x402_session_fetch` | Make HTTP requests within a session — no new payments. |
| `x402_session_status` | List active sessions or inspect a specific session (TTL, call count, payment proof). |
| `x402_session_end` | Explicitly close a session before it expires naturally. |

#### Session Architecture

Sessions are **non-custodial by design**:

- Session tokens are signed locally by the agent's private key using ECDSA (secp256k1 via viem)
- No third party holds or validates keys at any point
- Session tokens are self-contained signed claims that x402 V2-compatible servers can verify independently via `ecrecover` / `verifyMessage`
- The session manager lives in-process; no external services or databases required

**Session token format** (x402 V2 SIGN-IN-WITH-X compatible):

```text
X-Session-Token: <base64url(canonical JSON payload)>.<hex ECDSA signature>
X-Session-Wallet: <agent wallet address>
PAYMENT-SESSION:  <session UUID>
```text

The canonical payload includes: `version`, `sessionId`, `walletAddress`, `endpoint`,
`scope`, `createdAt`, `expiresAt`, `paymentTxHash`, `paymentAmount`.

#### Session Scope

Two scope modes:

- **`prefix`** (default): session covers all paths under the endpoint URL (e.g., all of `api.example.com/v1/*`)
- **`exact`**: session only covers the single URL that was paid for

#### x402_pay Auto-Session Detection (new behaviour)

`x402_pay` now auto-detects active sessions before making payments:

1. If an active session covers the requested URL, the session token is injected and no payment is made
2. If the server still returns 402, it falls through to the standard payment flow
3. Set `skip_session_check: true` to force a fresh payment regardless

#### New Environment Variable

```bash
SESSION_TTL_SECONDS=3600  # Session lifetime (default: 3600 = 1 hour, max: 30 days)
```text

#### Tests

- 43 new tests added in `tests/session.test.ts`
- All 59 existing tests continue to pass
- Total: 102/102 tests passing

---

## [1.0.0] — 2026-02-18

### Initial Release

- `deploy_wallet` — Deploy an AgentAccountV2 smart wallet via factory contract
- `get_wallet_info` — Wallet address, ETH balance, spend limits, utilisation
- `send_payment` — Send ETH or ERC20 tokens with spend limit enforcement
- `check_spend_limit` — Pre-flight check before sending a payment
- `queue_approval` — Manage over-limit transactions queued for owner review
- `x402_pay` — Fetch URLs with automatic HTTP 402 payment handling
- `get_transaction_history` — On-chain event log query

**Properties:**

- Non-custodial: agent signs locally, no third-party custody
- Spend limits enforced on-chain by AgentAccountV2
- Base Mainnet + Base Sepolia testnet
- 59/59 tests passing
- MIT License

[1.1.0]: https://github.com/agentnexus/clawpay-mcp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agentnexus/clawpay-mcp/releases/tag/v1.0.0
