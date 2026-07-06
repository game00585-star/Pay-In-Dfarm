import { PROCESSING_STATUS } from './processingStatus.js';
import { createStepResult, serializeError } from './result.js';

export async function runWithRetry({ step, providerName, maxRetries = 1, action }) {
  const startedAt = new Date().toISOString();
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const data = await action({ attempt });
      return createStepResult({
        step,
        provider: providerName,
        status: PROCESSING_STATUS.COMPLETED,
        attempts: attempt,
        startedAt,
        completedAt: new Date().toISOString(),
        data
      });
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        continue;
      }
    }
  }

  return createStepResult({
    step,
    provider: providerName,
    status: PROCESSING_STATUS.FAILED,
    attempts: maxRetries + 1,
    startedAt,
    completedAt: new Date().toISOString(),
    error: serializeError(lastError)
  });
}
