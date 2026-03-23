/**
 * Tests for lookup_token, add_custom_token, list_chain_tokens tools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock agentwallet-sdk ──────────────────────────────────────────────────

const mockGetToken = vi.fn()
const mockAddToken = vi.fn()
const mockListTokens = vi.fn()

const mockRegistry = {
  getToken: mockGetToken,
  addToken: mockAddToken,
  listTokens: mockListTokens,
}

vi.mock('agentwallet-sdk', () => ({
  getGlobalRegistry: vi.fn(() => mockRegistry),
}))

import {
  handleLookupToken,
  handleAddCustomToken,
  handleListChainTokens,
} from '../src/tools/tokens.js'

describe('lookup_token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns token when found in registry', async () => {
    const tokenEntry = {
      symbol: 'USDC',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      chainId: 8453,
      name: 'USD Coin',
      isNative: false,
    }
    mockGetToken.mockReturnValue(tokenEntry)

    const result = await handleLookupToken({ symbol: 'USDC', chainId: 8453 })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(true)
    expect(data.symbol).toBe('USDC')
    expect(data.decimals).toBe(6)
    expect(mockGetToken).toHaveBeenCalledWith('USDC', 8453)
  })

  it('returns found=false when token not in registry', async () => {
    mockGetToken.mockReturnValue(undefined)

    const result = await handleLookupToken({ symbol: 'FAKE', chainId: 8453 })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.found).toBe(false)
    expect(data.symbol).toBe('FAKE')
  })

  it('uppercases the symbol before lookup', async () => {
    mockGetToken.mockReturnValue(undefined)

    await handleLookupToken({ symbol: 'usdc', chainId: 8453 })

    expect(mockGetToken).toHaveBeenCalledWith('USDC', 8453)
  })

  it('returns error content if registry throws', async () => {
    mockGetToken.mockImplementation(() => { throw new Error('Registry failure') })

    const result = await handleLookupToken({ symbol: 'USDC', chainId: 8453 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('lookup_token failed')
  })
})

describe('add_custom_token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds token and returns success', async () => {
    const tokenEntry = {
      symbol: 'MYTOKEN',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 18,
      chainId: 8453,
      name: 'My Token',
      isNative: false,
    }
    mockAddToken.mockImplementation(() => {})
    mockGetToken.mockReturnValue(tokenEntry)

    const result = await handleAddCustomToken({
      symbol: 'MYTOKEN',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 18,
      chainId: 8453,
      name: 'My Token',
    })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(mockAddToken).toHaveBeenCalledWith({
      symbol: 'MYTOKEN',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 18,
      chainId: 8453,
      name: 'My Token',
    })
  })

  it('defaults name to symbol if not provided', async () => {
    mockAddToken.mockImplementation(() => {})
    mockGetToken.mockReturnValue({
      symbol: 'NONAME',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 8,
      chainId: 1,
      name: 'NONAME',
    })

    await handleAddCustomToken({
      symbol: 'NONAME',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 8,
      chainId: 1,
    })

    expect(mockAddToken).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NONAME' })
    )
  })

  it('returns error if addToken throws', async () => {
    mockAddToken.mockImplementation(() => { throw new Error('Duplicate token') })

    const result = await handleAddCustomToken({
      symbol: 'BAD',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      decimals: 18,
      chainId: 8453,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('add_custom_token failed')
  })
})

describe('list_chain_tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all tokens for a chain', async () => {
    const tokens = [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, chainId: 8453 },
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, chainId: 8453 },
    ]
    mockListTokens.mockReturnValue(tokens)

    const result = await handleListChainTokens({ chainId: 8453 })

    expect(result.isError).toBeUndefined()
    const data = JSON.parse(result.content[0].text)
    expect(data.chainId).toBe(8453)
    expect(data.count).toBe(2)
    expect(data.tokens).toHaveLength(2)
    expect(mockListTokens).toHaveBeenCalledWith(8453)
  })

  it('returns empty array for unknown chain', async () => {
    mockListTokens.mockReturnValue([])

    const result = await handleListChainTokens({ chainId: 99999 })

    const data = JSON.parse(result.content[0].text)
    expect(data.count).toBe(0)
    expect(data.tokens).toHaveLength(0)
  })

  it('returns error if registry throws', async () => {
    mockListTokens.mockImplementation(() => { throw new Error('Registry error') })

    const result = await handleListChainTokens({ chainId: 8453 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('list_chain_tokens failed')
  })
})
