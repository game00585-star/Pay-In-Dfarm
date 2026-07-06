import { DOCUMENT_TYPES } from '../../domain/constants/documentTypes.js';
import { FILENAME_TEMPLATE_RULES, normalizeFeatureText } from '../classification/ClassificationRules.js';

export const SMART_LABEL_ACTIONS = Object.freeze({
  AUTO_SELECT: 'AUTO_SELECT',
  SUGGEST: 'SUGGEST',
  UNKNOWN: 'UNKNOWN'
});

export const SMART_LABEL_THRESHOLDS = Object.freeze({
  autoSelect: 90,
  suggest: 70
});

export const SMART_LABEL_TYPES = Object.freeze([
  DOCUMENT_TYPES.POS_SUMMARY,
  DOCUMENT_TYPES.PAYIN_BANK_COUNTER,
  DOCUMENT_TYPES.PAYIN_ATM,
  DOCUMENT_TYPES.PAYIN_COUNTER_SERVICE,
  DOCUMENT_TYPES.PAYIN_LOTUS,
  DOCUMENT_TYPES.BANK_TRANSFER_SLIP,
  DOCUMENT_TYPES.MAEMANEE_QR_ALERT,
  DOCUMENT_TYPES.CRM_COUPON_RECEIPT,
  DOCUMENT_TYPES.DEBTOR_TRANSFER_RECEIPT,
  DOCUMENT_TYPES.UNKNOWN
]);

export function getMatchedFilenameRule(document) {
  const featureText = [
    document?.filename,
    document?.originalFilename,
    document?.fileName,
    document?.documentType,
    document?.note,
    document?.storagePath
  ].filter(Boolean).map(normalizeFeatureText).join(' ');

  for (const rule of FILENAME_TEMPLATE_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) => featureText.includes(normalizeFeatureText(keyword)));
    if (matchedKeywords.length) {
      return { ...rule, matchedKeywords };
    }
  }

  return null;
}
