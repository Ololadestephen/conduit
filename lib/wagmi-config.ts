import { http, createConfig, createStorage, noopStorage } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { ARC_RPC_URL, arcTestnet } from './arc-chain'

// WalletConnect project ID - users should set their own
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo'

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected(),
    walletConnect({ 
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Conduit',
        description: 'Chain AI Agents, Pay Per Call on Arc Network',
        url: 'https://conduit.app',
        icons: ['https://conduit.app/icon.png'],
      },
      showQrModal: true,
    }),
  ],
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  transports: {
    [arcTestnet.id]: http(ARC_RPC_URL, {
      retryCount: 2,
      timeout: 15_000,
    }),
  },
  ssr: true, // Enable SSR support
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
