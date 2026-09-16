import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  dbGetBatches,
  dbGetDispatches,
  dbSaveDispatch,
  dbDeleteDispatch,
  dbGetBoxSets,
  dbSaveBoxSet,
  dbDeleteBoxSet,
  dbSaveInvoice,
  dbLogAuditEvent
} from '../services/dbService';
import { calculateBoxSetWeights } from '../utils/calculations';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { TraderInvoiceModal } from '../components/invoice/TraderInvoiceModal';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { scrollToTop } from '../utils/scroll';
import {
  Truck,
  Save,
  Scale,
  CheckCircle2,
  Edit,
  Trash2,
  Plus,
  FileText,
  Printer,
  ChevronRight,
  UserCheck,
  Phone,
  Calendar,
  Layers,
  ArrowLeft,
  X,
  AlertCircle,
  Filter,
  ArrowUpDown
} from 'lucide-react';

export const DispatchPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dispatches, setDispatches] = useState([]);
  const [allBoxSetsMap, setAllBoxSetsMap] = useState({}); // { [dispatchId]: BoxSet[] }
  
  // Navigation & View mode
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'detail'
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [boxSets, setBoxSets] = useState([]);
  const [setFilter, setSetFilter] = useState('all'); // 'all' | 'pending' | 'loaded'
  const [setSortBy, setSetSortBy] = useState('pending_first'); // 'pending_first' | 'last_updated' | 'box_asc' | 'box_desc' | 'boxes_count' | 'weight_desc'

  // Vehicle Cards Grid Filters & Sort
  const [gridFilter, setGridFilter] = useState('all'); // 'all' | 'in_progress' | 'completed'
  const [gridSortBy, setGridSortBy] = useState('last_updated'); // 'last_updated' | 'vehicle_asc' | 'progress_desc'
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Forms & Modals
  const [showSetForm, setShowSetForm] = useState(false); // Controls Create / Edit Set Popup Modal
  const [editingBoxSetId, setEditingBoxSetId] = useState(null);
  const [showHeaderForm, setShowHeaderForm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [ratePerKg, setRatePerKg] = useState(135);

  // Quick Load Weight Popup Modal
  const [showLoadWeightModal, setShowLoadWeightModal] = useState(false);
  const [loadWeightSet, setLoadWeightSet] = useState(null);
  const [quickLoadedWeight, setQuickLoadedWeight] = useState('');

  // Custom Extra Set Prompt Popup Modal
  const [showExtraSetPromptModal, setShowExtraSetPromptModal] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false
  });

  const [dispatchHeader, setDispatchHeader] = useState({
    vehicleName: '',
    vehicleNumber: '',
    driverName: '',
    driverMobileNumber: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    totalBoxCount: 5,
    chickenCountPerBox: 12
  });

  const [setForm, setSetForm] = useState({
    boxSetNumber: 1,
    boxesInSet: 5,
    emptyBoxWeight: 25,
    loadedWeight: '',
    chickenCount: 60
  });

  useEffect(() => {
    loadBatches();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadDispatchesForBatch(selectedBatchId);
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
        await loadDispatchesForBatch(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading batches for dispatch:', err);
      setLoading(false);
    }
  }

  async function loadDispatchesForBatch(bId) {
    try {
      const list = await dbGetDispatches();
      const filtered = list.filter(d => d.batchId === bId);
      setDispatches(filtered);

      const setsMap = {};
      for (const d of filtered) {
        const sets = await dbGetBoxSets(d.id);
        setsMap[d.id] = sets || [];
      }
      setAllBoxSetsMap(setsMap);

      if (activeDispatch) {
        const updatedActive = filtered.find(d => d.id === activeDispatch.id);
        if (updatedActive) {
          setActiveDispatch(updatedActive);
          setBoxSets(setsMap[updatedActive.id] || []);
        }
      }
    } catch (err) {
      console.error('Failed loading dispatches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBoxSetsForDispatch(dId, targetDispatch = null) {
    try {
      const list = await dbGetBoxSets(dId);
      const currentSets = list || [];
      setBoxSets(currentSets);

      setAllBoxSetsMap(prev => ({ ...prev, [dId]: currentSets }));

      const disp = targetDispatch || activeDispatch;
      const currentWeighedBoxes = currentSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const totalHeaderBoxes = disp?.totalBoxCount || 20;
      const remainingBoxes = Math.max(0, totalHeaderBoxes - currentWeighedBoxes);
      const defaultBoxesInSet = remainingBoxes > 0 ? Math.min(5, remainingBoxes) : 5;
      const perBoxCount = disp?.chickenCountPerBox || 12;

      setSetForm({
        boxSetNumber: currentSets.length + 1,
        boxesInSet: defaultBoxesInSet,
        emptyBoxWeight: defaultBoxesInSet * 5,
        loadedWeight: '',
        chickenCount: defaultBoxesInSet * perBoxCount
      });
    } catch (err) {
      console.error('Failed loading box sets:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = selectedBatch ? (selectedBatch.status || '').toLowerCase() === 'completed' : false;

  const handleOpenNewDispatch = () => {
    if (isReadOnly) return;
    setActiveDispatch(null);
    setDispatchHeader({
      vehicleName: '',
      vehicleNumber: '',
      driverName: '',
      driverMobileNumber: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      totalBoxCount: 5,
      chickenCountPerBox: 12
    });
    setShowHeaderForm(true);
  };

  useEffect(() => {
    scrollToTop();
  }, [activeDispatch, viewMode, selectedBatchId]);

  const handleOpenVehicleDetailPage = async (dispatch) => {
    setActiveDispatch(dispatch);
    setViewMode('detail');
    setShowSetForm(false);
    setEditingBoxSetId(null);
    setSetFilter('all');
    scrollToTop();
    await loadBoxSetsForDispatch(dispatch.id, dispatch);
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setActiveDispatch(null);
    setShowSetForm(false);
    setEditingBoxSetId(null);
    setSetFilter('all');
    scrollToTop();
  };

  const handleDeleteDispatch = (d, e) => {
    if (e) e.stopPropagation();
    if (isReadOnly) return;
    const dId = d.id || d;
    const vName = d.vehicleName || d.vehicleNumber || 'Vehicle Card';

    setDeleteModal({
      isOpen: true,
      title: 'Delete Vehicle Dispatch Card?',
      message: `Are you sure you want to delete "${vName}" and all its recorded box sets? This action cannot be undone.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
          await dbDeleteDispatch(dId);
          if (activeDispatch?.id === dId) {
            setActiveDispatch(null);
            setViewMode('grid');
          }
          await dbLogAuditEvent(
            'DISPATCH_DELETED',
            `Deleted vehicle dispatch ${dId}`,
            userProfile?.name
          );
          setSuccessMsg('Vehicle dispatch card deleted.');
          if (selectedBatchId) {
            loadDispatchesForBatch(selectedBatchId);
          }
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
        } catch (err) {
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
          alert('Failed deleting dispatch: ' + err.message);
        }
      }
    });
  };

  const handleSaveDispatchHeader = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch || isReadOnly) return;

    setSaving(true);
    try {
      const payload = {
        id: activeDispatch?.id || `disp-${Date.now()}`,
        ...dispatchHeader,
        batchId: selectedBatch.id,
        totalBoxCount: Number(dispatchHeader.totalBoxCount),
        chickenCountPerBox: Number(dispatchHeader.chickenCountPerBox),
        totalChickenCount: Number(dispatchHeader.totalBoxCount) * Number(dispatchHeader.chickenCountPerBox),
        totalWeight: activeDispatch?.totalWeight || 0,
        averageWeight: activeDispatch?.averageWeight || 0,
        status: activeDispatch?.status || 'In Progress'
      };

      const saved = await dbSaveDispatch(payload);
      await dbLogAuditEvent(
        activeDispatch ? 'DISPATCH_UPDATED' : 'DISPATCH_CREATED',
        `${activeDispatch ? 'Updated' : 'Created'} dispatch header for ${selectedBatch.batchNumber} (Vehicle: ${payload.vehicleNumber})`,
        userProfile?.name
      );

      setSuccessMsg(`Vehicle ${payload.vehicleNumber} setup updated! Target box count: ${payload.totalBoxCount} boxes.`);
      setActiveDispatch(saved);
      setShowHeaderForm(false);
      await loadDispatchesForBatch(selectedBatch.id);

      setViewMode('detail');
      await loadBoxSetsForDispatch(saved.id, saved);
      
      // Auto open Create Set Popup pre-filled for extra boxes
      setShowSetForm(true);
    } catch (err) {
      alert('Failed saving dispatch details: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBoxesInSetChange = (val) => {
    const bSet = Math.max(1, Number(val) || 1);
    const perBox = activeDispatch?.chickenCountPerBox || dispatchHeader.chickenCountPerBox || 12;
    setSetForm(prev => ({
      ...prev,
      boxesInSet: bSet,
      chickenCount: bSet * perBox,
      emptyBoxWeight: bSet * 5
    }));
  };

  const handleOpenCreateSetForm = () => {
    const currentWeighedBoxes = boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
    const totalHeaderBoxes = activeDispatch?.totalBoxCount || 20;

    // CUSTOM POPUP VALIDATION: If all target boxes are weighed, open custom popup modal
    if (currentWeighedBoxes >= totalHeaderBoxes) {
      setShowExtraSetPromptModal(true);
      return;
    }

    setEditingBoxSetId(null);
    const remainingBoxes = Math.max(0, totalHeaderBoxes - currentWeighedBoxes);
    const defaultBoxesInSet = remainingBoxes > 0 ? Math.min(5, remainingBoxes) : 5;
    const perBoxCount = activeDispatch?.chickenCountPerBox || 12;

    setSetForm({
      boxSetNumber: boxSets.length + 1,
      boxesInSet: defaultBoxesInSet,
      emptyBoxWeight: defaultBoxesInSet * 5,
      loadedWeight: '',
      chickenCount: defaultBoxesInSet * perBoxCount
    });
    setShowSetForm(true);
  };

  const handleConfirmUpdateBoxCountForExtraSet = () => {
    setShowExtraSetPromptModal(false);
    const currentTotal = activeDispatch?.totalBoxCount || 20;

    setDispatchHeader({
      vehicleName: activeDispatch?.vehicleName || '',
      vehicleNumber: activeDispatch?.vehicleNumber || '',
      driverName: activeDispatch?.driverName || '',
      driverMobileNumber: activeDispatch?.driverMobileNumber || '',
      dispatchDate: activeDispatch?.dispatchDate || new Date().toISOString().split('T')[0],
      totalBoxCount: currentTotal + 5, // Auto add +5 extra boxes
      chickenCountPerBox: activeDispatch?.chickenCountPerBox || 12
    });
    setShowHeaderForm(true);
  };

  const handleSaveBoxSet = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!activeDispatch) return;

    setSaving(true);
    try {
      const hasLoadWeight = setForm.loadedWeight !== '' && setForm.loadedWeight !== null && setForm.loadedWeight !== undefined && Number(setForm.loadedWeight) > 0;
      const loadedVal = hasLoadWeight ? Number(setForm.loadedWeight) : null;

      const setWeights = calculateBoxSetWeights(
        loadedVal,
        setForm.emptyBoxWeight,
        setForm.chickenCount
      );

      const setPayload = {
        id: editingBoxSetId || `set-${Date.now()}`,
        dispatchId: activeDispatch.id,
        boxSetNumber: Number(setForm.boxSetNumber),
        boxesInSet: Number(setForm.boxesInSet || 5),
        emptyBoxWeight: Number(setForm.emptyBoxWeight),
        loadedWeight: loadedVal,
        chickenCount: Number(setForm.chickenCount),
        totalChickenWeight: setWeights.totalChickenWeight,
        averageChickenWeight: setWeights.averageChickenWeight,
        isPendingLoad: setWeights.isPendingLoad,
        savedAt: new Date().toISOString()
      };

      await dbSaveBoxSet(activeDispatch.id, setPayload);

      const updatedSets = await dbGetBoxSets(activeDispatch.id);
      const loadedSets = updatedSets.filter(s => Number(s.loadedWeight) > 0);
      const combinedWeight = loadedSets.reduce((acc, s) => acc + (s.totalChickenWeight || 0), 0);
      const combinedChicks = loadedSets.reduce((acc, s) => acc + (s.chickenCount || 0), 0);
      const combinedLoadedBoxes = loadedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        birdsCount: combinedChicks,
        totalBirds: combinedChicks,
        totalChickens: combinedChicks,
        cratesCount: combinedLoadedBoxes,
        totalCrates: combinedLoadedBoxes,
        averageWeight: combinedAvg,
        status: combinedLoadedBoxes >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
      };

      await dbSaveDispatch(updatedDispatch);

      if (updatedDispatch.status === 'Completed') {
        const invPayload = {
          dispatchId: updatedDispatch.id,
          batchId: selectedBatch.id,
          invoiceDate: updatedDispatch.dispatchDate,
          customerName: updatedDispatch.vehicleName || 'KG Wholesale Poultry Traders',
          customerPhone: updatedDispatch.driverMobileNumber || '',
          vehicleNumber: updatedDispatch.vehicleNumber,
          driverName: updatedDispatch.driverName,
          totalChickens: combinedChicks,
          totalWeightKg: combinedWeight,
          ratePerKg: ratePerKg,
          totalAmount: combinedWeight * ratePerKg
        };
        await dbSaveInvoice(invPayload);
      }

      await dbLogAuditEvent(
        'BOX_SET_SAVED',
        `Saved Box Set #${setPayload.boxSetNumber} (${setPayload.boxesInSet} boxes, ${hasLoadWeight ? `Net: ${setPayload.totalChickenWeight}kg` : 'Tare Weight Saved, Pending Gross Wt'}) for vehicle ${activeDispatch.vehicleNumber}`,
        userProfile?.name
      );

      setSuccessMsg(
        editingBoxSetId
          ? `Box Set #${setPayload.boxSetNumber} updated successfully!`
          : hasLoadWeight
          ? `Box Set #${setPayload.boxSetNumber} with Loaded Weight saved!`
          : `Box Set #${setPayload.boxSetNumber} Tare Weight saved!`
      );
      setEditingBoxSetId(null);
      setShowSetForm(false);
      setActiveDispatch(updatedDispatch);
      await loadDispatchesForBatch(selectedBatch.id);
      await loadBoxSetsForDispatch(activeDispatch.id, updatedDispatch);
    } catch (err) {
      alert('Failed saving box set: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnterLoadWeight = (s) => {
    setLoadWeightSet(s);
    setQuickLoadedWeight(s.loadedWeight || '');
    setShowLoadWeightModal(true);
  };

  const handleSaveQuickLoadWeight = async (e) => {
    e.preventDefault();
    if (!loadWeightSet || !activeDispatch) return;

    const grossVal = Number(quickLoadedWeight);
    if (!grossVal || grossVal <= 0) {
      alert('Please enter a valid loaded gross weight.');
      return;
    }

    setSaving(true);
    try {
      const setWeights = calculateBoxSetWeights(
        grossVal,
        loadWeightSet.emptyBoxWeight,
        loadWeightSet.chickenCount
      );

      const setPayload = {
        ...loadWeightSet,
        loadedWeight: grossVal,
        totalChickenWeight: setWeights.totalChickenWeight,
        averageChickenWeight: setWeights.averageChickenWeight,
        isPendingLoad: false,
        savedAt: new Date().toISOString()
      };

      await dbSaveBoxSet(activeDispatch.id, setPayload);

      const updatedSets = await dbGetBoxSets(activeDispatch.id);
      const loadedSets = updatedSets.filter(s => Number(s.loadedWeight) > 0);
      const combinedWeight = loadedSets.reduce((acc, s) => acc + (s.totalChickenWeight || 0), 0);
      const combinedChicks = loadedSets.reduce((acc, s) => acc + (s.chickenCount || 0), 0);
      const combinedLoadedBoxes = loadedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        averageWeight: combinedAvg,
        status: combinedLoadedBoxes >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
      };

      await dbSaveDispatch(updatedDispatch);

      if (updatedDispatch.status === 'Completed') {
        const invPayload = {
          dispatchId: updatedDispatch.id,
          batchId: selectedBatch.id,
          invoiceDate: updatedDispatch.dispatchDate,
          customerName: updatedDispatch.vehicleName || 'KG Wholesale Poultry Traders',
          customerPhone: updatedDispatch.driverMobileNumber || '',
          vehicleNumber: updatedDispatch.vehicleNumber,
          driverName: updatedDispatch.driverName,
          totalChickens: combinedChicks,
          totalWeightKg: combinedWeight,
          ratePerKg: ratePerKg,
          totalAmount: combinedWeight * ratePerKg
        };
        await dbSaveInvoice(invPayload);
      }

      await dbLogAuditEvent(
        'BOX_SET_LOADED',
        `Updated Loaded Weight (${grossVal} kg, Net: ${setWeights.totalChickenWeight} kg) for Box Set #${setPayload.boxSetNumber} on vehicle ${activeDispatch.vehicleNumber}`,
        userProfile?.name
      );

      setSuccessMsg(`Box Set #${setPayload.boxSetNumber} Loaded Weight (${grossVal} kg) updated!`);
      setShowLoadWeightModal(false);
      setLoadWeightSet(null);
      setQuickLoadedWeight('');
      setActiveDispatch(updatedDispatch);
      await loadDispatchesForBatch(selectedBatch.id);
      await loadBoxSetsForDispatch(activeDispatch.id, updatedDispatch);
    } catch (err) {
      alert('Failed saving loaded weight: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoxSet = (s) => {
    if (isReadOnly) return;
    const setId = s.id || s;
    const setNum = s.boxSetNumber || '';

    setDeleteModal({
      isOpen: true,
      title: `Delete Box Set ${setNum ? `#${setNum}` : ''}?`,
      message: `Are you sure you want to delete Box Set ${setNum ? `#${setNum}` : ''}? This action cannot be undone.`,
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
          await dbDeleteBoxSet(activeDispatch.id, setId);
          setSuccessMsg('Box set deleted.');

          const updatedSets = await dbGetBoxSets(activeDispatch.id);
          const loadedSets = updatedSets.filter(x => Number(x.loadedWeight) > 0);
          const combinedWeight = loadedSets.reduce((acc, x) => acc + (x.totalChickenWeight || 0), 0);
          const combinedChicks = loadedSets.reduce((acc, x) => acc + (x.chickenCount || 0), 0);
          const combinedLoadedBoxes = loadedSets.reduce((acc, x) => acc + (Number(x.boxesInSet) || 1), 0);
          const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

          const updatedDispatch = {
            ...activeDispatch,
            totalWeight: parseFloat(combinedWeight.toFixed(2)),
            averageWeight: combinedAvg,
            status: combinedLoadedBoxes >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
          };

          await dbSaveDispatch(updatedDispatch);
          setActiveDispatch(updatedDispatch);
          if (selectedBatch) {
            await loadDispatchesForBatch(selectedBatch.id);
          }
          await loadBoxSetsForDispatch(activeDispatch.id, updatedDispatch);
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
        } catch (err) {
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
          alert('Failed deleting box set.');
        }
      }
    });
  };

  const handleEditBoxSet = (s) => {
    setEditingBoxSetId(s.id);
    setSetForm({
      boxSetNumber: s.boxSetNumber,
      boxesInSet: s.boxesInSet || 5,
      emptyBoxWeight: s.emptyBoxWeight || 25,
      loadedWeight: s.loadedWeight || '',
      chickenCount: s.chickenCount || 60
    });
    setShowSetForm(true);
  };

  // Box Sets Calculation & Filtering Engine
  const loadedBoxSets = boxSets.filter(s => Number(s.loadedWeight) > 0);
  const pendingBoxSets = boxSets.filter(s => !s.loadedWeight || Number(s.loadedWeight) <= 0);
  
  const totalWeighedBoxes = loadedBoxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const loadedBoxesCount = totalWeighedBoxes;
  const totalDispatchedBirds = loadedBoxSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0);
  const totalNetWeight = parseFloat(loadedBoxSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0).toFixed(2));
  const avgBirdWeight = totalDispatchedBirds > 0 ? parseFloat((totalNetWeight / totalDispatchedBirds).toFixed(3)) : 0;

  // SORTING & FILTERING ENGINE FOR BOX SETS
  const sortedBoxSets = [...boxSets].sort((a, b) => {
    if (setSortBy === 'last_updated') {
      const timeA = new Date(a.savedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.savedAt || b.updatedAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (b.boxSetNumber || 0) - (a.boxSetNumber || 0);
    }
    if (setSortBy === 'box_asc') {
      return (a.boxSetNumber || 0) - (b.boxSetNumber || 0);
    }
    if (setSortBy === 'box_desc') {
      return (b.boxSetNumber || 0) - (a.boxSetNumber || 0);
    }
    if (setSortBy === 'boxes_count') {
      return (b.boxesInSet || 0) - (a.boxesInSet || 0);
    }
    if (setSortBy === 'weight_desc') {
      return (b.totalChickenWeight || 0) - (a.totalChickenWeight || 0);
    }
    // Default: 'pending_first' (Pending sets float to top, then Box Set #)
    const aPending = !a.loadedWeight || Number(a.loadedWeight) <= 0;
    const bPending = !b.loadedWeight || Number(b.loadedWeight) <= 0;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return (a.boxSetNumber || 0) - (b.boxSetNumber || 0);
  });

  // FILTERING: All / Pending / Loaded
  const filteredBoxSets = sortedBoxSets.filter((s) => {
    const isPending = !s.loadedWeight || Number(s.loadedWeight) <= 0;
    if (setFilter === 'pending') return isPending;
    if (setFilter === 'loaded') return !isPending;
    return true;
  });

  // VEHICLE CARDS STATUS CALCULATION HELPER
  const checkIsDispatchCompleted = (d) => {
    if (!d) return false;
    const dSets = allBoxSetsMap[d.id] || (activeDispatch?.id === d.id ? boxSets : []);
    const loadedSets = dSets.filter(s => Number(s.loadedWeight) > 0);
    const weighedBoxes = loadedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);

    if (d.status === 'Completed') return true;
    if (d.totalBoxCount > 0 && weighedBoxes >= d.totalBoxCount && loadedSets.length > 0) {
      return true;
    }
    return false;
  };

  // VEHICLE CARDS GRID FILTERING & SORTING ENGINE
  const filteredDispatches = dispatches
    .filter(d => {
      const isCompleted = checkIsDispatchCompleted(d);
      if (gridFilter === 'in_progress') return !isCompleted;
      if (gridFilter === 'completed') return isCompleted;
      return true;
    })
    .sort((a, b) => {
      if (gridSortBy === 'vehicle_asc') {
        return (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '');
      }
      if (gridSortBy === 'progress_desc') {
        const aSets = allBoxSetsMap[a.id] || [];
        const bSets = allBoxSetsMap[b.id] || [];
        const aBoxes = aSets.filter(s => Number(s.loadedWeight) > 0).reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
        const bBoxes = bSets.filter(s => Number(s.loadedWeight) > 0).reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
        const aPct = aBoxes / (a.totalBoxCount || 1);
        const bPct = bBoxes / (b.totalBoxCount || 1);
        return bPct - aPct;
      }
      // Default: 'last_updated'
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  if (loading) return <LoadingSpinner message="Loading Vehicle & Dispatch Data..." />;

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: VEHICLE CARDS GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="space-y-5">
          {/* Page Header */}
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
              {t('dispatchAndBoxSets')}
            </h1>
            
            <div className="flex items-center gap-2 shrink-0">
              {!isReadOnly && (
                <button
                  onClick={handleOpenNewDispatch}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Add Vehicle</span>
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
                  <p className="text-[11px] text-amber-700">This batch is completed. Vehicle dispatches and box set weighing are in read-only mode.</p>
                </div>
              </div>
              <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
                Read-Only Mode
              </span>
            </div>
          )}

          {/* Cards Grid */}
          {dispatches.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Truck className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Vehicle Dispatches Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Create a vehicle dispatch card for your trader or transport truck. Once created, click on the card to open its set weighing page.
                </p>
              </div>
              <button
                onClick={handleOpenNewDispatch}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Vehicle Card</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                {/* Top Row: Title on Left, Sort Dropdown on Right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
                      Vehicle Cards ({dispatches.length})
                    </h2>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="shrink-0">
                    <CustomSelect
                      value={gridSortBy}
                      onChange={(e) => setGridSortBy(e.target.value)}
                      icon={ArrowUpDown}
                      options={[
                        { value: 'last_updated', label: 'Sort: Last Updated' },
                        { value: 'vehicle_asc', label: 'Sort: Vehicle #' },
                        { value: 'progress_desc', label: 'Sort: Progress %' },
                      ]}
                    />
                  </div>
                </div>

                {/* Bottom Row: Full Width Segmented Filter Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl w-full">
                  <button
                    onClick={() => setGridFilter('all')}
                    className={`py-2 px-1 sm:px-3 ${language === 'ta' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-extrabold rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                      gridFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('all')} ({dispatches.length})
                  </button>
                  <button
                    onClick={() => setGridFilter('in_progress')}
                    className={`py-2 px-1 sm:px-3 ${language === 'ta' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-extrabold rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                      gridFilter === 'in_progress'
                        ? 'bg-white text-amber-800 shadow-2xs'
                        : 'text-amber-800 hover:text-amber-900'
                    }`}
                  >
                    {t('inProgress')} ({dispatches.filter(d => !checkIsDispatchCompleted(d)).length})
                  </button>
                  <button
                    onClick={() => setGridFilter('completed')}
                    className={`py-2 px-1 sm:px-3 ${language === 'ta' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-extrabold rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                      gridFilter === 'completed'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-emerald-800 hover:text-emerald-900'
                    }`}
                  >
                    {t('completed')} ({dispatches.filter(d => checkIsDispatchCompleted(d)).length})
                  </button>
                </div>
              </div>

              {filteredDispatches.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No dispatches found matching the filter "{gridFilter}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredDispatches.map((d) => {
                  const dSets = allBoxSetsMap[d.id] || [];
                  const emptySets = dSets.filter(s => Number(s.emptyBoxWeight) > 0);
                  const loadedSets = dSets.filter(s => Number(s.loadedWeight) > 0);

                  const emptyBoxes = emptySets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
                  const loadedBoxes = loadedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);

                  const totalWeight = loadedSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0);
                  const totalBirds = loadedSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0);
                  const avgWeight = totalBirds > 0 ? (totalWeight / totalBirds).toFixed(3) : '0.000';

                  const emptyPct = Math.min(100, Math.round((emptyBoxes / (d.totalBoxCount || 1)) * 100));
                  const loadedPct = Math.min(100, Math.round((loadedBoxes / (d.totalBoxCount || 1)) * 100));
                  const isCompleted = checkIsDispatchCompleted(d);

                  return (
                    <div
                      key={d.id}
                      onClick={() => handleOpenVehicleDetailPage(d)}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-emerald-500 hover:shadow-md cursor-pointer"
                    >
                      {/* Top Bar */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                <Truck className="h-4 w-4" />
                              </div>
                              <Badge variant={isCompleted ? 'Completed' : 'In Progress'}>
                                {isCompleted ? t('completed') : t('inProgress')}
                              </Badge>
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDispatch(d);
                                    setDispatchHeader({
                                      vehicleName: d.vehicleName || '',
                                      vehicleNumber: d.vehicleNumber || '',
                                      driverName: d.driverName || '',
                                      driverMobileNumber: d.driverMobileNumber || '',
                                      dispatchDate: d.dispatchDate || new Date().toISOString().split('T')[0],
                                      totalBoxCount: d.totalBoxCount || 20,
                                      chickenCountPerBox: d.chickenCountPerBox || 12
                                    });
                                    setShowHeaderForm(true);
                                  }}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  title="Edit Vehicle Setup"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDispatch(d, e)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Delete Dispatch Card"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="font-black text-base text-slate-900 group-hover:text-emerald-700 transition-colors break-words leading-tight" title={d.vehicleName || d.vehicleNumber || 'Trader'}>
                              {d.vehicleName || d.vehicleNumber || 'Trader'}
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{t('vehicle')}: <span className="text-slate-700 font-bold">{d.vehicleNumber}</span></p>
                          </div>
                        </div>

                        {/* Driver & Details */}
                        <div className="py-2.5 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" /> {t('driver')}:
                            </span>
                            <span className="font-bold text-slate-800">{d.driverName || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" /> {t('phone')}:
                            </span>
                            <span className="font-semibold text-slate-700">{d.driverMobileNumber || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {t('date')}:
                            </span>
                            <span className="font-medium text-slate-700">{d.dispatchDate}</span>
                          </div>
                        </div>

                        {/* Dual Progress Bars: Empty Weight & Loaded Weight */}
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-2 my-1">
                          {/* 1. Empty Weight Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-600 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                <span>{t('emptyWeight')}</span>
                              </span>
                              <span className="text-amber-700">{emptyBoxes} / {d.totalBoxCount} {t('boxes')} ({emptyPct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${emptyPct}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 2. Loaded Weight Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-600 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span>{t('loadedWeight')}</span>
                              </span>
                              <span className="text-emerald-700">{loadedBoxes} / {d.totalBoxCount} {t('boxes')} ({loadedPct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 transition-all duration-300"
                                style={{ width: `${loadedPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-slate-100">
                          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-slate-500 block">{t('netWeight')}</span>
                            <span className="text-sm sm:text-xs font-black text-slate-900">{totalWeight.toFixed(2)} kg</span>
                          </div>
                          <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-emerald-700 block">{t('birds')}</span>
                            <span className="text-sm sm:text-xs font-black text-emerald-900">{totalBirds}</span>
                          </div>
                          <div className="bg-teal-50 p-1.5 rounded-xl border border-teal-100">
                            <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-teal-700 block">{t('avgWeight')}</span>
                            <span className="text-sm sm:text-xs font-black text-teal-900">{avgWeight} kg</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVehicleDetailPage(d);
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm sm:text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
                      >
                        <Scale className="h-4 w-4" />
                        <span>{t('openSetWeighing')} ({dSets.length} {t('sets')})</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* VIEW 2: DEDICATED VEHICLE SET WEIGHING PAGE */}
      {viewMode === 'detail' && activeDispatch && (
        <div className="space-y-5">
          {/* Header Navigation Bar */}
          <div className="border-b border-slate-200 pb-4 space-y-3">
            {/* Top Row: Back Button & Status Badge */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToGrid}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm sm:text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                <span>{t('backToVehicles')}</span>
              </button>
              {(() => {
                const isDetailCompleted = checkIsDispatchCompleted(activeDispatch);
                return (
                  <Badge variant={isDetailCompleted ? 'Completed' : 'In Progress'}>
                    {isDetailCompleted ? t('completed') : t('inProgress')}
                  </Badge>
                );
              })()}
            </div>

            {/* Vehicle Details Sub-Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div>
                <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 break-words hidden sm:block">
                  {activeDispatch.vehicleName || `Trader (${activeDispatch.vehicleNumber})`}
                </h1>
                <p className="text-sm sm:text-xs font-semibold text-slate-600">
                  Vehicle #: <strong className="text-slate-900">{activeDispatch.vehicleNumber}</strong> • Driver: <strong className="text-slate-900">{activeDispatch.driverName}</strong> {activeDispatch.driverMobileNumber ? `(${activeDispatch.driverMobileNumber})` : ''}
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2 pt-1 sm:pt-0">
                <button
                  onClick={() => {
                    setDispatchHeader({
                      vehicleName: activeDispatch.vehicleName || '',
                      vehicleNumber: activeDispatch.vehicleNumber || '',
                      driverName: activeDispatch.driverName || '',
                      driverMobileNumber: activeDispatch.driverMobileNumber || '',
                      dispatchDate: activeDispatch.dispatchDate || new Date().toISOString().split('T')[0],
                      totalBoxCount: activeDispatch.totalBoxCount || 5,
                      chickenCountPerBox: activeDispatch.chickenCountPerBox || 12
                    });
                    setShowHeaderForm(true);
                  }}
                  className="w-full flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 px-1.5 sm:px-2.5 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Edit className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{t('editSetup')}</span>
                </button>

                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 px-1.5 sm:px-2.5 text-xs sm:text-sm font-black text-white shadow-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{t('invoice')}</span>
                </button>

                <button
                  onClick={handleOpenCreateSetForm}
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 px-1.5 sm:px-2.5 text-xs sm:text-sm font-black text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('createSet')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dispatched KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1">{t('totalNetWeight')}</span>
              <span className="text-xl sm:text-xl font-black text-slate-900">{totalNetWeight.toFixed(2)} <span className="text-sm sm:text-xs font-medium text-slate-500">kg</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1">{t('birdsDispatched')}</span>
              <span className="text-xl sm:text-xl font-black text-emerald-700">{totalDispatchedBirds} <span className="text-sm sm:text-xs font-medium text-slate-500">{t('birds')}</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1">{t('averageBirdWeight')}</span>
              <span className="text-xl sm:text-xl font-black text-teal-700">{avgBirdWeight} <span className="text-sm sm:text-xs font-medium text-slate-500">kg/{language === 'ta' ? 'கோழி' : 'bird'}</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1">{t('weighedBoxes')}</span>
              <span className="text-xl sm:text-xl font-black text-slate-900">{totalWeighedBoxes} <span className="text-sm sm:text-xs font-medium text-slate-500">/ {activeDispatch.totalBoxCount} {t('boxes')}</span></span>
            </div>
          </div>

          {/* Box Sets History Header with Filters & Status Sort */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
            <div className="space-y-3 border-b border-slate-100 pb-3">
              {/* Top Row: Title & Subtitle on Left, Sort Dropdown on Right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 whitespace-nowrap">
                    {t('boxSetsHistory')}
                  </h3>
                </div>

                {/* Sort Dropdown */}
                <div className="shrink-0">
                  <CustomSelect
                    value={setSortBy}
                    onChange={(e) => setSetSortBy(e.target.value)}
                    icon={ArrowUpDown}
                    options={[
                      { value: 'pending_first', label: language === 'ta' ? 'வரிசை: நிலுவையில்' : 'Sort: Pending First' },
                      { value: 'last_updated', label: language === 'ta' ? 'வரிசை: புதுப்பிக்கப்பட்டவை' : 'Sort: Last Updated' },
                      { value: 'box_asc', label: language === 'ta' ? 'வரிசை: தொகுதி # (1 → N)' : 'Sort: Set # (1 → N)' },
                      { value: 'box_desc', label: language === 'ta' ? 'வரிசை: தொகுதி # (N → 1)' : 'Sort: Set # (N → 1)' },
                      { value: 'boxes_count', label: language === 'ta' ? 'வரிசை: பெட்டி எண்ணிக்கை' : 'Sort: Box Count' },
                      { value: 'weight_desc', label: language === 'ta' ? 'வரிசை: நிகர எடை' : 'Sort: Net Wt' },
                    ]}
                  />
                </div>
              </div>

              {/* Bottom Row: Full Width Segmented Filter Tabs Bar */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl w-full">
                <button
                  onClick={() => setSetFilter('all')}
                  className={`py-2 px-1 sm:px-3 text-xs sm:text-sm font-black rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                    setFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('all')} ({boxSets.length})
                </button>
                <button
                  onClick={() => setSetFilter('pending')}
                  className={`py-2 px-1 sm:px-3 text-xs sm:text-sm font-black rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                    setFilter === 'pending'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-amber-800 hover:text-amber-900'
                  }`}
                >
                  {t('pending')} ({pendingBoxSets.length})
                </button>
                <button
                  onClick={() => setSetFilter('loaded')}
                  className={`py-2 px-1 sm:px-3 text-xs sm:text-sm font-black rounded-xl transition-all text-center whitespace-nowrap overflow-hidden ${
                    setFilter === 'loaded'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-emerald-800 hover:text-emerald-900'
                  }`}
                >
                  {t('loaded')} ({loadedBoxSets.length})
                </button>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {filteredBoxSets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p>
                    {setFilter === 'pending'
                      ? (language === 'ta' ? 'நிலுவையில் உள்ள பெட்டிகள் இல்லை!' : 'No pending sets! All recorded box sets have loaded weight entered.')
                      : setFilter === 'loaded'
                      ? (language === 'ta' ? 'நிறைந்த பெட்டிகள் இன்னும் இல்லை.' : 'No loaded sets recorded yet. Enter gross weight on pending sets.')
                      : (language === 'ta' ? 'தொகுதிகள் ஏதும் இல்லை.' : 'No box sets recorded for this vehicle yet.')}
                  </p>
                  <button
                    onClick={handleOpenCreateSetForm}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                  >
                    <Plus className="h-4 w-4" /> {t('createSet')}
                  </button>
                </div>
              ) : (
                filteredBoxSets.map((s) => {
                  const isPending = !s.loadedWeight || Number(s.loadedWeight) <= 0;

                  return (
                    <div key={s.id} className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs hover:shadow-xs transition-all">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">{t('boxSetNumber')} #{s.boxSetNumber}</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {s.boxesInSet || 5} {t('boxes')}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isPending ? 'bg-amber-50 text-amber-800 border-amber-200/80' : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                          }`}>
                            {isPending ? t('pending') : `${t('loaded')} ✓`}
                          </span>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleEditBoxSet(s)}
                              className="rounded-xl p-1.5 bg-slate-100/80 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Edit Box Set (Popup)"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBoxSet(s.id)}
                              className="rounded-xl p-1.5 bg-slate-100/80 text-rose-500 hover:bg-rose-100 transition-colors"
                              title="Delete Box Set"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100/90 overflow-hidden">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{t('tareLoadedWt')}</span>
                          <span className="font-extrabold text-slate-900 text-xs block whitespace-nowrap overflow-hidden text-ellipsis">
                            {s.emptyBoxWeight} kg / {isPending ? <em className="text-amber-600 font-bold not-italic">{t('pending')}</em> : `${s.loadedWeight} kg`}
                          </span>
                        </div>
                        <div className={`p-2.5 sm:p-3 rounded-xl border overflow-hidden ${isPending ? 'bg-amber-50/80 border-amber-200/60' : 'bg-emerald-50/80 border-emerald-200/60'}`}>
                          <span className={`text-[10px] font-bold block uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {t('netChickenWt')}
                          </span>
                          <span className={`font-black block whitespace-nowrap overflow-hidden text-ellipsis ${isPending ? 'text-amber-700 text-xs font-bold' : 'text-emerald-900 text-sm'}`}>
                            {isPending ? t('pending') : `${s.totalChickenWeight} kg`}
                          </span>
                        </div>
                      </div>

                      {isPending ? (
                        <button
                          onClick={() => handleEnterLoadWeight(s)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:from-amber-700 hover:to-orange-700 transition-all active:scale-98 cursor-pointer"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          <span>+ {t('enterLoadedWeight')}</span>
                        </button>
                      ) : (
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 text-slate-600 font-semibold">
                          <span>{t('birds')}: <strong className="text-slate-900 font-bold">{s.chickenCount}</strong></span>
                          <span>{t('avg')}: <strong className="text-slate-900 font-bold">{s.averageChickenWeight} kg/bird</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-4">{t('boxSetNumber')} #</th>
                    <th className="py-3.5 px-4">{t('status')}</th>
                    <th className="py-3.5 px-4">{t('boxes')}</th>
                    <th className="py-3.5 px-4">{t('emptyWeight')}</th>
                    <th className="py-3.5 px-4">{t('loadedWeight')}</th>
                    <th className="py-3.5 px-4">{t('birds')}</th>
                    <th className="py-3.5 px-4">{t('totalNetWeight')}</th>
                    <th className="py-3.5 px-4">{t('avgWeight')}</th>
                    <th className="py-3.5 px-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {filteredBoxSets.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        {setFilter === 'pending'
                          ? (language === 'ta' ? 'நிலுவையில் உள்ள பெட்டிகள் இல்லை!' : 'No pending sets! All recorded box sets have loaded weight entered.')
                          : setFilter === 'loaded'
                          ? (language === 'ta' ? 'நிறைந்த பெட்டிகள் இன்னும் இல்லை.' : 'No loaded sets recorded yet. Enter gross weight on pending sets.')
                          : (language === 'ta' ? 'தொகுதிகள் ஏதும் இல்லை.' : 'No box sets recorded for this vehicle yet.')}
                      </td>
                    </tr>
                  ) : (
                    filteredBoxSets.map((s) => {
                      const isPending = !s.loadedWeight || Number(s.loadedWeight) <= 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{t('boxSetNumber')} #{s.boxSetNumber}</td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isPending ? 'bg-amber-50 text-amber-800 border-amber-200/80' : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            }`}>
                              {isPending ? t('pending') : `${t('loaded')} ✓`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-bold">{s.boxesInSet || 5} {t('boxes')}</td>
                          <td className="py-3.5 px-4 text-slate-600">{s.emptyBoxWeight} kg</td>
                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <button
                                onClick={() => handleEnterLoadWeight(s)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                <Plus className="h-3 w-3" /> + {t('enterLoadedWeight')}
                              </button>
                            ) : (
                              <span className="font-bold text-slate-900">{s.loadedWeight} kg</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-700 font-bold">{s.chickenCount}</td>
                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <span className="text-amber-600 font-semibold italic text-[11px]">Pending Load</span>
                            ) : (
                              <span className="text-emerald-600 font-black">{s.totalChickenWeight} kg</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {isPending ? '—' : `${s.averageChickenWeight} kg`}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isReadOnly ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditBoxSet(s)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                  title="Edit Box Set (Popup)"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBoxSet(s.id)}
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                  title="Delete Box Set"
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
          </div>
        </div>
      )}

      {/* CREATE / EDIT BOX SET POPUP MODAL */}
      <Modal
        isOpen={showSetForm}
        onClose={() => {
          setShowSetForm(false);
          setEditingBoxSetId(null);
        }}
        title={editingBoxSetId ? (language === 'ta' ? `பெட்டித் தொகுதி #${setForm.boxSetNumber} ஐத் திருத்து` : `Edit Box Set #${setForm.boxSetNumber}`) : (language === 'ta' ? `பெட்டித் தொகுதி #${setForm.boxSetNumber} உருவாக்கு` : `Create Box Set #${setForm.boxSetNumber}`)}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveBoxSet} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதி எண் *' : 'Set Number *'}</label>
              <input
                type="number"
                required
                min="1"
                value={setForm.boxSetNumber}
                onChange={(e) => setSetForm({ ...setForm, boxSetNumber: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதியில் பெட்டிகள் *' : 'Boxes in Set (Default 5) *'}</label>
              <input
                type="number"
                required
                min="1"
                value={setForm.boxesInSet}
                onChange={(e) => handleBoxesInSetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதியில் எண்ணிக்கை *' : 'Chickens in Set *'}</label>
              <input
                type="number"
                required
                min="1"
                value={setForm.chickenCount}
                onChange={(e) => setSetForm({ ...setForm, chickenCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-emerald-700 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{language === 'ta' ? `தானியங்கி: ${activeDispatch?.chickenCountPerBox || 12} /பெட்டி × ${setForm.boxesInSet}` : `Auto: ${activeDispatch?.chickenCountPerBox || 12} birds/box × ${setForm.boxesInSet}`}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'வெற்றுப் பெட்டி எடை (கிலோ) *' : 'Empty Box Tare Weight (kg) *'}
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                placeholder={language === 'ta' ? 'எ.கா. 25.0 கிலோ' : 'e.g. 25.0 kg'}
                value={setForm.emptyBoxWeight}
                onChange={(e) => setSetForm({ ...setForm, emptyBoxWeight: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{language === 'ta' ? `தானியங்கி: 5கிலோ × ${setForm.boxesInSet} பெட்டிகள்` : `Auto: 5kg × ${setForm.boxesInSet} boxes`}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'மொத்த எடை (கிலோ)' : 'Loaded Gross Weight (kg)'} <span className="text-amber-600 font-medium">{language === 'ta' ? '(விருப்பத்தேர்வு)' : '(Optional)'}</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder={language === 'ta' ? 'எ.கா. 145.0 கிலோ' : 'e.g. 145.0 kg (blank for Tare only)'}
                value={setForm.loadedWeight}
                onChange={(e) => setSetForm({ ...setForm, loadedWeight: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-black text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          {(() => {
            const preview = calculateBoxSetWeights(setForm.loadedWeight, setForm.emptyBoxWeight, setForm.chickenCount);
            if (preview.isPendingLoad) {
              return (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{language === 'ta' ? `நிலை 1: வெற்று எடை மட்டும் சேமிக்கப்படுகிறது (${setForm.emptyBoxWeight || 25} கிலோ)` : `Stage 1: Saving Tare Weight Only (${setForm.emptyBoxWeight || 25} kg)`}</span>
                    <span className="text-[11px] text-amber-700">{language === 'ta' ? 'இப்போது வெற்றுப் பெட்டிகளைச் சேமித்து, கோழிகள் ஏற்றிய பின் மொத்த எடையைப் புதுப்பிக்கலாம்.' : 'Save empty set now and update Loaded Gross Weight later when birds are loaded.'}</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">{language === 'ta' ? 'நிகர எடை' : 'Net Chicken Weight'}</span>
                  <span className="text-base font-black text-emerald-900">{preview.totalChickenWeight} kg</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">{language === 'ta' ? 'சராசரி எடை / கோழி' : 'Average Weight / Bird'}</span>
                  <span className="text-base font-black text-emerald-900">{preview.averageChickenWeight} kg</span>
                </div>
              </div>
            );
          })()}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowSetForm(false);
                setEditingBoxSetId(null);
              }}
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
              {saving
                ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving Set...')
                : editingBoxSetId
                ? (language === 'ta' ? 'தொகுதியைப் புதுப்பி' : 'Update Box Set (Instantly)')
                : setForm.loadedWeight
                ? (language === 'ta' ? `தொகுதி #${setForm.boxSetNumber} சேமி` : `Save Set #${setForm.boxSetNumber} (Tare + Load)`)
                : (language === 'ta' ? `தொகுதி #${setForm.boxSetNumber} சேமி (வெற்று மட்டும்)` : `Save Set #${setForm.boxSetNumber} (Tare Only)`)}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK LOAD WEIGHT ENTRY POPUP MODAL */}
      {loadWeightSet && (
        <Modal
          isOpen={showLoadWeightModal}
          onClose={() => {
            setShowLoadWeightModal(false);
            setLoadWeightSet(null);
          }}
          title={language === 'ta' ? `மொத்த எடையை உள்ளிடவும்: பெட்டித் தொகுதி #${loadWeightSet.boxSetNumber}` : `Enter Loaded Weight: Box Set #${loadWeightSet.boxSetNumber}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveQuickLoadWeight} className="space-y-4">
            {/* Set Context Pill */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">{language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}</span>
                <span className="font-bold text-slate-800">{loadWeightSet.boxesInSet || 5} {language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">{language === 'ta' ? 'வெற்று எடை' : 'Tare Weight'}</span>
                <span className="font-bold text-slate-800">{loadWeightSet.emptyBoxWeight} kg</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">{language === 'ta' ? 'எண்ணிக்கை' : 'Chickens'}</span>
                <span className="font-bold text-emerald-700">{loadWeightSet.chickenCount}</span>
              </div>
            </div>

            {/* Main Loaded Gross Weight Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {language === 'ta' ? 'மொத்த எடை (கிலோ) *' : 'Loaded Gross Weight (kg) *'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  autoFocus
                  min={(Number(loadWeightSet.emptyBoxWeight) + 0.1).toString()}
                  step="0.1"
                  placeholder={language === 'ta' ? 'எ.கா. 145.0 கிலோ' : 'e.g. 145.0 kg'}
                  value={quickLoadedWeight}
                  onChange={(e) => setQuickLoadedWeight(e.target.value)}
                  className="w-full rounded-xl border-2 border-emerald-500 bg-white py-3 px-3.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <span className="absolute right-3.5 top-3.5 text-xs font-extrabold text-slate-400">kg</span>
              </div>
            </div>

            {/* Live Net Weight Calculation Preview */}
            {(() => {
              const preview = calculateBoxSetWeights(quickLoadedWeight, loadWeightSet.emptyBoxWeight, loadWeightSet.chickenCount);
              if (preview.isPendingLoad) {
                return (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 font-medium text-center">
                    {language === 'ta' ? `அனைத்து ${loadWeightSet.boxesInSet || 5} பெட்டிகளும் ஏற்றிய பின் எடையை உள்ளிடவும்.` : `Enter the gross scale weight when all ${loadWeightSet.boxesInSet || 5} boxes are loaded.`}
                  </div>
                );
              }

              return (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">{language === 'ta' ? 'நிகர எடை' : 'Net Chicken Weight'}</span>
                    <span className="text-base sm:text-lg font-black text-emerald-950">{preview.totalChickenWeight} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">{language === 'ta' ? 'சராசரி எடை / கோழி' : 'Avg Weight / Bird'}</span>
                    <span className="text-base sm:text-lg font-black text-emerald-950">{preview.averageChickenWeight} kg</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLoadWeightModal(false);
                  setLoadWeightSet(null);
                }}
                className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : (language === 'ta' ? 'எடையைச் சேமி' : 'Save Loaded Weight (Instantly)')}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CUSTOM EXTRA SET PROMPT POPUP MODAL */}
      {activeDispatch && (
        <Modal
          isOpen={showExtraSetPromptModal}
          onClose={() => setShowExtraSetPromptModal(false)}
          title={language === 'ta' ? `இலக்கு பெட்டி எண்ணிக்கை அடைந்தது (${activeDispatch.totalBoxCount} / ${activeDispatch.totalBoxCount} பெட்டிகள்)` : `Target Box Count Reached (${activeDispatch.totalBoxCount} / ${activeDispatch.totalBoxCount} Boxes)`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ta' ? `அனைத்து ${activeDispatch.totalBoxCount} பெட்டிகளும் அளவிடப்பட்டன` : `All ${activeDispatch.totalBoxCount} Target Boxes Weighed`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {language === 'ta' ? `வாகனம் ${activeDispatch.vehicleNumber}-க்கான ${activeDispatch.totalBoxCount} பெட்டிகள் இலக்கை அடைந்துவிட்டீர்கள்.` : `You have reached the setup target of ${activeDispatch.totalBoxCount} boxes for vehicle ${activeDispatch.vehicleNumber}. To add an extra set of boxes, please update the vehicle total box count.`}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 font-medium">
              {language === 'ta' ? 'தற்போதைய இலக்கு:' : 'Current Target:'} <strong className="text-slate-900">{activeDispatch.totalBoxCount} {language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}</strong> → {language === 'ta' ? 'புதிய பரிந்துரை:' : 'New Suggested:'} <strong className="text-emerald-700">{activeDispatch.totalBoxCount + 5} {language === 'ta' ? 'பெட்டிகள்' : 'Boxes'}</strong> (+5)
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExtraSetPromptModal(false)}
                className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateBoxCountForExtraSet}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>{language === 'ta' ? 'புதுப்பி (+5 பெட்டிகள்)' : 'Update Setup (+5 Boxes)'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Vehicle Header Form Modal (Create / Edit Vehicle Card Setup) */}
      <Modal
        isOpen={showHeaderForm}
        onClose={() => setShowHeaderForm(false)}
        title={activeDispatch ? (language === 'ta' ? `அனுப்புதலைத் திருத்து: ${activeDispatch.vehicleName || activeDispatch.vehicleNumber}` : `Edit Dispatch: ${activeDispatch.vehicleName || activeDispatch.vehicleNumber}`) : (language === 'ta' ? "புதிய வாகன அனுப்புதல் அமைவு" : "Setup New Dispatch Card")}
      >
        <form onSubmit={handleSaveDispatchHeader} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'வியாபாரி பெயர் *' : 'Trader Name *'}</label>
              <input
                type="text"
                required
                value={dispatchHeader.vehicleName}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleName: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. ஸ்ரீ அம்மன் கோழிப் பண்ணை' : 'e.g. Sri Amman Poultry Traders'}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'வாகன எண் *' : 'Vehicle Number *'}</label>
              <input
                type="text"
                required
                value={dispatchHeader.vehicleNumber}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleNumber: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. TN-38-C-5544' : 'e.g. TN-38-C-5544'}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஓட்டுநர் பெயர் *' : 'Driver Name *'}</label>
              <input
                type="text"
                required
                value={dispatchHeader.driverName}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverName: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. கார்த்திக்' : 'e.g. Karthik'}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஓட்டுநர் கைபேசி எண் *' : 'Driver Mobile Number *'}</label>
              <input
                type="tel"
                required
                value={dispatchHeader.driverMobileNumber}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverMobileNumber: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. 9842101234' : 'e.g. 9842101234'}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'அனுப்பிய தேதி *' : 'Dispatch Date *'}</label>
              <CustomDatePicker
                value={dispatchHeader.dispatchDate}
                onChange={(dStr) => setDispatchHeader({ ...dispatchHeader, dispatchDate: dStr })}
                min={selectedBatch?.chickArrivalDate}
                loggedDates={dispatches.map(d => d.dispatchDate)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'மொத்த பெட்டி எண்ணிக்கை *' : 'Total Box Count *'}</label>
              <input
                type="number"
                required
                min="1"
                value={dispatchHeader.totalBoxCount}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, totalBoxCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
              <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">{language === 'ta' ? 'கூடுதல் பெட்டிகளைச் சேர்க்க எண்ணிக்கையை அதிகரிக்கவும்' : 'Increase count here to add extra box sets'}</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஒரு பெட்டிக்கு எண்ணிக்கை *' : 'Birds Per Box *'}</label>
              <input
                type="number"
                required
                min="1"
                value={dispatchHeader.chickenCountPerBox}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, chickenCountPerBox: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowHeaderForm(false)}
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
              {saving ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving Setup...') : activeDispatch ? (language === 'ta' ? 'அமைப்பைப் புதுப்பி' : 'Update Setup & Create Extra Set') : (language === 'ta' ? 'சேமித்து வாகனப் பக்கத்தைத் திறக்க' : 'Save & Open Vehicle Page')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Trader Invoice Modal */}
      {activeDispatch && (
        <TraderInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          dispatch={activeDispatch}
          boxSets={boxSets}
          ratePerKg={ratePerKg}
          onRateChange={setRatePerKg}
        />
      )}

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
