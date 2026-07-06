# 09 Document Analysis

## วัตถุประสงค์ของเอกสาร

เอกสารนี้วิเคราะห์เอกสารที่เกี่ยวข้องกับระบบ D-FARM Pay-in AI V1 ทั้งหมด เพื่อกำหนดว่าเอกสารแต่ละประเภทใช้ทำอะไร ต้องอ่าน field ใด ใช้ตรวจสอบกับอะไร ใช้คำนวณยอดใด มีความเสี่ยงอะไร และควรมี validation rule อย่างไร

> หมายเหตุ: เอกสารนี้เป็นการวิเคราะห์ก่อนพัฒนาเพิ่มเติม ยังไม่ใช่การเพิ่ม feature หรือแก้โค้ด

## ประเภทเอกสารในระบบ

| No. | Document Type | ชื่อเอกสาร | บทบาทในระบบ |
| --- | --- | --- | --- |
| 1 | POS_SUMMARY | POS Summary | เอกสารหลักของยอดขายและยอดรับชำระ |
| 2 | PAYIN | Pay-in | เอกสารยืนยันการนำเงินสดฝากธนาคาร |
| 3 | MOBILE_BANKING_SLIP | Mobile Banking Slip | เอกสารยืนยันรายการโอนเงินผ่าน Mobile Banking |
| 4 | QR_ALERT_MAEMANEE | QR Alert (แม่มณี) | เอกสารยืนยันยอดรับชำระผ่าน QR/แม่มณี |
| 5 | DEBTOR_TRANSFER | Debtor Transfer | เอกสารยืนยันยอดโอนเข้าบัญชีลูกหนี้ |
| 6 | CRM_COUPON | CRM Coupon | เอกสารยืนยันยอดคูปอง/ส่วนลด CRM |

## 1. POS Summary

### วัตถุประสงค์

POS Summary เป็นเอกสารหลักที่ใช้เป็น source of truth สำหรับยอดขาย ยอดรับชำระแยกประเภท และยอดเงินสดที่ต้องนำฝาก เป็นเอกสารตั้งต้นสำหรับเทียบกับเอกสารอื่นทั้งหมด

### ข้อมูลที่ต้องอ่าน

- branchCode
- branchName
- saleDate
- closeTime
- till
- taxId
- registerNo
- billCount
- grossAmount
- discountAmount
- netAmount
- cashAmount
- debtorTransferAmount
- transferAmount
- maemaneeAmount
- couponAmount
- totalPaidAmount
- cashToDepositAmount
- cashierCode

### ข้อมูลที่ใช้ตรวจสอบ

- branchCode, branchName เทียบกับ branch ในระบบ
- saleDate เทียบกับวันที่รายการ Pay-in
- cashToDepositAmount เทียบกับยอดใน Pay-in
- transferAmount เทียบกับ Mobile Banking Slip
- maemaneeAmount เทียบกับ QR Alert แม่มณี
- debtorTransferAmount เทียบกับ Debtor Transfer
- couponAmount เทียบกับ CRM Coupon
- totalPaidAmount เทียบกับ netAmount
- billCount ใช้ตรวจความผิดปกติของ transaction volume

### ข้อมูลที่ใช้คำนวณ

- expectedPaidTotal = cashAmount + debtorTransferAmount + transferAmount + maemaneeAmount + couponAmount
- expectedTransferTotal = transferAmount + maemaneeAmount
- expectedDocumentTotal = cashToDepositAmount + debtorTransferAmount + transferAmount + maemaneeAmount + couponAmount
- totalMismatch = totalPaidAmount - netAmount
- cashDepositMismatch = cashToDepositAmount - payin.amount

### ความเสี่ยง

- OCR อ่านยอดผิดจากกระดาษยาวหรือภาพเอียง
- saleDate เป็นปี พ.ศ. ต้อง normalize เป็น ค.ศ.
- ยอด totalPaidAmount อาจต่าง netAmount เล็กน้อยจาก rounding
- cashAmount ไม่จำเป็นต้องเท่ากับ cashToDepositAmount เพราะอาจมีเงินทอน/แบงก์ย่อย
- เอกสารอาจถูกใช้ซ้ำในหลาย record
- สาขาอาจอัปโหลด POS Summary ผิดวันหรือผิดกะ

### Validation Rule

- ต้องมี POS Summary ทุก record
- saleDate หลัง normalize ต้องตรงกับ payin.date
- branchCode หรือ branchName ต้องตรงกับ branch ที่ login
- totalPaidAmount ต้องต่างจาก netAmount ไม่เกิน 1 บาท
- cashToDepositAmount ต้องตรงกับยอด Pay-in ไม่เกิน tolerance ที่กำหนด
- transferAmount ต้อง reconcile กับ Mobile Banking Slip
- maemaneeAmount ต้อง reconcile กับ QR Alert แม่มณี
- debtorTransferAmount ต้อง reconcile กับ Debtor Transfer
- couponAmount ต้อง reconcile กับ CRM Coupon
- imageHash ห้ามซ้ำกับ record อื่น

### Required Field

- branchCode
- branchName
- saleDate
- closeTime
- till
- billCount
- netAmount
- cashAmount
- debtorTransferAmount
- transferAmount
- maemaneeAmount
- couponAmount
- totalPaidAmount
- cashToDepositAmount
- cashierCode

### Optional Field

- taxId
- registerNo
- grossAmount
- discountAmount

## 2. Pay-in

### วัตถุประสงค์

Pay-in เป็นหลักฐานว่าสาขานำเงินสดฝากธนาคารแล้ว ใช้ยืนยันยอด cashToDepositAmount จาก POS Summary

### ข้อมูลที่ต้องอ่าน

- payinAmount
- referenceNo
- bankName
- payinDate
- payinTime
- accountNo
- depositorName
- branchBankCode

### ข้อมูลที่ใช้ตรวจสอบ

- payinAmount เทียบกับ POS Summary.cashToDepositAmount
- referenceNo ตรวจ duplicate
- payinDate เทียบกับ saleDate/payin.date
- bankName เทียบกับ bank ที่ระบบกำหนด
- accountNo เทียบกับบัญชีรับฝากของบริษัท

### ข้อมูลที่ใช้คำนวณ

- cashPayinDifference = POS Summary.cashToDepositAmount - payinAmount
- depositDelayHours = payinDateTime - POS closeDateTime

### ความเสี่ยง

- ยอดฝากเงินสดไม่ตรงกับยอดที่ต้องนำฝาก
- ใช้ใบ Pay-in ซ้ำ
- อัปโหลดใบ Pay-in ของสาขาอื่น
- อัปโหลดใบ Pay-in ผิดวัน
- เลขอ้างอิงถูก OCR ผิด
- ฝากเข้าบัญชีผิด

### Validation Rule

- ต้องมี Pay-in document ทุก record ที่มี cashToDepositAmount > 0
- payinAmount ต้องตรงกับ cashToDepositAmount ไม่เกิน tolerance
- referenceNo ห้ามซ้ำ
- payinDate ต้องตรงกับ saleDate หรืออยู่ใน policy ที่กำหนด เช่น วันถัดไป
- accountNo ต้องอยู่ใน whitelist
- imageHash ห้ามซ้ำ

### Required Field

- payinAmount
- referenceNo
- bankName
- payinDate

### Optional Field

- payinTime
- accountNo
- depositorName
- branchBankCode

## 3. Mobile Banking Slip

### วัตถุประสงค์

Mobile Banking Slip เป็นหลักฐานยอดโอนปกติที่ไม่ใช่ QR แม่มณีและไม่ใช่โอนเข้าบัญชีลูกหนี้ ใช้ตรวจยอด POS Summary.transferAmount

### ข้อมูลที่ต้องอ่าน

- transferAmount
- referenceNo
- transferDate
- transferTime
- senderName
- senderAccount
- receiverName
- receiverAccount
- bankName

### ข้อมูลที่ใช้ตรวจสอบ

- transferAmount เทียบกับ POS Summary.transferAmount
- referenceNo ตรวจ duplicate
- transferDate เทียบกับ saleDate/payin.date
- receiverAccount เทียบกับบัญชีบริษัท
- receiverName เทียบกับชื่อนิติบุคคล

### ข้อมูลที่ใช้คำนวณ

- mobileTransferDifference = POS Summary.transferAmount - sum(Mobile Banking Slip.transferAmount)
- transferDelayHours = transferDateTime - POS closeDateTime

### ความเสี่ยง

- สลิปโอนซ้ำ
- สลิปปลอม/แก้ไขภาพ
- โอนเข้าบัญชีผิด
- ยอดโอนไม่ครบ
- สลิปคนละวัน
- OCR อ่านยอดหรือ reference ผิด

### Validation Rule

- ถ้า POS Summary.transferAmount > 0 ต้องมี Mobile Banking Slip หรือ reconciliation source ที่เทียบได้
- sum(transferAmount) ต้องตรงกับ POS Summary.transferAmount ไม่เกิน tolerance
- referenceNo ห้ามซ้ำ
- receiverAccount ต้องอยู่ใน whitelist
- transferDate ต้องอยู่ใน policy
- imageHash ห้ามซ้ำ

### Required Field

- transferAmount
- referenceNo
- transferDate
- receiverAccount

### Optional Field

- transferTime
- senderName
- senderAccount
- receiverName
- bankName

## 4. QR Alert (แม่มณี)

### วัตถุประสงค์

QR Alert แม่มณีเป็นหลักฐานยอดรับชำระผ่าน QR/แม่มณี ใช้ตรวจยอด POS Summary.maemaneeAmount

### ข้อมูลที่ต้องอ่าน

- maemaneeAmount
- alertDate
- alertTime
- merchantName
- merchantId
- terminalId
- qrReferenceNo
- payerName
- bankName

### ข้อมูลที่ใช้ตรวจสอบ

- maemaneeAmount เทียบกับ POS Summary.maemaneeAmount
- qrReferenceNo ตรวจ duplicate
- alertDate เทียบกับ saleDate/payin.date
- merchantId เทียบกับ merchant ของสาขา
- terminalId เทียบกับ terminal/till ถ้ามี mapping

### ข้อมูลที่ใช้คำนวณ

- maemaneeDifference = POS Summary.maemaneeAmount - sum(QR Alert.maemaneeAmount)
- qrTransactionCount เทียบกับจำนวน alert ที่อัปโหลด

### ความเสี่ยง

- QR Alert หลายใบรวมยอดไม่ครบ
- QR Alert ซ้ำ
- QR Alert ของ merchant ผิดสาขา
- OCR อ่านจำนวนเงินผิด
- วันที่ alert ไม่ตรงกับวันที่ขาย
- มีรายการ refund/void ที่ไม่ปรากฏในเอกสาร

### Validation Rule

- ถ้า POS Summary.maemaneeAmount > 0 ต้องมี QR Alert หรือยอดรวมจากแหล่งแม่มณี
- sum(maemaneeAmount) ต้องตรงกับ POS Summary.maemaneeAmount ไม่เกิน tolerance
- qrReferenceNo ห้ามซ้ำ
- merchantId ต้องตรงกับสาขา
- alertDate ต้องตรงกับ saleDate หรืออยู่ใน settlement policy
- imageHash ห้ามซ้ำ

### Required Field

- maemaneeAmount
- alertDate
- qrReferenceNo หรือ merchant transaction id
- merchantId

### Optional Field

- alertTime
- merchantName
- terminalId
- payerName
- bankName

## 5. Debtor Transfer

### วัตถุประสงค์

Debtor Transfer เป็นหลักฐานยอดโอนเข้าบัญชีลูกหนี้ ใช้ตรวจ POS Summary.debtorTransferAmount และแยกยอดนี้ออกจากยอดโอนทั่วไป

### ข้อมูลที่ต้องอ่าน

- debtorTransferAmount
- referenceNo
- transferDate
- transferTime
- debtorName
- debtorCode
- senderAccount
- receiverAccount
- bankName

### ข้อมูลที่ใช้ตรวจสอบ

- debtorTransferAmount เทียบกับ POS Summary.debtorTransferAmount
- debtorCode เทียบกับ master debtor/customer ถ้ามี
- referenceNo ตรวจ duplicate
- transferDate เทียบกับ saleDate/payin.date
- receiverAccount เทียบกับบัญชีลูกหนี้ของบริษัท

### ข้อมูลที่ใช้คำนวณ

- debtorTransferDifference = POS Summary.debtorTransferAmount - sum(Debtor Transfer.debtorTransferAmount)
- debtorSettlementTotal ต่อ debtorCode

### ความเสี่ยง

- ยอดลูกหนี้ถูกนับรวมกับยอดโอนทั่วไปผิดประเภท
- ไม่มี debtorCode ทำให้ reconcile ยาก
- สลิปโอนซ้ำ
- โอนเข้าบัญชีผิด
- ยอดจาก POS กับยอดโอนจริงไม่ตรง

### Validation Rule

- ถ้า POS Summary.debtorTransferAmount > 0 ต้องมี Debtor Transfer หรือรายการอ้างอิงลูกหนี้
- sum(debtorTransferAmount) ต้องตรงกับ POS Summary.debtorTransferAmount ไม่เกิน tolerance
- referenceNo ห้ามซ้ำ
- debtorCode ควรมีถ้ามี debtor master
- receiverAccount ต้องอยู่ใน whitelist
- imageHash ห้ามซ้ำ

### Required Field

- debtorTransferAmount
- referenceNo
- transferDate
- receiverAccount

### Optional Field

- transferTime
- debtorName
- debtorCode
- senderAccount
- bankName

## 6. CRM Coupon

### วัตถุประสงค์

CRM Coupon เป็นหลักฐานยอดคูปองหรือส่วนลด CRM ที่ใช้แทนเงินสด ใช้ตรวจ POS Summary.couponAmount และช่วยแยกยอดชำระที่ไม่ใช่เงินสด/โอน

### ข้อมูลที่ต้องอ่าน

- couponAmount
- couponNo
- campaignCode
- couponDate
- customerId
- approvalCode
- cashierCode
- branchCode

### ข้อมูลที่ใช้ตรวจสอบ

- couponAmount เทียบกับ POS Summary.couponAmount
- couponNo ตรวจ duplicate
- campaignCode เทียบกับ campaign master
- couponDate เทียบกับ saleDate
- cashierCode เทียบกับ POS Summary.cashierCode
- branchCode เทียบกับ branch ใน record

### ข้อมูลที่ใช้คำนวณ

- couponDifference = POS Summary.couponAmount - sum(CRM Coupon.couponAmount)
- couponUsageCount = จำนวน coupon ที่ใช้
- couponTotalByCampaign = ยอดคูปองแยก campaign

### ความเสี่ยง

- ใช้ coupon ซ้ำ
- coupon หมดอายุหรือไม่ตรง campaign
- coupon ไม่ตรงสาขา
- ยอด coupon ใน POS ไม่ตรงกับหลักฐาน CRM
- OCR อ่าน couponNo หรือ amount ผิด

### Validation Rule

- ถ้า POS Summary.couponAmount > 0 ต้องมี CRM Coupon หรือรายการจาก CRM
- sum(couponAmount) ต้องตรงกับ POS Summary.couponAmount ไม่เกิน tolerance
- couponNo ห้ามซ้ำ
- campaignCode ต้อง valid
- couponDate ต้องตรงกับ saleDate
- branchCode ต้องตรงกับสาขา

### Required Field

- couponAmount
- couponNo
- couponDate
- branchCode

### Optional Field

- campaignCode
- customerId
- approvalCode
- cashierCode

## Cross-Document Validation Summary

| Validation | Formula / Rule | Tolerance |
| --- | --- | --- |
| POS total paid vs net | POS.totalPaidAmount = POS.netAmount | <= 1 บาท |
| Cash deposit | POS.cashToDepositAmount = Pay-in.payinAmount | <= 1 บาท |
| Mobile transfer | POS.transferAmount = sum(Mobile Banking Slip.transferAmount) | <= 1 บาท |
| Maemanee | POS.maemaneeAmount = sum(QR Alert.maemaneeAmount) | <= 1 บาท |
| Debtor transfer | POS.debtorTransferAmount = sum(Debtor Transfer.debtorTransferAmount) | <= 1 บาท |
| Coupon | POS.couponAmount = sum(CRM Coupon.couponAmount) | <= 1 บาท |
| Sale date | POS.saleDate = Pay-in record date | ต้องตรง |
| Duplicate reference | referenceNo / couponNo / qrReferenceNo ห้ามซ้ำ | ต้องไม่ซ้ำ |
| Duplicate image | imageHash ห้ามซ้ำ | ต้องไม่ซ้ำ |

## Field Mapping Table

| Field Name | Source Document | Description | Required | Validation Rule |
| --- | --- | --- | --- | --- |
| branchCode | POS Summary | รหัสสาขาจาก POS | Yes | ต้องตรงกับ branch master หรือ branch ของผู้ใช้ |
| branchName | POS Summary | ชื่อสาขาจาก POS | Yes | ต้องตรงกับ branch ใน record หรือ mapping table |
| saleDate | POS Summary | วันที่ขาย | Yes | normalize เป็น YYYY-MM-DD แล้วต้องตรงกับ payin.date |
| closeTime | POS Summary | เวลาปิดยอด | Yes | ต้องเป็นเวลา valid; ใช้คำนวณ deposit delay |
| till | POS Summary | หมายเลขเครื่อง/ลิ้นชัก | Yes | ต้องไม่ว่าง ถ้าสาขามี till mapping ควรตรวจกับ master |
| taxId | POS Summary | เลขประจำตัวผู้เสียภาษี | Optional | ถ้ามีต้องเป็นรูปแบบ tax id ที่ถูกต้อง |
| registerNo | POS Summary | เลขทะเบียนเครื่อง | Optional | ถ้ามีต้องไม่ว่างและควรตรงกับ POS master |
| billCount | POS Summary | จำนวนบิล | Yes | ต้องเป็นจำนวนเต็ม >= 0 |
| grossAmount | POS Summary | ยอดขายก่อนหักส่วนลด | Optional | ต้องเป็นตัวเลข >= 0 |
| discountAmount | POS Summary | ส่วนลดรวม | Optional | ต้องเป็นตัวเลข >= 0 |
| netAmount | POS Summary | ยอดสุทธิ | Yes | ต้องใกล้เคียง totalPaidAmount ไม่เกิน 1 บาท |
| cashAmount | POS Summary | ยอดรับเงินสดทั้งหมด | Yes | ต้องเป็นตัวเลข >= 0 |
| debtorTransferAmount | POS Summary | ยอดโอนเข้าบัญชีลูกหนี้ | Yes | ต้องตรงกับผลรวม Debtor Transfer ไม่เกิน 1 บาท |
| transferAmount | POS Summary | ยอดโอนทั่วไป | Yes | ต้องตรงกับผลรวม Mobile Banking Slip ไม่เกิน 1 บาท |
| maemaneeAmount | POS Summary | ยอด QR/แม่มณี | Yes | ต้องตรงกับผลรวม QR Alert ไม่เกิน 1 บาท |
| couponAmount | POS Summary | ยอดคูปอง CRM | Yes | ต้องตรงกับผลรวม CRM Coupon ไม่เกิน 1 บาท |
| totalPaidAmount | POS Summary | ยอดรับชำระรวม | Yes | ต้องใกล้เคียง netAmount ไม่เกิน 1 บาท |
| cashToDepositAmount | POS Summary | ยอดเงินสดต้องนำฝาก | Yes | ต้องตรงกับ Pay-in.payinAmount ไม่เกิน 1 บาท |
| cashierCode | POS Summary | รหัสพนักงานปิดยอด | Yes | ต้องไม่ว่าง; ถ้ามี user master ควรตรวจ mapping |
| payinAmount | Pay-in | ยอดเงินฝากในใบ Pay-in | Yes | ต้องตรงกับ POS.cashToDepositAmount ไม่เกิน 1 บาท |
| payinReferenceNo | Pay-in | เลขอ้างอิง Pay-in | Yes | ห้ามซ้ำในระบบ |
| payinBankName | Pay-in | ธนาคารที่รับฝาก | Yes | ต้องอยู่ใน bank whitelist |
| payinDate | Pay-in | วันที่ฝาก | Yes | ต้องตรงกับ saleDate หรืออยู่ใน deposit policy |
| payinTime | Pay-in | เวลาฝาก | Optional | ถ้ามีใช้คำนวณ deposit delay |
| payinAccountNo | Pay-in | บัญชีรับฝาก | Optional | ถ้ามีต้องอยู่ใน account whitelist |
| depositorName | Pay-in | ชื่อผู้นำฝาก | Optional | ใช้ตรวจสอบ manual หรือ audit |
| mobileTransferAmount | Mobile Banking Slip | ยอดโอนทั่วไป | Yes | ผลรวมต้องตรงกับ POS.transferAmount ไม่เกิน 1 บาท |
| mobileReferenceNo | Mobile Banking Slip | เลขอ้างอิงสลิปโอน | Yes | ห้ามซ้ำในระบบ |
| mobileTransferDate | Mobile Banking Slip | วันที่โอน | Yes | ต้องตรงกับ saleDate หรืออยู่ใน settlement policy |
| mobileTransferTime | Mobile Banking Slip | เวลาโอน | Optional | ถ้ามีใช้คำนวณ transfer delay |
| mobileSenderName | Mobile Banking Slip | ชื่อผู้โอน | Optional | ใช้ตรวจ audit |
| mobileSenderAccount | Mobile Banking Slip | บัญชีผู้โอน | Optional | ใช้ตรวจ audit |
| mobileReceiverAccount | Mobile Banking Slip | บัญชีผู้รับ | Yes | ต้องอยู่ใน account whitelist |
| mobileReceiverName | Mobile Banking Slip | ชื่อผู้รับ | Optional | ถ้ามีควรตรงกับบริษัท |
| maemaneeAmount | QR Alert (แม่มณี) | ยอดรับชำระ QR/แม่มณี | Yes | ผลรวมต้องตรงกับ POS.maemaneeAmount ไม่เกิน 1 บาท |
| qrReferenceNo | QR Alert (แม่มณี) | เลขอ้างอิงรายการ QR | Yes | ห้ามซ้ำในระบบ |
| alertDate | QR Alert (แม่มณี) | วันที่แจ้งเตือน | Yes | ต้องตรงกับ saleDate หรือ settlement policy |
| alertTime | QR Alert (แม่มณี) | เวลาแจ้งเตือน | Optional | ใช้ตรวจ transaction timing |
| merchantId | QR Alert (แม่มณี) | merchant id | Yes | ต้องตรงกับ merchant mapping ของสาขา |
| terminalId | QR Alert (แม่มณี) | terminal id | Optional | ถ้ามีควรตรงกับ till/terminal mapping |
| payerName | QR Alert (แม่มณี) | ชื่อผู้จ่าย | Optional | ใช้ตรวจ audit |
| debtorTransferAmount | Debtor Transfer | ยอดโอนเข้าบัญชีลูกหนี้ | Yes | ผลรวมต้องตรงกับ POS.debtorTransferAmount ไม่เกิน 1 บาท |
| debtorReferenceNo | Debtor Transfer | เลขอ้างอิงรายการโอนลูกหนี้ | Yes | ห้ามซ้ำในระบบ |
| debtorTransferDate | Debtor Transfer | วันที่โอนลูกหนี้ | Yes | ต้องตรงกับ saleDate หรือ settlement policy |
| debtorCode | Debtor Transfer | รหัสลูกหนี้ | Optional | ถ้ามี debtor master ต้อง valid |
| debtorName | Debtor Transfer | ชื่อลูกหนี้ | Optional | ใช้ตรวจ audit/manual review |
| debtorReceiverAccount | Debtor Transfer | บัญชีรับเงินลูกหนี้ | Yes | ต้องอยู่ใน account whitelist |
| couponAmount | CRM Coupon | ยอดคูปอง | Yes | ผลรวมต้องตรงกับ POS.couponAmount ไม่เกิน 1 บาท |
| couponNo | CRM Coupon | เลขคูปอง | Yes | ห้ามซ้ำในระบบ |
| couponDate | CRM Coupon | วันที่ใช้คูปอง | Yes | ต้องตรงกับ saleDate |
| campaignCode | CRM Coupon | รหัส campaign | Optional | ถ้ามี campaign master ต้อง valid |
| customerId | CRM Coupon | รหัสลูกค้า | Optional | ใช้ตรวจ audit |
| approvalCode | CRM Coupon | รหัสอนุมัติ | Optional | ใช้ตรวจ audit |
| couponCashierCode | CRM Coupon | cashier ที่รับคูปอง | Optional | ถ้ามีควรตรงกับ POS.cashierCode |
| documentImageHash | All Documents | SHA-256 hash ของรูป | Yes | ห้ามซ้ำกับเอกสารเดิม |
| documentUploadedAt | All Documents | เวลา upload | Yes | ต้องมีเมื่ออัปโหลดเอกสารสำเร็จ |
| parserConfidence | All Documents | confidence จาก AI/OCR | Yes | ถ้าต่ำกว่า 80 เพิ่ม LOW_AI_CONFIDENCE |
| parserStatus | All Documents | สถานะ parser | Yes | ต้องเป็น PENDING, READ, FAILED หรือ NEED_REVIEW |

## Required vs Optional Summary

| Document | Required Fields | Optional Fields |
| --- | --- | --- |
| POS Summary | branchCode, branchName, saleDate, closeTime, till, billCount, netAmount, cashAmount, debtorTransferAmount, transferAmount, maemaneeAmount, couponAmount, totalPaidAmount, cashToDepositAmount, cashierCode | taxId, registerNo, grossAmount, discountAmount |
| Pay-in | payinAmount, referenceNo, bankName, payinDate | payinTime, accountNo, depositorName, branchBankCode |
| Mobile Banking Slip | transferAmount, referenceNo, transferDate, receiverAccount | transferTime, senderName, senderAccount, receiverName, bankName |
| QR Alert (แม่มณี) | maemaneeAmount, alertDate, qrReferenceNo, merchantId | alertTime, merchantName, terminalId, payerName, bankName |
| Debtor Transfer | debtorTransferAmount, referenceNo, transferDate, receiverAccount | transferTime, debtorName, debtorCode, senderAccount, bankName |
| CRM Coupon | couponAmount, couponNo, couponDate, branchCode | campaignCode, customerId, approvalCode, cashierCode |

## Open Questions

- Mobile Banking Slip จะเป็นเอกสารใบเดียวรวมยอด หรือหลายใบต่อ record
- QR Alert แม่มณีจะอัปโหลดเป็นรูปต่อ transaction หรือเป็นรายงานรวม
- Debtor Transfer มี debtor master หรือยัง
- CRM Coupon มี API/report จากระบบ CRM หรือใช้รูปเอกสารเท่านั้น
- Tolerance 1 บาทใช้กับทุกช่องทางหรือเฉพาะ POS total reconciliation
- Pay-in date อนุญาตให้เป็นวันถัดไปได้หรือไม่

