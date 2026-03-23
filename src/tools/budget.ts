/**
 * budget.ts — set_spend_policy, check_budget tools.
 *
 * set_spend_policy: configure a SpendingPolicy (in-process, persists for server lifetime).
 * check_budget: query on-chain remaining budget via checkBudget().
 */
import { z } from 'zod'
import { SpendingPolicy, checkBudget } from 'agentwallet-sdk'
import { zeroAddress, type Address } from 'viem'
import { getWallet } from '../utils/client.js'
import { textContent, formatError } from '../utils/format.js'

// ─── Module-level policy store ─────────────────────────────────────────────

interface PolicyConfig {
  dailyLimitEth?: string
  perTxCapEth?: string
  allowedRecipients?: string[]
}

let _policyConfig: PolicyConfig | null = null
let _spendingPolicy: InstanceType<typeof SpendingPolicy> | null = null

export function _resetPolicyStore(): void {
  _policyConfig = null
  _spendingPolicy = null
}

// ─── set_spend_policy ──────────────────────────────────────────────────────

export const SetSpendPolicySchema = z.object({
  dailyLimitEth: z
    .string()
    .optional()
    .describe('Daily spend limit in ETH-equivalent, e.g. "0.1"'),
  perTxCapEth: z
    .string()
    .optional()
    .describe('Per-transaction cap in ETH-equivalent, e.g. "0.01"'),
  allowedRecipients: z
    .array(z.string())
    .optional()
    .describe('Allowlist of recipient addresses (0x-prefixed). Empty = all allowed.'),
})

export type SetSpendPolicyInput = z.infer<typeof SetSpendPolicySchema>

export const setSpendPolicyTool = {
  name: 'set_spend_policy',
  description:
    'Configure the Agent Wallet spend policy. ' +
    'Sets a daily limit, per-transaction cap, and optional recipient allowlist. ' +
    'The policy is enforced in-process for the lifetime of the MCP server.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dailyLimitEth: {
        type: 'string',
        description: 'Daily spend limit in ETH-equivalent (e.g. "0.1")',
      },
      perTxCapEth: {
        type: 'string',
        description: 'Per-tx cap in ETH-equivalent (e.g. "0.01")',
      },
      allowedRecipients: {
        type: 'array',
        items: { type: 'string' },
        description: 'Allowlisted recipient addresses',
      },
    },
    required: [],
  },
}

export async function handleSetSpendPolicy(
  input: SetSpendPolicyInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const ethToWei = (eth: string): bigint => {
      const val = parseFloat(eth)
      if (isNaN(val) || val < 0) throw new Error(`Invalid ETH amount: "${eth}"`)
      return BigInt(Math.round(val * 1e18))
    }

    const merchantAllowlist = input.allowedRecipients ?? []

    // Build SpendingPolicyConfig from inputs
    // rollingCap uses a 24-hour window for dailyLimitEth
    const rollingCap = input.dailyLimitEth
      ? {
          maxAmount: Number(ethToWei(input.dailyLimitEth)),
          windowMs: 86_400_000, // 24 hours
        }
      : undefined

    // draftThreshold maps to perTxCap — payments above this go to draft
    const draftThreshold = input.perTxCapEth
      ? Number(ethToWei(input.perTxCapEth))
      : undefined

    _spendingPolicy = new SpendingPolicy({
      merchantAllowlist,
      rollingCap,
      draftThreshold,
    })

    _policyConfig = {
      dailyLimitEth: input.dailyLimitEth,
      perTxCapEth: input.perTxCapEth,
      allowedRecipients: merchantAllowlist,
    }

    return {
      content: [
        textContent(
          JSON.stringify({
            success: true,
            policy: {
              dailyLimitEth: input.dailyLimitEth ?? null,
              perTxCapEth: input.perTxCapEth ?? null,
              allowedRecipients: merchantAllowlist,
            },
          })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'set_spend_policy'))],
      isError: true,
    }
  }
}

// ─── check_budget ──────────────────────────────────────────────────────────

export const CheckBudgetSchema = z.object({
  token: z
    .string()
    .optional()
    .describe(
      'Token address to check budget for. ' +
      'Use "0x0000000000000000000000000000000000000000" for ETH (default). ' +
      'Or a USDC/ERC20 contract address.'
    ),
})

export type CheckBudgetInput = z.infer<typeof CheckBudgetSchema>

export const checkBudgetTool = {
  name: 'check_budget',
  description:
    'Check the remaining on-chain budget for the Agent Wallet. ' +
    'Returns per-transaction limit and period remaining. ' +
    'Optionally include any configured spend policy details.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      token: {
        type: 'string',
        description: 'Token address (default: ETH / zero address)',
      },
    },
    required: [],
  },
}

export async function handleCheckBudget(
  input: CheckBudgetInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const wallet = getWallet()
    const token = (input.token as Address | undefined) ?? zeroAddress

    const budget = await checkBudget(wallet, token)

    return {
      content: [
        textContent(
          JSON.stringify({
            token,
            perTxLimit: budget.perTxLimit.toString(),
            remainingInPeriod: budget.remainingInPeriod.toString(),
            policy: _policyConfig ?? null,
          })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'check_budget'))],
      isError: true,
    }
  }
}
