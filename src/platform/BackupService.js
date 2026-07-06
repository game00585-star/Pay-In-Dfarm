const BACKUP_KEY = 'dfarm_platform_backups';

function readBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY)) || [];
  } catch {
    return [];
  }
}

function writeBackups(backups) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
}

export class BackupService {
  listBackups() {
    return readBackups();
  }

  createBackup(type = 'MANUAL', metadata = {}) {
    const backup = {
      backupId: `bak-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      status: 'COMPLETED',
      sizeBytes: metadata.sizeBytes || 0,
      createdAt: new Date().toISOString(),
      retentionUntil: metadata.retentionUntil || '',
      note: metadata.note || ''
    };
    writeBackups([backup, ...this.listBackups()].slice(0, 1000));
    return backup;
  }

  restore(backupId) {
    return {
      restoreId: `restore-${Date.now()}`,
      backupId,
      status: 'QUEUED',
      createdAt: new Date().toISOString()
    };
  }
}

export const backupService = new BackupService();
