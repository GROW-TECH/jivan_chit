import React, { useState, useEffect, useRef } from 'react';
import {
  Gift,
  Sparkles,
  Ticket,
  Users,
  Trophy,
  History,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Calendar,
  DollarSign,
  ShieldAlert,
  Printer,
  ChevronRight,
  Flame,
  Award,
  Loader2,
  FileText,
  Search,
  X,
  Shuffle
} from 'lucide-react';
import { api } from '../../api/client';
import type {
  ChitGroup,
  Membership,
  KuzhukkalDraw,
  KuzhukkalContext,
  UserRole
} from '../../types';

interface KuzhukkalViewProps {
  userRole: UserRole;
  initialGroupId?: string;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const KuzhukkalView: React.FC<KuzhukkalViewProps> = ({
  userRole,
  initialGroupId,
  onNavigateToCustomer
}) => {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || '');
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<KuzhukkalContext | null>(null);
  const [activeTab, setActiveTab] = useState<'digital' | 'physical' | 'history'>('digital');

  // Digital Draw Animation States
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedCandidateIndex, setDisplayedCandidateIndex] = useState(0);
  const [serverSelectedWinner, setServerSelectedWinner] = useState<(Membership & { customerName?: string; customerMobile?: string }) | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [digitalPrizeTitle, setDigitalPrizeTitle] = useState('');
  const [digitalPrizeAmount, setDigitalPrizeAmount] = useState<number | ''>('');
  const [digitalRemarks, setDigitalRemarks] = useState('');
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);

  // Physical Draw Form States
  const [physicalSelectedMemId, setPhysicalSelectedMemId] = useState('');
  const [physicalDrawDate, setPhysicalDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [physicalPrizeTitle, setPhysicalPrizeTitle] = useState('');
  const [physicalPrizeAmount, setPhysicalPrizeAmount] = useState<number | ''>('');
  const [physicalRemarks, setPhysicalRemarks] = useState('');
  const [physicalSubmitting, setPhysicalSubmitting] = useState(false);
  const [physicalSearch, setPhysicalSearch] = useState('');

  // Cancel Draw Modal State
  const [drawToCancel, setDrawToCancel] = useState<KuzhukkalDraw | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Alerts & Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load of Chit Groups
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const grps = await api.getChitGroups();
      setGroups(grps);
      if (grps.length > 0 && !selectedGroupId) {
        const defaultGrp = grps.find((g) => g.status === 'Active') || grps[0];
        setSelectedGroupId(defaultGrp.groupId);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load chit groups' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Kuzhukkal Context when group changes
  useEffect(() => {
    if (!selectedGroupId) return;
    loadGroupContext(selectedGroupId);
  }, [selectedGroupId]);

  const loadGroupContext = async (gid: string) => {
    try {
      setLoading(true);
      setFeedback(null);
      const ctx = await api.getKuzhukkalContext(gid);
      if (ctx && typeof ctx === 'object') {
        const safeCtx: KuzhukkalContext = {
          groupId: ctx.groupId || gid,
          groupName: ctx.groupName || 'Chit Group',
          chitValue: ctx.chitValue || 0,
          numMembers: ctx.numMembers || 0,
          durationMonths: ctx.durationMonths || 1,
          currentDrawSequence: ctx.currentDrawSequence || 1,
          totalMembersCount: ctx.totalMembersCount || 0,
          eligibleMembersCount: Array.isArray(ctx.eligibleMembers) ? ctx.eligibleMembers.length : 0,
          previousWinnersCount: Array.isArray(ctx.previousWinners) ? ctx.previousWinners.length : 0,
          eligibleMembers: Array.isArray(ctx.eligibleMembers) ? ctx.eligibleMembers : [],
          previousWinners: Array.isArray(ctx.previousWinners) ? ctx.previousWinners : [],
        };
        setContext(safeCtx);
        setDigitalPrizeTitle(`Month #${safeCtx.currentDrawSequence} Lucky Draw Prize`);
        setPhysicalPrizeTitle(`Month #${safeCtx.currentDrawSequence} Lucky Draw Prize`);
        setPhysicalSelectedMemId(safeCtx.eligibleMembers[0]?.membershipId || '');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load lucky draw context' });
    } finally {
      setLoading(false);
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
    };
  }, []);

  // 3. Digital Draw Animation & Server-Side Selection
  const startDigitalDraw = async () => {
    const candidates = Array.isArray(context?.eligibleMembers) ? context.eligibleMembers : [];
    if (!context || candidates.length === 0) {
      setFeedback({ type: 'error', message: 'No eligible members available for this draw.' });
      return;
    }

    try {
      setIsSpinning(true);
      setFeedback(null);
      setServerSelectedWinner(null);

      // Step A: Request the random winner from the backend (Secure Server RNG)
      const res = await api.selectDigitalKuzhukkalWinner(context.groupId);
      const winner = res.selectedWinner;

      // Step B: Reel Cycling Animation
      let counter = 0;
      let delay = 60;
      const totalCycles = 35 + Math.floor(Math.random() * 10);

      const cycle = () => {
        counter++;
        setDisplayedCandidateIndex((prev) => (prev + 1) % candidates.length);

        if (counter >= totalCycles) {
          // Stop on the server-selected winner
          const finalIndex = candidates.findIndex((c) => c.membershipId === winner.membershipId);
          if (finalIndex !== -1) {
            setDisplayedCandidateIndex(finalIndex);
          }
          setIsSpinning(false);
          setServerSelectedWinner(winner);
          setShowWinnerModal(true);
        } else {
          if (counter > totalCycles - 15) {
            delay += 25; // Gradual deceleration effect
          }
          spinTimerRef.current = setTimeout(cycle, delay);
        }
      };

      spinTimerRef.current = setTimeout(cycle, delay);
    } catch (err: any) {
      setIsSpinning(false);
      setFeedback({ type: 'error', message: err.message || 'Failed to execute digital draw' });
    }
  };

  // 4. Confirm Digital Draw Winner
  const handleConfirmDigitalWinner = async () => {
    if (!context || !serverSelectedWinner) return;

    try {
      setIsSubmittingWinner(true);
      await api.recordKuzhukkalDraw({
        groupId: context.groupId,
        drawSequence: context.currentDrawSequence,
        drawMethod: 'digital',
        winnerMembershipId: serverSelectedWinner.membershipId,
        prizeTitle: digitalPrizeTitle || `Month #${context.currentDrawSequence} Lucky Draw Prize`,
        prizeAmount: digitalPrizeAmount !== '' ? Number(digitalPrizeAmount) : 0,
        remarks: digitalRemarks
      });

      setShowWinnerModal(false);
      setServerSelectedWinner(null);
      setDigitalRemarks('');
      setFeedback({
        type: 'success',
        message: `Draw #${context.currentDrawSequence} Confirmed! Winner: ${serverSelectedWinner.customerName} (Ticket #${serverSelectedWinner.ticketNumber}). Winner automatically excluded from future draws in this group.`
      });
      await loadGroupContext(context.groupId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to confirm draw winner' });
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  // 5. Confirm Physical Draw Winner
  const handleConfirmPhysicalDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || !physicalSelectedMemId) return;

    const winnerMem = context.eligibleMembers.find((m) => m.membershipId === physicalSelectedMemId);
    if (!winnerMem) {
      setFeedback({ type: 'error', message: 'Please select an eligible member from the list.' });
      return;
    }

    try {
      setPhysicalSubmitting(true);
      await api.recordKuzhukkalDraw({
        groupId: context.groupId,
        drawSequence: context.currentDrawSequence,
        drawMethod: 'physical',
        winnerMembershipId: physicalSelectedMemId,
        drawDate: physicalDrawDate,
        prizeTitle: physicalPrizeTitle || `Month #${context.currentDrawSequence} Physical Draw Prize`,
        prizeAmount: physicalPrizeAmount !== '' ? Number(physicalPrizeAmount) : 0,
        remarks: physicalRemarks
      });

      setPhysicalRemarks('');
      setFeedback({
        type: 'success',
        message: `Physical Draw #${context.currentDrawSequence} Recorded! Winner: ${winnerMem.customerName} (Ticket #${winnerMem.ticketNumber}). Winner automatically excluded from future draws in this group.`
      });
      await loadGroupContext(context.groupId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record physical draw' });
    } finally {
      setPhysicalSubmitting(false);
    }
  };

  // 6. Rollback / Cancel Draw
  const handleCancelDraw = async () => {
    if (!drawToCancel || !context) return;
    try {
      setIsCancelling(true);
      await api.cancelKuzhukkalDraw(drawToCancel.drawId);
      setDrawToCancel(null);
      setFeedback({
        type: 'success',
        message: `Draw ${drawToCancel.drawId} has been cancelled. Subscriber has been restored to the eligible draw pool.`
      });
      await loadGroupContext(context.groupId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel draw' });
    } finally {
      setIsCancelling(false);
    }
  };

  const selectedGroup = (groups || []).find((g) => g.groupId === selectedGroupId);
  const eligibleMembers = Array.isArray(context?.eligibleMembers) ? context.eligibleMembers : [];
  const previousWinners = Array.isArray(context?.previousWinners) ? context.previousWinners : [];

  const filteredPhysicalMembers = eligibleMembers.filter((m) => {
    if (!physicalSearch) return true;
    const term = physicalSearch.toLowerCase();
    return (
      m.customerName?.toLowerCase().includes(term) ||
      String(m.ticketNumber).includes(term) ||
      m.customerMobile?.includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Kuzhukkal</span>
                <span className="text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                  Lucky Draw / Draw of Lots
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Group-isolated fair winner selection with automatic previous-winner exclusion.
              </p>
            </div>
          </div>
        </div>

        {/* Group Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="kuzhukkal-group-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Select Chit Group:
          </label>
          <select
            id="kuzhukkal-group-select"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={isSpinning || loading}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900 min-w-[220px]"
          >
            {(groups || []).map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.groupName} ({g.groupId}) — ₹{Number(g.chitValue).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-md text-slate-500 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Header */}
      {context && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Total Group Members</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{context.totalMembersCount}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Active Subscribers</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
              <span>Eligible Members</span>
              <Ticket className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{context.eligibleMembersCount}</div>
            <div className="text-[11px] text-emerald-600/80 font-mono mt-0.5">In Draw Bowl</div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
              <span>Previous Winners</span>
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-800">{context.previousWinnersCount}</div>
            <div className="text-[11px] text-amber-700/80 font-mono mt-0.5">Excluded from Draw</div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold mb-1">
              <span>Next Draw Sequence</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-700">
              Month #{context.currentDrawSequence} <span className="text-xs font-normal text-indigo-500">/ {context.durationMonths}</span>
            </div>
            <div className="text-[11px] text-indigo-600/80 font-mono mt-0.5">Current Round</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !context && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-semibold text-slate-600">Loading Lucky Draw details...</p>
        </div>
      )}

      {/* Empty Groups State */}
      {!loading && (!groups || groups.length === 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Gift className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Chit Groups Available</p>
          <p className="text-xs text-slate-400 mt-1">Please create an active chit group first to conduct a Lucky Draw.</p>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4">
          <button
            id="kuzhukkal-tab-digital"
            type="button"
            onClick={() => setActiveTab('digital')}
            disabled={isSpinning}
            className={`py-3 px-4 border-b-2 font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'digital'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Digital Lucky Draw</span>
          </button>

          <button
            id="kuzhukkal-tab-physical"
            type="button"
            onClick={() => setActiveTab('physical')}
            disabled={isSpinning}
            className={`py-3 px-4 border-b-2 font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'physical'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Physical Lucky Draw</span>
          </button>

          <button
            id="kuzhukkal-tab-history"
            type="button"
            onClick={() => setActiveTab('history')}
            disabled={isSpinning}
            className={`py-3 px-4 border-b-2 font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Draw History & Winners</span>
            {context && context.previousWinnersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-full font-mono">
                {context.previousWinnersCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: INTERACTIVE DIGITAL DRAW */}
      {activeTab === 'digital' && context && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-10 border border-slate-800 text-white shadow-xl relative overflow-hidden">
            {/* Ambient Lighting Background */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Interactive Digital Draw • Month #{context.currentDrawSequence}</span>
              </div>

              {/* Dynamic Animated Reel Stage */}
              <div className="py-6">
                <div
                  className={`w-full max-w-md mx-auto p-6 rounded-2xl bg-slate-900/90 border transition-all duration-300 shadow-2xl ${
                    isSpinning
                      ? 'border-amber-500 shadow-amber-500/20 scale-105 animate-pulse'
                      : 'border-slate-800'
                  }`}
                >
                  {eligibleMembers.length > 0 ? (
                    <div>
                      <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase mb-2">
                        {isSpinning ? 'Selecting Random Winner...' : 'Eligible Candidate Pool'}
                      </div>

                      {/* Display Ticket & Name */}
                      <div className="my-3">
                        <div className="inline-block px-4 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-sm font-black border border-amber-500/30">
                          TICKET #{eligibleMembers[displayedCandidateIndex]?.ticketNumber ?? '—'}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 truncate">
                          {eligibleMembers[displayedCandidateIndex]?.customerName || '—'}
                        </h2>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Membership: {eligibleMembers[displayedCandidateIndex]?.membershipId ?? '—'} • {eligibleMembers[displayedCandidateIndex]?.customerMobile || ''}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center gap-4">
                        <span>Total in Bowl: <b className="text-amber-400">{eligibleMembers.length}</b></span>
                        <span>•</span>
                        <span>Previous Winners Excluded: <b className="text-slate-300">{previousWinners.length}</b></span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <Trophy className="w-12 h-12 text-amber-500/40 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-300">All Members Have Won!</p>
                      <p className="text-xs text-slate-500 mt-1">
                        All subscribers in this chit group have been awarded a lucky draw.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Draw CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="start-digital-draw-btn"
                  type="button"
                  onClick={startDigitalDraw}
                  disabled={isSpinning || eligibleMembers.length === 0}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSpinning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Drawing Lots...</span>
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4" />
                      <span>Start Lucky Draw</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                * Winner is securely chosen on the server using cryptographic random selection. Winning subscriber remains active and pays all remaining installments.
              </p>
            </div>
          </div>

          {/* Eligible Candidates Roster for Inspection */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Current Eligible Members</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {eligibleMembers.length} active
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscribers participating in this draw. Previous winners in this group are automatically excluded.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {(context?.eligibleMembers || []).map((m) => (
                <div
                  key={m.membershipId}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-amber-400/80 bg-slate-50/50 flex items-center gap-3 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{m.ticketNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{m.customerName || 'Subscriber'}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{m.membershipId} • {m.customerMobile || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRADITIONAL PHYSICAL DRAW */}
      {activeTab === 'physical' && context && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slip Entry Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <FileText className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Record Paper-Slip Draw Result
                </h3>
                <p className="text-xs text-slate-500">
                  Staff conduct the physical token draw with subscribers present and record the result here.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPhysicalDraw} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Draw Sequence
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`Month #${context.currentDrawSequence} of ${context.durationMonths}`}
                    className="w-full text-xs font-semibold bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="physical-draw-date">
                    Draw Date
                  </label>
                  <input
                    id="physical-draw-date"
                    type="date"
                    required
                    value={physicalDrawDate}
                    onChange={(e) => setPhysicalDrawDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Winner Ticket Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="physical-winner-select">
                  Selected Winner *
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={physicalSearch}
                    onChange={(e) => setPhysicalSearch(e.target.value)}
                    placeholder="Search eligible member by name or ticket #..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <select
                  id="physical-winner-select"
                  required
                  value={physicalSelectedMemId}
                  onChange={(e) => setPhysicalSelectedMemId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Choose Drawn Ticket from Eligible Pool --</option>
                  {filteredPhysicalMembers.map((m) => (
                    <option key={m.membershipId} value={m.membershipId}>
                      Ticket #{m.ticketNumber} — {m.customerName} ({m.membershipId} | {m.customerMobile || ''})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Only eligible subscribers appear here. Previous winners in this group are permanently excluded.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="physical-prize-title">
                    Prize Title / Article
                  </label>
                  <input
                    id="physical-prize-title"
                    type="text"
                    value={physicalPrizeTitle}
                    onChange={(e) => setPhysicalPrizeTitle(e.target.value)}
                    placeholder="e.g. 1 Sovereign Gold Coin / Full Pot"
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="physical-prize-amount">
                    Prize Cash Amount (₹) (Optional)
                  </label>
                  <input
                    id="physical-prize-amount"
                    type="number"
                    min="0"
                    step="100"
                    value={physicalPrizeAmount}
                    onChange={(e) => setPhysicalPrizeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10000"
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="physical-remarks">
                  Staff Remarks & Witness Notes
                </label>
                <textarea
                  id="physical-remarks"
                  rows={2}
                  value={physicalRemarks}
                  onChange={(e) => setPhysicalRemarks(e.target.value)}
                  placeholder="Slip drawn by member representative / witnesses present..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  id="submit-physical-draw-btn"
                  type="submit"
                  disabled={physicalSubmitting || !physicalSelectedMemId}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {physicalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Winner...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Record Result</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Eligible Slips Roster (Print/Verify) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                <span>Paper Slip Roster ({eligibleMembers.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All tickets eligible to be put into the physical draw bowl:
              </p>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {(context?.eligibleMembers || []).map((m) => (
                <div
                  key={m.membershipId}
                  onClick={() => setPhysicalSelectedMemId(m.membershipId)}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                    physicalSelectedMemId === m.membershipId
                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">
                      #{m.ticketNumber}
                    </span>
                    <span className="truncate">{m.customerName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{m.membershipId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DRAW HISTORY & WINNERS ROSTER */}
      {activeTab === 'history' && context && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Draw History & Confirmed Winners</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                  {previousWinners.length} records
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historical record of draws conducted. Each confirmed winner has been automatically excluded from future draws.
              </p>
            </div>
          </div>

          {previousWinners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Draw #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Winner Ticket</th>
                    <th className="py-3 px-4">Subscriber Name</th>
                    <th className="py-3 px-4">Prize Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Conducted By</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(context?.previousWinners || []).map((w) => (
                    <tr key={w.drawId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        Month #{w.drawSequence}
                        <span className="block text-[10px] text-slate-400 font-normal">{w.drawId}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{w.drawDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.drawMethod === 'digital'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {w.drawMethod === 'digital' ? (
                            <>
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Digital</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-2.5 h-2.5" />
                              <span>Physical</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                          Ticket #{w.ticketNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{w.winnerCustomerName || 'Subscriber'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{w.winnerMembershipId} • {w.winnerCustomerMobile || ''}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{w.prizeTitle || 'Standard Prize'}</p>
                        {w.prizeAmount > 0 && (
                          <p className="text-[10px] text-emerald-600 font-mono font-bold">
                            ₹{Number(w.prizeAmount).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.status === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {w.confirmedByName || 'Staff'}
                      </td>
                      {userRole === 'admin' && (
                        <td className="py-3 px-4 text-right">
                          {w.status === 'Confirmed' && (
                            <button
                              type="button"
                              onClick={() => setDrawToCancel(w)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded transition"
                            >
                              Rollback
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Draws Recorded Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Conduct a Digital or Physical draw to record the first winner for this group.
              </p>
            </div>
          )}
        </div>
      )}

      {/* WINNER REVEAL & CONFIRMATION MODAL */}
      {showWinnerModal && serverSelectedWinner && context && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl relative overflow-hidden animate-scaleUp">
            {/* Ambient celebration glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl" />

            <div className="relative z-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/40 animate-bounce">
                <Trophy className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase">
                  Selected Winner
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {serverSelectedWinner.customerName}
                </h3>
                <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm">
                  TICKET #{serverSelectedWinner.ticketNumber} • {serverSelectedWinner.membershipId}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Chit Group:</span>
                  <span className="font-bold text-white">{context.groupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Draw Sequence:</span>
                  <span className="font-bold text-amber-400">Month #{context.currentDrawSequence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subscriber Mobile:</span>
                  <span className="font-mono text-slate-300">{serverSelectedWinner.customerMobile || '—'}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-400/90 font-mono">
                  ✓ Winner Exclusion Rule: Will be permanently removed from all future draws in this group upon confirmation.
                </div>
              </div>

              {/* Prize Details Input in Modal */}
              <div className="text-left space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1" htmlFor="modal-prize-title">
                    Prize Title / Article:
                  </label>
                  <input
                    id="modal-prize-title"
                    type="text"
                    value={digitalPrizeTitle}
                    onChange={(e) => setDigitalPrizeTitle(e.target.value)}
                    placeholder="e.g. Month #X Prize / Gold Coin"
                    className="w-full text-xs font-semibold bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1" htmlFor="modal-prize-amount">
                      Prize Cash (₹):
                    </label>
                    <input
                      id="modal-prize-amount"
                      type="number"
                      min="0"
                      value={digitalPrizeAmount}
                      onChange={(e) => setDigitalPrizeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 10000"
                      className="w-full text-xs font-semibold bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1" htmlFor="modal-remarks">
                      Remarks:
                    </label>
                    <input
                      id="modal-remarks"
                      type="text"
                      value={digitalRemarks}
                      onChange={(e) => setDigitalRemarks(e.target.value)}
                      placeholder="Witness notes..."
                      className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmittingWinner}
                  onClick={() => {
                    setShowWinnerModal(false);
                    setServerSelectedWinner(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition"
                >
                  Discard / Redraw
                </button>

                <button
                  id="confirm-digital-winner-btn"
                  type="button"
                  disabled={isSubmittingWinner}
                  onClick={handleConfirmDigitalWinner}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmittingWinner ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL / ROLLBACK CONFIRMATION MODAL */}
      {drawToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rollback Draw {drawToCancel.drawId}?</h3>
                <p className="text-xs text-slate-500">Draw Sequence: Month #{drawToCancel.drawSequence}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Cancelling this draw will mark its record as cancelled and <b>restore Ticket #{drawToCancel.ticketNumber} ({drawToCancel.winnerCustomerName})</b> back into the eligible draw pool for future lucky draws in this group.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setDrawToCancel(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Keep Record
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelDraw}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition flex items-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rolling back...</span>
                  </>
                ) : (
                  <span>Yes, Rollback Draw</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
