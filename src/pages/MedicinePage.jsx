import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetBatches, dbGetMedicineRecords, dbAddMedicineRecord, dbDeleteMedicineRecord, dbLogAuditEvent } from '../services/dbService';
import { MEDICINE_UNITS } from '../constants/companyTargets';
import { Modal } from '../components/common/Modal';
import { Syringe, Plus, Trash2, Edit, Save, CheckCircle2, Layers } from 'lucide-react';

export const MedicinePage = () => {
  const { userProfile, isFarmer } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [recordType, setRecordType] = useState('Vaccine');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Medicine state
  const [medicineName, setMedicineName] = useState('');
  const [medicineQty, setMedicineQty] = useState('');
  const [medicineUnit, setMedicineUnit] = useState('ml');

  // Vaccine state
  const [vaccinesList, setVaccinesList] = useState([
    { name: '', quantity: '', unit: 'ml' },
    { name: '', quantity: '', unit: 'ml' }
  ]);
  const [vaccinatorsList, setVaccinatorsList] = useState(['', '']);

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
      console.error('Failed loading batches for medicine:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(bId) {
    try {
      const list = await dbGetMedicineRecords(bId);
      setRecords(list);
    } catch (err) {
      console.error('Failed loading medicine records:', err);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleEditRecord = (record) => {
    setEditingRecordId(record.id);
    setShowForm(true);
    setRecordType(record.recordType || 'Vaccine');
    setDate(record.date || new Date().toISOString().split('T')[0]);
    setReason(record.reason || '');

    if (record.recordType === 'Medicine') {
      setMedicineName(record.medicineName || '');
      setMedicineQty(record.quantity || '');
      setMedicineUnit(record.unit || 'ml');
    } else {
      setVaccinesList(record.vaccines && record.vaccines.length > 0 ? record.vaccines : [{ name: '', quantity: '', unit: 'ml' }]);
      setVaccinatorsList(record.vaccinatorNames && record.vaccinatorNames.length > 0 ? record.vaccinatorNames : ['']);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!confirm('Are you sure you want to delete this medication/vaccine log entry?')) return;
    try {
      await dbDeleteMedicineRecord(selectedBatchId, recordId);
      await dbLogAuditEvent('MEDICINE_DELETED', `Deleted medicine/vaccine record for ${selectedBatch?.batchNumber}`, userProfile?.name);
      setSuccessMsg('Record deleted successfully.');
      loadRecords(selectedBatchId);
    } catch (err) {
      alert('Failed deleting record.');
    }
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
    if (!selectedBatch) return;

    setSaving(true);
    try {
      let recordPayload = {
        id: editingRecordId || `med-${Date.now()}`,
        recordType,
        date,
        reason
      };

      if (recordType === 'Medicine') {
        if (!medicineName) throw new Error('Medicine name is required.');
        recordPayload.medicineName = medicineName;
        recordPayload.quantity = Number(medicineQty);
        recordPayload.unit = medicineUnit;
      } else {
        const validVaccines = vaccinesList.filter(v => v.name.trim() !== '');
        if (validVaccines.length === 0) throw new Error('At least one vaccine name is required.');
        recordPayload.vaccines = validVaccines.map(v => ({
          name: v.name,
          quantity: Number(v.quantity) || 0,
          unit: v.unit
        }));
        recordPayload.vaccinatorNames = vaccinatorsList.filter(v => v.trim() !== '');
      }

      await dbAddMedicineRecord(selectedBatch.id, recordPayload);
      await dbLogAuditEvent(
        editingRecordId ? 'MEDICINE_UPDATED' : 'MEDICINE_LOGGED',
        `${editingRecordId ? 'Updated' : 'Logged'} ${recordType} for ${selectedBatch.batchNumber} on ${date}`,
        userProfile?.name
      );

      setSuccessMsg(`Successfully ${editingRecordId ? 'updated' : 'saved'} ${recordType} record for ${selectedBatch.batchNumber}!`);
      setEditingRecordId(null);
      setShowForm(false);
      loadRecords(selectedBatch.id);

      setReason('');
      setMedicineName('');
      setMedicineQty('');
      setVaccinesList([
        { name: '', quantity: '', unit: 'ml' },
        { name: '', quantity: '', unit: 'ml' }
      ]);
      setVaccinatorsList(['', '']);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Medicine & Vaccine Module...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Medicine & Vaccination Log</h1>
          <p className="text-sm font-medium text-slate-500">Record scheduled vaccinations, dual vaccines, and flock medications.</p>
        </div>
        <button
          onClick={() => {
            setEditingRecordId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Log Medicine / Vaccine</span>
        </button>
      </div>

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
        title={editingRecordId ? "Edit Record" : "New Medication / Vaccine Record"}
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
              Vaccine Mode
            </button>
            <button
              type="button"
              onClick={() => setRecordType('Medicine')}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                recordType === 'Medicine' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Medicine Mode
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
            />
          </div>

          {recordType === 'Medicine' && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Enrofloxacin 10%"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={medicineQty}
                    onChange={(e) => setMedicineQty(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                  <select
                    value={medicineUnit}
                    onChange={(e) => setMedicineUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600"
                  >
                    {MEDICINE_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {recordType === 'Vaccine' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Vaccine(s) Administered *</label>
                  <button
                    type="button"
                    onClick={handleAddVaccineField}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Vaccine
                  </button>
                </div>

                {vaccinesList.map((vac, idx) => (
                  <div key={idx} className="rounded-xl border border-emerald-100 p-3 bg-emerald-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Vaccine {idx + 1}</span>
                      {vaccinesList.length > 1 && (
                        <button type="button" onClick={() => handleRemoveVaccineField(idx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Vaccine ${idx + 1} Name (e.g. Ranikhet / IBD)`}
                      value={vac.name}
                      onChange={(e) => handleVaccineChange(idx, 'name', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={vac.quantity}
                        onChange={(e) => handleVaccineChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium"
                      />
                      <select
                        value={vac.unit}
                        onChange={(e) => handleVaccineChange(idx, 'unit', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold"
                      >
                        {MEDICINE_UNITS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Vaccinator Name(s)</label>
                  <button
                    type="button"
                    onClick={handleAddVaccinatorField}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Vaccinator
                  </button>
                </div>
                {vaccinatorsList.map((vName, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Vaccinator ${idx + 1} Name`}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes *</label>
            <textarea
              rows="2"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Day 7 Booster / Preventive treatment"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : editingRecordId ? 'Update Record' : `Save ${recordType} Record`}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Table with Edit & Delete Controls - Full Width */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Medicine & Vaccination History ({selectedBatch?.batchNumber})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Medicine / Vaccines</th>
                <th className="pb-3 px-2">Vaccinator(s)</th>
                <th className="pb-3 px-2">Reason</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No medicine/vaccination records for this batch yet.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-bold text-slate-900">{r.date}</td>
                    <td className="py-3 px-2 font-bold text-emerald-700">{r.recordType}</td>
                    <td className="py-3 px-2">
                      {r.recordType === 'Medicine' ? (
                        <span className="font-bold text-emerald-800">{r.medicineName} ({r.quantity} {r.unit})</span>
                      ) : (
                        <div className="space-y-0.5">
                          {r.vaccines && r.vaccines.map((v, i) => (
                            <div key={i} className="text-xs font-bold text-emerald-900">
                              • {v.name} ({v.quantity} {v.unit})
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-slate-600">
                      {r.vaccinatorNames && r.vaccinatorNames.length > 0 ? r.vaccinatorNames.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-2 text-slate-600">{r.reason}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditRecord(r)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Record"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete Record"
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
    </div>
  );
};

