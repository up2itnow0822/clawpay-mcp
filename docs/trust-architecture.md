# AgentPay MCP Trust Architecture

**Simulation Mode · Spend Caps · Human-in-the-Loop · Transaction Explainability**

---

## The Problem: Agent Autonomy Without Trust Infrastructure

Autonomous agents that handle money need more than API keys and wallet addresses. They need a trust architecture — a layered system of controls that lets operators grant autonomy incrementally, verify behavior continuously, and intervene instantly when something goes wrong.

Enterprise solutions like Visa's Visa Intelligent Commerce (VIC) platform address this for traditional payment flows: pre-authorization, fraud scoring, velocity checks, chargeback handling. But VIC is built for card networks and merchant acquirers. It doesn't speak MCP. It doesn't run locally. It doesn't give developers control over the trust model.

AgentPay MCP provides the same trust primitives — simulation, spend controls, human approval, and explainability — in an open-source, developer-native package that runs wherever your agent runs.

---

## Trust Layers

### Layer 1: Simulation Mode

Before any real funds move, agents can dry-run a transaction to preview:

- **Recipient address** and whether it's on the allowlist
- **Estimated cost** in the payment token (USDC, ETH)
- **Gas estimate** for the target chain
- **Policy evaluation result** — would this transaction be auto-approved, queued, or rejected?

Simulation mode gives operators confidence before enabling auto-approve. It's also the right tool for testing new integrations: point your agent at a paid API, see what it would cost, and decide whether to add it to the allowlist — all without spending a cent.

**Comparison:** Visa VIC performs pre-authorization checks server-side through the card network. AgentPay performs simulation locally, with results visible to the agent and operator before any network call.

### Layer 2: Per-Call Spend Caps

Every transaction is evaluated against on-chain spending policy before execution:

- **Per-transaction maximum** — no single call can exceed this amount, regardless of what the agent requests
- **Enforced by smart contract** — the AgentAccountV2 contract rejects over-cap transactions at the EVM level. Application-layer bugs or agent prompt injection cannot bypass this.

This is the most critical trust boundary. Even if an agent is compromised, jailbroken, or simply wrong about what it's buying, the per-call cap limits blast radius to a known, acceptable amount.

**Comparison:** Visa VIC enforces transaction limits through issuer-configured velocity rules in the card network. AgentPay enforces them on-chain — no intermediary required, publicly auditable, and immutable once set.

### Layer 3: Daily Aggregate Caps

Per-call caps prevent single large losses. Daily caps prevent death by a thousand cuts:

- **Rolling daily limit** — total spend across all transactions resets on a configurable period
- **On-chain enforcement** — same smart contract, same immutability guarantees
- **Budget visibility** — agents can call `check_budget` to see remaining allowance before starting expensive workflows

An agent running a 50-item enrichment loop at $0.10 each hits $5.00 total. If the daily cap is $10, the agent knows it has $5 left. If the loop was supposed to be 500 items due to a bug, the cap stops it at 100.

**Comparison:** VIC uses velocity checks (transaction count and amount per time window) configured at the issuer level. AgentPay's daily caps serve the same function, configured by the wallet owner.

### Layer 4: Human-in-the-Loop Approval

Not every transaction should be automatic. AgentPay's HITL system queues transactions that exceed the auto-approve threshold:

- **Threshold-based routing** — under threshold: auto-approved and executed. Over threshold: queued for human review.
- **Queue inspection** — operators see pending transactions with full context (merchant, amount, tool that triggered it, agent reasoning)
- **Approve or reject** — explicit human decision. Rejection returns a structured error to the agent, which can adapt (use cached data, try a cheaper source, ask the user).
- **Fail-closed** — if the approval system errors, the default is rejection. Never approval.

HITL is the default mode. Operators opt *into* automation by raising thresholds, not opt *out* of oversight by lowering them. Trust is earned incrementally.

**Comparison:** Visa VIC routes high-risk transactions to manual review queues via issuer fraud teams. AgentPay routes them to the operator directly — no intermediary, no SLA dependency on a third-party fraud team.

### Layer 5: Transaction Explainability

Every transaction — approved, rejected, queued, or simulated — produces a structured audit record:

- **Timestamp** (block time + local time)
- **Merchant/recipient** address and resolved name (if available)
- **Amount** in payment token and USD equivalent
- **Policy evaluation** — which rule triggered (auto-approve, cap exceeded, allowlist miss)
- **Approval path** — auto-approved, human-approved, or rejected (with reason)
- **On-chain transaction hash** — independently verifiable on any block explorer

This isn't just logging. It's the artifact that security teams, compliance officers, and auditors need to answer: "What did this agent spend money on, why, and who approved it?"

**Comparison:** Visa VIC generates transaction records through the card network's settlement process. AgentPay generates them on-chain — immutable, publicly verifiable, and available in real-time (not T+1 or T+2 settlement).

---

## Trust Model Comparison

| Trust Primitive | Visa VIC (Enterprise) | AgentPay MCP (Open Source) |
|---|---|---|
| Pre-transaction simulation | Pre-authorization via card network | Local simulation mode, no network call |
| Per-transaction limits | Issuer-configured velocity rules | On-chain smart contract enforcement |
| Aggregate spend caps | Velocity checks per time window | On-chain daily caps, agent-queryable |
| Human review routing | Issuer fraud team queues | Direct operator HITL, fail-closed |
| Transaction audit trail | Card network settlement records (T+1/T+2) | On-chain, real-time, publicly verifiable |
| Integration model | Enterprise API + card network onboarding | `npm install` + MCP config |
| Source availability | Proprietary | MIT open source |
| Protocol native | Card networks (ISO 8583) | MCP + x402 (HTTP 402) |
| Agent-native controls | No (designed for human cardholders) | Yes (agents query budget, adapt to rejections) |

---

## Deployment Progression

Trust should be granted incrementally. Here's the recommended progression:

1. **Simulation only** — Agent runs, simulates all payments, logs what it would spend. Zero risk.
2. **HITL with low threshold** — Auto-approve micro-payments ($0.10), queue everything else. Operator reviews daily.
3. **HITL with raised threshold** — After reviewing transaction patterns, raise auto-approve to $1-$5. Queue large transactions.
4. **Full auto with daily cap** — High-confidence workflows get full auto-approve with a daily ceiling. Operator reviews weekly.
5. **Multi-agent with per-agent caps** — Each agent gets its own wallet with independent caps. Blast radius is isolated per agent.

At no point does the operator lose the ability to intervene. Every stage is reversible by lowering thresholds or enabling simulation mode.

---

## For Enterprise Security Teams

If you're evaluating agent payment infrastructure:

- **Smart contract source** is verified and auditable on-chain
- **Dependency tree** is minimal — zero LiteLLM, zero Python runtime, auditable with `npm ls`
- **NVIDIA validation** — integrated into [NVIDIA NeMo Agent Toolkit Examples](https://github.com/NVIDIA/NeMo-Agent-Toolkit-Examples/pull/17) (PR #17, merged)
- **CoSAI alignment** — addresses T9 (Financial Fraud) and T10 (Identity Spoofing) threat categories
- **Security posture doc** — see [`security-posture.md`](security-posture.md) for the full compliance matrix

---

*AgentPay MCP is MIT licensed. Built by [AI Agent Economy](https://ai-agent-economy.com).*
