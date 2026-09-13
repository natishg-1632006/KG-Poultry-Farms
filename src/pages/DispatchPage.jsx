import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  AlertCircle
} from 'lucide-react';

export const DispatchPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dispatches, setDispatches] = useState([]);
  const [allBoxSetsMap, setAllBoxSetsMap] = useState({}); // { [dispatchId]: BoxSet[] }
  
  // Navigation & View mode
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'detail'
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [boxSets, setBoxSets] = useState([]);
  
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

  const [dispatchHeader, setDispatchHeader] = useState({
    vehicleName: 'Eicher Pro 2049',
    vehicleNumber: 'TN-38-C-5544',
    driverName: 'Karthik',
    driverMobileNumber: '9842101234',
    dispatchDate: new Date().toISOString().split('T')[0],
    totalBoxCount: 20,
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
      console.error('Failed loading batches for dispatch:', err);
    } finally {
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

  const handleOpenNewDispatch = () => {
    setActiveDispatch(null);
    setDispatchHeader({
      vehicleName: '',
      vehicleNumber: '',
      driverName: '',
      driverMobileNumber: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      totalBoxCount: 20,
      chickenCountPerBox: 12
    });
    setShowHeaderForm(true);
  };

  const handleOpenVehicleDetailPage = async (dispatch) => {
    setActiveDispatch(dispatch);
    setViewMode('detail');
    setShowSetForm(false);
    setEditingBoxSetId(null);
    await loadBoxSetsForDispatch(dispatch.id, dispatch);
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setActiveDispatch(null);
    setShowSetForm(false);
    setEditingBoxSetId(null);
  };

  const handleDeleteDispatch = async (dId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this vehicle dispatch card and all its box sets?')) return;
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
    } catch (err) {
      alert('Failed deleting dispatch: ' + err.message);
    }
  };

  const handleSaveDispatchHeader = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch) return;

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

    // VALIDATION: If all target boxes are already weighed, prompt user to update Total Box Count first
    if (currentWeighedBoxes >= totalHeaderBoxes) {
      if (confirm(
        `All ${totalHeaderBoxes} target boxes for Vehicle ${activeDispatch?.vehicleNumber} have already been weighed (${currentWeighedBoxes} / ${totalHeaderBoxes} boxes).\n\nTo add extra box sets, click OK to update the Vehicle Total Box Count first.`
      )) {
        setDispatchHeader({
          vehicleName: activeDispatch.vehicleName || '',
          vehicleNumber: activeDispatch.vehicleNumber || '',
          driverName: activeDispatch.driverName || '',
          driverMobileNumber: activeDispatch.driverMobileNumber || '',
          dispatchDate: activeDispatch.dispatchDate || new Date().toISOString().split('T')[0],
          totalBoxCount: totalHeaderBoxes + 5, // Auto-suggest adding +5 extra boxes!
          chickenCountPerBox: activeDispatch.chickenCountPerBox || 12
        });
        setShowHeaderForm(true);
      }
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
        isPendingLoad: setWeights.isPendingLoad
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
        isPendingLoad: false
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

  const handleDeleteBoxSet = async (setId) => {
    if (!confirm('Are you sure you want to delete this box set?')) return;
    try {
      await dbDeleteBoxSet(activeDispatch.id, setId);
      setSuccessMsg('Box set deleted.');

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
      setActiveDispatch(updatedDispatch);
      await loadDispatchesForBatch(selectedBatch.id);
      await loadBoxSetsForDispatch(activeDispatch.id, updatedDispatch);
    } catch (err) {
      alert('Failed deleting box set.');
    }
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

  const totalWeighedBoxes = boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const loadedBoxSets = boxSets.filter(s => Number(s.loadedWeight) > 0);
  const loadedBoxesCount = loadedBoxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const totalDispatchedBirds = loadedBoxSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0);
  const totalNetWeight = loadedBoxSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0);
  const avgBirdWeight = totalDispatchedBirds > 0 ? parseFloat((totalNetWeight / totalDispatchedBirds).toFixed(3)) : 0;

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold">Loading Dispatch Management...</div>;

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Chicken Dispatch & Weighing</h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Manage vehicle dispatches. Click any card to weigh boxes.</p>
            </div>
            
            <div className="flex items-center gap-2.5">
              {batches.length > 1 && (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-700 shadow-2xs focus:border-emerald-600 shrink-0"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch #{b.batchNumber}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleOpenNewDispatch}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Vehicle Dispatch</span>
              </button>
            </div>
          </div>

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
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span>Active Vehicle Cards ({dispatches.length})</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Click card to open set weighing page</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {dispatches.map((d) => {
                  const dSets = allBoxSetsMap[d.id] || [];
                  const loadedSets = dSets.filter(s => Number(s.loadedWeight) > 0);
                  const weighedBoxes = dSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
                  const totalWeight = loadedSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0);
                  const totalBirds = loadedSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0);
                  const avgWeight = totalBirds > 0 ? (totalWeight / totalBirds).toFixed(3) : '0.000';
                  const progressPct = Math.min(100, Math.round((weighedBoxes / (d.totalBoxCount || 1)) * 100));
                  const isCompleted = d.status === 'Completed' || weighedBoxes >= d.totalBoxCount;

                  return (
                    <div
                      key={d.id}
                      onClick={() => handleOpenVehicleDetailPage(d)}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-emerald-500 hover:shadow-md cursor-pointer"
                    >
                      {/* Top Bar */}
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                              <Truck className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors break-all">
                                {d.vehicleNumber}
                              </h3>
                              <p className="text-xs font-semibold text-slate-500">{d.vehicleName || 'Vehicle'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={isCompleted ? 'Completed' : 'In Progress'}>
                              {isCompleted ? 'Completed' : 'In Progress'}
                            </Badge>
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
                              onClick={(e) => handleDeleteDispatch(d.id, e)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete Dispatch Card"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Driver & Details */}
                        <div className="py-2.5 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" /> Driver:
                            </span>
                            <span className="font-bold text-slate-800">{d.driverName || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" /> Phone:
                            </span>
                            <span className="font-semibold text-slate-700">{d.driverMobileNumber || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> Date:
                            </span>
                            <span className="font-medium text-slate-700">{d.dispatchDate}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1 my-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">Boxes Weighed</span>
                            <span className="text-emerald-700">{weighedBoxes} / {d.totalBoxCount} Boxes ({progressPct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-slate-100">
                          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Net Wt</span>
                            <span className="text-xs font-black text-slate-900">{totalWeight.toFixed(1)} kg</span>
                          </div>
                          <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-100">
                            <span className="text-[9px] uppercase font-extrabold text-emerald-700 block">Birds</span>
                            <span className="text-xs font-black text-emerald-900">{totalBirds}</span>
                          </div>
                          <div className="bg-teal-50 p-1.5 rounded-xl border border-teal-100">
                            <span className="text-[9px] uppercase font-extrabold text-teal-700 block">Avg Wt</span>
                            <span className="text-xs font-black text-teal-900">{avgWeight} kg</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVehicleDetailPage(d);
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all"
                      >
                        <Scale className="h-4 w-4" />
                        <span>Open Set Weighing ({dSets.length} Sets)</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                <span>Back to Vehicles</span>
              </button>
              <Badge variant={activeDispatch.status}>{activeDispatch.status}</Badge>
            </div>

            {/* Vehicle Title & Details */}
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 break-words">
                Vehicle {activeDispatch.vehicleNumber}
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {activeDispatch.vehicleName || 'Vehicle'} • Driver: {activeDispatch.driverName} ({activeDispatch.driverMobileNumber || 'No mobile'})
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-3 gap-2 pt-1 sm:flex sm:items-center sm:justify-end sm:gap-2">
              <button
                onClick={() => {
                  setDispatchHeader({
                    vehicleName: activeDispatch.vehicleName || '',
                    vehicleNumber: activeDispatch.vehicleNumber || '',
                    driverName: activeDispatch.driverName || '',
                    driverMobileNumber: activeDispatch.driverMobileNumber || '',
                    dispatchDate: activeDispatch.dispatchDate || new Date().toISOString().split('T')[0],
                    totalBoxCount: activeDispatch.totalBoxCount || 20,
                    chickenCountPerBox: activeDispatch.chickenCountPerBox || 12
                  });
                  setShowHeaderForm(true);
                }}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Edit className="h-3.5 w-3.5 text-slate-500" />
                <span>Edit Setup</span>
              </button>

              <button
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 px-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Invoice</span>
              </button>

              <button
                onClick={handleOpenCreateSetForm}
                className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 px-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>+ Create Set</span>
              </button>
            </div>
          </div>

          {/* Dispatched KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Total Net Weight</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{totalNetWeight} <span className="text-xs font-medium text-slate-500">kg</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Birds Dispatched</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">{totalDispatchedBirds} <span className="text-xs font-medium text-slate-500">birds</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Average Bird Weight</span>
              <span className="text-lg sm:text-xl font-black text-teal-700">{avgBirdWeight} <span className="text-xs font-medium text-slate-500">kg/bird</span></span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Weighed Boxes</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{totalWeighedBoxes} <span className="text-xs font-medium text-slate-500">/ {activeDispatch.totalBoxCount} boxes</span></span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{loadedBoxesCount} loaded</span>
            </div>
          </div>

          {/* Box Sets History - Mobile Cards & Desktop Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                  <span>Box Sets History</span>
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Vehicle: {activeDispatch.vehicleNumber} • {boxSets.length} Sets Recorded</p>
              </div>

              <button
                onClick={handleOpenCreateSetForm}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> + Create Set
              </button>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {boxSets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>No box sets recorded for this vehicle yet.</p>
                  <button
                    onClick={handleOpenCreateSetForm}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Create First Set (Tare Wt)
                  </button>
                </div>
              ) : (
                boxSets.map((s) => {
                  const isPending = !s.loadedWeight || Number(s.loadedWeight) <= 0;

                  return (
                    <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">Box Set #{s.boxSetNumber} ({s.boxesInSet || 5} Boxes)</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isPending ? 'Pending Load Wt' : 'Loaded ✓'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditBoxSet(s)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60"
                            title="Edit Box Set (Popup)"
                          >
                            <Edit className="h-4 w-4 text-emerald-700" />
                          </button>
                          <button
                            onClick={() => handleDeleteBoxSet(s.id)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100/60"
                            title="Delete Box Set"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Tare / Loaded Wt</span>
                          <span className="font-bold text-slate-700">
                            {s.emptyBoxWeight} kg / {isPending ? <em className="text-amber-600 font-normal">Pending</em> : `${s.loadedWeight} kg`}
                          </span>
                        </div>
                        <div className={`p-2.5 rounded-lg border ${isPending ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <span className={`text-[10px] font-bold block uppercase ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                            Net Chicken Wt
                          </span>
                          <span className={`font-black ${isPending ? 'text-amber-900 text-xs' : 'text-emerald-900 text-sm'}`}>
                            {isPending ? 'Click button below' : `${s.totalChickenWeight} kg`}
                          </span>
                        </div>
                      </div>

                      {isPending ? (
                        <button
                          onClick={() => handleEnterLoadWeight(s)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2 text-xs font-bold text-white shadow-2xs hover:from-amber-700 hover:to-orange-700 transition-all active:scale-95"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          <span>+ Enter Loaded Weight (Popup)</span>
                        </button>
                      ) : (
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 text-slate-600 font-medium">
                          <span>Birds: <strong className="text-slate-900">{s.chickenCount}</strong></span>
                          <span>Avg: <strong className="text-slate-900">{s.averageChickenWeight} kg/bird</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="pb-3 px-2">Set #</th>
                    <th className="pb-3 px-2">Boxes in Set</th>
                    <th className="pb-3 px-2">Empty Box Wt</th>
                    <th className="pb-3 px-2">Loaded Wt</th>
                    <th className="pb-3 px-2">Birds Count</th>
                    <th className="pb-3 px-2">Total Net Wt</th>
                    <th className="pb-3 px-2">Avg Weight</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {boxSets.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No box sets recorded for this vehicle yet. Click <strong>+ Create Set</strong> above to add set tare weights.
                      </td>
                    </tr>
                  ) : (
                    boxSets.map((s) => {
                      const isPending = !s.loadedWeight || Number(s.loadedWeight) <= 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-bold text-slate-900">Box Set #{s.boxSetNumber}</td>
                          <td className="py-3 px-2 text-slate-700 font-bold">{s.boxesInSet || 5} Boxes</td>
                          <td className="py-3 px-2 text-slate-600">{s.emptyBoxWeight} kg</td>
                          <td className="py-3 px-2">
                            {isPending ? (
                              <button
                                onClick={() => handleEnterLoadWeight(s)}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Add Load Wt (Popup)
                              </button>
                            ) : (
                              <span className="font-bold text-slate-900">{s.loadedWeight} kg</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-emerald-700 font-bold">{s.chickenCount}</td>
                          <td className="py-3 px-2">
                            {isPending ? (
                              <span className="text-amber-600 font-semibold italic text-[11px]">Pending Load</span>
                            ) : (
                              <span className="text-emerald-600 font-black">{s.totalChickenWeight} kg</span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {isPending ? '—' : `${s.averageChickenWeight} kg`}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditBoxSet(s)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title="Edit Box Set (Popup)"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBoxSet(s.id)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                title="Delete Box Set"
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
      )}

      {/* CREATE / EDIT BOX SET POPUP MODAL */}
      <Modal
        isOpen={showSetForm}
        onClose={() => {
          setShowSetForm(false);
          setEditingBoxSetId(null);
        }}
        title={editingBoxSetId ? `Edit Box Set #${setForm.boxSetNumber}` : `Create Box Set #${setForm.boxSetNumber}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveBoxSet} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Set Number *</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Boxes in Set (Default 5) *</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Chickens in Set *</label>
              <input
                type="number"
                required
                min="1"
                value={setForm.chickenCount}
                onChange={(e) => setSetForm({ ...setForm, chickenCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-emerald-700 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Auto: {activeDispatch?.chickenCountPerBox || 12} birds/box × {setForm.boxesInSet}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Empty Box Tare Weight (kg) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                placeholder="e.g. 25.0 kg"
                value={setForm.emptyBoxWeight}
                onChange={(e) => setSetForm({ ...setForm, emptyBoxWeight: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Auto: 5kg × {setForm.boxesInSet} boxes</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Loaded Gross Weight (kg) <span className="text-amber-600 font-medium">(Optional)</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 145.0 kg (blank for Tare only)"
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
                    <span className="font-bold block">Stage 1: Saving Tare Weight Only ({setForm.emptyBoxWeight || 25} kg)</span>
                    <span className="text-[11px] text-amber-700">Save empty set now and update Loaded Gross Weight later when birds are loaded.</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">Net Chicken Weight</span>
                  <span className="text-base font-black text-emerald-900">{preview.totalChickenWeight} kg</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">Average Weight / Bird</span>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving
                ? 'Saving Set...'
                : editingBoxSetId
                ? 'Update Box Set (Instantly)'
                : setForm.loadedWeight
                ? `Save Set #${setForm.boxSetNumber} (Tare + Load)`
                : `Save Set #${setForm.boxSetNumber} (Tare Only)`}
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
          title={`Enter Loaded Weight: Box Set #${loadWeightSet.boxSetNumber}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveQuickLoadWeight} className="space-y-4">
            {/* Set Context Pill */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Boxes</span>
                <span className="font-bold text-slate-800">{loadWeightSet.boxesInSet || 5} Boxes</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Tare Weight</span>
                <span className="font-bold text-slate-800">{loadWeightSet.emptyBoxWeight} kg</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Chickens</span>
                <span className="font-bold text-emerald-700">{loadWeightSet.chickenCount} Birds</span>
              </div>
            </div>

            {/* Main Loaded Gross Weight Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Loaded Gross Weight (kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  autoFocus
                  min={(Number(loadWeightSet.emptyBoxWeight) + 0.1).toString()}
                  step="0.1"
                  placeholder="e.g. 145.0 kg"
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
                    Enter the gross scale weight when all {loadWeightSet.boxesInSet || 5} boxes are loaded.
                  </div>
                );
              }

              return (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Net Chicken Weight</span>
                    <span className="text-base sm:text-lg font-black text-emerald-950">{preview.totalChickenWeight} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Avg Weight / Bird</span>
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Loaded Weight (Instantly)'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Vehicle Header Form Modal (Create / Edit Vehicle Card Setup) */}
      <Modal
        isOpen={showHeaderForm}
        onClose={() => setShowHeaderForm(false)}
        title={activeDispatch ? `Edit Vehicle Card: ${activeDispatch.vehicleNumber}` : "Setup New Vehicle Dispatch Card"}
      >
        <form onSubmit={handleSaveDispatchHeader} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trader / Vehicle Name *</label>
              <input
                type="text"
                required
                value={dispatchHeader.vehicleName}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleName: e.target.value })}
                placeholder="e.g. Sri Amman Poultry / Eicher"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number *</label>
              <input
                type="text"
                required
                value={dispatchHeader.vehicleNumber}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleNumber: e.target.value })}
                placeholder="e.g. TN-38-C-5544"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name *</label>
              <input
                type="text"
                required
                value={dispatchHeader.driverName}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverName: e.target.value })}
                placeholder="e.g. Karthik"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driver Mobile Number *</label>
              <input
                type="tel"
                required
                value={dispatchHeader.driverMobileNumber}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverMobileNumber: e.target.value })}
                placeholder="e.g. 9842101234"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Date *</label>
              <input
                type="date"
                required
                value={dispatchHeader.dispatchDate}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, dispatchDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Box Count *</label>
              <input
                type="number"
                required
                min="1"
                value={dispatchHeader.totalBoxCount}
                onChange={(e) => setDispatchHeader({ ...dispatchHeader, totalBoxCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
              <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">Increase count here to add extra box sets</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Birds Per Box *</label>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving Setup...' : activeDispatch ? 'Update Setup & Create Extra Set' : 'Save & Open Vehicle Page'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Trader Invoice Modal */}
      {activeDispatch && (
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title={`Trader Invoice: ${activeDispatch.vehicleNumber}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{activeDispatch.vehicleName || 'Trader Purchase'}</h3>
                  <p className="text-xs text-slate-500">Vehicle: {activeDispatch.vehicleNumber} • {activeDispatch.dispatchDate}</p>
                </div>
                <Badge variant={activeDispatch.status}>{activeDispatch.status}</Badge>
              </div>

              <div className="space-y-1.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between">
                  <span>Driver Name:</span>
                  <span className="font-bold text-slate-900">{activeDispatch.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Boxes Weighed:</span>
                  <span className="font-bold text-slate-900">{totalWeighedBoxes} Boxes ({boxSets.length} Sets)</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Dispatched Birds:</span>
                  <span className="font-bold text-emerald-700">{totalDispatchedBirds} Birds</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Net Weight:</span>
                  <span className="font-bold text-emerald-700">{totalNetWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Bird Weight:</span>
                  <span className="font-bold text-slate-900">{avgBirdWeight} kg/bird</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Rate per Kg (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs font-bold text-slate-900"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Invoice Amount</span>
                  <span className="text-lg font-black text-emerald-700">₹{(totalNetWeight * ratePerKg).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
