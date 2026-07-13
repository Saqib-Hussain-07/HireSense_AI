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

const PRIMARY_TIMEOUT_MS = 12000;

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
  return key && (key.startsWith('AIza') || key.startsWith('AQ.') || key.includes('fake') || key.includes('mock'));
}

async function callGemini({ system, prompt }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  if (!isGeminiKeyValid(key)) throw new Error('GEMINI_API_KEY format invalid — get a key from aistudio.google.com');
  const model = 'gemini-2.0-flash-lite';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }],
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error('[aiAdapter] Gemini error details:', errText);
    throw new Error(`Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

async function callGroqFallback({ system, prompt }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * callAI - the single entry point every route/service should use.
 * @param {Object} opts
 * @param {string} opts.system - system-style instructions (role, constraints)
 * @param {string} opts.prompt - the specific narrow task + data
 * @param {boolean} [opts.jsonOnly] - if true, attempts to JSON.parse the result
 * @returns {Promise<string|object>}
 */
async function callAI({ system = '', prompt, jsonOnly = false }) {
  let rawText;
  let usedProvider = 'primary';
  try {
    rawText = await withTimeout(callGemini({ system, prompt }), PRIMARY_TIMEOUT_MS);
  } catch (primaryErr) {
    console.warn('[aiAdapter] primary provider failed, falling back:', primaryErr.message);
    usedProvider = 'fallback';
    try {
      rawText = await withTimeout(callGroqFallback({ system, prompt }), PRIMARY_TIMEOUT_MS);
    } catch (fallbackErr) {
      console.error('[aiAdapter] fallback provider also failed:', fallbackErr.message);
      throw new Error('AI_UNAVAILABLE: both primary and fallback reasoning providers failed');
    }
  }

  if (!jsonOnly) return { text: rawText, provider: usedProvider };

  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return { data: JSON.parse(cleaned), provider: usedProvider };
  } catch (e) {
    console.error('[aiAdapter] JSON parse failed, raw output:', cleaned.slice(0, 500));
    throw new Error('AI_MALFORMED_JSON');
  }
}

module.exports = { callAI };
