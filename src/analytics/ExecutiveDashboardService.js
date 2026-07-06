export class ExecutiveDashboardService {
  build({ summary, branchKpis, accountingKpi, auditKpi, regionalKpi, executiveKpi, workflowStatus, aiStatus, ocrStatus }) {
    return {
      todaySummary: summary.todaySummary,
      companyOverview: summary.companyOverview,
      branchOverview: {
        totalBranches: branchKpis.length,
        averageBranchScore: branchKpis.length ? Math.round(branchKpis.reduce((sum, item) => sum + Number(item.branchScore || 0), 0) / branchKpis.length) : 0,
        topBranches: [...branchKpis].sort((a, b) => b.branchScore - a.branchScore).slice(0, 10),
        lowestBranches: [...branchKpis].sort((a, b) => a.branchScore - b.branchScore).slice(0, 10)
      },
      accountingStatus: accountingKpi,
      auditStatus: auditKpi,
      regionalStatus: regionalKpi,
      executiveKpi,
      workflowStatus,
      aiStatus,
      ocrStatus
    };
  }
}

export const executiveDashboardService = new ExecutiveDashboardService();
