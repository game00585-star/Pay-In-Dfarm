import { PROCESSING_STATUS } from './processingStatus.js';

export function createStepResult({
  step,
  provider = 'unknown',
  status = PROCESSING_STATUS.PENDING,
  attempts = 0,
  startedAt = '',
  completedAt = '',
  data = null,
  error = null,
  warnings = []
}) {
  return {
    step,
    provider,
    status,
    attempts,
    startedAt,
    completedAt,
    data,
    error,
    warnings
  };
}

export function createPipelineResult({ document, status = PROCESSING_STATUS.PENDING }) {
  const now = new Date().toISOString();
  return {
    documentId: document?.id || '',
    documentType: document?.documentType || 'UNKNOWN',
    status,
    startedAt: now,
    completedAt: '',
    steps: {},
    result: {
      quality: null,
      preprocessing: null,
      fingerprint: null,
      duplicate: null,
      classification: null,
      ocr: null,
      normalizedData: null,
      validation: null,
      risk: null
    },
    error: null
  };
}

export function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error)
  };
}
