export class ComparisonService {
  compareBranches(branchKpis = [], selectedBranches = [], metric = 'branchScore') {
    const selected = selectedBranches.length
      ? branchKpis.filter((item) => selectedBranches.includes(item.branchCode) || selectedBranches.includes(item.branchName))
      : branchKpis;
    return selected.map((item) => ({
      branchCode: item.branchCode,
      branchName: item.branchName,
      kpi: Number(item[metric] || 0),
      risk: 100 - Number(item.branchScore || 0),
      performance: item.branchScore,
      submission: item.documentSubmissionTime,
      difference: item.differenceRate
    }));
  }
}

export const comparisonService = new ComparisonService();
