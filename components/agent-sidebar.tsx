'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  FileText,
  Languages,
  Heart,
  Database,
  Code,
  Send,
  Search,
  Plus,
  Sparkles,
  BarChart3,
  Percent,
  Scale,
  ReceiptText,
  ShieldCheck,
  PieChart,
} from 'lucide-react'
import { AVAILABLE_AGENTS, formatPrice, generateId, AgentNode } from '@/lib/workflow-types'
import { withDefaultAgentConfig } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  FileText,
  Languages,
  Heart,
  Database,
  Code,
  Send,
  BarChart3,
  Percent,
  Scale,
  ReceiptText,
  ShieldCheck,
  PieChart,
}

interface AgentSidebarProps {
  onAddAgent: (agent: AgentNode) => void
}

const categoryLabels: Record<string, string> = {
  io: 'Input/Output',
  text: 'Text Processing',
  data: 'Data Operations',
  utility: 'Utilities',
  market: 'Markets',
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  io: Send,
  text: FileText,
  data: Database,
  utility: Code,
  market: BarChart3,
}

export function AgentSidebar({ onAddAgent }: AgentSidebarProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>('market')
  const hasSearch = search.trim().length > 0

  const filteredAgents = AVAILABLE_AGENTS.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      hasSearch ||
      !selectedCategory ||
      agent.category === selectedCategory ||
      (selectedCategory === 'market' && agent.category === 'io')
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(AVAILABLE_AGENTS.map((a) => a.category)))

  const handleAddAgent = (agent: typeof AVAILABLE_AGENTS[number]) => {
    const newNode: AgentNode = withDefaultAgentConfig({
      ...agent,
      id: generateId(),
      position: { x: 0, y: 0 },
    })
    onAddAgent(newNode)
  }

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="border-b border-sidebar-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center border border-primary bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold leading-none">Marketplace</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Arc USDC Micropayments</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto border-b border-sidebar-border p-3 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'shrink-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors',
            !selectedCategory
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:border-primary'
          )}
        >
          All
        </button>
        {categories.map((category) => {
          const CategoryIcon = categoryIcons[category] || Sparkles
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors',
                category === selectedCategory
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:border-primary'
              )}
            >
              <CategoryIcon className="h-3 w-3" />
              {categoryLabels[category]}
            </button>
          )
        })}
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {filteredAgents.map((agent, index) => {
            const Icon = iconMap[agent.icon] || MessageSquare
            return (
              <motion.button
                key={agent.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleAddAgent(agent)}
                className="group flex items-center gap-3 border border-sidebar-border bg-sidebar-accent/60 p-3 text-left transition-all hover:border-primary hover:bg-sidebar-accent"
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border transition-colors',
                  agent.type === 'input' && 'border-border bg-secondary text-secondary-foreground',
                  agent.type === 'agent' && 'border-primary/30 bg-background text-primary',
                  agent.type === 'output' && 'border-accent/40 bg-background text-accent'
                )}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 border px-2 py-0.5 text-xs font-mono',
                    agent.pricePerCall === 0
                      ? 'border-border bg-secondary text-muted-foreground'
                      : 'border-accent/30 bg-background text-accent'
                  )}>
                    {formatPrice(agent.pricePerCall)}
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center border border-primary bg-background text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No agents found</p>
          </div>
        )}
      </div>
    </div>
  )
}
