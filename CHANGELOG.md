# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] — 2026-03-22

### Added

- **11 new MCP tools:**
  - `lookup_token` — look up token address and decimals by symbol + chain ID
  - `add_custom_token` — register custom ERC-20 tokens in the global token registry
  - `list_chain_tokens` — list all registered tokens for a given chain
  - `send_token` — send any ERC-20 token using symbol-based registry resolution
  - `get_balances` — fetch balances for multiple tokens on a chain
  - `swap_tokens` — token swaps via Uniswap V3 (Base, Arbitrum, Optimism, Polygon)
  - `bridge_usdc` — cross-chain USDC bridging via Circle CCTP V2
  - `set_spend_policy` — configure daily limits, per-tx caps, and recipient allowlists
  - `check_budget` — query on-chain remaining budget for a token/spender
  - `verify_agent_identity` — verify agent ERC-8004 on-chain identity
  - `get_reputation` — fetch agent reputation score and interaction history
  - `create_escrow` — create mutual-stake USDC escrow vaults
- Full **agentwallet-sdk v6.0.0** integration across all new tools
- **TokenRegistry** support — 100+ pre-loaded tokens, custom token registration at runtime
- **Multi-token transfers** — any ERC-20 or native gas token via `send_token`
- **Uniswap V3 swap support** via `SwapModule` (Base, Arbitrum, Optimism, Polygon)
- **CCTP V2 cross-chain USDC bridging** via `BridgeModule` (10 EVM chains)
- **Spending policy management** with in-process enforcement via `SpendingPolicy`
- **ERC-8004 agent identity verification** via `ERC8004Client`
- **Agent reputation scoring** via `ReputationClient`
- **Mutual stake escrow creation** via `MutualStakeEscrow`
- 42 new tests (149 total)
- 99.6% type coverage

### Changed

- Upgraded `agentwallet-sdk` dependency from v5.x to **v6.0.0**
- Version bump from 3.1.0 → 4.0.0

---

## [3.1.0] — 2026-03-15

### Added

- `queue_approval` tool — approve or cancel queued transactions that exceed per-tx cap
- `check_spend_limit` tool — check remaining allowance for a given token in the current period
- Budget forecast and wallet health endpoints via `getBudgetForecast` and `getWalletHealth`
- Utilization badge display (🟢 / 🟡 / 🔴) in `get_wallet_info` output
- Pending approvals management via `getPendingApprovals`, `approveTransaction`, `cancelTransaction`
- `get_transaction_history` event type filter: `policy_update`, `operator_update`

### Changed

- `get_wallet_info` now includes period utilization %, spend forecast, and queue depth
- Improved error messages with chain-specific explorer links

### Fixed

- Decimal precision handling for ERC-20 tokens with non-18 decimals in `send_payment`

---

## [1.1.0] — 2026-03-01

### Added

- **x402 V2 session payment support** — pay once, reuse token N times:
  - `x402_session_start` — establish a session by paying the endpoint once
  - `x402_session_fetch` — make calls within an active session (no new payment)
  - `x402_session_status` — inspect active sessions and TTL remaining
  - `x402_session_end` — explicitly close a session
- Session Manager (`src/session/manager.ts`) — in-memory session store with TTL enforcement
- Auto-session detection in `x402_pay` — injects session headers automatically if a valid session covers the URL
- `skip_session_check` parameter on `x402_pay` to force fresh payment
- Session scope options: `"prefix"` (covers all sub-paths) and `"exact"`

---

## [1.0.0] — 2026-02-15

### Added

- Initial release of AgentPay MCP Server
- Core MCP tools:
  - `deploy_wallet` — deploy a new AgentAccountV2 smart contract wallet via factory
  - `get_wallet_info` — retrieve wallet address, balance, and spend limit info
  - `send_payment` — send ETH or ERC-20 tokens via the AgentAccountV2 contract
  - `check_spend_limit` — check current period spend allowance
  - `queue_approval` — approve or cancel queued transactions
  - `x402_pay` — auto-pay x402 paywalled URLs
  - `get_transaction_history` — query on-chain event logs
- MCP stdio transport (compatible with Claude Desktop, Cursor, Windsurf)
- Non-custodial design — agent signs locally, owner controls limits via NFT ownership
- On-chain spend limits enforced by AgentAccountV2 contract
- Zod-validated input schemas for all tools
- TypeScript + viem + agentwallet-sdk foundation
- MIT License
