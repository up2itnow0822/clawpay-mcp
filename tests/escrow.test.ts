/**
 * Tests for create_escrow tool.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

vi.mock('agentwallet-sdk', () => ({
  MutualStakeEscrow: vi.fn(),
}))

// ─── Mock client utils ─────────────────────────────────────────────────────

vi.mock('../src/utils/client.js', () => ({
  getConfig: vi.fn(() => ({
    chainId: 8453,
    walletAddress: '0x1234567890123456789012345678901234567890',
    factoryAddress: '0xfactory0000000000000000000000000000000001',
  })),
  getWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    publicClient: {},
    walletClient: { account: { address: '0xbuyer000000000000000000000000000000000001' } },
    chain: { id: 8453 },
  })),
}))

import { handleCreateEscrow } from '../src/tools/escrow.js'
import { MutualStakeEscrow } from 'agentwallet-sdk'

const MockMutualStakeEscrow = vi.mocked(MutualStakeEscrow)

describe('create_escrow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an escrow successfully with factory from config', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      address: '0xvault000000000000000000000000000000000001',
      txHash: '0xescrowtx123',
    })
    MockMutualStakeEscrow.mockImplementation(function() { return { create: mockCreate } } as any)

    const result = await handleCreateEscrow({
      counterpartyAddress: '0xseller00000000000000000000000000000000001',
      stakeAmount: '100',
      terms: 'Build a website for 100 USDC',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.vaultAddress).toBe('0xvault000000000000000000000000000000000001')
    expect(data.txHash).toBe('0xescrowtx123')
    expect(data.seller).toBe('0xseller00000000000000000000000000000000001')
    expect(data.paymentAmount).toBe('100')
    expect(data.terms).toBe('Build a website for 100 USDC')

    expect(MockMutualStakeEscrow).toHaveBeenCalledWith(
      expect.objectContaining({
        factoryAddress: '0xfactory0000000000000000000000000000000001',
        chainId: 8453,
      })
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        seller: '0xseller00000000000000000000000000000000001',
        paymentAmount: 100000000n,
        buyerStake: 100000000n,
        sellerStake: 100000000n,
        verifier: 'optimistic',
      })
    )
  })

  it('uses factoryAddress param over config', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      address: '0xvault000000000000000000000000000000000002',
      txHash: '0xescrowtx456',
    })
    MockMutualStakeEscrow.mockImplementation(function() { return { create: mockCreate } } as any)

    await handleCreateEscrow({
      counterpartyAddress: '0xseller00000000000000000000000000000000001',
      stakeAmount: '50',
      terms: 'Custom terms',
      factoryAddress: '0xcustomfactory000000000000000000000000001',
    })

    expect(MockMutualStakeEscrow).toHaveBeenCalledWith(
      expect.objectContaining({
        factoryAddress: '0xcustomfactory000000000000000000000000001',
      })
    )
  })

  it('returns error for invalid stakeAmount', async () => {
    MockMutualStakeEscrow.mockImplementation(function() { return { create: vi.fn() } } as any)

    const result = await handleCreateEscrow({
      counterpartyAddress: '0xseller00000000000000000000000000000000001',
      stakeAmount: 'not-a-number',
      terms: 'Bad amount test',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('create_escrow failed')
  })

  it('returns error when escrow creation fails', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Factory not deployed'))
    MockMutualStakeEscrow.mockImplementation(function() { return { create: mockCreate } } as any)

    const result = await handleCreateEscrow({
      counterpartyAddress: '0xseller00000000000000000000000000000000001',
      stakeAmount: '100',
      terms: 'Test terms',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('create_escrow failed')
    expect(result.content[0].text).toContain('Factory not deployed')
  })
})
