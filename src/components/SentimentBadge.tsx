import React from 'react';
import { Smile, Meh, Frown } from 'lucide-react';
import type { ReviewSentiment } from '../services/apiClient';

interface SentimentBadgeProps {
  sentiment: ReviewSentiment;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({ sentiment }) => {
  if (sentiment.label === 'POSITIVE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Smile className="w-3 h-3 text-emerald-600" />
        <span>Positive</span>
      </span>
    );
  }

  if (sentiment.label === 'NEUTRAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Meh className="w-3 h-3 text-slate-500" />
        <span>Neutral</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      <Frown className="w-3 h-3 text-rose-600" />
      <span>Negative</span>
    </span>
  );
};
