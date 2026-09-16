import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  variant = 'danger'
}) => {
  const getIcon = () => {
    if (variant === 'danger') return <Trash2 className="h-5 w-5" />;
    if (variant === 'emerald' || variant === 'success') return <CheckCircle2 className="h-5 w-5" />;
    if (variant === 'info' || variant === 'blue') return <RefreshCw className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  const getIconContainerStyles = () => {
    if (variant === 'danger') return 'bg-rose-50 text-rose-600 border-rose-200';
    if (variant === 'emerald' || variant === 'success') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (variant === 'info' || variant === 'blue') return 'bg-blue-50 text-blue-600 border-blue-200';
    return 'bg-amber-50 text-amber-600 border-amber-200';
  };

  const getButtonStyles = () => {
    if (variant === 'danger') return 'bg-rose-600 hover:bg-rose-700 text-white';
    if (variant === 'emerald' || variant === 'success') return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    if (variant === 'info' || variant === 'blue') return 'bg-blue-600 hover:bg-blue-700 text-white';
    return 'bg-amber-600 hover:bg-amber-700 text-white';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4 py-1">
        {/* Icon & Short Message */}
        <div className="flex items-center gap-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getIconContainerStyles()}`}>
            {getIcon()}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed min-w-0">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${getButtonStyles()}`}
          >
            {variant === 'danger' && <Trash2 className="h-4 w-4" />}
            {(variant === 'emerald' || variant === 'success') && <CheckCircle2 className="h-4 w-4" />}
            <span>{loading ? '...' : confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
