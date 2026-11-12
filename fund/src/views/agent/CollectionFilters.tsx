import React from 'react';
import { Filter, Search, Calendar } from 'lucide-react';
import type { AgentCollectionFilters, CollectionStatus } from '../../types/agent';

interface CollectionFiltersProps {
  filters: AgentCollectionFilters;
  onChange: (filters: AgentCollectionFilters) => void;
}

const STATUS_OPTIONS: Array<{ value: 'all' | CollectionStatus; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' }
];

export const CollectionFilters: React.FC<CollectionFiltersProps> = ({ filters, onChange }) => {
  const update = (patch: Partial<AgentCollectionFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['today', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => update({ dateType: type })}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[36px] ${
                filters.dateType === type
                  ? 'bg-white shadow-sm text-amber-800 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === 'today' ? 'Today / Daily' : 'Custom Date'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {filters.dateType === 'custom' && (
          <label className="relative flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 min-h-[44px]">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={filters.customDate ? String(filters.customDate).split('T')[0] : ''}
              onChange={(e) => update({ customDate: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            />
          </label>
        )}

        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as AgentCollectionFilters['status'] })}
          className={`rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] ${
            filters.dateType === 'custom' ? '' : 'md:col-span-1'
          }`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="relative flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 min-h-[44px] md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search name, phone, group, ticket..."
            className="w-full bg-transparent text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
};