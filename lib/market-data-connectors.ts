export interface MarketCandidate {
  platform: 'Polymarket' | 'Kalshi'
  title: string
  outcomeName: string
  side: 'YES' | 'NO'
  yesPrice: number
  noPrice?: number
  volume?: number
  volume24h?: number
  liquidity?: number
  openInterest?: number
  closeTime?: string
  url?: string
  sourceId?: string
  updatedAt?: string
  active?: boolean
  closed?: boolean
  archived?: boolean
}

export type MarketFocusArea = 'macro' | 'crypto' | 'sports' | 'politics' | 'entertainment' | 'technology'
export const MARKET_FOCUS_AREAS = ['macro', 'crypto', 'sports', 'politics', 'entertainment', 'technology'] as const

const FOCUS_DISCOVERY_QUERIES: Record<MarketFocusArea, string[]> = {
  macro: [
    'fed fomc interest rate cut hike june july september meeting prediction market',
    'cpi inflation pce jobs payroll unemployment gdp recession treasury yield oil',
    'macro economy rates inflation recession us economic data prediction markets',
    'jobs report cpi print fed decision kalshi polymarket markets',
  ],
  crypto: [
    'bitcoin btc price all time high above below prediction markets',
    'ethereum eth solana crypto price etf approval prediction markets',
    'stablecoin usdc tether crypto regulation coinbase binance prediction markets',
    'crypto market bitcoin ethereum solana etf sec cftc stablecoin',
  ],
  sports: [
    'premier league champions league world cup nba nfl mlb nhl tennis golf ufc',
    'sports title winner qualification playoffs relegation standings injuries prediction markets',
    'soccer football basketball baseball hockey tennis golf current odds fixtures table',
    'team finish qualify win championship final player injury fixtures',
  ],
  politics: [
    'midterm election 2026 house senate governor polls approval trump biden prediction markets',
    'politics election party control congress senate house supreme court prediction markets',
    'president approval candidate nomination primary polling prediction markets',
    'policy legislation government shutdown tariffs immigration court ruling markets',
  ],
  entertainment: [
    'grammy oscars emmys album song artist billboard spotify box office movie prediction markets',
    'music awards film awards streaming charts entertainment prediction markets',
    'box office opening weekend movie release netflix disney academy awards markets',
    'billboard hot 100 album chart grammys oscars emmys nominations',
    'culture celebrity television video game esports entertainment live prediction markets',
  ],
  technology: [
    'openai nvidia tesla spacex apple google microsoft ai chip earnings product launch',
    'technology ai chips semiconductor earnings robotaxi iphone product prediction markets',
    'nvidia earnings tesla deliveries spacex launch starship openai google ai',
    'tech regulation antitrust lawsuit sec earnings ai model launch markets',
  ],
}

const BROAD_DISCOVERY_QUERIES = Object.values(FOCUS_DISCOVERY_QUERIES).map((queries) => queries[0])

const BROAD_SCAN_PATTERN = /(?:scan|underrated|opportunities|asymmetric|sports|macro|politics|crypto|entertainment|technology|tech)/i
const GENERIC_OPPORTUNITY_SCAN_PATTERN = /(?:scan\s+live\s+prediction\s+markets|underrated\s+opportunities|asymmetric\s+upside)/i
const NOVELTY_MARKET_PATTERN = /\b(?:before gta|gta vi|who will .*predict|538 predict|nate silver predict|tweet|meme|which will happen first)\b/i
const LOW_QUALITY_MARKET_PATTERN = /\b(?:will .* be mentioned|who will .* predict|which will happen first|before gta|gta vi|tweet|meme|mention|mentions|viral)\b/i
const FOCUS_MARKET_KEYWORDS: Record<MarketFocusArea, string[]> = {
  macro: ['fed', 'federal reserve', 'fomc', 'rate', 'rates', 'cut', 'hike', 'basis', 'bp', 'inflation', 'cpi', 'pce', 'jobs', 'jobs report', 'payroll', 'payrolls', 'unemployment', 'gdp', 'recession', 'treasury', 'yield', '10-year', 'oil', 'gas', 'gold', 'dollar', 'tariff', 'shutdown', 'debt ceiling'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'xrp', 'doge', 'crypto', 'stablecoin', 'usdc', 'usdt', 'defi', 'nft', 'coin', 'token', 'coinbase', 'binance', 'etf', 'sec', 'cftc'],
  sports: ['premier league', 'champions league', 'world cup', 'nba', 'nfl', 'mlb', 'nhl', 'wnba', 'ncaa', 'fifa', 'uefa', 'football', 'soccer', 'basketball', 'baseball', 'hockey', 'tennis', 'golf', 'ufc', 'mma', 'f1', 'formula 1', 'nascar', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'championship', 'playoff', 'relegation', 'qualify', 'finish', 'standings', 'injury', 'fixture', 'match', 'game'],
  politics: ['election', 'midterm', 'primary', 'nomination', 'candidate', 'president', 'congress', 'senate', 'house', 'trump', 'biden', 'democrat', 'democratic', 'republican', 'gop', 'approval', 'poll', 'polling', 'governor', 'mayor', 'supreme court', 'scotus', 'policy', 'tariff', 'immigration', 'shutdown', 'legislation', 'bill', 'cabinet'],
  entertainment: ['grammy', 'oscar', 'oscars', 'emmy', 'emmys', 'tony', 'academy', 'award', 'awards', 'nomination', 'album', 'billboard', 'hot 100', 'movie', 'film', 'box office', 'opening weekend', 'music', 'artist', 'song', 'tour', 'streaming', 'netflix', 'disney', 'hulu', 'apple tv', 'spotify', 'youtube', 'taylor', 'beyonce', 'culture', 'celebrity', 'tv', 'television', 'video game', 'gaming', 'esports'],
  technology: ['openai', 'nvidia', 'tesla', 'spacex', 'starship', 'ai', 'gpt', 'llm', 'iphone', 'apple', 'google', 'alphabet', 'microsoft', 'meta', 'amazon', 'chip', 'chips', 'semiconductor', 'earnings', 'revenue', 'market cap', 'stock', 'launch', 'product', 'robotaxi', 'antitrust', 'lawsuit', 'model'],
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseNumber(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function normalizeProbability(value: unknown): number | undefined {
  const number = parseNumber(value)
  if (number === undefined) return undefined
  return Math.min(0.99, Math.max(0.01, number > 1 ? number / 100 : number))
}

function normalizePositiveProbability(...values: unknown[]): number | undefined {
  for (const value of values) {
    const probability = normalizeProbability(value)
    if (probability !== undefined && probability > 0.01 && probability < 0.99) {
      return probability
    }
  }

  return normalizeProbability(values.find((value) => parseNumber(value) !== undefined))
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return undefined
}

function normalizeUrlSegment(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

function buildKalshiMarketUrl(record: Record<string, unknown>): string | undefined {
  const explicitUrl = String(record.url || record.web_url || record.webUrl || '').trim()
  if (explicitUrl.startsWith('http://') || explicitUrl.startsWith('https://')) {
    return explicitUrl
  }

  const eventSlug = normalizeUrlSegment(
    record.event_slug ||
    record.eventSlug ||
    record.__eventSlug ||
    asRecord(record.event).slug ||
    asRecord(record.__event).slug
  )
  const marketSlug = normalizeUrlSegment(record.slug || record.market_slug || record.marketSlug)
  const eventTicker = normalizeUrlSegment(record.event_ticker || record.eventTicker || record.__eventTicker)
  const seriesTicker = normalizeUrlSegment(record.series_ticker || record.seriesTicker || record.__seriesTicker)
  const ticker = normalizeUrlSegment(record.ticker)

  if (eventSlug && marketSlug) {
    return `https://kalshi.com/markets/${eventSlug}/${marketSlug}`
  }

  if (eventTicker && ticker) {
    return `https://kalshi.com/markets/${eventTicker}/${ticker}`
  }

  if (seriesTicker && ticker) {
    return `https://kalshi.com/markets/${seriesTicker}/${ticker}`
  }

  if (ticker) {
    return `https://external-api.kalshi.com/trade-api/v2/markets/${ticker}`
  }

  return undefined
}

function isPastDate(value?: string): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return false
  return timestamp < Date.now()
}

function hoursUntilClose(value?: string): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return (timestamp - Date.now()) / (1000 * 60 * 60)
}

function hasOldResolvedYear(candidate: MarketCandidate): boolean {
  const currentYear = new Date().getUTCFullYear()
  const text = `${candidate.title} ${candidate.outcomeName}`
  const years = text.match(/\b20\d{2}\b/g)?.map(Number) || []

  return years.some((year) => year <= currentYear - 2)
}

function isNoveltyCandidate(candidate: MarketCandidate): boolean {
  return NOVELTY_MARKET_PATTERN.test(`${candidate.title} ${candidate.outcomeName}`)
}

function isTradableCandidate(candidate: MarketCandidate, options: { allowNovelty?: boolean } = {}): boolean {
  if (candidate.closed || candidate.archived || candidate.active === false) return false
  if (isPastDate(candidate.closeTime)) return false
  if (hasOldResolvedYear(candidate)) return false
  if (!options.allowNovelty && isNoveltyCandidate(candidate)) return false
  if (!Number.isFinite(candidate.yesPrice) || candidate.yesPrice <= 0 || candidate.yesPrice >= 1) return false

  return true
}

function textMatchesCandidate(candidate: MarketCandidate, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 12)

  if (terms.length === 0) return true

  const haystack = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  return terms.some((term) => haystack.includes(term))
}

function textMatchesFocus(candidate: MarketCandidate, focusArea?: string): boolean {
  const focus = String(focusArea || '').toLowerCase() as MarketFocusArea
  const keywords = FOCUS_MARKET_KEYWORDS[focus]
  if (!keywords) return true

  const haystack = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword))
}

function rankCandidate(candidate: MarketCandidate): number {
  const volume = candidate.volume24h || candidate.volume || 0
  const liquidity = candidate.liquidity || 0
  const openInterest = candidate.openInterest || 0
  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  const priceBalance = 1 - Math.abs(candidate.yesPrice - 0.5)
  const lotteryPenalty = candidate.yesPrice < 0.03 ? -6 : candidate.yesPrice < 0.05 ? -3 : 0
  const trivialNoPenalty = candidate.side === 'NO' && candidate.yesPrice > 0.9 ? -8 : 0
  const tradablePriceBoost = candidate.yesPrice >= 0.05 && candidate.yesPrice <= 0.85 ? 4 : 0
  const noveltyPenalty = NOVELTY_MARKET_PATTERN.test(text) ? -20 : 0
  const lowQualityPenalty = LOW_QUALITY_MARKET_PATTERN.test(text) ? -18 : 0
  const staleElectionPenalty = /\b(?:harris|biden|2024 election|predict to win the election)\b/.test(text) ? -5 : 0

  return (Math.log10(volume + 1) * 3) +
    (Math.log10(liquidity + 1) * 2) +
    (Math.log10(openInterest + 1) * 1.5) +
    priceBalance +
    lotteryPenalty +
    trivialNoPenalty +
    tradablePriceBoost +
    noveltyPenalty +
    lowQualityPenalty +
    staleElectionPenalty
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash >>> 0)
}

function explorationBoost(candidate: MarketCandidate, focusArea?: string): number {
  const bucket = Math.floor(Date.now() / (1000 * 60 * 5))
  const hash = stableHash(`${bucket}:${focusArea || 'all'}:${candidate.platform}:${candidate.title}:${candidate.outcomeName}`)

  return (hash % 1500) / 100
}

function dedupeCandidates(candidates: MarketCandidate[]): MarketCandidate[] {
  const seen = new Set<string>()
  const unique: MarketCandidate[] = []

  for (const candidate of candidates) {
    const key = `${candidate.platform}:${candidate.title}:${candidate.outcomeName}:${candidate.side}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(candidate)
  }

  return unique
}

function normalizeMarketFamily(candidate: MarketCandidate): string {
  const rawTitle = candidate.title.toLowerCase()
  const recurringOutright = [
    { pattern: /\bwill .+ win the 20\d{2} fifa world cup\b/, family: 'fifa world cup winner' },
    { pattern: /\bwill .+ win the 20\d{2} nba finals\b/, family: 'nba finals winner' },
    { pattern: /\bwill .+ win the 20\d{2} stanley cup\b/, family: 'stanley cup winner' },
    { pattern: /\bwill .+ win the 20\d{2} world series\b/, family: 'world series winner' },
    { pattern: /\bwill .+ win the super bowl\b/, family: 'super bowl winner' },
    { pattern: /\bwill .+ win the premier league\b/, family: 'premier league winner' },
    { pattern: /\bwill .+ win the champions league\b/, family: 'champions league winner' },
    { pattern: /\bwill .+ win the election\b/, family: 'election winner' },
    { pattern: /\bwill .+ be elected\b/, family: 'election winner' },
  ].find(({ pattern }) => pattern.test(rawTitle))

  if (recurringOutright) {
    const year = rawTitle.match(/\b20\d{2}\b/)?.[0] || ''
    return `${candidate.platform}:${year}:${recurringOutright.family}`
  }

  const text = `${candidate.platform}:${candidate.title}`
    .toLowerCase()
    .replace(/\b(?:republican|republicans|gop|democratic|democrat|democrats|yes|no)\b/g, 'party')
    .replace(/\b(?:control|win|wins|winning|take|takes|hold|holds)\b/g, 'control')
    .replace(/\b(?:the|a|an|after|following|in|on|by|will|party)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text || `${candidate.platform}:${candidate.title}`.toLowerCase()
}

function selectRepresentativeMarkets(candidates: MarketCandidate[], limit: number, focusArea?: string): MarketCandidate[] {
  const byFamily = new Map<string, MarketCandidate[]>()

  for (const candidate of candidates) {
    const family = normalizeMarketFamily(candidate)
    const existing = byFamily.get(family) || []
    existing.push(candidate)
    byFamily.set(family, existing)
  }

  return Array.from(byFamily.values())
    .map((familyCandidates) => familyCandidates
      .sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))[0])
    .sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))
    .slice(0, limit)
}

function isBroadScannerQuery(query: string): boolean {
  return BROAD_SCAN_PATTERN.test(query)
}

function isGenericOpportunityScan(query: string): boolean {
  return GENERIC_OPPORTUNITY_SCAN_PATTERN.test(query)
}

function rotateQueries(queries: string[]): string[] {
  const offset = Math.floor(Date.now() / 60_000) % queries.length
  return [
    ...queries.slice(offset),
    ...queries.slice(0, offset),
  ]
}

function getFocusQueries(focusArea?: string): string[] {
  const focus = String(focusArea || '').toLowerCase() as MarketFocusArea
  return FOCUS_DISCOVERY_QUERIES[focus] || BROAD_DISCOVERY_QUERIES
}

export function isMarketFocusArea(value: unknown): value is MarketFocusArea {
  return MARKET_FOCUS_AREAS.includes(String(value || '').toLowerCase() as MarketFocusArea)
}

function diversifyCandidates(candidates: MarketCandidate[], limit: number, strictCategoryDiversity = false, focusArea?: string): MarketCandidate[] {
  const byTitle = new Map<string, MarketCandidate[]>()

  for (const candidate of candidates) {
    const titleKey = `${candidate.platform}:${candidate.title}`.toLowerCase()
    const existing = byTitle.get(titleKey) || []
    existing.push(candidate)
    byTitle.set(titleKey, existing)
  }

  const representative = Array.from(byTitle.values())
    .map((group) => {
      const preferred = group
        .filter((candidate) => candidate.side === 'YES' && candidate.yesPrice >= 0.03 && candidate.yesPrice <= 0.9)
        .sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))[0]

      return preferred || group.sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))[0]
    })
    .sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))

  const maxPerCategory = strictCategoryDiversity ? 1 : Math.max(2, Math.ceil(limit / 5))
  const categoryCounts = new Map<string, number>()
  const diversified: MarketCandidate[] = []

  for (const candidate of representative) {
    const category = inferMarketCategory(candidate)
    const count = categoryCounts.get(category) || 0
    if (count >= maxPerCategory) continue

    diversified.push(candidate)
    categoryCounts.set(category, count + 1)
    if (diversified.length >= limit) break
  }

  if (diversified.length < limit) {
    const selectedKeys = new Set(diversified.map((candidate) => `${candidate.platform}:${candidate.title}:${candidate.outcomeName}:${candidate.side}`.toLowerCase()))
    for (const candidate of representative) {
      const key = `${candidate.platform}:${candidate.title}:${candidate.outcomeName}:${candidate.side}`.toLowerCase()
      if (selectedKeys.has(key)) continue
      diversified.push(candidate)
      selectedKeys.add(key)
      if (diversified.length >= limit) break
    }
  }

  const hasKalshi = diversified.some((candidate) => candidate.platform === 'Kalshi')
  const bestKalshi = representative.find((candidate) => candidate.platform === 'Kalshi')
  if (!hasKalshi && bestKalshi && diversified.length > 0) {
    const replacementIndex = diversified
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.platform !== 'Kalshi')
      .sort((a, b) => marketSelectionScore(a.candidate, focusArea) - marketSelectionScore(b.candidate, focusArea))[0]?.index

    if (replacementIndex !== undefined) {
      diversified[replacementIndex] = bestKalshi
    }
  }

  return diversified
}

function inferMarketCategory(candidate: MarketCandidate): string {
  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  if (/\b(?:bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|crypto|stablecoin|usdc|usdt|defi|nft|token|coinbase|binance)\b/.test(text)) return 'crypto'
  if (/\b(?:etf|sec|cftc|regulation)\b/.test(text) && /\b(?:bitcoin|btc|ethereum|eth|crypto|stablecoin)\b/.test(text)) return 'crypto'
  if (/\b(?:fed|federal reserve|fomc|rates?|rate cut|rate hike|inflation|cpi|pce|jobs|payrolls|unemployment|gdp|recession|treasury|yield|oil|gas|gold|dollar|tariff|shutdown|debt ceiling)\b/.test(text)) return 'macro'
  if (/\b(?:election|midterm|primary|nomination|candidate|president|congress|senate|house|trump|biden|democrat|democratic|republican|gop|approval|poll|polling|governor|mayor|supreme court|scotus|legislation|immigration|cabinet)\b/.test(text)) return 'politics'
  if (/\b(?:premier league|champions league|world cup|nba|nfl|mlb|nhl|wnba|ncaa|fifa|uefa|football|soccer|basketball|baseball|hockey|tennis|golf|ufc|mma|f1|formula 1|nascar|la liga|serie a|bundesliga|ligue 1|championship|playoff|relegation|qualify|standings)\b/.test(text)) return 'sports'
  if (/\b(?:grammy|oscar|oscars|emmy|emmys|tony|academy award|album|billboard|hot 100|movie|film|box office|opening weekend|music|artist|song|tour|streaming|netflix|disney|spotify|youtube|culture|celebrity|tv|television|video game|gaming|esports)\b/.test(text)) return 'entertainment'
  if (/\b(?:openai|nvidia|tesla|spacex|starship|ai|gpt|llm|iphone|apple|google|alphabet|microsoft|meta|amazon|chips?|semiconductor|earnings|revenue|market cap|robotaxi|antitrust|product launch)\b/.test(text)) return 'technology'
  return 'other'
}

export function getMarketCandidateCategory(candidate: MarketCandidate): string {
  return inferMarketCategory(candidate)
}

function focusRelevanceScore(candidate: MarketCandidate, focusArea?: string): number {
  const focus = String(focusArea || '').toLowerCase()
  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()

  if (focus === 'macro') {
    return [
      /\b(?:fed|federal reserve|fomc|rate decision|rate cut|rate hike|basis point)\b/.test(text) ? 5 : 0,
      /\b(?:cpi|pce|inflation|jobs|payrolls|unemployment|gdp|recession|treasury|yield|oil|gas|gold|dollar)\b/.test(text) ? 4 : 0,
      /\b(?:next|june|july|september|meeting|release|print|calendar|2026|tariff|shutdown)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  if (focus === 'crypto') {
    return [
      /\b(?:bitcoin|btc|ethereum|eth|solana)\b/.test(text) ? 5 : 0,
      /\b(?:sol|xrp|doge|etf|sec|cftc|stablecoin|usdc|usdt|defi|token|coin|exchange|coinbase|binance)\b/.test(text) ? 3 : 0,
      /\b(?:price|high|above|below|approval|filing|launch|reserve)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  if (focus === 'sports') {
    return [
      /\b(?:premier league|champions league|world cup|nba|nfl|mlb|nhl|wnba|ncaa|fifa|uefa|ufc|f1|formula 1)\b/.test(text) ? 4 : 0,
      /\b(?:finish|qualify|winner|title|championship|playoff|relegation|standings|table|injury|fixture|draw)\b/.test(text) ? 3 : 0,
      /\b(?:2026|final|season|match|game|week|round|points)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  if (focus === 'politics') {
    return [
      /\b(?:election|midterm|president|congress|senate|house|governor|mayor|nomination|primary)\b/.test(text) ? 5 : 0,
      /\b(?:poll|polling|approval|court|supreme court|scotus|bill|legislation|policy|tariff|immigration|shutdown)\b/.test(text) ? 3 : 0,
      /\b(?:2026|vote|ruling|deadline|candidate|party control|democrat|republican|gop)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  if (focus === 'entertainment') {
    return [
      /\b(?:grammy|oscar|oscars|emmy|emmys|tony|billboard|hot 100|box office|album|movie|film|song|culture|celebrity|video game|gaming|esports)\b/.test(text) ? 5 : 0,
      /\b(?:win|nomination|chart|streaming|opening weekend|award|artist|tour|spotify|netflix|disney|tv|television)\b/.test(text) ? 3 : 0,
      /\b(?:2026|release|weekend|ceremony|season|episode|gross|match|game)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  if (focus === 'technology') {
    return [
      /\b(?:openai|nvidia|tesla|spacex|starship|apple|google|alphabet|microsoft|meta|amazon|ai)\b/.test(text) ? 5 : 0,
      /\b(?:earnings|revenue|launch|filing|chip|semiconductor|regulation|product|robotaxi|antitrust|lawsuit|model)\b/.test(text) ? 3 : 0,
      /\b(?:2026|quarter|deadline|approval|delivery|release|market cap)\b/.test(text) ? 2 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }

  return 0
}

function marketQualityScore(candidate: MarketCandidate, focusArea?: string): number {
  const volume = Number(candidate.volume || 0)
  const volume24h = Number(candidate.volume24h || 0)
  const liquidity = Number(candidate.liquidity || 0)
  const openInterest = Number(candidate.openInterest || 0)
  const tradability = Math.max(volume, volume24h * 5, liquidity * 10, openInterest)
  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  const price = candidate.yesPrice
  const priceQuality = price >= 0.08 && price <= 0.75
    ? 10
    : price >= 0.04 && price <= 0.9
      ? 5
      : -8
  const tradabilityScore = tradability >= 1_000_000
    ? 12
    : tradability >= 100_000
      ? 8
      : tradability >= 10_000
        ? 4
        : -6
  const freshnessScore = candidate.updatedAt ? 3 : 0
  const closePenalty = isPastDate(candidate.closeTime) ? -20 : 0
  const lowQualityPenalty = LOW_QUALITY_MARKET_PATTERN.test(text) ? -20 : 0

  return rankCandidate(candidate) +
    focusRelevanceScore(candidate, focusArea) +
    priceQuality +
    tradabilityScore +
    freshnessScore +
    closePenalty +
    lowQualityPenalty
}

function marketSelectionScore(candidate: MarketCandidate, focusArea?: string): number {
  return marketQualityScore(candidate, focusArea) + explorationBoost(candidate, focusArea)
}

function isQualityCandidate(candidate: MarketCandidate, focusArea?: string): boolean {
  const focus = String(focusArea || '').toLowerCase()
  const tradability = Math.max(
    Number(candidate.volume || 0),
    Number(candidate.volume24h || 0) * 5,
    Number(candidate.liquidity || 0) * 10,
    Number(candidate.openInterest || 0)
  )
  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()
  const closeHours = hoursUntilClose(candidate.closeTime)

  if (LOW_QUALITY_MARKET_PATTERN.test(text)) return false
  if (focus && focusRelevanceScore(candidate, focus) < 4) return false
  if (candidate.yesPrice < 0.03 || candidate.yesPrice > 0.9) return false
  if (tradability < 1_000 && !candidate.updatedAt) return false
  if (closeHours !== null && closeHours < 6) return false

  return true
}

function matchesFocusArea(candidate: MarketCandidate, focusArea?: string): boolean {
  const focus = String(focusArea || '').toLowerCase()
  if (!focus || !FOCUS_DISCOVERY_QUERIES[focus as MarketFocusArea]) return true

  const category = inferMarketCategory(candidate)
  if (category === focus) return true

  const text = `${candidate.title} ${candidate.outcomeName}`.toLowerCase()

  if (focus === 'crypto') {
    const hasCryptoAsset = /\b(?:bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|crypto|stablecoin|usdc|usdt|defi|nft|token|coinbase|binance)\b/.test(text)
    const hasCryptoRegulatoryContext = /\b(?:etf|sec|cftc|regulation|filing|approval)\b/.test(text) &&
      /\b(?:bitcoin|btc|ethereum|eth|crypto|stablecoin)\b/.test(text)

    return (hasCryptoAsset || hasCryptoRegulatoryContext) &&
      !/\b(?:world cup|champions league|premier league|nba|nfl|mlb|fifa|uefa|election|president|congress)\b/.test(text)
  }

  if (focus === 'macro') {
    return /\b(?:fed|federal reserve|fomc|rates?|rate cut|rate hike|inflation|cpi|pce|jobs|payrolls|unemployment|gdp|recession|treasury|yield|oil|gas|gold|dollar|tariff|shutdown|debt ceiling)\b/.test(text) &&
      !/\b(?:world cup|champions league|premier league|nba|nfl|mlb|fifa|uefa|bitcoin|ethereum|crypto)\b/.test(text)
  }

  if (focus === 'sports') {
    return /\b(?:premier league|champions league|world cup|nba|nfl|mlb|nhl|wnba|ncaa|fifa|uefa|football|soccer|basketball|baseball|hockey|tennis|golf|ufc|mma|f1|formula 1|nascar|la liga|serie a|bundesliga|ligue 1|olympics|playoff|relegation|qualify|standings)\b/.test(text)
  }

  if (focus === 'politics') {
    return /\b(?:election|midterm|primary|nomination|candidate|president|congress|senate|house|trump|biden|democrat|democratic|republican|gop|approval|poll|polling|governor|mayor|supreme court|scotus|policy|immigration|legislation|cabinet)\b/.test(text) &&
      !/\b(?:world cup|champions league|premier league|nba|nfl|mlb|fifa|uefa)\b/.test(text)
  }

  if (focus === 'entertainment') {
    return /\b(?:grammy|oscar|oscars|emmy|emmys|tony|academy award|album|billboard|hot 100|movie|film|box office|opening weekend|music|artist|song|tour|streaming|netflix|disney|hulu|spotify|youtube|culture|celebrity|tv|television|video game|gaming|esports)\b/.test(text)
  }

  if (focus === 'technology') {
    return /\b(?:openai|nvidia|tesla|spacex|starship|ai|gpt|llm|iphone|apple|google|alphabet|microsoft|meta|amazon|chips?|semiconductor|earnings|revenue|market cap|robotaxi|antitrust|lawsuit|model|product launch)\b/.test(text)
  }

  return true
}

function parsePolymarketCandidates(markets: unknown[]): MarketCandidate[] {
  return markets.flatMap((market) => {
    const record = asRecord(market)
    const outcomes = parseJsonArray(record.outcomes).map(String)
    const prices = parseJsonArray(record.outcomePrices)
    const title = String(record.question || record.title || '').trim()
    const slug = String(record.slug || '').trim()
    const events = Array.isArray(record.events) ? record.events.map(asRecord) : []
    const eventSlug = String(
      record.eventSlug ||
      record.event_slug ||
      asRecord(record.event).slug ||
      asRecord(record.__event).slug ||
      record.__eventSlug ||
      events.find((event) => event.slug)?.slug ||
      ''
    ).trim()
    const volume = parseNumber(record.volume)
    const volume24h = parseNumber(record.volume24hr || record.volume24h)
    const liquidity = parseNumber(record.liquidity)
    const openInterest = parseNumber(record.openInterest)
      const closeTime = typeof record.endDate === 'string' ? record.endDate : undefined
      const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : undefined
      const active = parseBoolean(record.active)
      const closed = parseBoolean(record.closed)
      const archived = parseBoolean(record.archived)

      if (!title || outcomes.length === 0 || prices.length === 0) return []

    return outcomes.map((outcome, index) => {
      const probability = normalizeProbability(prices[index])
      if (probability === undefined) return null

      return {
        platform: 'Polymarket' as const,
        title,
        outcomeName: outcome,
        side: outcome.toLowerCase() === 'no' ? 'NO' as const : 'YES' as const,
        yesPrice: probability,
        noPrice: Number((1 - probability).toFixed(4)),
        volume,
        volume24h,
        liquidity,
        openInterest,
        closeTime,
        updatedAt,
        active,
        closed,
        archived,
        sourceId: String(record.id || record.conditionId || slug),
        url: eventSlug
          ? `https://polymarket.com/event/${eventSlug}${slug ? `?marketSlug=${encodeURIComponent(slug)}` : ''}`
          : slug
            ? `https://polymarket.com/market/${slug}`
            : undefined,
      }
    }).filter(Boolean) as MarketCandidate[]
  })
}

function collectPolymarketMarkets(data: unknown): unknown[] {
  const record = asRecord(data)
  const directMarkets = Array.isArray(data) ? data : []
  const nestedMarkets = [
    record.markets,
    record.results,
    record.data,
  ].flatMap((value) => Array.isArray(value) ? value : [])
  const eventMarkets = [record.events, record.items]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .flatMap((event) => {
      const eventRecord = asRecord(event)
      return Array.isArray(eventRecord.markets)
        ? eventRecord.markets.map((market) => ({
          ...asRecord(market),
          __eventSlug: eventRecord.slug,
          __event: eventRecord,
        }))
        : []
    })

  return [...directMarkets, ...nestedMarkets, ...eventMarkets]
}

function parseKalshiCandidates(markets: unknown[]): MarketCandidate[] {
  return markets.flatMap((market) => {
    const record = asRecord(market)
    const eventTitle = String(record.__eventTitle || '').trim()
    const title = String(record.title || record.subtitle || eventTitle || record.yes_sub_title || '').trim()
    const yesPrice = normalizePositiveProbability(
      record.last_price_dollars,
      record.yes_ask_dollars,
      record.yes_bid_dollars,
      record.last_price,
      record.yes_ask,
      record.yes_bid
    )
    const noPrice = normalizePositiveProbability(
      record.no_ask_dollars,
      record.no_bid_dollars,
      record.no_ask,
      record.no_bid
    )

    if (!title || yesPrice === undefined) return []

    const ticker = String(record.ticker || '')
    const yesOutcome = String(record.yes_sub_title || 'Yes')
    const noOutcome = String(record.no_sub_title || 'No')
    const base = {
      platform: 'Kalshi' as const,
      title,
      volume: parseNumber(record.volume_fp),
      volume24h: parseNumber(record.volume_24h_fp),
      liquidity: parseNumber(record.liquidity_dollars),
      openInterest: parseNumber(record.open_interest_fp),
      closeTime: typeof record.close_time === 'string' ? record.close_time : undefined,
      updatedAt: typeof record.updated_time === 'string' ? record.updated_time : undefined,
      active: ['open', 'active'].includes(String(record.status || '').toLowerCase()) ? true : undefined,
      closed: ['closed', 'settled'].includes(String(record.status || '').toLowerCase()) ? true : undefined,
      sourceId: ticker,
      url: buildKalshiMarketUrl(record),
    }

    return [
      {
        ...base,
        outcomeName: yesOutcome,
        side: 'YES' as const,
        yesPrice,
        noPrice,
      },
      {
        ...base,
        outcomeName: noOutcome,
        side: 'NO' as const,
        yesPrice: noPrice || Number((1 - yesPrice).toFixed(4)),
        noPrice: yesPrice,
      },
    ]
  })
}

function collectKalshiEventMarkets(data: unknown): unknown[] {
  const record = asRecord(data)
  const events = Array.isArray(record.events) ? record.events : []

  return events.flatMap((event) => {
    const eventRecord = asRecord(event)
    const markets = Array.isArray(eventRecord.markets) ? eventRecord.markets : []

    return markets.map((market) => ({
      ...asRecord(market),
      __eventTitle: eventRecord.title,
      __eventTicker: eventRecord.event_ticker || eventRecord.ticker,
      __seriesTicker: eventRecord.series_ticker,
      __eventSlug: eventRecord.slug,
      __event: eventRecord,
    }))
  })
}

async function fetchJson(url: string, options: { cache?: RequestCache } = {}): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      cache: options.cache,
      next: options.cache === 'no-store' ? undefined : { revalidate: 60 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ConduitMarketScanner/0.1',
      },
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

async function fetchPolymarketCandidates(query: string, limit: number): Promise<MarketCandidate[]> {
  const allowNovelty = isNoveltyCandidate({
    platform: 'Polymarket',
    title: query,
    outcomeName: '',
    side: 'YES',
    yesPrice: 0.5,
  })
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(Math.max(20, limit * 5)),
    order: 'volume_24hr',
    ascending: 'false',
    q: query,
  })
  const searchParams = new URLSearchParams({
    q: query,
    limit: String(Math.max(20, limit * 5)),
  })
  const [marketsData, searchData] = await Promise.all([
    fetchJson(`https://gamma-api.polymarket.com/markets?${params.toString()}`),
    fetchJson(`https://gamma-api.polymarket.com/public-search?${searchParams.toString()}`),
  ])
  const markets = [
    ...collectPolymarketMarkets(marketsData),
    ...collectPolymarketMarkets(searchData),
  ]
  const candidates = parsePolymarketCandidates(markets)
    .filter((candidate) => isTradableCandidate(candidate, { allowNovelty }))
  const matched = candidates.filter((candidate) => textMatchesCandidate(candidate, query))

  return (matched.length > 0 ? matched : candidates)
    .sort((a, b) => rankCandidate(b) - rankCandidate(a))
    .slice(0, limit)
}

async function fetchPolymarketUniverse(limit: number): Promise<MarketCandidate[]> {
  const pageLimit = Math.max(300, limit * 40)
  const paramsByVolume = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(pageLimit),
    order: 'volume_24hr',
    ascending: 'false',
  })
  const paramsByUpdated = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(pageLimit),
    order: 'updatedAt',
    ascending: 'false',
  })
  const [volumeData, updatedData] = await Promise.all([
    fetchJson(`https://gamma-api.polymarket.com/markets?${paramsByVolume.toString()}`, { cache: 'no-store' }),
    fetchJson(`https://gamma-api.polymarket.com/markets?${paramsByUpdated.toString()}`, { cache: 'no-store' }),
  ])
  const eventParamsByVolume = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(pageLimit),
    order: 'volume24hr',
    ascending: 'false',
  })
  const eventParamsByUpdated = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(pageLimit),
    order: 'updatedAt',
    ascending: 'false',
  })
  const [eventVolumeData, eventUpdatedData] = await Promise.all([
    fetchJson(`https://gamma-api.polymarket.com/events?${eventParamsByVolume.toString()}`, { cache: 'no-store' }),
    fetchJson(`https://gamma-api.polymarket.com/events?${eventParamsByUpdated.toString()}`, { cache: 'no-store' }),
  ])

  return parsePolymarketCandidates([
    ...collectPolymarketMarkets(volumeData),
    ...collectPolymarketMarkets(updatedData),
    ...collectPolymarketMarkets(eventVolumeData),
    ...collectPolymarketMarkets(eventUpdatedData),
  ]).filter((candidate) => isTradableCandidate(candidate))
}

async function fetchKalshiCandidates(query: string, limit: number): Promise<MarketCandidate[]> {
  const allowNovelty = isNoveltyCandidate({
    platform: 'Kalshi',
    title: query,
    outcomeName: '',
    side: 'YES',
    yesPrice: 0.5,
  })
  const params = new URLSearchParams({
    status: 'open',
    limit: String(Math.max(20, limit * 5)),
  })
  const eventParams = new URLSearchParams({
    status: 'open',
    limit: '200',
    with_nested_markets: 'true',
  })
  const [data, eventData] = await Promise.all([
    fetchJson(`https://external-api.kalshi.com/trade-api/v2/markets?${params.toString()}`),
    fetchJson(`https://external-api.kalshi.com/trade-api/v2/events?${eventParams.toString()}`, { cache: 'no-store' }),
  ])
  const markets = Array.isArray(asRecord(data).markets) ? asRecord(data).markets as unknown[] : []
  const eventMarkets = collectKalshiEventMarkets(eventData)
  const candidates = parseKalshiCandidates([...markets, ...eventMarkets])
    .filter((candidate) => isTradableCandidate(candidate, { allowNovelty }))
  const matched = candidates.filter((candidate) => textMatchesCandidate(candidate, query))

  return (matched.length > 0 ? matched : candidates)
    .sort((a, b) => rankCandidate(b) - rankCandidate(a))
    .slice(0, limit)
}

async function fetchKalshiUniverse(limit: number): Promise<MarketCandidate[]> {
  const pageLimit = Math.max(300, limit * 40)
  const paramsByVolume = new URLSearchParams({
    status: 'open',
    limit: String(pageLimit),
  })
  const eventParams = new URLSearchParams({
    status: 'open',
    limit: String(Math.min(200, Math.max(100, limit * 10))),
    with_nested_markets: 'true',
  })
  const [data, eventData] = await Promise.all([
    fetchJson(`https://external-api.kalshi.com/trade-api/v2/markets?${paramsByVolume.toString()}`, { cache: 'no-store' }),
    fetchJson(`https://external-api.kalshi.com/trade-api/v2/events?${eventParams.toString()}`, { cache: 'no-store' }),
  ])
  const markets = Array.isArray(asRecord(data).markets) ? asRecord(data).markets as unknown[] : []
  const eventMarkets = collectKalshiEventMarkets(eventData)

  return parseKalshiCandidates([...markets, ...eventMarkets]).filter((candidate) => isTradableCandidate(candidate))
}

export async function fetchMarketCandidates(query: string, limit = 12, focusArea?: string): Promise<MarketCandidate[]> {
  const perPlatformLimit = Math.max(12, limit * 2)
  const isBroadScan = isBroadScannerQuery(query)
  const isGenericScan = isGenericOpportunityScan(query)
  const focusQueries = getFocusQueries(focusArea)
  const focusedQuery = focusArea
    ? `${focusArea} ${query}`
    : query
  const [polymarket, kalshi] = isGenericScan
    ? [[], []]
    : await Promise.all([
      fetchPolymarketCandidates(focusedQuery, perPlatformLimit),
      fetchKalshiCandidates(focusedQuery, perPlatformLimit),
    ])
  let candidates = dedupeCandidates([...polymarket, ...kalshi])

  if (candidates.length < limit || isBroadScan) {
    const broadQueries = isBroadScan
      ? rotateQueries(focusQueries).slice(0, isGenericScan ? focusQueries.length : 3)
      : focusQueries
    const broadResults = await Promise.all(
      broadQueries.map(async (broadQuery) => {
        const [broadPolymarket, broadKalshi] = await Promise.all([
          fetchPolymarketCandidates(broadQuery, perPlatformLimit),
          fetchKalshiCandidates(broadQuery, perPlatformLimit),
        ])
        return [...broadPolymarket, ...broadKalshi]
      })
    )
    candidates = dedupeCandidates([...candidates, ...broadResults.flat()])
  }

  if (focusArea) {
    const focusQueryResults = await Promise.all(
      rotateQueries(getFocusQueries(focusArea)).map(async (focusQuery) => {
        const [focusPolymarket, focusKalshi] = await Promise.all([
          fetchPolymarketCandidates(focusQuery, perPlatformLimit),
          fetchKalshiCandidates(focusQuery, perPlatformLimit),
        ])
        return [...focusPolymarket, ...focusKalshi]
      })
    )
    const [polymarketUniverse, kalshiUniverse] = await Promise.all([
      fetchPolymarketUniverse(limit),
      fetchKalshiUniverse(limit),
    ])

    candidates = dedupeCandidates([
      ...candidates,
      ...focusQueryResults.flat(),
      ...polymarketUniverse.filter((candidate) => textMatchesFocus(candidate, focusArea)),
      ...kalshiUniverse.filter((candidate) => textMatchesFocus(candidate, focusArea)),
    ])
  }

  const allowNovelty = isNoveltyCandidate({
    platform: 'Polymarket',
    title: query,
    outcomeName: '',
    side: 'YES',
    yesPrice: 0.5,
  })

  const focusedCandidates = candidates
    .filter((candidate) => isTradableCandidate(candidate, { allowNovelty }))
    .filter((candidate) => matchesFocusArea(candidate, focusArea))
    .filter((candidate) => isQualityCandidate(candidate, focusArea))
    .sort((a, b) => marketSelectionScore(b, focusArea) - marketSelectionScore(a, focusArea))
  const representativeCandidates = selectRepresentativeMarkets(focusedCandidates, Math.max(limit * 2, limit), focusArea)

  return diversifyCandidates(
    representativeCandidates,
    limit,
    isBroadScan,
    focusArea
  )
}

export async function fetchLiveMarketFeed(
  focusArea: MarketFocusArea,
  limit = 50
): Promise<MarketCandidate[]> {
  const safeLimit = Math.max(5, Math.min(100, limit))
  const focusQueries = getFocusQueries(focusArea)
  const query = `scan live prediction markets ${focusArea} ${focusQueries.join(' ')}`

  return fetchMarketCandidates(query, safeLimit, focusArea)
}

export function formatMarketCandidatesForPrompt(candidates: MarketCandidate[]): string {
  if (candidates.length === 0) {
    return 'No structured market candidates were returned by Polymarket or Kalshi public market APIs.'
  }

  return candidates.map((candidate, index) => [
    `Candidate ${index + 1}`,
    `Platform: ${candidate.platform}`,
    `Market: ${candidate.title}`,
    `Outcome: ${candidate.outcomeName}`,
    `Side: ${candidate.side}`,
    `Market probability: ${candidate.yesPrice}`,
    candidate.volume !== undefined ? `Volume: ${candidate.volume}` : null,
    candidate.volume24h !== undefined ? `Volume 24h: ${candidate.volume24h}` : null,
    candidate.liquidity !== undefined ? `Liquidity: ${candidate.liquidity}` : null,
    candidate.openInterest !== undefined ? `Open interest: ${candidate.openInterest}` : null,
    candidate.closeTime ? `Close time: ${candidate.closeTime}` : null,
    candidate.updatedAt ? `Updated: ${candidate.updatedAt}` : null,
    candidate.url ? `URL: ${candidate.url}` : null,
  ].filter(Boolean).join('\n')).join('\n\n')
}
