/**
 * Tests for bridge_usdc tool.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

vi.mock('agentwallet-sdk', () => ({
  createBridge: vi.fn(),
}))

// ─── Mock client utils ─────────────────────────────────────────────────────

vi.mock('../src/utils/client.js', () => ({
  getWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    publicClient: {},
    walletClient: { account: { address: '0xagent' } },
    chain: { id: 8453 },
  })),
}))

import { handleBridgeUsdc } from '../src/tools/bridge.js'
import { createBridge } from 'agentwallet-sdk'

const mockCreateBridge = vi.mocked(createBridge)

describe('bridge_usdc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bridges USDC from base to polygon successfully', async () => {
    const mockBridge = vi.fn().mockResolvedValue({
      burnTxHash: '0xburntx123',
      mintTxHash: '0xminttx456',
      fromChain: 'base',
      toChain: 'polygon',
      recipient: '0xagent',
      amount: 100000000n,
      elapsedMs: 12000,
    })
    mockCreateBridge.mockReturnValue({ bridge: mockBridge } as any)

    const result = await handleBridgeUsdc({
      fromChain: 'base',
      toChain: 'polygon',
      amount: '100',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.burnTxHash).toBe('0xburntx123')
    expect(data.mintTxHash).toBe('0xminttx456')
    expect(data.fromChain).toBe('base')
    expect(data.toChain).toBe('polygon')
    expect(data.amount).toBe('100')
    expect(data.rawAmount).toBe('100000000')
    expect(mockBridge).toHaveBeenCalledWith(100000000n, 'polygon')
  })

  it('returns error when fromChain equals toChain', async () => {
    mockCreateBridge.mockReturnValue({ bridge: vi.fn() } as any)

    const result = await handleBridgeUsdc({
      fromChain: 'base',
      toChain: 'base',
      amount: '50',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('bridge_usdc failed')
    expect(result.content[0].text).toContain('different')
  })

  it('returns error for invalid amount', async () => {
    mockCreateBridge.mockReturnValue({ bridge: vi.fn() } as any)

    const result = await handleBridgeUsdc({
      fromChain: 'base',
      toChain: 'arbitrum',
      amount: 'not-a-number',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('bridge_usdc failed')
  })

  it('returns error when bridge call fails', async () => {
    const mockBridge = vi.fn().mockRejectedValue(new Error('Circle attestation timeout'))
    mockCreateBridge.mockReturnValue({ bridge: mockBridge } as any)

    const result = await handleBridgeUsdc({
      fromChain: 'base',
      toChain: 'arbitrum',
      amount: '200',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('bridge_usdc failed')
    expect(result.content[0].text).toContain('Circle attestation timeout')
  })
})
