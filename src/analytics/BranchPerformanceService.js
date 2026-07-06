export class BranchPerformanceService {
  groupRecordsByBranch(records = [], branches = []) {
    const branchMeta = new Map(branches.map((branch) => [branch.branchName || branch.branchCode, branch]));
    return Object.values(records.reduce((acc, record) => {
      const key = record.branchCode || record.branch || 'UNKNOWN';
      const meta = branchMeta.get(record.branch) || branchMeta.get(record.branchCode) || {};
      acc[key] = acc[key] || {
        branchCode: meta.branchCode || record.branchCode || key,
        branchName: record.branch || meta.branchName || key,
        region: meta.region || record.region || '',
        records: []
      };
      acc[key].records.push({ ...record, region: meta.region || record.region || '' });
      return acc;
    }, {}));
  }

  rank(branchKpis = [], metric = 'branchScore', limit = 10, direction = 'desc') {
    const sorted = [...branchKpis].sort((a, b) => (
      direction === 'asc' ? Number(a[metric] || 0) - Number(b[metric] || 0) : Number(b[metric] || 0) - Number(a[metric] || 0)
    ));
    return sorted.slice(0, limit);
  }

  heatMap(branchKpis = []) {
    return branchKpis.map((item) => ({
      branchCode: item.branchCode,
      branchName: item.branchName,
      region: item.region || 'UNASSIGNED',
      score: item.branchScore,
      riskHeat: item.branchScore >= 80 ? 'LOW' : item.branchScore >= 60 ? 'MEDIUM' : 'HIGH'
    }));
  }
}

export const branchPerformanceService = new BranchPerformanceService();
