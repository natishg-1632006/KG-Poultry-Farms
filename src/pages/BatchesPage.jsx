import React, { useState, useEffect } from 'react';
import { dbGetBatches, dbSaveBatch, dbDeleteBatch, dbGetUsers, dbLogAuditEvent } from '../services/dbService';
import { generateBatchNumber, generateBatchName } from '../utils/calculations';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Search, Edit, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';

export const BatchesPage = () => {
  const { userProfile: currentUserProfile } = useAuth();
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null,
    loading: false
  });

  // Status Change Confirmation Modal state
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    batch: null,
    newStatus: '',
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    variant: 'emerald',
    loading: false
  });

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
      const [bList] = await Promise.all([dbGetBatches(), dbGetUsers()]);
      const defaultKgFarmer = { uid: 'kg-poultry-farms', name: 'KG Poultry Farms', farmName: 'KG Main Farm' };
      setBatches(bList);
      setFarmers([defaultKgFarmer]);
    } catch (err) {
      console.error('Failed loading batches:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeBatch = batches.find(b => (b.status || '').toLowerCase() === 'active');
  const hasActiveBatch = Boolean(activeBatch);

  const handleOpenCreateModal = () => {
    if (hasActiveBatch) return;
    setSelectedBatch(null);
    const nextNum = generateBatchNumber(batches.length);
    const nextName = generateBatchName(batches.length);
    setFormData({
      batchNumber: nextNum,
      batchName: nextName,
      chickArrivalDate: new Date().toISOString().split('T')[0],
      initialChickCount: 5000,
      assignedFarmerId: 'kg-poultry-farms',
      assignedFarmerName: 'KG Poultry Farms',
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
      assignedFarmerId: 'kg-poultry-farms',
      assignedFarmerName: 'KG Poultry Farms',
      vehicleNumber: batch.vehicleNumber || '',
      driverName: batch.driverName || '',
      status: batch.status || 'Draft'
    });
    setIsModalOpen(true);
  };

  const handleFarmerChange = (e) => {
    const farmerId = e.target.value;
    const farmerObj = farmers.find(f => f.uid === farmerId) || { uid: 'kg-poultry-farms', name: 'KG Poultry Farms' };
    setFormData({
      ...formData,
      assignedFarmerId: farmerId,
      assignedFarmerName: farmerObj.name
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

  const handleRequestStatusChange = (batch, newStatus) => {
    const bName = batch.batchName || batch.batchNumber || batch.id;

    if (newStatus === 'Completed') {
      setStatusConfirmModal({
        isOpen: true,
        batch,
        newStatus: 'Completed',
        title: language === 'ta' ? `தொகுதி ${bName} ஐ முடிக்கவா?` : `Complete Batch ${bName}?`,
        message: language === 'ta'
          ? `இந்த தொகுதியை 'முடிந்தது' என மாற்றவா?`
          : `Mark batch "${bName}" as completed?`,
        confirmText: language === 'ta' ? 'ஆம், முடிந்தது' : 'Complete',
        cancelText: language === 'ta' ? 'ரத்து' : 'Cancel',
        variant: 'emerald',
        loading: false
      });
    } else if (newStatus === 'Active') {
      const isReopen = (batch.status || '').toLowerCase() === 'completed';
      setStatusConfirmModal({
        isOpen: true,
        batch,
        newStatus: 'Active',
        title: isReopen
          ? (language === 'ta' ? `தொகுதி ${bName} ஐ மீண்டும் திறக்கவா?` : `Reopen Batch ${bName}?`)
          : (language === 'ta' ? `தொகுதி ${bName} ஐ செயலில் ஆக்கவா?` : `Activate Batch ${bName}?`),
        message: isReopen
          ? (language === 'ta' ? `இந்த தொகுதியை மீண்டும் செயலில் ஆக்கவா?` : `Reopen batch "${bName}"?`)
          : (language === 'ta' ? `இந்த தொகுதியை செயலில் ஆக்கவா?` : `Activate batch "${bName}"?`),
        confirmText: isReopen
          ? (language === 'ta' ? 'ஆம், திற' : 'Reopen')
          : (language === 'ta' ? 'ஆம், செயலில் ஆக்கு' : 'Activate'),
        cancelText: language === 'ta' ? 'ரத்து' : 'Cancel',
        variant: 'info',
        loading: false
      });
    } else {
      handleChangeStatus(batch, newStatus);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmModal.batch || !statusConfirmModal.newStatus) return;
    setStatusConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      await handleChangeStatus(statusConfirmModal.batch, statusConfirmModal.newStatus);
      setStatusConfirmModal({ isOpen: false, batch: null, newStatus: '', title: '', message: '', confirmText: '', cancelText: '', variant: 'emerald', loading: false });
    } catch (err) {
      setStatusConfirmModal({ isOpen: false, batch: null, newStatus: '', title: '', message: '', confirmText: '', cancelText: '', variant: 'emerald', loading: false });
    }
  };

  const handleDelete = (batch) => {
    const batchId = typeof batch === 'object' ? batch.id : batch;
    const batchName = typeof batch === 'object' ? (batch.batchName || batch.batchNumber || batch.id) : batch;

    setDeleteModal({
      isOpen: true,
      title: language === 'ta' ? `தொகுதி ${batchName} ஐ நீக்கவா?` : `Delete Batch ${batchName}?`,
      message: language === 'ta'
        ? `தொகுதி "${batchName}" ஐ நிச்சயமாக நீக்க விரும்புகிறீர்களா? இதன் அனைத்து தரவுகளும் நிரந்தரமாக நீக்கப்படும்.`
        : `Are you sure you want to delete batch "${batchName}"? All associated daily records and logs will be permanently deleted.`,
      confirmText: language === 'ta' ? 'நீக்கு' : 'Delete',
      cancelText: language === 'ta' ? 'ரத்து' : 'Cancel',
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
          await dbDeleteBatch(batchId);
          await dbLogAuditEvent('BATCH_DELETED', `Deleted batch ${batchId}`, currentUserProfile?.name);
          loadData();
          setDeleteModal({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, loading: false });
        } catch (err) {
          setDeleteModal({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, loading: false });
          alert(language === 'ta' ? 'தொகுதியை நீக்குவதில் தோல்வி.' : 'Failed deleting batch.');
        }
      }
    });
  };

  const filteredBatches = batches
    .filter((b) => {
      const matchesSearch =
        b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.batchName.toLowerCase().includes(search.toLowerCase()) ||
        (b.assignedFarmerName && b.assignedFarmerName.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const statusA = (a.status || '').toLowerCase();
      const statusB = (b.status || '').toLowerCase();
      if (statusA === 'active' && statusB !== 'active') return -1;
      if (statusA !== 'active' && statusB === 'active') return 1;

      const dateA = new Date(a.chickArrivalDate || a.startDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.chickArrivalDate || b.startDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  if (loading) return <LoadingSpinner message="Loading Batch Management..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
          {t('batchManagement')}
        </h1>
        <button
          disabled={hasActiveBatch}
          onClick={handleOpenCreateModal}
          title={
            hasActiveBatch
              ? `Active Batch (${activeBatch?.batchName || activeBatch?.batchNumber}) is currently active. Complete it before creating a new batch.`
              : t('createNewBatch')
          }
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-black text-white shadow-sm transition-all shrink-0 whitespace-nowrap ${
            hasActiveBatch
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>{t('createNewBatch')}</span>
        </button>
      </div>

      {hasActiveBatch && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 p-3.5 text-xs font-semibold text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Active Batch Running:</strong> {activeBatch?.batchName || activeBatch?.batchNumber} is currently active. Complete this batch before creating a new one.
            </span>
          </div>
          <span className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950 shrink-0">
            Active Batch
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchBatchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-extrabold text-slate-600">{t('status')}:</label>
          <CustomSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: t('allStatuses') },
              { value: 'Draft', label: t('draftOnly') },
              { value: 'Active', label: t('activeOnly') },
              { value: 'Completed', label: t('completedOnly') },
            ]}
          />
        </div>
      </div>

      {/* Batches List - Mobile Cards View & Desktop Table View */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        {/* Mobile View: Cards Layout */}
        <div className="sm:hidden space-y-3.5">
          {filteredBatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No batches match the search criteria.
            </div>
          ) : (
            filteredBatches.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 shadow-2xs hover:border-emerald-300 transition-all"
              >
                {/* Header: Batch # & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{b.batchNumber}</h3>
                    <p className="text-xs font-semibold text-slate-500">{b.batchName}</p>
                  </div>
                  <Badge variant={b.status}>{b.status === 'Active' ? (language === 'ta' ? 'செயலில்' : 'Active') : b.status === 'Completed' ? (language === 'ta' ? 'முடிந்தது' : 'Completed') : (language === 'ta' ? 'வரைவு' : 'Draft')}</Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-slate-400 block">{t('arrivalDate')}</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{b.chickArrivalDate}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-slate-400 block">{t('chicksInitRem')}</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm">{b.initialChickCount} / <strong className="text-emerald-700">{b.remainingChickCount ?? b.initialChickCount}</strong></span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-slate-400 block">{t('assignedFarmer')}</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{b.assignedFarmerName || 'KG Poultry Farms'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-slate-400 block">{t('vehicleDriver')}</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{b.vehicleNumber || 'N/A'} <span className="text-[11px] text-slate-400 font-medium">({b.driverName || 'N/A'})</span></span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                  <div>
                    {b.status === 'Draft' && (
                      <button
                        onClick={() => handleRequestStatusChange(b, 'Active')}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs sm:text-sm font-black text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        {t('setActive')}
                      </button>
                    )}
                    {b.status === 'Active' && (
                      <button
                        onClick={() => handleRequestStatusChange(b, 'Completed')}
                        className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs sm:text-sm font-black text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all"
                      >
                        {t('completeBatch')}
                      </button>
                    )}
                    {b.status === 'Completed' && (
                      <button
                        onClick={() => handleRequestStatusChange(b, 'Active')}
                        className="rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-200 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> {t('reopenBatch')}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className="rounded-xl p-2 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 border border-slate-200/60 bg-white"
                      title="Edit Batch"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-rose-200/60 bg-white"
                      title="Delete Batch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-extrabold text-[11px] sm:text-xs">
                <th className="pb-3 px-2">{t('batchNumber')} & {language === 'ta' ? 'பெயர்' : 'Name'}</th>
                <th className="pb-3 px-2">{t('arrivalDate')}</th>
                <th className="pb-3 px-2">{t('chicksInitRem')}</th>
                <th className="pb-3 px-2">{t('assignedFarmer')}</th>
                <th className="pb-3 px-2">{t('vehicleDriver')}</th>
                <th className="pb-3 px-2">{language === 'ta' ? 'நிலை' : 'Status Workflow'}</th>
                <th className="pb-3 px-2 text-right">{t('actions')}</th>
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
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{b.batchNumber}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{b.batchName}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-semibold">{b.chickArrivalDate}</td>
                    <td className="py-3 px-2">
                      <span className="font-extrabold text-slate-900">{b.initialChickCount}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-black text-emerald-700">{b.remainingChickCount ?? b.initialChickCount}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-800 font-bold">{b.assignedFarmerName || 'KG Poultry Farms'}</td>
                    <td className="py-3 px-2 text-slate-700 font-medium">
                      <div>{b.vehicleNumber || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400 font-normal">({b.driverName || 'N/A'})</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={b.status}>{b.status === 'Active' ? (language === 'ta' ? 'செயலில்' : 'Active') : b.status === 'Completed' ? (language === 'ta' ? 'முடிந்தது' : 'Completed') : (language === 'ta' ? 'வரைவு' : 'Draft')}</Badge>
                        {b.status === 'Draft' && (
                          <button
                            onClick={() => handleRequestStatusChange(b, 'Active')}
                            className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] sm:text-xs font-black text-emerald-700 hover:bg-emerald-100"
                          >
                            {t('setActive')}
                          </button>
                        )}
                        {b.status === 'Active' && (
                          <button
                            onClick={() => handleRequestStatusChange(b, 'Completed')}
                            className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] sm:text-xs font-black text-emerald-700 hover:bg-emerald-100"
                          >
                            {t('completeBatch')}
                          </button>
                        )}
                        {b.status === 'Completed' && (
                          <button
                            onClick={() => handleRequestStatusChange(b, 'Active')}
                            className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] sm:text-xs font-black text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                            title={t('reopenBatch')}
                          >
                            <RotateCcw className="h-3 w-3" /> {t('reopenBatch')}
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
        title={selectedBatch ? (language === 'ta' ? `தொகுதி ${selectedBatch.batchNumber} ஐத் திருத்தவும்` : `Edit Batch ${selectedBatch.batchNumber}`) : (language === 'ta' ? 'புதிய பிராய்லர் தொகுதி உருவாக்கவும்' : 'Create New Broiler Batch')}
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதி எண் (தானியங்கி)' : 'Batch Number (Auto)'}</label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதி பெயர் (தானியங்கி)' : 'Batch Name (Auto)'}</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'வந்த தேதி *' : 'Chick Arrival Date *'}</label>
              <CustomDatePicker
                value={formData.chickArrivalDate}
                onChange={(dStr) => setFormData({ ...formData, chickArrivalDate: dStr })}
                loggedDates={batches.map(b => b.chickArrivalDate)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஆரம்ப எண்ணிக்கை *' : 'Initial Chick Count *'}</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஒதுக்கப்பட்ட பண்ணையாளர் *' : 'Assigned Farmer *'}</label>
              <CustomSelect
                value={formData.assignedFarmerId || 'kg-poultry-farms'}
                onChange={handleFarmerChange}
                options={farmers.map((f) => ({
                  value: f.uid,
                  label: `${f.name}${f.farmName ? ` (${f.farmName})` : ''}`
                }))}
                className="w-full justify-between border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தொகுதி நிலை *' : 'Batch Workflow Status *'}</label>
              <CustomSelect
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'Draft', label: language === 'ta' ? 'வரைவு (ஆயத்தம்)' : 'Draft (Preparation)' },
                  { value: 'Active', label: language === 'ta' ? 'செயலில் (பதிவு செய்யலாம்)' : 'Active (Farmer Recording Allowed)' },
                  { value: 'Completed', label: language === 'ta' ? 'முடிந்தது (பண்ணையாளருக்கு வாசிக்க மட்டும்)' : 'Completed (Read-Only for Farmer)' },
                ]}
                className="w-full justify-between border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'வாகன எண்' : 'Vehicle Number'}</label>
              <input
                type="text"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. TN-38-AX-1234' : 'e.g. TN-38-AX-1234'}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'ஓட்டுநர் பெயர்' : 'Driver Name'}</label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder={language === 'ta' ? 'எ.கா. சுரேஷ்' : 'e.g. Suresh'}
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
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              {language === 'ta' ? 'தொகுதியைச் சேமி' : 'Save Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, loading: false })}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        confirmText={deleteModal.confirmText}
        cancelText={deleteModal.cancelText}
        loading={deleteModal.loading}
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        onClose={() => setStatusConfirmModal({ isOpen: false, batch: null, newStatus: '', title: '', message: '', confirmText: '', cancelText: '', variant: 'emerald', loading: false })}
        onConfirm={handleConfirmStatusChange}
        title={statusConfirmModal.title}
        message={statusConfirmModal.message}
        confirmText={statusConfirmModal.confirmText}
        cancelText={statusConfirmModal.cancelText}
        variant={statusConfirmModal.variant}
        loading={statusConfirmModal.loading}
      />
    </div>
  );
};
