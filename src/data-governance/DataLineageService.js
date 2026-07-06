import { dataGovernanceRepository } from './DataGovernanceRepository.js';

export class DataLineageService {
  constructor({ repository = dataGovernanceRepository } = {}) {
    this.repository = repository;
  }

  buildForRecords(records = []) {
    const lineage = records.map((record) => ({
      lineageId: `LIN-${record.id || Date.now()}`.replace(/\s+/g, '-'),
      recordId: record.id || '',
      branchCode: record.branchCode || record.branch || '',
      source: 'Branch Upload',
      transformation: ['Document Parser', 'Normalization', 'Validation'],
      validation: record.validationResult?.valid === false ? 'FAILED' : 'PASSED_OR_PENDING',
      workflow: record.status || '',
      archive: record.archiveStatus || 'ACTIVE',
      createdAt: new Date().toISOString()
    }));
    this.repository.replace('lineage', lineage);
    return lineage;
  }

  list() {
    return this.repository.list('lineage');
  }
}

export const dataLineageService = new DataLineageService();
