import { ShiftReconciliationBuilder } from './ShiftReconciliationBuilder.js';
import { ShiftReconciliationRepository } from './ShiftReconciliationRepository.js';

export class ShiftReconciliationService {
  constructor({
    builder = new ShiftReconciliationBuilder(),
    repository = new ShiftReconciliationRepository()
  } = {}) {
    this.builder = builder;
    this.repository = repository;
  }

  buildForRecord(record) {
    return this.builder.build(record);
  }

  buildReconciliations(records = []) {
    return records
      .filter((record) => (record.documents || []).some((document) => document.documentType === 'POS_SUMMARY'))
      .map((record) => this.buildForRecord(record));
  }

  query(records = [], filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 25);
    const all = this.buildReconciliations(records).filter((item) => {
      if (filters.branchCode && filters.branchCode !== 'ALL' && item.branchCode !== filters.branchCode && item.branchName !== filters.branchCode) return false;
      if (filters.businessDate && item.businessDate !== filters.businessDate) return false;
      if (filters.shift && filters.shift !== 'ALL' && item.shift !== filters.shift) return false;
      if (filters.status && filters.status !== 'ALL' && item.status !== filters.status) return false;
      if (filters.riskLevel && filters.riskLevel !== 'ALL' && this.riskLevel(item.riskScore) !== filters.riskLevel) return false;
      return true;
    });
    const start = (page - 1) * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize
    };
  }

  saveSnapshot(records = []) {
    return this.repository.saveMany(this.buildReconciliations(records));
  }

  riskLevel(score = 0) {
    if (score >= 70) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }
}

export const shiftReconciliationService = new ShiftReconciliationService();
