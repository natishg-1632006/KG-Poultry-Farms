import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const variants = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Admin: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    Farmer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    default: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  const styleClass = variants[variant] || variants[children] || variants.default;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${styleClass} ${className}`}>
      {children}
    </span>
  );
};
