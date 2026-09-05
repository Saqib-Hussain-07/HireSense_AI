/**
 * AI Reasoning Adapter
 * ---------------------
 * Wraps all LLM reasoning calls behind ONE interface. Every call in this
 * product is narrow and single-purpose (parse resume | extract JD |
 * one follow-up question | score one answer) — see PROJECT_CONTEXT.md rule #1.
 *
 * Primary provider is tried first; on error or timeout it automatically
 * falls back to a fast secondary provider so a live voice session never
 * silently stalls (blueprint section 5/6, risk table row "Reasoning model
 * outage/timeout").
 *
 * Usage:
 *   const { callAI } = require('./aiAdapter');
 *   const json = await callAI({ system: '...', prompt: '...', jsonOnly: true });
 */

const fetch = require('node-fetch');

const PRIMARY_TIMEOUT_MS = 25000;

// Gemini model priority list:
// 1. Explicit override via GEMINI_MODEL env var
// 2. gemini-2.0-flash (Full flash model: high reasoning capability and rubric adherence)
// 3. gemini-1.5-flash (Universal, stable production baseline)
// 4. gemini-2.0-flash-lite (Fast lite model)
// 5. gemini-3.1-flash-lite-preview / gemini-3-flash-preview (Preview tier if available on key)
// 6. gemini-flash-lite-latest (Alias fallback)
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
].filter(Boolean);

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI_PROVIDER_TIMEOUT')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function isGeminiKeyValid(key) {
  // Google AI Studio keys can start with "AIza" (legacy) or "AQ." (newer format)
  if (!key) return false;
  if (key.startsWith('AIza') || key.startsWith('AQ.')) return true;
  // Test-only escape hatch: allow mock/fake keys in non-production environments
  if (process.env.NODE_ENV !== 'production' && (key.includes('fake') || key.includes('mock'))) return true;
  return false;
}

async function callGeminiModel(key, model, system, prompt, temperature) {
  const generationConfig = { maxOutputTokens: 4096 };
  if (typeof temperature === 'number') {
    generationConfig.temperature = temperature;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }],
        generationConfig,
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    let parsed;
    try { parsed = JSON.parse(errText); } catch { parsed = null; }
    const code = parsed?.error?.code || res.status;
    // 429 = quota exhausted for this model, try the next
    if (code === 429) throw new Error(`QUOTA_EXHAUSTED:${model}`);
    // 404 = model not available in this region/key tier
    if (code === 404) throw new Error(`MODEL_NOT_FOUND:${model}`);
    console.error('[aiAdapter] Gemini error details:', errText.slice(0, 300));
    throw new Error(`Gemini error ${code}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function callGemini({ system, prompt, temperature }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  if (!isGeminiKeyValid(key)) throw new Error('GEMINI_API_KEY format invalid — get a key from aistudio.google.com');

  // Try each model in priority order; skip quota-exhausted models
  for (const model of GEMINI_MODELS) {
    try {
      const text = await callGeminiModel(key, model, system, prompt, temperature);
      return text;
    } catch (err) {
      if (err.message.startsWith('QUOTA_EXHAUSTED') || err.message.startsWith('MODEL_NOT_FOUND')) {
        console.warn(`[aiAdapter] Gemini ${model} unavailable (${err.message}), trying next model...`);
        continue;
      }
      throw err; // Hard error — bubble up
    }
  }
  throw new Error('Gemini: all models exhausted quota or unavailable');
}

async function callGroqFallback({ system, prompt, temperature }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  // Groq model priority list:
  // 1. Explicit override via GROQ_MODEL env var
  // 2. llama-3.3-70b-versatile (Flagship 70B: deep reasoning, accurate rubric evaluation)
  // 3. llama-3.1-8b-instant (Fast 8B fallback if 70B hits per-minute quota)
  const GROQ_MODELS = [
    process.env.GROQ_MODEL,
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ].filter(Boolean);
  for (const model of GROQ_MODELS) {
    try {
      const payload = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        max_tokens: 4096,
      };
      if (typeof temperature === 'number') {
        payload.temperature = temperature;
      }
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        // Expired / invalid key — no point retrying other models
        if (res.status === 401 || errBody?.error?.code === 'expired_api_key') {
          throw new Error(`Groq API key invalid or expired (${res.status}). Update GROQ_API_KEY in .env`);
        }
        if (res.status === 429) { console.warn(`[aiAdapter] Groq ${model} rate-limited, trying next...`); continue; }
        throw new Error(`Groq error ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      if (err.message.includes('rate-limited') || err.message.includes('trying next')) continue;
      throw err;
    }
  }
  throw new Error('Groq: all models rate-limited');
}

/**
 * callAI - the single entry point every route/service should use.
 * @param {Object} opts
 * @param {string} opts.system - system-style instructions (role, constraints)
 * @param {string} opts.prompt - the specific narrow task + data
 * @param {boolean} [opts.jsonOnly] - if true, attempts to JSON.parse the result
 * @param {number} [opts.temperature] - sampling temperature (e.g. 0.2 for repeatable scoring)
 * @returns {Promise<string|object>}
 */
async function callAI({ system = '', prompt, jsonOnly = false, temperature = undefined }) {
  // Enforce deterministic 0.2 temperature on all JSON/scoring calls unless explicitly specified
  const effectiveTemp = typeof temperature === 'number' ? temperature : (jsonOnly ? 0.2 : 0.7);
  let rawText;
  let usedProvider = 'primary';
  try {
    rawText = await withTimeout(callGemini({ system, prompt, temperature: effectiveTemp }), PRIMARY_TIMEOUT_MS);
  } catch (primaryErr) {
    console.warn('[aiAdapter] primary provider failed, falling back:', primaryErr.message);
    usedProvider = 'fallback';
    try {
      rawText = await withTimeout(callGroqFallback({ system, prompt, temperature: effectiveTemp }), PRIMARY_TIMEOUT_MS);
    } catch (fallbackErr) {
      console.error('[aiAdapter] fallback provider also failed:', fallbackErr.message);
      throw new Error('AI_UNAVAILABLE: both primary and fallback reasoning providers failed');
    }
  }

  if (!jsonOnly) return { text: rawText, provider: usedProvider };

  // Primary: strip markdown code fences
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Secondary: if the cleaned text isn't valid JSON, try extracting the outermost { } block.
  // This handles models that wrap JSON in prose or add trailing explanations.
  function tryParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  let parsed = tryParse(cleaned);
  if (!parsed) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace  = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      parsed = tryParse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }

  if (parsed) return { data: parsed, provider: usedProvider };

  console.error('[aiAdapter] JSON parse failed, raw output:', cleaned.slice(0, 500));
  throw new Error('AI_MALFORMED_JSON');
}

module.exports = { callAI };
