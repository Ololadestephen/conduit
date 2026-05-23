import { NextRequest, NextResponse } from 'next/server'
import type { AgentId } from '@/lib/agent-registry'
import { calculateWorkflowCost, formatAgentPrice, getAgent, getAgentPaymentPlan } from '@/lib/agent-registry'
import { createSimulatedReceipt } from '@/lib/payment-simulation'
import { WorkflowExecutionRequestSchema } from '@/lib/validation-schemas'
import { workflowRateLimiter, getClientIdentifier, checkRateLimit, addRateLimitHeaders } from '@/lib/rate-limit'
import { fetchMarketCandidates, type MarketFocusArea } from '@/lib/market-data-connectors'
import {
  executeSummarizer,
  executeTranslator,
  executeSentimentAnalyzer,
  executeCodeReviewer,
  executeDataEnricher,
  executeAutonomousSignalDesk,
  executeMarketOpportunityScanner,
  executeMarketDiscovery,
  executeMarketResearcher,
  executeSourceCredibility,
  executeAdversarialReviewer,
  executeProbabilityEstimator,
  executeKellySizer,
  executePortfolioRisk,
  executeBettingBrief,
} from '@/lib/ai-agents'

interface ExecutionStep {
  nodeId: string
  agentId: string
  agentName: string
  input: unknown
  output: unknown
  duration: number
  payment: {
    amount: number
    verified: boolean
    status: 'simulated' | 'verified' | 'free'
  } | null
  retried?: boolean
}

interface SettledPayment {
  txHash?: string
  settlementId?: string
  mode?: string
  payer: string
  token: string
  recipient: string
  amount?: number
  nodeIds?: string[]
}

function getErrorRecord(error: unknown): Record<string, unknown> {
  return error && typeof error === 'object' ? error as Record<string, unknown> : {}
}

function getProviderStatus(error: unknown): number | undefined {
  const record = getErrorRecord(error)
  const cause = getErrorRecord(record.cause)
  const statusCode = record.statusCode || cause.statusCode

  return typeof statusCode === 'number' ? statusCode : undefined
}

function getProviderRetryAfter(error: unknown): number | undefined {
  const record = getErrorRecord(error)
  const cause = getErrorRecord(record.cause)
  const headers = getErrorRecord(record.responseHeaders || cause.responseHeaders)
  const retryAfter = headers['retry-after']
  const parsed = Number(retryAfter)

  return Number.isFinite(parsed) ? parsed : undefined
}

function getProviderErrorMessage(error: unknown): string {
  const record = getErrorRecord(error)
  const cause = getErrorRecord(record.cause)
  const data = getErrorRecord(record.data || cause.data)
  const dataError = getErrorRecord(data.error)
  const message = dataError.message || record.message || cause.message

  return typeof message === 'string' ? message : 'AI provider request failed'
}

function isProviderRateLimit(error: unknown) {
  const message = getProviderErrorMessage(error)
  return getProviderStatus(error) === 429 || /rate limit|tokens per day|too many requests/i.test(message)
}

const MARKET_AGENT_IDS = new Set<string>([
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
])

const DEFAULT_AGENT_TIMEOUT_MS = 25_000

function getAgentTimeoutMs(agentId: string) {
  const configured = Number(process.env.WORKFLOW_AGENT_TIMEOUT_MS)
  const fallback = agentId === 'market-opportunity-scanner' || agentId === 'autonomous-signal-desk'
    ? 75_000
    : MARKET_AGENT_IDS.has(agentId)
      ? DEFAULT_AGENT_TIMEOUT_MS
      : 35_000
  return Number.isFinite(configured)
    ? Math.max(5_000, Math.min(120_000, configured))
    : fallback
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeout))
}

interface WorkflowLiveData {
  generatedAt: string
  focusArea: MarketFocusArea
  summary: string
  marketCandidates: Array<{
    platform: string
    title: string
    outcomeName: string
    side: string
    price: number
    volume?: number
    liquidity?: number
    closeTime?: string
    url?: string
  }>
  sources: Array<{
    title: string
    url: string
  }>
}

function getWorkflowFocusArea(nodes: Array<{ config?: Record<string, unknown> }>, input: string): MarketFocusArea {
  const configuredFocus = nodes
    .map((node) => String(node.config?.focusArea || '').toLowerCase())
    .find((focus) => ['macro', 'crypto', 'sports', 'politics', 'entertainment', 'technology'].includes(focus))
  const promptFocus = /focus\s*(?:area|category)?\s*[:=]\s*([a-z -]+)/i.exec(input)?.[1]?.split('\n')[0]?.trim().toLowerCase()
  const focus = configuredFocus || promptFocus || ''

  if (['macro', 'crypto', 'sports', 'politics', 'entertainment', 'technology'].includes(focus)) {
    return focus as MarketFocusArea
  }

  return 'macro'
}

async function buildWorkflowLiveData(
  input: string,
  nodes: Array<{ agentId: string; config?: Record<string, unknown> }>
): Promise<WorkflowLiveData | null> {
  if (!nodes.some((node) => MARKET_AGENT_IDS.has(node.agentId))) return null
  if (nodes.some((node) => ['autonomous-signal-desk', 'market-opportunity-scanner'].includes(node.agentId))) {
    return null
  }

  const focusArea = getWorkflowFocusArea(nodes, input)
  const query = `${input.slice(0, 800)} ${focusArea} live Polymarket Kalshi prediction markets current prices current news`

  try {
    const marketCandidates = await fetchMarketCandidates(query, 8, focusArea)

    return {
      generatedAt: new Date().toISOString(),
      focusArea,
      summary: 'Live exchange candidate feed loaded. Candidate-specific catalyst research runs inside the market desk when needed.',
      marketCandidates: marketCandidates.slice(0, 8).map((candidate) => ({
        platform: candidate.platform,
        title: candidate.title,
        outcomeName: candidate.outcomeName,
        side: candidate.side,
        price: candidate.yesPrice,
        volume: candidate.volume,
        liquidity: candidate.liquidity,
        closeTime: candidate.closeTime,
        url: candidate.url,
      })),
      sources: [],
    }
  } catch (error) {
    console.warn('Workflow live data prefetch failed:', error)
    return null
  }
}

function attachWorkflowLiveData(input: unknown, liveData: WorkflowLiveData | null): unknown {
  if (!liveData) return input

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return {
      ...(input as Record<string, unknown>),
      workflowLiveData: liveData,
    }
  }

  const candidateLines = liveData.marketCandidates.map((candidate, index) => (
    `${index + 1}. ${candidate.platform}: ${candidate.title} | ${candidate.outcomeName} ${candidate.side} @ ${(candidate.price * 100).toFixed(1)}%${candidate.url ? ` | ${candidate.url}` : ''}`
  )).join('\n')
  const sourceLines = liveData.sources.map((source) => `- ${source.title}: ${source.url}`).join('\n')

  return `${String(input || '')}

Workflow live market data (${liveData.generatedAt}, focus: ${liveData.focusArea}):
${candidateLines || 'No live Polymarket/Kalshi candidates returned.'}

Workflow live source context:
${liveData.summary}
${sourceLines}`
}

async function workflowExecuteHandler(request: NextRequest) {
  try {
    // Rate limiting check
    const identifier = getClientIdentifier(request)
    const { allowed, result: rateLimitResult, response: rateLimitResponse } = 
      await checkRateLimit(workflowRateLimiter, identifier)
    
    if (!allowed && rateLimitResponse) {
      return rateLimitResponse
    }

    const rawBody = await request.json()
    
    // Validate request body with Zod schema
    const parseResult = WorkflowExecutionRequestSchema.safeParse(rawBody)
    
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
    
    const { nodes, input, payment, payments } = parseResult.data

    // Calculate total cost
    const totalCost = calculateWorkflowCost(nodes)
    const receipt = createSimulatedReceipt(totalCost)
    const settledPayments: SettledPayment[] = payments?.length ? payments : payment ? [payment] : []
    const paymentStatus = totalCost > 0 && settledPayments.length > 0 ? 'settled' : totalCost > 0 ? 'simulated' : 'not_required'
    const primaryPayment = settledPayments[0]
    const paymentReference = primaryPayment?.txHash || primaryPayment?.settlementId
    const paymentPlan = getAgentPaymentPlan(nodes)

    // Execute workflow
    const steps: ExecutionStep[] = []
    let currentInput: unknown = input
    const workflowLiveData = await buildWorkflowLiveData(input, nodes)

    for (const node of nodes) {
      const agent = getAgent(node.agentId)
      if (!agent) {
        return NextResponse.json(
          { error: `Unknown agent: ${node.agentId}` },
          { status: 400 }
        )
      }

      const startTime = Date.now()
      const executionInput = MARKET_AGENT_IDS.has(node.agentId)
        ? attachWorkflowLiveData(currentInput, workflowLiveData)
        : currentInput

      // Execute agent with 1 retry on failure
      let output: unknown
      let retryCount = 0
      const maxRetries = MARKET_AGENT_IDS.has(node.agentId) ? 0 : 1

      while (retryCount <= maxRetries) {
        try {
          output = await withTimeout(
            executeAgent(node.agentId, executionInput, node.config),
            getAgentTimeoutMs(node.agentId),
            agent.name
          )
          break // Success, exit retry loop
        } catch (agentError) {
          if (isProviderRateLimit(agentError)) {
            const retryAfter = getProviderRetryAfter(agentError)
            console.error(`Agent ${node.agentId} hit AI provider rate limit:`, agentError)

            return NextResponse.json(
              {
                error: 'AI provider rate limit reached',
                failedAtStep: steps.length + 1,
                failedAgent: agent.name,
                retryAfterSeconds: retryAfter,
                message: getProviderErrorMessage(agentError),
              },
              { status: 429 }
            )
          }

          retryCount++
          if (retryCount > maxRetries) {
            console.error(`Agent ${node.agentId} failed after ${maxRetries} retry:`, agentError)
            // Return generic error to client, log details server-side only
            return NextResponse.json(
              { 
                error: 'Agent execution failed',
                failedAtStep: steps.length + 1,
              },
              { status: 500 }
            )
          }
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const duration = Date.now() - startTime
      const expectedPayment = paymentPlan.find((line) => line.nodeId === node.id)
      const nodePayment = expectedPayment
        ? settledPayments.find((settledPayment) => {
          const paidNodeIds = settledPayment.nodeIds || []
          return paidNodeIds.includes(node.id) || settledPayment.recipient.toLowerCase() === expectedPayment.recipient.toLowerCase()
        })
        : undefined

      steps.push({
        nodeId: node.id,
        agentId: node.agentId,
        agentName: agent.name,
        input: executionInput,
        output,
        duration,
        payment: agent.price > 0 ? {
          amount: agent.price,
          verified: Boolean(nodePayment),
          status: nodePayment ? 'verified' : 'simulated',
        } : null,
        retried: retryCount > 0,
      })

      // Pass output to next node
      currentInput = output
    }

    const response = NextResponse.json({
      success: true,
      result: currentInput,
      execution: {
        steps,
        totalSteps: steps.length,
        totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
        totalCost,
        payment: {
          status: paymentStatus,
          mode: payment ? 'wallet-transfer' : 'simulated',
          amount: formatAgentPrice(totalCost),
          receipt: {
            ...receipt,
            id: paymentReference || receipt.id,
            status: settledPayments.length > 0 ? 'settled' : receipt.status,
            txHash: primaryPayment?.txHash,
            settlementId: primaryPayment?.settlementId,
            mode: primaryPayment?.mode,
            payer: primaryPayment?.payer,
            token: primaryPayment?.token,
            recipient: primaryPayment?.recipient,
            payments: settledPayments,
          },
        },
      },
    })
    
    return addRateLimitHeaders(response, rateLimitResult)
  } catch (error) {
    console.error('Workflow execution error:', error)
    return NextResponse.json(
      { error: 'Workflow execution failed' },
      { status: 500 }
    )
  }
}

export const POST = workflowExecuteHandler

// Execute individual agent with real AI where applicable
async function executeAgent(
  agentId: AgentId,
  input: unknown,
  config?: Record<string, unknown>
): Promise<unknown> {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input)

  switch (agentId) {
    case 'text-input':
      return input

    case 'summarizer':
      // Real AI summarization
      return executeSummarizer(inputStr, config)

    case 'translator':
      // Real AI translation
      const targetLang = (config?.targetLang as string) || 'es'
      return executeTranslator(inputStr, targetLang)

    case 'sentiment':
      // Real AI sentiment analysis
      return executeSentimentAnalyzer(inputStr, config)

    case 'code-reviewer':
      // Real AI code review
      return executeCodeReviewer(inputStr, config)

    case 'data-enrichment':
      // Real AI data enrichment
      return executeDataEnricher(input)

    case 'autonomous-signal-desk':
      return executeAutonomousSignalDesk(inputStr, config)

    case 'market-opportunity-scanner':
      return executeMarketOpportunityScanner(inputStr, config)

    case 'market-discovery':
      return executeMarketDiscovery(inputStr, config)

    case 'market-researcher':
      return executeMarketResearcher(inputStr, config)

    case 'source-credibility':
      return executeSourceCredibility(input, config)

    case 'adversarial-reviewer':
      return executeAdversarialReviewer(input, config)

    case 'probability-estimator':
      return executeProbabilityEstimator(input, config)

    case 'kelly-sizer':
      return executeKellySizer(input, config)

    case 'portfolio-risk':
      return executePortfolioRisk(input, config)

    case 'betting-brief':
      return executeBettingBrief(input, config)

    case 'json-transform':
      return {
        transformed: true,
        data: input,
        format: 'standard',
        timestamp: new Date().toISOString(),
      }

    case 'api-output':
      return {
        status: 'success',
        data: input,
        timestamp: new Date().toISOString(),
      }

    case 'webhook':
      const webhookUrl = (config?.url as string) || 'https://example.com/webhook'
      return {
        sent: true,
        url: webhookUrl,
        statusCode: 200,
        response: { received: true },
      }

    default:
      return { processed: true, input }
  }
}
