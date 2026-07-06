import { masterDataRepository } from './MasterDataRepository.js';

export class HolidayService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list(branchCode = '') {
    const holidays = this.repository.list('holidays');
    return branchCode ? holidays.filter((holiday) => !holiday.branchCode || holiday.branchCode === branchCode) : holidays;
  }

  save(holiday) {
    return this.repository.save('holidays', {
      holidayId: holiday.holidayId || `HOL-${holiday.holidayDate || Date.now()}-${holiday.branchCode || 'ALL'}`,
      holidayDate: holiday.holidayDate || new Date().toISOString().slice(0, 10),
      holidayName: holiday.holidayName || 'Holiday',
      branchCode: holiday.branchCode || '',
      holidayType: holiday.holidayType || 'PUBLIC',
      status: holiday.status || 'ACTIVE'
    });
  }
}

export const holidayService = new HolidayService();
