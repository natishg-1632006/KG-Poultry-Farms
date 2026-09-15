import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
      {/* 100% Full Viewport Fixed Backdrop Overlay with rich dark opacity & blur */}
      <div
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Centered Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <div
          className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl bg-white text-left shadow-2xl transition-all border border-slate-100 overflow-hidden my-auto z-10`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shrink-0" />
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
              title="Close Popup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-4rem)]">{children}</div>
        </div>
      </div>
    </div>
  );
};
