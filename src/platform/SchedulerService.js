export class SchedulerService {
  listSchedules() {
    return [
      { scheduleId: 'sch-cleanup', name: 'Auto Cleanup', interval: 'DAILY', status: 'ACTIVE', nextRunAt: this.nextRun(1) },
      { scheduleId: 'sch-backup', name: 'Auto Backup', interval: 'DAILY', status: 'ACTIVE', nextRunAt: this.nextRun(1) },
      { scheduleId: 'sch-retry', name: 'Auto Retry', interval: 'EVERY_15_MINUTES', status: 'ACTIVE', nextRunAt: this.nextRun(0.01) },
      { scheduleId: 'sch-archive', name: 'Auto Archive', interval: 'WEEKLY', status: 'ACTIVE', nextRunAt: this.nextRun(7) },
      { scheduleId: 'sch-health', name: 'Auto Health Check', interval: 'EVERY_5_MINUTES', status: 'ACTIVE', nextRunAt: this.nextRun(0.004) }
    ];
  }

  nextRun(days) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + Math.round(days * 24 * 60));
    return date.toISOString();
  }
}

export const schedulerService = new SchedulerService();
