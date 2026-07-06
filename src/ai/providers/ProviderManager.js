import { AIProviderFactory } from './AIProviderFactory.js';
import { DEFAULT_AI_CONFIGURATION, normalizeAIConfiguration } from './AIConfiguration.js';
import { AIHealthCheck } from './AIHealthCheck.js';

export class ProviderManager {
  constructor(configuration = DEFAULT_AI_CONFIGURATION) {
    this.setConfiguration(configuration);
  }

  setConfiguration(configuration) {
    this.configuration = normalizeAIConfiguration(configuration);
    this.factory = new AIProviderFactory(this.configuration);
    this.providers = {
      vision: this.factory.createVisionProvider(),
      ocr: this.factory.createOCRProvider(),
      preprocessing: this.factory.createPreprocessingProvider(),
      duplicate: this.factory.createDuplicateProvider()
    };
  }

  getConfiguration() {
    return this.configuration;
  }

  getProviders() {
    return this.providers;
  }

  async healthCheck() {
    return new AIHealthCheck({ providerManager: this }).checkAll();
  }
}

export const providerManager = new ProviderManager();
