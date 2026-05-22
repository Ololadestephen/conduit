import { NextRequest, NextResponse } from 'next/server'
import {
  fetchLiveMarketFeed,
  getMarketCandidateCategory,
  isMarketFocusArea,
  MARKET_FOCUS_AREAS,
  type MarketCandidate,
  type MarketFocusArea,
} from '@/lib/market-data-connectors'

export const dynamic = 'force-dynamic'

const DEFAULT_FOCUS_AREAS: MarketFocusArea[] = ['macro', 'crypto', 'sports', 'politics', 'entertainment']

function normalizeLimit(value: string | null): number {
  const limit = Number(value)
  if (!Number.isFinite(limit)) return 40
  return Math.max(5, Math.min(100, Math.floor(limit)))
}

function normalizeFocus(value: string | null): MarketFocusArea | 'all' {
  const focus = String(value || 'all').toLowerCase()
  if (focus === 'all') return 'all'
  return isMarketFocusArea(focus) ? focus : 'all'
}

function serializeMarket(candidate: MarketCandidate, focusArea: MarketFocusArea) {
  return {
    platform: candidate.platform,
    focusArea,
    category: getMarketCandidateCategory(candidate),
    title: candidate.title,
    outcomeName: candidate.outcomeName,
    side: candidate.side,
    marketProbability: candidate.yesPrice,
    yesPrice: candidate.yesPrice,
    noPrice: candidate.noPrice,
    volume: candidate.volume,
    volume24h: candidate.volume24h,
    liquidity: candidate.liquidity,
    openInterest: candidate.openInterest,
    closeTime: candidate.closeTime,
    updatedAt: candidate.updatedAt,
    url: candidate.url,
    sourceId: candidate.sourceId,
  }
}

async function fetchFocusMarkets(focusArea: MarketFocusArea, limit: number) {
  const markets = await fetchLiveMarketFeed(focusArea, limit)

  return markets.map((market) => serializeMarket(market, focusArea))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const focus = normalizeFocus(searchParams.get('focus'))
  const limit = normalizeLimit(searchParams.get('limit'))
  const focusAreas = focus === 'all' ? DEFAULT_FOCUS_AREAS : [focus]
  const groupedEntries = await Promise.all(
    focusAreas.map(async (focusArea) => [focusArea, await fetchFocusMarkets(focusArea, limit)] as const)
  )
  const groups = Object.fromEntries(groupedEntries)
  const markets = groupedEntries.flatMap(([, group]) => group)

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    refreshSeconds: 60,
    source: 'Polymarket/Kalshi public market APIs',
    supportedFocusAreas: MARKET_FOCUS_AREAS,
    focus,
    limit,
    total: markets.length,
    markets,
    groups,
  }, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  })
}
