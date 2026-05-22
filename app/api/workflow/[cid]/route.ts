import { NextRequest, NextResponse } from 'next/server'
import { fetchFromIPFS, isValidCID } from '@/lib/ipfs-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params

  if (!cid || !isValidCID(cid)) {
    return NextResponse.json(
      { error: 'Invalid CID' },
      { status: 400 }
    )
  }

  try {
    const workflow = await fetchFromIPFS(cid)

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cid,
      workflow,
    })
  } catch (error) {
    console.error('IPFS fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    )
  }
}
