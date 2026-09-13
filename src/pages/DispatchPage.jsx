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
import { Truck, Save, Scale, CheckCircle2, Edit, Trash2, Layers, Plus } from 'lucide-react';

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
  const [showForm, setShowForm] = useState(false);

  const [dispatchHeader, setDispatchHeader] = useState({
    vehicleName: 'Eicher Pro 2049',
    vehicleNumber: 'TN-38-C-5544',
    driverName: 'Karthik',
    driverMobileNumber: '9842101234',
    dispatchDate: new Date().toISOString().split('T')[0],
    totalBoxCount: 10,
    chickenCountPerBox: 12,
    totalChickenCount: 120
  });

  const [setForm, setSetForm] = useState({
    boxSetNumber: 1,
    emptyBoxWeight: 5,
    loadedWeight: 29,
    chickenCount: 12
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
        setActiveDispatch(filtered[0]);
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
      setBoxSets(list);
      setSetForm(prev => ({
        ...prev,
        boxSetNumber: list.length + 1,
        chickenCount: activeDispatch?.chickenCountPerBox || 12
      }));
    } catch (err) {
      console.error('Failed loading box sets:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleBoxCountChange = (bCount, countPerBox) => {
    const calc = calculateTotalChickenCount(bCount, countPerBox);
    setDispatchHeader({
      ...dispatchHeader,
      totalBoxCount: bCount,
      chickenCountPerBox: countPerBox,
      totalChickenCount: calc
    });
  };

  const handleEditBoxSet = (s) => {
    setEditingBoxSetId(s.id);
    setShowForm(true);
    setSetForm({
      boxSetNumber: s.boxSetNumber,
      emptyBoxWeight: s.emptyBoxWeight || 5,
      loadedWeight: s.loadedWeight || 0,
      chickenCount: s.chickenCount || 12
    });
  };

  const handleDeleteBoxSet = async (setId) => {
    if (!confirm('Are you sure you want to delete this box set?')) return;
    try {
      await dbDeleteBoxSet(activeDispatch.id, setId);
      setSuccessMsg('Box set deleted.');

      const updatedSets = await dbGetBoxSets(activeDispatch.id);
      const combinedWeight = updatedSets.reduce((acc, s) => acc + (s.totalChickenWeight || 0), 0);
      const combinedChicks = updatedSets.reduce((acc, s) => acc + (s.chickenCount || 0), 0);
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        averageWeight: combinedAvg,
        status: updatedSets.length >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
      };

      await dbSaveDispatch(updatedDispatch);
      setActiveDispatch(updatedDispatch);
      loadBoxSetsForDispatch(activeDispatch.id);
    } catch (err) {
      alert('Failed deleting box set.');
    }
  };

  const handleSaveDispatchHeader = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch) return;

    setSaving(true);
    try {
      const payload = {
        ...dispatchHeader,
        batchId: selectedBatch.id,
        totalBoxCount: Number(dispatchHeader.totalBoxCount),
        chickenCountPerBox: Number(dispatchHeader.chickenCountPerBox),
        totalChickenCount: Number(dispatchHeader.totalChickenCount),
        totalWeight: 0,
        averageWeight: 0,
        status: 'In Progress'
      };

      const saved = await dbSaveDispatch(payload);
      await dbLogAuditEvent(
        'DISPATCH_CREATED',
        `Created dispatch record for ${selectedBatch.batchNumber} (Vehicle: ${payload.vehicleNumber})`,
        userProfile?.name
      );

      setSuccessMsg('Dispatch details saved! Now enter box set weights below.');
      setActiveDispatch(saved);
      loadDispatchesForBatch(selectedBatch.id);
    } catch (err) {
      alert('Failed saving dispatch: ' + err.message);
    } finally {
      setSaving(false);
    }
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
      const combinedAvg = combinedChicks > 0 ? parseFloat((combinedWeight / combinedChicks).toFixed(3)) : 0;

      const updatedDispatch = {
        ...activeDispatch,
        totalWeight: parseFloat(combinedWeight.toFixed(2)),
        averageWeight: combinedAvg,
        status: updatedSets.length >= activeDispatch.totalBoxCount ? 'Completed' : 'In Progress'
      };

      await dbSaveDispatch(updatedDispatch);

      if (updatedDispatch.status === 'Completed') {
        const invPayload = {
          dispatchId: updatedDispatch.id,
          batchId: selectedBatch.id,
          invoiceDate: updatedDispatch.dispatchDate,
          customerName: 'KG Wholesale Poultry Traders',
          customerPhone: '9443312345',
          vehicleNumber: updatedDispatch.vehicleNumber,
          driverName: updatedDispatch.driverName,
          totalChickens: combinedChicks,
          totalWeightKg: combinedWeight,
          ratePerKg: 135,
          totalAmount: combinedWeight * 135
        };
        await dbSaveInvoice(invPayload);
      }

      await dbLogAuditEvent(
        'BOX_SET_SAVED',
        `Saved Box Set #${setPayload.boxSetNumber} (Total Weight: ${setPayload.totalChickenWeight}kg) for dispatch ${activeDispatch.id}`,
        userProfile?.name
      );

      setSuccessMsg(`Box Set #${setPayload.boxSetNumber} ${editingBoxSetId ? 'updated' : 'saved'} successfully!`);
      setEditingBoxSetId(null);
      setActiveDispatch(updatedDispatch);
      loadBoxSetsForDispatch(activeDispatch.id);

      setSetForm({
        boxSetNumber: updatedSets.length + 1,
        emptyBoxWeight: 5,
        loadedWeight: 29,
        chickenCount: activeDispatch.chickenCountPerBox || 12
      });
    } catch (err) {
      alert('Failed saving box set: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Dispatch Management...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Chicken Dispatch & Weighing</h1>
          <p className="text-sm font-medium text-slate-500">Manage vehicle dispatches, box set weights, and totals.</p>
        </div>
      </div>

      {/* Interactive Farm / Batch Button Selector Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Select Farm Shed / Batch:</span>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create Dispatch Entry</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
                className={`group flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 ${
                  selectedBatchId === b.id
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/40 border border-emerald-400/30 font-black scale-[1.02]'
                    : 'bg-slate-50/90 border border-slate-200 text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300/80 hover:text-emerald-800 font-bold shadow-xs'
                }`}
              >
                <div className={`rounded-lg p-1 transition-colors ${selectedBatchId === b.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'}`}>
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <span>{b.batchNumber}</span>
                <span className={selectedBatchId === b.id ? 'text-emerald-100 font-medium' : 'text-slate-400 group-hover:text-emerald-600 font-medium'}>({b.batchName})</span>
              </button>
            ))
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dispatch Header Selection */}
      {dispatches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Batch Dispatches:</span>
          {dispatches.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setActiveDispatch(d);
                setShowForm(true);
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeDispatch?.id === d.id
                  ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {d.vehicleNumber} ({d.dispatchDate})
            </button>
          ))}
          <button
            onClick={() => {
              setActiveDispatch(null);
              setShowForm(true);
            }}
            className="rounded-xl border border-dashed border-emerald-600 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shrink-0"
          >
            + New Dispatch Header
          </button>
        </div>
      )}

      {/* Dispatch & Weighing Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={activeDispatch ? `Dispatch & Weighing: ${activeDispatch.vehicleNumber}` : "Create New Dispatch Record"}
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Step 1: Dispatch Header Form */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Truck className="h-4 w-4 text-emerald-600" />
              Step 1: Dispatch Header Information
            </h2>

            <form onSubmit={handleSaveDispatchHeader} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    value={dispatchHeader.vehicleName}
                    onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={dispatchHeader.vehicleNumber}
                    onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
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
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Driver Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={dispatchHeader.driverMobileNumber}
                    onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverMobileNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
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
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Box Count *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={dispatchHeader.totalBoxCount}
                    onChange={(e) => handleBoxCountChange(e.target.value, dispatchHeader.chickenCountPerBox)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chicks Per Box *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={dispatchHeader.chickenCountPerBox}
                    onChange={(e) => handleBoxCountChange(dispatchHeader.totalBoxCount, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Chicken Count (Editable)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={dispatchHeader.totalChickenCount}
                  onChange={(e) => setDispatchHeader({ ...dispatchHeader, totalChickenCount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50/50 focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {activeDispatch ? 'Update Dispatch Header' : 'Create Dispatch Header'}
              </button>
            </form>
          </div>

          {/* Step 2: Box Set Weighing */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              Step 2: Box Set Weighing
            </h2>

            {!activeDispatch ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white">
                Please save the Step 1 Dispatch Header details first before entering box set weights.
              </div>
            ) : (
              <form onSubmit={handleSaveBoxSet} className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Active: {activeDispatch.vehicleNumber}</span>
                  <span>Box Sets: {boxSets.length} / {activeDispatch.totalBoxCount}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Box Set Number *</label>
                    <input
                      type="number"
                      required
                      value={setForm.boxSetNumber}
                      onChange={(e) => setSetForm({ ...setForm, boxSetNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Empty Box Weight (kg) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={setForm.emptyBoxWeight}
                      onChange={(e) => setSetForm({ ...setForm, emptyBoxWeight: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loaded Weight (kg) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.1"
                      value={setForm.loadedWeight}
                      onChange={(e) => setSetForm({ ...setForm, loadedWeight: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chicken Count for Set *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={setForm.chickenCount}
                      onChange={(e) => setSetForm({ ...setForm, chickenCount: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                    />
                  </div>
                </div>

                {(() => {
                  const preview = calculateBoxSetWeights(setForm.loadedWeight, setForm.emptyBoxWeight, setForm.chickenCount);
                  return (
                    <div className="rounded-xl bg-white border border-emerald-100 p-2.5 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-emerald-900">
                        <span>Total Chicken Weight:</span>
                        <span>{preview.totalChickenWeight} kg</span>
                      </div>
                      <div className="flex justify-between font-medium text-emerald-700">
                        <span>Average Chicken Weight:</span>
                        <span>{preview.averageChickenWeight} kg / chicken</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-1">
                  {editingBoxSetId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBoxSetId(null);
                        setSetForm({
                          boxSetNumber: boxSets.length + 1,
                          emptyBoxWeight: 5,
                          loadedWeight: 29,
                          chickenCount: activeDispatch.chickenCountPerBox || 12
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
                    {saving ? 'Saving Set...' : editingBoxSetId ? 'Update Box Set' : `Save Box Set #${setForm.boxSetNumber}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Modal>

      {/* Saved Box Sets Summary Table with Edit & Delete Actions */}
      {activeDispatch && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Box Sets Summary ({activeDispatch.vehicleNumber})
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600">Total Weight: <strong className="text-emerald-700">{activeDispatch.totalWeight} kg</strong></span>
              <span className="text-slate-600">Avg Weight: <strong className="text-emerald-700">{activeDispatch.averageWeight} kg</strong></span>
              <Badge variant={activeDispatch.status}>{activeDispatch.status}</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-2">Set #</th>
                  <th className="pb-3 px-2">Empty Box Wt</th>
                  <th className="pb-3 px-2">Loaded Wt</th>
                  <th className="pb-3 px-2">Chickens Count</th>
                  <th className="pb-3 px-2">Total Net Wt</th>
                  <th className="pb-3 px-2">Avg Weight</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {boxSets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">No box sets saved for this dispatch yet. Click "+ Create Dispatch Entry" to open the entry modal.</td>
                  </tr>
                ) : (
                  boxSets.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">Box Set #{s.boxSetNumber}</td>
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
    </div>
  );
};

