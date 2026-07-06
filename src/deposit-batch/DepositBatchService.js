import { DepositBatchBuilder } from './DepositBatchBuilder.js';
import { DepositBatchRepository } from './DepositBatchRepository.js';

export class DepositBatchService {
  constructor({
    builder = new DepositBatchBuilder(),
    repository = new DepositBatchRepository()
  } = {}) {
    this.builder = builder;
    this.repository = repository;
  }

  buildBatchForRecord(record, records = []) {
    return this.builder.buildForRecord(record, records);
  }

  buildBatches(records = []) {
    const payInRecords = records.filter((record) => (record.documents || []).some((document) => document.documentType?.startsWith('PAYIN_')));
    const batches = payInRecords.map((record) => this.buildBatchForRecord(record, records));
    return batches;
  }

  saveBatches(records = []) {
    return this.repository.saveMany(this.buildBatches(records));
  }
}

export const depositBatchService = new DepositBatchService();
