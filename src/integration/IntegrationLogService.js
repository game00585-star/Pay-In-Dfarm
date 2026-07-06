export class IntegrationLogService {
  constructor({ repository }) {
    this.repository = repository;
  }

  log({ jobId = '', request = {}, response = {}, status = 'INFO', durationMs = 0, error = '', retryCount = 0 }) {
    return this.repository.saveLog({
      logId: `int-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      jobId,
      request,
      response,
      status,
      durationMs,
      error,
      retryCount,
      createdAt: new Date().toISOString()
    });
  }
}
