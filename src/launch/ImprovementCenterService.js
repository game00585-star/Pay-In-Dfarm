export class ImprovementCenterService {
  build({ records = [], workflowCases = [], auditLogs = [] }) {
    const documents = records.flatMap((record) => record.documents || []);
    const corrections = documents.flatMap((document) => document.correctionHistory || []);
    const falsePositive = auditLogs.filter((log) => String(log.action || '').includes('FALSE_POSITIVE')).length;
    const falseNegative = auditLogs.filter((log) => String(log.action || '').includes('FALSE_NEGATIVE')).length;
    const businessExceptions = records.flatMap((record) => record.businessExceptions || []);
    const aiConfidenceValues = documents.map((document) => Number(document.parsedData?.confidence || document.classificationResult?.confidence || 0)).filter(Boolean);
    const aiAccuracy = aiConfidenceValues.length ? Math.round(aiConfidenceValues.reduce((sum, value) => sum + value, 0) / aiConfidenceValues.length) : 0;
    const ocrSuccess = documents.filter((document) => document.parsedData || document.rawText || document.ocrResult).length;
    return {
      aiAccuracy,
      ocrAccuracy: documents.length ? Math.round((ocrSuccess / documents.length) * 100) : 0,
      businessExceptionCount: businessExceptions.length,
      manualCorrectionCount: corrections.length,
      falsePositive,
      falseNegative,
      workflowKpi: workflowCases.length ? Math.round((workflowCases.filter((item) => !item.sla?.overSla).length / workflowCases.length) * 100) : 100,
      branchKpi: records.length ? Math.round((records.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length / records.length) * 100) : 100
    };
  }
}

export const improvementCenterService = new ImprovementCenterService();
