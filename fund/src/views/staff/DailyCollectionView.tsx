import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Search, ArrowRight, Activity, DollarSign, Wallet, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../api/client';

export const DailyCollectionView: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getDailyCollection(date);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Collection</h1>
          <p className="text-sm text-slate-500">Real-time daily transaction analysis</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="date" 
            value={date ? String(date).split('T')[0] : ''} 
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button onClick={fetchData} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /></div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Collected</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{data.totalCollected?.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Cash</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{data.totalCash?.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Online</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{data.totalOnline?.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Commission (5%)</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">₹{data.commissionEarned?.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Transaction Info</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Customer & Group</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Payment Mode</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Agent / Collector</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.transactions?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{t.id}</p>
                        <p className="text-xs text-slate-500">{t.time} • {t.day}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{t.customerName}</p>
                        <p className="text-xs text-slate-500">{t.groupName}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-emerald-600">₹{t.amount?.toLocaleString()}</p>
                        <p className="text-xs text-amber-600">Com: ₹{t.commission}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.paymentMode?.toLowerCase() === 'cash' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {t.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{t.agentName}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              const newAmt = prompt('Edit collected amount (₹):', String(t.amount));
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
                                  setData((prev: any) => prev ? { ...prev, transactions: prev.transactions.filter((x: any) => x.id !== t.id) } : null);
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
                  {!data.transactions?.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No collections for this date.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to load data</div>
      )}
    </div>
  );
};
