export interface AgentNode {
  id: string
  agentId: string
  type: 'input' | 'agent' | 'output'
  name: string
  description: string
  icon: string
  pricePerCall: number // in USDC (e.g., 0.0001)
  position: { x: number; y: number }
  category: 'text' | 'data' | 'utility' | 'market' | 'io'
  config?: Record<string, unknown>
}

export interface Connection {
  id: string
  sourceId: string
  targetId: string
}

export interface Workflow {
  id: string
  name: string
  nodes: AgentNode[]
  connections: Connection[]
  totalCost: number
}

export interface PaymentEvent {
  id: string
  fromNode: string
  toNode: string
  amount: number
  timestamp: number
  status?: 'simulated' | 'verified' | 'settled' | 'failed'
  transaction?: string
  settlementId?: string
  payer?: string
  recipient?: string
  token?: string
  network?: string
  errorReason?: string
}

export { AVAILABLE_AGENTS } from './agent-registry'

export function formatPrice(price: number): string {
  if (price === 0) return 'FREE'
  if (price < 0.001) return `$${price.toFixed(6)}`
  if (price < 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(3)}`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
