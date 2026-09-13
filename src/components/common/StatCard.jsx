import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 border-t-4 border-t-emerald-600 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-600 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-black tracking-tight text-slate-900">{value}</div>
        {subtext && <p className="mt-1 text-xs font-medium text-slate-500">{subtext}</p>}
      </div>
    </div>
  );
};
