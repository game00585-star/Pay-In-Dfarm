import { PaddleOCRClient } from './PaddleOCRClient.js';
import { PaddleOCRHealthService } from './PaddleOCRHealthService.js';
import { PaddleOCRPromptNormalizer } from './PaddleOCRPromptNormalizer.js';
import { PaddleOCRResponseParser } from './PaddleOCRResponseParser.js';

function mockOCRResult(startedAt, reason = 'PADDLEOCR_FALLBACK_MOCK_OCR') {
  return {
    success: false,
    rawText: '',
    textBlocks: [],
    confidence: 0,
    processingTime: Math.round(performance.now() - startedAt),
    warnings: [reason]
  };
}

export class PaddleOCRService {
  constructor({
    configuration,
    client = new PaddleOCRClient(configuration),
    parser = new PaddleOCRResponseParser(),
    normalizer = new PaddleOCRPromptNormalizer(),
    healthService = new PaddleOCRHealthService({ configuration, client })
  } = {}) {
    this.configuration = configuration;
    this.client = client;
    this.parser = parser;
    this.normalizer = normalizer;
    this.healthService = healthService;
  }

  async healthCheck() {
    return this.healthService.healthCheck();
  }

  async extractText(image) {
    const startedAt = performance.now();
    const health = await this.healthCheck();
    if (health.status !== 'READY') {
      return mockOCRResult(startedAt, health.status || 'PADDLEOCR_UNAVAILABLE');
    }

    try {
      const normalized = this.normalizer.normalizeInput(image);
      const rawResponse = await this.client.requestOCR({
        ...normalized,
        language: this.configuration?.paddleOCR?.language || 'thai+eng',
        enableAngleClassification: this.configuration?.paddleOCR?.enableAngleClassification ?? true
      });
      const parsed = this.parser.parse(rawResponse);
      return {
        ...parsed,
        processingTime: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return mockOCRResult(startedAt, error.message);
    }
  }
}

export const paddleOCRService = new PaddleOCRService();
