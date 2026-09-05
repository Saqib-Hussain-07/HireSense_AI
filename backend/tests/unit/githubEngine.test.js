jest.mock('../../src/services/aiAdapter');

const { callAI } = require('../../src/services/aiAdapter');
const { analyzeGithubRepo } = require('../../src/services/githubEngine');

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('analyzeGithubRepo', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    global.fetch.mockReset();
    callAI.mockReset();
  });

  test('rejects a URL that is not a parseable GitHub repo URL', async () => {
    await expect(analyzeGithubRepo('https://example.com/not-github')).rejects.toThrow('Could not parse');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches repo metadata, languages, and README, then generates project-specific questions', async () => {
    fetch
      .mockResolvedValueOnce(
        jsonResponse({ full_name: 'octocat/hello-world', description: 'A test repo', stargazers_count: 42, html_url: 'https://github.com/octocat/hello-world' })
      )
      .mockResolvedValueOnce(jsonResponse({ JavaScript: 1000, HTML: 200 }))
      .mockResolvedValueOnce(jsonResponse({ content: Buffer.from('# Hello World\nA demo project.').toString('base64'), encoding: 'base64' }));

    callAI.mockResolvedValue({
      data: {
        summary: 'Technical summary.',
        categories: { Architecture: ['Why did you structure the routes this way?'] },
      },
    });

    const result = await analyzeGithubRepo('https://github.com/octocat/hello-world');

    expect(result.repo.repoName).toBe('octocat/hello-world');
    expect(result.repo.languages).toEqual([
      { name: 'JavaScript', percentage: 83 },
      { name: 'HTML', percentage: 17 },
    ]);
    expect(result.repo.readmeExcerpt).toContain('Hello World');
    expect(result.categories.Architecture).toEqual(['Why did you structure the routes this way?']);
  });

  test('throws a clear error for a private/nonexistent repo (404)', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(analyzeGithubRepo('https://github.com/octocat/does-not-exist')).rejects.toThrow('not found');
  });

  test('throws a clear rate-limit error on 403', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(analyzeGithubRepo('https://github.com/octocat/hello-world')).rejects.toThrow('rate limit');
  });

  test('still returns questions even when the README fetch fails (non-fatal)', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ full_name: 'octocat/hello-world', description: 'desc', stargazers_count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ Python: 500 }))
      .mockResolvedValueOnce({ ok: false, status: 404 }); // readme missing

    callAI.mockResolvedValue({
      data: {
        summary: 'Python repo.',
        categories: { Architecture: ['Tell me about your architecture.'] },
      },
    });

    const result = await analyzeGithubRepo('https://github.com/octocat/hello-world');
    expect(result.repo.readmeExcerpt).toBe('');
    expect(result.categories.Architecture).toHaveLength(1);
  });
});
