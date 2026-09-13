import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'emerald' }) => {
  const isRose = color === 'rose';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isRose ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} />
      
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
            isRose 
              ? 'border border-rose-100 bg-rose-50 text-rose-600' 
              : 'border border-emerald-100 bg-emerald-50 text-emerald-600'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{value}</div>
        {subtext && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isRose ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          </div>
        )}
      </div>
    </div>
  );
};

