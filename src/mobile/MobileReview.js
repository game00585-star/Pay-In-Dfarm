export class MobileReview {
  listPending(records = [], query = '') {
    const text = query.toLowerCase();
    return records
      .filter((record) => ['PENDING_ACCOUNTING', 'HIGH_RISK', 'RETURNED', 'NEED_RETAKE'].includes(record.status))
      .filter((record) => !text || [record.branch, record.date, record.shift, record.referenceNo, record.status].join(' ').toLowerCase().includes(text));
  }
}

export const mobileReview = new MobileReview();
