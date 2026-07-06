export class EnterpriseSearchService {
  search({ query = '', records = [], workflowCases = [] } = {}) {
    const text = query.toLowerCase();
    if (!text) return [];
    const recordResults = records.filter((record) => [
      record.id,
      record.branch,
      record.date,
      record.shift,
      record.referenceNo,
      record.status,
      ...(record.riskFlags || []),
      ...(record.documents || []).map((doc) => `${doc.filename} ${doc.documentType} ${doc.referenceNo || ''}`)
    ].join(' ').toLowerCase().includes(text)).map((record) => ({
      id: record.id,
      type: 'PAYIN_RECORD',
      title: `${record.branch} | ${record.date} | ${record.shift}`,
      description: `${record.status} | Risk ${record.riskScore || 0}`
    }));
    const caseResults = workflowCases.filter((item) => [
      item.caseId,
      item.branchName,
      item.businessDate,
      item.shift,
      item.currentStatus,
      item.currentStep,
      item.assignedUser,
      item.riskScore
    ].join(' ').toLowerCase().includes(text)).map((item) => ({
      id: item.caseId,
      type: 'WORKFLOW_CASE',
      title: `${item.caseId} | ${item.branchName}`,
      description: `${item.currentStep} | ${item.currentStatus}`
    }));
    return [...recordResults, ...caseResults].slice(0, 100);
  }
}

export const enterpriseSearchService = new EnterpriseSearchService();
