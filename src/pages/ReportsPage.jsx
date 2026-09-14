import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbGetCompanyTargets, dbGetDispatches } from '../services/dbService';
import { calculateDayOfBatch } from '../utils/calculations';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Wheat, Activity } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ReportsPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dailyRecords, setDailyRecords] = useState([]);
  const [targets, setTargets] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchRecords(selectedBatchId);
    }
  }, [selectedBatchId]);

  async function loadData() {
    try {
      setLoading(true);
      const [bList, tObj, dList] = await Promise.all([
        dbGetBatches(),
        dbGetCompanyTargets(),
        dbGetDispatches()
      ]);

      const accessible = bList;

      setBatches(accessible);
      setTargets(tObj);
      setDispatches(dList);

      if (accessible.length > 0) {
        const activeBatches = accessible.filter(b => (b.status || '').toLowerCase() === 'active');
        const defaultBatch = activeBatches.length > 0 
          ? activeBatches[activeBatches.length - 1] 
          : accessible[accessible.length - 1];
        setSelectedBatchId(defaultBatch.id);
        await loadBatchRecords(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading report data:', err);
      setLoading(false);
    }
  }

  async function loadBatchRecords(bId) {
    try {
      const map = await dbGetDailyRecords(bId);
      setDailyRecords(Object.values(map || {}).sort((a, b) => a.recordDate.localeCompare(b.recordDate)));
    } catch (err) {
      console.error('Failed loading daily records for reports:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  if (loading) return <LoadingSpinner message="Loading Analytics & Reports..." />;

  // Prepare chart dataset for selected batch
  const chartData = dailyRecords.map((r) => {
    const dayIdx = selectedBatch ? calculateDayOfBatch(selectedBatch.chickArrivalDate, r.recordDate) : 1;
    const targetWeight = targets?.averageWeight?.[dayIdx] || 0;
    const targetFeed = targets?.feedConsumption?.[dayIdx] || 0;
    const actualFeedGramPerBird = r.remainingChickCount > 0 ? Math.round(((r.feedConsumption || 0) * 1000) / r.remainingChickCount) : 0;

    return {
      date: r.recordDate,
      day: `Day ${dayIdx}`,
      mortality: r.mortalityCount || 0,
      remaining: r.remainingChickCount || 0,
      actualWeight: r.averageWeight || 0,
      targetWeight,
      actualFeedGramPerBird,
      targetFeed,
      feedConsumptionKg: r.feedConsumption || 0,
      feedType: r.feedType
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 truncate">Reports & Analytics</h1>
        </div>
        {selectedBatch && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs font-bold text-slate-500">Select Batch:</span>
            <CustomSelect
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              options={batches.map((b) => ({
                value: b.id,
                label: `${b.batchNumber} - ${b.batchName}`,
              }))}
            />
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          No daily record history available for this batch to render analytics graphs.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Daily Mortality Graph */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-600" />
              Daily Mortality Count Graph ({selectedBatch?.batchNumber})
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="mortality" fill="#e11d48" name="Daily Mortality" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Average Weight Growth vs Company Target */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Average Weight Growth vs Target (grams)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actualWeight" stroke="#059669" strokeWidth={3} name="Actual Weight (g)" />
                  <Line type="monotone" dataKey="targetWeight" stroke="#9333ea" strokeDasharray="5 5" strokeWidth={2} name="Company Target (g)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Feed Consumption vs Target per Bird */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Wheat className="h-5 w-5 text-emerald-600" />
              Feed Consumption per Bird vs Target (g/bird)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actualFeedGramPerBird" stroke="#059669" strokeWidth={3} name="Actual Feed (g/bird)" />
                  <Line type="monotone" dataKey="targetFeed" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} name="Company Target (g)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Daily Total Feed Consumed (kg) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Daily Total Feed Consumed (kg)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="feedConsumptionKg" fill="#4f46e5" name="Feed Consumed (kg)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
