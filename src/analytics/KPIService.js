function pct(part, total, emptyValue = 0) {
  if (!total) return emptyValue;
  return Math.round((Number(part || 0) / Number(total || 1)) * 100);
}

function avg(values = []) {
  const usable = values.map(Number).filter((value) => Number.isFinite(value));
  return usable.length ? Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length) : 0;
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff / 60000) : 0;
}

function isMissing(record) {
  return (record.riskFlags || []).some((flag) => String(flag).startsWith('MISSING')) || record.validationResult?.missingDocuments?.length;
}

function difference(record) {
  return Number(record.difference ?? record.shiftReconciliation?.difference ?? record.validationResult?.difference ?? 0);
}

function documentConfidence(document = {}) {
  const fields = Object.values(document.parsedData?.fieldConfidence || {});
  if (fields.length) return avg(fields);
  return Number(document.parsedData?.confidence || document.ocrResult?.confidence || document.classificationResult?.confidence || 0);
}

export class KPIService {
  calculateBranchKpi(branchGroup = {}) {
    const records = branchGroup.records || [];
    const documents = records.flatMap((record) => record.documents || []);
    const reviewed = records.filter((record) => record.reviewedAt);
    const reviewMinutes = reviewed.map((record) => minutesBetween(record.createdAt || record.date, record.reviewedAt));
    const completeRecords = records.filter((record) => !isMissing(record)).length;
    const recordsWithoutDifference = records.filter((record) => Math.abs(difference(record)) <= 1).length;
    const manualCorrections = documents.filter((document) => document.humanCorrection || document.correctionHistory?.length).length;
    const aiAccuracy = avg(documents.map(documentConfidence).filter(Boolean));
    const ocrAccuracy = pct(documents.filter((document) => document.rawText || document.ocrResult || document.parsedData).length, documents.length);
    const documentCompleteness = pct(completeRecords, records.length, 100);
    const differenceRate = pct(recordsWithoutDifference, records.length, 100);
    const manualCorrectionRate = 100 - pct(manualCorrections, documents.length || records.length, 0);
    const documentSubmissionTime = pct(records.filter((record) => !record.submittedLate && !record.riskFlags?.includes('LATE_SUBMISSION')).length, records.length, 100);
    const averageReviewTime = avg(reviewMinutes);
    const branchScore = avg([documentCompleteness, documentSubmissionTime, differenceRate, manualCorrectionRate, aiAccuracy || 100, ocrAccuracy || 100]);
    return {
      branchCode: branchGroup.branchCode,
      branchName: branchGroup.branchName,
      region: branchGroup.region || '',
      totalRecords: records.length,
      totalDocuments: documents.length,
      documentCompleteness,
      documentSubmissionTime,
      averageReviewTime,
      differenceRate,
      manualCorrectionRate,
      aiAccuracy,
      ocrAccuracy,
      branchScore
    };
  }

  calculateAccountingKpi(records = [], workflowCases = []) {
    const reviewed = records.filter((record) => record.reviewedAt);
    return {
      pendingReview: records.filter((record) => ['PENDING_ACCOUNTING', 'HIGH_RISK', 'NEED_RETAKE'].includes(record.status)).length,
      completedToday: reviewed.filter((record) => String(record.reviewedAt).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      averageReviewTime: avg(reviewed.map((record) => minutesBetween(record.createdAt || record.date, record.reviewedAt))),
      returnedCases: records.filter((record) => record.status === 'RETURNED').length,
      rejectedCases: records.filter((record) => record.status === 'REJECTED').length,
      overSla: workflowCases.filter((item) => item.sla?.overSla).length
    };
  }

  calculateAuditKpi(records = [], cases = []) {
    return {
      openCases: cases.filter((item) => !['RESOLVED', 'CLOSED', 'COMPLETED'].includes(item.status || item.currentStatus)).length,
      criticalCases: cases.filter((item) => Number(item.riskScore || 0) >= 80 || item.priority === 'CRITICAL').length,
      highRiskBranches: new Set(records.filter((record) => Number(record.riskScore || 0) >= 70).map((record) => record.branchCode || record.branch)).size,
      exceptionTrend: records.filter((record) => (record.riskFlags || []).length).length,
      manualOverrideTrend: records.filter((record) => record.manualOverride || record.accountingOverride || record.auditOverride).length
    };
  }

  calculateExecutiveKpi(records = [], cases = [], workflowCases = []) {
    const documents = records.flatMap((record) => record.documents || []);
    return {
      totalDocuments: documents.length,
      totalCases: cases.length + workflowCases.length,
      totalRisk: records.reduce((sum, record) => sum + Number(record.riskScore || 0), 0),
      totalDifference: records.reduce((sum, record) => sum + Math.abs(difference(record)), 0),
      aiAccuracy: avg(documents.map(documentConfidence).filter(Boolean)),
      ocrAccuracy: pct(documents.filter((document) => document.rawText || document.ocrResult || document.parsedData).length, documents.length),
      workflowSla: pct(workflowCases.filter((item) => !item.sla?.overSla).length, workflowCases.length, 100)
    };
  }

  calculateRegionalKpi(branchKpis = [], records = []) {
    const groups = branchKpis.reduce((acc, item) => {
      const region = item.region || 'UNASSIGNED';
      acc[region] = acc[region] || [];
      acc[region].push(item);
      return acc;
    }, {});
    return Object.entries(groups).map(([region, items]) => ({
      region,
      regionPerformance: avg(items.map((item) => item.branchScore)),
      topBranch: [...items].sort((a, b) => b.branchScore - a.branchScore)[0]?.branchName || '',
      lowestBranch: [...items].sort((a, b) => a.branchScore - b.branchScore)[0]?.branchName || '',
      riskDistribution: records.filter((record) => (record.region || 'UNASSIGNED') === region && Number(record.riskScore || 0) >= 70).length,
      pendingCases: records.filter((record) => (record.region || 'UNASSIGNED') === region && ['PENDING_ACCOUNTING', 'HIGH_RISK'].includes(record.status)).length
    }));
  }
}

export const kpiService = new KPIService();
