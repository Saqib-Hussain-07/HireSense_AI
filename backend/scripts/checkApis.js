/**
 * HireSense AI — API & Service Diagnostic Tool
 * ---------------------------------------------
 * Verifies all external API credentials and MongoDB connectivity.
 * Run from the repo root: npm run check:apis
 * Or directly:            node backend/scripts/checkApis.js
 *
 * This is an OPERATIONAL script — it never runs in production.
 * It lives in backend/scripts/ (not src/) for that reason.
 */

const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

// Load .env from the backend directory regardless of where this script is run from
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('=== HireSense AI API Diagnostic Tool ===\n');

async function testGemini() {
  console.log('[Gemini] Testing Primary AI reasoning...');
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log('❌ GEMINI_API_KEY is not configured in .env\n'); return false; }
  const model = 'gemini-1.5-flash';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with the word "SUCCESS" only.' }] }],
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ Gemini failed with status ${res.status}: ${errText}\n`);
      return false;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    console.log(`✅ Gemini works. Response: "${text.trim()}"\n`);
    return true;
  } catch (err) {
    console.log(`❌ Gemini error: ${err.message}\n`);
    return false;
  }
}

async function testGroq() {
  console.log('[Groq] Testing Fallback AI reasoning...');
  const key = process.env.GROQ_API_KEY;
  if (!key) { console.log('❌ GROQ_API_KEY is not configured in .env\n'); return false; }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Respond with the word "SUCCESS" only.' }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ Groq failed with status ${res.status}: ${errText}\n`);
      return false;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    console.log(`✅ Groq works. Response: "${text.trim()}"\n`);
    return true;
  } catch (err) {
    console.log(`❌ Groq error: ${err.message}\n`);
    return false;
  }
}

async function testWhisper() {
  console.log('[Whisper] Testing Speech-to-Text Fallback API...');
  const key = process.env.WHISPER_API_KEY;
  if (!key) { console.log('❌ WHISPER_API_KEY is not configured in .env\n'); return false; }

  const isGroqKey = key.startsWith('gsk_');
  console.log(`  Key prefix: "${key.substring(0, 4)}" — ${isGroqKey ? '⚠️  Groq key detected' : 'OpenAI-style key'}`);

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      console.log('✅ OpenAI Whisper key is valid.\n');
      return true;
    }
    if (isGroqKey) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (groqRes.ok) {
        console.log('✅ Groq Whisper key is valid on Groq endpoints.');
        console.log('⚠️  ACTION NEEDED: voiceAdapter.js currently calls api.openai.com — update to api.groq.com for Groq keys.\n');
        return 'GROQ_KEY_ON_OPENAI_URL';
      }
    }
    console.log(`❌ Whisper key invalid on all endpoints.\n`);
    return false;
  } catch (err) {
    console.log(`❌ Whisper check error: ${err.message}\n`);
    return false;
  }
}

async function testElevenLabs() {
  console.log('[ElevenLabs] Testing Text-to-Speech API...');
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key) { console.log('❌ ELEVENLABS_API_KEY not configured\n'); return false; }
  if (!voiceId) { console.log('❌ ELEVENLABS_VOICE_ID not configured\n'); return false; }

  const modelsToTry = ['eleven_multilingual_v2', 'eleven_turbo_v2'];
  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
        body: JSON.stringify({
          text: 'HireSense API check',
          model_id: model,
          voice_settings: { stability: 0.4, similarity_boost: 0.7 },
        }),
      });
      if (res.ok) {
        console.log(`✅ ElevenLabs works — model: ${model}, voice: ${voiceId}\n`);
        return { model, voice: voiceId };
      }
      const err = await res.text();
      console.log(`  ❌ ${model}: ${err.substring(0, 120)}`);
    } catch (err) {
      console.log(`  ❌ ${model}: ${err.message}`);
    }
  }
  console.log('❌ ElevenLabs TTS failed for all models.\n');
  return false;
}

async function testGithub() {
  console.log('[GitHub] Testing GitHub REST API...');
  const headers = { 'User-Agent': 'HireSenseAI', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    console.log('  Using GITHUB_TOKEN (authenticated)');
  } else {
    console.log('  No GITHUB_TOKEN — testing unauthenticated (60 req/hr limit)');
  }
  try {
    const res = await fetch('https://api.github.com/repos/octocat/Hello-World', { headers });
    if (!res.ok) { console.log(`❌ GitHub API error ${res.status}\n`); return false; }
    const data = await res.json();
    console.log(`✅ GitHub API works. Test repo: "${data.full_name}"\n`);
    return true;
  } catch (err) {
    console.log(`❌ GitHub error: ${err.message}\n`);
    return false;
  }
}

async function testMongo() {
  console.log('[MongoDB] Testing database connection...');
  const uri = process.env.MONGO_URI;
  if (!uri) { console.log('❌ MONGO_URI not configured\n'); return false; }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB connected — ${uri}\n`);
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.log(`❌ MongoDB connection failed: ${err.message}\n`);
    return false;
  }
}

async function run() {
  const results = {
    gemini:     await testGemini(),
    groq:       await testGroq(),
    whisper:    await testWhisper(),
    elevenlabs: await testElevenLabs(),
    github:     await testGithub(),
    mongo:      await testMongo(),
  };

  const fmt = (v) => {
    if (v === 'GROQ_KEY_ON_OPENAI_URL') return '⚠️  MISCONFIGURED (Groq key, OpenAI URL in voiceAdapter)';
    if (v === 'VOICE_NOT_FOUND')        return '⚠️  KEY OK but voice_id not found';
    if (v && typeof v === 'object')     return `✅ WORKING (model: ${v.model})`;
    return v ? '✅ WORKING' : '❌ FAILED';
  };

  console.log('═══════════ Diagnostic Summary ═══════════');
  console.log(`Gemini:      ${fmt(results.gemini)}`);
  console.log(`Groq:        ${fmt(results.groq)}`);
  console.log(`Whisper STT: ${fmt(results.whisper)}`);
  console.log(`ElevenLabs:  ${fmt(results.elevenlabs)}`);
  console.log(`GitHub API:  ${fmt(results.github)}`);
  console.log(`MongoDB:     ${fmt(results.mongo)}`);
  console.log('═══════════════════════════════════════════');
}

run();
