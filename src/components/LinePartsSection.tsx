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
  allowAddPart?: boolean;
}

export const LinePartsSection: React.FC<LinePartsSectionProps> = ({
  ro,
  lineNum,
  className = '',
  compact = false,
  allowAddPart = true,
}) => {
  const { currentUser, activeRoleView } = useApp();
  const [editingPartItem, setEditingPartItem] = useState<PartItem | null>(null);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);

  const parts = getLineParts(ro, lineNum);
  const totalPartsCost = parts.reduce((sum, p) => sum + p.subtotal, 0);

  // Only Service Manager and Parts Counter can add or edit parts on lines (Service Advisors cannot add or edit parts)
  const isAdvisor = currentUser.role === 'SERVICE_ADVISOR' || activeRoleView === 'SERVICE_ADVISOR';
  const isManager = currentUser.role === 'SERVICE_MANAGER' || activeRoleView === 'SERVICE_MANAGER';
  const isPartsSpec = currentUser.role === 'PARTS_SPECIALIST' || activeRoleView === 'PARTS_SPECIALIST';
  const canEditParts = allowAddPart && (isManager || isPartsSpec) && !isAdvisor;

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
      {/* Section Header (Matches 16px section labels) */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <label className="text-[16px] font-black text-black uppercase tracking-wider flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black inline-flex items-center justify-center shrink-0">
            4
          </span>
          <Package className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Parts for Line {lineNum} ({parts.length}):</span>
        </label>

        <div className="flex items-center gap-2">
          {parts.length > 0 && (
            <span className="text-[18px] font-mono font-black text-emerald-950 bg-emerald-100 px-3 py-1 rounded-lg border-2 border-emerald-300 shadow-2xs">
              Parts Total: ${totalPartsCost.toFixed(2)}
            </span>
          )}

          {canEditParts && (
            <button
              type="button"
              onClick={() => setIsAddPartOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
              title={`Add part specifically to Line ${lineNum}`}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add Part</span>
            </button>
          )}
        </div>
      </div>

      {/* Parts List */}
      {parts.length === 0 ? (
        canEditParts ? (
          <div className="flex items-center justify-between py-2.5 px-3.5 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-600">
            <span className="italic">No parts required or documented for Line {lineNum} yet</span>
            <button
              type="button"
              onClick={() => setIsAddPartOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Part to Line {lineNum}</span>
            </button>
          </div>
        ) : (
          <div className="text-sm italic text-slate-400 py-1">
            No parts required or documented for Line {lineNum} yet
          </div>
        )
      ) : (
        <div className="space-y-2">
          {parts.map((part) => {
            const etaFormatted = part.estimatedArrival ? formatEtaBadge(part.estimatedArrival) : null;
            return (
              <div
                key={part.id}
                className={`p-3.5 rounded-xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs transition-colors ${
                  part.isQuoteOnly
                    ? 'bg-purple-50/70 border-purple-300 hover:border-purple-400'
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }`}
              >
                {/* Part Name, Part #, Qty, and Price — All 18px font matching Labor Hours */}
                <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
                  {/* Part Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[18px] font-black text-black break-words">
                      {part.name}
                    </span>
                    {part.partNumber && (
                      <span className="font-mono text-[18px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-900 border-2 border-slate-300 shrink-0">
                        #{part.partNumber}
                      </span>
                    )}
                  </div>

                  <span className="text-slate-300 font-bold hidden sm:inline">•</span>

                  {/* Qty */}
                  <span className="text-[18px] font-bold font-mono text-black bg-slate-100 px-3 py-0.5 rounded-md border border-slate-300 shrink-0">
                    Qty: {part.quantity}
                  </span>

                  <span className="text-slate-300 font-bold hidden sm:inline">•</span>

                  {/* Price */}
                  <span className="text-[18px] font-black font-mono text-emerald-950 bg-emerald-100 px-3 py-1 rounded-lg border-2 border-emerald-300 shadow-2xs shrink-0">
                    ${part.price.toFixed(2)}
                    {part.quantity > 1 ? (
                      <span className="text-[18px] font-bold text-emerald-900 ml-1.5">
                        ea (${part.subtotal.toFixed(2)})
                      </span>
                    ) : ''}
                  </span>
                </div>

                {/* Badges: Source, ETA, Status & Edit Button */}
                <div className="flex items-center gap-2 shrink-0 self-start md:self-auto flex-wrap">
                  {/* Part Source Badge */}
                  {part.vendor && (
                    <span 
                      className="text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs"
                      title={`Part Source / Supplier: ${part.vendor}`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>{part.vendor}</span>
                    </span>
                  )}

                  {/* Part ETA Badge */}
                  {etaFormatted && etaFormatted.text && (
                    <span 
                      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border flex items-center gap-1.5 shadow-2xs ${
                        etaFormatted.pastDue 
                          ? 'bg-rose-100 text-rose-900 border-rose-300 font-black' 
                          : etaFormatted.urgent 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                      title={`Estimated Arrival: ${part.estimatedArrival}`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{etaFormatted.text}</span>
                    </span>
                  )}

                  {/* Status / Availability Badge */}
                  <span
                    className={`text-xs font-bold uppercase px-3 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${part.badgeClass}`}
                    title={`Status: ${part.availability}`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{part.availability}</span>
                  </span>

                  {/* Edit Part Button */}
                  {canEditParts && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(part)}
                      className="p-1.5 rounded-md bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                      title="Edit part specifications, price, supplier & ETA"
                    >
                      <Edit3 className="w-4 h-4" />
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
