import React from 'react';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

export function MainLayout({ menuItems, activeTab, title, user, modeLabel, loading, notice, onNavigate, onLogout, onRefresh, children }) {
  return (
    <div className="app-shell">
      <Sidebar
        menuItems={menuItems}
        activeTab={activeTab}
        user={user}
        modeLabel={modeLabel}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main>
        <Header title={title} user={user} loading={loading} onRefresh={onRefresh} />
        {notice && <div className="notice">{notice}</div>}
        {children}
      </main>
    </div>
  );
}

