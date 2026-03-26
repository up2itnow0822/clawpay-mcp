# AgentPay MCP — Security Posture

> Last updated: 2026-03-26

This document maps AgentPay MCP's security controls to the CoSAI (Coalition for Secure AI) threat taxonomy and MCP 2026 authentication requirements. It is intended for enterprise security teams evaluating MCP servers for production deployment.

## CoSAI Threat Alignment

### T9 — Financial Fraud

**Threat:** An AI agent is manipulated (via prompt injection, tool poisoning, or logic error) into making unauthorized payments.

**Mitigations in AgentPay MCP:**

| Control | Implementation | Bypass Resistance |
|---------|---------------|-------------------|
| Per-transaction spending cap | `set_spend_policy` enforced by AgentAccountV2 smart contract | On-chain — cannot be overridden by application code or the agent |
| Rolling period limits | Daily/weekly caps enforced on-chain | Same — smart contract enforcement |
| Merchant allowlist | Only pre-approved recipient addresses can receive funds | On-chain enforcement |
| Human-approval gate | Transactions above configurable threshold queue for human review | Cannot be bypassed — `queue_approval` requires explicit human action |
| Fail-closed policy engine | Any error in policy evaluation → transaction rejected | Default-deny; no silent pass-through |
| Full audit trail | Every payment attempt logged: merchant, amount, timestamp, approval status, tx hash | Immutable on-chain record |

### T10 — Identity Spoofing

**Threat:** A malicious agent impersonates a legitimate agent to gain access to payment infrastructure or services.

**Mitigations in AgentPay MCP:**

| Control | Implementation |
|---------|---------------|
| ERC-8004 identity verification | `verify_agent_identity` tool validates on-chain agent identity NFTs |
| Non-custodial key management | Agent private key stored locally; never transmitted to any server |
| On-chain reputation | `get_reputation` provides verifiable transaction history and trust score |
| Session token verification | x402 session tokens are ECDSA-signed; any verifier can independently validate |

## OAuth 2.1 + PKCE Compliance

MCP 2026 roadmap requires OAuth 2.1 with PKCE for server authentication in enterprise environments.

**Current status:**

- AgentPay MCP supports configuration via environment variables (`AGENT_PRIVATE_KEY`, `AGENT_WALLET_ADDRESS`) for direct deployment
- For enterprise SSO: Azure AD and Okta can broker OAuth 2.1 tokens that gate access to the MCP server process
- PKCE flow: supported when deployed behind an OAuth 2.1-compliant reverse proxy (e.g., Azure API Management, Auth0)
- The MCP server itself authenticates agents via their on-chain identity (ERC-8004) and wallet signature, which provides cryptographic authentication independent of OAuth

**Roadmap:**

- Native OAuth 2.1 token validation in the MCP server transport layer (aligned with MCP spec evolution)
- Mutual TLS option for server-to-server deployments

## MCP Audit Logging

Every tool invocation is logged with:

- Timestamp (ISO 8601)
- Tool name and parameters
- Outcome (success/failure/queued)
- Transaction hash (for on-chain operations)
- Policy evaluation result (approved/rejected/queued with reason)

Logs are available via `get_transaction_history` tool and can be exported to enterprise SIEM systems.

## Dependency Security

- **Zero LiteLLM dependency** — no exposure to the March 2026 PyPI supply chain compromise
- **Minimal npm dependency tree** — `viem`, `@modelcontextprotocol/sdk`, and auditable packages only
- **No Python runtime required** — eliminates PyPI supply chain attack surface entirely
- **NVIDIA-validated** — security posture reviewed as part of [NVIDIA NeMo Agent Toolkit Examples PR #17](https://github.com/NVIDIA/NeMo-Agent-Toolkit-Examples/pull/17) merge process

## Contact

Security issues: see [SECURITY.md](../SECURITY.md) for responsible disclosure process.
