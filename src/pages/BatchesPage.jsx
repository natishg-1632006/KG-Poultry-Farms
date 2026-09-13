import React, { useState, useEffect } from 'react';
import { dbGetBatches, dbSaveBatch, dbDeleteBatch, dbGetUsers, dbLogAuditEvent } from '../services/dbService';
import { generateBatchNumber, generateBatchName } from '../utils/calculations';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Search, Edit, Trash2, RotateCcw } from 'lucide-react';

export const BatchesPage = () => {
  const { userProfile: currentUserProfile } = useAuth();
  const [batches, setBatches] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [formData, setFormData] = useState({
    batchNumber: '',
    batchName: '',
    chickArrivalDate: new Date().toISOString().split('T')[0],
    initialChickCount: 5000,
    assignedFarmerId: '',
    assignedFarmerName: '',
    vehicleNumber: '',
    driverName: '',
    status: 'Draft'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bList, uList] = await Promise.all([dbGetBatches(), dbGetUsers()]);
      setBatches(bList);
      setFarmers(uList.filter(u => u.role === 'Farmer' && u.active));
    } catch (err) {
      console.error('Failed loading batches:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreateModal = () => {
    setSelectedBatch(null);
    const nextNum = generateBatchNumber(batches.length);
    const nextName = generateBatchName(batches.length);
    setFormData({
      batchNumber: nextNum,
      batchName: nextName,
      chickArrivalDate: new Date().toISOString().split('T')[0],
      initialChickCount: 5000,
      assignedFarmerId: farmers[0]?.uid || '',
      assignedFarmerName: farmers[0]?.name || '',
      vehicleNumber: '',
      driverName: '',
      status: 'Draft'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      batchNumber: batch.batchNumber,
      batchName: batch.batchName,
      chickArrivalDate: batch.chickArrivalDate,
      initialChickCount: batch.initialChickCount,
      assignedFarmerId: batch.assignedFarmerId || '',
      assignedFarmerName: batch.assignedFarmerName || '',
      vehicleNumber: batch.vehicleNumber || '',
      driverName: batch.driverName || '',
      status: batch.status || 'Draft'
    });
    setIsModalOpen(true);
  };

  const handleFarmerChange = (e) => {
    const farmerId = e.target.value;
    const farmerObj = farmers.find(f => f.uid === farmerId);
    setFormData({
      ...formData,
      assignedFarmerId: farmerId,
      assignedFarmerName: farmerObj ? farmerObj.name : ''
    });
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    try {
      const batchData = {
        ...formData,
        id: selectedBatch ? selectedBatch.id : formData.batchNumber,
        remainingChickCount: selectedBatch ? selectedBatch.remainingChickCount : Number(formData.initialChickCount),
        feedStock: selectedBatch ? selectedBatch.feedStock : { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 },
        createdAt: selectedBatch ? selectedBatch.createdAt : new Date().toISOString()
      };

      await dbSaveBatch(batchData);
      await dbLogAuditEvent(
        selectedBatch ? 'BATCH_UPDATED' : 'BATCH_CREATED',
        `${selectedBatch ? 'Updated' : 'Created'} batch ${batchData.batchNumber} (${batchData.status})`,
        currentUserProfile?.name
      );
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Failed saving batch: ' + err.message);
    }
  };

  const handleChangeStatus = async (batch, newStatus) => {
    try {
      const updated = { ...batch, status: newStatus };
      await dbSaveBatch(updated);
      await dbLogAuditEvent(
        'BATCH_STATUS_CHANGED',
        `Changed batch ${batch.batchNumber} status from ${batch.status} to ${newStatus}`,
        currentUserProfile?.name
      );
      loadData();
    } catch (err) {
      alert('Failed updating batch status.');
    }
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm(`Are you sure you want to delete batch ${batchId}? All daily records will be deleted.`)) {
      return;
    }
    try {
      await dbDeleteBatch(batchId);
      await dbLogAuditEvent('BATCH_DELETED', `Deleted batch ${batchId}`, currentUserProfile?.name);
      loadData();
    } catch (err) {
      alert('Failed deleting batch.');
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.batchName.toLowerCase().includes(search.toLowerCase()) ||
      (b.assignedFarmerName && b.assignedFarmerName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Batch Management...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Batch Management</h1>
          <p className="text-sm font-medium text-slate-500">Create, assign, edit, and track broiler chick batches (Draft → Active → Completed).</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Batch
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch number (KG001), name, or farmer..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft Only</option>
            <option value="Active">Active Only</option>
            <option value="Completed">Completed Only</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">Batch # & Name</th>
                <th className="pb-3 px-2">Arrival Date</th>
                <th className="pb-3 px-2">Chick Count (Init / Rem)</th>
                <th className="pb-3 px-2">Assigned Farmer</th>
                <th className="pb-3 px-2">Vehicle / Driver</th>
                <th className="pb-3 px-2">Status Workflow</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No batches match the search criteria.</td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900">{b.batchNumber}</div>
                      <div className="text-[10px] text-slate-500">{b.batchName}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-medium">{b.chickArrivalDate}</td>
                    <td className="py-3 px-2">
                      <span className="font-bold text-slate-900">{b.initialChickCount}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-bold text-emerald-700">{b.remainingChickCount ?? b.initialChickCount}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-800 font-semibold">{b.assignedFarmerName || 'Unassigned'}</td>
                    <td className="py-3 px-2 text-slate-600">
                      <div>{b.vehicleNumber || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{b.driverName || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={b.status}>{b.status}</Badge>
                        {b.status === 'Draft' && (
                          <button
                            onClick={() => handleChangeStatus(b, 'Active')}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Set Active
                          </button>
                        )}
                        {b.status === 'Active' && (
                          <button
                            onClick={() => handleChangeStatus(b, 'Completed')}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Complete
                          </button>
                        )}
                        {b.status === 'Completed' && (
                          <button
                            onClick={() => handleChangeStatus(b, 'Active')}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                            title="Reopen Batch"
                          >
                            <RotateCcw className="h-3 w-3" /> Reopen
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Batch"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete Batch"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create / Edit Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBatch ? `Edit Batch ${selectedBatch.batchNumber}` : 'Create New Broiler Batch'}
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch Number (Auto)</label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch Name (Auto)</label>
              <input
                type="text"
                required
                value={formData.batchName}
                onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chick Arrival Date *</label>
              <input
                type="date"
                required
                value={formData.chickArrivalDate}
                onChange={(e) => setFormData({ ...formData, chickArrivalDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Chick Count *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.initialChickCount}
                onChange={(e) => setFormData({ ...formData, initialChickCount: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Farmer *</label>
              <select
                value={formData.assignedFarmerId}
                onChange={handleFarmerChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="">-- Select Farmer --</option>
                {farmers.map((f) => (
                  <option key={f.uid} value={f.uid}>
                    {f.name} ({f.farmName || 'Shed'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch Workflow Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Draft">Draft (Preparation)</option>
                <option value="Active">Active (Farmer Recording Allowed)</option>
                <option value="Completed">Completed (Read-Only for Farmer)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                placeholder="e.g. TN-38-AX-1234"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="e.g. Suresh"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              Save Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
