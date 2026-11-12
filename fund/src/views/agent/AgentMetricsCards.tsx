import React from 'react';
import { Wallet, CreditCard, TrendingUp, AlertCircle, IndianRupee, Users } from 'lucide-react';
import type { AgentCollectionSummary } from '../../types/agent';
import { formatAmount, monthLabel } from '../../services/agentApi';

interface AgentMetricsCardsProps {
  summary: AgentCollectionSummary | null;
}

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 bg-slate-200 rounded" />
      <div className="h-8 w-8 bg-slate-200 rounded-lg" />
    </div>
    <div className="h-7 w-32 bg-slate-200 rounded" />
    <div className="h-3 w-40 bg-slate-100 rounded" />
  </div>
);

export const AgentMetricsCards: React.FC<AgentMetricsCardsProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const progressPercent = Math.min(100, summary.targetAchievedPercent);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {/* Today's Collection */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Today's Collection
          </span>
          <span className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Wallet className="w-4.5 h-4.5" />
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 font-sans">
          {formatAmount(summary.todayTotalCollection)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <Wallet className="w-3 h-3" /> Cash
            </span>
            <span className="font-mono font-bold text-emerald-900 block mt-0.5">
              {formatAmount(summary.todayCashCollection)}
            </span>
          </div>
          <div className="rounded-lg bg-sky-50 border border-sky-100 px-2.5 py-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-700">
              <CreditCard className="w-3 h-3" /> Online
            </span>
            <span className="font-mono font-bold text-sky-900 block mt-0.5">
              {formatAmount(summary.todayOnlineCollection)}
            </span>
          </div>
        </div>
      </div>

      {/* Month to Date */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Month-to-Date
          </span>
          <span className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4.5 h-4.5" />
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 font-sans">
          {formatAmount(summary.monthlyCollection)}
          <span className="text-sm font-semibold text-slate-400"> / {formatAmount(summary.monthlyTarget)}</span>
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500">{monthLabel(summary.month)}</span>
            <span className="font-bold text-amber-700">{summary.targetAchievedPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Target achieved</p>
        </div>
      </div>

      {/* Pending Balance Due */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pending Balance Due
          </span>
          <span className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-4.5 h-4.5" />
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 font-sans">
          {formatAmount(summary.pendingBalance)}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <span className="font-bold text-slate-700">{summary.pendingCustomersCount}</span> customers
            with outstanding balance
          </span>
        </p>
      </div>

      {/* Commission Earned */}
      <div className="bg-white p-5 rounded-xl border border-emerald-200/70 bg-emerald-50/20 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            Commission Earned
          </span>
          <span className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IndianRupee className="w-4.5 h-4.5" />
          </span>
        </div>
        <p className="text-2xl font-bold text-emerald-900 font-sans">
          {formatAmount(summary.commissionEarned)}
        </p>
        <p className="mt-3 text-xs text-emerald-700">
          Current month &middot; {summary.commissionRate}% of collected
        </p>
      </div>
    </div>
  );
};