/**
 * Voice Adapter
 * -------------
 * Primary STT is the browser's Web Speech API, running client-side — the
 * backend never sees raw audio in that path, only the transcript text.
 * This module handles the SERVER-SIDE pieces:
 *   1. TTS generation (ElevenLabs primary -> browser SpeechSynthesis fallback
 *      signal so the client knows to use its own voice instead)
 *   2. Whisper STT fallback for when the browser can't do live STT (e.g.
 *      unsupported browser) — client uploads an audio blob, we transcribe it.
 *
 * Both directions are designed so a live session never silently breaks:
 * if ElevenLabs fails, we return { fallback: true } and the client falls
 * back to window.speechSynthesis; if Whisper fails, we surface a clear
 * error so the client can prompt the user to retype/retry.
 *
 * Whisper provider detection (fix for gsk_ Groq key):
 *   - If WHISPER_API_KEY starts with "gsk_" it is a Groq key.
 *     Groq hosts a Whisper-compatible endpoint at api.groq.com.
 *   - Any other key is treated as an OpenAI key (api.openai.com).
 * This allows operators to use whichever provider they have credentials for.
 */

const fetch = require('node-fetch');

// ── TTS model preference list (most capable → simplest, free-tier safe) ──────
// eleven_turbo_v2_5  — fastest, lowest latency, free tier supported
// eleven_turbo_v2    — slightly higher quality, free tier supported
// eleven_monolingual_v1 is intentionally excluded: deprecated on free tier.
const TTS_MODEL_PRIORITY = ['eleven_turbo_v2_5', 'eleven_turbo_v2'];

async function textToSpeech(text) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) {
    // No key configured -> tell client to use browser TTS fallback.
    return { fallback: true, reason: 'ELEVENLABS_NOT_CONFIGURED', text };
  }

  for (const modelId of TTS_MODEL_PRIORITY) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: { stability: 0.4, similarity_boost: 0.7 },
        }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
        return { fallback: false, audioBase64, mime: 'audio/mpeg', model: modelId };
      }

      const errBody = await res.text();
      console.warn(`[voiceAdapter] TTS model ${modelId} failed (${res.status}): ${errBody.slice(0, 120)}`);

      // payment_required on this model -> try the next one
      if (res.status !== 401) continue;
      // Hard auth failure -> no point trying other models
      break;
    } catch (err) {
      console.warn(`[voiceAdapter] TTS ${modelId} threw: ${err.message}`);
    }
  }

  // All models exhausted or hard failure -> signal client to use browser TTS
  console.warn('[voiceAdapter] All ElevenLabs models failed, signalling client fallback.');
  return { fallback: true, reason: 'ELEVENLABS_ERROR', text };
}

/**
 * Detect which Whisper endpoint to use based on the key format.
 *  - Groq API keys start with "gsk_" and must use api.groq.com
 *  - OpenAI keys use api.openai.com
 * Both implement the same OpenAI-compatible /v1/audio/transcriptions interface.
 */
function resolveWhisperConfig(key) {
  if (key.startsWith('gsk_')) {
    return {
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3-turbo',  // best Groq Whisper model
    };
  }
  return {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  };
}

async function speechToTextFallback(audioBuffer, mimeType = 'audio/webm') {
  const key = process.env.WHISPER_API_KEY;
  if (!key) throw new Error('WHISPER_API_KEY not configured for STT fallback');

  const { url, model } = resolveWhisperConfig(key);

  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'audio.webm', contentType: mimeType });
  form.append('model', model);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, ...form.getHeaders() },
    body: form,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Whisper fallback error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.text || '';
}

module.exports = { textToSpeech, speechToTextFallback };
