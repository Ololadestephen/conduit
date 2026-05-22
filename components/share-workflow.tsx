'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Link2, Check, Copy, Twitter, MessageCircle, QrCode, Loader2, Database, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { AgentNode, formatPrice } from '@/lib/workflow-types'
import { cn } from '@/lib/utils'

interface ShareWorkflowProps {
  nodes: AgentNode[]
  className?: string
}

interface IPFSResult {
  cid: string
  shareUrl: string
  ipfsUrl: string
}

export function ShareWorkflow({ nodes, className }: ShareWorkflowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [ipfsResult, setIpfsResult] = useState<IPFSResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { address } = useAccount()
  const totalCost = nodes.reduce((sum, n) => sum + n.pricePerCall, 0)
  const isDisabled = nodes.length < 2

  const handlePublishToIPFS = async () => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch('/api/workflow/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          name: `Workflow ${new Date().toLocaleDateString()}`,
          description: `${nodes.length}-node agent workflow`,
          creator: address,
          tags: ['agentflow', 'arc-network'],
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIpfsResult({
          cid: data.cid,
          shareUrl: data.shareUrl,
          ipfsUrl: data.ipfsUrl,
        })
      } else {
        setError(data.error || 'Failed to publish')
      }
    } catch {
      setError('Failed to publish workflow')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCopy = () => {
    const url = ipfsResult?.shareUrl || ''
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = `Check out my AI agent workflow on Conduit! ${nodes.length} agents, ${formatPrice(totalCost)} per run on Arc Network.`
  const shareUrl = ipfsResult?.shareUrl || ''

  const shareLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      icon: MessageCircle,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ]

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute right-0 top-full z-50 mt-2 w-80 border border-border bg-popover p-4 shadow-lg"
            >
              <div className="mb-4">
                <h3 className="font-serif text-3xl font-semibold leading-none text-foreground">Share Workflow</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish to IPFS for a permanent, shareable link
                </p>
              </div>

              {/* Workflow preview */}
              <div className="border border-border bg-secondary/50 p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1">
                    {nodes.slice(0, 3).map((node, i) => (
                      <div
                        key={node.id}
                        className="flex h-6 w-6 items-center justify-center border border-primary/30 bg-background text-xs"
                        style={{ zIndex: 3 - i }}
                      >
                        {node.name[0]}
                      </div>
                    ))}
                    {nodes.length > 3 && (
                      <div className="flex h-6 w-6 items-center justify-center border border-border bg-muted text-xs text-muted-foreground">
                        +{nodes.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{nodes.length} nodes</span>
                </div>
                <p className="text-xs text-muted-foreground">{nodes.map(n => n.name).join(' → ')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="border border-accent/30 bg-background px-2 py-0.5 text-xs font-mono text-accent">
                    {formatPrice(totalCost)}/run
                  </span>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 bg-destructive/10 border border-destructive/50 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {/* Not published yet */}
              {!ipfsResult && (
                <Button
                  onClick={handlePublishToIPFS}
                  disabled={isUploading || !address}
                  className="w-full gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing to IPFS...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Publish to IPFS
                    </>
                  )}
                </Button>
              )}

              {/* Published - show share options */}
              {ipfsResult && (
                <>
                  {/* CID badge */}
                  <div className="mb-4 bg-background border border-accent/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">Published to IPFS</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      CID: {ipfsResult.cid}
                    </p>
                    <a
                      href={ipfsResult.ipfsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View on IPFS <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* URL input */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-background border border-border px-3 py-2 overflow-hidden">
                      <p className="text-xs font-mono text-muted-foreground truncate">{shareUrl}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Social links */}
                  <div className="flex gap-2 mb-4">
                    {shareLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 border border-border bg-secondary/50 px-3 py-2 text-sm transition-colors hover:bg-secondary"
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.name}</span>
                      </a>
                    ))}
                  </div>

                  {/* QR Code toggle */}
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex w-full items-center justify-center gap-2 border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/50"
                  >
                    <QrCode className="h-4 w-4" />
                    {showQR ? 'Hide' : 'Show'} QR Code
                  </button>

                  <AnimatePresence>
                    {showQR && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex items-center justify-center border border-border bg-white p-4">
                          <div className="relative h-32 w-32">
                            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-0.5">
                              {Array.from({ length: 64 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'rounded-sm',
                                    Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'
                                  )}
                                />
                              ))}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-8 w-8 items-center justify-center border border-border bg-white shadow-sm">
                                <Link2 className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-center text-xs text-muted-foreground">Scan to open workflow</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {!address && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Connect wallet to publish
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
