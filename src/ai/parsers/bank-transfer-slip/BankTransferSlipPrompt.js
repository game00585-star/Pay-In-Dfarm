export class BankTransferSlipPrompt {
  build({ ocrText = '', detectedBank = 'UNKNOWN', detectedTemplate = 'Unknown Bank Slip' } = {}) {
    return [
      'You are a local bank transfer slip parser.',
      'Return only valid JSON. Do not include markdown.',
      'Document type: BANK_TRANSFER_SLIP.',
      `Detected bank hint: ${detectedBank}.`,
      `Detected template hint: ${detectedTemplate}.`,
      'Extract transferAmount, transferDate, transferTime, referenceNo, bankName, fromBank, fromAccountName, fromAccountNoMasked, toBank, toAccountName, toAccountNoMasked, promptPayId, transactionId, qrRef, confidence.',
      'Use numbers for amounts. Use ISO date and HH:mm:ss when possible.',
      'Normalize bank names to KBANK, SCB, KTB, BBL, BAY, GSB, PROMPTPAY, or UNKNOWN when possible.',
      `OCR text:\n${ocrText}`,
      'JSON schema: {"documentType":"BANK_TRANSFER_SLIP","confidence":0,"fields":{},"fieldConfidence":{},"warnings":[]}'
    ].join('\n');
  }
}

export const bankTransferSlipPrompt = new BankTransferSlipPrompt();
