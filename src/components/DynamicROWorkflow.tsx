import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  Truck, 
  PhoneCall, 
  Check, 
  ExternalLink, 
  UserCheck, 
  AlertCircle, 
  ArrowRight, 
  Play, 
  CheckCheck, 
  User,
  Phone,
  FileText,
  Pencil,
  Plus,
  Receipt,
  X
} from 'lucide-react';
import { RepairOrder, ROStatus, User as AppUser, ConcernPayType, CustomerContactOutcome } from '../types';
import { formatTimeOnly, formatDurationSince, formatRelativeTime, cleanRO3700 } from '../utils/formatters';
import { getContactCadenceStatus, formatContactOutcome } from '../utils/cadenceUtils';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { TicketFlowStepper } from './TicketFlowStepper';

export type NextActionId = 
  | 'ASSIGN_TECH'
  | 'WAITING_DIAGNOSIS'
  | 'DIAGNOSIS_NOTES'
  | 'RECOMMENDATIONS_REVIEW'
  | 'BUILD_QUOTE'
  | 'CUSTOMER_APPROVAL'
  | 'PARTS_ORDERING'
  | 'ACTIVE_REPAIR'
  | 'REPAIR_COMPLETE'
  | 'READY_FOR_PICKUP'
  | 'CLOSE_TICKET'
  | 'FOLLOWUP_CADENCE'
  | 'NONE';

interface DynamicROWorkflowProps {
  ro: RepairOrder;
  currentUser: AppUser;
  technicians: AppUser[];
  serviceAdvisors: AppUser[];
  isManager: boolean;
  isAdvisor: boolean;
  isSales: boolean;
  canAssignTech: boolean;
  canSelectPayType: boolean;
  handleAssignTech: (techId: string) => void;
  handleStatusChange: (newStatus: ROStatus, note?: string) => void;
  startDiagnosis: (roId: string) => void;
  openQuoteModal: (roId: string) => void;
  setIsFollowUpModalOpen: (open: boolean) => void;
  setActiveTab: (tab: any) => void;
  updateTechCauseAndCorrection: (roId: string, cause: string, correction: string, options?: any) => void;
  updateConcernPayType: (roId: string, concernIndex: number, payType: ConcernPayType) => void;
  updateConcernTech: (roId: string, concernIndex: number, techId?: string, techName?: string) => void;
  addRepairOrderConcern?: (roId: string, concernText: string, payType?: ConcernPayType, techId?: string, techName?: string) => boolean;
  isTechScreen?: boolean;
}

export const DynamicROWorkflow: React.FC<DynamicROWorkflowProps> = ({
  ro: rawRO,
  currentUser,
  technicians,
  serviceAdvisors,
  isManager,
  isAdvisor,
  isSales,
  canAssignTech,
  canSelectPayType,
  handleAssignTech,
  handleStatusChange,
  startDiagnosis,
  openQuoteModal,
  setIsFollowUpModalOpen,
  setActiveTab,
  updateTechCauseAndCorrection,
  updateConcernPayType,
  updateConcernTech,
  addRepairOrderConcern,
  isTechScreen = false
}) => {
  const ro = cleanRO3700(rawRO);
  const [smartWorkflowOrder, setSmartWorkflowOrder] = useState<boolean>(true);
  const [quickTechCause, setQuickTechCause] = useState<string>(ro.cause || '');
  const [quickTechCorrection, setQuickTechCorrection] = useState<string>(ro.correction || '');
  const [savedCauseCorrectionNotice, setSavedCauseCorrectionNotice] = useState<boolean>(false);
  const [isEditingThreeCs, setIsEditingThreeCs] = useState<boolean>(false);
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [lineCauseInput, setLineCauseInput] = useState<string>('');
  const [lineCorrectionInput, setLineCorrectionInput] = useState<string>('');
  const [isAddingConcern, setIsAddingConcern] = useState<boolean>(false);
  const [newConcernText, setNewConcernText] = useState<string>('');
  const [newConcernPayType, setNewConcernPayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [newConcernTechId, setNewConcernTechId] = useState<string>(ro.techId || '');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const cadence = useMemo(() => getContactCadenceStatus(ro), [ro]);

  // Determine which action is currently the highest priority Next Action Required
  const activeAction = useMemo((): {
    id: NextActionId;
    sectionKey: string;
    title: string;
    badge: string;
    description: string;
    actionHint: string;
  } => {
    // 1. Tech Unassigned: Vehicle cannot proceed without an assigned technician
    if (!ro.techId) {
      return {
        id: 'ASSIGN_TECH',
        sectionKey: 'section-assignment',
        title: 'Assign Primary Technician',
        badge: 'Dispatch Required',
        description: 'Vehicle is in queue without an assigned technician. Select a certified tech to begin inspection and diagnostics.',
        actionHint: 'Select a technician below to dispatch this repair order.'
      };
    }

    // 2. Waiting for Customer Approval (Critical bottleneck) - Service Advisor action only
    if (!isTechScreen && (ro.status === 'WAITING_FOR_APPROVAL' || (ro.quote && ro.quote.status === 'SUBMITTED'))) {
      // If customer call has already been logged, outreach is completed and ticket is awaiting customer callback.
      // Do not pin Step 5 to the top of the workflow in this state; keep workflow in sequential order.
      const hasRecentContact = Boolean(
        ro.lastContactDate && 
        (Date.now() - new Date(ro.lastContactDate).getTime() < 1000 * 60 * 60 * 12)
      );

      if (!hasRecentContact) {
        return {
          id: 'CUSTOMER_APPROVAL',
          sectionKey: 'section-approval',
          title: 'Customer Authorization Required',
          badge: 'Approval Pending',
          description: 'Formal repair estimate has been submitted to the customer. Contact the customer and record authorization decision.',
          actionHint: 'Record phone authorization or customer decision below.'
        };
      }
    }

    // 3. Requested Items on this RO (Advisor Action Due)
    const hasPendingRecs = ro.recommendations && ro.recommendations.some(r => r.status === 'PENDING');
    if (!isTechScreen && hasPendingRecs) {
      return {
        id: 'RECOMMENDATIONS_REVIEW',
        sectionKey: 'section-recommendations',
        title: 'Review Requested Items on this RO',
        badge: 'Advisor Action Due',
        description: 'Technician logged additional items requiring Service Advisor review and pricing.',
        actionHint: 'Approve items for inclusion in estimate or decline below.'
      };
    }

    // 4. Waiting Diagnostics: Vehicle assigned but tech hasn't started
    if (ro.status === 'WAITING_DIAGNOSIS' || ro.status === 'WAITING_DIAGNOSTICS') {
      return {
        id: 'WAITING_DIAGNOSIS',
        sectionKey: 'section-diagnostics',
        title: 'Start Vehicle Diagnostics',
        badge: 'Diagnostic Queue',
        description: `Vehicle is assigned to ${ro.techName || 'technician'}. Clock into bay and initiate diagnostic scan & teardown.`,
        actionHint: 'Click "Begin Diagnosis Now" to place vehicle in active diagnostic status.'
      };
    }

    // 5. In Diag but missing Cause or Correction
    if ((ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_DIAG') && (!ro.cause?.trim() || !ro.correction?.trim())) {
      return {
        id: 'DIAGNOSIS_NOTES',
        sectionKey: 'section-concerns-three-cs',
        title: 'Document Cause & Correction (Three Cs)',
        badge: 'Findings Pending',
        description: 'Inspection is underway. Technician must record root cause diagnosis and recommended correction before estimate.',
        actionHint: 'Enter verified root cause and corrective repair plan below.'
      };
    }

    // 6. Diagnosis complete / In Diag done -> Build Quote
    if ((ro.status === 'ESTIMATE_DONE' || ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_DIAG') && (!ro.quote || ro.quote.status === 'DRAFT')) {
      return {
        id: 'BUILD_QUOTE',
        sectionKey: 'section-quote',
        title: 'Build & Submit Repair Quote',
        badge: 'Estimate Due',
        description: 'Diagnostic root cause is documented. Lookup OEM flat rate labor hours in Pro Demand and finalize estimate for customer.',
        actionHint: 'Click "Initiate / Open Repair Quote" to construct the labor and parts estimate.'
      };
    }

    // 7. Parts Ordered or Waiting for Parts Delivery to Bay
    if (ro.status === 'PARTS_ORDERED' || (ro.status === 'APPROVED' && ro.parts && ro.parts.length > 0 && ro.parts.some(p => p.status === 'NEEDED' || p.status === 'ORDERED'))) {
      return {
        id: 'PARTS_ORDERING',
        sectionKey: 'section-parts',
        title: 'Receive & Deliver Parts to Tech Bay',
        badge: 'Parts ETA Pending',
        description: 'Components are on order or being sourced. Verify tracking ETA and deliver parts to technician bay once received.',
        actionHint: 'Verify parts tracking or mark parts delivered to bay below.'
      };
    }

    // 8. Parts In Bay or Approved -> Active Bay Repair
    if (ro.status === 'PARTS_IN_TO_TECH' || (ro.status === 'APPROVED' && (!ro.parts || ro.parts.length === 0 || ro.parts.every(p => p.status === 'IN_BAY')))) {
      return {
        id: 'ACTIVE_REPAIR',
        sectionKey: 'section-repair-execution',
        title: 'Step 7: Begin Active Bay Repair',
        badge: 'Parts in Bay',
        description: 'All authorizations granted and parts are staged in bay. Technician should begin active repair execution.',
        actionHint: 'Start bay repair work and transition status to Repair in Progress.'
      };
    }

    if (ro.status === 'REPAIR_IN_PROGRESS') {
      return {
        id: 'REPAIR_COMPLETE',
        sectionKey: 'section-repair-execution',
        title: `Step 7: Repair in Progress${ro.techName ? ` (${ro.techName}${ro.bay ? ` • Bay ${ro.bay}` : ''})` : ''}`,
        badge: 'In Bay Work Active',
        description: `Vehicle is actively being repaired by ${ro.techName || 'assigned technician'}${ro.bay ? ` in Bay ${ro.bay}` : ''}.`,
        actionHint: 'Work actively in progress. Complete quality inspection and road test when done.'
      };
    }

    // 9. Repair Complete -> Stage Vehicle & Notify Customer
    if (ro.status === 'REPAIR_COMPLETE') {
      return {
        id: 'READY_FOR_PICKUP',
        sectionKey: 'section-delivery-staging',
        title: 'Step 8: Repair Finished — Stage Vehicle for Pickup',
        badge: 'Repair Finished',
        description: 'Vehicle has completed repair and passed quality inspection. Stage vehicle in front delivery lot and notify customer.',
        actionHint: 'Mark vehicle ready for pickup and notify customer.'
      };
    }

    // 10. Ready for Pickup -> Settlement & Close
    if (ro.status === 'READY_FOR_PICKUP') {
      return {
        id: 'CLOSE_TICKET',
        sectionKey: 'section-delivery-staging',
        title: 'Step 8: Finished — Settle Invoice & Deliver to Customer',
        badge: 'Ready for Pickup',
        description: 'Customer is arriving to retrieve vehicle. Verify invoice settlement, collect payment/warranty authorization, and release keys.',
        actionHint: 'Click "Settle Invoice & Close RO" once vehicle is delivered.'
      };
    }

    // 11. Overdue Cadence
    if (cadence.isOverdue || cadence.isDueToday) {
      return {
        id: 'FOLLOWUP_CADENCE',
        sectionKey: 'section-cadence',
        title: 'Customer Communication Overdue',
        badge: 'Contact Due',
        description: `Customer follow-up cadence standard requires contact twice per week. Next contact was due ${cadence.nextDueText}.`,
        actionHint: 'Log phone call or customer update below.'
      };
    }

    return {
      id: 'NONE',
      sectionKey: '',
      title: 'All Current Actions Completed',
      badge: 'On Track',
      description: 'The repair order workflow is up-to-date.',
      actionHint: 'No urgent workflow actions pending.'
    };
  }, [ro, cadence]);

  const triggerActionNotice = (message: string) => {
    setActionNotice(message);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSaveQuickCauseCorrection = () => {
    if (!quickTechCause.trim() && !quickTechCorrection.trim()) return;
    updateTechCauseAndCorrection(ro.id, quickTechCause.trim(), quickTechCorrection.trim());
    setSavedCauseCorrectionNotice(true);
    triggerActionNotice('✓ Root Cause & Correction saved! Returned to standard workflow position.');
    setTimeout(() => setSavedCauseCorrectionNotice(false), 3000);
  };

  const handleSaveLineCauseCorrection = (idx: number) => {
    const currentConcerns = ro.concerns && ro.concerns.length > 0 ? ro.concerns : [ro.primaryConcern || ''];
    const nextCauses = [...(ro.concernCauses || currentConcerns.map((_, i) => i === 0 ? (ro.cause || '') : ''))];
    while (nextCauses.length < currentConcerns.length) nextCauses.push('');
    nextCauses[idx] = lineCauseInput.trim();

    const nextCorrections = [...(ro.concernCorrections || currentConcerns.map((_, i) => i === 0 ? (ro.correction || '') : ''))];
    while (nextCorrections.length < currentConcerns.length) nextCorrections.push('');
    nextCorrections[idx] = lineCorrectionInput.trim();

    const primaryCause = idx === 0 ? lineCauseInput.trim() : (ro.cause || nextCauses[0] || '');
    const primaryCorrection = idx === 0 ? lineCorrectionInput.trim() : (ro.correction || nextCorrections[0] || '');

    updateTechCauseAndCorrection(ro.id, primaryCause, primaryCorrection, {
      concernCauses: nextCauses,
      concernCorrections: nextCorrections,
      notify: true
    });
    setEditingLineIdx(null);
    triggerActionNotice(`✓ Line ${idx + 1} Cause & Correction saved!`);
  };

  // Define each workflow section with its natural resting order (1 through 10)
  interface WorkflowSection {
    key: string;
    naturalOrder: number;
    title: string;
    isComplete: boolean;
    completeBadgeText: string;
    render: (isPromoted: boolean) => React.ReactNode;
  }

  const sections: WorkflowSection[] = [
    // 1. Technician Assignment
    {
      key: 'section-assignment',
      naturalOrder: 1,
      title: 'Technician Assignment & Dispatch',
      isComplete: Boolean(ro.techId),
      completeBadgeText: `Assigned: ${ro.techName || 'Technician'}`,
      render: (isPromoted: boolean) => (
        <div className={`p-4 rounded-xl border transition-all ${
          isPromoted 
            ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-300/40' 
            : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg shrink-0 ${isPromoted ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 1: Technician Assignment & Dispatch
                  </h4>
                  {ro.techId ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{ro.techName}{technicians.find(t => t.id === ro.techId)?.employeeNumber ? ` #${technicians.find(t => t.id === ro.techId)?.employeeNumber}` : ''}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 animate-pulse">
                      Unassigned
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {ro.techId 
                    ? `Primary technician assigned for diagnostics and repairs. Vehicle placed in ${ro.techName}'s queue.`
                    : 'Select a technician from the shop roster to assign primary responsibility for this repair order.'}
                </p>
              </div>
            </div>

            {canAssignTech && (
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                <select
                  value={ro.techId || ''}
                  onChange={(e) => {
                    const techId = e.target.value;
                    if (techId) {
                      handleAssignTech(techId);
                      triggerActionNotice(`✓ Assigned to ${technicians.find(t => t.id === techId)?.name || 'Technician'}! Step completed & returned to workflow.`);
                    }
                  }}
                  className={`text-xs font-bold rounded-lg px-3 py-2 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !ro.techId 
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  <option value="" disabled className="text-slate-500">
                    {ro.techId ? 'Reassign Technician...' : 'Select Technician to Assign...'}
                  </option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id} className="text-slate-900 bg-white">
                      {tech.name} {tech.employeeNumber ? `(#${tech.employeeNumber})` : ''}
                    </option>
                  ))}
                </select>

                {!ro.techId && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick:</span>
                    {technicians.slice(0, 3).map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => {
                          handleAssignTech(tech.id);
                          triggerActionNotice(`✓ Assigned to ${tech.name}! Step completed & returned to workflow.`);
                        }}
                        className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-300 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        {tech.name.split(' ')[0]} {tech.employeeNumber ? `#${tech.employeeNumber}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },

    // 2. Diagnostic Phase Tracking Box & Three Cs (Complaint, Cause, Correction)
    {
      key: 'section-diagnostics',
      naturalOrder: 2,
      title: 'Diagnostic Phase & Three Cs',
      isComplete: ro.status !== 'WAITING_DIAGNOSIS' && ro.status !== 'WAITING_DIAGNOSTICS' && Boolean(ro.cause?.trim() && ro.correction?.trim()),
      completeBadgeText: 'Diagnostics & 3 Cs Complete',
      render: (isPromoted: boolean) => (
        <div className={`space-y-4 ${isPromoted ? 'p-1' : ''}`}>
          {/* Diagnostic Phase Tracking Box */}
          {ro.status === 'WAITING_DIAGNOSIS' && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
              isPromoted ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300' : 'bg-amber-50/90 border-amber-300'
            }`}>
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
                  <Clock className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Vehicle is Waiting to be Diagnosed</span>
                    {isPromoted && (
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400">
                        Immediate Next Step
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    Assigned to <strong className="font-semibold">{ro.techName || 'technician'}</strong> awaiting initial scan & teardown. Placed in queue at{' '}
                    <strong className="font-semibold">{formatTimeOnly(ro.waitingDiagnosisAt)}</strong> ({formatDurationSince(ro.waitingDiagnosisAt)} wait time).
                  </div>
                </div>
              </div>
              {!isSales && (
                <button
                  type="button"
                  onClick={() => {
                    startDiagnosis(ro.id);
                    triggerActionNotice('✓ Diagnosis started! Step completed & returned to workflow.');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Begin Diagnosis Now</span>
                </button>
              )}
            </div>
          )}

          {(ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_BAY') && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
              isPromoted ? 'bg-blue-100/90 border-blue-400 ring-2 ring-blue-300' : 'bg-blue-50/90 border-blue-300'
            }`}>
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-200 text-blue-900 shrink-0">
                  <Wrench className="w-5 h-5 text-blue-800" />
                </div>
                <div>
                  <div className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Vehicle is Being Diagnosed</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-200/90 px-2 py-0.5 rounded-full border border-blue-300">
                      Active Inspection
                    </span>
                  </div>
                  <div className="text-xs text-blue-800 mt-0.5">
                    Active testing & inspection underway by <strong className="font-semibold">{ro.techName || 'assigned technician'}</strong>.
                    Commenced at <strong className="font-semibold">{formatTimeOnly(ro.diagnosisStartedAt)}</strong> ({formatDurationSince(ro.diagnosisStartedAt)} active duration).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Complaints / Concerns & Technician Three C's */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Step 2: Customer Complaints & Technician Three Cs
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {ro.cause && ro.correction ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Three Cs Complete</span>
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Cause / Correction Pending</span>
                  </span>
                )}
              </div>
            </div>

            {/* Complaints List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  1. Customer Complaint(s):
                </span>
                {!isTechScreen && (isAdvisor || isManager) && addRepairOrderConcern && !isAddingConcern && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewConcernTechId(ro.techId || '');
                      setIsAddingConcern(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Customer Complaint</span>
                  </button>
                )}
              </div>

              {/* Inline Form to Add Customer Complaint Line */}
              {isAddingConcern && (
                <div className="bg-white p-3.5 rounded-lg border-2 border-blue-400 shadow-2xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>New Customer Complaint (Line {(ro.concerns?.length || 1) + 1})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingConcern(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Stated Concern / Complaint *
                    </label>
                    <textarea
                      rows={2}
                      value={newConcernText}
                      onChange={e => setNewConcernText(e.target.value)}
                      placeholder="Enter customer concern or symptom..."
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Pay Type
                      </label>
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setNewConcernPayType('CUSTOMER_PAY')}
                          className={`flex-1 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            newConcernPayType === 'CUSTOMER_PAY'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Customer Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewConcernPayType('WARRANTY')}
                          className={`flex-1 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            newConcernPayType === 'WARRANTY'
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Warranty
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewConcernPayType('INTERNAL')}
                          className={`flex-1 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            newConcernPayType === 'INTERNAL'
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Internal
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Assign Technician to this Line
                      </label>
                      <select
                        value={newConcernTechId}
                        onChange={e => setNewConcernTechId(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">{ro.techName ? `Default Primary: ${ro.techName}` : 'Unassigned'}</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}{t.employeeNumber ? ` #${t.employeeNumber}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddingConcern(false)}
                      className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newConcernText.trim()}
                      onClick={() => {
                        if (!newConcernText.trim()) return;
                        const chosenTech = technicians.find(t => t.id === newConcernTechId);
                        if (addRepairOrderConcern) {
                          addRepairOrderConcern(
                            ro.id, 
                            newConcernText.trim(), 
                            newConcernPayType, 
                            chosenTech?.id, 
                            chosenTech?.name
                          );
                        }
                        setNewConcernText('');
                        setNewConcernPayType('CUSTOMER_PAY');
                        setIsAddingConcern(false);
                        triggerActionNotice('✓ Added customer complaint line to repair order!');
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Add Complaint Line</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Itemized Lines: Each line has Complaint, Concern/Cause, Correction, and Line Quote */}
              <div className="space-y-4">
                {(ro.concerns && ro.concerns.length > 0 ? ro.concerns : [ro.primaryConcern || 'General Inspection & Diagnostic']).map((concern, idx) => {
                  const lineNum = idx + 1;
                  const currentCause = ro.concernCauses?.[idx] || (idx === 0 ? ro.cause : '');
                  const currentCorrection = ro.concernCorrections?.[idx] || (idx === 0 ? ro.correction : '');
                  const currentPayType: ConcernPayType = ro.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
                  const currentTechId = ro.concernTechIds?.[idx] || ro.techId;
                  const currentTechName = ro.concernTechNames?.[idx] || (currentTechId ? technicians.find(t => t.id === currentTechId)?.name : ro.techName) || 'Unassigned';

                  // Line quote calculation
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
                    <div 
                      key={idx}
                      className="bg-white rounded-xl border-2 border-slate-300 shadow-2xs hover:border-slate-400 transition-all p-4 space-y-3.5"
                    >
                      {/* Line Header: Line Number, Pay Type, Tech Assignment, Edit button */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs">
                            Line {lineNum}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Primary Concern
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Pay Type */}
                          {canSelectPayType ? (
                            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                              <button
                                type="button"
                                onClick={() => updateConcernPayType(ro.id, idx, 'CUSTOMER_PAY')}
                                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                  currentPayType === 'CUSTOMER_PAY' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Customer Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => updateConcernPayType(ro.id, idx, 'WARRANTY')}
                                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                  currentPayType === 'WARRANTY' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Warranty
                              </button>
                              <button
                                type="button"
                                onClick={() => updateConcernPayType(ro.id, idx, 'INTERNAL')}
                                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                  currentPayType === 'INTERNAL' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Internal
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              currentPayType === 'WARRANTY' ? 'bg-amber-50 text-amber-900 border-amber-300' : currentPayType === 'INTERNAL' ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}>
                              {currentPayType.replace(/_/g, ' ')}
                            </span>
                          )}

                          {/* Assigned Tech */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <Wrench className="w-3.5 h-3.5 text-slate-500" />
                            {canAssignTech ? (
                              <select
                                value={currentTechId || ''}
                                onChange={(e) => {
                                  const chosen = technicians.find(t => t.id === e.target.value);
                                  updateConcernTech(ro.id, idx, chosen?.id, chosen?.name);
                                  triggerActionNotice(`✓ Assigned Line ${lineNum} to ${chosen?.name || 'Technician'}`);
                                }}
                                className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="">{ro.techName ? `(Primary: ${ro.techName})` : 'Unassigned'}</option>
                                {technicians.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}{t.employeeNumber ? ` #${t.employeeNumber}` : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-bold text-slate-800 text-[11px]">{currentTechName}</span>
                            )}
                          </div>

                          {/* Edit Cause & Correction for this line */}
                          {editingLineIdx !== idx && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLineIdx(idx);
                                setLineCauseInput(currentCause || '');
                                setLineCorrectionInput(currentCorrection || '');
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                              title="Edit diagnostic cause and repair correction for this line"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{currentCause || currentCorrection ? 'Edit 3Cs' : '+ Add Cause/Correction'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. Customer Stated Complaint */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black inline-flex items-center justify-center">1</span>
                          <span>Complaint (Customer Stated Symptom):</span>
                        </label>
                        <div className="bg-slate-50/90 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-950 whitespace-pre-wrap leading-relaxed">
                          {concern}
                        </div>
                      </div>

                      {/* 2. Cause (Technician Diagnostic Findings) */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black inline-flex items-center justify-center">2</span>
                          <span>Cause (Diagnostic Finding):</span>
                        </label>
                        {editingLineIdx === idx ? (
                          <textarea
                            rows={2}
                            value={lineCauseInput}
                            onChange={(e) => setLineCauseInput(e.target.value)}
                            placeholder="Enter diagnostic root cause (e.g. DTC P0300, cracked coil pack, worn brake pads)..."
                            className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        ) : (
                          <div className="bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-200 text-xs font-semibold text-amber-950 font-mono">
                            {currentCause || <span className="italic text-slate-400 font-sans font-normal">Awaiting technician diagnosis</span>}
                          </div>
                        )}
                      </div>

                      {/* 3. Correction (Repair Procedure / Action Taken) */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black inline-flex items-center justify-center">3</span>
                          <span>Correction (Repair Procedure / Action Taken):</span>
                        </label>
                        {editingLineIdx === idx ? (
                          <textarea
                            rows={2}
                            value={lineCorrectionInput}
                            onChange={(e) => setLineCorrectionInput(e.target.value)}
                            placeholder="Enter recommended repair procedure (e.g. Replaced ignition coil, cleared codes, road tested)..."
                            className="w-full px-3 py-2 border-2 border-emerald-400 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <div className="bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-950 font-mono">
                            {currentCorrection || <span className="italic text-slate-400 font-sans font-normal">Awaiting technician repair plan</span>}
                          </div>
                        )}
                      </div>

                      {/* Save / Cancel buttons when editing this line */}
                      {editingLineIdx === idx && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditingLineIdx(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLineCauseCorrection(idx)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Line {lineNum} Findings</span>
                          </button>
                        </div>
                      )}

                      {/* 4. Line Quote Breakdown & Subtotal */}
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
                          <button
                            type="button"
                            onClick={() => openQuoteModal(ro.id)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-300 transition-colors cursor-pointer"
                          >
                            {hasLineQuote ? 'Edit Quote' : '+ Quote Line'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quote Total Summary Bar: Totaled by Line */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                        Quote Total (By Line & Totaled)
                      </h5>
                      <span className="text-[11px] text-slate-300">
                        Itemized totals across all {(ro.concerns?.length || 1)} concern lines
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openQuoteModal(ro.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{ro.quote ? 'Open & Edit Full Quote' : '+ Initiate Repair Quote'}</span>
                    </button>
                  </div>
                </div>

                {/* Line-by-line itemized totals summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(ro.concerns && ro.concerns.length > 0 ? ro.concerns : [ro.primaryConcern || 'General Inspection']).map((_, i) => {
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
          </div>
        </div>
      )
    },

    // 3. Requested Items on this RO
    {
      key: 'section-recommendations',
      naturalOrder: 3,
      title: 'Step 3: Requested Items on this RO',
      isComplete: !ro.recommendations || ro.recommendations.length === 0 || !ro.recommendations.some(r => r.status === 'PENDING'),
      completeBadgeText: 'Requested Items Reviewed',
      render: (isPromoted: boolean) => (
        <div className={`rounded-xl transition-all ${
          isPromoted ? 'ring-2 ring-red-400 bg-red-50/20 p-1' : ''
        }`}>
          <TechRecommendationsSection ro={ro} />
        </div>
      )
    },

    // 4. Repair Quote & Labor Estimate Card
    {
      key: 'section-quote',
      naturalOrder: 4,
      title: isTechScreen ? 'Job Labor Time Entry' : 'Repair Quote & Labor Estimate',
      isComplete: Boolean(ro.quote && ro.quote.laborItems && ro.quote.laborItems.length > 0),
      completeBadgeText: isTechScreen
        ? `${((ro.quote?.laborItems || []).reduce((s, i) => s + (Number(i.laborHours) || 0), 0)).toFixed(1)} hrs Labor Logged`
        : ro.quote ? `Quote: $${Number(ro.quote.grandTotal).toFixed(2)}` : 'Quote Finalized',
      render: (isPromoted: boolean) => (
        <div className={`bg-white rounded-xl border-2 overflow-hidden shadow-2xs transition-all ${
          isPromoted 
            ? 'border-indigo-400 ring-2 ring-indigo-300 shadow-md' 
            : 'border-indigo-200'
        }`}>
          <div className="p-4 bg-indigo-50/70 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {isTechScreen ? 'Step 4: Job Labor Time Entry' : 'Step 4: Repair Quote & Labor Estimate'}
                  </h4>
                  {ro.quote ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ro.quote.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : ro.quote.status === 'SUBMITTED'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : ro.quote.status === 'DECLINED'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {ro.quote.status}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Not Initiated
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-900 font-semibold mt-0.5">
                  {isTechScreen 
                    ? 'Log flat-rate labor times (hours) for required repairs. Rate per hour and parts are priced by the Advisor and Parts Counter.'
                    : 'Itemized Pro Demand flat-rate labor times, replacement parts, shop supplies, and sales tax.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://www.prodemand.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-900 border border-blue-400 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Open Pro Demand for OEM flat rate labor times"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pro Demand Labor ↗</span>
              </a>

              <button
                type="button"
                onClick={() => openQuoteModal(ro.id)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>
                  {isTechScreen
                    ? (ro.quote?.laborItems?.length ? 'View / Edit Labor Time' : '+ Enter Labor Time')
                    : (ro.quote ? 'Open & Edit Quote' : '+ Initiate Repair Quote')}
                </span>
              </button>
            </div>
          </div>

          {ro.quote && (!isTechScreen || (ro.quote.laborItems && ro.quote.laborItems.length > 0)) ? (
            isTechScreen ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[10px] uppercase font-black text-blue-950">Estimated Labor Time</div>
                    <div className="text-xl font-black text-blue-950 mt-0.5">
                      {((ro.quote.laborItems || []).reduce((s, i) => s + (Number(i.laborHours) || 0), 0)).toFixed(1)} hrs
                    </div>
                    <div className="text-xs font-bold text-blue-950 mt-0.5">
                      Across {(ro.quote.laborItems || []).length} labor operation{(ro.quote.laborItems || []).length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-300">
                    <div className="text-[10px] uppercase font-black text-slate-950">Parts Status</div>
                    <div className="text-sm font-bold text-slate-950 mt-0.5">
                      {(ro.parts || []).length > 0 ? `${(ro.parts || []).length} parts requested with Parts Department` : 'No parts requested yet'}
                    </div>
                    <div className="text-xs text-slate-900 font-semibold mt-0.5">
                      Managed by Parts Department
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-900 font-bold italic">
                  Note: Technicians enter labor time only. Rate per hour and parts are priced and merged by the Service Advisor on the customer quote.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300">
                    <div className="text-[10px] uppercase font-black text-slate-950">Labor Items</div>
                    <div className="text-sm font-black text-slate-950 mt-0.5">
                      {(ro.quote.laborItems || []).length} lines ({((ro.quote.laborItems || []).reduce((s, i) => s + (Number(i.laborHours) || 0), 0)).toFixed(1)} hrs)
                    </div>
                    <div className="text-xs font-bold text-slate-950 mt-0.5">
                      ${(Number(ro.quote.totalLaborCost ?? (ro.quote as any).laborSubtotal) || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300">
                    <div className="text-[10px] uppercase font-black text-slate-950">Parts Required</div>
                    <div className="text-sm font-black text-slate-950 mt-0.5">
                      {(ro.quote.partsItems || []).length} parts
                    </div>
                    <div className="text-xs font-bold text-slate-950 mt-0.5">
                      ${(Number(ro.quote.totalPartsCost ?? (ro.quote as any).partsSubtotal) || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300">
                    <div className="text-[10px] uppercase font-black text-slate-950">Supplies & Tax</div>
                    <div className="text-sm font-black text-slate-950 mt-0.5">
                      ${((Number(ro.quote.shopSuppliesFee ?? (ro.quote as any).shopSupplies) || 0) + (Number(ro.quote.taxAmount ?? (ro.quote as any).tax) || 0)).toFixed(2)}
                    </div>
                  </div>

                  <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-300">
                    <div className="text-[10px] uppercase font-black text-indigo-950">Grand Total</div>
                    <div className="text-lg font-black text-indigo-950 mt-0.5">
                      ${(Number(ro.quote.grandTotal) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>
      )
    },

    // 5. Customer Authorization Station
    {
      key: 'section-approval',
      naturalOrder: 5,
      title: 'Step 5: Customer Authorization & Approval',
      isComplete: ro.status !== 'WAITING_FOR_APPROVAL' && (!ro.quote || ro.quote.status !== 'SUBMITTED'),
      completeBadgeText: ro.status === 'APPROVED' ? 'Customer Approved' : 'Authorization Recorded',
      render: (isPromoted: boolean) => {
        const hasRecentContact = Boolean(
          ro.lastContactDate && 
          (Date.now() - new Date(ro.lastContactDate).getTime() < 1000 * 60 * 60 * 12)
        );

        return (
          <div className={`p-4 rounded-xl border transition-all ${
            isPromoted
              ? 'bg-red-50/90 border-red-300 shadow-md ring-2 ring-red-400/40' 
              : ro.status === 'WAITING_FOR_APPROVAL'
              ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
              : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg shrink-0 ${
                  isPromoted 
                    ? 'bg-red-600 text-white' 
                    : ro.status === 'WAITING_FOR_APPROVAL' 
                    ? 'bg-amber-600 text-white' 
                    : ro.status === 'APPROVED' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Step 5: Customer Authorization & Approval
                    </h4>
                    {ro.status === 'WAITING_FOR_APPROVAL' ? (
                      hasRecentContact ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Call Logged • Awaiting Decision
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          Waiting for Customer Approval
                        </span>
                      )
                    ) : ro.status === 'APPROVED' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Approved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {ro.status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {ro.status === 'WAITING_FOR_APPROVAL'
                      ? `Estimate totaling $${Number(ro.quote?.grandTotal || 0).toFixed(2)} presented to customer. Awaiting customer authorization decision.`
                      : 'Customer authorization status is logged. Repairs may only proceed when explicitly authorized.'}
                  </div>

                  {ro.lastContactDate && ro.status === 'WAITING_FOR_APPROVAL' && (
                    <div className="text-[11px] text-blue-900 bg-blue-50/90 border border-blue-200 rounded-md px-2.5 py-1 mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>
                        Call logged at <strong>{formatTimeOnly(ro.lastContactDate)}</strong> by {ro.lastContactBy || 'Advisor'} ({formatRelativeTime(ro.lastContactDate)}).
                        {ro.lastContactOutcome ? ` • ${formatContactOutcome(ro.lastContactOutcome as CustomerContactOutcome).label}` : ''}
                      </span>
                      <span className="font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded text-[10px]">
                        Awaiting Return Call
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                {isTechScreen ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {ro.status === 'APPROVED' 
                          ? 'Customer Authorized • Bay Repair Approved' 
                          : ro.status === 'WAITING_FOR_APPROVAL' 
                          ? 'Estimate Submitted • Advisor Following Up with Customer' 
                          : 'Customer Authorization Managed by Service Advisor'}
                      </span>
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsFollowUpModalOpen(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Log Customer Call</span>
                    </button>

                    {ro.status === 'WAITING_FOR_APPROVAL' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleStatusChange('APPROVED', 'Customer authorized repair estimate via telephone confirmation');
                            triggerActionNotice('✓ Customer Approved! Step completed & returned to workflow.');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Customer Approved (Phone Auth)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleStatusChange('DENIED', 'Customer declined repair estimate');
                            triggerActionNotice('Customer declined estimate. Step updated.');
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>Customer Declined</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }
    },

    // 6. Parts Sourcing & ETA Delivery
    {
      key: 'section-parts',
      naturalOrder: 6,
      title: 'Parts Sourcing & Bay Delivery',
      isComplete: ro.status !== 'PARTS_ORDERED' && (!ro.parts || ro.parts.length === 0 || ro.parts.every(p => p.status === 'IN_BAY' || p.status === 'RECEIVED')),
      completeBadgeText: 'Parts Staged in Bay',
      render: (isPromoted: boolean) => (
        <div className={`p-4 rounded-xl border transition-all ${
          isPromoted || ro.status === 'PARTS_ORDERED'
            ? 'bg-amber-50/90 border-amber-300 shadow-md ring-2 ring-amber-300' 
            : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg shrink-0 ${ro.status === 'PARTS_ORDERED' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 6: Parts Sourcing & Bay Delivery
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    ro.parts && ro.parts.length > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {ro.parts?.length || 0} Components Tracked
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {ro.parts && ro.parts.length > 0 
                    ? `Parts status: ${ro.parts.map(p => `${p.description} (${p.status})`).join(', ')}`
                    : 'No external components currently required. Repair uses in-stock supplies.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('PARTS')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Open Parts ETA Tracker</span>
              </button>

              {ro.status === 'PARTS_ORDERED' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('PARTS_IN_TO_TECH', 'All ordered parts arrived and delivered to technician bay');
                    triggerActionNotice('✓ Parts marked delivered to bay! Step completed & returned to workflow.');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark All Parts In Bay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    },

    // 7. Active Bay Repair Execution
    {
      key: 'section-repair-execution',
      naturalOrder: 7,
      title: 'Step 7: Active Bay Repair & Road Test',
      isComplete: ro.status === 'REPAIR_COMPLETE' || ro.status === 'READY_FOR_PICKUP' || ro.status === 'CLOSED',
      completeBadgeText: 'Repair & Road Test Complete',
      render: (isPromoted: boolean) => (
        <div className={`p-4 rounded-xl border transition-all ${
          isPromoted || ro.status === 'REPAIR_IN_PROGRESS' || ro.status === 'PARTS_IN_TO_TECH'
            ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-300' 
            : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg shrink-0 ${ro.status === 'REPAIR_IN_PROGRESS' ? 'bg-blue-600 text-white' : ro.status === 'PARTS_IN_TO_TECH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 7: Active Bay Repair & Road Test
                  </h4>
                  {ro.status === 'REPAIR_IN_PROGRESS' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                      In Bay Work Active
                    </span>
                  ) : ro.status === 'PARTS_IN_TO_TECH' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                      Parts In Bay • Ready to Repair
                    </span>
                  ) : ro.status === 'REPAIR_COMPLETE' || ro.status === 'READY_FOR_PICKUP' || ro.status === 'CLOSED' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Repairs Complete
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {ro.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {ro.status === 'REPAIR_IN_PROGRESS'
                    ? `Technician ${ro.techName || 'assigned tech'} is actively performing authorized repairs${ro.bay ? ` in Bay ${ro.bay}` : ''}. Next: quality inspection & final road test.`
                    : ro.status === 'PARTS_IN_TO_TECH'
                    ? `Parts delivered to bay. ${ro.techName || 'Technician'} may commence active teardown and reassembly.`
                    : 'Physical repair execution phase.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {ro.status === 'PARTS_IN_TO_TECH' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('REPAIR_IN_PROGRESS', 'Technician started active bay repair work');
                    triggerActionNotice('✓ Repair work started! Status updated to Repair in Progress.');
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Bay Repair Work</span>
                </button>
              )}

              {ro.status === 'REPAIR_IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('REPAIR_COMPLETE', 'Repair completed, vehicle inspected and verified on road test');
                    triggerActionNotice('✓ Repair complete & road tested! Returned to workflow.');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark Repair Complete & Road Tested</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    },

    // 8. Vehicle Finished & Delivery (Ready for Pickup / Settle & Close)
    {
      key: 'section-delivery-staging',
      naturalOrder: 8,
      title: 'Step 8: Finished / Ready for Pickup',
      isComplete: ro.status === 'CLOSED',
      completeBadgeText: ro.status === 'CLOSED' ? 'Ticket Closed & Settled' : 'Ready for Pickup',
      render: (isPromoted: boolean) => (
        <div className={`p-4 rounded-xl border transition-all ${
          isPromoted || ro.status === 'REPAIR_COMPLETE' || ro.status === 'READY_FOR_PICKUP'
            ? 'bg-emerald-50/80 border-emerald-300 shadow-md ring-2 ring-emerald-300' 
            : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg shrink-0 ${ro.status === 'READY_FOR_PICKUP' ? 'bg-emerald-600 text-white' : ro.status === 'REPAIR_COMPLETE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 8: Finished / Ready for Pickup
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    ro.status === 'CLOSED'
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : ro.status === 'READY_FOR_PICKUP'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : ro.status === 'REPAIR_COMPLETE'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {ro.status === 'REPAIR_COMPLETE' ? 'Finished • Needs Staging' : ro.status === 'READY_FOR_PICKUP' ? 'Finished • Staged for Customer' : ro.status === 'CLOSED' ? 'Finished & Delivered' : ro.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {ro.status === 'REPAIR_COMPLETE'
                    ? 'Mechanical repairs are finished! Park vehicle in delivery staging area and notify customer.'
                    : ro.status === 'READY_FOR_PICKUP'
                    ? 'Vehicle parked in staging lot. Ready for customer arrival, invoice review, and key handover.'
                    : ro.status === 'CLOSED'
                    ? 'Vehicle delivered to customer, invoice settled in full, and repair order closed.'
                    : 'Customer vehicle staging, pickup notification, and invoice settlement.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {ro.status === 'REPAIR_COMPLETE' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('READY_FOR_PICKUP', 'Vehicle staged in front lot and customer notified for pickup');
                    triggerActionNotice('✓ Staged & Marked Ready for Pickup! Step completed.');
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Ready for Pickup & Notify</span>
                </button>
              )}

              {ro.status === 'READY_FOR_PICKUP' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('CLOSED', 'Invoice settled in full, keys released, ticket closed');
                    triggerActionNotice('✓ Repair order settled and closed successfully.');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Settle Invoice & Close RO</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    },

    // 9. Customer Communication Cadence (Twice-Per-Week Standard)
    {
      key: 'section-cadence',
      naturalOrder: 9,
      title: 'Customer Communication Cadence',
      isComplete: !cadence.isOverdue && !cadence.isDueToday,
      completeBadgeText: 'Cadence On Track',
      render: (isPromoted: boolean) => (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-all ${
          isPromoted
            ? 'bg-red-50/90 border-red-300 ring-2 ring-red-400'
            : cadence.isOverdue 
            ? 'bg-red-50/70 border-red-200' 
            : cadence.isDueToday
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Communication Cadence:</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cadence.badgeClass}`}>
                {cadence.label}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                (Twice per week standard)
              </span>
            </div>
            <div className="text-xs text-slate-700 mt-1">
              <strong>Last Contact:</strong> {cadence.lastContactText} • <strong>Next Call Due:</strong> {cadence.nextDueText}
            </div>
          </div>

          {!isSales && (
            <button
              type="button"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Log Customer Touchpoint</span>
            </button>
          )}
        </div>
      )
    },

    // 10. Time in Shop Duration
    {
      key: 'section-time-in-shop',
      naturalOrder: 10,
      title: 'Time in Shop',
      isComplete: true,
      completeBadgeText: 'Elapsed Tracked',
      render: () => (
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Time in Shop</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {formatDurationSince(ro.createdAt) || 'Just arrived'}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 font-medium">
            Elapsed shop duration
          </div>
        </div>
      )
    },

    // 11. Visual Ticket Flow Pipeline Stepper
    {
      key: 'section-pipeline-stepper',
      naturalOrder: 11,
      title: 'Ticket Flow Pipeline Stepper',
      isComplete: ro.status === 'CLOSED',
      completeBadgeText: 'Full Workflow Pipeline',
      render: () => (
        <TicketFlowStepper 
          ro={ro} 
          onUpdateStatus={handleStatusChange} 
          canEdit={!isSales}
        />
      )
    }
  ];

  // Dynamic sorting: When smartWorkflowOrder is enabled, the section matching activeAction.sectionKey is placed at index 0!
  const sortedSections = useMemo(() => {
    if (!smartWorkflowOrder || !activeAction.sectionKey) {
      return [...sections].sort((a, b) => a.naturalOrder - b.naturalOrder);
    }

    return [...sections].sort((a, b) => {
      if (a.key === activeAction.sectionKey) return -1;
      if (b.key === activeAction.sectionKey) return 1;
      return a.naturalOrder - b.naturalOrder;
    });
  }, [smartWorkflowOrder, activeAction.sectionKey, sections]);

  return (
    <div className="space-y-3">
      {/* Simple, clean Next Action Required indicator without cluttered boxes */}
      {smartWorkflowOrder && activeAction.id !== 'NONE' ? (
        <div className="flex items-center justify-between pb-1 pt-0.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 uppercase tracking-wide">
              Next Action Required:
            </span>
            <span className="text-blue-700 font-semibold">
              {activeAction.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSmartWorkflowOrder(!smartWorkflowOrder)}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Toggle chronological workflow order"
          >
            Show Chronological Order
          </button>
        </div>
      ) : smartWorkflowOrder ? (
        <div className="flex items-center justify-between pb-1 pt-0.5 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
              Workflow:
            </span>
            {ro.status === 'WAITING_FOR_APPROVAL' && ro.lastContactDate ? (
              <span className="text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Customer Call Logged ({formatRelativeTime(ro.lastContactDate)}) • Sequential Order (Steps 1–8)
              </span>
            ) : (
              <span className="text-slate-600 font-medium">
                All immediate actions completed • Sequential Order (Steps 1–8)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSmartWorkflowOrder(false)}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Switch to Manual Order
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-1 pt-0.5 text-xs text-slate-500">
          <span>Workflow (Manual Chronological Order)</span>
          <button
            type="button"
            onClick={() => setSmartWorkflowOrder(true)}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            Move Next Action to Top
          </button>
        </div>
      )}

      {/* Dynamic Action Completion Notice Toast */}
      {actionNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Fluid Re-ordering Animated Container (Option B) */}
      <div className="space-y-4">
        {sortedSections.map((section) => {
          const isPromoted = smartWorkflowOrder && section.key === activeAction.sectionKey;

          return (
            <motion.div
              key={section.key}
              layout
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 26,
                mass: 0.8
              }}
              className="relative"
            >
              {/* Render Section Content */}
              <div>
                {section.render(isPromoted)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
