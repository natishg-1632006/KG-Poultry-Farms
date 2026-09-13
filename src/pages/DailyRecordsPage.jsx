import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbSaveDailyRecord, dbDeleteDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { Modal } from '../components/common/Modal';
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
    mortalityCount: '',
    feedConsumptionBags: '',
    averageWeight: ''
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
        const bags = Math.max(1, Math.round(r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG)));
        setFormData({
          recordDate: r.recordDate,
          mortalityCount: r.mortalityCount !== undefined ? r.mortalityCount : '',
          feedConsumptionBags: bags,
          averageWeight: r.averageWeight !== undefined ? r.averageWeight : ''
        });
      } else {
        setFormData({
          recordDate: todayStr,
          mortalityCount: '',
          feedConsumptionBags: '',
          averageWeight: ''
        });
      }
    } catch (err) {
      console.error('Failed loading daily records:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = isFarmer && selectedBatch?.status !== 'Active';

  const handleOpenNewForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      recordDate: todayStr,
      mortalityCount: '',
      feedConsumptionBags: '',
      averageWeight: ''
    });
    setShowForm(true);
  };

  const handleEditRecord = (record) => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowForm(true);
    const bags = Math.max(1, Math.round(record.feedConsumptionBags || kgToBags(record.feedConsumption || 0, KG_PER_BAG)));
    setFormData({
      recordDate: record.recordDate,
      mortalityCount: record.mortalityCount !== undefined ? record.mortalityCount : '',
      feedConsumptionBags: bags,
      averageWeight: record.averageWeight !== undefined ? record.averageWeight : ''
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
      const bags = Math.max(1, Math.round(existing.feedConsumptionBags || kgToBags(existing.feedConsumption || 0, KG_PER_BAG)));
      setFormData({
        recordDate: newDate,
        mortalityCount: existing.mortalityCount !== undefined ? existing.mortalityCount : '',
        feedConsumptionBags: bags,
        averageWeight: existing.averageWeight !== undefined ? existing.averageWeight : ''
      });
    } else {
      setFormData({
        recordDate: newDate,
        mortalityCount: '',
        feedConsumptionBags: '',
        averageWeight: ''
      });
    }
  };

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

    // Input Validation Checks
    if (formData.mortalityCount === '' || isNaN(formData.mortalityCount) || Number(formData.mortalityCount) < 0) {
      setErrorMsg('Please enter a valid mortality count (0 or higher).');
      return;
    }

    if (formData.feedConsumptionBags === '' || isNaN(formData.feedConsumptionBags) || Number(formData.feedConsumptionBags) <= 0) {
      setErrorMsg('Please enter valid feed bags used (at least 1 whole bag).');
      return;
    }

    const weightVal = Number(formData.averageWeight);
    if (formData.averageWeight === '' || isNaN(formData.averageWeight) || weightVal <= 0) {
      setErrorMsg('Please enter a valid average chicken weight greater than 0 g (e.g. 58 g).');
      return;
    }

    const totalBags = Math.max(1, Math.round(Number(formData.feedConsumptionBags)));
    const totalKg = bagsToKg(totalBags, KG_PER_BAG);

    const currentFeedStock = selectedBatch.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };
    const totalAvailableKg = (Number(currentFeedStock['Pre-Starter']) || 0) + (Number(currentFeedStock['Starter']) || 0) + (Number(currentFeedStock['Finisher']) || 0);

    // If updating an existing record for formData.recordDate, add back the existing record's feed consumption to available pool for validation
    const existingRecord = recordsMap && recordsMap[formData.recordDate];
    const existingKg = existingRecord ? Number(existingRecord.feedConsumption || 0) : 0;

    const effectiveAvailableKg = totalAvailableKg + existingKg;
    const effectiveAvailableBags = kgToBags(effectiveAvailableKg, KG_PER_BAG);

    // Stock availability validation
    if (effectiveAvailableKg < totalKg) {
      setErrorMsg(`Insufficient feed stock available in farm pool! Available: ${effectiveAvailableBags} Bags. Requested: ${totalBags} Bags. Please receive feed stock first.`);
      return;
    }

    setSaving(true);
    try {
      const deductionResult = deductFeedStock(currentFeedStock, null, totalKg);

      let autoFeedType = 'Pre-Starter';
      if (deductionResult.deductedByType['Pre-Starter'] > 0) autoFeedType = 'Pre-Starter';
      else if (deductionResult.deductedByType['Starter'] > 0) autoFeedType = 'Starter';
      else if (deductionResult.deductedByType['Finisher'] > 0) autoFeedType = 'Finisher';

      const prevRemaining = selectedBatch.remainingChickCount !== undefined ? Number(selectedBatch.remainingChickCount) : Number(selectedBatch.initialChickCount || 5000);
      const calculatedRemaining = calculateRemainingChickens(prevRemaining, Number(formData.mortalityCount));

      const recordObj = {
        batchId: selectedBatch.id,
        recordDate: formData.recordDate,
        mortalityCount: Number(formData.mortalityCount),
        feedType: autoFeedType,
        feedConsumption: totalKg,
        feedConsumptionBags: totalBags,
        averageWeight: weightVal,
        remainingChickCount: calculatedRemaining,
        recordedBy: userProfile?.name || 'Farmer'
      };

      await dbSaveDailyRecord(selectedBatch.id, formData.recordDate, recordObj);
      await dbUpdateBatchFeedStockPool(selectedBatch.id, deductionResult.updatedStock);

      await dbLogAuditEvent(
        'DAILY_RECORD_SAVED',
        `Logged daily record for ${selectedBatch.batchNumber} on ${formData.recordDate} (Mortality: ${formData.mortalityCount}, Feed: ${totalBags} Bags, Weight: ${weightVal}g)`,
        userProfile?.name
      );

      setSuccessMsg(`Daily record for ${formData.recordDate} saved successfully!`);
      setShowForm(false);
      await loadRecordsForBatch(selectedBatch.id);
      await loadBatches();
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
      {/* Page Header with Action Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Daily Farm Records</h1>
          <p className="text-sm font-medium text-slate-500">Record daily mortality, feed consumption in Bags, and chicken growth weights.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenNewForm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Record Daily Log</span>
          </button>
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

      {/* Record Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={recordsMap[formData.recordDate] ? "Update Daily Record" : "New Daily Farm Entry"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200 shadow-2xs">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
            />
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
              placeholder="e.g. 0"
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Feed Bags Used (Whole Bags) *</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              disabled={isReadOnly}
              value={formData.feedConsumptionBags}
              onChange={(e) => setFormData({ ...formData, feedConsumptionBags: e.target.value })}
              placeholder="e.g. 2"
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Average Chicken Weight (grams) *</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              disabled={isReadOnly}
              value={formData.averageWeight}
              onChange={(e) => setFormData({ ...formData, averageWeight: e.target.value })}
              placeholder="e.g. 58"
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
            />
          </div>

          {!isReadOnly && (
            <div className="flex gap-2 pt-2">
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
      </Modal>

      {/* History Table with Edit and Delete Actions - Full Width */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Daily Record Log History ({selectedBatch?.batchNumber})
        </h2>

        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-1 w-[24%] truncate" title="Date">Date</th>
                <th className="pb-3 px-1 w-[16%] truncate" title="Mortality">Mortality</th>
                <th className="pb-3 px-1 w-[24%] truncate" title="Bags Consumed">Bags Consumed</th>
                <th className="pb-3 px-1 w-[20%] truncate" title="Avg Weight (g)">Avg Weight</th>
                <th className="pb-3 px-1 w-[16%] text-right truncate" title="Actions">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recordsList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No daily records for this batch yet. Click any Farm button or "+ Record Daily Log" to add data.</td>
                </tr>
              ) : (
                recordsList.map((r) => {
                  const bags = r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG);
                  return (
                    <tr key={r.recordDate} className="hover:bg-slate-50">
                      <td className="py-3 px-1 font-bold text-slate-900 truncate" title={r.recordDate}>{r.recordDate}</td>
                      <td className="py-3 px-1 font-bold text-rose-600 truncate" title={r.mortalityCount}>{r.mortalityCount}</td>
                      <td className="py-3 px-1 text-slate-700 font-bold truncate" title={`${bags} Bags`}>{bags} Bags</td>
                      <td className="py-3 px-1 font-bold text-slate-900 truncate" title={`${r.averageWeight} g`}>{r.averageWeight} g</td>
                      <td className="py-3 px-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditRecord(r)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Record"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.recordDate)}
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
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
  );
};

