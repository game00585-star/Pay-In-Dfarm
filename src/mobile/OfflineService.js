const OFFLINE_QUEUE_KEY = 'dfarm_mobile_offline_queue';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export class OfflineService {
  listQueue() {
    return readQueue();
  }

  enqueueUpload(item = {}) {
    const queued = {
      offlineId: `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: 'UPLOAD',
      status: 'QUEUED',
      retryCount: 0,
      conflictStatus: 'NOT_CHECKED',
      createdAt: new Date().toISOString(),
      ...item
    };
    writeQueue([queued, ...this.listQueue()]);
    return queued;
  }

  retry(offlineId) {
    const next = this.listQueue().map((item) => item.offlineId === offlineId
      ? { ...item, status: 'QUEUED', retryCount: Number(item.retryCount || 0) + 1, updatedAt: new Date().toISOString() }
      : item);
    writeQueue(next);
    return next.find((item) => item.offlineId === offlineId);
  }

  markSynced(offlineId) {
    const next = this.listQueue().map((item) => item.offlineId === offlineId
      ? { ...item, status: 'SYNCED', syncedAt: new Date().toISOString() }
      : item);
    writeQueue(next);
    return next.find((item) => item.offlineId === offlineId);
  }

  detectConflict(item, records = []) {
    const exists = records.some((record) => record.date === item.businessDate && record.shift === item.shift && record.branch === item.branch);
    return exists ? 'POSSIBLE_CONFLICT' : 'NO_CONFLICT';
  }
}

export const offlineService = new OfflineService();
