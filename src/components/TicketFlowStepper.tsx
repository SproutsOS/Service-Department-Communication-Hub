import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Package, 
  Truck, 
  Play, 
  Car, 
  CheckCheck, 
  ArrowRight,
  Send,
  Calendar
} from 'lucide-react';
import { ROStatus, RepairOrder } from '../types';
import { normalizeROStatus, STATUS_CONFIG } from '../data/mockData';

interface TicketFlowStepperProps {
  ro: RepairOrder;
  onUpdateStatus: (newStatus: ROStatus, notes?: string, isUrgent?: boolean) => void;
  canEdit?: boolean;
}

interface StepItem {
  id: string;
  key: ROStatus;
  label: string;
  shortLabel: string;
  stepNumber: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isDecision?: boolean; // For APPROVED / DENIED
  decisionOptions?: { status: ROStatus; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[];
}

const FLOW_STEPS: StepItem[] = [
  {
    id: 'step-1',
    key: 'WAITING_DIAGNOSTICS',
    label: 'Waiting Diagnostics',
    shortLabel: 'Waiting Diag',
    stepNumber: 1,
    icon: Clock,
    description: 'Vehicle queued & awaiting technician diagnostic inspection',
  },
  {
    id: 'step-2',
    key: 'IN_DIAG',
    label: 'In Diag',
    shortLabel: 'In Diag',
    stepNumber: 2,
    icon: Wrench,
    description: 'Technician actively scanning, diagnosing, and inspecting',
  },
  {
    id: 'step-3',
    key: 'ESTIMATE_DONE',
    label: 'Estimate Done',
    shortLabel: 'Estimate Done',
    stepNumber: 3,
    icon: Calculator,
    description: 'Diagnosis completed; parts and labor estimate drafted',
  },
  {
    id: 'step-4',
    key: 'WAITING_FOR_APPROVAL',
    label: 'Waiting for Approval',
    shortLabel: 'Waiting Approval',
    stepNumber: 4,
    icon: AlertTriangle,
    description: 'Estimate submitted to customer; awaiting authorization',
  },
  {
    id: 'step-5',
    key: 'APPROVED',
    label: 'Approved / Denied',
    shortLabel: 'Approved / Denied',
    stepNumber: 5,
    icon: CheckCircle2,
    description: 'Customer approval decision on recommended work',
    isDecision: true,
    decisionOptions: [
      { status: 'APPROVED', label: 'Approved', color: 'bg-emerald-600 hover:bg-emerald-500 text-white', icon: CheckCircle2 },
      { status: 'DENIED', label: 'Denied', color: 'bg-rose-600 hover:bg-rose-500 text-white', icon: XCircle }
    ]
  },
  {
    id: 'step-6',
    key: 'PARTS_ORDERED',
    label: 'Parts Ordered (ETA)',
    shortLabel: 'Parts Ordered (ETA)',
    stepNumber: 6,
    icon: Package,
    description: 'Parts on order with tracking and estimated time of arrival',
  },
  {
    id: 'step-7',
    key: 'PARTS_IN_TO_TECH',
    label: 'Parts In / To Tech',
    shortLabel: 'Parts In / To Tech',
    stepNumber: 7,
    icon: Truck,
    description: 'Parts arrived at shop and handed off to technician',
  },
  {
    id: 'step-8',
    key: 'REPAIR_IN_PROGRESS',
    label: 'Repair in Progress',
    shortLabel: 'Repair in Progress',
    stepNumber: 8,
    icon: Play,
    description: 'Technician actively performing repairs and assembly',
  },
  {
    id: 'step-9',
    key: 'REPAIR_COMPLETE',
    label: 'Repair Complete',
    shortLabel: 'Repair Complete',
    stepNumber: 9,
    icon: CheckCircle,
    description: 'Repair work finished, test drive & inspection completed',
  },
  {
    id: 'step-10',
    key: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    shortLabel: 'Ready for Pickup',
    stepNumber: 10,
    icon: Car,
    description: 'Vehicle staged in front lot, customer notified for pickup',
  },
  {
    id: 'step-11',
    key: 'CLOSED',
    label: 'Closed',
    shortLabel: 'Closed',
    stepNumber: 11,
    icon: CheckCheck,
    description: 'Invoice settled, keys returned, repair order archived',
  },
];

export const TicketFlowStepper: React.FC<TicketFlowStepperProps> = ({
  ro,
  onUpdateStatus,
  canEdit = true
}) => {
  const currentNormalized = normalizeROStatus(ro.status);
  const [note, setNote] = useState('');
  const [urgentCheck, setUrgentCheck] = useState(false);
  const [customEta, setCustomEta] = useState('');

  // Find step index
  const getStepIndex = (status: string) => {
    if (status === 'APPROVED' || status === 'DENIED') return 4;
    return FLOW_STEPS.findIndex(s => s.key === status);
  };

  const currentIndex = getStepIndex(currentNormalized);
  const currentStep = FLOW_STEPS[currentIndex >= 0 ? currentIndex : 0];

  // Determine next step
  const getNextStatus = (): ROStatus | null => {
    if (currentNormalized === 'CLOSED') return null;
    if (currentNormalized === 'WAITING_FOR_APPROVAL') return 'APPROVED';
    if (currentNormalized === 'DENIED') return 'READY_FOR_PICKUP';
    if (currentIndex >= 0 && currentIndex < FLOW_STEPS.length - 1) {
      return FLOW_STEPS[currentIndex + 1].key;
    }
    return null;
  };

  const nextStatus = getNextStatus();

  const handleAdvance = (targetStatus: ROStatus, customNote?: string) => {
    const finalNote = customNote || note || `Advanced ticket to ${STATUS_CONFIG[targetStatus]?.label || targetStatus}`;
    onUpdateStatus(targetStatus, finalNote, urgentCheck);
    setNote('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Top Banner with Flow Pipeline & Current Stage Combined */}
      <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1.5">
            <span>Ticket Workflow Pipeline</span>
            <span className="text-slate-500">•</span>
            <span>Stage {currentStep.stepNumber} of 11</span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
            <span>Current Stage:</span>
            <span className="text-blue-400">
              {currentStep.label}
            </span>
            {ro.status === 'DENIED' && (
              <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-full border border-rose-500/40">
                Estimate Declined
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {currentStep.description}
          </p>
        </div>

        {/* Action Controls: Quick Advance or Approval Decisions or ETA */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {/* Decision Buttons for Approval Step */}
          {currentStep.isDecision && canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdvance('APPROVED', 'Customer approved estimate via phone / authorization')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  ro.status === 'APPROVED' 
                    ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Customer Approved</span>
              </button>

              <button
                onClick={() => handleAdvance('DENIED', 'Customer declined repair estimate')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  ro.status === 'DENIED' 
                    ? 'bg-rose-700 text-white ring-2 ring-rose-400' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Customer Denied</span>
              </button>
            </div>
          )}

          {/* Parts Ordered (ETA) Input Shortcut */}
          {currentNormalized === 'PARTS_ORDERED' && canEdit && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Parts ETA (e.g. Today 2 PM)"
                  value={customEta}
                  onChange={e => setCustomEta(e.target.value)}
                  className="text-xs outline-none w-36 sm:w-44 text-white placeholder:text-slate-500 bg-transparent font-medium"
                />
              </div>
              <button
                onClick={() => {
                  if (customEta.trim()) {
                    handleAdvance('PARTS_ORDERED', `Parts ETA updated: ${customEta.trim()}`);
                    setCustomEta('');
                  }
                }}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Save ETA
              </button>
            </div>
          )}

          {/* Quick Advance Button if available and not decision */}
          {canEdit && nextStatus && !currentStep.isDecision && (
            <button
              onClick={() => handleAdvance(nextStatus)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow-md"
              title={`Advance to ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`}
            >
              <span>Advance to {STATUS_CONFIG[nextStatus]?.label || nextStatus}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1-Click Jump to Stage Picker & Status Notes */}
      <div className="p-4 bg-white space-y-3">
        {canEdit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Jump to Stage (1-Click Advance):
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Stage {currentStep.stepNumber} of 11 Active
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {FLOW_STEPS.map((s, idx) => {
                const isCurrent = currentNormalized === s.key;
                const isCompleted = currentIndex > idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleAdvance(s.key)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-xs font-bold'
                        : isCompleted
                        ? 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 border-emerald-300 font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-500 font-medium'
                    }`}
                    title={`${s.stepNumber}. ${s.label}: ${s.description}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{s.stepNumber}. {s.shortLabel}</span>
                      {isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional Note & Urgent Push */}
            <div className="mt-3 pt-3 border-t-2 border-slate-300 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                placeholder="Optional note for status change history (e.g. scan complete, parts received)..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={urgentCheck}
                  onChange={e => setUrgentCheck(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 border-2 border-slate-600"
                />
                <span className="font-semibold text-red-600 text-xs">Notify Urgent</span>
              </label>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
