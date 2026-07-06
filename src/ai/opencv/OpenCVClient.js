import { DEFAULT_AI_CONFIGURATION, normalizeAIConfiguration } from '../providers/AIConfiguration.js';

function normalizeEndpoint(baseUrl = 'http://localhost:8001') {
  return String(baseUrl || 'http://localhost:8001').replace(/\/$/, '');
}

export class OpenCVClient {
  constructor(configuration = DEFAULT_AI_CONFIGURATION) {
    this.configuration = normalizeAIConfiguration(configuration);
    this.baseUrl = normalizeEndpoint(this.configuration.openCV.openCvEndpoint);
    this.timeout = Number(this.configuration.openCV.timeout || 120000);
  }

  async request(path, body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: path === '/health' ? 'GET' : 'POST',
        signal: controller.signal,
        headers: path === '/health' ? undefined : { 'Content-Type': 'application/json' },
        body: path === '/health' ? undefined : JSON.stringify(body || {})
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`OpenCV HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  health() {
    return this.request('/health');
  }

  quality(payload) {
    return this.request('/quality', payload);
  }

  preprocess(payload) {
    return this.request('/preprocess', payload);
  }
}
