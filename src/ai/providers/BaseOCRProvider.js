export class BaseOCRProvider {
  constructor({ providerName = 'BASE_OCR', configuration = {} } = {}) {
    this.providerName = providerName;
    this.configuration = configuration;
  }

  get name() {
    return this.providerName;
  }

  async extractText() {
    throw new Error(`${this.name}.extractText must be implemented`);
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
