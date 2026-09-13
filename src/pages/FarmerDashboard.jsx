import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbGetFeedArrivals } from '../services/dbService';
import { formatFeedStock, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { WeatherWidget } from '../components/common/WeatherWidget';
import { ClipboardList, Wheat, Syringe, Truck, Activity, ArrowRight, Layers, AlertCircle, Scale, Calendar } from 'lucide-react';

export const FarmerDashboard = () => {
  const { userProfile } = useAuth();
  const [assignedBatches, setAssignedBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [feedArrivals, setFeedArrivals] = useState([]);
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
        const [rMap, fList] = await Promise.all([
          dbGetDailyRecords(currentActive.id),
          dbGetFeedArrivals(currentActive.id)
        ]);
        setRecords(Object.values(rMap).sort((a, b) => b.recordDate.localeCompare(a.recordDate)));
        setFeedArrivals(fList || []);
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

  const initialChicks = activeBatch ? Number(activeBatch.initialChickCount || 0) : 0;
  const totalMortality = records.reduce((acc, r) => acc + Number(r.mortalityCount || 0), 0);
  const remainingChicks = Math.max(0, initialChicks - totalMortality);

  const totalFeedConsumedBags = records.reduce((acc, r) => {
    const bags = r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG);
    return acc + Number(bags || 0);
  }, 0);

  const totalFeedArrivedBags = feedArrivals.reduce((acc, f) => {
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * KG_PER_BAG) + Number(f.additionalKg || 0)));
    const bags = totalKg / KG_PER_BAG;
    if (isReturn) {
      return acc - bags;
    } else {
      return acc + bags;
    }
  }, 0);

  const totalArrivedBagsFinal = Math.max(0, totalFeedArrivedBags);

  const consumedStr = Number.isInteger(totalFeedConsumedBags) ? totalFeedConsumedBags : parseFloat(totalFeedConsumedBags.toFixed(1));
  const arrivedStr = Number.isInteger(totalArrivedBagsFinal) ? totalArrivedBagsFinal : parseFloat(totalArrivedBagsFinal.toFixed(1));

  const latestRecord = records.length > 0 ? records[0] : null;
  const latestAvgWeight = latestRecord ? Number(latestRecord.averageWeight || 0) : 0;

  let flockAgeDays = 1;
  if (activeBatch?.chickArrivalDate) {
    const arrivalDate = new Date(activeBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    flockAgeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

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
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-2 text-xs font-bold text-emerald-900 shadow-xs">
            <span>Current Batch: {activeBatch.batchNumber} ({activeBatch.batchName}) • <strong className="text-emerald-700">Day {flockAgeDays}</strong></span>
            <Badge variant={activeBatch.status}>{activeBatch.status}</Badge>
          </div>
        )}
      </div>

      {/* Live Village Weather & Poultry Advisories */}
      <WeatherWidget />

      {!activeBatch ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900">
          <p className="font-bold text-base">No Active Batch Assigned</p>
          <p className="text-xs mt-1">Please contact your Administrator to assign you an active farm batch.</p>
        </div>
      ) : (
        <>
          {/* 4 Essential KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Chicks Count"
              value={`${Number(remainingChicks).toLocaleString()} / ${initialChicks.toLocaleString()}`}
              subtext="Live / Initial Chicks"
              icon={Activity}
              color="emerald"
            />
            <StatCard
              title="Total Feed Consumed"
              value={`${consumedStr} / ${arrivedStr} Bags`}
              subtext="Consumed / Total Arrived Bags"
              icon={Wheat}
              color="emerald"
            />
            <StatCard
              title="Total Mortality"
              value={totalMortality.toLocaleString()}
              subtext="Cumulative mortality count"
              icon={AlertCircle}
              color="amber"
            />
            <StatCard
              title="Latest Avg Weight"
              value={`${latestAvgWeight} g`}
              subtext={latestRecord ? `Latest entry: ${latestRecord.recordDate}` : 'No daily records yet'}
              icon={Scale}
              color="emerald"
            />
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
                    <th className="pb-3 px-2">Bags Consumed</th>
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
                      const bagsUsed = r.feedConsumptionBags !== undefined ? r.feedConsumptionBags : (r.feedConsumption ? Math.floor(r.feedConsumption / KG_PER_BAG) : 0);
                      const looseKg = r.additionalLooseKg !== undefined && r.additionalLooseKg !== null ? r.additionalLooseKg : (r.feedConsumption ? parseFloat((r.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
                      return (
                        <tr key={r.recordDate} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-bold text-slate-900">{r.recordDate}</td>
                          <td className="py-3 px-2 font-bold text-rose-600">{r.mortalityCount}</td>
                          <td className="py-3 px-2 text-emerald-700 font-bold">{r.remainingChickCount}</td>
                          <td className="py-3 px-2 text-slate-700">{r.feedType}</td>
                          <td className="py-3 px-2 text-slate-700 font-bold">
                            {bagsUsed} Bags{looseKg > 0 ? <span className="text-slate-500 font-normal"> & {looseKg} kg</span> : null}
                          </td>
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
