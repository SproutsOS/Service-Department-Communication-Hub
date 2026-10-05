import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Car, 
  User, 
  Calendar, 
  Clock, 
  Wrench, 
  ShieldCheck, 
  AlertCircle,
  Phone,
  Package,
  FileCheck2,
  Gauge
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StandaloneQuote, ROStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

interface RollToROModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: StandaloneQuote;
  onSuccess?: (roId: string) => void;
}

export const RollToROModal: React.FC<RollToROModalProps> = ({
  isOpen,
  onClose,
  quote,
  onSuccess
}) => {
  const { 
    currentUser, 
    users, 
    convertQuoteToRepairOrder 
  } = useApp();

  const technicians = useMemo(() => users.filter(u => u.role === 'TECHNICIAN'), [users]);
  const advisors = useMemo(() => users.filter(u => (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated), [users]);

  // Form states
  const [inMileage, setInMileage] = useState<string>(
    quote.vehicle.mileage !== undefined && quote.vehicle.mileage !== null ? String(quote.vehicle.mileage) : ''
  );
  const [advisorId, setAdvisorId] = useState<string>(
    quote.advisorId || currentUser.id
  );
  const [techId, setTechId] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<string>('VERBAL_PHONE');
  
  // Promised time default: Tomorrow 5:00 PM
  const [promisedTime, setPromisedTime] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });

  const [initialStatus, setInitialStatus] = useState<ROStatus>('APPROVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPartsCount = quote.lines.reduce((sum, l) => sum + (l.parts?.length || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const selectedAdvisor = advisors.find(a => a.id === advisorId);
      const selectedTech = technicians.find(t => t.id === techId);

      const newRoId = convertQuoteToRepairOrder({
        quoteId: quote.id,
        inMileage: inMileage.trim() ? inMileage.trim() : undefined,
        advisorId: advisorId || currentUser.id,
        advisorName: selectedAdvisor ? selectedAdvisor.name : (quote.advisorName || currentUser.name),
        techId: techId || undefined,
        techName: selectedTech ? selectedTech.name : undefined,
        promisedTime: promisedTime ? new Date(promisedTime).toISOString() : undefined,
        authorizationMethod: authMethod,
        initialStatus
      });

      if (newRoId) {
        onSuccess?.(newRoId);
        onClose();
      } else {
        setErrorMsg('Failed to generate Repair Order. Please verify all details.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error rolling quote to RO:', err);
      setErrorMsg('An unexpected error occurred while rolling quote to Repair Order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Roll Estimate to Repair Order</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  {quote.quoteNumber || `#${quote.id}`}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Convert this quoted estimate into an active, dispatched Repair Order with 1 click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quote Overview Summary Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 text-sm">{quote.customerName}</span>
                <span className="text-slate-500 ml-2">({quote.customerPhone})</span>
              </div>
              <span className="font-mono font-black text-emerald-700 text-sm">
                {formatCurrency(quote.grandTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200">
              <span>
                Vehicle: <strong>{quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}</strong>
              </span>
              <span>
                <strong>{quote.lines.length} Job Line{quote.lines.length === 1 ? '' : 's'}</strong> • <strong>{totalPartsCount} Parts</strong>
              </span>
            </div>
          </div>

          {/* Vehicle In-Mileage & Advisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>Current In-Mileage (Odometer)</span>
              </label>
              <input
                type="number"
                value={inMileage}
                onChange={(e) => setInMileage(e.target.value)}
                placeholder="e.g. 45280"
                className="w-full text-xs font-bold p-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Service Advisor</span>
              </label>
              <select
                value={advisorId}
                onChange={(e) => setAdvisorId(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                {advisors.map(adv => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name} ({adv.title || 'Service Advisor'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Technician Assignment & Promised Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>Assign Technician (Optional)</span>
              </label>
              <select
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Unassigned (Dispatch Queue) --</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} (Tech #{tech.employeeNumber || tech.id.slice(-3)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Promised Completion Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={promisedTime}
                onChange={(e) => setPromisedTime(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Customer Authorization Method */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customer Repair Authorization Method</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className={`p-2.5 rounded-lg border-2 flex items-center gap-2 cursor-pointer transition-colors ${authMethod === 'VERBAL_PHONE' ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                <input
                  type="radio"
                  name="authMethod"
                  value="VERBAL_PHONE"
                  checked={authMethod === 'VERBAL_PHONE'}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  className="text-emerald-600"
                />
                <span>📞 Phone / Verbal Authorization</span>
              </label>

              <label className={`p-2.5 rounded-lg border-2 flex items-center gap-2 cursor-pointer transition-colors ${authMethod === 'COUNTER_SIGNED' ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                <input
                  type="radio"
                  name="authMethod"
                  value="COUNTER_SIGNED"
                  checked={authMethod === 'COUNTER_SIGNED'}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  className="text-emerald-600"
                />
                <span>✍️ Counter / Signed Authorization</span>
              </label>

              <label className={`p-2.5 rounded-lg border-2 flex items-center gap-2 cursor-pointer transition-colors ${authMethod === 'SMS_ONLINE' ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                <input
                  type="radio"
                  name="authMethod"
                  value="SMS_ONLINE"
                  checked={authMethod === 'SMS_ONLINE'}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  className="text-emerald-600"
                />
                <span>📱 Text SMS / Digital Approval</span>
              </label>

              <label className={`p-2.5 rounded-lg border-2 flex items-center gap-2 cursor-pointer transition-colors ${authMethod === 'INSPECTION_FIRST' ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                <input
                  type="radio"
                  name="authMethod"
                  value="INSPECTION_FIRST"
                  checked={authMethod === 'INSPECTION_FIRST'}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  className="text-emerald-600"
                />
                <span>🚗 Check-in Only (Verify First)</span>
              </label>
            </div>
          </div>

          {/* Initial Status Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Board Status for this RO
            </label>
            <select
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as ROStatus)}
              className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="APPROVED">APPROVED — Repairs Authorized (Tech can proceed immediately)</option>
              <option value="PARTS_ORDERED">PARTS ORDERED — Awaiting Supplier Delivery</option>
              <option value="WAITING_DIAGNOSTICS">WAITING DIAGNOSTICS — Vehicle in line for inspection</option>
              <option value="ESTIMATE_DONE">ESTIMATE DONE — Price Quoted, Awaiting Final Drop-off</option>
            </select>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Opening Repair Order...' : 'Confirm & Open Repair Order'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
