import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  dbGetBatches,
  dbGetDispatches,
  dbSaveDispatch,
  dbGetBoxSets,
  dbSaveBoxSet,
  dbSaveInvoice,
  dbLogAuditEvent
} from '../services/dbService';
import { calculateTotalChickenCount, calculateBoxSetWeights } from '../utils/calculations';
import { Badge } from '../components/common/Badge';
import { Truck, Save, Scale, CheckCircle2 } from 'lucide-react';

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

  // Dispatch Header form
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

  // Current active Box Set form
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

  // Auto-calculate Total Chicken Count from box count * count per box
  const handleBoxCountChange = (bCount, countPerBox) => {
    const calc = calculateTotalChickenCount(bCount, countPerBox);
    setDispatchHeader({
      ...dispatchHeader,
      totalBoxCount: bCount,
      chickenCountPerBox: countPerBox,
      totalChickenCount: calc
    });
  };

  // Step 1: Save Dispatch Header
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

  // Step 2: Save Individual Box Set
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
        dispatchId: activeDispatch.id,
        boxSetNumber: Number(setForm.boxSetNumber),
        emptyBoxWeight: Number(setForm.emptyBoxWeight),
        loadedWeight: Number(setForm.loadedWeight),
        chickenCount: Number(setForm.chickenCount),
        totalChickenWeight: setWeights.totalChickenWeight,
        averageChickenWeight: setWeights.averageChickenWeight
      };

      await dbSaveBoxSet(activeDispatch.id, setPayload);

      // Re-calculate combined dispatch total weight & avg weight
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

      // Auto-generate invoice if dispatch completed
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

      setSuccessMsg(`Box Set #${setPayload.boxSetNumber} saved successfully!`);
      setActiveDispatch(updatedDispatch);
      loadBoxSetsForDispatch(activeDispatch.id);

      // Advance to next box set number
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Chicken Dispatch & Weighing</h1>
          <p className="text-sm font-medium text-slate-500">Manage vehicle dispatches, sequential box set empty/loaded weights, and totals.</p>
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
                <option key={b.id} value={b.id}>{b.batchNumber} - {b.batchName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dispatch History Bar */}
      {dispatches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Batch Dispatches:</span>
          {dispatches.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDispatch(d)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeDispatch?.id === d.id
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {d.vehicleNumber} ({d.dispatchDate}) - {d.status}
            </button>
          ))}
          <button
            onClick={() => setActiveDispatch(null)}
            className="rounded-xl border border-dashed border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shrink-0"
          >
            + New Dispatch Header
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* STEP 1: Dispatch Details Header Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-600" />
            Step 1: Dispatch Header Information
          </h2>

          <form onSubmit={handleSaveDispatchHeader} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Name *</label>
                <input
                  type="text"
                  required
                  value={dispatchHeader.vehicleName}
                  onChange={(e) => setDispatchHeader({ ...dispatchHeader, vehicleName: e.target.value })}
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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name *</label>
                <input
                  type="text"
                  required
                  value={dispatchHeader.driverName}
                  onChange={(e) => setDispatchHeader({ ...dispatchHeader, driverName: e.target.value })}
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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  onChange={(e) => handleBoxCountChange(e.target.value, dispatchHeader.chickenCountPerBox)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
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
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
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
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50/50 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default: Total Box Count ({dispatchHeader.totalBoxCount}) × Count per Box ({dispatchHeader.chickenCountPerBox}) = {dispatchHeader.totalBoxCount * dispatchHeader.chickenCountPerBox}
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {activeDispatch ? 'Update Dispatch Header' : 'Create Dispatch Header'}
            </button>
          </form>
        </div>

        {/* STEP 2: Box Set Weight Entry Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-emerald-600" />
            Step 2: Box Set Weighing
          </h2>

          {!activeDispatch ? (
            <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
              Please save the Step 1 Dispatch Header details first before entering box set weights.
            </div>
          ) : (
            <form onSubmit={handleSaveBoxSet} className="space-y-4">
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 flex items-center justify-between text-xs font-bold text-indigo-900">
                <span>Active Dispatch: {activeDispatch.vehicleNumber}</span>
                <span>Box Sets Saved: {boxSets.length} / {activeDispatch.totalBoxCount}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Box Set Number *</label>
                  <input
                    type="number"
                    required
                    value={setForm.boxSetNumber}
                    onChange={(e) => setSetForm({ ...setForm, boxSetNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-900 bg-slate-50"
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
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default 5 kg (editable)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loaded Weight (kg) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.1"
                    value={setForm.loadedWeight}
                    onChange={(e) => setSetForm({ ...setForm, loadedWeight: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
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
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Realtime calculations preview */}
              {(() => {
                const preview = calculateBoxSetWeights(setForm.loadedWeight, setForm.emptyBoxWeight, setForm.chickenCount);
                return (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-1 text-xs">
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

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Set...' : `Save Box Set #${setForm.boxSetNumber}`}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Saved Box Sets Summary Table */}
      {activeDispatch && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Box Sets Summary ({activeDispatch.vehicleNumber})
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600">Total Dispatched Weight: <strong className="text-emerald-700">{activeDispatch.totalWeight} kg</strong></span>
              <span className="text-slate-600">Avg Weight: <strong className="text-indigo-700">{activeDispatch.averageWeight} kg</strong></span>
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
                  <th className="pb-3 px-2 text-right">Avg Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {boxSets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">No box sets saved for this dispatch yet.</td>
                  </tr>
                ) : (
                  boxSets.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">Box Set #{s.boxSetNumber}</td>
                      <td className="py-3 px-2 text-slate-600">{s.emptyBoxWeight} kg</td>
                      <td className="py-3 px-2 text-slate-900 font-bold">{s.loadedWeight} kg</td>
                      <td className="py-3 px-2 text-indigo-700 font-bold">{s.chickenCount}</td>
                      <td className="py-3 px-2 text-emerald-600 font-black">{s.totalChickenWeight} kg</td>
                      <td className="py-3 px-2 text-right font-bold text-slate-900">{s.averageChickenWeight} kg</td>
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
