import { masterDataRepository } from './MasterDataRepository.js';

export class PaymentTypeService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list() {
    return this.repository.list('paymentTypes');
  }

  save(paymentType) {
    return this.repository.save('paymentTypes', {
      id: paymentType.id || paymentType.code,
      code: paymentType.code || `PAYMENT-${Date.now()}`,
      name: paymentType.name || paymentType.code || 'Payment Type',
      posField: paymentType.posField || '',
      requiredDocumentType: paymentType.requiredDocumentType || '',
      active: paymentType.active !== false,
      status: paymentType.status || (paymentType.active === false ? 'INACTIVE' : 'ACTIVE')
    });
  }
}

export const paymentTypeService = new PaymentTypeService();
