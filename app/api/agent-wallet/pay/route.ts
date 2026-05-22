import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ARC_USDC_ADDRESS, ARC_USDC_DECIMALS } from '@/lib/arc-chain'
import { DEMO_SELLER_ADDRESS } from '@/lib/agent-registry'

export const runtime = 'nodejs'

const TERMINAL_STATES = new Set(['CONFIRMED', 'COMPLETE', 'FAILED', 'DENIED', 'CANCELLED'])
const SUCCESS_STATES = new Set(['CONFIRMED', 'COMPLETE'])

const AgentWalletPaymentSchema = z.object({
  amount: z.number().positive().max(100),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).default(DEMO_SELLER_ADDRESS),
  refId: z.string().min(1).max(120).optional(),
})

function requiredEnv(key: string) {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`${key} is missing`)
  }
  return value
}

function formatUsdcAmount(amount: number) {
  return amount.toFixed(ARC_USDC_DECIMALS)
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Agent wallet payment failed'

  const responseError = error as Error & {
    response?: {
      data?: {
        message?: string
        errors?: Array<{ message?: string }>
      }
    }
  }
  const apiMessage = responseError.response?.data?.message
  const firstApiError = responseError.response?.data?.errors?.[0]?.message

  return firstApiError || apiMessage || error.message
}

function getTokenIdFromBalances(balances: Array<Record<string, unknown>>) {
  const arcUsdcAddress = ARC_USDC_ADDRESS.toLowerCase()

  for (const balance of balances) {
    const token = balance.token && typeof balance.token === 'object' ? balance.token as Record<string, unknown> : null
    const tokenAddress = String(token?.tokenAddress || '').toLowerCase()
    const tokenId = typeof token?.id === 'string' ? token.id : ''
    if (tokenAddress === arcUsdcAddress && tokenId) {
      return tokenId
    }
  }

  for (const balance of balances) {
    const token = balance.token && typeof balance.token === 'object' ? balance.token as Record<string, unknown> : null
    const tokenId = typeof token?.id === 'string' ? token.id : ''
    const symbol = String(token?.symbol || '').toUpperCase()
    const blockchain = String(token?.blockchain || '').toUpperCase()
    const isNative = token?.isNative === true
    if (tokenId && symbol === 'USDC' && blockchain === 'ARC-TESTNET' && isNative) {
      return tokenId
    }
  }

  for (const balance of balances) {
    const token = balance.token && typeof balance.token === 'object' ? balance.token as Record<string, unknown> : null
    const tokenId = typeof token?.id === 'string' ? token.id : ''
    const symbol = String(token?.symbol || '').toUpperCase()
    const blockchain = String(token?.blockchain || '').toUpperCase()
    if (tokenId && symbol === 'USDC' && blockchain === 'ARC-TESTNET') {
      return tokenId
    }
  }

  return null
}

function summarizeVisibleTokens(balances: Array<Record<string, unknown>>) {
  return balances
    .slice(0, 8)
    .map((balance) => {
      const token = balance.token && typeof balance.token === 'object' ? balance.token as Record<string, unknown> : null
      return [
        String(token?.symbol || token?.name || 'unknown'),
        String(token?.blockchain || 'unknown-chain'),
        String(token?.tokenAddress || 'native/no-address'),
        `amount=${String(balance.amount || '0')}`,
      ].join(' ')
    })
    .join('; ')
}

async function resolveCircleTokenId(
  client: Awaited<ReturnType<typeof import('@circle-fin/developer-controlled-wallets').initiateDeveloperControlledWalletsClient>>,
  walletId: string,
  walletAddress: string
) {
  const configuredTokenId = process.env.CIRCLE_ARC_USDC_TOKEN_ID?.trim()
  if (configuredTokenId) return configuredTokenId

  const allBalancesResponse = await client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
  })
  const allBalances = Array.isArray(allBalancesResponse.data?.tokenBalances)
    ? allBalancesResponse.data.tokenBalances as unknown as Array<Record<string, unknown>>
    : []
  const tokenIdFromAllBalances = getTokenIdFromBalances(allBalances)
  if (tokenIdFromAllBalances) return tokenIdFromAllBalances

  const filteredBalancesResponse = await client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
    tokenAddresses: [ARC_USDC_ADDRESS],
  })

  const filteredBalances = Array.isArray(filteredBalancesResponse.data?.tokenBalances)
    ? filteredBalancesResponse.data.tokenBalances as unknown as Array<Record<string, unknown>>
    : []
  const tokenIdFromFilteredBalances = getTokenIdFromBalances(filteredBalances)
  if (tokenIdFromFilteredBalances) return tokenIdFromFilteredBalances

  const response = await client.getWalletsWithBalances({
    blockchain: 'ARC-TESTNET',
    address: walletAddress,
    tokenAddress: ARC_USDC_ADDRESS,
  })

  const wallets = Array.isArray(response.data?.wallets) ? response.data.wallets as unknown as Array<Record<string, unknown>> : []
  const wallet = wallets.find((item) => String(item.address || '').toLowerCase() === walletAddress.toLowerCase()) || wallets[0]
  const balances = Array.isArray(wallet?.balances) ? wallet.balances as Array<Record<string, unknown>> : []
  const tokenIdFromWalletBalances = getTokenIdFromBalances(balances)
  if (tokenIdFromWalletBalances) return tokenIdFromWalletBalances

  const visibleTokens = summarizeVisibleTokens([...allBalances, ...filteredBalances, ...balances])
  throw new Error(
    visibleTokens
      ? `Circle cannot resolve Arc USDC for this wallet. Circle-visible tokens: ${visibleTokens}`
      : 'Circle cannot resolve Arc USDC for this wallet. Circle returned no token balances for the agent wallet.'
  )
}

async function waitForCircleTransaction(
  client: Awaited<ReturnType<typeof import('@circle-fin/developer-controlled-wallets').initiateDeveloperControlledWalletsClient>>,
  id: string,
  timeoutMs = 120_000
): Promise<Record<string, unknown>> {
  const startedAt = Date.now()
  let latestTransaction: Record<string, unknown> | undefined

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await client.getTransaction({ id })
    const transaction = data?.transaction as Record<string, unknown> | undefined
    latestTransaction = transaction
    const state = typeof transaction?.state === 'string' ? transaction.state : null

    if (state && TERMINAL_STATES.has(state)) {
      if (SUCCESS_STATES.has(state) && transaction) {
        return transaction
      }

      const reason = typeof transaction?.errorReason === 'string' ? transaction.errorReason : state
      throw new Error(`Circle agent wallet payment failed: ${reason}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }

  const state = typeof latestTransaction?.state === 'string' ? latestTransaction.state : 'unknown'
  throw new Error(`Circle agent wallet payment timed out in state ${state}`)
}

export async function POST(request: NextRequest) {
  try {
    const parseResult = AgentWalletPaymentSchema.safeParse(await request.json())

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid agent wallet payment request',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const apiKey = requiredEnv('CIRCLE_API_KEY')
    const entitySecret = requiredEnv('CIRCLE_ENTITY_SECRET')
    const walletId = requiredEnv('CIRCLE_AGENT_WALLET_ID')
    const walletAddress = requiredEnv('CIRCLE_AGENT_WALLET_ADDRESS')
    const blockchain = process.env.CIRCLE_BLOCKCHAIN?.trim() || 'ARC-TESTNET'
    if (blockchain !== 'ARC-TESTNET') {
      throw new Error(`Unsupported Circle blockchain for Conduit agent wallet: ${blockchain}`)
    }
    const { amount, recipient, refId } = parseResult.data
    const { initiateDeveloperControlledWalletsClient } = await import('@circle-fin/developer-controlled-wallets')

    const client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    })

    const tokenId = await resolveCircleTokenId(client, walletId, walletAddress)
    const payment = await client.createTransaction({
      walletId,
      tokenId,
      destinationAddress: recipient,
      amount: [formatUsdcAmount(amount)],
      refId: refId || `conduit-${randomUUID()}`,
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey: randomUUID(),
    })

    const settlementId = payment.data?.id
    if (!settlementId) {
      throw new Error('Circle did not return a transaction ID')
    }

    const transaction = await waitForCircleTransaction(client, settlementId)
    const txHash = typeof transaction.txHash === 'string' ? transaction.txHash : undefined

    return NextResponse.json({
      success: true,
      mode: 'circle-agent-wallet-transfer',
      network: blockchain,
      settlementId,
      txHash,
      state: transaction.state,
      payer: walletAddress,
      recipient,
      token: ARC_USDC_ADDRESS,
      amount: formatUsdcAmount(amount),
    })
  } catch (error) {
    console.error('Agent wallet payment error:', error)
    const message = getErrorMessage(error)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
