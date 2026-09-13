import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const variants = {
    Draft: 'bg-amber-100 text-amber-800 border-amber-200',
    Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Completed: 'bg-blue-100 text-blue-800 border-blue-200',
    Admin: 'bg-purple-100 text-purple-800 border-purple-200',
    Farmer: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Inactive: 'bg-rose-100 text-rose-800 border-rose-200',
    default: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  const styleClass = variants[variant] || variants[children] || variants.default;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${styleClass} ${className}`}>
      {children}
    </span>
  );
};
