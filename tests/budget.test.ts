/**
 * Tests for set_spend_policy and check_budget tools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

vi.mock('agentwallet-sdk', () => ({
  SpendingPolicy: vi.fn(),
  checkBudget: vi.fn(),
}))

// ─── Mock client utils ─────────────────────────────────────────────────────

vi.mock('../src/utils/client.js', () => ({
  getWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    publicClient: {},
    walletClient: {},
    contract: {},
    chain: { id: 8453 },
  })),
}))

import { handleSetSpendPolicy, handleCheckBudget, _resetPolicyStore } from '../src/tools/budget.js'
import { SpendingPolicy, checkBudget } from 'agentwallet-sdk'

const MockSpendingPolicy = vi.mocked(SpendingPolicy)
const mockCheckBudget = vi.mocked(checkBudget)

describe('set_spend_policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetPolicyStore()
    // Must use function (not arrow) so it works as a constructor with `new`
    MockSpendingPolicy.mockImplementation(function() { return { check: vi.fn() } } as any)
  })

  it('creates a policy with daily limit and per-tx cap', async () => {
    const result = await handleSetSpendPolicy({
      dailyLimitEth: '0.1',
      perTxCapEth: '0.01',
      allowedRecipients: [],
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.policy.dailyLimitEth).toBe('0.1')
    expect(data.policy.perTxCapEth).toBe('0.01')
    expect(MockSpendingPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        rollingCap: expect.objectContaining({ windowMs: 86_400_000 }),
        draftThreshold: expect.any(Number),
      })
    )
  })

  it('creates a policy with allowlisted recipients', async () => {
    const result = await handleSetSpendPolicy({
      allowedRecipients: ['0xabc', '0xdef'],
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.policy.allowedRecipients).toEqual(['0xabc', '0xdef'])
    expect(MockSpendingPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ merchantAllowlist: ['0xabc', '0xdef'] })
    )
  })

  it('creates a minimal policy with no limits', async () => {
    const result = await handleSetSpendPolicy({})

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.policy.dailyLimitEth).toBeNull()
    expect(data.policy.perTxCapEth).toBeNull()
  })

  it('returns error for invalid ETH amount', async () => {
    const result = await handleSetSpendPolicy({ dailyLimitEth: 'banana' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('set_spend_policy failed')
  })
})

describe('check_budget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetPolicyStore()
    MockSpendingPolicy.mockImplementation(function() { return { check: vi.fn() } } as any)
  })

  it('returns budget for ETH by default', async () => {
    mockCheckBudget.mockResolvedValue({
      token: '0x0000000000000000000000000000000000000000',
      perTxLimit: 10000000000000000n,
      remainingInPeriod: 90000000000000000n,
    } as any)

    const result = await handleCheckBudget({})

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.perTxLimit).toBe('10000000000000000')
    expect(data.remainingInPeriod).toBe('90000000000000000')
    expect(data.policy).toBeNull()
    expect(mockCheckBudget).toHaveBeenCalledWith(
      expect.anything(),
      '0x0000000000000000000000000000000000000000'
    )
  })

  it('includes policy config when policy has been set', async () => {
    // First set a policy
    await handleSetSpendPolicy({ dailyLimitEth: '0.5' })

    mockCheckBudget.mockResolvedValue({
      token: '0x0000000000000000000000000000000000000000',
      perTxLimit: 1000000000000000000n,
      remainingInPeriod: 500000000000000000n,
    } as any)

    const result = await handleCheckBudget({})

    const data = JSON.parse(result.content[0].text)
    expect(data.policy).not.toBeNull()
    expect(data.policy.dailyLimitEth).toBe('0.5')
  })

  it('returns error when checkBudget fails', async () => {
    mockCheckBudget.mockRejectedValue(new Error('Contract not deployed'))

    const result = await handleCheckBudget({})

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('check_budget failed')
    expect(result.content[0].text).toContain('Contract not deployed')
  })
})
