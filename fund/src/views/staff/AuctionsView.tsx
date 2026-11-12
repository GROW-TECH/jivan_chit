import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Plus,
  Calendar,
  Coins,
  Ticket,
  Calculator,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Award,
  ArrowRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';
import type { Auction, ChitGroup, Membership, UserRole } from '../../types';

interface AuctionsViewProps {
  userRole: UserRole;
  initialGroupId?: string;
  onNavigateToCustomer: (customerId: string) => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({
  userRole,
  initialGroupId,
  onNavigateToCustomer
}) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || 'all');
  const [loading, setLoading] = useState(true);

  // New Auction Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalGroupId, setModalGroupId] = useState<string>('');
  const [eligibleMembers, setEligibleMembers] = useState<Membership[]>([]);
  const [auctionNumber, setAuctionNumber] = useState<number>(1);
  const [auctionDate, setAuctionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bidDiscount, setBidDiscount] = useState<number | ''>(50000);
  const [winnerMembershipId, setWinnerMembershipId] = useState<string>('');
  const [applyDividend, setApplyDividend] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Live Math Calculation State
  const [calcPreview, setCalcPreview] = useState<{
    chitValue: number;
    bidDiscountAmount: number;
    prizeAmount: number;
    foremanCommission: number;
    distributableDividend: number;
    numMembers: number;
    dividendPerMember: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aucs, grps] = await Promise.all([
        api.getAuctions(selectedGroupId !== 'all' ? selectedGroupId : undefined),
        api.getChitGroups()
      ]);
      setAuctions(aucs);
      setGroups(grps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroupId]);

  // When modal Chit Group changes, calculate next auction # and fetch eligible members
  useEffect(() => {
    if (!modalGroupId) return;

    const grp = groups.find((g) => g.groupId === modalGroupId);
    if (!grp) return;

    // Fetch existing auctions in this group to get next auction number
    api.getAuctions(modalGroupId).then((groupAucs) => {
      setAuctionNumber(groupAucs.length + 1);
    });

    // Fetch members in this group and filter to non-prized
    api.getMemberships(modalGroupId).then((mems) => {
      const nonPrized = mems.filter((m) => !m.isPrized);
      setEligibleMembers(nonPrized);
      if (nonPrized.length > 0) {
        setWinnerMembershipId(nonPrized[0].membershipId);
      } else {
        setWinnerMembershipId('');
      }
    });
  }, [modalGroupId, groups]);

  // Live Calculation update
  useEffect(() => {
    if (!modalGroupId || !bidDiscount || Number(bidDiscount) <= 0) {
      setCalcPreview(null);
      return;
    }
    const grp = groups.find((g) => g.groupId === modalGroupId);
    if (!grp) return;

    api
      .calculateAuction({
        chitValue: grp.chitValue,
        bidDiscountAmount: Number(bidDiscount),
        numMembers: grp.numMembers,
        commissionPercent: grp.foremanCommissionPercent
      })
      .then(setCalcPreview)
      .catch(console.error);
  }, [modalGroupId, bidDiscount, groups]);

  const handleOpenModal = (groupId?: string) => {
    const targetGroup = groupId || (groups.length > 0 ? groups[0].groupId : '');
    setModalGroupId(targetGroup);
    setBidDiscount(50000);
    setAuctionDate(new Date().toISOString().split('T')[0]);
    setApplyDividend(true);
    setRemarks('');
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGroupId || !winnerMembershipId || !bidDiscount || Number(bidDiscount) <= 0) {
      setModalError('Please fill all required auction fields');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);
    try {
      await api.recordAuction({
        groupId: modalGroupId,
        auctionNumber,
        auctionDate,
        bidDiscountAmount: Number(bidDiscount),
        winnerMembershipId,
        applyDividendToNextMonth: applyDividend,
        remarks
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record auction');
    } finally {
      setModalSubmitting(false);
    }
  };

  const [deletingAuction, setDeletingAuction] = useState<Auction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAuction = (auc: Auction) => {
    setDeletingAuction(auc);
    setDeleteError(null);
  };

  const confirmDeleteAuction = async () => {
    if (!deletingAuction) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteAuction(deletingAuction.auctionId);
      setAuctions((prev) => prev.filter((item) => item.auctionId !== deletingAuction.auctionId));
      setDeletingAuction(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete auction');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Auctions & Bidding
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct monthly auctions, compute bid discounts, calculate foreman commissions, and distribute member dividends
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            id="conduct-auction-btn"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
          >
            <Gavel className="w-4 h-4" />
            <span>Conduct New Auction</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter by Chit Group:</span>
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
        <span className="text-slate-400 font-mono">{auctions.length} auctions recorded</span>
      </div>

      {/* Mobile Auctions Cards (< md) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
            Loading auction records...
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No auction records found for this scheme.
          </div>
        ) : (
          auctions.map((auc) => (
            <div
              key={auc.auctionId}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      M#{auc.auctionNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{auc.auctionDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">{auc.groupName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{auc.groupId} • Value: ₹{auc.chitValue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prize Disbursed</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">
                    ₹{auc.prizeAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Prize Winner:</span>
                  <button
                    onClick={() => onNavigateToCustomer(auc.winnerCustomerId)}
                    className="font-bold text-slate-900 hover:text-amber-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{auc.winnerCustomerName}</span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-mono px-1 py-0.2 rounded font-bold">
                      #{auc.winnerTicketNumber}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bid Discount</span>
                    <span className="text-rose-700 font-medium">-₹{auc.bidDiscountAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Foreman Comm.</span>
                    <span className="text-slate-700">₹{auc.foremanCommission.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Dividend/Seat</span>
                    <span className="text-emerald-700 font-bold">₹{auc.dividendPerMember.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Auctions Table (>= md) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Auction #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Chit Group</th>
                <th className="py-3 px-4">Prize Winner & Ticket</th>
                <th className="py-3 px-4 text-right">Chit Value (₹)</th>
                <th className="py-3 px-4 text-right">Bid Discount (₹)</th>
                <th className="py-3 px-4 text-right">Prize Disbursed (₹)</th>
                <th className="py-3 px-4 text-right">Foreman Comm (5%)</th>
                <th className="py-3 px-4 text-right">Dividend / Seat</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading auction records...
                  </td>
                </tr>
              ) : auctions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-sans">
                    No auction records found for this scheme.
                  </td>
                </tr>
              ) : (
                auctions.map((auc) => (
                  <tr key={auc.auctionId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      M#{auc.auctionNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {auc.auctionDate}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold text-slate-800 block">{auc.groupName}</span>
                      <span className="text-slate-400 text-[10px] font-mono">{auc.groupId}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onNavigateToCustomer(auc.winnerCustomerId)}
                        className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left"
                      >
                        {auc.winnerCustomerName}
                      </button>
                      <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded mt-0.5">
                        Ticket #{auc.winnerTicketNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{auc.chitValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-medium">
                      -₹{auc.bidDiscountAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800 text-sm">
                      ₹{auc.prizeAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      ₹{auc.foremanCommission.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ₹{auc.dividendPerMember.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={async () => {
                            const newDiscount = prompt('Edit Bid Discount Amount (₹):', String(auc.bidDiscountAmount));
                            if (newDiscount && !isNaN(Number(newDiscount))) {
                              try {
                                await api.updateAuction(auc.auctionId, { bidDiscountAmount: Number(newDiscount) });
                                loadData();
                              } catch (err: any) {
                                alert(err.message || 'Failed to update auction');
                              }
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          title="Edit Auction"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAuction(auc)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                          title="Delete Auction"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* CONDUCT NEW AUCTION MODAL (ADMIN ONLY) */}
      {showModal && (
        <div id="auction-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50 text-amber-950 shrink-0">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-700 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base">Conduct Official Chit Auction</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuction} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              {/* Group & Auction # */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Chit Scheme Group *</label>
                  <select
                    required
                    value={modalGroupId}
                    onChange={(e) => setModalGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {groups
                      .filter((g) => g.status === 'Active' || g.status === 'Upcoming')
                      .map((g) => (
                        <option key={g.groupId} value={g.groupId}>
                          {g.groupName} ({g.groupId}) • ₹{g.chitValue.toLocaleString()}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Auction / Month Number *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={auctionNumber}
                    onChange={(e) => setAuctionNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Auction Date *</label>
                  <input
                    type="date"
                    required
                    value={auctionDate ? String(auctionDate).split('T')[0] : ''}
                    onChange={(e) => setAuctionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Winning Bid Discount Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    step="500"
                    min="1000"
                    value={bidDiscount}
                    onChange={(e) => setBidDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              {/* LIVE MATHEMATICAL CALCULATION PREVIEW BOX */}
              {calcPreview && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    <span>Live Chit Distribution Breakdown</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-slate-500 text-[10px] block font-sans">Chit Value</span>
                      <span className="font-semibold text-slate-900">₹{calcPreview.chitValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block font-sans">Foreman Comm (5%)</span>
                      <span className="font-semibold text-slate-900">₹{calcPreview.foremanCommission.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] block font-sans">Winner Prize Amount</span>
                      <span className="font-bold text-emerald-800 text-sm">₹{calcPreview.prizeAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-amber-800 text-[10px] block font-sans">Dividend / Subscriber</span>
                      <span className="font-bold text-amber-900 text-sm">₹{calcPreview.dividendPerMember.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Winner Subscriber Selection */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Winning Subscriber (Eligible Non-Prized) *</label>
                <select
                  required
                  value={winnerMembershipId}
                  onChange={(e) => setWinnerMembershipId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {eligibleMembers.length === 0 ? (
                    <option value="">No eligible non-prized members in this group</option>
                  ) : (
                    eligibleMembers.map((m) => (
                      <option key={m.membershipId} value={m.membershipId}>
                        Ticket #{m.ticketNumber} - {m.customerName} ({m.customerMobile})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Only non-prized ticket holders are eligible to bid and win.
                </p>
              </div>

              {/* Apply Dividend Option */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyDividend}
                    onChange={(e) => setApplyDividend(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-800 font-bold text-xs">
                    Apply dividend deduction automatically to next month installments
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">
                  Recommended: Subscribing members will pay net installment (Gross installment minus ₹{calcPreview?.dividendPerMember.toLocaleString() || '0'}).
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Auction Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Open bid held at branch premises with 18 attendees"
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
                  disabled={modalSubmitting || !winnerMembershipId}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {modalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Record Auction Result</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-UI Confirmation Modal for Deleting Auction */}
      {deletingAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Auction Record?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to delete auction <strong className="text-slate-900 font-semibold">Month #{deletingAuction.auctionNumber}</strong> for group <span className="font-mono text-amber-800 font-bold">{deletingAuction.groupName || deletingAuction.groupId}</span>?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This will also remove any linked dividends and prize payment records associated with this auction.
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
                    setDeletingAuction(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteAuction}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Auction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
