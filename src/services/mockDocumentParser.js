const today = () => new Date().toISOString().slice(0, 10);

const channelAmounts = Object.freeze({
  cashAmount: 335.75,
  debtorAccountTransferAmount: 2572.00,
  bankTransferAmount: 4473.00,
  maemaneeTransferAmount: 20422.00,
  crmCouponAmount: 60.00
});

function totalPaymentAmount() {
  return Object.values(channelAmounts).reduce((sum, amount) => sum + amount, 0);
}

function baseParsed(documentType, imageFile) {
  return {
    documentType,
    fileName: imageFile?.name || '',
    parsedAt: new Date().toISOString(),
    confidence: 88,
    documentDate: today(),
    referenceNo: `${documentType}-${Date.now().toString().slice(-8)}`
  };
}

export async function parseDocument(documentType, imageFile) {
  const base = baseParsed(documentType, imageFile);

  if (documentType === 'POS_SUMMARY') {
    return {
      ...base,
      saleDate: today(),
      branchCode: '00074',
      branchName: 'D-FARM Bangkok 01',
      cashAmount: channelAmounts.cashAmount,
      debtorAccountTransferAmount: channelAmounts.debtorAccountTransferAmount,
      bankTransferAmount: channelAmounts.bankTransferAmount,
      maemaneeTransferAmount: channelAmounts.maemaneeTransferAmount,
      crmCouponAmount: channelAmounts.crmCouponAmount,
      totalPaymentAmount: totalPaymentAmount()
    };
  }

  if (documentType.startsWith('PAYIN_')) {
    return {
      ...base,
      payinCashAmount: channelAmounts.cashAmount,
      bankName: documentType.includes('LOTUS') ? 'Lotus' : documentType.includes('COUNTER_SERVICE') ? 'Counter Service' : 'SCB'
    };
  }

  if (documentType === 'DEBTOR_TRANSFER_RECEIPT') {
    return { ...base, debtorTransferAmount: channelAmounts.debtorAccountTransferAmount };
  }

  if (documentType === 'BANK_TRANSFER_SLIP') {
    return { ...base, bankTransferAmount: channelAmounts.bankTransferAmount };
  }

  if (documentType === 'MAEMANEE_QR_ALERT') {
    return { ...base, maemaneeTransferAmount: channelAmounts.maemaneeTransferAmount, merchantId: 'SCB-MM-00074' };
  }

  if (documentType === 'CRM_COUPON_RECEIPT') {
    return { ...base, crmCouponAmount: channelAmounts.crmCouponAmount, couponNo: `CRM-${Date.now().toString().slice(-6)}` };
  }

  return { ...base, confidence: 50 };
}

