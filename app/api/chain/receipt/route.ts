import { NextRequest, NextResponse } from 'next/server'

const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'

interface RpcReceipt {
  status?: string
  transactionHash?: string
  blockHash?: string
  blockNumber?: string
  from?: string
  to?: string
  logs?: unknown[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const txHash = body?.txHash

    if (typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid transaction hash' }, { status: 400 })
    }

    const rpcResponse = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
      cache: 'no-store',
    })

    if (!rpcResponse.ok) {
      return NextResponse.json(
        { error: 'Arc RPC receipt lookup failed' },
        { status: 502 }
      )
    }

    const payload = await rpcResponse.json()

    if (payload.error) {
      return NextResponse.json(
        { error: payload.error.message || 'Arc RPC returned an error' },
        { status: 502 }
      )
    }

    const receipt = payload.result as RpcReceipt | null

    if (!receipt) {
      return NextResponse.json({
        confirmed: false,
        status: 'pending',
        receipt: null,
      })
    }

    return NextResponse.json({
      confirmed: receipt.status === '0x1',
      status: receipt.status === '0x1' ? 'success' : 'failed',
      receipt,
    })
  } catch (error) {
    console.error('Receipt lookup error:', error)
    return NextResponse.json(
      { error: 'Receipt lookup failed' },
      { status: 500 }
    )
  }
}
