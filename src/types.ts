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

export type PredefinedPartStatus = 
  | 'IN_STOCK'
  | 'LOCAL_PURCHASE'
  | 'DAILY_ORDER'
  | 'SPECIAL_ORDER_1_5_DAYS'
  | 'SPECIAL_ORDER'
  | 'VOR_UPGRADE'
  | 'REQUESTED' 
  | 'QUOTE_ONLY'
  | 'ORDERED' 
  | 'IN_TRANSIT' 
  | 'RECEIVED' 
  | 'ISSUED_TO_TECH'
  | 'BACKORDERED';

export type PartStatus = PredefinedPartStatus | (string & {});

export interface PartItem {
  id: string;
  roId: string;
  partNumber: string;
  description: string;
  name?: string;
  quantity: number;
  status: PartStatus;
  requestType?: 'ORDER_NOW' | 'QUOTE_ONLY'; // Whether technician requests immediate order or pricing quote only
  orderedAt?: string;
  estimatedArrival: string; // ISO string or human-readable format
  vendor: string;
  trackingNumber?: string;
  cost?: number;
  price?: number;
  notes?: string;
  roLineNumber?: number; // 1-based concern line number (e.g., 1 for Line 1, 2 for Line 2)
  sentToEstimate?: boolean; // Whether the quote pricing has been submitted to the estimate
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
  | 'CUSTOMER_REQUESTED_CALLBACK'
  | 'POST_REPAIR_SATISFIED'
  | 'POST_REPAIR_HAS_CONCERNS'
  | 'POST_REPAIR_VOICEMAIL';

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
  concernTechIds?: (string | undefined)[]; // Assigned technician ID for each complaint / line item
  concernTechNames?: (string | undefined)[]; // Assigned technician name for each complaint / line item
  diagnosticNotes?: string;
  cause?: string; // Diagnostic finding: root cause of failure/complaint
  correction?: string; // Repair performed: corrective action taken by technician
  concernCauses?: string[]; // Line-by-line diagnostic findings (Line 1, Line 2, etc.)
  concernCorrections?: string[]; // Line-by-line repair corrections (Line 1, Line 2, etc.)
  concernStatuses?: LineApprovalStatus[]; // Line-by-line customer approval status (Line 1, Line 2, etc.)
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
  // 3-Day Post-Repair Customer Follow-Up & Quality Verification
  completedAt?: string; // Timestamp when repair order was completed/closed
  postRepairFollowUpDate?: string; // Scheduled date for 3-day post-repair quality check call (YYYY-MM-DD)
  postRepairFollowUpCompleted?: boolean; // Whether 3-day follow-up call was conducted
  postRepairFollowUpCompletedAt?: string; // Timestamp when 3-day follow-up was completed
  postRepairFollowUpOutcome?: 'SATISFIED_NO_CONCERNS' | 'HAS_NEW_CONCERNS' | 'LEFT_VOICEMAIL' | 'NO_ANSWER' | 'CUSTOMER_CALLBACK_REQUESTED';
  postRepairFollowUpNotes?: string; // Notes taken during the 3-day post-repair check
  quote?: RepairQuote;
  timePunches?: WarrantyLaborTimePunch[];
  inspection?: InspectionSheet; // 21-Point Multi-Point Inspection Sheet & Tech Findings
  isTaxExempt?: boolean; // Customer tax exemption status (0% sales tax vs default 7%)
  taxExemptNumber?: string; // Optional tax exempt resale or state certificate number
  vehiclePhotos?: VehiclePhoto[]; // Photos of vehicle (walkaround, damage, odometer, tech findings)
  linePhotos?: LinePhoto[]; // Photos attached to specific concern lines (Line 1, Line 2, etc.)
}

export interface LinePhoto {
  id: string;
  dataUrl: string; // Compressed high clarity JPEG
  thumbnailUrl?: string;
  caption?: string; // e.g. "Oil pan leak", "Brake rotor groove"
  roLineNumber: number; // 1-indexed (e.g. 1 for Line 1)
  concernIndex: number; // 0-indexed (e.g. 0 for Line 1)
  uploadedAt: string; // ISO string
  uploadedBy: string; // User ID
  uploadedByName: string; // Name of staff who uploaded
  fileSizeBytes?: number;
}

export interface VehiclePhoto {
  id: string;
  dataUrl: string; // Compressed high clarity JPEG
  thumbnailUrl?: string;
  caption?: string; // e.g. "Front bumper scratch", "Odometer check-in", "Right front tire wear"
  uploadedAt: string; // ISO string
  uploadedBy: string; // User ID
  uploadedByName: string; // Name of staff who uploaded
  fileSizeBytes?: number;
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
export type LineApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface LaborLineItem {
  id: string;
  description: string;
  laborHours: number;
  hourlyRate: number;
  subtotal: number;
  payType?: ConcernPayType;
  proDemandLaborGuide?: string;
  techNotes?: string;
  roLineNumber?: number; // Mirrors RO Line 1, Line 2...
  concernText?: string; // Mirrors RO customer concern
  correctionText?: string; // Mirrors RO technician correction
  addedByAdvisor?: boolean; // True if added as an extra line by the Service Advisor
  status?: LineApprovalStatus; // Line-specific customer decision
}

export interface QuotePartItem {
  id: string;
  description: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sourcePartId?: string;
  roLineNumber?: number; // 1-based concern line number (e.g., 1 for Line 1, 2 for Line 2)
  status?: LineApprovalStatus; // Line-specific customer decision
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
  payType?: ConcernPayType;
  shopSuppliesFee: number;
  applyShopSupplies?: boolean; // Controls whether shop supplies are charged (defaults to true)
  lineStatuses?: Record<number, LineApprovalStatus>; // Line 1, Line 2... approval decisions
  totalApprovedAmount?: number;
  totalDeclinedAmount?: number;
  taxRate: number;
  taxAmount: number;
  isTaxExempt?: boolean;
  taxExemptNumber?: string;
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
  cause?: string;
  correction?: string;
  laborHours?: number;
  payType?: ConcernPayType;
  techId?: string;
  techName?: string;
  inspectionItemId?: string;
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

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  isTaxExempt?: boolean;
  taxExemptNumber?: string;
  notes?: string;
  vehicles: VehicleInfo[];
  lastVisit?: string;
  totalVisits: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 21-Point Multi-Point Inspection (MPI) Types
// ==========================================

export type InspectionItemStatus = 'PASSED' | 'FUTURE_ATTENTION' | 'IMMEDIATE_ATTENTION' | 'NOT_APPLICABLE';

export type InspectionCategory = 'UNDER_HOOD' | 'BRAKES_SUSPENSION' | 'TIRES_WHEELS' | 'UNDERBODY_EXTERIOR';

export interface InspectionChecklistItem {
  id: string;
  name: string;
  category: InspectionCategory;
  order: number;
  isEnabled?: boolean; // Defaults to true; managers can toggle off
  hasMeasurement?: boolean;
  measurementUnit?: 'mm' | '32nds' | 'psi' | 'V' | 'CCA' | '%';
  measurementLabel?: string;
  defaultRecommendationName?: string;
  quickChips?: string[];
}

export interface InspectionResultItem {
  itemId: string;
  name: string;
  category: InspectionCategory;
  status: InspectionItemStatus;
  measurementValue?: string; // e.g. "4", "3", "35", "12.6"
  notes?: string;
  cause?: string;
  correction?: string;
  laborHours?: number;
  recommendationId?: string; // Links to RecommendedService in ro.recommendations
}

export interface InspectionSheet {
  id: string;
  roId: string;
  completedAt?: string;
  completedByTechId?: string;
  completedByTechName?: string;
  items: Record<string, InspectionResultItem>;
  overallNotes?: string;
}

// ==========================================
// Service Manager Staff Attendance & Calendar Types
// ==========================================

export type StaffLeaveType = 'VACATION' | 'SICK' | 'LEFT_EARLY' | 'LATE_ARRIVAL' | 'PERSONAL';

export interface StaffLeaveEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  employeeNumber?: string;
  leaveType: StaffLeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timeDetails?: string; // e.g. "Left early at 1:30 PM", "Doctor Appt"
  notes?: string;
  createdAt: string;
  createdByManagerId: string;
  createdByManagerName: string;
}

