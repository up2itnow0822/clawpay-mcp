# Validation Report — ClawPay MCP

**Date:** 2026-02-19
**Validator:** Validator Agent (Internal AI-Assisted Review)
**Project Path:** /Users/billwilson/.openclaw/workspace/skills/clawpay-mcp/
**Project Type:** TypeScript / Node.js MCP Server
**Tools Available:** eslint, tsc, vitest, npm audit, grep (secret scan manual)
**Tools Unavailable:** ggshield, trufflehog, gitleaks, slither, solhint (N/A — no Solidity)

---

## Summary

| Section | Status | Issues |
|---------|--------|--------|
| 1. Security | ✅ | 0 production vulnerabilities (dev-only devDeps upgraded) |
| 2. Testing | ✅ | 59/59 tests passing, all tools covered |
| 3. Code Quality | ✅ | Clean tsc, no dead code, consistent style |
| 4. Documentation | ✅ | Full README, env docs, tool reference, security model |
| 5. CI/CD | 🟡 | No CI workflow file (not blocking for npm package) |
| 6. Privacy & PII | ✅ | No PII in code or logs |
| 7. Maintainability | ✅ | Lockfile present, deps pinned, env-first config |
| 8. Usability | ✅ | Clear error messages, copy-paste config snippet |
| 9. Marketability | ✅ | Strong one-liner, working examples, security story |
| 10. Pre-Deploy Gate | ✅ | No blocking issues |

**Overall:** ✅ **READY FOR DEPLOY** (with one medium recommendation)

---

## Blocking Issues

*None.* All critical and high issues resolved.

---

## Section Details

### 1. Security 🔒

#### 1.1 Dependency Audit

**Status:** ✅
**Command run:** `npm audit`
**Result:** 0 vulnerabilities after upgrading `@vitest/coverage-v8` from v3 to v4.

Initial scan found 4 HIGH severity vulns in `minimatch` / `glob` / `test-exclude` / `@vitest/coverage-v8`, all in the **dev dependency** chain (coverage tooling only — never shipped in the npm package). These were resolved by upgrading to `@vitest/coverage-v8@4.0.18`.

No production dependency vulnerabilities at time of report.

#### 1.2 Secret Scanning

**Status:** ✅
**Command run:** `grep -rn "sk-\|AKIA\|0x[a-fA-F0-9]{64}\|ghp_\|-----BEGIN" src/`
**Result:** No secrets found in source code.

`AGENT_PRIVATE_KEY` appears in:

- A JSDoc comment in `src/index.ts` (only the env var *name*, not a value) ✅
- `src/utils/client.ts` as `process.env['AGENT_PRIVATE_KEY']` (runtime read) ✅

The private key value is never logged, never hardcoded.

#### 1.3 Input Validation

**Status:** ✅
All user inputs validated before use:

- Recipient address: length + 0x prefix check
- Token amounts: NaN + positive check + parseTokenAmount
- Token IDs: BigInt() conversion with error handling
- URLs: zod `.url()` validation on x402_pay

#### 1.4 Access Control

**Status:** ✅
The MCP server is a stdio server — only the local MCP client process can interact with it. No network binding. On-chain: the `AgentAccountV2` contract enforces spend limits even if the agent key is compromised.

#### 1.5 Dangerous Code Patterns

**Status:** ✅
**Command run:** `grep -rn "eval(\|exec(\|child_process\|subprocess" src/`
**Result:** None found.

#### 1.6 Attack Surface

**Status:** ✅
External-facing surface:

- `x402_pay`: Makes HTTP fetch to user-supplied URL. Mitigated by: (1) URL is zod-validated as `.url()`, (2) `AbortSignal.timeout()` prevents hanging, (3) response is capped at 8000 chars, (4) payment capped by `max_payment_eth` parameter and on-chain limits.

#### 1.7 Environment Variable Handling

**Status:** ✅

- All secrets read from `process.env` at runtime
- No secrets in source files, test files, or committed config
- `.gitignore` includes `.env` and `*.key`
- `.env.example` provided with placeholder values

---

### 2. Testing ✅

**Command run:** `npm test` (vitest v4.0.18)

**Result:** 59/59 tests passing across 3 test files.

```text
 ✓ tests/deploy.test.ts   (10 tests)
 ✓ tests/payments.test.ts (32 tests)
 ✓ tests/x402.test.ts     (17 tests)
 
 Test Files: 3 passed
 Tests:      59 passed
```text

**Coverage by tool:**

| Tool | Happy Path | Error Path | Notes |
|------|-----------|-----------|-------|
| `deploy_wallet` | ✅ | ✅ | SDK error, missing params |
| `get_wallet_info` | ✅ | ✅ | Budget + health checks |
| `send_payment` | ✅ | ✅ | ETH + ERC20, invalid inputs |
| `check_spend_limit` | ✅ | ✅ | Approved / queued / blocked |
| `queue_approval` | ✅ | ✅ | List / approve / cancel |
| `x402_pay` | ✅ | ✅ | No-pay / payment / timeout |
| `get_transaction_history` | ✅ | ✅ | Filter / empty / error |
| `parseTokenAmount` | ✅ | ✅ | All decimal edge cases |

All SDK calls are mocked — tests do not require network access.

---

### 3. Code Quality 📐

#### 3.1 TypeScript Compilation

**Status:** ✅
**Command run:** `npx tsc --noEmit`
**Result:** Zero errors.

#### 3.2 Code Style

**Status:** ✅

- Consistent naming conventions (camelCase, PascalCase for types)
- Functions are well-named and single-purpose
- No function exceeds 50 lines
- Proper JSDoc on public exports

#### 3.3 Dead Code

**Status:** ✅
No unused imports or unreachable branches found. TypeScript strict mode catches unused variables.

#### 3.4 Error Handling

**Status:** ✅
All async operations are wrapped in try/catch. All errors return an MCP `isError: true` response with a descriptive `❌ toolname failed: message` format. No raw stack traces exposed to users.

---

### 4. Documentation 📚

#### 4.1 README.md

**Status:** ✅
Covers:

- One-line description ✅
- `npm install -g clawpay-mcp` ✅
- Claude Desktop config snippet ✅
- All 7 tools documented with example inputs/outputs ✅
- Security model explanation (non-custodial, spend limits, threat model) ✅
- Links to agentwallet-sdk ✅

#### 4.2 API Documentation

**Status:** ✅

- MCP `description` fields on all tools are clear and actionable
- Zod schema `.describe()` on all parameters
- Input/output examples in README

#### 4.3 `.env.example`

**Status:** ✅
Clear, commented, with annotations for each variable including which are optional.

#### 4.4 `claude_desktop_config.json`

**Status:** ✅
Ready-to-copy template with helpful `_comment` and `_NOTE` fields.

---

### 5. CI/CD 🔄

**Status:** 🟡 Medium
No `.github/workflows/` CI configuration exists. This is acceptable for the initial npm publish — the `prepublishOnly` script runs `clean && build && typecheck` automatically before any publish.

**Recommendation:** Add a GitHub Actions CI workflow for PR validation.

**Build from clean state:**

```bash
npm ci && npm run build && npx tsc --noEmit && npm test
```text

→ All pass ✅

---

### 6. Privacy & PII 🛡️

**Status:** ✅
**Command run:** `grep -rn "email|password|ssn|phone" src/`
**Result:** None found.

The startup log (stderr) emits the wallet address (non-sensitive — it's a public blockchain address) and chain ID. Never emits the private key. ✅

---

### 7. Maintainability 🔧

**Status:** ✅

- `package-lock.json` committed ✅
- `viem` pinned to exact version `2.46.0` (required for type compatibility with agentwallet-sdk) ✅
- `overrides` ensures single viem version ✅
- All config externalized via env vars ✅
- External services (blockchain RPC) abstracted via `getWallet()` singleton ✅

---

### 8. Usability & Presence 🎨

**Status:** ✅

- All tool errors return human-readable messages with emoji indicators
- No raw stack traces exposed to end users
- `check_spend_limit` tool helps users verify before spending (prevents silent queue behavior)
- Response truncation on x402_pay (prevents overwhelming Claude Desktop with huge responses)

---

### 9. Marketability 📣

**Status:** ✅

- **One-liner:** "MCP server that gives any AI agent autonomous, spend-limited crypto payments via the Agent Wallet SDK on Base network." ✅
- Copy-paste Claude Desktop config in README ✅
- All 7 tools have example inputs/outputs ✅
- Security model section clearly differentiates from custodial alternatives ✅
- Keyword-rich npm package.json (mcp, claude, cursor, x402, non-custodial, etc.) ✅

---

### 10. Pre-Deploy Final Gate 🚪

**Status:** ✅

**Deploy command:** `npm publish`
**Pre-publish checks run automatically:** `npm run clean && npm run build && npx tsc --noEmit`

**npm pack dry run:** ✅ 29.0 kB package, 36 files, clean content list.

**Monitoring:** End-users monitor via wallet explorer links included in every payment response + `get_transaction_history` tool.

---

## ClawHub Security Domains

| Domain | Status | Notes |
|--------|--------|-------|
| Gateway exposure | ✅ N/A | stdio transport only — no network binding |
| DM policy | ✅ N/A | Not a bot |
| Credentials security | ✅ | Keys in env vars, .env in .gitignore |
| Browser control | ✅ N/A | Not used |
| Network binding | ✅ | stdio only — no socket/port binding |
| Tool sandboxing | ✅ | No shell exec, no file system writes |
| File permissions | ✅ | No sensitive file writes |
| Plugin trust | ✅ | 4 deps: @modelcontextprotocol/sdk (Anthropic), agentwallet-sdk (AgentNexus), viem (Wevm), zod (Colinhacks) |
| Logging/redaction | ✅ | Private key never logged |
| Prompt injection | ✅ N/A | Not an LLM prompt handler |
| Dangerous commands | ✅ | No eval/exec/child_process found |
| Secret scanning | ✅ | Manual grep clean |
| Dependency safety | ✅ | Known publishers, no typosquats |

## ClawHub Publishing Readiness

| Check | Status | Notes |
|-------|--------|-------|
| No private key references in package | ✅ | Only `process.env['AGENT_PRIVATE_KEY']` (runtime read) |
| Env vars declared in docs | ✅ | .env.example + README table |
| npm package name consistency | ✅ | `clawpay-mcp` matches README + bin |
| Audit language | ✅ | "Internal AI-Assisted Review" used |
| VirusTotal patterns | ✅ | No base64 URLs, no obfuscation, no unusual network calls |

---

## Recommendations

1. 🟡 **Add GitHub Actions CI** — Add `.github/workflows/ci.yml` to run `npm ci && npm run build && npm test` on PRs.
2. 🟡 **Add RPC timeout validation** — `RPC_URL` is accepted without validation. Consider pinging the URL on startup to fail fast with a clear error if unreachable.
3. 🟡 **vitest source map warning** — `agentwallet-sdk` dist has missing sourcemap files. This is an upstream issue (not ClawPay's fault). Consider filing a bug upstream or using `--reporter=verbose` in CI.

---

## Disclaimer

This report was generated by an internal AI-assisted validation agent. It is NOT a third-party security audit. While comprehensive automated and manual checks were performed, this does not replace professional security review for production systems handling significant value.
