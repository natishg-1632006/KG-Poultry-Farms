import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords } from '../services/dbService';
import { formatFeedStock, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { ClipboardList, Wheat, Syringe, Truck, Activity, ArrowRight } from 'lucide-react';

export const FarmerDashboard = () => {
  const { userProfile } = useAuth();
  const [assignedBatches, setAssignedBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmerData();
  }, [userProfile]);

  async function loadFarmerData() {
    try {
      const allBatches = await dbGetBatches();
      const farmerBatches = allBatches.filter(
        b => b.assignedFarmerId === userProfile?.uid || 
             b.assignedFarmerName === userProfile?.name ||
             userProfile?.assignedBatches?.includes(b.batchNumber) ||
             userProfile?.assignedBatches?.includes(b.id)
      );
      
      setAssignedBatches(farmerBatches);
      const currentActive = farmerBatches.find(b => b.status === 'Active') || farmerBatches[0];
      setActiveBatch(currentActive);

      if (currentActive) {
        const rMap = await dbGetDailyRecords(currentActive.id);
        setRecords(Object.values(rMap).sort((a, b) => b.recordDate.localeCompare(a.recordDate)));
      }
    } catch (err) {
      console.error('Failed loading farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Farmer Portal...</div>;
  }

  const remainingChicks = activeBatch ? (activeBatch.remainingChickCount ?? activeBatch.initialChickCount) : 0;
  const feedStock = activeBatch?.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Farmer Operations Portal</h1>
          <p className="text-sm font-medium text-slate-500">
            Welcome back, {userProfile?.name}! Farm: {userProfile?.farmName || 'Assigned Shed'}
          </p>
        </div>
        {activeBatch && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800">
            <span>Current Batch: {activeBatch.batchNumber} ({activeBatch.batchName})</span>
            <Badge variant={activeBatch.status}>{activeBatch.status}</Badge>
          </div>
        )}
      </div>

      {!activeBatch ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
          <p className="font-bold text-base">No Active Batch Assigned</p>
          <p className="text-xs mt-1">Please contact your Administrator to assign you an active farm batch.</p>
        </div>
      ) : (
        <>
          {/* Metrics Overview showing Bags & Kg */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Remaining Chickens"
              value={remainingChicks.toLocaleString()}
              subtext={`Initial: ${activeBatch.initialChickCount}`}
              icon={Activity}
              color="emerald"
            />
            <StatCard
              title="Pre-Starter Stock"
              value={formatFeedStock(feedStock['Pre-Starter'] || 0)}
              subtext="First phase (70kg/bag)"
              icon={Wheat}
              color="amber"
            />
            <StatCard
              title="Starter Stock"
              value={formatFeedStock(feedStock['Starter'] || 0)}
              subtext="Growth phase (70kg/bag)"
              icon={Wheat}
              color="indigo"
            />
            <StatCard
              title="Finisher Stock"
              value={formatFeedStock(feedStock['Finisher'] || 0)}
              subtext="Final phase (70kg/bag)"
              icon={Wheat}
              color="blue"
            />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/daily-records"
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">Daily Farm Entry</h3>
                <p className="mt-1 text-xs text-slate-500">Record mortality, daily feed consumption & average chicken weight.</p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-emerald-600">
                Log Today's Entry <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>

            <Link
              to="/feed"
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Wheat className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">Feed Stock Receive</h3>
                <p className="mt-1 text-xs text-slate-500">Log incoming feed bags (70 kg/bag) & vehicle records.</p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-amber-600">
                Receive Feed Bags <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>

            <Link
              to="/medicine"
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Syringe className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">Medicine & Vaccine</h3>
                <p className="mt-1 text-xs text-slate-500">Log medicines, multiple vaccines & vaccinator details.</p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-purple-600">
                Record Medication <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>

            <Link
              to="/dispatch"
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">Dispatch Box Sets</h3>
                <p className="mt-1 text-xs text-slate-500">Log vehicle dispatches, box empty/loaded weights and chicken counts.</p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-indigo-600">
                Dispatch Weighing <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>
          </div>

          {/* Recent Daily Records Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Recent Daily Operational Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="pb-3 px-2">Date</th>
                    <th className="pb-3 px-2">Mortality</th>
                    <th className="pb-3 px-2">Remaining Chicks</th>
                    <th className="pb-3 px-2">Feed Type Used</th>
                    <th className="pb-3 px-2">Feed Consumed</th>
                    <th className="pb-3 px-2 text-right">Avg Weight (g)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400">No daily records logged for this batch yet.</td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const bagsUsed = kgToBags(r.feedConsumption || 0, KG_PER_BAG);
                      return (
                        <tr key={r.recordDate} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-bold text-slate-900">{r.recordDate}</td>
                          <td className="py-3 px-2 font-bold text-rose-600">{r.mortalityCount}</td>
                          <td className="py-3 px-2 text-emerald-700 font-bold">{r.remainingChickCount}</td>
                          <td className="py-3 px-2 text-slate-700">{r.feedType}</td>
                          <td className="py-3 px-2 text-slate-700">{bagsUsed} Bags ({r.feedConsumption} kg)</td>
                          <td className="py-3 px-2 text-right font-bold text-slate-900">{r.averageWeight} g</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
