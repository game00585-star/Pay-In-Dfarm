import { OllamaClient } from './OllamaClient.js';

export class OllamaHealthService {
  constructor({ configuration, client = new OllamaClient(configuration) } = {}) {
    this.configuration = configuration;
    this.client = client;
  }

  async healthCheck() {
    const startedAt = performance.now();
    try {
      const [versionResult, tagsResult] = await Promise.all([
        this.client.version(),
        this.client.tags().catch(() => ({ models: [] }))
      ]);
      const model = this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl';
      const available = (tagsResult.models || []).some((item) => item.name === model || item.name?.startsWith(`${model}:`));
      return {
        status: available ? 'READY' : 'MODEL_NOT_FOUND',
        version: versionResult.version || 'unknown',
        model,
        responseTime: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return {
        status: 'UNAVAILABLE',
        version: 'unknown',
        model: this.configuration?.ollama?.visionModel || this.configuration?.ollama?.modelName || 'qwen2.5vl',
        responseTime: Math.round(performance.now() - startedAt),
        error: error.message
      };
    }
  }
}
