# Security Policy — agentpay-mcp

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.2.x   | ✅        |
| < 1.2   | ❌        |

## Reporting a Vulnerability

Email security concerns to bill@ai-agent-economy.com with:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment

We aim to respond within 48 hours and patch critical issues within 7 days.

## Architecture: Why agentpay-mcp Mitigates CVE-2026-26118

### Background

CVE-2026-26118 (CVSS 8.8) is a server-side request forgery (SSRF) vulnerability in Azure MCP Server Tools, disclosed in Microsoft's March 2026 Patch Tuesday. The vulnerability allows attackers to send crafted inputs that exploit SSRF to steal managed identity tokens and escalate privileges. [Talos Intelligence](https://blog.talosintelligence.com/microsoft-patch-tuesday-march-2026/), [Tenable](https://www.tenable.com/blog/microsofts-march-2026-patch-tuesday-addresses-83-cves-cve-2026-21262-cve-2026-26127), and [TheHackerWire](https://www.thehackerwire.com/azure-mcp-server-ssrf-for-privilege-elevation-cve-2026-26118/) confirmed the vulnerability affects Azure MCP Server configurations that accept user-provided parameters without input validation.

### Why agentpay-mcp Is Not Affected

agentpay-mcp's architecture mitigates this class of vulnerability through three design choices:

1. **No managed identity dependency.** agentpay-mcp uses non-custodial wallet keys (ERC-6551 Token Bound Accounts), not cloud-managed identity tokens. There are no managed identity tokens to steal via SSRF because the system doesn't use them.

2. **Input validation on all MCP tool parameters.** Every tool exposed by agentpay-mcp validates input against a strict schema before execution. URL parameters, addresses, and amounts are type-checked and range-validated. Arbitrary URL injection — the SSRF attack vector — is blocked at the schema layer.

3. **Process isolation.** agentpay-mcp runs as a standalone MCP server process. It does not share memory, tokens, or credentials with other Azure services. Even if an attacker could craft a malicious input, the blast radius is limited to the agentpay-mcp process — which holds only the agent's non-custodial wallet key, not cloud infrastructure credentials.

### Enterprise MCP Security Recommendations

For organizations deploying MCP servers (including agentpay-mcp) in production:

- **Apply Microsoft's March 2026 patches** if running any Azure MCP Server Tools
- **Enforce MCP tool allowlists** — only expose the tools your agents actually need
- **Run MCP servers in isolated containers** — limit network access to required endpoints only
- **Audit MCP tool inputs** — log all tool invocations for security review
- **Use non-custodial wallet architectures** — avoid storing cloud credentials or managed identity tokens in MCP server processes

See our [enterprise MCP hardening guide](https://ai-agent-economy.hashnode.dev/enterprise-mcp-security-hardening-guide-march-2026) for detailed deployment recommendations.

## Dependency Security

Current status: 5 low-severity vulnerabilities in the `elliptic` dependency chain (via `@elizaos/core`). These do not affect agentpay-mcp's payment operations. Monitoring for upstream fixes.
