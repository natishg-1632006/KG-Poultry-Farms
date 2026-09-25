import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  Wheat,
  Syringe,
  Truck,
  Target,
  BarChart3,
  FileText,
  ShieldCheck,
  History,
  X,
  Globe
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const farmNav = [
    { name: t('dashboard'), path: isAdmin ? '/admin/dashboard' : '/farmer/dashboard', icon: LayoutDashboard },
    { name: t('dailyFarmRecords'), path: '/daily-records', icon: ClipboardList },
    { name: t('feedManagement'), path: '/feed', icon: Wheat },
    { name: t('medicineAndVaccines'), path: '/medicine', icon: Syringe },
    { name: t('dispatchAndBoxSets'), path: '/dispatch', icon: Truck },
    { name: t('reportsAndAnalytics'), path: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ name: t('userManagement'), path: '/admin/users', icon: Users }] : []),
    ...(isAdmin ? [{ name: t('auditLogs'), path: '/admin/audit-logs', icon: ShieldCheck }] : []),
    { name: t('batchManagement'), path: '/admin/batches', icon: Layers },
    { name: t('batchHistory'), path: '/batch-history', icon: History }
  ];

  const navItems = farmNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 lg:w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 lg:hidden">
          <span className="text-base font-black text-slate-900">{t('navigationMenu')}</span>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mb-3 px-2 text-xs font-black uppercase tracking-wider text-slate-500">
            {t('farmManagement')}
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-xs font-extrabold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm shadow-emerald-600/30 ring-1 ring-emerald-500/40 translate-x-0.5'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="whitespace-nowrap truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Language Switcher Control in Side Menu */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
            <div className="px-1 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-600" />
              <span>{t('language')}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-lg py-2 text-xs font-extrabold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`rounded-lg py-2 text-xs font-extrabold transition-all cursor-pointer ${
                  language === 'ta'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <div className="flex items-center gap-2">
                <img src="/kg-logo.jpg" alt="KG Logo" className="h-6 w-6 object-contain rounded-md" />
                <span className="text-sm font-black text-slate-900">KG Poultry</span>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">v1.0.0</span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">Encrypted Cloud Sync</p>
          </div>
        </div>
      </aside>
    </>
  );
};
