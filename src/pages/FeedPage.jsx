import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetFeedArrivals, dbAddFeedArrival, dbLogAuditEvent } from '../services/dbService';
import { StatCard } from '../components/common/StatCard';
import { Wheat, Truck, Save, CheckCircle2 } from 'lucide-react';

export const FeedPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [feedArrivals, setFeedArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    feedType: 'Pre-Starter',
    driverName: '',
    vehicleNumber: '',
    quantityReceived: 500,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadBatches();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadFeedArrivals(selectedBatchId);
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
      console.error('Failed loading batches for feed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedArrivals(bId) {
    try {
      const list = await dbGetFeedArrivals(bId);
      setFeedArrivals(list);
    } catch (err) {
      console.error('Failed loading feed arrivals:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const feedStock = selectedBatch?.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };

  const handleAddArrival = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch) return;

    setSaving(true);
    try {
      const feedObj = {
        ...formData,
        quantityReceived: Number(formData.quantityReceived)
      };

      await dbAddFeedArrival(selectedBatch.id, feedObj);
      await dbLogAuditEvent(
        'FEED_ARRIVED',
        `Received ${formData.quantityReceived}kg of ${formData.feedType} for ${selectedBatch.batchNumber} (Vehicle: ${formData.vehicleNumber})`,
        userProfile?.name
      );

      setSuccessMsg(`Successfully added ${formData.quantityReceived} kg of ${formData.feedType}!`);
      loadFeedArrivals(selectedBatch.id);
      loadBatches();
      setFormData({
        feedType: 'Pre-Starter',
        driverName: '',
        vehicleNumber: '',
        quantityReceived: 500,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (err) {
      alert('Failed recording feed arrival: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Feed Management...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Feed Stock & Arrival Management</h1>
          <p className="text-sm font-medium text-slate-500">Log incoming feed bags, driver/vehicle records, and view live stock pools.</p>
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

      {/* Stock Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="1. Pre-Starter Stock"
          value={`${feedStock['Pre-Starter'] || 0} kg`}
          subtext="First deduction priority"
          icon={Wheat}
          color="amber"
        />
        <StatCard
          title="2. Starter Stock"
          value={`${feedStock['Starter'] || 0} kg`}
          subtext="Second deduction priority"
          icon={Wheat}
          color="indigo"
        />
        <StatCard
          title="3. Finisher Stock"
          value={`${feedStock['Finisher'] || 0} kg`}
          subtext="Third deduction priority"
          icon={Wheat}
          color="blue"
        />
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Feed Arrival Entry Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-600" />
            Receive Feed Stock Arrival
          </h2>

          <form onSubmit={handleAddArrival} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Feed Type *</label>
              <select
                value={formData.feedType}
                onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
              >
                <option value="Pre-Starter">Pre-Starter</option>
                <option value="Starter">Starter</option>
                <option value="Finisher">Finisher</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Received (kg) *</label>
              <input
                type="number"
                required
                min="1"
                step="0.5"
                value={formData.quantityReceived}
                onChange={(e) => setFormData({ ...formData, quantityReceived: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arrival Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g. TN-38-B-9988"
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="e.g. Murugan"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional delivery comments..."
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Processing...' : 'Add Feed Stock'}
            </button>
          </form>
        </div>

        {/* Feed Arrival History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Feed Arrival Log History ({selectedBatch?.batchNumber})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Feed Type</th>
                  <th className="pb-3 px-2">Quantity Recv</th>
                  <th className="pb-3 px-2">Vehicle #</th>
                  <th className="pb-3 px-2">Driver Name</th>
                  <th className="pb-3 px-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {feedArrivals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">No feed arrivals recorded for this batch yet.</td>
                  </tr>
                ) : (
                  feedArrivals.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-900">{f.date}</td>
                      <td className="py-3 px-2 font-bold text-amber-700">{f.feedType}</td>
                      <td className="py-3 px-2 font-bold text-emerald-600">+{f.quantityReceived} kg</td>
                      <td className="py-3 px-2 text-slate-600">{f.vehicleNumber || '—'}</td>
                      <td className="py-3 px-2 text-slate-600">{f.driverName || '—'}</td>
                      <td className="py-3 px-2 text-slate-500 text-[11px]">{f.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
