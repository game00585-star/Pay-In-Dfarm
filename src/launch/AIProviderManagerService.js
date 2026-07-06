const PROVIDER_KEY = 'dfarm_launch_ai_providers';

const DEFAULT_PROVIDERS = [
  { providerId: 'OLLAMA', name: 'Ollama', type: 'AI_PROVIDER', status: 'READY', localOnly: true },
  { providerId: 'PADDLEOCR', name: 'PaddleOCR', type: 'OCR_PROVIDER', status: 'READY', localOnly: true },
  { providerId: 'OPENCV', name: 'OpenCV', type: 'VISION_PROVIDER', status: 'READY', localOnly: true },
  { providerId: 'MOCK', name: 'Mock Provider', type: 'FALLBACK_PROVIDER', status: 'READY', localOnly: true }
];

function readProviders() {
  try {
    return JSON.parse(localStorage.getItem(PROVIDER_KEY)) || DEFAULT_PROVIDERS;
  } catch {
    return DEFAULT_PROVIDERS;
  }
}

export class AIProviderManagerService {
  list() {
    return readProviders();
  }

  save(provider) {
    const saved = {
      providerId: provider.providerId || `PROVIDER-${Date.now()}`,
      name: provider.name || 'Local Provider',
      type: provider.type || 'AI_PROVIDER',
      status: provider.status || 'READY',
      localOnly: provider.localOnly !== false,
      updatedAt: new Date().toISOString()
    };
    const next = this.list().some((item) => item.providerId === saved.providerId)
      ? this.list().map((item) => (item.providerId === saved.providerId ? saved : item))
      : [saved, ...this.list()];
    localStorage.setItem(PROVIDER_KEY, JSON.stringify(next));
    return saved;
  }
}

export const aiProviderManagerService = new AIProviderManagerService();
