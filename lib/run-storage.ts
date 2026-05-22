import { Redis } from '@upstash/redis'
import type { WorkflowRun } from './workflow-history'

const RUN_KEY_PREFIX = 'conduit:run:'
const OWNER_RUNS_KEY_PREFIX = 'conduit:owner-runs:'
const RUN_TTL_SECONDS = 60 * 60 * 24 * 30
const MAX_OWNER_RUNS = 25

function getRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    return null
  }

  return new Redis({ url, token })
}

export function getRunStorageKey(runId: string): string {
  return `${RUN_KEY_PREFIX}${runId}`
}

function getOwnerRunStorageKey(ownerAddress: string): string {
  return `${OWNER_RUNS_KEY_PREFIX}${ownerAddress.toLowerCase()}`
}

function normalizeAddress(address: string | undefined): string | null {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null
  }

  return address.toLowerCase()
}

export async function storeWorkflowRunRecord(run: WorkflowRun): Promise<{ stored: boolean; reason?: string }> {
  const redis = getRedisClient()

  if (!redis) {
    return { stored: false, reason: 'Upstash Redis is not configured' }
  }

  await redis.set(getRunStorageKey(run.id), JSON.stringify(run), {
    ex: RUN_TTL_SECONDS,
  })

  const ownerAddress = normalizeAddress(run.ownerAddress)

  if (ownerAddress) {
    const ownerKey = getOwnerRunStorageKey(ownerAddress)
    await redis.zadd(ownerKey, {
      score: run.timestamp,
      member: run.id,
    })
    await redis.expire(ownerKey, RUN_TTL_SECONDS)

    const rankedIds = await redis.zrange<string[]>(ownerKey, 0, -1, {
      rev: true,
    })

    if (rankedIds.length > MAX_OWNER_RUNS) {
      const staleIds = rankedIds.slice(MAX_OWNER_RUNS)
      if (staleIds.length > 0) {
        await redis.zrem(ownerKey, ...staleIds)
      }
    }
  }

  return { stored: true }
}

export async function getWorkflowRunRecord(runId: string): Promise<WorkflowRun | null> {
  const redis = getRedisClient()

  if (!redis) {
    return null
  }

  const stored = await redis.get<string | WorkflowRun>(getRunStorageKey(runId))

  if (!stored) {
    return null
  }

  if (typeof stored === 'string') {
    return JSON.parse(stored) as WorkflowRun
  }

  return stored as WorkflowRun
}

export async function listWorkflowRunsForOwner(ownerAddress: string): Promise<WorkflowRun[]> {
  const redis = getRedisClient()
  const normalizedOwner = normalizeAddress(ownerAddress)

  if (!redis || !normalizedOwner) {
    return []
  }

  const runIds = await redis.zrange<string[]>(getOwnerRunStorageKey(normalizedOwner), 0, MAX_OWNER_RUNS - 1, {
    rev: true,
  })

  const runs = await Promise.all(runIds.map((runId) => getWorkflowRunRecord(runId)))

  return runs
    .filter((run): run is WorkflowRun => Boolean(run))
    .sort((a, b) => b.timestamp - a.timestamp)
}

export async function deleteWorkflowRunRecord(runId: string, ownerAddress?: string): Promise<void> {
  const redis = getRedisClient()

  if (!redis) {
    return
  }

  const run = await getWorkflowRunRecord(runId)
  const normalizedOwner = normalizeAddress(ownerAddress || run?.ownerAddress)

  await redis.del(getRunStorageKey(runId))

  if (normalizedOwner) {
    await redis.zrem(getOwnerRunStorageKey(normalizedOwner), runId)
  }
}

export async function clearWorkflowRunsForOwner(ownerAddress: string): Promise<void> {
  const redis = getRedisClient()
  const normalizedOwner = normalizeAddress(ownerAddress)

  if (!redis || !normalizedOwner) {
    return
  }

  const ownerKey = getOwnerRunStorageKey(normalizedOwner)
  const runIds = await redis.zrange<string[]>(ownerKey, 0, -1)

  if (runIds.length > 0) {
    await redis.del(...runIds.map((runId) => getRunStorageKey(runId)))
  }

  await redis.del(ownerKey)
}
