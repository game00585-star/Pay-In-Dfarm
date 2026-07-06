import React from 'react';
import { BarChart3, Building2, LogOut, Settings, ShieldCheck, Upload } from 'lucide-react';

const icons = {
  Submit: Upload,
  Mobile: Upload,
  CaseManagement: ShieldCheck,
  AIAssistant: BarChart3,
  Evidence: Upload,
  MasterData: Building2,
  DataGovernance: ShieldCheck,
  ExecutiveBI: BarChart3,
  InternalAudit: ShieldCheck,
  Compliance: ShieldCheck,
  Review: ShieldCheck,
  Operations: BarChart3,
  Launch: ShieldCheck,
  Integration: Settings,
  ShiftReconciliation: ShieldCheck,
  ShiftMatching: BarChart3,
  DepositBatch: BarChart3,
  Workflow: ShieldCheck,
  Platform: Settings,
  GoLive: ShieldCheck,
  BranchRisk: BarChart3,
  Audit: BarChart3,
  AIDataset: Upload,
  AISettings: Settings,
  AITest: ShieldCheck,
  OCRTest: Upload,
  OpenCVTest: Upload,
  ShiftReportAITest: Upload,
  BankTransferSlipAITest: Upload,
  Settings
};

export function Sidebar({ menuItems, activeTab, user, modeLabel, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">D</div>
        <div>
          <strong>D-FARM Pay-in AI V1</strong>
          <span>{modeLabel}</span>
        </div>
      </div>
      <nav>
        {menuItems.map((item) => {
          const Icon = icons[item.key];
          return (
            <button key={item.key} className={activeTab === item.key ? 'active' : ''} onClick={() => onNavigate(item.key)}>
              {Icon && <Icon size={18} />}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="profile">
        <span>{user.name}</span>
        <strong>{user.role}</strong>
        <small>{user.branch}</small>
        <button onClick={onLogout}><LogOut size={16} /> เธญเธญเธเธเธฒเธเธฃเธฐเธเธ</button>
      </div>
    </aside>
  );
}

