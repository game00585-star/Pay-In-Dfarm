import { ShiftPayinMatcher } from './ShiftPayinMatcher.js';
import { ShiftMatchingRepository } from './ShiftMatchingRepository.js';

export class ShiftMatchingService {
  constructor({
    matcher = new ShiftPayinMatcher(),
    repository = new ShiftMatchingRepository()
  } = {}) {
    this.matcher = matcher;
    this.repository = repository;
  }

  buildMatchesForRecord(record, records = []) {
    return [this.matcher.buildMatch(record, records)];
  }

  buildMatches(records = []) {
    return records
      .filter((record) => (record.documents || []).some((document) => document.documentType === 'POS_SUMMARY'))
      .flatMap((record) => this.buildMatchesForRecord(record, records));
  }

  saveMatches(records = []) {
    return this.buildMatches(records).map((match) => this.repository.save(match));
  }
}

export const shiftMatchingService = new ShiftMatchingService();
