import { OllamaClient } from './OllamaClient.js';
import { OllamaHealthService } from './OllamaHealthService.js';
import { OllamaPromptBuilder } from './OllamaPromptBuilder.js';
import { OllamaResponseParser } from './OllamaResponseParser.js';

function stripDataUrl(value = '') {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

function mockAIResult(documentType, startedAt, reason = 'OLLAMA_FALLBACK_MOCK_AI') {
  return {
    success: false,
    documentType,
    confidence: 0,
    rawResponse: { fallback: 'MOCK_AI', reason },
    parsedResult: {
      documentType,
      confidence: 0,
      fields: {},
      warnings: [reason]
    },
    processingTime: Math.round(performance.now() - startedAt)
  };
}

export class OllamaVisionService {
  constructor({
    configuration,
    client = new OllamaClient(configuration),
    promptBuilder = new OllamaPromptBuilder(),
    responseParser = new OllamaResponseParser(),
    healthService = new OllamaHealthService({ configuration, client })
  } = {}) {
    this.configuration = configuration;
    this.client = client;
    this.promptBuilder = promptBuilder;
    this.responseParser = responseParser;
    this.healthService = healthService;
  }

  async healthCheck() {
    return this.healthService.healthCheck();
  }

  async analyzeDocument({ image, documentType = 'UNKNOWN', model, prompt: promptOverride } = {}) {
    const startedAt = performance.now();
    const health = await this.healthCheck();
    if (health.status !== 'READY') {
      return mockAIResult(documentType, startedAt, health.status || 'OLLAMA_UNAVAILABLE');
    }

    try {
      const selectedModel = model || this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl';
      const prompt = promptOverride || this.promptBuilder.build({ documentType });
      const rawResponse = await this.client.generate({
        model: selectedModel,
        prompt,
        imageBase64: stripDataUrl(image)
      });
      const parsedResult = this.responseParser.parse(rawResponse, documentType);
      return {
        success: true,
        documentType: parsedResult.documentType || documentType,
        confidence: parsedResult.confidence || 0,
        rawResponse,
        parsedResult,
        processingTime: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return mockAIResult(documentType, startedAt, error.message);
    }
  }
}

export const ollamaVisionService = new OllamaVisionService();
