import { ShiftMatchingValidator } from './ShiftMatchingValidator.js';

function normalizedShift(shift = '') {
  const text = String(shift || '').toUpperCase();
  if (text.includes('MORNING') || String(shift).includes('เช้า')) return 'MORNING';
  if (text.includes('AFTERNOON') || String(shift).includes('บ่าย')) return 'AFTERNOON';
  return text || 'UNKNOWN';
}

function branchCodeFromRecord(record = {}) {
  return record.branchCode || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch?.match(/\d{5}/)?.[0] || '';
}

function posDocument(record = {}) {
  return (record.documents || []).find((document) => document.documentType === 'POS_SUMMARY');
}

function payInDocuments(record = {}) {
  return (record.documents || []).filter((document) => document.documentType?.startsWith('PAYIN_'));
}

function cashAmountFromPos(document = {}) {
  return Number(document.parsedData?.cashAmount || document.parsedData?.cashToDepositAmount || 0);
}

function depositAmount(document = {}) {
  return Number(document.parsedData?.depositAmount || document.parsedData?.payinCashAmount || 0);
}

export class ShiftPayinMatcher {
  constructor({ validator = new ShiftMatchingValidator() } = {}) {
    this.validator = validator;
  }

  buildMatch(record, records = []) {
    const pos = posDocument(record);
    const branchCode = branchCodeFromRecord(record);
    const businessDate = record.date || pos?.parsedData?.businessDate || pos?.parsedData?.saleDate || '';
    const shift = normalizedShift(record.shift);
    const candidatePayIns = payInDocuments(record).filter((document) => {
      const matchedDate = document.matchedBusinessDate || document.parsedData?.matchedBusinessDate || businessDate;
      const matchedShift = normalizedShift(document.matchedShift || document.parsedData?.matchedShift || shift);
      return matchedDate === businessDate && matchedShift === shift;
    });
    const expectedCashAmount = cashAmountFromPos(pos);
    const actualPayInAmount = Number(candidatePayIns.reduce((sum, document) => sum + depositAmount(document), 0).toFixed(2));
    const difference = Number((actualPayInAmount - expectedCashAmount).toFixed(2));
    const match = {
      matchId: `MATCH-${branchCode || record.branch}-${businessDate}-${shift}`.replace(/\s+/g, '-'),
      branchCode,
      branchName: record.branch,
      businessDate,
      shift,
      shiftReportId: pos?.id || record.id,
      payInDocumentIds: candidatePayIns.map((document) => document.id),
      payInDocuments: candidatePayIns.map((document) => ({
        documentId: document.id,
        filename: document.filename || document.originalFilename,
        documentType: document.documentType,
        depositAmount: depositAmount(document),
        referenceNo: document.parsedData?.referenceNo || document.parsedData?.slipNo || '',
        transactionDate: document.parsedData?.transactionDate || '',
        parsedData: document.parsedData,
        manualMatch: Boolean(document.manualMatch || document.parsedData?.manualMatch)
      })),
      expectedCashAmount,
      actualPayInAmount,
      difference,
      status: 'PENDING',
      riskFlags: [],
      closeTime: pos?.parsedData?.closeTime || '',
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const existingReferences = records
      .filter((item) => item.id !== record.id)
      .flatMap((item) => payInDocuments(item))
      .map((document) => document.parsedData?.referenceNo || document.parsedData?.slipNo || '')
      .filter(Boolean);
    const validation = this.validator.validate(match, { records, closeTime: match.closeTime, existingReferences });
    return {
      ...match,
      status: validation.status,
      riskFlags: validation.riskFlags,
      validationResult: validation
    };
  }
}

export const shiftPayinMatcher = new ShiftPayinMatcher();
