import { config } from '../config/index.js'

export interface LTMatch {
  message: string
  shortMessage: string
  offset: number
  length: number
  replacements: Array<{ value: string }>
  rule: { id: string; description: string; category: { id: string; name: string } }
}

export interface LTResult {
  matches: LTMatch[]
  hasErrors: boolean
  summary: string | null // human-readable summary for the feedback UI, null if clean
}

const LT_URL = config.LANGUAGETOOL_URL ?? 'http://languagetool:8010'

/**
 * Check text with LanguageTool.
 * language: 'de-DE' for German, 'en-US' for English.
 * Returns null if LanguageTool is unavailable (graceful fallback).
 */
export async function checkGrammar(
  text: string,
  language: 'de-DE' | 'en-US',
): Promise<LTResult | null> {
  try {
    const body = new URLSearchParams({ text, language })
    const res = await fetch(`${LT_URL}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(3000), // 3s — never block the user
    })

    if (!res.ok) return null

    const data = (await res.json()) as { matches: LTMatch[] }
    const matches = data.matches ?? []

    // Filter noise: ignore pure style/whitespace suggestions
    const significant = matches.filter(
      (m) => !['WHITESPACE_RULE', 'UPPERCASE_SENTENCE_START'].includes(m.rule.id),
    )

    const hasErrors = significant.length > 0
    let summary: string | null = null

    if (hasErrors) {
      const parts = significant.slice(0, 2).map((m) => {
        const fix = m.replacements[0]?.value
        return fix
          ? `"${text.slice(m.offset, m.offset + m.length)}" → "${fix}"`
          : m.shortMessage || m.message
      })
      summary = parts.join('; ')
    }

    return { matches: significant, hasErrors, summary }
  } catch {
    // LanguageTool unavailable — degrade gracefully
    return null
  }
}

/**
 * For translation exercises: check if user's translation is grammatically valid
 * even if it doesn't exactly match the expected answer.
 * Returns a feedback string or null if no issues / unavailable.
 */
export async function getTranslationFeedback(
  userAnswer: string,
  targetLanguage: 'de-DE' | 'en-US',
): Promise<string | null> {
  const result = await checkGrammar(userAnswer, targetLanguage)
  if (!result?.hasErrors) return null
  return result.summary
}
