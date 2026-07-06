const RETENTION_KEY = 'dfarm_launch_retention_policy';
const ARCHIVE_KEY = 'dfarm_launch_archive';

const DEFAULT_POLICY = {
  imageRetention: '2_YEARS',
  ocrRetention: '5_YEARS',
  auditRetention: 'PERMANENT',
  archiveEnabled: true,
  updatedAt: ''
};

export class RetentionArchiveService {
  getPolicy() {
    try {
      return { ...DEFAULT_POLICY, ...(JSON.parse(localStorage.getItem(RETENTION_KEY)) || {}) };
    } catch {
      return DEFAULT_POLICY;
    }
  }

  updatePolicy(patch = {}) {
    const next = { ...this.getPolicy(), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(RETENTION_KEY, JSON.stringify(next));
    return next;
  }

  listArchive() {
    try {
      return JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
    } catch {
      return [];
    }
  }

  archive(item = {}) {
    const saved = {
      archiveId: `arc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId: item.sourceId || '',
      sourceType: item.sourceType || 'DOCUMENT',
      version: item.version || 1,
      status: 'ARCHIVED',
      archivedAt: new Date().toISOString()
    };
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([saved, ...this.listArchive()].slice(0, 10000)));
    return saved;
  }

  restore(archiveId) {
    const next = this.listArchive().map((item) => (
      item.archiveId === archiveId ? { ...item, status: 'RESTORED', restoredAt: new Date().toISOString() } : item
    ));
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    return next.find((item) => item.archiveId === archiveId);
  }
}

export const retentionArchiveService = new RetentionArchiveService();
