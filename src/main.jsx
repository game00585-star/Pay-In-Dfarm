import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  Check,
  Download,
  FileImage,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  initializeFirestore,
  limit,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import './app/createAppServices.js';
import { mockAuthService } from './auth/mockAuthService.js';
import { canReadRecord, canReview, getDefaultTabForRole } from './auth/roleAccess.js';
import { ROLES } from './domain/constants/roles.js';
import {
  AI_PROVIDERS,
  DEFAULT_AI_CONFIGURATION,
  ProviderManager,
  BankTransferSlipParser,
  PayInParser,
  OllamaVisionService,
  OpenCVService,
  PaddleOCRService,
  ShiftReportParser,
  duplicateDetectionService,
  fingerprintService,
  labelHistoryRepository,
  normalizeAIConfiguration,
  smartLabelService
} from './ai/index.js';
import { depositBatchService, defaultBranchShiftPolicies } from './deposit-batch/index.js';
import { shiftMatchingService } from './shift-matching/index.js';
import { shiftReconciliationService } from './reconciliation/index.js';
import { businessExceptionEngine } from './business-exception/index.js';
import { fraudPatternEngine } from './fraud-pattern/index.js';
import { workflowEngine, workflowPermissionService, workflowService } from './workflow/index.js';
import { platformService, STORAGE_BUCKETS } from './platform/index.js';
import {
  ENVIRONMENTS,
  goLiveChecklistService,
  environmentConfigurationService,
  loggingService,
  LOG_TYPES,
  performanceTestService,
  productionReadinessService,
  securityTestService,
  trainingModeService,
  uatService,
  UAT_CATEGORIES
} from './production/index.js';
import {
  announcementService,
  apiRegistryService,
  enterpriseSearchService,
  licenseService,
  maintenanceService,
  operationsAnalyticsService,
  releaseService,
  reportCenterService
} from './operations/index.js';
import {
  aiLearningCenterService,
  aiProviderManagerService,
  businessRuleCenterService,
  improvementCenterService,
  launchCenterService,
  retentionArchiveService,
  systemAuditService,
  templateManagerService
} from './launch/index.js';
import { integrationService } from './integration/index.js';
import {
  mobileDashboard,
  mobileNotification,
  mobileReview,
  mobileUpload,
  mobileWorkflow,
  offlineService
} from './mobile/index.js';
import { caseService, CASE_TYPES, CASE_PRIORITIES } from './case-management/index.js';
import {
  documentVersionService,
  evidenceManager,
  retentionPolicyService,
  RETENTION_OPTIONS,
  DOCUMENT_VERSION_TYPES
} from './document-version/index.js';
import {
  masterDataService,
  MASTER_COLLECTIONS,
  DEPOSIT_POLICIES,
  BUSINESS_DATE_POLICIES
} from './master-data/index.js';
import { analyticsEngine, analyticsRepository } from './analytics/index.js';
import {
  auditPlanService,
  auditScheduleService,
  auditCaseService,
  auditFindingService,
  correctiveActionService,
  auditEvidenceService,
  auditReportService,
  AUDIT_TYPES,
  FINDING_CATEGORIES,
  FINDING_SEVERITIES
} from './audit-management/index.js';
import {
  complianceService,
  policyService,
  controlAssessmentService,
  complianceCaseService,
  POLICY_CATEGORIES,
  CONTROL_RESULTS
} from './compliance/index.js';
import { knowledgeService, conversationService } from './ai-assistant/index.js';
import {
  dataGovernanceService,
  dataValidationEngine,
  retentionPolicyEngine,
  DATA_RETENTION_OPTIONS,
  metadataService,
  DATA_CLASSIFICATIONS
} from './data-governance/index.js';
import { masterBranches, masterUsers } from './infrastructure/database/masterData.js';
import { mockStorageService, parseDocument, ValidationEngineService } from './services/index.js';
import { LoginPage } from './ui/pages/LoginPage.jsx';
import './styles.css';

const DOCUMENT_TYPES = {
  POS_SUMMARY: 'POS_SUMMARY',
  PAYIN_SLIP: 'PAYIN_SLIP',
  TRANSFER_SLIP: 'TRANSFER_SLIP'
};

const BRANCH_DOCUMENT_TYPES = [
  'POS_SUMMARY',
  'PAYIN_BANK_COUNTER',
  'PAYIN_ATM',
  'PAYIN_COUNTER_SERVICE',
  'PAYIN_LOTUS',
  'BANK_TRANSFER_SLIP',
  'MAEMANEE_QR_ALERT',
  'DEBTOR_TRANSFER_RECEIPT',
  'CRM_COUPON_RECEIPT'
];

const documentTypeLabels = {
  POS_SUMMARY: 'POS Summary',
  PAYIN_BANK_COUNTER: 'Pay-in Bank Counter',
  PAYIN_ATM: 'Pay-in ATM',
  PAYIN_COUNTER_SERVICE: 'Pay-in Counter Service',
  PAYIN_LOTUS: 'Pay-in Lotus',
  BANK_TRANSFER_SLIP: 'Bank Transfer Slip',
  MAEMANEE_QR_ALERT: 'Maemanee QR Alert',
  DEBTOR_TRANSFER_RECEIPT: 'Debtor Transfer Receipt',
  CRM_COUPON_RECEIPT: 'CRM Coupon Receipt',
  UNKNOWN: 'Unknown'
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const useMockAuth = true;
const validationEngine = new ValidationEngineService();
const app = hasFirebase ? initializeApp(firebaseConfig) : null;
const db = hasFirebase
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  : null;
const auth = hasFirebase ? getAuth(app) : null;
const storage = hasFirebase ? getStorage(app) : null;

const seedBranches = masterBranches;
const seedUsers = masterUsers;

const emptyPayin = {
  date: new Date().toISOString().slice(0, 10),
  branch: 'D-FARM Bangkok 01',
  shift: 'Morning',
  note: '',
  expectedAmount: '',
  branchAmount: '',
  transferSlipAmount: '',
  referenceNo: '',
  bankName: 'Kasikorn Bank',
  accountingComment: ''
};

const statusLabels = {
  DRAFT: 'Draft',
  AI_CHECKING: 'AI Checking',
  NEED_RETAKE: 'Need Retake',
  PENDING_ACCOUNTING: 'Pending Accounting',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
  HIGH_RISK: 'High Risk',
  CLOSED: 'Closed'
};

const roleTabs = {
  [ROLES.ADMIN]: ['Submit', 'Mobile', 'CaseManagement', 'AIAssistant', 'Evidence', 'MasterData', 'DataGovernance', 'ExecutiveBI', 'InternalAudit', 'Compliance', 'Review', 'Operations', 'Launch', 'Integration', 'Workflow', 'Platform', 'GoLive', 'ShiftReconciliation', 'ShiftMatching', 'DepositBatch', 'BranchRisk', 'Audit', 'AIDataset', 'AISettings', 'AITest', 'OCRTest', 'OpenCVTest', 'ShiftReportAITest', 'BankTransferSlipAITest', 'Settings'],
  [ROLES.BRANCH]: ['Submit', 'Mobile', 'CaseManagement', 'Evidence', 'MasterData', 'ExecutiveBI', 'Operations', 'Workflow'],
  [ROLES.ACCOUNTING]: ['Review', 'Mobile', 'CaseManagement', 'AIAssistant', 'Evidence', 'MasterData', 'DataGovernance', 'ExecutiveBI', 'InternalAudit', 'Compliance', 'Operations', 'Workflow', 'ShiftReconciliation', 'ShiftMatching', 'DepositBatch', 'BranchRisk'],
  [ROLES.AUDIT]: ['Audit', 'Mobile', 'CaseManagement', 'AIAssistant', 'Evidence', 'MasterData', 'DataGovernance', 'ExecutiveBI', 'InternalAudit', 'Compliance', 'Operations', 'Workflow', 'ShiftReconciliation', 'ShiftMatching', 'DepositBatch', 'BranchRisk'],
  [ROLES.REGIONAL_MANAGER]: ['Mobile', 'CaseManagement', 'AIAssistant', 'MasterData', 'DataGovernance', 'ExecutiveBI', 'InternalAudit', 'Compliance', 'Operations', 'Workflow'],
  [ROLES.EXECUTIVE]: ['Mobile', 'AIAssistant', 'Evidence', 'MasterData', 'DataGovernance', 'ExecutiveBI', 'InternalAudit', 'Compliance', 'Operations', 'Launch', 'Workflow', 'Platform', 'GoLive', 'Audit', 'BranchRisk']
};

const tabLabels = {
  Submit: 'ส่ง Pay-in',
  Review: 'ตรวจสอบบัญชี',
  Audit: 'รายงาน Audit',
  Settings: 'ตั้งค่าระบบ'
};

const pageTitles = {
  Submit: 'สาขาส่งรายการ Pay-in',
  Review: 'บัญชีตรวจสอบรายการ',
  Audit: 'แดชบอร์ด Audit',
  Settings: 'ตั้งค่าผู้ใช้และสาขา'
};

const storeKey = (key) => `dfarm_v3_auth_${key}`;

const menuLabels = {
  ...tabLabels,
  Submit: 'ส่ง Pay-in',
  Mobile: 'Mobile Operations',
  CaseManagement: 'Case Management',
  AIAssistant: 'AI Assistant',
  Evidence: 'Document Evidence',
  MasterData: 'Master Data Center',
  DataGovernance: 'Data Governance',
  ExecutiveBI: 'Executive BI',
  InternalAudit: 'Internal Audit',
  Compliance: 'Compliance',
  Review: 'Document Inbox',
  Operations: 'Operations Center',
  Launch: 'Enterprise Launch',
  Integration: 'Integration Platform',
  ShiftReconciliation: 'Shift Reconciliation',
  ShiftMatching: 'Shift Pay-in Matching',
  DepositBatch: 'Deposit Batch',
  Workflow: 'Enterprise Workflow',
  Platform: 'Platform Console',
  GoLive: 'Go Live Readiness',
  BranchRisk: 'Branch Risk Analytics',
  Audit: 'รายงาน Audit',
  AIDataset: 'AI Dataset',
  AISettings: 'AI Settings',
  AITest: 'AI Test',
  OCRTest: 'OCR Test',
  OpenCVTest: 'OpenCV Test',
  ShiftReportAITest: 'Shift Report AI Test',
  BankTransferSlipAITest: 'Bank Transfer Slip AI Test',
  Settings: 'ตั้งค่าระบบ'
};

const menuPageTitles = {
  ...pageTitles,
  Submit: 'สาขาส่งรายการ Pay-in',
  Mobile: 'Mobile Operations Platform',
  CaseManagement: 'Branch Communication & Case Management',
  AIAssistant: 'AI Knowledge & Decision Support',
  Evidence: 'Document Version Control & Evidence',
  MasterData: 'Master Data & Branch Administration Center',
  DataGovernance: 'Enterprise Data Governance',
  ExecutiveBI: 'Enterprise Business Intelligence',
  InternalAudit: 'Internal Audit Management Platform',
  Compliance: 'Compliance & Corporate Governance',
  Review: 'Document Inbox',
  Operations: 'Operations Center',
  Launch: 'Enterprise Launch',
  Integration: 'Integration Platform',
  ShiftReconciliation: 'Shift Reconciliation',
  ShiftMatching: 'Shift Pay-in Matching',
  DepositBatch: 'Deposit Batch Viewer',
  Workflow: 'Enterprise Workflow',
  Platform: 'Platform Console',
  GoLive: 'Go Live Readiness',
  BranchRisk: 'Branch Risk Analytics',
  Audit: 'แดชบอร์ด Audit',
  AIDataset: 'AI Dataset',
  AISettings: 'AI Settings',
  AITest: 'AI Test',
  OCRTest: 'OCR Test',
  OpenCVTest: 'OpenCV Test',
  ShiftReportAITest: 'Shift Report AI Test',
  BankTransferSlipAITest: 'Bank Transfer Slip AI Test',
  Settings: 'ตั้งค่าผู้ใช้และสาขา'
};

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(key))) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(storeKey(key), JSON.stringify(value));
}

async function digestFile(file) {
  if (!file) return '';
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function toThaiPosSaleDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year + 543}`;
}

function normalizePosDate(dateText) {
  if (!dateText) return '';
  const parts = String(dateText).split('/');
  if (parts.length !== 3) return dateText;
  const [day, month, thaiYear] = parts.map(Number);
  return `${thaiYear - 543}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function hashConfidence(hash, fallback = 88) {
  const seed = parseInt((hash || '21').slice(0, 4), 16) || 21;
  return Math.max(62, fallback - (seed % 18));
}

// Swap this function with a real AI document extractor later.
async function mockAIExtractDocument(image, documentType, context = {}) {
  const confidence = hashConfidence(image?.hash, documentType === DOCUMENT_TYPES.POS_SUMMARY ? 93 : 90);

  if (documentType === DOCUMENT_TYPES.POS_SUMMARY) {
    return {
      documentType,
      confidence,
      extractedAt: new Date().toISOString(),
      fields: {
        branchCode: '00074',
        branchName: context.branch || 'D-FARM Bangkok 01',
        saleDate: toThaiPosSaleDate(context.date),
        closeTime: '12:13',
        till: '3071',
        taxId: '0105561080724',
        registerNo: 'E129000002A0704',
        billCount: 182,
        grossAmount: 53599.44,
        discountAmount: 333.74,
        netAmount: 53265.70,
        cashAmount: 25738.75,
        debtorTransferAmount: 2572.00,
        transferAmount: 4473.00,
        maemaneeAmount: 20422.00,
        couponAmount: 60.00,
        totalPaidAmount: 53265.75,
        cashToDepositAmount: 335.75,
        cashierCode: 'C-307-SAITHJ'
      }
    };
  }

  if (documentType === DOCUMENT_TYPES.PAYIN_SLIP) {
    return {
      documentType,
      confidence,
      extractedAt: new Date().toISOString(),
      fields: {
        amount: Number(context.branchAmount || 0),
        referenceNo: context.referenceNo || `PY${Date.now().toString().slice(-8)}`,
        bankName: context.bankName || 'Kasikorn Bank',
        date: context.date
      }
    };
  }

  return {
    documentType,
    confidence,
    extractedAt: new Date().toISOString(),
    fields: {
      totalAmount: Number(context.transferSlipAmount || 0),
      referenceNo: context.transferReferenceNo || `TR${Date.now().toString().slice(-8)}`,
      date: context.date
    }
  };
}

function diffAmount(left, right) {
  return Number((Number(left || 0) - Number(right || 0)).toFixed(2));
}

function compareAmount(left, right) {
  const diff = Math.abs(diffAmount(left, right));
  if (diff === 0) return 'match';
  if (diff <= 1) return 'near';
  return 'mismatch';
}

const approvalBlockedFlags = [
  'DUPLICATE_IMAGE_EXACT',
  'DUPLICATE_REFERENCE_NO',
  'PAYMENT_TOTAL_MISMATCH',
  'MISSING_REQUIRED_DOCUMENT',
  'INVALID_AMOUNT',
  'WRONG_DESTINATION_ACCOUNT',
  'BANK_TRANSFER_MISMATCH',
  'DATE_MISMATCH',
  'SHIFT_PAYIN_AMOUNT_MISMATCH',
  'MISSING_SHIFT_PAYIN',
  'SHIFT_TOTAL_AMOUNT_MISMATCH',
  'MISSING_SHIFT_REPORT'
];

function hasBlockingReviewRisk(record) {
  const flags = record.riskFlags || [];
  const hasExactDuplicate = record.documents?.some((document) => document.duplicateResult?.status === 'FAIL');
  return hasExactDuplicate || flags.some((flag) => approvalBlockedFlags.includes(flag));
}

function buildComparisons(record) {
  const pos = record.aiDocuments?.POS_SUMMARY?.fields || {};
  const payin = record.aiDocuments?.PAYIN_SLIP?.fields || {};
  const transfer = record.aiDocuments?.TRANSFER_SLIP?.fields || {};
  const expectedTransfer = Number(pos.transferAmount || 0) + Number(pos.maemaneeAmount || 0);

  return {
    posCashPayin: {
      label: 'POS cash to deposit vs Pay-in',
      leftLabel: 'POS cash to deposit',
      rightLabel: 'Pay-in OCR',
      left: pos.cashToDepositAmount,
      right: payin.amount,
      status: compareAmount(pos.cashToDepositAmount, payin.amount)
    },
    posTransferSlip: {
      label: 'POS transfer + Maemanee vs transfer slip',
      leftLabel: 'POS transfer total',
      rightLabel: 'Transfer slip OCR',
      left: expectedTransfer,
      right: transfer.totalAmount,
      status: compareAmount(expectedTransfer, transfer.totalAmount)
    },
    posTotal: {
      label: 'POS total paid vs net amount',
      leftLabel: 'Total paid',
      rightLabel: 'Net amount',
      left: pos.totalPaidAmount,
      right: pos.netAmount,
      status: compareAmount(pos.totalPaidAmount, pos.netAmount)
    },
    saleDate: {
      label: 'POS sale date vs Pay-in date',
      leftLabel: 'POS sale date',
      rightLabel: 'Record date',
      left: normalizePosDate(pos.saleDate),
      right: record.date,
      status: normalizePosDate(pos.saleDate) === record.date ? 'match' : 'mismatch'
    }
  };
}

function calculateRisk(record, records) {
  const flags = [];
  let score = 0;
  const hashes = Object.values(record.imageHashes || {}).filter(Boolean);
  const duplicateReference = records.some((item) => item.id !== record.id && item.referenceNo && item.referenceNo === record.referenceNo);
  const duplicateImage = records.some((item) => {
    if (item.id === record.id) return false;
    const otherHashes = Object.values(item.imageHashes || {}).filter(Boolean);
    return hashes.some((hash) => otherHashes.includes(hash) || item.imageHash === hash);
  });
  const comparisons = buildComparisons(record);
  const minConfidence = Math.min(...Object.values(record.aiDocuments || {}).map((doc) => Number(doc.confidence || 0)));

  if (!record.documentUrls?.POS_SUMMARY) {
    score += 20;
    flags.push('POS_SUMMARY_MISSING');
  }
  if (!record.documentUrls?.PAYIN_SLIP) {
    score += 20;
    flags.push('PAYIN_IMAGE_MISSING');
  }
  if (!record.documentUrls?.TRANSFER_SLIP) {
    score += 20;
    flags.push('TRANSFER_SLIP_MISSING');
  }
  if (comparisons.posCashPayin.status === 'mismatch') {
    score += 30;
    flags.push('POS_CASH_PAYIN_MISMATCH');
  }
  if (comparisons.posTransferSlip.status === 'mismatch') {
    score += 30;
    flags.push('POS_TRANSFER_SLIP_MISMATCH');
  }
  if (comparisons.posTotal.status === 'mismatch') {
    score += 20;
    flags.push('POS_TOTAL_MISMATCH');
  }
  if (comparisons.saleDate.status === 'mismatch') {
    score += 20;
    flags.push('DATE_MISMATCH');
  }
  if (minConfidence < 80) {
    score += 20;
    flags.push('LOW_AI_CONFIDENCE');
  }
  if (duplicateReference) {
    score += 40;
    flags.push('DUPLICATE_REFERENCE');
  }
  if (duplicateImage) {
    score += 50;
    flags.push('DUPLICATE_IMAGE');
  }

  return { riskScore: Math.min(score, 100), riskFlags: flags };
}

function App() {
  const [user, setUser] = useState(() => readStore('user', null));
  const [records, setRecords] = useState(() => readStore('payins', []));
  const [branches, setBranches] = useState(() => readStore('branches', seedBranches));
  const [users, setUsers] = useState(() => readStore('users', seedUsers));
  const [auditLogs, setAuditLogs] = useState(() => readStore('auditLogs', []));
  const [aiConfiguration, setAIConfiguration] = useState(() => normalizeAIConfiguration(readStore('aiConfiguration', DEFAULT_AI_CONFIGURATION)));
  const [datasetLabels, setDatasetLabels] = useState(() => readStore('datasetLabels', {}));
  const [labelHistory, setLabelHistory] = useState(() => readStore('labelHistory', labelHistoryRepository.list()));
  const [aiProcessingQueue, setAIProcessingQueue] = useState(() => readStore('aiProcessingQueue', []));
  const [activeTab, setActiveTab] = useState('Submit');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (useMockAuth || !hasFirebase) return;
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }
      const allUsers = await fetchCollection('users');
      const profile = allUsers.find((item) => item.email === firebaseUser.email) || {
        id: firebaseUser.uid,
        name: firebaseUser.email,
        email: firebaseUser.email,
        role: ROLES.BRANCH,
        branch: seedBranches[0].name,
        active: true
      };
      setUser(profile);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshData();
  }, [user]);

  useEffect(() => {
    if (hasFirebase) return;
    writeStore('payins', records);
    writeStore('branches', branches);
    writeStore('users', users);
    writeStore('auditLogs', auditLogs);
    writeStore('user', user);
    writeStore('aiConfiguration', aiConfiguration);
    writeStore('datasetLabels', datasetLabels);
    writeStore('labelHistory', labelHistory);
    writeStore('aiProcessingQueue', aiProcessingQueue);
  }, [records, branches, users, auditLogs, user, aiConfiguration, datasetLabels, labelHistory, aiProcessingQueue]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const visibleRecords = useMemo(() => {
    if (!user) return [];
    return records.filter((record) => canReadRecord(user, record));
  }, [records, user]);

  async function fetchCollection(name) {
    if (!hasFirebase) {
      if (name === 'payins') return records;
      if (name === 'branches') return branches;
      if (name === 'users') return users;
      if (name === 'auditLogs') return auditLogs;
      return [];
    }
    const q = query(collection(db, name), orderBy(name === 'auditLogs' ? 'createdAt' : 'id', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }

  async function refreshData() {
    setLoading(true);
    try {
      if (hasFirebase) {
        const [nextRecords, nextBranches, nextUsers, nextLogs] = await Promise.all([
          fetchCollection('payins'),
          fetchCollection('branches'),
          fetchCollection('users'),
          fetchCollection('auditLogs')
        ]);
        setRecords(nextRecords);
        setBranches(nextBranches.length ? nextBranches : seedBranches);
        setUsers(nextUsers.length ? nextUsers : seedUsers);
        setAuditLogs(nextLogs);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addAudit(action, before, after) {
    const log = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      recordId: after?.id || before?.id || '',
      actor: user?.email || 'system',
      actorRole: user?.role || 'system',
      before: before || null,
      after: after || null,
      createdAt: new Date().toISOString()
    };
    if (hasFirebase) {
      await addDoc(collection(db, 'auditLogs'), { ...log, createdAt: serverTimestamp() });
    } else {
      setAuditLogs((items) => [log, ...items]);
    }
  }

  async function saveRecord(record, before = null, action = 'UPDATE_PAYIN') {
    if (hasFirebase) {
      await setDoc(doc(db, 'payins', record.id), record, { merge: true });
      await addAudit(action, before, record);
      await refreshData();
    } else {
      setRecords((items) => {
        const exists = items.some((item) => item.id === record.id);
        return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
      });
      await addAudit(action, before, record);
    }
  }

  async function uploadImage(recordId, file, kind) {
    if (!file) return '';
    if (!hasFirebase) return toDataUrl(file);
    const fileRef = ref(storage, `payins/${recordId}/${kind}-${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async function handleLogin(email, password, pickedRole) {
    setLoading(true);
    try {
      if (useMockAuth || !hasFirebase) {
        const credentials = typeof email === 'object' ? email : { email, password, role: pickedRole };
        const profile = await mockAuthService.login(credentials);
        setUser(profile);
        setActiveTab(getDefaultTabForRole(profile.role));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (useMockAuth || !hasFirebase) {
      await mockAuthService.logout();
    } else {
      await signOut(auth);
    }
    setUser(null);
  }

  async function submitPayin(form, files) {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const id = `PAY-${now.slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;
      setAIProcessingQueue((items) => [{
        id: `AIJOB-${Date.now()}`,
        recordId: id,
        status: 'QUEUED',
        retries: 0,
        providerMode: 'LOCAL',
        createdAt: now
      }, ...items].slice(0, 500));
      const context = {
        ...form,
        branch: user.role === ROLES.BRANCH ? user.branch : form.branch
      };
      let uploadedDocuments = await Promise.all(
        (files.documentUploads || [])
          .filter((item) => item.storageFile && item.documentType && item.uploadStatus !== 'FAILED')
          .map(async (item, index) => {
            const imageHash = await digestFile(item.storageFile);
            const url = item.imageUrl || await uploadImage(id, item.storageFile, `${item.documentType.toLowerCase()}-${index + 1}`);
            const existingReferences = records
              .flatMap((record) => record.documents || [])
              .map((document) => document.parsedData?.referenceNo || document.parsedData?.transactionId || '')
              .filter(Boolean);
            const imageDataUrl = item.documentType === 'BANK_TRANSFER_SLIP' || item.documentType?.startsWith('PAYIN_')
              ? await toDataUrl(item.storageFile)
              : '';
            const bankSlipResult = item.documentType === 'BANK_TRANSFER_SLIP'
              ? await new BankTransferSlipParser({ configuration: aiConfiguration }).parse(imageDataUrl, {
                filename: item.filename || item.originalFilename || '',
                businessDate: context.date,
                existingReferences
              })
              : null;
            const payInResult = item.documentType?.startsWith('PAYIN_')
              ? await new PayInParser({ configuration: aiConfiguration }).parse(imageDataUrl, {
                documentType: item.documentType,
                filename: item.filename || item.originalFilename || '',
                depositDate: context.date,
                existingReferences
              })
              : null;
            const parserResult = bankSlipResult || payInResult;
            const parsedData = parserResult?.parsedData || await parseDocument(item.documentType, item.storageFile);
            const fingerprint = await fingerprintService.createFingerprint({
              ...item,
              imageHash,
              imageUrl: url,
              url
            });
            const duplicateResult = await duplicateDetectionService.detectDuplicate(item, {
              recordId: id,
              records,
              fingerprint: {
                ...fingerprint,
                imageHash
              },
              referenceNo: parsedData?.referenceNo || ''
            });
            const imageQuality = {
              score: item.fileSize <= 10 * 1024 * 1024 ? 92 : 0,
              status: item.fileSize <= 10 * 1024 * 1024 ? 'PASS' : 'FAIL',
              warnings: item.fileSize <= 10 * 1024 * 1024 ? [] : ['FILE_TOO_LARGE']
            };
            const classificationResult = {
              documentType: item.documentType,
              templateName: item.smartLabelSuggestion?.matchedTemplate || documentTypeLabels[item.documentType] || 'Unknown',
              confidence: item.smartLabelSuggestion?.confidence || (item.documentType === 'UNKNOWN' ? 45 : 88),
              detectedFeatures: [
                `documentType:${item.documentType}`,
                ...(item.smartLabelSuggestion?.matchedKeywords || []).map((keyword) => `keyword:${keyword}`)
              ],
              warnings: item.smartLabelSuggestion?.warnings || (item.documentType === 'UNKNOWN' ? ['UNKNOWN_DOCUMENT_TYPE'] : []),
              nextStep: item.documentType === 'UNKNOWN' ? 'MANUAL_REVIEW' : 'OCR'
            };
            return {
              id: item.id || `doc-${Date.now()}-${index}`,
              documentType: item.documentType,
              filename: item.filename,
              originalFilename: item.originalFilename,
              fileName: item.filename,
              fileSize: item.fileSize,
              mimeType: item.mimeType,
              contentType: item.mimeType,
              width: item.width,
              height: item.height,
              imageUrl: url,
              thumbnailUrl: item.thumbnailUrl,
              url,
              storagePath: item.storagePath || '',
              imageHash,
              md5Hash: fingerprint.md5Hash,
              fingerprint: {
                ...fingerprint,
                imageHash
              },
              imageQuality,
              classificationResult,
              detectedBank: bankSlipResult?.detectedBank || '',
              detectedTemplate: bankSlipResult?.detectedTemplate || '',
              rawText: parserResult?.rawText || '',
              textBlocks: parserResult?.textBlocks || [],
              fieldConfidence: parserResult?.fieldConfidence || {},
              parserResult,
              validationResult: parserResult?.validationResult,
              riskFlags: parserResult?.riskFlags || [],
              smartLabelSuggestion: item.smartLabelSuggestion || null,
              duplicateResult,
              uploadStatus: 'UPLOADED',
              rotation: item.rotation || 0,
              note: item.note || '',
              parsedData,
              uploadedAt: item.uploadedAt || now,
              uploadedBy: item.uploadedBy || user.email
            };
          })
      );
      const currentRecordDataset = uploadedDocuments.map((document) => ({
        recordId: id,
        documentId: document.id,
        filename: document.filename || document.originalFilename || document.fileName || '',
        referenceNo: document.parsedData?.referenceNo || '',
        imageHash: document.fingerprint?.imageHash || document.imageHash || '',
        md5Hash: document.fingerprint?.md5Hash || document.md5Hash || '',
        perceptualHash: document.fingerprint?.perceptualHash || '',
        averageHash: document.fingerprint?.averageHash || '',
        differenceHash: document.fingerprint?.differenceHash || ''
      }));
      uploadedDocuments = await Promise.all(uploadedDocuments.map(async (document) => {
        const duplicateResult = await duplicateDetectionService.detectDuplicate(document, {
          recordId: id,
          records,
          dataset: currentRecordDataset.filter((candidate) => candidate.documentId !== document.id),
          fingerprint: document.fingerprint,
          referenceNo: document.parsedData?.referenceNo || ''
        });
        await duplicateDetectionService.saveDocumentFingerprint({
          recordId: id,
          document,
          fingerprint: document.fingerprint,
          referenceNo: document.parsedData?.referenceNo || ''
        });
        return { ...document, duplicateResult };
      }));
      const documentUrls = uploadedDocuments.reduce((acc, document) => {
        acc[document.documentType] = [...(acc[document.documentType] || []), document.url];
        return acc;
      }, {});
      const imageHashes = uploadedDocuments.reduce((acc, document) => {
        acc[document.id] = document.imageHash;
        return acc;
      }, {});
      const timeline = {
        createdAt: now,
        documentsUploadedAt: uploadedDocuments.length ? now : '',
        posSummaryUploadedAt: uploadedDocuments.some((doc) => doc.documentType === 'POS_SUMMARY') ? now : '',
        payinUploadedAt: uploadedDocuments.some((doc) => doc.documentType.startsWith('PAYIN_')) ? now : '',
        transferSlipUploadedAt: uploadedDocuments.some((doc) => doc.documentType === 'BANK_TRANSFER_SLIP') ? now : '',
        aiCheckedAt: '',
        submittedToAccountingAt: now,
        reviewedAt: ''
      };
      const draft = {
        id,
        date: form.date,
        branch: context.branch,
        shift: form.shift,
        note: form.note,
        expectedAmount: 0,
        branchAmount: 0,
        transferSlipAmount: 0,
        aiAmount: 0,
        difference: 0,
        documents: uploadedDocuments,
        documentUrls,
        imageHashes,
        referenceNo: '',
        bankName: '',
        aiStatus: 'PENDING',
        aiConfidence: 0,
        aiDocuments: {},
        comparisons: {},
        status: 'PENDING_ACCOUNTING',
        createdBy: user.email,
        createdAt: now,
        reviewedBy: '',
        reviewedAt: '',
        timeline,
        accountingComment: ''
      };
      const depositBatch = depositBatchService.buildBatchForRecord(draft, [...records, draft]);
      const shiftPayinMatches = shiftMatchingService.buildMatchesForRecord(draft, [...records, draft]);
      const shiftReconciliation = shiftReconciliationService.buildForRecord(draft);
      const validationResult = validationEngine.validatePayinRecord(draft);
      const duplicateRiskFlags = uploadedDocuments.flatMap((document) => document.duplicateResult?.riskFlags || []);
      const documentRiskFlags = uploadedDocuments.flatMap((document) => document.riskFlags || []);
      const depositBatchRiskFlags = depositBatch.riskFlags || [];
      const shiftMatchRiskFlags = shiftPayinMatches.flatMap((match) => match.riskFlags || []);
      const reconciliationRiskFlags = shiftReconciliation.riskFlags || [];
      const riskFlags = [...new Set([...(validationResult.flags || []), ...duplicateRiskFlags, ...documentRiskFlags, ...depositBatchRiskFlags, ...shiftMatchRiskFlags, ...reconciliationRiskFlags])];
      const hasHighRiskDuplicate = uploadedDocuments.some((document) => ['FAIL', 'HIGH_RISK'].includes(document.duplicateResult?.status));
      const recordWithRisk = {
        ...draft,
        depositBatch,
        shiftPayinMatches,
        shiftReconciliation,
        riskFlags
      };
      const businessExceptionSummary = businessExceptionEngine.summarize(recordWithRisk);
      await saveRecord({
        ...recordWithRisk,
        depositBatch,
        shiftPayinMatches,
        shiftReconciliation,
        businessExceptions: businessExceptionSummary.exceptions,
        businessExceptionRiskScore: businessExceptionSummary.riskScore,
        businessExceptionRiskLevel: businessExceptionSummary.riskLevel,
        status: hasHighRiskDuplicate ? 'HIGH_RISK' : draft.status,
        validationResult,
        validationComparisons: validationResult.comparisons,
        validationTotalComparison: validationResult.totalComparison,
        validationDateResults: validationResult.dateResults,
        riskScore: Math.max(businessExceptionSummary.riskScore, Math.min(100, riskFlags.reduce((sum, flag) => sum + (flag.includes('EXACT') ? 80 : flag.includes('REFERENCE_NO') ? 60 : 20), 0))),
        riskFlags
      }, null, 'CREATE_PAYIN');
      setNotice('สร้าง Pay-in record และส่งให้บัญชีตรวจสอบแล้ว');
    } finally {
      setLoading(false);
    }
  }

  async function reviewRecord(record, status, accountingComment) {
    if (status === 'APPROVED' && hasBlockingReviewRisk(record)) {
      setNotice('รายการนี้มีความเสี่ยงที่ห้าม Approve ทันที ต้อง Mark as High Risk หรือ Return เท่านั้น');
      return;
    }
    const before = record;
    const reviewedAt = new Date().toISOString();
    const after = {
      ...record,
      status,
      accountingComment,
      reviewedBy: user.email,
      reviewedAt,
      timeline: { ...(record.timeline || {}), reviewedAt }
    };
    await saveRecord(after, before, status === 'APPROVED' ? 'APPROVE_PAYIN' : 'RETURN_PAYIN');
  }

  async function saveAdmin(collectionName, item) {
    if (hasFirebase) {
      await setDoc(doc(db, collectionName, item.id), item, { merge: true });
      await addAudit(`UPSERT_${collectionName.toUpperCase()}`, null, item);
      await refreshData();
      return;
    }
    if (collectionName === 'branches') {
      setBranches((items) => upsert(items, item));
    } else {
      setUsers((items) => upsert(items, item));
    }
    await addAudit(`UPSERT_${collectionName.toUpperCase()}`, null, item);
  }

  function addLabelHistory(entry) {
    const savedEntry = labelHistoryRepository.add({
      ...entry,
      changedBy: user?.email || 'system',
      changedAt: new Date().toISOString()
    });
    setLabelHistory((items) => [savedEntry, ...items].slice(0, 10000));
    return savedEntry;
  }

  if (!user) {
    return <LoginPage loading={loading} notice={notice} roles={mockAuthService.listLoginRoles()} onLogin={handleLogin} />;
  }

  const tabs = roleTabs[user.role] || ['Submit'];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <strong>D-FARM Pay-in AI V1</strong>
            <span>{hasFirebase ? 'Firebase connected' : 'Demo mode'}</span>
          </div>
        </div>
        <nav>
          {tabs.map((tab) => (
            <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
              {tab === 'Submit' && <Upload size={18} />}
              {tab === 'Mobile' && <FileImage size={18} />}
              {tab === 'CaseManagement' && <UserCog size={18} />}
              {tab === 'AIAssistant' && <Search size={18} />}
              {tab === 'Evidence' && <FileImage size={18} />}
              {tab === 'MasterData' && <Building2 size={18} />}
              {tab === 'DataGovernance' && <ShieldCheck size={18} />}
              {tab === 'ExecutiveBI' && <BarChart3 size={18} />}
              {tab === 'InternalAudit' && <ShieldCheck size={18} />}
              {tab === 'Compliance' && <Check size={18} />}
              {tab === 'Review' && <ShieldCheck size={18} />}
              {tab === 'Operations' && <BarChart3 size={18} />}
              {tab === 'Launch' && <Check size={18} />}
              {tab === 'Integration' && <Settings size={18} />}
              {tab === 'ShiftReconciliation' && <ShieldCheck size={18} />}
              {tab === 'ShiftMatching' && <Banknote size={18} />}
              {tab === 'DepositBatch' && <Banknote size={18} />}
              {tab === 'Workflow' && <ShieldCheck size={18} />}
              {tab === 'Platform' && <Settings size={18} />}
              {tab === 'GoLive' && <Check size={18} />}
              {tab === 'BranchRisk' && <AlertTriangle size={18} />}
              {tab === 'Audit' && <BarChart3 size={18} />}
              {tab === 'AIDataset' && <FileImage size={18} />}
              {tab === 'AISettings' && <Settings size={18} />}
              {tab === 'AITest' && <ShieldCheck size={18} />}
              {tab === 'OCRTest' && <FileImage size={18} />}
              {tab === 'OpenCVTest' && <FileImage size={18} />}
              {tab === 'ShiftReportAITest' && <FileImage size={18} />}
              {tab === 'BankTransferSlipAITest' && <FileImage size={18} />}
              {tab === 'Settings' && <Settings size={18} />}
              {menuLabels[tab]}
            </button>
          ))}
        </nav>
        <div className="profile">
          <span>{user.name}</span>
          <strong>{user.role}</strong>
          <small>{user.branch}</small>
          <button onClick={handleLogout}><LogOut size={16} /> ออกจากระบบ</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{menuPageTitles[activeTab]}</h1>
            <p>ผู้ใช้: {user.name} | สาขา: {user.branch} | Role: {user.role}</p>
          </div>
          <button className="ghost" onClick={refreshData} disabled={loading}><RotateCcw size={16} /> รีเฟรช</button>
        </header>
        {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
        {activeTab === 'Submit' && <BranchSubmit user={user} branches={branches} records={visibleRecords} onSubmit={submitPayin} loading={loading} onLabelCorrection={addLabelHistory} />}
        {activeTab === 'Mobile' && <MobileOperationsPage records={visibleRecords} allRecords={records} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'CaseManagement' && <CaseManagementPage user={user} records={visibleRecords} onAuditAction={addAudit} />}
        {activeTab === 'AIAssistant' && <AIKnowledgeAssistantPage records={records} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Evidence' && <DocumentEvidencePage records={visibleRecords} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'MasterData' && <MasterDataCenterPage user={user} onAuditAction={addAudit} />}
        {activeTab === 'DataGovernance' && <DataGovernancePage records={visibleRecords} user={user} onAuditAction={addAudit} />}
        {activeTab === 'ExecutiveBI' && <ExecutiveAnalyticsPage records={records} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'InternalAudit' && <InternalAuditManagementPage records={visibleRecords} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Compliance' && <ComplianceGovernancePage records={visibleRecords} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Review' && <DocumentInbox user={user} branches={branches} records={visibleRecords} onReview={reviewRecord} onSaveRecord={saveRecord} />}
        {activeTab === 'Operations' && <OperationsCenter records={records} visibleRecords={visibleRecords} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Launch' && <EnterpriseLaunchCenter records={records} visibleRecords={visibleRecords} auditLogs={auditLogs} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Integration' && <IntegrationDashboard user={user} onAuditAction={addAudit} />}
        {activeTab === 'Workflow' && <WorkflowDashboard records={visibleRecords} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Platform' && <PlatformConsole user={user} onAuditAction={addAudit} />}
        {activeTab === 'GoLive' && <ProductionReadinessDashboard user={user} onAuditAction={addAudit} />}
        {activeTab === 'ShiftReconciliation' && <ShiftReconciliationViewer records={visibleRecords} branches={branches} aiProcessingQueue={aiProcessingQueue} />}
        {activeTab === 'ShiftMatching' && <ShiftPayinMatchViewer records={visibleRecords} branches={branches} />}
        {activeTab === 'DepositBatch' && <DepositBatchViewer records={visibleRecords} branches={branches} />}
        {activeTab === 'BranchRisk' && <BranchRiskDashboard records={visibleRecords} user={user} onAuditAction={addAudit} />}
        {activeTab === 'Audit' && <AuditDashboard records={visibleRecords} auditLogs={auditLogs} />}
        {activeTab === 'AIDataset' && <AIDatasetManager records={records} labels={datasetLabels} labelHistory={labelHistory} onLabelsChange={setDatasetLabels} onLabelCorrection={addLabelHistory} />}
        {activeTab === 'AISettings' && <AISettings configuration={aiConfiguration} onSave={setAIConfiguration} />}
        {activeTab === 'AITest' && <AITestPage configuration={aiConfiguration} onConfigurationChange={setAIConfiguration} />}
        {activeTab === 'OCRTest' && <OCRTestPage configuration={aiConfiguration} onConfigurationChange={setAIConfiguration} />}
        {activeTab === 'OpenCVTest' && <OpenCVTestPage configuration={aiConfiguration} onConfigurationChange={setAIConfiguration} />}
        {activeTab === 'ShiftReportAITest' && <ShiftReportAITestPage configuration={aiConfiguration} />}
        {activeTab === 'BankTransferSlipAITest' && <BankTransferSlipAITestPage configuration={aiConfiguration} records={records} />}
        {activeTab === 'Settings' && <AdminSettings branches={branches} users={users} onSave={saveAdmin} />}
      </main>
    </div>
  );
}

function upsert(items, item) {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...items];
}

function Login({ loading, notice, onLogin }) {
  const [email, setEmail] = useState('branch@dfarm.test');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState(ROLES.BRANCH);

  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="brand large">
          <div className="brand-mark">D</div>
          <div>
            <strong>D-FARM Pay-in AI V1</strong>
            <span>Branch deposit control</span>
          </div>
        </div>
        <h1>เข้าสู่ระบบ</h1>
        <p>ใช้ Firebase Auth เมื่อใส่ค่า `.env` แล้ว หรือใช้ Demo mode เพื่อทดสอบแต่ละบทบาทได้ทันที</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label>Demo role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={ROLES.BRANCH}>BRANCH</option>
            <option value={ROLES.ACCOUNTING}>ACCOUNTING</option>
            <option value={ROLES.AUDIT}>AUDIT</option>
            <option value={ROLES.REGIONAL_MANAGER}>REGIONAL_MANAGER</option>
            <option value={ROLES.EXECUTIVE}>EXECUTIVE</option>
            <option value={ROLES.ADMIN}>ADMIN</option>
          </select>
        </label>
        <button className="primary" disabled={loading} onClick={() => onLogin(email, password, role)}>
          <ShieldCheck size={18} /> Login
        </button>
        {notice && <div className="notice">{notice}</div>}
      </section>
      <section className="login-visual">
        <Banknote size={68} />
        <h2>ตรวจยอดขายถึงยอดฝาก</h2>
        <p>Mock OCR อ่าน POS Summary, ใบ Pay-in และสลิปโอน ก่อนส่งให้บัญชีตรวจสอบ</p>
      </section>
    </div>
  );
}

function BranchSubmit({ user, branches, records, onSubmit, loading, onLabelCorrection }) {
  const [form, setForm] = useState({ ...emptyPayin, branch: user.branch });
  const [documentUploads, setDocumentUploads] = useState([
    { id: `upload-${Date.now()}`, documentType: 'POS_SUMMARY', uploadStatus: 'EMPTY', note: '', rotation: 0 }
  ]);
  const [uploadNotice, setUploadNotice] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortMode, setSortMode] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCount, setVisibleCount] = useState(10);
  const [bulkDragging, setBulkDragging] = useState(false);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setDocumentUpload = (id, patch) => {
    setDocumentUploads((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const addDocumentUpload = () => {
    if (false) {
      setUploadNotice('เพิ่มเอกสารได้สูงสุด 20 ไฟล์ต่อ Pay-in Record');
      return;
    }
    setDocumentUploads((items) => [
      ...items,
      { id: `upload-${Date.now()}-${items.length}`, documentType: 'BANK_TRANSFER_SLIP', uploadStatus: 'EMPTY', note: '', rotation: 0 }
    ]);
  };
  const removeDocumentUpload = (id) => {
    setDocumentUploads((items) => items.length === 1 ? items : items.filter((item) => item.id !== id));
  };
  const enrichSmartLabel = async (document) => {
    const suggestion = await smartLabelService.suggestDocumentLabel(document, {
      fingerprint: document.fingerprint,
      imageQuality: document.imageQuality
    });
    const documentType = suggestion.action === 'AUTO_SELECT'
      ? suggestion.suggestedLabel
      : suggestion.action === 'UNKNOWN'
        ? 'UNKNOWN'
        : document.documentType;
    return {
      ...document,
      documentType,
      smartLabelSuggestion: suggestion,
      imageQuality: suggestion.imageQuality
    };
  };
  const handleLabelChange = (id, nextLabel) => {
    const current = documentUploads.find((item) => item.id === id);
    if (current?.documentType !== nextLabel) {
      onLabelCorrection?.({
        imageId: id,
        recordId: '',
        documentId: id,
        filename: current?.filename || current?.originalFilename || '',
        fromLabel: current?.documentType || '',
        toLabel: nextLabel,
        suggestedLabel: current?.smartLabelSuggestion?.suggestedLabel || '',
        confidence: current?.smartLabelSuggestion?.confidence || 0,
        source: 'UPLOAD_OVERRIDE'
      });
    }
    setDocumentUpload(id, { documentType: nextLabel });
  };
  const prepareFile = async (id, file) => {
    const current = documentUploads.find((item) => item.id === id);
    setDocumentUpload(id, { uploadStatus: 'PROCESSING', error: '' });
    const result = await mockStorageService.prepareDocumentFile({
      file,
      documentType: current?.documentType || 'UNKNOWN',
      uploadedBy: user.email,
      note: current?.note || ''
    });
    if (result.error) {
      setDocumentUpload(id, { uploadStatus: 'FAILED', error: result.error });
      return;
    }
    const enrichedResult = await enrichSmartLabel(result);
    setDocumentUpload(id, enrichedResult);
  };
  const handleBulkFiles = async (fileList) => {
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;
    setUploadNotice(`Preparing ${selectedFiles.length} document(s)...`);
    const preparedItems = await Promise.all(selectedFiles.map(async (file, index) => {
      const fallback = {
        id: `upload-${Date.now()}-${index}`,
        documentType: 'UNKNOWN',
        filename: file.name,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadStatus: 'PROCESSING',
        note: '',
        rotation: 0
      };
      const result = await mockStorageService.prepareDocumentFile({
        file,
        documentType: 'UNKNOWN',
        uploadedBy: user.email,
        note: ''
      });
      if (result.error) return { ...fallback, uploadStatus: 'FAILED', error: result.error };
      return enrichSmartLabel(result);
    }));
    setDocumentUploads((items) => [...items, ...preparedItems]);
    setUploadNotice(`Added ${preparedItems.length} document(s). Only files over 10MB or unsupported types are rejected.`);
  };
  const filteredDocuments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return documentUploads.filter((item) => {
      const matchesType = filterType === 'ALL' || item.documentType === filterType;
      const haystack = [
        item.filename,
        item.originalFilename,
        item.documentType,
        documentTypeLabels[item.documentType],
        item.note,
        item.uploadStatus
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesType && (!query || haystack.includes(query));
    });
  }, [documentUploads, filterType, searchText]);
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((left, right) => {
      if (sortMode === 'oldest') return String(left.uploadedAt || '').localeCompare(String(right.uploadedAt || ''));
      if (sortMode === 'filename') return String(left.filename || left.originalFilename || '').localeCompare(String(right.filename || right.originalFilename || ''));
      if (sortMode === 'documentType') return String(left.documentType || '').localeCompare(String(right.documentType || ''));
      if (sortMode === 'sizeDesc') return Number(right.fileSize || 0) - Number(left.fileSize || 0);
      return String(right.uploadedAt || right.id || '').localeCompare(String(left.uploadedAt || left.id || ''));
    });
  }, [filteredDocuments, sortMode]);
  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageDocuments = sortedDocuments.slice(pageStart, pageStart + pageSize);
  const visibleDocuments = pageDocuments.slice(0, visibleCount);
  useEffect(() => {
    setPage(1);
    setVisibleCount(Number(pageSize));
  }, [searchText, filterType, sortMode, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const readyToSubmit = form.date && form.branch && form.shift && documentUploads.some((item) => item.storageFile && item.documentType && item.uploadStatus !== 'FAILED');

  return (
    <div className="content-grid">
      <section className="panel form-panel">
        <h2>สร้างรายการ Pay-in</h2>
        <div className="form-grid">
          <label>วันที่<input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} /></label>
          <label>Branch
            <select value={user.role === ROLES.BRANCH ? user.branch : form.branch} disabled={user.role === ROLES.BRANCH} onChange={(e) => setField('branch', e.target.value)}>
              {branches.filter((branch) => branch.active).map((branch) => <option key={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label>กะ
            <select value={form.shift} onChange={(e) => setField('shift', e.target.value)}>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>
          </label>
          <label className="span-2">หมายเหตุ<textarea value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="ระบุหมายเหตุของสาขา ถ้ามี" /></label>
        </div>
        <div className="document-upload-head">
          <h3>เอกสารแนบ</h3>
          <button className="ghost" type="button" onClick={addDocumentUpload}>เพิ่มเอกสาร</button>
        </div>
        {uploadNotice && <div className="notice" onClick={() => setUploadNotice('')}>{uploadNotice}</div>}
        <div
          className={bulkDragging ? 'bulk-drop-zone dragging' : 'bulk-drop-zone'}
          onDragOver={(event) => {
            event.preventDefault();
            setBulkDragging(true);
          }}
          onDragLeave={() => setBulkDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setBulkDragging(false);
            handleBulkFiles(event.dataTransfer.files);
          }}
        >
          <FileImage size={22} />
          <span>ลากไฟล์หลายใบมาวางที่นี่ หรือเลือกไฟล์จากเครื่อง</span>
          <small>รองรับ jpg, jpeg, png, pdf ขนาดไม่เกิน 10MB ต่อไฟล์ และไม่จำกัดจำนวนเอกสาร</small>
          <label className="ghost bulk-upload-button">
            เลือกหลายไฟล์
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" capture="environment" onChange={(e) => handleBulkFiles(e.target.files)} />
          </label>
        </div>
        <div className="document-manager-toolbar">
          <label className="search"><Search size={16} /><input placeholder="ค้นหา filename, type, note, status" value={searchText} onChange={(e) => setSearchText(e.target.value)} /></label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">ทุกประเภทเอกสาร</option>
            {[...BRANCH_DOCUMENT_TYPES, 'UNKNOWN'].map((type) => <option key={type} value={type}>{documentTypeLabels[type] || type}</option>)}
          </select>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
            <option value="newest">ล่าสุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="filename">เรียงตามชื่อไฟล์</option>
            <option value="documentType">เรียงตามประเภท</option>
            <option value="sizeDesc">ไฟล์ใหญ่ก่อน</option>
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value={10}>10 ต่อหน้า</option>
            <option value={25}>25 ต่อหน้า</option>
            <option value={50}>50 ต่อหน้า</option>
          </select>
        </div>
        <div className="document-count">แสดง {visibleDocuments.length} จาก {sortedDocuments.length} รายการที่ตรงเงื่อนไข / ทั้งหมด {documentUploads.length} รายการ</div>
        <div className="document-upload-list">
          {visibleDocuments.map((item, index) => (
            <DocumentUploadItem
              key={item.id}
              item={item}
              index={pageStart + index}
              canRemove={documentUploads.length > 1}
              onChange={setDocumentUpload}
              onLabelChange={handleLabelChange}
              onFile={prepareFile}
              onRemove={removeDocumentUpload}
            />
          ))}
          {!visibleDocuments.length && <div className="empty">ไม่พบเอกสารตามเงื่อนไขที่เลือก</div>}
        </div>
        <div className="document-pagination">
          <button className="ghost" type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</button>
          <span>หน้า {safePage} / {totalPages}</span>
          <button className="ghost" type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>ถัดไป</button>
          <button className="ghost" type="button" disabled={visibleCount >= pageDocuments.length} onClick={() => setVisibleCount((value) => value + 10)}>โหลดเพิ่ม</button>
        </div>
        <button className="primary" disabled={loading || !readyToSubmit} onClick={() => onSubmit(form, { documentUploads })}>
          <Upload size={18} /> ส่งรายการให้บัญชีตรวจสอบ
        </button>
      </section>

      <section className="panel">
        <h2>รายการของสาขา</h2>
        <RecordTable records={records} compact />
      </section>
    </div>
  );
}

function DocumentUploadItem({ item, index, canRemove, onChange, onLabelChange, onFile, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const previewSource = item.previewUrl || (item.thumbnailUrl?.startsWith('data:') ? item.thumbnailUrl : '');
  const pickFile = (file) => {
    if (file) onFile(item.id, file);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  };
  const rotate = () => {
    onChange(item.id, { rotation: ((item.rotation || 0) + 90) % 360 });
  };

  return (
    <div className={dragging ? 'document-upload-item dragging' : 'document-upload-item'}>
      <div className="document-preview">
        {previewSource ? (
          <img loading="lazy" src={previewSource} alt={item.filename || 'Document preview'} style={{ transform: `rotate(${item.rotation || 0}deg)` }} />
        ) : item.mimeType === 'application/pdf' ? (
          <div className="pdf-preview">PDF</div>
        ) : (
          <div className="empty-preview"><FileImage size={28} />Preview</div>
        )}
      </div>
      <div className="document-upload-fields">
        <label>ประเภทเอกสาร
          <select value={item.documentType} onChange={(e) => onLabelChange(item.id, e.target.value)}>
            {[...BRANCH_DOCUMENT_TYPES, 'UNKNOWN'].map((type) => (
              <option key={type} value={type}>{documentTypeLabels[type] || 'Unknown'}</option>
            ))}
          </select>
        </label>
        <label
          className="document-file-control"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <FileImage size={20} />
          <span>{item.filename || `เลือกไฟล์ / ลากไฟล์มาวาง / ถ่ายรูป ใบที่ ${index + 1}`}</span>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
        <label>หมายเหตุเอกสาร
          <input value={item.note || ''} onChange={(e) => onChange(item.id, { note: e.target.value })} placeholder="หมายเหตุของเอกสารใบนี้" />
        </label>
        {item.error && <div className="upload-error">{item.error}</div>}
        {item.smartLabelSuggestion && (
          <div className={`smart-label-card ${item.smartLabelSuggestion.action?.toLowerCase()}`}>
            <strong>Suggested Label: {documentTypeLabels[item.smartLabelSuggestion.suggestedLabel] || item.smartLabelSuggestion.suggestedLabel}</strong>
            <span>Confidence: {item.smartLabelSuggestion.confidence}% | Action: {item.smartLabelSuggestion.action}</span>
            <span>Reason: {item.smartLabelSuggestion.reason}</span>
            <span>Matched Template: {item.smartLabelSuggestion.matchedTemplate || '-'}</span>
            <span>Matched Keywords: {(item.smartLabelSuggestion.matchedKeywords || []).join(', ') || '-'}</span>
            <span>Image Quality: {item.smartLabelSuggestion.imageQuality?.score ?? '-'} ({item.smartLabelSuggestion.imageQuality?.status || '-'})</span>
            {item.smartLabelSuggestion.action === 'SUGGEST' && (
              <button className="ghost" type="button" onClick={() => onLabelChange(item.id, item.smartLabelSuggestion.suggestedLabel)}>
                ใช้ Label แนะนำ
              </button>
            )}
          </div>
        )}
        <div className="document-meta">
          <span>Filename: {item.filename || '-'}</span>
          <span>Size: {formatFileSize(item.fileSize)}</span>
          <span>Type: {item.mimeType || '-'}</span>
          <span>Dimension: {item.width && item.height ? `${item.width} x ${item.height}` : '-'}</span>
          <span>UploadedAt: {item.uploadedAt ? formatDate(item.uploadedAt) : '-'}</span>
          <span>UploadedBy: {item.uploadedBy || '-'}</span>
          <span>Status: {item.uploadStatus || 'EMPTY'}</span>
          <span>Storage: {item.storagePath || '-'}</span>
          <span>Duplicate: {item.duplicateResult?.isDuplicate ? item.duplicateResult.duplicateType : 'No'}</span>
          <span>Similarity: {item.duplicateResult ? item.duplicateResult.similarityScore : '-'}</span>
          {item.compressed && <span>Compressed: yes</span>}
        </div>
      </div>
      <div className="document-actions">
        <button className="ghost" type="button" onClick={rotate} disabled={!previewSource}>หมุน 90°</button>
        <label className="ghost replace-button">
          แทนที่ไฟล์
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
        <button className="danger" type="button" disabled={!canRemove} onClick={() => onRemove(item.id)}>ลบ</button>
      </div>
    </div>
  );
}

function FileInput({ title, subtitle, onChange }) {
  const [name, setName] = useState('');
  return (
    <label className="file-box">
      <FileImage size={24} />
      <span>{title}</span>
      <em>{subtitle}</em>
      <small>{name || 'เลือกไฟล์รูปภาพ'}</small>
      <input type="file" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        setName(file?.name || '');
        onChange(file);
      }} />
    </label>
  );
}

function DocumentInbox({ user, branches, records, onReview, onSaveRecord }) {
  const [queryText, setQueryText] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    branch: 'ALL',
    status: 'ALL',
    riskLevel: 'ALL',
    documentType: 'ALL',
    duplicateOnly: false,
    missingDocumentOnly: false
  });
  const selectedRecord = records.find((record) => record.id === selectedRecordId);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const filtered = useMemo(() => {
    const query = queryText.trim().toLowerCase();
    return records.filter((record) => {
      const documents = record.documents || [];
      const searchable = [
        record.referenceNo,
        record.branch,
        record.createdBy,
        record.id,
        ...documents.map((document) => document.filename || document.originalFilename || document.fileName || '')
      ].filter(Boolean).join(' ').toLowerCase();
      if (filters.dateFrom && record.date < filters.dateFrom) return false;
      if (filters.dateTo && record.date > filters.dateTo) return false;
      if (filters.branch !== 'ALL' && record.branch !== filters.branch) return false;
      if (filters.status !== 'ALL' && record.status !== filters.status) return false;
      if (filters.riskLevel !== 'ALL' && getRiskLevel(record.riskScore || 0) !== filters.riskLevel) return false;
      if (filters.documentType !== 'ALL' && !documents.some((document) => document.documentType === filters.documentType)) return false;
      if (filters.duplicateOnly && getDuplicateStatus(record) === 'NONE') return false;
      if (filters.missingDocumentOnly && !hasMissingDocument(record)) return false;
      return !query || searchable.includes(query);
    });
  }, [filters, queryText, records]);
  const handleReviewed = async (record, status, comment) => {
    await onReview(record, status, comment);
    setSelectedRecordId('');
  };

  if (selectedRecord) {
    return (
      <AccountingReviewPage
        record={selectedRecord}
        canAct={canReview(user)}
        onBack={() => setSelectedRecordId('')}
        onReview={handleReviewed}
        onSaveRecord={onSaveRecord}
        records={records}
      />
    );
  }

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Document Inbox</h2>
        <label className="search"><Search size={16} /><input placeholder="ค้นหา reference, filename, branch, sender" value={queryText} onChange={(e) => setQueryText(e.target.value)} /></label>
      </div>
      <div className="inbox-filters">
        <label>วันที่เริ่มต้น<input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} /></label>
        <label>วันที่สิ้นสุด<input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} /></label>
        <label>สาขา<select value={filters.branch} onChange={(e) => setFilter('branch', e.target.value)}><option value="ALL">ทุกสาขา</option>{branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select></label>
        <label>สถานะ<select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}><option value="ALL">ทุกสถานะ</option>{['PENDING_ACCOUNTING', 'APPROVED', 'RETURNED', 'HIGH_RISK', 'NEED_RETAKE', 'CLOSED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>Risk Level<select value={filters.riskLevel} onChange={(e) => setFilter('riskLevel', e.target.value)}><option value="ALL">ทั้งหมด</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
        <label>Document Type<select value={filters.documentType} onChange={(e) => setFilter('documentType', e.target.value)}><option value="ALL">ทุกประเภท</option>{[...BRANCH_DOCUMENT_TYPES, 'UNKNOWN'].map((type) => <option key={type} value={type}>{documentTypeLabels[type] || type}</option>)}</select></label>
        <label className="checkline"><input type="checkbox" checked={filters.duplicateOnly} onChange={(e) => setFilter('duplicateOnly', e.target.checked)} /> Duplicate Only</label>
        <label className="checkline"><input type="checkbox" checked={filters.missingDocumentOnly} onChange={(e) => setFilter('missingDocumentOnly', e.target.checked)} /> Missing Document Only</label>
      </div>
      <DocumentInboxTable records={filtered} onOpen={(record) => setSelectedRecordId(record.id)} />
    </section>
  );
}

function AccountingReviewPage({ record, canAct, onBack, onReview, onSaveRecord, records = [] }) {
  const mappableDocuments = useMemo(() => (record.documents || []).filter((document) => (
    document.documentType === 'POS_SUMMARY' || document.documentType === 'BANK_TRANSFER_SLIP' || document.documentType?.startsWith('PAYIN_')
  )), [record.documents]);
  const [correctionHistory, setCorrectionHistory] = useState(() => readStore('accountingFieldCorrectionHistory', []));
  const [learningDataset, setLearningDataset] = useState(() => readStore('accountingFieldLearningDataset', []));
  const fieldMapping = useMemo(() => mappableDocuments.flatMap((document) => Object.entries(document.parsedData || {}).map(([field, value]) => ({
    documentId: document.id,
    documentType: document.documentType,
    ocrText: document.rawText || document.ocr?.rawText || document.parsedData?.rawText || '',
    field,
    aiResult: value,
    humanCorrection: '',
    confidence: document.fieldConfidence?.[field] || document.aiConfidence || record.aiConfidence || 90
  }))), [mappableDocuments, record.aiConfidence]);

  useEffect(() => {
    writeStore('accountingFieldCorrectionHistory', correctionHistory);
  }, [correctionHistory]);

  useEffect(() => {
    writeStore('accountingFieldLearningDataset', learningDataset);
  }, [learningDataset]);

  const saveAccountingCorrection = (row, correctedValue) => {
    if (!row || correctedValue === undefined || correctedValue === '') return;
    const changedAt = new Date().toISOString();
    const correction = {
      id: `acct_corr_${Date.now()}_${row.field}`,
      recordId: record.id,
      documentId: row.documentId || '',
      documentType: row.documentType || 'UNKNOWN',
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      confidence: row.confidence,
      source: 'ACCOUNTING_REVIEW',
      changedAt
    };
    setCorrectionHistory((items) => [correction, ...items]);
    setLearningDataset((items) => [{
      id: `acct_learn_${Date.now()}_${row.field}`,
      recordId: record.id,
      documentType: row.documentType || 'UNKNOWN',
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      source: 'ACCOUNTING_REVIEW',
      createdAt: changedAt
    }, ...items]);
  };

  return (
    <section className="panel accounting-review-page">
      <div className="section-head">
        <div>
          <h2>Accounting Review</h2>
          <p>{record.id} | {record.branch} | {record.date} | {record.shift}</p>
        </div>
        <button className="ghost" type="button" onClick={onBack}>กลับไป Inbox</button>
      </div>
      <ReviewCard record={record} canAct={canAct} onReview={onReview} onSaveRecord={onSaveRecord} records={records} />
      {canAct && fieldMapping.length > 0 && (
        <FieldMappingViewer mapping={fieldMapping} onCorrection={saveAccountingCorrection} />
      )}
    </section>
  );
}

function getRiskLevel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

function getDuplicateStatus(record) {
  const duplicateDocuments = (record.documents || []).filter((document) => document.duplicateResult?.isDuplicate);
  if (!duplicateDocuments.length) return 'NONE';
  if (duplicateDocuments.some((document) => document.duplicateResult?.status === 'FAIL')) return 'FAIL';
  if (duplicateDocuments.some((document) => document.duplicateResult?.status === 'HIGH_RISK')) return 'HIGH_RISK';
  return 'WARN';
}

function hasMissingDocument(record) {
  const types = new Set((record.documents || []).map((document) => document.documentType));
  return !types.has('POS_SUMMARY') || !(record.documents || []).some((document) => document.documentType?.startsWith('PAYIN_'));
}

function validationStatus(record) {
  if (record.validationResult?.valid === false) return 'FAIL';
  if (record.validationResult?.valid === true) return 'PASS';
  return 'PENDING';
}

function DocumentInboxTable({ records, onOpen }) {
  if (!records.length) return <div className="empty">ไม่พบรายการตามเงื่อนไข</div>;
  return (
    <div className="table-wrap inbox-table">
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>สาขา</th>
            <th>รอบ</th>
            <th>เอกสาร</th>
            <th>สถานะ</th>
            <th>Risk</th>
            <th>Risk Flags</th>
            <th>Duplicate</th>
            <th>Validation</th>
            <th>ผู้ส่ง</th>
            <th>ส่งล่าสุด</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.date}</td>
              <td>{record.branch}</td>
              <td>{record.shift}</td>
              <td>{record.documents?.length || 0}</td>
              <td><StatusBadge status={record.status} /></td>
              <td>{record.riskScore || 0} ({getRiskLevel(record.riskScore || 0)})</td>
              <td><div className="flag-cell">{(record.riskFlags || []).slice(0, 4).map((flag) => <span key={flag}>{flag}</span>)}</div></td>
              <td>{getDuplicateStatus(record)}</td>
              <td>{validationStatus(record)}</td>
              <td>{record.createdBy || '-'}</td>
              <td>{formatDate(record.timeline?.submittedToAccountingAt || record.createdAt)}</td>
              <td><button className="ghost" type="button" onClick={() => onOpen(record)}>Review</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountingReview({ records, onReview }) {
  const [queryText, setQueryText] = useState('');
  const filtered = records.filter((record) => JSON.stringify(record).toLowerCase().includes(queryText.toLowerCase()));
  return (
    <section className="panel">
      <div className="section-head">
        <h2>ตรวจสอบ Pay-in</h2>
        <label className="search"><Search size={16} /><input placeholder="ค้นหา branch, reference, status" value={queryText} onChange={(e) => setQueryText(e.target.value)} /></label>
      </div>
      <div className="review-list">
        {filtered.map((record) => <ReviewCard key={record.id} record={record} onReview={onReview} />)}
      </div>
    </section>
  );
}

function BusinessExceptionPanel({ record, canAct, onSaveRecord }) {
  const [comment, setComment] = useState('');
  const [assignee, setAssignee] = useState('');
  const exceptions = record.businessExceptions?.length ? record.businessExceptions : businessExceptionEngine.summarize(record).exceptions;
  const summary = businessExceptionEngine.summarize({ ...record, businessExceptions: exceptions });

  const updateException = async (exception, status, extra = {}) => {
    if (!onSaveRecord) return;
    const before = record;
    const updated = exceptions.map((item) => item.exceptionId === exception.exceptionId ? {
      ...item,
      status,
      assignedTo: extra.assignedTo ?? item.assignedTo,
      comment: extra.comment ?? item.comment,
      falsePositive: Boolean(extra.falsePositive ?? item.falsePositive),
      resolvedBy: ['RESOLVED', 'REJECTED', 'IGNORED', 'FALSE_POSITIVE'].includes(status) ? (record.reviewedBy || 'accounting') : item.resolvedBy,
      resolvedAt: ['RESOLVED', 'REJECTED', 'IGNORED', 'FALSE_POSITIVE'].includes(status) ? new Date().toISOString() : item.resolvedAt
    } : item);
    const after = {
      ...record,
      businessExceptions: updated,
      businessExceptionRiskScore: businessExceptionEngine.scoreCalculator?.calculate?.(updated) ?? record.businessExceptionRiskScore,
      updatedAt: new Date().toISOString()
    };
    await onSaveRecord(after, before, `BUSINESS_EXCEPTION_${status}`);
    if (status === 'FALSE_POSITIVE') {
      const learningItems = readStore('businessExceptionFalsePositiveLearning', []);
      writeStore('businessExceptionFalsePositiveLearning', [{
        id: `fp_${Date.now()}_${exception.ruleCode}`,
        exceptionId: exception.exceptionId,
        ruleCode: exception.ruleCode,
        branchCode: exception.branchCode,
        businessDate: exception.businessDate,
        shift: exception.shift,
        comment: extra.comment || '',
        createdAt: new Date().toISOString()
      }, ...learningItems]);
    }
  };

  return (
    <section className="deposit-batch-panel">
      <div className="section-head">
        <div>
          <h3>Business Exception Panel</h3>
          <p>Business Exception is not Fraud. Accounting or Audit decides final interpretation.</p>
        </div>
        <div className="summary-grid compact">
          <Metric label="Risk Score" value={`${summary.riskScore}/100`} danger={summary.riskScore >= 61} />
          <Metric label="Risk Level" value={summary.riskLevel} danger={summary.riskLevel === 'CRITICAL' || summary.riskLevel === 'HIGH'} />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Severity</th><th>Category</th><th>Rule</th><th>Description</th><th>Status</th><th>Assigned</th><th>Action</th></tr></thead>
          <tbody>
            {exceptions.map((exception) => (
              <tr key={exception.exceptionId}>
                <td><span className={`mini-status ${String(exception.severity).toLowerCase()}`}>{exception.severity}</span></td>
                <td>{exception.category}</td>
                <td>{exception.ruleCode}</td>
                <td>{exception.description}</td>
                <td>{exception.status}</td>
                <td>{exception.assignedTo || '-'}</td>
                <td>
                  <div className="action-row">
                    <button className="ghost" disabled={!canAct} onClick={() => updateException(exception, 'RESOLVED', { comment })}>Resolve</button>
                    <button className="ghost" disabled={!canAct} onClick={() => updateException(exception, 'REJECTED', { comment })}>Reject</button>
                    <button className="ghost" disabled={!canAct} onClick={() => updateException(exception, 'IGNORED', { comment })}>Ignore</button>
                    <button className="ghost" disabled={!canAct} onClick={() => updateException(exception, 'ASSIGNED', { assignedTo: assignee, comment })}>Assign</button>
                    <button className="ghost" disabled={!canAct} onClick={() => updateException(exception, 'FALSE_POSITIVE', { falsePositive: true, comment })}>False Positive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!exceptions.length && <div className="empty">No business exception</div>}
      {canAct && (
        <div className="action-row">
          <label>Assign<input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="email or team" /></label>
          <label>Comment<input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="comment" /></label>
        </div>
      )}
    </section>
  );
}

function DepositBatchViewer({ records, branches }) {
  const [queryText, setQueryText] = useState('');
  const [filters, setFilters] = useState({ date: '', branch: 'ALL', status: 'ALL', risk: 'ALL', difference: 'ALL' });
  const batches = useMemo(() => depositBatchService.buildBatches(records), [records]);
  const filtered = useMemo(() => batches.filter((batch) => {
    const query = queryText.trim().toLowerCase();
    const searchable = [batch.batchId, batch.branchCode, batch.branchName, ...(batch.payInDocuments || []).map((document) => document.referenceNo)].join(' ').toLowerCase();
    if (filters.date && batch.depositDate !== filters.date) return false;
    if (filters.branch !== 'ALL' && batch.branchName !== filters.branch && batch.branchCode !== filters.branch) return false;
    if (filters.status !== 'ALL' && batch.status !== filters.status) return false;
    if (filters.risk !== 'ALL' && getRiskLevel(batch.riskScore || 0) !== filters.risk) return false;
    if (filters.difference === 'ONLY' && Number(batch.difference || 0) === 0) return false;
    return !query || searchable.includes(query);
  }), [batches, filters, queryText]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Deposit Batch Viewer</h2>
          <p>Validates cash deposit by batch: previous afternoon shift plus next morning shift.</p>
        </div>
        <label className="search"><Search size={16} /><input placeholder="Search batch, reference, branch" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
      </div>
      <div className="inbox-filters">
        <label>Date<input type="date" value={filters.date} onChange={(event) => setFilters((item) => ({ ...item, date: event.target.value }))} /></label>
        <label>Branch<select value={filters.branch} onChange={(event) => setFilters((item) => ({ ...item, branch: event.target.value }))}><option value="ALL">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(event) => setFilters((item) => ({ ...item, status: event.target.value }))}><option value="ALL">All</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="PENDING">PENDING</option></select></label>
        <label>Risk<select value={filters.risk} onChange={(event) => setFilters((item) => ({ ...item, risk: event.target.value }))}><option value="ALL">All</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
        <label>Difference<select value={filters.difference} onChange={(event) => setFilters((item) => ({ ...item, difference: event.target.value }))}><option value="ALL">All</option><option value="ONLY">Difference only</option></select></label>
      </div>
      <div className="deposit-batch-list">
        {filtered.map((batch) => <DepositBatchPanel key={batch.batchId} batch={batch} />)}
        {!filtered.length && <div className="empty">No deposit batch found</div>}
      </div>
    </section>
  );
}

function ShiftPayinMatchViewer({ records, branches }) {
  const [queryText, setQueryText] = useState('');
  const [filters, setFilters] = useState({ date: '', branch: 'ALL', status: 'ALL' });
  const matches = useMemo(() => shiftMatchingService.buildMatches(records), [records]);
  const filtered = matches.filter((match) => {
    const query = queryText.trim().toLowerCase();
    const searchable = [match.matchId, match.branchCode, match.branchName, match.shift, ...(match.payInDocuments || []).map((document) => document.referenceNo)].join(' ').toLowerCase();
    if (filters.date && match.businessDate !== filters.date) return false;
    if (filters.branch !== 'ALL' && match.branchName !== filters.branch && match.branchCode !== filters.branch) return false;
    if (filters.status !== 'ALL' && match.status !== filters.status) return false;
    return !query || searchable.includes(query);
  });
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Shift Pay-in Matching</h2>
          <p>Pay-in validation is always separated by shift.</p>
        </div>
        <label className="search"><Search size={16} /><input placeholder="Search match, reference, branch" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
      </div>
      <div className="inbox-filters">
        <label>Date<input type="date" value={filters.date} onChange={(event) => setFilters((item) => ({ ...item, date: event.target.value }))} /></label>
        <label>Branch<select value={filters.branch} onChange={(event) => setFilters((item) => ({ ...item, branch: event.target.value }))}><option value="ALL">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(event) => setFilters((item) => ({ ...item, status: event.target.value }))}><option value="ALL">All</option><option value="PASS">PASS</option><option value="WARN">WARN</option><option value="FAIL">FAIL</option></select></label>
      </div>
      <div className="deposit-batch-list">
        {filtered.map((match) => (
          <section key={match.matchId} className="deposit-batch-panel">
            <div className="section-head">
              <div>
                <h3>{match.matchId}</h3>
                <p>{match.branchName || match.branchCode} | {match.businessDate} | {match.shift}</p>
              </div>
              <StatusBadge status={match.status} />
            </div>
            <div className="summary-grid">
              <Metric label="Expected Cash" value={money(match.expectedCashAmount)} />
              <Metric label="Actual Pay-in" value={money(match.actualPayInAmount)} />
              <Metric label="Difference" value={money(match.difference)} danger={Number(match.difference || 0) !== 0} />
              <Metric label="Pay-in Docs" value={match.payInDocumentIds?.length || 0} />
            </div>
            <div className="flag-row">{(match.riskFlags || []).map((flag) => <span key={flag}>{flag}</span>)}</div>
          </section>
        ))}
        {!filtered.length && <div className="empty">No shift pay-in match found</div>}
      </div>
    </section>
  );
}

function ShiftReconciliationViewer({ records, branches, aiProcessingQueue = [] }) {
  const [queryText, setQueryText] = useState('');
  const [filters, setFilters] = useState({ branchCode: 'ALL', businessDate: '', shift: 'ALL', status: 'ALL', riskLevel: 'ALL', page: 1, pageSize: 20 });
  const result = useMemo(() => shiftReconciliationService.query(records, filters), [records, filters]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const searchedItems = result.items.filter((item) => {
    const query = queryText.trim().toLowerCase();
    if (!query) return true;
    return [item.reconciliationId, item.branchCode, item.branchName, item.shift, item.status].join(' ').toLowerCase().includes(query);
  });

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Shift Reconciliation</h2>
          <p>Designed for 100+ branches with branch/date/shift filters and paginated results.</p>
        </div>
        <label className="search"><Search size={16} /><input placeholder="Search reconciliation, branch, status" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
      </div>
      <div className="inbox-filters">
        <label>Date<input type="date" value={filters.businessDate} onChange={(event) => setFilters((item) => ({ ...item, businessDate: event.target.value, page: 1 }))} /></label>
        <label>Branch<select value={filters.branchCode} onChange={(event) => setFilters((item) => ({ ...item, branchCode: event.target.value, page: 1 }))}><option value="ALL">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.code || branch.name}>{branch.name}</option>)}</select></label>
        <label>Shift<select value={filters.shift} onChange={(event) => setFilters((item) => ({ ...item, shift: event.target.value, page: 1 }))}><option value="ALL">All</option><option value="MORNING">MORNING</option><option value="AFTERNOON">AFTERNOON</option></select></label>
        <label>Status<select value={filters.status} onChange={(event) => setFilters((item) => ({ ...item, status: event.target.value, page: 1 }))}><option value="ALL">All</option><option value="PASS">PASS</option><option value="WARN">WARN</option><option value="FAIL">FAIL</option></select></label>
        <label>Risk<select value={filters.riskLevel} onChange={(event) => setFilters((item) => ({ ...item, riskLevel: event.target.value, page: 1 }))}><option value="ALL">All</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
        <label>Page size<select value={filters.pageSize} onChange={(event) => setFilters((item) => ({ ...item, pageSize: Number(event.target.value), page: 1 }))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
      </div>
      <div className="document-pagination">
        <button className="ghost" disabled={filters.page <= 1} onClick={() => setFilters((item) => ({ ...item, page: item.page - 1 }))}>Previous</button>
        <span>Page {filters.page} / {totalPages} | Total {result.total}</span>
        <button className="ghost" disabled={filters.page >= totalPages} onClick={() => setFilters((item) => ({ ...item, page: item.page + 1 }))}>Next</button>
      </div>
      <div className="notice">AI background queue: {aiProcessingQueue.length} job(s). Local providers support retry and batch processing without changing business rules.</div>
      <div className="deposit-batch-list">
        {searchedItems.map((item) => <ShiftReconciliationPanel key={item.reconciliationId} reconciliation={item} compact />)}
        {!searchedItems.length && <div className="empty">No shift reconciliation found</div>}
      </div>
    </section>
  );
}

function ShiftReconciliationPanel({ reconciliation, compact = false }) {
  if (!reconciliation) return null;
  const allDocuments = [
    ...(reconciliation.payInDocuments || []),
    ...(reconciliation.bankTransferDocuments || []),
    ...(reconciliation.maemaneeDocuments || []),
    ...(reconciliation.crmDocuments || []),
    ...(reconciliation.debtorTransferDocuments || [])
  ];
  return (
    <section className="deposit-batch-panel">
      <div className="section-head">
        <div>
          <h3>Shift Reconciliation</h3>
          <p>{reconciliation.reconciliationId} | {reconciliation.businessDate} | {reconciliation.shift}</p>
        </div>
        <StatusBadge status={reconciliation.status} />
      </div>
      <h4>Total Reconciliation</h4>
      <div className="summary-grid">
        <Metric label="Expected Total" value={money(reconciliation.expectedTotal)} />
        <Metric label="Actual Total" value={money(reconciliation.actualTotal)} />
        <Metric label="Difference" value={money(reconciliation.difference)} danger={Number(reconciliation.difference || 0) !== 0} />
        <Metric label="Risk Score" value={`${reconciliation.riskScore || 0}/100`} danger={(reconciliation.riskScore || 0) >= 70} />
      </div>
      <div className="flag-row">{(reconciliation.riskFlags || []).map((flag) => <span key={flag}>{flag}</span>)}</div>
      <h4>Payment Detail</h4>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Expected</th><th>Actual</th><th>Difference</th><th>Status</th></tr></thead>
          <tbody>
            {(reconciliation.paymentDetails || []).map((detail) => (
              <tr key={detail.key}>
                <td>{detail.label}</td>
                <td>{money(detail.expectedAmount)}</td>
                <td>{money(detail.actualAmount)}</td>
                <td>{money(detail.difference)}</td>
                <td><span className={`mini-status ${detail.status?.toLowerCase()}`}>{detail.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && (
        <>
          <h4>Document Viewer</h4>
          <DocumentViewer documents={allDocuments} />
        </>
      )}
    </section>
  );
}

function ShiftReconciliationReviewPanel({ record, records = [], canAct, onSaveRecord }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const reconciliation = record.shiftReconciliation || shiftReconciliationService.buildForRecord(record);
  const attachableDocuments = (record.documents || []).filter((document) => document.documentType !== 'POS_SUMMARY');
  const overrideMatch = async () => {
    if (!selectedDocumentId || !onSaveRecord) return;
    const before = record;
    const nextDocuments = (record.documents || []).map((document) => (
      document.id === selectedDocumentId
        ? {
          ...document,
          manualMatch: true,
          matchedBusinessDate: record.date,
          matchedShift: record.shift,
          parsedData: {
            ...(document.parsedData || {}),
            manualMatch: true,
            matchedBusinessDate: record.date,
            matchedShift: record.shift
          }
        }
        : document
    ));
    const draft = { ...record, documents: nextDocuments };
    const shiftReconciliation = shiftReconciliationService.buildForRecord(draft);
    const after = {
      ...draft,
      shiftReconciliation,
      riskFlags: [...new Set([...(record.riskFlags || []).filter((flag) => flag !== 'MANUAL_MATCH_REQUIRED'), ...(shiftReconciliation.riskFlags || [])])],
      updatedAt: new Date().toISOString()
    };
    await onSaveRecord(after, before, 'OVERRIDE_SHIFT_RECONCILIATION_MATCH');
  };

  return (
    <section className="deposit-batch-panel">
      <ShiftReconciliationPanel reconciliation={reconciliation} />
      {canAct && attachableDocuments.length > 0 && (
        <div className="action-row">
          <label>Override document matching
            <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
              <option value="">Select document</option>
              {attachableDocuments.map((document) => (
                <option key={document.id} value={document.id}>{document.filename || document.id} | {document.documentType}</option>
              ))}
            </select>
          </label>
          <button className="ghost" type="button" disabled={!selectedDocumentId} onClick={overrideMatch}>Override Matching</button>
        </div>
      )}
    </section>
  );
}

function DepositBatchPanel({ batch }) {
  if (!batch) return null;
  return (
    <section className="deposit-batch-panel">
      <div className="section-head">
        <div>
          <h3>{batch.batchId}</h3>
          <p>{batch.branchName || batch.branchCode} | Deposit Date: {batch.depositDate}</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <div className="summary-grid">
        <Metric label="Expected Cash" value={money(batch.expectedCashAmount)} />
        <Metric label="Actual Deposit" value={money(batch.actualPayInAmount)} />
        <Metric label="Difference" value={money(batch.difference)} danger={Number(batch.difference || 0) !== 0} />
        <Metric label="Risk" value={`${batch.riskScore || 0}/100`} danger={(batch.riskScore || 0) >= 70} />
      </div>
      <div className="flag-row">{(batch.riskFlags || []).map((flag) => <span key={flag}>{flag}</span>)}</div>
      <div className="deposit-batch-columns">
        <div>
          <h4>Included Shifts</h4>
          <div className="simple-list">
            {(batch.includedShifts || []).map((shift) => (
              <button key={`${shift.businessDate}-${shift.shift}-${shift.shiftReportId}`} type="button">
                <strong>{shift.businessDate} | {shift.shift}</strong>
                <span>Cash: {money(shift.cashAmount)} | Report: {shift.shiftReportId}</span>
                <small>{shift.closeTime ? `Close: ${shift.closeTime}` : ''} {(shift.riskFlags || []).join(', ')}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4>Pay-in Documents</h4>
          <div className="simple-list">
            {(batch.payInDocuments || []).map((document) => (
              <button key={document.documentId} type="button">
                <strong>{document.filename || document.documentId}</strong>
                <span>{document.documentType} | {money(document.depositAmount)}</span>
                <small>{document.referenceNo || '-'}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ShiftPayinMatchPanel({ record, records = [], canAct, onSaveRecord }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const matches = record.shiftPayinMatches?.length ? record.shiftPayinMatches : shiftMatchingService.buildMatchesForRecord(record, records.length ? records : [record]);
  const payInDocuments = (record.documents || []).filter((document) => document.documentType?.startsWith('PAYIN_'));

  const manualMatch = async () => {
    if (!selectedDocumentId || !onSaveRecord) return;
    const before = record;
    const nextDocuments = (record.documents || []).map((document) => (
      document.id === selectedDocumentId
        ? {
          ...document,
          manualMatch: true,
          matchedBusinessDate: record.date,
          matchedShift: record.shift,
          parsedData: {
            ...(document.parsedData || {}),
            manualMatch: true,
            matchedBusinessDate: record.date,
            matchedShift: record.shift
          }
        }
        : document
    ));
    const draft = { ...record, documents: nextDocuments };
    const shiftPayinMatches = shiftMatchingService.buildMatchesForRecord(draft, records.length ? records.map((item) => (item.id === record.id ? draft : item)) : [draft]);
    const after = {
      ...draft,
      shiftPayinMatches,
      riskFlags: [...new Set([...(record.riskFlags || []).filter((flag) => !['MANUAL_MATCH_REQUIRED', 'MISSING_SHIFT_PAYIN'].includes(flag)), ...shiftPayinMatches.flatMap((match) => match.riskFlags || [])])],
      updatedAt: new Date().toISOString()
    };
    await onSaveRecord(after, before, 'MANUAL_SHIFT_PAYIN_MATCH');
  };

  return (
    <section className="deposit-batch-panel">
      <div className="section-head">
        <div>
          <h3>ตรวจ Pay-in รายกะ</h3>
          <p>ระบบตรวจแยกกะเสมอ แม้มีการนำเงินไปฝากพร้อมกัน</p>
        </div>
      </div>
      <div className="deposit-batch-list">
        {matches.map((match) => (
          <div key={match.matchId} className="deposit-batch-panel">
            <div className="summary-grid">
              <Metric label="วันที่ขาย" value={match.businessDate} />
              <Metric label="กะ" value={match.shift} />
              <Metric label="เงินสดจากปิดกะ" value={money(match.expectedCashAmount)} />
              <Metric label="ยอดรวม Pay-in" value={money(match.actualPayInAmount)} />
              <Metric label="ผลต่าง" value={money(match.difference)} danger={Number(match.difference || 0) !== 0} />
              <Metric label="สถานะ" value={match.status} danger={match.status === 'FAIL'} />
            </div>
            <div className="flag-row">{(match.riskFlags || []).map((flag) => <span key={flag}>{flag}</span>)}</div>
            <div className="simple-list">
              {(match.payInDocuments || []).map((document) => (
                <button key={document.documentId} type="button">
                  <strong>{document.filename || document.documentId}</strong>
                  <span>{money(document.depositAmount)} | Ref: {document.referenceNo || '-'}</span>
                  <small>{document.manualMatch ? 'Manual match' : 'Auto match'}</small>
                </button>
              ))}
              {!match.payInDocuments?.length && <div className="empty">ยังไม่มี Pay-in ที่จับคู่กับกะนี้</div>}
            </div>
          </div>
        ))}
      </div>
      {canAct && payInDocuments.length > 0 && (
        <div className="action-row">
          <label>เลือก Pay-in เพื่อผูกกับกะนี้
            <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
              <option value="">เลือกเอกสาร</option>
              {payInDocuments.map((document) => (
                <option key={document.id} value={document.id}>{document.filename || document.id} | {money(document.parsedData?.depositAmount || document.parsedData?.payinCashAmount)}</option>
              ))}
            </select>
          </label>
          <button className="ghost" type="button" disabled={!selectedDocumentId} onClick={manualMatch}>แก้ไขการจับคู่</button>
        </div>
      )}
    </section>
  );
}

function ReviewCard({ record, onReview, canAct = true, onSaveRecord, records = [] }) {
  const [comment, setComment] = useState(record.accountingComment || '');
  const pos = record.aiDocuments?.POS_SUMMARY?.fields || {};
  const payin = record.aiDocuments?.PAYIN_SLIP?.fields || {};
  const transfer = record.aiDocuments?.TRANSFER_SLIP?.fields || {};
  const comparisons = record.comparisons || buildComparisons(record);
  const validationComparisons = record.validationComparisons || [];
  const validationTotalComparison = record.validationTotalComparison;

  return (
    <article className="review-card wide">
      <div>
        <div className="record-title">
          <strong>{record.id}</strong>
          <StatusBadge status={record.status} />
        </div>
        <p>{record.branch} | {record.date} | {record.shift}</p>
        <div className="metric-row">
          <Metric label="Pay-in" value={money(record.branchAmount)} />
          <Metric label="Transfer slip" value={money(record.transferSlipAmount)} />
          <Metric label="AI confidence" value={`${record.aiConfidence || 0}%`} danger={(record.aiConfidence || 0) < 80} />
          <Metric label="Risk" value={`${record.riskScore || 0}/100`} danger={record.riskScore >= 70} />
        </div>
        <div className="flag-row">{(record.riskFlags || []).map((flag) => <span key={flag}>{flag}</span>)}</div>
      </div>

      <AccountingSummary record={record} />
      <BusinessExceptionPanel record={record} canAct={canAct} onSaveRecord={onSaveRecord} />
      <ShiftReconciliationReviewPanel record={record} records={records} canAct={canAct} onSaveRecord={onSaveRecord} />
      <ShiftPayinMatchPanel record={record} records={records} canAct={canAct} onSaveRecord={onSaveRecord} />
      <DepositBatchPanel batch={record.depositBatch || depositBatchService.buildBatchForRecord(record, [record])} />

      <div className="review-columns">
        <ReviewPanel title="POS Summary" rows={[
          ['Branch code', pos.branchCode],
          ['Branch name', pos.branchName],
          ['Sale date', pos.saleDate],
          ['Close time', pos.closeTime],
          ['Till', pos.till],
          ['Tax ID', pos.taxId],
          ['Register no.', pos.registerNo],
          ['Bill count', pos.billCount],
          ['Gross', money(pos.grossAmount)],
          ['Discount', money(pos.discountAmount)],
          ['Net', money(pos.netAmount)],
          ['Cash', money(pos.cashAmount)],
          ['Debtor transfer', money(pos.debtorTransferAmount)],
          ['Transfer', money(pos.transferAmount)],
          ['Maemanee', money(pos.maemaneeAmount)],
          ['Coupon', money(pos.couponAmount)],
          ['Total paid', money(pos.totalPaidAmount)],
          ['Cash to deposit', money(pos.cashToDepositAmount)],
          ['Cashier', pos.cashierCode]
        ]} imageUrl={record.documentUrls?.POS_SUMMARY} confidence={record.aiDocuments?.POS_SUMMARY?.confidence} />

        <ReviewPanel title="Branch Input" rows={[
          ['Date', record.date],
          ['Branch', record.branch],
          ['Shift', record.shift],
          ['Expected amount', money(record.expectedAmount)],
          ['Pay-in amount', money(record.branchAmount)],
          ['Transfer slip total', money(record.transferSlipAmount)],
          ['Reference', record.referenceNo],
          ['Bank', record.bankName]
        ]} />

        <ReviewPanel title="AI OCR Result" rows={[
          ['Pay-in OCR amount', money(payin.amount)],
          ['Pay-in reference', payin.referenceNo],
          ['Pay-in date', payin.date],
          ['Transfer OCR amount', money(transfer.totalAmount)],
          ['Transfer reference', transfer.referenceNo],
          ['Transfer date', transfer.date],
          ['Min confidence', `${record.aiConfidence || 0}%`]
        ]} imageUrl={record.documentUrls?.PAYIN_SLIP || record.documentUrls?.TRANSFER_SLIP} />
      </div>

      {validationComparisons.length ? (
        <ValidationResultPanel comparisons={validationComparisons} totalComparison={validationTotalComparison} dateResults={record.validationDateResults || []} />
      ) : (
        <ComparisonGrid comparisons={comparisons} />
      )}
      <FiveChannelComparison record={record} />
      <DocumentViewer documents={record.documents || []} />
      <DuplicateResultPanel documents={record.documents || []} />
      <Timeline timeline={record.timeline} />

      <textarea placeholder="Accounting comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="action-row">
        <button className="success" disabled={!canAct || hasBlockingReviewRisk(record)} onClick={() => onReview(record, 'APPROVED', comment)}><Check size={16} /> Approve</button>
        <button className="danger" disabled={!canAct} onClick={() => onReview(record, 'RETURNED', comment)}><X size={16} /> Return to Branch</button>
        <button className="ghost" disabled={!canAct} onClick={() => onReview(record, 'HIGH_RISK', comment)}>Mark as High Risk</button>
        <button className="ghost" disabled={!canAct} onClick={() => onReview(record, 'NEED_RETAKE', comment)}>Request More Document</button>
      </div>
    </article>
  );
}

function DuplicateResultPanel({ documents }) {
  const duplicateDocuments = documents.filter((document) => document.duplicateResult);
  if (!duplicateDocuments.length) return null;

  return (
    <section className="duplicate-panel">
      <h3>Duplicate Detection</h3>
      <div className="duplicate-list">
        {duplicateDocuments.map((document) => {
          const duplicate = document.duplicateResult || {};
          return (
            <div key={document.id} className={duplicate.isDuplicate ? `duplicate-item ${duplicate.status?.toLowerCase()}` : 'duplicate-item pass'}>
              <strong>{document.filename || document.originalFilename || document.id}</strong>
              <span>Result: {duplicate.isDuplicate ? duplicate.duplicateType : 'Not duplicate'}</span>
              <span>Status: {duplicate.status || 'PASS'}</span>
              <span>Similarity: {duplicate.similarityScore ?? 0}</span>
              <span>Matched file: {duplicate.matchedFilename || '-'}</span>
              <span>Matched record: {duplicate.matchedRecordId || '-'}</span>
              <small>{(duplicate.riskFlags || []).join(', ') || 'No duplicate risk flags'}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function sumParsedDocuments(documents, predicate, field) {
  return documents.filter(predicate).reduce((sum, document) => sum + Number(document.parsedData?.[field] || 0), 0);
}

function sumParsedDocumentsAny(documents, predicate, fields) {
  return documents.filter(predicate).reduce((sum, document) => {
    const value = fields.map((field) => document.parsedData?.[field]).find((item) => item !== undefined && item !== null && item !== '');
    return sum + Number(value || 0);
  }, 0);
}

function getPosParsedData(record) {
  return record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData || {};
}

function AccountingSummary({ record }) {
  const pos = getPosParsedData(record);
  const summary = [
    ['POS Summary Amount', money(pos.totalPaymentAmount)],
    ['Cash', money(pos.cashAmount)],
    ['Debtor Transfer', money(pos.debtorAccountTransferAmount)],
    ['Bank Transfer', money(pos.bankTransferAmount)],
    ['MaeManee', money(pos.maemaneeTransferAmount)],
    ['CRM Coupon', money(pos.crmCouponAmount)],
    ['Total Payment', money(pos.totalPaymentAmount)],
    ['Validation Result', validationStatus(record)],
    ['Risk Score', `${record.riskScore || 0}/100`]
  ];

  return (
    <section className="accounting-summary">
      {summary.map(([label, value]) => <Metric key={label} label={label} value={value} danger={label === 'Risk Score' && (record.riskScore || 0) >= 70} />)}
    </section>
  );
}

function FiveChannelComparison({ record }) {
  const documents = record.documents || [];
  const pos = getPosParsedData(record);
  const rows = [
    {
      label: 'เงินสด',
      posAmount: pos.cashAmount,
      documentAmount: sumParsedDocuments(documents, (document) => document.documentType?.startsWith('PAYIN_'), 'payinCashAmount'),
      documentTypes: ['PAYIN_BANK_COUNTER', 'PAYIN_ATM', 'PAYIN_COUNTER_SERVICE', 'PAYIN_LOTUS']
    },
    {
      label: 'โอนเข้าบัญชีลูกหนี้',
      posAmount: pos.debtorAccountTransferAmount,
      documentAmount: sumParsedDocuments(documents, (document) => document.documentType === 'DEBTOR_TRANSFER_RECEIPT', 'debtorTransferAmount'),
      documentTypes: ['DEBTOR_TRANSFER_RECEIPT']
    },
    {
      label: 'เงินโอน',
      posAmount: pos.bankTransferAmount,
      documentAmount: sumParsedDocumentsAny(documents, (document) => document.documentType === 'BANK_TRANSFER_SLIP', ['bankTransferAmount', 'transferAmount']),
      documentTypes: ['BANK_TRANSFER_SLIP']
    },
    {
      label: 'เงินโอน-แม่มณี',
      posAmount: pos.maemaneeTransferAmount,
      documentAmount: sumParsedDocuments(documents, (document) => document.documentType === 'MAEMANEE_QR_ALERT', 'maemaneeTransferAmount'),
      documentTypes: ['MAEMANEE_QR_ALERT']
    },
    {
      label: 'คูปองส่วนลด CRM',
      posAmount: pos.crmCouponAmount,
      documentAmount: sumParsedDocuments(documents, (document) => document.documentType === 'CRM_COUPON_RECEIPT', 'crmCouponAmount'),
      documentTypes: ['CRM_COUPON_RECEIPT']
    }
  ].map((row) => {
    const difference = Number((Number(row.posAmount || 0) - Number(row.documentAmount || 0)).toFixed(2));
    const abs = Math.abs(difference);
    return {
      ...row,
      difference,
      status: abs === 0 ? 'PASS' : abs <= 1 ? 'WARN' : 'FAIL',
      relatedDocuments: documents.filter((document) => row.documentTypes.includes(document.documentType))
    };
  });

  return (
    <section className="channel-compare">
      <h3>ตารางเทียบ 5 ช่อง</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ช่องทาง</th><th>POS Summary</th><th>เอกสารแนบ</th><th>ผลต่าง</th><th>สถานะ</th><th>เอกสารที่เกี่ยวข้อง</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{money(row.posAmount)}</td>
                <td>{money(row.documentAmount)}</td>
                <td>{money(row.difference)}</td>
                <td><span className={`mini-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>{row.relatedDocuments.map((document) => document.filename || document.id).join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DocumentViewer({ documents }) {
  const [activeImage, setActiveImage] = useState(null);
  const grouped = documents.reduce((acc, document) => {
    acc[document.documentType] = [...(acc[document.documentType] || []), document];
    return acc;
  }, {});

  return (
    <section className="document-viewer">
      <h3>Document Viewer</h3>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="document-type-group">
          <h4>{documentTypeLabels[type] || type}</h4>
          <div className="document-viewer-grid">
            {items.map((document) => (
              <article key={document.id} className="document-viewer-card">
                <button className="document-large-preview" type="button" onClick={() => setActiveImage(document.previewUrl || document.imageUrl || document.url || document.storagePath)}>
                  {document.previewUrl?.startsWith('data:') ? <img src={document.previewUrl} alt={document.filename || document.id} loading="lazy" /> : <span>{document.mimeType === 'application/pdf' ? 'PDF' : 'Open'}</span>}
                </button>
                <strong>{document.filename || document.originalFilename || document.id}</strong>
                <DetailBlock title="parsedData" data={document.parsedData} />
                <DetailBlock title="imageQuality" data={document.imageQuality} />
                <DetailBlock title="classificationResult" data={document.classificationResult} />
                <DetailBlock title="fingerprint" data={document.fingerprint} />
                <DetailBlock title="duplicateResult" data={document.duplicateResult} />
              </article>
            ))}
          </div>
        </div>
      ))}
      {activeImage && (
        <div className="image-modal" onClick={() => setActiveImage(null)}>
          <div>
            {String(activeImage).startsWith('data:') ? <img src={activeImage} alt="Document large preview" /> : <p>{activeImage}</p>}
            <button className="ghost" type="button">ปิด</button>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailBlock({ title, data }) {
  return (
    <details>
      <summary>{title}</summary>
      <pre>{JSON.stringify(data || {}, null, 2)}</pre>
    </details>
  );
}

function ValidationResultPanel({ comparisons, totalComparison, dateResults }) {
  return (
    <section className="validation-panel">
      <h3>Validation Result</h3>
      <div className="comparison-grid">
        {[...comparisons, totalComparison].filter(Boolean).map((item) => (
          <div key={item.key} className={`comparison ${item.status === 'PASS' ? 'match' : item.status === 'WARN' ? 'near' : 'mismatch'}`}>
            <strong>{item.label}</strong>
            <span>Expected: {money(item.expected)}</span>
            <span>Actual: {money(item.actual)}</span>
            <small>Difference: {money(item.difference)} | {item.status}</small>
          </div>
        ))}
      </div>
      <div className="date-result-list">
        {dateResults.map((item) => (
          <span key={item.documentId} className={item.status === 'PASS' ? 'date-pass' : 'date-fail'}>
            {item.documentType}: {item.documentDate || '-'} / Sale: {item.saleDate || '-'} ({item.status})
          </span>
        ))}
      </div>
    </section>
  );
}

function ReviewPanel({ title, rows, imageUrl, confidence }) {
  return (
    <section className="review-panel">
      <h3>{title}</h3>
      {imageUrl && <img src={imageUrl} alt={title} />}
      {confidence !== undefined && <span className="confidence">Confidence {confidence}%</span>}
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || '-'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ComparisonGrid({ comparisons }) {
  return (
    <section className="comparison-grid">
      {Object.entries(comparisons).map(([key, item]) => (
        <div key={key} className={`comparison ${item.status}`}>
          <strong>{item.label}</strong>
          <span>{item.leftLabel}: {typeof item.left === 'number' ? money(item.left) : item.left || '-'}</span>
          <span>{item.rightLabel}: {typeof item.right === 'number' ? money(item.right) : item.right || '-'}</span>
          <small>Difference: {typeof item.left === 'number' ? money(diffAmount(item.left, item.right)) : item.status}</small>
        </div>
      ))}
    </section>
  );
}

function Timeline({ timeline = {} }) {
  const rows = [
    ['Created', timeline.createdAt],
    ['POS uploaded', timeline.posSummaryUploadedAt],
    ['Pay-in uploaded', timeline.payinUploadedAt],
    ['Transfer uploaded', timeline.transferSlipUploadedAt],
    ['AI checked', timeline.aiCheckedAt],
    ['Submitted', timeline.submittedToAccountingAt],
    ['Reviewed', timeline.reviewedAt]
  ];
  return (
    <section className="timeline">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value ? formatDate(value) : '-'}</strong>
        </div>
      ))}
    </section>
  );
}

function MobileOperationsPage({ records, allRecords, auditLogs, user, onAuditAction }) {
  const [preparedFiles, setPreparedFiles] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState(() => offlineService.listQueue());
  const [searchText, setSearchText] = useState('');
  const workflowCases = useMemo(() => workflowService.syncFromRecords(records), [records]);
  const summary = mobileDashboard.build({ records, workflowCases, user });
  const workflowTasks = mobileWorkflow.listTasks(workflowCases, user);
  const pendingReview = mobileReview.listPending(records, searchText);
  const notifications = mobileNotification.list({ workflowNotifications: workflowService.repository.listNotifications(), auditLogs, user });
  const searchResults = enterpriseSearchService.search({ query: searchText, records, workflowCases });
  const canUpload = [ROLES.ADMIN, ROLES.BRANCH].includes(user?.role);
  const canReviewMobile = [ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role);

  async function handleMobileFiles(event) {
    const files = mobileUpload.prepareFiles(event.target.files || []);
    setPreparedFiles((items) => [...files, ...items]);
    for (const file of files) {
      const queued = offlineService.enqueueUpload({
        filename: file.filename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        branch: user?.branch || '',
        businessDate: new Date().toISOString().slice(0, 10),
        shift: 'MOBILE',
        conflictStatus: offlineService.detectConflict({ branch: user?.branch, businessDate: new Date().toISOString().slice(0, 10), shift: 'MOBILE' }, allRecords)
      });
      await onAuditAction?.('MOBILE_OFFLINE_UPLOAD_QUEUE', null, queued);
    }
    setOfflineQueue(offlineService.listQueue());
  }

  async function retryOffline(item) {
    const next = offlineService.retry(item.offlineId);
    await onAuditAction?.('MOBILE_OFFLINE_RETRY', item, next);
    setOfflineQueue(offlineService.listQueue());
  }

  async function syncOffline(item) {
    const next = offlineService.markSynced(item.offlineId);
    await onAuditAction?.('MOBILE_OFFLINE_SYNC', item, next);
    setOfflineQueue(offlineService.listQueue());
  }

  return (
    <div className="mobile-ops stack">
      <section className="panel warning-panel">
        <h2>Mobile Operations</h2>
        <p>Mobile web app for camera upload, offline queue, workflow, review, risk, KPI, and notification. Business logic is shared with desktop services.</p>
      </section>
      <section className="mobile-action-grid">
        <button type="button"><Upload size={20} /> Upload</button>
        <button type="button"><ShieldCheck size={20} /> Review</button>
        <button type="button"><Check size={20} /> Approve</button>
        <button type="button"><X size={20} /> Reject</button>
        <button type="button"><Search size={20} /> Search</button>
        <button type="button"><AlertTriangle size={20} /> Notification</button>
      </section>
      <section className="stats-grid">
        <Stat icon={<Banknote />} label="Today" value={summary.today} />
        <Stat icon={<ShieldCheck />} label="Pending" value={summary.pending} />
        <Stat icon={<RotateCcw />} label="Returned" value={summary.returned} />
        <Stat icon={<Check />} label="Completed" value={summary.completed} />
        <Stat icon={<AlertTriangle />} label="High Risk" value={summary.highRisk} />
        <Stat icon={<UserCog />} label="Workflow" value={summary.workflowPending} />
      </section>
      {canUpload && (
        <section className="panel mobile-upload-panel">
          <h2>Branch Mobile Upload</h2>
          <label className="mobile-dropzone">
            <Upload size={28} />
            <strong>Camera / Gallery / PDF</strong>
            <span>Multiple images, preview, compression, quality check, duplicate check ready</span>
            <input type="file" accept="image/*,.pdf" capture="environment" multiple onChange={handleMobileFiles} />
          </label>
          <div className="mobile-preview-grid">
            {preparedFiles.map((file) => (
              <div key={file.mobileFileId} className="document-upload-item">
                {file.mimeType?.startsWith('image/') ? <img src={file.previewUrl} alt={file.filename} /> : <FileImage size={42} />}
                <strong>{file.filename}</strong>
                <span>{formatFileSize(file.fileSize)}</span>
                <small>Quality {file.quality.imageQualityScore} | {file.quality.shouldCompress ? 'Compress before upload' : 'No compression needed'}</small>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="content-grid">
        <div className="panel">
          <h2>Offline Upload Queue</h2>
          <div className="simple-list">
            {offlineQueue.map((item) => (
              <button key={item.offlineId} type="button">
                <strong>{item.filename}</strong>
                <span>{item.status} | retry {item.retryCount} | {item.conflictStatus}</span>
                <small>{formatDate(item.createdAt)}</small>
                <span className="action-row compact">
                  <button type="button" onClick={(event) => { event.stopPropagation(); retryOffline(item); }}>Retry</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); syncOffline(item); }}>Sync</button>
                </span>
              </button>
            ))}
            {!offlineQueue.length && <div className="empty">No offline upload queue</div>}
          </div>
        </div>
        <div className="panel">
          <h2>Notification Center</h2>
          <div className="simple-list">
            {notifications.map((item) => (
              <button key={item.notificationId} type="button">
                <strong>{item.status || 'INFO'}</strong>
                <span>{item.message}</span>
                <small>{formatDate(item.createdAt)}</small>
              </button>
            ))}
            {!notifications.length && <div className="empty">No notification</div>}
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Mobile Search</h2>
          <label className="search"><Search size={16} /><input placeholder="Branch, date, shift, reference, document, workflow" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label>
          <div className="simple-list">
            {searchResults.map((item) => <button key={`${item.type}-${item.id}`} type="button"><strong>{item.type}</strong><span>{item.title}</span><small>{item.description}</small></button>)}
            {searchText && !searchResults.length && <div className="empty">No result</div>}
          </div>
        </div>
        <div className="panel">
          <h2>{canReviewMobile ? 'Accounting Mobile Review' : user?.role === ROLES.AUDIT ? 'Audit Mobile' : user?.role === ROLES.EXECUTIVE ? 'Executive Mobile' : 'Mobile Workflow'}</h2>
          <div className="simple-list">
            {(canReviewMobile ? pendingReview : workflowTasks).slice(0, 20).map((item) => (
              <button key={item.id || item.caseId} type="button">
                <strong>{item.branch || item.branchName}</strong>
                <span>{item.date || item.businessDate} | {item.shift} | {item.status || item.currentStatus}</span>
                <small>Risk {item.riskScore || 0}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Mobile Readiness</h2>
        <div className="metric-row">
          <Metric label="Android" value="Ready" />
          <Metric label="iPhone" value="Ready" />
          <Metric label="Tablet" value="Ready" />
          <Metric label="PWA" value="Ready" />
          <Metric label="Offline" value="Ready" />
          <Metric label="Push Ready" value="Future" />
        </div>
      </section>
    </div>
  );
}

function CaseManagementPage({ user, records, onAuditAction }) {
  const [cases, setCases] = useState(() => caseService.listCases(user));
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [newCase, setNewCase] = useState({
    branchName: user?.branch || '',
    businessDate: new Date().toISOString().slice(0, 10),
    shift: 'Morning',
    caseType: 'General',
    priority: 'NORMAL',
    riskScore: 0,
    assignedRole: user?.role === ROLES.BRANCH ? 'ACCOUNTING' : user?.role || 'ACCOUNTING'
  });
  const [comment, setComment] = useState({ text: '', commentType: 'Public' });
  const [attachment, setAttachment] = useState({ filename: '', fileType: 'Image', fileSize: 0 });

  function refreshCases() {
    setCases(caseService.listCases(user));
  }

  const filteredCases = cases.filter((item) => {
    const haystack = [item.caseId, item.branchName, item.branchCode, item.businessDate, item.shift, item.caseType, item.status, item.priority, item.assignedUser].join(' ').toLowerCase();
    return !searchText || haystack.includes(searchText.toLowerCase());
  });
  const dashboard = caseService.getDashboard(filteredCases);
  const selectedCase = filteredCases.find((item) => item.caseId === selectedCaseId) || filteredCases[0] || null;

  async function createCase() {
    const created = caseService.createCase({ ...newCase, createdBy: user?.email, createdRole: user?.role });
    await onAuditAction?.('CASE_CREATE', null, created);
    setNewCase({ ...newCase, caseType: 'General', riskScore: 0 });
    setSelectedCaseId(created.caseId);
    refreshCases();
  }

  async function updateCase(action, payload = {}) {
    if (!selectedCase) return;
    const updated = caseService.updateCase(selectedCase, action, user, payload);
    await onAuditAction?.(`CASE_${action}`, selectedCase, updated);
    setSelectedCaseId(updated.caseId);
    refreshCases();
  }

  async function addComment() {
    if (!comment.text) return;
    await updateCase('COMMENT', comment);
    setComment({ text: '', commentType: 'Public' });
  }

  async function addAttachment() {
    if (!attachment.filename) return;
    await updateCase('UPLOAD_DOCUMENT', { attachment: { ...attachment, uploadedBy: user?.email } });
    setAttachment({ filename: '', fileType: 'Image', fileSize: 0 });
  }

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Branch Communication & Case Management</h2>
        <p>One communication channel for Branch, Accounting, Audit, and Regional Manager. Every comment, assignment, attachment, and status change is kept in history and audit log.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<UserCog />} label="My Cases" value={dashboard.myCases} />
        <Stat icon={<AlertTriangle />} label="Open Cases" value={dashboard.openCases} />
        <Stat icon={<Upload />} label="Waiting Branch" value={dashboard.waitingBranch} />
        <Stat icon={<ShieldCheck />} label="Waiting Accounting" value={dashboard.waitingAccounting} />
        <Stat icon={<AlertTriangle />} label="Waiting Audit" value={dashboard.waitingAudit} />
        <Stat icon={<RotateCcw />} label="Over SLA" value={dashboard.overSla} />
        <Stat icon={<Check />} label="Resolved Today" value={dashboard.resolvedToday} />
      </section>
      <section className="content-grid">
        <div className="panel form-panel">
          <h2>Create Case</h2>
          <div className="form-grid">
            <label>Branch<input value={newCase.branchName} onChange={(event) => setNewCase({ ...newCase, branchName: event.target.value })} /></label>
            <label>Business Date<input type="date" value={newCase.businessDate} onChange={(event) => setNewCase({ ...newCase, businessDate: event.target.value })} /></label>
            <label>Shift<select value={newCase.shift} onChange={(event) => setNewCase({ ...newCase, shift: event.target.value })}><option>Morning</option><option>Afternoon</option></select></label>
            <label>Case Type<select value={newCase.caseType} onChange={(event) => setNewCase({ ...newCase, caseType: event.target.value })}>{CASE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Priority<select value={newCase.priority} onChange={(event) => setNewCase({ ...newCase, priority: event.target.value })}>{CASE_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Risk Score<input type="number" value={newCase.riskScore} onChange={(event) => setNewCase({ ...newCase, riskScore: Number(event.target.value) })} /></label>
            <label>Assign Role<select value={newCase.assignedRole} onChange={(event) => setNewCase({ ...newCase, assignedRole: event.target.value })}><option>BRANCH</option><option>ACCOUNTING</option><option>AUDIT</option><option>REGIONAL_MANAGER</option><option>ADMIN</option></select></label>
          </div>
          <button className="primary" type="button" onClick={createCase}><UserCog size={16} /> Create Case</button>
        </div>
        <div className="panel">
          <h2>Case Search</h2>
          <label className="search"><Search size={16} /><input placeholder="Branch, date, shift, case id, reference, document, status, priority, assigned user" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label>
          <div className="simple-list">
            {filteredCases.map((item) => (
              <button key={item.caseId} type="button" onClick={() => setSelectedCaseId(item.caseId)} className={selectedCase?.caseId === item.caseId ? 'active' : ''}>
                <strong>{item.caseId} | {item.caseType}</strong>
                <span>{item.branchName || item.branchCode} | {item.businessDate} | {item.shift}</span>
                <small>{item.status} | {item.priority} | {item.assignedRole}</small>
              </button>
            ))}
            {!filteredCases.length && <div className="empty">No case found</div>}
          </div>
        </div>
      </section>
      {selectedCase && (
        <section className="content-grid">
          <div className="panel form-panel">
            <h2>Case Detail</h2>
            <div className="metric-row">
              <Metric label="Status" value={selectedCase.status} />
              <Metric label="Priority" value={selectedCase.priority} danger={['URGENT', 'CRITICAL'].includes(selectedCase.priority)} />
              <Metric label="Risk" value={selectedCase.riskScore} danger={selectedCase.riskScore >= 70} />
              <Metric label="Assigned" value={selectedCase.assignedRole} />
            </div>
            <div className="action-row">
              {user?.role === ROLES.BRANCH && <button type="button" onClick={() => updateCase('COMMENT', { comment: 'Branch reply', commentType: 'Public' })}>Reply</button>}
              {[ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role) && <button type="button" onClick={() => updateCase('REQUEST_MORE_DOCUMENT', { comment: 'Please upload more document', commentType: 'Public' })}>Request More Document</button>}
              {[ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role) && <button type="button" onClick={() => updateCase('APPROVE', { comment: 'Approved', commentType: 'Internal' })}>Approve</button>}
              {[ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role) && <button type="button" onClick={() => updateCase('REJECT', { comment: 'Rejected', commentType: 'Internal' })}>Reject</button>}
              {[ROLES.ADMIN, ROLES.AUDIT].includes(user?.role) && <button type="button" onClick={() => updateCase('ASSIGN_INVESTIGATION', { comment: 'Assign investigation', commentType: 'Internal' })}>Assign Investigation</button>}
              {[ROLES.ADMIN, ROLES.AUDIT].includes(user?.role) && <button type="button" onClick={() => updateCase('LOCK_CASE')}>Lock Case</button>}
              {[ROLES.ADMIN, ROLES.AUDIT].includes(user?.role) && <button type="button" onClick={() => updateCase('UNLOCK_CASE')}>Unlock Case</button>}
              {[ROLES.ADMIN, ROLES.AUDIT].includes(user?.role) && <button type="button" onClick={() => updateCase('OVERRIDE', { comment: 'Audit override', commentType: 'Internal' })}>Override</button>}
              {[ROLES.ADMIN, ROLES.REGIONAL_MANAGER].includes(user?.role) && <button type="button" onClick={() => updateCase('RESOLVE')}>Resolve</button>}
              {[ROLES.ADMIN].includes(user?.role) && <button type="button" onClick={() => updateCase('CLOSE')}>Close</button>}
            </div>
            <label>Comment Type<select value={comment.commentType} onChange={(event) => setComment({ ...comment, commentType: event.target.value })}><option>Public</option><option>Internal</option><option>System</option></select></label>
            <label>Comment<textarea value={comment.text} onChange={(event) => setComment({ ...comment, text: event.target.value })} /></label>
            <button type="button" onClick={addComment}>Add Comment</button>
            <div className="form-grid">
              <label>Attachment<input value={attachment.filename} onChange={(event) => setAttachment({ ...attachment, filename: event.target.value })} placeholder="document.pdf" /></label>
              <label>Type<select value={attachment.fileType} onChange={(event) => setAttachment({ ...attachment, fileType: event.target.value })}><option>Image</option><option>PDF</option><option>Excel</option><option>ZIP</option></select></label>
              <label>Size<input type="number" value={attachment.fileSize} onChange={(event) => setAttachment({ ...attachment, fileSize: Number(event.target.value) })} /></label>
            </div>
            <button type="button" onClick={addAttachment}>Upload / Replace Document</button>
          </div>
          <CaseTimelinePanel selectedCase={selectedCase} />
        </section>
      )}
    </div>
  );
}

function CaseTimelinePanel({ selectedCase }) {
  return (
    <div className="panel">
      <h2>Case Timeline</h2>
      <div className="log-list">
        {(selectedCase.timeline || []).map((event) => (
          <div key={event.eventId}>
            <strong>{event.action}</strong>
            <span>{event.actor} | {event.actorRole}</span>
            <small>{formatDate(event.createdAt)}</small>
          </div>
        ))}
      </div>
      <h2>Comments</h2>
      <div className="simple-list">
        {(selectedCase.comments || []).map((item) => (
          <button key={item.commentId} type="button">
            <strong>{item.commentType} | {item.createdRole}</strong>
            <span>{item.text}</span>
            <small>{item.createdBy} | {formatDate(item.createdAt)}</small>
          </button>
        ))}
        {!selectedCase.comments?.length && <div className="empty">No comment</div>}
      </div>
      <h2>Attachments</h2>
      <div className="simple-list">
        {(selectedCase.attachments || []).map((item) => (
          <button key={item.attachmentId} type="button">
            <strong>{item.filename}</strong>
            <span>{item.fileType} | {formatFileSize(item.fileSize)}</span>
            <small>{item.action} | {formatDate(item.uploadedAt)}</small>
          </button>
        ))}
        {!selectedCase.attachments?.length && <div className="empty">No attachment</div>}
      </div>
    </div>
  );
}

function OperationsCenter({ records, visibleRecords, auditLogs, user, onAuditAction }) {
  const [platformSnapshot, setPlatformSnapshot] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [announcement, setAnnouncement] = useState({ type: 'NOTIFICATION', title: '', message: '', audience: 'ALL' });
  const [maintenance, setMaintenance] = useState(() => maintenanceService.getState());
  const [announcements, setAnnouncements] = useState(() => announcementService.list());
  const [workflowCases, setWorkflowCases] = useState(() => workflowService.syncFromRecords(records));

  async function refreshOperations() {
    setPlatformSnapshot(await platformService.getAdminConsoleSnapshot());
    setWorkflowCases(workflowService.syncFromRecords(records));
    setMaintenance(maintenanceService.getState());
    setAnnouncements(announcementService.list());
  }

  useEffect(() => {
    refreshOperations();
  }, [records]);

  const workflowDashboard = useMemo(() => workflowEngine.buildDashboard(workflowCases, user), [workflowCases, user]);
  const snapshot = useMemo(() => operationsAnalyticsService.buildSnapshot({
    records,
    workflowCases: workflowDashboard.cases,
    platform: platformSnapshot,
    auditLogs,
    user
  }), [records, workflowDashboard, platformSnapshot, auditLogs, user]);
  const reports = reportCenterService.listReports(snapshot);
  const release = releaseService.getRelease();
  const license = licenseService.getLicense();
  const apis = apiRegistryService.listApis();
  const searchResults = enterpriseSearchService.search({ query: queryText, records: visibleRecords, workflowCases: workflowDashboard.cases });
  const isAdmin = user?.role === ROLES.ADMIN;

  async function publishAnnouncement() {
    if (!announcement.title) return;
    const saved = announcementService.publish({ ...announcement, publishedBy: user?.email || '' });
    await onAuditAction?.('OPERATIONS_PUBLISH_ANNOUNCEMENT', null, saved);
    setAnnouncement({ type: 'NOTIFICATION', title: '', message: '', audience: 'ALL' });
    refreshOperations();
  }

  async function updateMaintenance(patch) {
    const before = maintenance;
    const after = maintenanceService.update(patch);
    await onAuditAction?.('OPERATIONS_UPDATE_MAINTENANCE', before, after);
    refreshOperations();
  }

  function exportOperations(format) {
    const rows = reportCenterService.exportRows(snapshot);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.company), 'Company');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.branches), 'BranchScorecards');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.kpis), 'KPI');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.analytics), 'Analytics');
    XLSX.writeFile(wb, `d-farm-operations-${format.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (!platformSnapshot) return <div className="panel">Loading operations center...</div>;

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Enterprise Operations Center | Version {release.version}</h2>
        <p>{release.name}. Operations Center uses current operational records, workflow cases, platform status, and audit trail already in the system.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<Building2 />} label="Branches" value={snapshot.companyOverview.branches} />
        <Stat icon={<FileImage />} label="Documents" value={snapshot.companyOverview.documents} />
        <Stat icon={<ShieldCheck />} label="Pending Cases" value={snapshot.companyOverview.pendingCases} />
        <Stat icon={<AlertTriangle />} label="Critical Cases" value={snapshot.companyOverview.criticalCases} />
        <Stat icon={<BarChart3 />} label="AI Accuracy" value={`${snapshot.aiAccuracy}%`} />
        <Stat icon={<Search />} label="OCR Accuracy" value={`${snapshot.ocrAccuracy}%`} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Operations Health</h2>
          <div className="simple-list">
            {['System Health', 'Workflow', 'AI', 'OCR', 'Queue', 'Worker', 'Database', 'Storage', 'Notification', 'Performance', 'Backup'].map((name) => (
              <button key={name} type="button">
                <strong>{name}</strong>
                <span>{name === 'Queue' ? `${platformSnapshot.queues.queued} waiting` : name === 'Worker' ? `${platformSnapshot.workers.online}/${platformSnapshot.workers.total} online` : platformSnapshot.health.status}</span>
                <small>Updated {formatDate(snapshot.generatedAt)}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Today's Summary</h2>
          <div className="metric-row">
            <Metric label="Submitted" value={snapshot.todaySummary.submitted} />
            <Metric label="Approved" value={snapshot.todaySummary.approved} />
            <Metric label="Pending" value={snapshot.todaySummary.pending} />
            <Metric label="Returned" value={snapshot.todaySummary.returned} />
            <Metric label="Rejected" value={snapshot.todaySummary.rejected} danger={snapshot.todaySummary.rejected > 0} />
            <Metric label="Completed" value={snapshot.todaySummary.completed} />
          </div>
        </div>
      </section>
      <section className="content-grid">
        <DashboardPanel title="Accounting Dashboard" rows={[
          ['My Task', workflowDashboard.stats.myTask],
          ['Waiting Review', workflowDashboard.stats.pendingReview],
          ['Over SLA', workflowDashboard.stats.overSla],
          ['High Risk', snapshot.riskSummary.highRisk],
          ['Completed Today', workflowDashboard.stats.completedToday]
        ]} />
        <DashboardPanel title="Audit Dashboard" rows={[
          ['Open Investigation', snapshot.companyOverview.criticalCases],
          ['Critical Branch', snapshot.branchScorecards.filter((item) => item.overallBranchScore < 70).length],
          ['Manual Override', visibleRecords.filter((record) => (record.riskFlags || []).some((flag) => String(flag).includes('OVERRIDE'))).length],
          ['High Risk Trend', snapshot.riskSummary.averageRisk],
          ['History Events', auditLogs.length]
        ]} />
        <DashboardPanel title="Branch Dashboard" rows={[
          ['Pending', snapshot.todaySummary.pending],
          ['Rejected', snapshot.todaySummary.rejected],
          ['Returned', snapshot.todaySummary.returned],
          ['Approved', snapshot.todaySummary.approved]
        ]} />
        <DashboardPanel title="KPI Dashboard" rows={[
          ['Branch KPI', `${snapshot.kpis.branchKpi}%`],
          ['Accounting KPI', `${snapshot.kpis.accountingKpi}%`],
          ['Audit KPI', `${snapshot.kpis.auditKpi}%`],
          ['AI KPI', `${snapshot.kpis.aiKpi}%`],
          ['OCR KPI', `${snapshot.kpis.ocrKpi}%`],
          ['Workflow KPI', `${snapshot.kpis.workflowKpi}%`]
        ]} />
      </section>
      <OperationsScorecards snapshot={snapshot} />
      <OperationsReports reports={reports} snapshot={snapshot} onExport={exportOperations} />
      <OperationsSearchAndAnnouncements queryText={queryText} setQueryText={setQueryText} searchResults={searchResults} announcement={announcement} setAnnouncement={setAnnouncement} announcements={announcements} isAdmin={isAdmin} onPublish={publishAnnouncement} />
      <OperationsMaintenanceLicense maintenance={maintenance} onUpdateMaintenance={updateMaintenance} isAdmin={isAdmin} license={license} />
      <OperationsApiTable apis={apis} />
    </div>
  );
}

function DashboardPanel({ title, rows }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="simple-list">
        {rows.map(([label, value]) => (
          <button key={label} type="button"><strong>{label}</strong><span>{value}</span></button>
        ))}
      </div>
    </div>
  );
}

function OperationsScorecards({ snapshot }) {
  return (
    <>
      <section className="panel">
        <h2>Branch Scorecard</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Completeness</th>
                <th>Submission</th>
                <th>Difference</th>
                <th>Correction</th>
                <th>AI</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.branchScorecards.map((item) => (
                <tr key={item.branchCode}>
                  <td>{item.branchName}</td>
                  <td>{item.documentCompleteness}%</td>
                  <td>{item.submissionTime}%</td>
                  <td>{item.differenceRate}%</td>
                  <td>{item.manualCorrectionRate}%</td>
                  <td>{item.aiAccuracy}%</td>
                  <td>{item.overallBranchScore}%</td>
                </tr>
              ))}
              {!snapshot.branchScorecards.length && <tr><td colSpan="7" className="empty">No branch scorecard data</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function OperationsReports({ reports, snapshot, onExport }) {
  return (
    <section className="content-grid">
      <div className="panel">
        <h2>Analytics</h2>
        <div className="simple-list">
          {snapshot.analytics.map((item) => (
            <button key={item.period} type="button">
              <strong>{item.period}</strong>
              <span>{item.records} record(s) | {item.approved} approved</span>
              <small>{item.highRisk} high risk</small>
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Report Center</h2>
        <div className="action-row compact">
          <button type="button" onClick={() => onExport('PDF')}>PDF</button>
          <button type="button" onClick={() => onExport('Excel')}>Excel</button>
          <button type="button" onClick={() => onExport('CSV')}>CSV</button>
        </div>
        <div className="simple-list">
          {reports.map((report) => (
            <button key={report.reportId} type="button">
              <strong>{report.name}</strong>
              <span>{report.format}</span>
              <small>{report.records} source row(s)</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperationsSearchAndAnnouncements({ queryText, setQueryText, searchResults, announcement, setAnnouncement, announcements, isAdmin, onPublish }) {
  return (
    <section className="content-grid">
      <div className="panel">
        <h2>Enterprise Search</h2>
        <label className="search"><Search size={16} /><input placeholder="Branch, business date, shift, case, reference, document, workflow, risk" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
        <div className="simple-list">
          {searchResults.map((result) => (
            <button key={`${result.type}-${result.id}`} type="button">
              <strong>{result.type}</strong>
              <span>{result.title}</span>
              <small>{result.description}</small>
            </button>
          ))}
          {queryText && !searchResults.length && <div className="empty">No search result</div>}
        </div>
      </div>
      <div className="panel">
        <h2>Announcement Center</h2>
        {isAdmin && (
          <div className="form-grid single">
            <label>Type<select value={announcement.type} onChange={(event) => setAnnouncement({ ...announcement, type: event.target.value })}><option>NOTIFICATION</option><option>MAINTENANCE</option><option>POLICY</option></select></label>
            <label>Audience<input value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value })} /></label>
            <label>Title<input value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} /></label>
            <label>Message<textarea value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} /></label>
            <button type="button" onClick={onPublish}>Publish</button>
          </div>
        )}
        <div className="simple-list">
          {announcements.map((item) => (
            <button key={item.announcementId} type="button">
              <strong>{item.type} | {item.title}</strong>
              <span>{item.message}</span>
              <small>{item.audience} | {formatDate(item.publishedAt)}</small>
            </button>
          ))}
          {!announcements.length && <div className="empty">No announcement</div>}
        </div>
      </div>
    </section>
  );
}

function OperationsMaintenanceLicense({ maintenance, onUpdateMaintenance, isAdmin, license }) {
  return (
    <section className="content-grid">
      <div className="panel">
        <h2>System Maintenance</h2>
        <div className="metric-row">
          <Metric label="Maintenance" value={maintenance.maintenanceMode ? 'ON' : 'OFF'} />
          <Metric label="Read Only" value={maintenance.readOnlyMode ? 'ON' : 'OFF'} />
          <Metric label="Emergency" value={maintenance.emergencyMode ? 'ON' : 'OFF'} danger={maintenance.emergencyMode} />
        </div>
        {isAdmin && (
          <div className="action-row">
            <button type="button" onClick={() => onUpdateMaintenance({ maintenanceMode: !maintenance.maintenanceMode })}>Maintenance Mode</button>
            <button type="button" onClick={() => onUpdateMaintenance({ readOnlyMode: !maintenance.readOnlyMode })}>Read Only Mode</button>
            <button type="button" onClick={() => onUpdateMaintenance({ emergencyMode: !maintenance.emergencyMode })}>Emergency Mode</button>
          </div>
        )}
      </div>
      <div className="panel">
        <h2>License & Integration Ready</h2>
        <div className="metric-row">
          <Metric label="License" value={license.licenseType} />
          <Metric label="Status" value={license.status} />
          <Metric label="Branches" value={license.maxBranches} />
          <Metric label="Users" value={license.maxUsers} />
          <Metric label="Documents" value={license.maxDocuments.toLocaleString()} />
        </div>
        <div className="simple-list">
          {license.futureExpansion.map((item) => <button key={item} type="button"><strong>{item}</strong><span>Future integration ready</span></button>)}
        </div>
      </div>
    </section>
  );
}

function OperationsApiTable({ apis }) {
  return (
    <section className="panel">
      <h2>API & Versioning</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Version</th><th>Method</th><th>Path</th><th>Auth</th><th>Status</th></tr></thead>
          <tbody>
            {apis.map((api) => (
              <tr key={api.path}>
                <td>{api.name}</td>
                <td>{api.version}</td>
                <td>{api.method}</td>
                <td>{api.path}</td>
                <td>{api.auth}</td>
                <td>{api.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IntegrationDashboard({ user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(() => integrationService.getDashboard());
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [apiKeyForm, setApiKeyForm] = useState({ name: '', permission: 'READ_ONLY', expiresAt: '' });
  const [jobForm, setJobForm] = useState({ integrationType: 'REST_API', sourceSystem: 'Financial Platform', destinationSystem: 'POS' });
  const isAdmin = user?.role === ROLES.ADMIN;

  function refreshIntegration() {
    setSnapshot(integrationService.getDashboard());
  }

  async function saveConnector(connector) {
    const saved = integrationService.connectorManager.saveConnector(connector);
    await onAuditAction?.('INTEGRATION_CONNECTOR_SAVE', selectedConnector, saved);
    setSelectedConnector(null);
    refreshIntegration();
  }

  async function toggleConnector(connector) {
    const saved = integrationService.connectorManager.setEnabled(connector.connectorId, !connector.enabled);
    await onAuditAction?.('INTEGRATION_CONNECTOR_TOGGLE', connector, saved);
    refreshIntegration();
  }

  async function createJob() {
    const job = integrationService.engine.createJob(jobForm);
    await onAuditAction?.('INTEGRATION_JOB_CREATE', null, job);
    refreshIntegration();
  }

  async function runJob(job) {
    const after = integrationService.engine.runJob(job);
    await onAuditAction?.('INTEGRATION_JOB_RUN', job, after);
    refreshIntegration();
  }

  async function failJob(job) {
    const after = integrationService.engine.failJob(job, 'Manual failure from integration dashboard');
    await onAuditAction?.('INTEGRATION_JOB_FAIL', job, after);
    refreshIntegration();
  }

  async function retryJob(job) {
    const after = integrationService.engine.retryJob(job);
    await onAuditAction?.('INTEGRATION_JOB_RETRY', job, after);
    refreshIntegration();
  }

  async function createApiKey() {
    if (!apiKeyForm.name) return;
    const key = integrationService.apiGateway.createApiKey(apiKeyForm);
    await onAuditAction?.('INTEGRATION_API_KEY_CREATE', null, key);
    setApiKeyForm({ name: '', permission: 'READ_ONLY', expiresAt: '' });
    refreshIntegration();
  }

  async function rotateApiKey(key) {
    const after = integrationService.apiGateway.rotateKey(key.keyId);
    await onAuditAction?.('INTEGRATION_API_KEY_ROTATE', key, after);
    refreshIntegration();
  }

  async function expireApiKey(key) {
    const after = integrationService.apiGateway.expireKey(key.keyId);
    await onAuditAction?.('INTEGRATION_API_KEY_EXPIRE', key, after);
    refreshIntegration();
  }

  async function simulateWebhook(direction) {
    const job = direction === 'INCOMING'
      ? integrationService.webhookService.receive({ sourceSystem: 'POS', payload: { event: 'payin.updated' } })
      : integrationService.webhookService.send({ destinationSystem: 'ERP', payload: { event: 'workflow.completed' } });
    await onAuditAction?.(`INTEGRATION_WEBHOOK_${direction}`, null, job);
    refreshIntegration();
  }

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Enterprise Integration Platform</h2>
        <p>Integration Layer connects Financial Document Platform to external systems. Business logic does not know POS, ERP, Power BI, or Microsoft 365 directly.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<Check />} label="Success" value={snapshot.success} />
        <Stat icon={<X />} label="Fail" value={snapshot.fail} />
        <Stat icon={<RotateCcw />} label="Retry" value={snapshot.retry} />
        <Stat icon={<Banknote />} label="Queue" value={snapshot.queue} />
        <Stat icon={<BarChart3 />} label="Latency" value={`${snapshot.latency} ms`} />
        <Stat icon={<AlertTriangle />} label="Dead Letter" value={snapshot.deadLetters.length} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Connector Manager</h2>
          {selectedConnector && isAdmin && (
            <div className="form-grid single">
              <label>Name<input value={selectedConnector.name} onChange={(event) => setSelectedConnector({ ...selectedConnector, name: event.target.value })} /></label>
              <label>Endpoint<input value={selectedConnector.endpoint} onChange={(event) => setSelectedConnector({ ...selectedConnector, endpoint: event.target.value })} /></label>
              <label>Schedule<select value={selectedConnector.schedule} onChange={(event) => setSelectedConnector({ ...selectedConnector, schedule: event.target.value })}><option>MANUAL</option><option>HOURLY</option><option>DAILY</option><option>WEEKLY</option></select></label>
              <label>API Version<select value={selectedConnector.apiVersion} onChange={(event) => setSelectedConnector({ ...selectedConnector, apiVersion: event.target.value })}><option>v1</option><option>v2</option><option>future</option></select></label>
              <button type="button" onClick={() => saveConnector(selectedConnector)}>Save Connector</button>
            </div>
          )}
          <div className="simple-list">
            {snapshot.connectors.map((connector) => (
              <button key={connector.connectorId} type="button" onClick={() => setSelectedConnector(connector)}>
                <strong>{connector.name}</strong>
                <span>{connector.enabled ? 'Enabled' : 'Disabled'} | {connector.schedule} | {connector.apiVersion}</span>
                <small>{connector.endpoint || 'Endpoint not configured'}</small>
                {isAdmin && <small onClick={(event) => { event.stopPropagation(); toggleConnector(connector); }}>{connector.enabled ? 'Disable' : 'Enable'}</small>}
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>API Gateway</h2>
          {isAdmin && (
            <div className="form-grid single">
              <label>Name<input value={apiKeyForm.name} onChange={(event) => setApiKeyForm({ ...apiKeyForm, name: event.target.value })} /></label>
              <label>Permission<select value={apiKeyForm.permission} onChange={(event) => setApiKeyForm({ ...apiKeyForm, permission: event.target.value })}><option>READ_ONLY</option><option>WRITE</option><option>ADMIN</option></select></label>
              <label>Expire<input type="date" value={apiKeyForm.expiresAt} onChange={(event) => setApiKeyForm({ ...apiKeyForm, expiresAt: event.target.value })} /></label>
              <button type="button" onClick={createApiKey}>Create API Key</button>
            </div>
          )}
          <div className="simple-list">
            {snapshot.apiKeys.map((key) => (
              <button key={key.keyId} type="button">
                <strong>{key.name}</strong>
                <span>{key.maskedKey} | {key.permission} | {key.status}</span>
                <small>{key.expiresAt || 'No expire'}</small>
                {isAdmin && <small onClick={(event) => { event.stopPropagation(); rotateApiKey(key); }}>Rotate</small>}
                {isAdmin && <small onClick={(event) => { event.stopPropagation(); expireApiKey(key); }}>Expire</small>}
              </button>
            ))}
            {!snapshot.apiKeys.length && <div className="empty">No API key</div>}
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Integration Jobs</h2>
          {isAdmin && (
            <div className="form-grid">
              <label>Type<select value={jobForm.integrationType} onChange={(event) => setJobForm({ ...jobForm, integrationType: event.target.value })}><option>REST_API</option><option>WEBHOOK</option><option>SCHEDULED_SYNC</option><option>FUTURE_MESSAGE_QUEUE</option></select></label>
              <label>Source<input value={jobForm.sourceSystem} onChange={(event) => setJobForm({ ...jobForm, sourceSystem: event.target.value })} /></label>
              <label>Destination<input value={jobForm.destinationSystem} onChange={(event) => setJobForm({ ...jobForm, destinationSystem: event.target.value })} /></label>
              <button type="button" onClick={createJob}>Create Job</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Type</th><th>Source</th><th>Destination</th><th>Status</th><th>Retry</th><th>Action</th></tr></thead>
              <tbody>
                {snapshot.jobs.slice(0, 30).map((job) => (
                  <tr key={job.jobId}>
                    <td>{job.jobId}</td>
                    <td>{job.integrationType}</td>
                    <td>{job.sourceSystem}</td>
                    <td>{job.destinationSystem}</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td>{job.retryCount}</td>
                    <td>{isAdmin && <div className="action-row compact"><button onClick={() => runJob(job)}>Run</button><button onClick={() => retryJob(job)}>Retry</button><button onClick={() => failJob(job)}>Fail</button></div>}</td>
                  </tr>
                ))}
                {!snapshot.jobs.length && <tr><td colSpan="7" className="empty">No integration job</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h2>Webhook</h2>
          <div className="action-row">
            {isAdmin && <button type="button" onClick={() => simulateWebhook('INCOMING')}>Simulate Incoming</button>}
            {isAdmin && <button type="button" onClick={() => simulateWebhook('OUTGOING')}>Simulate Outgoing</button>}
          </div>
          <h2>Scheduled Sync</h2>
          <div className="simple-list">
            {snapshot.schedules.map((schedule) => (
              <button key={schedule.connectorId} type="button">
                <strong>{schedule.name}</strong>
                <span>{schedule.schedule} | {schedule.enabled ? 'Enabled' : 'Disabled'}</span>
                <small>{schedule.nextRunAt ? formatDate(schedule.nextRunAt) : 'Manual only'}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Integration Log</h2>
        <div className="log-list">
          {snapshot.logs.slice(0, 60).map((log) => (
            <div key={log.logId}>
              <strong>{log.status} | {log.jobId}</strong>
              <span>{log.durationMs} ms | retry {log.retryCount}</span>
              <small>{log.error || JSON.stringify(log.response || {})}</small>
            </div>
          ))}
          {!snapshot.logs.length && <div className="empty">No integration log</div>}
        </div>
      </section>
    </div>
  );
}

function DocumentEvidencePage({ records, auditLogs, user, onAuditAction }) {
  const [filters, setFilters] = useState({ search: '', businessDate: '', shift: '', documentType: '', status: '' });
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [policy, setPolicy] = useState(() => retentionPolicyService.getPolicy());
  const [versionForm, setVersionForm] = useState({ fileName: '', fileType: 'image/jpeg', fileSize: 0, changeReason: '' });
  const [comment, setComment] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [evidencePackage, setEvidencePackage] = useState(null);
  const isAdmin = user?.role === ROLES.ADMIN;
  const canManageEvidence = [ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role);

  async function refreshEvidence() {
    await documentVersionService.syncFromPayinRecords(records, user);
    const list = documentVersionService.listDocuments(user, filters);
    setDocuments(list);
    const nextSelectedId = selectedId && list.some((item) => item.documentId === selectedId) ? selectedId : list[0]?.documentId || '';
    setSelectedId(nextSelectedId);
    setDetail(nextSelectedId ? documentVersionService.getDocumentDetail(nextSelectedId) : null);
    setPolicy(retentionPolicyService.getPolicy());
  }

  useEffect(() => {
    refreshEvidence();
  }, [records, user, filters.search, filters.businessDate, filters.shift, filters.documentType, filters.status]);

  useEffect(() => {
    setDetail(selectedId ? documentVersionService.getDocumentDetail(selectedId) : null);
    setCompareResult(null);
    setEvidencePackage(null);
  }, [selectedId]);

  const dashboard = evidenceManager.getDashboard(documents);
  const currentVersion = detail?.versions?.find((item) => item.isCurrent) || detail?.versions?.[0];
  const previousVersion = detail?.versions?.find((item) => currentVersion && item.versionId !== currentVersion.versionId);

  async function addVersion() {
    if (!selectedId || !versionForm.fileName) return;
    const saved = await documentVersionService.createVersion(selectedId, {
      ...versionForm,
      uploadedBy: user.email || user.name,
      checksumSource: `${versionForm.fileName}|${versionForm.fileSize}|${versionForm.changeReason}|${Date.now()}`
    }, user);
    await onAuditAction?.('DOCUMENT_VERSION_CREATE', null, saved);
    setVersionForm({ fileName: '', fileType: 'image/jpeg', fileSize: 0, changeReason: '' });
    refreshEvidence();
  }

  async function restoreVersion(version) {
    if (!selectedId || !version) return;
    const before = detail?.document;
    const saved = documentVersionService.restoreVersion(selectedId, version.versionId, user, 'Accounting restore selected version');
    await onAuditAction?.('DOCUMENT_VERSION_RESTORE', before, saved);
    refreshEvidence();
  }

  async function commentVersion() {
    if (!selectedId || !currentVersion || !comment) return;
    const saved = documentVersionService.commentVersion(selectedId, currentVersion.versionId, comment, user);
    await onAuditAction?.('DOCUMENT_VERSION_COMMENT', currentVersion, saved);
    setComment('');
    refreshEvidence();
  }

  async function archiveDocument() {
    if (!selectedId) return;
    const before = detail?.document;
    const saved = retentionPolicyService.archiveDocument(selectedId, user, 'Manual archive from evidence center');
    await onAuditAction?.('DOCUMENT_ARCHIVE', before, saved);
    refreshEvidence();
  }

  async function restoreDocument() {
    if (!selectedId) return;
    const before = detail?.document;
    const saved = retentionPolicyService.restoreDocument(selectedId, user, 'Manual restore from evidence center');
    await onAuditAction?.('DOCUMENT_ARCHIVE_RESTORE', before, saved);
    refreshEvidence();
  }

  async function updatePolicy(patch) {
    const saved = retentionPolicyService.updatePolicy(patch, user);
    await onAuditAction?.('DOCUMENT_RETENTION_POLICY_UPDATE', policy, saved);
    setPolicy(saved);
  }

  function compareVersions() {
    if (!selectedId || !currentVersion || !previousVersion) return;
    setCompareResult(documentVersionService.compare(selectedId, previousVersion.versionId, currentVersion.versionId));
  }

  async function exportEvidence() {
    if (!selectedId) return;
    const saved = evidenceManager.exportEvidence(selectedId, user, { records, auditLogs });
    await onAuditAction?.('DOCUMENT_EVIDENCE_EXPORT', null, saved);
    setEvidencePackage(saved);
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Version Control</p>
          <h2>Document Version Control & Evidence Management</h2>
          <p>เอกสารทุกใบสร้าง version ใหม่เมื่อมีการเปลี่ยนไฟล์ เก็บ checksum, timeline, OCR/AI result, correction, workflow และ audit log เพื่อใช้ตรวจย้อนหลังระดับองค์กร</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={refreshEvidence}><RotateCcw size={16} /> Refresh</button>
          <button type="button" onClick={exportEvidence} disabled={!selectedId}><Download size={16} /> Export Evidence</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<FileImage />} label="Document Today" value={dashboard.documentToday} />
        <Stat icon={<Upload />} label="Version Created" value={dashboard.versionCreated} />
        <Stat icon={<AlertTriangle />} label="Duplicate" value={dashboard.duplicate} />
        <Stat icon={<Download />} label="Archive" value={dashboard.archive} />
        <Stat icon={<Banknote />} label="Storage Usage" value={formatFileSize(dashboard.storageUsage)} />
      </section>

      <section className="panel">
        <h2>Search & Filter</h2>
        <div className="form-grid">
          <label>Search<input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Document ID, reference, branch, uploader" /></label>
          <label>Business Date<input type="date" value={filters.businessDate} onChange={(event) => setFilters({ ...filters, businessDate: event.target.value })} /></label>
          <label>Shift<select value={filters.shift} onChange={(event) => setFilters({ ...filters, shift: event.target.value })}><option value="">All</option><option>MORNING</option><option>AFTERNOON</option></select></label>
          <label>Document Type<select value={filters.documentType} onChange={(event) => setFilters({ ...filters, documentType: event.target.value })}><option value="">All</option>{DOCUMENT_VERSION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option><option>ACTIVE</option><option>DUPLICATE_REVIEW</option><option>ARCHIVED</option></select></label>
        </div>
      </section>

      <section className="content-grid wide-left">
        <div className="panel">
          <h2>Documents</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Document</th><th>Branch</th><th>Date</th><th>Shift</th><th>Type</th><th>Version</th><th>Status</th><th>Risk</th></tr></thead>
              <tbody>
                {documents.slice(0, 80).map((document) => (
                  <tr key={document.documentId} className={selectedId === document.documentId ? 'selected-row' : ''} onClick={() => setSelectedId(document.documentId)}>
                    <td>{document.documentId}</td>
                    <td>{document.branchName || document.branchCode}</td>
                    <td>{document.businessDate}</td>
                    <td>{document.shift || '-'}</td>
                    <td>{document.documentType}</td>
                    <td>v{document.currentVersion}</td>
                    <td><StatusBadge status={document.status} /></td>
                    <td>{(document.riskFlags || []).join(', ') || '-'}</td>
                  </tr>
                ))}
                {!documents.length && <tr><td colSpan="8" className="empty">No document evidence found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Document Viewer</h2>
          {detail?.document ? (
            <div className="stack">
              <div className="document-preview">
                {currentVersion?.thumbnailUrl || currentVersion?.imageUrl ? <img loading="lazy" src={currentVersion.thumbnailUrl || currentVersion.imageUrl} alt={currentVersion.fileName} /> : <div className="empty">No thumbnail</div>}
              </div>
              <div className="meta-list">
                <span><strong>Current</strong> v{detail.document.currentVersion}</span>
                <span><strong>Checksum</strong> {currentVersion?.checksum || '-'}</span>
                <span><strong>Uploader</strong> {currentVersion?.uploadedBy || '-'}</span>
                <span><strong>Uploaded</strong> {formatDate(currentVersion?.uploadedAt)}</span>
              </div>
              <div className="action-row">
                <button type="button" onClick={compareVersions} disabled={!previousVersion}>Compare Versions</button>
                {canManageEvidence && detail.document.status !== 'ARCHIVED' && <button type="button" onClick={archiveDocument}>Archive</button>}
                {canManageEvidence && detail.document.status === 'ARCHIVED' && <button type="button" onClick={restoreDocument}>Restore Document</button>}
              </div>
              <details open>
                <summary>OCR / AI / Validation Evidence</summary>
                <pre className="json-box">{JSON.stringify({ ocr: currentVersion?.ocrResult || {}, ai: currentVersion?.aiResult || {}, parsedData: currentVersion?.parsedData || {} }, null, 2)}</pre>
              </details>
            </div>
          ) : <div className="empty">Select document</div>}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Version History</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Version</th><th>File</th><th>Size</th><th>Uploader</th><th>Reason</th><th>AI/OCR</th><th>Action</th></tr></thead>
              <tbody>
                {(detail?.versions || []).map((version) => (
                  <tr key={version.versionId}>
                    <td>{version.isCurrent ? 'Current ' : ''}v{version.versionNumber}</td>
                    <td>{version.fileName}</td>
                    <td>{formatFileSize(version.fileSize)}</td>
                    <td>{version.uploadedBy}<br /><small>{formatDate(version.uploadedAt)}</small></td>
                    <td>{version.changeReason || '-'}</td>
                    <td>{version.aiResultId || 'Mock AI'} / {version.ocrResultId || 'Mock OCR'}</td>
                    <td>{canManageEvidence && !version.isCurrent && <button type="button" onClick={() => restoreVersion(version)}>Restore</button>}</td>
                  </tr>
                ))}
                {!detail?.versions?.length && <tr><td colSpan="7" className="empty">No version history</td></tr>}
              </tbody>
            </table>
          </div>
          {canManageEvidence && (
            <div className="form-grid">
              <label>New File Name<input value={versionForm.fileName} onChange={(event) => setVersionForm({ ...versionForm, fileName: event.target.value })} placeholder="replacement-slip.jpg" /></label>
              <label>File Type<input value={versionForm.fileType} onChange={(event) => setVersionForm({ ...versionForm, fileType: event.target.value })} /></label>
              <label>File Size<input type="number" value={versionForm.fileSize} onChange={(event) => setVersionForm({ ...versionForm, fileSize: Number(event.target.value) })} /></label>
              <label>Change Reason<input value={versionForm.changeReason} onChange={(event) => setVersionForm({ ...versionForm, changeReason: event.target.value })} /></label>
              <button type="button" onClick={addVersion}>Create New Version</button>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Timeline & Evidence Package</h2>
          <div className="log-list">
            {(detail?.timeline || []).slice(0, 20).map((event) => (
              <div key={event.eventId}>
                <strong>{event.action}</strong>
                <span>{event.actor} | {event.actorRole}</span>
                <small>{formatDate(event.createdAt)}</small>
              </div>
            ))}
            {!detail?.timeline?.length && <div className="empty">No timeline</div>}
          </div>
          {currentVersion && canManageEvidence && (
            <div className="action-row">
              <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comment current version" />
              <button type="button" onClick={commentVersion}>Comment</button>
            </div>
          )}
          {evidencePackage && <pre className="json-box">{JSON.stringify(evidencePackage, null, 2)}</pre>}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Document Compare</h2>
          {compareResult ? (
            <div className="stack">
              {['fileDifference', 'ocrDifference', 'aiDifference', 'fieldDifference'].map((key) => (
                <details key={key} open>
                  <summary>{key}</summary>
                  <pre className="json-box">{JSON.stringify(compareResult[key], null, 2)}</pre>
                </details>
              ))}
            </div>
          ) : <div className="empty">Compare current version with previous version</div>}
        </div>
        <div className="panel">
          <h2>Retention Policy</h2>
          <div className="form-grid">
            <label>Document Retention<select value={policy.documentRetention} disabled={!isAdmin} onChange={(event) => updatePolicy({ documentRetention: event.target.value })}>{RETENTION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Evidence Retention<select value={policy.evidenceRetention} disabled={!isAdmin} onChange={(event) => updatePolicy({ evidenceRetention: event.target.value })}>{RETENTION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Audit Retention<select value={policy.auditRetention} disabled={!isAdmin} onChange={(event) => updatePolicy({ auditRetention: event.target.value })}>{RETENTION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Archive Enabled<select value={String(policy.archiveEnabled)} disabled={!isAdmin} onChange={(event) => updatePolicy({ archiveEnabled: event.target.value === 'true' })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          </div>
          <p className="muted">Security: file integrity uses SHA-256 checksum, download/restore/archive create history and audit log. Real file streaming remains behind Storage adapter for Firebase-ready migration.</p>
        </div>
      </section>
    </div>
  );
}

function ExecutiveAnalyticsPage({ records, auditLogs, user, onAuditAction }) {
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', branch: '', region: '', shift: '', documentType: '', riskLevel: '', workflowStatus: '' });
  const [period, setPeriod] = useState('Daily');
  const [snapshot, setSnapshot] = useState(null);
  const [selectedWidgets, setSelectedWidgets] = useState(() => analyticsRepository.getLayout(user?.email || user?.role || 'default'));
  const [reportForm, setReportForm] = useState({ reportName: 'Executive Daily BI', cadence: 'Daily', recipients: '' });

  function refreshAnalytics() {
    const masterData = masterDataService.getSnapshot(user);
    const workflowCases = workflowService.syncFromRecords(records);
    const cases = caseService.listCases(user);
    const next = analyticsEngine.buildCachedSnapshot({ records, workflowCases, cases, auditLogs, masterData, user, filters, period });
    setSnapshot(next);
    setSelectedWidgets(analyticsRepository.getLayout(user?.email || user?.role || 'default'));
  }

  useEffect(() => {
    refreshAnalytics();
  }, [records, auditLogs, user, filters.dateFrom, filters.dateTo, filters.branch, filters.region, filters.shift, filters.documentType, filters.riskLevel, filters.workflowStatus, period]);

  if (!snapshot) return <div className="panel">Loading executive analytics...</div>;

  const availableWidgets = [
    'TODAY_SUMMARY',
    'COMPANY_OVERVIEW',
    'EXECUTIVE_KPI',
    'BRANCH_KPI',
    'ACCOUNTING_KPI',
    'AUDIT_KPI',
    'REGIONAL_KPI',
    'BRANCH_RANKING',
    'TREND_ANALYSIS',
    'HEAT_MAP',
    'FORECAST',
    'SCHEDULED_REPORT'
  ];
  const branches = masterDataService.getSnapshot(user).branches || [];
  const regions = masterDataService.getSnapshot(user).regions || [];

  function toggleWidget(widget) {
    const next = selectedWidgets.includes(widget)
      ? selectedWidgets.filter((item) => item !== widget)
      : [...selectedWidgets, widget];
    analyticsRepository.saveLayout(user?.email || user?.role || 'default', next);
    setSelectedWidgets(next);
  }

  async function saveScheduledReport() {
    const saved = analyticsRepository.saveScheduledReport({
      ...reportForm,
      recipients: reportForm.recipients.split(',').map((item) => item.trim()).filter(Boolean),
      filters
    });
    await onAuditAction?.('ANALYTICS_SCHEDULED_REPORT_SAVE', null, saved);
    setReportForm({ reportName: 'Executive Daily BI', cadence: 'Daily', recipients: '' });
    refreshAnalytics();
  }

  function exportAnalytics(format) {
    const data = {
      generatedAt: snapshot.generatedAt,
      filters,
      executiveKpi: snapshot.executiveKpi,
      branchKpis: snapshot.branchKpis,
      accountingKpi: snapshot.accountingKpi,
      auditKpi: snapshot.auditKpi,
      regionalKpi: snapshot.regionalKpi,
      trend: snapshot.trend
    };
    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([snapshot.executiveKpi]), 'Executive KPI');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.branchKpis), 'Branch KPI');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.trend), 'Trend');
      XLSX.writeFile(workbook, 'enterprise-bi.xlsx');
      return;
    }
    const content = format === 'csv' ? toCsv(snapshot.branchKpis) : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-bi.${format === 'csv' ? 'csv' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Business Intelligence</p>
          <h2>Enterprise Business Intelligence & Executive Analytics</h2>
          <p>ติดตามภาพรวมบริษัท, KPI สาขา, Accounting, Audit, Workflow, AI/OCR, trend, ranking และ heat map จาก operational data จริง พร้อม cache/background-ready analytics layer</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={refreshAnalytics}><RotateCcw size={16} /> Refresh</button>
          <button type="button" onClick={() => exportAnalytics('excel')}><Download size={16} /> Excel</button>
          <button type="button" onClick={() => exportAnalytics('csv')}><Download size={16} /> CSV</button>
          <button type="button" onClick={() => exportAnalytics('pdf')}><Download size={16} /> PDF Data</button>
        </div>
      </section>

      <section className="panel">
        <h2>Filter</h2>
        <div className="form-grid">
          <label>Date From<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label>
          <label>Date To<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label>
          <label>Branch<select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })}><option value="">All</option>{branches.map((branch) => <option key={branch.branchCode} value={branch.branchName}>{branch.branchName}</option>)}</select></label>
          <label>Region<select value={filters.region} onChange={(event) => setFilters({ ...filters, region: event.target.value })}><option value="">All</option>{regions.map((region) => <option key={region.regionId} value={region.regionId}>{region.regionName}</option>)}</select></label>
          <label>Shift<select value={filters.shift} onChange={(event) => setFilters({ ...filters, shift: event.target.value })}><option value="">All</option><option>MORNING</option><option>AFTERNOON</option></select></label>
          <label>Document Type<select value={filters.documentType} onChange={(event) => setFilters({ ...filters, documentType: event.target.value })}><option value="">All</option>{BRANCH_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Risk Level<select value={filters.riskLevel} onChange={(event) => setFilters({ ...filters, riskLevel: event.target.value })}><option value="">All</option><option>PASS</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
          <label>Workflow Status<select value={filters.workflowStatus} onChange={(event) => setFilters({ ...filters, workflowStatus: event.target.value })}><option value="">All</option>{Object.keys(statusLabels).map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Yearly</option></select></label>
        </div>
      </section>

      <section className="panel">
        <h2>Dashboard Customization</h2>
        <div className="chip-row">
          {availableWidgets.map((widget) => (
            <button type="button" key={widget} className={selectedWidgets.includes(widget) ? 'active' : ''} onClick={() => toggleWidget(widget)}>{widget}</button>
          ))}
        </div>
        <p className="muted">Cache: {snapshot.cacheStatus} | Generated: {formatDate(snapshot.generatedAt)} | Formula config is stored outside business logic.</p>
      </section>

      {selectedWidgets.includes('TODAY_SUMMARY') && (
        <section className="stats-grid">
          <Stat icon={<BarChart3 />} label="Today Records" value={snapshot.executiveDashboard.todaySummary.records} />
          <Stat icon={<FileImage />} label="Documents" value={snapshot.executiveDashboard.todaySummary.documents} />
          <Stat icon={<ShieldCheck />} label="Pending Review" value={snapshot.executiveDashboard.todaySummary.pendingReview} />
          <Stat icon={<AlertTriangle />} label="High Risk" value={snapshot.executiveDashboard.todaySummary.highRisk} />
          <Stat icon={<Banknote />} label="Total Difference" value={money(snapshot.executiveDashboard.todaySummary.totalDifference)} />
        </section>
      )}

      {selectedWidgets.includes('COMPANY_OVERVIEW') && (
        <section className="stats-grid">
          <Stat icon={<Building2 />} label="Branches" value={snapshot.executiveDashboard.companyOverview.branches} />
          <Stat icon={<BarChart3 />} label="Records" value={snapshot.executiveDashboard.companyOverview.records} />
          <Stat icon={<FileImage />} label="Total Documents" value={snapshot.executiveKpi.totalDocuments} />
          <Stat icon={<UserCog />} label="Cases" value={snapshot.executiveKpi.totalCases} />
          <Stat icon={<ShieldCheck />} label="Audit Events" value={snapshot.executiveDashboard.companyOverview.auditEvents} />
        </section>
      )}

      <section className="content-grid">
        {selectedWidgets.includes('EXECUTIVE_KPI') && <KpiPanel title="Executive KPI" items={snapshot.executiveKpi} />}
        {selectedWidgets.includes('ACCOUNTING_KPI') && <KpiPanel title="Accounting KPI" items={snapshot.accountingKpi} />}
        {selectedWidgets.includes('AUDIT_KPI') && <KpiPanel title="Audit KPI" items={snapshot.auditKpi} />}
        {selectedWidgets.includes('REGIONAL_KPI') && (
          <div className="panel">
            <h2>Regional KPI</h2>
            <div className="simple-list">
              {snapshot.regionalKpi.map((region) => (
                <button key={region.region} type="button">
                  <strong>{region.region}</strong>
                  <span>Performance {region.regionPerformance}% | Risk {region.riskDistribution}</span>
                  <small>Top: {region.topBranch || '-'} | Lowest: {region.lowestBranch || '-'}</small>
                </button>
              ))}
              {!snapshot.regionalKpi.length && <div className="empty">No regional KPI</div>}
            </div>
          </div>
        )}
      </section>

      {selectedWidgets.includes('BRANCH_KPI') && (
        <section className="panel">
          <h2>Branch KPI</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Branch</th><th>Completeness</th><th>Submission</th><th>Review Time</th><th>Difference Rate</th><th>Manual Correction</th><th>AI</th><th>OCR</th><th>Score</th></tr></thead>
              <tbody>
                {snapshot.branchKpis.slice(0, 80).map((branch) => (
                  <tr key={branch.branchCode}>
                    <td>{branch.branchName}<br /><small>{branch.region || branch.branchCode}</small></td>
                    <td>{branch.documentCompleteness}%</td>
                    <td>{branch.documentSubmissionTime}%</td>
                    <td>{branch.averageReviewTime} min</td>
                    <td>{branch.differenceRate}%</td>
                    <td>{branch.manualCorrectionRate}%</td>
                    <td>{branch.aiAccuracy}%</td>
                    <td>{branch.ocrAccuracy}%</td>
                    <td><strong>{branch.branchScore}</strong></td>
                  </tr>
                ))}
                {!snapshot.branchKpis.length && <tr><td colSpan="9" className="empty">No branch KPI</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="content-grid">
        {selectedWidgets.includes('BRANCH_RANKING') && (
          <div className="panel">
            <h2>Ranking</h2>
            <div className="content-grid">
              <RankingList title="Top 10" rows={snapshot.ranking.top10} />
              <RankingList title="Lowest 10" rows={snapshot.ranking.lowest10} />
            </div>
          </div>
        )}
        {selectedWidgets.includes('HEAT_MAP') && (
          <div className="panel">
            <h2>Heat Map</h2>
            <div className="heat-grid">
              {snapshot.heatMap.branch.slice(0, 60).map((item) => (
                <div key={item.branchCode} className={`heat-cell ${item.riskHeat.toLowerCase()}`}>
                  <strong>{item.branchName}</strong>
                  <span>{item.score}</span>
                  <small>{item.region} | {item.riskHeat}</small>
                </div>
              ))}
              {!snapshot.heatMap.branch.length && <div className="empty">No heat map data</div>}
            </div>
          </div>
        )}
      </section>

      <section className="content-grid">
        {selectedWidgets.includes('TREND_ANALYSIS') && (
          <div className="panel">
            <h2>Trend Analysis</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Period</th><th>Documents</th><th>Risk</th><th>Difference</th><th>AI</th><th>OCR</th><th>Workflow</th></tr></thead>
                <tbody>
                  {snapshot.trend.map((row) => (
                    <tr key={row.bucket}>
                      <td>{row.bucket}</td>
                      <td>{row.documentTrend}</td>
                      <td>{row.riskTrend}</td>
                      <td>{money(row.differenceTrend)}</td>
                      <td>{row.aiAccuracyTrend}%</td>
                      <td>{row.ocrAccuracyTrend}%</td>
                      <td>{row.workflowTrend}</td>
                    </tr>
                  ))}
                  {!snapshot.trend.length && <tr><td colSpan="7" className="empty">No trend data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {selectedWidgets.includes('FORECAST') && (
          <div className="panel">
            <h2>Forecast Data</h2>
            <div className="simple-list">
              {snapshot.forecast.map((item) => (
                <button key={item.periodOffset} type="button">
                  <strong>{item.metric} +{item.periodOffset}</strong>
                  <span>{item.forecastValue}</span>
                  <small>Confidence {item.confidence}%</small>
                </button>
              ))}
              {!snapshot.forecast.length && <div className="empty">No forecast data</div>}
            </div>
          </div>
        )}
      </section>

      {selectedWidgets.includes('SCHEDULED_REPORT') && (
        <section className="panel">
          <h2>Scheduled Report</h2>
          <div className="form-grid">
            <label>Report Name<input value={reportForm.reportName} onChange={(event) => setReportForm({ ...reportForm, reportName: event.target.value })} /></label>
            <label>Cadence<select value={reportForm.cadence} onChange={(event) => setReportForm({ ...reportForm, cadence: event.target.value })}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
            <label>Recipients<input value={reportForm.recipients} onChange={(event) => setReportForm({ ...reportForm, recipients: event.target.value })} placeholder="email1, email2" /></label>
            <button type="button" onClick={saveScheduledReport}>Save Schedule</button>
          </div>
          <div className="simple-list">
            {snapshot.scheduledReports.map((report) => (
              <button key={report.reportId} type="button">
                <strong>{report.reportName}</strong>
                <span>{report.cadence} | {report.status}</span>
                <small>{(report.recipients || []).join(', ') || 'No recipients'}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiPanel({ title, items }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="metric-list">
        {Object.entries(items || {}).map(([key, value]) => (
          <Metric key={key} label={key} value={typeof value === 'number' && key.toLowerCase().includes('difference') ? money(value) : String(value)} />
        ))}
      </div>
    </div>
  );
}

function RankingList({ title, rows }) {
  return (
    <div className="simple-list">
      <h3>{title}</h3>
      {rows.map((row, index) => (
        <button key={`${title}-${row.branchCode}`} type="button">
          <strong>{index + 1}. {row.branchName}</strong>
          <span>Score {row.branchScore} | AI {row.aiAccuracy}% | OCR {row.ocrAccuracy}%</span>
          <small>{row.region || row.branchCode}</small>
        </button>
      ))}
      {!rows.length && <div className="empty">No ranking</div>}
    </div>
  );
}

function DataGovernancePage({ records, user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(null);
  const [metadataForm, setMetadataForm] = useState({ entityName: 'PayinRecord', fieldName: '', dataType: 'string', description: '', required: false, owner: user?.email || 'Data Owner', classification: 'INTERNAL' });
  const [retentionForm, setRetentionForm] = useState({ entityType: 'PayinRecord', retention: '7_YEARS', archiveEnabled: true, owner: user?.email || 'Data Owner' });
  const [importText, setImportText] = useState('');
  const canManage = [ROLES.ADMIN, ROLES.AUDIT].includes(user?.role);

  function buildSnapshot(trigger = 'BACKGROUND_JOB') {
    const masterData = masterDataService.getSnapshot(user);
    setSnapshot(dataGovernanceService.buildSnapshot({ records, masterData, businessRules: masterData.businessRules || [], trigger }));
  }

  useEffect(() => {
    buildSnapshot('BACKGROUND_JOB');
  }, [records, user]);

  if (!snapshot) return <div className="panel">Loading data governance...</div>;

  async function runManualValidation() {
    buildSnapshot('MANUAL');
    await onAuditAction?.('DATA_VALIDATION_RUN', null, { trigger: 'MANUAL', records: records.length });
  }

  async function saveMetadata() {
    if (!canManage || !metadataForm.entityName || !metadataForm.fieldName) return;
    const saved = metadataService.save(metadataForm);
    await onAuditAction?.('DATA_METADATA_SAVE', null, saved);
    setMetadataForm({ entityName: 'PayinRecord', fieldName: '', dataType: 'string', description: '', required: false, owner: user?.email || 'Data Owner', classification: 'INTERNAL' });
    buildSnapshot('METADATA_UPDATE');
  }

  async function saveRetention() {
    if (!canManage) return;
    const saved = retentionPolicyEngine.savePolicy(retentionForm);
    await onAuditAction?.('DATA_RETENTION_POLICY_SAVE', null, saved);
    setRetentionForm({ entityType: 'PayinRecord', retention: '7_YEARS', archiveEnabled: true, owner: user?.email || 'Data Owner' });
    buildSnapshot('RETENTION_UPDATE');
  }

  async function archiveFirstRecord() {
    if (!canManage || !records[0]) return;
    const saved = retentionPolicyEngine.archive('PayinRecord', records[0].id, user);
    await onAuditAction?.('DATA_ARCHIVE', null, saved);
    buildSnapshot('ARCHIVE');
  }

  async function validateImport() {
    let rows = [];
    try {
      rows = JSON.parse(importText || '[]');
    } catch {
      const [headerLine, ...lines] = importText.trim().split(/\r?\n/);
      const headers = headerLine.split(',').map((item) => item.trim());
      rows = lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value.trim()])));
    }
    const issues = dataValidationEngine.validateImport(Array.isArray(rows) ? rows : [rows], 'Import');
    await onAuditAction?.('DATA_IMPORT_VALIDATION', null, { rows: rows.length, issues: issues.length });
    setImportText(JSON.stringify(issues, null, 2));
  }

  function exportGovernance(format) {
    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.dashboard.issues), 'Quality Issues');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.metadata), 'Metadata');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.lineage), 'Lineage');
      XLSX.writeFile(workbook, 'enterprise-data-governance.xlsx');
      return;
    }
    const content = format === 'csv' ? toCsv(snapshot.dashboard.issues) : JSON.stringify(snapshot, null, 2);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-data-governance.${format === 'csv' ? 'csv' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Enterprise Data Platform</p>
          <h2>Enterprise Data Platform & Data Governance</h2>
          <p>ตรวจคุณภาพข้อมูล, duplicate, metadata, catalog, lineage, retention และ warehouse readiness จาก operational data จริงขององค์กร</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={runManualValidation}><ShieldCheck size={16} /> Run Validation</button>
          <button type="button" onClick={() => exportGovernance('excel')}><Download size={16} /> Excel</button>
          <button type="button" onClick={() => exportGovernance('csv')}><Download size={16} /> CSV</button>
          <button type="button" onClick={() => exportGovernance('pdf')}><Download size={16} /> PDF Data</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<Check />} label="Data Quality Score" value={`${snapshot.dashboard.dataQualityScore}%`} />
        <Stat icon={<AlertTriangle />} label="Duplicate Records" value={snapshot.dashboard.duplicateRecords} />
        <Stat icon={<FileImage />} label="Missing Data" value={snapshot.dashboard.missingData} />
        <Stat icon={<ShieldCheck />} label="Business Rule Error" value={snapshot.dashboard.businessRuleError} />
        <Stat icon={<BarChart3 />} label="Warehouse Ready" value={snapshot.warehouseReady ? 'Yes' : 'No'} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Executive Data Governance</h2>
          <div className="metric-list">
            <Metric label="Company Data Quality" value={`${snapshot.executiveDashboard.companyDataQuality}%`} />
            <Metric label="Top Quality Issue" value={snapshot.executiveDashboard.topQualityIssue} />
            <Metric label="Master Branch" value={snapshot.executiveDashboard.masterDataHealth.branch} />
            <Metric label="Master Merchant" value={snapshot.executiveDashboard.masterDataHealth.merchant} />
            <Metric label="Master Bank" value={snapshot.executiveDashboard.masterDataHealth.bank} />
            <Metric label="Retention Policies" value={snapshot.retentionPolicies.length} />
          </div>
        </div>
        <div className="panel">
          <h2>Branch Data Score</h2>
          <div className="simple-list">
            {snapshot.executiveDashboard.branchDataScore.slice(0, 20).map((item) => (
              <button key={item.branchCode} type="button">
                <strong>{item.branchCode}</strong>
                <span>Score {item.score}%</span>
                <small>{item.issueCount} issues</small>
              </button>
            ))}
            {!snapshot.executiveDashboard.branchDataScore.length && <div className="empty">No branch score</div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Data Quality Issues</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Issue</th><th>Branch</th><th>Date</th><th>Entity</th><th>Record</th><th>Type</th><th>Severity</th><th>Status</th></tr></thead>
            <tbody>
              {snapshot.dashboard.issues.slice(0, 100).map((issue) => (
                <tr key={issue.issueId}>
                  <td>{issue.issueId}</td>
                  <td>{issue.branchCode || '-'}</td>
                  <td>{issue.businessDate || '-'}</td>
                  <td>{issue.entityType}</td>
                  <td>{issue.recordId || '-'}</td>
                  <td>{issue.issueType}</td>
                  <td>{issue.severity}</td>
                  <td><StatusBadge status={issue.status} /></td>
                </tr>
              ))}
              {!snapshot.dashboard.issues.length && <tr><td colSpan="8" className="empty">No data quality issue</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Metadata</h2>
          {canManage && (
            <div className="form-grid">
              <label>Entity<input value={metadataForm.entityName} onChange={(event) => setMetadataForm({ ...metadataForm, entityName: event.target.value })} /></label>
              <label>Field<input value={metadataForm.fieldName} onChange={(event) => setMetadataForm({ ...metadataForm, fieldName: event.target.value })} /></label>
              <label>Data Type<input value={metadataForm.dataType} onChange={(event) => setMetadataForm({ ...metadataForm, dataType: event.target.value })} /></label>
              <label>Description<input value={metadataForm.description} onChange={(event) => setMetadataForm({ ...metadataForm, description: event.target.value })} /></label>
              <label>Owner<input value={metadataForm.owner} onChange={(event) => setMetadataForm({ ...metadataForm, owner: event.target.value })} /></label>
              <label>Classification<select value={metadataForm.classification} onChange={(event) => setMetadataForm({ ...metadataForm, classification: event.target.value })}>{DATA_CLASSIFICATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Required<select value={String(metadataForm.required)} onChange={(event) => setMetadataForm({ ...metadataForm, required: event.target.value === 'true' })}><option value="true">Required</option><option value="false">Optional</option></select></label>
              <button type="button" onClick={saveMetadata}>Save Metadata</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Entity</th><th>Field</th><th>Type</th><th>Owner</th><th>Class</th><th>Required</th></tr></thead>
              <tbody>
                {snapshot.metadata.slice(0, 60).map((item) => (
                  <tr key={item.metadataId}>
                    <td>{item.entityName}</td>
                    <td>{item.fieldName}</td>
                    <td>{item.dataType}</td>
                    <td>{item.owner}</td>
                    <td>{item.classification}</td>
                    <td>{item.required ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Data Catalog</h2>
          <div className="simple-list">
            {snapshot.catalog.map((item) => (
              <button key={item.catalogId} type="button">
                <strong>{item.entity}</strong>
                <span>{item.fields.length} fields | Owner {item.owner}</span>
                <small>{item.businessRules.join(', ') || 'No linked rule'}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Data Lineage</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Record</th><th>Source</th><th>Transformation</th><th>Validation</th><th>Workflow</th><th>Archive</th></tr></thead>
              <tbody>
                {snapshot.lineage.slice(0, 80).map((item) => (
                  <tr key={item.lineageId}>
                    <td>{item.recordId}</td>
                    <td>{item.source}</td>
                    <td>{item.transformation.join(' > ')}</td>
                    <td>{item.validation}</td>
                    <td>{item.workflow}</td>
                    <td>{item.archive}</td>
                  </tr>
                ))}
                {!snapshot.lineage.length && <tr><td colSpan="6" className="empty">No lineage</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Retention & Archive</h2>
          {canManage && (
            <div className="form-grid">
              <label>Entity Type<input value={retentionForm.entityType} onChange={(event) => setRetentionForm({ ...retentionForm, entityType: event.target.value })} /></label>
              <label>Retention<select value={retentionForm.retention} onChange={(event) => setRetentionForm({ ...retentionForm, retention: event.target.value })}>{DATA_RETENTION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Owner<input value={retentionForm.owner} onChange={(event) => setRetentionForm({ ...retentionForm, owner: event.target.value })} /></label>
              <button type="button" onClick={saveRetention}>Save Policy</button>
              <button type="button" onClick={archiveFirstRecord}>Archive First Record</button>
            </div>
          )}
          <div className="simple-list">
            {snapshot.retentionPolicies.map((policy) => (
              <button key={policy.policyId} type="button">
                <strong>{policy.entityType}</strong>
                <span>{policy.retention} | {policy.archiveEnabled ? 'Archive on' : 'Archive off'}</span>
                <small>{policy.owner}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Import / Export Validation</h2>
        <div className="form-grid">
          <label className="wide-field">CSV or JSON<textarea rows="6" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste rows before import/export validation" /></label>
          <button type="button" onClick={validateImport}>Validate Import</button>
        </div>
        <p className="muted">Future ready: Data Warehouse, Power BI, Microsoft Fabric, Lakehouse, ERP, POS, REST API via Integration Layer.</p>
      </section>
    </div>
  );
}

function ComplianceGovernancePage({ records, user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(() => complianceService.buildSnapshot({ records, user }));
  const [policyForm, setPolicyForm] = useState({ policyCode: 'CG-CASH-001', policyName: 'Cash Handling Control Policy', category: 'CASH_HANDLING', version: '', effectiveDate: new Date().toISOString().slice(0, 10), reviewDate: '', owner: user?.email || '', status: 'DRAFT' });
  const [assessmentForm, setAssessmentForm] = useState({ branchCode: '', controlCode: 'CTRL-CASH-DAILY', controlName: 'Daily cash and deposit control', assessmentResult: 'COMPLIANT', reviewer: user?.email || '', reviewDate: new Date().toISOString().slice(0, 10), evidenceFileName: '' });
  const [caseForm, setCaseForm] = useState({ branchCode: '', businessDate: new Date().toISOString().slice(0, 10), policyId: '', riskScore: 50, assignedTo: user?.email || '' });
  const canManagePolicy = user?.role === ROLES.ADMIN;
  const canAssess = [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT].includes(user?.role);
  const canReview = [ROLES.ADMIN, ROLES.AUDIT, ROLES.EXECUTIVE].includes(user?.role);
  const masterData = masterDataService.getSnapshot(user);

  function refreshCompliance() {
    const exceptions = records.flatMap((record) => businessExceptionEngine.buildForRecord(record));
    const fraud = fraudPatternEngine.analyze(records);
    const auditFindings = auditFindingService.list();
    setSnapshot(complianceService.buildSnapshot({ records, exceptions, fraud, auditFindings, user }));
  }

  useEffect(() => {
    refreshCompliance();
  }, [records, user]);

  async function savePolicy() {
    if (!canManagePolicy) return;
    const saved = policyService.save(policyForm, user);
    await onAuditAction?.('COMPLIANCE_POLICY_SAVE', null, saved);
    setPolicyForm({ policyCode: 'CG-CASH-001', policyName: 'Cash Handling Control Policy', category: 'CASH_HANDLING', version: '', effectiveDate: new Date().toISOString().slice(0, 10), reviewDate: '', owner: user?.email || '', status: 'DRAFT' });
    refreshCompliance();
  }

  async function activatePolicy(policy) {
    const saved = policyService.activate(policy.policyId, user);
    await onAuditAction?.('COMPLIANCE_POLICY_APPROVE', policy, saved);
    refreshCompliance();
  }

  async function cancelPolicy(policy) {
    const saved = policyService.cancel(policy.policyId, user);
    await onAuditAction?.('COMPLIANCE_POLICY_CANCEL', policy, saved);
    refreshCompliance();
  }

  async function saveAssessment() {
    if (!canAssess) return;
    const saved = controlAssessmentService.save(assessmentForm, user);
    const evidence = assessmentForm.evidenceFileName
      ? controlAssessmentService.attachEvidence(saved.assessmentId, { fileName: assessmentForm.evidenceFileName, evidenceType: 'IMAGE' }, user)
      : null;
    await onAuditAction?.('CONTROL_ASSESSMENT_SAVE', null, { assessment: saved, evidence });
    setAssessmentForm({ branchCode: '', controlCode: 'CTRL-CASH-DAILY', controlName: 'Daily cash and deposit control', assessmentResult: 'COMPLIANT', reviewer: user?.email || '', reviewDate: new Date().toISOString().slice(0, 10), evidenceFileName: '' });
    refreshCompliance();
  }

  async function createComplianceCase() {
    if (!canAssess) return;
    const saved = complianceCaseService.save(caseForm, user);
    await onAuditAction?.('COMPLIANCE_CASE_CREATE', null, saved);
    setCaseForm({ branchCode: '', businessDate: new Date().toISOString().slice(0, 10), policyId: '', riskScore: 50, assignedTo: user?.email || '' });
    refreshCompliance();
  }

  async function closeComplianceCase(item) {
    const saved = complianceCaseService.close(item.caseId, user);
    await onAuditAction?.('COMPLIANCE_CASE_CLOSE', item, saved);
    refreshCompliance();
  }

  async function syncComplianceCases() {
    const exceptions = records.flatMap((record) => businessExceptionEngine.buildForRecord(record));
    const fraud = fraudPatternEngine.analyze(records);
    const auditFindings = auditFindingService.list();
    const saved = complianceService.syncCasesFromSources({ records, exceptions, fraud, auditFindings }, user);
    await onAuditAction?.('COMPLIANCE_SYNC_SOURCES', null, { count: saved.length });
    refreshCompliance();
  }

  function exportComplianceReport() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.policies), 'Policies');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.assessments), 'Assessments');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.cases), 'Cases');
    XLSX.writeFile(workbook, 'compliance-governance-report.xlsx');
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Corporate Governance</p>
          <h2>Compliance & Corporate Governance Platform</h2>
          <p>ศูนย์ควบคุม policy, control assessment, compliance case และ management review ที่เชื่อม Business Exception, Fraud Pattern และ Audit Finding ได้</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={refreshCompliance}><RotateCcw size={16} /> Refresh</button>
          {canAssess && <button type="button" onClick={syncComplianceCases}><ShieldCheck size={16} /> Sync Sources</button>}
          <button type="button" onClick={exportComplianceReport}><Download size={16} /> Export</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<Check />} label="Compliance %" value={`${snapshot.dashboard.compliancePercent}%`} />
        <Stat icon={<AlertTriangle />} label="Non-Compliance" value={snapshot.dashboard.nonCompliance} />
        <Stat icon={<ShieldCheck />} label="Open Case" value={snapshot.dashboard.openCase} />
        <Stat icon={<RotateCcw />} label="Overdue" value={snapshot.dashboard.overdue} />
        <Stat icon={<BarChart3 />} label="High Risk Policy" value={snapshot.dashboard.highRiskPolicy} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Policy Management</h2>
          {canManagePolicy && (
            <div className="form-grid">
              <label>Code<input value={policyForm.policyCode} onChange={(event) => setPolicyForm({ ...policyForm, policyCode: event.target.value })} /></label>
              <label>Name<input value={policyForm.policyName} onChange={(event) => setPolicyForm({ ...policyForm, policyName: event.target.value })} /></label>
              <label>Category<select value={policyForm.category} onChange={(event) => setPolicyForm({ ...policyForm, category: event.target.value })}>{POLICY_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Version<input value={policyForm.version} onChange={(event) => setPolicyForm({ ...policyForm, version: event.target.value })} placeholder="auto" /></label>
              <label>Effective<input type="date" value={policyForm.effectiveDate} onChange={(event) => setPolicyForm({ ...policyForm, effectiveDate: event.target.value })} /></label>
              <label>Review<input type="date" value={policyForm.reviewDate} onChange={(event) => setPolicyForm({ ...policyForm, reviewDate: event.target.value })} /></label>
              <label>Owner<input value={policyForm.owner} onChange={(event) => setPolicyForm({ ...policyForm, owner: event.target.value })} /></label>
              <button type="button" onClick={savePolicy}>Save Policy Version</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Policy</th><th>Category</th><th>Version</th><th>Effective</th><th>Review</th><th>Owner</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {snapshot.policies.slice(0, 40).map((policy) => (
                  <tr key={policy.policyId}>
                    <td>{policy.policyCode}<br /><small>{policy.policyName}</small></td>
                    <td>{policy.category}</td>
                    <td>v{policy.version}</td>
                    <td>{policy.effectiveDate}</td>
                    <td>{policy.reviewDate || '-'}</td>
                    <td>{policy.owner}</td>
                    <td><StatusBadge status={policy.status} /></td>
                    <td>{canManagePolicy && <div className="action-row compact"><button onClick={() => activatePolicy(policy)}>Activate</button><button onClick={() => cancelPolicy(policy)}>Cancel</button></div>}</td>
                  </tr>
                ))}
                {!snapshot.policies.length && <tr><td colSpan="8" className="empty">No policy</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Executive Governance</h2>
          <div className="metric-list">
            <Metric label="Corporate Compliance" value={`${snapshot.dashboard.corporateCompliance}%`} />
            <Metric label="Internal Control Status" value={`${snapshot.dashboard.internalControlStatus}%`} />
            <Metric label="Policy Compliance" value={`${snapshot.dashboard.policyCompliance}%`} />
            <Metric label="Risk Summary" value={snapshot.dashboard.riskSummary} />
            <Metric label="Business Exception Links" value={snapshot.sourceLinks.businessException} />
            <Metric label="Fraud Pattern Links" value={snapshot.sourceLinks.fraudPattern} />
            <Metric label="Audit Finding Links" value={snapshot.sourceLinks.auditFinding} />
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Control Assessment</h2>
          {canAssess && (
            <div className="form-grid">
              <label>Branch<select value={assessmentForm.branchCode} onChange={(event) => setAssessmentForm({ ...assessmentForm, branchCode: event.target.value })}><option value="">Select</option>{masterData.branches.map((branch) => <option key={branch.branchCode} value={branch.branchCode}>{branch.branchCode} - {branch.branchName}</option>)}</select></label>
              <label>Control Code<input value={assessmentForm.controlCode} onChange={(event) => setAssessmentForm({ ...assessmentForm, controlCode: event.target.value })} /></label>
              <label>Control Name<input value={assessmentForm.controlName} onChange={(event) => setAssessmentForm({ ...assessmentForm, controlName: event.target.value })} /></label>
              <label>Result<select value={assessmentForm.assessmentResult} onChange={(event) => setAssessmentForm({ ...assessmentForm, assessmentResult: event.target.value })}>{CONTROL_RESULTS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Reviewer<input value={assessmentForm.reviewer} onChange={(event) => setAssessmentForm({ ...assessmentForm, reviewer: event.target.value })} /></label>
              <label>Review Date<input type="date" value={assessmentForm.reviewDate} onChange={(event) => setAssessmentForm({ ...assessmentForm, reviewDate: event.target.value })} /></label>
              <label>Evidence File<input value={assessmentForm.evidenceFileName} onChange={(event) => setAssessmentForm({ ...assessmentForm, evidenceFileName: event.target.value })} /></label>
              <button type="button" onClick={saveAssessment}>Save Assessment</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Control</th><th>Branch</th><th>Result</th><th>Risk</th><th>Reviewer</th><th>Review Date</th><th>Evidence</th></tr></thead>
              <tbody>
                {snapshot.assessments.slice(0, 50).map((assessment) => (
                  <tr key={assessment.assessmentId}>
                    <td>{assessment.controlCode}<br /><small>{assessment.controlName}</small></td>
                    <td>{assessment.branchCode || '-'}</td>
                    <td><StatusBadge status={assessment.assessmentResult} /></td>
                    <td>{assessment.riskScore}</td>
                    <td>{assessment.reviewer}</td>
                    <td>{assessment.reviewDate}</td>
                    <td>{assessment.evidence?.length || 0}</td>
                  </tr>
                ))}
                {!snapshot.assessments.length && <tr><td colSpan="7" className="empty">No control assessment</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Compliance Cases</h2>
          {canAssess && (
            <div className="form-grid">
              <label>Branch<input value={caseForm.branchCode} onChange={(event) => setCaseForm({ ...caseForm, branchCode: event.target.value })} /></label>
              <label>Business Date<input type="date" value={caseForm.businessDate} onChange={(event) => setCaseForm({ ...caseForm, businessDate: event.target.value })} /></label>
              <label>Policy<select value={caseForm.policyId} onChange={(event) => setCaseForm({ ...caseForm, policyId: event.target.value })}><option value="">Select</option>{snapshot.policies.map((policy) => <option key={policy.policyId} value={policy.policyId}>{policy.policyCode}</option>)}</select></label>
              <label>Risk Score<input type="number" value={caseForm.riskScore} onChange={(event) => setCaseForm({ ...caseForm, riskScore: Number(event.target.value) })} /></label>
              <label>Assigned To<input value={caseForm.assignedTo} onChange={(event) => setCaseForm({ ...caseForm, assignedTo: event.target.value })} /></label>
              <button type="button" onClick={createComplianceCase}>Create Case</button>
            </div>
          )}
          <div className="simple-list">
            {snapshot.cases.slice(0, 40).map((item) => (
              <button key={item.caseId} type="button">
                <strong>{item.caseId} | {item.riskLevel}</strong>
                <span>{item.branchName || item.branchCode || '-'} | Policy {item.policyId || '-'}</span>
                <small>{item.status} | Links: {[item.linkedBusinessExceptionId && 'Exception', item.linkedFraudPatternId && 'Fraud', item.linkedAuditFindingId && 'Audit'].filter(Boolean).join(', ') || '-'}</small>
                {canReview && item.status !== 'CLOSED' && <span onClick={(event) => { event.stopPropagation(); closeComplianceCase(item); }}>Close</span>}
              </button>
            ))}
            {!snapshot.cases.length && <div className="empty">No compliance case</div>}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Compliance Rule Results</h2>
          <div className="simple-list">
            {snapshot.ruleResults.slice(0, 60).map((rule, index) => (
              <button key={`${rule.ruleCode}-${index}`} type="button">
                <strong>{rule.ruleCode} | {rule.severity}</strong>
                <span>{rule.description}</span>
                <small>{rule.branchCode || rule.policyId || rule.assessmentId || rule.caseId || '-'}</small>
              </button>
            ))}
            {!snapshot.ruleResults.length && <div className="empty">No compliance rule alert</div>}
          </div>
        </div>

        <div className="panel">
          <h2>Compliance History</h2>
          <div className="log-list">
            {snapshot.history.slice(0, 60).map((item) => (
              <div key={item.historyId}>
                <strong>{item.action}</strong>
                <span>{item.actor} | {item.actorRole}</span>
                <small>{formatDate(item.createdAt)} | {item.sourceId}</small>
              </div>
            ))}
            {!snapshot.history.length && <div className="empty">No compliance history</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function AIKnowledgeAssistantPage({ records, auditLogs, user, onAuditAction }) {
  const [question, setQuestion] = useState('วันนี้มีสาขาไหนยังไม่ส่งเอกสาร');
  const [filters, setFilters] = useState({ businessDate: '', branch: '', shift: '', documentType: '' });
  const [answer, setAnswer] = useState(null);
  const [history, setHistory] = useState(() => conversationService.listSessions(user));
  const [dashboard, setDashboard] = useState(() => conversationService.dashboard());
  const suggestions = knowledgeService.suggestedQuestions(user?.role);
  const branches = masterDataService.getSnapshot(user).branches || [];

  async function askQuestion(nextQuestion = question) {
    if (!nextQuestion.trim()) return;
    const result = knowledgeService.ask({ question: nextQuestion, records, auditLogs, user, filters });
    setAnswer(result);
    setHistory(conversationService.listSessions(user));
    setDashboard(conversationService.dashboard());
    await onAuditAction?.('AI_ASSISTANT_QUESTION', null, result.session);
  }

  function favoriteQuestion() {
    if (!question.trim()) return;
    conversationService.saveFavorite(question, user);
    setHistory(conversationService.listSessions(user));
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Verified Knowledge</p>
          <h2>AI Knowledge & Decision Support Platform</h2>
          <p>ถามข้อมูลจาก operational database ภายในระบบเท่านั้น ถ้าไม่มี source อ้างอิง ระบบจะไม่เดาและจะแนะนำให้เปิดเอกสารต้นฉบับ</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={() => askQuestion()}><Search size={16} /> Ask</button>
          <button type="button" onClick={favoriteQuestion}><Check size={16} /> Favorite</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<Search />} label="AI Usage" value={dashboard.aiUsage} />
        <Stat icon={<BarChart3 />} label="Top Questions" value={dashboard.topQuestions.length} />
        <Stat icon={<RotateCcw />} label="Avg Response" value={`${dashboard.averageResponseTime} ms`} />
        <Stat icon={<ShieldCheck />} label="Knowledge Coverage" value={`${dashboard.knowledgeCoverage}%`} />
      </section>

      <section className="panel">
        <h2>Ask Verified Question</h2>
        <div className="form-grid">
          <label className="wide-field">Question<input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="ถามจากข้อมูลจริงในระบบ" /></label>
          <label>Business Date<input type="date" value={filters.businessDate} onChange={(event) => setFilters({ ...filters, businessDate: event.target.value })} /></label>
          <label>Branch<select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })}><option value="">All allowed</option>{branches.map((branch) => <option key={branch.branchCode} value={branch.branchName}>{branch.branchName}</option>)}</select></label>
          <label>Shift<select value={filters.shift} onChange={(event) => setFilters({ ...filters, shift: event.target.value })}><option value="">All</option><option>MORNING</option><option>AFTERNOON</option></select></label>
          <label>Document Type<select value={filters.documentType} onChange={(event) => setFilters({ ...filters, documentType: event.target.value })}><option value="">All</option>{BRANCH_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <div className="chip-row">
          {suggestions.map((item) => (
            <button key={item} type="button" onClick={() => { setQuestion(item); askQuestion(item); }}>{item}</button>
          ))}
        </div>
      </section>

      {answer && (
        <section className="content-grid">
          <div className="panel">
            <h2>Response</h2>
            <div className={`confidence-card ${String(answer.confidence || '').toLowerCase()}`}>
              <strong>{answer.confidence}</strong>
              <span>{answer.summary}</span>
              {answer.recommendation && <small>{answer.recommendation}</small>}
            </div>
            <div className="simple-list">
              {(answer.detail || []).map((item, index) => (
                <button key={`${item}-${index}`} type="button">
                  <span>{item}</span>
                </button>
              ))}
              {!answer.detail?.length && <div className="empty">No detail from verified source</div>}
            </div>
          </div>

          <div className="panel">
            <h2>Source Reference</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Source</th><th>Business Date</th><th>Branch</th><th>Document</th><th>Reference</th></tr></thead>
                <tbody>
                  {(answer.sourceReference || []).slice(0, 40).map((sourceRef, index) => (
                    <tr key={`${sourceRef.reference}-${index}`}>
                      <td>{sourceRef.sourceType}</td>
                      <td>{sourceRef.businessDate || '-'}</td>
                      <td>{sourceRef.branch || '-'}</td>
                      <td>{sourceRef.document || '-'}</td>
                      <td>{sourceRef.reference || '-'}</td>
                    </tr>
                  ))}
                  {!answer.sourceReference?.length && <tr><td colSpan="5" className="empty">No verified source reference</td></tr>}
                </tbody>
              </table>
            </div>
            <details>
              <summary>Decision Support</summary>
              <pre className="json-box">{JSON.stringify(answer.session?.decisionSupport || {}, null, 2)}</pre>
            </details>
          </div>
        </section>
      )}

      <section className="content-grid">
        <div className="panel">
          <h2>Conversation History</h2>
          <div className="log-list">
            {history.slice(0, 50).map((session) => (
              <div key={session.sessionId}>
                <strong>{session.question}</strong>
                <span>{session.confidence} | {session.processingTime} ms | {session.role}</span>
                <small>{formatDate(session.createdAt)} | sources {session.sourceReference?.length || 0}</small>
              </div>
            ))}
            {!history.length && <div className="empty">No conversation history</div>}
          </div>
        </div>

        <div className="panel">
          <h2>Top Questions</h2>
          <div className="simple-list">
            {dashboard.topQuestions.map((item) => (
              <button key={item.question} type="button" onClick={() => { setQuestion(item.question); askQuestion(item.question); }}>
                <strong>{item.question}</strong>
                <span>{item.count} times</span>
              </button>
            ))}
            {!dashboard.topQuestions.length && <div className="empty">No usage yet</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function InternalAuditManagementPage({ records, auditLogs, user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(() => auditReportService.buildDashboard(user));
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [planForm, setPlanForm] = useState({ title: 'Annual Risk-based Audit Plan', year: new Date().getFullYear(), quarter: 'Q1', region: 'ALL', branchList: '', auditType: 'RISK_BASED_AUDIT', status: 'DRAFT' });
  const [scheduleForm, setScheduleForm] = useState({ auditPlanId: '', assignedAuditor: user?.email || '', branchCode: '', region: '', visitDate: new Date().toISOString().slice(0, 10) });
  const [caseForm, setCaseForm] = useState({ branchCode: '', businessDate: new Date().toISOString().slice(0, 10), auditType: 'RISK_BASED_AUDIT', riskScore: 70, assignedAuditor: user?.email || '' });
  const [findingForm, setFindingForm] = useState({ category: 'DOCUMENT', severity: 'MEDIUM', description: '', recommendation: '', rootCause: '', owner: '', dueDate: '' });
  const [actionForm, setActionForm] = useState({ owner: '', dueDate: '', responseComment: '' });
  const [evidenceForm, setEvidenceForm] = useState({ evidenceType: 'IMAGE', fileName: '', fileSize: 0, note: '' });
  const canAudit = [ROLES.ADMIN, ROLES.AUDIT].includes(user?.role);
  const canRespond = [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.REGIONAL_MANAGER].includes(user?.role);
  const masterData = masterDataService.getSnapshot(user);

  function refreshAuditManagement() {
    setSnapshot(auditReportService.buildDashboard(user));
  }

  useEffect(() => {
    refreshAuditManagement();
  }, [user]);

  const selectedCase = snapshot.cases.find((item) => item.auditCaseId === selectedCaseId) || snapshot.cases[0];
  const selectedFindings = selectedCase ? auditFindingService.list(selectedCase.auditCaseId) : [];
  const selectedActions = selectedFindings.flatMap((finding) => correctiveActionService.list(finding.findingId));
  const selectedEvidence = selectedCase ? auditEvidenceService.list(selectedCase.auditCaseId) : [];

  async function syncRiskCases() {
    const exceptions = records.flatMap((record) => businessExceptionEngine.buildForRecord(record));
    const fraud = fraudPatternEngine.analyze(records);
    const saved = auditCaseService.syncFromRisk(records, exceptions, fraud, user);
    await onAuditAction?.('AUDIT_SYNC_RISK_CASES', null, { count: saved.length });
    refreshAuditManagement();
  }

  async function savePlan() {
    if (!canAudit) return;
    const saved = auditPlanService.save(planForm, user);
    await onAuditAction?.('AUDIT_PLAN_SAVE', null, saved);
    setPlanForm({ title: 'Annual Risk-based Audit Plan', year: new Date().getFullYear(), quarter: 'Q1', region: 'ALL', branchList: '', auditType: 'RISK_BASED_AUDIT', status: 'DRAFT' });
    refreshAuditManagement();
  }

  async function approvePlan(plan) {
    const saved = auditPlanService.approve(plan.auditPlanId, user);
    await onAuditAction?.('AUDIT_PLAN_APPROVE', plan, saved);
    refreshAuditManagement();
  }

  async function saveSchedule() {
    if (!canAudit) return;
    const saved = auditScheduleService.schedule(scheduleForm, user);
    await onAuditAction?.('AUDIT_SCHEDULE_SAVE', null, saved);
    setScheduleForm({ auditPlanId: '', assignedAuditor: user?.email || '', branchCode: '', region: '', visitDate: new Date().toISOString().slice(0, 10) });
    refreshAuditManagement();
  }

  async function createCase() {
    if (!canAudit) return;
    const saved = auditCaseService.create(caseForm, user);
    await onAuditAction?.('AUDIT_CASE_CREATE', null, saved);
    setSelectedCaseId(saved.auditCaseId);
    setCaseForm({ branchCode: '', businessDate: new Date().toISOString().slice(0, 10), auditType: 'RISK_BASED_AUDIT', riskScore: 70, assignedAuditor: user?.email || '' });
    refreshAuditManagement();
  }

  async function closeCase() {
    if (!selectedCase || !canAudit) return;
    const saved = auditCaseService.updateStatus(selectedCase.auditCaseId, 'CLOSED', user);
    await onAuditAction?.('AUDIT_CASE_CLOSE', selectedCase, saved);
    refreshAuditManagement();
  }

  async function addFinding() {
    if (!selectedCase || !canAudit || !findingForm.description) return;
    const saved = auditFindingService.save({ ...findingForm, auditCaseId: selectedCase.auditCaseId }, user);
    const action = correctiveActionService.create({ findingId: saved.findingId, owner: findingForm.owner, dueDate: findingForm.dueDate }, user);
    await onAuditAction?.('AUDIT_FINDING_CREATE', null, { finding: saved, correctiveAction: action });
    setFindingForm({ category: 'DOCUMENT', severity: 'MEDIUM', description: '', recommendation: '', rootCause: '', owner: '', dueDate: '' });
    refreshAuditManagement();
  }

  async function submitAction(action) {
    if (!canRespond) return;
    const saved = correctiveActionService.submit(action.actionId, user, { responseComment: actionForm.responseComment || 'Submitted corrective evidence' });
    await onAuditAction?.('CORRECTIVE_ACTION_SUBMIT', action, saved);
    setActionForm({ owner: '', dueDate: '', responseComment: '' });
    refreshAuditManagement();
  }

  async function verifyAction(action, result) {
    if (!canAudit) return;
    const saved = correctiveActionService.verify(action.actionId, result, user);
    await onAuditAction?.(`CORRECTIVE_ACTION_${result}`, action, saved);
    refreshAuditManagement();
  }

  async function attachEvidence() {
    if (!selectedCase || !evidenceForm.fileName) return;
    const saved = auditEvidenceService.attach({ ...evidenceForm, auditCaseId: selectedCase.auditCaseId }, user);
    await onAuditAction?.('AUDIT_EVIDENCE_ATTACH', null, saved);
    setEvidenceForm({ evidenceType: 'IMAGE', fileName: '', fileSize: 0, note: '' });
    refreshAuditManagement();
  }

  function exportAuditReport() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.cases), 'Audit Cases');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.findings), 'Findings');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(snapshot.actions), 'Corrective Actions');
    XLSX.writeFile(workbook, 'internal-audit-report.xlsx');
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Internal Audit</p>
          <h2>Internal Audit Management Platform</h2>
          <p>เชื่อม Financial Document Platform, Risk Analysis, Audit Planning, Execution, Corrective Action และ Verification เป็น workflow ตรวจสอบภายในแบบ end-to-end</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={refreshAuditManagement}><RotateCcw size={16} /> Refresh</button>
          {canAudit && <button type="button" onClick={syncRiskCases}><ShieldCheck size={16} /> Sync Risk Cases</button>}
          <button type="button" onClick={exportAuditReport}><Download size={16} /> Export Report</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<BarChart3 />} label="Audit Progress" value={`${snapshot.auditProgress}%`} />
        <Stat icon={<AlertTriangle />} label="Open Findings" value={snapshot.openFindings} />
        <Stat icon={<Check />} label="Overdue Actions" value={snapshot.overdueActions} />
        <Stat icon={<Building2 />} label="High Risk Branches" value={snapshot.highRiskBranches} />
        <Stat icon={<ShieldCheck />} label="Compliance" value={`${snapshot.compliancePercent}%`} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Audit Planning</h2>
          {canAudit && (
            <div className="form-grid">
              <label>Title<input value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} /></label>
              <label>Year<input type="number" value={planForm.year} onChange={(event) => setPlanForm({ ...planForm, year: Number(event.target.value) })} /></label>
              <label>Quarter<select value={planForm.quarter} onChange={(event) => setPlanForm({ ...planForm, quarter: event.target.value })}><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option></select></label>
              <label>Region<input value={planForm.region} onChange={(event) => setPlanForm({ ...planForm, region: event.target.value })} /></label>
              <label>Branches<input value={planForm.branchList} onChange={(event) => setPlanForm({ ...planForm, branchList: event.target.value })} placeholder="comma separated" /></label>
              <label>Audit Type<select value={planForm.auditType} onChange={(event) => setPlanForm({ ...planForm, auditType: event.target.value })}>{AUDIT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
              <button type="button" onClick={savePlan}>Save Plan</button>
            </div>
          )}
          <div className="simple-list">
            {snapshot.plans.slice(0, 8).map((plan) => (
              <button key={plan.auditPlanId} type="button">
                <strong>{plan.title}</strong>
                <span>{plan.year} {plan.quarter} | {plan.auditType}</span>
                <small>{plan.region} | {plan.status}</small>
                {canAudit && plan.status !== 'APPROVED' && <span onClick={(event) => { event.stopPropagation(); approvePlan(plan); }}>Approve</span>}
              </button>
            ))}
            {!snapshot.plans.length && <div className="empty">No audit plan</div>}
          </div>
        </div>

        <div className="panel">
          <h2>Audit Schedule</h2>
          {canAudit && (
            <div className="form-grid">
              <label>Plan<select value={scheduleForm.auditPlanId} onChange={(event) => setScheduleForm({ ...scheduleForm, auditPlanId: event.target.value })}><option value="">None</option>{snapshot.plans.map((plan) => <option key={plan.auditPlanId} value={plan.auditPlanId}>{plan.title}</option>)}</select></label>
              <label>Auditor<input value={scheduleForm.assignedAuditor} onChange={(event) => setScheduleForm({ ...scheduleForm, assignedAuditor: event.target.value })} /></label>
              <label>Branch<select value={scheduleForm.branchCode} onChange={(event) => setScheduleForm({ ...scheduleForm, branchCode: event.target.value })}><option value="">Select</option>{masterData.branches.map((branch) => <option key={branch.branchCode} value={branch.branchCode}>{branch.branchCode} - {branch.branchName}</option>)}</select></label>
              <label>Region<input value={scheduleForm.region} onChange={(event) => setScheduleForm({ ...scheduleForm, region: event.target.value })} /></label>
              <label>Visit Date<input type="date" value={scheduleForm.visitDate} onChange={(event) => setScheduleForm({ ...scheduleForm, visitDate: event.target.value })} /></label>
              <button type="button" onClick={saveSchedule}>Schedule Visit</button>
            </div>
          )}
          <div className="simple-list">
            {auditScheduleService.list().slice(0, 10).map((schedule) => (
              <button key={schedule.scheduleId} type="button">
                <strong>{schedule.branchCode || schedule.region}</strong>
                <span>{schedule.assignedAuditor} | {schedule.visitDate}</span>
                <small>{schedule.status}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid wide-left">
        <div className="panel">
          <h2>Audit Cases</h2>
          {canAudit && (
            <div className="form-grid">
              <label>Branch<input value={caseForm.branchCode} onChange={(event) => setCaseForm({ ...caseForm, branchCode: event.target.value })} /></label>
              <label>Business Date<input type="date" value={caseForm.businessDate} onChange={(event) => setCaseForm({ ...caseForm, businessDate: event.target.value })} /></label>
              <label>Audit Type<select value={caseForm.auditType} onChange={(event) => setCaseForm({ ...caseForm, auditType: event.target.value })}>{AUDIT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Risk Score<input type="number" value={caseForm.riskScore} onChange={(event) => setCaseForm({ ...caseForm, riskScore: Number(event.target.value) })} /></label>
              <label>Auditor<input value={caseForm.assignedAuditor} onChange={(event) => setCaseForm({ ...caseForm, assignedAuditor: event.target.value })} /></label>
              <button type="button" onClick={createCase}>Open Case</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Case</th><th>Branch</th><th>Date</th><th>Type</th><th>Risk</th><th>Priority</th><th>Status</th><th>Links</th></tr></thead>
              <tbody>
                {snapshot.cases.slice(0, 80).map((item) => (
                  <tr key={item.auditCaseId} className={selectedCase?.auditCaseId === item.auditCaseId ? 'selected-row' : ''} onClick={() => setSelectedCaseId(item.auditCaseId)}>
                    <td>{item.auditCaseId}</td>
                    <td>{item.branchName || item.branchCode}</td>
                    <td>{item.businessDate}</td>
                    <td>{item.auditType}</td>
                    <td>{item.riskScore}</td>
                    <td>{item.priority}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{[item.linkedShiftReconciliationId && 'Shift', item.linkedBusinessExceptionId && 'Exception', item.linkedFraudPatternId && 'FraudPattern'].filter(Boolean).join(', ') || '-'}</td>
                  </tr>
                ))}
                {!snapshot.cases.length && <tr><td colSpan="8" className="empty">No audit case</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Case Detail</h2>
          {selectedCase ? (
            <div className="stack">
              <div className="meta-list">
                <span><strong>Case</strong> {selectedCase.auditCaseId}</span>
                <span><strong>Auditor</strong> {selectedCase.assignedAuditor || '-'}</span>
                <span><strong>Status</strong> {selectedCase.status}</span>
                <span><strong>Source Record</strong> {selectedCase.sourceRecordId || '-'}</span>
              </div>
              {canAudit && <button type="button" onClick={closeCase}>Close Case</button>}
              <h3>Evidence</h3>
              <div className="simple-list">
                {selectedEvidence.map((evidence) => (
                  <button type="button" key={evidence.evidenceId}>
                    <strong>{evidence.fileName}</strong>
                    <span>{evidence.evidenceType} | {formatFileSize(evidence.fileSize)}</span>
                    <small>{evidence.note || evidence.uploadedBy}</small>
                  </button>
                ))}
                {!selectedEvidence.length && <div className="empty">No evidence</div>}
              </div>
              <div className="form-grid">
                <label>Evidence Type<select value={evidenceForm.evidenceType} onChange={(event) => setEvidenceForm({ ...evidenceForm, evidenceType: event.target.value })}><option>IMAGE</option><option>PDF</option><option>EXCEL</option><option>VIDEO</option><option>ZIP</option><option>DOCUMENT_VERSION</option></select></label>
                <label>File Name<input value={evidenceForm.fileName} onChange={(event) => setEvidenceForm({ ...evidenceForm, fileName: event.target.value })} /></label>
                <label>File Size<input type="number" value={evidenceForm.fileSize} onChange={(event) => setEvidenceForm({ ...evidenceForm, fileSize: Number(event.target.value) })} /></label>
                <label>Note<input value={evidenceForm.note} onChange={(event) => setEvidenceForm({ ...evidenceForm, note: event.target.value })} /></label>
                <button type="button" onClick={attachEvidence}>Attach Evidence</button>
              </div>
            </div>
          ) : <div className="empty">Select audit case</div>}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Findings</h2>
          {selectedCase && canAudit && (
            <div className="form-grid">
              <label>Category<select value={findingForm.category} onChange={(event) => setFindingForm({ ...findingForm, category: event.target.value })}>{FINDING_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Severity<select value={findingForm.severity} onChange={(event) => setFindingForm({ ...findingForm, severity: event.target.value })}>{FINDING_SEVERITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Description<input value={findingForm.description} onChange={(event) => setFindingForm({ ...findingForm, description: event.target.value })} /></label>
              <label>Recommendation<input value={findingForm.recommendation} onChange={(event) => setFindingForm({ ...findingForm, recommendation: event.target.value })} /></label>
              <label>Root Cause<input value={findingForm.rootCause} onChange={(event) => setFindingForm({ ...findingForm, rootCause: event.target.value })} /></label>
              <label>Owner<input value={findingForm.owner} onChange={(event) => setFindingForm({ ...findingForm, owner: event.target.value })} /></label>
              <label>Due Date<input type="date" value={findingForm.dueDate} onChange={(event) => setFindingForm({ ...findingForm, dueDate: event.target.value })} /></label>
              <button type="button" onClick={addFinding}>Add Finding</button>
            </div>
          )}
          <div className="simple-list">
            {selectedFindings.map((finding) => (
              <button key={finding.findingId} type="button">
                <strong>{finding.category} | {finding.severity}</strong>
                <span>{finding.description}</span>
                <small>{finding.status} | Owner: {finding.owner || '-'}</small>
              </button>
            ))}
            {!selectedFindings.length && <div className="empty">No finding</div>}
          </div>
        </div>

        <div className="panel">
          <h2>Corrective Action & Verification</h2>
          <div className="form-grid">
            <label>Response Comment<input value={actionForm.responseComment} onChange={(event) => setActionForm({ ...actionForm, responseComment: event.target.value })} /></label>
          </div>
          <div className="simple-list">
            {selectedActions.map((action) => (
              <button key={action.actionId} type="button">
                <strong>{action.owner || 'Unassigned'} | {action.status}</strong>
                <span>Due {action.dueDate || '-'} | Completed {action.completionDate ? formatDate(action.completionDate) : '-'}</span>
                <small>{action.verificationResult || action.responseComment || '-'}</small>
                <span className="action-row compact">
                  {canRespond && !['SUBMITTED', 'VERIFIED'].includes(action.status) && <button type="button" onClick={(event) => { event.stopPropagation(); submitAction(action); }}>Submit</button>}
                  {canAudit && action.status === 'SUBMITTED' && <button type="button" onClick={(event) => { event.stopPropagation(); verifyAction(action, 'APPROVED'); }}>Approve</button>}
                  {canAudit && action.status === 'SUBMITTED' && <button type="button" onClick={(event) => { event.stopPropagation(); verifyAction(action, 'REJECTED'); }}>Reject</button>}
                </span>
              </button>
            ))}
            {!selectedActions.length && <div className="empty">No corrective action</div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Audit History</h2>
        <div className="log-list">
          {snapshot.history.slice(0, 60).map((item) => (
            <div key={item.historyId}>
              <strong>{item.action}</strong>
              <span>{item.actor} | {item.actorRole}</span>
              <small>{formatDate(item.createdAt)} | {item.sourceId}</small>
            </div>
          ))}
          {!snapshot.history.length && <div className="empty">No audit history</div>}
        </div>
      </section>
    </div>
  );
}

function MasterDataCenterPage({ user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(() => masterDataService.getSnapshot(user));
  const [collectionName, setCollectionName] = useState('branches');
  const [search, setSearch] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [draft, setDraft] = useState(() => defaultMasterDataDraft('branches'));
  const [importText, setImportText] = useState('');
  const isAdmin = user?.role === ROLES.ADMIN;

  function refreshMasterData() {
    setSnapshot(masterDataService.getSnapshot(user));
  }

  useEffect(() => {
    refreshMasterData();
  }, [user]);

  useEffect(() => {
    setDraft(defaultMasterDataDraft(collectionName, snapshot));
  }, [collectionName]);

  const rows = (snapshot[collectionName] || []).filter((item) => {
    const keyword = search.toLowerCase();
    if (!keyword) return true;
    return JSON.stringify(item).toLowerCase().includes(keyword);
  });

  async function saveDraft() {
    if (!isAdmin) return;
    const before = null;
    const saved = masterDataService.requestChange(collectionName, draft, user, approvalRequired);
    await onAuditAction?.('MASTER_DATA_CHANGE_REQUEST', before, saved);
    setDraft(defaultMasterDataDraft(collectionName, snapshot));
    refreshMasterData();
  }

  async function approveChange(approval) {
    if (!isAdmin) return;
    const saved = masterDataService.approve(approval.approvalId, user);
    await onAuditAction?.('MASTER_DATA_APPROVE', approval, saved);
    refreshMasterData();
  }

  async function rejectChange(approval) {
    if (!isAdmin) return;
    const saved = masterDataService.reject(approval.approvalId, user, 'Rejected from Master Data Center');
    await onAuditAction?.('MASTER_DATA_REJECT', approval, saved);
    refreshMasterData();
  }

  function updateDraft(field, value) {
    setDraft((item) => ({ ...item, [field]: value }));
  }

  function editRow(row) {
    if (!isAdmin) return;
    setDraft({ ...row });
  }

  async function importRows() {
    if (!isAdmin || !importText.trim()) return;
    let rowsToImport = [];
    try {
      rowsToImport = JSON.parse(importText);
    } catch {
      const [headerLine, ...lines] = importText.trim().split(/\r?\n/);
      const headers = headerLine.split(',').map((item) => item.trim());
      rowsToImport = lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value.trim()])));
    }
    const saved = masterDataService.importRows(collectionName, Array.isArray(rowsToImport) ? rowsToImport : [rowsToImport], user);
    await onAuditAction?.('MASTER_DATA_IMPORT', null, { collectionName, count: saved.length });
    setImportText('');
    refreshMasterData();
  }

  function exportRows(format) {
    const data = snapshot[collectionName] || [];
    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), collectionName);
      XLSX.writeFile(workbook, `${collectionName}.xlsx`);
      return;
    }
    const content = format === 'csv' ? toCsv(data) : JSON.stringify({ collectionName, exportedAt: new Date().toISOString(), data }, null, 2);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}.${format === 'csv' ? 'csv' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Master Data</p>
          <h2>Master Data & Branch Administration Center</h2>
          <p>ศูนย์กลางข้อมูลสาขา, policy, บัญชีธนาคาร, merchant, payment type, holiday, region และ business rule เพื่อให้ระบบขยายได้โดยไม่แก้ source code</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={refreshMasterData}><RotateCcw size={16} /> Refresh</button>
          <button type="button" onClick={() => exportRows('excel')}><Download size={16} /> Excel</button>
          <button type="button" onClick={() => exportRows('csv')}><Download size={16} /> CSV</button>
          <button type="button" onClick={() => exportRows('pdf')}><Download size={16} /> PDF Data</button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<Building2 />} label="Branch Summary" value={snapshot.dashboard.branchSummary} />
        <Stat icon={<BarChart3 />} label="Policy Summary" value={snapshot.dashboard.policySummary} />
        <Stat icon={<Banknote />} label="Bank Account" value={snapshot.dashboard.bankSummary} />
        <Stat icon={<Settings />} label="Business Rule" value={snapshot.dashboard.businessRuleSummary} />
        <Stat icon={<AlertTriangle />} label="Pending Approval" value={snapshot.dashboard.pendingApproval} />
      </section>

      <section className="panel">
        <h2>Search</h2>
        <div className="form-grid">
          <label>Collection<select value={collectionName} onChange={(event) => setCollectionName(event.target.value)}>{MASTER_COLLECTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Branch, region, bank, merchant, policy, business rule" /></label>
          {isAdmin && <label>Approval<select value={String(approvalRequired)} onChange={(event) => setApprovalRequired(event.target.value === 'true')}><option value="true">Require Approval</option><option value="false">Direct Save</option></select></label>}
        </div>
      </section>

      <section className="content-grid wide-left">
        <div className="panel">
          <h2>{collectionName}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr>{masterDataColumns(collectionName).map((column) => <th key={column}>{column}</th>)}<th>Status</th>{isAdmin && <th>Action</th>}</tr></thead>
              <tbody>
                {rows.slice(0, 80).map((row, index) => (
                  <tr key={masterDataRowKey(collectionName, row, index)}>
                    {masterDataColumns(collectionName).map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}
                    <td><StatusBadge status={row.status || (row.isActive === false ? 'INACTIVE' : 'ACTIVE')} /></td>
                    {isAdmin && <td><button type="button" onClick={() => editRow(row)}>Edit</button></td>}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={masterDataColumns(collectionName).length + 2} className="empty">No master data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>{isAdmin ? 'Manage Master Data' : 'Permission'}</h2>
          {isAdmin ? (
            <div className="stack">
              <MasterDataDraftForm collectionName={collectionName} draft={draft} onChange={updateDraft} snapshot={snapshot} />
              <button type="button" onClick={saveDraft}>Save Change</button>
              <details>
                <summary>Import Excel/CSV data as CSV or JSON</summary>
                <textarea rows="8" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste JSON array or CSV rows here" />
                <button type="button" onClick={importRows}>Import</button>
              </details>
            </div>
          ) : (
            <p className="muted">Role นี้สามารถอ่านข้อมูล Master Data ตามสิทธิ์ได้ การแก้ไขทำได้โดย Admin และสร้าง Approval/History/Audit Log ทุกครั้ง</p>
          )}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Approval Workflow</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Approval</th><th>Collection</th><th>Requester</th><th>Status</th><th>Time</th><th>Action</th></tr></thead>
              <tbody>
                {snapshot.approvals.slice(0, 40).map((approval) => (
                  <tr key={approval.approvalId}>
                    <td>{approval.approvalId}</td>
                    <td>{approval.collectionName}</td>
                    <td>{approval.requestedBy}</td>
                    <td><StatusBadge status={approval.status} /></td>
                    <td>{formatDate(approval.requestedAt)}</td>
                    <td>{isAdmin && approval.status === 'PENDING' && <div className="action-row compact"><button onClick={() => approveChange(approval)}>Approve</button><button onClick={() => rejectChange(approval)}>Reject</button></div>}</td>
                  </tr>
                ))}
                {!snapshot.approvals.length && <tr><td colSpan="6" className="empty">No approval item</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Recent Changes</h2>
          <div className="log-list">
            {snapshot.history.slice(0, 30).map((history) => (
              <div key={history.historyId}>
                <strong>{history.action} | {history.collectionName}</strong>
                <span>{history.actor} | {history.actorRole}</span>
                <small>{formatDate(history.createdAt)} | {history.itemId}</small>
              </div>
            ))}
            {!snapshot.history.length && <div className="empty">No master data history</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function MasterDataDraftForm({ collectionName, draft, onChange, snapshot }) {
  const fields = masterDataColumns(collectionName).filter((field) => field !== 'status');
  return (
    <div className="form-grid">
      {fields.map((field) => {
        if (field === 'branchCode') {
          return <label key={field}>{field}<select value={draft[field] || ''} onChange={(event) => onChange(field, event.target.value)}><option value="">Select</option>{snapshot.branches.map((branch) => <option key={branch.branchCode} value={branch.branchCode}>{branch.branchCode} - {branch.branchName}</option>)}</select></label>;
        }
        if (field === 'region') {
          return <label key={field}>{field}<select value={draft[field] || ''} onChange={(event) => onChange(field, event.target.value)}><option value="">Select</option>{snapshot.regions.map((region) => <option key={region.regionId} value={region.regionId}>{region.regionName}</option>)}</select></label>;
        }
        if (field === 'depositPolicy') {
          return <label key={field}>{field}<select value={draft[field] || ''} onChange={(event) => onChange(field, event.target.value)}>{DEPOSIT_POLICIES.map((item) => <option key={item}>{item}</option>)}</select></label>;
        }
        if (field === 'businessDatePolicy') {
          return <label key={field}>{field}<select value={draft[field] || ''} onChange={(event) => onChange(field, event.target.value)}>{BUSINESS_DATE_POLICIES.map((item) => <option key={item}>{item}</option>)}</select></label>;
        }
        if (field.toLowerCase().includes('date')) {
          return <label key={field}>{field}<input type="date" value={draft[field] || ''} onChange={(event) => onChange(field, event.target.value)} /></label>;
        }
        return <label key={field}>{field}<input value={draft[field] ?? ''} onChange={(event) => onChange(field, event.target.value)} /></label>;
      })}
      <label>Status<select value={draft.status || 'ACTIVE'} onChange={(event) => onChange('status', event.target.value)}><option>ACTIVE</option><option>INACTIVE</option><option>OPEN</option><option>CLOSED</option></select></label>
    </div>
  );
}

function masterDataColumns(collectionName) {
  return {
    branches: ['branchCode', 'branchName', 'region', 'province', 'openingDate', 'closingDate'],
    branchPolicies: ['policyId', 'branchCode', 'morningStart', 'morningEnd', 'afternoonStart', 'afternoonEnd', 'depositPolicy', 'businessDatePolicy', 'effectiveDate'],
    bankAccounts: ['accountId', 'branchCode', 'bankName', 'accountName', 'accountNumberMasked', 'accountType'],
    merchants: ['merchantId', 'branchCode', 'merchantType', 'merchantName', 'merchantCode', 'provider'],
    paymentTypes: ['code', 'name', 'posField', 'requiredDocumentType'],
    businessRules: ['ruleId', 'ruleCode', 'name', 'category', 'severity'],
    holidays: ['holidayId', 'holidayDate', 'holidayName', 'branchCode', 'holidayType'],
    regions: ['regionId', 'regionName', 'regionType', 'parentRegionId']
  }[collectionName] || ['id', 'name'];
}

function defaultMasterDataDraft(collectionName, snapshot = {}) {
  const firstBranch = snapshot.branches?.[0]?.branchCode || '';
  return {
    branches: { branchCode: '', branchName: '', region: 'HQ', province: '', openingDate: new Date().toISOString().slice(0, 10), closingDate: '', status: 'OPEN', isActive: true },
    branchPolicies: { policyId: '', branchCode: firstBranch, morningStart: '08:00', morningEnd: '14:00', afternoonStart: '14:00', afternoonEnd: '21:00', depositPolicy: 'NEXT_DAY', paymentPolicy: 'TOTAL_ONLY', businessDatePolicy: 'BUSINESS_DATE', effectiveDate: new Date().toISOString().slice(0, 10), status: 'ACTIVE' },
    bankAccounts: { accountId: '', branchCode: firstBranch, bankName: 'SCB', accountName: '', accountNumberMasked: '', accountType: 'PAYIN', status: 'ACTIVE' },
    merchants: { merchantId: '', branchCode: firstBranch, merchantType: 'MAEMANEE', merchantName: '', merchantCode: '', provider: 'SCB', status: 'ACTIVE' },
    paymentTypes: { code: '', name: '', posField: '', requiredDocumentType: '', status: 'ACTIVE', active: true },
    businessRules: { ruleId: '', ruleCode: '', name: '', category: 'GENERAL', severity: 'MEDIUM', status: 'ACTIVE', enabled: true },
    holidays: { holidayId: '', holidayDate: new Date().toISOString().slice(0, 10), holidayName: '', branchCode: '', holidayType: 'PUBLIC', status: 'ACTIVE' },
    regions: { regionId: '', regionName: '', regionType: 'REGION', parentRegionId: 'HQ', status: 'ACTIVE' }
  }[collectionName] || {};
}

function masterDataRowKey(collectionName, row, index) {
  return row.branchCode || row.policyId || row.accountId || row.merchantId || row.code || row.ruleId || row.holidayId || row.regionId || `${collectionName}-${index}`;
}

function toCsv(rows = []) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [keys.join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
}

function EnterpriseLaunchCenter({ records, visibleRecords, auditLogs, user, onAuditAction }) {
  const [launchSnapshot, setLaunchSnapshot] = useState(null);
  const [rule, setRule] = useState({ name: '', category: 'GENERAL', severity: 'MEDIUM', enabled: true });
  const [template, setTemplate] = useState({ name: '', version: '1.0', status: 'ACTIVE', detectionRule: '' });
  const [provider, setProvider] = useState({ name: '', type: 'AI_PROVIDER', status: 'READY', localOnly: true });
  const [retention, setRetention] = useState(() => retentionArchiveService.getPolicy());
  const isAdmin = user?.role === ROLES.ADMIN;

  async function refreshLaunch() {
    const platform = await platformService.getAdminConsoleSnapshot();
    const workflowCases = workflowService.syncFromRecords(records);
    const operationsSnapshot = operationsAnalyticsService.buildSnapshot({ records, workflowCases, platform, auditLogs, user });
    const launch = await launchCenterService.buildSnapshot({ platformService, productionReadinessService, operationsSnapshot });
    setLaunchSnapshot({ platform, workflowCases, operationsSnapshot, launch });
    setRetention(retentionArchiveService.getPolicy());
  }

  useEffect(() => {
    refreshLaunch();
  }, [records, auditLogs, user]);

  if (!launchSnapshot) return <div className="panel">Loading enterprise launch center...</div>;

  const improvement = improvementCenterService.build({ records: visibleRecords, workflowCases: launchSnapshot.workflowCases, auditLogs });
  const learning = aiLearningCenterService.collect({ records: visibleRecords, auditLogs });
  const systemAudit = systemAuditService.summarize(auditLogs);
  const rules = businessRuleCenterService.list();
  const templates = templateManagerService.list();
  const providers = aiProviderManagerService.list();
  const archiveItems = retentionArchiveService.listArchive();

  async function saveRule() {
    if (!rule.name) return;
    const saved = businessRuleCenterService.save(rule);
    await onAuditAction?.('BUSINESS_RULE_CHANGE', null, saved);
    setRule({ name: '', category: 'GENERAL', severity: 'MEDIUM', enabled: true });
    refreshLaunch();
  }

  async function disableRule(item) {
    const saved = businessRuleCenterService.disable(item.ruleId);
    await onAuditAction?.('BUSINESS_RULE_DISABLE', item, saved);
    refreshLaunch();
  }

  async function saveTemplate() {
    if (!template.name) return;
    const saved = templateManagerService.save(template);
    await onAuditAction?.('TEMPLATE_CHANGE', null, saved);
    setTemplate({ name: '', version: '1.0', status: 'ACTIVE', detectionRule: '' });
    refreshLaunch();
  }

  async function saveProvider() {
    if (!provider.name) return;
    const saved = aiProviderManagerService.save(provider);
    await onAuditAction?.('AI_PROVIDER_CHANGE', null, saved);
    setProvider({ name: '', type: 'AI_PROVIDER', status: 'READY', localOnly: true });
    refreshLaunch();
  }

  async function saveRetention() {
    const before = retentionArchiveService.getPolicy();
    const after = retentionArchiveService.updatePolicy(retention);
    await onAuditAction?.('RETENTION_POLICY_CHANGE', before, after);
    refreshLaunch();
  }

  async function archiveDocument() {
    const source = visibleRecords[0]?.documents?.[0] || visibleRecords[0];
    if (!source) return;
    const saved = retentionArchiveService.archive({ sourceId: source.id || source.documentId || source.filename, sourceType: source.documentType || 'PAYIN_RECORD' });
    await onAuditAction?.('ARCHIVE_CREATE', null, saved);
    refreshLaunch();
  }

  return (
    <div className="stack">
      <section className={launchSnapshot.launch.launchStatus === 'READY' ? 'panel' : 'panel warning-panel'}>
        <h2>Enterprise Launch Center</h2>
        <p>Version 1.0 Enterprise Ready. Supports launch, continuous improvement, configurable business rules, provider extensibility, retention, archive, monitoring, and future Version 2.0 growth.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<Check />} label="Launch Status" value={launchSnapshot.launch.launchStatus} />
        <Stat icon={<ShieldCheck />} label="Health Score" value={`${launchSnapshot.launch.healthScore}%`} />
        <Stat icon={<BarChart3 />} label="AI Accuracy" value={`${improvement.aiAccuracy}%`} />
        <Stat icon={<Search />} label="OCR Accuracy" value={`${improvement.ocrAccuracy}%`} />
        <Stat icon={<AlertTriangle />} label="Business Exception" value={improvement.businessExceptionCount} />
        <Stat icon={<UserCog />} label="Workflow KPI" value={`${improvement.workflowKpi}%`} />
      </section>
      <section className="content-grid">
        <DashboardPanel title="Launch Center" rows={[
          ['System Status', launchSnapshot.launch.systemStatus],
          ['AI Status', launchSnapshot.launch.aiStatus],
          ['OCR Status', launchSnapshot.launch.ocrStatus],
          ['Workflow', launchSnapshot.launch.workflowStatus],
          ['Database', launchSnapshot.launch.databaseStatus],
          ['Storage', launchSnapshot.launch.storageStatus],
          ['Queue', launchSnapshot.launch.queueStatus],
          ['Worker', launchSnapshot.launch.workerStatus],
          ['Backup', launchSnapshot.launch.backupStatus]
        ]} />
        <DashboardPanel title="Continuous Improvement" rows={[
          ['AI Accuracy', `${improvement.aiAccuracy}%`],
          ['OCR Accuracy', `${improvement.ocrAccuracy}%`],
          ['Manual Correction', improvement.manualCorrectionCount],
          ['False Positive', improvement.falsePositive],
          ['False Negative', improvement.falseNegative],
          ['Branch KPI', `${improvement.branchKpi}%`]
        ]} />
        <DashboardPanel title="AI Learning Center" rows={[
          ['Correction History', learning.correctionHistory.length],
          ['Manual Override', learning.manualOverride.length],
          ['False Positive', learning.falsePositive.length],
          ['OCR Failure', learning.ocrFailure.length],
          ['Low Confidence', learning.lowConfidence.length],
          ['Training Dataset', learning.trainingDataset.length]
        ]} />
        <DashboardPanel title="Enterprise KPI" rows={[
          ['Branch KPI', `${launchSnapshot.operationsSnapshot.kpis.branchKpi}%`],
          ['Accounting KPI', `${launchSnapshot.operationsSnapshot.kpis.accountingKpi}%`],
          ['Audit KPI', `${launchSnapshot.operationsSnapshot.kpis.auditKpi}%`],
          ['Regional KPI', `${launchSnapshot.operationsSnapshot.kpis.branchKpi}%`],
          ['Executive KPI', `${launchSnapshot.operationsSnapshot.workflowSla.passRate}%`]
        ]} />
      </section>
      <section className="content-grid">
        <LaunchRulePanel rules={rules} rule={rule} setRule={setRule} isAdmin={isAdmin} onSave={saveRule} onDisable={disableRule} />
        <LaunchTemplatePanel templates={templates} template={template} setTemplate={setTemplate} isAdmin={isAdmin} onSave={saveTemplate} />
        <LaunchProviderPanel providers={providers} provider={provider} setProvider={setProvider} isAdmin={isAdmin} onSave={saveProvider} />
        <LaunchRetentionPanel retention={retention} setRetention={setRetention} isAdmin={isAdmin} onSave={saveRetention} archiveItems={archiveItems} onArchive={archiveDocument} />
      </section>
      <section className="content-grid">
        <DashboardPanel title="System Analytics" rows={[
          ['Documents / Day', launchSnapshot.operationsSnapshot.todaySummary.submitted],
          ['OCR Success', `${improvement.ocrAccuracy}%`],
          ['AI Success', `${improvement.aiAccuracy}%`],
          ['Average Processing Time', `${launchSnapshot.platform.monitoring.averageAiTimeMs} ms`],
          ['Workflow Time', `${launchSnapshot.platform.monitoring.queueWaiting} queued`],
          ['Risk Trend', launchSnapshot.operationsSnapshot.riskSummary.averageRisk],
          ['Branch Trend', launchSnapshot.operationsSnapshot.companyOverview.branches]
        ]} />
        <DashboardPanel title="System Audit" rows={[
          ['Configuration Change', systemAudit.configurationChange.length],
          ['Permission Change', systemAudit.permissionChange.length],
          ['Workflow Change', systemAudit.workflowChange.length],
          ['Business Rule Change', systemAudit.businessRuleChange.length],
          ['AI Provider Change', systemAudit.aiProviderChange.length],
          ['Total Events', systemAudit.totalEvents]
        ]} />
        <DashboardPanel title="Security Ready" rows={[
          ['Two Factor Ready', 'READY'],
          ['SSO Ready', 'READY'],
          ['Active Directory Ready', 'READY'],
          ['Microsoft Entra ID Ready', 'READY'],
          ['API Gateway Ready', 'READY'],
          ['Webhook Ready', 'READY']
        ]} />
        <DashboardPanel title="Automatic Maintenance" rows={[
          ['Auto Cleanup', 'READY'],
          ['Auto Archive', retention.archiveEnabled ? 'READY' : 'DISABLED'],
          ['Auto Backup', launchSnapshot.launch.backupStatus],
          ['Auto Health Check', 'READY'],
          ['Auto Queue Recovery', 'READY']
        ]} />
      </section>
    </div>
  );
}

function LaunchRulePanel({ rules, rule, setRule, isAdmin, onSave, onDisable }) {
  return (
    <div className="panel">
      <h2>Business Rule Center</h2>
      {isAdmin && (
        <div className="form-grid single">
          <label>Name<input value={rule.name} onChange={(event) => setRule({ ...rule, name: event.target.value })} /></label>
          <label>Category<input value={rule.category} onChange={(event) => setRule({ ...rule, category: event.target.value })} /></label>
          <label>Severity<select value={rule.severity} onChange={(event) => setRule({ ...rule, severity: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
          <button type="button" onClick={onSave}>Save Rule</button>
        </div>
      )}
      <div className="simple-list">
        {rules.map((item) => <button key={item.ruleId} type="button" onClick={() => isAdmin && onDisable(item)}><strong>{item.name}</strong><span>{item.category} | {item.severity}</span><small>{item.enabled ? 'Enabled' : 'Disabled'}</small></button>)}
      </div>
    </div>
  );
}

function LaunchTemplatePanel({ templates, template, setTemplate, isAdmin, onSave }) {
  return (
    <div className="panel">
      <h2>Template Manager</h2>
      {isAdmin && (
        <div className="form-grid single">
          <label>Name<input value={template.name} onChange={(event) => setTemplate({ ...template, name: event.target.value })} /></label>
          <label>Version<input value={template.version} onChange={(event) => setTemplate({ ...template, version: event.target.value })} /></label>
          <label>Detection Rule<input value={template.detectionRule} onChange={(event) => setTemplate({ ...template, detectionRule: event.target.value })} /></label>
          <button type="button" onClick={onSave}>Save Template</button>
        </div>
      )}
      <div className="simple-list">
        {templates.map((item) => <button key={item.templateId} type="button"><strong>{item.name}</strong><span>Version {item.version}</span><small>{item.status}</small></button>)}
      </div>
    </div>
  );
}

function LaunchProviderPanel({ providers, provider, setProvider, isAdmin, onSave }) {
  return (
    <div className="panel">
      <h2>AI Provider Manager</h2>
      {isAdmin && (
        <div className="form-grid single">
          <label>Name<input value={provider.name} onChange={(event) => setProvider({ ...provider, name: event.target.value })} /></label>
          <label>Type<select value={provider.type} onChange={(event) => setProvider({ ...provider, type: event.target.value })}><option>AI_PROVIDER</option><option>OCR_PROVIDER</option><option>VISION_PROVIDER</option></select></label>
          <label>Status<select value={provider.status} onChange={(event) => setProvider({ ...provider, status: event.target.value })}><option>READY</option><option>DISABLED</option><option>TESTING</option></select></label>
          <button type="button" onClick={onSave}>Save Provider</button>
        </div>
      )}
      <div className="simple-list">
        {providers.map((item) => <button key={item.providerId} type="button"><strong>{item.name}</strong><span>{item.type} | {item.status}</span><small>{item.localOnly ? 'Local/free only' : 'External'}</small></button>)}
      </div>
    </div>
  );
}

function LaunchRetentionPanel({ retention, setRetention, isAdmin, onSave, archiveItems, onArchive }) {
  return (
    <div className="panel">
      <h2>Retention & Archive</h2>
      <div className="form-grid single">
        <label>Image Retention
          <select disabled={!isAdmin} value={retention.imageRetention} onChange={(event) => setRetention({ ...retention, imageRetention: event.target.value })}>
            <option>1_YEAR</option>
            <option>2_YEARS</option>
            <option>5_YEARS</option>
            <option>PERMANENT</option>
          </select>
        </label>
        <label>OCR Retention
          <select disabled={!isAdmin} value={retention.ocrRetention} onChange={(event) => setRetention({ ...retention, ocrRetention: event.target.value })}>
            <option>1_YEAR</option>
            <option>2_YEARS</option>
            <option>5_YEARS</option>
            <option>PERMANENT</option>
          </select>
        </label>
        <label className="checkline"><input disabled={!isAdmin} type="checkbox" checked={retention.archiveEnabled} onChange={(event) => setRetention({ ...retention, archiveEnabled: event.target.checked })} /> Archive enabled</label>
        {isAdmin && <button type="button" onClick={onSave}>Save Retention</button>}
        {isAdmin && <button type="button" onClick={onArchive}>Archive Latest Item</button>}
      </div>
      <div className="simple-list">
        {archiveItems.slice(0, 5).map((item) => <button key={item.archiveId} type="button"><strong>{item.sourceType}</strong><span>{item.sourceId}</span><small>{item.status} | v{item.version}</small></button>)}
        {!archiveItems.length && <div className="empty">No archived item</div>}
      </div>
    </div>
  );
}

function ProductionReadinessDashboard({ user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(null);
  const [environmentConfig, setEnvironmentConfig] = useState(() => environmentConfigurationService.getConfig());
  const [trainingMode, setTrainingMode] = useState(() => trainingModeService.getState());
  const [newUat, setNewUat] = useState({ category: 'Branch Upload', title: '', steps: '', expectedResult: '' });
  const isAdmin = user?.role === ROLES.ADMIN;

  async function refreshReadiness() {
    setSnapshot(await productionReadinessService.getReadinessSnapshot(platformService));
    setEnvironmentConfig(environmentConfigurationService.getConfig());
    setTrainingMode(trainingModeService.getState());
  }

  useEffect(() => {
    refreshReadiness();
  }, []);

  async function updateChecklist(item, status) {
    const next = goLiveChecklistService.updateItem(item.code, {
      status,
      checkedBy: user?.email || '',
      evidence: `${status} by ${user?.role || 'system'}`
    });
    loggingService.write(LOG_TYPES.SYSTEM, 'INFO', `Go-live checklist ${item.code} ${status}`, { actor: user?.email });
    await onAuditAction?.('GO_LIVE_CHECKLIST_UPDATE', item, next.find((entry) => entry.code === item.code));
    refreshReadiness();
  }

  async function setEnvironment(environment) {
    const before = environmentConfig;
    const after = environmentConfigurationService.setEnvironment(environment);
    loggingService.write(LOG_TYPES.APPLICATION, 'INFO', `Environment changed to ${environment}`, { actor: user?.email });
    await onAuditAction?.('GO_LIVE_SET_ENVIRONMENT', before, after);
    refreshReadiness();
  }

  async function toggleTrainingMode() {
    const before = trainingMode;
    const after = trainingModeService.setEnabled(!trainingMode.enabled);
    loggingService.write(LOG_TYPES.SECURITY, 'INFO', `Training mode ${after.enabled ? 'enabled' : 'disabled'}`, { actor: user?.email });
    await onAuditAction?.('GO_LIVE_TRAINING_MODE', before, after);
    refreshReadiness();
  }

  async function createUatCase() {
    if (!newUat.title) return;
    const saved = uatService.createTestCase(newUat);
    await onAuditAction?.('UAT_CREATE_TEST_CASE', null, saved);
    setNewUat({ category: 'Branch Upload', title: '', steps: '', expectedResult: '' });
    refreshReadiness();
  }

  async function updateUat(testCase, action) {
    const before = testCase;
    const after = action === 'RUN'
      ? uatService.runTest(testCase.testCaseId, user?.email)
      : action === 'APPROVE'
        ? uatService.approve(testCase.testCaseId, user?.email, 'Approved for go-live')
        : uatService.reject(testCase.testCaseId, user?.email, 'Rejected for correction');
    loggingService.write(LOG_TYPES.APPLICATION, 'INFO', `UAT ${testCase.testCaseId} ${action}`, { actor: user?.email });
    await onAuditAction?.(`UAT_${action}`, before, after);
    refreshReadiness();
  }

  async function runPerformance(type) {
    const run = performanceTestService.runTest(type, { branches: 100, concurrentUsers: 500, documents: 100000 });
    loggingService.write(LOG_TYPES.SYSTEM, 'INFO', `${type} completed`, run);
    await onAuditAction?.(`PERFORMANCE_${type}`, null, run);
    refreshReadiness();
  }

  async function runSecurityTests() {
    const results = securityTestService.runAll();
    loggingService.write(LOG_TYPES.SECURITY, 'INFO', 'Security test suite completed', { count: results.length });
    await onAuditAction?.('SECURITY_TEST_RUN_ALL', null, results);
    refreshReadiness();
  }

  if (!snapshot) return <div className="panel">Loading production readiness...</div>;

  const logs = loggingService.listLogs().slice(0, 40);
  const checklistReady = snapshot.checklistResult.ready;
  const canGoLive = snapshot.goLiveStatus === 'READY';

  return (
    <div className="stack">
      <section className={canGoLive ? 'panel' : 'panel warning-panel'}>
        <h2>Production Readiness Dashboard</h2>
        <p>Go-live requires 100% critical tests and at least 95% overall acceptance. This dashboard is a readiness gate; it does not change business logic.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<Check />} label="Go Live Status" value={snapshot.goLiveStatus} />
        <Stat icon={<ShieldCheck />} label="Health Score" value={`${snapshot.healthScore}%`} />
        <Stat icon={<Settings />} label="Deployment" value={snapshot.deploymentStatus} />
        <Stat icon={<Download />} label="Backup" value={snapshot.backupStatus} />
        <Stat icon={<AlertTriangle />} label="Critical Test" value={`${snapshot.checklistResult.criticalPercent}%`} />
        <Stat icon={<BarChart3 />} label="Overall Test" value={`${snapshot.checklistResult.overallPercent}%`} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Environment</h2>
          <div className="simple-list">
            {Object.values(ENVIRONMENTS).map((environment) => {
              const item = environmentConfig.environments?.[environment] || {};
              return (
                <button key={environment} type="button" className={environmentConfig.activeEnvironment === environment ? 'active' : ''} onClick={() => isAdmin && setEnvironment(environment)}>
                  <strong>{environment}</strong>
                  <span>{item.databaseMode} | {item.storageMode}</span>
                  <small>{item.trainingMode ? 'Training data allowed' : 'Production data only'}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <h2>Training Mode</h2>
          <div className="metric-row">
            <Metric label="Status" value={trainingMode.enabled ? 'ENABLED' : 'DISABLED'} />
            <Metric label="Data Mode" value={trainingMode.dataMode} />
            <Metric label="Roles" value={(trainingMode.roles || []).join(', ')} />
          </div>
          {isAdmin && <button type="button" onClick={toggleTrainingMode}>{trainingMode.enabled ? 'Disable Training Mode' : 'Enable Training Mode'}</button>}
        </div>
      </section>
      <section className="panel">
        <h2>Go Live Checklist</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Check</th>
                <th>Critical</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.checklist.map((item) => (
                <tr key={item.code}>
                  <td>{item.category}</td>
                  <td>{item.name}</td>
                  <td>{item.critical ? 'Yes' : 'No'}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.evidence || '-'}</td>
                  <td>
                    {isAdmin ? (
                      <div className="action-row compact">
                        <button type="button" onClick={() => updateChecklist(item, 'PASS')}>Pass</button>
                        <button type="button" onClick={() => updateChecklist(item, 'FAIL')}>Fail</button>
                      </div>
                    ) : 'Read only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>UAT Summary</h2>
          <div className="metric-row">
            <Metric label="Total" value={snapshot.uatSummary.total} />
            <Metric label="Approved" value={snapshot.uatSummary.approved} />
            <Metric label="Rejected" value={snapshot.uatSummary.rejected} danger={snapshot.uatSummary.rejected > 0} />
            <Metric label="Pending" value={snapshot.uatSummary.pending} />
          </div>
          {isAdmin && (
            <div className="form-grid single">
              <label>Category
                <select value={newUat.category} onChange={(event) => setNewUat({ ...newUat, category: event.target.value })}>
                  {UAT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>Title<input value={newUat.title} onChange={(event) => setNewUat({ ...newUat, title: event.target.value })} /></label>
              <label>Steps<textarea value={newUat.steps} onChange={(event) => setNewUat({ ...newUat, steps: event.target.value })} /></label>
              <label>Expected Result<textarea value={newUat.expectedResult} onChange={(event) => setNewUat({ ...newUat, expectedResult: event.target.value })} /></label>
              <button type="button" onClick={createUatCase}>Create UAT Test Case</button>
            </div>
          )}
        </div>
        <div className="panel">
          <h2>Performance & Security</h2>
          <div className="action-row">
            {isAdmin && <button type="button" onClick={() => runPerformance('LOAD_TEST')}>Run Load Test</button>}
            {isAdmin && <button type="button" onClick={() => runPerformance('STRESS_TEST')}>Run Stress Test</button>}
            {isAdmin && <button type="button" onClick={runSecurityTests}>Run Security Tests</button>}
          </div>
          <div className="metric-row">
            <Metric label="Security" value={`${snapshot.securityPercent}%`} />
            <Metric label="Latest Perf" value={snapshot.latestPerformance?.status || 'NO_RUN'} />
            <Metric label="P95" value={snapshot.latestPerformance ? `${snapshot.latestPerformance.p95ResponseMs} ms` : '-'} />
            <Metric label="Error Rate" value={snapshot.latestPerformance ? `${snapshot.latestPerformance.errorRate}%` : '-'} />
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>UAT Test Cases</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test Case</th>
                <th>Category</th>
                <th>Title</th>
                <th>Status</th>
                <th>Comment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {uatService.listTestCases().map((testCase) => (
                <tr key={testCase.testCaseId}>
                  <td>{testCase.testCaseId}</td>
                  <td>{testCase.category}</td>
                  <td>{testCase.title}</td>
                  <td><StatusBadge status={testCase.status} /></td>
                  <td>{testCase.comment || '-'}</td>
                  <td>
                    {isAdmin ? (
                      <div className="action-row compact">
                        <button type="button" onClick={() => updateUat(testCase, 'RUN')}>Run</button>
                        <button type="button" onClick={() => updateUat(testCase, 'APPROVE')}>Approve</button>
                        <button type="button" onClick={() => updateUat(testCase, 'REJECT')}>Reject</button>
                      </div>
                    ) : 'Read only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Security Tests</h2>
          <div className="simple-list">
            {snapshot.securityTests.map((test) => (
              <button key={test.testId} type="button">
                <strong>{test.name}</strong>
                <span>{test.severity} | {test.status}</span>
                <small>{test.comment || 'Permission, authentication, authorization, branch isolation, and audit coverage'}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Production Logs</h2>
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.logId}>
                <strong>{log.type} | {log.level}</strong>
                <span>{log.message}</span>
                <small>{formatDate(log.createdAt)}</small>
              </div>
            ))}
            {!logs.length && <div className="empty">No production log</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function PlatformConsole({ user, onAuditAction }) {
  const [snapshot, setSnapshot] = useState(null);
  const [config, setConfig] = useState(() => platformService.configurationService.getConfiguration());
  const [storageForm, setStorageForm] = useState({ bucket: 'ORIGINAL_IMAGE', filename: '', sizeBytes: 0 });
  const isAdmin = user?.role === ROLES.ADMIN;

  async function refreshSnapshot() {
    setSnapshot(await platformService.getAdminConsoleSnapshot());
  }

  useEffect(() => {
    refreshSnapshot();
  }, []);

  async function seedJobs() {
    const jobs = platformService.seedDemoJobs();
    await onAuditAction?.('PLATFORM_SEED_QUEUE_JOBS', null, jobs);
    refreshSnapshot();
  }

  async function runBackup(type = 'MANUAL') {
    const backup = platformService.backupService.createBackup(type, { note: `${type} backup from platform console` });
    await onAuditAction?.('PLATFORM_CREATE_BACKUP', null, backup);
    refreshSnapshot();
  }

  async function saveConfiguration() {
    const next = platformService.configurationService.updateConfiguration(config);
    setConfig(next);
    await onAuditAction?.('PLATFORM_UPDATE_CONFIGURATION', null, next);
    refreshSnapshot();
  }

  async function registerStorageObject() {
    const object = platformService.storageManager.registerObject(storageForm.bucket, storageForm);
    await onAuditAction?.('PLATFORM_REGISTER_STORAGE_OBJECT', null, object);
    setStorageForm({ bucket: 'ORIGINAL_IMAGE', filename: '', sizeBytes: 0 });
    refreshSnapshot();
  }

  async function updateJob(job, action) {
    const before = job;
    const after = action === 'PAUSE'
      ? platformService.queueManager.pause(job.jobId)
      : action === 'RESUME'
        ? platformService.queueManager.resume(job.jobId)
        : action === 'RETRY'
          ? platformService.queueManager.retry(job.jobId)
          : platformService.queueManager.fail(job.jobId, 'Manual fail from platform console');
    await onAuditAction?.(`PLATFORM_QUEUE_${action}`, before, after);
    refreshSnapshot();
  }

  if (!snapshot) return <div className="panel">Loading platform snapshot...</div>;

  const jobs = platformService.queueManager.listJobs().slice(0, 30);
  const deadLetters = platformService.queueManager.listDeadLetters().slice(0, 20);

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Enterprise Platform Foundation</h2>
        <p>Platform layer separates business logic from AI, workflow, storage, database, queue, and worker infrastructure. This console uses local mock services now and can be swapped to production services later.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<ShieldCheck />} label="System Health" value={snapshot.health.status} />
        <Stat icon={<Banknote />} label="Queue Waiting" value={snapshot.monitoring.queueWaiting} />
        <Stat icon={<UserCog />} label="Workers Online" value={`${snapshot.workers.online}/${snapshot.workers.total}`} />
        <Stat icon={<FileImage />} label="Storage Objects" value={snapshot.storage.totalObjects} />
        <Stat icon={<AlertTriangle />} label="Dead Letter" value={snapshot.queues.deadLetter} />
        <Stat icon={<Download />} label="Backups" value={snapshot.backups.length} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>System Health</h2>
          <div className="simple-list">
            {snapshot.health.services.map((service) => (
              <button key={service.name} type="button">
                <strong>{service.name}</strong>
                <span>{service.status}</span>
                <small>{service.responseTimeMs} ms</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Performance Dashboard</h2>
          <div className="metric-row">
            <Metric label="Average OCR" value={`${snapshot.monitoring.averageOcrTimeMs} ms`} />
            <Metric label="Average AI" value={`${snapshot.monitoring.averageAiTimeMs} ms`} />
            <Metric label="CPU" value={`${snapshot.monitoring.cpu}%`} />
            <Metric label="RAM" value={`${snapshot.monitoring.ram}%`} />
            <Metric label="GPU" value={`${snapshot.monitoring.gpu}%`} />
            <Metric label="Disk" value={`${snapshot.monitoring.disk}%`} danger={snapshot.monitoring.disk > 80} />
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <div className="section-head">
            <h2>Queue Monitor</h2>
            {isAdmin && <button type="button" onClick={seedJobs}>Seed Demo Jobs</button>}
          </div>
          <div className="simple-list">
            {snapshot.queues.byType.map((queue) => (
              <button key={queue.type} type="button">
                <strong>{queue.type}</strong>
                <span>Queued {queue.queued} | Processing {queue.processing}</span>
                <small>Failed {queue.failed} | Completed {queue.completed}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Worker Monitor</h2>
          <div className="simple-list">
            {snapshot.workers.workers.map((worker) => (
              <button key={worker.workerId} type="button">
                <strong>{worker.type}</strong>
                <span>{worker.status} | processed {worker.processedToday}</span>
                <small>avg {worker.averageProcessingTimeMs} ms | failed {worker.failedToday}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Background Jobs</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>Status</th>
                <th>Retry</th>
                <th>Timeout</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.jobId}>
                  <td>{job.jobId}</td>
                  <td>{job.type}</td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>{job.retryCount}/{job.maxRetry}</td>
                  <td>{job.timeoutMs} ms</td>
                  <td>
                    {isAdmin ? (
                      <div className="action-row compact">
                        <button type="button" onClick={() => updateJob(job, 'PAUSE')}>Pause</button>
                        <button type="button" onClick={() => updateJob(job, 'RESUME')}>Resume</button>
                        <button type="button" onClick={() => updateJob(job, 'RETRY')}>Retry</button>
                        <button type="button" onClick={() => updateJob(job, 'FAIL')}>Fail</button>
                      </div>
                    ) : 'Read only'}
                  </td>
                </tr>
              ))}
              {!jobs.length && <tr><td colSpan="6" className="empty">No queued job</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Dead Letter Queue</h2>
          <div className="simple-list">
            {deadLetters.map((job) => (
              <button key={job.jobId} type="button">
                <strong>{job.type}</strong>
                <span>{job.jobId}</span>
                <small>{job.error}</small>
              </button>
            ))}
            {!deadLetters.length && <div className="empty">No dead letter job</div>}
          </div>
        </div>
        <div className="panel">
          <h2>Storage Usage</h2>
          <div className="simple-list">
            {snapshot.storage.byBucket.map((bucket) => (
              <button key={bucket.bucket} type="button">
                <strong>{bucket.bucket}</strong>
                <span>{bucket.count} object(s)</span>
                <small>{formatFileSize(bucket.sizeBytes)}</small>
              </button>
            ))}
          </div>
          {isAdmin && (
            <div className="form-grid single">
              <label>Bucket
                <select value={storageForm.bucket} onChange={(event) => setStorageForm({ ...storageForm, bucket: event.target.value })}>
                  {Object.values(STORAGE_BUCKETS).map((bucket) => <option key={bucket}>{bucket}</option>)}
                </select>
              </label>
              <label>Filename<input value={storageForm.filename} onChange={(event) => setStorageForm({ ...storageForm, filename: event.target.value })} /></label>
              <label>Size bytes<input type="number" value={storageForm.sizeBytes} onChange={(event) => setStorageForm({ ...storageForm, sizeBytes: Number(event.target.value) })} /></label>
              <button type="button" onClick={registerStorageObject}>Register Storage Metadata</button>
            </div>
          )}
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <div className="section-head">
            <h2>Backup</h2>
            {isAdmin && (
              <div className="action-row compact">
                <button type="button" onClick={() => runBackup('MANUAL')}>Manual Backup</button>
                <button type="button" onClick={() => runBackup('DAILY')}>Daily Backup</button>
              </div>
            )}
          </div>
          <div className="simple-list">
            {snapshot.backups.map((backup) => (
              <button key={backup.backupId} type="button">
                <strong>{backup.type} | {backup.status}</strong>
                <span>{backup.backupId}</span>
                <small>{formatDate(backup.createdAt)}</small>
              </button>
            ))}
            {!snapshot.backups.length && <div className="empty">No backup</div>}
          </div>
        </div>
        <div className="panel">
          <h2>Scheduler</h2>
          <div className="simple-list">
            {snapshot.schedules.map((schedule) => (
              <button key={schedule.scheduleId} type="button">
                <strong>{schedule.name}</strong>
                <span>{schedule.interval} | {schedule.status}</span>
                <small>Next: {formatDate(schedule.nextRunAt)}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Disaster Recovery Checklist</h2>
          <div className="simple-list">
            {snapshot.disasterRecovery.map((item) => (
              <button key={item.code} type="button">
                <strong>{item.code}</strong>
                <span>{item.label}</span>
                <small>{item.status}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel form-panel">
          <h2>System Configuration</h2>
          <div className="form-grid">
            <label>AI Provider<input disabled={!isAdmin} value={config.aiProvider} onChange={(event) => setConfig({ ...config, aiProvider: event.target.value })} /></label>
            <label>OCR Provider<input disabled={!isAdmin} value={config.ocrProvider} onChange={(event) => setConfig({ ...config, ocrProvider: event.target.value })} /></label>
            <label>Queue Retry<input disabled={!isAdmin} type="number" value={config.queueRetryLimit} onChange={(event) => setConfig({ ...config, queueRetryLimit: Number(event.target.value) })} /></label>
            <label>Timeout ms<input disabled={!isAdmin} type="number" value={config.queueTimeoutMs} onChange={(event) => setConfig({ ...config, queueTimeoutMs: Number(event.target.value) })} /></label>
            <label>Risk Threshold<input disabled={!isAdmin} type="number" value={config.riskThreshold} onChange={(event) => setConfig({ ...config, riskThreshold: Number(event.target.value) })} /></label>
            <label>Session Timeout<input disabled={!isAdmin} type="number" value={config.sessionTimeoutMinutes} onChange={(event) => setConfig({ ...config, sessionTimeoutMinutes: Number(event.target.value) })} /></label>
          </div>
          {isAdmin && <button className="primary" type="button" onClick={saveConfiguration}><Settings size={16} /> Save Configuration</button>}
        </div>
      </section>
    </div>
  );
}

function WorkflowDashboard({ records, user, onAuditAction }) {
  const [cases, setCases] = useState(() => workflowService.syncFromRecords(records));
  const [filters, setFilters] = useState({ search: '', status: 'ALL', risk: 'ALL' });
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [comment, setComment] = useState('');
  const [assignment, setAssignment] = useState({ assignedRole: '', assignedUser: '', assignedBranch: '', assignedRegion: '' });
  const [attachmentName, setAttachmentName] = useState('');

  useEffect(() => {
    const synced = workflowService.syncFromRecords(records);
    setCases(synced);
    if (!selectedCaseId && synced.length) setSelectedCaseId(synced[0].caseId);
  }, [records]);

  const dashboard = useMemo(() => workflowEngine.buildDashboard(cases, user), [cases, user]);
  const notifications = workflowService.repository.listNotifications().filter((item) => item.targetRole === user?.role || item.targetUser === user?.email).slice(0, 20);
  const filteredCases = dashboard.cases.filter((item) => {
    const search = filters.search.toLowerCase();
    const haystack = [item.caseId, item.branchName, item.branchCode, item.businessDate, item.shift, item.currentStatus, item.assignedUser, item.riskScore].join(' ').toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (filters.status !== 'ALL' && item.currentStatus !== filters.status) return false;
    if (filters.risk === 'HIGH' && item.riskScore < 70) return false;
    if (filters.risk === 'MEDIUM' && (item.riskScore < 40 || item.riskScore >= 70)) return false;
    if (filters.risk === 'LOW' && item.riskScore >= 40) return false;
    return true;
  });
  const selectedCase = filteredCases.find((item) => item.caseId === selectedCaseId) || filteredCases[0] || null;
  const allowedActions = selectedCase ? workflowPermissionService.actionsFor(user, selectedCase) : [];
  const canActOnSelectedCase = selectedCase ? workflowPermissionService.canAct(user, selectedCase) : false;

  function refreshCases(updatedCase) {
    const next = cases.some((item) => item.caseId === updatedCase.caseId)
      ? cases.map((item) => (item.caseId === updatedCase.caseId ? updatedCase : item))
      : [updatedCase, ...cases];
    setCases(next);
  }

  function runWorkflowAction(action, payload = {}) {
    if (!selectedCase) return;
    const result = workflowService.transition(selectedCase, action, user, payload);
    refreshCases(result.after);
    onAuditAction?.(`WORKFLOW_${action}`, result.before, result.after);
  }

  function submitComment() {
    if (!comment.trim()) return;
    runWorkflowAction('COMMENT', { comment, commentType: user?.role === 'BRANCH' ? 'BRANCH' : user?.role || 'INTERNAL' });
    setComment('');
  }

  function submitAssignment(mode = 'ASSIGN') {
    runWorkflowAction('ASSIGN', { ...assignment, comment: `${mode} workflow case` });
    setAssignment({ assignedRole: '', assignedUser: '', assignedBranch: '', assignedRegion: '' });
  }

  function attachDocument(file) {
    const attachment = {
      attachmentId: `wfa-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: file?.name || attachmentName || 'manual-attachment',
      fileSize: file?.size || 0,
      mimeType: file?.type || 'application/octet-stream',
      uploadedBy: user?.email || '',
      uploadedAt: new Date().toISOString()
    };
    runWorkflowAction('ATTACH_DOCUMENT', { attachment, comment: `Attachment added: ${attachment.filename}` });
    setAttachmentName('');
  }

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Enterprise Workflow Engine</h2>
        <p>Workflow controls case routing, SLA, assignment, timeline, comments, attachments, notification, and permission. Business rules and AI remain separate modules.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<UserCog />} label="My Task" value={dashboard.stats.myTask} />
        <Stat icon={<ShieldCheck />} label="Pending Review" value={dashboard.stats.pendingReview} />
        <Stat icon={<AlertTriangle />} label="Over SLA" value={dashboard.stats.overSla} />
        <Stat icon={<Banknote />} label="Today" value={dashboard.stats.today} />
        <Stat icon={<Check />} label="Completed Today" value={dashboard.stats.completedToday} />
        <Stat icon={<X />} label="Rejected" value={dashboard.stats.rejected} />
        <Stat icon={<RotateCcw />} label="Returned" value={dashboard.stats.returned} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>SLA Dashboard</h2>
          <div className="simple-list">
            <button type="button"><strong>Over SLA</strong><span>{dashboard.slaDashboard.overSla.length} case(s)</span></button>
            <button type="button"><strong>Due Today</strong><span>{dashboard.slaDashboard.dueToday.length} case(s)</span></button>
            <button type="button"><strong>Critical Priority</strong><span>{dashboard.slaDashboard.critical.length} case(s)</span></button>
          </div>
        </div>
        <div className="panel">
          <h2>In App Notification</h2>
          <div className="simple-list">
            {notifications.map((item) => (
              <button key={item.notificationId} type="button">
                <strong>{item.caseId}</strong>
                <span>{item.message}</span>
                <small>{formatDate(item.createdAt)}</small>
              </button>
            ))}
            {!notifications.length && <div className="empty">No notification</div>}
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Workflow Cases</h2>
          <div className="document-manager-toolbar">
            <label className="search"><Search size={16} /><input placeholder="Search case, branch, date, shift, user" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="ALL">All Status</option>
              {['OPEN', 'IN_PROGRESS', 'WAITING', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select value={filters.risk} onChange={(event) => setFilters({ ...filters, risk: event.target.value })}>
              <option value="ALL">All Risk</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Step</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Risk</th>
                <th>Assigned</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((item) => (
                <tr key={item.caseId} className={selectedCase?.caseId === item.caseId ? 'selected-row' : ''} onClick={() => setSelectedCaseId(item.caseId)}>
                  <td>{item.caseId}</td>
                  <td>{item.branchName || item.branchCode}</td>
                  <td>{item.businessDate}</td>
                  <td>{item.shift}</td>
                  <td>{item.currentStep}</td>
                  <td><StatusBadge status={item.currentStatus} /></td>
                  <td>{item.priority}</td>
                  <td>{item.riskScore}</td>
                  <td>{item.assignedRole}{item.assignedUser ? ` / ${item.assignedUser}` : ''}</td>
                  <td className={item.sla.overSla ? 'danger-text' : ''}>{item.sla.overSla ? 'Over SLA' : `${item.sla.remainingMinutes} min`}</td>
                </tr>
              ))}
              {!filteredCases.length && <tr><td colSpan="10" className="empty">No workflow case</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {selectedCase && (
        <section className="content-grid">
          <div className="panel form-panel">
            <h2>Case Detail</h2>
            <div className="metric-row">
              <Metric label="Current Step" value={selectedCase.currentStep} />
              <Metric label="Status" value={selectedCase.currentStatus} />
              <Metric label="Priority" value={selectedCase.priority} danger={['URGENT', 'CRITICAL'].includes(selectedCase.priority)} />
              <Metric label="Risk Score" value={selectedCase.riskScore} danger={selectedCase.riskScore >= 70} />
            </div>
            {canActOnSelectedCase ? (
              <>
                <div className="action-row">
                  {allowedActions.filter((action) => !['COMMENT', 'ATTACH_DOCUMENT', 'ASSIGN'].includes(action)).map((action) => (
                    <button key={action} type="button" onClick={() => runWorkflowAction(action)}>{action.replaceAll('_', ' ')}</button>
                  ))}
                </div>
                <label>Comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Internal, branch, accounting, or audit comment" /></label>
                <button type="button" onClick={submitComment}>Add Comment</button>
                <div className="form-grid">
                  <label>Assign Role<input value={assignment.assignedRole} onChange={(event) => setAssignment({ ...assignment, assignedRole: event.target.value })} placeholder="ACCOUNTING" /></label>
                  <label>Assign User<input value={assignment.assignedUser} onChange={(event) => setAssignment({ ...assignment, assignedUser: event.target.value })} placeholder="user@dfarm.test" /></label>
                  <label>Assign Branch<input value={assignment.assignedBranch} onChange={(event) => setAssignment({ ...assignment, assignedBranch: event.target.value })} /></label>
                  <label>Assign Region<input value={assignment.assignedRegion} onChange={(event) => setAssignment({ ...assignment, assignedRegion: event.target.value })} /></label>
                </div>
                <div className="action-row">
                  <button type="button" onClick={() => submitAssignment('ASSIGN')}>Assign</button>
                  <button type="button" onClick={() => submitAssignment('REASSIGN')}>Reassign</button>
                  <button type="button" onClick={() => submitAssignment('TRANSFER')}>Transfer</button>
                </div>
                <label>Attachment<input type="file" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png" onChange={(event) => attachDocument(event.target.files?.[0])} /></label>
                <label>Attachment name<input value={attachmentName} onChange={(event) => setAttachmentName(event.target.value)} placeholder="manual-note.pdf" /></label>
                <button type="button" onClick={() => attachDocument(null)}>Add Attachment Metadata</button>
              </>
            ) : (
              <div className="empty">Read only for this case</div>
            )}
          </div>
          <div className="panel">
            <h2>Workflow Timeline</h2>
            <div className="log-list">
              {(selectedCase.timeline || []).map((event) => (
                <div key={event.eventId}>
                  <strong>{event.action}</strong>
                  <span>{event.actor} | {event.actorRole} | {formatDate(event.createdAt)}</span>
                  <small>{`${event.fromStep || '-'} -> ${event.toStep || '-'}${event.comment ? ` | ${event.comment}` : ''}`}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Comments</h2>
            <div className="simple-list">
              {(selectedCase.comments || []).map((item) => (
                <button key={item.commentId} type="button">
                  <strong>{item.type} | {item.actorRole}</strong>
                  <span>{item.text}</span>
                  <small>{item.actor} | {formatDate(item.createdAt)}</small>
                </button>
              ))}
              {!selectedCase.comments?.length && <div className="empty">No comment</div>}
            </div>
          </div>
          <div className="panel">
            <h2>Attachments</h2>
            <div className="simple-list">
              {(selectedCase.attachments || []).map((item) => (
                <button key={item.attachmentId} type="button">
                  <strong>{item.filename}</strong>
                  <span>{item.mimeType} | {formatFileSize(item.fileSize)}</span>
                  <small>{item.uploadedBy} | {formatDate(item.uploadedAt)}</small>
                </button>
              ))}
              {!selectedCase.attachments?.length && <div className="empty">No attachment</div>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const fraudMetricOptions = [
  'differenceCount',
  'missingDocumentCount',
  'manualOverrideCount',
  'duplicateReferenceCount',
  'lateDepositCount',
  'lowConfidenceCount',
  'ocrFailureCount',
  'incompleteDocumentCount',
  'manualMatchCount',
  'highRiskCount',
  'aiCorrectionCount'
];

function BranchRiskDashboard({ records, user, onAuditAction }) {
  const [ruleVersion, setRuleVersion] = useState(0);
  const [patternActions, setPatternActions] = useState(() => readStore('fraudPatternActions', {}));
  const [newRule, setNewRule] = useState({
    patternCode: '',
    patternName: '',
    severity: 'MEDIUM',
    metric: 'differenceCount',
    threshold: 3,
    isActive: true
  });
  const analytics = useMemo(() => fraudPatternEngine.analyze(records), [records, ruleVersion]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  useEffect(() => {
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const snapshot = {
      snapshotDate,
      generatedAt: analytics.generatedAt,
      profiles: analytics.branchRiskProfiles.map((profile) => ({
        branchCode: profile.branchCode,
        branchName: profile.branchName,
        riskScore: profile.currentRiskScore,
        riskLevel: profile.riskLevel,
        branchHealth: profile.branchHealth
      }))
    };
    const history = readStore('branchRiskDailyHistory', []);
    const next = [snapshot, ...history.filter((item) => item.snapshotDate !== snapshotDate)].slice(0, 365);
    writeStore('branchRiskDailyHistory', next);
  }, [analytics]);
  const comparisonBranches = selectedBranches.length
    ? analytics.branchRiskProfiles.filter((profile) => selectedBranches.includes(profile.branchCode))
    : analytics.rankings.top20HighRisk.slice(0, 3);

  function persistAction(pattern, action, extra = {}) {
    const entry = {
      action,
      patternId: pattern.patternId,
      branchCode: pattern.branchCode,
      patternCode: pattern.patternCode,
      actor: user?.email,
      role: user?.role,
      createdAt: new Date().toISOString(),
      ...extra
    };
    const next = { ...patternActions, [pattern.patternId]: entry };
    setPatternActions(next);
    writeStore('fraudPatternActions', next);
    onAuditAction?.(`FRAUD_PATTERN_${action}`, pattern, entry);
    if (action === 'FALSE_POSITIVE') {
      const learning = readStore('fraudPatternLearningDataset', []);
      writeStore('fraudPatternLearningDataset', [entry, ...learning].slice(0, 10000));
    }
  }

  function saveCustomRule() {
    if (!newRule.patternCode || !newRule.patternName) return;
    const savedRules = JSON.parse(localStorage.getItem('dfarm_fraud_pattern_rules') || '[]');
    const rule = {
      ...newRule,
      patternCode: newRule.patternCode.trim().toUpperCase().replace(/\s+/g, '_'),
      threshold: Number(newRule.threshold || 1),
      isActive: true
    };
    localStorage.setItem('dfarm_fraud_pattern_rules', JSON.stringify([rule, ...savedRules]));
    setNewRule({ patternCode: '', patternName: '', severity: 'MEDIUM', metric: 'differenceCount', threshold: 3, isActive: true });
    setRuleVersion((value) => value + 1);
    onAuditAction?.('UPSERT_FRAUD_PATTERN_RULE', null, rule);
  }

  const allPatterns = analytics.fraudPatterns.map((pattern) => ({
    ...pattern,
    status: patternActions[pattern.patternId]?.action || pattern.status
  }));

  return (
    <div className="stack">
      <section className="panel warning-panel">
        <h2>Fraud Pattern Engine</h2>
        <p>{analytics.disclaimer} Business Exception and fraud risk are separate. Accounting or Audit must decide the final case result.</p>
      </section>
      <section className="stats-grid">
        <Stat icon={<Building2 />} label="Branches" value={analytics.branchRiskProfiles.length} />
        <Stat icon={<AlertTriangle />} label="Alerts" value={analytics.alerts.length} />
        <Stat icon={<ShieldCheck />} label="Detected Patterns" value={analytics.fraudPatterns.length} />
        <Stat icon={<AlertTriangle />} label="Critical Branches" value={analytics.branchRiskProfiles.filter((item) => item.riskLevel === 'CRITICAL').length} />
      </section>
      <section className="content-grid">
        <RankingPanel title="Top 20 High Risk Branch" items={analytics.rankings.top20HighRisk} metric="currentRiskScore" suffix="score" />
        <RankingPanel title="Top 20 Low Risk Branch" items={analytics.rankings.top20LowRisk} metric="currentRiskScore" suffix="score" />
        <RankingPanel title="Most Missing Document" items={analytics.rankings.mostMissingDocument} metric="missingDocumentCount" />
        <RankingPanel title="Most Manual Override" items={analytics.rankings.mostManualOverride} metric="manualOverrideCount" />
        <RankingPanel title="Most Difference" items={analytics.rankings.mostDifference} metric="differenceTotal" moneyValue />
        <RankingPanel title="Most Late Deposit" items={analytics.rankings.mostLateDeposit} metric="lateDepositCount" />
        <RankingPanel title="Most AI Correction" items={analytics.rankings.mostAICorrection} metric="aiCorrectionCount" />
        <RankingPanel title="Most OCR Failure" items={analytics.rankings.mostOCRFailure} metric="ocrFailureCount" />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Risk Trend</h2>
          <div className="simple-list">
            {analytics.trend.map((item) => (
              <button key={item.days} type="button">
                <strong>{item.days} days</strong>
                <span>{item.records} records | avg risk {item.averageRisk}</span>
                <small>{item.exceptionCount} exception(s)</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Branch Comparison</h2>
          <label>Branches
            <select multiple value={selectedBranches} onChange={(event) => setSelectedBranches(Array.from(event.target.selectedOptions).map((option) => option.value))}>
              {analytics.branchRiskProfiles.map((profile) => <option key={profile.branchCode} value={profile.branchCode}>{profile.branchCode} - {profile.branchName}</option>)}
            </select>
          </label>
          <div className="comparison-bars">
            {comparisonBranches.map((profile) => (
              <div key={profile.branchCode} className="metric-bar">
                <span>{profile.branchCode}</span>
                <div><i style={{ width: `${Math.min(100, profile.currentRiskScore)}%` }} /></div>
                <strong>{profile.currentRiskScore}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Branch Risk Heat Map</h2>
        <div className="risk-heatmap">
          {analytics.heatMap.map((cell) => (
            <div key={cell.branchCode} className={`heat-cell ${cell.color}`}>
              <strong>{cell.branchCode}</strong>
              <span>{cell.branchName}</span>
              <small>{cell.score} | {cell.riskLevel}</small>
            </div>
          ))}
          {!analytics.heatMap.length && <div className="empty">No branch risk data</div>}
        </div>
      </section>
      <section className="panel">
        <h2>Risk Alerts</h2>
        <div className="simple-list">
          {analytics.alerts.map((alert) => (
            <button key={alert.alertId} type="button">
              <strong>{alert.branchCode} | {alert.riskLevel}</strong>
              <span>{alert.message}</span>
              <small>{formatDate(alert.createdAt)}</small>
            </button>
          ))}
          {!analytics.alerts.length && <div className="empty">No risk alert</div>}
        </div>
      </section>
      <section className="panel">
        <h2>Detected Fraud Patterns</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Pattern</th>
                <th>Severity</th>
                <th>Count</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allPatterns.map((pattern) => (
                <tr key={pattern.patternId}>
                  <td>{pattern.branchCode}</td>
                  <td>
                    <strong>{pattern.patternName}</strong>
                    <small>{pattern.patternCode}</small>
                  </td>
                  <td><StatusBadge status={pattern.severity} /></td>
                  <td>{pattern.occurrenceCount}</td>
                  <td>{pattern.status}</td>
                  <td>
                    <div className="action-row compact">
                      {['ADMIN', 'ACCOUNTING'].includes(user?.role) && (
                        <>
                          <button type="button" onClick={() => persistAction(pattern, 'RESOLVED')}>Resolve</button>
                          <button type="button" onClick={() => persistAction(pattern, 'COMMENTED', { comment: 'Reviewed by Accounting' })}>Comment</button>
                          <button type="button" onClick={() => persistAction(pattern, 'FALSE_POSITIVE')}>False Positive</button>
                        </>
                      )}
                      {['ADMIN', 'AUDIT'].includes(user?.role) && (
                        <>
                          <button type="button" onClick={() => persistAction(pattern, 'LOCKED_CASE')}>Lock Case</button>
                          <button type="button" onClick={() => persistAction(pattern, 'REOPENED_CASE')}>Reopen</button>
                          <button type="button" onClick={() => persistAction(pattern, 'ASSIGNED_INVESTIGATION')}>Assign</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!allPatterns.length && (
                <tr><td colSpan="6" className="empty">No pattern detected</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {user?.role === ROLES.ADMIN && (
        <section className="panel form-panel">
          <h2>Configurable Business Pattern Rule</h2>
          <div className="form-grid">
            <label>Rule code<input value={newRule.patternCode} onChange={(event) => setNewRule({ ...newRule, patternCode: event.target.value })} placeholder="CUSTOM_RULE" /></label>
            <label>Rule name<input value={newRule.patternName} onChange={(event) => setNewRule({ ...newRule, patternName: event.target.value })} placeholder="Repeated custom behavior" /></label>
            <label>Severity
              <select value={newRule.severity} onChange={(event) => setNewRule({ ...newRule, severity: event.target.value })}>
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </label>
            <label>Metric
              <select value={newRule.metric} onChange={(event) => setNewRule({ ...newRule, metric: event.target.value })}>
                {fraudMetricOptions.map((metric) => <option key={metric}>{metric}</option>)}
              </select>
            </label>
            <label>Threshold<input type="number" min="1" value={newRule.threshold} onChange={(event) => setNewRule({ ...newRule, threshold: event.target.value })} /></label>
          </div>
          <button className="primary" type="button" onClick={saveCustomRule}><Settings size={16} /> Save pattern rule</button>
        </section>
      )}
    </div>
  );
}

function RankingPanel({ title, items, metric, suffix = '', moneyValue = false }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="simple-list">
        {items.map((profile) => {
          const value = metric === 'currentRiskScore' ? profile.currentRiskScore : profile.metrics?.[metric] || 0;
          return (
            <button key={`${title}-${profile.branchCode}`} type="button">
              <strong>{profile.branchCode} | {profile.branchName}</strong>
              <span>{profile.riskLevel} | {profile.branchHealth}</span>
              <small>{moneyValue ? money(value) : value} {suffix}</small>
            </button>
          );
        })}
        {!items.length && <div className="empty">No data</div>}
      </div>
    </div>
  );
}

function AuditDashboard({ records, auditLogs }) {
  const depositBatches = depositBatchService.buildBatches(records);
  const shiftMatches = shiftMatchingService.buildMatches(records);
  const reconciliations = shiftReconciliationService.buildReconciliations(records);
  const businessExceptions = records.flatMap((record) => record.businessExceptions?.length ? record.businessExceptions : businessExceptionEngine.summarize(record).exceptions);
  const todayText = new Date().toISOString().slice(0, 10);
  const branchExceptionRanking = Object.entries(businessExceptions.reduce((acc, exception) => {
    const key = exception.branchName || exception.branchCode || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((left, right) => right[1] - left[1]).slice(0, 10);
  const exceptionTrend = [7, 30, 90].map((days) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const count = businessExceptions.filter((exception) => new Date(exception.createdAt || exception.businessDate || todayText) >= since).length;
    return { days, count };
  });
  const totals = {
    records: records.length,
    highRisk: records.filter((item) => item.status === 'HIGH_RISK' || item.riskScore >= 70).length,
    approved: records.filter((item) => item.status === 'APPROVED').length,
    pending: records.filter((item) => item.status === 'PENDING_ACCOUNTING').length,
    batches: depositBatches.length,
    batchPass: depositBatches.filter((batch) => batch.status === 'PASS').length,
    batchFail: depositBatches.filter((batch) => batch.status === 'FAIL').length,
    batchDifference: depositBatches.reduce((sum, batch) => sum + Number(batch.difference || 0), 0),
    shiftPass: shiftMatches.filter((match) => match.status === 'PASS').length,
    shiftWarn: shiftMatches.filter((match) => match.status === 'WARN').length,
    shiftFail: shiftMatches.filter((match) => match.status === 'FAIL').length,
    missingPayIn: shiftMatches.filter((match) => match.riskFlags?.includes('MISSING_SHIFT_PAYIN')).length,
    shiftDifference: shiftMatches.reduce((sum, match) => sum + Number(match.difference || 0), 0),
    recPass: reconciliations.filter((item) => item.status === 'PASS').length,
    recWarn: reconciliations.filter((item) => item.status === 'WARN').length,
    recFail: reconciliations.filter((item) => item.status === 'FAIL').length,
    recMissing: reconciliations.filter((item) => (item.riskFlags || []).some((flag) => flag.startsWith('MISSING_'))).length,
    recDifference: reconciliations.reduce((sum, item) => sum + Number(item.difference || 0), 0),
    recManual: reconciliations.filter((item) => item.riskFlags?.includes('MANUAL_MATCH_REQUIRED')).length,
    exceptionToday: businessExceptions.filter((item) => (item.createdAt || '').slice(0, 10) === todayText).length,
    exceptionOpen: businessExceptions.filter((item) => item.status === 'OPEN').length,
    exceptionResolved: businessExceptions.filter((item) => item.status === 'RESOLVED').length,
    exceptionCritical: businessExceptions.filter((item) => item.severity === 'CRITICAL').length,
    highRiskBranches: branchExceptionRanking.filter(([, count]) => count >= 3).length
  };

  function exportExcel() {
    const exportRows = records.map((record) => ({
      ...record,
      posSummary: JSON.stringify(record.aiDocuments?.POS_SUMMARY?.fields || {}),
      payinOcr: JSON.stringify(record.aiDocuments?.PAYIN_SLIP?.fields || {}),
      transferOcr: JSON.stringify(record.aiDocuments?.TRANSFER_SLIP?.fields || {}),
      riskFlags: (record.riskFlags || []).join(', ')
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Payins');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditLogs), 'AuditLogs');
    XLSX.writeFile(wb, `d-farm-payin-audit-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="stack">
      <section className="stats-grid">
        <Stat icon={<Banknote />} label="Records" value={totals.records} />
        <Stat icon={<AlertTriangle />} label="High risk" value={totals.highRisk} />
        <Stat icon={<Check />} label="Approved" value={totals.approved} />
        <Stat icon={<ShieldCheck />} label="Pending" value={totals.pending} />
      </section>
      <section className="stats-grid">
        <Stat icon={<Banknote />} label="Deposit Batches" value={totals.batches} />
        <Stat icon={<Check />} label="Batch PASS" value={totals.batchPass} />
        <Stat icon={<AlertTriangle />} label="Batch FAIL" value={totals.batchFail} />
        <Stat icon={<Banknote />} label="Difference Total" value={money(totals.batchDifference)} />
      </section>
      <section className="stats-grid">
        <Stat icon={<Check />} label="Shift Pay-in PASS" value={totals.shiftPass} />
        <Stat icon={<AlertTriangle />} label="Shift Pay-in WARN" value={totals.shiftWarn} />
        <Stat icon={<AlertTriangle />} label="Shift Pay-in FAIL" value={totals.shiftFail} />
        <Stat icon={<ShieldCheck />} label="Missing Pay-in" value={totals.missingPayIn} />
        <Stat icon={<Banknote />} label="Shift Difference" value={money(totals.shiftDifference)} />
      </section>
      <section className="stats-grid">
        <Stat icon={<Check />} label="Reconciliation PASS" value={totals.recPass} />
        <Stat icon={<AlertTriangle />} label="Reconciliation WARN" value={totals.recWarn} />
        <Stat icon={<AlertTriangle />} label="Reconciliation FAIL" value={totals.recFail} />
        <Stat icon={<ShieldCheck />} label="Missing Document" value={totals.recMissing} />
        <Stat icon={<Banknote />} label="Difference Total" value={money(totals.recDifference)} />
        <Stat icon={<UserCog />} label="Manual Review" value={totals.recManual} />
      </section>
      <section className="stats-grid">
        <Stat icon={<AlertTriangle />} label="Exception Today" value={totals.exceptionToday} />
        <Stat icon={<ShieldCheck />} label="Exception Open" value={totals.exceptionOpen} />
        <Stat icon={<Check />} label="Resolved" value={totals.exceptionResolved} />
        <Stat icon={<AlertTriangle />} label="Critical" value={totals.exceptionCritical} />
        <Stat icon={<Building2 />} label="High Risk Branch" value={totals.highRiskBranches} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h2>Branch Ranking Top 10</h2>
          <div className="simple-list">
            {branchExceptionRanking.map(([branch, count]) => (
              <button key={branch} type="button"><strong>{branch}</strong><span>{count} exception(s)</span></button>
            ))}
            {!branchExceptionRanking.length && <div className="empty">No exception ranking</div>}
          </div>
        </div>
        <div className="panel">
          <h2>Exception Trend</h2>
          <div className="simple-list">
            {exceptionTrend.map((item) => (
              <button key={item.days} type="button"><strong>{item.days} days</strong><span>{item.count} exception(s)</span></button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Pay-in report</h2>
          <button className="primary" onClick={exportExcel}><Download size={16} /> Export Excel</button>
        </div>
        <RecordTable records={records} />
      </section>
      <section className="panel">
        <h2>Audit log</h2>
        <div className="log-list">
          {auditLogs.slice(0, 50).map((log) => (
            <div key={log.id || `${log.action}-${log.createdAt}`}>
              <strong>{log.action}</strong>
              <span>{log.actor} | {formatDate(log.createdAt)}</span>
              <small>{log.recordId}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminSettings({ branches, users, onSave }) {
  const [branch, setBranch] = useState({ id: '', code: '', name: '', area: '', active: true });
  const [profile, setProfile] = useState({ id: '', name: '', email: '', role: ROLES.BRANCH, branch: seedBranches[0].name, active: true });
  const [shiftPolicies, setShiftPolicies] = useState(() => readStore('branchShiftPolicies', defaultBranchShiftPolicies));
  const [policy, setPolicy] = useState(defaultBranchShiftPolicies[0]);
  const savePolicy = () => {
    const next = shiftPolicies.some((item) => item.branchCode === policy.branchCode)
      ? shiftPolicies.map((item) => (item.branchCode === policy.branchCode ? policy : item))
      : [policy, ...shiftPolicies];
    setShiftPolicies(next);
    writeStore('branchShiftPolicies', next);
  };

  return (
    <div className="content-grid">
      <section className="panel form-panel">
        <h2>Branches</h2>
        <div className="form-grid single">
          <label>Branch ID<input value={branch.id} onChange={(e) => setBranch({ ...branch, id: e.target.value })} /></label>
          <label>Branch code<input value={branch.code || ''} onChange={(e) => setBranch({ ...branch, code: e.target.value })} /></label>
          <label>Name<input value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} /></label>
          <label>Area<input value={branch.area} onChange={(e) => setBranch({ ...branch, area: e.target.value })} /></label>
          <label className="checkline"><input type="checkbox" checked={branch.active} onChange={(e) => setBranch({ ...branch, active: e.target.checked })} /> Active</label>
        </div>
        <button className="primary" onClick={() => onSave('branches', branch)}><Building2 size={16} /> Save branch</button>
        <SimpleList items={branches} onPick={setBranch} />
      </section>

      <section className="panel form-panel">
        <h2>Users</h2>
        <div className="form-grid single">
          <label>User ID<input value={profile.id} onChange={(e) => setProfile({ ...profile, id: e.target.value })} /></label>
          <label>Name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Email<input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
          <label>Role
            <select value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
              <option value={ROLES.ADMIN}>ADMIN</option>
              <option value={ROLES.BRANCH}>BRANCH</option>
              <option value={ROLES.ACCOUNTING}>ACCOUNTING</option>
              <option value={ROLES.AUDIT}>AUDIT</option>
              <option value={ROLES.REGIONAL_MANAGER}>REGIONAL_MANAGER</option>
              <option value={ROLES.EXECUTIVE}>EXECUTIVE</option>
            </select>
          </label>
          <label>Branch
            <select value={profile.branch} onChange={(e) => setProfile({ ...profile, branch: e.target.value })}>
              {[...branches.map((item) => item.name), 'HQ'].map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="checkline"><input type="checkbox" checked={profile.active} onChange={(e) => setProfile({ ...profile, active: e.target.checked })} /> Active</label>
        </div>
        <button className="primary" onClick={() => onSave('users', profile)}><UserCog size={16} /> Save user</button>
        <SimpleList items={users} onPick={setProfile} />
      </section>
      <section className="panel form-panel">
        <h2>Branch Shift Policy</h2>
        <div className="form-grid single">
          <label>Branch Code<input value={policy.branchCode || ''} onChange={(e) => setPolicy({ ...policy, branchCode: e.target.value })} /></label>
          <label>Morning Start<input type="time" value={(policy.morningStartTime || '').slice(0, 5)} onChange={(e) => setPolicy({ ...policy, morningStartTime: `${e.target.value}:00` })} /></label>
          <label>Morning End<input type="time" value={(policy.morningEndTime || '').slice(0, 5)} onChange={(e) => setPolicy({ ...policy, morningEndTime: `${e.target.value}:00` })} /></label>
          <label>Afternoon Start<input type="time" value={(policy.afternoonStartTime || '').slice(0, 5)} onChange={(e) => setPolicy({ ...policy, afternoonStartTime: `${e.target.value}:00` })} /></label>
          <label>Afternoon End<input type="time" value={(policy.afternoonEndTime || '').slice(0, 5)} onChange={(e) => setPolicy({ ...policy, afternoonEndTime: `${e.target.value}:00` })} /></label>
          <label>Effective From<input type="date" value={policy.effectiveFrom || ''} onChange={(e) => setPolicy({ ...policy, effectiveFrom: e.target.value })} /></label>
          <label>Effective To<input type="date" value={policy.effectiveTo || ''} onChange={(e) => setPolicy({ ...policy, effectiveTo: e.target.value })} /></label>
          <label className="checkline"><input type="checkbox" checked={policy.isActive} onChange={(e) => setPolicy({ ...policy, isActive: e.target.checked })} /> Active</label>
        </div>
        <button className="primary" onClick={savePolicy}><Settings size={16} /> Save shift policy</button>
        <div className="simple-list">
          {shiftPolicies.map((item) => (
            <button key={item.branchCode} type="button" onClick={() => setPolicy(item)}>
              <strong>{item.branchCode}</strong>
              <span>Morning {item.morningStartTime}-{item.morningEndTime} | Afternoon {item.afternoonStartTime}-{item.afternoonEndTime}</span>
              <small>{item.isActive ? 'Active' : 'Inactive'}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SimpleList({ items, onPick }) {
  return (
    <div className="simple-list">
      {items.map((item) => (
        <button key={item.id} onClick={() => onPick(item)}>
          <strong>{item.name}</strong>
          <span>{item.role || item.area} | {item.active ? 'Active' : 'Inactive'}</span>
        </button>
      ))}
    </div>
  );
}

const datasetCategories = [
  { key: 'POS_SUMMARY', label: 'POS Summary', shortcuts: '1' },
  { key: 'PAYIN_BANK_COUNTER', label: 'Pay-in Counter', shortcuts: '2' },
  { key: 'PAYIN_ATM', label: 'Pay-in ATM', shortcuts: '3' },
  { key: 'PAYIN_COUNTER_SERVICE', label: 'Counter Service', shortcuts: '4' },
  { key: 'PAYIN_LOTUS', label: 'Lotus', shortcuts: '5' },
  { key: 'BANK_TRANSFER_SLIP', label: 'Mobile Banking Slip', shortcuts: '6' },
  { key: 'MAEMANEE_QR_ALERT', label: 'MaeManee', shortcuts: '7' },
  { key: 'CRM_COUPON_RECEIPT', label: 'CRM', shortcuts: '8' },
  { key: 'DEBTOR_TRANSFER_RECEIPT', label: 'Debtor', shortcuts: '9' },
  { key: 'UNKNOWN', label: 'Unknown', shortcuts: '' }
];

function buildDatasetItems(records, labels) {
  return records.flatMap((record) => (record.documents || []).map((document) => {
    const imageId = `${record.id}::${document.id}`;
    const labelEntry = Object.prototype.hasOwnProperty.call(labels, imageId) ? labels[imageId] : null;
    const label = labelEntry ? labelEntry.label : (document.documentType || 'UNKNOWN');
    return {
      imageId,
      recordId: record.id,
      documentId: document.id,
      date: record.date,
      branch: record.branch,
      filename: document.filename || document.originalFilename || document.fileName || '',
      documentType: document.documentType || 'UNKNOWN',
      label: label || '',
      imageUrl: document.previewUrl || document.thumbnailUrl || document.imageUrl || document.url || '',
      fileSize: document.fileSize || 0,
      duplicate: Boolean(document.duplicateResult?.isDuplicate),
      lowQuality: document.imageQuality?.status === 'FAIL' || Number(document.imageQuality?.score || 100) < 70,
      qualityScore: document.imageQuality?.score ?? '',
      smartLabelSuggestion: document.smartLabelSuggestion || document.classificationResult || null,
      uploadedAt: document.uploadedAt || record.createdAt || '',
      parsedData: document.parsedData || {}
    };
  }));
}

function calculateDatasetStatistics(items) {
  return {
    totalImages: items.length,
    labeledImages: items.filter((item) => item.label && item.label !== 'UNKNOWN').length,
    unlabeledImages: items.filter((item) => !item.label || item.label === 'UNKNOWN').length,
    duplicateImages: items.filter((item) => item.duplicate).length,
    lowQualityImages: items.filter((item) => item.lowQuality).length
  };
}

function downloadTextFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function calculateTemplateStatistics(items, labelHistory) {
  const totalSuggestions = items.filter((item) => item.smartLabelSuggestion?.suggestedLabel || item.smartLabelSuggestion?.documentType).length;
  const autoSelected = items.filter((item) => item.smartLabelSuggestion?.action === 'AUTO_SELECT').length;
  const suggested = items.filter((item) => item.smartLabelSuggestion?.action === 'SUGGEST').length;
  const unknown = items.filter((item) => item.smartLabelSuggestion?.action === 'UNKNOWN' || (item.smartLabelSuggestion?.suggestedLabel === 'UNKNOWN')).length;
  const confirmed = items.filter((item) => {
    const suggestedLabel = item.smartLabelSuggestion?.suggestedLabel || item.smartLabelSuggestion?.documentType;
    return suggestedLabel && suggestedLabel === item.label;
  }).length;
  const overridden = labelHistory.filter((entry) => entry.fromLabel !== entry.toLabel).length;
  const byTemplate = items.reduce((acc, item) => {
    const templateName = item.smartLabelSuggestion?.matchedTemplate || item.classificationResult?.templateName || 'Unknown';
    acc[templateName] = acc[templateName] || { total: 0, confirmed: 0, overridden: 0 };
    acc[templateName].total += 1;
    if ((item.smartLabelSuggestion?.suggestedLabel || item.smartLabelSuggestion?.documentType) === item.label) acc[templateName].confirmed += 1;
    return acc;
  }, {});
  return {
    totalSuggestions,
    autoSelected,
    suggested,
    unknown,
    confirmed,
    overridden,
    accuracyPercent: totalSuggestions ? Number(((confirmed / totalSuggestions) * 100).toFixed(2)) : 0,
    byTemplate
  };
}

function AIDatasetManager({ records, labels, labelHistory, onLabelsChange, onLabelCorrection }) {
  const [queryText, setQueryText] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');
  const [sortMode, setSortMode] = useState('newest');
  const [selectedImageId, setSelectedImageId] = useState('');
  const items = useMemo(() => buildDatasetItems(records, labels), [records, labels]);
  const statistics = useMemo(() => calculateDatasetStatistics(items), [items]);
  const templateStatistics = useMemo(() => calculateTemplateStatistics(items, labelHistory || []), [items, labelHistory]);
  const byCategory = useMemo(() => datasetCategories.map((category) => {
    const categoryItems = items.filter((item) => (item.label || 'UNKNOWN') === category.key);
    return {
      ...category,
      total: categoryItems.length,
      labeled: categoryItems.filter((item) => item.label && item.label !== 'UNKNOWN').length,
      unlabeled: categoryItems.filter((item) => !item.label || item.label === 'UNKNOWN').length,
      duplicate: categoryItems.filter((item) => item.duplicate).length,
      lowQuality: categoryItems.filter((item) => item.lowQuality).length
    };
  }), [items]);
  const filteredItems = useMemo(() => {
    const query = queryText.trim().toLowerCase();
    return [...items].filter((item) => {
      if (filterType !== 'ALL' && (item.label || 'UNKNOWN') !== filterType) return false;
      if (filterState === 'LABELED' && (!item.label || item.label === 'UNKNOWN')) return false;
      if (filterState === 'UNLABELED' && item.label && item.label !== 'UNKNOWN') return false;
      if (filterState === 'DUPLICATE' && !item.duplicate) return false;
      if (filterState === 'LOW_QUALITY' && !item.lowQuality) return false;
      const haystack = [item.filename, item.branch, item.recordId, item.documentId, item.label].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    }).sort((left, right) => {
      if (sortMode === 'filename') return left.filename.localeCompare(right.filename);
      if (sortMode === 'label') return String(left.label).localeCompare(String(right.label));
      if (sortMode === 'oldest') return String(left.uploadedAt).localeCompare(String(right.uploadedAt));
      return String(right.uploadedAt).localeCompare(String(left.uploadedAt));
    });
  }, [filterState, filterType, items, queryText, sortMode]);
  const updateLabel = (imageId, label) => {
    const item = items.find((datasetItem) => datasetItem.imageId === imageId);
    if (item && item.label !== label) {
      onLabelCorrection?.({
        imageId,
        recordId: item.recordId,
        documentId: item.documentId,
        filename: item.filename,
        fromLabel: item.label || '',
        toLabel: label,
        suggestedLabel: item.smartLabelSuggestion?.suggestedLabel || item.smartLabelSuggestion?.documentType || '',
        confidence: item.smartLabelSuggestion?.confidence || 0,
        source: 'DATASET_MANAGER'
      });
    }
    onLabelsChange({
      ...labels,
      [imageId]: {
        label,
        updatedAt: new Date().toISOString()
      }
    });
  };
  const removeLabel = (imageId) => updateLabel(imageId, '');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedImageId) return;
      const category = datasetCategories.find((item) => item.shortcuts === event.key);
      if (!category) return;
      event.preventDefault();
      updateLabel(selectedImageId, category.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [labels, selectedImageId]);

  const exportLabels = () => {
    const rows = ['imageId,recordId,documentId,filename,label'];
    for (const item of items) {
      rows.push([item.imageId, item.recordId, item.documentId, item.filename, item.label || ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    }
    downloadTextFile('labels.csv', rows.join('\n'), 'text/csv');
  };
  const exportStatistics = () => {
    downloadTextFile('datasetStatistics.json', JSON.stringify(statistics, null, 2), 'application/json');
  };
  const exportTemplateStatistics = () => {
    downloadTextFile('templateStatistics.json', JSON.stringify(templateStatistics, null, 2), 'application/json');
  };
  const exportLabelHistory = () => {
    downloadTextFile('labelHistory.json', JSON.stringify(labelHistory || [], null, 2), 'application/json');
  };
  const importLabels = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextLabels = { ...labels };
      const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
      const headers = lines.shift()?.split(',').map((item) => item.replaceAll('"', '').trim()) || [];
      const imageIdIndex = headers.indexOf('imageId');
      const labelIndex = headers.indexOf('label');
      for (const line of lines) {
        const columns = line.match(/("([^"]|"")*"|[^,]+)/g)?.map((item) => item.replace(/^"|"$/g, '').replaceAll('""', '"')) || [];
        const imageId = columns[imageIdIndex];
        const label = columns[labelIndex];
        if (imageId) nextLabels[imageId] = { label: label || '', updatedAt: new Date().toISOString() };
      }
      onLabelsChange(nextLabels);
    };
    reader.readAsText(file);
  };

  return (
    <section className="panel dataset-manager">
      <div className="section-head">
        <div>
          <h2>AI Dataset</h2>
          <p>Total images: {statistics.totalImages} | Labeled: {statistics.labeledImages} | Unlabeled: {statistics.unlabeledImages}</p>
        </div>
        <div className="document-head-actions">
          <button className="ghost" type="button" onClick={exportStatistics}>Export datasetStatistics.json</button>
          <button className="ghost" type="button" onClick={exportTemplateStatistics}>Export templateStatistics.json</button>
          <button className="ghost" type="button" onClick={exportLabelHistory}>Export labelHistory.json</button>
          <button className="ghost" type="button" onClick={exportLabels}>Export labels.csv</button>
          <label className="ghost bulk-upload-button">Import labels.csv<input type="file" accept=".csv,text/csv" onChange={(event) => importLabels(event.target.files?.[0])} /></label>
        </div>
      </div>
      <div className="stats-grid">
        <Metric label="รูปทั้งหมด" value={statistics.totalImages} />
        <Metric label="Label แล้ว" value={statistics.labeledImages} />
        <Metric label="ยังไม่ Label" value={statistics.unlabeledImages} />
        <Metric label="รูปซ้ำ" value={statistics.duplicateImages} danger={statistics.duplicateImages > 0} />
        <Metric label="คุณภาพต่ำ" value={statistics.lowQualityImages} danger={statistics.lowQualityImages > 0} />
      </div>
      <section className="label-accuracy-dashboard">
        <h3>Label Accuracy Dashboard</h3>
        <div className="stats-grid">
          <Metric label="Suggestions" value={templateStatistics.totalSuggestions} />
          <Metric label="Auto Select" value={templateStatistics.autoSelected} />
          <Metric label="Suggest" value={templateStatistics.suggested} />
          <Metric label="Unknown" value={templateStatistics.unknown} danger={templateStatistics.unknown > 0} />
          <Metric label="Accuracy" value={`${templateStatistics.accuracyPercent}%`} danger={templateStatistics.accuracyPercent < 80 && templateStatistics.totalSuggestions > 0} />
        </div>
        <div className="dataset-category-grid">
          {Object.entries(templateStatistics.byTemplate).map(([templateName, stats]) => (
            <div key={templateName} className="dataset-category">
              <strong>{templateName}</strong>
              <span>Total: {stats.total}</span>
              <span>Confirmed: {stats.confirmed}</span>
              <span>Accuracy: {stats.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </section>
      <div className="dataset-category-grid">
        {byCategory.map((category) => (
          <div key={category.key} className="dataset-category">
            <strong>{category.label}</strong>
            <span>รูป: {category.total}</span>
            <span>Label: {category.labeled}</span>
            <span>ยังไม่ Label: {category.unlabeled}</span>
            <span>ซ้ำ: {category.duplicate}</span>
            <span>คุณภาพต่ำ: {category.lowQuality}</span>
            {category.shortcuts && <small>Shortcut: {category.shortcuts}</small>}
          </div>
        ))}
      </div>
      <div className="document-manager-toolbar">
        <label className="search"><Search size={16} /><input placeholder="ค้นหา filename, branch, record" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
        <select value={filterType} onChange={(event) => setFilterType(event.target.value)}><option value="ALL">ทุกประเภท</option>{datasetCategories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select>
        <select value={filterState} onChange={(event) => setFilterState(event.target.value)}><option value="ALL">ทั้งหมด</option><option value="LABELED">Label แล้ว</option><option value="UNLABELED">ยังไม่ Label</option><option value="DUPLICATE">รูปซ้ำ</option><option value="LOW_QUALITY">คุณภาพต่ำ</option></select>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="newest">ล่าสุดก่อน</option><option value="oldest">เก่าสุดก่อน</option><option value="filename">ชื่อไฟล์</option><option value="label">Label</option></select>
      </div>
      <div className="dataset-gallery">
        {filteredItems.map((item) => (
          <article key={item.imageId} className={selectedImageId === item.imageId ? 'dataset-card selected' : 'dataset-card'} onClick={() => setSelectedImageId(item.imageId)}>
            <div className="dataset-thumb">{String(item.imageUrl).startsWith('data:') ? <img src={item.imageUrl} alt={item.filename} loading="lazy" /> : <span>{item.filename || 'Image'}</span>}</div>
            <strong>{item.filename || item.documentId}</strong>
            <small>{item.branch} | {item.recordId}</small>
            <select value={item.label || 'UNKNOWN'} onChange={(event) => updateLabel(item.imageId, event.target.value)}>
              {datasetCategories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
            </select>
            <div className="dataset-card-actions">
              <button className="ghost" type="button" onClick={(event) => { event.stopPropagation(); removeLabel(item.imageId); }}>ลบ Label</button>
            </div>
            <div className="flag-cell">
              {item.smartLabelSuggestion && <span>{item.smartLabelSuggestion.confidence || 0}%</span>}
              {item.duplicate && <span>Duplicate</span>}
              {item.lowQuality && <span>Low Quality</span>}
              {!item.label || item.label === 'UNKNOWN' ? <span>Unlabeled</span> : <span>Labeled</span>}
            </div>
          </article>
        ))}
        {!filteredItems.length && <div className="empty">ไม่พบรูปตามเงื่อนไข</div>}
      </div>
    </section>
  );
}

function AISettings({ configuration, onSave }) {
  const [draft, setDraft] = useState(() => normalizeAIConfiguration(configuration));
  const [healthResult, setHealthResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const setProvider = (key, value) => setDraft((current) => normalizeAIConfiguration({ ...current, [key]: value }));
  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const manager = new ProviderManager(draft);
      setHealthResult(await manager.healthCheck());
    } finally {
      setChecking(false);
    }
  };
  const providerOptions = [AI_PROVIDERS.MOCK, AI_PROVIDERS.OLLAMA, AI_PROVIDERS.PADDLEOCR, AI_PROVIDERS.OPENCV, AI_PROVIDERS.LOCAL];

  return (
    <section className="panel ai-settings">
      <div className="section-head">
        <div>
          <h2>AI Settings</h2>
          <p>Local provider framework only. No OpenAI, Gemini, Claude, or paid API binding.</p>
        </div>
        <button className="primary" type="button" onClick={() => onSave(normalizeAIConfiguration(draft))}>Save Configuration</button>
      </div>
      <div className="ai-provider-grid">
        <label>Vision Provider
          <select value={draft.visionProvider} onChange={(event) => setProvider('visionProvider', event.target.value)}>
            {[AI_PROVIDERS.MOCK, AI_PROVIDERS.OLLAMA].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label>OCR Provider
          <select value={draft.ocrProvider} onChange={(event) => setProvider('ocrProvider', event.target.value)}>
            {[AI_PROVIDERS.MOCK, AI_PROVIDERS.PADDLEOCR].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label>Preprocessing Provider
          <select value={draft.preprocessingProvider} onChange={(event) => setProvider('preprocessingProvider', event.target.value)}>
            {[AI_PROVIDERS.MOCK, AI_PROVIDERS.OPENCV].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label>Duplicate Provider
          <select value={draft.duplicateProvider} onChange={(event) => setProvider('duplicateProvider', event.target.value)}>
            {[AI_PROVIDERS.LOCAL, AI_PROVIDERS.OPENCV, AI_PROVIDERS.MOCK].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
      </div>
      <div className="ai-provider-grid">
        <label>Ollama Model Name<input value={draft.ollama.modelName} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, ollama: { ...current.ollama, modelName: event.target.value } }))} /></label>
        <label>Ollama Base URL<input value={draft.ollama.baseUrl} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, ollama: { ...current.ollama, baseUrl: event.target.value } }))} /></label>
        <label>PaddleOCR Endpoint<input value={draft.paddleOCR.paddleOcrEndpoint} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, paddleOCR: { ...current.paddleOCR, paddleOcrEndpoint: event.target.value } }))} /></label>
        <label>PaddleOCR Language<input value={draft.paddleOCR.language} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, paddleOCR: { ...current.paddleOCR, language: event.target.value } }))} /></label>
        <label className="checkline"><input type="checkbox" checked={draft.paddleOCR.enableAngleClassification} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, paddleOCR: { ...current.paddleOCR, enableAngleClassification: event.target.checked } }))} /> PaddleOCR Angle Classification</label>
        <label>PaddleOCR Version<input value={draft.paddleOCR.version} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, paddleOCR: { ...current.paddleOCR, version: event.target.value } }))} /></label>
        <label>OpenCV Endpoint<input value={draft.openCV.openCvEndpoint} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, openCvEndpoint: event.target.value } }))} /></label>
        <label>OpenCV Version<input value={draft.openCV.version} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, version: event.target.value } }))} /></label>
        <label className="checkline"><input type="checkbox" checked={draft.openCV.enableAutoRotate} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, enableAutoRotate: event.target.checked } }))} /> OpenCV Auto Rotate</label>
        <label className="checkline"><input type="checkbox" checked={draft.openCV.enableDeskew} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, enableDeskew: event.target.checked } }))} /> OpenCV Deskew</label>
        <label className="checkline"><input type="checkbox" checked={draft.openCV.enableContrast} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, enableContrast: event.target.checked } }))} /> OpenCV Contrast</label>
        <label className="checkline"><input type="checkbox" checked={draft.openCV.enableBrightness} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, enableBrightness: event.target.checked } }))} /> OpenCV Brightness</label>
        <label className="checkline"><input type="checkbox" checked={draft.openCV.enableNoiseReduction} onChange={(event) => setDraft((current) => normalizeAIConfiguration({ ...current, openCV: { ...current.openCV, enableNoiseReduction: event.target.checked } }))} /> OpenCV Noise Reduction</label>
      </div>
      <div className="ai-config-preview">
        <h3>Active Configuration</h3>
        <pre>{JSON.stringify(normalizeAIConfiguration(draft), null, 2)}</pre>
      </div>
      <div className="section-head">
        <h3>Health Check</h3>
        <button className="ghost" type="button" disabled={checking} onClick={runHealthCheck}>{checking ? 'Checking...' : 'Run Health Check'}</button>
      </div>
      {healthResult && (
        <div className="health-grid">
          {Object.entries(healthResult.providers || {}).map(([key, result]) => (
            <div key={key} className="health-card">
              <strong>{key}: {result.provider}</strong>
              <span>Status: {result.status}</span>
              <span>Version: {result.version || '-'}</span>
              <span>Model: {result.modelName || '-'}</span>
              <span>Response: {result.responseTimeMs} ms</span>
              <small>{result.message}</small>
            </div>
          ))}
        </div>
      )}
      <div className="notice">Provider options available: {providerOptions.join(', ')}. Current implementation is mock-only and ready for local adapters.</div>
    </section>
  );
}

function AITestPage({ configuration, onConfigurationChange }) {
  const [model, setModel] = useState(configuration.ollama?.visionModel || configuration.ollama?.modelName || 'qwen2.5vl');
  const [documentType, setDocumentType] = useState('UNKNOWN');
  const [image, setImage] = useState('');
  const [filename, setFilename] = useState('');
  const [healthResult, setHealthResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const service = useMemo(() => new OllamaVisionService({
    configuration: normalizeAIConfiguration({
      ...configuration,
      ollama: {
        ...(configuration.ollama || {}),
        visionModel: model,
        modelName: model
      }
    })
  }), [configuration, model]);

  const saveModel = () => {
    onConfigurationChange(normalizeAIConfiguration({
      ...configuration,
      ollama: {
        ...(configuration.ollama || {}),
        visionModel: model,
        modelName: model
      }
    }));
  };

  const readImage = (file) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      setHealthResult(await service.healthCheck());
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    setLoading(true);
    try {
      setAnalysisResult(await service.analyzeDocument({ image, documentType, model }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel ai-test-page">
      <div className="section-head">
        <div>
          <h2>AI Test: Ollama Vision</h2>
          <p>Local HTTP only. No paid AI API is used.</p>
        </div>
        <button className="ghost" type="button" disabled={loading} onClick={runHealthCheck}>Health Check</button>
      </div>
      <div className="ai-provider-grid">
        <label>Base URL<input value={configuration.ollama?.baseUrl || 'http://localhost:11434'} readOnly /></label>
        <label>Vision Model<input value={model} onChange={(event) => setModel(event.target.value)} onBlur={saveModel} /></label>
        <label>Document Type
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            {['POS_SUMMARY', 'PAYIN', 'PAYIN_BANK_COUNTER', 'PAYIN_ATM', 'BANK_TRANSFER_SLIP', 'MAEMANEE_QR_ALERT', 'CRM_COUPON_RECEIPT', 'DEBTOR_TRANSFER_RECEIPT', 'UNKNOWN'].map((type) => <option key={type} value={type}>{documentTypeLabels[type] || type}</option>)}
          </select>
        </label>
        <label>Timeout<input value={`${configuration.ollama?.timeout || 120000} ms`} readOnly /></label>
      </div>
      <div className="ai-test-grid">
        <label className="file-box">
          <FileImage size={24} />
          <span>Upload Image</span>
          <small>{filename || 'jpg, jpeg, png'}</small>
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
        <div className="ai-test-preview">
          {image ? <img src={image} alt={filename || 'AI test preview'} /> : <span>No image selected</span>}
        </div>
      </div>
      <div className="action-row">
        <button className="primary" type="button" disabled={loading || !image} onClick={analyze}>Analyze</button>
      </div>
      {healthResult && (
        <div className="health-grid">
          <div className="health-card">
            <strong>Ollama</strong>
            <span>Status: {healthResult.status}</span>
            <span>Version: {healthResult.version}</span>
            <span>Model: {healthResult.model}</span>
            <span>Response Time: {healthResult.responseTime} ms</span>
            {healthResult.error && <small>{healthResult.error}</small>}
          </div>
        </div>
      )}
      {analysisResult && (
        <div className="ai-result-grid">
          <DetailBlock title="Raw Response" data={analysisResult.rawResponse} />
          <DetailBlock title="Parsed JSON" data={analysisResult.parsedResult} />
          <DetailBlock title="Analysis Result" data={analysisResult} />
        </div>
      )}
    </section>
  );
}

function OCRTestPage({ configuration, onConfigurationChange }) {
  const [endpoint, setEndpoint] = useState(configuration.paddleOCR?.paddleOcrEndpoint || 'http://localhost:8000/ocr');
  const [language, setLanguage] = useState(configuration.paddleOCR?.language || 'thai+eng');
  const [image, setImage] = useState('');
  const [filename, setFilename] = useState('');
  const [healthResult, setHealthResult] = useState(null);
  const [ocrResult, setOCRResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const activeConfiguration = useMemo(() => normalizeAIConfiguration({
    ...configuration,
    ocrProvider: 'PADDLEOCR',
    paddleOCR: {
      ...(configuration.paddleOCR || {}),
      paddleOcrEndpoint: endpoint,
      language,
      timeout: configuration.paddleOCR?.timeout || 120000,
      enableAngleClassification: configuration.paddleOCR?.enableAngleClassification ?? true
    }
  }), [configuration, endpoint, language]);
  const service = useMemo(() => new PaddleOCRService({ configuration: activeConfiguration }), [activeConfiguration]);

  const saveOCRConfig = () => onConfigurationChange(activeConfiguration);
  const readImage = (file) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const runHealthCheck = async () => {
    setLoading(true);
    try {
      setHealthResult(await service.healthCheck());
    } finally {
      setLoading(false);
    }
  };
  const runOCR = async () => {
    setLoading(true);
    try {
      setOCRResult(await service.extractText(image));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel ai-test-page">
      <div className="section-head">
        <div>
          <h2>OCR Test: PaddleOCR</h2>
          <p>Local HTTP OCR only. Mock fallback is used when PaddleOCR is unavailable.</p>
        </div>
        <button className="ghost" type="button" disabled={loading} onClick={runHealthCheck}>Health Check</button>
      </div>
      <div className="ai-provider-grid">
        <label>Endpoint<input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} onBlur={saveOCRConfig} /></label>
        <label>Language<input value={language} onChange={(event) => setLanguage(event.target.value)} onBlur={saveOCRConfig} /></label>
        <label>Timeout<input value={`${activeConfiguration.paddleOCR.timeout} ms`} readOnly /></label>
        <label>Angle Classification<input value={String(activeConfiguration.paddleOCR.enableAngleClassification)} readOnly /></label>
      </div>
      <div className="ai-test-grid">
        <label className="file-box">
          <FileImage size={24} />
          <span>Upload Image</span>
          <small>{filename || 'jpg, jpeg, png'}</small>
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
        <div className="ai-test-preview">
          {image ? <img src={image} alt={filename || 'OCR test preview'} /> : <span>No image selected</span>}
        </div>
      </div>
      <div className="action-row">
        <button className="primary" type="button" disabled={loading || !image} onClick={runOCR}>Run OCR</button>
      </div>
      {healthResult && (
        <div className="health-grid">
          <div className="health-card">
            <strong>PaddleOCR</strong>
            <span>Status: {healthResult.status}</span>
            <span>Endpoint: {healthResult.endpoint}</span>
            <span>Version: {healthResult.version}</span>
            <span>Language: {healthResult.language}</span>
            <span>Response Time: {healthResult.responseTime} ms</span>
            {healthResult.error && <small>{healthResult.error}</small>}
          </div>
        </div>
      )}
      {ocrResult && (
        <div className="ai-result-grid">
          <DetailBlock title="rawText" data={{ rawText: ocrResult.rawText }} />
          <DetailBlock title="textBlocks" data={ocrResult.textBlocks} />
          <DetailBlock title="OCR Summary" data={{ confidence: ocrResult.confidence, processingTime: ocrResult.processingTime, warnings: ocrResult.warnings }} />
        </div>
      )}
    </section>
  );
}

function OpenCVTestPage({ configuration, onConfigurationChange }) {
  const [endpoint, setEndpoint] = useState(configuration.openCV?.openCvEndpoint || 'http://localhost:8001');
  const [image, setImage] = useState('');
  const [filename, setFilename] = useState('');
  const [healthResult, setHealthResult] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [preprocessResult, setPreprocessResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const activeConfiguration = useMemo(() => normalizeAIConfiguration({
    ...configuration,
    preprocessingProvider: 'OPENCV',
    openCV: {
      ...(configuration.openCV || {}),
      openCvEndpoint: endpoint,
      timeout: configuration.openCV?.timeout || 120000
    }
  }), [configuration, endpoint]);
  const service = useMemo(() => new OpenCVService({ configuration: activeConfiguration }), [activeConfiguration]);
  const saveOpenCVConfig = () => onConfigurationChange(activeConfiguration);
  const readImage = (file) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const runHealthCheck = async () => {
    setLoading(true);
    try {
      setHealthResult(await service.healthCheck());
    } finally {
      setLoading(false);
    }
  };
  const analyzeQuality = async () => {
    setLoading(true);
    try {
      setQualityResult(await service.analyzeQuality(image));
    } finally {
      setLoading(false);
    }
  };
  const runPreprocessing = async () => {
    setLoading(true);
    try {
      setPreprocessResult(await service.preprocessImage(image));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel ai-test-page">
      <div className="section-head">
        <div>
          <h2>OpenCV Test</h2>
          <p>Local image processing only. Mock fallback is used when OpenCV server is unavailable.</p>
        </div>
        <button className="ghost" type="button" disabled={loading} onClick={runHealthCheck}>Health Check</button>
      </div>
      <div className="ai-provider-grid">
        <label>Endpoint<input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} onBlur={saveOpenCVConfig} /></label>
        <label>Timeout<input value={`${activeConfiguration.openCV.timeout} ms`} readOnly /></label>
        <label>Auto Rotate<input value={String(activeConfiguration.openCV.enableAutoRotate)} readOnly /></label>
        <label>Deskew<input value={String(activeConfiguration.openCV.enableDeskew)} readOnly /></label>
      </div>
      <div className="ai-test-grid">
        <label className="file-box">
          <FileImage size={24} />
          <span>Upload Image</span>
          <small>{filename || 'jpg, jpeg, png'}</small>
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
        <div className="ai-test-preview">
          {image ? <img src={image} alt={filename || 'OpenCV test preview'} /> : <span>No image selected</span>}
        </div>
      </div>
      <div className="action-row">
        <button className="ghost" type="button" disabled={loading || !image} onClick={analyzeQuality}>Analyze Quality</button>
        <button className="primary" type="button" disabled={loading || !image} onClick={runPreprocessing}>Run Preprocessing</button>
      </div>
      {healthResult && (
        <div className="health-grid">
          <div className="health-card">
            <strong>OpenCV</strong>
            <span>Status: {healthResult.status}</span>
            <span>Endpoint: {healthResult.endpoint}</span>
            <span>Version: {healthResult.version}</span>
            <span>Response Time: {healthResult.responseTime} ms</span>
            {healthResult.error && <small>{healthResult.error}</small>}
          </div>
        </div>
      )}
      <div className="ai-test-grid">
        <div className="ai-test-preview">{image ? <img src={image} alt="Original" /> : <span>Original image</span>}</div>
        <div className="ai-test-preview">{preprocessResult?.processedImage?.startsWith?.('data:') ? <img src={preprocessResult.processedImage} alt="Processed" /> : <span>{preprocessResult?.processedImage ? 'Processed image reference ready' : 'Processed image'}</span>}</div>
      </div>
      {(qualityResult || preprocessResult) && (
        <div className="ai-result-grid">
          <DetailBlock title="Quality JSON" data={qualityResult} />
          <DetailBlock title="Preprocessing JSON" data={preprocessResult} />
          <DetailBlock title="OpenCV Configuration" data={activeConfiguration.openCV} />
        </div>
      )}
    </section>
  );
}

function ShiftReportAITestPage({ configuration }) {
  const [image, setImage] = useState('');
  const [filename, setFilename] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [correctionHistory, setCorrectionHistory] = useState(() => readStore('shiftReportCorrectionHistory', []));
  const [learningDataset, setLearningDataset] = useState(() => readStore('shiftReportLearningDataset', []));
  const parserConfiguration = useMemo(() => normalizeAIConfiguration({
    ...configuration,
    preprocessingProvider: 'OPENCV',
    ocrProvider: 'PADDLEOCR',
    visionProvider: 'OLLAMA'
  }), [configuration]);
  const parser = useMemo(() => new ShiftReportParser({ configuration: parserConfiguration }), [parserConfiguration]);

  useEffect(() => {
    writeStore('shiftReportCorrectionHistory', correctionHistory);
  }, [correctionHistory]);

  useEffect(() => {
    writeStore('shiftReportLearningDataset', learningDataset);
  }, [learningDataset]);

  const readImage = (file) => {
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const analyzeShiftReport = async () => {
    if (!image) return;
    setLoading(true);
    try {
      setResult(await parser.parse(image));
    } finally {
      setLoading(false);
    }
  };

  const saveCorrection = (row, correctedValue) => {
    if (!row || correctedValue === undefined || correctedValue === '') return;
    const changedAt = new Date().toISOString();
    const correction = {
      id: `corr_${Date.now()}_${row.field}`,
      documentType: 'POS_SUMMARY',
      filename,
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      confidence: row.confidence,
      changedAt
    };
    setCorrectionHistory((items) => [correction, ...items]);
    setLearningDataset((items) => [{
      id: `learn_${Date.now()}_${row.field}`,
      documentType: 'POS_SUMMARY',
      filename,
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      source: 'SHIFT_REPORT_AI_TEST',
      createdAt: changedAt
    }, ...items]);
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        parsedData: {
          ...current.parsedData,
          [row.field]: correctedValue
        },
        fieldMapping: (current.fieldMapping || []).map((item) => (
          item.field === row.field ? { ...item, humanCorrection: correctedValue } : item
        ))
      };
    });
  };

  return (
    <section className="panel ai-test-page shift-report-test">
      <div className="section-head">
        <div>
          <h2>Shift Report AI Test</h2>
          <p>Local workflow: OpenCV {'->'} PaddleOCR {'->'} Ollama {'->'} POS Summary Parser {'->'} Validation.</p>
        </div>
        <button className="primary" type="button" disabled={loading || !image} onClick={analyzeShiftReport}>
          {loading ? 'Processing...' : 'Analyze'}
        </button>
      </div>
      <div className="ai-test-grid">
        <label className="file-box">
          <FileImage size={24} />
          <span>Upload POS Summary</span>
          <small>{filename || 'jpg, jpeg, png'}</small>
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
        <div className="ai-test-preview">
          {image ? <img src={image} alt={filename || 'Shift report preview'} /> : <span>No image selected</span>}
        </div>
      </div>
      {result && (
        <>
          <div className="summary-grid">
            <Metric label="Confidence" value={`${result.confidence}%`} danger={result.confidence < 70} />
            <Metric label="Provider" value={result.provider} />
            <Metric label="Model" value={result.model} />
            <Metric label="Validation" value={result.validationResult?.status || '-'} danger={result.validationResult?.status === 'FAIL'} />
            <Metric label="Processing" value={`${result.processingTime} ms`} />
          </div>
          {!!result.warnings?.length && <div className="notice">Warnings: {result.warnings.join(', ')}</div>}
          <div className="ai-result-grid">
            <DetailBlock title="OpenCV" data={result.openCV} />
            <DetailBlock title="OCR Text" data={{ rawText: result.ocr?.rawText, textBlocks: result.ocr?.textBlocks, confidence: result.ocr?.confidence }} />
            <DetailBlock title="Parsed JSON" data={result.parsedData} />
            <DetailBlock title="Validation" data={result.validationResult} />
          </div>
          <FieldMappingViewer mapping={result.fieldMapping || []} onCorrection={saveCorrection} />
          <div className="ai-result-grid">
            <DetailBlock title="Correction History" data={correctionHistory.slice(0, 20)} />
            <DetailBlock title="AI Learning Dataset" data={learningDataset.slice(0, 20)} />
          </div>
        </>
      )}
    </section>
  );
}

function BankTransferSlipAITestPage({ configuration, records }) {
  const [image, setImage] = useState('');
  const [filename, setFilename] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankTransferAmount, setBankTransferAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [correctionHistory, setCorrectionHistory] = useState(() => readStore('bankTransferSlipCorrectionHistory', []));
  const [learningDataset, setLearningDataset] = useState(() => readStore('bankTransferSlipLearningDataset', []));
  const parserConfiguration = useMemo(() => normalizeAIConfiguration({
    ...configuration,
    preprocessingProvider: 'OPENCV',
    ocrProvider: 'PADDLEOCR',
    visionProvider: 'OLLAMA'
  }), [configuration]);
  const parser = useMemo(() => new BankTransferSlipParser({ configuration: parserConfiguration }), [parserConfiguration]);
  const existingReferences = useMemo(() => (records || [])
    .flatMap((record) => record.documents || [])
    .map((document) => document.parsedData?.referenceNo || document.parsedData?.transactionId || '')
    .filter(Boolean), [records]);

  useEffect(() => {
    writeStore('bankTransferSlipCorrectionHistory', correctionHistory);
  }, [correctionHistory]);

  useEffect(() => {
    writeStore('bankTransferSlipLearningDataset', learningDataset);
  }, [learningDataset]);

  const readImage = (file) => {
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const analyzeSlip = async () => {
    if (!image) return;
    setLoading(true);
    try {
      setResult(await parser.parse(image, {
        filename,
        businessDate,
        bankTransferAmount,
        existingReferences
      }));
    } finally {
      setLoading(false);
    }
  };

  const saveCorrection = (row, correctedValue) => {
    if (!row || correctedValue === undefined || correctedValue === '') return;
    const changedAt = new Date().toISOString();
    const correction = {
      id: `bank_corr_${Date.now()}_${row.field}`,
      documentType: 'BANK_TRANSFER_SLIP',
      filename,
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      confidence: row.confidence,
      changedAt
    };
    setCorrectionHistory((items) => [correction, ...items]);
    setLearningDataset((items) => [{
      id: `bank_learn_${Date.now()}_${row.field}`,
      documentType: 'BANK_TRANSFER_SLIP',
      filename,
      field: row.field,
      ocrText: row.ocrText,
      aiResult: row.aiResult,
      humanCorrection: correctedValue,
      source: 'BANK_TRANSFER_SLIP_AI_TEST',
      createdAt: changedAt
    }, ...items]);
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        parsedData: {
          ...current.parsedData,
          [row.field]: correctedValue
        },
        fieldMapping: (current.fieldMapping || []).map((item) => (
          item.field === row.field ? { ...item, humanCorrection: correctedValue } : item
        ))
      };
    });
  };

  return (
    <section className="panel ai-test-page shift-report-test">
      <div className="section-head">
        <div>
          <h2>Bank Transfer Slip AI Test</h2>
          <p>Local workflow: OpenCV {'->'} PaddleOCR {'->'} Ollama {'->'} Bank Transfer Slip Parser {'->'} Validation.</p>
        </div>
        <button className="primary" type="button" disabled={loading || !image} onClick={analyzeSlip}>
          {loading ? 'Processing...' : 'Analyze'}
        </button>
      </div>
      <div className="ai-provider-grid">
        <label>Business Date<input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} /></label>
        <label>POS Bank Transfer Amount<input value={bankTransferAmount} onChange={(event) => setBankTransferAmount(event.target.value)} placeholder="0.00" /></label>
        <label>Existing References<input value={existingReferences.length} readOnly /></label>
      </div>
      <div className="ai-test-grid">
        <label className="file-box">
          <FileImage size={24} />
          <span>Upload Bank Transfer Slip</span>
          <small>{filename || 'jpg, jpeg, png'}</small>
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
        <div className="ai-test-preview">
          {image ? <img src={image} alt={filename || 'Bank transfer slip preview'} /> : <span>No image selected</span>}
        </div>
      </div>
      {result && (
        <>
          <div className="summary-grid">
            <Metric label="Detected Bank" value={result.detectedBank} />
            <Metric label="Template" value={result.detectedTemplate} />
            <Metric label="Confidence" value={`${result.confidence}%`} danger={result.confidence < 70} />
            <Metric label="Validation" value={result.validationResult?.status || '-'} danger={result.validationResult?.status === 'FAIL'} />
            <Metric label="Provider" value={result.provider} />
          </div>
          {!!result.warnings?.length && <div className="notice">Warnings: {result.warnings.join(', ')}</div>}
          {!!result.riskFlags?.length && <div className="flag-row">{result.riskFlags.map((flag) => <span key={flag}>{flag}</span>)}</div>}
          <div className="ai-result-grid">
            <DetailBlock title="OCR rawText" data={{ rawText: result.rawText, textBlocks: result.textBlocks }} />
            <DetailBlock title="Parsed JSON" data={result.parsedData} />
            <DetailBlock title="Validation Result" data={result.validationResult} />
            <DetailBlock title="Field Confidence" data={result.fieldConfidence} />
          </div>
          <FieldMappingViewer mapping={result.fieldMapping || []} onCorrection={saveCorrection} />
          <div className="ai-result-grid">
            <DetailBlock title="Correction History" data={correctionHistory.slice(0, 20)} />
            <DetailBlock title="AI Learning Dataset" data={learningDataset.slice(0, 20)} />
          </div>
        </>
      )}
    </section>
  );
}

function FieldMappingViewer({ mapping, onCorrection }) {
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts({});
  }, [mapping]);

  const confidenceClass = (confidence) => {
    if (confidence < 70) return 'confidence-danger';
    if (confidence < 90) return 'confidence-warn';
    return 'confidence-pass';
  };
  const rowKey = (row) => `${row.documentId || row.documentType || 'doc'}-${row.field}`;

  return (
    <section className="field-mapping-viewer">
      <div className="section-head">
        <div>
          <h3>Field Mapping Viewer</h3>
          <p>OCR Text {'->'} Field {'->'} AI Result {'->'} Human Correction</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OCR Text</th>
              <th>Field</th>
              <th>AI Result</th>
              <th>Confidence</th>
              <th>Human Correction</th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((row) => (
              <tr key={rowKey(row)} className={confidenceClass(Number(row.confidence || 0))}>
                <td className="ocr-cell">{String(row.ocrText || '').slice(0, 140) || '-'}</td>
                <td>{row.documentType ? `${row.documentType}.${row.field}` : row.field}</td>
                <td>{String(row.aiResult ?? '')}</td>
                <td><span className={`confidence-pill ${confidenceClass(Number(row.confidence || 0))}`}>{row.confidence}%</span></td>
                <td>
                  <input
                    value={drafts[rowKey(row)] ?? row.humanCorrection ?? ''}
                    placeholder="Correct value"
                    onChange={(event) => setDrafts((items) => ({ ...items, [rowKey(row)]: event.target.value }))}
                    onBlur={() => onCorrection(row, drafts[rowKey(row)])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecordTable({ records, compact = false }) {
  if (!records.length) return <div className="empty">No records yet</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            {!compact && <th>Branch</th>}
            <th>Date</th>
            <th>Shift</th>
            <th>Documents</th>
            <th>Validation</th>
            <th>Note</th>
            <th>Risk</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.id}</td>
              {!compact && <td>{record.branch}</td>}
              <td>{record.date}</td>
              <td>{record.shift}</td>
              <td>{record.documents?.length || 0}</td>
              <td>{record.validationResult?.valid === false ? 'FAILED' : record.validationResult?.valid ? 'PASSED' : '-'}</td>
              <td>{record.note || '-'}</td>
              <td>{record.riskScore || 0}</td>
              <td><StatusBadge status={record.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status ${status?.toLowerCase()}`}>{statusLabels[status] || status}</span>;
}

function Metric({ label, value, danger }) {
  return <div className={danger ? 'metric danger-text' : 'metric'}><span>{label}</span><strong>{value}</strong></div>;
}

function Stat({ icon, label, value }) {
  return <div className="stat">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function money(value) {
  return Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
}

function formatFileSize(value) {
  const size = Number(value || 0);
  if (!size) return '-';
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function formatDate(value) {
  if (!value) return '';
  if (value?.toDate) return value.toDate().toLocaleString('th-TH');
  return new Date(value).toLocaleString('th-TH');
}

createRoot(document.getElementById('root')).render(<App />);
