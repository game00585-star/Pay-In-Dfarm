function toDateKey(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function branchCode(record = {}) {
  return record.branchCode || record.documents?.find((item) => item.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch || 'UNKNOWN';
}

function rate(part, total) {
  if (!total) return 100;
  return Math.round((part / total) * 100);
}

export class OperationsAnalyticsService {
  buildSnapshot({ records = [], workflowCases = [], platform = null, auditLogs = [], user = null } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const visibleRecords = this.filterByRole(records, user);
    const visibleCases = this.filterCasesByRole(workflowCases, user);
    const documents = visibleRecords.flatMap((record) => record.documents || []);
    const completedCases = visibleCases.filter((item) => ['COMPLETED', 'APPROVED'].includes(item.currentStatus));
    const pendingCases = visibleCases.filter((item) => !['COMPLETED', 'REJECTED'].includes(item.currentStatus));
    const criticalCases = visibleCases.filter((item) => Number(item.riskScore || 0) >= 80 || item.priority === 'CRITICAL');
    const returned = visibleRecords.filter((record) => record.status === 'RETURNED').length;
    const rejected = visibleRecords.filter((record) => record.status === 'REJECTED').length;
    const approved = visibleRecords.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length;
    const pending = visibleRecords.filter((record) => ['PENDING_ACCOUNTING', 'HIGH_RISK', 'NEED_RETAKE'].includes(record.status)).length;
    const aiFields = documents.flatMap((doc) => Object.values(doc.parsedData?.fieldConfidence || {}));
    const aiAccuracy = aiFields.length ? Math.round(aiFields.reduce((sum, value) => sum + Number(value || 0), 0) / aiFields.length) : 0;
    const ocrDocs = documents.filter((doc) => doc.parsedData || doc.rawText || doc.ocrResult);
    const branchGroups = Object.values(visibleRecords.reduce((acc, record) => {
      const code = branchCode(record);
      acc[code] = acc[code] || { branchCode: code, branchName: record.branch || code, records: [] };
      acc[code].records.push(record);
      return acc;
    }, {}));

    return {
      generatedAt: new Date().toISOString(),
      companyOverview: {
        branches: branchGroups.length,
        records: visibleRecords.length,
        documents: documents.length,
        workflowCases: visibleCases.length,
        pendingCases: pendingCases.length,
        criticalCases: criticalCases.length
      },
      todaySummary: {
        submitted: visibleRecords.filter((record) => toDateKey(record.createdAt || record.date) === today).length,
        completed: completedCases.filter((item) => toDateKey(item.completedAt) === today).length,
        returned,
        approved,
        pending,
        rejected
      },
      riskSummary: {
        highRisk: visibleRecords.filter((record) => Number(record.riskScore || 0) >= 70).length,
        critical: criticalCases.length,
        averageRisk: visibleRecords.length ? Math.round(visibleRecords.reduce((sum, record) => sum + Number(record.riskScore || 0), 0) / visibleRecords.length) : 0
      },
      documentSummary: {
        totalDocuments: documents.length,
        withParsedData: documents.filter((doc) => doc.parsedData).length,
        missingRequired: visibleRecords.filter((record) => (record.riskFlags || []).some((flag) => String(flag).startsWith('MISSING'))).length
      },
      aiAccuracy,
      ocrAccuracy: ocrDocs.length ? rate(ocrDocs.filter((doc) => Number(doc.parsedData?.confidence || doc.ocrResult?.confidence || 0) >= 80).length, ocrDocs.length) : 0,
      workflowSla: {
        total: visibleCases.length,
        overSla: visibleCases.filter((item) => item.sla?.overSla).length,
        completed: completedCases.length,
        passRate: rate(visibleCases.filter((item) => !item.sla?.overSla).length, visibleCases.length)
      },
      branchScorecards: branchGroups.map((group) => this.scoreBranch(group)),
      kpis: this.buildKpis({ records: visibleRecords, cases: visibleCases, documents, auditLogs }),
      platform,
      analytics: this.buildPeriods(visibleRecords)
    };
  }

  filterByRole(records, user) {
    if (!user) return [];
    if (user.role === 'BRANCH') return records.filter((record) => record.branch === user.branch);
    if (user.role === 'REGIONAL_MANAGER') return records.filter((record) => String(record.branch || '').includes(user.region || user.branch || ''));
    return records;
  }

  filterCasesByRole(cases, user) {
    if (!user) return [];
    if (user.role === 'BRANCH') return cases.filter((item) => item.branchName === user.branch || item.assignedBranch === user.branch);
    if (user.role === 'REGIONAL_MANAGER') return cases.filter((item) => String(item.branchName || '').includes(user.region || user.branch || '') || item.assignedRegion === user.region);
    return cases;
  }

  scoreBranch(group) {
    const records = group.records;
    const docs = records.flatMap((record) => record.documents || []);
    const complete = records.filter((record) => !(record.riskFlags || []).some((flag) => String(flag).startsWith('MISSING'))).length;
    const differences = records.filter((record) => Math.abs(Number(record.difference || record.shiftReconciliation?.difference || 0)) > 1).length;
    const corrections = docs.filter((doc) => doc.correctionHistory?.length || doc.humanCorrection).length;
    const aiConfidence = docs.length ? Math.round(docs.reduce((sum, doc) => sum + Number(doc.parsedData?.confidence || doc.classificationResult?.confidence || 0), 0) / docs.length) : 0;
    const documentCompleteness = rate(complete, records.length);
    const differenceRate = 100 - rate(differences, records.length);
    const manualCorrectionRate = 100 - rate(corrections, docs.length || records.length);
    const submissionTime = 90;
    const overallBranchScore = Math.round((documentCompleteness + submissionTime + differenceRate + manualCorrectionRate + aiConfidence) / 5);
    return {
      branchCode: group.branchCode,
      branchName: group.branchName,
      documentCompleteness,
      submissionTime,
      differenceRate,
      manualCorrectionRate,
      aiAccuracy: aiConfidence,
      overallBranchScore
    };
  }

  buildKpis({ records, cases, documents, auditLogs }) {
    return {
      branchKpi: rate(records.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length, records.length),
      accountingKpi: rate(cases.filter((item) => item.currentStep !== 'WAITING_ACCOUNTING').length, cases.length),
      auditKpi: rate(cases.filter((item) => item.currentStep !== 'WAITING_AUDIT').length, cases.length),
      aiKpi: documents.length ? rate(documents.filter((doc) => Number(doc.parsedData?.confidence || doc.classificationResult?.confidence || 0) >= 80).length, documents.length) : 0,
      ocrKpi: documents.length ? rate(documents.filter((doc) => doc.parsedData || doc.rawText || doc.ocrResult).length, documents.length) : 0,
      workflowKpi: rate(cases.filter((item) => !item.sla?.overSla).length, cases.length),
      auditTrailEvents: auditLogs.length
    };
  }

  buildPeriods(records) {
    return ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((period) => ({
      period,
      records: records.length,
      approved: records.filter((record) => ['APPROVED', 'CLOSED'].includes(record.status)).length,
      highRisk: records.filter((record) => Number(record.riskScore || 0) >= 70).length
    }));
  }
}

export const operationsAnalyticsService = new OperationsAnalyticsService();
