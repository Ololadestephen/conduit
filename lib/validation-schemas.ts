import { z } from 'zod'

// Maximum input lengths for security
const MAX_INPUT_LENGTH = 50000
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_NODES = 20

// Agent IDs (validated against known agents)
const VALID_AGENT_IDS = [
  'text-input',
  'summarizer', 
  'translator',
  'sentiment',
  'code-reviewer',
  'data-enrichment',
  'json-transform',
  'autonomous-signal-desk',
  'market-opportunity-scanner',
  'market-discovery',
  'market-researcher',
  'source-credibility',
  'adversarial-reviewer',
  'probability-estimator',
  'kelly-sizer',
  'portfolio-risk',
  'betting-brief',
  'api-output',
  'webhook',
] as const

export const AgentIdSchema = z.enum(VALID_AGENT_IDS)

// Workflow node schema
export const WorkflowNodeSchema = z.object({
  id: z.string().min(1).max(100),
  agentId: AgentIdSchema,
  config: z.record(z.unknown()).optional(),
})

// Workflow execution request schema
export const WorkflowExecutionRequestSchema = z.object({
  nodes: z.array(WorkflowNodeSchema)
    .min(1, 'At least one node is required')
    .max(MAX_NODES, `Maximum ${MAX_NODES} nodes allowed`),
  input: z.string()
    .max(MAX_INPUT_LENGTH, `Input must be less than ${MAX_INPUT_LENGTH} characters`),
  payment: z.object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash').optional(),
    settlementId: z.string().min(1).max(120).optional(),
    mode: z.string().min(1).max(80).optional(),
    payer: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payer address'),
    token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
    recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address'),
  }).refine((payment) => payment.txHash || payment.settlementId, {
    message: 'Payment requires a transaction hash or settlement ID',
  }).optional(),
  payments: z.array(z.object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash').optional(),
    settlementId: z.string().min(1).max(120).optional(),
    mode: z.string().min(1).max(80).optional(),
    payer: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payer address'),
    token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
    recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address'),
    amount: z.number().positive().optional(),
    nodeIds: z.array(z.string().min(1).max(100)).optional(),
  }).refine((payment) => payment.txHash || payment.settlementId, {
    message: 'Payment requires a transaction hash or settlement ID',
  })).optional(),
})

// Store workflow request schema
export const StoreWorkflowRequestSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    agentId: z.string(),
    pricePerCall: z.number(),
    category: z.string().optional(),
    description: z.string().optional(),
    config: z.record(z.unknown()).optional(),
  }))
    .min(1, 'At least one node is required')
    .max(MAX_NODES, `Maximum ${MAX_NODES} nodes allowed`),
  name: z.string()
    .min(1, 'Name is required')
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`),
  description: z.string()
    .max(MAX_DESCRIPTION_LENGTH, `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),
  creator: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
})

// Payment API request schema
export const PaymentRequestSchema = z.object({
  agentId: z.string().min(1).max(100),
  input: z.string()
    .max(MAX_INPUT_LENGTH, `Input must be less than ${MAX_INPUT_LENGTH} characters`),
})

// Workflow history schema (for localStorage validation)
export const WorkflowRunSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  nodes: z.array(z.unknown()),
  input: z.unknown(),
  output: z.unknown(),
  totalCost: z.number(),
  duration: z.number(),
  status: z.enum(['success', 'error', 'running']),
  steps: z.array(z.object({
    nodeId: z.string(),
    nodeName: z.string(),
    input: z.unknown(),
    output: z.unknown(),
    duration: z.number(),
    cost: z.number(),
    status: z.enum(['success', 'error', 'skipped']),
  })),
})

export const WorkflowHistorySchema = z.array(WorkflowRunSchema)

// Utility function to safely parse and validate
export function safeParseJSON<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { 
      success: false, 
      error: result.error.issues.map(i => i.message).join(', ')
    }
  } catch {
    return { success: false, error: 'Invalid JSON data' }
  }
}

// Export types inferred from schemas
export type WorkflowExecutionRequest = z.infer<typeof WorkflowExecutionRequestSchema>
export type StoreWorkflowRequest = z.infer<typeof StoreWorkflowRequestSchema>
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>
