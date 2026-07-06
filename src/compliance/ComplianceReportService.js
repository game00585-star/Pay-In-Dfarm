import { complianceRepository } from './ComplianceRepository.js';
import { complianceDashboardService } from './ComplianceDashboardService.js';

export class ComplianceReportService {
  constructor({ repository = complianceRepository } = {}) {
    this.repository = repository;
  }

  build(user = null) {
    const policies = this.repository.list('policies');
    const cases = this.filterByRole(this.repository.list('cases'), user);
    const assessments = this.filterByRole(this.repository.list('assessments'), user);
    const history = this.repository.list('history');
    return {
      generatedAt: new Date().toISOString(),
      policies,
      cases,
      assessments,
      evidence: this.repository.list('evidence'),
      history,
      dashboard: complianceDashboardService.build({ policies, cases, assessments, history })
    };
  }

  saveReport(input = {}, actor = {}) {
    const saved = {
      reportId: input.reportId || `CR-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: input.title || 'Compliance Report',
      summary: input.summary || {},
      createdBy: actor.email || actor.name || 'system',
      createdAt: new Date().toISOString()
    };
    this.repository.save('reports', 'reportId', saved);
    return saved;
  }

  filterByRole(items = [], user = null) {
    if (user?.role === 'BRANCH') return items.filter((item) => item.branchName === user.branch || item.branchCode === user.branch);
    if (user?.role === 'REGIONAL_MANAGER') return items.filter((item) => item.region === user.region || item.region === user.branch);
    return items;
  }
}

export const complianceReportService = new ComplianceReportService();
