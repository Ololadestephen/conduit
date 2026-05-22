'use client'

import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Copy, Check, ExternalLink, Play, Loader2, Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandLockup } from '@/components/brand-mark'
import { formatPrice } from '@/lib/workflow-types'
import type { WorkflowIPFSMetadata } from '@/lib/ipfs-storage'
import { IPFS_GATEWAYS } from '@/lib/ipfs-storage'

interface WorkflowViewerPageProps {
  params: Promise<{ cid: string }>
}

export default function WorkflowViewerPage({ params }: WorkflowViewerPageProps) {
  const { cid } = use(params)
  const [workflow, setWorkflow] = useState<WorkflowIPFSMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadWorkflow() {
      try {
        const response = await fetch(`/api/workflow/${cid}`)
        const data = await response.json()

        if (data.success) {
          setWorkflow(data.workflow)
        } else {
          setError(data.error || 'Failed to load workflow')
        }
      } catch {
        setError('Failed to fetch workflow')
      } finally {
        setLoading(false)
      }
    }

    loadWorkflow()
  }, [cid])

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!workflow) return
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}-workflow.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading workflow from IPFS...</p>
        </div>
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="font-serif text-3xl font-semibold text-destructive">Workflow Not Found</h1>
          <p className="mt-2 text-muted-foreground">{error || 'This workflow does not exist or has been removed.'}</p>
        </div>
        <Link href="/app">
          <Button variant="outline">Back to Editor</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Link href="/app">
            <BrandLockup compact />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href={`/app?import=${cid}`}>
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" />
                Open in Editor
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Workflow info */}
        <div className="mb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Shared workflow</p>
          <h1 className="font-serif text-6xl font-semibold leading-none">{workflow.name}</h1>
          {workflow.description && (
            <p className="mt-2 text-lg text-muted-foreground">{workflow.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Created by {workflow.creator.slice(0, 6)}...{workflow.creator.slice(-4)}</span>
            <span className="h-1 w-1 bg-muted-foreground" />
            <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
            <span className="h-1 w-1 bg-muted-foreground" />
            <span>{workflow.nodes.length} nodes</span>
            <span className="h-1 w-1 bg-muted-foreground" />
            <span className="font-medium text-accent">{formatPrice(workflow.totalCost)} per run</span>
          </div>
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.tags.map(tag => (
                <span key={tag} className="border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Workflow visualization */}
        <div className="border border-border bg-card p-6">
          <h2 className="mb-6 font-serif text-4xl font-semibold">Workflow Pipeline</h2>
          <div className="flex flex-wrap items-center gap-2">
            {workflow.nodes.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="border border-border bg-secondary p-4">
                  <p className="font-serif text-2xl font-semibold leading-none">{node.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{node.description}</p>
                  {node.pricePerCall > 0 && (
                    <p className="mt-2 font-mono text-sm text-accent">
                      {formatPrice(node.pricePerCall)}
                    </p>
                  )}
                </div>
                {index < workflow.nodes.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* IPFS metadata */}
        <div className="mt-6 border border-border bg-card p-6">
          <h2 className="mb-6 font-serif text-4xl font-semibold">Storage Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CID</span>
              <code className="font-mono text-xs">{cid}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network</span>
              <span>Arc Testnet (Chain ID: 5042002)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">IPFS Gateway</span>
              <a
                href={`${IPFS_GATEWAYS[0]}/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View on IPFS <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
