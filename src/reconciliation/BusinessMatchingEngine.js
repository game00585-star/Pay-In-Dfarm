function normalizedShift(shift = '') {
  const text = String(shift || '').toUpperCase();
  if (text.includes('MORNING') || String(shift).includes('เช้า')) return 'MORNING';
  if (text.includes('AFTERNOON') || String(shift).includes('บ่าย')) return 'AFTERNOON';
  return text || 'UNKNOWN';
}

export function branchCodeFromRecord(record = {}) {
  return record.branchCode || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch?.match(/\d{5}/)?.[0] || '';
}

export function documentBusinessDate(document = {}, fallback = '') {
  return document.matchedBusinessDate || document.parsedData?.matchedBusinessDate || document.parsedData?.businessDate || document.parsedData?.saleDate || document.parsedData?.transactionDate || fallback;
}

export function documentShift(document = {}, fallback = '') {
  return normalizedShift(document.matchedShift || document.parsedData?.matchedShift || fallback);
}

export class BusinessMatchingEngine {
  matchesShift(document, { branchCode, businessDate, shift }) {
    const docBranchCode = document.parsedData?.branchCode || document.branchCode || branchCode;
    const docDate = documentBusinessDate(document, businessDate);
    const docShift = documentShift(document, shift);
    return (!docBranchCode || docBranchCode === branchCode) && docDate === businessDate && docShift === normalizedShift(shift);
  }

  groupDocuments(record = {}) {
    const documents = record.documents || [];
    const branchCode = branchCodeFromRecord(record);
    const businessDate = record.date || '';
    const shift = normalizedShift(record.shift);
    const scope = { branchCode, businessDate, shift };
    return {
      branchCode,
      businessDate,
      shift,
      shiftReport: documents.find((document) => document.documentType === 'POS_SUMMARY' && this.matchesShift(document, scope)) || documents.find((document) => document.documentType === 'POS_SUMMARY'),
      payInDocuments: documents.filter((document) => document.documentType?.startsWith('PAYIN_') && this.matchesShift(document, scope)),
      bankTransferDocuments: documents.filter((document) => document.documentType === 'BANK_TRANSFER_SLIP' && this.matchesShift(document, scope)),
      maemaneeDocuments: documents.filter((document) => document.documentType === 'MAEMANEE_QR_ALERT' && this.matchesShift(document, scope)),
      crmDocuments: documents.filter((document) => document.documentType === 'CRM_COUPON_RECEIPT' && this.matchesShift(document, scope)),
      debtorTransferDocuments: documents.filter((document) => document.documentType === 'DEBTOR_TRANSFER_RECEIPT' && this.matchesShift(document, scope))
    };
  }
}

export const businessMatchingEngine = new BusinessMatchingEngine();
