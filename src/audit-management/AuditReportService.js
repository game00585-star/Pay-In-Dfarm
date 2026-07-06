import { auditRepository } from './AuditRepository.js';

function pct(part, total) {
  if (!total) return 100;
  return Math.round((Number(part || 0) / Number(total || 1)) * 100);
}

export class AuditReportService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  buildDashboard(user = null) {
    const plans = this.repository.list('plans');
    const cases = this.repository.list('cases');
    const findings = this.repository.list('findings');
    const actions = this.repository.list('correctiveActions');
    const visibleCases = user?.role === 'BRANCH'
      ? cases.filter((item) => item.branchName === user.branch || item.branchCode === user.branch)
      : user?.role === 'REGIONAL_MANAGER'
        ? cases.filter((item) => item.region === user.region || item.region === user.branch)
        : cases;
    const openFindings = findings.filter((item) => item.status !== 'CLOSED');
    const overdueActions = actions.filter((item) => item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && !['VERIFIED'].includes(item.status));
    const closedFindings = findings.filter((item) => item.status === 'CLOSED' || item.status === 'VERIFIED');
    return {
      auditProgress: pct(visibleCases.filter((item) => item.status === 'CLOSED').length, visibleCases.length),
      openFindings: openFindings.length,
      overdueActions: overdueActions.length,
      highRiskBranches: new Set(visibleCases.filter((item) => Number(item.riskScore || 0) >= 70).map((item) => item.branchCode)).size,
      auditCoverage: pct(new Set(visibleCases.map((item) => item.branchCode)).size, 100),
      compliancePercent: pct(closedFindings.length, findings.length),
      closedFindings: closedFindings.length,
      criticalFindings: findings.filter((item) => item.severity === 'CRITICAL').length,
      plans,
      cases: visibleCases,
      findings,
      actions,
      evidence: this.repository.list('evidence'),
      history: this.repository.list('history')
    };
  }

  saveReport(input = {}, actor = {}) {
    const saved = {
      reportId: input.reportId || `AR-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: input.title || 'Internal Audit Report',
      period: input.period || new Date().toISOString().slice(0, 7),
      summary: input.summary || {},
      createdBy: actor.email || actor.name || 'system',
      createdAt: new Date().toISOString()
    };
    this.repository.save('reports', 'reportId', saved);
    return saved;
  }
}

export const auditReportService = new AuditReportService();
