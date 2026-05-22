import { NextRequest, NextResponse } from 'next/server'
import {
  deleteWorkflowRunRecord,
  getWorkflowRunRecord,
  storeWorkflowRunRecord,
} from '@/lib/run-storage'
import type { WorkflowRun } from '@/lib/workflow-history'

const RUN_ID_REGEX = /^[a-zA-Z0-9_-]{3,80}$/

interface RouteContext {
  params: Promise<{ runId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params

    if (!RUN_ID_REGEX.test(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const run = await getWorkflowRunRecord(runId)

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      run,
    })
  } catch (error) {
    console.error('Run fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params

    if (!RUN_ID_REGEX.test(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const run = await request.json() as WorkflowRun

    if (!run || run.id !== runId || (run.status !== 'success' && run.status !== 'error')) {
      return NextResponse.json({ error: 'Invalid run record' }, { status: 400 })
    }

    const storage = await storeWorkflowRunRecord(run)

    if (!storage.stored) {
      return NextResponse.json({
        error: storage.reason || 'Run storage is not configured',
      }, { status: 503 })
    }

    return NextResponse.json({
      success: true,
      runId,
    })
  } catch (error) {
    console.error('Run store error:', error)
    return NextResponse.json({ error: 'Failed to store run' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params

    if (!RUN_ID_REGEX.test(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const owner = request.nextUrl.searchParams.get('owner') || undefined
    await deleteWorkflowRunRecord(runId, owner)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Run delete error:', error)
    return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 })
  }
}
