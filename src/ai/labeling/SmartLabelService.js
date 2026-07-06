import { TemplateDetector } from '../classification/TemplateDetector.js';
import {
  SMART_LABEL_ACTIONS,
  SMART_LABEL_THRESHOLDS,
  getMatchedFilenameRule
} from './SmartLabelRules.js';

function mockImageQuality(document) {
  const fileSize = Number(document?.fileSize || 0);
  const isSupported = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(document?.mimeType || document?.contentType || '');
  const score = Math.max(45, Math.min(98, 96 - Math.floor(fileSize / (1024 * 1024)) * 4 - (isSupported ? 0 : 20)));
  return {
    score,
    status: score >= 70 ? 'PASS' : 'WARN',
    warnings: isSupported ? [] : ['UNSUPPORTED_MIME_TYPE_FOR_LABEL_ASSIST']
  };
}

function confidenceAction(confidence) {
  if (confidence > SMART_LABEL_THRESHOLDS.autoSelect) return SMART_LABEL_ACTIONS.AUTO_SELECT;
  if (confidence >= SMART_LABEL_THRESHOLDS.suggest) return SMART_LABEL_ACTIONS.SUGGEST;
  return SMART_LABEL_ACTIONS.UNKNOWN;
}

export class SmartLabelService {
  constructor({ templateDetector = new TemplateDetector() } = {}) {
    this.templateDetector = templateDetector;
  }

  get name() {
    return 'SmartLabelService';
  }

  async suggestDocumentLabel(document, context = {}) {
    const templateResult = this.templateDetector.detect(document);
    const filenameRule = getMatchedFilenameRule(document);
    const imageQuality = context.imageQuality || mockImageQuality(document);
    const declaredMatch = document?.documentType && document.documentType !== 'UNKNOWN' && document.documentType === templateResult.documentType;
    const matchedKeywords = filenameRule?.matchedKeywords || [];
    const fingerprintAvailable = Boolean(context.fingerprint?.imageHash || document?.fingerprint?.imageHash || document?.imageHash);

    let confidence = 45;
    if (filenameRule) confidence += 30;
    confidence += Math.min(24, matchedKeywords.length * 8);
    if (declaredMatch) confidence += 18;
    if (Number(imageQuality.score || 0) >= 80) confidence += 8;
    if (fingerprintAvailable) confidence += 4;
    if (templateResult.documentType === 'UNKNOWN') confidence -= 20;
    confidence = Math.max(0, Math.min(100, confidence));

    const action = confidenceAction(confidence);
    const suggestedLabel = action === SMART_LABEL_ACTIONS.UNKNOWN ? 'UNKNOWN' : templateResult.documentType;

    return {
      suggestedLabel,
      confidence,
      action,
      reason: filenameRule
        ? `Matched local filename/template rule for ${filenameRule.templateName}`
        : declaredMatch
          ? 'Matched declared document type with local template rule'
          : 'No strong local rule matched',
      matchedTemplate: templateResult.templateName,
      matchedKeywords,
      imageQuality,
      fingerprintMatched: fingerprintAvailable,
      warnings: [
        ...(templateResult.warnings || []),
        ...(imageQuality.warnings || []),
        ...(action === SMART_LABEL_ACTIONS.UNKNOWN ? ['LOW_LABEL_CONFIDENCE'] : [])
      ]
    };
  }
}

export const smartLabelService = new SmartLabelService();
