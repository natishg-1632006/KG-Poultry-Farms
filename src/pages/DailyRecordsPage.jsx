import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetDailyRecords, dbGetDispatches, dbGetFeedArrivals, dbSaveDailyRecord, dbDeleteDailyRecord, dbUpdateBatchFeedStockPool, dbLogAuditEvent } from '../services/dbService';
import { calculateRemainingChickens, validateRecordDate, deductFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG, FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ClipboardList, AlertCircle, Save, CheckCircle2, Edit, Trash2, Layers, Plus, X, Calendar, Package, Scale, Target, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { syncDailyDataEntryReminders } from '../services/notificationService';
import { sendToSupervisorWhatsApp } from '../utils/whatsappHelper';

const WhatsAppIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

export const DailyRecordsPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const { t, language } = useLanguage();
  const historySectionRef = useRef(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [recordsMap, setRecordsMap] = useState({});
  const [dispatches, setDispatches] = useState([]);
  const [feedArrivals, setFeedArrivals] = useState([]);
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
        const defaultBatch = accessible[0];
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
      const [map, dispList, feedList] = await Promise.all([
        dbGetDailyRecords(bId),
        dbGetDispatches(),
        dbGetFeedArrivals(bId)
      ]);
      setRecordsMap(map || {});
      setDispatches((dispList || []).filter(d => d.batchId === bId));
      setFeedArrivals(feedList || []);
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
      await syncDailyDataEntryReminders().catch(() => {});

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

  const handleSendToSupervisor = (record) => {
    if (!record) return;
    sendToSupervisorWhatsApp(record, selectedBatch?.chickArrivalDate);
  };

  // Compute current flock age day for selected batch
  let currentFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const today = new Date();
    const diffMs = Math.max(0, today.getTime() - arrivalDate.getTime());
    currentFlockAgeDay = Math.min(45, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
  }

  // Compute Target Feed & Weight info for selected form date
  let formFlockAgeDay = 1;
  if (selectedBatch?.chickArrivalDate && formData.recordDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const recDate = new Date(formData.recordDate);
    const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
    formFlockAgeDay = Math.min(45, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
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
      lastRecordFlockAgeDay = Math.min(45, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
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
      viewingAgeDay = Math.min(45, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
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

  // Compute Completed Batch metrics for KPI cards when batch is completed
  const isBatchCompleted = (selectedBatch?.status || '').toLowerCase() === 'completed';

  const totalMortality = recordsList.reduce((acc, r) => acc + Number(r.mortalityCount || 0), 0);
  const initialChicks = Number(selectedBatch?.initialChickCount || 0);
  const mortalityPct = initialChicks > 0 ? ((totalMortality / initialChicks) * 100).toFixed(1) : '0.0';

  const totalDispatchedBirds = dispatches.reduce((acc, d) => {
    const setsRaw = d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    return acc + (setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || 0));
  }, 0);

  const totalDispatchedWeight = dispatches.reduce((acc, d) => {
    const setsRaw = d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);
    return acc + (setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || 0));
  }, 0);

  const dispatchedAvgWeightGrams = totalDispatchedBirds > 0
    ? Math.round((totalDispatchedWeight / totalDispatchedBirds) * 1000)
    : (lastRecord ? Number(lastRecord.averageWeight || 0) : 0);

  const totalFeedArrivedBags = feedArrivals.reduce((acc, f) => {
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * KG_PER_BAG) + Number(f.additionalKg || 0)));
    const bags = totalKg / KG_PER_BAG;
    return isReturn ? acc - bags : acc + bags;
  }, 0);
  const totalArrivedBagsFinal = Math.max(0, totalFeedArrivedBags);
  const hasReturns = feedArrivals.some(f => f.transactionType === 'Return');

  const rawConsumedBags = recordsList.reduce((acc, r) => {
    const bags = r.feedConsumptionBags || (r.feedConsumption ? r.feedConsumption / KG_PER_BAG : 0);
    return acc + Number(bags || 0);
  }, 0);

  const totalFeedConsumedBags = (hasReturns || isBatchCompleted) && totalArrivedBagsFinal > 0
    ? Math.min(rawConsumedBags, totalArrivedBagsFinal)
    : rawConsumedBags;

  const totalFeedConsumedKg = totalFeedConsumedBags * KG_PER_BAG;
  const displayConsumedBagsStr = Number.isInteger(totalFeedConsumedBags) ? totalFeedConsumedBags : parseFloat(totalFeedConsumedBags.toFixed(1));

  const finalBirdsForFeed = totalDispatchedBirds > 0 ? totalDispatchedBirds : Math.max(1, initialChicks - totalMortality);
  const finalFeedPerBirdGram = finalBirdsForFeed > 0 ? Math.round((totalFeedConsumedKg * 1000) / finalBirdsForFeed) : 0;

  let finalFlockAgeDay = lastRecordFlockAgeDay;
  if (selectedBatch?.chickArrivalDate && lastRecord?.recordDate) {
    const arrivalDate = new Date(selectedBatch.chickArrivalDate);
    const recDate = new Date(lastRecord.recordDate);
    const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
    finalFlockAgeDay = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  let cumulativeTargetGramPerBird = 0;
  for (let day = 1; day <= finalFlockAgeDay; day++) {
    cumulativeTargetGramPerBird += (FEED_CONSUMPTION_TARGETS[day] || FEED_CONSUMPTION_TARGETS[45] || 167);
  }

  const finalDayTargetWeightGram = AVERAGE_WEIGHT_TARGETS[Math.min(45, finalFlockAgeDay)] || AVERAGE_WEIGHT_TARGETS[45] || 2438;
  const finalDayWeightDiff = dispatchedAvgWeightGrams - finalDayTargetWeightGram;

  let minDailyRecordDate = null;
  if (selectedBatch?.chickArrivalDate) {
    const arrDate = new Date(selectedBatch.chickArrivalDate);
    arrDate.setDate(arrDate.getDate() + 1);
    minDailyRecordDate = arrDate.toISOString().split('T')[0];
  }

  if (loading) return <LoadingSpinner message="Loading Daily Farm Records..." />;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
          {t('dailyFarmRecords')}
        </h1>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Send to Supervisor WhatsApp Button (Enabled if today's record is entered, disabled if not) */}
          <button
            onClick={() => handleSendToSupervisor(recordsMap[todayStr])}
            disabled={!recordsMap || !recordsMap[todayStr]}
            title={
              recordsMap && recordsMap[todayStr]
                ? (language === 'ta' ? 'மேற்பார்வையாளருக்கு இன்றைய பதிவை அனுப்பு' : 'Send today\'s record to Supervisor on WhatsApp')
                : (language === 'ta' ? 'இன்றைய பதிவு இன்னும் சேர்க்கப்படவில்லை' : 'Today\'s daily entry is not logged yet')
            }
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer ${
              recordsMap && recordsMap[todayStr]
                ? 'bg-[#25D366] hover:bg-[#1faa53] text-white active:scale-95 shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
            }`}
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>{t('sendToSupervisor')}</span>
          </button>

          <button
            onClick={() => setShowTargetsTable(!showTargetsTable)}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <Target className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{showTargetsTable ? 'Hide Targets' : t('targetStandards')}</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleOpenNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t('recordDailyLog')}</span>
            </button>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Batch Marked as Completed ({selectedBatch?.batchName || selectedBatch?.batchNumber})</p>
              <p className="text-[11px] text-amber-700 leading-tight">This batch is completed. Data entry, edits, and deletions are disabled.</p>
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-md bg-amber-200/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
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

      {/* Last Updated Record / Completed Batch KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={isBatchCompleted ? (language === 'ta' ? 'மொத்த நாட்கள்' : 'TOTAL FLOCK AGE') : t('lastEntryDate')}
          value={isBatchCompleted ? `${lastRecord ? lastRecord.recordDate : ''} (Day ${finalFlockAgeDay})` : (lastRecord ? lastRecord.recordDate : 'No Entries')}
          subtext={isBatchCompleted ? (language === 'ta' ? `தொகுதி முடிந்தது (${totalRecords} பதிவுகள்)` : `Batch Completed (${totalRecords} entries)`) : (lastRecord ? t('mostRecentRecordDate') : 'No daily records logged yet')}
          icon={Calendar}
          color="emerald"
        />
        <StatCard
          title={isBatchCompleted ? (language === 'ta' ? 'மொத்த இறப்பு' : 'TOTAL MORTALITY') : t('lastDailyMortality')}
          value={isBatchCompleted ? totalMortality.toLocaleString() : (lastRecord ? `${lastRecord.mortalityCount}` : '0')}
          subtext={isBatchCompleted ? (language === 'ta' ? `மொத்த இறப்பு எண்ணிக்கை (${mortalityPct}%)` : `Cumulative mortality count (${mortalityPct}%)`) : (lastRecord ? `Logged on ${lastRecord.recordDate}` : 'No mortality logged')}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title={isBatchCompleted ? (language === 'ta' ? 'மொத்த தீவனப் பயன்பாடு' : 'TOTAL FEED CONSUMED') : t('lastFeedConsumed')}
          statsBreakdown={
            isBatchCompleted
              ? [
                  { label: t('consumed'), value: `${displayConsumedBagsStr} Bags`, labelColor: 'text-emerald-600', valueColor: 'text-slate-900' },
                  { label: t('eatBird'), value: `${finalFeedPerBirdGram} g`, labelColor: 'text-orange-600', valueColor: 'text-orange-600' },
                  { label: t('target'), value: `${cumulativeTargetGramPerBird} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' }
                ]
              : (lastRecord
                  ? [
                      { label: t('consumed'), value: `${lastRecordBags} Bags${lastRecordLooseKg > 0 ? ` + ${lastRecordLooseKg}kg` : ''}`, labelColor: 'text-emerald-600', valueColor: 'text-slate-900' },
                      { label: t('eatBird'), value: `${lastRecordPerBirdGram} g`, labelColor: 'text-orange-600', valueColor: 'text-orange-600' },
                      { label: t('target'), value: `${lastRecordTargetGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' }
                    ]
                  : null)
          }
          value={isBatchCompleted ? `${displayConsumedBagsStr} Bags (${finalFeedPerBirdGram} g/bird)` : (lastRecord ? `${lastRecordBags} Bags${lastRecordLooseKg > 0 ? ` & ${lastRecordLooseKg} kg` : ''} (${lastRecordPerBirdGram} g/bird)` : '0 Bags')}
          subtext={isBatchCompleted ? (language === 'ta' ? 'முடிவுற்ற தொகுதியின் மொத்த தீவனப் பயன்பாடு' : 'Total feed consumed for completed batch') : (lastRecord ? `Day ${lastRecordFlockAgeDay} Target: ${lastRecordTargetGram} g/bird (${lastRecord.recordDate})` : 'No feed logged')}
          icon={Package}
          color="blue"
        />
        <StatCard
          title={isBatchCompleted ? (language === 'ta' ? 'இறுதி சராசரி எடை' : 'FINAL AVG WEIGHT') : t('lastAvgWeight')}
          statsBreakdown={
            isBatchCompleted
              ? [
                  { label: t('actual'), value: `${dispatchedAvgWeightGrams} g`, labelColor: 'text-slate-600', valueColor: 'text-slate-900' },
                  { label: t('target'), value: `${finalDayTargetWeightGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
                  { label: t('diff'), value: `${finalDayWeightDiff > 0 ? '+' : ''}${finalDayWeightDiff} g`, labelColor: finalDayWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600', valueColor: finalDayWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600' }
                ]
              : (lastRecord
                  ? [
                      { label: t('actual'), value: `${lastRecord.averageWeight} g`, labelColor: 'text-slate-600', valueColor: 'text-slate-900' },
                      { label: t('target'), value: `${lastRecordTargetWeightGram} g`, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
                      { label: t('diff'), value: `${lastRecordWeightDiff > 0 ? '+' : ''}${lastRecordWeightDiff} g`, labelColor: lastRecordWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600', valueColor: lastRecordWeightDiff < 0 ? 'text-rose-600' : 'text-emerald-600' }
                    ]
                  : null)
          }
          value={isBatchCompleted ? `${dispatchedAvgWeightGrams} g` : (lastRecord ? `${lastRecord.averageWeight} g` : '0 g')}
          subtext={
            isBatchCompleted
              ? (language === 'ta' ? 'விற்பனை தரவு அடிப்படையிலான சராசரி எடை' : 'Dispatched Avg Weight (Total Wt / Dispatched Birds)')
              : (lastRecord
                  ? `Day ${lastRecordFlockAgeDay} Target: ${lastRecordTargetWeightGram} g (${lastRecordWeightDiff > 0 ? '+' : ''}${lastRecordWeightDiff} g vs target)`
                  : 'No weight logged')
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
        title={recordsMap[formData.recordDate] ? (language === 'ta' ? "தினசரி பதிவைப் புதுப்பிக்கவும்" : "Update Daily Record") : (language === 'ta' ? "புதிய தினசரி பண்ணைப் பதிவு" : "New Daily Farm Entry")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200 shadow-2xs">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'பதிவு தேதி *' : 'Record Date *'}</label>
            <CustomDatePicker
              value={formData.recordDate}
              min={minDailyRecordDate}
              max={todayStr}
              disabled={isReadOnly}
              loggedDates={Object.keys(recordsMap || {})}
              showPending={true}
              onChange={(newDate) => handleDateChange(newDate)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'இறப்பு எண்ணிக்கை *' : 'Mortality Count *'}</label>
            <input
              type="number"
              required
              min="0"
              disabled={isReadOnly}
              value={formData.mortalityCount}
              onChange={(e) => setFormData({ ...formData, mortalityCount: e.target.value })}
              placeholder={language === 'ta' ? 'எ.கா. 0' : 'e.g. 0'}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between mb-1 gap-1.5">
              <label className="block text-xs font-bold text-slate-700">{language === 'ta' ? 'தீவனப் பயன்பாடு *' : 'Feed Consumption *'}</label>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                {language === 'ta' ? `இலக்கு: ~${recommendedBags} பைகள் (${targetGramPerBird}g)` : `Target: ~${recommendedBags} Bags (${targetGramPerBird}g/bird)`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{language === 'ta' ? 'பயன்படுத்திய தீவனப் பைகள் *' : 'Feed Bags Used (Whole Bags) *'}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={isReadOnly}
                  value={formData.feedConsumptionBags}
                  onChange={(e) => setFormData({ ...formData, feedConsumptionBags: e.target.value })}
                  placeholder={language === 'ta' ? 'எ.கா. 2' : 'e.g. 2'}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{language === 'ta' ? 'கூடுதல் தீவனம் (கிலோ) (விருப்பத்தேர்வு)' : 'Loose Feed (Kg) (Optional)'}</label>
                <input
                  type="number"
                  min="0"
                  max="69"
                  step="0.5"
                  disabled={isReadOnly}
                  value={formData.additionalLooseKg}
                  onChange={(e) => setFormData({ ...formData, additionalLooseKg: e.target.value })}
                  placeholder={language === 'ta' ? 'எ.கா. 15' : 'e.g. 15'}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 text-xs gap-1">
              <span className="text-slate-500 font-bold">{language === 'ta' ? 'மொத்த தீவனம்:' : 'Total Feed Consumed:'}</span>
              <span className="font-black text-emerald-700">
                {Number(formData.feedConsumptionBags || 0)} {language === 'ta' ? 'பைகள்' : 'Bags'}
                {Number(formData.additionalLooseKg || 0) > 0 ? (language === 'ta' ? ` & ${formData.additionalLooseKg} கிலோ` : ` & ${formData.additionalLooseKg} kg`) : ''}
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  ({(Number(formData.feedConsumptionBags || 0) * KG_PER_BAG) + Number(formData.additionalLooseKg || 0)} {language === 'ta' ? 'கிலோ மொத்தம்' : 'kg total'})
                </span>
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between mb-1 gap-1.5">
              <label className="block text-xs font-bold text-slate-700">{language === 'ta' ? 'சராசரி எடை (கிராம்) *' : 'Average Chicken Weight (grams) *'}</label>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                {language === 'ta' ? `இலக்கு: ~${targetWeightGram} கி` : `Target: ~${targetWeightGram} g`}
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
              placeholder={language === 'ta' ? 'எ.கா. 58' : 'e.g. 58'}
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
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : (language === 'ta' ? 'பதிவைச் சேமி' : 'Save Record')}
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* Daily Record Detail Popup Modal */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={language === 'ta' ? `தினசரி பண்ணைப் பதிவு (${viewingRecord?.recordDate})` : `Daily Farm Record (${viewingRecord?.recordDate})`}
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
            {/* Header Badge Row */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{language === 'ta' ? 'தொகுதி எண்' : 'Batch Number'}</span>
                <span className="text-sm font-black text-slate-900">{selectedBatch?.batchNumber} ({selectedBatch?.batchName})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{language === 'ta' ? 'கோழி வயது' : 'Flock Age'}</span>
                <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white shadow-2xs">{language === 'ta' ? 'நாள்' : 'Day'} {viewingAgeDay}</span>
              </div>
            </div>

            {/* 3 Main Stat Summary Blocks */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-amber-50/70 p-2.5 sm:p-3 border border-amber-200/60 text-center min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-0.5 whitespace-nowrap truncate">{language === 'ta' ? 'இறப்பு' : 'Mortality'}</span>
                <span className="text-sm sm:text-lg font-black text-amber-900 block whitespace-nowrap truncate">{viewingRecord.mortalityCount}</span>
                <span className="text-[10px] font-extrabold text-amber-700 block mt-0.5 whitespace-nowrap truncate">{language === 'ta' ? 'மீதி:' : 'Remaining:'} {viewingChicks.toLocaleString()}</span>
              </div>

              <div className="rounded-xl bg-blue-50/70 p-2.5 sm:p-3 border border-blue-200/60 text-center min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-700 block mb-0.5 whitespace-nowrap truncate">{language === 'ta' ? 'தீவனம்' : 'Feed Consumed'}</span>
                <span className="text-sm sm:text-lg font-black text-blue-900 block whitespace-nowrap truncate">
                  {viewingTotalKg} kg
                </span>
                <span className="text-[10px] font-extrabold text-blue-700 block mt-0.5 whitespace-nowrap truncate">
                  ({viewingBags} {language === 'ta' ? 'பைகள்' : 'Bags'})
                </span>
              </div>

              <div className="rounded-xl bg-emerald-50/70 p-2.5 sm:p-3 border border-emerald-200/60 text-center min-w-0 overflow-hidden flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-0.5 whitespace-nowrap truncate">{language === 'ta' ? 'சராசரி எடை' : 'Avg Weight'}</span>
                <span className="text-sm sm:text-lg font-black text-emerald-900 block whitespace-nowrap truncate">{viewingRecord.averageWeight} g</span>
              </div>
            </div>

            {/* Target Comparison Breakdown */}
            <div className="rounded-xl border border-slate-200/80 p-3.5 bg-white space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1.5">
                {language === 'ta' ? 'இலக்கு ஒப்பீடு பகுப்பாய்வு' : 'Target vs Actual Analysis'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 block">{language === 'ta' ? 'ஒரு கோழிக்கான தீவனம்' : 'Feed Intake / Bird'}</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'ta' ? 'உண்மை:' : 'Actual:'}</span>
                    <span className="font-black text-slate-900">{viewingPerBirdEat} g/{language === 'ta' ? 'கோழி' : 'bird'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'ta' ? 'இலக்கு (நாள்' : 'Target (Day'} {viewingAgeDay}):</span>
                    <span className="font-bold text-blue-600">{viewingTargetIntake} g/{language === 'ta' ? 'கோழி' : 'bird'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">{language === 'ta' ? 'வித்தியாசம்:' : 'Difference:'}</span>
                    <span className={`font-black ${viewingEatDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {viewingEatDiff > 0 ? '+' : ''}{viewingEatDiff} g
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 block">{language === 'ta' ? 'உடல் எடை' : 'Body Weight'}</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'ta' ? 'உண்மை:' : 'Actual:'}</span>
                    <span className="font-black text-slate-900">{viewingRecord.averageWeight} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'ta' ? 'இலக்கு (நாள்' : 'Target (Day'} {viewingAgeDay}):</span>
                    <span className="font-bold text-blue-600">{viewingTargetWeight} g</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">{language === 'ta' ? 'வித்தியாசம்:' : 'Difference:'}</span>
                    <span className={`font-black ${viewingWeightDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {viewingWeightDiff > 0 ? '+' : ''}{viewingWeightDiff} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span>{language === 'ta' ? 'பதிவு செய்தவர்:' : 'Recorded By:'} <strong className="text-slate-700">{viewingRecord.recordedBy || 'Farmer'}</strong></span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSendToSupervisor(viewingRecord)}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1faa53] py-2.5 px-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                <span>{t('sendToSupervisorWhatsApp')}</span>
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {language === 'ta' ? 'மூடு' : 'Close'}
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const r = viewingRecord;
                      setViewingRecord(null);
                      handleEditRecord(r);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Edit className="h-4 w-4" />
                    <span>{language === 'ta' ? 'திருத்து' : 'Edit'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* History Table with Edit and Delete Actions - Fixed Header & Paginated */}
      <div ref={historySectionRef} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-xs sm:text-base font-black text-slate-900 truncate">
              {t('dailyRecordLogHistory')} ({selectedBatch?.batchNumber})
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-slate-600 shrink-0 whitespace-nowrap">
              {totalRecords} {t('records')}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-bold shrink-0 whitespace-nowrap">
            <span>{t('view')}:</span>
            <CustomSelect
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
                scrollToHistoryTop();
              }}
              options={[10, 20, 30, 40, 50].map((num) => ({ value: num, label: String(num) }))}
            />
            <span className="hidden sm:inline">{t('records')}</span>
          </div>
        </div>

        {/* DESKTOP VIEW TABLE */}
        <div className="hidden sm:block w-full overflow-auto max-h-[440px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-slate-100">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap z-10 shadow-2xs">
              <tr>
                <th className="p-3" title="Date">{t('date')}</th>
                <th className="p-3" title="Mortality">{t('mortality')}</th>
                <th className="p-3" title="Bags Consumed">{t('bagsConsumed')}</th>
                <th className="p-3" title="Avg Weight (g)">{t('averageBirdWeight')}</th>
                <th className="p-3 text-right" title="Actions">{t('actions')}</th>
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToSupervisor(r);
                            }}
                            className="rounded-lg p-1 text-[#25D366] hover:bg-emerald-50 hover:text-[#1faa53] transition-colors"
                            title={language === 'ta' ? 'மேற்பார்வையாளருக்கு வாட்ஸ்அப் மூலம் அனுப்பு' : 'Send to Supervisor WhatsApp'}
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                          </button>
                          {!isReadOnly ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic ml-1">Locked</span>
                          )}
                        </div>
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
                      {t('liveFlock')}: {chickCount.toLocaleString()}
                    </span>
                  </div>

                  {/* 3 Color-Coded Stat Blocks */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Mortality */}
                    <div className="rounded-xl bg-rose-50/80 p-2 border border-rose-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-rose-500 block mb-0.5 whitespace-nowrap truncate">
                        {t('mortality')}
                      </span>
                      <span className="text-base font-black text-rose-700 block">
                        {r.mortalityCount || 0}
                      </span>
                    </div>

                    {/* Feed (Kg) */}
                    <div className="rounded-xl bg-amber-50/80 p-2 border border-amber-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-amber-600 block mb-0.5 whitespace-nowrap truncate">
                        {t('feedConsumption')} (KG)
                      </span>
                      <span className="text-base font-black text-amber-800 block">
                        {totalKg} kg
                      </span>
                    </div>

                    {/* Avg Weight */}
                    <div className="rounded-xl bg-purple-50/80 p-2 border border-purple-100/90 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-purple-600 block mb-0.5 whitespace-nowrap truncate">
                        {t('avgWeight')}
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
                      <span>{t('viewDetails')}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendToSupervisor(r);
                        }}
                        className="flex items-center gap-1 text-[11px] font-extrabold text-[#25D366] hover:text-[#1faa53] bg-emerald-50/80 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200/70 transition-colors"
                        title={language === 'ta' ? 'வாட்ஸ்அப்பில் அனுப்பு' : 'Send to Supervisor WhatsApp'}
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      {!isReadOnly && (
                        <>
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
                        </>
                      )}
                    </div>
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

