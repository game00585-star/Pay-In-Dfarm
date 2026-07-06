const promptByDocumentType = {
  POS_SUMMARY: 'Extract POS summary fields: branchCode, branchName, saleDate, closeTime, till, billCount, grossAmount, discountAmount, netAmount, cashAmount, debtorTransferAmount, transferAmount, maemaneeAmount, couponAmount, totalPaidAmount, cashToDepositAmount, cashierCode.',
  PAYIN: 'Extract pay-in fields: bankName, referenceNo, payinDate, payinAmount, branchCode, accountNo.',
  PAYIN_BANK_COUNTER: 'Extract pay-in counter fields: bankName, referenceNo, payinDate, payinAmount, branchCode, accountNo.',
  PAYIN_ATM: 'Extract ATM pay-in fields: bankName, referenceNo, payinDate, payinAmount, atmId, accountNo.',
  PAYIN_COUNTER_SERVICE: 'Extract counter service pay-in fields: referenceNo, payinDate, payinAmount, serviceBranch.',
  PAYIN_LOTUS: 'Extract Lotus pay-in fields: referenceNo, payinDate, payinAmount, branchName.',
  BANK_TRANSFER_SLIP: 'Extract bank transfer slip fields: bankName, referenceNo, transferDate, amount, senderAccount, receiverAccount.',
  MAEMANEE_QR_ALERT: 'Extract MaeManee QR alert fields: merchantId, referenceNo, transferDate, amount.',
  CRM_COUPON_RECEIPT: 'Extract CRM coupon receipt fields: couponNo, receiptDate, amount, campaignName.',
  DEBTOR_TRANSFER_RECEIPT: 'Extract debtor transfer receipt fields: debtorCode, referenceNo, transferDate, amount.',
  UNKNOWN: 'Identify the document type and extract any visible dates, amounts, reference numbers, bank names, branch names, and warnings.'
};

export class OllamaPromptBuilder {
  build({ documentType = 'UNKNOWN' } = {}) {
    const instruction = promptByDocumentType[documentType] || promptByDocumentType.UNKNOWN;
    return [
      'You are a local document vision extractor running inside Ollama.',
      'Return only valid JSON. Do not include markdown.',
      `Document type hint: ${documentType}.`,
      instruction,
      'JSON schema: {"documentType":"","confidence":0,"fields":{},"warnings":[]}.',
      'If a field is not visible, omit it or set an empty string.'
    ].join('\n');
  }
}

export const ollamaPromptBuilder = new OllamaPromptBuilder();
