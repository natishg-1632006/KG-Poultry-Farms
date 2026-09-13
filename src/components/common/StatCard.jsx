import React from 'react';

export const StatCard = ({
  title,
  value,
  subtext,
  availableValue,
  consumedValue,
  arrivedValue,
  secondaryValue,
  secondaryLabel = "Total Arrived",
  icon: Icon,
  color = 'emerald'
}) => {
  const colorStyles = {
    blue: {
      bar: 'from-blue-600 to-blue-400',
      icon: 'border-blue-100 bg-blue-50 text-blue-600',
      dot: 'bg-blue-500'
    },
    emerald: {
      bar: 'from-emerald-600 to-emerald-400',
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      dot: 'bg-emerald-500'
    },
    rose: {
      bar: 'from-rose-600 to-rose-400',
      icon: 'border-rose-100 bg-rose-50 text-rose-600',
      dot: 'bg-rose-500'
    },
    orange: {
      bar: 'from-orange-500 to-amber-400',
      icon: 'border-orange-100 bg-orange-50 text-orange-600',
      dot: 'bg-orange-500'
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      icon: 'border-amber-100 bg-amber-50 text-amber-600',
      dot: 'bg-amber-500'
    }
  };

  const currentStyle = colorStyles[color] || colorStyles.emerald;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentStyle.bar}`} />
      
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${currentStyle.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Available Stock</span>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{availableValue || value}</div>
        </div>

        {consumedValue !== undefined && arrivedValue !== undefined ? (
          <div className="grid grid-cols-3 gap-1 text-center rounded-xl bg-slate-50 p-2 border border-slate-100/90">
            <div className="px-1 py-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 block">Available</span>
              <span className="text-xs font-black text-slate-900">{availableValue || value}</span>
            </div>
            <div className="border-x border-slate-200/80 px-1 py-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 block">Consumed</span>
              <span className="text-xs font-black text-amber-700">{consumedValue}</span>
            </div>
            <div className="px-1 py-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 block">Arrived</span>
              <span className="text-xs font-black text-blue-700">{arrivedValue}</span>
            </div>
          </div>
        ) : secondaryValue ? (
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-right bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{secondaryLabel}</span>
              <div className="text-xs font-black text-slate-800">{secondaryValue}</div>
            </div>
          </div>
        ) : null}

        {subtext && (
          <div className="flex items-center gap-1.5 border-t border-slate-100/80 pt-2">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${currentStyle.dot}`} />
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          </div>
        )}
      </div>
    </div>
  );
};

