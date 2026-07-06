import { BaseVisionProvider } from './BaseVisionProvider.js';
import { OllamaVisionService } from '../ollama/OllamaVisionService.js';

export class OllamaVisionProvider extends BaseVisionProvider {
  constructor(options = {}) {
    super({ ...options, providerName: 'OLLAMA' });
    this.service = new OllamaVisionService({ configuration: this.configuration });
  }

  async analyzeDocument(document) {
    const result = await this.service.analyzeDocument({
      image: document?.imageUrl || document?.previewUrl || document?.url || '',
      documentType: document?.documentType || 'UNKNOWN'
    });
    return {
      provider: this.name,
      documentType: result.documentType,
      confidence: result.confidence,
      fields: result.parsedResult?.fields || {},
      warnings: result.parsedResult?.warnings || [],
      rawResult: result.rawResponse,
      success: result.success,
      processingTime: result.processingTime
    };
  }

  async healthCheck() {
    const result = await this.service.healthCheck();
    return {
      provider: this.name,
      status: result.status,
      version: result.version,
      modelName: result.model,
      responseTimeMs: result.responseTime,
      message: result.error || 'Local Ollama health check completed'
    };
  }
}
