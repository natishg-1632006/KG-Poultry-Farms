import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner Component
 * Reusable full-page or section loading screen with animated emerald spinner icon
 * 
 * Props:
 * - message: optional string label (e.g., "Loading Dispatch Management...")
 * - submessage: optional subtext (default: "Please wait a moment")
 * - fullPage: boolean (default: false)
 */
export const LoadingSpinner = ({
  message = 'Loading Data...',
  submessage = 'Please wait a moment...',
  fullPage = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 ${
        fullPage ? 'min-h-[80vh] w-full' : 'min-h-[50vh] w-full'
      }`}
    >
      <div className="relative flex items-center justify-center mb-4">
        {/* Soft emerald background glow */}
        <div className="absolute h-16 w-16 rounded-full bg-emerald-100/60 animate-ping opacity-75"></div>
        
        {/* Inner white circle container */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg border border-emerald-100">
          <Loader2 className="h-7 w-7 text-emerald-600 animate-spin" />
        </div>
      </div>

      <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
        {message}
      </h3>
      {submessage && (
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {submessage}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
