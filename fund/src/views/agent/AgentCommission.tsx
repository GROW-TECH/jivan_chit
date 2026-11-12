import React, { useState, useEffect } from 'react';
import { Award, DollarSign, TrendingUp, Calendar, RefreshCw, CheckCircle2, Percent, FileText, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { agentApi } from '../../services/agentApi';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const AgentCommission: React.FC<{ agentName: string }> = ({ agentName }) => {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, monRes] = await Promise.all([
        agentApi.getAgentCollectionSummary(month).catch(() => null),
        api.getMonthlyCollection(month).catch(() => null)
      ]);
      setSummary(sumRes);
      setMonthlyData(monRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month]);

  const totalCollected = summary?.monthlyCollection || monthlyData?.totalCollected || 0;
  const commissionRate = 0.05; // 5%
  const commissionEarned = summary?.commissionEarned || round2(totalCollected * commissionRate);
  const target = summary?.monthlyTarget || 350000;
  const targetAchieved = target > 0 ? Math.min(100, Math.round((totalCollected / target) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Agent Commission Earnings
          </h1>
          <p className="text-xs text-slate-500 mt-1">Track your 5% field collection commission & monthly performance metrics</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-700"
          />
          <button onClick={fetchData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">Commission Earned</span>
            <Award className="w-5 h-5 text-amber-200" />
          </div>
          <p className="text-3xl font-extrabold mt-3">₹{commissionEarned.toLocaleString()}</p>
          <p className="text-[11px] text-amber-100 mt-1">5% on ₹{totalCollected.toLocaleString()} collections</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3">₹{totalCollected.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 mt-1">Verified Field Collections</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commission Rate</span>
            <Percent className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-3">5.0%</p>
          <p className="text-[11px] text-slate-500 mt-1">Standard Incentive Rate</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Progress</span>
            <TrendingUp className="w-5 h-5 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3">{targetAchieved}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${targetAchieved}%` }} />
          </div>
        </div>
      </div>

      {/* Commission Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 font-semibold text-slate-800 text-sm flex justify-between items-center">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Commission Ledger Transactions ({monthlyData?.transactions?.length || 0})
          </span>
          <span className="text-xs font-normal text-slate-500">Agent: {agentName}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Receipt / Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Customer & Group</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Mode</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Amount Collected</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">5% Commission</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {monthlyData?.transactions?.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{t.id}</p>
                    <p className="text-[10px] text-slate-500">{t.date} • {t.time}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.customerName}</p>
                    <p className="text-[10px] text-slate-500">{t.groupName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      String(t.paymentMode).toLowerCase() === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {t.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{t.amountPaid?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600">₹{t.commission?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={async () => {
                          const newAmt = prompt('Edit collected amount (₹):', String(t.amountPaid));
                          if (newAmt && !isNaN(Number(newAmt))) {
                            try {
                              await api.updatePayment(t.id, { amountPaid: Number(newAmt) });
                              fetchData();
                            } catch (err: any) {
                              alert(err.message || 'Failed to update transaction');
                            }
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete transaction #${t.id}?`)) {
                            try {
                              await api.deletePayment(t.id);
                              setMonthlyData((prev: any) => prev ? { ...prev, transactions: prev.transactions.filter((x: any) => x.id !== t.id) } : null);
                            } catch (err: any) {
                              alert(err.message || 'Failed to delete transaction');
                            }
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!monthlyData?.transactions?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No collections found for this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
