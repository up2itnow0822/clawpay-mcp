# Known Issues — ClawPay MCP

This file documents known issues that cannot be fixed without breaking functionality or depend on upstream changes.

---

## 1. vitest Sourcemap Warning (Dev Only)

**Severity:** Low (development only, zero user impact)
**Status:** Upstream issue
**Message:** `Sourcemap for ".../agentwallet-sdk/dist/index.js" points to missing source files`

**Description:**
When running tests, vitest emits a warning that `agentwallet-sdk`'s dist bundle references sourcemap files that weren't included in the npm package. This is a packaging oversight in `agentwallet-sdk`.

**Impact:** None on test correctness or production behavior. Tests still pass 59/59.

**Fix:** Needs to be addressed in `agentwallet-sdk` by including sourcemap files in the `files` array of its `package.json`. A PR/issue has been filed upstream.

**Workaround:** None needed. Ignore the warning — it's purely cosmetic.

---

## 2. Dual viem Version (Pinned as Mitigation)

**Severity:** None (mitigated)
**Status:** Resolved via `overrides`

**Description:**
`agentwallet-sdk` bundles its own copy of `viem@2.46.0`. Without pinning, npm would install two incompatible viem instances causing TypeScript type errors.

**Mitigation:**
`package.json` includes:

```json
"overrides": { "viem": "2.46.0" }
```text

This forces a single viem installation. If `agentwallet-sdk` is updated to a newer viem, the override must be updated to match.

**Action Required:** When `agentwallet-sdk` publishes a new minor/major version, verify the `viem` version it uses and update the `overrides` field accordingly.

---

## 3. x402 Protocol: EVM-Only Payment Support

**Severity:** Low (by design)
**Status:** By design — not a bug

**Description:**
The `x402_pay` tool only supports payment via USDC on Base network (`base:8453` and `base-sepolia:84532`). x402 endpoints that require payment on other networks or in other tokens will not be paid and will return the 402 response unchanged.

**Affected behavior:** If an x402 endpoint requires ETH-native payment (not USDC), or payment on Ethereum Mainnet, the request will not be paid automatically.

**Future fix:** Extend `X402ClientConfig.supportedNetworks` and `supportedAssets` as the x402 ecosystem grows. The SDK is designed to support this via config.

---

*Last updated: 2026-02-19*
