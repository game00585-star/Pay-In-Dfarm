export class AIHealthCheck {
  constructor({ providerManager }) {
    this.providerManager = providerManager;
  }

  async checkAll() {
    const startedAt = performance.now();
    const providers = this.providerManager.getProviders();
    const results = await Promise.all(Object.entries(providers).map(async ([key, provider]) => {
      const result = typeof provider.healthCheck === 'function'
        ? await provider.healthCheck()
        : { provider: provider.name || key, status: 'UNKNOWN', version: '', modelName: '', responseTimeMs: 0 };
      return [key, result];
    }));

    return {
      status: results.every(([, result]) => ['READY', 'READY_MOCK', 'DISABLED'].includes(result.status)) ? 'OK' : 'CHECK',
      responseTimeMs: Math.round(performance.now() - startedAt),
      providers: Object.fromEntries(results)
    };
  }
}
