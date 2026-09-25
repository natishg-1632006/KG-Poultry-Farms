import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetUsers, dbGetDispatches, dbGetAuditLogs, dbGetDailyRecords } from '../services/dbService';
import { calculateActiveBatchFCR } from '../utils/calculations';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { WeatherWidget } from '../components/common/WeatherWidget';
import { Layers, Users, Truck, AlertCircle, PlusCircle, ArrowRight, ShieldCheck, Activity, Scale } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminDashboard = () => {
  const { language, t } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeFCR, setActiveFCR] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bList, uList, dList, lList] = await Promise.all([
          dbGetBatches(),
          dbGetUsers(),
          dbGetDispatches(),
          dbGetAuditLogs()
        ]);
        setBatches(bList);
        setUsers(uList);
        setDispatches(dList);
        setLogs(lList);

        // Calculate FCR for active batch
        const activeBatchesList = bList.filter(b => (b.status || '').toLowerCase() === 'active');
        if (activeBatchesList.length > 0) {
          const currentActive = activeBatchesList[activeBatchesList.length - 1];
          const rawDailyMap = await dbGetDailyRecords(currentActive.id);
          const dailyRecords = Object.values(rawDailyMap || {}).sort((a, b) => b.recordDate.localeCompare(a.recordDate));
          const totalFeedConsumedKg = dailyRecords.reduce((sum, r) => sum + Number(r.feedConsumption || 0), 0);
          const latestAvgWeight = dailyRecords.length > 0 ? Number(dailyRecords[0].averageWeight || 0) : 0;
          const remainingChicks = Number(currentActive.remainingChickCount ?? currentActive.initialChickCount ?? 0);

          const batchDispatches = dList.filter(d => d.batchId === currentActive.id);
          const totalDispatchedWeight = batchDispatches.reduce((acc, d) => acc + Number(d.totalWeight || d.netWeight || 0), 0);
          const isBatchDone = (currentActive.status || '').toLowerCase() === 'completed';

          const computedFCR = calculateActiveBatchFCR(
            totalFeedConsumedKg,
            latestAvgWeight,
            remainingChicks,
            totalDispatchedWeight,
            isBatchDone
          );
          setActiveFCR(computedFCR);
        }
      } catch (err) {
        console.error('Failed loading admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeBatches = batches.filter(b => b.status === 'Active');
  const farmersCount = users.filter(u => u.role === 'Farmer' && u.active).length;
  const totalChicks = activeBatches.reduce((acc, b) => acc + (Number(b.remainingChickCount) || Number(b.initialChickCount) || 0), 0);
  const totalDispatchedKg = dispatches.reduce((acc, d) => acc + (Number(d.totalWeight) || 0), 0);

  if (loading) {
    return <LoadingSpinner message="Loading Admin Dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 truncate">{t('adminDashboard')}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/admin/batches"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>{t('newBatch')}</span>
          </Link>
          <Link
            to="/admin/users"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>{t('manageUsers')}</span>
          </Link>
        </div>
      </div>

      {/* Farm Village Weather Widget */}
      <WeatherWidget />

      {/* KPI Cards Grid including Active FCR */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title={t('activeBatches')}
          value={batches.filter(b => b.status === 'Active').length}
          subtext={t('inProductionShed')}
          icon={Layers}
          color="emerald"
        />
        <StatCard
          title={t('totalFarmers')}
          value={farmersCount}
          subtext={t('registeredActiveAccounts')}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title={t('totalLiveChicks')}
          value={totalChicks.toLocaleString()}
          subtext={t('acrossActiveBatches')}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title={t('totalDispatchedWeight')}
          value={`${totalDispatchedKg.toLocaleString()} kg`}
          subtext={t('completedSalesDispatches')}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title={language === 'ta' ? 'FCR விகிதம்' : 'FCR'}
          value={activeFCR ? activeFCR : '—'}
          subtext={activeFCR ? (language === 'ta' ? 'தீவன மாற்று விகிதம்' : 'Feed Conversion Ratio') : (language === 'ta' ? 'FCR தரவு இல்லை' : 'No active batch FCR')}
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Batches Status Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">{t('farmBatchesOverview')}</h2>
            <Link to="/admin/batches" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              {t('viewAll')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-2">{t('batchNumber')}</th>
                  <th className="pb-3 px-2">{t('date')}</th>
                  <th className="pb-3 px-2">Initial Chicks</th>
                  <th className="pb-3 px-2">Remaining</th>
                  <th className="pb-3 px-2">{t('assignedFarmer')}</th>
                  <th className="pb-3 px-2 text-right">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">No farm batches created yet.</td>
                  </tr>
                ) : (
                  batches.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-3 px-2 text-slate-600">{b.chickArrivalDate}</td>
                      <td className="py-3 px-2 text-slate-600">{b.initialChickCount}</td>
                      <td className="py-3 px-2 font-bold text-emerald-700">{b.remainingChickCount ?? b.initialChickCount}</td>
                      <td className="py-3 px-2 text-slate-700">{b.assignedFarmerName || 'Unassigned'}</td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant={b.status}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t('auditLogFeed')}
            </h2>
            <Link to="/admin/audit-logs" className="text-xs font-bold text-emerald-600 hover:underline">
              {t('logs')}
            </Link>
          </div>

          <div className="space-y-4 text-xs">
            {logs.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No audit events recorded.</p>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{log.details}</p>
                  <p className="mt-1 text-[10px] text-slate-400">By: {log.actorName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
