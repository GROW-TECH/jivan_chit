import React from 'react';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee
} from 'lucide-react';
import type { AgentCollectionSummary as AgentCollectionSummaryType, AgentMonthlyTrendPoint } from '../../types/agent';
import { formatAmount, monthLabel } from '../../services/agentApi';

interface AgentCollectionSummaryProps {
  summary: AgentCollectionSummaryType | null;
  month: string;
  onMonthChange: (month: string) => void;
  trend: AgentMonthlyTrendPoint[];
}

function StatTile({
  icon: Icon,
  iconClass,
  label,
  value
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 sm:p-3">
      <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${iconClass}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="block text-sm sm:text-base font-bold text-slate-900 mt-1">{value}</span>
    </div>
  );
}

export const AgentCollectionSummary: React.FC<AgentCollectionSummaryProps> = ({
  summary,
  month,
  onMonthChange,
  trend = []
}) => {
  const safeTrend = Array.isArray(trend) ? trend : [];
  const progressPercent = summary
    ? Math.min(100, summary.targetAchievedPercent)
    : 0;
  const maxTrend = safeTrend.length
    ? Math.max(...safeTrend.map((t) => Math.max(t.collected || 0, t.target || 0)), 1)
    : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* Daily Collection Summary */}
      <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900">Daily Collection Summary</h2>
        </div>
        {!summary ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-9 bg-slate-100 rounded" />
            <div className="h-9 bg-slate-100 rounded" />
            <div className="h-9 bg-slate-100 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <StatTile icon={Wallet} iconClass="text-emerald-600" label="Total" value={formatAmount(summary.todayTotalCollection)} />
            <StatTile icon={Wallet} iconClass="text-emerald-600" label="Cash" value={formatAmount(summary.todayCashCollection)} />
            <StatTile icon={CreditCard} iconClass="text-sky-600" label="Online" value={formatAmount(summary.todayOnlineCollection)} />
            <StatTile icon={Users} iconClass="text-indigo-600" label="Customers" value={String(summary.todayCustomersCollected)} />
            <StatTile icon={Clock} iconClass="text-amber-600" label="Pending" value={String(summary.todayPendingCollections)} />
            <StatTile icon={AlertCircle} iconClass="text-rose-600" label="Overdue" value={String(summary.todayOverdueCollections)} />
          </div>
        )}
      </div>

      {/* Monthly Collection Summary */}
      <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Monthly Collection Summary</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) onMonthChange(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </label>
        </div>

        {!summary ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-slate-100 rounded" />
            <div className="h-3 bg-slate-100 rounded" />
            <div className="h-24 bg-slate-100 rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xl font-bold text-slate-900">
                {formatAmount(summary.monthlyCollection)}
              </span>
              <span className="text-sm text-slate-400 font-semibold">
                of {formatAmount(summary.monthlyTarget)} target
              </span>
              <span className="text-xs font-bold text-amber-700 rounded-md bg-amber-50 px-2 py-0.5">
                {summary.targetAchievedPercent}%
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile icon={IndianRupee} iconClass="text-slate-600" label="Remaining Target" value={formatAmount(summary.remainingTargetAmount)} />
              <StatTile icon={CheckCircle2} iconClass="text-emerald-600" label="Collected" value={String(summary.collectedInstallments)} />
              <StatTile icon={Clock} iconClass="text-amber-600" label="Pending" value={String(summary.pendingInstallments)} />
              <StatTile icon={AlertCircle} iconClass="text-rose-600" label="Overdue" value={String(summary.overdueInstallments)} />
            </div>

            {/* Collection Trend */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Collection Trend &middot; {monthLabel(month)}
              </p>
              <div className="h-24 flex items-end justify-between gap-1.5 px-1 border-b border-slate-100">
                {safeTrend.map((point) => {
                  const height = Math.min(100, Math.round(((point.collected || 0) / maxTrend) * 100));
                  return (
                    <div key={point.month} className="flex-1 flex items-end justify-center h-full group">
                      <div
                        className="w-full max-w-[42px] bg-emerald-600 hover:bg-emerald-500 rounded-t-sm transition-all duration-300"
                        style={{ height: `${Math.max(4, height)}%` }}
                        title={`${point.label}: ${formatAmount(point.collected || 0)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                {safeTrend.map((point) => (
                  <span key={point.month}>{point.label}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};