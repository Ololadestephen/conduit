import { ARC_NETWORK_ID } from './arc-chain'
import { formatAgentPrice } from './agent-registry'

export const PAYMENT_MODE = 'simulated-arc-usdc' as const

export interface SimulatedPaymentReceipt {
  id: string
  mode: typeof PAYMENT_MODE
  network: string
  amount: string
  status: 'simulated'
  timestamp: string
}

export function createSimulatedReceipt(amount: number): SimulatedPaymentReceipt {
  return {
    id: `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    mode: PAYMENT_MODE,
    network: ARC_NETWORK_ID,
    amount: formatAgentPrice(amount),
    status: 'simulated',
    timestamp: new Date().toISOString(),
  }
}
