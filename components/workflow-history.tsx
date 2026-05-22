'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  ChevronRight,
  ChevronDown,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  WorkflowRun,
  fetchRemoteWorkflowHistory,
  getWorkflowHistory,
  getWorkflowHistoryForOwner,
  deleteWorkflowRun,
  clearWorkflowHistory,
  formatDuration,
  formatTimestamp,
  mergeWorkflowHistory,
} from '@/lib/workflow-history'
import { formatPrice } from '@/lib/workflow-types'

interface WorkflowHistoryProps {
  onHistoryChange?: () => void
}

export function WorkflowHistory({ onHistoryChange }: WorkflowHistoryProps) {
  const { address } = useAccount()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<WorkflowRun[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      const localHistory = address
        ? getWorkflowHistoryForOwner(address)
        : getWorkflowHistory()

      if (!open) {
        return
      }

      if (!address) {
        setHistory(localHistory)
        return
      }

      const remoteHistory = await fetchRemoteWorkflowHistory(address)
      if (!cancelled) {
        setHistory(mergeWorkflowHistory(remoteHistory, localHistory))
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [address, open])

  const handleDelete = async (id: string) => {
    deleteWorkflowRun(id)
    if (address) {
      try {
        await fetch(`/api/runs/${id}?owner=${address.toLowerCase()}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.warn('Failed to delete remote run history:', error)
      }
    }
    const localHistory = address
      ? getWorkflowHistoryForOwner(address)
      : getWorkflowHistory()
    setHistory((current) => mergeWorkflowHistory(current.filter((run) => run.id !== id), localHistory))
    onHistoryChange?.()
  }

  const handleClearAll = async () => {
    clearWorkflowHistory()
    if (address) {
      try {
        await fetch(`/api/runs?owner=${address.toLowerCase()}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.warn('Failed to clear remote run history:', error)
      }
    }
    setHistory([])
    onHistoryChange?.()
  }

  const toggleExpand = (id: string) => {
    setExpandedRun(expandedRun === id ? null : id)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-serif text-3xl font-semibold">
              <History className="h-5 w-5 text-primary" />
              Workflow History
            </DialogTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleClearAll()
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No workflow runs yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Run a workflow to see it appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="border border-border bg-background/50 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(run.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-2xl font-semibold leading-none">
                            {run.nodes.length} nodes
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(run.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(run.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(run.totalCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/app/runs/${run.id}`}>
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(run.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {expandedRun === run.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedRun === run.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Input
                          </div>
                          <pre className="text-xs bg-muted/50 border border-border p-2 overflow-x-auto max-h-20">
                            {typeof run.input === 'string'
                              ? run.input
                              : JSON.stringify(run.input, null, 2)}
                          </pre>

                          <div className="text-xs font-medium text-muted-foreground mt-3 mb-2">
                            Steps
                          </div>
                          <div className="space-y-2">
                            {run.steps.map((step, i) => (
                              <div
                                key={step.nodeId}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="w-5 h-5 border border-primary/30 bg-background text-primary flex items-center justify-center text-xs font-medium">
                                  {i + 1}
                                </span>
                                <span className="font-medium">{step.nodeName}</span>
                                <span className="text-muted-foreground">
                                  {formatDuration(step.duration)}
                                </span>
                                {step.cost > 0 && (
                                  <span className="text-primary font-mono text-xs">
                                    {formatPrice(step.cost)}
                                  </span>
                                )}
                                {step.status === 'success' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="text-xs font-medium text-muted-foreground mt-3 mb-2">
                            Output
                          </div>
                          <pre className="text-xs bg-muted/50 border border-border p-2 overflow-x-auto max-h-32">
                            {typeof run.output === 'string'
                              ? run.output
                              : JSON.stringify(run.output, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
