import React, { useState, useEffect } from 'react';
import { dbGetUsers, dbSaveUser, dbGetBatches, dbLogAuditEvent } from '../services/dbService';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Search, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const UsersPage = () => {
  const { userProfile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    farmName: '',
    role: 'Farmer',
    active: true,
    assignedBatches: []
  });

  const [assignedBatchNumbers, setAssignedBatchNumbers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [uList, bList] = await Promise.all([dbGetUsers(), dbGetBatches()]);
      setUsers(uList);
      setBatches(bList);
    } catch (err) {
      console.error('Failed loading users data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      farmName: '',
      role: 'Farmer',
      active: true,
      assignedBatches: []
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      farmName: user.farmName || '',
      role: user.role || 'Farmer',
      active: user.active !== undefined ? user.active : true,
      assignedBatches: user.assignedBatches || []
    });
    setIsUserModalOpen(true);
  };

  const handleOpenAssignModal = (user) => {
    setSelectedUser(user);
    setAssignedBatchNumbers(user.assignedBatches || []);
    setIsAssignModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        uid: selectedUser ? selectedUser.uid : `user-${Date.now()}`,
        createdAt: selectedUser ? selectedUser.createdAt : new Date().toISOString()
      };
      await dbSaveUser(userData);
      await dbLogAuditEvent(
        selectedUser ? 'USER_EDITED' : 'USER_CREATED',
        `${selectedUser ? 'Updated' : 'Created'} user ${userData.name} (${userData.role})`,
        currentUserProfile?.name
      );
      setIsUserModalOpen(false);
      loadData();
    } catch (err) {
      alert('Failed saving user: ' + err.message);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const updated = { ...user, active: !user.active };
      await dbSaveUser(updated);
      await dbLogAuditEvent(
        'USER_STATUS_TOGGLED',
        `Toggled user ${user.name} status to ${updated.active ? 'Active' : 'Inactive'}`,
        currentUserProfile?.name
      );
      loadData();
    } catch (err) {
      alert('Failed updating user status.');
    }
  };

  const handleSaveBatchAssignment = async () => {
    if (!selectedUser) return;
    try {
      const updated = { ...selectedUser, assignedBatches: assignedBatchNumbers };
      await dbSaveUser(updated);
      await dbLogAuditEvent(
        'BATCHES_ASSIGNED',
        `Assigned batches [${assignedBatchNumbers.join(', ')}] to user ${selectedUser.name}`,
        currentUserProfile?.name
      );
      setIsAssignModalOpen(false);
      loadData();
    } catch (err) {
      alert('Failed assigning batches.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.farmName && u.farmName.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return <LoadingSpinner message="Loading User Management..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 shrink-0">
          User Management
        </h1>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name, email, or farm name..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Role:</label>
          <CustomSelect
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'Admin', label: 'Admin Only' },
              { value: 'Farmer', label: 'Farmer Only' },
            ]}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wider text-slate-400 font-semibold">
                <th className="pb-3 px-2">User Details</th>
                <th className="pb-3 px-2">Contact Info</th>
                <th className="pb-3 px-2">Farm Shed</th>
                <th className="pb-3 px-2">Role</th>
                <th className="pb-3 px-2">Assigned Batches</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No users found matching query.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400">UID: {u.uid.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600">
                      <div>{u.email}</div>
                      <div className="text-[10px] text-slate-400">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-medium">{u.farmName || 'Central Operations'}</td>
                    <td className="py-3 px-2">
                      <Badge variant={u.role}>{u.role}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      {u.role === 'Farmer' ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {(u.assignedBatches && u.assignedBatches.length > 0) ? (
                            u.assignedBatches.map((b) => (
                              <span key={b} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                          <button
                            onClick={() => handleOpenAssignModal(u)}
                            className="ml-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Assign
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={u.active ? 'Active' : 'Inactive'}>
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`rounded-lg p-1.5 ${u.active ? 'text-emerald-600 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          title={u.active ? 'Deactivate User' : 'Activate User'}
                        >
                          {u.active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
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

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={selectedUser ? 'Edit User Profile' : 'Add New User'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">User Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="farmer@kgpoultry.com"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Farm / Shed Name</label>
              <input
                type="text"
                value={formData.farmName}
                onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                placeholder="e.g. KG North Shed 1"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">System Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Farmer">Farmer / Field User</option>
                <option value="Admin">System Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="userActiveCheck"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="userActiveCheck" className="text-xs font-bold text-slate-700">
              Account Active (User can log in)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              Save User
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Batches to ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select farm batches that <strong>{selectedUser?.name}</strong> can manage daily operational records for:
          </p>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2">
            {batches.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No batches available.</p>
            ) : (
              batches.map((b) => {
                const checked = assignedBatchNumbers.includes(b.batchNumber) || assignedBatchNumbers.includes(b.id);
                return (
                  <label key={b.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedBatchNumbers([...assignedBatchNumbers, b.batchNumber]);
                          } else {
                            setAssignedBatchNumbers(assignedBatchNumbers.filter((n) => n !== b.batchNumber && n !== b.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{b.batchNumber} ({b.batchName})</div>
                        <div className="text-[10px] text-slate-400">Arrival: {b.chickArrivalDate} | Chicks: {b.initialChickCount}</div>
                      </div>
                    </div>
                    <Badge variant={b.status}>{b.status}</Badge>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBatchAssignment}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              Save Assignment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
