import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect Component
 * Premium custom dropdown menu styled with farm theme colors,
 * replacing native OS dropdown popups with custom floating popover cards.
 * 
 * Props:
 * - value: current selected value
 * - onChange: callback function (e) => ... or (val) => ...
 * - options: Array of { value, label, icon?, badge? } or Array of strings/numbers
 * - icon: optional Leading icon component
 * - placeholder: string placeholder text
 * - className: custom class for trigger button
 * - dropdownClassName: custom class for popover menu
 * - disabled: boolean
 * - name: optional form field name
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  icon: Icon,
  placeholder = 'Select option...',
  className = '',
  dropdownClassName = '',
  disabled = false,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options array into [{ value, label, icon?, badge? }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : String(opt.value),
        icon: opt.icon,
        badge: opt.badge,
      };
    }
    return {
      value: opt,
      label: String(opt),
    };
  });

  // Find selected option label
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      // Pass a mock event object for compatibility with standard React form handlers
      const mockEvent = {
        target: {
          name: name || '',
          value: optValue,
        },
      };
      onChange(mockEvent);
    }
  };

  return (
    <div className="relative inline-block text-left select-none" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
          isOpen
            ? 'bg-emerald-100/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
            : 'bg-emerald-50/80 border-emerald-300/80 text-emerald-900 hover:bg-emerald-100/70 hover:border-emerald-400 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          {Icon && <Icon className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-105 transition-transform" />}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-emerald-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-900' : 'group-hover:translate-y-[1px]'
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-1.5 w-max min-w-[180px] max-w-xs z-50 rounded-2xl bg-white p-1.5 shadow-xl border border-emerald-100 ring-1 ring-black/5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5 custom-scrollbar">
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              const OptionIcon = opt.icon;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {OptionIcon && (
                      <OptionIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-white shrink-0 ml-2" />}
                  {!isSelected && opt.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
