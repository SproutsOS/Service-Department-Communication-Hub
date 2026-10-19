import { User, RepairOrder, SpecialPartNumber, ImportantNumberEntry, ManagerPasswordEntry, RecallWaitingEntry, InternalExtensionEntry } from '../types';

export const STANDARD_JOB_TITLES: string[] = [
  'Oil Bay',
  'Oil Bay Tech',
  'PDI Tech',
  'UCI Tech',
  'Master Diagnostic Technician',
  'ASE Master Tech',
  'A-Level Technician',
  'B-Level Technician',
  'C-Level Technician',
  'Lube / Express Tech',
  'Service Advisor',
  'Senior Service Advisor',
  'Parts Specialist',
  'Parts Manager',
  'Service Manager',
  'Shop Foreman',
  'Quality Control Inspector',
  'Warranty Administrator'
];

export const STANDARD_CERTIFICATION_LEVELS: string[] = [
  'Oil Bay',
  'PDI Tech',
  'UCI Tech',
  'Master Tech',
  'ASE Master Tech',
  'A-Level Tech',
  'B-Level Tech',
  'C-Level Tech',
  'L1 Advanced Diagnostics',
  'EV / Hybrid Certified',
  'Diesel Master Specialist',
  'Factory Certified Master',
  'Express Lube'
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_mgr_1',
    name: 'Service Manager',
    employeeNumber: '100',
    email: 'admin@precisionauto.com',
    pin: '1234',
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
    key: 'DIAG_PAUSED',
    label: 'Diag Paused',
    shortLabel: 'Diag Paused',
    stepNumber: 2,
    badgeClass: 'bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-yellow-300',
    borderClass: 'border-yellow-400',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-800',
    icon: 'PauseCircle',
    description: 'Diagnosis paused pending customer info, parts, or tech break',
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
    badgeClass: 'bg-red-600 text-white text-[10px] font-black rounded-full uppercase px-2.5 py-0.5 border border-red-700 animate-pulse shadow-xs',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700 font-bold',
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
    description: 'Parts arrived at shop and handed off to technician',
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
    description: 'Technician actively performing repairs and assembly',
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
  DIAG_PAUSED: {
    label: 'Diag Paused',
    badgeClass: 'bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-yellow-300',
    borderClass: 'border-yellow-400',
    icon: 'PauseCircle',
    description: 'Diagnosis paused pending customer info, parts, or tech break',
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
    badgeClass: 'bg-red-600 text-white text-[10px] font-black rounded-full uppercase px-2.5 py-0.5 border border-red-700 animate-pulse shadow-xs',
    borderClass: 'border-red-500',
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
    description: 'Parts arrived at shop and handed off to technician',
  },
  REPAIR_IN_PROGRESS: {
    label: 'Repair in Progress',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'Play',
    description: 'Technician actively performing repairs and assembly',
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
    description: 'Assigned to technician, awaiting diagnostics',
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
    description: 'Active diagnosis or teardown underway',
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
    description: 'Parts in hand, repair underway',
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
    case 'DIAG_PAUSED':
    case 'PAUSED_DIAG':
    case 'DIAGNOSTIC_PAUSED':
      return 'DIAG_PAUSED';
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

export const INITIAL_SPECIAL_PARTS: SpecialPartNumber[] = [
  { id: 'sp_1', category: 'Oil Filters', name: '3.6L / 3.2L Oil Filter Cartridge', partNumber: '68191349AC', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_2', category: 'Oil Filters', name: '5.7L Hemi Spin-On Oil Filter', partNumber: '04884899AC', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_3', category: 'Drain Plugs & Gaskets', name: 'Oil Pan Drain Plug Gasket 14mm', partNumber: '6506214AA', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_4', category: 'Cabin & Air Filters', name: 'Cabin Air Filter (Grand Cherokee / Durango)', partNumber: '68079487AB', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_5', category: 'Batteries & Key Fobs', name: 'Key Fob Battery (CR2032 3V Lithium)', partNumber: 'CR2032-OEM', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_IMPORTANT_NUMBERS: ImportantNumberEntry[] = [
  { id: 'in_1', category: 'Warranty Hotlines', name: 'Mopar Digital Warranty Helpdesk', number: '1-800-442-2666', notes: 'Claims & Prior Authorization (8am - 8pm EST)', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_2', category: 'Diagnostic Support', name: 'WiTECH 2.0 Diagnostic Helpdesk', number: '1-888-948-3241', notes: 'Micropod II registration & software help', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_3', category: 'Parts & Couriers', name: 'Local Parts Depot Courier Dispatch', number: '(555) 321-4490', notes: 'Daily afternoon run cutoff at 2:30 PM', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_4', category: 'Towing & Sublet', name: 'Dealership Priority Flatbed Towing', number: '(555) 882-9100', notes: 'Account #9042, 24/7 Service Drive dispatch', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_5', category: 'Sublet Vendors', name: 'SafeGlass Mobile Windshield Sublet', number: '(555) 774-1299', notes: 'Camera ADAS calibration on site', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_MANAGER_PASSWORDS: ManagerPasswordEntry[] = [
  { id: 'pw_1', category: 'OEM Portals', title: 'DealerConnect (Stellantis / Mopar)', username: 'S9042_MGR', password: 'DC*Service2026!', websiteUrl: 'https://dealerconnect.chrysler.com', notes: 'Service & Parts administration portal', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_2', category: 'Diagnostic Tools', title: 'WiTECH 2.0 Cloud Diagnostic', username: 'wo_service_lead', password: 'WiTech#Pass4491', websiteUrl: 'https://login.witechcloud.com', notes: 'Vehicle flash and ECU configuration', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_3', category: 'Estimating & Labor', title: 'ProDemand / Mitchell 1', username: 'woolwine_advisor', password: 'ProDemand2026!', websiteUrl: 'https://www.prodemand.com', notes: 'Flat rate labor times & OEM procedures', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_4', category: 'Tire Program', title: 'Mopar National Tire Program', username: 'woolwine_tires', password: 'TireOrder#9042', websiteUrl: 'https://www.tirerackdealer.com', notes: 'OEM tire price match & distributor stock', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_RECALL_WAITING_LIST: RecallWaitingEntry[] = [
  {
    id: 'rec_1',
    customerName: 'Michael Henderson',
    vin: '1C4HJXDG8MW681240',
    partNumber: '68518241AA',
    datePutOnList: '2026-08-15',
    phoneNumber: '(555) 234-8910',
    dateCalled: '2026-09-02',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2021 Jeep Wrangler 3.0L EcoDiesel HPFP fuel pump kit',
    status: 'WAITING_ON_PART',
    createdAt: '2026-08-15T10:30:00Z',
    updatedAt: '2026-09-02T14:15:00Z'
  },
  {
    id: 'rec_6',
    customerName: 'Thomas Vance',
    vin: '1C4JJXR62MW719034',
    partNumber: '68518241AA',
    datePutOnList: '2026-08-28',
    phoneNumber: '(555) 345-6712',
    dateCalled: '',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2021 Jeep Gladiator 3.0L EcoDiesel HPFP fuel pump kit',
    status: 'WAITING_ON_PART',
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'rec_7',
    customerName: 'Daniel Clark',
    vin: '1C4HJXDG4NW110823',
    partNumber: '68518241AA',
    datePutOnList: '2026-09-18',
    phoneNumber: '(555) 456-7890',
    dateCalled: '2026-10-12',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2022 Jeep Wrangler EcoDiesel high pressure fuel pump',
    status: 'PART_ARRIVED',
    createdAt: '2026-09-18T11:20:00Z',
    updatedAt: '2026-10-12T09:30:00Z'
  },
  {
    id: 'rec_2',
    customerName: 'Brenda Collins',
    vin: '3C6UR5FL8NG219455',
    partNumber: '68374981AC',
    datePutOnList: '2026-09-05',
    phoneNumber: '(555) 412-7801',
    dateCalled: '',
    recallNumber: '04A',
    campaignCode: '04A',
    notes: '2022 Ram 2500 Cummins intake heater grid relay',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-05T09:15:00Z',
    updatedAt: '2026-09-05T09:15:00Z'
  },
  {
    id: 'rec_8',
    customerName: 'Gregory Scott',
    vin: '3C6UR5DL7MG640192',
    partNumber: '68374981AC',
    datePutOnList: '2026-09-29',
    phoneNumber: '(555) 567-8901',
    dateCalled: '',
    recallNumber: '04A',
    campaignCode: '04A',
    notes: '2021 Ram 3500 Cummins 6.7L intake heater relay',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-29T15:45:00Z',
    updatedAt: '2026-09-29T15:45:00Z'
  },
  {
    id: 'rec_3',
    customerName: 'David Kowalski',
    vin: '2C3CDXHG5NH190342',
    partNumber: '68249821AD',
    datePutOnList: '2026-09-22',
    phoneNumber: '(555) 890-3344',
    dateCalled: '2026-10-05',
    recallNumber: 'V07',
    campaignCode: 'V07',
    notes: '2022 Dodge Charger steering column wire harness bracket',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-22T11:45:00Z',
    updatedAt: '2026-10-05T16:20:00Z'
  },
  {
    id: 'rec_4',
    customerName: 'Sarah Jenkins',
    vin: '1C4PJLCB4KD382109',
    partNumber: '68493120AA',
    datePutOnList: '2026-10-01',
    phoneNumber: '(555) 671-9022',
    dateCalled: '2026-10-14',
    recallNumber: 'W12',
    campaignCode: 'W12',
    notes: '2019 Jeep Cherokee power liftgate module & latch',
    status: 'PART_ARRIVED',
    createdAt: '2026-10-01T14:00:00Z',
    updatedAt: '2026-10-14T11:30:00Z'
  },
  {
    id: 'rec_5',
    customerName: 'Robert Martinez',
    vin: '1C6SRFHT8NN340192',
    partNumber: '68541290AB',
    datePutOnList: '2026-10-10',
    phoneNumber: '(555) 789-1123',
    dateCalled: '',
    recallNumber: '24B',
    campaignCode: '24B',
    notes: '2022 Ram 1500 rearview camera central vision module',
    status: 'WAITING_ON_PART',
    createdAt: '2026-10-10T16:10:00Z',
    updatedAt: '2026-10-10T16:10:00Z'
  }
];

export const INITIAL_INTERNAL_EXTENSIONS: InternalExtensionEntry[] = [
  // Service Department
  {
    id: 'ext_1',
    name: 'Service Manager Desk',
    extension: '201',
    department: 'Service',
    title: 'Service Manager',
    directPhone: '(555) 330-2201',
    notes: 'Direct office line & dispatch escalation',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_2',
    name: 'Mark Reynolds',
    extension: '202',
    department: 'Service',
    title: 'Lead Service Advisor',
    directPhone: '(555) 330-2202',
    notes: 'Lane 1 - Truck & Diesel Specialist',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_3',
    name: 'Rachel Adams',
    extension: '203',
    department: 'Service',
    title: 'Service Advisor',
    directPhone: '(555) 330-2203',
    notes: 'Lane 2 - Express & Maintenance',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_4',
    name: 'Shop Foreman (Tech Floor)',
    extension: '210',
    department: 'Service',
    title: 'Shop Foreman / Diagnostics',
    notes: 'Main shop floor desk & diagnostic lead',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_5',
    name: 'Service BDC & Appointments',
    extension: '215',
    department: 'Service',
    title: 'BDC Appointment Coordinator',
    directPhone: '(555) 330-2215',
    notes: 'Inbound customer appointments & recall checks',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_6',
    name: 'Warranty Administrator',
    extension: '218',
    department: 'Service',
    title: 'Warranty Clerk',
    notes: 'OEM claim submissions & pre-authorizations',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Parts Department
  {
    id: 'ext_7',
    name: 'Parts Front Counter',
    extension: '301',
    department: 'Parts',
    title: 'Retail Counter Specialist',
    directPhone: '(555) 330-2301',
    notes: 'Retail customers, batteries, accessories',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_8',
    name: 'Parts Back Counter (Tech Window)',
    extension: '302',
    department: 'Parts',
    title: 'Shop Parts Specialist',
    notes: 'Direct technician parts requests & RO issue window',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_9',
    name: 'Parts Manager Desk',
    extension: '300',
    department: 'Parts',
    title: 'Parts Department Director',
    directPhone: '(555) 330-2300',
    notes: 'Vendor accounts & special purchase orders',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_10',
    name: 'Wholesale Parts Desk',
    extension: '310',
    department: 'Parts',
    title: 'Wholesale Logistics',
    directPhone: '(555) 330-2310',
    notes: 'Body shop & independent repair facility orders',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_11',
    name: 'Parts Shipping & Receiving',
    extension: '305',
    department: 'Parts',
    title: 'Warehouse & Receiving',
    notes: 'Stock check-in, freight deliveries & VOR check-in',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Sales Department
  {
    id: 'ext_12',
    name: 'Sales Desk / Desk Manager',
    extension: '101',
    department: 'Sales',
    title: 'Sales Desk Manager',
    directPhone: '(555) 330-2101',
    notes: 'Appraisals, trade-ins, sales floor oversight',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_13',
    name: 'Finance & Insurance (F&I Office)',
    extension: '105',
    department: 'Sales',
    title: 'Finance Director',
    directPhone: '(555) 330-2105',
    notes: 'Contracts, warranties, customer financing',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_14',
    name: 'Internet Sales / BDC',
    extension: '110',
    department: 'Sales',
    title: 'BDC Director',
    directPhone: '(555) 330-2110',
    notes: 'Web leads, phone sales inquiries',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Accounting & Office
  {
    id: 'ext_15',
    name: 'Main Cashier & Reception',
    extension: '401',
    department: 'Accounting / Office',
    title: 'Service Cashier',
    directPhone: '(555) 330-2401',
    notes: 'Customer payment processing, key release & loaner check-in',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_16',
    name: 'Title & Registration Office',
    extension: '405',
    department: 'Accounting / Office',
    title: 'Title Clerk',
    notes: 'Tag & title processing, DMV paperwork',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_17',
    name: 'Office Manager / Controller',
    extension: '410',
    department: 'Accounting / Office',
    title: 'Dealership Controller',
    directPhone: '(555) 330-2410',
    notes: 'Payroll, accounts payable & financial records',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Management
  {
    id: 'ext_18',
    name: 'General Manager',
    extension: '100',
    department: 'Management',
    title: 'General Manager',
    directPhone: '(555) 330-2100',
    notes: 'Dealership Executive Office',
    createdAt: '2026-01-01T08:00:00Z'
  }
];

