import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Filter,
  Plus,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Receipt,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';
import type { Membership, ChitGroup, Customer, UserRole } from '../../types';

interface MembersViewProps {
  userRole: UserRole;
  onNavigateToCustomer: (customerId: string) => void;
  onNavigateToGroup: (groupId: string) => void;
  onPayInstallment: (customerId: string, groupId: string, membershipId: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  userRole,
  onNavigateToCustomer,
  onNavigateToGroup,
  onPayInstallment
}) => {
  const [members, setMembers] = useState<Membership[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [newTicketNumber, setNewTicketNumber] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // In-UI Delete Membership Confirmation Modal State
  const [deletingMembership, setDeletingMembership] = useState<Membership | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mems, grps, custs] = await Promise.all([
        api.getMemberships(selectedGroupId !== 'all' ? selectedGroupId : undefined),
        api.getChitGroups(),
        api.getCustomers()
      ]);
      setMembers(mems);
      setGroups(grps);
      setCustomers(custs);
      if (grps.length > 0 && !newGroupId) setNewGroupId(grps[0].groupId);
      if (custs.length > 0 && !newCustomerId) setNewCustomerId(custs[0].customerId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroupId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newGroupId) return;

    setModalSubmitting(true);
    setModalError(null);
    try {
      await api.createMembership({
        customerId: newCustomerId,
        groupId: newGroupId,
        ticketNumber: newTicketNumber ? Number(newTicketNumber) : undefined,
        isDuplicateAllowed: allowDuplicate
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add member to chit group');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteMembership = (m: Membership) => {
    setDeletingMembership(m);
    setDeleteError(null);
  };

  const confirmDeleteMembership = async () => {
    if (!deletingMembership) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteMembership(deletingMembership.membershipId);
      setMembers((prev) => prev.filter((item) => item.membershipId !== deletingMembership.membershipId));
      setDeletingMembership(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete membership');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const isPrized = m.status === 'prized' || (m as any).isPrized;
    if (statusFilter === 'prized' && !isPrized) return false;
    if (statusFilter === 'non-prized' && isPrized) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.customerName?.toLowerCase().includes(q);
      const matchCustId = m.customerId.toLowerCase().includes(q);
      const matchGroup = m.groupName?.toLowerCase().includes(q);
      const matchTicket = String(m.ticketNumber).includes(q);
      if (!matchName && !matchCustId && !matchGroup && !matchTicket) return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Group Memberships & Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ticket assignments, installment balances, and prize-winning status per member
          </p>
        </div>

        <button
          id="add-member-btn"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Ticket / Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search member, ticket #, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Chit Groups</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName} ({g.groupId})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Members ({members.length})</option>
              <option value="non-prized">Eligible for Auction (Non-Prized)</option>
              <option value="prized">Prized Winners</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Subscriber Name</th>
                <th className="py-3 px-4">Chit Group</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Pending Dues</th>
                <th className="py-3 px-4 text-center">Prize Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading enrolled members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    No members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.membershipId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-amber-900 text-sm">
                      #{m.ticketNumber}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onNavigateToCustomer(m.customerId)}
                        className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left text-xs"
                      >
                        {m.customerName}
                      </button>
                      <span className="text-slate-400 text-[10px] font-mono">{m.customerId} • {m.customerMobile}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onNavigateToGroup(m.groupId)}
                        className="font-semibold text-slate-800 hover:text-amber-700 hover:underline block text-left"
                      >
                        {m.groupName}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">{m.groupId} • ₹{m.chitValue?.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      ₹{m.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-800">
                      ₹{m.totalPending.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {m.status === 'prized' || (m as any).isPrized ? (
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Prized Winner {(m as any).prizedAuctionNumber ? `(M#${(m as any).prizedAuctionNumber})` : ''}
                        </span>
                      ) : (
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded">
                          Eligible Non-Prized
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onPayInstallment(m.customerId, m.groupId, m.membershipId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-xs transition"
                          title="Pay Installment"
                        >
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          <span>Pay</span>
                        </button>
                        <button
                          onClick={async () => {
                            const newTicket = prompt('Edit ticket number:', String(m.ticketNumber));
                            if (newTicket && !isNaN(Number(newTicket))) {
                              try {
                                await api.updateMembership(m.membershipId, { ticketNumber: Number(newTicket) });
                                loadData();
                              } catch (err: any) {
                                alert(err.message || 'Failed to update membership');
                              }
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          title="Edit Ticket #"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMembership(m)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                          title="Delete Membership"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div id="add-member-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Assign Member Ticket to Chit Group</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Subscriber (Customer) *</label>
                <select
                  required
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.customerId}) - {c.mobileNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Chit Group *</label>
                <select
                  required
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.groupName} ({g.groupId}) • ₹{g.chitValue.toLocaleString()} ({g.currentMembersCount}/{g.numMembers})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Specific Ticket Number (Optional)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTicketNumber}
                  onChange={(e) => setNewTicketNumber(e.target.value)}
                  placeholder="Auto-assigns lowest available ticket if empty"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-800 font-medium text-xs">Allow duplicate ticket for same subscriber</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {modalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Assign Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-UI DELETE MEMBERSHIP CONFIRMATION MODAL */}
      {deletingMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Cancel Subscriber Seat?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900 font-semibold">{deletingMembership.customerName}</strong> (<span className="font-mono text-amber-800 font-bold">Ticket #{deletingMembership.ticketNumber}</span>) from scheme <strong className="text-slate-900 font-semibold">{deletingMembership.groupName}</strong>?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This will release Ticket #{deletingMembership.ticketNumber} and remove related installment records for this seat.
              </div>

              {deleteError && (
                <div className="mt-3 p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-lg text-left font-medium">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeletingMembership(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteMembership}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Cancel Seat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
