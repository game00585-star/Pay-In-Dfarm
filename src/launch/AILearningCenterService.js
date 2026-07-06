function readStore(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export class AILearningCenterService {
  collect({ records = [], auditLogs = [] }) {
    const documents = records.flatMap((record) => record.documents || []);
    const correctionHistory = documents.flatMap((document) => document.correctionHistory || []);
    const manualOverride = auditLogs.filter((log) => String(log.action || '').includes('OVERRIDE'));
    const falsePositive = [
      ...readStore('dfarm_v3_auth_fraudPatternLearningDataset', []),
      ...auditLogs.filter((log) => String(log.action || '').includes('FALSE_POSITIVE'))
    ];
    const ocrFailure = documents.filter((document) => document.ocrResult?.success === false || document.parsedData?.warnings?.includes?.('OCR_FAILED'));
    const lowConfidence = documents.filter((document) => Number(document.parsedData?.confidence || document.classificationResult?.confidence || 100) < 80);
    const businessException = records.flatMap((record) => record.businessExceptions || []);
    return {
      correctionHistory,
      manualOverride,
      falsePositive,
      ocrFailure,
      lowConfidence,
      businessException,
      trainingDataset: [...correctionHistory, ...falsePositive, ...ocrFailure, ...lowConfidence].slice(0, 10000)
    };
  }
}

export const aiLearningCenterService = new AILearningCenterService();
