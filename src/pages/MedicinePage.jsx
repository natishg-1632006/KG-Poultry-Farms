import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dbGetBatches, dbGetMedicineRecords, dbAddMedicineRecord, dbDeleteMedicineRecord, dbLogAuditEvent } from '../services/dbService';
import { MEDICINE_UNITS } from '../constants/companyTargets';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import CustomDatePicker from '../components/common/CustomDatePicker';
import CustomSelect from '../components/common/CustomSelect';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Syringe, Plus, Trash2, Edit, Save, CheckCircle2, Layers, Pill, User, Calendar, Eye, AlertCircle } from 'lucide-react';

const formatMedicineUnit = (unit) => {
  if (!unit) return '';
  if (unit.toLowerCase() === 'l' || unit.toLowerCase() === 'liter' || unit.toLowerCase() === 'liters') return 'Liter';
  return unit;
};

export const MedicinePage = () => {
  const { userProfile, isFarmer } = useAuth();
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false
  });

  const [activeHistoryTab, setActiveHistoryTab] = useState('Vaccine');
  const [recordType, setRecordType] = useState('Vaccine');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Medicine state
  const [medicineName, setMedicineName] = useState('');
  const [medicineQty, setMedicineQty] = useState('');
  const [medicineUnit, setMedicineUnit] = useState('ml');

  // Vaccine state (Defaults to 1 vaccine field & 1 vaccinator field)
  const [vaccinesList, setVaccinesList] = useState([
    { name: '', quantity: '', unit: 'ml' }
  ]);
  const [vaccinatorsList, setVaccinatorsList] = useState(['']);
  const [viewingRecordDetail, setViewingRecordDetail] = useState(null);

  useEffect(() => {
    loadBatches();
  }, [userProfile]);

  useEffect(() => {
    if (selectedBatchId) {
      loadRecords(selectedBatchId);
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
          ? activeBatches[0] 
          : accessible[0];
        setSelectedBatchId(defaultBatch.id);
        await loadRecords(defaultBatch.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed loading batches for medicine:', err);
      setLoading(false);
    }
  }

  async function loadRecords(bId) {
    try {
      const list = await dbGetMedicineRecords(bId);
      setRecords(list);
    } catch (err) {
      console.error('Failed loading medicine records:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isReadOnly = selectedBatch ? (selectedBatch.status || '').toLowerCase() === 'completed' : false;

  const vaccineRecords = records.filter(r => (r.recordType || 'Vaccine') === 'Vaccine');
  const medicineRecords = records.filter(r => r.recordType === 'Medicine');

  const handleOpenNewForm = (type = 'Vaccine') => {
    if (isReadOnly) return;
    setEditingRecordId(null);
    setRecordType(type);
    setDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setMedicineName('');
    setMedicineQty('');
    setMedicineUnit('ml');
    setVaccinesList([{ name: '', quantity: '', unit: 'ml' }]);
    setVaccinatorsList(['']);
    setShowForm(true);
  };

  const handleEditRecord = (record) => {
    if (isReadOnly) return;
    setEditingRecordId(record.id);
    setRecordType(record.recordType || 'Vaccine');
    setDate(record.date || new Date().toISOString().split('T')[0]);
    setReason(record.reason || '');

    if (record.recordType === 'Medicine') {
      setMedicineName(record.medicineName || '');
      setMedicineQty(record.medicineQuantity || '');
      setMedicineUnit(record.medicineUnit || 'ml');
    } else {
      setVaccinesList(record.vaccines && record.vaccines.length > 0 ? record.vaccines : [{ name: '', quantity: '', unit: 'ml' }]);
      setVaccinatorsList(record.vaccinatorNames && record.vaccinatorNames.length > 0 ? record.vaccinatorNames : ['']);
    }
    setShowForm(true);
  };

  const handleDeleteRecord = (recordId) => {
    if (isReadOnly) return;
    setDeleteModal({
      isOpen: true,
      title: 'Delete Medication/Vaccine Record?',
      message: 'Are you sure you want to delete this medication log entry?',
      loading: false,
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
          await dbDeleteMedicineRecord(selectedBatchId, recordId);
          await dbLogAuditEvent('MEDICINE_RECORD_DELETED', `Deleted medicine/vaccine entry for batch ${selectedBatch?.batchNumber}`, userProfile?.name);
          setSuccessMsg('Record deleted successfully.');
          await loadRecords(selectedBatchId);
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
        } catch (err) {
          setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
          alert('Failed deleting record.');
        }
      }
    });
  };

  const handleAddVaccineField = () => {
    setVaccinesList([...vaccinesList, { name: '', quantity: '', unit: 'ml' }]);
  };

  const handleRemoveVaccineField = (index) => {
    if (vaccinesList.length <= 1) return;
    setVaccinesList(vaccinesList.filter((_, i) => i !== index));
  };

  const handleVaccineChange = (index, field, value) => {
    const updated = [...vaccinesList];
    updated[index][field] = value;
    setVaccinesList(updated);
  };

  const handleAddVaccinatorField = () => {
    setVaccinatorsList([...vaccinatorsList, '']);
  };

  const handleRemoveVaccinatorField = (index) => {
    if (vaccinatorsList.length <= 1) return;
    setVaccinatorsList(vaccinatorsList.filter((_, i) => i !== index));
  };

  const handleVaccinatorChange = (index, value) => {
    const updated = [...vaccinatorsList];
    updated[index] = value;
    setVaccinatorsList(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!selectedBatch || isReadOnly) return;

    setSaving(true);
    try {
      let recordObj = {
        id: editingRecordId || `med-${Date.now()}`,
        recordType,
        date,
        reason
      };

      if (recordType === 'Medicine') {
        if (!medicineName.trim()) {
          alert('Please enter a medicine name.');
          setSaving(false);
          return;
        }
        recordObj.medicineName = medicineName.trim();
        recordObj.medicineQuantity = medicineQty;
        recordObj.medicineUnit = medicineUnit;
      } else {
        const validVaccines = vaccinesList.filter(v => v.name && v.name.trim() !== '');
        if (validVaccines.length === 0) {
          alert('Please enter at least one vaccine name.');
          setSaving(false);
          return;
        }
        recordObj.vaccines = validVaccines;
        recordObj.vaccinatorNames = vaccinatorsList.filter(v => v && v.trim() !== '');
      }

      await dbAddMedicineRecord(selectedBatch.id, recordObj);
      await dbLogAuditEvent(
        editingRecordId ? 'MEDICINE_RECORD_UPDATED' : 'MEDICINE_RECORD_ADDED',
        `${editingRecordId ? 'Updated' : 'Added'} ${recordType} record for batch ${selectedBatch.batchNumber}`,
        userProfile?.name
      );

      setSuccessMsg(`Successfully ${editingRecordId ? 'updated' : 'recorded'} ${recordType} log!`);
      setEditingRecordId(null);
      setShowForm(false);
      loadRecords(selectedBatch.id);
    } catch (err) {
      alert('Failed saving record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading Medicine Inventory..." />;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
          {t('medicineAndVaccines')}
        </h1>
        {!isReadOnly && (
          <button
            onClick={() => handleOpenNewForm('Vaccine')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{t('logMedicine')}</span>
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Batch Marked as Completed ({selectedBatch?.batchName || selectedBatch?.batchNumber})</p>
              <p className="text-[11px] text-amber-700">This batch is completed. Medicine and vaccine logging is in read-only mode.</p>
            </div>
          </div>
          <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
            Read-Only Mode
          </span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRecordId(null);
        }}
        title={editingRecordId ? (language === 'ta' ? "பதிவைத் திருத்தவும்" : "Edit Record") : (language === 'ta' ? "புதிய மருந்து / தடுப்பூசிப் பதிவு" : "New Medication / Vaccine Record")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setRecordType('Vaccine')}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                recordType === 'Vaccine' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ta' ? 'தடுப்பூசி முறை' : 'Vaccine Mode'}
            </button>
            <button
              type="button"
              onClick={() => setRecordType('Medicine')}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                recordType === 'Medicine' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ta' ? 'மருந்து முறை' : 'Medicine Mode'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'தேதி *' : 'Date *'}</label>
            <CustomDatePicker
              value={date}
              onChange={(dStr) => setDate(dStr)}
              loggedDates={records.map(r => r.date)}
            />
          </div>

          {recordType === 'Medicine' && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'மருந்தின் பெயர் *' : 'Medicine Name *'}</label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder={language === 'ta' ? 'எ.கா. என்ரோஃப்ளோக்சாசின் 10%' : 'e.g. Enrofloxacin 10%'}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'அளவு *' : 'Quantity *'}</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={medicineQty}
                    onChange={(e) => setMedicineQty(e.target.value)}
                    placeholder={language === 'ta' ? 'எ.கா. 500' : 'e.g. 500'}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'அலகு *' : 'Unit *'}</label>
                  <CustomSelect
                    value={medicineUnit}
                    onChange={(e) => setMedicineUnit(e.target.value)}
                    options={MEDICINE_UNITS.map(u => ({ value: u, label: u }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {recordType === 'Vaccine' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-bold text-slate-700">{language === 'ta' ? 'தடுப்பூசி(கள்) *' : 'Vaccine(s) Administered *'}</label>
                  <button
                    type="button"
                    onClick={handleAddVaccineField}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 shrink-0 ml-auto"
                  >
                    <Plus className="h-3 w-3" /> {language === 'ta' ? 'தடுப்பூசி சேர்க்க' : 'Add Vaccine'}
                  </button>
                </div>

                {vaccinesList.map((vac, idx) => (
                  <div key={idx} className="rounded-xl border border-emerald-100 p-3 bg-emerald-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>{language === 'ta' ? `தடுப்பூசி ${idx + 1}` : `Vaccine ${idx + 1}`}</span>
                      {vaccinesList.length > 1 && (
                        <button type="button" onClick={() => handleRemoveVaccineField(idx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={language === 'ta' ? `தடுப்பூசி ${idx + 1} பெயர் (எ.கா. ராணிக்கெட்)` : `Vaccine ${idx + 1} Name (e.g. Ranikhet)`}
                      value={vac.name}
                      onChange={(e) => handleVaccineChange(idx, 'name', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder={language === 'ta' ? 'அளவு' : 'Quantity'}
                        value={vac.quantity}
                        onChange={(e) => handleVaccineChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium"
                      />
                      <CustomSelect
                        value={vac.unit}
                        onChange={(e) => handleVaccineChange(idx, 'unit', e.target.value)}
                        options={MEDICINE_UNITS.map(u => ({ value: u, label: u }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-bold text-slate-700">{language === 'ta' ? 'செலுத்துபவர் பெயர்(கள்)' : 'Vaccinator Name(s)'}</label>
                  <button
                    type="button"
                    onClick={handleAddVaccinatorField}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 shrink-0 ml-auto"
                  >
                    <Plus className="h-3 w-3" /> {language === 'ta' ? 'நபரைச் சேர்க்க' : 'Add Vaccinator'}
                  </button>
                </div>
                {vaccinatorsList.map((vName, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={language === 'ta' ? `செலுத்துபவர் ${idx + 1} பெயர்` : `Vaccinator ${idx + 1} Name`}
                      value={vName}
                      onChange={(e) => handleVaccinatorChange(idx, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-1.5 px-3 text-xs font-medium"
                    />
                    {vaccinatorsList.length > 1 && (
                      <button type="button" onClick={() => handleRemoveVaccinatorField(idx)} className="text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'ta' ? 'காரணம் / குறிப்புகள் *' : 'Reason / Notes *'}</label>
            <textarea
              rows="2"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'ta' ? 'எ.கா. 7-ம் நாள் பூஸ்டர் / தடுப்பு சிகிச்சை' : 'e.g. Day 7 Booster / Preventive treatment'}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingRecordId(null);
                setReason('');
                setMedicineName('');
                setMedicineQty('');
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
              {saving ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : editingRecordId ? (language === 'ta' ? 'பதிவைப் புதுப்பி' : 'Update Record') : (language === 'ta' ? 'பதிவைச் சேமி' : `Save ${recordType} Record`)}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Card with Dedicated Table Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <h2 className="text-xs sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5 flex-wrap whitespace-nowrap">
              <span>{language === 'ta' ? 'பதிவு வரலாறு' : 'Log History'}</span>
              {selectedBatch?.batchNumber && (
                <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-xs">
                  ({selectedBatch.batchNumber})
                </span>
              )}
            </h2>
          </div>

          {/* Interactive Table Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveHistoryTab('Vaccine')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold whitespace-nowrap transition-all ${
                activeHistoryTab === 'Vaccine'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Syringe className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{t('vaccineMode')} ({vaccineRecords.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryTab('Medicine')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold whitespace-nowrap transition-all ${
                activeHistoryTab === 'Medicine'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{t('medicineMode')} ({medicineRecords.length})</span>
            </button>
          </div>
        </div>

        {/* Vaccination History - Mobile Cards & Desktop Table */}
        {activeHistoryTab === 'Vaccine' ? (
          <div>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {vaccineRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {language === 'ta' ? 'இத்தொகுதிக்கு தடுப்பூசிப் பதிவுகள் எதுவும் இல்லை.' : 'No vaccination records logged for this batch yet.'}
                </div>
              ) : (
                vaccineRecords.map((r) => {
                  const vaccineList = (r.vaccines && r.vaccines.length > 0)
                    ? r.vaccines
                    : (r.medicineName ? [{ name: r.medicineName, quantity: r.dosage || r.medicineQuantity, unit: r.medicineUnit || '' }] : []);
                  const notesText = r.reason || r.notes || '';

                  return (
                    <div
                      key={r.id}
                      onClick={() => setViewingRecordDetail(r)}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900">{r.date}</span>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRecord(r);
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60"
                              title={language === 'ta' ? 'பதிவைத் திருத்து' : 'Edit Record'}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(r.id);
                              }}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100/60"
                              title={language === 'ta' ? 'பதிவை நீக்கு' : 'Delete Record'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                          {language === 'ta' ? 'தடுப்பூசி & அளவு' : 'Vaccine(s) & Quantity'}
                        </span>
                        <div className="space-y-1.5">
                          {vaccineList.length > 0 ? (
                            vaccineList.map((v, i) => (
                              <div key={i} className="text-xs font-bold text-emerald-900 flex items-center justify-between bg-white rounded-lg p-2 border border-emerald-100">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  {v.name}
                                </span>
                                {v.quantity ? (
                                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    {v.quantity} {formatMedicineUnit(v.unit)}
                                  </span>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">{language === 'ta' ? 'விவரங்கள் இல்லை' : 'No details specified'}</span>
                          )}
                        </div>
                      </div>

                      {r.vaccinatorNames && r.vaccinatorNames.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                            {language === 'ta' ? 'செலுத்துபவர் பெயர்(கள்)' : 'Vaccinator Name(s)'}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {r.vaccinatorNames.map((vn, i) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {vn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {notesText && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                            {language === 'ta' ? 'காரணம் / குறிப்புகள்' : 'Reason / Notes'}
                          </span>
                          <p className="text-xs text-slate-600 bg-white rounded-lg p-2 border border-slate-100">{notesText}</p>
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
                    <th className="pb-3 px-2">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'தடுப்பூசி & அளவு' : 'Vaccine(s) Administered & Dosage'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'செலுத்துபவர் பெயர்(கள்)' : 'Vaccinator Name(s)'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'காரணம் / குறிப்புகள்' : 'Reason / Notes'}</th>
                    <th className="pb-3 px-2 text-right">{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vaccineRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        {language === 'ta' ? 'இத்தொகுதிக்கு தடுப்பூசிப் பதிவுகள் எதுவும் இல்லை.' : 'No vaccination records logged for this batch yet.'}
                      </td>
                    </tr>
                  ) : (
                    vaccineRecords.map((r) => {
                      const vaccineList = (r.vaccines && r.vaccines.length > 0)
                        ? r.vaccines
                        : (r.medicineName ? [{ name: r.medicineName, quantity: r.dosage || r.medicineQuantity, unit: r.medicineUnit || '' }] : []);
                      const notesText = r.reason || r.notes || '';

                      return (
                        <tr
                          key={r.id}
                          onClick={() => setViewingRecordDetail(r)}
                          className="hover:bg-emerald-50/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-2 font-bold text-slate-900">{r.date}</td>
                          <td className="py-3 px-2">
                            <div className="space-y-1">
                              {vaccineList.map((v, i) => (
                                <div key={i} className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span>{v.name}</span>
                                  {v.quantity ? <span className="text-slate-500 font-normal">({v.quantity} {formatMedicineUnit(v.unit)})</span> : null}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-700 font-semibold">
                            {r.vaccinatorNames && r.vaccinatorNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.vaccinatorNames.map((vn, i) => (
                                  <span key={i} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    {vn}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-600">{notesText}</td>
                          <td className="py-3 px-2 text-right">
                            {!isReadOnly ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRecord(r);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  title={language === 'ta' ? 'பதிவைத் திருத்து' : 'Edit Record'}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRecord(r.id);
                                  }}
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                  title={language === 'ta' ? 'பதிவை நீக்கு' : 'Delete Record'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">{language === 'ta' ? 'பூட்டப்பட்டது' : 'Locked'}</span>
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
        ) : (
          /* Medicine History - Mobile Cards & Desktop Table */
          <div>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {medicineRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {language === 'ta' ? 'இத்தொகுதிக்கு மருந்துப் பதிவுகள் எதுவும் இல்லை.' : 'No medication records logged for this batch yet.'}
                </div>
              ) : (
                medicineRecords.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setViewingRecordDetail(r)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3 shadow-2xs hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-bold text-slate-900">{r.date}</span>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRecord(r);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60"
                            title={language === 'ta' ? 'பதிவைத் திருத்து' : 'Edit Record'}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecord(r.id);
                            }}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100/60"
                            title={language === 'ta' ? 'பதிவை நீக்கு' : 'Delete Record'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                          {language === 'ta' ? 'மருந்தின் பெயர்' : 'Medicine Name'}
                        </span>
                        <span className="text-xs font-bold text-teal-900">{r.medicineName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                          {language === 'ta' ? 'அளவு' : 'Quantity'}
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 inline-block">
                          {r.quantity} {formatMedicineUnit(r.unit)}
                        </span>
                      </div>
                    </div>

                    {r.reason && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                          {language === 'ta' ? 'காரணம் / குறிப்புகள்' : 'Reason / Notes'}
                        </span>
                        <p className="text-xs text-slate-600 bg-white rounded-lg p-2 border border-slate-100">{r.reason}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="pb-3 px-2">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'மருந்தின் பெயர்' : 'Medicine Name'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'அளவு' : 'Dosage / Quantity'}</th>
                    <th className="pb-3 px-2">{language === 'ta' ? 'காரணம் / குறிப்புகள்' : 'Reason / Notes'}</th>
                    <th className="pb-3 px-2 text-right">{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {medicineRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        {language === 'ta' ? 'இத்தொகுதிக்கு மருந்துப் பதிவுகள் எதுவும் இல்லை.' : 'No medication records logged for this batch yet.'}
                      </td>
                    </tr>
                  ) : (
                    medicineRecords.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setViewingRecordDetail(r)}
                        className="hover:bg-teal-50/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-2 font-bold text-slate-900">{r.date}</td>
                        <td className="py-3 px-2 font-bold text-teal-800">{r.medicineName}</td>
                        <td className="py-3 px-2 font-bold text-slate-700">
                          {r.quantity} <span className="font-normal text-slate-500">{formatMedicineUnit(r.unit)}</span>
                        </td>
                        <td className="py-3 px-2 text-slate-600">{r.reason}</td>
                        <td className="py-3 px-2 text-right">
                          {!isReadOnly ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRecord(r);
                                }}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title={language === 'ta' ? 'பதிவைத் திருத்து' : 'Edit Record'}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(r.id);
                                }}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                title={language === 'ta' ? 'பதிவை நீக்கு' : 'Delete Record'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">{language === 'ta' ? 'பூட்டப்பட்டது' : 'Locked'}</span>
                          )}
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

      {/* Record Details Popup Modal */}
      {viewingRecordDetail && (
        <Modal
          isOpen={!!viewingRecordDetail}
          onClose={() => setViewingRecordDetail(null)}
          title={
            language === 'ta'
              ? (viewingRecordDetail.recordType === 'Vaccine' ? 'தடுப்பூசி விபரம்' : 'மருந்து விபரம்')
              : (viewingRecordDetail.recordType === 'Vaccine' ? 'Vaccination Log Details' : 'Medication Log Details')
          }
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {/* Header Badge & Date */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">
                  {language === 'ta' ? 'தொகுதி & தேதி' : 'Batch & Date'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-slate-900">
                    {selectedBatch ? (language === 'ta' ? `தொகுதி #${selectedBatch.batchNumber}` : `Batch #${selectedBatch.batchNumber}`) : 'Batch Record'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {viewingRecordDetail.date}
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                  viewingRecordDetail.recordType === 'Vaccine'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-teal-600 text-white shadow-xs'
                }`}
              >
                {language === 'ta' ? (viewingRecordDetail.recordType === 'Vaccine' ? 'தடுப்பூசி' : 'மருந்து') : (viewingRecordDetail.recordType || 'Vaccine')}
              </span>
            </div>

            {/* Vaccine Details */}
            {viewingRecordDetail.recordType !== 'Medicine' ? (
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1.5">
                    {language === 'ta' ? 'தடுப்பூசி விவரம்:' : 'Vaccine(s) Administered & Dosage:'}
                  </span>
                  <div className="space-y-2">
                    {viewingRecordDetail.vaccines && viewingRecordDetail.vaccines.length > 0 ? (
                      viewingRecordDetail.vaccines.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
                            <span className="text-xs font-bold text-emerald-950">{v.name}</span>
                          </div>
                          {v.quantity ? (
                            <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                              {v.quantity} {formatMedicineUnit(v.unit)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">{language === 'ta' ? 'அளவு குறிப்பிடப்படவில்லை' : 'No dosage specified'}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic">{language === 'ta' ? 'விவரங்கள் இல்லை' : 'No vaccine details logged'}</div>
                    )}
                  </div>
                </div>

                {/* Vaccinator Names */}
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1.5">
                    {language === 'ta' ? 'செலுத்துபவர் பெயர்(கள்):' : 'Vaccinator Name(s):'}
                  </span>
                  {viewingRecordDetail.vaccinatorNames && viewingRecordDetail.vaccinatorNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewingRecordDetail.vaccinatorNames.map((vn, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <User className="h-3 w-3 text-slate-500" />
                          {vn}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">{language === 'ta' ? 'குறிப்பிடப்படவில்லை' : 'None specified'}</span>
                  )}
                </div>
              </div>
            ) : (
              /* Medicine Details */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-teal-50/70 border border-teal-200/80 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-extrabold text-teal-600 tracking-wider block mb-0.5">
                      {language === 'ta' ? 'மருந்தின் பெயர்' : 'Medicine Name'}
                    </span>
                    <span className="text-sm font-black text-teal-950">
                      {viewingRecordDetail.medicineName || '—'}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-extrabold text-emerald-600 tracking-wider block mb-0.5">
                      {language === 'ta' ? 'அளவு' : 'Dosage / Quantity'}
                    </span>
                    <span className="text-sm font-black text-emerald-950">
                      {viewingRecordDetail.quantity} {formatMedicineUnit(viewingRecordDetail.unit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reason / Notes */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1.5">
                {language === 'ta' ? 'காரணம் / குறிப்புகள்:' : 'Reason / Clinical Notes:'}
              </span>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-xs text-slate-700 font-medium min-h-[60px] whitespace-pre-wrap">
                {viewingRecordDetail.reason || (language === 'ta' ? 'குறிப்புகள் எதுவும் குறிப்பிடப்படவில்லை.' : 'No clinical notes or reason provided for this entry.')}
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const rec = viewingRecordDetail;
                  setViewingRecordDetail(null);
                  handleEditRecord(rec);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" /> {language === 'ta' ? 'திருத்து' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const recId = viewingRecordDetail.id;
                  setViewingRecordDetail(null);
                  handleDeleteRecord(recId);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> {language === 'ta' ? 'நீக்கு' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setViewingRecordDetail(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {language === 'ta' ? 'மூடு' : 'Close'}
              </button>
            </div>
          </div>
        </Modal>
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

