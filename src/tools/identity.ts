/**
 * identity.ts — verify_agent_identity, get_reputation tools.
 *
 * Wraps agentwallet-sdk v6 ERC8004Client + ReputationClient.
 */
import { z } from 'zod'
import { ERC8004Client, ReputationClient } from 'agentwallet-sdk'
import type { Address } from 'viem'
import { getConfig } from '../utils/client.js'
import { textContent, formatError } from '../utils/format.js'

// ─── Chain ID → chain name mapping ────────────────────────────────────────

type SupportedIdentityChain =
  | 'base'
  | 'base-sepolia'
  | 'ethereum'
  | 'arbitrum'
  | 'arbitrum-sepolia'
  | 'polygon'

const CHAIN_ID_TO_NAME: Record<number, SupportedIdentityChain> = {
  1: 'ethereum',
  8453: 'base',
  84532: 'base-sepolia',
  42161: 'arbitrum',
  421614: 'arbitrum-sepolia',
  137: 'polygon',
}

function getChainName(chainId: number): SupportedIdentityChain {
  const name = CHAIN_ID_TO_NAME[chainId]
  if (!name) throw new Error(`Unsupported chain ID for identity: ${chainId}`)
  return name
}

// ─── verify_agent_identity ─────────────────────────────────────────────────

export const VerifyAgentIdentitySchema = z.object({
  agentAddress: z
    .string()
    .describe('Agent owner address to verify identity for (0x-prefixed)'),
})

export type VerifyAgentIdentityInput = z.infer<typeof VerifyAgentIdentitySchema>

export const verifyAgentIdentityTool = {
  name: 'verify_agent_identity',
  description:
    'Verify an agent\'s on-chain identity using ERC-8004. ' +
    'Looks up the agent by owner address and returns identity details ' +
    'including agent ID, URI, and registration file.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      agentAddress: {
        type: 'string',
        description: 'Agent owner address (0x-prefixed)',
      },
    },
    required: ['agentAddress'],
  },
}

export async function handleVerifyAgentIdentity(
  input: VerifyAgentIdentityInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const config = getConfig()
    const chainName = getChainName(config.chainId)

    const client = new ERC8004Client({ chain: chainName })

    const identity = await client.lookupAgentByOwner(input.agentAddress as Address)

    if (!identity) {
      return {
        content: [
          textContent(
            JSON.stringify({
              found: false,
              agentAddress: input.agentAddress,
              chain: chainName,
            })
          ),
        ],
      }
    }

    return {
      content: [
        textContent(
          JSON.stringify({
            found: true,
            agentId: identity.agentId.toString(),
            owner: identity.owner,
            agentWallet: identity.agentWallet,
            agentURI: identity.agentURI,
            registrationFile: identity.registrationFile,
            modelMetadata: identity.modelMetadata ?? null,
            chain: chainName,
          })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'verify_agent_identity'))],
      isError: true,
    }
  }
}

// ─── get_reputation ────────────────────────────────────────────────────────

export const GetReputationSchema = z.object({
  agentAddress: z
    .string()
    .describe('Agent owner address to look up reputation for (0x-prefixed)'),
})

export type GetReputationInput = z.infer<typeof GetReputationSchema>

export const getReputationTool = {
  name: 'get_reputation',
  description:
    'Get the on-chain reputation score for an agent. ' +
    'Resolves agent ID from owner address via ERC-8004, ' +
    'then queries the Reputation Registry for score and feedback.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      agentAddress: {
        type: 'string',
        description: 'Agent owner address (0x-prefixed)',
      },
    },
    required: ['agentAddress'],
  },
}

export async function handleGetReputation(
  input: GetReputationInput
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const config = getConfig()
    const chainName = getChainName(config.chainId)

    // Step 1: resolve agentId from owner address
    const identityClient = new ERC8004Client({ chain: chainName })
    const identity = await identityClient.lookupAgentByOwner(input.agentAddress as Address)

    if (!identity) {
      return {
        content: [
          textContent(
            JSON.stringify({
              found: false,
              agentAddress: input.agentAddress,
              chain: chainName,
              message: 'No registered agent identity found for this address.',
            })
          ),
        ],
      }
    }

    // Step 2: query reputation
    const reputationClient = new ReputationClient({ chain: chainName })
    const reputation = await reputationClient.getAgentReputation(identity.agentId)

    return {
      content: [
        textContent(
          JSON.stringify({
            found: true,
            agentAddress: input.agentAddress,
            agentId: identity.agentId.toString(),
            chain: chainName,
            reputation: {
              count: reputation.count.toString(),
              totalScore: reputation.totalScore.toString(),
              avgCategory: reputation.avgCategory,
              clients: reputation.clients,
            },
          })
        ),
      ],
    }
  } catch (error: unknown) {
    return {
      content: [textContent(formatError(error, 'get_reputation'))],
      isError: true,
    }
  }
}
