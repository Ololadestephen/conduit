import { NextResponse } from 'next/server'
import { listAgentsForApi } from '@/lib/agent-registry'

export async function GET() {
  return NextResponse.json({
    agents: listAgentsForApi().filter((agent) => agent.price > 0),
    message: 'Use POST /api/workflow/execute for Conduit simulated Arc USDC accounting.',
  })
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint',
      message: 'Direct payment calls are not active. Use /api/workflow/execute for workflow accounting.',
    },
    { status: 410 }
  )
}
