import React from 'react';
import { Package, Tag, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { RepairOrder } from '../types';
import { getLineParts, IntegratedLinePart } from '../utils/lineParts';

interface LinePartsSectionProps {
  ro: RepairOrder;
  lineNum: number;
  className?: string;
  compact?: boolean;
}

export const LinePartsSection: React.FC<LinePartsSectionProps> = ({
  ro,
  lineNum,
  className = '',
  compact = false,
}) => {
  const parts = getLineParts(ro, lineNum);
  const totalPartsCost = parts.reduce((sum, p) => sum + p.subtotal, 0);

  return (
    <div className={`space-y-2 pt-2 border-t border-slate-100 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black inline-flex items-center justify-center shrink-0">
            4
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Line {lineNum} Parts ({parts.length}):</span>
          </span>
        </span>

        {parts.length > 0 && (
          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Parts Total: <strong className="text-emerald-700">${totalPartsCost.toFixed(2)}</strong>
          </span>
        )}
      </div>

      {/* Parts List */}
      {parts.length === 0 ? (
        <div className="pl-5.5 text-xs italic text-slate-400">
          No parts required or documented for Line {lineNum} yet
        </div>
      ) : (
        <div className="pl-2 sm:pl-5.5 space-y-1.5">
          {parts.map((part) => (
            <div
              key={part.id}
              className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-colors ${
                part.isQuoteOnly
                  ? 'bg-purple-50/60 border-purple-200 hover:border-purple-300'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Part Name, Part #, Qty, and Price */}
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                {/* Part Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-extrabold text-slate-900 break-words">
                    {part.name}
                  </span>
                  {part.partNumber && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300 shrink-0">
                      #{part.partNumber}
                    </span>
                  )}
                </div>

                <span className="text-slate-300">•</span>

                {/* Qty */}
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  Qty: {part.quantity}
                </span>

                <span className="text-slate-300">•</span>

                {/* Price */}
                <span className="text-[11px] font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  ${part.price.toFixed(2)}
                  {part.quantity > 1 ? (
                    <span className="text-[10px] font-normal text-emerald-700 ml-1">
                      ea (${part.subtotal.toFixed(2)})
                    </span>
                  ) : ''}
                </span>
              </div>

              {/* Badges: Quote Only and Availability */}
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                {/* Quote Only Badge */}
                {part.isQuoteOnly && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-purple-100 text-purple-900 border-purple-300 shadow-2xs flex items-center gap-1">
                    <span>💬</span>
                    <span>QUOTE ONLY</span>
                  </span>
                )}

                {/* Availability Badge */}
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${part.badgeClass}`}
                  title={`Availability Status: ${part.availability}`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>{part.availability}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
