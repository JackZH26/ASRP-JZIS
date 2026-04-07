// ============================================================
// API Key Validator — Tests keys against provider endpoints
// ============================================================

import * as https from 'https';

export interface KeyValidationResult {
  valid: boolean;
  provider: string;
  error?: string;
}

interface ProviderConfig {
  name: string;
  prefixes: string[];
  placeholder: string;
  testEndpoint: {
    hostname: string;
    path: string;
    method: string;
    headers: (key: string) => Record<string, string>;
    body?: string;
  };
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    prefixes: ['sk-'],
    placeholder: 'sk-proj-...',
    testEndpoint: {
      hostname: 'api.openai.com',
      path: '/v1/models',
      method: 'GET',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
    },
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    prefixes: ['sk-ant-'],
    placeholder: 'sk-ant-...',
    testEndpoint: {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: (key) => ({
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    },
  },
  google: {
    name: 'Google (Gemini)',
    prefixes: ['AIza'],
    placeholder: 'AIza...',
    testEndpoint: {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1/models',
      method: 'GET',
      headers: (key) => ({ 'x-goog-api-key': key }),
    },
  },
  xai: {
    name: 'xAI (Grok)',
    prefixes: ['xai-'],
    placeholder: 'xai-...',
    testEndpoint: {
      hostname: 'api.x.ai',
      path: '/v1/models',
      method: 'GET',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
    },
  },
  openrouter: {
    name: 'OpenRouter',
    prefixes: ['sk-or-'],
    placeholder: 'sk-or-v1-...',
    testEndpoint: {
      hostname: 'openrouter.ai',
      path: '/api/v1/models',
      method: 'GET',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
    },
  },
  minimax: {
    name: 'MiniMax',
    prefixes: ['eyJ'],
    placeholder: 'eyJ...',
    testEndpoint: {
      hostname: 'api.minimax.chat',
      path: '/v1/models',
      method: 'GET',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
    },
  },
};

export function validateKey(provider: string, key: string): Promise<KeyValidationResult> {
  const config = PROVIDERS[provider];
  if (!config) return Promise.resolve({ valid: false, provider, error: 'Unknown provider' });
  if (!key || key.trim().length < 8) return Promise.resolve({ valid: false, provider, error: 'Key is too short' });

  const ep = config.testEndpoint;
  const headers = ep.headers(key.trim());

  return new Promise((resolve) => {
    const req = https.request({
      hostname: ep.hostname, path: ep.path, method: ep.method, headers, timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        const status = res.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve({ valid: true, provider });
        } else if (status === 401 || status === 403) {
          resolve({ valid: false, provider, error: 'Invalid API key' });
        } else if (status === 429) {
          resolve({ valid: true, provider }); // rate limited = key is valid
        } else {
          try {
            const p = JSON.parse(data);
            resolve({ valid: false, provider, error: p.error?.message || `HTTP ${status}` });
          } catch { resolve({ valid: false, provider, error: `HTTP ${status}` }); }
        }
      });
    });
    req.on('error', (err) => resolve({ valid: false, provider, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ valid: false, provider, error: 'Timeout' }); });
    if (ep.body && ep.method === 'POST') req.write(ep.body);
    req.end();
  });
}

export function getProviderList(): Array<{ id: string; name: string; placeholder: string }> {
  return Object.entries(PROVIDERS).map(([id, c]) => ({ id, name: c.name, placeholder: c.placeholder }));
}
