/**
 * HireSense AI — API Connectivity Diagnostic
 * Run: node test-apis.js
 * Loads .env automatically via dotenv.
 */

require('dotenv').config();
const fetch = require('node-fetch');

const PASS = '\x1b[32m✓ PASS\x1b[0m';
const FAIL = '\x1b[31m✗ FAIL\x1b[0m';
const WARN = '\x1b[33m⚠ WARN\x1b[0m';
const INFO = '\x1b[36mℹ INFO\x1b[0m';

function banner(title) {
  console.log(`\n\x1b[1m── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}\x1b[0m`);
}

// ── 1. Gemini ────────────────────────────────────────────────────────────────
async function testGemini() {
  banner('Gemini (primary LLM)');
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log(`${FAIL}  GEMINI_API_KEY not set`); return false; }

  const isValid = key.startsWith('AIza') || key.includes('fake') || key.includes('mock');
  if (!isValid) {
    console.log(`${FAIL}  Key format invalid — value starts with "${key.slice(0, 8)}…"`);
    console.log(`${INFO}  Gemini keys must start with "AIza". Get one at https://aistudio.google.com`);
    return false;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.log(`${FAIL}  HTTP ${res.status} — ${body.slice(0, 200)}`);
      return false;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    console.log(`${PASS}  Response: "${text.trim().slice(0, 80)}"`);
    return true;
  } catch (e) {
    console.log(`${FAIL}  ${e.message}`);
    return false;
  }
}

// ── 2. Groq (fallback LLM) ───────────────────────────────────────────────────
async function testGroq() {
  banner('Groq (fallback LLM)');
  const key = process.env.GROQ_API_KEY;
  if (!key) { console.log(`${FAIL}  GROQ_API_KEY not set`); return false; }
  if (!key.startsWith('gsk_')) {
    console.log(`${WARN}  Key doesn't start with "gsk_" — may be invalid`);
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Reply with exactly: OK' },
        ],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.log(`${FAIL}  HTTP ${res.status} — ${body.slice(0, 200)}`);
      return false;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    console.log(`${PASS}  Response: "${text.trim().slice(0, 80)}"`);
    return true;
  } catch (e) {
    console.log(`${FAIL}  ${e.message}`);
    return false;
  }
}

// ── 3. ElevenLabs TTS ────────────────────────────────────────────────────────
async function testElevenLabs() {
  banner('ElevenLabs (Text-to-Speech)');
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key) { console.log(`${FAIL}  ELEVENLABS_API_KEY not set`); return false; }
  if (!voiceId) { console.log(`${FAIL}  ELEVENLABS_VOICE_ID not set`); return false; }

  try {
    const userRes = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key },
    });
    if (!userRes.ok) {
      const body = await userRes.text();
      console.log(`${FAIL}  Auth failed (HTTP ${userRes.status}) — ${body.slice(0, 150)}`);
      return false;
    }
    const userData = await userRes.json();
    const charLeft = userData.subscription?.character_limit - userData.subscription?.character_count;
    console.log(`${PASS}  Authenticated — Tier: ${userData.subscription?.tier ?? 'unknown'}, Characters remaining: ${charLeft ?? 'unknown'}`);
  } catch (e) {
    console.log(`${FAIL}  ${e.message}`);
    return false;
  }

  try {
    const voiceRes = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: { 'xi-api-key': key },
    });
    if (!voiceRes.ok) {
      console.log(`${WARN}  Voice ID "${voiceId}" not found (HTTP ${voiceRes.status})`);
      return false;
    }
    const v = await voiceRes.json();
    console.log(`${PASS}  Voice: "${v.name}" (${voiceId})`);
    return true;
  } catch (e) {
    console.log(`${WARN}  Voice check threw: ${e.message}`);
    return false;
  }
}

// ── 4. Groq Whisper STT ──────────────────────────────────────────────────────
async function testWhisper() {
  banner('Groq Whisper (STT fallback)');
  const key = process.env.WHISPER_API_KEY;
  if (!key) { console.log(`${FAIL}  WHISPER_API_KEY not set`); return false; }

  const isGroq = key.startsWith('gsk_');
  if (isGroq) {
    console.log(`${INFO}  Groq key — endpoint: api.groq.com/openai/v1/audio/transcriptions`);
    console.log(`${INFO}  Model: whisper-large-v3-turbo`);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.log(`${FAIL}  Key rejected (HTTP ${res.status}) — ${body.slice(0, 150)}`);
        return false;
      }
      const data = await res.json();
      const whisperModels = (data.data || []).filter((m) => m.id.toLowerCase().includes('whisper'));
      console.log(`${PASS}  Key valid. Whisper models: ${whisperModels.map((m) => m.id).join(', ') || 'none listed'}`);
      return true;
    } catch (e) {
      console.log(`${FAIL}  ${e.message}`);
      return false;
    }
  } else {
    console.log(`${WARN}  Non-Groq key detected — assuming OpenAI Whisper (live test skipped)`);
    return null;
  }
}

// ── 5. Cloudinary ────────────────────────────────────────────────────────────
async function testCloudinary() {
  banner('Cloudinary (File Storage)');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !apiSecret) {
    console.log(`${FAIL}  Cloudinary env vars missing`);
    return false;
  }

  const creds = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, {
      headers: { Authorization: `Basic ${creds}` },
    });
    if (!res.ok) {
      const body = await res.text();
      console.log(`${FAIL}  HTTP ${res.status} — ${body.slice(0, 150)}`);
      return false;
    }
    const data = await res.json();
    console.log(`${PASS}  Cloud: ${cloud} | Plan: ${data.plan ?? 'unknown'} | Storage: ${((data.storage?.usage || 0) / 1e6).toFixed(1)} MB`);
    return true;
  } catch (e) {
    console.log(`${FAIL}  ${e.message}`);
    return false;
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\x1b[1m\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[35m║   HireSense AI — API Connectivity Diagnostic ║\x1b[0m');
  console.log('\x1b[1m\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m');

  const results = await Promise.allSettled([
    testGemini(),
    testGroq(),
    testElevenLabs(),
    testWhisper(),
    testCloudinary(),
  ]);

  const labels = ['Gemini LLM', 'Groq LLM', 'ElevenLabs TTS', 'Groq Whisper STT', 'Cloudinary'];
  banner('Summary');
  results.forEach((r, i) => {
    const val = r.status === 'fulfilled' ? r.value : false;
    const icon = val === true ? PASS : val === null ? WARN : FAIL;
    const note = val === null ? '(skipped)' : '';
    console.log(`  ${icon}  ${labels[i]} ${note}`);
  });
  console.log('');
}

main().catch(console.error);
