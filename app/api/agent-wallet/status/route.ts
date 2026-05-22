import { NextResponse } from 'next/server'

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

export async function GET() {
  const hasApiKey = isConfigured(process.env.CIRCLE_API_KEY)
  const hasEntitySecret = isConfigured(process.env.CIRCLE_ENTITY_SECRET)
  const hasWalletId = isConfigured(process.env.CIRCLE_AGENT_WALLET_ID)
  const hasWalletAddress = isConfigured(process.env.CIRCLE_AGENT_WALLET_ADDRESS)
  const blockchain = process.env.CIRCLE_BLOCKCHAIN || 'ARC-TESTNET'

  return NextResponse.json({
    success: true,
    mode: 'readiness',
    blockchain,
    ready: hasApiKey && hasEntitySecret && hasWalletId && hasWalletAddress,
    checks: {
      apiKey: hasApiKey,
      entitySecret: hasEntitySecret,
      walletId: hasWalletId,
      walletAddress: hasWalletAddress,
    },
    walletAddress: hasWalletAddress ? process.env.CIRCLE_AGENT_WALLET_ADDRESS : null,
  })
}
