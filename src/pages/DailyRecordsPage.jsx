import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbSaveDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock } from '../utils/calculations';
import { ClipboardList, AlertCircle, Save, CheckCircle2 } from 'lucide-react';

export const DailyRecordsPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    recordDate: todayStr,
    mortalityCount: 0,
    feedType: 'Pre-Starter',
    feedConsumption: 0,
    averageWeight: 0
  });

  useEffect(() => {
    loadBatches();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadRecordsForBatch(selectedBatchId);
    }
  }, [selectedBatchId]);

  async function loadBatches() {
    try {
      const all = await dbGetBatches();
      let accessible = all;
      if (isFarmer) {
        accessible = all.filter(
          b => b.assignedFarmerId === userProfile?.uid ||
               b.assignedFarmerName === userProfile?.name ||
               userProfile?.assignedBatches?.includes(b.batchNumber) ||
               userProfile?.assignedBatches?.includes(b.id)
        );
      }
      setBatches(accessible);
      if (accessible.length > 0) {
        const active = accessible.find(b => b.status === 'Active') || accessible[0];
        setSelectedBatchId(active.id);
      }
    } catch (err) {
      console.error('Failed loading batches for daily records:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecordsForBatch(bId) {
    try {
      const map = await dbGetDailyRecords(bId);
      setRecordsMap(map || {});
      // Pre-fill form if today's record exists
      if (map && map[todayStr]) {
        const r = map[todayStr];
        setFormData({
          recordDate: r.recordDate,
          mortalityCount: r.mortalityCount || 0,
          feedType: r.feedType || 'Pre-Starter',
          feedConsumption: r.feedConsumption || 0,
          averageWeight: r.averageWeight || 0
        });
      }
    } catch (err) {
      console.error('Failed loading daily records:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = isFarmer && selectedBatch?.status !== 'Active';

  // Handle Date Selection: pre-populate if record already exists for that date
  const handleDateChange = (newDate) => {
    setErrorMsg('');
    setSuccessMsg('');
    const validation = validateRecordDate(newDate, selectedBatch?.chickArrivalDate, todayStr);
    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    if (recordsMap && recordsMap[newDate]) {
      const existing = recordsMap[newDate];
      setFormData({
        recordDate: newDate,
        mortalityCount: existing.mortalityCount || 0,
        feedType: existing.feedType || 'Pre-Starter',
        feedConsumption: existing.feedConsumption || 0,
        averageWeight: existing.averageWeight || 0
      });
    } else {
      setFormData({
        recordDate: newDate,
        mortalityCount: 0,
        feedType: 'Pre-Starter',
        feedConsumption: 0,
        averageWeight: 0
      });
    }
  };

  // Calculate live remaining count preview
  const prevRemaining = selectedBatch ? (selectedBatch.remainingChickCount !== undefined ? Number(selectedBatch.remainingChickCount) : Number(selectedBatch.initialChickCount)) : 0;
  let calculatedRemaining = prevRemaining;
  let calculationError = null;

  try {
    calculatedRemaining = calculateRemainingChickens(prevRemaining, formData.mortalityCount);
  } catch (err) {
    calculationError = err.message;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBatch) {
      setErrorMsg('No batch selected.');
      return;
    }

    if (isReadOnly) {
      setErrorMsg('Batch is not active. Operational record creation is disabled.');
      return;
    }

    const validation = validateRecordDate(formData.recordDate, selectedBatch.chickArrivalDate, todayStr);
    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    if (calculationError) {
      setErrorMsg(calculationError);
      return;
    }

    setSaving(true);
    try {
      // 1. Calculate new feed stock pool
      const currentFeedStock = selectedBatch.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };
      const deductionResult = deductFeedStock(currentFeedStock, formData.feedType, formData.feedConsumption);

      // 2. Save daily record object
      const recordObj = {
        batchId: selectedBatch.id,
        recordDate: formData.recordDate,
        mortalityCount: Number(formData.mortalityCount),
        feedType: formData.feedType,
        feedConsumption: Number(formData.feedConsumption),
        averageWeight: Number(formData.averageWeight),
        remainingChickCount: calculatedRemaining,
        recordedBy: userProfile?.name || 'Farmer'
      };

      await dbSaveDailyRecord(selectedBatch.id, formData.recordDate, recordObj);

      // 3. Deduct feed stock from batch pool
      await dbUpdateBatchFeedStockPool(selectedBatch.id, deductionResult.updatedStock);

      await dbLogAuditEvent(
        'DAILY_RECORD_SAVED',
        `Logged daily record for ${selectedBatch.batchNumber} on ${formData.recordDate} (Mortality: ${formData.mortalityCount}, Consumed: ${formData.feedConsumption}kg)`,
        userProfile?.name
      );

      setSuccessMsg(`Daily record for ${formData.recordDate} saved successfully!`);
      loadRecordsForBatch(selectedBatch.id);
      loadBatches();
    } catch (err) {
      setErrorMsg('Failed saving daily record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const recordsList = Object.values(recordsMap).sort((a, b) => b.recordDate.localeCompare(a.recordDate));

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Daily Farm Records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Daily Farm Records</h1>
          <p className="text-sm font-medium text-slate-500">Record daily mortality, feed consumption, and chicken growth weights.</p>
        </div>
        {selectedBatch && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Select Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batchNumber} - {b.batchName} ({b.status})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-800">
          Batch status is <strong>{selectedBatch?.status}</strong>. Farmers cannot add or edit records on completed batches.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Record Entry Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            {recordsMap[formData.recordDate] ? 'Update Daily Record' : 'New Daily Entry'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Record Date *</label>
              <input
                type="date"
                required
                min={selectedBatch?.chickArrivalDate}
                max={todayStr}
                disabled={isReadOnly}
                value={formData.recordDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Allowed: {selectedBatch?.chickArrivalDate} through today ({todayStr}). Future dates disabled.
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Calculated Remaining Chicks:</span>
                <span className="text-base font-black text-emerald-600">{calculatedRemaining}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Formula: Prev Remaining ({prevRemaining}) - Mortality</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mortality Count *</label>
              <input
                type="number"
                required
                min="0"
                disabled={isReadOnly}
                value={formData.mortalityCount}
                onChange={(e) => setFormData({ ...formData, mortalityCount: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feed Type *</label>
                <select
                  disabled={isReadOnly}
                  value={formData.feedType}
                  onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
                >
                  <option value="Pre-Starter">Pre-Starter</option>
                  <option value="Starter">Starter</option>
                  <option value="Finisher">Finisher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feed Consumed (kg) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  disabled={isReadOnly}
                  value={formData.feedConsumption}
                  onChange={(e) => setFormData({ ...formData, feedConsumption: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Average Chicken Weight (grams) *</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                disabled={isReadOnly}
                value={formData.averageWeight}
                onChange={(e) => setFormData({ ...formData, averageWeight: e.target.value })}
                placeholder="e.g. 58"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50"
              />
            </div>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Daily Record'}
              </button>
            )}
          </form>
        </div>

        {/* History Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Daily Record Log History ({selectedBatch?.batchNumber})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Mortality</th>
                  <th className="pb-3 px-2">Remaining Chicks</th>
                  <th className="pb-3 px-2">Feed Used</th>
                  <th className="pb-3 px-2">Consumption (kg)</th>
                  <th className="pb-3 px-2 text-right">Avg Weight (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recordsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">No daily records for this batch yet.</td>
                  </tr>
                ) : (
                  recordsList.map((r) => (
                    <tr key={r.recordDate} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">{r.recordDate}</td>
                      <td className="py-3 px-2 font-bold text-rose-600">{r.mortalityCount}</td>
                      <td className="py-3 px-2 text-emerald-700 font-bold">{r.remainingChickCount}</td>
                      <td className="py-3 px-2 text-slate-700">{r.feedType}</td>
                      <td className="py-3 px-2 text-slate-700">{r.feedConsumption}</td>
                      <td className="py-3 px-2 text-right font-bold text-slate-900">{r.averageWeight} g</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
