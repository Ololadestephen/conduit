'use client'

import type { ReactNode } from 'react'
import { FileText, PanelBottomClose, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AgentNode } from '@/lib/workflow-types'

interface AgentConfigPanelProps {
  node: AgentNode | null
  onConfigChange: (nodeId: string, config: Record<string, unknown>) => void
  onClose?: () => void
  input?: string
  onInputChange?: (value: string) => void
  isRunning?: boolean
  layout?: 'bottom' | 'rail'
  actionSlot?: ReactNode
}

const languageOptions = [
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

const riskOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const focusAreaOptions = [
  { value: 'macro', label: 'Macro' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'sports', label: 'Sports' },
  { value: 'politics', label: 'Politics' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'technology', label: 'Technology' },
]

const configurableAgentIds = [
  'summarizer',
  'translator',
  'sentiment',
  'code-reviewer',
  'webhook',
  'market-opportunity-scanner',
  'market-researcher',
  'probability-estimator',
  'kelly-sizer',
]

const marketSamplePrompts = [
  {
    label: 'EPL winner',
    prompt: `Focus area: sports.

Use the live Polymarket/Kalshi market feed before reasoning. Scan Premier League title, top-four, exact finishing-position, relegation, and related team markets.

Find one best available scout pick. Use exact current market price, liquidity, official table/points, matches remaining, fixtures, injuries/team news, and recent form. If no qualified +EV trade clears the bar, return the strongest screening pick and explain what would upgrade it.

Avoid preseason tables, old-season articles, sportsbook odds as catalysts, and generic "strong team" claims.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Macro scout',
    prompt: `Focus area: macro.

Use the live Polymarket/Kalshi market feed before reasoning. Scan Fed decisions, CPI, PCE, jobs/payrolls, unemployment, recession, GDP, Treasury yields, oil/gas/gold/dollar, shutdown, and tariff markets.

Find one qualified trade if a fresh data/policy catalyst supports edge. Otherwise return one best priced market to monitor plus up to three watchlist ideas. Include exact market price, catalyst, source, fair probability method, slow-to-price reason, failure mode, market quality score, liquidity, and source quality.

Prefer Fed/FOMC, BLS, BEA, CME FedWatch, Treasury, Reuters/Bloomberg/CNBC. Avoid old Fed meetings, stale CPI articles, and sentiment-only macro takes. Do not claim estimated edge unless there is a transparent fair-probability model.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Crypto scout',
    prompt: `Focus area: crypto.

Use the live Polymarket/Kalshi market feed before reasoning. Scan BTC, ETH, SOL, XRP, ETF, stablecoin, regulation, exchange listing, protocol-event, and price-threshold markets.

Find one best available scout pick. Use exact current market price, spot distance to threshold, ETF flow/news, SEC/CFTC filings, exchange announcements, court/regulatory updates, liquidity, and source quality. If no qualified +EV trade clears the bar, return a screening pick instead of a generic overview.

Avoid meme-only markets, generic crypto optimism, stale price targets, social hype, and price-only arguments.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Fed rates',
    prompt: `Focus area: macro.

Use the live Polymarket/Kalshi market feed before reasoning. Find the exact priced market closest to the next Federal Reserve rate decision.

Compare the current market probability with a fair probability built from recent CPI/PCE, payrolls, unemployment, Fed speaker guidance, FOMC minutes/dots, CME FedWatch, and Treasury/Fed-funds pricing. Return a qualified trade only if the probability model is transparent; otherwise return the best priced market to monitor with exact price, catalyst, fair probability gap needed, and failure mode.

Bankroll: 1000 USDC
Risk tolerance: low`,
  },
  {
    label: 'Arc mainnet',
    prompt: `Focus area: technology.

Use the live Polymarket/Kalshi market feed before reasoning. Search for any exact priced market about Arc, Circle, stablecoin L1s, launch timing, Canteen, or adjacent mainnet/product-launch proxies.

If an exact priced market exists, estimate edge using live Arc/Circle/Canteen docs, product updates, and credible reporting. If no exact market exists, say so clearly and return an evidence answer instead of inventing a price.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Politics',
    prompt: `Focus area: politics.

Use the live Polymarket/Kalshi market feed before reasoning. Scan elections, party control, nominations, approval, legislation, court rulings, policy outcomes, and candidate markets.

Find one best available scout pick. Use exact current market price, polling averages, official election calendars, court/government pages, reputable news, source quality, and a clear failure mode. Never recommend YES on two opposing sides of the same market family.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Music awards',
    prompt: `Focus area: entertainment.

Use the live Polymarket/Kalshi market feed before reasoning. Scan Grammys, Oscars, Emmys, Billboard/chart, album/song/artist-award, box office, streaming, and release-outcome markets.

Find one best available scout pick. Use exact current market price, official nominations/calendars, chart movement, streaming data, box office reports, release timing, and reputable industry reporting. If no qualified +EV trade clears the bar, return a screening pick or watchlist.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
  {
    label: 'Tech catalyst',
    prompt: `Focus area: technology.

Use the live Polymarket/Kalshi market feed before reasoning. Scan AI, chips, product launches, earnings, Tesla, Nvidia, OpenAI, SpaceX, Apple, Google, Microsoft, regulation, lawsuits, and filing-driven markets.

Find one qualified trade if a fresh company/regulatory catalyst supports edge. Otherwise return one best available screening pick plus watchlist. Include exact market price, catalyst, source, fair probability method, slow-to-price reason, failure mode, EV score, liquidity, and source quality.

Bankroll: 1000 USDC
Risk tolerance: medium`,
  },
]

export function AgentConfigPanel({
  node,
  onConfigChange,
  onClose,
  input,
  onInputChange,
  isRunning,
  layout = 'bottom',
  actionSlot,
}: AgentConfigPanelProps) {
  const updateConfig = (key: string, value: unknown) => {
    if (!node) return
    onConfigChange(node.id, {
      ...(node.config || {}),
      [key]: value,
    })
  }

  const isMarketWorkflow = node?.agentId === 'text-input' || [
    'market-researcher',
    'market-opportunity-scanner',
    'probability-estimator',
    'kelly-sizer',
    'betting-brief',
  ].includes(node?.agentId || '')

  const hasConfigurableOptions = Boolean(node && configurableAgentIds.includes(node.agentId))
  const inputPlaceholder = isMarketWorkflow
    ? `Ask a market question or paste a priced market brief.

Example:
Market: Premier League winner 2026
Outcome: Arsenal YES
Market probability: 83%
Bankroll: 1000 USDC
Context: latest table, injuries, odds, sentiment`
    : 'Paste the text, code, or data your agents should process.'

  const isRail = layout === 'rail'

  return (
    <section className={isRail ? 'flex h-full w-[390px] shrink-0 flex-col bg-card' : 'shrink-0 border-t border-border bg-card'}>
      <div className={`flex items-center justify-between gap-3 border-b border-border ${isRail ? 'px-4 py-4' : 'px-5 py-3'}`}>
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <div>
            <h3 className={`font-serif font-semibold leading-none ${isRail ? 'text-2xl' : 'text-3xl'}`}>Agent Settings</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Configure run input and selected agent
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Hide agent settings">
            <PanelBottomClose className={`h-4 w-4 ${isRail ? '-rotate-90' : ''}`} />
          </Button>
        )}
      </div>

      {actionSlot && (
        <div className="border-b border-border bg-background px-4 py-3">
          {actionSlot}
        </div>
      )}

      <div className={isRail ? 'flex-1 overflow-y-auto' : 'grid min-h-64 grid-cols-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)]'}>
        <section className={isRail ? 'border-b border-border p-4' : 'border-b border-border p-5 lg:border-b-0 lg:border-r'}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className={`font-serif font-semibold leading-none ${isRail ? 'text-xl' : 'text-2xl'}`}>Run Input</h4>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{input?.length || 0} chars</span>
          </div>
          <Textarea
            value={input || ''}
            onChange={(event) => onInputChange?.(event.target.value)}
            disabled={isRunning}
            placeholder={inputPlaceholder}
            className={`${isRail ? 'h-56' : 'h-44'} resize-none border-border bg-background text-sm leading-6`}
          />
          {isMarketWorkflow && onInputChange && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sample prompts
              </p>
              <div className="grid gap-2">
                {marketSamplePrompts.map((sample) => (
                  <Button
                    key={sample.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRunning}
                    className="justify-start"
                    onClick={() => onInputChange(sample.prompt)}
                  >
                    {sample.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={isRail ? 'p-4' : 'p-5'}>
          {!node ? (
            <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
              Select an agent on the canvas to configure how it processes workflow data.
            </div>
          ) : !hasConfigurableOptions ? (
            <div className="border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
              {node.agentId === 'text-input'
                ? 'Use Run Input above. This node only passes your prompt into the workflow.'
                : 'No adjustable settings for this node. It uses the workflow input, live research, and upstream agent output.'}
            </div>
          ) : (
            <div className={isRail ? 'grid gap-4' : 'grid gap-4 md:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1fr)]'}>
              <div className="border border-border bg-background p-3">
                <p className={`font-serif font-semibold leading-none ${isRail ? 'text-xl' : 'text-2xl'}`}>{node.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{node.description}</p>
              </div>

              <div className="space-y-4">
                {node.agentId === 'summarizer' && (
                  <>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select
                        value={(node.config?.summaryStyle as string) || 'concise'}
                        onValueChange={(value) => updateConfig('summaryStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select
                        value={(node.config?.format as string) || 'paragraph'}
                        onValueChange={(value) => updateConfig('format', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paragraph">Paragraph</SelectItem>
                          <SelectItem value="bullets">Bullets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {node.agentId === 'translator' && (
                  <div className="space-y-2">
                    <Label>Target Language</Label>
                    <Select
                      value={(node.config?.targetLang as string) || 'es'}
                      onValueChange={(value) => updateConfig('targetLang', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {node.agentId === 'sentiment' && (
                  <div className="space-y-2">
                    <Label>Detail Level</Label>
                    <Select
                      value={(node.config?.detailLevel as string) || 'standard'}
                      onValueChange={(value) => updateConfig('detailLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">Brief</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="deep">Deep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {node.agentId === 'code-reviewer' && (
                  <div className="space-y-2">
                    <Label>Strictness</Label>
                    <Select
                      value={(node.config?.strictness as string) || 'balanced'}
                      onValueChange={(value) => updateConfig('strictness', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {node.agentId === 'webhook' && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={(node.config?.url as string) || ''}
                      onChange={(event) => updateConfig('url', event.target.value)}
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                )}

                {node.agentId === 'market-opportunity-scanner' && (
                  <>
                    <div className="space-y-2">
                      <Label>Focus Area</Label>
                      <Select
                        value={(node.config?.focusArea as string) || 'macro'}
                        onValueChange={(value) => updateConfig('focusArea', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {focusAreaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Scan Depth</Label>
                      <Select
                        value={(node.config?.scanDepth as string) || 'underrated'}
                        onValueChange={(value) => updateConfig('scanDepth', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="underrated">Underrated upside</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="conservative">Conservative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Candidates</Label>
                      <Input
                        type="number"
                        min="3"
                        max="6"
                        value={(node.config?.maxCandidates as number) || 4}
                        onChange={(event) => updateConfig('maxCandidates', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Edge %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="25"
                        step="0.5"
                        value={(node.config?.minEdgePct as number) || 3}
                        onChange={(event) => updateConfig('minEdgePct', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Market Probability %</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        step="0.5"
                        value={(node.config?.minMarketProbabilityPct as number) || 5}
                        onChange={(event) => updateConfig('minMarketProbabilityPct', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cross-Market Spread %</Label>
                      <Input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={(node.config?.minSpreadPct as number) || 2}
                        onChange={(event) => updateConfig('minSpreadPct', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cross-Market Match</Label>
                      <Input
                        type="number"
                        min="0.35"
                        max="0.9"
                        step="0.01"
                        value={(node.config?.minMatchScore as number) || 0.48}
                        onChange={(event) => updateConfig('minMatchScore', Number(event.target.value))}
                      />
                    </div>
                  </>
                )}

                {node.agentId === 'market-researcher' && (
                  <>
                    <div className="space-y-2">
                      <Label>Vertical</Label>
                      <Select
                        value={(node.config?.vertical as string) || 'crypto'}
                        onValueChange={(value) => updateConfig('vertical', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crypto">Crypto</SelectItem>
                          <SelectItem value="politics">Politics</SelectItem>
                          <SelectItem value="macro">Macro</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Source Weighting</Label>
                      <Select
                        value={(node.config?.sourceWeighting as string) || 'balanced'}
                        onValueChange={(value) => updateConfig('sourceWeighting', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {node.agentId === 'probability-estimator' && (
                  <div className="space-y-2">
                    <Label>Market Probability</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max="0.99"
                      step="0.01"
                      value={(node.config?.marketProbability as number) || 0.5}
                      onChange={(event) => updateConfig('marketProbability', Number(event.target.value))}
                    />
                  </div>
                )}

                {node.agentId === 'kelly-sizer' && (
                  <>
                    <div className="space-y-2">
                      <Label>Bankroll (USDC)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={(node.config?.bankroll as number) || 1000}
                        onChange={(event) => updateConfig('bankroll', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Position %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={(node.config?.maxPositionPct as number) || 5}
                        onChange={(event) => updateConfig('maxPositionPct', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Risk Tolerance</Label>
                      <Select
                        value={(node.config?.riskTolerance as string) || 'medium'}
                        onValueChange={(value) => updateConfig('riskTolerance', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {riskOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
