'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  FileText,
  Languages,
  Heart,
  Image,
  Database,
  Code,
  Send,
  X,
  GripVertical,
  BarChart3,
  Percent,
  Scale,
  ReceiptText,
  Search,
  ShieldCheck,
  PieChart,
} from 'lucide-react'
import { AgentNode, formatPrice } from '@/lib/workflow-types'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  FileText,
  Languages,
  Heart,
  Image,
  Database,
  Code,
  Send,
  BarChart3,
  Percent,
  Scale,
  ReceiptText,
  Search,
  ShieldCheck,
  PieChart,
}

interface WorkflowNodeProps {
  node: AgentNode
  isActive?: boolean
  isPaying?: boolean
  isSelected?: boolean
  onRemove: (id: string) => void
  onSelect?: (id: string) => void
}

export function WorkflowNode({ node, isActive, isPaying, isSelected, onRemove, onSelect }: WorkflowNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = iconMap[node.icon] || MessageSquare

  const categoryColors: Record<string, string> = {
    io: 'border-muted-foreground/30',
    text: 'border-primary/60',
    data: 'border-warning/60',
    utility: 'border-chart-3/60',
    market: 'border-accent/70',
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isDragging ? 1.05 : 1, 
        opacity: 1,
        boxShadow: isPaying 
          ? '0 0 30px var(--node-glow), 0 0 60px var(--node-glow)' 
          : isActive 
            ? '0 0 20px var(--node-glow)' 
            : 'none'
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-center gap-3 border bg-card p-4 min-w-[240px]',
        categoryColors[node.category] || 'border-border',
        isDragging && 'z-50 cursor-grabbing',
        isPaying && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={() => onSelect?.(node.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Icon */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center border',
        node.type === 'input' && 'border-border bg-secondary text-secondary-foreground',
        node.type === 'agent' && 'border-primary/30 bg-background text-primary',
        node.type === 'output' && 'border-accent/40 bg-background text-accent'
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-serif text-xl font-semibold leading-none truncate">{node.name}</p>
        <p className="text-xs text-muted-foreground truncate">{node.description}</p>
      </div>

      {/* Price badge */}
      <div className={cn(
        'shrink-0 border px-2 py-1 text-xs font-mono',
        node.pricePerCall === 0 
          ? 'border-border bg-secondary text-muted-foreground' 
          : 'border-accent/30 bg-background text-accent'
      )}>
        {formatPrice(node.pricePerCall)}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(node.id)}
        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center bg-destructive text-destructive-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
        style={{ opacity: isDragging ? 0 : undefined }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Payment animation overlay */}
      {isPaying && (
        <motion.div
          className="absolute inset-0 bg-accent/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  )
}
