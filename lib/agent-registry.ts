import { ARC_NETWORK_ID } from './arc-chain'
import type { AgentNode } from './workflow-types'

export type AgentId =
  | 'text-input'
  | 'summarizer'
  | 'translator'
  | 'sentiment'
  | 'code-reviewer'
  | 'data-enrichment'
  | 'json-transform'
  | 'autonomous-signal-desk'
  | 'market-opportunity-scanner'
  | 'market-discovery'
  | 'market-researcher'
  | 'source-credibility'
  | 'adversarial-reviewer'
  | 'probability-estimator'
  | 'kelly-sizer'
  | 'portfolio-risk'
  | 'betting-brief'
  | 'api-output'
  | 'webhook'

export interface AgentDefinition {
  id: AgentId
  type: AgentNode['type']
  name: string
  description: string
  icon: string
  category: AgentNode['category']
  price: number
  endpoint: string
  payTo: `0x${string}` | null
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

export const DEMO_SELLER_ADDRESS = (
  process.env.SELLER_ADDRESS ||
  process.env.NEXT_PUBLIC_DEMO_SELLER_ADDRESS ||
  '0x1111111111111111111111111111111111111111'
) as `0x${string}`

const AGENT_SELLERS = {
  summarizer: (process.env.NEXT_PUBLIC_SUMMARIZER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  translator: (process.env.NEXT_PUBLIC_TRANSLATOR_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  sentiment: (process.env.NEXT_PUBLIC_SENTIMENT_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  codeReviewer: (process.env.NEXT_PUBLIC_CODE_REVIEWER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  dataEnrichment: (process.env.NEXT_PUBLIC_DATA_ENRICHMENT_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  jsonTransform: (process.env.NEXT_PUBLIC_JSON_TRANSFORM_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  autonomousSignalDesk: (process.env.NEXT_PUBLIC_AUTONOMOUS_SIGNAL_DESK_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  marketOpportunityScanner: (process.env.NEXT_PUBLIC_MARKET_OPPORTUNITY_SCANNER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  marketDiscovery: (process.env.NEXT_PUBLIC_MARKET_DISCOVERY_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  marketResearcher: (process.env.NEXT_PUBLIC_MARKET_RESEARCHER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  sourceCredibility: (process.env.NEXT_PUBLIC_SOURCE_CREDIBILITY_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  adversarialReviewer: (process.env.NEXT_PUBLIC_ADVERSARIAL_REVIEWER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  probabilityEstimator: (process.env.NEXT_PUBLIC_PROBABILITY_ESTIMATOR_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  kellySizer: (process.env.NEXT_PUBLIC_KELLY_SIZER_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  portfolioRisk: (process.env.NEXT_PUBLIC_PORTFOLIO_RISK_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  bettingBrief: (process.env.NEXT_PUBLIC_BETTING_BRIEF_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
  webhook: (process.env.NEXT_PUBLIC_WEBHOOK_SELLER_ADDRESS || DEMO_SELLER_ADDRESS) as `0x${string}`,
}

export const AGENT_REGISTRY: Record<AgentId, AgentDefinition> = {
  'text-input': {
    id: 'text-input',
    type: 'input',
    name: 'Text Input',
    description: 'Accept raw text input for processing',
    icon: 'MessageSquare',
    category: 'io',
    price: 0,
    payTo: null,
    endpoint: '/api/agents/text-input',
    inputSchema: { type: 'string' },
    outputSchema: { type: 'string' },
  },
  summarizer: {
    id: 'summarizer',
    type: 'agent',
    name: 'Summarizer',
    description: 'Condense text to key points',
    icon: 'FileText',
    category: 'text',
    price: 0.0002,
    payTo: AGENT_SELLERS.summarizer,
    endpoint: '/api/agents/summarizer',
    inputSchema: { type: 'string', maxLength: 10000 },
    outputSchema: { type: 'object' },
  },
  translator: {
    id: 'translator',
    type: 'agent',
    name: 'Translator',
    description: 'Translate to any language',
    icon: 'Languages',
    category: 'text',
    price: 0.0001,
    payTo: AGENT_SELLERS.translator,
    endpoint: '/api/agents/translator',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, targetLang: { type: 'string' } } },
    outputSchema: { type: 'object' },
  },
  sentiment: {
    id: 'sentiment',
    type: 'agent',
    name: 'Sentiment Analyzer',
    description: 'Detect emotional tone',
    icon: 'Heart',
    category: 'text',
    price: 0.00015,
    payTo: AGENT_SELLERS.sentiment,
    endpoint: '/api/agents/sentiment',
    inputSchema: { type: 'string' },
    outputSchema: { type: 'object' },
  },
  'code-reviewer': {
    id: 'code-reviewer',
    type: 'agent',
    name: 'Code Reviewer',
    description: 'Analyze code quality',
    icon: 'Code',
    category: 'utility',
    price: 0.001,
    payTo: AGENT_SELLERS.codeReviewer,
    endpoint: '/api/agents/code-reviewer',
    inputSchema: { type: 'string' },
    outputSchema: { type: 'object' },
  },
  'data-enrichment': {
    id: 'data-enrichment',
    type: 'agent',
    name: 'Data Enricher',
    description: 'Add metadata and context',
    icon: 'Database',
    category: 'data',
    price: 0.0003,
    payTo: AGENT_SELLERS.dataEnrichment,
    endpoint: '/api/agents/data-enrichment',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'json-transform': {
    id: 'json-transform',
    type: 'agent',
    name: 'JSON Transformer',
    description: 'Transform JSON data structures',
    icon: 'Database',
    category: 'data',
    price: 0.00008,
    payTo: AGENT_SELLERS.jsonTransform,
    endpoint: '/api/agents/json-transform',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'autonomous-signal-desk': {
    id: 'autonomous-signal-desk',
    type: 'agent',
    name: 'Autonomous Signal Desk',
    description: 'Spend a scoped USDC research budget to scan, verify, and reject or promote one market signal',
    icon: 'Bot',
    category: 'market',
    price: 0.0015,
    payTo: AGENT_SELLERS.autonomousSignalDesk,
    endpoint: '/api/agents/autonomous-signal-desk',
    inputSchema: {
      type: 'object',
      properties: {
        focusArea: { type: 'string' },
        budget: { type: 'number' },
        riskTolerance: { type: 'string' },
        prompt: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        deskDecision: { type: 'string' },
        budgetSpent: { type: 'number' },
        recommendation: { type: 'object' },
      },
    },
  },
  'market-opportunity-scanner': {
    id: 'market-opportunity-scanner',
    type: 'agent',
    name: 'Live Mispricing Scout',
    description: 'Run a vertical research desk for qualified, watchlist, or rejected market ideas',
    icon: 'Search',
    category: 'market',
    price: 0.00035,
    payTo: AGENT_SELLERS.marketOpportunityScanner,
    endpoint: '/api/agents/market-opportunity-scanner',
    inputSchema: { type: 'string' },
    outputSchema: {
      type: 'object',
      properties: {
        market: { type: 'string' },
        outcomeName: { type: 'string' },
        marketProbability: { type: 'number' },
        opportunities: { type: 'array' },
      },
    },
  },
  'market-discovery': {
    id: 'market-discovery',
    type: 'agent',
    name: 'Market Discovery Agent',
    description: 'Find relevant markets and outcomes from a plain question',
    icon: 'Search',
    category: 'market',
    price: 0.00025,
    payTo: AGENT_SELLERS.marketDiscovery,
    endpoint: '/api/agents/market-discovery',
    inputSchema: { type: 'string' },
    outputSchema: { type: 'object' },
  },
  'market-researcher': {
    id: 'market-researcher',
    type: 'agent',
    name: 'Signal Research Agent',
    description: 'Synthesize noisy news, data, and sentiment',
    icon: 'BarChart3',
    category: 'market',
    price: 0.0004,
    payTo: AGENT_SELLERS.marketResearcher,
    endpoint: '/api/agents/market-researcher',
    inputSchema: { type: 'string' },
    outputSchema: { type: 'object' },
  },
  'source-credibility': {
    id: 'source-credibility',
    type: 'agent',
    name: 'Source Credibility Agent',
    description: 'Rank live sources and flag stale or weak evidence',
    icon: 'ShieldCheck',
    category: 'market',
    price: 0.0002,
    payTo: AGENT_SELLERS.sourceCredibility,
    endpoint: '/api/agents/source-credibility',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'adversarial-reviewer': {
    id: 'adversarial-reviewer',
    type: 'agent',
    name: 'Adversarial Reviewer',
    description: 'Stress-test evidence, probabilities, and decision logic',
    icon: 'ShieldCheck',
    category: 'market',
    price: 0.0003,
    payTo: AGENT_SELLERS.adversarialReviewer,
    endpoint: '/api/agents/adversarial-reviewer',
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: {
        adversarialVerdict: { type: 'string' },
        trustScore: { type: 'number' },
        critique: { type: 'array' },
        revisedAction: { type: 'string' },
      },
    },
  },
  'probability-estimator': {
    id: 'probability-estimator',
    type: 'agent',
    name: 'Fair Odds Agent',
    description: 'Estimate fair probability and mispricing',
    icon: 'Percent',
    category: 'market',
    price: 0.0005,
    payTo: AGENT_SELLERS.probabilityEstimator,
    endpoint: '/api/agents/probability-estimator',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'kelly-sizer': {
    id: 'kelly-sizer',
    type: 'agent',
    name: 'Position Sizing Agent',
    description: 'Apply Kelly-style sizing and risk caps',
    icon: 'Scale',
    category: 'market',
    price: 0.00035,
    payTo: AGENT_SELLERS.kellySizer,
    endpoint: '/api/agents/kelly-sizer',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'portfolio-risk': {
    id: 'portfolio-risk',
    type: 'agent',
    name: 'Portfolio Risk Agent',
    description: 'Check correlation, exposure caps, and portfolio fit',
    icon: 'PieChart',
    category: 'market',
    price: 0.0003,
    payTo: AGENT_SELLERS.portfolioRisk,
    endpoint: '/api/agents/portfolio-risk',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
  'betting-brief': {
    id: 'betting-brief',
    type: 'agent',
    name: 'Trade Decision Agent',
    description: 'Produce +EV decision, hedge notes, and attribution',
    icon: 'ReceiptText',
    category: 'market',
    price: 0.00025,
    payTo: AGENT_SELLERS.bettingBrief,
    endpoint: '/api/agents/betting-brief',
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: {
        market: { type: 'string' },
        side: { type: 'string' },
        modelProbability: { type: 'number' },
        marketProbability: { type: 'number' },
        edge: { type: 'number' },
        suggestedSizePct: { type: 'number' },
        builderCode: { type: 'string' },
      },
    },
  },
  'api-output': {
    id: 'api-output',
    type: 'output',
    name: 'API Output',
    description: 'Return final workflow result',
    icon: 'Send',
    category: 'io',
    price: 0,
    payTo: null,
    endpoint: '/api/agents/api-output',
    inputSchema: { type: 'any' },
    outputSchema: { type: 'object' },
  },
  webhook: {
    id: 'webhook',
    type: 'agent',
    name: 'Webhook Sender',
    description: 'Send results to an external webhook',
    icon: 'Send',
    category: 'utility',
    price: 0.00005,
    payTo: AGENT_SELLERS.webhook,
    endpoint: '/api/agents/webhook',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  },
}

export const AVAILABLE_AGENTS = Object.values(AGENT_REGISTRY).map((agent) => ({
  agentId: agent.id,
  type: agent.type,
  name: agent.name,
  description: agent.description,
  icon: agent.icon,
  pricePerCall: agent.price,
  category: agent.category,
}))

export function getAgent(agentId: string): AgentDefinition | undefined {
  return AGENT_REGISTRY[agentId as AgentId]
}

export function formatAgentPrice(amount: number): string {
  return `$${amount.toFixed(6)}`
}

export function calculateWorkflowCost(nodes: { agentId: string }[]): number {
  return nodes.reduce((sum, node) => sum + (getAgent(node.agentId)?.price || 0), 0)
}

export interface AgentPaymentLine {
  nodeId: string
  agentId: AgentId
  agentName: string
  amount: number
  recipient: `0x${string}`
  endpoint: string
}

export interface AgentPaymentGroup {
  recipient: `0x${string}`
  amount: number
  lines: AgentPaymentLine[]
}

export function getAgentPaymentPlan(nodes: { id: string; agentId: string }[]): AgentPaymentLine[] {
  return nodes.flatMap((node) => {
    const agent = getAgent(node.agentId)

    if (!agent || agent.price <= 0 || !agent.payTo) {
      return []
    }

    return [{
      nodeId: node.id,
      agentId: agent.id,
      agentName: agent.name,
      amount: agent.price,
      recipient: agent.payTo,
      endpoint: agent.endpoint,
    }]
  })
}

export function groupAgentPayments(lines: AgentPaymentLine[]): AgentPaymentGroup[] {
  const groups = new Map<string, AgentPaymentGroup>()

  for (const line of lines) {
    const existing = groups.get(line.recipient)
    if (existing) {
      existing.amount += line.amount
      existing.lines.push(line)
    } else {
      groups.set(line.recipient, {
        recipient: line.recipient,
        amount: line.amount,
        lines: [line],
      })
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    amount: Number(group.amount.toFixed(6)),
  }))
}

export function listAgentsForApi() {
  return Object.values(AGENT_REGISTRY).map((agent) => ({
    id: agent.id,
    name: agent.name,
    category: agent.category,
    description: agent.description,
    price: agent.price,
    priceFormatted: formatAgentPrice(agent.price),
    payTo: agent.payTo,
    endpoint: agent.endpoint,
    inputSchema: agent.inputSchema,
    outputSchema: agent.outputSchema,
    network: ARC_NETWORK_ID,
    paymentMode: 'simulated-arc-usdc',
  }))
}
