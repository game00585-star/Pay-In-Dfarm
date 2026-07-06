# 06 Risk Engine

## Objective

Risk Engine ใช้คำนวณความเสี่ยงของรายการ Pay-in จากเอกสาร OCR, branch input, duplicate checks และ comparison rules

## Inputs

- current payin record
- existing payin records
- aiDocuments
- documentUrls
- imageHashes
- comparisons

## Outputs

```ts
{
  riskScore: number;
  riskFlags: string[];
}
```

## Risk Flags

| Flag | Condition | Score |
| --- | --- | --- |
| POS_SUMMARY_MISSING | ไม่มีรูป POS Summary | +20 |
| PAYIN_IMAGE_MISSING | ไม่มีรูปใบ Pay-in | +20 |
| TRANSFER_SLIP_MISSING | ไม่มีรูปสลิปโอน | +20 |
| POS_CASH_PAYIN_MISMATCH | POS cashToDepositAmount ไม่ตรงกับ Pay-in amount เกิน 1 บาท | +30 |
| POS_TRANSFER_SLIP_MISMATCH | POS transferAmount + maemaneeAmount ไม่ตรงกับ Transfer slip total เกิน 1 บาท | +30 |
| POS_TOTAL_MISMATCH | totalPaidAmount ไม่ใกล้เคียง netAmount ภายใน 1 บาท | +20 |
| DATE_MISMATCH | POS saleDate ไม่ตรงกับ Pay-in date | +20 |
| LOW_AI_CONFIDENCE | AI confidence ต่ำกว่า 80 | +20 |
| DUPLICATE_REFERENCE | referenceNo ซ้ำกับรายการอื่น | +40 |
| DUPLICATE_IMAGE | imageHash ซ้ำกับรายการอื่น | +50 |

## Score Cap

คะแนนรวมต้องไม่เกิน 100

```js
riskScore = Math.min(totalScore, 100)
```

## Comparison Rules

### 1. POS Cash vs Pay-in

```text
POS_SUMMARY.cashToDepositAmount == PAYIN_SLIP.amount
```

ผลลัพธ์:

- match: ต่าง 0 บาท
- near: ต่าง <= 1 บาท
- mismatch: ต่าง > 1 บาท

Risk flag:

- mismatch เท่านั้นที่เพิ่ม `POS_CASH_PAYIN_MISMATCH`

### 2. POS Transfer vs Transfer Slip

```text
POS_SUMMARY.transferAmount + POS_SUMMARY.maemaneeAmount == TRANSFER_SLIP.totalAmount
```

ผลลัพธ์:

- match: ต่าง 0 บาท
- near: ต่าง <= 1 บาท
- mismatch: ต่าง > 1 บาท

Risk flag:

- mismatch เท่านั้นที่เพิ่ม `POS_TRANSFER_SLIP_MISMATCH`

### 3. POS Total vs Net

```text
POS_SUMMARY.totalPaidAmount ~= POS_SUMMARY.netAmount
```

ยอมรับส่วนต่างไม่เกิน 1 บาท

Risk flag:

- mismatch เท่านั้นที่เพิ่ม `POS_TOTAL_MISMATCH`

### 4. Sale Date

```text
normalize(POS_SUMMARY.saleDate) == payins.date
```

Risk flag:

- ถ้าไม่ตรง เพิ่ม `DATE_MISMATCH`

## Duplicate Rules

### Duplicate Reference

ตรวจ `referenceNo` ของ record ปัจจุบันกับ record อื่น

```text
current.referenceNo == other.referenceNo
```

### Duplicate Image

ตรวจ image hash ทั้ง 3 ประเภทกับ record อื่น

```text
current.imageHashes.* intersects other.imageHashes.*
```

## Status Recommendation

หลังคำนวณ risk:

| Condition | Status |
| --- | --- |
| riskScore >= 70 | HIGH_RISK |
| missing required document | NEED_RETAKE |
| otherwise | PENDING_ACCOUNTING |

Accounting ยังสามารถเปลี่ยน status เป็น:

- APPROVED
- RETURNED

## UI Severity

| Comparison Status | UI Color |
| --- | --- |
| match | เขียว |
| near | เหลือง |
| mismatch | แดง |

## Future Improvements

- แยก score weight เป็น config ใน Admin Settings
- เพิ่ม branch risk baseline
- เพิ่ม anomaly detection จาก historical amount
- เพิ่ม policy cutoff time สำหรับ late submission
- เพิ่ม risk explanation ภาษาไทย

