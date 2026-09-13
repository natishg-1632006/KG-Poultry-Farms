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
import { calculateTotalChickenCount, calculateBoxSetWeights } from '../utils/calculations';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Truck, Save, Scale, CheckCircle2, Edit, Trash2, Plus, FileText, Printer } from 'lucide-react';

export const DispatchPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dispatches, setDispatches] = useState([]);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [boxSets, setBoxSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingBoxSetId, setEditingBoxSetId] = useState(null);
  const [showHeaderForm, setShowHeaderForm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [ratePerKg, setRatePerKg] = useState(135);

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

  useEffect(() => {
    if (activeDispatch) {
      loadBoxSetsForDispatch(activeDispatch.id);
    }
  }, [activeDispatch]);

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
      if (filtered.length > 0) {
        if (!activeDispatch || !filtered.some(d => d.id === activeDispatch.id)) {
          setActiveDispatch(filtered[0]);
        }
      } else {
        setActiveDispatch(null);
        setBoxSets([]);
      }
    } catch (err) {
      console.error('Failed loading dispatches:', err);
    }
  }

  async function loadBoxSetsForDispatch(dId) {
    try {
      const list = await dbGetBoxSets(dId);
      setBoxSets(list || []);

      const currentWeighedBoxes = (list || []).reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const totalHeaderBoxes = activeDispatch?.totalBoxCount || 20;
      const remainingBoxes = Math.max(0, totalHeaderBoxes - currentWeighedBoxes);
      const defaultBoxesInSet = remainingBoxes > 0 ? Math.min(5, remainingBoxes) : 5;
      const perBoxCount = activeDispatch?.chickenCountPerBox || 12;

      setSetForm({
        boxSetNumber: (list || []).length + 1,
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

      setSuccessMsg(`Vehicle ${payload.vehicleNumber} saved! You can now log set weights below.`);
      setActiveDispatch(saved);
      setShowHeaderForm(false);
      loadDispatchesForBatch(selectedBatch.id);
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

  const handleSaveBoxSet = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!activeDispatch) return;

    setSaving(true);
    try {
      const setWeights = calculateBoxSetWeights(
        setForm.loadedWeight,
        setForm.emptyBoxWeight,
        setForm.chickenCount
      );

      const setPayload = {
        id: editingBoxSetId || `set-${Date.now()}`,
        dispatchId: activeDispatch.id,
        boxSetNumber: Number(setForm.boxSetNumber),
        boxesInSet: Number(setForm.boxesInSet || 5),
        emptyBoxWeight: Number(setForm.emptyBoxWeight),
        loadedWeight: Number(setForm.loadedWeight),
        chickenCount: Number(setForm.chickenCount),
        totalChickenWeight: setWeights.totalChickenWeight,
        averageChickenWeight: setWeights.averageChickenWeight
      };

      await dbSaveBoxSet(activeDispatch.id, setPayload);

      const updatedSets = await dbGetBoxSets(activeDispatch.id);
      const combinedWeight = updatedSets.reduce((acc, s) => acc + (s.totalChickenWeight || 0), 0);
      const combinedChicks = updatedSets.reduce((acc, s) => acc + (s.chickenCount || 0), 0);
      const combinedBoxes = updatedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        averageWeight: combinedAvg,
        status: combinedBoxes >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
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
        `Saved Box Set #${setPayload.boxSetNumber} (${setPayload.boxesInSet} boxes, Net: ${setPayload.totalChickenWeight}kg) for vehicle ${activeDispatch.vehicleNumber}`,
        userProfile?.name
      );

      setSuccessMsg(`Box Set #${setPayload.boxSetNumber} saved instantly to database!`);
      setEditingBoxSetId(null);
      setActiveDispatch(updatedDispatch);
      loadBoxSetsForDispatch(activeDispatch.id);
    } catch (err) {
      alert('Failed saving box set: ' + err.message);
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
      const combinedWeight = updatedSets.reduce((acc, s) => acc + (s.totalChickenWeight || 0), 0);
      const combinedChicks = updatedSets.reduce((acc, s) => acc + (s.chickenCount || 0), 0);
      const combinedBoxes = updatedSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        averageWeight: combinedAvg,
        status: combinedBoxes >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
      };

      await dbSaveDispatch(updatedDispatch);
      setActiveDispatch(updatedDispatch);
      loadBoxSetsForDispatch(activeDispatch.id);
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
  };

  const totalWeighedBoxes = boxSets.reduce((acc, s) => acc + (Number(s.boxesInSet) || 1), 0);
  const totalDispatchedBirds = boxSets.reduce((acc, s) => acc + (Number(s.chickenCount) || 0), 0);
  const totalNetWeight = boxSets.reduce((acc, s) => acc + (Number(s.totalChickenWeight) || 0), 0);
  const avgBirdWeight = totalDispatchedBirds > 0 ? parseFloat((totalNetWeight / totalDispatchedBirds).toFixed(3)) : 0;

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Dispatch Management...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Chicken Dispatch & Weighing</h1>
          <p className="text-sm font-medium text-slate-500">Manage vehicle dispatches, set-by-set weighing, and trader invoices.</p>
        </div>
        <button
          onClick={handleOpenNewDispatch}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add New Vehicle Dispatch</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Concurrent Active Vehicles Bar */}
      {dispatches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="text-xs font-bold text-slate-500 shrink-0">Active Vehicles:</span>
          {dispatches.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDispatch(d)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeDispatch?.id === d.id
                  ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>{d.vehicleNumber} ({d.vehicleName || 'Vehicle'})</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                activeDispatch?.id === d.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {d.status || 'In Progress'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Vehicle Info & Weighing Form */}
      {activeDispatch && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Vehicle Setup Info Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Vehicle & Trader Setup</h2>
              </div>
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
                className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Trader / Vehicle Name:</span>
                <span className="font-bold text-slate-900">{activeDispatch.vehicleName || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Vehicle Number:</span>
                <span className="font-extrabold text-emerald-700">{activeDispatch.vehicleNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Driver Details:</span>
                <span className="font-bold text-slate-900">{activeDispatch.driverName} ({activeDispatch.driverMobileNumber || '—'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Dispatch Date:</span>
                <span className="font-bold text-slate-900">{activeDispatch.dispatchDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Target Total Boxes:</span>
                <span className="font-bold text-slate-900">{activeDispatch.totalBoxCount} Boxes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Default Birds / Box:</span>
                <span className="font-bold text-slate-900">{activeDispatch.chickenCountPerBox} Birds</span>
              </div>
            </div>

            {/* Overall Live Weighing Progress */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Boxes Weighed Progress</span>
                <span className="text-emerald-700">{totalWeighedBoxes} / {activeDispatch.totalBoxCount} Boxes</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalWeighedBoxes / (activeDispatch.totalBoxCount || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>Generate Trader Invoice</span>
            </button>
          </div>

          {/* Weighing Entry Form (Tare & Gross) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {editingBoxSetId ? `Edit Box Set #${setForm.boxSetNumber}` : `Set Weighing Entry (Box Set #${setForm.boxSetNumber})`}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Data saves instantly to DB ✓</span>
            </div>

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
                  <span className="text-[10px] text-slate-400 font-medium">Auto-calculated: 5kg × {setForm.boxesInSet} boxes</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loaded Gross Weight (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    placeholder="e.g. 145.0 kg"
                    value={setForm.loadedWeight}
                    onChange={(e) => setSetForm({ ...setForm, loadedWeight: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-black text-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {(() => {
                const preview = calculateBoxSetWeights(setForm.loadedWeight, setForm.emptyBoxWeight, setForm.chickenCount);
                return (
                  <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 grid grid-cols-2 gap-3 text-xs">
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

              <div className="flex gap-2">
                {editingBoxSetId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBoxSetId(null);
                      setSetForm({
                        boxSetNumber: boxSets.length + 1,
                        boxesInSet: 5,
                        emptyBoxWeight: 25,
                        loadedWeight: '',
                        chickenCount: 60
                      });
                    }}
                    className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving Set...' : editingBoxSetId ? 'Update Set Weight' : `Save Box Set #${setForm.boxSetNumber} (Instantly)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Dispatched KPI Summary Cards */}
      {activeDispatch && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Total Net Weight</span>
            <span className="text-xl font-black text-slate-900">{totalNetWeight} <span className="text-xs font-medium text-slate-500">kg</span></span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Birds Dispatched</span>
            <span className="text-xl font-black text-emerald-700">{totalDispatchedBirds} <span className="text-xs font-medium text-slate-500">birds</span></span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Average Bird Weight</span>
            <span className="text-xl font-black text-teal-700">{avgBirdWeight} <span className="text-xs font-medium text-slate-500">kg/bird</span></span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Sets Weighed</span>
            <span className="text-xl font-black text-slate-900">{boxSets.length} <span className="text-xs font-medium text-slate-500">sets ({totalWeighedBoxes} boxes)</span></span>
          </div>
        </div>
      )}

      {/* Box Sets History - Mobile Cards & Desktop Table */}
      {activeDispatch && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Box Sets History ({activeDispatch.vehicleNumber})
            </h2>
            <Badge variant={activeDispatch.status}>{activeDispatch.status}</Badge>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {boxSets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No box sets recorded for this vehicle yet. Use the weighing form above to enter set weights.
              </div>
            ) : (
              boxSets.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-black text-slate-900">Box Set #{s.boxSetNumber} ({s.boxesInSet || 5} Boxes)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditBoxSet(s)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60"
                        title="Edit Box Set"
                      >
                        <Edit className="h-4 w-4" />
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
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tare / Loaded Wt</span>
                      <span className="font-bold text-slate-700">{s.emptyBoxWeight} kg / {s.loadedWeight} kg</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-bold block uppercase">Net Chicken Wt</span>
                      <span className="font-black text-emerald-900">{s.totalChickenWeight} kg</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 text-slate-600 font-medium">
                    <span>Birds: <strong className="text-slate-900">{s.chickenCount}</strong></span>
                    <span>Avg: <strong className="text-slate-900">{s.averageChickenWeight} kg/bird</strong></span>
                  </div>
                </div>
              ))
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
                    <td colSpan="8" className="py-6 text-center text-slate-400">No box sets recorded for this vehicle yet.</td>
                  </tr>
                ) : (
                  boxSets.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">Box Set #{s.boxSetNumber}</td>
                      <td className="py-3 px-2 text-slate-700 font-bold">{s.boxesInSet || 5} Boxes</td>
                      <td className="py-3 px-2 text-slate-600">{s.emptyBoxWeight} kg</td>
                      <td className="py-3 px-2 text-slate-900 font-bold">{s.loadedWeight} kg</td>
                      <td className="py-3 px-2 text-emerald-700 font-bold">{s.chickenCount}</td>
                      <td className="py-3 px-2 text-emerald-600 font-black">{s.totalChickenWeight} kg</td>
                      <td className="py-3 px-2 font-bold text-slate-900">{s.averageChickenWeight} kg</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditBoxSet(s)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Box Set"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Header Form Modal (Step 1 Setup) */}
      <Modal
        isOpen={showHeaderForm}
        onClose={() => setShowHeaderForm(false)}
        title={activeDispatch ? `Edit Vehicle Header: ${activeDispatch.vehicleNumber}` : "Setup New Vehicle Dispatch"}
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
                placeholder="e.g. Sri Amman Poultry / Eicher Pro"
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
              {saving ? 'Saving Header...' : activeDispatch ? 'Update Header' : 'Create & Start Weighing'}
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


