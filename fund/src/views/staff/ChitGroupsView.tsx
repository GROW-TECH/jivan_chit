import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Edit2,
  Eye,
  Calendar,
  Users,
  Ticket,
  Gavel,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';
import type { ChitGroup, Membership, Auction, UserRole, Customer } from '../../types';

interface ChitGroupsViewProps {
  userRole: UserRole;
  initialGroupId?: string;
  onNavigateToCustomer: (customerId: string) => void;
  onConductAuction: (groupId: string) => void;
}

export const ChitGroupsView: React.FC<ChitGroupsViewProps> = ({
  userRole,
  initialGroupId,
  onNavigateToCustomer,
  onConductAuction
}) => {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Group Details Drawer
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [selectedGroupData, setSelectedGroupData] = useState<{
    group: ChitGroup;
    members: Membership[];
    auctions: Auction[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add / Edit Group Modal
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Add Member to Group UI Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [addMemberCustomerId, setAddMemberCustomerId] = useState('');
  const [addMemberTicketNumber, setAddMemberTicketNumber] = useState('');
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // In-UI Delete Group Confirmation Modal State
  const [deletingGroup, setDeletingGroup] = useState<ChitGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ChitGroup>>({
    groupId: '',
    groupName: '',
    chitValue: 500000,
    numMembers: 20,
    durationMonths: 20,
    monthlyInstallment: 25000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    auctionDayOfMonth: 10,
    auctionFrequency: 'Monthly',
    foremanCommissionPercent: 5.0,
    status: 'Upcoming',
    description: ''
  });

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getChitGroups(statusFilter !== 'all' ? statusFilter : undefined);
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [statusFilter]);

  const loadGroupDetails = async (id: string) => {
    setSelectedGroupId(id);
    setLoadingDetails(true);
    try {
      const data = await api.getChitGroupById(id);
      setSelectedGroupData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (initialGroupId) {
      loadGroupDetails(initialGroupId);
    }
  }, [initialGroupId]);

  // Recalculate installment when value or months changes
  const handleValueOrDurationChange = (value: number, duration: number) => {
    const monthly = duration > 0 ? Math.round((value / duration) * 100) / 100 : 0;
    setFormData((prev) => ({
      ...prev,
      chitValue: value,
      durationMonths: duration,
      monthlyInstallment: monthly
    }));
  };

  const handleOpenAdd = () => {
    setEditingGroup(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      groupId: `GRP-${String(Math.floor(Math.random() * 900) + 100)}`,
      groupName: '',
      chitValue: 500000,
      numMembers: 20,
      durationMonths: 20,
      monthlyInstallment: 25000,
      startDate: today,
      endDate: today,
      auctionDayOfMonth: 10,
      auctionFrequency: 'Monthly',
      foremanCommissionPercent: 5.0,
      status: 'Upcoming',
      description: ''
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (g: ChitGroup) => {
    setEditingGroup(g);
    setFormData({
      ...g,
      startDate: g.startDate ? String(g.startDate).split('T')[0] : '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleDeleteGroup = (g: ChitGroup) => {
    setDeletingGroup(g);
    setDeleteError(null);
  };

  const confirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteChitGroup(deletingGroup.groupId);
      setGroups((prev) => prev.filter((item) => item.groupId !== deletingGroup.groupId));
      if (selectedGroupId === deletingGroup.groupId) {
        setSelectedGroupId(null);
        setSelectedGroupData(null);
      }
      setDeletingGroup(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete chit group');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);
    try {
      if (editingGroup) {
        await api.updateChitGroup(editingGroup.groupId, formData);
      } else {
        await api.createChitGroup(formData);
      }
      setShowModal(false);
      loadGroups();
      if (selectedGroupId) {
        loadGroupDetails(selectedGroupId);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to save chit group');
    } finally {
      setModalSubmitting(false);
    }
  };

  const getStatusBadge = (status: ChitGroup['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Groups
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure chit schemes, ticket sizes, durations, monthly installments, and member rosters
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            id="create-chit-group-btn"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Chit Scheme</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
          <div className="flex gap-1">
            {['all', 'Active', 'Upcoming', 'Completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {st === 'all' ? 'All Chits' : st}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">{groups.length} groups listed</span>
      </div>

      {/* Chit Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
            Loading chit schemes...
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No chit schemes match the selected filter.
          </div>
        ) : (
          groups.map((g) => {
            const memberRatio = Math.round(((g.currentMembersCount || 0) / g.numMembers) * 100);
            return (
              <div
                key={g.groupId}
                id={`chit-card-${g.groupId}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top Meta */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {g.groupId}
                        </span>
                        <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadge(g.status)}`}>
                          {g.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{g.groupName}</h3>
                    </div>
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit scheme"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(g)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete scheme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial Parameters */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block font-semibold">Chit Value</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        ₹{g.chitValue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block font-semibold">Monthly Installment</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        ₹{g.monthlyInstallment.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block font-semibold">Duration & Seats</span>
                      <span className="text-slate-700 font-medium">
                        {g.durationMonths} Mos • {g.numMembers} Seats
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block font-semibold">Auction Day</span>
                      <span className="text-slate-700 font-medium font-mono">
                        {g.auctionDayOfMonth}th of month
                      </span>
                    </div>
                  </div>

                  {/* Members Fill Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">Subscriber Seats Filled</span>
                      <span className="font-mono font-bold text-slate-900">
                        {g.currentMembersCount || 0} / {g.numMembers} ({memberRatio}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, memberRatio)}%` }}
                        className={`h-full rounded-full transition-all ${memberRatio >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => loadGroupDetails(g.groupId)}
                    className="font-bold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
                  >
                    <span>View Members ({g.currentMembersCount || 0})</span>
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {g.status === 'Active' && userRole === 'admin' && (
                    <button
                      onClick={() => onConductAuction(g.groupId)}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100"
                    >
                      <Gavel className="w-3.5 h-3.5 text-amber-600" />
                      <span>Auction</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GROUP DETAILS DRAWER (ROSTER & AUCTIONS) */}
      {selectedGroupId && selectedGroupData && (
        <div id="group-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">{selectedGroupData.group.groupName}</h2>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {selectedGroupData.group.groupId} • ₹{selectedGroupData.group.chitValue.toLocaleString()} ({selectedGroupData.group.durationMonths} Mos)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 text-xs">
                {/* Scheme Summary Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Monthly Due</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{selectedGroupData.group.monthlyInstallment.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Foreman Comm.</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{selectedGroupData.group.foremanCommissionPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Auction Cycle</span>
                    <span className="text-sm font-bold text-slate-900">{selectedGroupData.group.auctionDayOfMonth}th of month</span>
                  </div>
                </div>

                {/* Enrolled Members Roster */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                      <Ticket className="w-4 h-4 text-amber-700" />
                      <span>Subscribers & Tickets ({selectedGroupData.members.length} / {selectedGroupData.group.numMembers})</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const custs = await api.getCustomers();
                          setAllCustomers(custs || []);
                          if (custs && custs.length > 0) {
                            setAddMemberCustomerId(custs[0].customerId);
                          }
                          setAddMemberTicketNumber('');
                          setAddMemberError(null);
                          setShowAddMemberModal(true);
                        } catch (err: any) {
                          alert('Failed to load customer list');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Ticket #</th>
                          <th className="py-2.5 px-3">Subscriber</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Pending</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedGroupData.members.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No subscribers enrolled in this chit group yet.
                            </td>
                          </tr>
                        ) : (
                          selectedGroupData.members.map((m) => (
                            <tr key={m.membershipId} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-amber-900">
                                #{m.ticketNumber}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <button
                                  onClick={() => onNavigateToCustomer(m.customerId)}
                                  className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left"
                                >
                                  {m.customerName}
                                </button>
                                <span className="text-slate-400 text-[10px] font-mono">{m.customerMobile}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">
                                ₹{m.totalPaid.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-800 font-medium">
                                ₹{m.totalPending.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {m.isPrized ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                                    Prized (M#{m.prizedAuctionNumber})
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-sans">
                                    Non-Prized
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Auctions Held Section */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm mb-3">
                    <Gavel className="w-4 h-4 text-amber-700" />
                    <span>Auction History ({selectedGroupData.auctions.length})</span>
                  </div>

                  {selectedGroupData.auctions.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                      No auctions conducted for this group yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[480px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Winner (Ticket)</th>
                            <th className="py-2.5 px-3 text-right">Prize Amount</th>
                            <th className="py-2.5 px-3 text-right">Dividend/Seat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {selectedGroupData.auctions.map((auc) => (
                            <tr key={auc.auctionId} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">M#{auc.auctionNumber}</td>
                              <td className="py-2.5 px-3 text-slate-600">{auc.auctionDate}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="font-bold text-slate-900 block">{auc.winnerCustomerName}</span>
                                <span className="text-amber-800 text-[10px] font-mono">Ticket #{auc.winnerTicketNumber}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                                ₹{auc.prizeAmount.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">
                                ₹{auc.dividendPerMember.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT GROUP MODAL */}
      {showModal && (
        <div id="group-form-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingGroup ? 'Edit Chit Scheme Parameters' : 'Create New Chit Scheme'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Group ID Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingGroup)}
                    value={formData.groupId || ''}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                    placeholder="e.g. GRP-500K"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Scheme Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.groupName || ''}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="e.g. Golden Growth Chit 5L"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Chit Value (₹) *</label>
                  <input
                    type="number"
                    required
                    step="1000"
                    min="10000"
                    value={formData.chitValue || ''}
                    onChange={(e) => handleValueOrDurationChange(Number(e.target.value), formData.durationMonths || 20)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Duration / Members *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      required
                      min="5"
                      max="100"
                      value={formData.durationMonths || ''}
                      onChange={(e) => handleValueOrDurationChange(formData.chitValue || 500000, Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="Months"
                    />
                    <input
                      type="number"
                      required
                      min="5"
                      max="100"
                      value={formData.numMembers || ''}
                      onChange={(e) => setFormData({ ...formData, numMembers: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="Seats"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 bg-amber-50/70 p-3 rounded-lg border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 block text-[11px] font-semibold">Monthly Installment Amount</span>
                    <span className="text-[10px] text-slate-500">Auto-calculated: Chit Value ÷ Duration Months</span>
                  </div>
                  <span className="text-base font-bold font-mono text-amber-900">
                    ₹{formData.monthlyInstallment?.toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate ? String(formData.startDate).split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Auction Day of Month *</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.auctionDayOfMonth || 10}
                    onChange={(e) => setFormData({ ...formData, auctionDayOfMonth: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Foreman Commission (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={formData.foremanCommissionPercent || 5.0}
                    onChange={(e) => setFormData({ ...formData, foremanCommissionPercent: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Scheme Status</label>
                  <select
                    value={formData.status || 'Upcoming'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description or special scheme terms..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  <span>{editingGroup ? 'Save Changes' : 'Create Scheme'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER TO CHIT GROUP UI MODAL */}
      {showAddMemberModal && selectedGroupData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Enroll Subscriber to Scheme</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedGroupData.group.groupName} ({selectedGroupData.group.groupId})</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!addMemberCustomerId) return;
                setAddMemberSubmitting(true);
                setAddMemberError(null);
                try {
                  await api.createMembership({
                    customerId: addMemberCustomerId,
                    groupId: selectedGroupData.group.groupId,
                    ticketNumber: addMemberTicketNumber ? Number(addMemberTicketNumber) : undefined
                  });
                  setShowAddMemberModal(false);
                  loadGroupDetails(selectedGroupData.group.groupId);
                  loadGroups();
                } catch (err: any) {
                  setAddMemberError(err.message || 'Failed to enroll member');
                } finally {
                  setAddMemberSubmitting(false);
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              {addMemberError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {addMemberError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Customer *</label>
                <select
                  required
                  value={addMemberCustomerId}
                  onChange={(e) => setAddMemberCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose Registered Customer --</option>
                  {allCustomers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.customerId}) • {c.mobileNumber}{c.city ? ` (${c.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ticket Number (Optional)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={addMemberTicketNumber}
                  onChange={(e) => setAddMemberTicketNumber(e.target.value)}
                  placeholder="Auto-assigns next available ticket (e.g. 1, 2, 3)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {addMemberSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-UI DELETE SCHEME CONFIRMATION MODAL */}
      {deletingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Chit Scheme?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete scheme <strong className="text-slate-900 font-semibold">{deletingGroup.groupName}</strong> (<span className="font-mono text-amber-800 font-bold">{deletingGroup.groupId}</span>)?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This will permanently delete this chit scheme along with its seats, member tickets, and auction ledgers.
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
                    setDeletingGroup(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteGroup}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Scheme</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
