export class OcrProvider {
  async detectTemplate() {
    throw new Error('OcrProvider.detectTemplate must be implemented');
  }

  async extractDocument() {
    throw new Error('OcrProvider.extractDocument must be implemented');
  }
}

