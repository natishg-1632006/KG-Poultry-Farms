import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbSaveDailyRecord, dbDeleteDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG, FEED_CONSUMPTION_TARGETS } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { ClipboardList, AlertCircle, Save, CheckCircle2, Edit, Trash2, Layers, Plus, X, Calendar, Package, Scale, Target } from 'lucide-react';

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
  const [showTargetsTable, setShowTargetsTable] = useState(false);

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
  const isReadOnly = selectedBatch?.status === 'Completed';

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
      setErrorMsg('Batch is completed. Operational record creation is disabled.');
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
      setErrorMsg(`Insufficient feed stock available in farm pool! Available: ${effectiveAvailableBags.toFixed(1)} Bags. Requested: ${totalBags} Bags. Please receive feed stock first.`);
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
        recordedBy: userProfile?.name || 'Farmer',
        updatedAt: new Date().toISOString()
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
  const lastRecord = recordsList.length > 0 ? recordsList[0] : null;

  // Compute current flock age day for selected batch
  let currentFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    currentFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  // Compute Target Feed info for selected form date
  let formFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate && formData.recordDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const recDate = new Date(formData.recordDate);
    const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
    formFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  const targetGramPerBird = FEED_CONSUMPTION_TARGETS[formFlockAgeDay] || 20;
  const remainingChicksCount = Number(selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
  const expectedTotalKg = (remainingChicksCount * targetGramPerBird) / 1000;
  const recommendedBags = Math.round(kgToBags(expectedTotalKg, KG_PER_BAG));

  // Compute Last Record feed details
  let lastRecordFlockAgeDay = 1;
  let lastRecordBags = 0;
  let lastRecordTotalKg = 0;
  let lastRecordPerBirdGram = 0;
  let lastRecordTargetGram = 20;

  if (lastRecord) {
    if (selectedBatch?.chickArrivalDate && lastRecord.recordDate) {
      const arrivalDate = new Date(selectedBatch.chickArrivalDate);
      const recDate = new Date(lastRecord.recordDate);
      const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
      lastRecordFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
    lastRecordTargetGram = FEED_CONSUMPTION_TARGETS[lastRecordFlockAgeDay] || 20;
    lastRecordBags = Math.max(1, Math.round(lastRecord.feedConsumptionBags || kgToBags(lastRecord.feedConsumption || 0, KG_PER_BAG)));
    lastRecordTotalKg = lastRecordBags * KG_PER_BAG; // 1 Bag = 70 kg
    const chicksCount = Number(lastRecord.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
    lastRecordPerBirdGram = chicksCount > 0 ? Math.round((lastRecordTotalKg * 1000) / chicksCount) : 0;
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Daily Farm Records...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Daily Farm Records</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">Record daily mortality, feed consumption in Bags, and chicken growth weights.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowTargetsTable(!showTargetsTable)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs w-full sm:w-auto"
          >
            <Target className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{showTargetsTable ? 'Hide Target Reference' : 'Target Feed Standards (Day 1-45)'}</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleOpenNewForm}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Record Daily Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Feed Standards Reference Panel */}
      {showTargetsTable && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Standard Daily Feed Consumption Targets (Day 1 - 45)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Recommended daily feed intake per bird (grams/day) and estimated total for current batch size ({remainingChicksCount} birds).</p>
            </div>
            <button
              onClick={() => setShowTargetsTable(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
              title="Close Reference Panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-500 font-semibold whitespace-nowrap z-10">
                <tr>
                  <th className="p-3">Flock Age (Day)</th>
                  <th className="p-3">Target Intake / Bird</th>
                  <th className="p-3">Est. Total Daily (Kg)</th>
                  <th className="p-3">Est. Total Daily (Bags)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
                {Object.entries(FEED_CONSUMPTION_TARGETS).map(([day, grams]) => {
                  const totalKg = (remainingChicksCount * Number(grams)) / 1000;
                  const bags = kgToBags(totalKg, KG_PER_BAG);
                  const isCurrent = Number(day) === currentFlockAgeDay;
                  return (
                    <tr key={day} className={isCurrent ? 'bg-emerald-50/70 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>Day {day}</span>
                          {isCurrent && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">Current Day</span>}
                        </div>
                      </td>
                      <td className="p-3 font-semibold">{grams} g</td>
                      <td className="p-3">{totalKg.toFixed(1)} kg</td>
                      <td className="p-3 font-bold text-emerald-700">{bags.toFixed(1)} Bags</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last Updated Record KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Last Entry Date"
          value={lastRecord ? lastRecord.recordDate : 'No Entries'}
          subtext={lastRecord ? 'Most recent record date' : 'No daily records logged yet'}
          icon={Calendar}
          color="emerald"
        />
        <StatCard
          title="Last Daily Mortality"
          value={lastRecord ? `${lastRecord.mortalityCount}` : '0'}
          subtext={lastRecord ? `Logged on ${lastRecord.recordDate}` : 'No mortality logged'}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Last Feed Consumed"
          statsBreakdown={
            lastRecord
              ? [
                  { label: 'CONSUMED', value: `${lastRecordBags} Bags`, labelColor: 'text-emerald-600', valueColor: 'text-slate-900' },
                  { label: 'EAT / BIRD', value: `${lastRecordPerBirdGram} g`, labelColor: 'text-orange-600', valueColor: 'text-orange-600' },
                  { label: 'TARGET', value: `${lastRecordTargetGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' }
                ]
              : null
          }
          value={lastRecord ? `${lastRecordBags} Bags (${lastRecordPerBirdGram} g/bird)` : '0 Bags'}
          subtext={lastRecord ? `Day ${lastRecordFlockAgeDay} Target: ${lastRecordTargetGram} g/bird (${lastRecord.recordDate})` : 'No feed logged'}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Last Avg Weight"
          value={lastRecord ? `${lastRecord.averageWeight} g` : '0 g'}
          subtext={lastRecord ? `Body weight on ${lastRecord.recordDate}` : 'No weight logged'}
          icon={Scale}
          color="emerald"
        />
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Feed Bags Used (Whole Bags) *</label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Target Day {formFlockAgeDay}: ~{recommendedBags} Bags ({targetGramPerBird}g/bird)
              </span>
            </div>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Daily Record Log History ({selectedBatch?.batchNumber})
        </h2>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap">
                <th className="pb-3 px-2" title="Date">Date</th>
                <th className="pb-3 px-2" title="Mortality">Mortality</th>
                <th className="pb-3 px-2" title="Bags Consumed">Bags Consumed</th>
                <th className="pb-3 px-2" title="Avg Weight (g)">Avg Weight</th>
                <th className="pb-3 px-2 text-right" title="Actions">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
              {recordsList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No daily records for this batch yet. Click any Farm button or "+ Record Daily Log" to add data.</td>
                </tr>
              ) : (
                recordsList.map((r) => {
                  const bags = Math.max(1, Math.round(r.feedConsumptionBags || kgToBags(r.feedConsumption || 0, KG_PER_BAG)));
                  const totalKg = bags * KG_PER_BAG;
                  const chickCount = Number(r.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
                  const perBirdEat = chickCount > 0 ? Math.round((totalKg * 1000) / chickCount) : 0;
                  return (
                    <tr key={r.recordDate} className="hover:bg-slate-50">
                      <td className="py-3 px-1 font-bold text-slate-900 truncate" title={r.recordDate}>{r.recordDate}</td>
                      <td className="py-3 px-1 font-bold text-rose-600 truncate" title={r.mortalityCount}>{r.mortalityCount}</td>
                      <td className="py-3 px-1 text-slate-700 font-bold truncate" title={`${bags} Bags (${perBirdEat} g/bird)`}>
                        {bags} Bags <span className="text-[10px] font-normal text-slate-500">({perBirdEat}g/bird)</span>
                      </td>
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

