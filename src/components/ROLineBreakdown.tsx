import React, { useState } from 'react';
import { 
  FileText, 
  Wrench, 
  DollarSign, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  ShieldCheck, 
  Building2, 
  Receipt,
  Calculator,
  Plus,
  Check,
  X
} from 'lucide-react';
import { RepairOrder, User as AppUser, ConcernPayType } from '../types';
import { cleanRO3700 } from '../utils/formatters';

interface ROLineBreakdownProps {
  ro: RepairOrder;
  users: AppUser[];
  onAssignTech?: (concernIndex: number, techId?: string, techName?: string) => void;
  onUpdatePayType?: (concernIndex: number, payType: ConcernPayType) => void;
  onAddConcern?: (concernText: string, payType: ConcernPayType, techId?: string, techName?: string) => void;
  onOpenQuote?: (roId: string) => void;
  canEdit?: boolean;
}

export const ROLineBreakdown: React.FC<ROLineBreakdownProps> = ({
  ro: rawRO,
  users,
  onAssignTech,
  onUpdatePayType,
  onAddConcern,
  onOpenQuote,
  canEdit = false
}) => {
  const ro = cleanRO3700(rawRO);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newConcernText, setNewConcernText] = useState('');
  const [newPayType, setNewPayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [newTechId, setNewTechId] = useState<string>(ro.techId || '');

  const concerns = ro.concerns && ro.concerns.length > 0 
    ? ro.concerns 
    : [ro.primaryConcern || 'General Inspection'];

  const technicians = users.filter(u => u.role === 'TECHNICIAN' && !u.isDeactivated);

  const handleAddNewConcernSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcernText.trim()) return;

    const chosenTech = technicians.find(t => t.id === newTechId);
    if (onAddConcern) {
      onAddConcern(newConcernText.trim(), newPayType, chosenTech?.id, chosenTech?.name);
    }
    setNewConcernText('');
    setNewPayType('CUSTOMER_PAY');
    setIsAddingLine(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Repair Order Line Items & Customer Complaints</span>
          </h4>
          <p className="text-xs text-slate-700 font-semibold">
            Line-by-line itemization of customer concerns, labor assignments, pay types, and diagnostic findings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
            {concerns.length} Line Item{concerns.length === 1 ? '' : 's'}
          </span>
          {canEdit && onAddConcern && (
            <button
              type="button"
              onClick={() => setIsAddingLine(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Complaint</span>
            </button>
          )}
        </div>
      </div>

      {/* Add New Complaint Form (When active) */}
      {isAddingLine && (
        <form 
          onSubmit={handleAddNewConcernSubmit}
          className="bg-blue-50/60 rounded-xl border-2 border-blue-300 p-4 space-y-3 shadow-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Add Customer Complaint (Line {concerns.length + 1})</span>
            </h5>
            <button
              type="button"
              onClick={() => setIsAddingLine(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer Concern Description *
            </label>
            <textarea
              required
              rows={2}
              value={newConcernText}
              onChange={e => setNewConcernText(e.target.value)}
              placeholder="e.g. Customer states squeaking noise from front brakes when decelerating below 25 mph..."
              className="w-full text-xs font-medium p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pay Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Line Pay Type
              </label>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setNewPayType('CUSTOMER_PAY')}
                  className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    newPayType === 'CUSTOMER_PAY'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer Pay
                </button>
                <button
                  type="button"
                  onClick={() => setNewPayType('WARRANTY')}
                  className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    newPayType === 'WARRANTY'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Warranty
                </button>
                <button
                  type="button"
                  onClick={() => setNewPayType('INTERNAL')}
                  className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    newPayType === 'INTERNAL'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Internal
                </button>
              </div>
            </div>

            {/* Assigned Tech */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assign Technician to this Line
              </label>
              <select
                value={newTechId}
                onChange={e => setNewTechId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">{ro.techName ? `Default Primary: ${ro.techName}` : 'Unassigned (Assign Later)'}</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.employeeNumber ? ` (#${t.employeeNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
            <button
              type="button"
              onClick={() => setIsAddingLine(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newConcernText.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Add Complaint Line</span>
            </button>
          </div>
        </form>
      )}

      {/* Itemized Line Rows */}
      <div className="space-y-3">
        {concerns.map((concernText, idx) => {
          const lineNum = idx + 1;
          const payType: ConcernPayType = ro.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
          const assignedTechId = ro.concernTechIds?.[idx] || ro.techId;
          const assignedTechName = ro.concernTechNames?.[idx] || (assignedTechId ? users.find(u => u.id === assignedTechId)?.name : ro.techName) || 'Unassigned';
          const assignedTechUser = users.find(u => u.id === assignedTechId || u.name === assignedTechName);

          return (
            <div 
              key={idx}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-4 space-y-3"
            >
              {/* Header: Line Number, Pay Type, Assigned Tech */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white shadow-2xs">
                    Line {lineNum}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Primary Concern
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Pay Type Badge / Selector */}
                  <div className="flex items-center gap-1.5">
                    {canEdit && onUpdatePayType ? (
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() => onUpdatePayType(idx, 'CUSTOMER_PAY')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            payType === 'CUSTOMER_PAY' 
                              ? 'bg-blue-600 text-white shadow-2xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Customer Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePayType(idx, 'WARRANTY')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            payType === 'WARRANTY' 
                              ? 'bg-amber-500 text-white shadow-2xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Warranty
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePayType(idx, 'INTERNAL')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            payType === 'INTERNAL' 
                              ? 'bg-purple-600 text-white shadow-2xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Internal
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        payType === 'WARRANTY'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : payType === 'INTERNAL'
                          ? 'bg-purple-50 text-purple-900 border-purple-300'
                          : 'bg-blue-50 text-blue-900 border-blue-300'
                      }`}>
                        {payType === 'WARRANTY' ? <ShieldCheck className="w-3 h-3 text-amber-600" /> : payType === 'INTERNAL' ? <Building2 className="w-3 h-3 text-purple-600" /> : <Receipt className="w-3 h-3 text-blue-600" />}
                        <span>{payType === 'CUSTOMER_PAY' ? 'Customer Pay' : payType === 'WARRANTY' ? 'Warranty' : 'Internal'}</span>
                      </span>
                    )}
                  </div>

                  {/* Assigned Tech */}
                  <div className="flex items-center gap-1 text-xs">
                    <Wrench className="w-3.5 h-3.5 text-slate-500" />
                    {canEdit && onAssignTech ? (
                      <select
                        value={assignedTechId || ''}
                        onChange={e => {
                          const chosenTech = technicians.find(t => t.id === e.target.value);
                          onAssignTech(idx, chosenTech?.id, chosenTech?.name);
                        }}
                        className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">{ro.techName ? `(Primary: ${ro.techName})` : 'Unassigned'}</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}{tech.employeeNumber ? ` #${tech.employeeNumber}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-slate-900">
                        {assignedTechName}
                        {assignedTechUser?.employeeNumber && (
                          <span className="ml-1 font-mono text-[10px] font-black px-1 py-0.2 rounded bg-slate-200 text-slate-900 border border-slate-300">
                            #{assignedTechUser.employeeNumber}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Customer Stated Complaint */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black inline-flex items-center justify-center">1</span>
                  <span>Complaint (Customer Stated Symptom):</span>
                </span>
                <p className="text-xs font-bold text-slate-950 whitespace-pre-wrap leading-relaxed pl-5.5">
                  {concernText}
                </p>
              </div>

              {/* 2. Cause (Technician Diagnostic Findings) */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black inline-flex items-center justify-center">2</span>
                  <span>Cause (Diagnostic Finding):</span>
                </span>
                <p className="text-xs font-semibold text-slate-900 pl-5.5 font-mono">
                  {ro.concernCauses?.[idx] || (idx === 0 ? ro.cause : '') || <span className="italic text-slate-400 font-sans font-normal">Pending diagnosis</span>}
                </p>
              </div>

              {/* 3. Correction (Repair Procedure / Action Taken) */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black inline-flex items-center justify-center">3</span>
                  <span>Correction (Repair Procedure / Action Taken):</span>
                </span>
                <p className="text-xs font-semibold text-slate-900 pl-5.5 font-mono">
                  {ro.concernCorrections?.[idx] || (idx === 0 ? ro.correction : '') || <span className="italic text-slate-400 font-sans font-normal">Pending technician repair</span>}
                </p>
              </div>

              {/* 4. Line Quote Breakdown & Total */}
              {(() => {
                const lineLaborItems = (ro.quote?.laborItems || []).filter(item => (item.roLineNumber || 1) === lineNum);
                const linePartsItems = (ro.quote?.partsItems || []).filter(p => (p.roLineNumber || 1) === lineNum);
                const lineROParts = (ro.parts || []).filter(p => (p.roLineNumber || 1) === lineNum);

                const lineLaborHours = lineLaborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0);
                const lineLaborCost = lineLaborItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
                const lineQuotePartsCost = linePartsItems.reduce((acc, item) => acc + (Number(item.subtotal) || (Number(item.unitPrice || 0) * Number(item.quantity || 1))), 0);
                const lineROPartsCost = lineROParts.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
                const linePartsCost = linePartsItems.length > 0 ? lineQuotePartsCost : lineROPartsCost;
                const linePartsCount = linePartsItems.length > 0 ? linePartsItems.length : lineROParts.length;
                const lineTotal = lineLaborCost + linePartsCost;
                const hasLineQuote = lineLaborItems.length > 0 || linePartsItems.length > 0 || lineROParts.length > 0;

                return (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Line {lineNum} Quote:</span>
                      {hasLineQuote ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-200">
                            Labor: {lineLaborHours.toFixed(1)} hrs (${lineLaborCost.toFixed(2)})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-200">
                            Parts ({linePartsCount}): ${linePartsCost.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="italic text-slate-500 text-[11px]">Estimate pending</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      <span className="text-xs font-black font-mono text-indigo-950 bg-white px-2.5 py-1 rounded-md border border-indigo-300 shadow-2xs">
                        Line {lineNum} Total: ${lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Quote Total Summary Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            <div>
              <h5 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                Repair Order Quote Total (By Line & Totaled)
              </h5>
              <span className="text-[11px] text-slate-300">
                Itemized totals across all {concerns.length} concern line{concerns.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {onOpenQuote && (
            <button
              type="button"
              onClick={() => onOpenQuote(ro.id)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{ro.quote ? 'Open & Edit Full Quote' : '+ Initiate Repair Quote'}</span>
            </button>
          )}
        </div>

        {/* Line-by-line itemized totals summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {concerns.map((_, i) => {
            const lNum = i + 1;
            const lLabor = (ro.quote?.laborItems || []).filter(item => (item.roLineNumber || 1) === lNum).reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
            const lQuoteParts = (ro.quote?.partsItems || []).filter(p => (p.roLineNumber || 1) === lNum).reduce((acc, p) => acc + (Number(p.subtotal) || (Number(p.unitPrice || 0) * Number(p.quantity || 1))), 0);
            const lROParts = (ro.parts || []).filter(p => (p.roLineNumber || 1) === lNum).reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.quantity || 1)), 0);
            const lParts = lQuoteParts > 0 ? lQuoteParts : lROParts;
            const lTotal = lLabor + lParts;

            return (
              <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-[11px]">Line {lNum}:</span>
                <span className="font-mono font-bold text-white">${lTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Grand Total Breakdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center gap-4 text-slate-300 flex-wrap">
            <span>Total Labor: <strong className="font-mono text-white">${(ro.quote?.totalLaborCost || 0).toFixed(2)}</strong></span>
            <span>Total Parts: <strong className="font-mono text-white">${(ro.quote?.totalPartsCost || 0).toFixed(2)}</strong></span>
            {(ro.quote?.shopSuppliesFee || 0) > 0 && (
              <span>Shop Supplies: <strong className="font-mono text-white">${(ro.quote?.shopSuppliesFee || 0).toFixed(2)}</strong></span>
            )}
            {(ro.quote?.taxAmount || 0) > 0 && (
              <span>Sales Tax: <strong className="font-mono text-white">${(ro.quote?.taxAmount || 0).toFixed(2)}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">Grand Total:</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
              ${(ro.quote?.grandTotal || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
