export class ReportCenterService {
  listReports(snapshot = {}) {
    return [
      { reportId: 'daily', name: 'Daily Report', format: 'PDF/Excel/CSV', records: snapshot.companyOverview?.records || 0 },
      { reportId: 'branch', name: 'Branch Report', format: 'PDF/Excel/CSV', records: snapshot.branchScorecards?.length || 0 },
      { reportId: 'accounting', name: 'Accounting Report', format: 'PDF/Excel/CSV', records: snapshot.todaySummary?.pending || 0 },
      { reportId: 'audit', name: 'Audit Report', format: 'PDF/Excel/CSV', records: snapshot.riskSummary?.critical || 0 },
      { reportId: 'executive', name: 'Executive Report', format: 'PDF/Excel/CSV', records: snapshot.companyOverview?.branches || 0 },
      { reportId: 'risk', name: 'Risk Report', format: 'PDF/Excel/CSV', records: snapshot.riskSummary?.highRisk || 0 }
    ];
  }

  exportRows(snapshot = {}) {
    return {
      company: [snapshot.companyOverview || {}],
      branches: snapshot.branchScorecards || [],
      kpis: [snapshot.kpis || {}],
      analytics: snapshot.analytics || []
    };
  }
}

export const reportCenterService = new ReportCenterService();
