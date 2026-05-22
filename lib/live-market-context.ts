export interface LiveMarketSource {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

export interface LiveMarketContext {
  query: string
  summary: string
  sources: LiveMarketSource[]
}

const BLOCKED_SOURCE_HOSTS = [
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'medium.com',
  'substack.com',
  'blogspot.com',
  'wordpress.com',
]

const WEAK_SOURCE_HOSTS = [
  'fanduel.com',
  'draftkings.com',
  'betmgm.com',
  'caesars.com',
  'bet365.com',
  'oddschecker.com',
  'bettingodds.com',
  'oddspedia.com',
  'sportsbookreview.com',
]

const PREFERRED_SOURCE_HOSTS = [
  'polymarket.com',
  'kalshi.com',
  'reuters.com',
  'apnews.com',
  'bloomberg.com',
  'cnbc.com',
  'wsj.com',
  'ft.com',
  'federalreserve.gov',
  'bls.gov',
  'bea.gov',
  'sec.gov',
  'cftc.gov',
  'eia.gov',
  'congress.gov',
  'whitehouse.gov',
  'uefa.com',
  'fifa.com',
  'premierleague.com',
  'skysports.com',
  'statbunker.com',
  'transfermarkt.com',
  'espn.com',
  'bbc.com',
  'bbc.co.uk',
  'theathletic.com',
]

const CURRENT_SEARCH_DATE = new Date()
const CURRENT_SEARCH_YEAR = CURRENT_SEARCH_DATE.getUTCFullYear()
const RECENT_SEARCH_START = new Date(Date.UTC(
  CURRENT_SEARCH_DATE.getUTCFullYear(),
  CURRENT_SEARCH_DATE.getUTCMonth(),
  1
)).toISOString().slice(0, 10)
const LIVE_CONTEXT_CACHE = new Map<string, { expiresAt: number; context: LiveMarketContext | null }>()
const LIVE_CONTEXT_CACHE_MS = 5 * 60 * 1000
const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function sourceScore(source: LiveMarketSource) {
  const host = getHost(source.url)
  const text = `${source.title} ${source.snippet} ${source.publishedDate || ''}`.toLowerCase()

  if (BLOCKED_SOURCE_HOSTS.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`))) {
    return -100
  }

  if (WEAK_SOURCE_HOSTS.some((weakHost) => host === weakHost || host.endsWith(`.${weakHost}`))) {
    return -5
  }

  const preferredIndex = PREFERRED_SOURCE_HOSTS.findIndex((preferredHost) => host === preferredHost || host.endsWith(`.${preferredHost}`))
  const preferredScore = preferredIndex >= 0 ? 100 - preferredIndex : 1
  const stalePenalty = getStaleSourcePenalty(text)
  const freshnessBonus = /\b(?:today|yesterday|this week|latest|updated|current|released|reported|announced)\b/.test(text) ? 8 : 0

  return preferredScore + freshnessBonus - stalePenalty
}

function getStaleSourcePenalty(text: string) {
  const yearMatches = text.match(/\b20\d{2}\b/g)?.map(Number) || []
  const oldYearPenalty = yearMatches.some((year) => year < CURRENT_SEARCH_YEAR) ? 35 : 0
  const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/)

  if (!monthMatch) return oldYearPenalty

  const month = MONTH_INDEX[monthMatch[1]]
  const sourceDate = new Date(Date.UTC(CURRENT_SEARCH_YEAR, month, 1))
  const ageDays = Math.floor((CURRENT_SEARCH_DATE.getTime() - sourceDate.getTime()) / 86_400_000)

  return oldYearPenalty + (ageDays > 45 ? 120 : ageDays > 21 ? 35 : 0)
}

function rankSources(sources: LiveMarketSource[]) {
  return sources
    .map((source) => ({ source, score: sourceScore(source) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.source)
}

function normalizeSource(source: unknown): LiveMarketSource | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>
  const title = String(record.title || record.name || '').trim()
  const url = String(record.url || record.link || '').trim()
  const snippet = String(record.content || record.snippet || record.description || '').trim()
  const publishedDate = String(record.published_date || record.publishedDate || record.date || '').trim()

  if (!title && !snippet) return null

  return {
    title: title || url || 'Live source',
    url,
    snippet,
    publishedDate: publishedDate || undefined,
  }
}

function compactQuery(query: string) {
  return query
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420)
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function makeContext(query: string, summary: string, sources: LiveMarketSource[]): LiveMarketContext | null {
  const rankedSources = rankSources(sources).slice(0, 5)
  if (rankedSources.length === 0 && !summary.trim()) return null

  return {
    query,
    summary: String(summary || rankedSources.map((source) => `${source.title}: ${source.snippet}`).join('\n')).slice(0, 4000),
    sources: rankedSources,
  }
}

async function fetchTavilyContext(query: string, apiKey: string): Promise<LiveMarketContext | null> {
  try {
    const response = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
        exclude_domains: BLOCKED_SOURCE_HOSTS,
        time_range: 'month',
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const sources = Array.isArray(data.results)
      ? data.results.map(normalizeSource).filter(Boolean) as LiveMarketSource[]
      : []

    return makeContext(query, String(data.answer || ''), sources)
  } catch {
    return null
  }
}

async function fetchSerperContext(query: string, apiKey: string): Promise<LiveMarketContext | null> {
  try {
    const response = await fetchWithTimeout('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        num: 3,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const sources = Array.isArray(data.organic)
      ? data.organic.map(normalizeSource).filter(Boolean) as LiveMarketSource[]
      : []

    return makeContext(query, '', sources)
  } catch {
    return null
  }
}

export async function fetchLiveMarketContext(query: string): Promise<LiveMarketContext | null> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim()
  const serperKey = process.env.SERPER_API_KEY?.trim()
  const baseQuery = compactQuery(query)
  const cacheKey = `${Boolean(tavilyKey)}:${Boolean(serperKey)}:${baseQuery}`
  const cached = LIVE_CONTEXT_CACHE.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context
  }

  const filteredQuery = compactQuery(`${baseQuery} -site:youtube.com -site:youtu.be -site:reddit.com -site:facebook.com -site:x.com -site:twitter.com -site:tiktok.com -site:medium.com -site:substack.com`)
  const recentQuery = compactQuery(`${filteredQuery} latest current after:${RECENT_SEARCH_START}`)
  const primaryContexts = await Promise.all([
    tavilyKey ? fetchTavilyContext(recentQuery, tavilyKey) : null,
    serperKey ? fetchSerperContext(recentQuery, serperKey) : null,
  ])
  let usableContexts = primaryContexts.filter(Boolean) as LiveMarketContext[]

  if (usableContexts.length === 0) {
    const fallbackContexts = await Promise.all([
    tavilyKey ? fetchTavilyContext(filteredQuery, tavilyKey) : null,
    serperKey ? fetchSerperContext(filteredQuery, serperKey) : null,
    ])
    usableContexts = fallbackContexts.filter(Boolean) as LiveMarketContext[]
  }

  if (usableContexts.length === 0) {
    LIVE_CONTEXT_CACHE.set(cacheKey, { expiresAt: Date.now() + LIVE_CONTEXT_CACHE_MS, context: null })
    return null
  }

  const sources = usableContexts.flatMap((context) => context.sources)
  const summaries = usableContexts
    .map((context) => context.summary)
    .filter(Boolean)
    .join('\n')

  const context = makeContext(recentQuery, summaries, sources)
  LIVE_CONTEXT_CACHE.set(cacheKey, { expiresAt: Date.now() + LIVE_CONTEXT_CACHE_MS, context })
  return context
}
