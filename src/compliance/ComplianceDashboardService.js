function pct(part, total) {
  if (!total) return 100;
  return Math.round((Number(part || 0) / Number(total || 1)) * 100);
}

export class ComplianceDashboardService {
  build({ policies = [], cases = [], assessments = [], history = [] } = {}) {
    const compliant = assessments.filter((item) => item.assessmentResult === 'COMPLIANT').length;
    const nonCompliant = assessments.filter((item) => item.assessmentResult === 'NON_COMPLIANT').length;
    const openCases = cases.filter((item) => item.status !== 'CLOSED');
    const overdue = policies.filter((policy) => policy.reviewDate && policy.reviewDate < new Date().toISOString().slice(0, 10));
    const highRiskPolicyIds = new Set(openCases.filter((item) => ['HIGH', 'CRITICAL'].includes(item.riskLevel)).map((item) => item.policyId).filter(Boolean));
    return {
      policyStatus: {
        active: policies.filter((policy) => policy.status === 'ACTIVE').length,
        draft: policies.filter((policy) => policy.status === 'DRAFT').length,
        cancelled: policies.filter((policy) => policy.status === 'CANCELLED').length
      },
      compliancePercent: pct(compliant, assessments.length),
      nonCompliance: nonCompliant,
      openCase: openCases.length,
      overdue: overdue.length,
      highRiskPolicy: highRiskPolicyIds.size,
      corporateCompliance: pct(compliant + policies.filter((policy) => policy.status === 'ACTIVE').length, assessments.length + policies.length),
      internalControlStatus: pct(compliant, assessments.length),
      policyCompliance: pct(policies.filter((policy) => policy.status === 'ACTIVE').length, policies.length),
      riskSummary: cases.reduce((sum, item) => sum + Number(item.riskScore || 0), 0),
      history
    };
  }
}

export const complianceDashboardService = new ComplianceDashboardService();
