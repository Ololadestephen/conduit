import { generateText as aiGenerateText } from 'ai'
import { groq } from '@ai-sdk/groq'

type SupportedAIProvider = 'b-ai' | 'openrouter' | 'groq' | 'ollama'

interface GenerateAITextOptions {
  model?: unknown
  system?: string
  prompt: string
  maxOutputTokens?: number
}

interface GenerateAITextResult {
  text: string
}

interface ProviderAttempt {
  provider: SupportedAIProvider
  model: string
}

export function getAIModel() {
  return getProviderAttempts()[0]?.model || 'gpt-5-mini'
}

export async function generateAIText(options: GenerateAITextOptions): Promise<GenerateAITextResult> {
  const attempts = getProviderAttempts()
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      if (attempt.provider === 'b-ai') {
        return await generateWithBAI(attempt.model, options)
      }

      if (attempt.provider === 'openrouter') {
        return await generateWithOpenRouter(attempt.model, options)
      }

      if (attempt.provider === 'ollama') {
        return await generateWithOllama(attempt.model, options)
      }

      const result = await aiGenerateText({
        ...options,
        model: groq(attempt.model),
      })
      return { ...result, text: normalizeProviderText(result.text) }
    } catch (error) {
      lastError = error
      if (!isRetryableProviderError(error)) throw error
      console.warn(`AI provider ${attempt.provider} failed; trying next provider.`, getProviderErrorMessage(error))
    }
  }

  throw lastError || new Error('No AI provider is configured')
}

function getProviderAttempts(): ProviderAttempt[] {
  const configuredOrder = (process.env.AI_PROVIDER_ORDER || '')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as SupportedAIProvider[]
  const preferredProvider = String(process.env.AI_PROVIDER || '').toLowerCase() as SupportedAIProvider
  const defaultOrder: SupportedAIProvider[] = ['b-ai', 'openrouter', 'groq', 'ollama']
  const order = uniqProviders([
    'b-ai',
    ...configuredOrder,
    ...defaultOrder,
    preferredProvider,
  ])

  return order
    .map((provider) => {
      const model = getProviderModel(provider)
      return model && hasProviderCredentials(provider) ? { provider, model } : null
    })
    .filter(Boolean) as ProviderAttempt[]
}

function getProviderModel(provider: SupportedAIProvider) {
  if (provider === 'b-ai') return process.env.B_AI_MODEL || process.env.AI_MODEL || 'gpt-5-mini'
  if (provider === 'openrouter') return process.env.OPENROUTER_MODEL || 'qwen/qwen3-14b:free'
  if (provider === 'groq') return process.env.GROQ_MODEL || process.env.AI_MODEL || 'llama-3.3-70b-versatile'
  if (provider === 'ollama') return process.env.OLLAMA_MODEL || process.env.AI_MODEL || 'llama3.1'
  return undefined
}

function hasProviderCredentials(provider: SupportedAIProvider) {
  if (provider === 'b-ai') return Boolean(process.env.B_AI_API_KEY?.trim())
  if (provider === 'openrouter') return Boolean(process.env.OPENROUTER_API_KEY?.trim())
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY?.trim())
  if (provider === 'ollama') return Boolean(process.env.OLLAMA_BASE_URL?.trim() || process.env.AI_PROVIDER === 'ollama')
  return false
}

function uniqProviders(providers: SupportedAIProvider[]) {
  return Array.from(new Set(providers.filter((provider) => ['b-ai', 'openrouter', 'groq', 'ollama'].includes(provider))))
}

async function generateWithBAI(model: string, options: GenerateAITextOptions): Promise<GenerateAITextResult> {
  const apiKey = process.env.B_AI_API_KEY?.trim()
  if (!apiKey) throw new Error('B_AI_API_KEY is not configured')
  const fallbackModel = process.env.B_AI_FALLBACK_MODEL?.trim() || 'deepseek-v3.2'
  const models = Array.from(new Set([model, fallbackModel].filter(Boolean)))
  let lastError: unknown

  for (const candidateModel of models) {
    try {
      return await requestBAIModel(candidateModel, options, apiKey)
    } catch (error) {
      lastError = error
      const message = getProviderErrorMessage(error)
      const status = getProviderStatus(error)
      const canTryFallback = /empty response/i.test(message) ||
        (status === 400 && /model|not found|invalid|unsupported/i.test(message))
      if (!canTryFallback) throw error
      console.warn(`B.AI model ${candidateModel} failed (${message}); trying fallback model.`)
    }
  }

  throw lastError || new Error('B.AI returned an empty response')
}

async function requestBAIModel(model: string, options: GenerateAITextOptions, apiKey: string): Promise<GenerateAITextResult> {
  const baseUrl = (process.env.B_AI_BASE_URL || 'https://api.b.ai').replace(/\/$/, '')
  const allowSameModelEmptyRetry = isEnvFlagEnabled(process.env.B_AI_RETRY_EMPTY_RESPONSE)
  const attempts = [
    {
      label: 'standard',
      messages: buildBAIMessages(options, false),
      temperature: 0.2,
    },
    ...(allowSameModelEmptyRetry ? [{
      label: 'json-retry',
      messages: buildBAIMessages(options, true),
      temperature: 0,
    }] : []),
  ]

  let lastError: unknown

  for (const attempt of attempts) {
    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: attempt.messages,
          max_tokens: options.maxOutputTokens,
          temperature: attempt.temperature,
        }),
      })

      if (!response.ok) {
        throw await makeProviderError('b-ai', response)
      }

      const data = await response.json()
      const text = extractChatCompletionText(data)
      if (!text) {
        console.warn(`B.AI model ${model} returned no readable text. Payload shape: ${summarizePayloadShape(data)}`)
        throw new Error('B.AI returned an empty response')
      }

      return { text: normalizeProviderText(text) }
    } catch (error) {
      lastError = error
      const message = getProviderErrorMessage(error)
      const canRetrySameModel =
        allowSameModelEmptyRetry &&
        attempt.label === 'standard' &&
        /empty response/i.test(message)
      if (!canRetrySameModel) throw error
      console.warn(`B.AI model ${model} returned empty content; retrying with a stricter JSON-only reprompt.`)
    }
  }

  throw lastError || new Error('B.AI returned an empty response')
}

function buildBAIMessages(options: GenerateAITextOptions, forceJsonRetry: boolean) {
  const retrySystem = forceJsonRetry
    ? `${options.system ? `${options.system}\n\n` : ''}Return exactly one complete response. Do not leave content empty. If the task asks for structured data, respond with valid JSON only. No markdown fences. No explanation before or after the answer.`
    : options.system
  const retryPrompt = forceJsonRetry
    ? `${options.prompt}\n\nImportant: return the full answer now. If structured output is expected, return valid JSON only with no markdown fences and no surrounding commentary.`
    : options.prompt

  return [
    ...(retrySystem ? [{ role: 'system', content: retrySystem }] : []),
    { role: 'user', content: retryPrompt },
  ]
}

function extractChatCompletionText(data: unknown): string {
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  const outputText = typeof record.output_text === 'string' ? record.output_text : ''
  if (outputText.trim()) return outputText.trim()

  const directMessage = collectTextFragments(record.message)
  if (directMessage) return directMessage

  const directOutput = collectTextFragments(record.output)
  if (directOutput) return directOutput

  const choices = Array.isArray(record.choices) ? record.choices : []
  const choice = choices[0] && typeof choices[0] === 'object' ? choices[0] as Record<string, unknown> : {}
  const message = choice.message && typeof choice.message === 'object' ? choice.message as Record<string, unknown> : {}
  const messageText = collectTextFragments(message.content) ||
    collectTextFragments(message.output_text) ||
    collectTextFragments(message.text) ||
    collectTextFragments(message.reasoning_content) ||
    collectTextFragments(message.reasoning)
  if (messageText) return messageText

  const text = typeof choice.text === 'string' ? choice.text : ''
  if (text.trim()) return text.trim()

  return collectTextFragments(choice.delta) ||
    collectTextFragments(choice.output) ||
    collectAnyText(record) ||
    ''
}

async function generateWithOpenRouter(model: string, options: GenerateAITextOptions): Promise<GenerateAITextResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Conduit',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: options.prompt },
      ],
      max_tokens: options.maxOutputTokens,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    throw await makeProviderError('openrouter', response)
  }

  const data = await response.json()
  const text = String(data.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('OpenRouter returned an empty response')

  return { text: normalizeProviderText(text) }
}

async function generateWithOllama(model: string, options: GenerateAITextOptions): Promise<GenerateAITextResult> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: [options.system, options.prompt].filter(Boolean).join('\n\n'),
      stream: false,
      options: {
        num_predict: options.maxOutputTokens,
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    throw await makeProviderError('ollama', response)
  }

  const data = await response.json()
  return { text: normalizeProviderText(String(data.response || '').trim()) }
}

function normalizeProviderText(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json|javascript|js|ts|typescript)?\s*([\s\S]*?)\s*```$/i)

  return (fenced?.[1] || trimmed).trim()
}

async function makeProviderError(provider: SupportedAIProvider, response: Response) {
  const responseBody = await response.text()
  const error = new Error(`${provider} request failed: ${response.status} ${responseBody}`)
  Object.assign(error, {
    provider,
    statusCode: response.status,
    responseBody,
    responseHeaders: Object.fromEntries(response.headers.entries()),
  })
  return error
}

function isRetryableProviderError(error: unknown) {
  const status = getProviderStatus(error)
  const message = getProviderErrorMessage(error)

  return status === 429 ||
    status === 503 ||
    status === 529 ||
    /rate limit|quota|tokens per day|too many requests|limit reached|overloaded|temporarily unavailable|ollama/i.test(message)
}

function getProviderStatus(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  return typeof record.statusCode === 'number' ? record.statusCode : undefined
}

function getProviderErrorMessage(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  return typeof record.message === 'string' ? record.message : String(error)
}

function isEnvFlagEnabled(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim())
}

function collectTextFragments(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value) return ''

  if (Array.isArray(value)) {
    return value
      .map((item) => collectTextFragments(item))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    const preferred = [
      record.output_text,
      record.content,
      record.text,
      record.value,
      record.reasoning_content,
      record.reasoning,
      record.refusal,
    ]
      .map((item) => collectTextFragments(item))
      .filter(Boolean)
      .join('\n')
      .trim()

    if (preferred) return preferred
  }

  return ''
}

function collectAnyText(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (depth > 6) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return ''
  if (!value) return ''

  if (Array.isArray(value)) {
    return value
      .map((item) => collectAnyText(item, depth + 1, seen))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) return ''
    seen.add(obj)

    const preferred = collectTextFragments(obj)
    if (preferred) return preferred

    const ignoredKeys = new Set([
      'id',
      'object',
      'model',
      'created',
      'role',
      'type',
      'index',
      'finish_reason',
      'logprobs',
      'usage',
    ])

    return Object.entries(obj)
      .filter(([key]) => !ignoredKeys.has(key))
      .map(([, child]) => collectAnyText(child, depth + 1, seen))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  return ''
}

function summarizePayloadShape(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (depth > 3) return '...'
  if (Array.isArray(value)) {
    const first = value[0]
    return `array(${value.length})<${summarizePayloadShape(first, depth + 1, seen)}>`
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) return '[circular]'
    seen.add(obj)
    const entries = Object.keys(obj)
      .slice(0, 12)
      .map((key) => `${key}:${summarizePayloadShape(obj[key], depth + 1, seen)}`)
    return `{${entries.join(', ')}}`
  }
  return typeof value
}
