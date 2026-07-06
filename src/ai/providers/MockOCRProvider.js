import { BaseOCRProvider } from './BaseOCRProvider.js';

export class MockOCRProvider extends BaseOCRProvider {
  constructor(options = {}) {
    super({ ...options, providerName: 'MOCK' });
  }

  async extractText(document) {
    return {
      provider: this.name,
      text: `MOCK_TEXT_${document?.documentType || 'UNKNOWN'}`,
      confidence: 90,
      blocks: [],
      warnings: []
    };
  }

  async healthCheck() {
    return {
      provider: this.name,
      status: 'READY',
      version: 'mock-1.0.0',
      modelName: 'mock-ocr',
      responseTimeMs: 1,
      message: 'Mock OCR provider is available'
    };
  }
}
