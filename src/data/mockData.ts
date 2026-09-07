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

export const STATUS_CONFIG: Record<
  string, 
  { label: string; badgeClass: string; borderClass: string; icon: string; description: string }
> = {
  CREATED: {
    label: 'Order Created',
    badgeClass: 'bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-200',
    borderClass: 'border-slate-300',
    icon: 'FileText',
    description: 'Awaiting assignment to technician',
  },
  DISPATCHED: {
    label: 'Assigned',
    badgeClass: 'bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-200',
    borderClass: 'border-blue-400',
    icon: 'Send',
    description: 'Assigned to tech, awaiting rack',
  },
  WAITING_DIAGNOSIS: {
    label: 'Waiting Diagnosis',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle staged in queue, awaiting diagnosis',
  },
  BEING_DIAGNOSED: {
    label: 'Being Diagnosed',
    badgeClass: 'bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-200',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Technician actively running diagnostics / scans',
  },
  GETTING_ESTIMATE: {
    label: 'Getting Estimate',
    badgeClass: 'bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-200',
    borderClass: 'border-indigo-400',
    icon: 'Calculator',
    description: 'Diagnosis complete, preparing parts & labor estimate',
  },
  IN_BAY: {
    label: 'Being Diagnosed',
    badgeClass: 'bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-200',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Active diagnosis or teardown in bay',
  },
  WAITING_APPROVAL: {
    label: 'Needs Approval',
    badgeClass: 'bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-200 animate-pulse',
    borderClass: 'border-orange-400',
    icon: 'AlertTriangle',
    description: 'Estimate sent, awaiting customer sign-off',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-teal-300',
    borderClass: 'border-teal-400',
    icon: 'CheckCircle2',
    description: 'Estimate approved by customer, clearing for repair',
  },
  WAITING_PARTS: {
    label: 'Awaiting Parts',
    badgeClass: 'bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-200',
    borderClass: 'border-orange-400',
    icon: 'Package',
    description: 'Parts ordered, tracking arrival',
  },
  IN_REPAIR: {
    label: 'In Repair',
    badgeClass: 'bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-emerald-200',
    borderClass: 'border-emerald-400',
    icon: 'Play',
    description: 'Parts in hand, reassembly underway',
  },
  QC_TEST: {
    label: 'Quality Check/Test Drive',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'CheckCircle',
    description: 'Quality inspection and verification test drive',
  },
  COMPLETED: {
    label: 'Ready / Done',
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-200',
    borderClass: 'border-green-500',
    icon: 'CheckCheck',
    description: 'Vehicle parked in staging, ready for customer',
  },
};
