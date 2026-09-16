import React, { useState, useEffect } from 'react';
import { dbGetAuditLogs } from '../services/dbService';
import { ShieldCheck, Search, Clock } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';

export const AuditLogsPage = () => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const list = await dbGetAuditLogs();
      setLogs(list);
    } catch (err) {
      console.error('Failed loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((l) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.actorName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner label={language === 'ta' ? 'தணிக்கைப் பதிவுகள் ஏற்றப்படுகின்றன...' : 'Loading audit logs...'} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            {language === 'ta' ? 'அமைப்பின் தணிக்கைப் பதிவுகள்' : 'System Audit Logs'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {language === 'ta' ? 'பாதுகாப்பு, பயனர் மாற்றங்கள் மற்றும் செயல்பாடுகள் பற்றிய நிகழ்நேரப் பதிவுகள்' : 'Real-time security events, user changes, and operational activity history'}
          </p>
        </div>
      </div>

      <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ta' ? 'செயல் வகை, விவரங்கள் அல்லது பயனர் மூலம் தேடவும்...' : 'Search audit logs by action type, details, or user...'}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-emerald-600"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">{language === 'ta' ? 'நேரம்' : 'Timestamp'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'செயல் வகை' : 'Action Event'}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'விவரங்கள்' : 'Details / Description'}</th>
                <th className="pb-3 px-2 text-right">{language === 'ta' ? 'செயல்பட்டவர்' : 'Actor'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">{language === 'ta' ? 'தணிக்கைப் பதிவுகள் எதுவும் கிடைக்கவில்லை.' : 'No audit logs found.'}</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 text-slate-500 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-800">{log.details}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900">{log.actorName || (language === 'ta' ? 'அமைப்பு' : 'System')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
