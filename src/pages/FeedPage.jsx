import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetFeedArrivals, dbAddFeedArrival, dbDeleteFeedArrival, dbLogAuditEvent } from '../services/dbService';
import { formatFeedStock, bagsToKg, kgToBags } from '../utils/calculations';
import { KG_PER_BAG } from '../constants/companyTargets';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { Package, Wheat, Truck, Save, CheckCircle2, Edit, Trash2, Layers, Plus, Eye, User, Calendar, FileText, RotateCcw, AlertCircle } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

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
  const [transactionFilter, setTransactionFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    transactionType: 'Receive',
    feedType: 'Pre-Starter',
    driverName: '',
    vehicleNumber: '',
    bagsReceived: 5,
    additionalKg: 0,
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
        await loadFeedArrivals(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading batches for feed:', err);
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
    } finally {
      setLoading(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = selectedBatch ? (selectedBatch.status || '').toLowerCase() === 'completed' : false;
  const feedStock = selectedBatch?.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };

  const feedStats = feedArrivals.reduce((acc, f) => {
    const type = f.feedType || 'Pre-Starter';
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * KG_PER_BAG) + Number(f.additionalKg || 0)));
    const bags = totalKg / KG_PER_BAG;

    if (isReturn) {
      acc.returned[type] = (acc.returned[type] || 0) + bags;
    } else {
      acc.arrived[type] = (acc.arrived[type] || 0) + bags;
    }
    return acc;
  }, {
    arrived: { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 },
    returned: { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 }
  });

  const preAvailableBags = kgToBags(Number(feedStock['Pre-Starter'] || 0), KG_PER_BAG);
  const starterAvailableBags = kgToBags(Number(feedStock['Starter'] || 0), KG_PER_BAG);
  const finisherAvailableBags = kgToBags(Number(feedStock['Finisher'] || 0), KG_PER_BAG);

  const preGrossArrived = parseFloat((feedStats.arrived['Pre-Starter'] || 0).toFixed(1));
  const starterGrossArrived = parseFloat((feedStats.arrived['Starter'] || 0).toFixed(1));
  const finisherGrossArrived = parseFloat((feedStats.arrived['Finisher'] || 0).toFixed(1));

  const preReturnedBags = parseFloat((feedStats.returned['Pre-Starter'] || 0).toFixed(1));
  const starterReturnedBags = parseFloat((feedStats.returned['Starter'] || 0).toFixed(1));
  const finisherReturnedBags = parseFloat((feedStats.returned['Finisher'] || 0).toFixed(1));

  const preNetArrivedBags = parseFloat(Math.max(0, preGrossArrived - preReturnedBags).toFixed(1));
  const starterNetArrivedBags = parseFloat(Math.max(0, starterGrossArrived - starterReturnedBags).toFixed(1));
  const finisherNetArrivedBags = parseFloat(Math.max(0, finisherGrossArrived - finisherReturnedBags).toFixed(1));

  const preArrivedBags = Math.max(preNetArrivedBags, preAvailableBags);
  const starterArrivedBags = Math.max(starterNetArrivedBags, starterAvailableBags);
  const finisherArrivedBags = Math.max(finisherNetArrivedBags, finisherAvailableBags);

  const preConsumedBags = Math.max(0, parseFloat((preArrivedBags - preAvailableBags).toFixed(1)));
  const starterConsumedBags = Math.max(0, parseFloat((starterArrivedBags - starterAvailableBags).toFixed(1)));
  const finisherConsumedBags = Math.max(0, parseFloat((finisherArrivedBags - finisherAvailableBags).toFixed(1)));

  const handleEditArrival = (arrival) => {
    if (isReadOnly) return;
    setEditingFeedId(arrival.id);
    setShowForm(true);
    const bags = arrival.bagsReceived !== undefined ? arrival.bagsReceived : kgToBags(arrival.quantityReceived || 0, KG_PER_BAG);
    setFormData({
      transactionType: arrival.transactionType || 'Receive',
      feedType: arrival.feedType || 'Pre-Starter',
      driverName: arrival.driverName || '',
      vehicleNumber: arrival.vehicleNumber || '',
      bagsReceived: bags,
      additionalKg: arrival.additionalKg || 0,
      date: arrival.date || new Date().toISOString().split('T')[0],
      notes: arrival.notes || ''
    });
  };

  const handleDeleteArrival = async (feedId) => {
    if (isReadOnly) return;
    if (!confirm('Are you sure you want to delete this feed entry? Stock KPI cards will recalculate.')) return;
    try {
      await dbDeleteFeedArrival(selectedBatchId, feedId);
      await dbLogAuditEvent('FEED_DELETED', `Deleted feed entry for batch ${selectedBatch?.batchNumber}`, userProfile?.name);
      setSuccessMsg('Feed record deleted successfully.');
      await loadFeedArrivals(selectedBatchId);
    } catch (err) {
      alert('Failed deleting feed record.');
    }
  };

  const handleAddArrival = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch || isReadOnly) return;

    setSaving(true);
    try {
      const bags = Number(formData.bagsReceived || 0);
      const extraKg = Number(formData.additionalKg || 0);
      const totalKg = bagsToKg(bags, KG_PER_BAG) + extraKg;
      const isReturn = formData.transactionType === 'Return';

      if (bags === 0 && extraKg === 0) {
        alert('Please enter at least 1 bag or additional kg.');
        setSaving(false);
        return;
      }

      const currentCategoryStockKg = Number(feedStock[formData.feedType] || 0);
      if (isReturn && totalKg > currentCategoryStockKg && !editingFeedId) {
        const currentStockBagsStr = kgToBags(currentCategoryStockKg, KG_PER_BAG);
        if (!confirm(`Warning: Returning ${bags} bags & ${extraKg} kg (${totalKg} kg) exceeds current available stock (~${currentStockBagsStr} bags). Do you still want to proceed?`)) {
          setSaving(false);
          return;
        }
      }

      const feedObj = {
        id: editingFeedId || `feed-${Date.now()}`,
        transactionType: formData.transactionType || 'Receive',
        feedType: formData.feedType,
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        bagsReceived: bags,
        additionalKg: extraKg,
        quantityReceived: totalKg,
        quantityReceivedKg: totalKg,
        date: formData.date,
        notes: formData.notes
      };

      await dbAddFeedArrival(selectedBatch.id, feedObj);
      const actionText = isReturn ? 'return' : (editingFeedId ? 'update' : 'arrival');
      await dbLogAuditEvent(
        isReturn ? 'FEED_RETURNED' : (editingFeedId ? 'FEED_UPDATED' : 'FEED_ARRIVED'),
        `${isReturn ? 'Returned' : (editingFeedId ? 'Updated' : 'Received')} ${bags} bags & ${extraKg} kg of ${formData.feedType} for ${selectedBatch.batchNumber}`,
        userProfile?.name
      );

      setSuccessMsg(`Successfully recorded ${actionText} of ${bags} bags ${extraKg > 0 ? `& ${extraKg} kg` : ''} of ${formData.feedType}!`);
      setEditingFeedId(null);
      setShowForm(false);
      loadFeedArrivals(selectedBatch.id);
      setFormData({
        transactionType: 'Receive',
        feedType: 'Pre-Starter',
        driverName: '',
        vehicleNumber: '',
        bagsReceived: 5,
        additionalKg: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (err) {
      alert('Failed recording feed transaction: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredFeedArrivals = feedArrivals.filter(f => {
    if (transactionFilter === 'ALL') return true;
    const type = f.transactionType || 'Receive';
    return type === transactionFilter;
  });

  if (loading) return <LoadingSpinner message="Loading Feed Management..." />;

  return (
    <div className="space-y-6">
      {/* Page Header with Single Action Button */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 truncate">
            Feed Stock & Return Management
          </h1>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => {
              setEditingFeedId(null);
              setFormData({
                transactionType: 'Receive',
                feedType: 'Pre-Starter',
                driverName: '',
                vehicleNumber: '',
                bagsReceived: 5,
                additionalKg: 0,
                date: new Date().toISOString().split('T')[0],
                notes: ''
              });
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Log Feed Stock</span>
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Batch Marked as Completed ({selectedBatch?.batchName || selectedBatch?.batchNumber})</p>
              <p className="text-[11px] text-amber-700">This batch is completed. Feed transactions are in read-only mode.</p>
            </div>
          </div>
          <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* KPI Stock Cards in Bags */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="1. Pre-Starter Stock"
          value={`${preAvailableBags} Bags`}
          valueLabel="Available Stock"
          availableValue={`${preAvailableBags} Bags`}
          consumedValue={`${preConsumedBags} Bags`}
          arrivedValue={`${preArrivedBags} Bags`}
          subtext={`First deduction priority (Blue Bag)${preReturnedBags > 0 ? ` • ${preReturnedBags} Returned` : ''}`}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="2. Starter Stock"
          value={`${starterAvailableBags} Bags`}
          valueLabel="Available Stock"
          availableValue={`${starterAvailableBags} Bags`}
          consumedValue={`${starterConsumedBags} Bags`}
          arrivedValue={`${starterArrivedBags} Bags`}
          subtext={`Second deduction priority (Green Bag)${starterReturnedBags > 0 ? ` • ${starterReturnedBags} Returned` : ''}`}
          icon={Package}
          color="emerald"
        />
        <StatCard
          title="3. Finisher Stock"
          value={`${finisherAvailableBags} Bags`}
          valueLabel="Available Stock"
          availableValue={`${finisherAvailableBags} Bags`}
          consumedValue={`${finisherConsumedBags} Bags`}
          arrivedValue={`${finisherArrivedBags} Bags`}
          subtext={`Third deduction priority (Orange Bag)${finisherReturnedBags > 0 ? ` • ${finisherReturnedBags} Returned` : ''}`}
          icon={Package}
          color="orange"
        />
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Feed Transaction Details Modal */}
      <Modal
        isOpen={!!viewingDetail}
        onClose={() => setViewingDetail(null)}
        title="Feed Transaction Details"
      >
        {viewingDetail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-slate-400" />
                  Transaction Type
                </span>
                <span className={`font-bold inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                  viewingDetail.transactionType === 'Return' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {viewingDetail.transactionType === 'Return' ? 'Return Feed (Stock Out -)' : 'Receive Feed (Stock In +)'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Date
                </span>
                <span className="font-bold text-slate-900">{viewingDetail.date}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Package className={`h-4 w-4 ${
                    viewingDetail.feedType === 'Pre-Starter' ? 'text-blue-600' :
                    viewingDetail.feedType === 'Starter' ? 'text-emerald-600' :
                    viewingDetail.feedType === 'Finisher' ? 'text-orange-600' : 'text-slate-400'
                  }`} />
                  Feed Category
                </span>
                <span className={`font-bold ${
                  viewingDetail.feedType === 'Pre-Starter' ? 'text-blue-700' :
                  viewingDetail.feedType === 'Starter' ? 'text-emerald-700' :
                  viewingDetail.feedType === 'Finisher' ? 'text-orange-700' : 'text-slate-900'
                }`}>
                  {viewingDetail.feedType}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Quantity
                </span>
                <span className={`font-bold ${viewingDetail.transactionType === 'Return' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {viewingDetail.transactionType === 'Return' ? '-' : '+'}{viewingDetail.bagsReceived || 0} Bags
                  {viewingDetail.additionalKg ? ` & ${viewingDetail.additionalKg} kg` : ''}
                  <span className="text-slate-500 font-medium ml-1">
                    ({viewingDetail.quantityReceivedKg || viewingDetail.quantityReceived || 0} kg total)
                  </span>
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
                  Driver / Collector Name
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

      {/* Feed Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingFeedId(null);
        }}
        title={editingFeedId ? "Edit Feed Entry" : formData.transactionType === 'Return' ? "Return Feed Stock" : "Receive Feed Stock"}
      >
        <form onSubmit={handleAddArrival} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type *</label>
            <select
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
            >
              <option value="Receive">Receive Feed (Stock In +)</option>
              <option value="Return">Return Feed (Stock Out - Reduces Inventory)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Feed Type *</label>
            <select
              value={formData.feedType}
              onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
            >
              <option value="Pre-Starter">Pre-Starter (Blue Bag)</option>
              <option value="Starter">Starter (Green Bag)</option>
              <option value="Finisher">Finisher (Orange Bag)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formData.transactionType === 'Return' ? 'Bags Returned (Whole Bags)' : 'Bags Received (Whole Bags)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.bagsReceived}
                  onChange={(e) => setFormData({ ...formData, bagsReceived: e.target.value !== '' ? Number(e.target.value) : '' })}
                  placeholder="e.g. 7"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Loose Weight (Kg)
                </label>
                <input
                  type="number"
                  min="0"
                  max="69"
                  step="0.5"
                  value={formData.additionalKg}
                  onChange={(e) => setFormData({ ...formData, additionalKg: e.target.value !== '' ? Number(e.target.value) : '' })}
                  placeholder="e.g. 55"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Helper Summary Pill */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Total Entry Quantity:</span>
              <span className={`font-black ${formData.transactionType === 'Return' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formData.transactionType === 'Return' ? '-' : '+'}{Number(formData.bagsReceived || 0)} Bags
                {Number(formData.additionalKg || 0) > 0 ? ` & ${formData.additionalKg} kg` : ''}
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  ({(Number(formData.bagsReceived || 0) * KG_PER_BAG) + Number(formData.additionalKg || 0)} kg total)
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Driver / Collector Name</label>
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
              placeholder="Optional remarks (e.g. Returned 7 bags & 55 kg loose feed)..."
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
                  transactionType: 'Receive',
                  feedType: 'Pre-Starter',
                  driverName: '',
                  vehicleNumber: '',
                  bagsReceived: 5,
                  additionalKg: 0,
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
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition-colors ${
                formData.transactionType === 'Return' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:opacity-50`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Processing...' : editingFeedId ? 'Update Entry' : formData.transactionType === 'Return' ? 'Process Return Feed' : 'Add Feed Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Feed Transaction Log History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 min-w-0">
          <h2 className="text-xs sm:text-base font-black text-slate-900 truncate">
            Feed Transaction Log History ({selectedBatch?.batchNumber})
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0 whitespace-nowrap">
            <span>Filter:</span>
            <CustomSelect
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              options={[
                { value: 'ALL', label: `All (${feedArrivals.length})` },
                { value: 'Receive', label: 'Received Only' },
                { value: 'Return', label: 'Returned Only' },
              ]}
            />
          </div>
        </div>

        {/* DESKTOP VIEW TABLE */}
        <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Transaction</th>
                <th className="py-3 px-3">Feed Category</th>
                <th className="py-3 px-3">Quantity</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
              {filteredFeedArrivals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No feed transactions recorded matching criteria.</td>
                </tr>
              ) : (
                filteredFeedArrivals.map((f) => {
                  const bags = f.bagsReceived !== undefined ? f.bagsReceived : kgToBags(f.quantityReceived || 0, KG_PER_BAG);
                  const isReturn = f.transactionType === 'Return';
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setViewingDetail(f)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">{f.date}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          isReturn ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isReturn ? <RotateCcw className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                          <span>{isReturn ? 'Return Feed' : 'Receive Feed'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <div className={`inline-flex items-center gap-1.5 ${
                          f.feedType === 'Pre-Starter' ? 'text-blue-600' :
                          f.feedType === 'Starter' ? 'text-emerald-600' :
                          f.feedType === 'Finisher' ? 'text-orange-600' : 'text-slate-700'
                        }`}>
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span>{f.feedType}</span>
                        </div>
                      </td>
                      <td className={`py-3 px-3 font-bold ${isReturn ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {isReturn ? '-' : '+'}{bags} Bags{f.additionalKg ? ` & ${f.additionalKg} kg` : ''}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingDetail(f)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleEditArrival(f)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title="Edit Entry"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteArrival(f.id)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                title="Delete Entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
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

        {/* MOBILE CARDS VIEW */}
        <div className="block sm:hidden space-y-3.5">
          {filteredFeedArrivals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No feed transactions recorded matching criteria.
            </div>
          ) : (
            filteredFeedArrivals.map((f) => {
              const bags = f.bagsReceived !== undefined ? f.bagsReceived : kgToBags(f.quantityReceived || 0, KG_PER_BAG);
              const isReturn = f.transactionType === 'Return';

              return (
                <div
                  key={f.id}
                  onClick={() => setViewingDetail(f)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3"
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-black text-slate-900">{f.date}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      isReturn ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isReturn ? <RotateCcw className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                      <span>{isReturn ? 'Return Feed' : 'Receive Feed'}</span>
                    </span>
                  </div>

                  {/* Feed Category & Quantity Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-0.5 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Feed Type</span>
                      <div className={`font-black flex items-center gap-1 truncate ${
                        f.feedType === 'Pre-Starter' ? 'text-blue-600' :
                        f.feedType === 'Starter' ? 'text-emerald-600' :
                        f.feedType === 'Finisher' ? 'text-orange-600' : 'text-slate-700'
                      }`}>
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{f.feedType}</span>
                      </div>
                    </div>

                    <div className={`rounded-xl p-2.5 border space-y-0.5 min-w-0 ${
                      isReturn ? 'bg-amber-50/80 border-amber-100 text-amber-900' : 'bg-emerald-50/80 border-emerald-100 text-emerald-950'
                    }`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Quantity</span>
                      <span className="font-black text-xs block truncate">
                        {isReturn ? '-' : '+'}{bags} Bags{f.additionalKg ? ` & ${f.additionalKg}kg` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span className="font-extrabold text-emerald-700 flex items-center gap-1.5 hover:text-emerald-800">
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      <span>View Details</span>
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleEditArrival(f)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Entry"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArrival(f.id)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Delete Entry"
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
      </div>
    </div>
  );
};

