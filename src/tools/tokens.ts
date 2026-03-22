/**
 * tokens.ts — lookup_token, add_custom_token, list_chain_tokens tools.
 *
 * Wraps agentwallet-sdk v6 TokenRegistry for MCP access.
 */
import { z } from 'zod'
import { getGlobalRegistry } from 'agentwallet-sdk'
import { textContent, formatError } from '../utils/format.js'

// ─── lookup_token ──────────────────────────────────────────────────────────

export const LookupTokenSchema = z.object({
  symbol: z.string().describe('Token symbol, e.g. "USDC"'),
  chainId: z.number().int().describe('Chain ID, e.g. 8453 for Base Mainnet'),
})

export type LookupTokenInput = z.infer<typeof LookupTokenSchema>

export const lookupTokenTool = {
  name: 'lookup_token',
  description:
    'Look up a token by symbol and chain ID from the global token registry. ' +
    'Returns the token address, decimals, and metadata if found.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symbol: { type: 'string', description: 'Token symbol (e.g. "USDC", "WETH")' },
      chainId: { type: 'number', description: 'Chain ID (e.g. 8453 for Base Mainnet)' },
    },
    required: ['symbol', 'chainId'],
  },
}

export async function handleLookupToken(
  input: LookupTokenInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const registry = getGlobalRegistry()
    const token = registry.getToken(input.symbol.toUpperCase(), input.chainId)
    if (!token) {
      return {
        content: [
          textContent(
            JSON.stringify({ found: false, symbol: input.symbol, chainId: input.chainId })
          ),
        ],
      }
    }
    return {
      content: [textContent(JSON.stringify({ found: true, ...token }))],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'lookup_token'))],
      isError: true,
    }
  }
}

// ─── add_custom_token ──────────────────────────────────────────────────────

export const AddCustomTokenSchema = z.object({
  symbol: z.string().describe('Token symbol'),
  address: z.string().describe('Token contract address (0x-prefixed)'),
  decimals: z.number().int().min(0).max(18).describe('Token decimal precision'),
  chainId: z.number().int().describe('Chain ID where this token lives'),
  name: z.string().optional().describe('Human-readable token name (optional, defaults to symbol)'),
})

export type AddCustomTokenInput = z.infer<typeof AddCustomTokenSchema>

export const addCustomTokenTool = {
  name: 'add_custom_token',
  description:
    'Register a custom ERC-20 token in the global token registry so it can be used ' +
    'by send_token, get_balances, and swap_tokens.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symbol: { type: 'string', description: 'Token symbol' },
      address: { type: 'string', description: 'Token contract address (0x-prefixed)' },
      decimals: { type: 'number', description: 'Token decimal precision (0–18)' },
      chainId: { type: 'number', description: 'Chain ID' },
      name: { type: 'string', description: 'Human-readable name (optional)' },
    },
    required: ['symbol', 'address', 'decimals', 'chainId'],
  },
}

export async function handleAddCustomToken(
  input: AddCustomTokenInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const registry = getGlobalRegistry()
    registry.addToken({
      symbol: input.symbol.toUpperCase(),
      address: input.address as `0x${string}`,
      decimals: input.decimals,
      chainId: input.chainId,
      name: input.name ?? input.symbol,
    })
    const added = registry.getToken(input.symbol.toUpperCase(), input.chainId)
    return {
      content: [
        textContent(
          JSON.stringify({
            success: true,
            token: added,
          })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'add_custom_token'))],
      isError: true,
    }
  }
}

// ─── list_chain_tokens ─────────────────────────────────────────────────────

export const ListChainTokensSchema = z.object({
  chainId: z.number().int().describe('Chain ID to list tokens for, e.g. 8453'),
})

export type ListChainTokensInput = z.infer<typeof ListChainTokensSchema>

export const listChainTokensTool = {
  name: 'list_chain_tokens',
  description:
    'List all tokens registered for a given chain ID in the global token registry.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      chainId: { type: 'number', description: 'Chain ID (e.g. 8453 for Base Mainnet)' },
    },
    required: ['chainId'],
  },
}

export async function handleListChainTokens(
  input: ListChainTokensInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const registry = getGlobalRegistry()
    const tokens = registry.listTokens(input.chainId)
    return {
      content: [
        textContent(
          JSON.stringify({ chainId: input.chainId, count: tokens.length, tokens })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'list_chain_tokens'))],
      isError: true,
    }
  }
}
