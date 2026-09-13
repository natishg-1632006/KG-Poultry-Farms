import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetCompanyTargets, dbSaveCompanyTargets, dbGetBatches, dbGetDailyRecords, dbLogAuditEvent } from '../services/dbService';
import { calculateDayOfBatch } from '../utils/calculations';
import { Badge } from '../components/common/Badge';
import { Edit2, Save, CheckCircle2, TrendingUp, Wheat } from 'lucide-react';

export const CompanyTargetsPage = () => {
  const { userProfile, isAdmin } = useAuth();
  const [targets, setTargets] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dailyRecords, setDailyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMode, setEditingMode] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'weight'
  const [successMsg, setSuccessMsg] = useState('');

  // Editable copies
  const [editableFeed, setEditableFeed] = useState({});
  const [editableWeight, setEditableWeight] = useState({});

  useEffect(() => {
    loadTargetData();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchRecords(selectedBatchId);
    }
  }, [selectedBatchId]);

  async function loadTargetData() {
    try {
      const [tObj, bList] = await Promise.all([dbGetCompanyTargets(), dbGetBatches()]);
      setTargets(tObj);
      setEditableFeed(tObj.feedConsumption || {});
      setEditableWeight(tObj.averageWeight || {});
      setBatches(bList);
      if (bList.length > 0) {
        setSelectedBatchId(bList[0].id);
      }
    } catch (err) {
      console.error('Failed loading target data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBatchRecords(bId) {
    try {
      const map = await dbGetDailyRecords(bId);
      setDailyRecords(Object.values(map || {}));
    } catch (err) {
      console.error('Failed loading daily records for target comparison:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleSaveTargets = async () => {
    try {
      const payload = {
        feedConsumption: editableFeed,
        averageWeight: editableWeight
      };
      await dbSaveCompanyTargets(payload);
      await dbLogAuditEvent('COMPANY_TARGETS_UPDATED', 'Updated company feed/weight target benchmarks', userProfile?.name);
      setTargets(payload);
      setEditingMode(false);
      setSuccessMsg('Company target benchmarks saved successfully!');
    } catch (err) {
      alert('Failed saving targets: ' + err.message);
    }
  };

  if (loading || !targets) return <div className="p-8 text-center text-slate-500">Loading Company Targets...</div>;

  // Build comparison rows for selected batch
  const maxDays = activeTab === 'feed' ? 45 : 42;
  const daysArray = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Map daily records by day index of batch
  const actualsByDay = {};
  if (selectedBatch && dailyRecords.length > 0) {
    dailyRecords.forEach(r => {
      const dayIdx = calculateDayOfBatch(selectedBatch.chickArrivalDate, r.recordDate);
      if (dayIdx <= maxDays) {
        actualsByDay[dayIdx] = r;
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Company Target Benchmarks</h1>
          <p className="text-sm font-medium text-slate-500">Feed Consumption (Day 1–45) and Average Weight (Day 1–42) target vs actual comparisons.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {!editingMode ? (
              <button
                onClick={() => setEditingMode(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Edit2 className="h-4 w-4" /> Edit Target Benchmarks
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMode(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTargets}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4" /> Save Targets
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs & Batch Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'feed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Wheat className="h-4 w-4" /> Feed Consumption Target (Days 1–45)
          </button>
          <button
            onClick={() => setActiveTab('weight')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'weight' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Average Weight Target (Days 1–42)
          </button>
        </div>

        {selectedBatch && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Compare Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batchNumber} - {b.batchName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Target Comparison Table Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          {activeTab === 'feed' ? 'Feed Consumption Target per Chicken (Day 1 to 45 in Grams)' : 'Average Chicken Weight Target (Day 1 to 42 in Grams)'}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">Batch Day</th>
                <th className="pb-3 px-2">Target Value (g)</th>
                <th className="pb-3 px-2">Actual Value (g)</th>
                <th className="pb-3 px-2">Variance (Diff)</th>
                <th className="pb-3 px-2 text-right">Performance Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {daysArray.map((day) => {
                const targetVal = activeTab === 'feed'
                  ? (editableFeed[day] ?? 0)
                  : (editableWeight[day] ?? 0);

                const actualRecord = actualsByDay[day];
                let actualVal = null;
                if (actualRecord) {
                  if (activeTab === 'feed') {
                    // Feed per chicken = (total feed in kg * 1000) / remaining count
                    const feedKg = actualRecord.feedConsumption || 0;
                    const chicks = actualRecord.remainingChickCount || 1;
                    actualVal = Math.round((feedKg * 1000) / chicks);
                  } else {
                    actualVal = actualRecord.averageWeight || 0;
                  }
                }

                const diff = actualVal !== null ? actualVal - targetVal : null;

                return (
                  <tr key={day} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-bold text-slate-900">Day {day}</td>
                    <td className="py-2.5 px-2">
                      {editingMode ? (
                        <input
                          type="number"
                          value={targetVal}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeTab === 'feed') {
                              setEditableFeed({ ...editableFeed, [day]: val });
                            } else {
                              setEditableWeight({ ...editableWeight, [day]: val });
                            }
                          }}
                          className="w-20 rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold"
                        />
                      ) : (
                        <span className="font-bold text-emerald-700">{targetVal} g</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-slate-800">
                      {actualVal !== null ? `${actualVal} g` : <span className="text-slate-300 italic">No record</span>}
                    </td>
                    <td className="py-2.5 px-2">
                      {diff !== null ? (
                        <span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diff >= 0 ? `+${diff}` : diff} g
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {diff === null ? (
                        <span className="text-slate-400 text-[10px]">Pending</span>
                      ) : diff >= 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          On / Above Target
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          Below Target
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
