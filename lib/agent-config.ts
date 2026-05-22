import type { AgentNode } from './workflow-types'

export function getDefaultAgentConfig(agentId: string): Record<string, unknown> {
  switch (agentId) {
    case 'summarizer':
      return { summaryStyle: 'concise', format: 'paragraph' }
    case 'translator':
      return { targetLang: 'es' }
    case 'sentiment':
      return { detailLevel: 'standard' }
    case 'code-reviewer':
      return { strictness: 'balanced' }
    case 'autonomous-signal-desk':
      return { focusArea: 'macro', budget: 0.003, riskTolerance: 'medium' }
    case 'market-opportunity-scanner':
      return { focusArea: 'macro', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5, minSpreadPct: 2, minMatchScore: 0.48 }
    case 'market-discovery':
      return { vertical: 'prediction-markets', discoveryDepth: 'live' }
    case 'market-researcher':
      return { vertical: 'crypto', sourceWeighting: 'balanced' }
    case 'source-credibility':
      return { minimumCredibility: 'medium', staleSourcePolicy: 'flag' }
    case 'adversarial-reviewer':
      return { strictness: 'skeptical', minTrustScore: 70 }
    case 'probability-estimator':
      return { marketProbability: 0.5, confidenceStyle: 'calibrated' }
    case 'kelly-sizer':
      return { bankroll: 1000, maxPositionPct: 5, riskTolerance: 'medium' }
    case 'portfolio-risk':
      return { maxCorrelatedExposurePct: 10, portfolioMode: 'balanced' }
    case 'betting-brief':
      return {
        builderCode: process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_CODE || '',
        includeExecutionNote: true,
      }
    case 'webhook':
      return { url: '' }
    default:
      return {}
  }
}

export function withDefaultAgentConfig<T extends Pick<AgentNode, 'agentId'> & { config?: Record<string, unknown> }>(
  node: T
): T {
  return {
    ...node,
    config: {
      ...getDefaultAgentConfig(node.agentId),
      ...(node.config || {}),
    },
  }
}
