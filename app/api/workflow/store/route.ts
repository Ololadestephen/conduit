import { NextRequest, NextResponse } from 'next/server'
import { serializeWorkflow, uploadToIPFS, buildIPFSShareURL } from '@/lib/ipfs-storage'
import { StoreWorkflowRequestSchema } from '@/lib/validation-schemas'
import { storageRateLimiter, getClientIdentifier, checkRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (stricter for storage to prevent spam uploads)
    const identifier = getClientIdentifier(request)
    const { allowed, result: rateLimitResult, response: rateLimitResponse } = 
      await checkRateLimit(storageRateLimiter, identifier)
    
    if (!allowed && rateLimitResponse) {
      return rateLimitResponse
    }

    const rawBody = await request.json()
    
    // Validate request body with Zod schema
    const parseResult = StoreWorkflowRequestSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: parseResult.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const { nodes, name, description, creator, tags } = parseResult.data

    // Serialize workflow for IPFS
    const workflowMetadata = serializeWorkflow(nodes, {
      name,
      description,
      creator,
      tags,
    })

    // Get Pinata JWT from environment (optional)
    const pinataJwt = process.env.PINATA_JWT

    // Upload to IPFS
    const { cid, url } = await uploadToIPFS(workflowMetadata, pinataJwt)

    // Build share URL
    const shareUrl = buildIPFSShareURL(cid)

    const response = NextResponse.json({
      success: true,
      cid,
      ipfsUrl: url,
      shareUrl,
      workflow: workflowMetadata,
    })
    
    return addRateLimitHeaders(response, rateLimitResult)
  } catch (error) {
    console.error('IPFS storage error:', error)
    return NextResponse.json(
      { error: 'Failed to store workflow' },
      { status: 500 }
    )
  }
}
