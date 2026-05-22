'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'
import { WorkflowNode } from './workflow-node'
import { AgentNode, formatPrice, PaymentEvent } from '@/lib/workflow-types'
import { cn } from '@/lib/utils'

interface WorkflowCanvasProps {
  nodes: AgentNode[]
  onNodesChange: (nodes: AgentNode[]) => void
  onRemoveNode: (id: string) => void
  selectedNodeId?: string | null
  onSelectNode?: (id: string) => void
  isRunning: boolean
  payingNodeId: string | null
  payments: PaymentEvent[]
}

export function WorkflowCanvas({
  nodes,
  onNodesChange,
  onRemoveNode,
  selectedNodeId,
  onSelectNode,
  isRunning,
  payingNodeId,
  payments,
}: WorkflowCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = nodes.findIndex((node) => node.id === active.id)
        const newIndex = nodes.findIndex((node) => node.id === over.id)
        onNodesChange(arrayMove(nodes, oldIndex, newIndex))
      }

      setActiveId(null)
    },
    [nodes, onNodesChange]
  )

  const activeNode = activeId ? nodes.find((n) => n.id === activeId) : null
  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 canvas-grid border border-dashed border-border p-8">
        <div className="flex h-16 w-16 items-center justify-center border border-border bg-secondary">
          <Zap className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-serif text-4xl font-semibold">Start Building Your Workflow</p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag agents from the sidebar to create a payment pipeline
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Canvas area */}
      <div className="flex-1 canvas-grid border border-border p-6 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={nodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence mode="popLayout">
                {nodes.map((node, index) => (
                  <div key={node.id} className="flex flex-col items-center group">
                    <WorkflowNode
                      node={node}
                      isActive={activeId === node.id}
                      isPaying={payingNodeId === node.id}
                      isSelected={selectedNodeId === node.id}
                      onRemove={onRemoveNode}
                      onSelect={onSelectNode}
                    />
                    
                    {/* Connection arrow */}
                    {index < nodes.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col items-center py-2"
                      >
                        <div className={cn(
                          'h-8 w-px transition-colors duration-300',
                          isRunning && payingNodeId === node.id 
                            ? 'bg-accent' 
                            : 'bg-border'
                        )} />
                        <ArrowRight className={cn(
                          'h-4 w-4 rotate-90 transition-colors duration-300',
                          isRunning && payingNodeId === node.id 
                            ? 'text-accent' 
                            : 'text-muted-foreground'
                        )} />
                        
                        {/* Payment amount indicator */}
                        {isRunning && payingNodeId === node.id && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute mt-4 bg-accent px-2 py-0.5 text-xs font-mono text-accent-foreground"
                          >
                            {formatPrice(nodes[index + 1]?.pricePerCall || 0)}
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeNode && (
              <div className="opacity-80">
                <WorkflowNode
                  node={activeNode}
                  isActive
                  isPaying={false}
                  isSelected={false}
                  onRemove={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

    </div>
  )
}
