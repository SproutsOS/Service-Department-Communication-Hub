import React, { useState } from 'react';
import { Package, Tag, Clock, CheckCircle2, AlertCircle, Building2, Truck, Edit3, Plus } from 'lucide-react';
import { RepairOrder, PartItem } from '../types';
import { getLineParts, IntegratedLinePart } from '../utils/lineParts';
import { formatEtaBadge } from '../utils/formatters';
import { EditPartModal } from './EditPartModal';
import { useApp } from '../context/AppContext';

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
  const { currentUser, activeRoleView } = useApp();
  const [editingPartItem, setEditingPartItem] = useState<PartItem | null>(null);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);

  const parts = getLineParts(ro, lineNum);
  const totalPartsCost = parts.reduce((sum, p) => sum + p.subtotal, 0);

  const canEditParts = currentUser.role === 'SERVICE_MANAGER' || 
                       currentUser.role === 'PARTS_SPECIALIST' || 
                       currentUser.role === 'SERVICE_ADVISOR' ||
                       activeRoleView === 'SERVICE_MANAGER' ||
                       activeRoleView === 'PARTS_SPECIALIST' ||
                       activeRoleView === 'SERVICE_ADVISOR';

  const handleOpenEdit = (part: IntegratedLinePart) => {
    const rawPart = (ro.parts || []).find(p => p.id === part.id) || {
      id: part.id,
      roId: ro.id,
      partNumber: part.partNumber || '',
      description: part.name,
      name: part.name,
      quantity: part.quantity || 1,
      status: part.status as any,
      price: part.price,
      vendor: part.vendor || 'STELLANTIS',
      estimatedArrival: part.estimatedArrival || 'Pending ETA',
      roLineNumber: lineNum,
      requestType: part.isQuoteOnly ? 'QUOTE_ONLY' : 'ORDER_NOW'
    };
    setEditingPartItem(rawPart as PartItem);
  };

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

        <div className="flex items-center gap-2">
          {parts.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Parts Total: <strong className="text-emerald-700">${totalPartsCost.toFixed(2)}</strong>
            </span>
          )}

          {canEditParts && (
            <button
              type="button"
              onClick={() => setIsAddPartOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer shadow-2xs transition-colors"
              title={`Add part specifically to Line ${lineNum}`}
            >
              <Plus className="w-3 h-3 text-blue-600" />
              <span>+ Add Part</span>
            </button>
          )}
        </div>
      </div>

      {/* Parts List */}
      {parts.length === 0 ? (
        <div className="pl-5.5 text-xs italic text-slate-400">
          No parts required or documented for Line {lineNum} yet
        </div>
      ) : (
        <div className="pl-2 sm:pl-5.5 space-y-1.5">
          {parts.map((part) => {
            const etaFormatted = part.estimatedArrival ? formatEtaBadge(part.estimatedArrival) : null;
            return (
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

                {/* Badges: Source, ETA, Status & Edit Button */}
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                  {/* Part Source Badge */}
                  {part.vendor && (
                    <span 
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1 shadow-2xs"
                      title={`Part Source / Supplier: ${part.vendor}`}
                    >
                      <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
                      <span>{part.vendor}</span>
                    </span>
                  )}

                  {/* Part ETA Badge */}
                  {etaFormatted && etaFormatted.text && (
                    <span 
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 shadow-2xs ${
                        etaFormatted.pastDue 
                          ? 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold' 
                          : etaFormatted.urgent 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                      title={`Estimated Arrival: ${part.estimatedArrival}`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{etaFormatted.text}</span>
                    </span>
                  )}

                  {/* Status / Availability Badge */}
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${part.badgeClass}`}
                    title={`Status: ${part.availability}`}
                  >
                    <Package className="w-3 h-3" />
                    <span>{part.availability}</span>
                  </span>

                  {/* Edit Part Button */}
                  {canEditParts && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(part)}
                      className="p-1 rounded bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                      title="Edit part specifications, price, supplier & ETA"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Part Modal */}
      {editingPartItem && (
        <EditPartModal
          isOpen={true}
          onClose={() => setEditingPartItem(null)}
          part={editingPartItem}
          roId={ro.id}
          initialLineNumber={lineNum}
        />
      )}

      {/* Add Part to this Line Modal */}
      {isAddPartOpen && (
        <EditPartModal
          isOpen={true}
          onClose={() => setIsAddPartOpen(false)}
          roId={ro.id}
          initialLineNumber={lineNum}
        />
      )}
    </div>
  );
};
