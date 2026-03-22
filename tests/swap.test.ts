/**
 * Tests for swap_tokens tool.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

vi.mock('agentwallet-sdk', () => ({
  getGlobalRegistry: vi.fn(),
  attachSwap: vi.fn(),
  parseAmount: vi.fn((amount: string, decimals: number) =>
    BigInt(Math.round(parseFloat(amount) * 10 ** decimals))
  ),
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

import { handleSwapTokens } from '../src/tools/swap.js'
import { getGlobalRegistry, attachSwap } from 'agentwallet-sdk'

const mockGetGlobalRegistry = vi.mocked(getGlobalRegistry)
const mockAttachSwap = vi.mocked(attachSwap)

const USDC = {
  symbol: 'USDC',
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  decimals: 6,
  chainId: 8453,
}

const WETH = {
  symbol: 'WETH',
  address: '0x4200000000000000000000000000000000000006',
  decimals: 18,
  chainId: 8453,
}

describe('swap_tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('swaps USDC to WETH successfully', async () => {
    const mockSwap = vi.fn().mockResolvedValue({
      txHash: '0xswaptx123',
      feeTxHash: null,
      approvalRequired: true,
      approvalTxHash: '0xapprovaltx',
      quote: {
        amountInNet: 100000000n,
        amountOutMinimum: 50000000000000000n,
        poolFeeTier: 500,
        feeAmount: 0n,
        gasEstimate: 150000n,
      },
    })
    mockGetGlobalRegistry.mockReturnValue({
      getToken: vi.fn()
        .mockReturnValueOnce(USDC)
        .mockReturnValueOnce(WETH),
    } as any)
    mockAttachSwap.mockReturnValue({ swap: mockSwap } as any)

    const result = await handleSwapTokens({
      fromSymbol: 'USDC',
      toSymbol: 'WETH',
      amount: '100',
      chainId: 8453,
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.txHash).toBe('0xswaptx123')
    expect(data.fromToken).toBe('USDC')
    expect(data.toToken).toBe('WETH')
    expect(data.chainId).toBe(8453)
    expect(mockSwap).toHaveBeenCalledWith(
      USDC.address,
      WETH.address,
      expect.any(BigInt),
      { slippageBps: undefined }
    )
  })

  it('applies custom slippageBps', async () => {
    const mockSwap = vi.fn().mockResolvedValue({
      txHash: '0xswaptx456',
      quote: { amountInNet: 1n, amountOutMinimum: 1n, poolFeeTier: 500, feeAmount: 0n, gasEstimate: 100000n },
    })
    mockGetGlobalRegistry.mockReturnValue({
      getToken: vi.fn().mockReturnValueOnce(USDC).mockReturnValueOnce(WETH),
    } as any)
    mockAttachSwap.mockReturnValue({ swap: mockSwap } as any)

    await handleSwapTokens({
      fromSymbol: 'USDC',
      toSymbol: 'WETH',
      amount: '50',
      chainId: 8453,
      slippageBps: 100,
    })

    expect(mockSwap).toHaveBeenCalledWith(
      USDC.address,
      WETH.address,
      expect.any(BigInt),
      { slippageBps: 100 }
    )
  })

  it('returns error when fromToken not found', async () => {
    mockGetGlobalRegistry.mockReturnValue({
      getToken: vi.fn().mockReturnValueOnce(undefined),
    } as any)
    mockAttachSwap.mockReturnValue({ swap: vi.fn() } as any)

    const result = await handleSwapTokens({
      fromSymbol: 'NOTFOUND',
      toSymbol: 'WETH',
      amount: '10',
      chainId: 8453,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('swap_tokens failed')
    expect(result.content[0].text).toContain('NOTFOUND')
  })

  it('returns error when toToken not found', async () => {
    mockGetGlobalRegistry.mockReturnValue({
      getToken: vi.fn().mockReturnValueOnce(USDC).mockReturnValueOnce(undefined),
    } as any)
    mockAttachSwap.mockReturnValue({ swap: vi.fn() } as any)

    const result = await handleSwapTokens({
      fromSymbol: 'USDC',
      toSymbol: 'NOTFOUND',
      amount: '10',
      chainId: 8453,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('swap_tokens failed')
  })

  it('returns error when swap fails', async () => {
    const mockSwap = vi.fn().mockRejectedValue(new Error('Insufficient liquidity'))
    mockGetGlobalRegistry.mockReturnValue({
      getToken: vi.fn().mockReturnValueOnce(USDC).mockReturnValueOnce(WETH),
    } as any)
    mockAttachSwap.mockReturnValue({ swap: mockSwap } as any)

    const result = await handleSwapTokens({
      fromSymbol: 'USDC',
      toSymbol: 'WETH',
      amount: '10000',
      chainId: 8453,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('swap_tokens failed')
    expect(result.content[0].text).toContain('Insufficient liquidity')
  })
})
