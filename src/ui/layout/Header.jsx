import React from 'react';
import { RotateCcw } from 'lucide-react';

export function Header({ title, user, loading, onRefresh }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>ผู้ใช้: {user.name} | สาขา: {user.branch} | Role: {user.role}</p>
      </div>
      <button className="ghost" onClick={onRefresh} disabled={loading}>
        <RotateCcw size={16} /> รีเฟรช
      </button>
    </header>
  );
}

