jest.mock('node-fetch');
const fetch = require('node-fetch');
const { callAI } = require('../../src/services/aiAdapter');

describe('aiAdapter.callAI', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      GEMINI_API_KEY: 'fake-gemini-key',
      GROQ_API_KEY: 'fake-groq-key',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function geminiResponse(text) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    };
  }

  function groqResponse(text) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: text } }] }),
    };
  }

  test('uses the primary provider (Gemini) when it succeeds', async () => {
    fetch.mockResolvedValueOnce(geminiResponse('hello from gemini'));

    const result = await callAI({ system: 's', prompt: 'p' });

    expect(result.provider).toBe('primary');
    expect(result.text).toBe('hello from gemini');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('falls back to the secondary provider (Groq) when the primary errors', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 }); // gemini fails
    fetch.mockResolvedValueOnce(groqResponse('hello from groq')); // groq succeeds

    const result = await callAI({ system: 's', prompt: 'p' });

    expect(result.provider).toBe('fallback');
    expect(result.text).toBe('hello from groq');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('throws AI_UNAVAILABLE when both primary and fallback fail — never fabricates a result', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(callAI({ system: 's', prompt: 'p' })).rejects.toThrow('AI_UNAVAILABLE');
  });

  test('jsonOnly=true parses fenced JSON output cleanly', async () => {
    fetch.mockResolvedValueOnce(geminiResponse('```json\n{"score": 42}\n```'));

    const result = await callAI({ system: 's', prompt: 'p', jsonOnly: true });

    expect(result.data).toEqual({ score: 42 });
    expect(result.provider).toBe('primary');
  });

  test('jsonOnly=true throws a clear error on malformed JSON instead of guessing', async () => {
    fetch.mockResolvedValueOnce(geminiResponse('this is not json at all'));

    await expect(callAI({ system: 's', prompt: 'p', jsonOnly: true })).rejects.toThrow('AI_MALFORMED_JSON');
  });
});
