import React, { useState } from 'react';
import { Banknote, ShieldCheck } from 'lucide-react';
import { ROLES } from '../../domain/constants/roles.js';

const roleLabels = {
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.BRANCH]: 'BRANCH',
  [ROLES.ACCOUNTING]: 'ACCOUNTING',
  [ROLES.AUDIT]: 'AUDIT',
  [ROLES.REGIONAL_MANAGER]: 'REGIONAL_MANAGER',
  [ROLES.EXECUTIVE]: 'EXECUTIVE'
};

export function LoginPage({ loading, notice, roles, onLogin }) {
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
            <span>Mock Authentication</span>
          </div>
        </div>
        <h1>เข้าสู่ระบบ</h1>
        <p>ระบบ Login แบบ Mock สำหรับ Sprint 2 ยังไม่เชื่อม Firebase Auth จริง</p>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
          </select>
        </label>
        <button className="primary" disabled={loading} onClick={() => onLogin({ email, password, role })}>
          <ShieldCheck size={18} /> เข้าสู่ระบบ
        </button>
        {notice && <div className="notice">{notice}</div>}
      </section>
      <section className="login-visual">
        <Banknote size={68} />
        <h2>D-FARM Pay-in AI</h2>
        <p>เลือกบทบาทเพื่อทดสอบสิทธิ์การเห็นเมนูและข้อมูลตาม Role</p>
      </section>
    </div>
  );
}
