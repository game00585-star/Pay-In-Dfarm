import { OpenCVClient } from './OpenCVClient.js';

export class OpenCVHealthService {
  constructor({ configuration, client = new OpenCVClient(configuration) } = {}) {
    this.configuration = configuration;
    this.client = client;
  }

  async healthCheck() {
    const startedAt = performance.now();
    try {
      const data = await this.client.health();
      return {
        status: data.status || 'READY',
        endpoint: this.configuration?.openCV?.openCvEndpoint || 'http://localhost:8001',
        responseTime: Math.round(performance.now() - startedAt),
        version: data.version || this.configuration?.openCV?.version || 'unknown'
      };
    } catch (error) {
      return {
        status: 'UNAVAILABLE',
        endpoint: this.configuration?.openCV?.openCvEndpoint || 'http://localhost:8001',
        responseTime: Math.round(performance.now() - startedAt),
        version: this.configuration?.openCV?.version || 'unknown',
        error: error.message
      };
    }
  }
}
