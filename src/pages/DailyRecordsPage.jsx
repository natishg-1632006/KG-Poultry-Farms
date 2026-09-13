import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbSaveDailyRecord, dbDeleteDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { ClipboardList, AlertCircle, Save, CheckCircle2, Edit, Trash2, Layers, Plus, X } from 'lucide-react';

export const DailyRecordsPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    recordDate: todayStr,
    mortalityCount: 0,
    feedType: 'Pre-Starter',
    feedConsumptionBags: 1.5,
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
      if (map && map[todayStr]) {
        const r = map[todayStr];
        const bags = r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG);
        setFormData({
          recordDate: r.recordDate,
          mortalityCount: r.mortalityCount || 0,
          feedType: r.feedType || 'Pre-Starter',
          feedConsumptionBags: bags,
          averageWeight: r.averageWeight || 0
        });
      }
    } catch (err) {
      console.error('Failed loading daily records:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = isFarmer && selectedBatch?.status !== 'Active';

  const handleEditRecord = (record) => {
    setShowForm(true);
    const bags = record.feedConsumptionBags || kgToBags(record.feedConsumption || 0, KG_PER_BAG);
    setFormData({
      recordDate: record.recordDate,
      mortalityCount: record.mortalityCount || 0,
      feedType: record.feedType || 'Pre-Starter',
      feedConsumptionBags: bags,
      averageWeight: record.averageWeight || 0
    });
  };

  const handleDeleteRecord = async (recordDate) => {
    if (!confirm(`Are you sure you want to delete the daily record for ${recordDate}?`)) return;
    try {
      await dbDeleteDailyRecord(selectedBatchId, recordDate);
      await dbLogAuditEvent('DAILY_RECORD_DELETED', `Deleted daily record for ${selectedBatch?.batchNumber} on ${recordDate}`, userProfile?.name);
      setSuccessMsg(`Daily record for ${recordDate} deleted successfully.`);
      loadRecordsForBatch(selectedBatchId);
      loadBatches();
    } catch (err) {
      alert('Failed deleting record.');
    }
  };

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
      const bags = existing.feedConsumptionBags || kgToBags(existing.feedConsumption || 0, KG_PER_BAG);
      setFormData({
        recordDate: newDate,
        mortalityCount: existing.mortalityCount || 0,
        feedType: existing.feedType || 'Pre-Starter',
        feedConsumptionBags: bags,
        averageWeight: existing.averageWeight || 0
      });
    } else {
      setFormData({
        recordDate: newDate,
        mortalityCount: 0,
        feedType: 'Pre-Starter',
        feedConsumptionBags: 1.5,
        averageWeight: 0
      });
    }
  };

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
      const totalBags = Number(formData.feedConsumptionBags) || 0;
      const totalKg = bagsToKg(totalBags, KG_PER_BAG);

      const currentFeedStock = selectedBatch.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };
      const deductionResult = deductFeedStock(currentFeedStock, formData.feedType, totalKg);

      const recordObj = {
        batchId: selectedBatch.id,
        recordDate: formData.recordDate,
        mortalityCount: Number(formData.mortalityCount),
        feedType: formData.feedType,
        feedConsumption: totalKg,
        feedConsumptionBags: totalBags,
        averageWeight: Number(formData.averageWeight),
        remainingChickCount: calculatedRemaining,
        recordedBy: userProfile?.name || 'Farmer'
      };

      await dbSaveDailyRecord(selectedBatch.id, formData.recordDate, recordObj);
      await dbUpdateBatchFeedStockPool(selectedBatch.id, deductionResult.updatedStock);

      await dbLogAuditEvent(
        'DAILY_RECORD_SAVED',
        `Logged daily record for ${selectedBatch.batchNumber} on ${formData.recordDate} (Mortality: ${formData.mortalityCount}, Feed: ${totalBags} Bags)`,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Daily Farm Records</h1>
          <p className="text-sm font-medium text-slate-500">Record daily mortality, feed consumption in Bags, and chicken growth weights.</p>
        </div>
      </div>

      {/* Interactive Farm / Batch Button Selector Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Farm Shed / Batch:</span>
          {!isReadOnly && (
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                showForm
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-600/20'
              }`}
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{showForm ? 'Hide Form' : '+ Record Daily Log'}</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {batches.length === 0 ? (
            <p className="text-xs text-slate-400">No batches available.</p>
          ) : (
            batches.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBatchId(b.id);
                  setShowForm(true);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                  selectedBatchId === b.id
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-600/30'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>{b.batchNumber}</span>
                <span className="opacity-80">({b.batchName}) - {b.status}</span>
              </button>
            ))
          )}
        </div>
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
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-900">
          Batch status is <strong>{selectedBatch?.status}</strong>. Farmers cannot add or edit records on completed batches.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Record Entry Form - Displayed when showForm is true */}
        {showForm && (
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-white p-6 shadow-md transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                {recordsMap[formData.recordDate] ? 'Update Daily Record' : 'New Daily Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Close Form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Feed Type *</label>
                  <select
                    disabled={isReadOnly}
                    value={formData.feedType}
                    onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                  >
                    <option value="Pre-Starter">Pre-Starter</option>
                    <option value="Starter">Starter</option>
                    <option value="Finisher">Finisher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Feed Bags Used *</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    disabled={isReadOnly}
                    value={formData.feedConsumptionBags}
                    onChange={(e) => setFormData({ ...formData, feedConsumptionBags: e.target.value })}
                    placeholder="e.g. 1.5"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>

              {!isReadOnly && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* History Table with Edit and Delete Actions */}
        <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${showForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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
                  <th className="pb-3 px-2">Bags Consumed</th>
                  <th className="pb-3 px-2">Avg Weight (g)</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recordsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No daily records for this batch yet. Click any Farm button or "+ Record Daily Log" to add data.</td>
                  </tr>
                ) : (
                  recordsList.map((r) => {
                    const bags = r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG);
                    return (
                      <tr key={r.recordDate} className="hover:bg-slate-50">
                        <td className="py-3 px-2 font-bold text-slate-900">{r.recordDate}</td>
                        <td className="py-3 px-2 font-bold text-rose-600">{r.mortalityCount}</td>
                        <td className="py-3 px-2 text-emerald-700 font-bold">{r.remainingChickCount}</td>
                        <td className="py-3 px-2 text-slate-700">{r.feedType}</td>
                        <td className="py-3 px-2 text-slate-700 font-bold">{bags} Bags</td>
                        <td className="py-3 px-2 font-bold text-slate-900">{r.averageWeight} g</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditRecord(r)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit Record"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r.recordDate)}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
