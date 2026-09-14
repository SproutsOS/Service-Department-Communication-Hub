import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  PhoneCall,
  Voicemail, 
  MessageSquare, 
  User, 
  Mail, 
  Clock, 
  Calendar, 
  Package, 
  Wrench, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { RepairOrder, CustomerContactType, CustomerContactOutcome } from '../types';
import { useApp } from '../context/AppContext';
import { calculateNextContactDate, getContactCadenceStatus } from '../utils/cadenceUtils';
import { STATUS_CONFIG } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatEtaBadge } from '../utils/formatters';

interface CustomerFollowUpModalProps {
  ro: RepairOrder | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({ ro, onClose, onSuccess }) => {
  const { logCustomerContact, currentUser } = useApp();

  const [contactType, setContactType] = useState<CustomerContactType>('PHONE_CALL');
  const [outcome, setOutcome] = useState<CustomerContactOutcome>('SPOKE_WITH_CUSTOMER');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState<string>(() => calculateNextContactDate(new Date(), 3.5));
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ro) return null;

  const currentStatusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
  const cadenceInfo = getContactCadenceStatus(ro);
  const activeParts = ro.parts.filter(p => p.status !== 'ISSUED_TO_TECH');

  // Quick note template choices tailored to automotive customer communication
  const quickTemplates = [
    {
      title: 'Parts ETA Provided',
      text: `Called customer to update on backordered parts. Advised parts are expected to arrive by ${activeParts[0]?.estimatedArrival ? formatEtaBadge(activeParts[0].estimatedArrival).text : 'this week'}. Customer approved wait time.`,
      outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
    },
    {
      title: 'Left Detailed Voicemail',
      text: `Left detailed voicemail with status update on repair order #${ro.id}. Advised vehicle status is ${currentStatusInfo.label} and we will provide the next update in 3 days.`,
      outcome: 'LEFT_VOICEMAIL' as CustomerContactOutcome,
    },
    {
      title: 'Customer Approved Delay',
      text: `Spoke with customer regarding shipping delay on components. Customer understands and authorized holding vehicle in shop until parts arrive.`,
      outcome: 'CUSTOMER_APPROVED_DELAY' as CustomerContactOutcome,
    },
    {
      title: 'Repair In Progress Update',
      text: `Updated customer that parts are in hand and technician is actively working on vehicle in bay. Projected completion on track.`,
      outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
    },
  ];

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(ro.customerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSetCadenceInterval = (days: number) => {
    setNextDueDate(calculateNextContactDate(new Date(), days));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('Please enter a brief conversation summary before logging.');
      return;
    }

    setIsSubmitting(true);
    
    // Parts ETA reference string for audit
    const partsSummary = activeParts.length > 0 
      ? activeParts.map(p => `${p.description} (ETA: ${p.estimatedArrival})`).join(', ')
      : undefined;

    const success = logCustomerContact(ro.id, {
      type: contactType,
      outcome,
      summary: summary.trim(),
      notes: notes.trim() || undefined,
      partsEtaDiscussed: partsSummary,
      promisedDateDiscussed: ro.promisedTime,
      nextScheduledContactDate: nextDueDate,
    });

    if (success) {
      if (onSuccess) {
        onSuccess(`Customer touchpoint logged for ${ro.customerName}. Next call scheduled for ${nextDueDate}.`);
      }
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="customer-followup-modal"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                Twice-Weekly Contact Cadence
              </span>
              <span className="font-bold text-sm text-slate-300">
                #{ro.id}
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black mt-1 text-white tracking-tight flex items-center gap-2">
              <span>Log Customer Follow-Up</span>
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              Keep customer informed on backorders, diagnostics, and shop timeline.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cadence Status Bar */}
        <div className={`px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs border-b ${
          cadenceInfo.isOverdue 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : cadenceInfo.isDueToday
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">{cadenceInfo.label}:</span>
            <span className="text-xs opacity-90">{cadenceInfo.lastContactText}</span>
          </div>
          <span className="font-semibold text-[11px] hidden sm:inline">
            Cadence Rule: 2 calls / week
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {/* Customer Call Card / Direct Dial Action */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{ro.customerName}</h4>
                <span className="text-xs text-slate-500 font-medium">
                  {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                <span className="font-mono font-bold text-slate-800">{ro.customerPhone}</span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  title="Copy phone number"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Call Button */}
            <a
              href={`tel:${ro.customerPhone}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Customer Now</span>
            </a>
          </div>

          {/* Pre-Call Briefing: Parts on Order & Current Job Status */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-2">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Pre-Call Cheat Sheet</span>
              </span>
              <span className="text-[11px] font-medium text-blue-700">
                Advisor: {ro.advisorName} • Tech: {ro.techName || 'Unassigned'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="font-bold text-slate-700 block text-[11px]">Primary Concern:</span>
                <span className="text-slate-600 line-clamp-1">{ro.primaryConcern}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="font-bold text-slate-700 block text-[11px]">Promised Time:</span>
                <span className="text-slate-600 font-semibold">
                  {ro.promisedTime ? formatDateTime(ro.promisedTime) : 'Not specified'}
                </span>
              </div>
            </div>

            {activeParts.length > 0 && (
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-1">
                <span className="font-bold text-slate-700 block text-[11px]">
                  Parts on Order & Current ETAs:
                </span>
                {activeParts.map(part => {
                  const eta = formatEtaBadge(part.estimatedArrival);
                  return (
                    <div key={part.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-800 font-medium truncate pr-2">
                        • {part.description} ({part.vendor})
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        eta.pastDue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        ETA: {eta.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Contact Method Used
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setContactType('PHONE_CALL')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  contactType === 'PHONE_CALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContactType('LEFT_VOICEMAIL');
                  setOutcome('LEFT_VOICEMAIL');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  contactType === 'LEFT_VOICEMAIL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Voicemail className="w-3.5 h-3.5" />
                <span>Voicemail</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContactType('SMS');
                  setOutcome('SENT_SMS_UPDATE');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  contactType === 'SMS'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Text / SMS</span>
              </button>

              <button
                type="button"
                onClick={() => setContactType('IN_PERSON')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  contactType === 'IN_PERSON'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>In-Person</span>
              </button>
            </div>
          </div>

          {/* Outcome Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Call Outcome
            </label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value as CustomerContactOutcome)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="SPOKE_WITH_CUSTOMER">Spoke with Customer (Provided Full Update)</option>
              <option value="LEFT_VOICEMAIL">Left Detailed Voicemail with ETA & Status</option>
              <option value="CUSTOMER_APPROVED_DELAY">Customer Approved Parts Delay / Schedule Extension</option>
              <option value="CUSTOMER_REQUESTED_CALLBACK">Customer Had Questions / Requested Follow-up</option>
              <option value="SENT_SMS_UPDATE">Sent Text / SMS Notification</option>
              <option value="NO_ANSWER">No Answer / Line Busy</option>
            </select>
          </div>

          {/* Quick-Fill Note Templates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Templates</span>
              </label>
              <span className="text-[11px] text-slate-400">Click to insert into notes</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSummary(tpl.text);
                    setOutcome(tpl.outcome);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  + {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Summary / Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Conversation Summary & Customer Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="e.g. Called customer and gave update on backordered alternator ETA arriving Thursday. Customer confirmed okay with delay and requested we call once technician begins installation."
              rows={3}
              required
              className="w-full text-xs font-normal p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Next Touchpoint Cadence Selector */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Next Scheduled Call Date</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Twice-a-week cadence recommends contacting every 3 to 4 days.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetCadenceInterval(3.5)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
                  title="Schedule 3-4 days ahead"
                >
                  +3 Days (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCadenceInterval(2)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  +2 Days
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={nextDueDate}
                onChange={e => setNextDueDate(e.target.value)}
                required
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">
                (Advisor queue will flag call on this date)
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !summary.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Reset Cadence Timer</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
