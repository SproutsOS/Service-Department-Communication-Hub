import { User, RepairOrder } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_mgr_1',
    name: 'Service Manager',
    email: 'admin@precisionauto.com',
    pin: '1234',
    password: 'admin',
    role: 'SERVICE_MANAGER',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Service Manager',
    phone: '',
  },
];

export const INITIAL_REPAIR_ORDERS: RepairOrder[] = [];

export interface FlowStepConfig {
  key: string;
  label: string;
  shortLabel: string;
  stepNumber: number;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  icon: string;
  description: string;
}

export const TICKET_FLOW_STEPS: FlowStepConfig[] = [
  {
    key: 'WAITING_DIAGNOSTICS',
    label: 'Waiting Diagnostics',
    shortLabel: 'Waiting Diag',
    stepNumber: 1,
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  {
    key: 'IN_DIAG',
    label: 'In Diag',
    shortLabel: 'In Diag',
    stepNumber: 2,
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-800',
    icon: 'Wrench',
    description: 'Technician actively scanning, diagnosing, and inspecting',
  },
  {
    key: 'ESTIMATE_DONE',
    label: 'Estimate Done',
    shortLabel: 'Estimate Done',
    stepNumber: 3,
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-800',
    icon: 'Calculator',
    description: 'Diagnosis completed, parts and labor estimate calculated',
  },
  {
    key: 'WAITING_FOR_APPROVAL',
    label: 'Waiting for Approval',
    shortLabel: 'Waiting Approval',
    stepNumber: 4,
    badgeClass: 'bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-300 animate-pulse',
    borderClass: 'border-orange-400',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-800',
    icon: 'AlertTriangle',
    description: 'Estimate submitted to customer, awaiting authorization',
  },
  {
    key: 'APPROVED',
    label: 'Approved',
    shortLabel: 'Approved',
    stepNumber: 5,
    badgeClass: 'bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-emerald-300',
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    icon: 'CheckCircle2',
    description: 'Customer approved estimate, cleared to proceed',
  },
  {
    key: 'DENIED',
    label: 'Denied',
    shortLabel: 'Denied',
    stepNumber: 5,
    badgeClass: 'bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-rose-300',
    borderClass: 'border-rose-400',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    icon: 'XCircle',
    description: 'Customer declined or held repairs',
  },
  {
    key: 'PARTS_ORDERED',
    label: 'Parts Ordered (ETA)',
    shortLabel: 'Parts Ordered (ETA)',
    stepNumber: 6,
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    icon: 'Package',
    description: 'Parts ordered and tracking live ETA arrival',
  },
  {
    key: 'PARTS_IN_TO_TECH',
    label: 'Parts In / To Tech',
    shortLabel: 'Parts In / To Tech',
    stepNumber: 7,
    badgeClass: 'bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-teal-300',
    borderClass: 'border-teal-400',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-800',
    icon: 'Truck',
    description: 'Parts arrived at shop and handed off to technician bay',
  },
  {
    key: 'REPAIR_IN_PROGRESS',
    label: 'Repair in Progress',
    shortLabel: 'In Progress',
    stepNumber: 8,
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-800',
    icon: 'Play',
    description: 'Technician actively performing repairs and assembly in bay',
  },
  {
    key: 'REPAIR_COMPLETE',
    label: 'Repair Complete',
    shortLabel: 'Repair Complete',
    stepNumber: 9,
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    bgClass: 'bg-green-50',
    textClass: 'text-green-800',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  {
    key: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    shortLabel: 'Ready for Pickup',
    stepNumber: 10,
    badgeClass: 'bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-sky-300',
    borderClass: 'border-sky-400',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    icon: 'Car',
    description: 'Vehicle staged in front lot, customer notified for pickup',
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    shortLabel: 'Closed',
    stepNumber: 11,
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    icon: 'CheckCheck',
    description: 'Invoice settled, keys released, repair order archived',
  },
];

export const STATUS_CONFIG: Record<
  string, 
  { label: string; badgeClass: string; borderClass: string; icon: string; description: string }
> = {
  // Primary User Requested Workflow
  WAITING_DIAGNOSTICS: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  IN_DIAG: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Technician actively scanning, diagnosing, and inspecting',
  },
  ESTIMATE_DONE: {
    label: 'Estimate Done',
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    icon: 'Calculator',
    description: 'Diagnosis completed, parts and labor estimate calculated',
  },
  WAITING_FOR_APPROVAL: {
    label: 'Waiting for Approval',
    badgeClass: 'bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-300 animate-pulse',
    borderClass: 'border-orange-400',
    icon: 'AlertTriangle',
    description: 'Estimate submitted to customer, awaiting authorization',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-emerald-300',
    borderClass: 'border-emerald-400',
    icon: 'CheckCircle2',
    description: 'Customer approved estimate, cleared to proceed',
  },
  DENIED: {
    label: 'Denied',
    badgeClass: 'bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-rose-300',
    borderClass: 'border-rose-400',
    icon: 'XCircle',
    description: 'Customer declined or held repairs',
  },
  PARTS_ORDERED: {
    label: 'Parts Ordered (ETA)',
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    icon: 'Package',
    description: 'Parts ordered and tracking live ETA arrival',
  },
  PARTS_IN_TO_TECH: {
    label: 'Parts In / To Tech',
    badgeClass: 'bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-teal-300',
    borderClass: 'border-teal-400',
    icon: 'Truck',
    description: 'Parts arrived at shop and handed off to technician bay',
  },
  REPAIR_IN_PROGRESS: {
    label: 'Repair in Progress',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'Play',
    description: 'Technician actively performing repairs and assembly in bay',
  },
  REPAIR_COMPLETE: {
    label: 'Repair Complete',
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    badgeClass: 'bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-sky-300',
    borderClass: 'border-sky-400',
    icon: 'Car',
    description: 'Vehicle staged in front lot, customer notified for pickup',
  },
  CLOSED: {
    label: 'Closed',
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    icon: 'CheckCheck',
    description: 'Invoice settled, keys released, repair order archived',
  },

  // Backward-compatibility aliases
  CREATED: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  DISPATCHED: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Assigned to technician bay, awaiting diagnostics',
  },
  WAITING_DIAGNOSIS: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle staged in queue, awaiting diagnosis',
  },
  BEING_DIAGNOSED: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Technician actively running diagnostics / scans',
  },
  IN_BAY: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Active diagnosis or teardown in bay',
  },
  GETTING_ESTIMATE: {
    label: 'Estimate Done',
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    icon: 'Calculator',
    description: 'Diagnosis complete, preparing parts & labor estimate',
  },
  WAITING_APPROVAL: {
    label: 'Waiting for Approval',
    badgeClass: 'bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-300 animate-pulse',
    borderClass: 'border-orange-400',
    icon: 'AlertTriangle',
    description: 'Estimate sent, awaiting customer sign-off',
  },
  WAITING_PARTS: {
    label: 'Parts Ordered (ETA)',
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    icon: 'Package',
    description: 'Parts ordered, tracking arrival',
  },
  IN_REPAIR: {
    label: 'Repair in Progress',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'Play',
    description: 'Parts in hand, repair underway in bay',
  },
  QC_TEST: {
    label: 'Repair Complete',
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  COMPLETED: {
    label: 'Closed',
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    icon: 'CheckCheck',
    description: 'Vehicle ready or customer picked up',
  },
};

export function normalizeROStatus(status: string): string {
  switch (status) {
    case 'CREATED':
    case 'DISPATCHED':
    case 'WAITING_DIAGNOSIS':
    case 'WAITING_DIAGNOSTICS':
      return 'WAITING_DIAGNOSTICS';
    case 'BEING_DIAGNOSED':
    case 'IN_BAY':
    case 'IN_DIAG':
      return 'IN_DIAG';
    case 'GETTING_ESTIMATE':
    case 'ESTIMATE_DONE':
      return 'ESTIMATE_DONE';
    case 'WAITING_APPROVAL':
    case 'WAITING_FOR_APPROVAL':
      return 'WAITING_FOR_APPROVAL';
    case 'APPROVED':
      return 'APPROVED';
    case 'DENIED':
      return 'DENIED';
    case 'WAITING_PARTS':
    case 'PARTS_ORDERED':
      return 'PARTS_ORDERED';
    case 'PARTS_IN_TO_TECH':
      return 'PARTS_IN_TO_TECH';
    case 'IN_REPAIR':
    case 'REPAIR_IN_PROGRESS':
      return 'REPAIR_IN_PROGRESS';
    case 'QC_TEST':
    case 'REPAIR_COMPLETE':
      return 'REPAIR_COMPLETE';
    case 'READY_FOR_PICKUP':
      return 'READY_FOR_PICKUP';
    case 'COMPLETED':
    case 'CLOSED':
      return 'CLOSED';
    default:
      return status || 'WAITING_DIAGNOSTICS';
  }
}
