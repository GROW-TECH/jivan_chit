import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Filter,
  CheckCircle2,
  X,
  Loader2,
  TrendingDown
} from 'lucide-react';
import { api } from '../../api/client';
import type { Expense, UserRole } from '../../types';

interface ExpensesViewProps {
  userRole: UserRole;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ userRole }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Add / Edit Expense Modal
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Office Supplies');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const categories = [
    'Office Rent',
    'Staff Salary',
    'Electricity & Internet',
    'Office Supplies & Stationery',
    'Printing & Receipts',
    'Tea & Refreshments',
    'Legal & Audit Fees',
    'Bank Charges',
    'Marketing & Outreach',
    'Miscellaneous'
  ];

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses(selectedCategory !== 'all' ? selectedCategory : undefined);
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setCategory('Office Supplies & Stationery');
    setDescription('');
    setAmount('');
    setPaymentMode('Cash');
    setRefNumber('');
    setRemarks('');
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseDate(exp.expenseDate);
    setCategory(exp.category);
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMode(exp.paymentMode);
    setRefNumber(exp.referenceNumber || '');
    setRemarks(exp.remarks || '');
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) {
      setModalError('Please enter valid description and amount');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        expenseDate,
        category: category as any,
        description,
        amount: Number(amount),
        paymentMode: paymentMode as any,
        referenceNumber: refNumber,
        remarks
      };

      if (editingExpense) {
        await api.updateExpense(editingExpense.expenseId, payload);
      } else {
        await api.createExpense(payload);
      }
      setShowModal(false);
      setDescription('');
      setAmount('');
      setRefNumber('');
      setRemarks('');
      setEditingExpense(null);
      loadExpenses();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense record?')) return;
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.expenseId !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Company Operating Expenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and audit branch operational overheads, staff salaries, rent, stationery, and utility bills
          </p>
        </div>

        <button
          id="add-expense-btn"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Expenses Logged</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            ₹{totalExpenseAmount.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">{expenses.length} expense vouchers</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Average Expense / Entry</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            ₹{expenses.length > 0 ? Math.round(totalExpenseAmount / expenses.length).toLocaleString() : '0'}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Operational disbursement avg</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Expense Categories</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{categories.length}</span>
          <p className="text-[11px] text-slate-500 mt-1">Classified for tax and P&L statements</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <span className="text-slate-400 font-mono">{expenses.length} entries</span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Mode & Ref</th>
                <th className="py-3 px-4">Logged By</th>
                {userRole === 'admin' && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading expenses ledger...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    No expenses recorded in this category.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.expenseId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-600">
                      {e.expenseDate}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700">
                      <span>{e.description}</span>
                      {e.remarks && <span className="block text-[10px] text-slate-400 italic">{e.remarks}</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{e.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      <span>{e.paymentMode}</span>
                      {e.referenceNumber && (
                        <span className="block text-[10px] font-mono text-slate-400">{e.referenceNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px]">
                      {e.createdByName || (e as any).recordedByName || 'Admin'}
                    </td>
                    {userRole === 'admin' && (
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(e)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded bg-slate-50 border border-slate-200"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(e.expenseId)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded bg-slate-50 border border-slate-200"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {showModal && (
        <div id="expense-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingExpense ? 'Edit Expense Record' : 'Record Operational Expense'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Expense Category *</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description / Particulars *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Office rent payment for the month of September"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate ? String(expenseDate).split('T')[0] : ''}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ref / Voucher Number</label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="e.g. VCH-0041"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional internal remark"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
