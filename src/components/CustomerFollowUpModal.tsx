import React, { useState } from 'react';
import { 
  X, 
  Phone, 
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
import { calculateNextContactDate, getContactCadenceStatus, isROCompleted, getPostRepairFollowUpStatus } from '../utils/cadenceUtils';
import { STATUS_CONFIG } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatEtaBadge } from '../utils/formatters';

interface CustomerFollowUpModalProps {
  ro: RepairOrder | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({ ro, onClose, onSuccess }) => {
  const { logCustomerContact, currentUser, users, updateROStatus } = useApp();

  const isCompletedOrder = Boolean(ro && isROCompleted(ro));
  const postRepairInfo = ro ? getPostRepairFollowUpStatus(ro) : null;

  const isEstimateApprovalState = Boolean(ro && !isCompletedOrder && (ro.status === 'WAITING_FOR_APPROVAL' || ro.quote?.status === 'SUBMITTED'));
  const [approvalDecision, setApprovalDecision] = useState<'NONE' | 'APPROVED' | 'PENDING' | 'DENIED'>(
    isEstimateApprovalState ? 'PENDING' : 'NONE'
  );

  const [contactType, setContactType] = useState<CustomerContactType>('PHONE_CALL');
  const [outcome, setOutcome] = useState<CustomerContactOutcome>(
    isCompletedOrder ? 'POST_REPAIR_SATISFIED' : 'SPOKE_WITH_CUSTOMER'
  );
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
    ...(isCompletedOrder ? [
      {
        title: '⭐ 100% Satisfied - No Concerns',
        text: `Conducted 3-day follow up. Customer confirmed vehicle is running excellently, repair was completely satisfactory, and customer has zero remaining concerns.`,
        outcome: 'POST_REPAIR_SATISFIED' as CustomerContactOutcome,
        decision: 'NONE' as const,
      },
      {
        title: '⚠️ Customer Has Question / Concern',
        text: `Conducted 3-day follow up. Customer reported a question/concern regarding [...]. Advisor addressed customer and scheduled follow-up inspection.`,
        outcome: 'POST_REPAIR_HAS_CONCERNS' as CustomerContactOutcome,
        decision: 'NONE' as const,
      },
      {
        title: '📞 Left 3-Day Voicemail',
        text: `Left detailed voicemail checking in for 3-day follow up on vehicle operation and customer satisfaction for RO #${ro.id}. Reminded customer to call us back with any concerns.`,
        outcome: 'LEFT_VOICEMAIL' as CustomerContactOutcome,
        decision: 'NONE' as const,
      },
      {
        title: '💬 Sent 3-Day Courtesy Text',
        text: `Sent SMS checking in for 3-day follow up to verify vehicle is running well and ensure customer has no lingering questions or concerns.`,
        outcome: 'SENT_SMS_UPDATE' as CustomerContactOutcome,
        decision: 'NONE' as const,
      },
    ] : []),
    ...(isEstimateApprovalState ? [
      {
        title: 'Customer Approved Estimate',
        text: `Spoke with customer regarding repair estimate totaling $${Number(ro.quote?.grandTotal || 0).toFixed(2)}. Customer authorized all recommended repairs via telephone confirmation.`,
        outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
        decision: 'APPROVED' as const,
      },
      {
        title: 'Left Voicemail w/ Estimate',
        text: `Left detailed voicemail with quote total of $${Number(ro.quote?.grandTotal || 0).toFixed(2)} and breakdown of labor/parts. Awaiting customer return call for repair authorization.`,
        outcome: 'LEFT_VOICEMAIL' as CustomerContactOutcome,
        decision: 'PENDING' as const,
      },
      {
        title: 'Customer Declined Estimate',
        text: `Presented repair estimate totaling $${Number(ro.quote?.grandTotal || 0).toFixed(2)}. Customer declined authorization at this time.`,
        outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
        decision: 'DENIED' as const,
      },
    ] : []),
    {
      title: 'Parts ETA Provided',
      text: `Called customer to update on backordered parts. Advised parts are expected to arrive by ${activeParts[0]?.estimatedArrival ? formatEtaBadge(activeParts[0].estimatedArrival).text : 'this week'}. Customer approved wait time.`,
      outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
      decision: 'NONE' as const,
    },
    {
      title: 'Left Detailed Voicemail',
      text: `Left detailed voicemail with status update on repair order #${ro.id}. Advised vehicle status is ${currentStatusInfo.label} and we will provide the next update in 3 days.`,
      outcome: 'LEFT_VOICEMAIL' as CustomerContactOutcome,
      decision: 'NONE' as const,
    },
    {
      title: 'Customer Approved Delay',
      text: `Spoke with customer regarding shipping delay on components. Customer understands and authorized holding vehicle in shop until parts arrive.`,
      outcome: 'CUSTOMER_APPROVED_DELAY' as CustomerContactOutcome,
      decision: 'NONE' as const,
    },
    {
      title: 'Repair In Progress Update',
      text: `Updated customer that parts are in hand and technician is actively working on vehicle in bay. Projected completion on track.`,
      outcome: 'SPOKE_WITH_CUSTOMER' as CustomerContactOutcome,
      decision: 'NONE' as const,
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
      nextScheduledContactDate: (isCompletedOrder && outcome !== 'POST_REPAIR_HAS_CONCERNS' && outcome !== 'CUSTOMER_REQUESTED_CALLBACK') ? undefined : nextDueDate,
      isPostRepairFollowUp: isCompletedOrder,
      postRepairOutcome: outcome === 'POST_REPAIR_HAS_CONCERNS' 
        ? 'HAS_NEW_CONCERNS' 
        : outcome === 'LEFT_VOICEMAIL' 
        ? 'LEFT_VOICEMAIL' 
        : outcome === 'CUSTOMER_REQUESTED_CALLBACK'
        ? 'CUSTOMER_CALLBACK_REQUESTED'
        : 'SATISFIED_NO_CONCERNS',
    });

    if (success) {
      if (approvalDecision === 'APPROVED') {
        updateROStatus(ro.id, 'APPROVED', `Customer authorized repair estimate via phone confirmation: ${summary.trim()}`);
      } else if (approvalDecision === 'DENIED') {
        updateROStatus(ro.id, 'DENIED', `Customer declined repair estimate: ${summary.trim()}`);
      }

      if (onSuccess) {
        if (isCompletedOrder) {
          if (outcome === 'POST_REPAIR_HAS_CONCERNS') {
            onSuccess(`3-Day Follow Up logged: Customer concern documented for RO #${ro.id}.`);
          } else {
            onSuccess(`3-Day Follow Up logged for ${ro.customerName}! Verified vehicle running smoothly & zero concerns.`);
          }
        } else if (approvalDecision === 'APPROVED') {
          onSuccess(`Customer call logged & Repair Order #${ro.id} APPROVED! Advancing to parts/bay repair.`);
        } else if (approvalDecision === 'DENIED') {
          onSuccess(`Customer call logged & estimate declined for RO #${ro.id}.`);
        } else {
          onSuccess(`Customer touchpoint logged for ${ro.customerName}. Next call scheduled for ${nextDueDate}.`);
        }
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
              {isCompletedOrder ? (
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  3-Day Follow Up
                </span>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                  Twice-Weekly Contact Cadence
                </span>
              )}
              <span className="font-bold text-sm text-slate-300">
                #{ro.id}
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black mt-1 text-white tracking-tight flex items-center gap-2">
              <span>{isCompletedOrder ? '3-Day Follow Up' : 'Log Customer Follow-Up'}</span>
            </h3>

            <p className="text-xs text-slate-300 mt-0.5">
              {isCompletedOrder
                ? 'Check on customer satisfaction 3 days after repair: Ensure vehicle is operating properly and customer has no concerns.'
                : 'Keep customer informed on backorders, diagnostics, and shop timeline.'}
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
        {isCompletedOrder && postRepairInfo ? (
          <div className={`px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs border-b ${postRepairInfo.badgeClass}`}>
            <div className="flex items-center gap-2">
              <span className="font-bold">{postRepairInfo.label}</span>
              <span className="text-xs opacity-90">• Completed {postRepairInfo.completedDateFormatted} ({postRepairInfo.daysSinceCompleted}d ago)</span>
            </div>
            <span className="font-semibold text-[11px] hidden sm:inline">
              Shop Policy: 3-Day Follow Up
            </span>
          </div>
        ) : (
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
        )}

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
          </div>

          {/* Pre-Call Briefing: Repaired Work or Parts on Order */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-2">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>{isCompletedOrder ? 'Repairs Performed Cheat Sheet' : 'Pre-Call Cheat Sheet'}</span>
              </span>
              <span className="text-[11px] font-medium text-blue-700 flex items-center gap-1.5 flex-wrap">
                <span>Advisor: {ro.advisorName}</span>
                {(() => {
                  const adv = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
                  return adv?.employeeNumber ? (
                    <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      {adv.employeeNumber}
                    </span>
                  ) : null;
                })()}
                <span>• Tech: {ro.techName || 'Unassigned'}</span>
                {ro.techName && (() => {
                  const tch = users.find(u => u.id === ro.techId || u.name === ro.techName);
                  return tch?.employeeNumber ? (
                    <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      {tch.employeeNumber}
                    </span>
                  ) : null;
                })()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="font-bold text-slate-700 block text-[11px]">
                  Original Complaints / Concerns:
                </span>
                <span className="text-slate-600 line-clamp-2">
                  {ro.concerns && ro.concerns.length > 1
                    ? ro.concerns.map((c, idx) => `${idx + 1}. ${c}`).join(' • ')
                    : ro.primaryConcern}
                </span>
              </div>

              {isCompletedOrder ? (
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="font-bold text-slate-700 block text-[11px]">Cause & Correction Performed:</span>
                  <span className="text-slate-700 font-semibold line-clamp-2">
                    {ro.correction || ro.cause || 'Completed inspection and repairs as authorized.'}
                  </span>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="font-bold text-slate-700 block text-[11px]">Promised Time:</span>
                  <span className="text-slate-600 font-semibold">
                    {ro.promisedTime ? formatDateTime(ro.promisedTime) : 'Not specified'}
                  </span>
                </div>
              )}
            </div>

            {!isCompletedOrder && activeParts.length > 0 && (
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
              {isCompletedOrder ? (
                <>
                  <option value="POST_REPAIR_SATISFIED">⭐ Spoke with Customer - Satisfied / Zero Concerns</option>
                  <option value="POST_REPAIR_HAS_CONCERNS">⚠️ Spoke with Customer - Customer Has New Concerns / Questions</option>
                  <option value="LEFT_VOICEMAIL">📞 Left Detailed 3-Day Follow-Up Voicemail</option>
                  <option value="CUSTOMER_REQUESTED_CALLBACK">🔄 Customer Requested Callback</option>
                  <option value="SENT_SMS_UPDATE">💬 Sent Text / SMS Courtesy Quality Check</option>
                  <option value="NO_ANSWER">❌ No Answer / Line Busy</option>
                </>
              ) : (
                <>
                  <option value="SPOKE_WITH_CUSTOMER">Spoke with Customer (Provided Full Update)</option>
                  <option value="LEFT_VOICEMAIL">Left Detailed Voicemail with ETA & Status</option>
                  <option value="CUSTOMER_APPROVED_DELAY">Customer Approved Parts Delay / Schedule Extension</option>
                  <option value="CUSTOMER_REQUESTED_CALLBACK">Customer Had Questions / Requested Follow-up</option>
                  <option value="SENT_SMS_UPDATE">Sent Text / SMS Notification</option>
                  <option value="NO_ANSWER">No Answer / Line Busy</option>
                </>
              )}
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
                    if (tpl.decision && tpl.decision !== 'NONE') {
                      setApprovalDecision(tpl.decision);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  + {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Estimate Authorization Decision for Step 5 */}
          {isEstimateApprovalState && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Estimate Authorization Decision (${Number(ro.quote?.grandTotal || 0).toFixed(2)})</span>
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  approvalDecision === 'APPROVED' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : approvalDecision === 'DENIED'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {approvalDecision === 'APPROVED' ? 'Transitions RO to Approved' : approvalDecision === 'DENIED' ? 'Transitions RO to Declined' : 'Keeps in Approval Queue'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalDecision('APPROVED')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    approvalDecision === 'APPROVED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Customer Approved</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalDecision('PENDING')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    approvalDecision === 'PENDING'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Awaiting Return Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalDecision('DENIED')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    approvalDecision === 'DENIED'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Customer Declined</span>
                </button>
              </div>
            </div>
          )}

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
          {isCompletedOrder ? (
            <div className={`p-3 rounded-xl border ${
              outcome === 'POST_REPAIR_HAS_CONCERNS' || outcome === 'CUSTOMER_REQUESTED_CALLBACK'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              {outcome === 'POST_REPAIR_HAS_CONCERNS' || outcome === 'CUSTOMER_REQUESTED_CALLBACK' ? (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-600" />
                        <span>Schedule Concern Follow-Up / Re-Inspection Date</span>
                      </label>
                      <p className="text-[11px] text-rose-700">
                        Customer reported an issue. Set target date to follow back up or review with shop foreman.
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={e => setNextDueDate(e.target.value)}
                      required
                      className="text-xs font-semibold px-3 py-1.5 bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                    <span className="text-xs text-rose-700 font-medium">
                      (Call log reminder will alert on this date)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">3-Day Follow Up Requirement Complete</p>
                    <p className="text-emerald-700 text-[11px]">
                      Customer is satisfied and has zero concerns. No further cadence calls needed for this repair order.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}

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
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                isCompletedOrder
                  ? outcome === 'POST_REPAIR_HAS_CONCERNS'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isCompletedOrder
                  ? outcome === 'POST_REPAIR_HAS_CONCERNS'
                    ? 'Log Follow-Up & Flag Concern'
                    : 'Complete 3-Day Quality Check'
                  : 'Save & Reset Timer'}
              </span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
