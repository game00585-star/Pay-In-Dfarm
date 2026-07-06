import { ClassificationService } from './ClassificationService.js';

export class DocumentClassifier {
  get name() {
    return 'DocumentClassifier';
  }

  async classifyDocument() {
    throw new Error('DocumentClassifier.classifyDocument must be implemented');
  }

  async classify(document, context = {}) {
    return this.classifyDocument(document, context);
  }
}

export class MockDocumentClassifier extends DocumentClassifier {
  constructor(options = {}) {
    super();
    this.service = options.service || new ClassificationService(options);
  }

  get name() {
    return 'MockDocumentClassifier';
  }

  async classifyDocument(document) {
    return this.service.classifyDocument(document);
  }
}
