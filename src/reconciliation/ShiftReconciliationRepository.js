const STORAGE_KEY = 'dfarm_shift_reconciliations';

export class ShiftReconciliationRepository {
  list({ branchCode = 'ALL', businessDate = '', shift = 'ALL', status = 'ALL', riskLevel = 'ALL', page = 1, pageSize = 25 } = {}) {
    const all = this.readAll().filter((item) => {
      if (branchCode !== 'ALL' && item.branchCode !== branchCode && item.branchName !== branchCode) return false;
      if (businessDate && item.businessDate !== businessDate) return false;
      if (shift !== 'ALL' && item.shift !== shift) return false;
      if (status !== 'ALL' && item.status !== status) return false;
      if (riskLevel !== 'ALL' && this.riskLevel(item.riskScore) !== riskLevel) return false;
      return true;
    });
    const start = (Number(page) - 1) * Number(pageSize);
    return {
      items: all.slice(start, start + Number(pageSize)),
      total: all.length,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }

  readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveMany(items = []) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return items;
  }

  riskLevel(score = 0) {
    if (score >= 70) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }
}

export const shiftReconciliationRepository = new ShiftReconciliationRepository();
