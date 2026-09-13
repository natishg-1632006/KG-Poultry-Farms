import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, isFarmer } = useAuth();

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Batch Management', path: '/admin/batches', icon: Layers },
    { name: 'Daily Farm Records', path: '/daily-records', icon: ClipboardList },
    { name: 'Feed Management', path: '/feed', icon: Wheat },
    { name: 'Medicine & Vaccines', path: '/medicine', icon: Syringe },
    { name: 'Dispatch & Box Sets', path: '/dispatch', icon: Truck },
    { name: 'Company Targets', path: '/admin/targets', icon: Target },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { name: 'Invoice History', path: '/invoices', icon: FileText },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldCheck }
  ];

  const farmerNav = [
    { name: 'My Dashboard', path: '/farmer/dashboard', icon: LayoutDashboard },
    { name: 'Daily Entry', path: '/daily-records', icon: ClipboardList },
    { name: 'Feed Stock', path: '/feed', icon: Wheat },
    { name: 'Medicine Entry', path: '/medicine', icon: Syringe },
    { name: 'Dispatch & Box Sets', path: '/dispatch', icon: Truck },
    { name: 'My Batch Reports', path: '/reports', icon: BarChart3 }
  ];

  const navItems = isAdmin ? adminNav : farmerNav;

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 lg:hidden">
          <span className="font-bold text-slate-900">Navigation Menu</span>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isAdmin ? 'Admin Console' : 'Farmer Operations'}
          </div>
          <nav className="space-y-1">
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
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">KG Poultry v1.0.0</p>
            <p>Protected & Encrypted</p>
          </div>
        </div>
      </aside>
    </>
  );
};
