import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

/**
 * CustomSelect Component
 * Premium custom dropdown menu styled with farm theme colors,
 * replacing native OS dropdown popups with custom floating popover cards.
 * Uses React Portal and smart positioning to prevent clipping inside modals or popups.
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
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', isMobile: false, ready: false });

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

  // Calculate popup position
  const calculatePosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0, width: 0, placement: 'bottom', isMobile: false, ready: false };
    const isMob = window.innerWidth < 640;
    if (isMob) {
      return { top: 0, left: 0, width: 0, placement: 'bottom', isMobile: true, ready: true };
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 180);
    const menuHeight = Math.min(260, normalizedOptions.length * 40 + 16);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 6;
    let placement = 'bottom';

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = Math.max(10, rect.top - menuHeight - 6);
      placement = 'top';
    } else {
      top = Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 6);
    }

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - menuWidth - 16);
    }

    return { top, left, width: rect.width, placement, isMobile: false, ready: true };
  };

  const handleToggle = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      const pos = calculatePosition();
      setPopoverPos(pos);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Click outside, scroll, resize & Escape listeners
  useEffect(() => {
    function updateOnEvent() {
      if (isOpen) {
        setPopoverPos(calculatePosition());
      }
    }

    function handleClickOutside(event) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        popoverRef.current && !popoverRef.current.contains(event.target)
      ) {
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
      window.addEventListener('resize', updateOnEvent);
      window.addEventListener('scroll', updateOnEvent, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateOnEvent);
      window.removeEventListener('scroll', updateOnEvent, true);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      const mockEvent = {
        target: {
          name: name || '',
          value: optValue,
        },
      };
      onChange(mockEvent);
    }
  };

  const renderOptionItem = (opt) => {
    const isSelected = String(opt.value) === String(value);
    const OptionIcon = opt.icon;
    return (
      <button
        key={String(opt.value)}
        type="button"
        onClick={() => handleSelect(opt.value)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
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
  };

  return (
    <div className="relative inline-block text-left select-none">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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

      {/* Floating Popover Menu via Portal */}
      {isOpen &&
        createPortal(
          popoverPos.isMobile ? (
            /* Mobile View: Centered Modal Dialog Backdrop */
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
              onClick={() => setIsOpen(false)}
            >
              <div
                ref={popoverRef}
                className="w-full max-w-xs rounded-2xl bg-white p-3 shadow-2xl border border-emerald-100 ring-1 ring-black/5 animate-in zoom-in-95 duration-150 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{placeholder}</span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-0.5 space-y-1 custom-scrollbar">
                  {normalizedOptions.map((opt) => renderOptionItem(opt))}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop View: Fixed Smart Positioned Portal Card */
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                minWidth: `${Math.max(popoverPos.width, 180)}px`,
                zIndex: 9999,
                opacity: popoverPos.ready ? 1 : 0,
                pointerEvents: popoverPos.ready ? 'auto' : 'none'
              }}
              className={`rounded-2xl bg-white p-1.5 shadow-2xl border border-emerald-100 ring-1 ring-black/5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
            >
              <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5 custom-scrollbar">
                {normalizedOptions.map((opt) => renderOptionItem(opt))}
              </div>
            </div>
          ),
          document.body
        )}
    </div>
  );
}
