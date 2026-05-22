'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { PaymentEvent, formatPrice, AgentNode } from '@/lib/workflow-types'
import { cn } from '@/lib/utils'

interface PaymentFeedProps {
  payments: PaymentEvent[]
  nodes: AgentNode[]
  isOpen: boolean
  onToggle: () => void
}

export function PaymentFeed({ payments, nodes, isOpen, onToggle }: PaymentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [payments])

  const getNodeName = (nodeId: string) => {
    return nodes.find((n) => n.id === nodeId)?.name || 'Unknown'
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 320 : 48 }}
      className="flex flex-1 flex-col bg-card overflow-hidden"
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 border-b border-border p-4 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent/40 bg-background">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 text-left"
          >
            <p className="font-serif text-2xl font-semibold leading-none">Payment Feed</p>
            <p className="text-xs text-muted-foreground">
              {payments.length} transactions
            </p>
          </motion.div>
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-1 flex-col"
        >
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
            <div className="border border-border bg-secondary p-2">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-mono text-sm text-accent">{formatPrice(totalPaid)}</p>
            </div>
            <div className="border border-border bg-secondary p-2">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-mono text-sm">{payments.length}</p>
            </div>
          </div>

          {/* Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
            <AnimatePresence mode="popLayout">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Waiting for payments...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run a workflow to see transactions
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {payments.some((payment) => payment.status === 'simulated') && (
                    <div className="border border-accent/30 bg-background p-3 text-xs text-muted-foreground">
                      Simulated Arc USDC receipts for Conduit agent accounting.
                    </div>
                  )}
                  {payments.map((payment) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        'border border-border bg-secondary/50 p-3',
                        'payment-pulse'
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="truncate font-medium">
                          {getNodeName(payment.fromNode)}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-accent" />
                        <span className="truncate font-medium">
                          {getNodeName(payment.toNode)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-xs text-accent">
                          {formatPrice(payment.amount)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {payment.status === 'failed' ? (
                            <XCircle className="h-3 w-3 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-accent" />
                          )}
                          {payment.status || 'verified'}
                        </span>
                      </div>
                      {(payment.transaction || payment.settlementId) && (
                        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                          {payment.transaction || payment.settlementId}
                        </p>
                      )}
                      {payment.network && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {payment.network} · {new Date(payment.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                      {payment.errorReason && (
                        <p className="mt-1 text-[10px] text-destructive">
                          {payment.errorReason}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Network indicator */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-accent animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Arc Testnet Connected
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Collapsed state */}
      {!isOpen && payments.length > 0 && (
        <div className="flex flex-1 flex-col items-center gap-1 py-4">
          {payments.slice(-5).map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-2 w-2 bg-accent"
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
