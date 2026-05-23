'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  ReceiptText,
  TerminalSquare,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatDuration,
  formatTimestamp,
  getWorkflowHistory,
  saveWorkflowRun,
  type WorkflowRun,
} from '@/lib/workflow-history'
import { formatPrice } from '@/lib/workflow-types'
import { ARC_USDC_ADDRESS, arcTestnet } from '@/lib/arc-chain'
import { DEMO_SELLER_ADDRESS } from '@/lib/agent-registry'
import { BrandLockup } from '@/components/brand-mark'

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function getDisplayOutput(step: WorkflowRun['steps'][number]): string {
  const output = step.output

  if (typeof output === 'string') {
    return output
  }

  if (!output || typeof output !== 'object') {
    return formatValue(output)
  }

  const record = output as Record<string, unknown>

  if (step.nodeName.toLowerCase().includes('summarizer') && typeof record.summary === 'string') {
    return record.summary
  }

  if (step.nodeName.toLowerCase().includes('translator') && typeof record.translated === 'string') {
    return record.translated
  }

  if (step.nodeName.toLowerCase().includes('sentiment')) {
    const sentiment = typeof record.sentiment === 'string' ? record.sentiment : null
    const reasoning = typeof record.reasoning === 'string' ? record.reasoning : null

    return [sentiment, reasoning].filter(Boolean).join('\n\n')
  }

  if ('data' in record) {
    return formatValue(record.data)
  }

  return formatValue(output)
}

function shouldShowTraceStep(step: WorkflowRun['steps'][number]): boolean {
  const name = step.nodeName.toLowerCase()
  return !['text input', 'api output'].includes(name)
}

function isBettingBrief(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'builderCode' in value &&
    'modelProbability' in value &&
    'marketProbability' in value &&
    'suggestedSizePct' in value
  )
}

function isScannerReport(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'opportunities' in value &&
    'scanSummary' in value
  )
}

function formatPercent(value: unknown, digits = 1): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number * 100).toFixed(digits)}%`
}

function formatUsdc(value: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${number.toFixed(2)} USDC`
}

function getNumeric(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function signedPercent(value: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  const sign = number > 0 ? '+' : ''
  return `${sign}${(number * 100).toFixed(1)}%`
}

function clampBarPercent(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, number * 100))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function normalizeSources(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((source) => source.title || source.url)
    : []
}

function dedupeSources(sources: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>()
  const unique: Record<string, unknown>[] = []

  for (const source of sources) {
    const key = String(source.url || source.title || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(source)
  }

  return unique
}

function getTradeActionLabel(action: unknown): string {
  const label = String(action || 'PASS').replace('_', ' ')
  return label === 'PASS' ? 'Pass' : label
}

function getTradeSummary(bettingBrief: Record<string, unknown>): string {
  const action = getTradeActionLabel(bettingBrief.action)
  const outcomeName = String(bettingBrief.outcomeName || 'selected outcome')
  const side = String(bettingBrief.side || 'YES')
  const position = side === 'NO' ? `fading ${outcomeName}` : outcomeName
  const edge = Number(bettingBrief.edge || 0)
  const marketProbability = formatPercent(bettingBrief.marketProbability)
  const modelProbability = formatPercent(bettingBrief.modelProbability)
  const suggestedSize = formatUsdc(bettingBrief.suggestedSizeUsdc)

  if (action === 'Pass') {
    return `No trade is recommended for ${position}. The model probability is ${modelProbability} versus a market price of ${marketProbability}, leaving ${formatPercent(edge)} edge. ${String(bettingBrief.sizingSkippedReason || 'No position was sized because the recommendation is PASS.')}`
  }

  return `${action} on ${position}. The model probability is ${modelProbability} versus a market price of ${marketProbability}, creating ${formatPercent(edge)} edge with a suggested max size of ${suggestedSize}.`
}

function truncateText(value: unknown, maxLength = 220): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function getRunBrief(input: unknown): string {
  const text = String(input || '').trim()
  if (!text) return 'No input saved for this run.'

  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) || text
  const bankroll = /bankroll\s*:\s*([^\n]+)/i.exec(text)?.[1]?.trim()
  const risk = /risk tolerance\s*:\s*([^\n]+)/i.exec(text)?.[1]?.trim()
  const details = [
    bankroll ? `Bankroll: ${bankroll}` : null,
    risk ? `Risk: ${risk}` : null,
  ].filter(Boolean)

  return [truncateText(firstLine, 180), ...details].join(' · ')
}

function cleanScannerSummary(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return 'Live market scan complete.'
  if (/scout pick/i.test(text) || /strongest actionable market/i.test(text)) {
    return truncateText(text, 260)
  }
  if (/strongest scout pick/i.test(text) || /exact pricing, conservative sizing, and an explicit promotion trigger/i.test(text)) {
    return truncateText(text, 260)
  }
  if (/no model-confirmed \+ev trade cleared/i.test(text) || /watchlist-only/i.test(text)) {
    return 'No qualified trade cleared the desk. That is a valid agent decision: the strongest candidates stay watchlist-only until fresher catalyst evidence and a transparent fair-probability model appear.'
  }
  return truncateText(text, 260)
}

function cleanWatchlistReason(value: unknown): string {
  let text = String(value || 'Watchlist only until stronger evidence appears.')
    .replace(/^\s*(yes|no)\s*:\s*/i, '')
    .replace(/quality score\s+\d+\/100\.\s*/ig, '')
    .replace(/ev evidence score\s+\d+\/90\.\s*/ig, '')
    .replace(/market quality score\s+\d+\/100\.\s*/ig, '')
    .replace(/evidence quality score\s+\d+\/90\.\s*/ig, '')
    .replace(/estimated edge\s+[-+]?\d+(?:\.\d+)?%?\s+from\s+[^.]+\.\s*/ig, '')
    .replace(/watchlist-only because/ig, 'Watchlist:')
    .replace(/best catalyst read:\s*/ig, '')
    .replace(/\s+/g, ' ')
    .trim()

  text = text.split(/(?:\s+Read more\.|\s+View raw|\s+https?:\/\/)/i)[0].trim()
  return truncateText(text, 180)
}

function getScannerHeadline(scannerReport: Record<string, unknown>, opportunities: Record<string, unknown>[]): string {
  if (opportunities.length > 0) {
    const prefix = scannerReport.deskDecision === 'scout_pick' ? 'Scout pick: ' : ''
    return `${prefix}${String(opportunities[0].market || scannerReport.market || 'Qualified candidate')}`
  }
  return scannerReport.deskDecision === 'pass' ? 'No qualified trade found' : 'Live research desk'
}

function getOpportunityStatusLabel(value: unknown): string {
  const status = String(value || 'watchlist')
  if (status === 'screening') return 'Scout pick'
  if (status === 'qualified') return 'Qualified'
  if (status === 'watchlist') return 'Watchlist'
  if (status === 'rejected') return 'Rejected'
  return status
}

function shouldShowTraceFooter({
  isScannerStep,
  isCredibilityStep,
  isAdversarialStep,
}: {
  isScannerStep: boolean
  isCredibilityStep: boolean
  isAdversarialStep: boolean
}) {
  return !isScannerStep && !isCredibilityStep && !isAdversarialStep
}

function cleanSizingCopy(value: unknown): string {
  const text = String(value || '')
  if (text.includes('Sizing skipped because the recommendation is PASS')) {
    return text.replace(
      'Sizing skipped because the recommendation is PASS:',
      'Recommended size is 0 because'
    )
  }

  return text
}

function isAnswerResult(bettingBrief: Record<string, unknown> | undefined): boolean {
  if (!bettingBrief) return false
  return bettingBrief.answerMode === 'answer' || bettingBrief.exactMarketPriced === false
}

function isPassResult(bettingBrief: Record<string, unknown> | undefined): boolean {
  if (!bettingBrief) return false
  return String(bettingBrief.action || '').toUpperCase() === 'PASS'
}

function ProbabilityBar({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: unknown
  tone?: 'default' | 'accent'
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{formatPercent(value)}</span>
      </div>
      <div className="h-2 border border-border bg-background">
        <div
          className={tone === 'accent' ? 'h-full bg-accent' : 'h-full bg-foreground'}
          style={{ width: `${clampBarPercent(value)}%` }}
        />
      </div>
    </div>
  )
}

function EvSizingGauge({
  marketProbability,
  modelProbability,
  edge,
  suggestedSizePct,
  suggestedSizeUsdc,
  title = 'EV / sizing gauge',
}: {
  marketProbability: unknown
  modelProbability: unknown
  edge: unknown
  suggestedSizePct?: unknown
  suggestedSizeUsdc?: unknown
  title?: string
}) {
  const numericEdge = getNumeric(edge)
  const positiveEdge = numericEdge > 0
  const sizePct = getNumeric(suggestedSizePct)

  return (
    <div className="border border-accent/40 bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Market price vs model/reference fair odds</p>
        </div>
        <span className={`border px-3 py-2 font-mono text-sm ${positiveEdge ? 'border-accent/50 text-accent' : 'border-border text-muted-foreground'}`}>
          {signedPercent(edge)} edge
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <ProbabilityBar label="Market probability" value={marketProbability} />
          <ProbabilityBar label="Fair / reference probability" value={modelProbability} tone="accent" />
        </div>
        <div className="border border-border bg-card p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended allocation</p>
          <p className="mt-2 font-serif text-4xl font-semibold leading-none">{sizePct.toFixed(2)}%</p>
          <div className="mt-3 h-2 border border-border bg-background">
            <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, sizePct * 10))}%` }} />
          </div>
          {suggestedSizeUsdc !== undefined && (
            <p className="mt-2 font-mono text-sm text-muted-foreground">{formatUsdc(suggestedSizeUsdc)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ExitRulesPanel({ plan }: { plan: Record<string, unknown> }) {
  const rows = [
    ['Entry', plan.entryRule],
    ['Profit take', plan.profitTake],
    ['Hedge trigger', plan.hedgeTrigger],
    ['Stop loss', plan.stopLoss],
    ['Invalidation', plan.invalidation],
    ['Review', plan.reviewCadence],
  ].filter(([, value]) => typeof value === 'string' && value)

  if (rows.length === 0) return null

  return (
    <div className="border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Dynamic exit rules</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={String(label)} className="border-l border-accent/40 pl-3 text-sm leading-6 text-muted-foreground">
            <span className="block font-semibold text-foreground">{String(label)}</span>
            {String(value)}
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentTraceOutput({ step }: { step: WorkflowRun['steps'][number] }) {
  const record = asRecord(step.output)
  const name = step.nodeName.toLowerCase()
  const rawOutput = getDisplayOutput(step)
  const discoveredMarkets = Array.isArray(record.discoveredMarkets)
    ? record.discoveredMarkets.map(asRecord).filter((market) => market.title)
    : []
  const opportunities = Array.isArray(record.opportunities)
    ? record.opportunities.map(asRecord).filter((opportunity) => opportunity.market)
    : []
  const underratedMarkets = Array.isArray(record.underratedMarkets)
    ? record.underratedMarkets.map(asRecord).filter((market) => market.market)
    : []
  const credibilityNotes = asStringArray(record.credibilityNotes)
  const staleSourceWarnings = asStringArray(record.staleSourceWarnings)
  const correlationNotes = asStringArray(record.correlationNotes)
  const critique = asStringArray(record.critique)
  const probabilityFlags = asStringArray(record.probabilityFlags)
  const evidenceFlags = asStringArray(record.evidenceFlags)
  const missingEvidence = asStringArray(record.missingEvidence)
  const recommendedFixes = asStringArray(record.recommendedFixes)
  const signals = asStringArray(record.keySignals)
  const risks = asStringArray(record.risks)
  const sourceWeights = Array.isArray(record.sourceWeights)
    ? record.sourceWeights.map(asRecord).filter((source) => source.source)
    : []
  const tradeTicket = asRecord(record.tradeTicket)
  const isScannerStep = name.includes('opportunity scanner') || name.includes('mispricing scout') || name.includes('arbitrage')
  const isDiscoveryStep = name.includes('discovery')
  const isCredibilityStep = name.includes('credibility')
  const isAdversarialStep = name.includes('adversarial')
  const isPortfolioStep = name.includes('portfolio')
  const isMarketStep = !isDiscoveryStep && !isCredibilityStep && !isAdversarialStep && (name.includes('signal') || name.includes('research'))
  const isOddsStep = name.includes('odds') || name.includes('probability')
  const isSizingStep = !isPortfolioStep && (name.includes('sizing') || name.includes('kelly'))
  const isDecisionStep = name.includes('decision') || name.includes('brief')
  const isAnswer = record.answerMode === 'answer' || record.exactMarketPriced === false
  const needsMoreDetail = Boolean(record.needsMoreDetail)
  const isPass = String(record.action || '').toUpperCase() === 'PASS' ||
    ((isSizingStep || isPortfolioStep) && Number(record.suggestedSizePct || 0) <= 0)
  const hideSizing = isAnswer || needsMoreDetail
  const hidePortfolioRisk = isAnswer || needsMoreDetail
  const showTraceFooter = shouldShowTraceFooter({ isScannerStep, isCredibilityStep, isAdversarialStep })

  return (
    <div className="space-y-4">
      {isScannerStep && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Research desk scan</p>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {cleanScannerSummary(record.scanSummary || record.answer || record.thesis)}
            </p>
            {opportunities.length > 0 && (
              <div className="mt-4 grid gap-2">
                {opportunities.slice(0, 4).map((opportunity, index) => (
                  <a
                    key={`${String(opportunity.market)}-${index}`}
                    href={String(opportunity.url || '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid gap-2 border border-border bg-card p-3 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground sm:grid-cols-[1fr_auto]"
                  >
                    <span>
                      <span className="block font-medium text-foreground">{String(opportunity.market)}</span>
                      <span className="block">
                        {String(opportunity.outcomeName || 'Outcome')} · {formatPercent(opportunity.marketProbability)} market · {formatPercent(opportunity.estimatedEdge)} edge
                      </span>
                      {opportunity.evScore !== undefined && (
                        <span className="mt-1 block font-mono text-xs text-muted-foreground">
                          EV score {Number(opportunity.evScore).toFixed(0)}/100
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-xs uppercase text-accent">
                      {String(opportunity.status || opportunity.upside || 'watchlist')}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Qualified</p>
              <p className="mt-2 font-mono text-lg">{opportunities.length}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Watchlist</p>
              <p className="mt-2 font-mono text-lg">{underratedMarkets.length}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Source Quality</p>
              <p className="mt-2 font-mono text-sm uppercase">{String(record.sourceCredibility || 'medium')}</p>
            </div>
          </div>
          {underratedMarkets.length > 0 && (
            <div className="border-t border-border pt-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Watchlist</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {underratedMarkets.slice(0, 3).map((market, index) => (
                  <div key={`${String(market.market)}-${index}`} className="border border-border bg-card p-3 text-sm leading-6 text-muted-foreground">
                    <p className="font-medium text-foreground">{String(market.market)}</p>
                    <p>{String(market.outcomeName || 'Outcome')}: {cleanWatchlistReason(market.reason)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isDiscoveryStep && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Market discovery</p>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {String(record.answer || record.thesis || 'The discovery agent mapped the question to candidate prediction markets.')}
            </p>
            {discoveredMarkets.length > 0 && (
              <div className="mt-4 grid gap-2">
                {discoveredMarkets.slice(0, 3).map((market, index) => (
                  <a
                    key={`${String(market.title)}-${index}`}
                    href={String(market.url || '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-border bg-card p-3 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  >
                    <span className="line-clamp-2">{String(market.title)}</span>
                    <span className="shrink-0 font-mono text-xs uppercase text-accent">
                      {String(market.platform || 'Market')}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outcome</p>
              <p className="mt-2 font-serif text-2xl font-semibold">{String(record.outcomeName || '-')}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Market Prob.</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(record.marketProbability)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Exact Price</p>
              <p className="mt-2 font-mono text-sm uppercase">{record.exactMarketPriced ? 'found' : 'not found'}</p>
            </div>
          </div>
        </div>
      )}

      {isCredibilityStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Source audit</p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            Source quality is <span className="font-semibold text-foreground">{String(record.sourceCredibility || 'medium')}</span>. The audit checks whether evidence is current, direct, and useful for fair probability.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Credibility notes</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                {(credibilityNotes.length > 0 ? credibilityNotes : ['No major source-quality issues were flagged.']).slice(0, 3).map((note) => (
                  <li key={note} className="border-l border-accent/50 pl-3">{note}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Warnings</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                {(staleSourceWarnings.length > 0 ? staleSourceWarnings : ['No stale-source warnings.']).slice(0, 3).map((warning) => (
                  <li key={warning} className="border-l border-border pl-3">{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isAdversarialStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Adversarial review</p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {String(record.summary || 'The reviewer challenged the evidence, probability estimates, and decision logic.')}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Verdict</p>
              <p className="mt-2 font-serif text-2xl font-semibold capitalize">{String(record.adversarialVerdict || '-')}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trust</p>
              <p className="mt-2 font-mono text-lg">{Number(record.trustScore || 0).toFixed(0)}/100</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Action</p>
              <p className="mt-2 font-mono text-sm uppercase">{String(record.revisedAction || '-').replaceAll('_', ' ')}</p>
            </div>
          </div>
          {(critique.length > 0 || probabilityFlags.length > 0 || evidenceFlags.length > 0 || missingEvidence.length > 0 || recommendedFixes.length > 0) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Critique</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                  {[...critique, ...probabilityFlags, ...evidenceFlags].slice(0, 3).map((item) => (
                    <li key={item} className="border-l border-accent/50 pl-3">{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">What would improve it</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                  {[...missingEvidence, ...recommendedFixes].slice(0, 3).map((item) => (
                    <li key={item} className="border-l border-border pl-3">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {isMarketStep && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Research thesis</p>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {String(record.thesis || 'Research completed for this market.')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outcome</p>
              <p className="mt-2 font-serif text-2xl font-semibold">{String(record.outcomeName || '-')}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Market Prob.</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(record.marketProbability)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Source Quality</p>
              <p className="mt-2 font-mono text-sm uppercase">{String(record.sourceCredibility || '-')}</p>
            </div>
          </div>
        </div>
      )}

      {isOddsStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Fair odds read</p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {isAnswer
              ? String(record.answer || record.reasoning || 'The odds agent preserved the researched answer because no exact tradable market price was found.')
              : String(record.reasoning || 'The odds agent compared market probability with model probability.')}
          </p>
          {!isAnswer && <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Market</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(record.marketProbability)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Model</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(record.modelProbability)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Edge</p>
              <p className="mt-2 font-mono text-lg text-accent">{formatPercent(record.edge)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mispricing</p>
              <p className="mt-2 font-mono text-sm uppercase">{String(record.mispricing || '-')}</p>
            </div>
          </div>}
        </div>
      )}

      {isSizingStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{hideSizing ? 'Sizing skipped' : 'Position sizing'}</p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {cleanSizingCopy(record.sizingSkippedReason || record.hedgePlan || record.reasoning || 'The sizing agent applied bankroll and risk constraints.')}
          </p>
          {!hideSizing && <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bankroll</p>
              <p className="mt-2 font-mono text-lg">{formatUsdc(record.bankroll)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Kelly</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(record.kellyFraction, 2)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Size</p>
              <p className="mt-2 font-mono text-lg">{Number(record.suggestedSizePct || 0).toFixed(2)}%</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Max</p>
              <p className="mt-2 font-mono text-lg">{formatUsdc(record.suggestedSizeUsdc)}</p>
            </div>
          </div>}
        </div>
      )}

      {isDecisionStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{isAnswer ? 'Final answer' : 'Trade ticket'}</p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {isAnswer
              ? String(record.answer || record.summary || record.reasoning || 'Live research answered the question.')
              : String(record.summary || getTradeSummary(record))}
          </p>
          {!isAnswer && !isPass && <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Decision</p>
              <p className="mt-2 font-serif text-2xl font-semibold">{getTradeActionLabel(record.action)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outcome</p>
              <p className="mt-2 font-mono text-sm">{String(record.outcomeName || tradeTicket.outcomeName || '-')}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Limit</p>
              <p className="mt-2 font-mono text-lg">{formatPercent(tradeTicket.limitProbability)}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Max</p>
              <p className="mt-2 font-mono text-lg">{formatUsdc(tradeTicket.maxSizeUsdc)}</p>
            </div>
          </div>}
        </div>
      )}

      {isPortfolioStep && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {hidePortfolioRisk ? 'Portfolio check skipped' : 'Portfolio risk'}
          </p>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {hidePortfolioRisk
              ? 'Portfolio risk was not applied because this run did not produce an exact tradable recommendation.'
              : correlationNotes[2] || String(record.portfolioNotes || 'The portfolio agent checked exposure caps and correlation risk.')}
          </p>
          {!hidePortfolioRisk && <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Risk</p>
              <p className="mt-2 font-mono text-sm uppercase">{String(record.portfolioRisk || '-')}</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cap</p>
              <p className="mt-2 font-mono text-lg">{Number(record.exposureCapPct || 0).toFixed(2)}%</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Adjusted</p>
              <p className="mt-2 font-mono text-lg">{Number(record.adjustedSizePct || record.suggestedSizePct || 0).toFixed(2)}%</p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Max</p>
              <p className="mt-2 font-mono text-lg">{formatUsdc(record.adjustedSizeUsdc || record.suggestedSizeUsdc)}</p>
            </div>
          </div>}
        </div>
      )}

      {!isScannerStep && !isDiscoveryStep && !isCredibilityStep && !isAdversarialStep && !isMarketStep && !isOddsStep && !isSizingStep && !isPortfolioStep && !isDecisionStep && (
        <p className="text-base leading-8 text-muted-foreground">{rawOutput}</p>
      )}

      {showTraceFooter && (signals.length > 0 || risks.length > 0 || sourceWeights.length > 0) && (
        <div className="grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
          {signals.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Signals</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                {signals.slice(0, 3).map((signal) => (
                  <li key={signal} className="border-l border-accent/50 pl-3">{signal}</li>
                ))}
              </ul>
            </div>
          )}
          {risks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Risks</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                {risks.slice(0, 3).map((risk) => (
                  <li key={risk} className="border-l border-border pl-3">{risk}</li>
                ))}
              </ul>
            </div>
          )}
          {sourceWeights.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Source Weight</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {sourceWeights.slice(0, 3).map((source) => (
                  <div key={String(source.source)} className="flex items-center justify-between gap-3 border border-border bg-card px-3 py-2">
                    <span className="truncate">{String(source.source)}</span>
                    <span className="font-mono text-xs uppercase text-accent">{String(source.credibility || '-')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <details className="border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
          View raw step output
        </summary>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-border bg-background p-4 text-sm leading-7 text-foreground">
          {rawOutput}
        </pre>
      </details>
    </div>
  )
}

export default function WorkflowRunResultPage() {
  const params = useParams<{ runId: string }>()
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isRawOutputOpen, setIsRawOutputOpen] = useState(false)
  const [isTraceOpen, setIsTraceOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRun() {
      const localMatch = getWorkflowHistory().find((item) => item.id === params.runId) || null

      if (localMatch) {
        setRun(localMatch)
        setLoaded(true)
        return
      }

      try {
        const response = await fetch(`/api/runs/${params.runId}`)
        const data = await response.json()

        if (!cancelled && response.ok && data.success && data.run) {
          setRun(data.run)
          saveWorkflowRun(data.run)
          setLoaded(true)
          return
        }
      } catch {
        // Fall through to not found state.
      }

      if (!cancelled) {
        setRun(null)
        setLoaded(true)
      }
    }

    loadRun()

    return () => {
      cancelled = true
    }
  }, [params.runId])

  const paidSteps = useMemo(() => run?.steps.filter((step) => step.cost > 0) || [], [run])
  const visibleSteps = useMemo(() => run?.steps.filter(shouldShowTraceStep) || [], [run])
  const bettingBrief = visibleSteps.map((step) => step.output).find(isBettingBrief)
  const scannerReport = visibleSteps.map((step) => step.output).find(isScannerReport)
  const isSignalDeskRun = scannerReport?.deskDecision !== undefined
  const finalVisibleOutput = visibleSteps.length > 0
    ? getDisplayOutput(visibleSteps[visibleSteps.length - 1])
    : formatValue(run?.output)
  const primaryPayment = run?.payments?.find((payment) => payment.transaction || payment.settlementId)
  const txHash = primaryPayment?.transaction || primaryPayment?.settlementId
  const arcScanUrl = txHash ? `${arcTestnet.blockExplorers.default.url}/tx/${txHash}` : null
  const payer = primaryPayment?.payer
  const seller = primaryPayment?.recipient || DEMO_SELLER_ADDRESS
  const paymentCount = run?.payments?.length || 0
  const token = primaryPayment?.token || ARC_USDC_ADDRESS
  const network = primaryPayment?.network || `eip155:${arcTestnet.id}`
  const paymentSource = run?.paymentMode === 'agent-wallet' ? 'Agent Wallet' : 'Connected Wallet'
  const settlementMode = run?.settlementMode || 'direct-arc-usdc-transfer'
  const research = asRecord(bettingBrief?.research)
  const tradeTicket = asRecord(bettingBrief?.tradeTicket)
  const adversarialReview = asRecord(bettingBrief?.adversarialReview)
  const answerResult = isAnswerResult(bettingBrief)
  const passResult = isPassResult(bettingBrief)
  const finalRecommendation = bettingBrief
    ? answerResult
      ? String(bettingBrief.answer || bettingBrief.summary || bettingBrief.outcomeName || 'Answer produced')
      : `${getTradeActionLabel(bettingBrief.action)} ${String(bettingBrief.side || 'YES')} on ${String(bettingBrief.outcomeName || 'selected outcome')}`
    : scannerReport
      ? String(scannerReport.answer || cleanScannerSummary(scannerReport.scanSummary || scannerReport.thesis))
    : finalVisibleOutput.slice(0, 160)
  const keySignals = asStringArray(research.keySignals)
  const risks = asStringArray(research.risks)
  const liveSources = normalizeSources(research.liveSources)
  const scannerOpportunities = Array.isArray(scannerReport?.opportunities)
    ? scannerReport.opportunities.map(asRecord).filter((opportunity) => opportunity.market)
    : []
  const scannerUnderratedMarkets = Array.isArray(scannerReport?.underratedMarkets)
    ? scannerReport.underratedMarkets.map(asRecord).filter((market) => market.market)
    : []
  const scannerSources = normalizeSources(scannerReport?.liveSources)
  const resultSources = dedupeSources([
    ...liveSources,
    ...scannerSources,
    ...scannerOpportunities
      .filter((opportunity) => opportunity.url || opportunity.market)
      .map((opportunity) => ({
        title: opportunity.market,
        url: opportunity.url,
      })),
    ...visibleSteps.flatMap((step) => {
      const output = asRecord(step.output)
      const outputResearch = asRecord(output.research)
      const reviewed = asRecord(output.reviewed)
      const reviewedResearch = asRecord(reviewed.research)

      return [
        ...normalizeSources(output.liveSources),
        ...normalizeSources(outputResearch.liveSources),
        ...normalizeSources(reviewed.liveSources),
        ...normalizeSources(reviewedResearch.liveSources),
      ]
    }),
  ])

  const handleShareResult = async () => {
    const url = typeof window !== 'undefined'
      ? window.location.href
      : `/app/runs/${params.runId}`

    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading run...
      </main>
    )
  }

  if (!run) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <div className="border border-destructive/40 bg-destructive/10 p-8">
          <h1 className="font-serif text-5xl font-semibold text-destructive">Run not found</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            This result was not found locally or in durable run storage. It may have expired or storage may not be configured.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Back to Composer
          </Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/app">
            <BrandLockup compact />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShareResult}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Share Result'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app">
                <ArrowLeft className="h-4 w-4" />
                Back to Composer
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Workflow result
          </p>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <h1 className="font-serif text-6xl font-semibold leading-none md:text-7xl">
                +EV trader intelligence completed.
              </h1>
              <div className="mt-6 h-px w-full max-w-xl bg-accent" />
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                This page captures the market brief, specialist agent outputs, trade decision,
                and Arc USDC receipts for the paid intelligence workflow.
              </p>
            </div>

            <aside className="border border-border bg-card p-5">
              <div className="mb-5 flex items-center gap-2">
                {run.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <h2 className="font-serif text-3xl font-semibold leading-none">Circle/Arc Settlement Receipt</h2>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold uppercase tracking-[0.12em]">{run.status}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Total cost</span>
                  <span className="font-mono text-accent">{formatPrice(run.totalCost)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Payment source</span>
                  <span>{paymentSource}</span>
                </div>
                {paymentCount > 0 && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-muted-foreground">Payment events</span>
                    <span>{paymentCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Settlement</span>
                  <span className="text-right text-xs font-semibold uppercase tracking-[0.12em]">{settlementMode.replaceAll('-', ' ')}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Total run time</span>
                  <span>{formatDuration(run.duration)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Agents</span>
                  <span>{run.nodes.filter((node) => node.type === 'agent').length}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatTimestamp(run.timestamp)}</span>
                </div>
                {arcScanUrl && (
                  <a
                    href={arcScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-t border-border pt-3 text-accent hover:text-foreground"
                  >
                    <span>ArcScan transaction</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {payer && (
                  <div className="border-t border-border pt-3">
                    <span className="text-muted-foreground">Payer</span>
                    <p className="mt-1 truncate font-mono text-xs">{payer}</p>
                  </div>
                )}
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground">Primary seller</span>
                  <p className="mt-1 truncate font-mono text-xs">{seller}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground">Token</span>
                  <p className="mt-1 truncate font-mono text-xs">{token}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-mono text-xs">{network}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <article className="mb-6 border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Agent Economy Summary
              </p>
              <h2 className="mt-1 font-serif text-3xl font-semibold leading-none">
                Paid agents produced this research result.
              </h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Run brief</p>
              <p className="mt-3 text-base leading-8 text-muted-foreground">
                {getRunBrief(run.input)}
              </p>
            </div>
            <div className="border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Final recommendation</p>
              <p className="mt-3 font-serif text-3xl font-semibold leading-tight">
                {finalRecommendation}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Agents paid</p>
              <p className="mt-2 font-mono text-xl">{paidSteps.length}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">USDC paid</p>
              <p className="mt-2 font-mono text-xl text-accent">{formatPrice(run.totalCost)}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payment source</p>
              <p className="mt-2 font-mono text-sm uppercase">{paymentSource}</p>
            </div>
            <div className="border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Settlement</p>
              <p className="mt-2 font-mono text-sm uppercase">{settlementMode.replaceAll('-', ' ')}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
            <span>
              {paymentCount > 0
                ? `${paymentCount} payment receipt${paymentCount === 1 ? '' : 's'} recorded`
                : 'No paid payment receipt recorded'}
            </span>
            {arcScanUrl && (
              <a
                href={arcScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-foreground"
              >
                View Arc settlement
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </article>

        {bettingBrief && (
          <article className="mb-6 border border-accent/40 bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Live Market Decision
                </p>
                <h2 className="mt-2 font-serif text-4xl font-semibold leading-none">
                  {answerResult ? 'Answer' : getTradeActionLabel(bettingBrief.action)}
                </h2>
              </div>
              <span className="border border-accent/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                {answerResult
                  ? String(bettingBrief.marketType || 'research').replaceAll('_', ' ')
                  : `${String(bettingBrief.confidence || 'medium')} confidence`}
              </span>
            </div>

            <div className="border-y border-border py-5">
              <h3 className="font-serif text-5xl font-semibold leading-none">
                {String(bettingBrief.market || 'Prediction market')}
              </h3>
              <p className="mt-4 max-w-4xl text-base leading-8 text-muted-foreground">
                {answerResult
                  ? String(bettingBrief.answer || bettingBrief.summary || bettingBrief.reasoning || 'Live research answered the question.')
                  : getTradeSummary(bettingBrief)}
              </p>
            </div>

            {!answerResult && (
              <div className="mt-5">
                <EvSizingGauge
                  marketProbability={bettingBrief.marketProbability}
                  modelProbability={bettingBrief.modelProbability}
                  edge={bettingBrief.edge}
                  suggestedSizePct={bettingBrief.suggestedSizePct}
                  suggestedSizeUsdc={bettingBrief.suggestedSizeUsdc}
                />
              </div>
            )}

            {answerResult ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Answer</p>
                  <p className="mt-2 font-serif text-3xl font-semibold">{String(bettingBrief.outcomeName || bettingBrief.answer || '-')}</p>
                </div>
                <div className="border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mode</p>
                  <p className="mt-2 font-mono text-sm uppercase">{String(bettingBrief.answerMode || 'answer')}</p>
                </div>
                <div className="border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trade Status</p>
                  <p className="mt-2 font-mono text-sm uppercase">No exact market price</p>
                </div>
              </div>
            ) : (
            <div className={`grid gap-4 ${passResult ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outcome</p>
                <p className="mt-2 font-serif text-3xl font-semibold">{String(bettingBrief.outcomeName || bettingBrief.side || '-')}</p>
                {typeof bettingBrief.side === 'string' && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{String(bettingBrief.side)}</p>
                )}
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Market Prob.</p>
                <p className="mt-2 font-mono text-xl">{formatPercent(bettingBrief.marketProbability)}</p>
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Model Prob.</p>
                <p className="mt-2 font-mono text-xl">{formatPercent(bettingBrief.modelProbability)}</p>
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Edge</p>
                <p className="mt-2 font-mono text-xl text-accent">{formatPercent(bettingBrief.edge)}</p>
              </div>
              {!passResult && <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Suggested Size</p>
                <p className="mt-2 font-mono text-xl">{Number(bettingBrief.suggestedSizePct || 0).toFixed(2)}%</p>
              </div>}
            </div>
            )}

            {!answerResult && <div className={`mt-4 grid gap-4 ${passResult ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mispricing</p>
                <p className="mt-2 font-mono text-sm uppercase">{String(bettingBrief.mispricing || 'unknown')}</p>
              </div>
              {passResult ? (
                <div className="border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sizing</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {String(bettingBrief.sizingSkippedReason || 'Skipped because the recommendation is PASS.')}
                  </p>
                </div>
              ) : (
              <>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Max Size</p>
                <p className="mt-2 font-mono text-sm">{formatUsdc(bettingBrief.suggestedSizeUsdc)}</p>
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Limit Prob.</p>
                <p className="mt-2 font-mono text-sm">
                  {typeof tradeTicket.limitProbability === 'number'
                    ? formatPercent(tradeTicket.limitProbability)
                    : '-'}
                </p>
              </div>
              </>
              )}
            </div>}


            {Object.keys(adversarialReview).length > 0 && (
              <div className="mt-5 border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Adversarial Review
                    </p>
                    <p className="mt-2 text-base leading-7 text-muted-foreground">
                      {String(adversarialReview.summary || 'The reviewer challenged the reasoning behind this recommendation.')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="border border-accent/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      {String(adversarialReview.verdict || '-')}
                    </span>
                    <span className="border border-border px-3 py-2 font-mono text-xs">
                      {Number(adversarialReview.trustScore || 0).toFixed(0)}/100
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{answerResult ? 'Why this answer' : 'Why'}</h3>
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  {String(bettingBrief.reasoning || research.thesis || 'No written reasoning returned for this run.')}
                </p>
                {!answerResult && typeof bettingBrief.hedgePlan === 'string' && (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    Hedge plan: {String(bettingBrief.hedgePlan)}
                  </p>
                )}
                {!answerResult && Object.keys(asRecord(bettingBrief.dynamicExitRules)).length > 0 && (
                  <div className="mt-5">
                    <ExitRulesPanel plan={asRecord(bettingBrief.dynamicExitRules)} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {keySignals.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Signals</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                      {keySignals.slice(0, 4).map((signal) => (
                        <li key={signal} className="border-l border-accent/50 pl-3">{signal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {risks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Risks</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                      {risks.slice(0, 4).map((risk) => (
                        <li key={risk} className="border-l border-border pl-3">{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

          </article>
        )}

        {!bettingBrief && scannerReport && (
          <article className="mb-6 border border-accent/40 bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Live Market Decision
                </p>
                <h2 className="mt-2 font-serif text-4xl font-semibold leading-none">
                  {isSignalDeskRun ? 'Autonomous Signal Desk' : 'Live Mispricing Scout'}
                </h2>
              </div>
            </div>

            <div className="border-y border-border py-5">
              <h3 className="font-serif text-5xl font-semibold leading-none">
                {getScannerHeadline(scannerReport, scannerOpportunities)}
              </h3>
              <p className="mt-4 max-w-4xl text-base leading-8 text-muted-foreground">
                {cleanScannerSummary(scannerReport.scanSummary || scannerReport.thesis || scannerReport.answer)}
              </p>
              {scannerOpportunities.length === 0 && (
                <p className="mt-3 max-w-4xl border-l border-accent/40 pl-3 text-sm leading-7 text-muted-foreground">
                  No trade is an intentional outcome here. The agent is paid to decide, and sometimes the right decision is to preserve capital until the market shows a cleaner edge.
                </p>
              )}
              {isSignalDeskRun && typeof scannerReport.deskRationale === 'string' && (
                <p className="mt-3 max-w-4xl border-l border-accent/40 pl-3 text-sm leading-7 text-muted-foreground">
                  Desk rationale: {scannerReport.deskRationale}
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-3">
              {scannerOpportunities.length > 0 ? scannerOpportunities.slice(0, 5).map((opportunity, index) => (
                <div key={`${String(opportunity.market)}-${index}`} className="border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                        {getOpportunityStatusLabel(opportunity.status)} {String(index + 1).padStart(2, '0')}
                      </p>
                      <h4 className="mt-2 font-serif text-3xl font-semibold leading-tight">
                        {String(opportunity.market)}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {String(opportunity.reason || 'Live scanner identified this as a candidate market.')}
                      </p>
                      {typeof opportunity.edgeBasis === 'string' && opportunity.edgeBasis && (
                        <p className="mt-2 border-l border-accent/40 pl-3 text-xs leading-6 text-muted-foreground">
                          {opportunity.edgeBasis}
                        </p>
                      )}
                      {Object.keys(asRecord(opportunity.arbitrage)).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="border border-border px-2 py-1 font-mono uppercase text-muted-foreground">
                            Buy {String(asRecord(opportunity.arbitrage).cheaperPlatform)} @ {formatPercent(asRecord(opportunity.arbitrage).cheaperPrice)}
                          </span>
                          <span className="border border-border px-2 py-1 font-mono uppercase text-muted-foreground">
                            Ref {String(asRecord(opportunity.arbitrage).richerPlatform)} @ {formatPercent(asRecord(opportunity.arbitrage).richerPrice)}
                          </span>
                          <span className="border border-accent/40 px-2 py-1 font-mono uppercase text-accent">
                            Spread {formatPercent(asRecord(opportunity.arbitrage).spread)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof opportunity.status === 'string' && (
                        <span className="border border-border px-3 py-2 font-mono text-xs uppercase text-accent">
                          {getOpportunityStatusLabel(opportunity.status)}
                        </span>
                      )}
                      <span className="border border-border px-3 py-2 font-mono text-xs uppercase text-accent">
                        {String(opportunity.upside || 'medium')} upside
                      </span>
                    </div>
                  </div>
                  {(opportunity.marketProbability !== undefined || opportunity.estimatedModelProbability !== undefined) && (
                    <div className="mt-4">
                      <EvSizingGauge
                        title={Object.keys(asRecord(opportunity.arbitrage)).length > 0 ? 'Arbitrage / sizing gauge' : 'EV / sizing gauge'}
                        marketProbability={opportunity.marketProbability}
                        modelProbability={opportunity.estimatedModelProbability}
                        edge={opportunity.estimatedEdge}
                        suggestedSizePct={asRecord(opportunity.sizing).suggestedSizePct}
                        suggestedSizeUsdc={asRecord(opportunity.sizing).suggestedSizeUsdc}
                      />
                    </div>
                  )}
                  {Object.keys(asRecord(opportunity.fairProbabilityModel)).length > 0 && (
                    <div className="mt-4 border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Fair Probability Model</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {[
                          ['Base rate', asRecord(opportunity.fairProbabilityModel).baseRate],
                          ['Market price', asRecord(opportunity.fairProbabilityModel).marketPrice],
                          ['Catalyst adjustment', asRecord(opportunity.fairProbabilityModel).catalystAdjustment],
                          ['Liquidity penalty', asRecord(opportunity.fairProbabilityModel).liquidityPenalty],
                          ['Source confidence', asRecord(opportunity.fairProbabilityModel).sourceConfidenceAdjustment],
                          ['Final fair', asRecord(opportunity.fairProbabilityModel).finalFairProbability],
                          ['Why not promoted', asRecord(opportunity.fairProbabilityModel).whyNotPromoted],
                          ['Promotion trigger', asRecord(opportunity.fairProbabilityModel).promotionTrigger],
                        ].filter(([, value]) => typeof value === 'string' && value).map(([label, value]) => (
                          <div key={String(label)} className="border border-border bg-background p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{String(label)}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncateText(value, 360)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {typeof opportunity.catalyst === 'string' && opportunity.catalyst && (
                      <div className="border border-border bg-card p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Catalyst</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncateText(opportunity.catalyst, 460)}</p>
                      </div>
                    )}
                    {typeof opportunity.fairProbabilityMethod === 'string' && opportunity.fairProbabilityMethod && (
                      <div className="border border-border bg-card p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fair Method</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncateText(opportunity.fairProbabilityMethod, 360)}</p>
                      </div>
                    )}
                    {typeof opportunity.slowToPriceReason === 'string' && opportunity.slowToPriceReason && (
                      <div className="border border-border bg-card p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Slow to Price</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncateText(opportunity.slowToPriceReason, 360)}</p>
                      </div>
                    )}
                    {typeof opportunity.failureMode === 'string' && opportunity.failureMode && (
                      <div className="border border-border bg-card p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failure Mode</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncateText(opportunity.failureMode, 360)}</p>
                      </div>
                    )}
                  </div>
                  {Object.keys(asRecord(opportunity.exitPlan)).length > 0 && (
                    <div className="mt-4">
                      <ExitRulesPanel plan={asRecord(opportunity.exitPlan)} />
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outcome</p>
                      <p className="mt-2 font-serif text-2xl font-semibold">{String(opportunity.outcomeName || '-')}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Side</p>
                      <p className="mt-2 font-mono text-sm uppercase">{String(opportunity.side || 'YES')}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Market</p>
                      <p className="mt-2 font-mono text-lg">{formatPercent(opportunity.marketProbability)}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fair</p>
                      <p className="mt-2 font-mono text-lg">{formatPercent(opportunity.estimatedModelProbability)}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Edge</p>
                      <p className="mt-2 font-mono text-lg text-accent">{formatPercent(opportunity.estimatedEdge)}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Liquidity</p>
                      <p className="mt-2 font-mono text-sm uppercase">{String(opportunity.liquidity || '-')}</p>
                    </div>
                    <div className="border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">EV Score</p>
                      <p className="mt-2 font-mono text-lg">{opportunity.evScore !== undefined ? Number(opportunity.evScore).toFixed(0) : '-'}</p>
                    </div>
                  </div>
                  {typeof opportunity.url === 'string' && opportunity.url && (
                    <a
                      href={opportunity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-accent hover:text-foreground"
                    >
                      View live market
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )) : (
                <div className="border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
                  No qualified trade cleared the desk. That is a valid agent decision. The watchlist below shows the closest candidates and why they were not promoted.
                </div>
              )}
            </div>

            {scannerUnderratedMarkets.length > 0 && (
              <div className="mt-5 border-t border-border pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Watchlist</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {scannerUnderratedMarkets.slice(0, 3).map((market, index) => (
                    <div key={`${String(market.market)}-${index}`} className="border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
                      <p className="font-medium text-foreground">{String(market.market)}</p>
                      <p className="mt-1">{String(market.outcomeName || 'Outcome')}: {cleanWatchlistReason(market.reason)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </article>
        )}

        <div className="border border-border bg-card">
          <button
            onClick={() => setIsRawOutputOpen((current) => !current)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/60"
          >
            <span className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                View Raw Output
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isRawOutputOpen ? 'rotate-180' : ''}`} />
          </button>
          {isRawOutputOpen && (
            <div className="border-t border-border p-5">
              <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap border border-border bg-background p-5 text-sm leading-7 text-foreground">
                {finalVisibleOutput}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-4 border border-border bg-card">
          <button
            onClick={() => setIsInputOpen((current) => !current)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/60"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                View Original Input
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isInputOpen ? 'rotate-180' : ''}`} />
          </button>
          {isInputOpen && (
            <div className="border-t border-border p-5">
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap border border-border bg-background p-4 text-sm leading-7 text-foreground">
                {run.input}
              </pre>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <article className="border border-border bg-card">
          <button
            onClick={() => setIsTraceOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/60"
          >
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-accent" />
              <div>
                <h2 className="font-serif text-3xl font-semibold leading-none">Agent Trace</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visibleSteps.length} paid agent steps, collapsed by default for a cleaner report.
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isTraceOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTraceOpen && (
            <div className="grid gap-4 border-t border-border p-5">
              {visibleSteps.map((step, index) => (
                <div key={`${step.nodeId}-${index}`} className="border border-border bg-background p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="mt-1 font-serif text-3xl font-semibold leading-none">{step.nodeName}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(step.duration)}
                      </span>
                      {step.cost > 0 && (
                        <span className="flex items-center gap-1 font-mono text-accent">
                          <WalletCards className="h-4 w-4" />
                          {formatPrice(step.cost)}
                        </span>
                      )}
                      <span className="border border-accent/30 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                        {step.status}
                      </span>
                    </div>
                  </div>
                  <AgentTraceOutput step={step} />
                </div>
              ))}
            </div>
          )}
        </article>

        {resultSources.length > 0 && (
          <article className="mt-6 border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Sources
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-none">Sources</h2>
              </div>
              <span className="border border-border px-3 py-2 font-mono text-xs uppercase text-muted-foreground">
                {resultSources.length} links
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {resultSources.map((source, index) => (
                <a
                  key={`${String(source.url || source.title)}-${index}`}
                  href={String(source.url || '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-border bg-background p-3 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground"
                >
                  <span className="line-clamp-2">{String(source.title || source.url)}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ))}
            </div>
          </article>
        )}

        {paidSteps.length > 0 && (
          <article className="mt-6 border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-accent" />
              <h2 className="font-serif text-3xl font-semibold leading-none">Circle/Arc Payment Events</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {run.payments?.map((payment) => (
                <div key={payment.id} className="border border-border bg-background p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-accent">{formatPrice(payment.amount)}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {payment.status || 'verified'}
                    </span>
                  </div>
                  {(payment.transaction || payment.settlementId) && (
                    payment.transaction ? (
                      <a
                        href={`${arcTestnet.blockExplorers.default.url}/tx/${payment.transaction}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-between gap-2 font-mono text-xs text-accent hover:text-foreground"
                      >
                        <span className="truncate">{payment.transaction}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                        {payment.settlementId}
                      </p>
                    )
                  )}
                  {payment.payer && (
                    <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                      payer: {payment.payer}
                    </p>
                  )}
                  {(payment.recipient || seller) && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      seller: {payment.recipient || seller}
                    </p>
                  )}
                  {(payment.token || token) && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      token: {payment.token || token}
                    </p>
                  )}
                  {payment.network && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {payment.network}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </article>
        )}
      </section>
    </main>
  )
}
