import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetDailyRecords, dbSaveDailyRecord, dbDeleteDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG, FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ClipboardList, AlertCircle, Save, CheckCircle2, Edit, Trash2, Layers, Plus, X, Calendar, Package, Scale, Target, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DailyRecordsPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const historySectionRef = useRef(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTargetsTable, setShowTargetsTable] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const scrollToHistoryTop = () => {
    if (historySectionRef.current) {
      historySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    recordDate: todayStr,
    mortalityCount: '',
    feedConsumptionBags: '',
    additionalLooseKg: '',
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
      setLoading(true);
      const all = await dbGetBatches();
      let accessible = all;
      setBatches(accessible);
      if (accessible.length > 0) {
        const activeBatches = accessible.filter(b => (b.status || '').toLowerCase() === 'active');
        const defaultBatch = activeBatches.length > 0 
          ? activeBatches[activeBatches.length - 1] 
          : accessible[accessible.length - 1];
        setSelectedBatchId(defaultBatch.id);
        await loadRecordsForBatch(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading batches for daily records:', err);
      setLoading(false);
    }
  }

  async function loadRecordsForBatch(bId) {
    try {
      const map = await dbGetDailyRecords(bId);
      setRecordsMap(map || {});
      if (map && map[todayStr]) {
        const r = map[todayStr];
        const bags = r.feedConsumptionBags !== undefined ? r.feedConsumptionBags : (r.feedConsumption ? Math.floor(r.feedConsumption / KG_PER_BAG) : '');
        const looseKg = r.additionalLooseKg !== undefined && r.additionalLooseKg !== null ? r.additionalLooseKg : (r.feedConsumption ? parseFloat((r.feedConsumption % KG_PER_BAG).toFixed(1)) : '');
        setFormData({
          recordDate: r.recordDate,
          mortalityCount: r.mortalityCount !== undefined ? r.mortalityCount : '',
          feedConsumptionBags: bags !== 0 ? bags : '',
          additionalLooseKg: looseKg > 0 ? looseKg : '',
          averageWeight: r.averageWeight !== undefined ? r.averageWeight : ''
        });
      } else {
        setFormData({
          recordDate: todayStr,
          mortalityCount: '',
          feedConsumptionBags: '',
          additionalLooseKg: '',
          averageWeight: ''
        });
      }
    } catch (err) {
      console.error('Failed loading daily records:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = selectedBatch ? (selectedBatch.status || '').toLowerCase() === 'completed' : false;

  const handleOpenNewForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      recordDate: todayStr,
      mortalityCount: '',
      feedConsumptionBags: '',
      additionalLooseKg: '',
      averageWeight: ''
    });
    setShowForm(true);
  };

  const handleEditRecord = (record) => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowForm(true);
    const bags = record.feedConsumptionBags !== undefined ? record.feedConsumptionBags : (record.feedConsumption ? Math.floor(record.feedConsumption / KG_PER_BAG) : '');
    const looseKg = record.additionalLooseKg !== undefined && record.additionalLooseKg !== null ? record.additionalLooseKg : (record.feedConsumption ? parseFloat((record.feedConsumption % KG_PER_BAG).toFixed(1)) : '');
    setFormData({
      recordDate: record.recordDate,
      mortalityCount: record.mortalityCount !== undefined ? record.mortalityCount : '',
      feedConsumptionBags: bags !== 0 ? bags : '',
      additionalLooseKg: looseKg > 0 ? looseKg : '',
      averageWeight: record.averageWeight !== undefined ? record.averageWeight : ''
    });
  };

  const handleDeleteRecord = (recordDate) => {
    if (isReadOnly) return;
    setDeleteModal({
      isOpen: true,
      title: `Delete Daily Record (${recordDate})?`,
      message: `Are you sure you want to delete the daily record for ${recordDate}? Mortality, culls, and feed log for this date will be permanently deleted.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
          await dbDeleteDailyRecord(selectedBatchId, recordDate);
          await dbLogAuditEvent('DAILY_RECORD_DELETED', `Deleted daily record for ${selectedBatch?.batchNumber} on ${recordDate}`, userProfile?.name);
          setSuccessMsg(`Daily record for ${recordDate} deleted successfully.`);
          loadRecordsForBatch(selectedBatchId);
          loadBatches();
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
        } catch (err) {
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
          alert('Failed deleting record.');
        }
      }
    });
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
      const bags = existing.feedConsumptionBags !== undefined ? existing.feedConsumptionBags : (existing.feedConsumption ? Math.floor(existing.feedConsumption / KG_PER_BAG) : '');
      const looseKg = existing.additionalLooseKg !== undefined && existing.additionalLooseKg !== null ? existing.additionalLooseKg : (existing.feedConsumption ? parseFloat((existing.feedConsumption % KG_PER_BAG).toFixed(1)) : '');
      setFormData({
        recordDate: newDate,
        mortalityCount: existing.mortalityCount !== undefined ? existing.mortalityCount : '',
        feedConsumptionBags: bags !== 0 ? bags : '',
        additionalLooseKg: looseKg > 0 ? looseKg : '',
        averageWeight: existing.averageWeight !== undefined ? existing.averageWeight : ''
      });
    } else {
      setFormData({
        recordDate: newDate,
        mortalityCount: '',
        feedConsumptionBags: '',
        additionalLooseKg: '',
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

    const bags = Number(formData.feedConsumptionBags || 0);
    const looseKg = Number(formData.additionalLooseKg || 0);
    const totalKg = (bags * KG_PER_BAG) + looseKg;

    if (bags <= 0 && looseKg <= 0) {
      setErrorMsg('Please enter valid feed consumption (at least 1 whole bag or loose kg).');
      return;
    }

    const currentFeedStock = selectedBatch.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };
    const totalAvailableKg = (Number(currentFeedStock['Pre-Starter']) || 0) + (Number(currentFeedStock['Starter']) || 0) + (Number(currentFeedStock['Finisher']) || 0);

    // If updating an existing record for formData.recordDate, add back the existing record's feed consumption to available pool for validation
    const existingRecord = recordsMap && recordsMap[formData.recordDate];
    const existingKg = existingRecord ? Number(existingRecord.feedConsumption || 0) : 0;

    const effectiveAvailableKg = totalAvailableKg + existingKg;
    const effectiveAvailableBags = kgToBags(effectiveAvailableKg, KG_PER_BAG);

    // Stock availability validation
    if (effectiveAvailableKg < totalKg) {
      setErrorMsg(`Insufficient feed stock available in farm pool! Available: ${effectiveAvailableBags.toFixed(1)} Bags (${effectiveAvailableKg} kg). Requested: ${bags} Bags${looseKg > 0 ? ` & ${looseKg} kg` : ''} (${totalKg} kg). Please receive feed stock first.`);
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
        feedConsumptionBags: bags,
        additionalLooseKg: looseKg,
        averageWeight: weightVal,
        remainingChickCount: calculatedRemaining,
        recordedBy: userProfile?.name || 'Farmer',
        updatedAt: new Date().toISOString()
      };

      await dbSaveDailyRecord(selectedBatch.id, formData.recordDate, recordObj);
      await dbUpdateBatchFeedStockPool(selectedBatch.id, deductionResult.updatedStock);

      await dbLogAuditEvent(
        'DAILY_RECORD_SAVED',
        `Logged daily record for ${selectedBatch.batchNumber} on ${formData.recordDate} (Mortality: ${formData.mortalityCount}, Feed: ${bags} Bags ${looseKg > 0 ? `& ${looseKg} kg` : ''}, Weight: ${weightVal}g)`,
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
  const totalRecords = recordsList.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(totalRecords, startIndex + pageSize);
  const paginatedRecords = recordsList.slice(startIndex, endIndex);

  const lastRecord = recordsList.length > 0 ? recordsList[0] : null;

  // Compute current flock age day for selected batch
  let currentFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    currentFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  // Compute Target Feed & Weight info for selected form date
  let formFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate && formData.recordDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const recDate = new Date(formData.recordDate);
    const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
    formFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  const targetGramPerBird = FEED_CONSUMPTION_TARGETS[formFlockAgeDay] || 20;
  const targetWeightGram = AVERAGE_WEIGHT_TARGETS[formFlockAgeDay] || 58;
  const remainingChicksCount = Number(selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
  const expectedTotalKg = (remainingChicksCount * targetGramPerBird) / 1000;
  const recommendedBags = Math.round(kgToBags(expectedTotalKg, KG_PER_BAG));

  // Compute Last Record feed and weight details
  let lastRecordFlockAgeDay = 1;
  let lastRecordBags = 0;
  let lastRecordLooseKg = 0;
  let lastRecordTotalKg = 0;
  let lastRecordPerBirdGram = 0;
  let lastRecordTargetGram = 20;
  let lastRecordTargetWeightGram = 58;
  let lastRecordWeightDiff = 0;

  if (lastRecord) {
    if (selectedBatch?.chickArrivalDate && lastRecord.recordDate) {
      const arrivalDate = new Date(selectedBatch.chickArrivalDate);
      const recDate = new Date(lastRecord.recordDate);
      const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
      lastRecordFlockAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
    lastRecordTargetGram = FEED_CONSUMPTION_TARGETS[lastRecordFlockAgeDay] || 20;
    lastRecordTargetWeightGram = AVERAGE_WEIGHT_TARGETS[lastRecordFlockAgeDay] || 58;
    lastRecordBags = lastRecord.feedConsumptionBags !== undefined ? lastRecord.feedConsumptionBags : (lastRecord.feedConsumption ? Math.floor(lastRecord.feedConsumption / KG_PER_BAG) : 0);
    lastRecordLooseKg = lastRecord.additionalLooseKg !== undefined && lastRecord.additionalLooseKg !== null ? lastRecord.additionalLooseKg : (lastRecord.feedConsumption ? parseFloat((lastRecord.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
    lastRecordTotalKg = Number(lastRecord.feedConsumption || ((lastRecordBags * KG_PER_BAG) + lastRecordLooseKg));
    const chicksCount = Number(lastRecord.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
    lastRecordPerBirdGram = chicksCount > 0 ? Math.round((lastRecordTotalKg * 1000) / chicksCount) : 0;
    lastRecordWeightDiff = Number(lastRecord.averageWeight || 0) - lastRecordTargetWeightGram;
  }

  // Compute viewingRecord breakdown metrics for popup modal
  let viewingAgeDay = 1;
  let viewingBags = 0;
  let viewingLooseKg = 0;
  let viewingTotalKg = 0;
  let viewingChicks = 0;
  let viewingPerBirdEat = 0;
  let viewingTargetIntake = 20;
  let viewingTargetWeight = 58;
  let viewingEatDiff = 0;
  let viewingWeightDiff = 0;

  if (viewingRecord) {
    if (selectedBatch?.chickArrivalDate && viewingRecord.recordDate) {
      const arrDate = new Date(selectedBatch.chickArrivalDate);
      const rDate = new Date(viewingRecord.recordDate);
      const diffMs = Math.max(0, rDate.getTime() - arrDate.getTime());
      viewingAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
    viewingTargetIntake = FEED_CONSUMPTION_TARGETS[viewingAgeDay] || 20;
    viewingTargetWeight = AVERAGE_WEIGHT_TARGETS[viewingAgeDay] || 58;
    viewingBags = viewingRecord.feedConsumptionBags !== undefined ? viewingRecord.feedConsumptionBags : (viewingRecord.feedConsumption ? Math.floor(viewingRecord.feedConsumption / KG_PER_BAG) : 0);
    viewingLooseKg = viewingRecord.additionalLooseKg || (viewingRecord.feedConsumption ? parseFloat((viewingRecord.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
    viewingTotalKg = Number(viewingRecord.feedConsumption || ((viewingBags * KG_PER_BAG) + viewingLooseKg));
    viewingChicks = Number(viewingRecord.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
    viewingPerBirdEat = viewingChicks > 0 ? Math.round((viewingTotalKg * 1000) / viewingChicks) : 0;
    viewingEatDiff = viewingPerBirdEat - viewingTargetIntake;
    viewingWeightDiff = Number(viewingRecord.averageWeight || 0) - viewingTargetWeight;
  }

  if (loading) return <LoadingSpinner message="Loading Daily Farm Records..." />;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
          Daily Farm Records
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowTargetsTable(!showTargetsTable)}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <Target className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{showTargetsTable ? 'Hide Targets' : 'Target Standards'}</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleOpenNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Record Daily Log</span>
            </button>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Batch Marked as Completed ({selectedBatch?.batchName || selectedBatch?.batchNumber})</p>
              <p className="text-[11px] text-amber-700">This batch is completed. Data entry, edits, and deletions are disabled.</p>
            </div>
          </div>
          <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Target Feed & Weight Standards Reference Panel */}
      {showTargetsTable && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Standard Daily Feed & Growth Weight Targets (Day 1 - 45)</h2>
            </div>
            <button
              onClick={() => setShowTargetsTable(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
              title="Close Reference Panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-72 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-slate-100">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-500 font-semibold whitespace-nowrap z-10">
                <tr>
                  <th className="p-3">Flock Age (Day)</th>
                  <th className="p-3">Target Intake / Bird</th>
                  <th className="p-3">Target Avg Weight</th>
                  <th className="p-3">Est. Total Daily (Kg)</th>
                  <th className="p-3">Est. Total Daily (Bags)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
                {Object.entries(FEED_CONSUMPTION_TARGETS).map(([day, grams]) => {
                  const targetWeight = AVERAGE_WEIGHT_TARGETS[day] || '-';
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
                      <td className="p-3 font-bold text-emerald-800">{targetWeight !== '-' ? `${targetWeight} g` : '-'}</td>
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
                  { label: 'CONSUMED', value: `${lastRecordBags} Bags${lastRecordLooseKg > 0 ? ` & ${lastRecordLooseKg} kg` : ''}`, labelColor: 'text-emerald-600', valueColor: 'text-slate-900' },
                  { label: 'EAT / BIRD', value: `${lastRecordPerBirdGram} g`, labelColor: 'text-orange-600', valueColor: 'text-orange-600' },
                  { label: 'TARGET', value: `${lastRecordTargetGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' }
                ]
              : null
          }
          value={lastRecord ? `${lastRecordBags} Bags${lastRecordLooseKg > 0 ? ` & ${lastRecordLooseKg} kg` : ''} (${lastRecordPerBirdGram} g/bird)` : '0 Bags'}
          subtext={lastRecord ? `Day ${lastRecordFlockAgeDay} Target: ${lastRecordTargetGram} g/bird (${lastRecord.recordDate})` : 'No feed logged'}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Last Avg Weight"
          statsBreakdown={
            lastRecord
              ? [
                  { label: 'ACTUAL', value: `${lastRecord.averageWeight} g`, labelColor: 'text-slate-600', valueColor: 'text-slate-900' },
                  { label: 'TARGET', value: `${lastRecordTargetWeightGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
                  { label: 'DIFF', value: `${lastRecordWeightDiff > 0 ? '+' : ''}${lastRecordWeightDiff} g`, labelColor: lastRecordWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600', valueColor: lastRecordWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600' }
                ]
              : null
          }
          value={lastRecord ? `${lastRecord.averageWeight} g` : '0 g'}
          subtext={
            lastRecord
              ? `Day ${lastRecordFlockAgeDay} Target: ${lastRecordTargetWeightGram} g (${lastRecordWeightDiff > 0 ? '+' : ''}${lastRecordWeightDiff} g vs target)`
              : 'No weight logged'
          }
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
            <CustomDatePicker
              value={formData.recordDate}
              min={selectedBatch?.chickArrivalDate}
              max={todayStr}
              disabled={isReadOnly}
              loggedDates={Object.keys(recordsMap || {})}
              showPending={true}
              onChange={(newDate) => handleDateChange(newDate)}
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
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="block text-xs font-bold text-slate-700">Feed Consumption *</label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap shrink-0">
                Target: ~{recommendedBags} Bags ({targetGramPerBird}g/bird)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Feed Bags Used (Whole Bags) *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={isReadOnly}
                  value={formData.feedConsumptionBags}
                  onChange={(e) => setFormData({ ...formData, feedConsumptionBags: e.target.value })}
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loose Feed (Kg) (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max="69"
                  step="0.5"
                  disabled={isReadOnly}
                  value={formData.additionalLooseKg}
                  onChange={(e) => setFormData({ ...formData, additionalLooseKg: e.target.value })}
                  placeholder="e.g. 15"
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Total Feed Consumed:</span>
              <span className="font-black text-emerald-700">
                {Number(formData.feedConsumptionBags || 0)} Bags
                {Number(formData.additionalLooseKg || 0) > 0 ? ` & ${formData.additionalLooseKg} kg` : ''}
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  ({(Number(formData.feedConsumptionBags || 0) * KG_PER_BAG) + Number(formData.additionalLooseKg || 0)} kg total)
                </span>
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="block text-xs font-bold text-slate-700">Average Chicken Weight (grams) *</label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap shrink-0">
                Target: ~{targetWeightGram} g
              </span>
            </div>
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

      {/* Daily Record Detail Popup Modal */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={`Daily Farm Record (${viewingRecord?.recordDate})`}
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
            {/* Header Badge Row */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Batch Number</span>
                <span className="text-sm font-black text-slate-900">{selectedBatch?.batchNumber} ({selectedBatch?.batchName})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Flock Age</span>
                <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white shadow-2xs">Day {viewingAgeDay}</span>
              </div>
            </div>

            {/* 3 Main Stat Summary Blocks */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/60 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-0.5">Mortality</span>
                <span className="text-base sm:text-lg font-black text-amber-900 block">{viewingRecord.mortalityCount} birds</span>
                <span className="text-[10px] font-medium text-amber-700 block mt-0.5">Remaining: {viewingChicks.toLocaleString()}</span>
              </div>

              <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-200/60 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block mb-0.5">Feed Consumed</span>
                <span className="text-base sm:text-lg font-black text-blue-900 block">
                  {viewingBags} Bags{viewingLooseKg > 0 ? ` & ${viewingLooseKg} kg` : ''}
                </span>
                <span className="text-[10px] font-medium text-blue-700 block mt-0.5">({viewingTotalKg} kg total)</span>
              </div>

              <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/60 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-0.5">Avg Weight</span>
                <span className="text-base sm:text-lg font-black text-emerald-900 block">{viewingRecord.averageWeight} g</span>
                <span className="text-[10px] font-medium text-emerald-700 block mt-0.5">({viewingWeightDiff > 0 ? '+' : ''}{viewingWeightDiff}g vs target)</span>
              </div>
            </div>

            {/* Target Comparison Breakdown */}
            <div className="rounded-xl border border-slate-200/80 p-3.5 bg-white space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1.5">
                Target vs Actual Analysis
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 block">Feed Intake / Bird</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actual:</span>
                    <span className="font-black text-slate-900">{viewingPerBirdEat} g/bird</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target (Day {viewingAgeDay}):</span>
                    <span className="font-bold text-blue-600">{viewingTargetIntake} g/bird</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">Difference:</span>
                    <span className={`font-black ${viewingEatDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {viewingEatDiff > 0 ? '+' : ''}{viewingEatDiff} g
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 block">Body Weight</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actual:</span>
                    <span className="font-black text-slate-900">{viewingRecord.averageWeight} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target (Day {viewingAgeDay}):</span>
                    <span className="font-bold text-blue-600">{viewingTargetWeight} g</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">Difference:</span>
                    <span className={`font-black ${viewingWeightDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {viewingWeightDiff > 0 ? '+' : ''}{viewingWeightDiff} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span>Recorded By: <strong className="text-slate-700">{viewingRecord.recordedBy || 'Farmer'}</strong></span>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const r = viewingRecord;
                    setViewingRecord(null);
                    handleEditRecord(r);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Record</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* History Table with Edit and Delete Actions - Fixed Header & Paginated */}
      <div ref={historySectionRef} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-xs sm:text-base font-black text-slate-900 truncate">
              Daily Record Log History ({selectedBatch?.batchNumber})
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-slate-600 shrink-0 whitespace-nowrap">
              {totalRecords} Entries
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-bold shrink-0 whitespace-nowrap">
            <span>View:</span>
            <CustomSelect
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
                scrollToHistoryTop();
              }}
              options={[10, 20, 30, 40, 50].map((num) => ({ value: num, label: String(num) }))}
            />
            <span className="hidden sm:inline">records</span>
          </div>
        </div>

        {/* DESKTOP VIEW TABLE */}
        <div className="hidden sm:block w-full overflow-auto max-h-[440px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-slate-100">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap z-10 shadow-2xs">
              <tr>
                <th className="p-3" title="Date">Date</th>
                <th className="p-3" title="Mortality">Mortality</th>
                <th className="p-3" title="Bags Consumed">Bags Consumed</th>
                <th className="p-3" title="Avg Weight (g)">Avg Weight</th>
                <th className="p-3 text-right" title="Actions">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No daily records for this batch yet. Click any Farm button or "+ Record Daily Log" to add data.</td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const bags = r.feedConsumptionBags !== undefined ? r.feedConsumptionBags : (r.feedConsumption ? Math.floor(r.feedConsumption / KG_PER_BAG) : 0);
                  const looseKg = r.additionalLooseKg !== undefined && r.additionalLooseKg !== null ? r.additionalLooseKg : (r.feedConsumption ? parseFloat((r.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
                  const totalKg = Number(r.feedConsumption || ((bags * KG_PER_BAG) + looseKg));
                  const chickCount = Number(r.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);
                  const perBirdEat = chickCount > 0 ? Math.round((totalKg * 1000) / chickCount) : 0;

                  let rAgeDay = 1;
                  if (selectedBatch?.chickArrivalDate && r.recordDate) {
                    const arrDate = new Date(selectedBatch.chickArrivalDate);
                    const rDate = new Date(r.recordDate);
                    const diffMs = Math.max(0, rDate.getTime() - arrDate.getTime());
                    rAgeDay = Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
                  }
                  const rTargetWeight = AVERAGE_WEIGHT_TARGETS[rAgeDay] || 58;
                  const rWeightDiff = Number(r.averageWeight || 0) - rTargetWeight;
                  const rDiffStr = rWeightDiff > 0 ? `+${rWeightDiff}g` : `${rWeightDiff}g`;

                  return (
                    <tr
                      key={r.recordDate}
                      onClick={() => setViewingRecord(r)}
                      className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                      title="Click to view detailed daily record breakdown"
                    >
                      <td className="p-3 font-bold text-slate-900" title={r.recordDate}>{r.recordDate}</td>
                      <td className="p-3 font-bold text-rose-600" title={r.mortalityCount}>{r.mortalityCount}</td>
                      <td className="p-3 text-slate-700 font-bold" title={`${bags} Bags${looseKg > 0 ? ` & ${looseKg} kg` : ''} (${perBirdEat} g/bird)`}>
                        {bags} Bags{looseKg > 0 ? <span className="text-slate-500 font-normal"> & {looseKg} kg</span> : null} <span className="text-[10px] font-normal text-slate-500">({perBirdEat}g/bird)</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900" title={`${r.averageWeight} g (Target: ${rTargetWeight}g, Diff: ${rDiffStr})`}>
                        {r.averageWeight} g <span className={`text-[10px] font-semibold ${rWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>({rDiffStr})</span>
                      </td>
                      <td className="p-3 text-right">
                        {!isReadOnly ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRecord(r);
                              }}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
                              title="Edit Record"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(r.recordDate);
                              }}
                              className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW CARDS DESIGN MATCHING USER SCREENSHOT */}
        <div className="block sm:hidden space-y-3.5">
          {totalRecords === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No daily records for this batch yet. Click "+ Record Daily Log" to add data.
            </div>
          ) : (
            paginatedRecords.map((r) => {
              const bags = r.feedConsumptionBags !== undefined ? r.feedConsumptionBags : (r.feedConsumption ? Math.floor(r.feedConsumption / KG_PER_BAG) : 0);
              const looseKg = r.additionalLooseKg !== undefined && r.additionalLooseKg !== null ? r.additionalLooseKg : (r.feedConsumption ? parseFloat((r.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
              const totalKg = Number(r.feedConsumption || ((bags * KG_PER_BAG) + looseKg));
              const chickCount = Number(r.remainingChickCount || selectedBatch?.remainingChickCount || selectedBatch?.initialChickCount || 5000);

              return (
                <div
                  key={r.recordDate}
                  onClick={() => setViewingRecord(r)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3.5"
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-black text-slate-900">{r.recordDate}</span>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Live: {chickCount.toLocaleString()}
                    </span>
                  </div>

                  {/* 3 Color-Coded Stat Blocks */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Mortality */}
                    <div className="rounded-xl bg-rose-50/80 p-2 border border-rose-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-rose-500 block mb-0.5 whitespace-nowrap truncate">
                        MORTALITY
                      </span>
                      <span className="text-base font-black text-rose-700 block">
                        {r.mortalityCount || 0}
                      </span>
                    </div>

                    {/* Feed (Kg) */}
                    <div className="rounded-xl bg-amber-50/80 p-2 border border-amber-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-amber-600 block mb-0.5 whitespace-nowrap truncate">
                        FEED (KG)
                      </span>
                      <span className="text-base font-black text-amber-800 block">
                        {totalKg} kg
                      </span>
                    </div>

                    {/* Avg Weight */}
                    <div className="rounded-xl bg-purple-50/80 p-2 border border-purple-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-purple-600 block mb-0.5 whitespace-nowrap truncate">
                        AVG WEIGHT
                      </span>
                      <span className="text-base font-black text-purple-800 block">
                        {r.averageWeight || 0} g
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span className="font-extrabold text-emerald-700 flex items-center gap-1.5 hover:text-emerald-800">
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      <span>View Details</span>
                    </span>

                    {!isReadOnly && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRecord(r);
                          }}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Edit Record"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(r.recordDate);
                          }}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4 mt-4">
            <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-900">{totalRecords}</span> records (Latest to Oldest)
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  scrollToHistoryTop();
                }}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <div className="px-2 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  scrollToHistoryTop();
                }}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false })}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        loading={deleteModal.loading}
      />
    </div>
  );
};

