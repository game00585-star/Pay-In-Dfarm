import { PaddleOCRClient } from './PaddleOCRClient.js';

export class PaddleOCRHealthService {
  constructor({ configuration, client = new PaddleOCRClient(configuration) } = {}) {
    this.configuration = configuration;
    this.client = client;
  }

  async healthCheck() {
    const startedAt = performance.now();
    try {
      const endpoint = this.configuration?.paddleOCR?.paddleOcrEndpoint || 'http://localhost:8000/ocr';
      const healthEndpoint = endpoint.replace(/\/ocr$/, '/health');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(healthEndpoint, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`PaddleOCR health HTTP ${response.status}`);
      const data = await response.json();
      return {
        status: data.status || 'READY',
        endpoint,
        responseTime: Math.round(performance.now() - startedAt),
        version: data.version || this.configuration?.paddleOCR?.version || 'unknown',
        language: data.language || this.configuration?.paddleOCR?.language || 'thai+eng'
      };
    } catch (error) {
      return {
        status: 'UNAVAILABLE',
        endpoint: this.configuration?.paddleOCR?.paddleOcrEndpoint || 'http://localhost:8000/ocr',
        responseTime: Math.round(performance.now() - startedAt),
        version: this.configuration?.paddleOCR?.version || 'unknown',
        language: this.configuration?.paddleOCR?.language || 'thai+eng',
        error: error.message
      };
    }
  }
}
