import { DepositBatchCalculator } from './DepositBatchCalculator.js';
import { DepositBatchValidator } from './DepositBatchValidator.js';
import { BranchShiftPolicyService } from './BranchShiftPolicyService.js';

function previousDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isMorningShift(shift = '') {
  return String(shift).toUpperCase().includes('MORNING') || String(shift).includes('เช้า');
}

function isAfternoonShift(shift = '') {
  return String(shift).toUpperCase().includes('AFTERNOON') || String(shift).includes('บ่าย');
}

function branchCodeFromRecord(record = {}) {
  return record.branchCode || record.branch?.match(/\d{5}/)?.[0] || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || '';
}

function cashFromRecord(record = {}) {
  const pos = record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData || {};
  return Number(pos.cashAmount || pos.cashToDepositAmount || 0);
}

function payInDocumentsFromRecord(record = {}) {
  return (record.documents || []).filter((document) => document.documentType?.startsWith('PAYIN_')).map((document) => ({
    documentId: document.id,
    documentType: document.documentType,
    filename: document.filename || document.originalFilename,
    depositAmount: document.parsedData?.depositAmount || document.parsedData?.payinCashAmount || 0,
    referenceNo: document.parsedData?.referenceNo || document.parsedData?.slipNo || '',
    parsedData: document.parsedData,
    validationResult: document.validationResult,
    riskFlags: document.riskFlags || []
  }));
}

export class DepositBatchBuilder {
  constructor({
    calculator = new DepositBatchCalculator(),
    validator = new DepositBatchValidator(),
    shiftPolicyService = new BranchShiftPolicyService()
  } = {}) {
    this.calculator = calculator;
    this.validator = validator;
    this.shiftPolicyService = shiftPolicyService;
  }

  buildForRecord(record, records = []) {
    const branchCode = branchCodeFromRecord(record);
    const depositDate = record.date;
    const targetPrevDate = previousDate(depositDate);
    const branchRecords = records.filter((item) => (branchCodeFromRecord(item) || item.branch) === branchCode || item.branch === record.branch);
    const afternoon = branchRecords.filter((item) => item.date === targetPrevDate && isAfternoonShift(item.shift));
    const morning = branchRecords.filter((item) => item.date === depositDate && isMorningShift(item.shift));
    const fallback = afternoon.length || morning.length ? [] : [record];
    const includedSource = [...afternoon, ...morning, ...fallback];
    const includedShifts = includedSource.map((item) => {
      const pos = item.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData || {};
      const policyResult = this.shiftPolicyService.validateShiftTime({
        branchCode: branchCode || pos.branchCode,
        businessDate: item.date,
        shift: item.shift,
        openTime: pos.openTime,
        closeTime: pos.closeTime
      });
      return {
        businessDate: item.date,
        shift: item.shift,
        cashAmount: cashFromRecord(item),
        shiftReportId: item.id,
        closeTime: pos.closeTime || '',
        policy: policyResult.policy,
        riskFlags: policyResult.flags
      };
    });
    const payInDocuments = payInDocumentsFromRecord(record);
    const expectedCashAmount = this.calculator.calculateExpectedCash(includedShifts);
    const actualPayInAmount = this.calculator.calculateActualPayIn(payInDocuments);
    const difference = this.calculator.calculateDifference(actualPayInAmount, expectedCashAmount);
    const batch = {
      batchId: `DEP-${branchCode || record.branch}-${depositDate}`.replace(/\s+/g, '-'),
      branchCode,
      branchName: record.branch,
      depositDate,
      status: 'PENDING',
      expectedCashAmount,
      actualPayInAmount,
      difference,
      riskScore: 0,
      riskFlags: [],
      includedShifts,
      payInDocuments,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const validation = this.validator.validate(batch);
    return {
      ...batch,
      status: validation.status,
      riskScore: validation.riskScore,
      riskFlags: validation.riskFlags,
      validationResult: validation
    };
  }
}

export const depositBatchBuilder = new DepositBatchBuilder();
