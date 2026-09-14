import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

/**
 * CustomDatePicker Component
 * Theme-designed calendar popup styled with emerald farm theme,
 * replacing native browser date pickers.
 * 
 * Props:
 * - value: current date string "YYYY-MM-DD"
 * - onChange: callback (dateStr) => ...
 * - min: minimum selectable date "YYYY-MM-DD"
 * - max: maximum selectable date "YYYY-MM-DD"
 * - loggedDates: Array of date strings that have existing updated logs ["2026-09-14", ...]
 * - disabled: boolean
 * - placeholder: string
 */
export default function CustomDatePicker({
  value,
  onChange,
  min,
  max,
  loggedDates = [],
  disabled = false,
  placeholder = 'Select date...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse input string "YYYY-MM-DD" into Date object or fallback to today
  const parseDateStr = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    return new Date();
  };

  const selectedDate = parseDateStr(value);
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (value) {
      setViewDate(parseDateStr(value));
    }
  }, [value]);

  // Create quick lookup set for logged dates
  const loggedSet = new Set(Array.isArray(loggedDates) ? loggedDates : []);

  // Click outside & Escape key listeners
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

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Days calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Helper to format Date to "YYYY-MM-DD"
  const formatDateStr = (year, month, day) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Helper to format Date to user-friendly "DD-MM-YYYY"
  const displayFormattedDate = (dateStr) => {
    if (!dateStr) return placeholder;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleSelectDay = (day) => {
    if (disabled) return;
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;

    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const handleSelectToday = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    if (min && todayStr < min) return;
    if (max && todayStr > max) return;
    if (onChange) {
      onChange(todayStr);
    }
    setViewDate(today);
    setIsOpen(false);
  };

  const todayObj = new Date();
  const todayStr = formatDateStr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  // Render days array
  const dayCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    dayCells.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentStr = formatDateStr(viewYear, viewMonth, day);
    const isSelected = value === currentStr;
    const isToday = todayStr === currentStr;
    const isDisabled = (min && currentStr < min) || (max && currentStr > max);

    const isLogged = loggedSet.has(currentStr);
    const isWithinBatch = (!min || currentStr >= min) && (!max || currentStr <= max);
    const isPending = !isLogged && isWithinBatch;

    dayCells.push(
      <button
        key={day}
        type="button"
        disabled={isDisabled}
        onClick={() => handleSelectDay(day)}
        title={
          isSelected
            ? `Selected: ${currentStr}`
            : isLogged
            ? `Updated Logged Entry: ${currentStr}`
            : isPending
            ? `Pending Daily Entry: ${currentStr}`
            : currentStr
        }
        className={`relative h-9 w-9 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 font-black'
            : isLogged
            ? 'bg-emerald-100/90 text-emerald-950 font-black border border-emerald-300/90 hover:bg-emerald-200'
            : isPending
            ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200/90 hover:bg-amber-100'
            : isToday
            ? 'border-2 border-emerald-500 text-emerald-950 font-black bg-emerald-50/50'
            : 'text-slate-700 hover:bg-emerald-100 hover:text-emerald-950'
        } ${isDisabled ? 'opacity-25 cursor-not-allowed hover:bg-transparent text-slate-300 border-none' : ''}`}
      >
        <span className="leading-none mt-0.5">{day}</span>
        {/* Status Indicator Dot */}
        {!isSelected && !isDisabled && (
          <span
            className={`h-1.5 w-1.5 rounded-full mt-0.5 ${
              isLogged
                ? 'bg-emerald-600'
                : isPending
                ? 'bg-amber-500'
                : 'bg-transparent'
            }`}
          />
        )}
        {isSelected && (
          <span className="h-1 w-1 rounded-full bg-white mt-0.5" />
        )}
      </button>
    );
  }

  return (
    <div className="relative inline-block w-full select-none" ref={containerRef}>
      {/* Input Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
          isOpen
            ? 'bg-emerald-100/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
            : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-400 focus:border-emerald-600 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''} ${className}`}
      >
        <span className="font-extrabold text-slate-900">{displayFormattedDate(value)}</span>
        <div className="rounded-lg bg-emerald-50 p-1 text-emerald-600 border border-emerald-100/80">
          <CalendarIcon className="h-4 w-4" />
        </div>
      </button>

      {/* Floating Theme Calendar Popover Card */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto right-0 sm:right-auto mt-2 w-80 z-50 rounded-2xl bg-white p-4 shadow-xl border border-emerald-100 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-xl bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-black text-slate-900">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-xl bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Color Status Legend Bar */}
          <div className="flex items-center justify-center gap-4 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 text-[10px] font-extrabold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              <span className="text-emerald-900">Updated / Logged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-800">Pending Entry</span>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {dayCells}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs font-bold">
            <button
              type="button"
              onClick={handleSelectToday}
              className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 transition-all shadow-2xs cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
