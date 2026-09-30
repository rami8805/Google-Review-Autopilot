import React from 'react';
import type { RiskLevel } from '../../shared/types/domain';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';

export const RiskBadge: React.FC<{ riskLevel: RiskLevel; flags?: string[] }> = ({ riskLevel, flags }) => {
  switch (riskLevel) {
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Low Risk
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Medium Risk
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
          <ShieldAlert className="w-3 h-3 text-orange-600" />
          High Risk {flags && flags.length > 0 && `(${flags.length} flags)`}
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          <ShieldX className="w-3 h-3 text-rose-600" />
          Critical Risk
        </span>
      );
  }
};
