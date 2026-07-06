# 04 Document Types

## Overview

ระบบรองรับเอกสาร 3 ประเภท โดยแยก parser และ output fields ตาม Document Type

| Document Type | ชื่อเอกสาร | บังคับ | หน้าที่ |
| --- | --- | --- | --- |
| POS_SUMMARY | รูปสรุปยอด POS | Yes | อ่านยอดขาย, ยอดรับชำระ, ยอดเงินสดนำฝาก |
| PAYIN_SLIP | ใบ Pay-in | Yes | อ่านยอดเงินนำฝากและเลขอ้างอิง |
| TRANSFER_SLIP | สลิปโอน | Yes | อ่านยอดโอนรวม |

## POS_SUMMARY

เอกสารหลักที่ใช้เป็น source of truth สำหรับยอดขายและยอดนำฝาก

### Fields ที่ต้องอ่าน

| Field | Type | Description |
| --- | --- | --- |
| branchCode | string | รหัสสาขา |
| branchName | string | ชื่อสาขา |
| saleDate | string | วันที่ขาย จาก POS Summary |
| closeTime | string | เวลาปิดกะ/ปิดยอด |
| till | string | หมายเลขเครื่อง/ลิ้นชัก |
| taxId | string | เลขประจำตัวผู้เสียภาษี |
| registerNo | string | เลขทะเบียน/เลขที่เครื่อง |
| billCount | number | จำนวนบิล |
| grossAmount | number | ยอดขายก่อนหักส่วนลด |
| discountAmount | number | ส่วนลดรวม |
| netAmount | number | ยอดสุทธิ |
| cashAmount | number | ยอดรับชำระเงินสด |
| debtorTransferAmount | number | ยอดโอนเข้าบัญชีลูกหนี้ |
| transferAmount | number | ยอดโอน |
| maemaneeAmount | number | ยอดเงินโอนแม่มณี |
| couponAmount | number | ยอดคูปอง |
| totalPaidAmount | number | ยอดชำระรวม |
| cashToDepositAmount | number | ยอดเงินสดต้องนำส่ง |
| cashierCode | string | รหัสพนักงานปิดยอด |

### Validation

- saleDate ต้องตรงกับ `payins.date`
- totalPaidAmount ต้องใกล้เคียง netAmount ไม่เกิน 1 บาท
- cashToDepositAmount ต้องตรงกับยอด Pay-in slip
- transferAmount + maemaneeAmount ต้องตรงกับยอด Transfer slip

## PAYIN_SLIP

เอกสารยืนยันยอดเงินสดนำฝาก

### Fields ที่ต้องอ่าน

| Field | Type | Description |
| --- | --- | --- |
| amount | number | ยอดเงินในใบ Pay-in |
| referenceNo | string | เลขอ้างอิง |
| bankName | string | ธนาคาร |
| date | string | วันที่ทำรายการ |

### Validation

- amount ต้องตรงกับ POS_SUMMARY.cashToDepositAmount
- referenceNo ห้ามซ้ำกับ record อื่น
- date ควรตรงกับ payin date หรืออยู่ใน policy ที่กำหนด

## TRANSFER_SLIP

เอกสารยืนยันยอดโอนรวม

### Fields ที่ต้องอ่าน

| Field | Type | Description |
| --- | --- | --- |
| totalAmount | number | ยอดโอนรวม |
| referenceNo | string | เลขอ้างอิงสลิปโอน |
| date | string | วันที่สลิปโอน |

### Validation

- totalAmount ต้องตรงกับ POS_SUMMARY.transferAmount + POS_SUMMARY.maemaneeAmount
- referenceNo ควรตรวจ duplicate ในอนาคต
- date ควรตรงกับ payin date หรืออยู่ใน policy ที่กำหนด

## Document Storage Path

แนะนำ path ใน Firebase Storage:

```text
payins/{payinId}/pos-summary-{timestamp}-{filename}
payins/{payinId}/payin-slip-{timestamp}-{filename}
payins/{payinId}/transfer-slip-{timestamp}-{filename}
```

## Document Metadata

ควรเก็บ metadata ต่อเอกสาร:

| Field | Type | Description |
| --- | --- | --- |
| documentType | string | POS_SUMMARY, PAYIN_SLIP, TRANSFER_SLIP |
| url | string | Storage download URL |
| imageHash | string | SHA-256 hash |
| uploadedAt | timestamp/string | เวลา upload |
| parserStatus | string | PENDING, READ, FAILED |
| parserConfidence | number | OCR confidence |

