export class BaseVisionProvider {
  constructor({ providerName = 'BASE_VISION', configuration = {} } = {}) {
    this.providerName = providerName;
    this.configuration = configuration;
  }

  get name() {
    return this.providerName;
  }

  async analyzeDocument() {
    throw new Error(`${this.name}.analyzeDocument must be implemented`);
  }

  async healthCheck() {
    return {
      provider: this.name,
      status: 'UNKNOWN',
      version: '',
      modelName: '',
      responseTimeMs: 0,
      message: 'Health check is not implemented'
    };
  }
}
