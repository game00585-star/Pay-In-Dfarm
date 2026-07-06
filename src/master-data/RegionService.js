import { masterDataRepository } from './MasterDataRepository.js';

export class RegionService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list() {
    return this.repository.list('regions');
  }

  save(region) {
    return this.repository.save('regions', {
      regionId: region.regionId || `REG-${Date.now()}`,
      regionName: region.regionName || '',
      regionType: region.regionType || 'REGION',
      parentRegionId: region.parentRegionId || '',
      status: region.status || 'ACTIVE'
    });
  }
}

export const regionService = new RegionService();
