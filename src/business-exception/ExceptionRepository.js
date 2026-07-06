const STORAGE_KEY = 'dfarm_business_exceptions';

export class ExceptionRepository {
  list({ status = 'ALL', branchCode = 'ALL', businessDate = '', severity = 'ALL', page = 1, pageSize = 50 } = {}) {
    const items = this.readAll().filter((item) => {
      if (status !== 'ALL' && item.status !== status) return false;
      if (branchCode !== 'ALL' && item.branchCode !== branchCode && item.branchName !== branchCode) return false;
      if (businessDate && item.businessDate !== businessDate) return false;
      if (severity !== 'ALL' && item.severity !== severity) return false;
      return true;
    });
    const start = (Number(page) - 1) * Number(pageSize);
    return { items: items.slice(start, start + Number(pageSize)), total: items.length, page: Number(page), pageSize: Number(pageSize) };
  }

  readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveMany(exceptions = []) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exceptions));
    return exceptions;
  }

  update(exception, patch = {}) {
    const items = this.readAll();
    const next = items.map((item) => item.exceptionId === exception.exceptionId ? { ...item, ...patch } : item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next.find((item) => item.exceptionId === exception.exceptionId) || { ...exception, ...patch };
  }
}

export const exceptionRepository = new ExceptionRepository();
