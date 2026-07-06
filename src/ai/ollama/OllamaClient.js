import { DEFAULT_AI_CONFIGURATION, normalizeAIConfiguration } from '../providers/AIConfiguration.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OllamaClient {
  constructor(configuration = DEFAULT_AI_CONFIGURATION) {
    this.configuration = normalizeAIConfiguration(configuration);
    this.baseUrl = (this.configuration.ollama.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.timeout = Number(this.configuration.ollama.timeout || 120000);
    this.maxRetries = 3;
  }

  async request(path, options = {}) {
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        if (attempt < this.maxRetries) await sleep(250 * attempt);
      }
    }
    throw lastError;
  }

  version() {
    return this.request('/api/version', { method: 'GET' });
  }

  tags() {
    return this.request('/api/tags', { method: 'GET' });
  }

  generate({ model, prompt, imageBase64 }) {
    return this.request('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt,
        images: imageBase64 ? [imageBase64] : [],
        stream: false,
        format: 'json',
        options: {
          temperature: 0
        }
      })
    });
  }
}
