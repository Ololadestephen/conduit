'use client'

import { motion } from 'framer-motion'
import { Play, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/workflow-types'
import { cn } from '@/lib/utils'

interface RunWorkflowButtonProps {
  isRunning: boolean
  isConnected: boolean
  requiresWallet?: boolean
  totalCost: number
  nodeCount: number
  onRun: () => void
  onStop: () => void
}

export function RunWorkflowButton({
  isRunning,
  isConnected,
  requiresWallet = true,
  totalCost,
  nodeCount,
  onRun,
  onStop,
}: RunWorkflowButtonProps) {
  const hasPayer = requiresWallet ? isConnected : true
  const canRun = hasPayer && nodeCount >= 2 && !isRunning

  return (
    <div className="flex items-center gap-3">
      {/* Cost preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden sm:flex items-center gap-2 border border-border bg-card px-3 py-2"
      >
        <span className="text-xs text-muted-foreground">Estimated Cost:</span>
        <span className="font-mono text-sm text-accent">{formatPrice(totalCost)}</span>
      </motion.div>

      {/* Run/Stop button */}
      {isRunning ? (
        <Button
          onClick={onStop}
          variant="destructive"
          className="gap-2 min-w-[140px]"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      ) : (
        <Button
          onClick={onRun}
          disabled={!canRun}
          className={cn(
            'gap-2 min-w-[140px]',
            canRun && 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
        >
          {!hasPayer ? (
            <>
              <Loader2 className="h-4 w-4" />
              Connect Wallet
            </>
          ) : nodeCount < 2 ? (
            <>
              <Play className="h-4 w-4" />
              Add Nodes
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Workflow
            </>
          )}
        </Button>
      )}
    </div>
  )
}
