import { NextRequest, NextResponse } from 'next/server'
import { clearWorkflowRunsForOwner, listWorkflowRunsForOwner } from '@/lib/run-storage'

export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get('owner')

    if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      return NextResponse.json({ error: 'Valid owner address is required' }, { status: 400 })
    }

    const runs = await listWorkflowRunsForOwner(owner)

    return NextResponse.json({
      success: true,
      runs,
    })
  } catch (error) {
    console.error('Owner run list error:', error)
    return NextResponse.json({ error: 'Failed to fetch owner runs' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get('owner')

    if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      return NextResponse.json({ error: 'Valid owner address is required' }, { status: 400 })
    }

    await clearWorkflowRunsForOwner(owner)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Owner run clear error:', error)
    return NextResponse.json({ error: 'Failed to clear owner runs' }, { status: 500 })
  }
}
