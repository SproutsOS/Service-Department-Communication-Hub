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
  Plus,
  Check,
  X
} from 'lucide-react';
import { RepairOrder, User as AppUser, ConcernPayType } from '../types';

interface ROLineBreakdownProps {
  ro: RepairOrder;
  users: AppUser[];
  onAssignTech?: (concernIndex: number, techId?: string, techName?: string) => void;
  onUpdatePayType?: (concernIndex: number, payType: ConcernPayType) => void;
  onAddConcern?: (concernText: string, payType: ConcernPayType, techId?: string, techName?: string) => void;
  canEdit?: boolean;
}

export const ROLineBreakdown: React.FC<ROLineBreakdownProps> = ({
  ro,
  users,
  onAssignTech,
  onUpdatePayType,
  onAddConcern,
  canEdit = false
}) => {
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
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Repair Order Line Items & Customer Complaints</span>
          </h4>
          <p className="text-xs text-slate-500">
            Line-by-line itemization of customer concerns, labor assignments, pay types, and diagnostic findings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
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
                      <span className="font-semibold text-slate-700">
                        {assignedTechName}
                        {assignedTechUser?.employeeNumber && (
                          <span className="ml-1 font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            #{assignedTechUser.employeeNumber}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Complaint Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Stated Concern / Request:
                </span>
                <p className="text-xs font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {concernText}
                </p>
              </div>

              {/* Diagnosis Findings (Cause & Correction for this line or RO) */}
              {(ro.cause || ro.correction) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                      Technician Root Cause:
                    </span>
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">
                      {ro.cause || <span className="italic text-slate-400">Not documented yet</span>}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                      Recommended Correction:
                    </span>
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">
                      {ro.correction || <span className="italic text-slate-400">Not documented yet</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
