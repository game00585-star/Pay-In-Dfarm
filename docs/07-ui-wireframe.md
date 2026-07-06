# 07 UI Wireframe

## Layout

ระบบใช้ responsive web layout:

- Desktop: sidebar ซ้าย + content ขวา
- Mobile: sidebar ด้านบน/stack + content ด้านล่าง

## Navigation

เมนูแสดงตาม role

| Role | Menus |
| --- | --- |
| Admin | ส่ง Pay-in, ตรวจสอบบัญชี, รายงาน Audit, ตั้งค่าระบบ |
| Branch | ส่ง Pay-in |
| Accounting | ตรวจสอบบัญชี |
| Audit | รายงาน Audit |

## 1. Login

### Purpose

ให้ผู้ใช้งานเข้าสู่ระบบด้วย Firebase Auth หรือเลือก Demo role ระหว่างพัฒนา

### Wireframe

```text
+-------------------------------------------------------------+
| D-FARM Pay-in AI V1                                         |
|                                                             |
| +---------------------------+ +---------------------------+ |
| | Login                     | | ตรวจยอดขายถึงยอดฝาก       | |
| | Email [______________]    | | Mock OCR reads documents  | |
| | Password [___________]    | | before Accounting review  | |
| | Demo role [Branch v]      | |                           | |
| | [ Login ]                 | |                           | |
| +---------------------------+ +---------------------------+ |
+-------------------------------------------------------------+
```

## 2. Branch Submit Pay-in

### Purpose

ให้สาขากรอกข้อมูลและอัปโหลดเอกสาร 3 ประเภท

### Form Fields

- วันที่
- Branch
- กะ
- ยอดที่คาดหวัง
- ยอดใบ Pay-in
- ยอดรวมสลิปโอน
- Reference No.
- ธนาคาร

### Upload Cards

- รูปสรุปยอด POS
- ใบ Pay-in
- สลิปโอน

### Wireframe

```text
+---------------- Sidebar ----------------+-------------------+
| ส่ง Pay-in                              | สาขาส่งรายการ     |
| ตรวจสอบบัญชี                            |                   |
| รายงาน Audit                            | +---------------+ |
| ตั้งค่าระบบ                              | | Form fields   | |
|                                         | |               | |
|                                         | | POS Upload    | |
|                                         | | Pay-in Upload | |
|                                         | | Transfer      | |
|                                         | | [Submit AI]   | |
|                                         | +---------------+ |
|                                         | +---------------+ |
|                                         | | Branch records| |
|                                         | +---------------+ |
+-----------------------------------------+-------------------+
```

## 3. Accounting Review

### Purpose

ให้บัญชีตรวจสอบรายการจากทุกสาขา โดยเห็นข้อมูล 3 ฝั่งและผลต่างแบบสี

### Sections

- Header: id, branch, date, shift, status
- Metrics: Pay-in, Transfer slip, AI confidence, Risk
- Risk flags
- POS Summary
- Branch Input
- AI OCR Result
- Comparison cards
- Timeline
- Accounting comment
- Approve / Return

### Wireframe

```text
+-------------------------------------------------------------+
| บัญชีตรวจสอบรายการ                         [Search ____]    |
|                                                             |
| +---------------------------------------------------------+ |
| | PAY-20260705-123456   [PENDING_ACCOUNTING]              | |
| | Branch | Date | Shift                                   | |
| | Pay-in | Transfer | AI confidence | Risk                 | |
| | [Risk flags...]                                         | |
| |                                                         | |
| | +-------------+ +-------------+ +---------------------+ | |
| | | POS Summary | | Branch Input| | AI OCR Result       | | |
| | | fields      | | fields      | | fields              | | |
| | +-------------+ +-------------+ +---------------------+ | |
| |                                                         | |
| | [Green comparison] [Yellow comparison] [Red comparison] | |
| |                                                         | |
| | Timeline: created -> uploaded -> AI -> submitted        | |
| | Comment [___________________________________________]   | |
| |                                  [Approve] [Return]     | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

## 4. Audit Dashboard

### Purpose

ให้ Audit ดูภาพรวม, รายงาน Pay-in, audit log และ export Excel

### Sections

- Stats: Records, High risk, Approved, Pending
- Pay-in report table
- Export Excel
- Audit log

### Wireframe

```text
+-------------------------------------------------------------+
| แดชบอร์ด Audit                              [Export Excel]  |
|                                                             |
| [Records] [High Risk] [Approved] [Pending]                  |
|                                                             |
| +---------------------------------------------------------+ |
| | Pay-in table                                            | |
| | ID | Branch | Date | Ref | Pay-in | Transfer | Risk     | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | Audit log                                               | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

## 5. Admin Settings

### Purpose

ให้ Admin จัดการสาขาและผู้ใช้งาน

### Branch Form

- Branch ID
- Branch code
- Name
- Area
- Active

### User Form

- User ID
- Name
- Email
- Role
- Branch
- Active

### Wireframe

```text
+-------------------------------------------------------------+
| ตั้งค่าผู้ใช้และสาขา                                      |
|                                                             |
| +---------------------------+ +---------------------------+ |
| | Branches                  | | Users                     | |
| | Branch ID [____]          | | User ID [____]            | |
| | Branch code [__]          | | Name [____]               | |
| | Name [________]           | | Email [____]              | |
| | Area [________]           | | Role [Branch v]           | |
| | Active [x]                | | Branch [D-FARM v]         | |
| | [Save branch]             | | Active [x]                | |
| | Branch list               | | [Save user]               | |
| +---------------------------+ +---------------------------+ |
+-------------------------------------------------------------+
```

## Responsive Rules

- ตารางต้อง scroll แนวนอนได้บน mobile
- Upload cards stack เป็น 1 column บน mobile
- Review columns stack เป็น 1 column บน mobile
- ปุ่ม action ต้องไม่ล้น container
- ข้อความยาว เช่น referenceNo และ image filename ต้อง wrap ได้

