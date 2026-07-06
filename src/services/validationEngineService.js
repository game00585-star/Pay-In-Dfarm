import { DOCUMENT_TYPES } from '../domain/constants/documentTypes.js';
import { RISK_FLAGS } from '../domain/constants/riskFlags.js';
import { ValidationEngine } from '../domain/interfaces/validationEngine.js';

const requiredFieldsByDocumentType = {
  [DOCUMENT_TYPES.POS_SUMMARY]: ['branchCode', 'branchName', 'saleDate', 'netAmount', 'totalPaidAmount', 'cashToDepositAmount'],
  [DOCUMENT_TYPES.PAYIN]: ['payinAmount', 'referenceNo', 'payinDate', 'bankName'],
  [DOCUMENT_TYPES.PAYIN_SLIP]: ['payinAmount', 'referenceNo', 'payinDate', 'bankName'],
  [DOCUMENT_TYPES.MOBILE_BANKING_SLIP]: ['amount', 'referenceNo', 'date'],
  [DOCUMENT_TYPES.TRANSFER_SLIP]: ['amount', 'referenceNo', 'date'],
  [DOCUMENT_TYPES.QR_ALERT_MAEMANEE]: ['amount', 'referenceNo', 'date'],
  [DOCUMENT_TYPES.CRM_COUPON]: ['amount', 'referenceNo', 'date'],
  [DOCUMENT_TYPES.DEBTOR_TRANSFER]: ['amount', 'referenceNo', 'date']
};

const tolerance = 1;

function sumDocuments(documents, predicate, field) {
  return documents
    .filter(predicate)
    .reduce((sum, document) => sum + Number(document.parsedData?.[field] || 0), 0);
}

function compareAmounts({ key, label, expected, actual }) {
  const difference = Number((Number(expected || 0) - Number(actual || 0)).toFixed(2));
  const abs = Math.abs(difference);
  return {
    key,
    label,
    expected: Number(expected || 0),
    actual: Number(actual || 0),
    difference,
    status: abs === 0 ? 'PASS' : abs <= tolerance ? 'WARN' : 'FAIL'
  };
}

function isDateInRange(documentDate, saleDate) {
  if (!documentDate || !saleDate) return false;
  const documentTime = new Date(`${documentDate}T00:00:00`).getTime();
  const saleTime = new Date(`${saleDate}T00:00:00`).getTime();
  const diffDays = Math.abs(documentTime - saleTime) / (24 * 60 * 60 * 1000);
  return diffDays <= 1;
}

export class ValidationEngineService extends ValidationEngine {
  validateDocument(document) {
    const flags = [];
    const requiredFields = requiredFieldsByDocumentType[document.documentType] || [];
    for (const field of requiredFields) {
      if (document.fields?.[field] === undefined || document.fields?.[field] === '') {
        flags.push(RISK_FLAGS.MISSING_REQUIRED_FIELD);
        break;
      }
    }
    if ((document.confidence || document.parserConfidence || 0) < 80) {
      flags.push(RISK_FLAGS.LOW_AI_CONFIDENCE);
    }
    return { valid: flags.length === 0, flags };
  }

  validatePayinRecord(record) {
    const flags = [];
    const documents = record.documents || [];
    const posDocument = documents.find((document) => document.documentType === DOCUMENT_TYPES.POS_SUMMARY);
    const pos = posDocument?.parsedData || {};

    if (!posDocument) {
      flags.push(RISK_FLAGS.POS_SUMMARY_MISSING);
    }

    const comparisons = [
      compareAmounts({
        key: 'cash',
        label: 'เงินสด: POS cashAmount vs Pay-in',
        expected: pos.cashAmount,
        actual: sumDocuments(documents, (document) => document.documentType?.startsWith('PAYIN_'), 'payinCashAmount')
      }),
      compareAmounts({
        key: 'debtorTransfer',
        label: 'โอนเข้าบัญชีลูกหนี้',
        expected: pos.debtorAccountTransferAmount,
        actual: sumDocuments(documents, (document) => document.documentType === 'DEBTOR_TRANSFER_RECEIPT', 'debtorTransferAmount')
      }),
      compareAmounts({
        key: 'bankTransfer',
        label: 'เงินโอน',
        expected: pos.bankTransferAmount,
        actual: sumDocuments(documents, (document) => document.documentType === 'BANK_TRANSFER_SLIP', 'bankTransferAmount')
      }),
      compareAmounts({
        key: 'maemaneeTransfer',
        label: 'เงินโอน-แม่มณี',
        expected: pos.maemaneeTransferAmount,
        actual: sumDocuments(documents, (document) => document.documentType === 'MAEMANEE_QR_ALERT', 'maemaneeTransferAmount')
      }),
      compareAmounts({
        key: 'crmCoupon',
        label: 'คูปองส่วนลด CRM',
        expected: pos.crmCouponAmount,
        actual: sumDocuments(documents, (document) => document.documentType === 'CRM_COUPON_RECEIPT', 'crmCouponAmount')
      })
    ];

    const actualTotal = comparisons.reduce((sum, item) => sum + Number(item.actual || 0), 0);
    const totalComparison = compareAmounts({
      key: 'totalPaymentAmount',
      label: 'ผลรวมทุกช่องทาง',
      expected: pos.totalPaymentAmount,
      actual: actualTotal
    });

    const dateResults = documents.map((document) => ({
      documentId: document.id,
      documentType: document.documentType,
      documentDate: document.parsedData?.documentDate || document.parsedData?.saleDate || '',
      saleDate: pos.saleDate || record.date,
      status: isDateInRange(document.parsedData?.documentDate || document.parsedData?.saleDate, pos.saleDate || record.date) ? 'PASS' : 'FAIL'
    }));

    for (const comparison of [...comparisons, totalComparison]) {
      if (comparison.status === 'FAIL') flags.push(RISK_FLAGS.INVALID_AMOUNT);
    }

    if (totalComparison.status === 'FAIL') {
      flags.push(RISK_FLAGS.PAYMENT_TOTAL_MISMATCH);
    }

    if (dateResults.some((result) => result.status === 'FAIL')) {
      flags.push(RISK_FLAGS.DATE_MISMATCH);
    }

    return {
      valid: flags.length === 0,
      flags: [...new Set(flags)],
      comparisons,
      totalComparison,
      dateResults
    };
  }
}
