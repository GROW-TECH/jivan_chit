import React, { useState, useEffect } from 'react';
import { Printer, Search, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { ChitBookingItem } from '../../types';

export const ChitBookingListView: React.FC = () => {
  const [items, setItems] = useState<ChitBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookingList = async () => {
    try {
      setLoading(true);
      const data = await api.getChitBookingList();
      setItems(data);
    } catch (err) {
      console.error('Failed to load chit booking customer list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingList();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.newGroupNo.toLowerCase().includes(q) ||
      item.phoneNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Screen Header & Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            <span>Total Chit Booking Customer List</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete registry of chit group bookings, subscriber ticket allocations, and chit values
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBookingList}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="print-booking-list-btn"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Customer List</span>
          </button>
        </div>
      </div>

      {/* Screen Filter Bar */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by subscriber name, Group No, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredItems.length}</span> of {items.length} Bookings
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-8 print:p-0 print:border-none print:shadow-none print:bg-white">
        
        {/* Printable Document Header (Matching Photo) */}
        <div className="text-center mb-6 py-2 border-b-2 border-black print:border-b-2 print:border-black">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide uppercase text-slate-900 font-serif">
            TOTAL CHIT BOOKING CUSTOMER LIST
          </h2>
        </div>

        {/* Table Matching Photo Columns Exactly */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-900 print:text-xs">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                <th className="py-2.5 px-3 border-r border-slate-900 text-center w-12 font-bold">S.No</th>
                <th className="py-2.5 px-3 border-r border-slate-900 w-36 font-bold">New Group No</th>
                <th className="py-2.5 px-3 border-r border-slate-900 font-bold">Name</th>
                <th className="py-2.5 px-3 border-r border-slate-900 w-36 font-bold">Phone Number</th>
                <th className="py-2.5 px-3 border-r border-slate-900 text-center w-24 font-bold">Chit Value</th>
                <th className="py-2.5 px-3 text-center w-20 font-bold">Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading chit booking records...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                    No chit booking records found. Enroll subscribers into chit groups to populate this list.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.membershipId || idx}
                    className="hover:bg-slate-50 transition border-b border-slate-900 text-slate-900"
                  >
                    <td className="py-2 px-3 border-r border-slate-900 text-center font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-900 font-mono font-bold text-slate-900">
                      {item.newGroupNo}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-900 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-900 font-mono text-slate-900">
                      {item.phoneNumber}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-900 text-center font-bold font-mono text-slate-900">
                      {item.chitValue}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-medium text-slate-900">
                      {item.month}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Footer Stamp */}
        <div className="hidden print:flex justify-between items-end mt-12 pt-6 text-[10px] text-slate-600 font-mono">
          <div>Report Generated: {new Date().toLocaleDateString()}</div>
          <div>Authorized Signatory ___________________</div>
        </div>
      </div>

      {/* Embedded CSS for Exact Photo Printing */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          nav, sidebar, header, .print\\:hidden {
            display: none !important;
          }
          table {
            border: 1.5px solid #000000 !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 10px !important;
            color: #000000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}</style>
    </div>
  );
};
