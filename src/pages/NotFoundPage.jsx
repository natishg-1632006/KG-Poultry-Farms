import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="text-6xl font-black text-emerald-600">404</div>
        <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
        <p className="text-xs text-slate-500">
          The requested page does not exist or you do not have permission to access it.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Home className="h-4 w-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
