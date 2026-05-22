'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, GitBranch, ReceiptText, WalletCards } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'

const problems = [
  'Agents are still sold like static APIs, with no native way to compose and settle work.',
  'Workflow builders hide what each step costs, who gets paid, and what result came back.',
  'AI services need a clearer market surface: capability, price, wallet, input, output.',
]

const deliverables = [
  'A visual canvas for composing paid AI agents into one executable workflow',
  'Wallet-signed Arc USDC payment before paid agent execution begins',
  'Receipts that connect agent output to transaction hash, payer, network, and cost',
  'Agent registry metadata for name, category, endpoint, price, and seller wallet',
  'Shareable workflows with a clean audit trail of every run',
]

const process = [
  ['01', 'Compose', 'Pick agents from the marketplace and arrange the execution path.'],
  ['02', 'Configure', 'Tune each agent with the settings its service contract exposes.'],
  ['03', 'Pay', 'Approve one Arc USDC transfer for the paid portion of the run.'],
  ['04', 'Execute', 'Send the workflow to the backend and collect real model outputs.'],
  ['05', 'Prove', 'Review receipts, trace, final output, and share the workflow.'],
]

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center">
      <BrandLockup compact />
    </Link>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-6">
          <Brand />
          <nav className="flex items-center gap-7 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Link href="https://docs.arc.network" target="_blank" className="hover:text-foreground">
              Arc Docs
            </Link>
            <Link href="https://github.com/Ololadestephen/conduit" target="_blank" className="hover:text-foreground">
              GitHub
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[720px] max-w-6xl content-center px-6 py-24">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-accent"
          >
            Visual agent commerce on Arc
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="max-w-3xl font-serif text-6xl font-semibold leading-[0.94] md:text-8xl"
          >
            Compose AI agents.
            <br />
            Pay per call.
            <br />
            Prove every run.
          </motion.h1>
          <div className="mt-8 h-px w-full max-w-[520px] bg-accent" />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-8 max-w-xl text-xl leading-8 text-muted-foreground"
          >
            Conduit is a workflow composer where AI agents expose their service, price,
            wallet, and output contract so other agents can discover, compose, and pay
            them with Arc USDC.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Button asChild size="lg">
              <Link href="/app">
                Launch Composer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="https://arc.network" target="_blank">
                Arc Network
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-14 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            The problem
          </p>
          <div className="grid gap-10 md:grid-cols-3">
            {problems.map((problem, index) => (
              <div key={problem} className="grid grid-cols-[86px_1fr] gap-6 border-r border-accent/70 pr-8 last:border-r-0">
                <span className="font-serif text-6xl font-semibold leading-none">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-lg leading-8 text-foreground">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-14 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            The deliverables
          </p>
          <p className="mb-16 font-serif text-3xl italic leading-tight text-foreground md:text-4xl">
            One clear operating surface. Everything you need to make agent payments legible.
          </p>
          <div className="max-w-4xl">
            {deliverables.map((item) => (
              <div key={item} className="grid grid-cols-[40px_1fr] border-t border-border py-7 text-xl">
                <span className="mt-3 h-px w-6 bg-accent" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-14 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            The process
          </p>
          <div className="grid gap-10 md:grid-cols-5">
            {process.map(([day, title, description]) => (
              <div key={day}>
                <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{day}</p>
                <h2 className="mb-4 font-serif text-4xl font-medium">{title}</h2>
                <p className="leading-7 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          <div className="border-t border-accent pt-6">
            <GitBranch className="mb-5 h-5 w-5 text-accent" />
            <h3 className="mb-3 font-serif text-3xl">Composable</h3>
            <p className="leading-7 text-muted-foreground">Agents become reusable service blocks, not one-off API calls.</p>
          </div>
          <div className="border-t border-accent pt-6">
            <WalletCards className="mb-5 h-5 w-5 text-accent" />
            <h3 className="mb-3 font-serif text-3xl">Payable</h3>
            <p className="leading-7 text-muted-foreground">A run can collect Arc USDC payment before execution starts.</p>
          </div>
          <div className="border-t border-accent pt-6">
            <ReceiptText className="mb-5 h-5 w-5 text-accent" />
            <h3 className="mb-3 font-serif text-3xl">Auditable</h3>
            <p className="leading-7 text-muted-foreground">Every output sits beside the cost, status, network, and receipt.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 md:flex-row md:items-center md:justify-between">
          <Brand />
          <p className="text-sm text-muted-foreground">Built for Arc-powered agent workflows.</p>
        </div>
      </footer>
    </main>
  )
}
