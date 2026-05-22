import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Rate limiters for different endpoints
// Workflow execution: 10 requests per minute (AI API calls are expensive)
export const workflowRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:workflow',
})

// Payment API: 30 requests per minute
export const paymentRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:payment',
})

// IPFS storage: 5 requests per minute (prevent spam uploads)
export const storageRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:storage',
})

// General API: 60 requests per minute
export const generalRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:general',
})

// Get client identifier (IP or wallet address)
export function getClientIdentifier(request: NextRequest): string {
  // Try to get wallet address from header (if authenticated)
  const walletAddress = request.headers.get('x-wallet-address')
  if (walletAddress) {
    return `wallet:${walletAddress.toLowerCase()}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'anonymous'
  
  return `ip:${ip}`
}

// Rate limit check result type
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Check rate limit and return appropriate response if exceeded
export async function checkRateLimit(
  rateLimiter: Ratelimit,
  identifier: string
): Promise<{ allowed: boolean; result: RateLimitResult; response?: NextResponse }> {
  const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)

  const result: RateLimitResult = {
    success,
    limit,
    remaining,
    reset,
  }

  if (!success) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    )
    return { allowed: false, result, response }
  }

  return { allowed: true, result }
}

// Add rate limit headers to successful response
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}
