/**
 * Voice Adapter — TTS (Text-to-Speech)
 * --------------------------------------
 * Primary STT is the browser's Web Speech API, running client-side — the
 * backend never sees raw audio, only the transcript text.
 *
 * This module handles server-side TTS via ElevenLabs. On failure it returns
 * { fallback: true } so the client can use window.speechSynthesis instead.
 *
 * Model priority list (most capable → simplest, free-tier safe):
 *   eleven_turbo_v2_5  — fastest, lowest latency
 *   eleven_turbo_v2    — slightly higher quality
 */

const fetch = require('node-fetch');

const TTS_MODEL_PRIORITY = ['eleven_turbo_v2_5', 'eleven_turbo_v2'];

async function textToSpeech(text) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) {
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

      if (res.status !== 401) continue;
      break;
    } catch (err) {
      console.warn(`[voiceAdapter] TTS ${modelId} threw: ${err.message}`);
    }
  }

  console.warn('[voiceAdapter] All ElevenLabs models failed, signalling client fallback.');
  return { fallback: true, reason: 'ELEVENLABS_ERROR', text };
}

module.exports = { textToSpeech };
