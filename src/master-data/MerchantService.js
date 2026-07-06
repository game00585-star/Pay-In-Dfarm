import { masterDataRepository } from './MasterDataRepository.js';

export class MerchantService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list(branchCode = '') {
    const merchants = this.repository.list('merchants');
    return branchCode ? merchants.filter((merchant) => merchant.branchCode === branchCode) : merchants;
  }

  save(merchant) {
    return this.repository.save('merchants', {
      merchantId: merchant.merchantId || `MER-${merchant.branchCode}-${Date.now()}`,
      branchCode: merchant.branchCode || '',
      merchantType: merchant.merchantType || 'MAEMANEE',
      merchantName: merchant.merchantName || '',
      merchantCode: merchant.merchantCode || '',
      provider: merchant.provider || '',
      status: merchant.status || 'ACTIVE'
    });
  }
}

export const merchantService = new MerchantService();
