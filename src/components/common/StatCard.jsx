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
  color = 'emerald',
  highlighted = false,
  badgeText
}) => {
  const { t } = useLanguage();

  const colorStyles = {
    blue: {
      bar: 'from-blue-600 to-blue-400',
      icon: 'border-blue-100 bg-blue-50 text-blue-600',
      dot: 'bg-blue-500',
      availableLabel: 'text-emerald-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    emerald: {
      bar: 'from-emerald-600 to-emerald-400',
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      dot: 'bg-emerald-500',
      availableLabel: 'text-emerald-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    teal: {
      bar: 'from-teal-600 to-teal-400',
      icon: 'border-teal-100 bg-teal-50 text-teal-600',
      dot: 'bg-teal-500',
      availableLabel: 'text-teal-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    rose: {
      bar: 'from-rose-600 to-rose-400',
      icon: 'border-rose-100 bg-rose-50 text-rose-600',
      dot: 'bg-rose-500',
      availableLabel: 'text-rose-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    orange: {
      bar: 'from-orange-500 to-amber-400',
      icon: 'border-orange-100 bg-orange-50 text-orange-600',
      dot: 'bg-orange-500',
      availableLabel: 'text-emerald-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      icon: 'border-amber-100 bg-amber-50 text-amber-600',
      dot: 'bg-amber-500',
      availableLabel: 'text-emerald-600',
      availableValue: 'text-slate-900',
      cardClass: 'border-slate-200/80 bg-white shadow-xs',
      breakdownClass: 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      titleColor: 'text-slate-500',
      subtextColor: 'text-slate-500'
    },
    purple: {
      bar: 'from-purple-600 via-indigo-600 to-violet-500',
      icon: 'border-purple-200 bg-purple-100 text-purple-700',
      dot: 'bg-purple-600',
      availableLabel: 'text-purple-700 font-extrabold',
      availableValue: 'text-purple-950 font-black',
      cardClass: 'border-purple-300/90 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 shadow-md ring-1 ring-purple-500/20',
      breakdownClass: 'bg-white/95 border-purple-200/90 shadow-2xs divide-purple-100',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      titleColor: 'text-purple-950 font-black',
      subtextColor: 'text-purple-700 font-medium'
    },
    indigo: {
      bar: 'from-indigo-600 via-blue-600 to-indigo-400',
      icon: 'border-indigo-200 bg-indigo-100 text-indigo-700',
      dot: 'bg-indigo-600',
      availableLabel: 'text-indigo-700 font-extrabold',
      availableValue: 'text-indigo-950 font-black',
      cardClass: 'border-indigo-300/90 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 shadow-md ring-1 ring-indigo-500/20',
      breakdownClass: 'bg-white/95 border-indigo-200/90 shadow-2xs divide-indigo-100',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      titleColor: 'text-indigo-950 font-black',
      subtextColor: 'text-indigo-700 font-medium'
    }
  };

  const currentStyle = colorStyles[color] || colorStyles.emerald;

  const items = statsBreakdown || (consumedValue !== undefined && arrivedValue !== undefined ? [
    {
      label: t('available'),
      value: availableValue || value,
      labelColor: currentStyle.availableLabel || 'text-emerald-600',
      valueColor: currentStyle.availableValue || (highlighted ? 'text-purple-950 font-black' : 'text-slate-900')
    },
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
            <span className={`text-2xl sm:text-2xl font-black tracking-tight shrink-0 ${highlighted ? (currentStyle.availableValue || 'text-purple-950') : 'text-slate-900'}`}>
              {numPart}
            </span>
            <span className={`text-sm sm:text-xs font-bold uppercase tracking-wider shrink-0 ${highlighted ? 'text-purple-600 font-black' : 'text-slate-500'}`}>
              {unit}
            </span>
          </div>
        );
      }
    }

    // Default string without separate unit
    return (
      <div className={`text-2xl sm:text-2xl font-black tracking-tight whitespace-nowrap truncate ${highlighted ? (currentStyle.availableValue || 'text-purple-950') : 'text-slate-900'}`} title={strVal}>
        {strVal}
      </div>
    );
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg min-w-0 ${
      highlighted
        ? (currentStyle.cardClass || 'border-purple-300/90 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 shadow-md ring-2 ring-purple-500/20')
        : 'border-slate-200/80 bg-white shadow-xs'
    }`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 ${highlighted ? 'h-2 shadow-xs' : 'h-1.5'} bg-gradient-to-r ${currentStyle.bar}`} />
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-sm sm:text-xs font-bold uppercase tracking-wider truncate ${highlighted ? (currentStyle.titleColor || 'text-purple-950 font-black') : 'text-slate-500'}`}>
            {title}
          </span>
          {badgeText && (
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-2xs ${currentStyle.badge || 'bg-purple-100 text-purple-800 border-purple-200'}`}>
              {badgeText}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`flex ${highlighted ? 'h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-purple-500/20 shadow-xs' : 'h-10 w-10 sm:h-11 sm:w-11 shadow-2xs'} shrink-0 items-center justify-center rounded-xl border ${currentStyle.icon}`}>
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 space-y-3 min-w-0">
        {!items && (
          <div>
            {valueLabel && (
              <span className={`text-xs sm:text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${highlighted ? 'text-purple-600 font-extrabold' : 'text-slate-400'}`}>
                {valueLabel}
              </span>
            )}
            {renderFormattedValue(availableValue || value)}
          </div>
        )}

        {items ? (
          <div className={`grid grid-cols-3 divide-x rounded-xl p-1.5 sm:p-2.5 text-center min-w-0 border ${
            highlighted
              ? (currentStyle.breakdownClass || 'bg-white/95 border-purple-200/90 shadow-2xs divide-purple-100')
              : 'bg-slate-50/70 border-slate-200/60 shadow-2xs divide-slate-200/80'
          }`}>
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
            <p className={`text-sm sm:text-xs font-medium truncate ${highlighted ? (currentStyle.subtextColor || 'text-purple-700 font-medium') : 'text-slate-500'}`}>
              {subtext}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
