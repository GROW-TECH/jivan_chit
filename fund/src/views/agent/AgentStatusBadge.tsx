import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { CollectionStatus } from '../../types/agent';

interface AgentStatusBadgeProps {
  status: CollectionStatus;
}

const CONFIG: Record<CollectionStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  paid: {
    label: 'Paid',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3 h-3" />
  },
  overdue: {
    label: 'Overdue',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <AlertCircle className="w-3 h-3" />
  }
};

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ status }) => {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.classes}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};