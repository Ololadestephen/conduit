import { NextResponse } from 'next/server'
import { listAgentsForApi } from '@/lib/agent-registry'
import type { AgentId } from '@/lib/agent-registry'

export type { AgentId }

export async function GET() {
  return NextResponse.json({
    agents: listAgentsForApi(),
  })
}
