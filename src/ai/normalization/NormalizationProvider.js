export class NormalizationProvider {
  get name() {
    return 'NormalizationProvider';
  }

  async normalize() {
    throw new Error('NormalizationProvider.normalize must be implemented');
  }
}

export class MockNormalizationProvider extends NormalizationProvider {
  get name() {
    return 'MockNormalizationProvider';
  }

  async normalize(ocrResult, context = {}) {
    const fields = ocrResult?.fields || {};
    return {
      documentType: context.classification?.documentType || ocrResult?.documentType || 'UNKNOWN',
      confidence: Number(ocrResult?.confidence || 0),
      normalizedAt: new Date().toISOString(),
      fields: {
        ...fields,
        amount: Number(fields.amount || 0),
        documentDate: fields.documentDate || ''
      }
    };
  }
}
