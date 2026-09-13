import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { LogOut, User, Menu, ShieldAlert } from 'lucide-react';

export const Header = ({ onToggleSidebar }) => {
  const { userProfile, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 shadow-xs">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <img
            src="/kg-logo.jpg"
            alt="KG Poultry Farms Logo"
            className="h-10 w-10 object-contain rounded-xl shadow-xs ring-1 ring-emerald-500/20 bg-white"
          />
          <div>
            <h1 className="text-base font-black leading-tight tracking-tight text-slate-900">KG Poultry Farms</h1>
            <p className="text-[11px] font-semibold text-slate-400 hidden sm:block">Broiler Farm Operations & Intelligence</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {userProfile && (
          <div className="flex items-center gap-3 border-l border-slate-200/80 pl-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold text-slate-900">{userProfile.name}</div>
              <div className="text-[10px] font-semibold text-emerald-700">{userProfile.farmName || 'Central Operations'}</div>
            </div>
            <Badge variant={role}>{role}</Badge>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all active:scale-95"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
