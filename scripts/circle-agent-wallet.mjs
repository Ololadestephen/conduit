import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, '.env.local')
const RECOVERY_DIR = path.join(ROOT, '.circle-recovery')
const BLOCKCHAIN = process.env.CIRCLE_BLOCKCHAIN || 'ARC-TESTNET'

const REQUIRED_SDK = '@circle-fin/developer-controlled-wallets'

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return ''
  return fs.readFileSync(ENV_PATH, 'utf8')
}

function upsertEnvValue(source, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')

  if (pattern.test(source)) {
    return source.replace(pattern, line)
  }

  const prefix = source.endsWith('\n') || source.length === 0 ? source : `${source}\n`
  return `${prefix}${line}\n`
}

function writeEnvValues(values) {
  let source = readEnvFile()

  for (const [key, value] of Object.entries(values)) {
    source = upsertEnvValue(source, key, value)
    process.env[key] = value
  }

  fs.writeFileSync(ENV_PATH, source)
}

function requireEnv(key) {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`${key} is missing in .env.local`)
  }
  return value
}

async function loadCircleSdk() {
  try {
    return await import(REQUIRED_SDK)
  } catch {
    throw new Error(
      `Circle SDK is not installed. Run: npm install ${REQUIRED_SDK}@10.3.1 --legacy-peer-deps --no-audit --no-fund`
    )
  }
}

function generateSecret() {
  const existing = process.env.CIRCLE_ENTITY_SECRET?.trim()

  if (existing) {
    console.log('CIRCLE_ENTITY_SECRET already exists in .env.local. Keeping it unchanged.')
    return existing
  }

  const entitySecret = randomBytes(32).toString('hex')
  writeEnvValues({
    CIRCLE_ENTITY_SECRET: entitySecret,
    CIRCLE_BLOCKCHAIN: BLOCKCHAIN,
  })

  console.log('Generated CIRCLE_ENTITY_SECRET and saved it to .env.local.')
  console.log('Keep this secret safe. Circle cannot recover it for you.')
  return entitySecret
}

async function registerSecret() {
  const apiKey = requireEnv('CIRCLE_API_KEY')
  const entitySecret = requireEnv('CIRCLE_ENTITY_SECRET')
  const { registerEntitySecretCiphertext } = await loadCircleSdk()

  fs.mkdirSync(RECOVERY_DIR, { recursive: true })

  const response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: RECOVERY_DIR,
  })

  const hasRecoveryFile = Boolean(response.data?.recoveryFile)
  console.log(hasRecoveryFile
    ? `Registered entity secret. Recovery file saved under ${RECOVERY_DIR}.`
    : 'Registered entity secret. No recovery file was returned by Circle.')
}

async function createWallet() {
  const apiKey = requireEnv('CIRCLE_API_KEY')
  const entitySecret = requireEnv('CIRCLE_ENTITY_SECRET')
  const { initiateDeveloperControlledWalletsClient } = await loadCircleSdk()

  const existingWalletId = process.env.CIRCLE_AGENT_WALLET_ID?.trim()
  const existingWalletAddress = process.env.CIRCLE_AGENT_WALLET_ADDRESS?.trim()

  if (existingWalletId && existingWalletAddress) {
    console.log('Circle agent wallet already exists in .env.local.')
    console.log(`Wallet ID: ${existingWalletId}`)
    console.log(`Wallet Address: ${existingWalletAddress}`)
    return
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  })

  const walletSetResponse = await client.createWalletSet({
    name: 'Conduit Agent Wallet Set',
  })

  const walletSetId = walletSetResponse.data?.walletSet?.id
  if (!walletSetId) {
    throw new Error('Circle wallet set creation failed: no wallet set ID returned.')
  }

  const walletResponse = await client.createWallets({
    walletSetId,
    blockchains: [BLOCKCHAIN],
    count: 1,
    accountType: 'EOA',
  })

  const wallet = walletResponse.data?.wallets?.[0]
  if (!wallet?.id || !wallet?.address) {
    throw new Error('Circle wallet creation failed: no wallet ID/address returned.')
  }

  writeEnvValues({
    CIRCLE_BLOCKCHAIN: BLOCKCHAIN,
    CIRCLE_AGENT_WALLET_ID: wallet.id,
    CIRCLE_AGENT_WALLET_ADDRESS: wallet.address,
  })

  console.log('Created Circle agent wallet and saved values to .env.local.')
  console.log(`Wallet ID: ${wallet.id}`)
  console.log(`Wallet Address: ${wallet.address}`)
}

async function main() {
  const command = process.argv[2] || 'setup'

  if (command === 'generate-secret') {
    generateSecret()
    return
  }

  if (command === 'register-secret') {
    await registerSecret()
    return
  }

  if (command === 'create-wallet') {
    await createWallet()
    return
  }

  if (command === 'setup') {
    generateSecret()
    await registerSecret()
    await createWallet()
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
