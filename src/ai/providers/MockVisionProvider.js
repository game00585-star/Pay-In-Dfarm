import { BaseVisionProvider } from './BaseVisionProvider.js';

export class MockVisionProvider extends BaseVisionProvider {
  constructor(options = {}) {
    super({ ...options, providerName: 'MOCK' });
  }

  async analyzeDocument(document) {
    return {
      provider: this.name,
      documentType: document?.documentType || 'UNKNOWN',
      confidence: 90,
      fields: {},
      warnings: [],
      rawResult: { mode: 'mock-vision' }
    };
  }

  async healthCheck() {
    return {
      provider: this.name,
      status: 'READY',
      version: 'mock-1.0.0',
      modelName: 'mock-vision',
      responseTimeMs: 1,
      message: 'Mock vision provider is available'
    };
  }
}
