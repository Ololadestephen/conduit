'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ChevronDown, Copy, ExternalLink, Check, Loader2, Droplets, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLockup } from '@/components/brand-mark'
import { formatPrice } from '@/lib/workflow-types'
import { arcTestnet, ARC_FAUCET_URL } from '@/lib/arc-chain'
import { cn } from '@/lib/utils'

// Wrapper component that only imports wagmi after mount
function WalletConnected() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [isBalanceLoading, setIsBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  
  // Dynamic import to avoid SSR issues
  const { useAccount, useConnect, useDisconnect } = require('wagmi')
  
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (!address) {
      setUsdcBalance(null)
      setBalanceError(null)
      return
    }

    let cancelled = false

    async function loadBalance() {
      setIsBalanceLoading(true)

      try {
        const response = await fetch(`/api/chain/usdc-balance?address=${address}`, {
          cache: 'no-store',
        })
        const data = await response.json()

        if (cancelled) return

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Balance unavailable')
        }

        const parsed = Number.parseFloat(data.formatted)
        setUsdcBalance(Number.isFinite(parsed) ? parsed : null)
        setBalanceError(null)
      } catch (error) {
        if (cancelled) return
        setUsdcBalance(null)
        setBalanceError(error instanceof Error ? error.message : 'Balance unavailable')
      } finally {
        if (!cancelled) setIsBalanceLoading(false)
      }
    }

    loadBalance()
    const interval = window.setInterval(loadBalance, 10_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [address])

  const handleConnect = () => {
    const injectedConnector = connectors.find((c: { id: string }) => c.id === 'injected')
    const connector = injectedConnector || connectors[0]
    if (connector) {
      connect({ connector, chainId: arcTestnet.id })
    }
  }

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const hasValidBalance = typeof usdcBalance === 'number' && Number.isFinite(usdcBalance)
  const balanceLabel = hasValidBalance ? formatPrice(usdcBalance) : isBalanceLoading ? 'Loading' : '--'

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting || isPending} className="gap-2">
        {(isConnecting || isPending) ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {(isConnecting || isPending) ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 border border-border bg-card px-4 py-2 transition-colors hover:border-primary"
      >
        <div className="flex h-8 w-8 items-center justify-center border border-border bg-background">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-mono text-sm">
            {balanceLabel} <span className="text-muted-foreground">USDC</span>
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isDropdownOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 border border-border bg-popover p-2 shadow-lg"
          >
            {/* Address */}
            <div className="border border-border bg-secondary p-3 mb-2">
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{address ? truncateAddress(address) : ''}</span>
                <div className="flex gap-1">
                  <button onClick={handleCopy} className="flex h-6 w-6 items-center justify-center hover:bg-muted transition-colors">
                    {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </button>
                  <a
                    href={`https://testnet.arcscan.app/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-6 w-6 items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>

            {/* Balance details */}
            <div className="border border-border bg-secondary p-3 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">USDC Balance</p>
                  <p className="flex items-center gap-2 font-mono text-lg font-semibold">
                    {balanceLabel}
                    {isBalanceLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </p>
                  {balanceError && (
                    <p className="mt-1 max-w-36 text-xs text-destructive">{balanceError}</p>
                  )}
                </div>
                <a
                  href={ARC_FAUCET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-accent/40 bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Droplets className="h-3 w-3" />
                  Get Testnet USDC
                </a>
              </div>
            </div>

            {/* Chain info */}
            <div className="border border-border bg-secondary p-3 mb-2">
              <p className="text-xs text-muted-foreground mb-1">Network</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-accent" />
                <span className="text-sm font-medium">{arcTestnet.name}</span>
                <span className="text-xs text-muted-foreground">Chain ID: {arcTestnet.id}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-2">
              <button
                onClick={() => {
                  disconnect()
                  setIsDropdownOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function WalletHeader() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const isSignalDesk = pathname?.startsWith('/app/signal-desk')
  const isComposer = pathname === '/app' || (pathname?.startsWith('/workflow') ?? false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-border bg-background px-8 py-5">
      {/* Logo */}
      <div className="flex min-w-0 items-center gap-3">
        <BrandLockup showTagline />
      </div>

      <nav className="hidden items-center justify-center gap-0 border border-border bg-card p-1 md:flex">
        <Link
          href="/app"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-background hover:text-foreground',
            isComposer && !isSignalDesk
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              : 'text-muted-foreground'
          )}
        >
          Composer
        </Link>
        <Link
          href="/app/signal-desk"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-background hover:text-foreground',
            isSignalDesk
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              : 'text-muted-foreground'
          )}
        >
          Signal Desk
        </Link>
      </nav>

      <div className="flex items-center justify-end gap-3">
        {/* Network badge */}
        <div className="hidden items-center gap-2 border border-border bg-card px-3 py-1.5 lg:flex">
          <div className="h-2 w-2 bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">Arc Testnet</span>
        </div>

        {/* Wallet - only render after mount to avoid hydration issues */}
        {mounted ? (
          <WalletConnected />
        ) : (
          <div className="h-10 w-36 animate-pulse bg-secondary" />
        )}
      </div>
    </header>
  )
}
