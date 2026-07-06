const STORAGE_KEY = 'dfarm_deposit_batches';

export class DepositBatchRepository {
  list() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  save(batch) {
    const batches = this.list();
    const next = batches.some((item) => item.batchId === batch.batchId)
      ? batches.map((item) => (item.batchId === batch.batchId ? batch : item))
      : [batch, ...batches];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return batch;
  }

  saveMany(batches) {
    batches.forEach((batch) => this.save(batch));
    return this.list();
  }
}

export const depositBatchRepository = new DepositBatchRepository();
