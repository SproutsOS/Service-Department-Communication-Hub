export type ManagerLogStatus = 
  | 'Dispatched' 
  | 'In Diag' 
  | 'Pending Customer Approval'
  | 'Pending Warranty Approval'
  | 'In Repair' 
  | 'Finished' 
  | 'Waiting for Payment';

export interface EtaHistoryEntry {
  id: string;
  etaDate: string;
  updatedAt: string;
  updatedBy?: string;
  note?: string;
}

export interface ManagerSubPartItem {
  id: string;
  partNumber: string;
  partDescription?: string;
  quantity?: number;
  orderDate?: string;
  originalEta: string;
  currentEta: string;
  etaHistory: EtaHistoryEntry[];
  isPartsIn: boolean;
  partsInAt?: string;
  isAdvisorNotified: boolean;
  advisorNotifiedAt?: string;
  notes?: string;
}

export interface ManagerSpreadsheetRow {
  id: string;
  roNumber: string;
  roDate?: string;
  customerName: string;
  vin: string;
  assignedTechId?: string;
  assignedTechName?: string;
  status: ManagerLogStatus;

  // Single or primary part fields (fallback)
  partNumber: string;
  partDescription?: string;
  orderDate?: string;
  originalEta: string;
  currentEta: string;
  etaHistory: EtaHistoryEntry[];
  isPartsIn: boolean;
  partsInAt?: string;
  isAdvisorNotified: boolean;
  advisorNotifiedAt?: string;

  // Multi-part sub-items for expandable sub-rows (Option 2)
  parts?: ManagerSubPartItem[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}
