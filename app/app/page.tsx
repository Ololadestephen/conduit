'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseUnits } from 'viem'
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi'
import { AlertCircle, Settings2 } from 'lucide-react'
import { AgentSidebar } from '@/components/agent-sidebar'
import { WorkflowCanvas } from '@/components/workflow-canvas'
import { WalletHeader } from '@/components/wallet-header'
import { RunWorkflowButton } from '@/components/run-workflow-button'
import { GasComparison } from '@/components/gas-comparison'
import { ShareWorkflow } from '@/components/share-workflow'
import { TemplateSelector } from '@/components/template-selector'
import { WorkflowHistory } from '@/components/workflow-history'
import { AgentConfigPanel } from '@/components/agent-config-panel'
import { PaymentModePanel } from '@/components/payment-mode-panel'
import { AgentNode, PaymentEvent, generateId } from '@/lib/workflow-types'
import { WorkflowRun, WorkflowStep, saveWorkflowRun } from '@/lib/workflow-history'
import type { WorkflowTemplate } from '@/lib/workflow-templates'
import { getAgentPaymentPlan, groupAgentPayments } from '@/lib/agent-registry'
import { ARC_USDC_ADDRESS, ARC_USDC_DECIMALS, arcTestnet } from '@/lib/arc-chain'

const USDC_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const

interface PaymentSettlement {
  recipient: `0x${string}`
  amount: number
  txHash?: `0x${string}`
  settlementId?: string
  payer?: string
  token: `0x${string}`
  network?: string
  nodeIds: string[]
}

async function waitForArcReceipt(txHash: `0x${string}`, timeoutMs = 120_000) {
  const startedAt = Date.now()
  let lastError: string | null = null

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch('/api/chain/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txHash }),
    })

    const data = await response.json()

    if (!response.ok) {
      lastError = data.error || 'Receipt lookup failed'
    } else if (data.status === 'failed') {
      throw new Error(`Arc transaction failed: ${txHash}`)
    } else if (data.confirmed) {
      return data.receipt
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }

  throw new Error(lastError || `Arc confirmation timed out for ${txHash}`)
}

function useHasMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}

export default function ConduitAppPage() {
  const router = useRouter()
  const mounted = useHasMounted()
  const { address, chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  // Workflow state
  const [nodes, setNodes] = useState<AgentNode[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [payingNodeId, setPayingNodeId] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [workflowInput, setWorkflowInput] = useState('Paste text here, then run it through your agent workflow.')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<'connected-wallet' | 'agent-wallet'>('connected-wallet')

  // Calculate total cost
  const totalCost = nodes.reduce((sum, node) => sum + node.pricePerCall, 0)

  // Node handlers
  const handleAddNode = useCallback((node: AgentNode) => {
    setNodes((prev) => [...prev, node])
    setSelectedNodeId(node.id)
    setIsSettingsOpen(true)
  }, [])

  const handleRemoveNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setSelectedNodeId((current) => current === id ? null : current)
  }, [])

  const handleNodesChange = useCallback((newNodes: AgentNode[]) => {
    setNodes(newNodes)
  }, [])

  const handleLoadTemplate = useCallback((templateNodes: AgentNode[], template?: WorkflowTemplate) => {
    setNodes(templateNodes)
    setPayments([])
    setRunError(null)
    setRunStatus(null)
    if (template?.initialInput) {
      setWorkflowInput(template.initialInput)
    }
    setSelectedNodeId(templateNodes.find((node) => node.type === 'input')?.id || templateNodes[0]?.id || null)
    setIsSettingsOpen(true)
  }, [])

  const handleConfigChange = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes((prev) => prev.map((node) => node.id === nodeId ? { ...node, config } : node))
  }, [])

  // Run workflow with history tracking
  const runWorkflow = useCallback(async () => {
    const requiresConnectedWallet = paymentMode === 'connected-wallet'
    if (nodes.length < 2 || !mounted || (requiresConnectedWallet && (!isConnected || !address))) return

    const startTime = Date.now()
    let steps: WorkflowStep[] = []
    let paymentSettlements: PaymentSettlement[] = []
    let paymentPayer = address
    let settlementMode = paymentMode === 'agent-wallet' ? 'circle-agent-wallet-transfer' : 'direct-arc-usdc-transfer'
    const paymentPlan = getAgentPaymentPlan(nodes)
    const paymentGroups = groupAgentPayments(paymentPlan)

    setIsRunning(true)
    setPayments([])
    setRunError(null)
    setRunStatus('Preparing workflow run')

    try {
      setPayingNodeId(nodes.find((node) => node.pricePerCall > 0)?.id || null)

      if (paymentGroups.length > 0) {
        if (paymentMode === 'agent-wallet') {
          const settlements: PaymentSettlement[] = []

          for (const [index, group] of paymentGroups.entries()) {
            setRunStatus(`Paying agent seller ${index + 1} of ${paymentGroups.length} from Circle Agent Wallet`)
            const paymentResponse = await fetch('/api/agent-wallet/pay', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: group.amount,
                recipient: group.recipient,
                refId: `conduit-${index + 1}-${Date.now().toString(36)}`,
              }),
            })
            const paymentData = await paymentResponse.json()

            if (!paymentResponse.ok || !paymentData.success) {
              const paymentDetails = Array.isArray(paymentData.details)
                ? `: ${paymentData.details.map((detail: { field?: string; message?: string }) => `${detail.field || 'field'} ${detail.message || 'is invalid'}`).join(', ')}`
                : ''
              throw new Error(`${paymentData.error || 'Agent wallet payment failed'}${paymentDetails}`)
            }

            settlements.push({
              recipient: group.recipient,
              amount: group.amount,
              txHash: paymentData.txHash || undefined,
              settlementId: paymentData.settlementId,
              payer: paymentData.payer,
              token: ARC_USDC_ADDRESS,
              network: paymentData.network ? `eip155:${arcTestnet.id}` : undefined,
              nodeIds: group.lines.map((line) => line.nodeId),
            })
            paymentPayer = paymentData.payer
          }

          paymentSettlements = settlements
        } else {
          if (chainId !== arcTestnet.id) {
            setRunStatus('Switching wallet to Arc Testnet')
            await switchChainAsync({ chainId: arcTestnet.id })
          }

          const settlements: PaymentSettlement[] = []
          for (const [index, group] of paymentGroups.entries()) {
            const amount = parseUnits(group.amount.toFixed(ARC_USDC_DECIMALS), ARC_USDC_DECIMALS)
            setRunStatus(`Waiting for wallet signature ${index + 1} of ${paymentGroups.length}`)
            const txHash = await writeContractAsync({
              address: ARC_USDC_ADDRESS,
              abi: USDC_TRANSFER_ABI,
              functionName: 'transfer',
              args: [group.recipient, amount],
              chainId: arcTestnet.id,
            })

            setRunStatus(`Waiting for Arc confirmation ${index + 1} of ${paymentGroups.length}`)
            await waitForArcReceipt(txHash)
            settlements.push({
              recipient: group.recipient,
              amount: group.amount,
              txHash,
              settlementId: txHash,
              payer: address,
              token: ARC_USDC_ADDRESS,
              network: `eip155:${arcTestnet.id}`,
              nodeIds: group.lines.map((line) => line.nodeId),
            })
          }
          paymentSettlements = settlements
        }

      }

      setRunStatus('Executing agent workflow')
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes.map((node) => ({
            id: node.id,
            agentId: node.agentId,
            config: node.config,
          })),
          input: workflowInput,
          payments: paymentSettlements.length > 0 ? paymentSettlements.map((settlement) => ({
            txHash: settlement.txHash,
            settlementId: settlement.settlementId,
            mode: settlementMode,
            payer: settlement.payer || paymentPayer,
            token: settlement.token,
            recipient: settlement.recipient,
            amount: settlement.amount,
            nodeIds: settlement.nodeIds,
          })) : undefined,
        }),
      })

      const data = await response.json()
      const receipt = data.execution?.payment?.receipt

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Workflow execution failed')
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
          const nodeIndex = nodes.findIndex((node) => node.id === step.nodeId)
          const prevNode = nodes[Math.max(0, nodeIndex - 1)]
          const expectedPayment = paymentPlan.find((line) => line.nodeId === step.nodeId)
          const settlement = expectedPayment
            ? paymentSettlements.find((payment) => payment.nodeIds.includes(step.nodeId))
            : undefined

          return {
            id: generateId(),
            fromNode: prevNode?.id || step.nodeId,
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

      setPayments(paymentEvents)

      // Save to history
      setRunStatus('Saving result')
      const runId = generateId()
      const run: WorkflowRun = {
        id: runId,
        timestamp: Date.now(),
        nodes: [...nodes],
        input: workflowInput,
        output: data.result,
        totalCost,
        duration: Date.now() - startTime,
        status: 'success',
        steps,
        payments: paymentEvents,
        paymentMode,
        settlementMode,
        ownerAddress: address,
      }
      saveWorkflowRun(run)
      try {
        await fetch(`/api/runs/${run.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(run),
        })
      } catch (storageError) {
        console.warn('Failed to persist run remotely:', storageError)
      }
      setRunStatus('Opening result')
      router.push(`/app/runs/${run.id}`)

    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Workflow execution failed'
      const message = rawMessage.toLowerCase().includes('timed out')
        ? paymentMode === 'agent-wallet'
          ? `${rawMessage}. Check Circle Console and ArcScan before retrying so you do not pay twice.`
          : `Arc confirmation timed out. Check ArcScan before retrying so you do not pay twice.`
        : rawMessage
      setRunError(message)
      // Save failed run to history
      const run: WorkflowRun = {
        id: generateId(),
        timestamp: Date.now(),
        nodes: [...nodes],
        input: workflowInput,
        output: { error: message },
        totalCost,
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(run),
        })
      } catch (storageError) {
        console.warn('Failed to persist failed run remotely:', storageError)
      }
    }

    setPayingNodeId(null)
    setRunStatus(null)
    setIsRunning(false)
  }, [
    address,
    chainId,
    isConnected,
    mounted,
    nodes,
    switchChainAsync,
    totalCost,
    workflowInput,
    writeContractAsync,
    router,
    paymentMode,
  ])

  const stopWorkflow = useCallback(() => {
    setIsRunning(false)
    setPayingNodeId(null)
    setRunStatus(null)
  }, [])

  const runWorkflowControl = (
    <RunWorkflowButton
      isRunning={isRunning}
      isConnected={isConnected}
      requiresWallet={paymentMode === 'connected-wallet'}
      totalCost={totalCost}
      nodeCount={nodes.length}
      onRun={runWorkflow}
      onStop={stopWorkflow}
    />
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header with real wallet connection */}
      <WalletHeader />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Agent marketplace */}
        <AgentSidebar onAddAgent={handleAddNode} />

        {/* Canvas area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <div>
                <h2 className="font-serif text-3xl font-semibold leading-none">Workflow Canvas</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {nodes.length === 0
                    ? 'Add agents to start building'
                    : `${nodes.length} nodes, ${nodes.filter((n) => n.type === 'agent').length} agents`}
                </p>
              </div>
              {nodes.length >= 2 && <GasComparison totalCost={totalCost} />}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <TemplateSelector
                onSelectTemplate={handleLoadTemplate}
                disabled={isRunning}
              />
              <WorkflowHistory />
              <ShareWorkflow nodes={nodes} />
              <PaymentModePanel
                mode={paymentMode}
                onModeChange={setPaymentMode}
                payerAddress={address}
                compact
              />
              {!isSettingsOpen && runWorkflowControl}
            </div>
          </div>
          {(runStatus || runError) && (
            <div className={`border-b px-6 py-3 text-sm ${runError ? 'border-destructive/25 bg-destructive/10 text-destructive' : 'border-border bg-secondary text-muted-foreground'}`}>
              <div className="flex items-center gap-2">
                {runError ? <AlertCircle className="h-4 w-4" /> : <span className="h-2 w-2 animate-pulse bg-accent" />}
                <span>{runError || runStatus}</span>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="relative flex-1 overflow-hidden bg-background p-6">
              <WorkflowCanvas
                nodes={nodes}
                onNodesChange={handleNodesChange}
                onRemoveNode={handleRemoveNode}
                selectedNodeId={selectedNodeId}
                onSelectNode={(nodeId) => {
                  setSelectedNodeId(nodeId)
                  setIsSettingsOpen(true)
                }}
                isRunning={isRunning}
                payingNodeId={payingNodeId}
                payments={payments}
              />
              {!isSettingsOpen && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="absolute right-6 top-6 flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-primary"
                >
                  <Settings2 className="h-4 w-4" />
                  Agent Settings
                </button>
              )}
            </div>
        </div>

        {isSettingsOpen && (
          <div className="flex flex-col border-l border-border">
            <AgentConfigPanel
              node={nodes.find((node) => node.id === selectedNodeId) || null}
              onConfigChange={handleConfigChange}
              onClose={() => setIsSettingsOpen(false)}
              input={workflowInput}
              onInputChange={setWorkflowInput}
              isRunning={isRunning}
              layout="rail"
              actionSlot={runWorkflowControl}
            />
          </div>
        )}
      </div>
    </div>
  )
}
