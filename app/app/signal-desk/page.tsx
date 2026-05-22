'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Radar,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WalletHeader } from '@/components/wallet-header'
import {
  CRYPTO_SCOUT_PROMPT,
  ENTERTAINMENT_SCOUT_PROMPT,
  MACRO_SCOUT_PROMPT,
  POLITICS_SCOUT_PROMPT,
  SPORTS_SCOUT_PROMPT,
  TECHNOLOGY_SCOUT_PROMPT,
} from '@/lib/workflow-templates'
import { ARC_USDC_ADDRESS, arcTestnet } from '@/lib/arc-chain'
import {
  calculateWorkflowCost,
  getAgentPaymentPlan,
  groupAgentPayments,
} from '@/lib/agent-registry'
import { generateId, type PaymentEvent } from '@/lib/workflow-types'
import { saveWorkflowRun, type WorkflowRun, type WorkflowStep } from '@/lib/workflow-history'

type FocusArea = 'macro' | 'crypto' | 'sports' | 'politics' | 'entertainment' | 'technology'
type RiskTolerance = 'low' | 'medium' | 'high'

interface AgentSettlement {
  recipient: `0x${string}`
  amount: number
  txHash?: `0x${string}`
  settlementId?: string
  payer?: string
  token: `0x${string}`
  network: string
  nodeIds: string[]
}

const FOCUS_OPTIONS: Array<{
  id: FocusArea
  label: string
  description: string
  prompt: string
}> = [
  {
    id: 'macro',
    label: 'Macro',
    description: 'Fed, CPI, jobs, recession, rates',
    prompt: MACRO_SCOUT_PROMPT,
  },
  {
    id: 'crypto',
    label: 'Crypto',
    description: 'BTC, ETH, ETFs, regulation',
    prompt: CRYPTO_SCOUT_PROMPT,
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'Standings, injuries, fixtures',
    prompt: SPORTS_SCOUT_PROMPT,
  },
  {
    id: 'politics',
    label: 'Politics',
    description: 'Elections, polls, court rulings',
    prompt: POLITICS_SCOUT_PROMPT,
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Awards, charts, box office',
    prompt: ENTERTAINMENT_SCOUT_PROMPT,
  },
  {
    id: 'technology',
    label: 'Technology',
    description: 'AI, chips, launches, filings',
    prompt: TECHNOLOGY_SCOUT_PROMPT,
  },
]

const RISK_RULES: Record<RiskTolerance, string> = {
  low: 'Use low risk. Prefer no-trade unless the catalyst is primary-source backed. Cap sizing aggressively and avoid longshots.',
  medium: 'Use medium risk. Rank one opportunity only if edge, catalyst, and source quality clear the bar. Otherwise preserve capital.',
  high: 'Use high risk but stay evidence-led. Allow asymmetric upside ideas only when the failure mode is explicit and the source quality is acceptable.',
}

const RISK_SETTINGS: Record<RiskTolerance, {
  edge: number
  probabilityFloor: number
  stance: string
  sizing: string
}> = {
  low: {
    edge: 4,
    probabilityFloor: 8,
    stance: 'Primary-source catalyst required before promotion.',
    sizing: 'Scout picks only unless the edge is unusually clear.',
  },
  medium: {
    edge: 3,
    probabilityFloor: 5,
    stance: 'Balanced evidence threshold.',
    sizing: 'Scout pick or qualified signal depending on catalyst quality.',
  },
  high: {
    edge: 2,
    probabilityFloor: 3,
    stance: 'More willing to surface asymmetric upside.',
    sizing: 'Can surface lower-probability scout picks with explicit failure mode.',
  },
}

function buildNodes(focusArea: FocusArea, budget: number, riskTolerance: RiskTolerance) {
  const settings = RISK_SETTINGS[riskTolerance]

  return [
    {
      id: generateId(),
      type: 'input' as const,
      agentId: 'text-input',
      name: 'Desk Mandate',
      description: 'Budget, risk, and focus area',
      icon: 'MessageSquare',
      pricePerCall: 0,
      position: { x: 100, y: 200 },
      category: 'io' as const,
    },
    {
      id: generateId(),
      type: 'agent' as const,
      agentId: 'autonomous-signal-desk',
      name: 'Autonomous Signal Desk',
      description: 'Routes budget across internal market research, audit, and review agents',
      icon: 'Bot',
      pricePerCall: 0.0015,
      position: { x: 420, y: 200 },
      category: 'market' as const,
      config: {
        focusArea,
        budget,
        riskTolerance,
        maxCandidates: budget >= 0.01 ? 8 : budget >= 0.003 ? 6 : budget >= 0.0015 ? 4 : 3,
        minEdgePct: settings.edge,
        minMarketProbabilityPct: settings.probabilityFloor,
      },
    },
    {
      id: generateId(),
      type: 'output' as const,
      agentId: 'api-output',
      name: 'Desk Decision',
      description: 'Signal, watchlist, or pass with receipts',
      icon: 'Send',
      pricePerCall: 0,
      position: { x: 740, y: 200 },
      category: 'io' as const,
    },
  ]
}

function buildDeskPrompt(focusArea: FocusArea, budget: number, riskTolerance: RiskTolerance, extraRules: string) {
  const focus = FOCUS_OPTIONS.find((option) => option.id === focusArea) || FOCUS_OPTIONS[0]
  const settings = RISK_SETTINGS[riskTolerance]

  return `${focus.prompt}

Autonomous Signal Desk mode:
- You control a research budget of ${budget.toFixed(4)} USDC.
- Spend only on agent calls that improve the final decision.
- Decide whether to promote one signal, keep candidates on watchlist, or pass.
- A pass/no-trade is successful if evidence is weak.
- Return the strongest decision the desk can defend to a skeptical reviewer.

Risk policy:
${RISK_RULES[riskTolerance]}
- Minimum promotion edge: ${settings.edge}%
- Market probability floor: ${settings.probabilityFloor}%
- Desk stance: ${settings.stance}
- Sizing posture: ${settings.sizing}

User desk rules:
${extraRules.trim() || 'No extra rules.'}`
}

function formatStatus(status: string | null) {
  return status || 'Ready'
}

export default function SignalDeskPage() {
  const router = useRouter()
  const { address } = useAccount()
  const [focusArea, setFocusArea] = useState<FocusArea>('macro')
  const [budget, setBudget] = useState(0.003)
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('medium')
  const [extraRules, setExtraRules] = useState('Prefer exact priced markets with fresh catalysts. Do not force a trade.')
  const [isRunning, setIsRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const nodes = useMemo(
    () => buildNodes(focusArea, budget, riskTolerance),
    [budget, focusArea, riskTolerance]
  )
  const prompt = useMemo(
    () => buildDeskPrompt(focusArea, budget, riskTolerance, extraRules),
    [budget, extraRules, focusArea, riskTolerance]
  )
  const plannedCost = useMemo(() => calculateWorkflowCost(nodes), [nodes])
  const paidAgentCount = nodes.filter((node) => node.pricePerCall > 0).length
  const riskSettings = RISK_SETTINGS[riskTolerance]

  async function runDesk() {
    const startTime = Date.now()
    const paymentMode: WorkflowRun['paymentMode'] = 'agent-wallet'
    const settlementMode = 'circle-agent-wallet-transfer'
    const paymentPlan = getAgentPaymentPlan(nodes)
    const paymentGroups = groupAgentPayments(paymentPlan)
    let steps: WorkflowStep[] = []
    let paymentPayer = ''

    if (budget < plannedCost) {
      setRunError(`Budget is below planned spend. Increase budget to at least $${plannedCost.toFixed(6)} USDC.`)
      return
    }

    setIsRunning(true)
    setRunError(null)
    setRunStatus('Funding research desk from Circle Agent Wallet')

    try {
      const settlements: AgentSettlement[] = []

      for (const [index, group] of paymentGroups.entries()) {
        setRunStatus(`Paying specialist agent seller ${index + 1} of ${paymentGroups.length}`)
        const paymentResponse = await fetch('/api/agent-wallet/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: group.amount,
            recipient: group.recipient,
            refId: `signal-desk-${index + 1}-${Date.now().toString(36)}`,
          }),
        })
        const paymentData = await paymentResponse.json()

        if (!paymentResponse.ok || !paymentData.success) {
          throw new Error(paymentData.error || 'Agent wallet payment failed')
        }

        paymentPayer = paymentData.payer || paymentPayer
        settlements.push({
          recipient: group.recipient,
          amount: group.amount,
          txHash: paymentData.txHash || undefined,
          settlementId: paymentData.settlementId,
          payer: paymentData.payer,
          token: ARC_USDC_ADDRESS,
          network: `eip155:${arcTestnet.id}`,
          nodeIds: group.lines.map((line) => line.nodeId),
        })
      }

      setRunStatus('Agents are scanning markets')
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map((node) => ({
            id: node.id,
            agentId: node.agentId,
            config: node.config,
          })),
          input: prompt,
          payments: settlements.map((settlement) => ({
            txHash: settlement.txHash,
            settlementId: settlement.settlementId,
            mode: settlementMode,
            payer: settlement.payer || paymentPayer,
            token: settlement.token,
            recipient: settlement.recipient,
            amount: settlement.amount,
            nodeIds: settlement.nodeIds,
          })),
        }),
      })
      const data = await response.json()
      const receipt = data.execution?.payment?.receipt

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Signal desk execution failed')
      }

      steps = data.execution.steps.map((step: {
        nodeId: string
        agentName: string
        input: unknown
        output: unknown
        duration: number
        payment: { amount: number; verified: boolean; status: 'simulated' | 'verified' | 'free' } | null
      }) => ({
        nodeId: step.nodeId,
        nodeName: step.agentName,
        input: step.input,
        output: step.output,
        duration: step.duration,
        cost: step.payment?.amount || 0,
        status: 'success',
        payment: step.payment,
      }))

      const paymentEvents: PaymentEvent[] = steps
        .filter((step) => step.payment && step.payment.amount > 0)
        .map((step) => {
          const expectedPayment = paymentPlan.find((line) => line.nodeId === step.nodeId)
          const settlement = expectedPayment
            ? settlements.find((payment) => payment.nodeIds.includes(step.nodeId))
            : undefined

          return {
            id: generateId(),
            fromNode: 'signal-desk',
            toNode: step.nodeId,
            amount: step.payment?.amount || 0,
            timestamp: Date.now(),
            status: settlement ? 'settled' : 'simulated',
            transaction: settlement?.txHash,
            settlementId: settlement?.settlementId || receipt?.id,
            payer: settlement?.payer || paymentPayer,
            recipient: settlement?.recipient || expectedPayment?.recipient,
            token: ARC_USDC_ADDRESS,
            network: settlement?.network || receipt?.network,
          }
        })

      setRunStatus('Saving signal desk run')
      const runId = generateId()
      const run: WorkflowRun = {
        id: runId,
        timestamp: Date.now(),
        nodes,
        input: prompt,
        output: data.result,
        totalCost: plannedCost,
        duration: Date.now() - startTime,
        status: 'success',
        steps,
        payments: paymentEvents,
        paymentMode,
        settlementMode,
        ownerAddress: address,
      }

      saveWorkflowRun(run)
      await fetch(`/api/runs/${run.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(run),
      })

      router.push(`/app/runs/${run.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signal desk failed'
      setRunError(message)
      const run: WorkflowRun = {
        id: generateId(),
        timestamp: Date.now(),
        nodes,
        input: prompt,
        output: { error: message },
        totalCost: plannedCost,
        duration: Date.now() - startTime,
        status: 'error',
        steps,
        paymentMode,
        settlementMode,
        ownerAddress: address,
      }
      saveWorkflowRun(run)
      try {
        await fetch(`/api/runs/${run.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(run),
        })
      } catch (storageError) {
        console.warn('Failed to persist failed signal desk run remotely:', storageError)
      }
    } finally {
      setRunStatus(null)
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WalletHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
              <Bot className="h-4 w-4" />
              Autonomous Signal Desk
            </div>
            <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[0.95] md:text-7xl">
              One autonomous agent. A scoped USDC budget. A defendable market decision.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Signal Desk is not a workflow template. It is one paid desk agent that internally routes budget
              across live market search, evidence audit, adversarial review, and final signal selection.
            </p>
          </div>

          <div className="grid content-start gap-3 border border-border bg-card p-5">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <CircleDollarSign className="mt-1 h-5 w-5 text-accent" />
              <div>
                <p className="font-serif text-2xl">Desk budget</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The desk agent spends from Circle Agent Wallet and reports budget used, rejected ideas, and receipts.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="border border-border bg-background p-3">
                <p className="text-muted-foreground">Budget</p>
                <p className="mt-1 font-mono text-xl">${budget.toFixed(4)}</p>
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-muted-foreground">Planned</p>
                <p className="mt-1 font-mono text-xl">${plannedCost.toFixed(6)}</p>
              </div>
              <div className="border border-border bg-background p-3">
                <p className="text-muted-foreground">Desk agents</p>
                <p className="mt-1 font-mono text-xl">{paidAgentCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Focus area</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setFocusArea(option.id)}
                    className={`border p-4 text-left transition-colors ${
                      focusArea === option.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    <p className="font-serif text-2xl">{option.label}</p>
                    <p className={focusArea === option.id ? 'mt-1 text-sm text-primary-foreground/75' : 'mt-1 text-sm text-muted-foreground'}>
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border border-border bg-card p-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Research budget</label>
                <input
                  value={budget}
                  min={0.001}
                  max={0.05}
                  step={0.001}
                  type="number"
                  onChange={(event) => setBudget(Number(event.target.value))}
                  className="mt-2 w-full border border-border bg-background px-3 py-3 font-mono text-lg outline-none focus:border-primary"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Risk</p>
                <div className="grid grid-cols-3 border border-border">
                  {(['low', 'medium', 'high'] as RiskTolerance[]).map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setRiskTolerance(risk)}
                      className={`px-3 py-3 text-sm font-semibold uppercase tracking-[0.12em] ${
                        riskTolerance === risk ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'
                      }`}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 border border-border bg-background p-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Edge bar:</span> {riskSettings.edge}% minimum
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Probability floor:</span> {riskSettings.probabilityFloor}%
                  </p>
                  <p>{riskSettings.stance}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="border border-border bg-card p-5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Desk rules</label>
              <Textarea
                value={extraRules}
                onChange={(event) => setExtraRules(event.target.value)}
                className="mt-3 min-h-40 resize-none border-border bg-background text-base leading-7"
              />
            </div>

            <div className="grid gap-3 border border-border bg-card p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex gap-3">
                  <Radar className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Scan</p>
                    <p className="text-sm text-muted-foreground">Pulls live Polymarket/Kalshi candidates.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Wallet className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Pay</p>
                    <p className="text-sm text-muted-foreground">Settles agent calls from Circle Agent Wallet.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Reject</p>
                    <p className="text-sm text-muted-foreground">Keeps weak signals watchlist-only.</p>
                  </div>
                </div>
              </div>

              {(runStatus || runError) && (
                <div className={`border px-4 py-3 text-sm ${runError ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-secondary text-muted-foreground'}`}>
                  {runError || formatStatus(runStatus)}
                </div>
              )}

              <Button
                onClick={runDesk}
                disabled={isRunning || budget < plannedCost}
                className="h-14 justify-between px-5 text-sm uppercase tracking-[0.14em]"
              >
                <span className="flex items-center gap-2">
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isRunning ? formatStatus(runStatus) : 'Run Autonomous Desk'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
