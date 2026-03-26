# AgentPay MCP: HITL Reference Architecture for Payment Authorization

> The reference implementation for human-in-the-loop payment workflows in MCP-compatible agents.

## Why HITL Matters

McKinsey's 2026 AI Trust Maturity Survey found that only **14.4% of enterprises formally approve AI agents before deployment**, while **88% report at least one agent security incident**. For payment operations specifically, just **18% of enterprises are confident in their agent IAM**.

The implication is clear: autonomous agent payments without human oversight are a non-starter for enterprise adoption. The question isn't whether HITL is needed — it's how to implement it without destroying the autonomy that makes agents valuable.

## The Pattern: Suggest → Approve → Execute

AgentPay MCP implements a three-phase payment authorization pattern:

```
Phase 1: SUGGEST
  Agent encounters a paid API (HTTP 402)
  AgentPay MCP evaluates spending policy
  If amount > human_approval_threshold:
    → Payment is BLOCKED (not executed)
    → Human receives approval request

Phase 2: APPROVE
  Human reviews: merchant, amount, context
  Human decides: approve or reject
  Decision is logged with timestamp

Phase 3: EXECUTE
  If approved → payment executes on-chain
  If rejected → agent receives rejection, adapts
  Full audit trail recorded regardless
```

### Code Example: Human-Approval Payment Flow

```python
from smolagents import CodeAgent, InferenceClientModel
from smolagents.x402_payment_tool import X402PaymentTool, SpendingPolicy, PaymentMode

# Configure HITL: auto-approve under $1, require human approval above
payment_tool = X402PaymentTool(
    spending_policy=SpendingPolicy(
        mode=PaymentMode.LIVE,
        max_per_transaction=10.00,
        rolling_cap=100.00,
        require_human_approval=True,
        human_approval_threshold=1.00,
        merchant_allowlist=["api.example.com", "data.provider.io"],
    )
)

agent = CodeAgent(
    tools=[payment_tool],
    model=InferenceClientModel(),
)

# Agent workflow:
# 1. Agent calls api.example.com → gets HTTP 402 for $0.50
#    → Auto-approved (under $1 threshold) → paid → data returned
#
# 2. Agent calls data.provider.io → gets HTTP 402 for $3.50
#    → BLOCKED → human sees:
#      "Agent wants to pay $3.50 to data.provider.io — approve? [y/n]"
#    → Human approves → paid → data returned
#    → OR human rejects → agent receives error, tries alternative
```

### MCP Server Configuration

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["agentpay-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AGENT_WALLET_ADDRESS": "0x..."
      }
    }
  }
}
```

The HITL behavior is configured via `set_spend_policy` tool:

```json
{
  "tool": "set_spend_policy",
  "arguments": {
    "perTxCapEth": "0.004",
    "dailyLimitEth": "0.04",
    "requireHumanApproval": true,
    "humanApprovalThreshold": "0.0004",
    "allowedRecipients": ["0x..."]
  }
}
```

## Why This Architecture Works

### 1. Graduated Autonomy

Not every payment needs human review. The threshold model lets agents handle routine micropayments autonomously while escalating significant transactions. This preserves agent utility without sacrificing oversight.

### 2. On-Chain Enforcement

The spending caps aren't in application code — they're in the AgentAccountV2 smart contract. Even if the agent, the MCP server, or the host application is compromised, the on-chain limits hold. The human-approval gate is the last line of defense, not the only one.

### 3. Audit Trail for Compliance

Every payment attempt (approved, rejected, or auto-approved) is logged with:
- Merchant/recipient address
- Amount requested
- Policy evaluation result
- Human decision (if applicable)
- On-chain transaction hash (if executed)

This gives compliance teams the artifact trail they need for SOC 2, financial audits, and regulatory reporting.

## MCP 2026 Roadmap Alignment

The MCP specification is evolving toward mandatory security controls for financial operations:

- **CoSAI T9 (Financial Fraud):** AgentPay MCP's HITL pattern directly addresses this threat category
- **OAuth 2.1 + PKCE:** Enterprise authentication for MCP server access (see [security-posture.md](security-posture.md))
- **Standardized approval UX:** The `queue_approval` tool provides a consistent interface that MCP clients (Claude Desktop, Cursor, etc.) can render as native approval dialogs

## Production Reference

This HITL payment architecture is already in production:

- **[NVIDIA NeMo Agent Toolkit Examples PR #17](https://github.com/NVIDIA/NeMo-Agent-Toolkit-Examples/pull/17)** — x402 payment tool merged into NVIDIA's official agent toolkit catalog
- **[smolagents PR #2123](https://github.com/huggingface/smolagents/pull/2123)** — Native x402 payment tool with HITL support, addressing community request [#2112](https://github.com/huggingface/smolagents/issues/2112) for human-in-the-loop payment authorization

## Related Documentation

- [Security Posture](security-posture.md) — CoSAI alignment and OAuth 2.1 compliance
- [README](../README.md) — Full AgentPay MCP documentation
- [SECURITY.md](../SECURITY.md) — Responsible disclosure process
