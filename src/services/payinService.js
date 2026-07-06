import { PAYIN_STATUS } from '../domain/constants/statuses.js';
import { createPayinRecord } from '../domain/models/payinRecord.js';

export class PayinService {
  constructor({ payinRepository, auditLogService, riskEngine, validationEngine, ocrProvider }) {
    this.payinRepository = payinRepository;
    this.auditLogService = auditLogService;
    this.riskEngine = riskEngine;
    this.validationEngine = validationEngine;
    this.ocrProvider = ocrProvider;
  }

  async createDraft(input, actor) {
    const record = createPayinRecord({
      ...input,
      createdBy: actor.email,
      status: PAYIN_STATUS.DRAFT
    });
    await this.payinRepository.upsert(record);
    await this.auditLogService.record({
      action: 'CREATE_DRAFT',
      recordId: record.id,
      actor: actor.email,
      actorRole: actor.role,
      after: record
    });
    return record;
  }

  async evaluateRisk(record) {
    const existingRecords = await this.payinRepository.list();
    return this.riskEngine.evaluate({ record, existingRecords });
  }
}

