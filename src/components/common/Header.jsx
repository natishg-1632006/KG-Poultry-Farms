import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from './Modal';
import { LogOut, Menu, AlertTriangle } from 'lucide-react';

export const Header = ({ onToggleSidebar }) => {
  const { userProfile, logout } = useAuth();
  const { t } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
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
              <h1 className="text-base font-black leading-tight tracking-tight text-slate-900">{t('appName')}</h1>
              <p className="text-[11px] font-semibold text-slate-400 hidden sm:block">{t('appSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {userProfile && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all active:scale-95 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('logout')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Themed Logout Confirmation Popup Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => !loggingOut && setShowLogoutModal(false)}
        title="Confirm Sign Out"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50/80 p-3.5 border border-amber-200/80">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-extrabold text-amber-950">Are you sure you want to log out?</h4>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => setShowLogoutModal(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleConfirmLogout}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-600/30 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loggingOut ? (
                <span>Logging Out...</span>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Proceed to Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
