import type { AgentNode } from './workflow-types'

// IPFS Gateway URLs
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs',
]

// Workflow metadata structure stored on IPFS
export interface WorkflowIPFSMetadata {
  version: '1.0'
  name: string
  description?: string
  creator: string
  createdAt: string
  nodes: SerializedWorkflowNode[]
  totalCost: number
  network: string
  tags?: string[]
}

export interface SerializedWorkflowNode {
  id: string
  agentId: string
  name: string
  description: string
  pricePerCall: number
  type: 'input' | 'agent' | 'output'
  category: string
  position?: number
}

type WorkflowNodeForStorage = Pick<
  AgentNode,
  'id' | 'agentId' | 'name' | 'pricePerCall'
> & {
  description?: string
  type: string
  category?: string
}

// Serialize workflow nodes for IPFS storage
export function serializeWorkflow(
  nodes: WorkflowNodeForStorage[],
  metadata: {
    name: string
    description?: string
    creator: string
    tags?: string[]
  }
): WorkflowIPFSMetadata {
  const serializedNodes: SerializedWorkflowNode[] = nodes.map((node, index) => ({
    id: node.id,
    agentId: node.agentId,
    name: node.name,
    description: node.description || '',
    pricePerCall: node.pricePerCall,
    type: node.type as SerializedWorkflowNode['type'],
    category: node.category || 'utility',
    position: index,
  }))

  const totalCost = nodes.reduce((sum, node) => sum + node.pricePerCall, 0)

  return {
    version: '1.0',
    name: metadata.name,
    description: metadata.description,
    creator: metadata.creator,
    createdAt: new Date().toISOString(),
    nodes: serializedNodes,
    totalCost,
    network: 'eip155:5042002',
    tags: metadata.tags,
  }
}

// Upload workflow to IPFS via Pinata
export async function uploadToIPFS(
  workflow: WorkflowIPFSMetadata,
  pinataJwt?: string
): Promise<{ cid: string; url: string }> {
  // If no Pinata JWT, use local simulation for demo
  if (!pinataJwt) {
    // Generate a mock CID for demo purposes
    const mockCid = generateMockCID(JSON.stringify(workflow))
    return {
      cid: mockCid,
      url: `${IPFS_GATEWAYS[0]}/${mockCid}`,
    }
  }

  // Upload to Pinata
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: JSON.stringify({
      pinataContent: workflow,
      pinataMetadata: {
        name: `conduit-${workflow.name}-${Date.now()}`,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`)
  }

  const data = await response.json()
  const cid = data.IpfsHash

  return {
    cid,
    url: `${IPFS_GATEWAYS[0]}/${cid}`,
  }
}

// Fetch workflow from IPFS
export async function fetchFromIPFS(cid: string): Promise<WorkflowIPFSMetadata | null> {
  // Try multiple gateways
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}/${cid}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (response.ok) {
        const data = await response.json()
        return data as WorkflowIPFSMetadata
      }
    } catch {
      // Try next gateway
      continue
    }
  }

  return null
}

// Generate a mock CID for demo (deterministic based on content)
function generateMockCID(content: string): string {
  // Simple hash function for demo purposes
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  // Format as a CIDv1-like string
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0')
  return `bafybeig${hashHex}${Date.now().toString(16).slice(-8)}`
}

// Validate CID format
export function isValidCID(cid: string): boolean {
  // Basic CIDv0 (Qm...) or CIDv1 (bafy...) validation
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
  const cidv1Regex = /^bafy[a-z2-7]{52,}$/i
  
  return cidv0Regex.test(cid) || cidv1Regex.test(cid) || cid.startsWith('bafybeig')
}

// Build shareable URL with IPFS CID
export function buildIPFSShareURL(cid: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://conduit.app'
  
  return `${baseUrl}/workflow/${cid}`
}
