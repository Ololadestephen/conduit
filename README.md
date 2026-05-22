# Conduit

**Chain AI Agents, Pay Per Call**

Conduit is a visual workflow builder for AI agent micropayments on Arc Network. Build pipelines that chain AI agents together, sign one Arc USDC transfer for the paid portion of a run, execute the agents, and inspect a receipt-backed result page. [Conduit](https://arcconduit.vercel.app/)

![Conduit](https://img.shields.io/badge/Arc_Network-Testnet-purple) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)


## Features

- **Visual Workflow Composer** - Drag-and-drop interface to build AI agent pipelines
- **Real AI Execution** - Powered by Vercel AI SDK with Groq/OpenAI-compatible models for summarization, translation, sentiment analysis, code review, and data enrichment
- **Arc USDC Payments** - Connected wallets sign one Arc USDC transfer before paid workflow execution
- **Run Result Pages** - Successful runs open a dedicated result page with input, trace, output, receipt, and ArcScan link
- **Prediction Market Trader Intelligence** - Signal research, fair-odds estimation, Kelly-style sizing, and +EV trade decisions
- **IPFS Storage** - Publish and share workflows permanently via Pinata/IPFS
- **Wallet Integration** - Connect MetaMask or WalletConnect to Arc Testnet
- **Pre-built Templates** - Content Pipeline, Sentiment Analysis, Translation, Code Review, and Data Processing workflows
- **Workflow History** - Track past executions with cost and performance metrics
- **Durable Run Records** - Completed runs are stored in Upstash so `/app/runs/[runId]` links survive refreshes and other devices
- **Rate Limiting** - Upstash Redis-powered rate limiting to prevent abuse
- **Security** - Input sanitization, Zod validation, and server-side API key handling

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4, shadcn/ui
- **AI**: Vercel AI SDK 6
- **Blockchain**: wagmi, viem, Arc Network Testnet
- **Payments**: Arc USDC ERC-20 transfer on Arc Testnet
- **Storage**: IPFS via Pinata
- **Run Storage / Rate Limiting**: Upstash Redis
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- MetaMask or WalletConnect-compatible wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/Ololadestephen/conduit.git
cd conduit

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Upstash Redis (for rate limiting and durable run records)
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token

# AI execution
# B.AI is the primary provider. It uses an OpenAI-compatible chat endpoint.
AI_PROVIDER=b-ai
AI_PROVIDER_ORDER=b-ai,openrouter,groq,ollama
B_AI_BASE_URL=https://api.b.ai
B_AI_MODEL=gpt-5-mini
B_AI_FALLBACK_MODEL=deepseek-v3.2
B_AI_RETRY_EMPTY_RESPONSE=false
B_AI_API_KEY=your_b_ai_api_key
OPENROUTER_MODEL=qwen/qwen3-14b:free
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=your_groq_api_key
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1

# Optional live market context lookup
TAVILY_API_KEY=
SERPER_API_KEY=

# Pinata (for IPFS storage)
PINATA_JWT=your_pinata_jwt_token

# WalletConnect (optional - has fallback)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Arc Network
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_WS_URL=
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000

# Circle Agent Wallet execution
CIRCLE_API_KEY=your_circle_testnet_standard_api_key
CIRCLE_ENTITY_SECRET=your_circle_entity_secret
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_AGENT_WALLET_ID=
CIRCLE_AGENT_WALLET_ADDRESS=
CIRCLE_ARC_USDC_TOKEN_ID=

# Fallback seller address for receiving demo payments
SELLER_ADDRESS=0x_your_arc_wallet_address
NEXT_PUBLIC_DEMO_SELLER_ADDRESS=0x_your_arc_wallet_address

# Optional per-agent seller wallets for marketplace-style routing
NEXT_PUBLIC_SUMMARIZER_SELLER_ADDRESS=
NEXT_PUBLIC_TRANSLATOR_SELLER_ADDRESS=
NEXT_PUBLIC_SENTIMENT_SELLER_ADDRESS=
NEXT_PUBLIC_CODE_REVIEWER_SELLER_ADDRESS=
NEXT_PUBLIC_DATA_ENRICHMENT_SELLER_ADDRESS=
NEXT_PUBLIC_JSON_TRANSFORM_SELLER_ADDRESS=
NEXT_PUBLIC_MARKET_RESEARCHER_SELLER_ADDRESS=
NEXT_PUBLIC_PROBABILITY_ESTIMATOR_SELLER_ADDRESS=
NEXT_PUBLIC_KELLY_SIZER_SELLER_ADDRESS=
NEXT_PUBLIC_BETTING_BRIEF_SELLER_ADDRESS=
NEXT_PUBLIC_WEBHOOK_SELLER_ADDRESS=

# Polymarket V2 builder attribution (optional, recommendation-only milestone)
POLYMARKET_BUILDER_CODE=your_builder_code
NEXT_PUBLIC_POLYMARKET_BUILDER_CODE=your_builder_code
```

### Current Demo Flow

1. Open `/app` and connect an Arc Testnet wallet, or switch payment mode to Agent Wallet after Circle is configured.
2. Add agents manually or load a template.
3. Open `Agent Settings` to set the workflow input and configure the selected agent.
4. Click `Run Workflow`.
5. Conduit builds a payment plan from the selected agents and groups charges by each agent's `payTo` seller wallet.
6. In Connected Wallet mode, the browser asks the wallet to sign one Arc USDC `transfer()` per seller wallet.
7. In Agent Wallet mode, the backend submits one Arc USDC transfer per seller wallet through Circle Developer-Controlled Wallets and polls Circle until each transaction is confirmed.
8. After payments confirm, Conduit calls `POST /api/workflow/execute`.
9. The backend executes the selected AI agents and returns step outputs.
10. The app saves the completed run locally and stores the completed run record in Upstash.
11. The app redirects to `/app/runs/[runId]`.
12. The result page shows workflow input, final output, agent trace, payment receipts, payer, sellers, token, network, and ArcScan transaction links.
13. If local browser history is missing, `/app/runs/[runId]` fetches the durable run record from Upstash.

For the hackathon demo, load the `+EV Trader Intelligence` template and enter a
market question, market probability/price, bankroll, and supporting news, data,
or sentiment. If `TAVILY_API_KEY` or `SERPER_API_KEY` is configured, the Signal
Research Agent can also resolve vague market prompts against live web context
before estimating. The workflow produces a recommendation-only trade decision
with source weighting, model probability, edge, Kelly-style sizing, hedge notes,
and builder-code attribution.

By default, when B.AI returns an empty completion, Conduit falls through to the
fallback model instead of making a second billable call on the same model. If
you want the stricter same-model JSON retry back, set
`B_AI_RETRY_EMPTY_RESPONSE=true`.

> Note: this is not full x402 settlement yet. The current milestone uses a direct
> Arc USDC ERC-20 transfer to make the payment/signing layer real while the app
> continues toward a later x402 facilitator integration.

### Circle Agent Wallet Execution

Conduit includes an Agent Wallet mode that pays from a Circle
Developer-Controlled Wallet on `ARC-TESTNET` without exposing Circle secrets to
the browser.

Create a Circle **testnet API Key** with **Standard Key** access and place it in
`.env.local` as `CIRCLE_API_KEY`. The backend payment endpoint also needs:

```env
CIRCLE_ENTITY_SECRET=
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_AGENT_WALLET_ID=
CIRCLE_AGENT_WALLET_ADDRESS=
```

Connected Wallet mode still uses the connected browser wallet for direct Arc
USDC transfers. Agent Wallet mode calls `POST /api/agent-wallet/pay` for each
seller wallet, submits the USDC transfer through Circle, waits for a terminal
Circle transaction state, and then records Circle settlement IDs and Arc tx
hashes in the result receipt.

The payment route resolves Circle's internal Arc USDC token ID from the wallet's
visible balances before transferring. If Circle exposes the token ID separately,
you can set `CIRCLE_ARC_USDC_TOKEN_ID` to skip token discovery.

Fund `CIRCLE_AGENT_WALLET_ADDRESS` with Arc Testnet USDC before running paid
workflows in Agent Wallet mode. Circle and Arc faucets are the easiest way to do
that during the hackathon.

To create the local Circle Agent Wallet values, install the Circle SDK and run:

```bash
npm install @circle-fin/developer-controlled-wallets@10.3.1 --legacy-peer-deps --no-audit --no-fund
npm run circle:agent-wallet
```

The setup script will:

1. generate `CIRCLE_ENTITY_SECRET` if it is missing,
2. register the entity secret with Circle,
3. save the Circle recovery file under `.circle-recovery/`,
4. create one `ARC-TESTNET` EOA wallet,
5. write `CIRCLE_AGENT_WALLET_ID` and `CIRCLE_AGENT_WALLET_ADDRESS` to `.env.local`.

If you want to run the steps manually:

```bash
npm run circle:generate-secret
npm run circle:register-secret
npm run circle:create-wallet
```

### Agora / Canteen Hackathon Setup

The Agora Agents hackathon uses the Canteen CLI for authenticated Arc RPC access
and project progress tracking.

```bash
uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git
arc-canteen login
arc-canteen rpc eth_chainId
```

`arc-canteen rpc eth_chainId` should return the Arc Testnet chain ID in hex:

```text
0x4cef52
```

That value is decimal `5042002`, which should match the Arc chain configured in
Conduit.

After login, you can print your Canteen RPC URL:

```bash
arc-canteen rpc-url
```

It will look like this:

```text
https://rpc.testnet.arc-node.thecanteenapp.com/v1/<key>
```

Use that value for `NEXT_PUBLIC_ARC_RPC_URL` when running the hackathon demo:

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/your_key
```

Do not commit the tokenized RPC URL. Keep it in `.env.local`.

The Canteen CLI can also sync Arc/Circle docs and runnable example projects for
agent context:

```bash
arc-canteen context
arc-canteen context sync
```

Those examples are stored under `~/.arc-canteen/context/` and can be refreshed
with `arc-canteen context sync`.

## Project Structure

```
conduit/
├── app/
│   ├── api/
│   │   ├── agents/          # Agent registry
│   │   ├── pay/             # Payment metadata
│   │   ├── runs/            # Durable completed run records
│   │   └── workflow/        # Execute, store, fetch workflows
│   ├── app/                 # Main workflow builder and run result pages
│   ├── workflow/[cid]/      # Shared workflow viewer
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── workflow-canvas.tsx  # Drag-drop canvas
│   ├── workflow-node.tsx    # Agent node component
│   ├── agent-sidebar.tsx    # Agent marketplace
│   ├── wallet-header.tsx    # Wallet connection
│   └── ...
├── lib/
│   ├── ai-agents.ts         # AI SDK agent implementations
│   ├── arc-chain.ts         # Arc Network chain config
│   ├── wagmi-config.ts      # Wallet configuration
│   ├── payment-simulation.ts # Local receipt helper for non-settled metadata
│   ├── ipfs-storage.ts      # Pinata IPFS integration
│   ├── rate-limit.ts        # Upstash rate limiting
│   ├── run-storage.ts       # Upstash completed run storage
│   └── validation-schemas.ts # Zod schemas
└── ...
```

## Available Agents

| Agent | Description | Price |
|-------|-------------|-------|
| Text Input | Starting point for text workflows | Free |
| Summarizer | AI-powered text summarization | $0.0002 |
| Translator | Multi-language translation | $0.0001 |
| Sentiment Analyzer | Detect sentiment and emotions | $0.00015 |
| Code Reviewer | AI code review and suggestions | $0.0003 |
| Data Enricher | Extract metadata and entities | $0.0002 |
| Signal Research Agent | Synthesize noisy news, data, and sentiment | $0.0004 |
| Fair Odds Agent | Estimate fair probability and mispricing | $0.0005 |
| Position Sizing Agent | Apply Kelly-style sizing and risk caps | $0.00035 |
| Trade Decision Agent | Produce +EV decision, hedge notes, and attribution | $0.00025 |
| API Output | Output workflow results | Free |

## Arc Network

Conduit runs on Arc Network Testnet:

- **Chain ID**: 5042002
- **RPC**: https://rpc.testnet.arc-node.thecanteenapp.com/v1/<key> or https://rpc.testnet.arc.network
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: [Circle Testnet Faucet](https://faucet.circle.com/)

## Security

- All AI inputs are sanitized against prompt injection attacks
- API routes validate requests with Zod schemas
- Workflow execution records Arc USDC transfer metadata and links to ArcScan when available
- Rate limiting prevents abuse (10 workflows/min, 30 payments/min)
- Server-side only access to sensitive API keys


## License

MIT

## Links

- [Arc Network](https://arc.network)
- [Vercel AI SDK](https://sdk.vercel.ai)
