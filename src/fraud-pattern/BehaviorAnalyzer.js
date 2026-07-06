function isRecent(dateText = '', days = 30) {
  const date = new Date(`${String(dateText).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return date >= since;
}

export class BehaviorAnalyzer {
  groupByBranch(records = []) {
    return records.reduce((acc, record) => {
      const branchCode = record.branchCode || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch || 'UNKNOWN';
      acc[branchCode] = acc[branchCode] || [];
      acc[branchCode].push(record);
      return acc;
    }, {});
  }

  metrics(records = []) {
    const recent = records.filter((record) => isRecent(record.date || record.createdAt, 30));
    const exceptions = recent.flatMap((record) => record.businessExceptions || []);
    const riskFlags = recent.flatMap((record) => record.riskFlags || []);
    const documents = recent.flatMap((record) => record.documents || []);
    return {
      totalRecords: recent.length,
      exceptionCount: exceptions.length,
      missingDocumentCount: riskFlags.filter((flag) => String(flag).startsWith('MISSING')).length,
      manualOverrideCount: riskFlags.filter((flag) => String(flag).includes('OVERRIDE')).length + documents.filter((document) => document.manualMatch).length,
      duplicateReferenceCount: riskFlags.filter((flag) => String(flag).includes('DUPLICATE_REFERENCE')).length,
      lateDepositCount: riskFlags.filter((flag) => ['DEPOSIT_DATE_MISMATCH', 'PAYIN_DATE_MISMATCH'].includes(flag)).length,
      lowConfidenceCount: exceptions.filter((item) => ['LOW_CONFIDENCE', 'MANUAL_REVIEW_REQUIRED'].includes(item.ruleCode)).length,
      ocrFailureCount: exceptions.filter((item) => item.ruleCode === 'OCR_INCOMPLETE').length,
      incompleteDocumentCount: riskFlags.filter((flag) => String(flag).startsWith('MISSING')).length,
      manualMatchCount: documents.filter((document) => document.manualMatch || document.parsedData?.manualMatch).length,
      highRiskCount: recent.filter((record) => Number(record.riskScore || 0) >= 70).length,
      differenceCount: recent.filter((record) => Math.abs(Number(record.shiftReconciliation?.difference || record.depositBatch?.difference || 0)) > 1).length,
      differenceTotal: recent.reduce((sum, record) => sum + Math.abs(Number(record.shiftReconciliation?.difference || record.depositBatch?.difference || 0)), 0),
      aiCorrectionCount: Number(localStorage.getItem('dfarm_ai_correction_count') || 0)
    };
  }
}

export const behaviorAnalyzer = new BehaviorAnalyzer();
