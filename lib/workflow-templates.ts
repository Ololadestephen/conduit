import { AgentNode, generateId } from './workflow-types'
import { withDefaultAgentConfig } from './agent-config'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'content' | 'analysis' | 'data' | 'development' | 'market'
  nodes: Omit<AgentNode, 'id'>[]
  estimatedCost: number
  initialInput?: string
}

function buildScoutPrompt({
  focusArea,
  title,
  marketUniverse,
  catalysts,
  primarySources,
  avoid,
  bankroll = 1000,
  riskTolerance = 'medium',
}: {
  focusArea: string
  title: string
  marketUniverse: string
  catalysts: string
  primarySources: string
  avoid: string
  bankroll?: number
  riskTolerance?: 'low' | 'medium' | 'high'
}) {
  return `${title}

Focus area: ${focusArea}

Use the live Polymarket/Kalshi market feed before reasoning. Do not invent markets or prices.

Scan this universe:
${marketUniverse}

Find:
- one qualified +EV trade if a catalyst-backed edge clears the bar
- one Polymarket/Kalshi cross-market spread if live exchange prices show a cleaner opportunity
- otherwise one best available scout pick with conservative sizing
- plus up to three watchlist markets that almost qualified

For the selected market, include:
- exact market question, platform, outcome, side, current price, liquidity/volume, and close timing when available
- if it is a cross-market spread: cheaper venue, richer venue, spread, and match confidence
- fair probability estimate and method
- estimated edge
- catalyst or reason the market may be slow to price the update
- failure mode: why the market may already be correctly priced
- source quality and source names

Catalysts to prioritize:
${catalysts}

Primary sources to prefer:
${primarySources}

Avoid:
${avoid}

Bankroll: ${bankroll} USDC
Risk tolerance: ${riskTolerance}

Return a concise research-desk recommendation. Recommendation only. Do not execute a trade.`
}

export const MACRO_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'macro',
  title: 'Find the strongest live macro prediction-market setup today.',
  marketUniverse: '- Fed rate decisions, CPI/PCE prints, jobs/payrolls, unemployment, GDP, recession, Treasury yields, oil/gas/gold/dollar, government shutdown or tariff markets',
  catalysts: '- official Fed/FOMC updates, BLS/BEA releases, CME FedWatch implied probabilities, Fed speaker guidance, yield moves, current inflation/jobs surprises, policy deadlines',
  primarySources: '- Federal Reserve, BLS, BEA, CME FedWatch, Treasury, Reuters, Bloomberg, CNBC, exact Polymarket/Kalshi market rows',
  avoid: '- old Fed meetings, generic macro outlooks, stale CPI articles, pure sentiment, and markets without exact current prices',
})

export const CRYPTO_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'crypto',
  title: 'Find the strongest live crypto prediction-market setup today.',
  marketUniverse: '- BTC, ETH, SOL, XRP, ETFs, stablecoins, crypto regulation, exchange listings, protocol events, price threshold markets',
  catalysts: '- spot price distance to threshold, ETF flow/news, SEC/CFTC filings, exchange announcements, court or rulemaking updates, major protocol events',
  primarySources: '- SEC/CFTC, exchange filings, Coinbase/Binance notices, Reuters, Bloomberg, CNBC, CoinDesk, exact Polymarket/Kalshi market rows',
  avoid: '- meme-only markets, generic crypto optimism, stale price targets, social hype, and price/volume-only arguments',
})

export const SPORTS_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'sports',
  title: 'Find the strongest live sports prediction-market setup today.',
  marketUniverse: '- title winners, qualification, playoffs, relegation, exact finishing positions, tournament draws, fixtures, injuries, standings, player/team markets',
  catalysts: '- official standings, fixtures remaining, injuries, lineup/team news, tournament draw, match schedule, current form with dates',
  primarySources: '- official league/team pages, UEFA/FIFA/Premier League/NBA/NFL/MLB/NHL, Opta-style data, ESPN/BBC/Sky, exact Polymarket/Kalshi market rows',
  avoid: '- sportsbook odds as catalysts, preseason power rankings, old-season tables, vague “strong team” claims, and duplicate outright winner contracts',
})

export const POLITICS_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'politics',
  title: 'Find the strongest live politics prediction-market setup today.',
  marketUniverse: '- elections, party control, nominations, approval, legislation, court rulings, policy outcomes, cabinet or candidate markets',
  catalysts: '- fresh polls, official election calendars, court rulings, legislative votes, candidate announcements, approval movement, policy deadlines',
  primarySources: '- official election/legal sources, reputable poll aggregators, Reuters, AP, Bloomberg, court/government pages, exact Polymarket/Kalshi market rows',
  avoid: '- partisan blogs, old polls, generic punditry, duplicate mirror contracts, and “yes” on both sides of the same party-control market',
})

export const ENTERTAINMENT_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'entertainment',
  title: 'Find the strongest live entertainment prediction-market setup today.',
  marketUniverse: '- Grammys, Oscars, Emmys, Billboard/chart markets, album/song/artist awards, box office, streaming, release outcomes',
  catalysts: '- official nominations, award calendars, chart movement, streaming data, box office reports, release timing, reputable industry reporting',
  primarySources: '- official awards/chart pages, Billboard, Box Office Mojo/The Numbers style data, Reuters/AP, Variety/Hollywood Reporter, exact Polymarket/Kalshi market rows',
  avoid: '- fan hype, social-only trends, old nomination articles, vague popularity claims, and markets without exact current prices',
})

export const TECHNOLOGY_SCOUT_PROMPT = buildScoutPrompt({
  focusArea: 'technology',
  title: 'Find the strongest live technology prediction-market setup today.',
  marketUniverse: '- AI, chips, product launches, earnings, Tesla, Nvidia, OpenAI, SpaceX, Apple, Google, Microsoft, regulation, lawsuits, filings',
  catalysts: '- earnings dates/results, product-launch timing, regulatory filings, company statements, lawsuits, model releases, delivery/launch milestones',
  primarySources: '- company filings/pages, SEC, Reuters, Bloomberg, CNBC, official product/company updates, exact Polymarket/Kalshi market rows',
  avoid: '- generic AI hype, stock chatter without event linkage, old launch rumors, social-only evidence, and markets without exact current prices',
})

export const HACKATHON_MODE_PROMPT = `${POLITICS_SCOUT_PROMPT}

Agora Hackathon Demo:
- use live Polymarket/Kalshi market rows before reasoning
- audit source credibility
- run adversarial review
- return a final trade/watchlist/pass decision with sizing, hedge notes, and attribution
- show Circle Agent Wallet settlement on Arc through the run receipt

Use conservative sizing. If no candidate is strong enough, return the best available scout pick and explain what would upgrade it from screening to qualified.`

export const OPPORTUNITY_SCANNER_PROMPT = MACRO_SCOUT_PROMPT

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'hackathon-mode',
    name: 'Agora Hackathon Demo',
    description: 'One-click paid agent research desk: live Polymarket/Kalshi scan, adversarial review, sizing, and Circle Agent Wallet settlement on Arc.',
    category: 'market',
    estimatedCost: 0.0011,
    initialInput: HACKATHON_MODE_PROMPT,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Market Brief',
        description: 'Question, bankroll, risk, and market universe',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'market-opportunity-scanner',
        name: 'Live Mispricing Scout',
        description: 'Scan live Polymarket/Kalshi markets and classify the setup',
        icon: 'Search',
        pricePerCall: 0.00035,
        position: { x: 300, y: 200 },
        category: 'market',
        config: {
          focusArea: 'politics',
          scanDepth: 'hackathon-demo',
          maxCandidates: 6,
          minEdgePct: 3,
          minMarketProbabilityPct: 5,
        },
      },
      {
        type: 'agent',
        agentId: 'source-credibility',
        name: 'Source Credibility Agent',
        description: 'Audit source quality, freshness, and direct relevance',
        icon: 'ShieldCheck',
        pricePerCall: 0.0002,
        position: { x: 500, y: 200 },
        category: 'market',
      },
      {
        type: 'agent',
        agentId: 'adversarial-reviewer',
        name: 'Adversarial Reviewer',
        description: 'Challenge catalyst, edge, and probability claims',
        icon: 'ShieldCheck',
        pricePerCall: 0.0003,
        position: { x: 700, y: 200 },
        category: 'market',
      },
      {
        type: 'agent',
        agentId: 'betting-brief',
        name: 'Trade Decision Agent',
        description: 'Produce final decision, sizing, hedge notes, and attribution',
        icon: 'ReceiptText',
        pricePerCall: 0.00025,
        position: { x: 900, y: 200 },
        category: 'market',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 1100, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'market-opportunity-scanner',
    name: 'Macro Mispricing Scout',
    description: 'Macro-first research desk: one qualified trade or a watchlist with honest rejected ideas',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: OPPORTUNITY_SCANNER_PROMPT,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Scanner Brief',
        description: 'Topic, bankroll, risk, and market universe',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'market-opportunity-scanner',
        name: 'Live Mispricing Scout',
        description: 'Classify markets as qualified, watchlist, or rejected',
        icon: 'Search',
        pricePerCall: 0.00035,
        position: { x: 300, y: 200 },
        category: 'market',
        config: {
          focusArea: 'macro',
          scanDepth: 'underrated',
          maxCandidates: 4,
          minEdgePct: 3,
          minMarketProbabilityPct: 5,
        },
      },
      {
        type: 'agent',
        agentId: 'source-credibility',
        name: 'Source Credibility Agent',
        description: 'Audit freshness and direct relevance',
        icon: 'ShieldCheck',
        pricePerCall: 0.0002,
        position: { x: 500, y: 200 },
        category: 'market',
      },
      {
        type: 'agent',
        agentId: 'adversarial-reviewer',
        name: 'Adversarial Reviewer',
        description: 'Challenge evidence and probability claims',
        icon: 'ShieldCheck',
        pricePerCall: 0.0003,
        position: { x: 700, y: 200 },
        category: 'market',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'Opportunity Report',
        description: 'Return ranked market opportunities',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 900, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'crypto-mispricing-scout',
    name: 'Crypto Mispricing Scout',
    description: 'Crypto research desk for exact priced markets, catalysts, and honest watchlists',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: CRYPTO_SCOUT_PROMPT,
    nodes: [
      { type: 'input', agentId: 'text-input', name: 'Scanner Brief', description: 'Topic, bankroll, risk, and market universe', icon: 'MessageSquare', pricePerCall: 0, position: { x: 100, y: 200 }, category: 'io' },
      { type: 'agent', agentId: 'market-opportunity-scanner', name: 'Crypto Mispricing Scout', description: 'Classify crypto markets as qualified, watchlist, or rejected', icon: 'Search', pricePerCall: 0.00035, position: { x: 300, y: 200 }, category: 'market', config: { focusArea: 'crypto', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5 } },
      { type: 'agent', agentId: 'source-credibility', name: 'Source Credibility Agent', description: 'Audit freshness and direct relevance', icon: 'ShieldCheck', pricePerCall: 0.0002, position: { x: 500, y: 200 }, category: 'market' },
      { type: 'agent', agentId: 'adversarial-reviewer', name: 'Adversarial Reviewer', description: 'Challenge evidence and probability claims', icon: 'ShieldCheck', pricePerCall: 0.0003, position: { x: 700, y: 200 }, category: 'market' },
      { type: 'output', agentId: 'api-output', name: 'Opportunity Report', description: 'Return ranked market opportunities', icon: 'Send', pricePerCall: 0, position: { x: 900, y: 200 }, category: 'io' },
    ],
  },
  {
    id: 'sports-mispricing-scout',
    name: 'Sports Mispricing Scout',
    description: 'Sports research desk using standings, fixtures, injuries, and exact market prices',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: SPORTS_SCOUT_PROMPT,
    nodes: [
      { type: 'input', agentId: 'text-input', name: 'Scanner Brief', description: 'Topic, bankroll, risk, and market universe', icon: 'MessageSquare', pricePerCall: 0, position: { x: 100, y: 200 }, category: 'io' },
      { type: 'agent', agentId: 'market-opportunity-scanner', name: 'Sports Mispricing Scout', description: 'Classify sports markets as qualified, watchlist, or rejected', icon: 'Search', pricePerCall: 0.00035, position: { x: 300, y: 200 }, category: 'market', config: { focusArea: 'sports', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5 } },
      { type: 'agent', agentId: 'source-credibility', name: 'Source Credibility Agent', description: 'Audit freshness and direct relevance', icon: 'ShieldCheck', pricePerCall: 0.0002, position: { x: 500, y: 200 }, category: 'market' },
      { type: 'agent', agentId: 'adversarial-reviewer', name: 'Adversarial Reviewer', description: 'Challenge evidence and probability claims', icon: 'ShieldCheck', pricePerCall: 0.0003, position: { x: 700, y: 200 }, category: 'market' },
      { type: 'output', agentId: 'api-output', name: 'Opportunity Report', description: 'Return ranked market opportunities', icon: 'Send', pricePerCall: 0, position: { x: 900, y: 200 }, category: 'io' },
    ],
  },
  {
    id: 'politics-mispricing-scout',
    name: 'Politics Mispricing Scout',
    description: 'Politics research desk using polls, calendars, rulings, votes, and exact market prices',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: POLITICS_SCOUT_PROMPT,
    nodes: [
      { type: 'input', agentId: 'text-input', name: 'Scanner Brief', description: 'Topic, bankroll, risk, and market universe', icon: 'MessageSquare', pricePerCall: 0, position: { x: 100, y: 200 }, category: 'io' },
      { type: 'agent', agentId: 'market-opportunity-scanner', name: 'Politics Mispricing Scout', description: 'Classify politics markets as qualified, watchlist, or rejected', icon: 'Search', pricePerCall: 0.00035, position: { x: 300, y: 200 }, category: 'market', config: { focusArea: 'politics', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5 } },
      { type: 'agent', agentId: 'source-credibility', name: 'Source Credibility Agent', description: 'Audit freshness and direct relevance', icon: 'ShieldCheck', pricePerCall: 0.0002, position: { x: 500, y: 200 }, category: 'market' },
      { type: 'agent', agentId: 'adversarial-reviewer', name: 'Adversarial Reviewer', description: 'Challenge evidence and probability claims', icon: 'ShieldCheck', pricePerCall: 0.0003, position: { x: 700, y: 200 }, category: 'market' },
      { type: 'output', agentId: 'api-output', name: 'Opportunity Report', description: 'Return ranked market opportunities', icon: 'Send', pricePerCall: 0, position: { x: 900, y: 200 }, category: 'io' },
    ],
  },
  {
    id: 'entertainment-mispricing-scout',
    name: 'Entertainment Mispricing Scout',
    description: 'Entertainment research desk using awards, charts, box office, streaming, and exact market prices',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: ENTERTAINMENT_SCOUT_PROMPT,
    nodes: [
      { type: 'input', agentId: 'text-input', name: 'Scanner Brief', description: 'Topic, bankroll, risk, and market universe', icon: 'MessageSquare', pricePerCall: 0, position: { x: 100, y: 200 }, category: 'io' },
      { type: 'agent', agentId: 'market-opportunity-scanner', name: 'Entertainment Mispricing Scout', description: 'Classify entertainment markets as qualified, watchlist, or rejected', icon: 'Search', pricePerCall: 0.00035, position: { x: 300, y: 200 }, category: 'market', config: { focusArea: 'entertainment', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5 } },
      { type: 'agent', agentId: 'source-credibility', name: 'Source Credibility Agent', description: 'Audit freshness and direct relevance', icon: 'ShieldCheck', pricePerCall: 0.0002, position: { x: 500, y: 200 }, category: 'market' },
      { type: 'agent', agentId: 'adversarial-reviewer', name: 'Adversarial Reviewer', description: 'Challenge evidence and probability claims', icon: 'ShieldCheck', pricePerCall: 0.0003, position: { x: 700, y: 200 }, category: 'market' },
      { type: 'output', agentId: 'api-output', name: 'Opportunity Report', description: 'Return ranked market opportunities', icon: 'Send', pricePerCall: 0, position: { x: 900, y: 200 }, category: 'io' },
    ],
  },
  {
    id: 'technology-mispricing-scout',
    name: 'Technology Mispricing Scout',
    description: 'Tech research desk using earnings, launches, filings, regulation, and exact market prices',
    category: 'market',
    estimatedCost: 0.00085,
    initialInput: TECHNOLOGY_SCOUT_PROMPT,
    nodes: [
      { type: 'input', agentId: 'text-input', name: 'Scanner Brief', description: 'Topic, bankroll, risk, and market universe', icon: 'MessageSquare', pricePerCall: 0, position: { x: 100, y: 200 }, category: 'io' },
      { type: 'agent', agentId: 'market-opportunity-scanner', name: 'Technology Mispricing Scout', description: 'Classify technology markets as qualified, watchlist, or rejected', icon: 'Search', pricePerCall: 0.00035, position: { x: 300, y: 200 }, category: 'market', config: { focusArea: 'technology', scanDepth: 'underrated', maxCandidates: 4, minEdgePct: 3, minMarketProbabilityPct: 5 } },
      { type: 'agent', agentId: 'source-credibility', name: 'Source Credibility Agent', description: 'Audit freshness and direct relevance', icon: 'ShieldCheck', pricePerCall: 0.0002, position: { x: 500, y: 200 }, category: 'market' },
      { type: 'agent', agentId: 'adversarial-reviewer', name: 'Adversarial Reviewer', description: 'Challenge evidence and probability claims', icon: 'ShieldCheck', pricePerCall: 0.0003, position: { x: 700, y: 200 }, category: 'market' },
      { type: 'output', agentId: 'api-output', name: 'Opportunity Report', description: 'Return ranked market opportunities', icon: 'Send', pricePerCall: 0, position: { x: 900, y: 200 }, category: 'io' },
    ],
  },
  {
    id: 'content-pipeline',
    name: 'Content Pipeline',
    description: 'Summarize text, translate to Spanish, and analyze sentiment',
    category: 'content',
    estimatedCost: 0.00035,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Text Input',
        description: 'Start with text data',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'summarizer',
        name: 'Summarizer',
        description: 'Condense text to key points',
        icon: 'FileText',
        pricePerCall: 0.0002,
        position: { x: 300, y: 200 },
        category: 'text',
      },
      {
        type: 'agent',
        agentId: 'translator',
        name: 'Translator',
        description: 'Translate to any language',
        icon: 'Languages',
        pricePerCall: 0.0001,
        position: { x: 500, y: 200 },
        category: 'text',
      },
      {
        type: 'agent',
        agentId: 'sentiment',
        name: 'Sentiment Analyzer',
        description: 'Detect emotional tone',
        icon: 'Heart',
        pricePerCall: 0.00015,
        position: { x: 700, y: 200 },
        category: 'text',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 900, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze text sentiment and enrich with metadata',
    category: 'analysis',
    estimatedCost: 0.00045,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Text Input',
        description: 'Start with text data',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'sentiment',
        name: 'Sentiment Analyzer',
        description: 'Detect emotional tone',
        icon: 'Heart',
        pricePerCall: 0.00015,
        position: { x: 350, y: 200 },
        category: 'text',
      },
      {
        type: 'agent',
        agentId: 'data-enrichment',
        name: 'Data Enricher',
        description: 'Add metadata and context',
        icon: 'Database',
        pricePerCall: 0.0003,
        position: { x: 600, y: 200 },
        category: 'data',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 850, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'translation-service',
    name: 'Multi-language Translation',
    description: 'Summarize content and translate for global audiences',
    category: 'content',
    estimatedCost: 0.0003,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Text Input',
        description: 'Start with text data',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'summarizer',
        name: 'Summarizer',
        description: 'Condense text to key points',
        icon: 'FileText',
        pricePerCall: 0.0002,
        position: { x: 350, y: 200 },
        category: 'text',
      },
      {
        type: 'agent',
        agentId: 'translator',
        name: 'Translator',
        description: 'Translate to any language',
        icon: 'Languages',
        pricePerCall: 0.0001,
        position: { x: 600, y: 200 },
        category: 'text',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 850, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'code-review-pipeline',
    name: 'Code Review Pipeline',
    description: 'Review code quality and enrich with analysis metadata',
    category: 'development',
    estimatedCost: 0.0013,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Text Input',
        description: 'Paste your code',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'code-reviewer',
        name: 'Code Reviewer',
        description: 'Analyze code quality',
        icon: 'Code',
        pricePerCall: 0.001,
        position: { x: 350, y: 200 },
        category: 'utility',
      },
      {
        type: 'agent',
        agentId: 'data-enrichment',
        name: 'Data Enricher',
        description: 'Add metadata and context',
        icon: 'Database',
        pricePerCall: 0.0003,
        position: { x: 600, y: 200 },
        category: 'data',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 850, y: 200 },
        category: 'io',
      },
    ],
  },
  {
    id: 'data-processing',
    name: 'Data Processing',
    description: 'Enrich data with AI-extracted metadata and topics',
    category: 'data',
    estimatedCost: 0.0003,
    nodes: [
      {
        type: 'input',
        agentId: 'text-input',
        name: 'Text Input',
        description: 'Start with text data',
        icon: 'MessageSquare',
        pricePerCall: 0,
        position: { x: 100, y: 200 },
        category: 'io',
      },
      {
        type: 'agent',
        agentId: 'data-enrichment',
        name: 'Data Enricher',
        description: 'Add metadata and context',
        icon: 'Database',
        pricePerCall: 0.0003,
        position: { x: 400, y: 200 },
        category: 'data',
      },
      {
        type: 'output',
        agentId: 'api-output',
        name: 'API Output',
        description: 'Return final workflow result',
        icon: 'Send',
        pricePerCall: 0,
        position: { x: 700, y: 200 },
        category: 'io',
      },
    ],
  },
]

// Convert template to actual workflow nodes with generated IDs
export function instantiateTemplate(template: WorkflowTemplate): AgentNode[] {
  return template.nodes.map((node) => withDefaultAgentConfig({
    ...node,
    id: generateId(),
  }))
}

// Get templates by category
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category)
}
