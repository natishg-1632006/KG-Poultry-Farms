import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { LogOut, User, Menu, ShieldAlert } from 'lucide-react';

export const Header = ({ onToggleSidebar }) => {
  const { userProfile, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-sm">
            KG
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">KG Poultry Farms</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Broiler Farm Management System</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {userProfile && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold text-slate-800">{userProfile.name}</div>
              <div className="text-xs text-slate-500">{userProfile.farmName || 'Central Operations'}</div>
            </div>
            <Badge variant={role}>{role}</Badge>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
