import { defineChain } from 'viem'

const arcRpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
const arcUsdcAddress = process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'
const arcWebSocketUrl = process.env.NEXT_PUBLIC_ARC_WS_URL || arcRpcUrl.replace(/^https:/, 'wss:')

/**
 * Arc Testnet Configuration
 * Replace with mainnet addresses post-launch:
 * - Chain ID: TBD (mainnet)
 * - RPC URLs: https://rpc.arc.network
 * - Block Explorer: https://arcscan.app
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: [arcRpcUrl],
      webSocket: [arcWebSocketUrl],
    },
    blockdaemon: {
      http: ['https://rpc.blockdaemon.testnet.arc.network'],
    },
    drpc: {
      http: ['https://rpc.drpc.testnet.arc.network'],
      webSocket: ['wss://rpc.drpc.testnet.arc.network'],
    },
    quicknode: {
      http: ['https://rpc.quicknode.testnet.arc.network'],
      webSocket: ['wss://rpc.quicknode.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

// Arc Network identifier for Conduit payment accounting
export const ARC_NETWORK_ID = `eip155:${arcTestnet.id}` as const
export const ARC_RPC_URL = arcRpcUrl
export const ARC_WS_URL = arcWebSocketUrl

// Arc Testnet USDC contract used for wallet balances and demo agent payments.
export const ARC_USDC_ADDRESS = arcUsdcAddress as `0x${string}`
export const ARC_USDC_DECIMALS = 6

// Faucet URL for getting testnet USDC
export const ARC_FAUCET_URL = 'https://faucet.circle.com'
