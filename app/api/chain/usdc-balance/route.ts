import { NextRequest, NextResponse } from 'next/server'
import { formatUnits } from 'viem'
import { ARC_USDC_ADDRESS, ARC_USDC_DECIMALS } from '@/lib/arc-chain'

const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'

function encodeBalanceOf(address: string) {
  const cleanAddress = address.toLowerCase().replace(/^0x/, '')
  return `0x70a08231${cleanAddress.padStart(64, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address')

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const rpcResponse = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: ARC_USDC_ADDRESS,
            data: encodeBalanceOf(address),
          },
          'latest',
        ],
      }),
      cache: 'no-store',
    })

    if (!rpcResponse.ok) {
      return NextResponse.json({ error: 'Arc RPC balance lookup failed' }, { status: 502 })
    }

    const payload = await rpcResponse.json()

    if (payload.error) {
      return NextResponse.json(
        { error: payload.error.message || 'Arc RPC returned an error' },
        { status: 502 }
      )
    }

    const rawHex = typeof payload.result === 'string' ? payload.result : '0x0'
    const raw = BigInt(rawHex)
    const formatted = formatUnits(raw, ARC_USDC_DECIMALS)

    return NextResponse.json({
      success: true,
      address,
      token: ARC_USDC_ADDRESS,
      raw: raw.toString(),
      formatted,
      decimals: ARC_USDC_DECIMALS,
    })
  } catch (error) {
    console.error('USDC balance lookup error:', error)
    return NextResponse.json({ error: 'USDC balance lookup failed' }, { status: 500 })
  }
}
