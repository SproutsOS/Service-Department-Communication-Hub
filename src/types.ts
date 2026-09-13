export type UserRole = 
  | 'SERVICE_MANAGER' 
  | 'SERVICE_ADVISOR' 
  | 'TECHNICIAN' 
  | 'PARTS_SPECIALIST';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Password for individual login
  pin?: string; // 4-digit PIN or password for individual login
  role: UserRole;
  avatar: string;
  certificationLevel?: string; // e.g. 'Master Certified', 'ASE Master Tech', 'A-Level Tech', 'B-Level Tech', 'L1 Advanced Diagnostics'
  bayNumber?: string; // Kept for backwards compatibility if needed
  title: string;
  phone?: string;
  activeROCount?: number;
  isDeactivated?: boolean;
}

export type ROStatus = 
  // User Requested Ticket Flow
  | 'WAITING_DIAGNOSTICS'
  | 'IN_DIAG'
  | 'ESTIMATE_DONE'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'DENIED'
  | 'PARTS_ORDERED'
  | 'PARTS_IN_TO_TECH'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETE'
  | 'READY_FOR_PICKUP'
  | 'CLOSED'
  // Legacy aliases for seamless backwards compatibility
  | 'CREATED'
  | 'DISPATCHED'
  | 'WAITING_DIAGNOSIS'
  | 'BEING_DIAGNOSED'
  | 'GETTING_ESTIMATE'
  | 'IN_BAY'
  | 'WAITING_APPROVAL'
  | 'WAITING_PARTS'
  | 'IN_REPAIR'
  | 'QC_TEST'
  | 'COMPLETED';

export type PartStatus = 
  | 'REQUESTED' 
  | 'ORDERED' 
  | 'IN_TRANSIT' 
  | 'RECEIVED' 
  | 'ISSUED_TO_TECH';

export interface PartItem {
  id: string;
  roId: string;
  partNumber: string;
  description: string;
  quantity: number;
  status: PartStatus;
  orderedAt?: string;
  estimatedArrival: string; // ISO string or human-readable format
  vendor: string;
  trackingNumber?: string;
  cost?: number;
  notes?: string;
}

export interface Message {
  id: string;
  roId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  isUrgent?: boolean;
}

export interface StatusHistory {
  id: string;
  status: ROStatus;
  updatedBy: string;
  updatedByName: string;
  userRole: UserRole;
  timestamp: string;
  notes?: string;
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  vin: string;
  mileage: number;
  licensePlate?: string;
  color?: string;
}

export interface RepairOrder {
  id: string; // e.g. "RO-8821"
  customerName: string;
  customerPhone: string;
  vehicle: VehicleInfo;
  createdAt: string; // Date repair order was made
  advisorId: string;
  advisorName: string;
  techId?: string;
  techName?: string;
  dispatchedAt?: string; // When assigned
  bay?: string;
  status: ROStatus;
  waitingDiagnosisAt?: string; // Timestamp when vehicle began waiting for diagnosis
  diagnosisStartedAt?: string; // Timestamp when technician began active diagnosis
  isUrgent: boolean;
  promisedTime?: string;
  primaryConcern: string;
  diagnosticNotes?: string;
  parts: PartItem[];
  messages: Message[];
  history: StatusHistory[];
}

export interface UrgentNotification {
  id: string;
  roId: string;
  roNumber: string;
  title: string;
  message: string;
  timestamp: string;
  isUrgent: boolean;
  type: 'STATUS_CHANGE' | 'PARTS_UPDATE' | 'NEW_MESSAGE' | 'DISPATCH';
  read: boolean;
  targetRole?: UserRole;
  targetUserId?: string;
}
