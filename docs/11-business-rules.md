# 11 Business Rules

## วัตถุประสงค์

เอกสารนี้รวบรวม Business Rule ทั้งหมดของระบบ D-FARM Pay-in AI V1 เพื่อใช้เป็นข้อกำหนดกลางสำหรับการตรวจเอกสาร การคำนวณยอด การประเมินความเสี่ยง และการตัดสินใจส่งต่อให้ Accounting/Audit

> เอกสารนี้เป็น design/spec เท่านั้น ยังไม่ใช่การแก้โค้ด

## Core Principle

POS Summary เป็นเอกสารหลักของยอดขายและยอดรับชำระ เอกสารอื่นทั้งหมดใช้เป็นหลักฐานประกอบเพื่อ reconcile ยอดตามช่องทางชำระเงิน

```text
POS Summary = Source of Truth
Supporting Documents = Proof of Settlement / Proof of Payment
Risk Engine = Rule-based discrepancy detector
Accounting = Final reviewer
Audit = Oversight and reporting
```

## Payment Channel Rules

| Payment Channel | POS Field | Required Supporting Document | Business Rule | Missing Risk Flag |
| --- | --- | --- | --- | --- |
| เงินสด | cashToDepositAmount | Pay-in | ถ้ามียอดเงินสดต้องนำฝาก ต้องมีใบ Pay-in | MISSING_REQUIRED_DOCUMENT |
| เงินโอน | transferAmount | Mobile Banking Slip | ถ้ามียอดเงินโอน ต้องมีสลิปโอน | MISSING_REQUIRED_DOCUMENT |
| แม่มณี | maemaneeAmount | QR Alert (แม่มณี) | ถ้ามียอดแม่มณี ต้องมี QR Alert | MISSING_REQUIRED_DOCUMENT |
| CRM | couponAmount | CRM Coupon | ถ้ามียอดคูปอง CRM ต้องมีใบ CRM | MISSING_REQUIRED_DOCUMENT |
| ลูกหนี้ | debtorTransferAmount | Debtor Transfer | ถ้ามียอดลูกหนี้ ต้องมีใบโอนลูกหนี้ | MISSING_REQUIRED_DOCUMENT |

## Status Rules

| Condition | Status |
| --- | --- |
| กำลังสร้างรายการและยังไม่ส่งตรวจ | DRAFT |
| กำลังตรวจ AI/OCR | AI_CHECKING |
| เอกสารสำคัญขาด หรือภาพใช้ไม่ได้ | NEED_RETAKE |
| เอกสารครบและรอตรวจบัญชี | PENDING_ACCOUNTING |
| Accounting อนุมัติ | APPROVED |
| Accounting ส่งกลับ | RETURNED |
| riskScore สูงกว่าเกณฑ์ | HIGH_RISK |
| ปิดรายการหลัง audit/period close | CLOSED |

## Global Validation Rules

| Rule ID | Rule | Severity | Risk Flag |
| --- | --- | --- | --- |
| G-001 | ทุก record ต้องมี POS Summary | High | POS_SUMMARY_MISSING |
| G-002 | ถ้า POS มี payment channel ใดมากกว่า 0 ต้องมีเอกสารประกอบของ channel นั้น | High | MISSING_REQUIRED_DOCUMENT |
| G-003 | เอกสารทุกใบต้องมี imageHash | High | IMAGE_HASH_MISSING |
| G-004 | imageHash ห้ามซ้ำกับ record อื่น | High | DUPLICATE_IMAGE |
| G-005 | referenceNo / transactionId / couponNo ห้ามซ้ำ | High | DUPLICATE_REFERENCE |
| G-006 | parser confidence ต่ำกว่า 80 ต้อง flag | Medium | LOW_AI_CONFIDENCE |
| G-007 | template detect ไม่ได้ต้องเข้า manual review | High | UNKNOWN_TEMPLATE |
| G-008 | Branch user เห็นและสร้างได้เฉพาะสาขาตัวเอง | High | ACCESS_VIOLATION |
| G-009 | ห้ามลบ Pay-in record | High | DELETE_NOT_ALLOWED |
| G-010 | ทุก update ต้องสร้าง audit log | High | AUDIT_LOG_REQUIRED |

## POS Summary Business Rules

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| POS-001 | POS Summary เป็นเอกสารบังคับ | documentUrls.POS_SUMMARY ต้องมีค่า | POS_SUMMARY_MISSING |
| POS-002 | วันที่ขายต้องตรงกับวันที่รายการ | normalize(POS.saleDate) = payin.date | DATE_MISMATCH |
| POS-003 | สาขาต้องตรงกับผู้ใช้หรือ record | POS.branchCode/branchName ต้อง match branch master | BRANCH_MISMATCH |
| POS-004 | totalPaidAmount ต้องใกล้เคียง netAmount | abs(totalPaidAmount - netAmount) <= 1 | POS_TOTAL_MISMATCH |
| POS-005 | จำนวนบิลต้องไม่ติดลบ | billCount >= 0 | INVALID_POS_FIELD |
| POS-006 | ยอดทุก field ที่เป็นเงินต้องไม่ติดลบ | amount >= 0 | INVALID_AMOUNT |
| POS-007 | cashierCode ต้องไม่ว่าง | cashierCode required | MISSING_REQUIRED_FIELD |

## Cash / Pay-in Rules

### Business Rule

ถ้า POS Summary มี `cashToDepositAmount > 0` ต้องมีเอกสาร Pay-in

### Validation

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| CASH-001 | ต้องมีใบ Pay-in เมื่อมียอดเงินสดต้องนำฝาก | cashToDepositAmount > 0 implies Pay-in exists | MISSING_REQUIRED_DOCUMENT |
| CASH-002 | ยอด Pay-in ต้องตรงกับยอดเงินสดต้องนำฝาก | abs(POS.cashToDepositAmount - Payin.payinAmount) <= 1 | POS_CASH_PAYIN_MISMATCH |
| CASH-003 | Pay-in reference ห้ามซ้ำ | payinReferenceNo unique | DUPLICATE_REFERENCE |
| CASH-004 | วันที่ Pay-in ต้องตรงหรืออยู่ใน policy | payinDate = saleDate หรืออยู่ใน deposit policy | DATE_MISMATCH |
| CASH-005 | บัญชีรับฝากต้องถูกต้อง | payinAccountNo in account whitelist | INVALID_RECEIVER_ACCOUNT |
| CASH-006 | ธนาคารต้องอยู่ในรายการที่รองรับ | bankName in bank whitelist | INVALID_BANK |

### Required Fields

- payinAmount
- payinReferenceNo
- payinDate
- bankName

### Optional Fields

- payinTime
- payinAccountNo
- depositorName
- branchBankCode

## Transfer / Mobile Banking Rules

### Business Rule

ถ้า POS Summary มี `transferAmount > 0` ต้องมี Mobile Banking Slip

### Validation

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| TRF-001 | ต้องมีสลิปโอนเมื่อมียอดเงินโอน | transferAmount > 0 implies Mobile Banking Slip exists | MISSING_REQUIRED_DOCUMENT |
| TRF-002 | ยอดรวมสลิปโอนต้องตรงกับ POS transferAmount | abs(POS.transferAmount - sum(MobileSlip.transferAmount)) <= 1 | POS_TRANSFER_SLIP_MISMATCH |
| TRF-003 | reference สลิปโอนห้ามซ้ำ | mobileReferenceNo unique | DUPLICATE_REFERENCE |
| TRF-004 | วันที่โอนต้องตรงหรืออยู่ใน settlement policy | transferDate = saleDate หรืออยู่ใน policy | DATE_MISMATCH |
| TRF-005 | บัญชีผู้รับต้องอยู่ใน whitelist | receiverAccount in account whitelist | INVALID_RECEIVER_ACCOUNT |
| TRF-006 | ยอดโอนต้องมากกว่า 0 | transferAmount > 0 | INVALID_AMOUNT |

### Required Fields

- transferAmount
- mobileReferenceNo
- transferDate
- receiverAccount

### Optional Fields

- transferTime
- senderName
- senderAccount
- receiverName
- bankName

## Maemanee / QR Alert Rules

### Business Rule

ถ้า POS Summary มี `maemaneeAmount > 0` ต้องมี QR Alert แม่มณี

### Validation

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| QR-001 | ต้องมี QR Alert เมื่อมียอดแม่มณี | maemaneeAmount > 0 implies QR Alert exists | MISSING_REQUIRED_DOCUMENT |
| QR-002 | ยอดรวม QR Alert ต้องตรงกับ POS maemaneeAmount | abs(POS.maemaneeAmount - sum(QRAlert.maemaneeAmount)) <= 1 | MAEMANEE_MISMATCH |
| QR-003 | QR transaction/reference ห้ามซ้ำ | qrReferenceNo unique | DUPLICATE_REFERENCE |
| QR-004 | merchantId ต้องตรงกับสาขา | merchantId maps to branch | MERCHANT_MISMATCH |
| QR-005 | วันที่ alert ต้องตรงหรืออยู่ใน settlement policy | alertDate = saleDate หรืออยู่ใน policy | DATE_MISMATCH |
| QR-006 | ยอดแม่มณีต้องมากกว่า 0 | maemaneeAmount > 0 | INVALID_AMOUNT |

### Required Fields

- maemaneeAmount
- qrReferenceNo
- alertDate
- merchantId

### Optional Fields

- alertTime
- merchantName
- terminalId
- payerName
- bankName

## CRM Coupon Rules

### Business Rule

ถ้า POS Summary มี `couponAmount > 0` ต้องมีเอกสาร CRM Coupon

### Validation

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| CRM-001 | ต้องมีใบ CRM เมื่อมียอดคูปอง | couponAmount > 0 implies CRM Coupon exists | MISSING_REQUIRED_DOCUMENT |
| CRM-002 | ยอดรวม CRM Coupon ต้องตรงกับ POS couponAmount | abs(POS.couponAmount - sum(CRM.couponAmount)) <= 1 | CRM_COUPON_MISMATCH |
| CRM-003 | couponNo ห้ามซ้ำ | couponNo unique | DUPLICATE_REFERENCE |
| CRM-004 | couponDate ต้องตรงกับ saleDate | couponDate = saleDate | DATE_MISMATCH |
| CRM-005 | campaignCode ต้อง valid ถ้ามี | campaignCode in campaign master | INVALID_CAMPAIGN |
| CRM-006 | branchCode ต้องตรงกับสาขา | CRM.branchCode = POS.branchCode | BRANCH_MISMATCH |

### Required Fields

- couponAmount
- couponNo
- couponDate
- branchCode

### Optional Fields

- campaignCode
- customerId
- approvalCode
- cashierCode

## Debtor Transfer Rules

### Business Rule

ถ้า POS Summary มี `debtorTransferAmount > 0` ต้องมี Debtor Transfer document

### Validation

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| DEBT-001 | ต้องมีใบโอนลูกหนี้เมื่อมียอดลูกหนี้ | debtorTransferAmount > 0 implies Debtor Transfer exists | MISSING_REQUIRED_DOCUMENT |
| DEBT-002 | ยอดรวมใบโอนลูกหนี้ต้องตรงกับ POS debtorTransferAmount | abs(POS.debtorTransferAmount - sum(DebtorTransfer.amount)) <= 1 | DEBTOR_TRANSFER_MISMATCH |
| DEBT-003 | reference ห้ามซ้ำ | debtorReferenceNo unique | DUPLICATE_REFERENCE |
| DEBT-004 | วันที่โอนต้องตรงหรืออยู่ใน settlement policy | debtorTransferDate = saleDate หรืออยู่ใน policy | DATE_MISMATCH |
| DEBT-005 | บัญชีรับเงินต้องอยู่ใน whitelist | debtorReceiverAccount in account whitelist | INVALID_RECEIVER_ACCOUNT |
| DEBT-006 | debtorCode ต้อง valid ถ้ามี debtor master | debtorCode in debtor master | INVALID_DEBTOR |

### Required Fields

- debtorTransferAmount
- debtorReferenceNo
- debtorTransferDate
- debtorReceiverAccount

### Optional Fields

- debtorTransferTime
- debtorName
- debtorCode
- senderAccount
- bankName

## Missing Required Document Rules

## Definition

Missing Required Document หมายถึง POS Summary มีจำนวนเงินใน payment channel นั้นมากกว่า 0 แต่ไม่มีเอกสารประกอบที่จำเป็น

## Rule Matrix

| Condition | Required Document | Risk Flag | Suggested Status |
| --- | --- | --- | --- |
| cashToDepositAmount > 0 และไม่มี Pay-in | Pay-in | MISSING_REQUIRED_DOCUMENT | NEED_RETAKE |
| transferAmount > 0 และไม่มี Mobile Banking Slip | Mobile Banking Slip | MISSING_REQUIRED_DOCUMENT | NEED_RETAKE |
| maemaneeAmount > 0 และไม่มี QR Alert | QR Alert (แม่มณี) | MISSING_REQUIRED_DOCUMENT | NEED_RETAKE |
| couponAmount > 0 และไม่มี CRM Coupon | CRM Coupon | MISSING_REQUIRED_DOCUMENT | NEED_RETAKE |
| debtorTransferAmount > 0 และไม่มี Debtor Transfer | Debtor Transfer | MISSING_REQUIRED_DOCUMENT | NEED_RETAKE |
| ไม่มี POS Summary | POS Summary | POS_SUMMARY_MISSING | NEED_RETAKE |

## Amount Reconciliation Rules

| Rule ID | Formula | Tolerance | Risk Flag |
| --- | --- | --- | --- |
| REC-001 | POS.totalPaidAmount = POS.netAmount | <= 1 บาท | POS_TOTAL_MISMATCH |
| REC-002 | POS.cashToDepositAmount = Payin.payinAmount | <= 1 บาท | POS_CASH_PAYIN_MISMATCH |
| REC-003 | POS.transferAmount = sum(MobileSlip.transferAmount) | <= 1 บาท | POS_TRANSFER_SLIP_MISMATCH |
| REC-004 | POS.maemaneeAmount = sum(QRAlert.maemaneeAmount) | <= 1 บาท | MAEMANEE_MISMATCH |
| REC-005 | POS.couponAmount = sum(CRM.couponAmount) | <= 1 บาท | CRM_COUPON_MISMATCH |
| REC-006 | POS.debtorTransferAmount = sum(DebtorTransfer.amount) | <= 1 บาท | DEBTOR_TRANSFER_MISMATCH |

## Date Validation Rules

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| DATE-001 | POS saleDate ต้องตรงกับ payin.date | normalize(POS.saleDate) = payin.date | DATE_MISMATCH |
| DATE-002 | Pay-in date ต้องตรงกับ saleDate หรือ deposit policy | payinDate in allowed deposit window | DATE_MISMATCH |
| DATE-003 | Transfer date ต้องตรงกับ saleDate หรือ settlement policy | transferDate in allowed settlement window | DATE_MISMATCH |
| DATE-004 | QR alert date ต้องตรงกับ saleDate หรือ settlement policy | alertDate in allowed settlement window | DATE_MISMATCH |
| DATE-005 | CRM coupon date ต้องตรงกับ saleDate | couponDate = saleDate | DATE_MISMATCH |
| DATE-006 | Debtor transfer date ต้องตรงกับ saleDate หรือ settlement policy | debtorTransferDate in allowed settlement window | DATE_MISMATCH |

## Duplicate Validation Rules

| Rule ID | Field | Scope | Risk Flag |
| --- | --- | --- | --- |
| DUP-001 | imageHash | ทุกเอกสารทุก record | DUPLICATE_IMAGE |
| DUP-002 | payinReferenceNo | Pay-in documents | DUPLICATE_REFERENCE |
| DUP-003 | mobileReferenceNo | Mobile Banking slips | DUPLICATE_REFERENCE |
| DUP-004 | qrReferenceNo | QR Alert documents | DUPLICATE_REFERENCE |
| DUP-005 | couponNo | CRM Coupon documents | DUPLICATE_REFERENCE |
| DUP-006 | debtorReferenceNo | Debtor Transfer documents | DUPLICATE_REFERENCE |

## Template Validation Rules

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| TMP-001 | เอกสารต้อง detect template ได้ | templateConfidence >= threshold | UNKNOWN_TEMPLATE |
| TMP-002 | template version ต้อง active | templateVersion active in template registry | INVALID_TEMPLATE_VERSION |
| TMP-003 | document type ต้องตรงกับช่อง upload | detectedCategory matches expected channel | DOCUMENT_TYPE_MISMATCH |
| TMP-004 | Unknown Template ห้าม auto approve | status must require review | UNKNOWN_TEMPLATE |

## AI/OCR Validation Rules

| Rule ID | Rule | Validation | Risk Flag |
| --- | --- | --- | --- |
| OCR-001 | parser confidence ต้องไม่ต่ำกว่า 80 | confidence >= 80 | LOW_AI_CONFIDENCE |
| OCR-002 | required fields ต้องอ่านได้ครบ | requiredFields all present | MISSING_REQUIRED_FIELD |
| OCR-003 | amount fields ต้องเป็นตัวเลข | amount parse success | INVALID_AMOUNT |
| OCR-004 | date fields ต้อง parse ได้ | date parse success | INVALID_DATE |
| OCR-005 | reference fields ต้องไม่ว่าง | reference exists for required documents | MISSING_REFERENCE |

## Risk Scoring Guidelines

| Risk Group | Example Flags | Suggested Score |
| --- | --- | --- |
| Missing document | MISSING_REQUIRED_DOCUMENT, POS_SUMMARY_MISSING | +20 ถึง +40 |
| Amount mismatch | POS_CASH_PAYIN_MISMATCH, MAEMANEE_MISMATCH | +20 ถึง +40 |
| Date mismatch | DATE_MISMATCH | +10 ถึง +20 |
| Duplicate | DUPLICATE_REFERENCE, DUPLICATE_IMAGE | +40 ถึง +50 |
| OCR quality | LOW_AI_CONFIDENCE, UNKNOWN_TEMPLATE | +20 ถึง +40 |
| Access/security | ACCESS_VIOLATION, DELETE_NOT_ALLOWED | High severity, block action |

## Status Decision Rules

| Condition | Decision |
| --- | --- |
| มี access/security violation | Block action |
| ขาด POS Summary | NEED_RETAKE |
| ขาดเอกสารประกอบของช่องทางที่มียอด | NEED_RETAKE |
| template unknown | NEED_RETAKE หรือ HIGH_RISK ตาม policy |
| riskScore >= 70 | HIGH_RISK |
| เอกสารครบและ riskScore < 70 | PENDING_ACCOUNTING |
| Accounting approve | APPROVED |
| Accounting return | RETURNED |

## Accounting Approval Rules

Accounting ควรอนุมัติได้เมื่อ:

- เอกสารบังคับครบ
- ไม่มี duplicate reference/image
- ยอด reconcile ผ่าน หรือมี comment อธิบายส่วนต่าง
- วันที่อยู่ใน policy
- account/merchant/branch mapping ถูกต้อง
- risk flags ที่ยังเหลือได้รับการพิจารณาแล้ว

Accounting ควรส่งกลับเมื่อ:

- เอกสารขาด
- ภาพอ่านไม่ได้
- ยอดต่างเกิน tolerance โดยไม่มีคำอธิบาย
- ใช้เอกสารผิดประเภท
- reference/image ซ้ำ
- branch/date ไม่ตรง

## Audit Rules

| Rule ID | Rule |
| --- | --- |
| AUD-001 | ทุก create/update/review ต้องมี audit log |
| AUD-002 | audit log ห้ามแก้ไข |
| AUD-003 | audit log ห้ามลบ |
| AUD-004 | Audit ต้องเห็นทุกสาขา |
| AUD-005 | Branch ห้ามเห็น audit log ของสาขาอื่น |
| AUD-006 | Export Excel ต้องรวม riskScore, riskFlags, status และ key OCR fields |

## Master Data Required

เพื่อให้ validation สมบูรณ์ ควรมี master data:

- Branch master
- User master
- Bank whitelist
- Receiver account whitelist
- Merchant mapping สำหรับแม่มณี
- Terminal/till mapping
- Campaign master สำหรับ CRM
- Debtor master
- Template registry

## Business Rule Summary

| Channel | Must Have | Must Match | Missing Result |
| --- | --- | --- | --- |
| เงินสด | Pay-in | cashToDepositAmount = payinAmount | Risk: Missing Required Document |
| เงินโอน | Mobile Banking Slip | transferAmount = sum(transfer slips) | Risk: Missing Required Document |
| แม่มณี | QR Alert | maemaneeAmount = sum(QR alerts) | Risk: Missing Required Document |
| CRM | CRM Coupon | couponAmount = sum(CRM coupons) | Risk: Missing Required Document |
| ลูกหนี้ | Debtor Transfer | debtorTransferAmount = sum(debtor transfers) | Risk: Missing Required Document |

