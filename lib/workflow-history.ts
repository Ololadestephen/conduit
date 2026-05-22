import { AgentNode, PaymentEvent } from './workflow-types'

export interface WorkflowRun {
  id: string
  timestamp: number
  nodes: AgentNode[]
  input: string
  output: unknown
  totalCost: number
  duration: number
  status: 'success' | 'error' | 'running'
  steps: WorkflowStep[]
  payments?: PaymentEvent[]
  paymentMode?: 'connected-wallet' | 'agent-wallet'
  settlementMode?: string
  ownerAddress?: string
}

export interface WorkflowStep {
  nodeId: string
  nodeName: string
  input: unknown
  output: unknown
  duration: number
  cost: number
  status: 'success' | 'error'
  payment?: {
    amount: number
    verified: boolean
    status: 'simulated' | 'verified' | 'free'
  } | null
}

const HISTORY_KEY = 'conduit_workflow_history'
const MAX_HISTORY = 10

function normalizeAddress(address: string | null | undefined): string | undefined {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return undefined
  }

  return address.toLowerCase()
}

// Store workflow run in localStorage
export function saveWorkflowRun(run: WorkflowRun): void {
  if (typeof window === 'undefined') return
  
  const history = getWorkflowHistory()
  const normalizedRun: WorkflowRun = {
    ...run,
    ownerAddress: normalizeAddress(run.ownerAddress),
  }
  history.unshift(normalizedRun)
  
  // Keep only the last MAX_HISTORY runs
  const trimmed = history.slice(0, MAX_HISTORY)
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
}

// Get workflow history from localStorage
export function getWorkflowHistory(): WorkflowRun[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return (JSON.parse(stored) as WorkflowRun[]).map((run) => ({
      ...run,
      ownerAddress: normalizeAddress(run.ownerAddress),
    }))
  } catch {
    return []
  }
}

export function getWorkflowHistoryForOwner(ownerAddress?: string | null): WorkflowRun[] {
  const normalizedOwner = normalizeAddress(ownerAddress)
  const history = getWorkflowHistory()

  if (!normalizedOwner) {
    return history
  }

  return history.filter((run) => normalizeAddress(run.ownerAddress) === normalizedOwner)
}

// Clear all workflow history
export function clearWorkflowHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_KEY)
}

// Delete a specific workflow run
export function deleteWorkflowRun(id: string): void {
  if (typeof window === 'undefined') return
  
  const history = getWorkflowHistory()
  const filtered = history.filter(run => run.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
}

export async function fetchRemoteWorkflowHistory(ownerAddress: string): Promise<WorkflowRun[]> {
  const normalizedOwner = normalizeAddress(ownerAddress)

  if (!normalizedOwner) {
    return []
  }

  try {
    const response = await fetch(`/api/runs?owner=${normalizedOwner}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    if (!data.success || !Array.isArray(data.runs)) {
      return []
    }

    return data.runs.map((run: WorkflowRun) => ({
      ...run,
      ownerAddress: normalizeAddress(run.ownerAddress),
    }))
  } catch {
    return []
  }
}

export function mergeWorkflowHistory(...sources: WorkflowRun[][]): WorkflowRun[] {
  const deduped = new Map<string, WorkflowRun>()

  for (const source of sources) {
    for (const run of source) {
      const current = deduped.get(run.id)
      if (!current || current.timestamp < run.timestamp) {
        deduped.set(run.id, {
          ...run,
          ownerAddress: normalizeAddress(run.ownerAddress),
        })
      }
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY)
}

// Format duration in a readable way
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Format timestamp
export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - ts
  
  // Less than a minute ago
  if (diffMs < 60000) return 'Just now'
  
  // Less than an hour ago
  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000)
    return `${mins}m ago`
  }
  
  // Less than a day ago
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000)
    return `${hours}h ago`
  }
  
  // Show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
