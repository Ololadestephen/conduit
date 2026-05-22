'use client'

import { useEffect, useState } from 'react'
import { Bot, CheckCircle2, CircleAlert, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ARC_USDC_ADDRESS } from '@/lib/arc-chain'

interface AgentWalletStatus {
  ready: boolean
  blockchain: string
  checks: {
    apiKey: boolean
    entitySecret: boolean
    walletId: boolean
    walletAddress: boolean
  }
  walletAddress: string | null
}

interface PaymentModePanelProps {
  mode: 'connected-wallet' | 'agent-wallet'
  onModeChange: (mode: 'connected-wallet' | 'agent-wallet') => void
  payerAddress?: string
  compact?: boolean
}

export function PaymentModePanel({ mode, onModeChange, payerAddress, compact = false }: PaymentModePanelProps) {
  const [status, setStatus] = useState<AgentWalletStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const response = await fetch('/api/agent-wallet/status')
        const data = await response.json()

        if (!cancelled && response.ok && data.success) {
          setStatus(data)
        }
      } catch {
        if (!cancelled) setStatus(null)
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  const displayPayer = mode === 'agent-wallet'
    ? status?.walletAddress || 'Agent wallet not configured'
    : payerAddress || 'Connect wallet to run'
  const isAgentReady = Boolean(status?.ready)

  if (compact) {
    return (
      <div className="flex h-10 items-center border border-border bg-card">
        <Button
          type="button"
          variant={mode === 'connected-wallet' ? 'default' : 'ghost'}
          className="h-full gap-2 rounded-none px-3 text-xs"
          onClick={() => onModeChange('connected-wallet')}
          title={payerAddress ? `Pay from ${payerAddress}` : 'Pay from connected wallet'}
        >
          <WalletCards className="h-3.5 w-3.5" />
          Wallet
        </Button>
        <Button
          type="button"
          variant={mode === 'agent-wallet' ? 'default' : 'ghost'}
          className="h-full gap-2 rounded-none border-l border-border px-3 text-xs"
          onClick={() => onModeChange('agent-wallet')}
          title={isAgentReady ? `Pay from ${status?.walletAddress}` : 'Agent wallet setup needed'}
        >
          <Bot className="h-3.5 w-3.5" />
          Agent
        </Button>
        <div className="hidden h-full items-center gap-1 border-l border-border px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground xl:flex">
          {isAgentReady ? (
            <CheckCircle2 className="h-3 w-3 text-accent" />
          ) : (
            <CircleAlert className="h-3 w-3" />
          )}
          {isAgentReady ? 'Ready' : 'Setup'}
        </div>
      </div>
    )
  }

  return (
    <section className="border-t border-border bg-background px-6 py-4">
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Payment Mode
          </p>
          <div className="mt-3 grid grid-cols-2 border border-border bg-card">
            <Button
              type="button"
              variant={mode === 'connected-wallet' ? 'default' : 'ghost'}
              className="justify-start gap-2 rounded-none"
              onClick={() => onModeChange('connected-wallet')}
            >
              <WalletCards className="h-4 w-4" />
              Wallet
            </Button>
            <Button
              type="button"
              variant={mode === 'agent-wallet' ? 'default' : 'ghost'}
              className="justify-start gap-2 rounded-none"
              onClick={() => onModeChange('agent-wallet')}
            >
              <Bot className="h-4 w-4" />
              Agent
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Payer</p>
            <p className="mt-1 truncate font-mono text-xs">{displayPayer}</p>
          </div>
          <div className="border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Sellers</p>
            <p className="mt-1 truncate text-xs">Per-agent registry</p>
          </div>
          <div className="border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Token</p>
            <p className="mt-1 truncate font-mono text-xs">{ARC_USDC_ADDRESS}</p>
          </div>
          <div className="border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Agent Wallet</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em]">
              {isAgentReady ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              ) : (
                <CircleAlert className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {isAgentReady ? 'Ready' : 'Setup Needed'}
            </p>
          </div>
        </div>
      </div>

      {mode === 'agent-wallet' && !isAgentReady && (
        <div className="mt-3 border border-accent/30 bg-secondary p-3 text-sm text-muted-foreground">
          Add Circle agent wallet credentials to enable server-side agent payments.
        </div>
      )}
    </section>
  )
}
