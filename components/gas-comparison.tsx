'use client'

import { Info, Zap, Flame, TrendingDown } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatPrice } from '@/lib/workflow-types'

interface GasComparisonProps {
  totalCost: number
}

// Simulated gas costs for comparison
const ETH_GAS_PRICE_GWEI = 25 // Average mainnet gas
const USDC_TRANSFER_GAS = 65000 // Gas units for ERC20 transfer
const ETH_PRICE_USD = 3200 // Current ETH price

function calculateEthGasCost(operations: number): number {
  const gasPerOp = USDC_TRANSFER_GAS
  const totalGas = gasPerOp * operations
  const ethCost = (totalGas * ETH_GAS_PRICE_GWEI) / 1e9
  return ethCost * ETH_PRICE_USD
}

export function GasComparison({ totalCost }: GasComparisonProps) {
  // Assume 3 operations for a typical workflow
  const ethCost = calculateEthGasCost(3)
  const savings = ethCost - totalCost
  const savingsPercent = ((savings / ethCost) * 100).toFixed(1)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="flex items-center gap-1 border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary">
          <TrendingDown className="h-3 w-3 text-accent" />
          <span className="text-muted-foreground">ETH</span>
          <span className="font-medium text-accent">{savingsPercent}% cheaper</span>
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        className="w-80 p-0 bg-popover border border-border"
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center border border-accent/40 bg-background">
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold leading-none text-foreground">Gas Cost Comparison</p>
              <p className="text-xs text-muted-foreground">Same workflow, different chains</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Arc Network */}
            <div className="bg-background border border-accent/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-accent" />
                  <span className="text-sm font-medium text-foreground">Arc Network</span>
                </div>
                <span className="font-mono text-sm font-semibold text-accent">
                  {formatPrice(totalCost)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sub-cent simulated USDC fees on Arc
              </p>
            </div>

            {/* Ethereum */}
            <div className="bg-secondary border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-3 w-3 text-orange-400" />
                  <span className="text-sm font-medium text-foreground">Ethereum Mainnet</span>
                </div>
                <span className="font-mono text-sm text-muted-foreground line-through">
                  ${ethCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ~{ETH_GAS_PRICE_GWEI} gwei, {USDC_TRANSFER_GAS.toLocaleString()} gas per transfer
              </p>
            </div>

            {/* Savings */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Your savings</span>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-accent" />
                <span className="font-mono text-sm font-semibold text-accent">
                  ${savings.toFixed(2)} ({savingsPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-3 flex items-start gap-2 border border-border bg-muted/50 p-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Arc settles in batches, amortizing gas across thousands of transactions. 
              Perfect for micropayments that would be impossible on L1.
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
