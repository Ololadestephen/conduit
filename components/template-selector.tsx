'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  BarChart3,
  Database,
  Code,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WORKFLOW_TEMPLATES, WorkflowTemplate, instantiateTemplate } from '@/lib/workflow-templates'
import { AgentNode, formatPrice } from '@/lib/workflow-types'

interface TemplateSelectorProps {
  onSelectTemplate: (nodes: AgentNode[], template: WorkflowTemplate) => void
  disabled?: boolean
}

const categoryIcons = {
  content: FileText,
  analysis: BarChart3,
  data: Database,
  development: Code,
  market: TrendingUp,
}

const categoryColors = {
  content: 'text-accent',
  analysis: 'text-accent',
  data: 'text-accent',
  development: 'text-accent',
  market: 'text-accent',
}

const categoryBgColors = {
  content: 'bg-background border-border',
  analysis: 'bg-background border-border',
  data: 'bg-background border-border',
  development: 'bg-background border-border',
  market: 'bg-background border-accent/40',
}

export function TemplateSelector({ onSelectTemplate, disabled }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    const nodes = instantiateTemplate(template)
    onSelectTemplate(nodes, template)
    setOpen(false)
    setSelectedTemplate(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-3xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Workflow Templates
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a workflow template and load its agents onto the composer canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {selectedTemplate ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back to templates
                </button>

                <div className={`min-w-0 border p-4 ${categoryBgColors[selectedTemplate.category]}`}>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
                    <div className="min-w-0">
                      <h3 className="font-serif text-3xl font-semibold">{selectedTemplate.name}</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {selectedTemplate.description}
                      </p>
                      {selectedTemplate.initialInput && (
                        <p className="mt-3 border-l border-accent/60 pl-3 text-xs leading-5 text-muted-foreground">
                          Loads a ready-to-run demo prompt into Run Input.
                        </p>
                      )}
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-sm text-muted-foreground">Estimated cost</div>
                      <div className="text-lg font-mono text-primary">
                        {formatPrice(selectedTemplate.estimatedCost)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Workflow Steps</div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedTemplate.nodes.map((node, i) => (
                        <div key={i} className="min-w-0 border border-border bg-background/50 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="break-words text-xs font-medium leading-5">{node.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {node.pricePerCall > 0 ? formatPrice(node.pricePerCall) : 'Free'}
                              </div>
                            </div>
                          </div>
                          {i < selectedTemplate.nodes.length - 1 && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              <span className="h-px flex-1 bg-border" />
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectTemplate(selectedTemplate)}
                    className="w-full mt-4"
                  >
                    Use This Template
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid gap-3"
              >
                {WORKFLOW_TEMPLATES.map((template) => {
                  const CategoryIcon = categoryIcons[template.category]
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`group grid gap-3 border p-4 text-left transition-all hover:border-primary md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-center ${categoryBgColors[template.category]}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`shrink-0 border border-border bg-background/50 p-2 ${categoryColors[template.category]}`}>
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-serif text-2xl font-semibold leading-none">{template.name}</div>
                          <div className="mt-1 text-sm leading-5 text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-sm font-mono text-primary">
                          {formatPrice(template.estimatedCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.nodes.length} steps
                        </div>
                      </div>
                      <ChevronRight className="hidden h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground md:block" />
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
