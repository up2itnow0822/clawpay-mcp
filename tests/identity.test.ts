/**
 * Tests for verify_agent_identity and get_reputation tools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

vi.mock('agentwallet-sdk', () => ({
  ERC8004Client: vi.fn(),
  ReputationClient: vi.fn(),
}))

// ─── Mock client utils ─────────────────────────────────────────────────────

vi.mock('../src/utils/client.js', () => ({
  getConfig: vi.fn(() => ({
    chainId: 8453,
    walletAddress: '0x1234567890123456789012345678901234567890',
  })),
}))

import { handleVerifyAgentIdentity, handleGetReputation } from '../src/tools/identity.js'
import { ERC8004Client, ReputationClient } from 'agentwallet-sdk'

const MockERC8004Client = vi.mocked(ERC8004Client)
const MockReputationClient = vi.mocked(ReputationClient)

const MOCK_IDENTITY = {
  agentId: 42n,
  owner: '0xowner000000000000000000000000000000000001',
  agentWallet: '0xwallet00000000000000000000000000000000001',
  agentURI: 'data:application/json,{"type":"agent-registration"}',
  registrationFile: { type: 'agent-registration', name: 'TestAgent' },
  modelMetadata: null,
}

describe('verify_agent_identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns identity when agent is registered', async () => {
    const mockLookupAgentByOwner = vi.fn().mockResolvedValue(MOCK_IDENTITY)
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: mockLookupAgentByOwner }
    } as any)

    const result = await handleVerifyAgentIdentity({
      agentAddress: '0xowner000000000000000000000000000000000001',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(true)
    expect(data.agentId).toBe('42')
    expect(data.owner).toBe(MOCK_IDENTITY.owner)
    expect(data.chain).toBe('base')
    expect(MockERC8004Client).toHaveBeenCalledWith({ chain: 'base' })
  })

  it('returns found=false when agent not registered', async () => {
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: vi.fn().mockResolvedValue(null) }
    } as any)

    const result = await handleVerifyAgentIdentity({
      agentAddress: '0xunregistered0000000000000000000000000001',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(false)
    expect(data.agentAddress).toBe('0xunregistered0000000000000000000000000001')
  })

  it('returns error when ERC8004Client call fails', async () => {
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: vi.fn().mockRejectedValue(new Error('RPC timeout')) }
    } as any)

    const result = await handleVerifyAgentIdentity({
      agentAddress: '0xowner000000000000000000000000000000000001',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('verify_agent_identity failed')
    expect(result.content[0].text).toContain('RPC timeout')
  })
})

describe('get_reputation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns reputation score for registered agent', async () => {
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: vi.fn().mockResolvedValue(MOCK_IDENTITY) }
    } as any)
    MockReputationClient.mockImplementation(function() {
      return {
        getAgentReputation: vi.fn().mockResolvedValue({
          count: 10n,
          totalScore: 85n,
          avgCategory: 'helpful',
          clients: ['0xclient1', '0xclient2'],
        }),
      }
    } as any)

    const result = await handleGetReputation({
      agentAddress: '0xowner000000000000000000000000000000000001',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(true)
    expect(data.agentId).toBe('42')
    expect(data.reputation.count).toBe('10')
    expect(data.reputation.totalScore).toBe('85')
    expect(data.reputation.avgCategory).toBe('helpful')
  })

  it('returns found=false when identity not registered', async () => {
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: vi.fn().mockResolvedValue(null) }
    } as any)

    const result = await handleGetReputation({
      agentAddress: '0xunregistered0000000000000000000000000001',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(false)
    expect(MockReputationClient).not.toHaveBeenCalled()
  })

  it('returns error when reputation query fails', async () => {
    MockERC8004Client.mockImplementation(function() {
      return { lookupAgentByOwner: vi.fn().mockResolvedValue(MOCK_IDENTITY) }
    } as any)
    MockReputationClient.mockImplementation(function() {
      return { getAgentReputation: vi.fn().mockRejectedValue(new Error('Reputation contract not found')) }
    } as any)

    const result = await handleGetReputation({
      agentAddress: '0xowner000000000000000000000000000000000001',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('get_reputation failed')
    expect(result.content[0].text).toContain('Reputation contract not found')
  })
})
