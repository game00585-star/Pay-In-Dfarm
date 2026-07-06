import { DOCUMENT_TYPES } from '../../domain/constants/documentTypes.js';
import {
  CLASSIFICATION_TEMPLATES,
  DOCUMENT_TYPE_TEMPLATE_RULES,
  FILENAME_TEMPLATE_RULES,
  normalizeFeatureText
} from './ClassificationRules.js';

function collectFeatureText(document) {
  return [
    document?.filename,
    document?.originalFilename,
    document?.fileName,
    document?.documentType,
    document?.note,
    document?.storagePath
  ].filter(Boolean).map(normalizeFeatureText).join(' ');
}

export class TemplateDetector {
  get name() {
    return 'TemplateDetector';
  }

  detect(document) {
    const warnings = [];
    const detectedFeatures = [];
    const featureText = collectFeatureText(document);
    const declaredDocumentType = document?.documentType || DOCUMENT_TYPES.UNKNOWN;
    const declaredTemplate = DOCUMENT_TYPE_TEMPLATE_RULES[declaredDocumentType];

    for (const rule of FILENAME_TEMPLATE_RULES) {
      const matchedKeywords = rule.keywords.filter((keyword) => featureText.includes(normalizeFeatureText(keyword)));
      if (matchedKeywords.length > 0) {
        detectedFeatures.push(...matchedKeywords.map((keyword) => `filename:${keyword}`));
        return {
          documentType: rule.documentType,
          templateName: rule.templateName,
          confidence: declaredDocumentType === rule.documentType ? 94 : 82,
          detectedFeatures: [...new Set(detectedFeatures)],
          warnings
        };
      }
    }

    if (declaredTemplate && declaredDocumentType !== DOCUMENT_TYPES.UNKNOWN) {
      detectedFeatures.push(`declaredType:${declaredDocumentType}`);
      return {
        documentType: declaredDocumentType,
        templateName: declaredTemplate,
        confidence: 88,
        detectedFeatures,
        warnings
      };
    }

    warnings.push('NO_TEMPLATE_RULE_MATCHED');
    return {
      documentType: DOCUMENT_TYPES.UNKNOWN,
      templateName: CLASSIFICATION_TEMPLATES.UNKNOWN,
      confidence: 40,
      detectedFeatures,
      warnings
    };
  }
}
