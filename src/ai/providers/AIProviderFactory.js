import { AI_PROVIDERS, normalizeAIConfiguration } from './AIConfiguration.js';
import { MockOCRProvider } from './MockOCRProvider.js';
import { MockVisionProvider } from './MockVisionProvider.js';
import { OllamaVisionProvider } from './OllamaVisionProvider.js';
import { OpenCVProvider } from './OpenCVProvider.js';
import { PaddleOCRProvider } from './PaddleOCRProvider.js';

export class AIProviderFactory {
  constructor(configuration = {}) {
    this.configuration = normalizeAIConfiguration(configuration);
  }

  createVisionProvider(provider = this.configuration.visionProvider) {
    if (provider === AI_PROVIDERS.OLLAMA) return new OllamaVisionProvider({ configuration: this.configuration });
    return new MockVisionProvider({ configuration: this.configuration });
  }

  createOCRProvider(provider = this.configuration.ocrProvider) {
    if (provider === AI_PROVIDERS.PADDLEOCR) return new PaddleOCRProvider({ configuration: this.configuration });
    return new MockOCRProvider({ configuration: this.configuration });
  }

  createPreprocessingProvider(provider = this.configuration.preprocessingProvider) {
    if (provider === AI_PROVIDERS.OPENCV) return new OpenCVProvider({ configuration: this.configuration });
    return new OpenCVProvider({ configuration: this.configuration });
  }

  createDuplicateProvider(provider = this.configuration.duplicateProvider) {
    if (provider === AI_PROVIDERS.OPENCV) return new OpenCVProvider({ configuration: this.configuration });
    return new OpenCVProvider({ configuration: this.configuration });
  }
}
