export type UserRole = 
  | 'SERVICE_MANAGER' 
  | 'SERVICE_ADVISOR' 
  | 'TECHNICIAN' 
  | 'PARTS_SPECIALIST'
  | 'SALES';

export interface User {
  id: string;
  name: string;
  employeeNumber?: string; // Employee number displayed to the right of employee name (e.g. '101', '102')
  email: string;
  password?: string; // Legacy field (deprecated in favor of quick PIN)
  pin?: string; // Quick 4-digit PIN code for individual login
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
  | 'ISSUED_TO_TECH'
  | 'BACKORDERED';

export interface PartItem {
  id: string;
  roId: string;
  partNumber: string;
  description: string;
  name?: string;
  quantity: number;
  status: PartStatus;
  orderedAt?: string;
  estimatedArrival: string; // ISO string or human-readable format
  vendor: string;
  trackingNumber?: string;
  cost?: number;
  price?: number;
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
  userId?: string;
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  vin: string;
  mileage: number;
  licensePlate?: string;
  color?: string;
  engine?: string;
}

export type CustomerContactType = 
  | 'PHONE_CALL' 
  | 'LEFT_VOICEMAIL' 
  | 'SMS' 
  | 'IN_PERSON' 
  | 'EMAIL';

export type CustomerContactOutcome = 
  | 'SPOKE_WITH_CUSTOMER' 
  | 'LEFT_VOICEMAIL' 
  | 'NO_ANSWER' 
  | 'SENT_SMS_UPDATE' 
  | 'CUSTOMER_APPROVED_DELAY' 
  | 'CUSTOMER_REQUESTED_CALLBACK';

export interface CustomerContactRecord {
  id: string;
  timestamp: string; // ISO string
  advisorId: string;
  advisorName: string;
  type: CustomerContactType;
  outcome: CustomerContactOutcome;
  summary: string;
  notes?: string;
  partsEtaDiscussed?: string;
  promisedDateDiscussed?: string;
  nextScheduledContactDate?: string;
}

export type ConcernPayType = 'CUSTOMER_PAY' | 'WARRANTY' | 'INTERNAL';

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
  isWaiter?: boolean;
  promisedTime?: string;
  primaryConcern: string;
  concerns?: string[]; // Multiple customer complaints / line items
  concernPayTypes?: ConcernPayType[]; // Pay type for each customer complaint line item ('CUSTOMER_PAY' | 'WARRANTY' | 'INTERNAL')
  diagnosticNotes?: string;
  cause?: string; // Diagnostic finding: root cause of failure/complaint
  correction?: string; // Repair performed: corrective action taken by technician
  parts: PartItem[];
  messages: Message[];
  recommendations?: RecommendedService[]; // Tech additional requested items (air filter, tires, cabin air, scheduled maint, etc.)
  history: StatusHistory[];
  // Customer Follow-Up & Contact Cadence (Twice-per-week tracking)
  lastContactDate?: string; // Timestamp of last customer touchpoint
  lastContactBy?: string; // Name of advisor/staff who contacted
  lastContactOutcome?: string;
  nextContactDueDate?: string; // ISO date string when next call is due
  contactHistory?: CustomerContactRecord[];
  quote?: RepairQuote;
  timePunches?: WarrantyLaborTimePunch[];
}

export type WarrantyOperationType = 'DIAGNOSTIC' | 'REPAIR' | 'ROAD_TEST' | 'WAITING_PARTS' | 'GENERAL';

export interface WarrantyLaborTimePunch {
  id: string;
  techId: string;
  techName: string;
  techEmployeeNumber?: string;
  clockIn: string; // ISO string
  clockOut?: string; // ISO string (undefined if currently clocked in)
  durationMinutes?: number; // total elapsed minutes
  notes?: string; // e.g. "Pinpoint electrical testing", "Replaced timing belt and tensioner"
  operationType?: WarrantyOperationType;
  manuallyEntered?: boolean;
  createdAt?: string;
}

export type QuoteStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DECLINED';

export interface LaborLineItem {
  id: string;
  description: string;
  laborHours: number;
  hourlyRate: number;
  subtotal: number;
  proDemandLaborGuide?: string;
  techNotes?: string;
}

export interface QuotePartItem {
  id: string;
  description: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sourcePartId?: string;
}

export interface RepairQuote {
  id: string;
  roId: string;
  createdAt: string;
  updatedAt: string;
  initiatedByTechId: string;
  initiatedByTechName: string;
  status: QuoteStatus;
  laborItems: LaborLineItem[];
  partsItems: QuotePartItem[];
  defaultLaborRate: number;
  shopSuppliesFee: number;
  taxRate: number;
  taxAmount: number;
  totalLaborHours: number;
  totalLaborCost: number;
  totalPartsCost: number;
  grandTotal: number;
  techNotes?: string;
  advisorNotes?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  declinedAt?: string;
  declinedReason?: string;
}

export type RecommendedServiceStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface RecommendedService {
  id: string;
  roId: string;
  serviceName: string;
  category: 'AIR_FILTER' | 'CABIN_FILTER' | 'TIRES' | 'SCHEDULED_MAINT' | 'BRAKES' | 'BATTERY' | 'WIPERS' | 'OTHER';
  urgency: 'SAFETY' | 'RECOMMENDED';
  notes?: string;
  status: RecommendedServiceStatus;
  requestedByTechId: string;
  requestedByTechName: string;
  requestedAt: string;
  reviewedByAdvisorId?: string;
  reviewedByAdvisorName?: string;
  reviewedAt?: string;
  declinedReason?: string;
}

export interface ShopChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId?: string; // 'ALL' or undefined for All Team; or user.id for 1-on-1 DM
  recipientName?: string;
  recipientRole?: UserRole;
  content: string;
  timestamp: string;
  roId?: string; // Optional reference to a specific Repair Order #
  isUrgent?: boolean;
}

export interface UrgentNotification {
  id: string;
  roId: string;
  roNumber: string;
  title: string;
  message: string;
  timestamp: string;
  isUrgent: boolean;
  type: 'STATUS_CHANGE' | 'PARTS_UPDATE' | 'NEW_MESSAGE' | 'DISPATCH' | 'RECOMMENDED_SERVICE' | 'SHOP_CHAT' | 'QUOTE_UPDATE';
  read: boolean;
  targetRole?: UserRole;
  targetUserId?: string;
}
