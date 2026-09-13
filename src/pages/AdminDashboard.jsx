import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dbGetBatches, dbGetUsers, dbGetDispatches, dbGetAuditLogs } from '../services/dbService';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Layers, Users, Truck, AlertCircle, PlusCircle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export const AdminDashboard = () => {
  const [batches, setBatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [logs, setLogs] = useState([]);
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
    return <div className="p-8 text-center text-slate-500">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Admin Command Center</h1>
          <p className="text-sm font-medium text-slate-500">Overview of broiler farm operations, batches, and company metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/batches"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            New Batch
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Batches"
          value={batches.filter(b => b.status === 'Active').length}
          subtext="In production shed"
          icon={Layers}
          color="emerald"
        />
        <StatCard
          title="Total Farmers"
          value={farmersCount}
          subtext="Registered active accounts"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Total Live Chicks"
          value={totalChicks.toLocaleString()}
          subtext="Across active batches"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Total Dispatched Weight"
          value={`${totalDispatchedKg.toLocaleString()} kg`}
          subtext="Completed sales dispatches"
          icon={Truck}
          color="blue"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Batches Status Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">Farm Batches Overview</h2>
            <Link to="/admin/batches" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-2">Batch #</th>
                  <th className="pb-3 px-2">Arrival Date</th>
                  <th className="pb-3 px-2">Initial Chicks</th>
                  <th className="pb-3 px-2">Remaining</th>
                  <th className="pb-3 px-2">Assigned Farmer</th>
                  <th className="pb-3 px-2 text-right">Status</th>
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
              Audit Log Feed
            </h2>
            <Link to="/admin/audit-logs" className="text-xs font-bold text-emerald-600 hover:underline">
              Logs
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
