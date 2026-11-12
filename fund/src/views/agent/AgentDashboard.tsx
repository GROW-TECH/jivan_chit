import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  ReceiptText,
  MapPin,
  Phone,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { agentApi, CURRENT_MONTH_KEY, formatAmount, monthLabel } from '../../services/agentApi';
import type { AgentCollectionSummary, AgentMonthlyTrendPoint, AgentProfile } from '../../types/agent';
import { AgentMetricsCards } from './AgentMetricsCards';
import { AgentCollectionSummary as AgentCollectionSummarySection } from './AgentCollectionSummary';

interface AgentDashboardProps {
  agentName: string;
  onNavigate: (view: string) => void;
}

const QUICK_LINKS: Array<{
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  { id: 'agent-collection', label: 'Collection Sheet', desc: 'Record daily field collections', icon: ClipboardList },
  { id: 'agent-balance', label: 'Balance & Due Bills', desc: 'Track pending and overdue bills', icon: Wallet },
  { id: 'agent-receipts', label: 'Receipts', desc: 'View and download collection receipts', icon: ReceiptText }
];

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ agentName, onNavigate }) => {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_MONTH_KEY);
  const [summary, setSummary] = useState<AgentCollectionSummary | null>(null);
  const [trend, setTrend] = useState<AgentMonthlyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prof, sum, tr] = await Promise.all([
        agentApi.getAgentProfile(),
        agentApi.getAgentCollectionSummary(selectedMonth),
        agentApi.getAgentMonthlyTrend()
      ]);
      setProfile(prof);
      setSummary(sum);
      setTrend(Array.isArray(tr) ? tr : []);
    } catch {
      setError('Unable to load collection data. Please try again.');
      setTrend([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-emerald-600" />
            Agent Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collection analytics and field performance for{' '}
            <span className="font-semibold text-slate-700">{agentName}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {monthLabel(selectedMonth)} overview
        </span>
      </div>

      {/* Agent profile strip */}
      {profile && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
              {(profile.name || agentName || 'Field Agent').charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">{profile.name || agentName || 'Field Agent'}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {profile.area || 'Field Operations'}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" /> {profile.phone || '+91 98765 43210'}
          </span>
          <span className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">{profile.assignedCustomers ?? 0}</span> assigned customers
          </span>
        </div>
      )}

      {loading && !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : error && !summary ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button onClick={loadDashboard} className="text-xs font-bold text-rose-700 underline whitespace-nowrap">
            Retry
          </button>
        </div>
      ) : (
        <>
          <AgentMetricsCards summary={summary} />
          <AgentCollectionSummarySection
            summary={summary}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            trend={trend}
          />
        </>
      )}

      {/* Quick action links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className="group bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3.5 text-left hover:border-emerald-300 hover:shadow-sm transition"
            >
              <span className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <p className="text-sm font-bold text-slate-900">{link.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{link.desc}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading heartbeat */}
      {loading && summary && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Refreshing data...
        </div>
      )}
    </div>
  );
};