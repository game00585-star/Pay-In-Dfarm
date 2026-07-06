export class OCRProvider {
  get name() {
    return 'OCRProvider';
  }

  async extract() {
    throw new Error('OCRProvider.extract must be implemented');
  }
}

export class MockOCRProvider extends OCRProvider {
  get name() {
    return 'MockOCRProvider';
  }

  async extract(document, context = {}) {
    const documentType = context.classification?.documentType || document?.documentType || 'UNKNOWN';
    return {
      documentType,
      confidence: documentType === 'UNKNOWN' ? 55 : 88,
      rawText: `MOCK_OCR_TEXT_${documentType}`,
      fields: {
        documentDate: new Date().toISOString().slice(0, 10),
        referenceNo: `${documentType}-${Date.now().toString().slice(-8)}`,
        amount: 0
      }
    };
  }
}
