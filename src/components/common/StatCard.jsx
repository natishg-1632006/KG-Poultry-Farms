import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatCard = ({
  title,
  value,
  valueLabel,
  subtext,
  availableValue,
  consumedValue,
  arrivedValue,
  statsBreakdown,
  secondaryValue,
  secondaryLabel = "Total Arrived",
  icon: Icon,
  color = 'emerald'
}) => {
  const { t } = useLanguage();

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

  const items = statsBreakdown || (consumedValue !== undefined && arrivedValue !== undefined ? [
    { label: t('available'), value: availableValue || value, labelColor: 'text-emerald-600', valueColor: 'text-slate-900' },
    { label: t('consumed'), value: consumedValue, labelColor: 'text-orange-600', valueColor: 'text-orange-600' },
    { label: t('arrived'), value: arrivedValue, labelColor: 'text-blue-600', valueColor: 'text-blue-600' }
  ] : null);

  const renderFormattedValue = (val) => {
    if (val === null || val === undefined) return null;
    const strVal = String(val).trim();

    // Check if value ends with a unit string like "Bags", "kg", "g", "L", etc.
    const parts = strVal.split(' ');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      const isUnit = /^(bags|bag|kg|g|liter|liters|l|pcs|chicks)$/i.test(lastPart);
      if (isUnit) {
        const unit = lastPart;
        const numPart = parts.slice(0, -1).join(' ');
        return (
          <div className="flex items-baseline gap-1.5 whitespace-nowrap min-w-0 overflow-hidden" title={strVal}>
            <span className="text-2xl sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
              {numPart}
            </span>
            <span className="text-sm sm:text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
              {unit}
            </span>
          </div>
        );
      }
    }

    // Default string without separate unit
    return (
      <div className="text-2xl sm:text-2xl font-black tracking-tight text-slate-900 whitespace-nowrap truncate" title={strVal}>
        {strVal}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md min-w-0">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentStyle.bar}`} />
      
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{title}</span>
        {Icon && (
          <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${currentStyle.icon}`}>
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 space-y-3 min-w-0">
        {!items && (
          <div>
            {valueLabel && <span className="text-xs sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">{valueLabel}</span>}
            {renderFormattedValue(availableValue || value)}
          </div>
        )}

        {items ? (
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 rounded-xl bg-slate-50/70 p-1.5 sm:p-2.5 border border-slate-200/60 text-center shadow-2xs min-w-0">
            {items.map((item, idx) => (
              <div key={idx} className="px-1 py-0.5 min-w-0 overflow-hidden">
                <span className={`text-[11px] sm:text-[10px] font-black uppercase tracking-wider block mb-0.5 truncate ${item.labelColor || 'text-slate-500'}`} title={item.label}>
                  {item.label}
                </span>
                <span className={`text-sm sm:text-sm font-black block truncate ${item.valueColor || 'text-slate-900'}`} title={item.value}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : secondaryValue ? (
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-right bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              <span className="text-xs sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{secondaryLabel}</span>
              <div className="text-sm sm:text-xs font-black text-slate-800">{secondaryValue}</div>
            </div>
          </div>
        ) : null}

        {subtext && (
          <div className="flex items-center gap-1.5 border-t border-slate-100/80 pt-2 min-w-0">
            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${currentStyle.dot}`} />
            <p className="text-sm sm:text-xs font-medium text-slate-500 truncate">{subtext}</p>
          </div>
        )}
      </div>
    </div>
  );
};
