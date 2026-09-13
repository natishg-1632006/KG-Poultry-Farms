import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetFeedArrivals, dbAddFeedArrival, dbDeleteFeedArrival, dbLogAuditEvent } from '../services/dbService';
import { formatFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { Wheat, Truck, Save, CheckCircle2, Edit, Trash2, Layers, Plus, Eye, User, Calendar, FileText } from 'lucide-react';

export const FeedPage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [feedArrivals, setFeedArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingFeedId, setEditingFeedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingDetail, setViewingDetail] = useState(null);

  const [formData, setFormData] = useState({
    feedType: 'Pre-Starter',
    driverName: '',
    vehicleNumber: '',
    bagsReceived: 5,
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
      const allBatches = await dbGetBatches();
      setBatches(allBatches);
    } catch (err) {
      console.error('Failed loading feed arrivals:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const feedStock = selectedBatch?.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };

  const handleEditArrival = (arrival) => {
    setEditingFeedId(arrival.id);
    setShowForm(true);
    const bags = arrival.bagsReceived || kgToBags(arrival.quantityReceived || 0, KG_PER_BAG);
    setFormData({
      feedType: arrival.feedType || 'Pre-Starter',
      driverName: arrival.driverName || '',
      vehicleNumber: arrival.vehicleNumber || '',
      bagsReceived: bags,
      date: arrival.date || new Date().toISOString().split('T')[0],
      notes: arrival.notes || ''
    });
  };

  const handleDeleteArrival = async (feedId) => {
    if (!confirm('Are you sure you want to delete this feed arrival entry? Stock KPI cards will recalculate.')) return;
    try {
      await dbDeleteFeedArrival(selectedBatchId, feedId);
      await dbLogAuditEvent('FEED_DELETED', `Deleted feed arrival entry for batch ${selectedBatch?.batchNumber}`, userProfile?.name);
      setSuccessMsg('Feed arrival record deleted successfully.');
      await loadFeedArrivals(selectedBatchId);
    } catch (err) {
      alert('Failed deleting feed arrival.');
    }
  };

  const handleAddArrival = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch) return;

    setSaving(true);
    try {
      const bags = Number(formData.bagsReceived) || 0;
      const totalKg = bagsToKg(bags, KG_PER_BAG);

      const feedObj = {
        id: editingFeedId || `feed-${Date.now()}`,
        feedType: formData.feedType,
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        bagsReceived: bags,
        quantityReceived: totalKg,
        quantityReceivedKg: totalKg,
        date: formData.date,
        notes: formData.notes
      };

      await dbAddFeedArrival(selectedBatch.id, feedObj);
      await dbLogAuditEvent(
        editingFeedId ? 'FEED_UPDATED' : 'FEED_ARRIVED',
        `${editingFeedId ? 'Updated' : 'Received'} ${bags} bags of ${formData.feedType} for ${selectedBatch.batchNumber}`,
        userProfile?.name
      );

      setSuccessMsg(`Successfully ${editingFeedId ? 'updated' : 'added'} ${bags} bags of ${formData.feedType}!`);
      setEditingFeedId(null);
      setShowForm(false);
      loadFeedArrivals(selectedBatch.id);
      setFormData({
        feedType: 'Pre-Starter',
        driverName: '',
        vehicleNumber: '',
        bagsReceived: 5,
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
      {/* Page Header with Action Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Feed Stock & Arrival Management</h1>
          <p className="text-sm font-medium text-slate-500">Log incoming feed bags arrival and view live available stock in Bags.</p>
        </div>
        <button
          onClick={() => {
            setEditingFeedId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Receive Feed Stock</span>
        </button>
      </div>

      {/* KPI Stock Cards in Bags */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="1. Pre-Starter Stock"
          value={formatFeedStock(feedStock['Pre-Starter'] || 0)}
          subtext="First deduction priority"
          icon={Wheat}
          color="emerald"
        />
        <StatCard
          title="2. Starter Stock"
          value={formatFeedStock(feedStock['Starter'] || 0)}
          subtext="Second deduction priority"
          icon={Wheat}
          color="emerald"
        />
        <StatCard
          title="3. Finisher Stock"
          value={formatFeedStock(feedStock['Finisher'] || 0)}
          subtext="Third deduction priority"
          icon={Wheat}
          color="emerald"
        />
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Feed Arrival Details Modal */}
      <Modal
        isOpen={!!viewingDetail}
        onClose={() => setViewingDetail(null)}
        title="Feed Arrival Details"
      >
        {viewingDetail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Arrival Date
                </span>
                <span className="font-bold text-slate-900">{viewingDetail.date}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Wheat className="h-4 w-4 text-emerald-600" />
                  Feed Category
                </span>
                <span className="font-bold text-emerald-700">{viewingDetail.feedType}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Bags Received
                </span>
                <span className="font-bold text-emerald-700">
                  +{viewingDetail.bagsReceived || kgToBags(viewingDetail.quantityReceived || 0, KG_PER_BAG)} Bags
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-slate-400" />
                  Vehicle Number
                </span>
                <span className="font-bold text-slate-900">{viewingDetail.vehicleNumber || '—'}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400" />
                  Driver Name
                </span>
                <span className="font-bold text-slate-900">{viewingDetail.driverName || '—'}</span>
              </div>

              {viewingDetail.notes && (
                <div className="pt-1">
                  <span className="font-medium text-slate-500 block mb-1 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Notes / Remarks
                  </span>
                  <p className="rounded-lg bg-white p-2.5 text-slate-700 border border-slate-200 font-normal">
                    {viewingDetail.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingDetail(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Feed Arrival Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingFeedId(null);
        }}
        title={editingFeedId ? "Edit Feed Stock Arrival" : "Receive Feed Stock Arrival"}
      >
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Feed Bags Received (Whole Bags: 1, 2, 3...) *</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={formData.bagsReceived}
              onChange={(e) => setFormData({ ...formData, bagsReceived: e.target.value ? Math.round(Number(e.target.value)) : '' })}
              placeholder="e.g. 5"
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600"
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

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingFeedId(null);
                setFormData({
                  feedType: 'Pre-Starter',
                  driverName: '',
                  vehicleNumber: '',
                  bagsReceived: 5,
                  date: new Date().toISOString().split('T')[0],
                  notes: ''
                });
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
              {saving ? 'Processing...' : editingFeedId ? 'Update Arrival' : 'Add Feed Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Feed Arrival History with Edit, Delete, and Popup Details Action Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Feed Arrival Log History ({selectedBatch?.batchNumber})
        </h2>

        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-1 w-[26%] truncate" title="Date">Date</th>
                <th className="pb-3 px-1 w-[28%] truncate" title="Feed Type">Feed Type</th>
                <th className="pb-3 px-1 w-[26%] truncate" title="Bags Received">Bags Received</th>
                <th className="pb-3 px-1 w-[20%] text-right truncate" title="Actions">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {feedArrivals.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">No feed arrivals recorded for this batch yet. Click any Farm button or "+ Receive Feed Stock" to add data.</td>
                </tr>
              ) : (
                feedArrivals.map((f) => {
                  const bags = f.bagsReceived || kgToBags(f.quantityReceived || 0, KG_PER_BAG);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setViewingDetail(f)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-1 font-bold text-slate-900 truncate" title={f.date}>{f.date}</td>
                      <td className="py-3 px-1 font-bold text-emerald-700 truncate" title={f.feedType}>{f.feedType}</td>
                      <td className="py-3 px-1 font-bold text-emerald-700 truncate" title={`+${bags} Bags`}>+{bags} Bags</td>
                      <td className="py-3 px-1 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingDetail(f)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View Arrival Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditArrival(f)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Arrival"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArrival(f.id)}
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Delete Arrival"
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

