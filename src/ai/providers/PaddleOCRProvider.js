import { BaseOCRProvider } from './BaseOCRProvider.js';
import { PaddleOCRService } from '../paddleocr/PaddleOCRService.js';

export class PaddleOCRProvider extends BaseOCRProvider {
  constructor(options = {}) {
    super({ ...options, providerName: 'PADDLEOCR' });
    this.service = new PaddleOCRService({ configuration: this.configuration });
  }

  async extractText(image) {
    const result = await this.service.extractText(image);
    return {
      provider: this.name,
      text: result.rawText,
      rawText: result.rawText,
      confidence: result.confidence,
      blocks: result.textBlocks,
      textBlocks: result.textBlocks,
      warnings: result.warnings,
      success: result.success,
      processingTime: result.processingTime
    };
  }

  async extract(document, context = {}) {
    const result = await this.extractText(document);
    const documentType = context.classification?.documentType || document?.documentType || 'UNKNOWN';
    return {
      documentType,
      confidence: result.confidence || 0,
      rawText: result.rawText || result.text || '',
      textBlocks: result.textBlocks || result.blocks || [],
      fields: {
        documentDate: new Date().toISOString().slice(0, 10),
        referenceNo: `${documentType}-${Date.now().toString().slice(-8)}`,
        amount: 0
      },
      warnings: result.warnings || [],
      provider: this.name,
      processingTime: result.processingTime
    };
  }

  async healthCheck() {
    const result = await this.service.healthCheck();
    return {
      provider: this.name,
      status: result.status,
      version: result.version,
      modelName: 'paddleocr-local',
      responseTimeMs: result.responseTime,
      language: result.language,
      endpoint: result.endpoint,
      message: result.error || 'Local PaddleOCR health check completed'
    };
  }
}
