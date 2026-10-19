import React from 'react';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  email?: string;
  onLogout?: () => void;
}

export default function Header({ email, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-bg/80 backdrop-blur-xl border-b border-line">
      <div className="h-16 max-w-7xl mx-auto px-4 lg:px-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/LOGO.png" alt="Zebra" className="logo h-5 w-auto" />
          <span className="label hidden sm:inline">Transcriptor</span>
        </div>
        {email && onLogout && (
          <div className="flex items-center gap-4 min-w-0">
            <span className="hidden sm:block text-sm text-muted truncate">{email}</span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-line text-sm font-medium text-fg hover:border-line-strong hover:bg-surface transition-colors"
            >
              <LogOut strokeWidth={1.5} size={16} /> Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
