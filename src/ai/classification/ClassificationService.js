import { DOCUMENT_TYPES } from '../../domain/constants/documentTypes.js';
import {
  CLASSIFICATION_NEXT_STEPS,
  SUPPORTED_CLASSIFICATION_DOCUMENT_TYPES
} from './ClassificationRules.js';
import { TemplateDetector } from './TemplateDetector.js';

export class ClassificationService {
  constructor({ templateDetector = new TemplateDetector(), confidenceThreshold = 70 } = {}) {
    this.templateDetector = templateDetector;
    this.confidenceThreshold = confidenceThreshold;
  }

  get name() {
    return 'ClassificationService';
  }

  async classifyDocument(document) {
    const detection = this.templateDetector.detect(document);
    const warnings = [...(detection.warnings || [])];

    if (!SUPPORTED_CLASSIFICATION_DOCUMENT_TYPES.includes(detection.documentType)) {
      warnings.push('UNSUPPORTED_DOCUMENT_TYPE');
    }

    const lowConfidence = Number(detection.confidence || 0) < this.confidenceThreshold;
    if (lowConfidence) warnings.push('LOW_CLASSIFICATION_CONFIDENCE');

    return {
      documentType: detection.documentType || DOCUMENT_TYPES.UNKNOWN,
      templateName: detection.templateName || 'Unknown',
      confidence: Number(detection.confidence || 0),
      detectedFeatures: detection.detectedFeatures || [],
      warnings: [...new Set(warnings)],
      nextStep: lowConfidence || detection.documentType === DOCUMENT_TYPES.UNKNOWN
        ? CLASSIFICATION_NEXT_STEPS.MANUAL_REVIEW
        : CLASSIFICATION_NEXT_STEPS.OCR
    };
  }

  async classify(document) {
    return this.classifyDocument(document);
  }
}

export const classificationService = new ClassificationService();
