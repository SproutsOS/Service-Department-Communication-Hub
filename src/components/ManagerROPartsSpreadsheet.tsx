import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Bell, 
  History, 
  Trash2, 
  Download, 
  Printer, 
  X, 
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wrench,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  User,
  Package,
  Layers,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManagerSpreadsheetRow, ManagerLogStatus, EtaHistoryEntry, ManagerSubPartItem } from '../types/managerSpreadsheet';
import { printIsolatedDocument } from '../utils/printUtils';
import { 
  syncShopSettings, 
  subscribeToShopSettings 
} from '../lib/firestoreSync';

const STORAGE_KEY_MANAGER_SPREADSHEET = 'dealership_service_manager_ro_parts_spreadsheet_v2';

const STATUS_OPTIONS: ManagerLogStatus[] = [
  'Dispatched',
  'In Diag',
  'Pending Customer Approval',
  'Pending Warranty Approval',
  'In Repair',
  'Finished',
  'Waiting for Payment'
];

interface ManagerROPartsSpreadsheetProps {
  onBackToDashboard?: () => void;
}

export const ManagerROPartsSpreadsheet: React.FC<ManagerROPartsSpreadsheetProps> = ({ 
  onBackToDashboard 
}) => {
  const { repairOrders, users, setSelectedRO } = useApp();

  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN' && !u.isDeactivated);
  }, [users]);

  // Main spreadsheet rows state
  const [rows, setRows] = useState<ManagerSpreadsheetRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANAGER_SPREADSHEET);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const oldSaved = localStorage.getItem('dealership_service_manager_ro_parts_spreadsheet_v1');
      if (oldSaved) {
        const parsedOld = JSON.parse(oldSaved);
        if (Array.isArray(parsedOld)) return parsedOld;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Track expanded row IDs for multi-part sub-rows
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRowExpand = (rowId: string) => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const expandAllRows = () => {
    setExpandedRowIds(new Set(rows.map(r => r.id)));
  };

  const collapseAllRows = () => {
    setExpandedRowIds(new Set());
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ManagerLogStatus | 'ALL'>('ALL');
  const [partsInFilter, setPartsInFilter] = useState<'ALL' | 'PARTS_IN' | 'PARTS_WAITING'>('ALL');

  // ETA History Modal State
  const [etaModalTarget, setEtaModalTarget] = useState<{ rowId: string; subPartId?: string } | null>(null);
  const [newEtaInput, setNewEtaInput] = useState('');
  const [newEtaNote, setNewEtaNote] = useState('');

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist rows locally and sync to cloud
  const saveRows = useCallback((updatedRows: ManagerSpreadsheetRow[]) => {
    setRows(updatedRows);
    try {
      localStorage.setItem(STORAGE_KEY_MANAGER_SPREADSHEET, JSON.stringify(updatedRows));
    } catch {
      // ignore
    }
    syncShopSettings({ managerROPartsSpreadsheet: updatedRows });
  }, []);

  // Sync with Firestore cloud changes
  useEffect(() => {
    const unsubscribe = subscribeToShopSettings((settings) => {
      if (settings?.managerROPartsSpreadsheet && Array.isArray(settings.managerROPartsSpreadsheet)) {
        setRows(settings.managerROPartsSpreadsheet);
        try {
          localStorage.setItem(STORAGE_KEY_MANAGER_SPREADSHEET, JSON.stringify(settings.managerROPartsSpreadsheet));
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to construct normalized sub-parts list from an RO
  const extractSubPartsFromRO = (ro: typeof repairOrders[0]): ManagerSubPartItem[] => {
    const roPartsList: ManagerSubPartItem[] = [];

    if (Array.isArray(ro.parts) && ro.parts.length > 0) {
      ro.parts.forEach((p, idx) => {
        const etaStr = p.estimatedArrival || 'Pending';
        const isRec = p.status === 'RECEIVED' || p.status === 'ISSUED_TO_TECH' || p.status === 'IN_STOCK';
        const orderDt = p.orderedAt ? p.orderedAt.split('T')[0] : (ro.createdAt ? ro.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
        roPartsList.push({
          id: p.id || `subpart_${ro.id}_${idx}`,
          partNumber: p.partNumber || `Part #${idx + 1}`,
          partDescription: p.description || p.name || '',
          quantity: p.quantity || 1,
          orderDate: orderDt,
          originalEta: etaStr,
          currentEta: etaStr,
          etaHistory: [
            {
              id: `eta_sub_${Date.now()}_${idx}`,
              etaDate: etaStr,
              updatedAt: new Date().toISOString(),
              updatedBy: 'System Auto-Import'
            }
          ],
          isPartsIn: isRec,
          partsInAt: isRec ? new Date().toISOString() : undefined,
          isAdvisorNotified: false
        });
      });
    }

    if (roPartsList.length === 0 && ro.quote?.partsItems && ro.quote.partsItems.length > 0) {
      ro.quote.partsItems.forEach((qp, idx) => {
        const etaStr = (qp as any).estimatedArrival || 'Pending';
        const orderDt = ro.createdAt ? ro.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        roPartsList.push({
          id: qp.id || `subpart_quote_${ro.id}_${idx}`,
          partNumber: qp.partNumber || `Part #${idx + 1}`,
          partDescription: qp.description || '',
          quantity: qp.quantity || 1,
          orderDate: orderDt,
          originalEta: etaStr,
          currentEta: etaStr,
          etaHistory: [
            {
              id: `eta_sub_q_${Date.now()}_${idx}`,
              etaDate: etaStr,
              updatedAt: new Date().toISOString(),
              updatedBy: 'System Auto-Import'
            }
          ],
          isPartsIn: false,
          isAdvisorNotified: false
        });
      });
    }

    return roPartsList;
  };

  // Auto-sync rows from active Repair Orders
  const handleSyncFromActiveROs = useCallback(() => {
    const activeROs = repairOrders.filter(r => r.status !== 'CLOSED' && r.status !== 'COMPLETED' && !r.isArchived);
    const existingRoMap = new Map(rows.map(r => [r.roNumber.trim().toLowerCase(), r]));

    const newOrUpdatedRows: ManagerSpreadsheetRow[] = [...rows];

    activeROs.forEach(ro => {
      const roKey = String(ro.id).trim().toLowerCase();
      const existing = existingRoMap.get(roKey);

      let mappedStatus: ManagerLogStatus = 'Dispatched';
      if (ro.status === 'WAITING_DIAGNOSTICS' || ro.status === 'IN_DIAG') {
        mappedStatus = ro.techId ? 'In Diag' : 'Dispatched';
      } else if (ro.status === 'ESTIMATE_DONE' || ro.status === 'WAITING_FOR_APPROVAL') {
        mappedStatus = 'Pending Customer Approval';
      } else if (ro.status === 'REPAIR_IN_PROGRESS' || ro.status === 'PARTS_IN_TO_TECH' || ro.status === 'APPROVED' || ro.status === 'PARTS_ORDERED') {
        mappedStatus = 'In Repair';
      } else if (ro.status === 'REPAIR_COMPLETE' || ro.status === 'READY_FOR_PICKUP') {
        mappedStatus = 'Finished';
      } else if (ro.status === 'COMPLETED' || ro.status === 'CLOSED') {
        mappedStatus = 'Waiting for Payment';
      }

      const extractedParts = extractSubPartsFromRO(ro);
      const firstPart = extractedParts[0];

      if (!existing) {
        const roOpenedDate = ro.createdAt ? ro.createdAt.split('T')[0] : ((ro as any).dateOpened ? String((ro as any).dateOpened).split('T')[0] : new Date().toISOString().split('T')[0]);

        newOrUpdatedRows.unshift({
          id: `mgr_log_${ro.id}_${Date.now()}`,
          roNumber: String(ro.id),
          roDate: roOpenedDate,
          customerName: ro.customerName || 'Customer',
          vin: ro.vehicle?.vin || `${ro.vehicle?.year || ''} ${ro.vehicle?.make || ''} ${ro.vehicle?.model || ''}`.trim(),
          assignedTechId: ro.techId,
          assignedTechName: ro.techName || 'Unassigned',
          status: mappedStatus,
          partNumber: firstPart ? firstPart.partNumber : 'N/A',
          partDescription: firstPart ? firstPart.partDescription : '',
          orderDate: firstPart ? firstPart.orderDate : (ro.createdAt ? ro.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          originalEta: firstPart ? firstPart.originalEta : 'N/A',
          currentEta: firstPart ? firstPart.currentEta : 'N/A',
          etaHistory: firstPart ? firstPart.etaHistory : [],
          isPartsIn: extractedParts.length > 0 && extractedParts.every(p => p.isPartsIn),
          partsInAt: extractedParts.some(p => p.partsInAt) ? new Date().toISOString() : undefined,
          isAdvisorNotified: false,
          parts: extractedParts,
          notes: ro.primaryConcern || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    saveRows(newOrUpdatedRows);
    triggerToast(`✓ Synchronized with active Repair Orders (${activeROs.length} open tickets)`);
  }, [repairOrders, rows, saveRows]);

  // Initial population if empty
  useEffect(() => {
    if (rows.length === 0 && repairOrders.length > 0) {
      handleSyncFromActiveROs();
    }
  }, [rows.length, repairOrders.length, handleSyncFromActiveROs]);

  // Add manual new RO row
  const handleAddManualRow = () => {
    const todayDt = new Date().toISOString().split('T')[0];
    const newSubPart: ManagerSubPartItem = {
      id: `subpart_init_${Date.now()}`,
      partNumber: 'PART-1001',
      partDescription: 'Component Description',
      quantity: 1,
      orderDate: todayDt,
      originalEta: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      currentEta: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      etaHistory: [
        {
          id: `eta_manual_init_${Date.now()}`,
          etaDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
          updatedBy: 'Service Manager'
        }
      ],
      isPartsIn: false,
      isAdvisorNotified: false
    };

    const newRow: ManagerSpreadsheetRow = {
      id: `mgr_log_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roNumber: `RO-${Math.floor(1000 + Math.random() * 9000)}`,
      roDate: todayDt,
      customerName: 'Customer Name',
      vin: '1C4PJLCB7KD...',
      assignedTechId: technicians[0]?.id || '',
      assignedTechName: technicians[0]?.name || 'Unassigned',
      status: 'Dispatched',
      partNumber: newSubPart.partNumber,
      partDescription: newSubPart.partDescription,
      orderDate: todayDt,
      originalEta: newSubPart.originalEta,
      currentEta: newSubPart.currentEta,
      etaHistory: newSubPart.etaHistory,
      isPartsIn: false,
      isAdvisorNotified: false,
      parts: [newSubPart],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveRows([newRow, ...rows]);
    setExpandedRowIds(prev => new Set([...prev, newRow.id]));
    triggerToast('Added new custom RO log entry with part sub-row');
  };

  // Add a sub-part line item to a row
  const handleAddSubPart = (rowId: string) => {
    const todayDt = new Date().toISOString().split('T')[0];
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const currentParts = (r.parts || []).filter(p => p.partNumber && p.partNumber !== 'N/A');

      const newSubPart: ManagerSubPartItem = {
        id: `subpart_add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        partNumber: `PART-${currentParts.length + 1}`,
        partDescription: 'New Part Item',
        quantity: 1,
        orderDate: todayDt,
        originalEta: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        currentEta: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        etaHistory: [
          {
            id: `eta_sub_add_${Date.now()}`,
            etaDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
            updatedBy: 'Service Manager'
          }
        ],
        isPartsIn: false,
        isAdvisorNotified: false
      };

      return {
        ...r,
        parts: [...currentParts, newSubPart],
        updatedAt: new Date().toISOString()
      };
    });

    saveRows(updated);
    setExpandedRowIds(prev => new Set([...prev, rowId]));
    triggerToast('Added part line item');
  };

  // Update a top-level field on a row
  const handleUpdateField = (rowId: string, updates: Partial<ManagerSpreadsheetRow>) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
    saveRows(updated);
  };

  // Update a specific sub-part item
  const handleUpdateSubPart = (rowId: string, partId: string, updates: Partial<ManagerSubPartItem>) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const partsList = (r.parts || []).map(p => {
        if (p.id !== partId) return p;
        return { ...p, ...updates };
      });

      const allPartsIn = partsList.length > 0 && partsList.every(p => p.isPartsIn);
      const allNotified = partsList.length > 0 && partsList.every(p => p.isAdvisorNotified);

      return {
        ...r,
        parts: partsList,
        isPartsIn: allPartsIn,
        isAdvisorNotified: allNotified,
        updatedAt: new Date().toISOString()
      };
    });
    saveRows(updated);
  };

  // Toggle Parts In on parent (toggles all sub-parts)
  const handleTogglePartsInParent = (rowId: string) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const nextState = !r.isPartsIn;
      const now = new Date().toISOString();
      const updatedParts = (r.parts || []).map(p => ({
        ...p,
        isPartsIn: nextState,
        partsInAt: nextState ? now : undefined
      }));

      return {
        ...r,
        isPartsIn: nextState,
        partsInAt: nextState ? now : undefined,
        parts: updatedParts,
        updatedAt: now,
      };
    });
    saveRows(updated);
  };

  // Toggle Parts In on individual sub-part
  const handleToggleSubPartPartsIn = (rowId: string, partId: string) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const now = new Date().toISOString();
      const partsList = (r.parts || []).map(p => {
        if (p.id !== partId) return p;
        const nextState = !p.isPartsIn;
        return {
          ...p,
          isPartsIn: nextState,
          partsInAt: nextState ? now : undefined
        };
      });

      const allPartsIn = partsList.length > 0 && partsList.every(p => p.isPartsIn);

      return {
        ...r,
        parts: partsList,
        isPartsIn: allPartsIn,
        partsInAt: allPartsIn ? now : (r.partsInAt || undefined),
        updatedAt: now
      };
    });
    saveRows(updated);
  };

  // Toggle Advisor Notified on parent (toggles all sub-parts)
  const handleToggleAdvisorNotifiedParent = (rowId: string) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const nextState = !r.isAdvisorNotified;
      const now = new Date().toISOString();
      const updatedParts = (r.parts || []).map(p => ({
        ...p,
        isAdvisorNotified: nextState,
        advisorNotifiedAt: nextState ? now : undefined
      }));

      return {
        ...r,
        isAdvisorNotified: nextState,
        advisorNotifiedAt: nextState ? now : undefined,
        parts: updatedParts,
        updatedAt: now,
      };
    });
    saveRows(updated);
  };

  // Toggle Advisor Notified on individual sub-part
  const handleToggleSubPartAdvisorNotified = (rowId: string, partId: string) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const now = new Date().toISOString();
      const partsList = (r.parts || []).map(p => {
        if (p.id !== partId) return p;
        const nextState = !p.isAdvisorNotified;
        return {
          ...p,
          isAdvisorNotified: nextState,
          advisorNotifiedAt: nextState ? now : undefined
        };
      });

      const allNotified = partsList.length > 0 && partsList.every(p => p.isAdvisorNotified);

      return {
        ...r,
        parts: partsList,
        isAdvisorNotified: allNotified,
        advisorNotifiedAt: allNotified ? now : (r.advisorNotifiedAt || undefined),
        updatedAt: now
      };
    });
    saveRows(updated);
  };

  // Delete sub-part
  const handleDeleteSubPart = (rowId: string, partId: string) => {
    const updated = rows.map(r => {
      if (r.id !== rowId) return r;
      const partsList = (r.parts || []).filter(p => p.id !== partId);
      return {
        ...r,
        parts: partsList,
        updatedAt: new Date().toISOString()
      };
    });
    saveRows(updated);
    triggerToast('Removed part line item');
  };

  // Delete whole row
  const handleDeleteRow = (rowId: string, roNum: string) => {
    if (confirm(`Remove entry for ${roNum} from Manager Spreadsheet?`)) {
      saveRows(rows.filter(r => r.id !== rowId));
      triggerToast(`Removed entry ${roNum}`);
    }
  };

  // Add revised ETA entry in history trail
  const handleAddEtaRevision = () => {
    if (!etaModalTarget) return;
    const dateVal = newEtaInput.trim();
    if (!dateVal) return;

    const { rowId, subPartId } = etaModalTarget;

    const updated = rows.map(r => {
      if (r.id !== rowId) return r;

      if (subPartId && r.parts && r.parts.length > 0) {
        const partsList = r.parts.map(p => {
          if (p.id !== subPartId) return p;
          const newEntry: EtaHistoryEntry = {
            id: `eta_rev_${Date.now()}`,
            etaDate: dateVal,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Service Manager',
            note: newEtaNote.trim() || undefined
          };
          const history = [...(p.etaHistory || []), newEntry];
          const origEta = p.originalEta && p.originalEta !== 'Pending' ? p.originalEta : dateVal;
          return {
            ...p,
            originalEta: origEta,
            currentEta: dateVal,
            etaHistory: history
          };
        });
        return {
          ...r,
          parts: partsList,
          updatedAt: new Date().toISOString()
        };
      }

      const newEntry: EtaHistoryEntry = {
        id: `eta_rev_${Date.now()}`,
        etaDate: dateVal,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Service Manager',
        note: newEtaNote.trim() || undefined
      };
      const history = [...(r.etaHistory || []), newEntry];
      const origEta = r.originalEta && r.originalEta !== 'Pending' ? r.originalEta : dateVal;

      return {
        ...r,
        originalEta: origEta,
        currentEta: dateVal,
        etaHistory: history,
        updatedAt: new Date().toISOString(),
      };
    });

    saveRows(updated);
    setNewEtaInput('');
    setNewEtaNote('');
    triggerToast(`✓ Updated ETA to ${dateVal} (recorded in history trail)`);
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      const validParts = (r.parts || []).filter(p => p.partNumber && p.partNumber !== 'N/A');
      const hasPartsIn = validParts.some(p => p.isPartsIn);

      if (partsInFilter === 'PARTS_IN' && !hasPartsIn) return false;
      if (partsInFilter === 'PARTS_WAITING' && hasPartsIn) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();

      const partsMatch = validParts.some(p => 
        p.partNumber.toLowerCase().includes(q) ||
        (p.partDescription && p.partDescription.toLowerCase().includes(q))
      );

      return (
        r.roNumber.toLowerCase().includes(q) ||
        (r.roDate && r.roDate.toLowerCase().includes(q)) ||
        r.customerName.toLowerCase().includes(q) ||
        r.vin.toLowerCase().includes(q) ||
        (r.assignedTechName && r.assignedTechName.toLowerCase().includes(q)) ||
        (r.partNumber && r.partNumber !== 'N/A' && r.partNumber.toLowerCase().includes(q)) ||
        (r.partDescription && r.partDescription.toLowerCase().includes(q)) ||
        partsMatch ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    });
  }, [rows, searchQuery, statusFilter, partsInFilter]);

  // Active ETA modal target object
  const etaModalTargetObj = useMemo(() => {
    if (!etaModalTarget) return null;
    const targetRow = rows.find(r => r.id === etaModalTarget.rowId);
    if (!targetRow) return null;

    if (etaModalTarget.subPartId && targetRow.parts) {
      const sub = targetRow.parts.find(p => p.id === etaModalTarget.subPartId);
      if (sub) {
        return {
          title: `ETA Audit Trail — ${targetRow.roNumber} (${sub.partNumber})`,
          originalEta: sub.originalEta,
          currentEta: sub.currentEta,
          etaHistory: sub.etaHistory || [],
        };
      }
    }

    return {
      title: `ETA Audit Trail — ${targetRow.roNumber}`,
      originalEta: targetRow.originalEta,
      currentEta: targetRow.currentEta,
      etaHistory: targetRow.etaHistory || [],
    };
  }, [rows, etaModalTarget]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'RO #',
      'RO Date',
      'Customer Name',
      'VIN',
      'Assigned Tech',
      'Status',
      'Part Number',
      'Part Description',
      'Order Date',
      'Original ETA',
      'Current ETA',
      'Parts In',
      'Advisor Notified',
      'Notes'
    ];

    const lines: string[] = [];
    lines.push('"Service Manager Master RO & Parts Log (Multi-Part Sub-Rows)"');
    lines.push(`"Exported: ${new Date().toLocaleString()}"`);
    lines.push('');
    lines.push(headers.map(h => `"${h}"`).join(','));

    filteredRows.forEach(r => {
      const partsList = (r.parts || []).filter(p => p.partNumber && p.partNumber !== 'N/A');

      if (partsList.length === 0) {
        const line = [
          r.roNumber,
          r.roDate || (r.createdAt ? r.createdAt.split('T')[0] : ''),
          r.customerName,
          r.vin,
          r.assignedTechName || '',
          r.status,
          'No Parts Ordered',
          '',
          '',
          '',
          '',
          'NO',
          'NO',
          r.notes || ''
        ];
        lines.push(line.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
      } else {
        partsList.forEach((p, idx) => {
          const line = [
            idx === 0 ? r.roNumber : `${r.roNumber} (Part ${idx + 1})`,
            r.roDate || (r.createdAt ? r.createdAt.split('T')[0] : ''),
            r.customerName,
            r.vin,
            r.assignedTechName || '',
            r.status,
            p.partNumber,
            p.partDescription || '',
            p.orderDate || '',
            p.originalEta,
            p.currentEta,
            p.isPartsIn ? 'YES' : 'NO',
            p.isAdvisorNotified ? 'YES' : 'NO',
            r.notes || ''
          ];
          lines.push(line.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
        });
      }
    });

    const csvContent = lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Manager_RO_Parts_Spreadsheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print
  const handlePrint = () => {
    printIsolatedDocument('manager-spreadsheet-printable', 'Service Manager RO & Parts Log');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden text-slate-900">
      
      {/* Top Header & Navigation Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Service Manager Master RO & Parts Log
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span>Option 2: Multi-Part Sub-Rows Enabled</span>
                </span>
                {toastMessage && (
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 animate-in fade-in">
                    {toastMessage}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Spreadsheet log with expandable multi-part sub-rows, independent Parts In & Advisor Notified toggles per part item, and full ETA audit history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              >
                ← Back to Dashboard
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        
        {/* Control Bar: Search, Status Filters, Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search RO#, Customer, VIN, Tech, Part#, Status..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Actions: Expand/Collapse All, Sync ROs, Add Row, Export, Print */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={expandAllRows}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                title="Expand all multi-part sub-rows"
              >
                Expand All Parts
              </button>

              <button
                type="button"
                onClick={collapseAllRows}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                title="Collapse all multi-part sub-rows"
              >
                Collapse All
              </button>

              <button
                type="button"
                onClick={handleSyncFromActiveROs}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer border border-slate-700"
                title="Sync and import active open Repair Orders into spreadsheet"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                <span>Sync Active ROs</span>
              </button>

              <button
                type="button"
                onClick={handleAddManualRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add RO Row</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Export as Microsoft Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Print clean spreadsheet report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1">Status Filter:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Stages ({rows.length})
            </button>
            {STATUS_OPTIONS.map(st => {
              const count = rows.filter(r => r.status === st).length;
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(isSelected ? 'ALL' : st)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{st}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Interactive Spreadsheet Table Container */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
          
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Showing {filteredRows.length} of {rows.length} Repair Order log entries</span>
            <span className="text-[11px] text-purple-700 font-bold hidden sm:inline flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              <span>Click any "📦 X Parts" badge to expand or add multiple part items beneath that RO</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800 whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-10">Expand</th>
                  <th className="py-3 px-3 min-w-[90px]">RO #</th>
                  <th className="py-3 px-3 min-w-[125px]">RO Date</th>
                  <th className="py-3 px-3 min-w-[150px]">Customer Name</th>
                  <th className="py-3 px-3 min-w-[160px]">VIN / Vehicle</th>
                  <th className="py-3 px-3 min-w-[140px]">Assigned Tech</th>
                  <th className="py-3 px-3 min-w-[170px]">Status (Stage)</th>
                  <th className="py-3 px-3 min-w-[170px]">Parts Breakdown</th>
                  <th className="py-3 px-3 min-w-[160px]">Overall ETA</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Parts In?</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Advisor Notified?</th>
                  <th className="py-3 px-3 text-center w-16">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 text-sm">No spreadsheet log entries found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "+ Add RO Row" or "Sync Active ROs" above to populate rows.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const linkedRO = repairOrders.find(ro => String(ro.id).toLowerCase() === r.roNumber.trim().toLowerCase());
                    const partsList = (r.parts || []).filter(p => p.partNumber && p.partNumber !== 'N/A');
                    const hasParts = partsList.length > 0;

                    const isExpanded = expandedRowIds.has(r.id);
                    const partsInCount = partsList.filter(p => p.isPartsIn).length;
                    const partsNotifiedCount = partsList.filter(p => p.isAdvisorNotified).length;

                    return (
                      <React.Fragment key={r.id}>
                        <tr className={`hover:bg-purple-50/40 transition-colors whitespace-nowrap group ${isExpanded ? 'bg-purple-50/60 font-semibold' : ''}`}>
                          
                          {/* Expand Toggle Button */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(r.id)}
                              className="p-1 rounded hover:bg-purple-200 text-purple-700 transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse parts list" : "Expand parts list"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-900" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-purple-600" />
                              )}
                            </button>
                          </td>

                          {/* RO Number */}
                          <td className="py-1.5 px-2 font-mono font-bold text-slate-900 min-w-[90px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={r.roNumber}
                                onChange={(e) => handleUpdateField(r.id, { roNumber: e.target.value })}
                                className="w-20 px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-purple-500 rounded font-mono font-black text-purple-900 focus:outline-none text-xs"
                              />
                              {linkedRO && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRO(linkedRO)}
                                  className="p-1 text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"
                                  title="Open full Repair Order ticket details"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* RO Date */}
                          <td className="py-1.5 px-2 font-mono text-xs min-w-[125px]">
                            <input
                              type="date"
                              value={r.roDate || (r.createdAt ? r.createdAt.split('T')[0] : '')}
                              onChange={(e) => handleUpdateField(r.id, { roDate: e.target.value })}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-purple-500 rounded font-mono font-bold text-slate-800 focus:outline-none text-xs"
                            />
                          </td>

                          {/* Customer Name */}
                          <td className="py-1.5 px-2 font-bold text-slate-900 min-w-[150px]">
                            <input
                              type="text"
                              value={r.customerName}
                              onChange={(e) => handleUpdateField(r.id, { customerName: e.target.value })}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-purple-500 rounded font-bold text-slate-900 focus:outline-none"
                              placeholder="Customer Name"
                            />
                          </td>

                          {/* VIN / Vehicle */}
                          <td className="py-1.5 px-2 font-mono text-xs text-slate-700 min-w-[160px]">
                            <input
                              type="text"
                              value={r.vin}
                              onChange={(e) => handleUpdateField(r.id, { vin: e.target.value })}
                              className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-purple-500 rounded font-mono text-slate-800 focus:outline-none text-xs"
                              placeholder="VIN or Vehicle"
                            />
                          </td>

                          {/* Assigned Tech */}
                          <td className="py-1.5 px-2 min-w-[140px]">
                            <select
                              value={r.assignedTechId || ''}
                              onChange={(e) => {
                                const techId = e.target.value;
                                const selectedTech = technicians.find(t => t.id === techId);
                                handleUpdateField(r.id, {
                                  assignedTechId: techId,
                                  assignedTechName: selectedTech ? selectedTech.name : 'Unassigned'
                                });
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {technicians.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status Dropdown Menu */}
                          <td className="py-1.5 px-2 min-w-[170px]">
                            <select
                              value={r.status}
                              onChange={(e) => handleUpdateField(r.id, { status: e.target.value as ManagerLogStatus })}
                              className={`w-full px-2 py-1 text-xs font-black rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                r.status === 'Dispatched' 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : r.status === 'In Diag' 
                                  ? 'bg-blue-50 text-blue-900 border-blue-300' 
                                  : r.status === 'Pending Customer Approval'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold'
                                  : r.status === 'Pending Warranty Approval'
                                  ? 'bg-purple-100 text-purple-950 border-purple-400 font-extrabold'
                                  : r.status === 'In Repair' 
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300' 
                                  : r.status === 'Finished' 
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                                  : 'bg-rose-50 text-rose-900 border-rose-300'
                              }`}
                            >
                              <option value="Dispatched">Dispatched</option>
                              <option value="In Diag">In Diag</option>
                              <option value="Pending Customer Approval">Pending Customer Approval</option>
                              <option value="Pending Warranty Approval">Pending Warranty Approval</option>
                              <option value="In Repair">In Repair</option>
                              <option value="Finished">Finished</option>
                              <option value="Waiting for Payment">Waiting for Payment</option>
                            </select>
                          </td>

                          {/* Parts Breakdown Summary Badge */}
                          <td className="py-1.5 px-2 min-w-[170px]">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(r.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer font-bold text-xs ${
                                hasParts
                                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 font-medium'
                              }`}
                            >
                              <Package className={`w-3.5 h-3.5 ${hasParts ? 'text-purple-700' : 'text-slate-400'}`} />
                              {hasParts ? (
                                <>
                                  <span>{partsList.length} Part{partsList.length === 1 ? '' : 's'}</span>
                                  <span className="text-[10px] text-purple-600 font-mono">
                                    ({partsList[0]?.partNumber || 'Details'})
                                  </span>
                                </>
                              ) : (
                                <span>No Parts Ordered</span>
                              )}
                            </button>
                          </td>

                          {/* Overall ETA */}
                          <td className="py-1.5 px-2 min-w-[160px]">
                            {hasParts ? (
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="min-w-0 font-mono text-xs font-bold text-slate-800">
                                  {partsList[0]?.currentEta || r.currentEta || 'Pending'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEtaModalTarget({ rowId: r.id });
                                    setNewEtaInput(partsList[0]?.currentEta || r.currentEta || '');
                                    setNewEtaNote('');
                                  }}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 font-bold text-[10px] border border-slate-300 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                                >
                                  <History className="w-3 h-3 text-purple-600" />
                                  <span>History</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs font-mono">No Parts</span>
                            )}
                          </td>

                          {/* Parent Parts In Summary Toggle */}
                          <td className="py-1.5 px-2 text-center min-w-[120px]">
                            {hasParts ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePartsInParent(r.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                  partsInCount === partsList.length 
                                    ? 'bg-emerald-600 text-white border-emerald-700' 
                                    : partsInCount > 0 
                                    ? 'bg-amber-500 text-white border-amber-600' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                                }`}
                                title="Click to toggle Parts IN state for all parts"
                              >
                                {partsInCount === partsList.length ? (
                                  <span className="flex items-center gap-1 justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>All Parts In ({partsInCount}/{partsList.length})</span>
                                  </span>
                                ) : partsInCount > 0 ? (
                                  <span className="flex items-center gap-1 justify-center">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{partsInCount}/{partsList.length} Parts In</span>
                                  </span>
                                ) : (
                                  <span>0/{partsList.length} Parts In</span>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">No Parts</span>
                            )}
                          </td>

                          {/* Parent Advisor Notified Summary Toggle */}
                          <td className="py-1.5 px-2 text-center min-w-[130px]">
                            {hasParts ? (
                              <button
                                type="button"
                                onClick={() => handleToggleAdvisorNotifiedParent(r.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                  partsNotifiedCount === partsList.length 
                                    ? 'bg-blue-600 text-white border-blue-700' 
                                    : partsNotifiedCount > 0 
                                    ? 'bg-sky-500 text-white border-sky-600' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                                }`}
                                title="Click to toggle Service Advisor notification for all parts"
                              >
                                {partsNotifiedCount === partsList.length ? (
                                  <span className="flex items-center gap-1 justify-center">
                                    <Bell className="w-3.5 h-3.5" />
                                    <span>All Notified ({partsNotifiedCount}/{partsList.length})</span>
                                  </span>
                                ) : partsNotifiedCount > 0 ? (
                                  <span className="flex items-center gap-1 justify-center">
                                    <Bell className="w-3.5 h-3.5" />
                                    <span>{partsNotifiedCount}/{partsList.length} Notified</span>
                                  </span>
                                ) : (
                                  <span>Not Notified</span>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(r.id, r.roNumber)}
                              className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>

                        </tr>

                        {/* Expandable Sub-Rows Section (Option 2) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b-2 border-purple-200">
                            <td colSpan={12} className="p-3 sm:p-4">
                              <div className="bg-white rounded-xl border-2 border-purple-300 p-3 sm:p-4 shadow-sm space-y-3">
                                
                                <div className="flex items-center justify-start pb-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAddSubPart(r.id)}
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add Part Item</span>
                                  </button>
                                </div>

                                {/* Sub-Parts Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border border-purple-200 rounded-lg overflow-hidden">
                                    <thead className="bg-purple-100 text-purple-950 uppercase text-[10px] font-bold">
                                      <tr>
                                        <th className="p-2 w-28 min-w-[100px]">Part Number</th>
                                        <th className="p-2 min-w-[180px]">Description</th>
                                        <th className="p-2 text-center w-16">Qty</th>
                                        <th className="p-2 min-w-[130px]">Order Date</th>
                                        <th className="p-2 min-w-[160px]">Part ETA & History</th>
                                        <th className="p-2 text-center min-w-[120px]">Parts In?</th>
                                        <th className="p-2 text-center min-w-[140px]">Advisor Notified?</th>
                                        <th className="p-2 text-center w-12">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100 font-sans">
                                      {partsList.length === 0 ? (
                                        <tr>
                                          <td colSpan={8} className="p-4 text-center text-slate-500 bg-slate-50 font-medium text-xs">
                                            No parts currently ordered for this Repair Order. Click "+ Add Part Item" above to add part numbers.
                                          </td>
                                        </tr>
                                      ) : (
                                        partsList.map((sp, spIdx) => (
                                          <tr key={sp.id} className="hover:bg-purple-50/50">
                                            
                                            {/* Part Number (Compacted for ~10 digits) */}
                                            <td className="p-1.5 font-mono w-28">
                                              <input
                                                type="text"
                                                value={sp.partNumber}
                                                onChange={(e) => handleUpdateSubPart(r.id, sp.id, { partNumber: e.target.value })}
                                                className="w-28 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 text-xs tracking-tight"
                                                placeholder="10 Digits"
                                              />
                                            </td>

                                            {/* Description */}
                                            <td className="p-1.5">
                                              <input
                                                type="text"
                                                value={sp.partDescription || ''}
                                                onChange={(e) => handleUpdateSubPart(r.id, sp.id, { partDescription: e.target.value })}
                                                className="w-full px-2 py-1 border border-slate-300 rounded text-slate-800 focus:ring-1 focus:ring-purple-500 text-xs"
                                                placeholder="Part Description"
                                              />
                                            </td>

                                            {/* Quantity */}
                                            <td className="p-1.5 text-center">
                                              <input
                                                type="number"
                                                min={1}
                                                value={sp.quantity || 1}
                                                onChange={(e) => handleUpdateSubPart(r.id, sp.id, { quantity: parseInt(e.target.value) || 1 })}
                                                className="w-12 px-1.5 py-1 border border-slate-300 rounded text-center font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 text-xs"
                                              />
                                            </td>

                                            {/* Order Date */}
                                            <td className="p-1.5 font-mono">
                                              <input
                                                type="date"
                                                value={sp.orderDate || ''}
                                                onChange={(e) => handleUpdateSubPart(r.id, sp.id, { orderDate: e.target.value })}
                                                className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 text-xs"
                                              />
                                            </td>

                                            {/* ETA & History */}
                                            <td className="p-1.5">
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="font-mono text-xs font-bold text-slate-900">
                                                  {sp.currentEta}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEtaModalTarget({ rowId: r.id, subPartId: sp.id });
                                                    setNewEtaInput(sp.currentEta || '');
                                                    setNewEtaNote('');
                                                  }}
                                                  className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px] border border-purple-300 transition-colors cursor-pointer flex items-center gap-1"
                                                >
                                                  <History className="w-3 h-3 text-purple-700" />
                                                  <span>ETA History</span>
                                                </button>
                                              </div>
                                            </td>

                                            {/* Parts In Toggle */}
                                            <td className="p-1.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleSubPartPartsIn(r.id, sp.id)}
                                                className={`w-full py-1 rounded text-xs font-bold transition-colors cursor-pointer border ${
                                                  sp.isPartsIn
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                                }`}
                                              >
                                                {sp.isPartsIn ? '✓ IN' : 'Waiting'}
                                              </button>
                                              {sp.partsInAt && (
                                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                  {new Date(sp.partsInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              )}
                                            </td>

                                            {/* Advisor Notified Toggle */}
                                            <td className="p-1.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleSubPartAdvisorNotified(r.id, sp.id)}
                                                className={`w-full py-1 rounded text-xs font-bold transition-colors cursor-pointer border ${
                                                  sp.isAdvisorNotified
                                                    ? 'bg-blue-600 text-white border-blue-700'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                                }`}
                                              >
                                                {sp.isAdvisorNotified ? '✓ Notified' : 'Notify'}
                                              </button>
                                              {sp.advisorNotifiedAt && (
                                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                  {new Date(sp.advisorNotifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              )}
                                            </td>

                                            {/* Action */}
                                            <td className="p-1.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSubPart(r.id, sp.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                title="Delete this part item"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>

                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ETA Audit Trail History Modal */}
      {etaModalTargetObj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {etaModalTargetObj.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEtaModalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Original ETA</div>
                  <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                    {etaModalTargetObj.originalEta || 'Pending'}
                  </div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Current Revised ETA</div>
                  <div className="text-sm font-black font-mono text-purple-950 mt-0.5">
                    {etaModalTargetObj.currentEta || 'Pending'}
                  </div>
                </div>
              </div>

              {/* Add New ETA Date Change Entry */}
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-700" />
                  <span>Log Revised ETA Date Change</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New ETA Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-11-20 or Nov 20"
                      value={newEtaInput}
                      onChange={e => setNewEtaInput(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Reason / Supplier Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Supplier backordered 3 days"
                      value={newEtaNote}
                      onChange={e => setNewEtaNote(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddEtaRevision}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Revised Date to Audit History
                </button>
              </div>

              {/* Audit History Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  Full Revision Log ({etaModalTargetObj.etaHistory.length} Record{etaModalTargetObj.etaHistory.length === 1 ? '' : 's'})
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {etaModalTargetObj.etaHistory.map((item, idx) => (
                    <div key={item.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-mono font-black text-slate-900 text-xs">
                            ETA: {item.etaDate}
                          </div>
                          {item.note && (
                            <p className="text-xs text-slate-600 mt-0.5 font-medium">
                              Note: {item.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {item.updatedBy && (
                          <div className="text-[10px] text-purple-700 font-bold">
                            {item.updatedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setEtaModalTarget(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Printable Isolated Hidden Template for Clean Print Output */}
      <div className="hidden">
        <div id="manager-spreadsheet-printable" className="p-8 text-slate-900 font-sans">
          <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-slate-900">
            <div>
              <h1 className="text-xl font-black uppercase">Service Manager Master RO & Parts Log</h1>
              <p className="text-xs text-slate-600">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
            <thead className="bg-slate-100 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2">RO #</th>
                <th className="p-2">Customer</th>
                <th className="p-2">VIN</th>
                <th className="p-2">Tech</th>
                <th className="p-2">Status</th>
                <th className="p-2">Part #</th>
                <th className="p-2">Description</th>
                <th className="p-2">Order Date</th>
                <th className="p-2">Current ETA</th>
                <th className="p-2">Parts In?</th>
                <th className="p-2">Advisor Notified?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {filteredRows.map(r => {
                const partsList = (r.parts || []).filter(p => p.partNumber && p.partNumber !== 'N/A');
                if (partsList.length === 0) {
                  return (
                    <tr key={r.id}>
                      <td className="p-2 font-bold">{r.roNumber}</td>
                      <td className="p-2 font-sans font-bold">{r.customerName}</td>
                      <td className="p-2">{r.vin}</td>
                      <td className="p-2 font-sans">{r.assignedTechName || 'Unassigned'}</td>
                      <td className="p-2 font-sans font-bold">{r.status}</td>
                      <td className="p-2 font-sans text-slate-500">No Parts Ordered</td>
                      <td className="p-2 font-sans text-slate-400">-</td>
                      <td className="p-2 font-sans text-slate-400">-</td>
                      <td className="p-2 font-sans text-slate-400">-</td>
                      <td className="p-2 font-sans">NO</td>
                      <td className="p-2 font-sans">NO</td>
                    </tr>
                  );
                }
                return partsList.map((p, pIdx) => (
                  <tr key={`${r.id}_${pIdx}`}>
                    <td className="p-2 font-bold">{pIdx === 0 ? r.roNumber : `${r.roNumber} (${pIdx + 1})`}</td>
                    <td className="p-2 font-sans font-bold">{r.customerName}</td>
                    <td className="p-2">{r.vin}</td>
                    <td className="p-2 font-sans">{r.assignedTechName || 'Unassigned'}</td>
                    <td className="p-2 font-sans font-bold">{r.status}</td>
                    <td className="p-2 font-bold">{p.partNumber}</td>
                    <td className="p-2 font-sans">{p.partDescription || '-'}</td>
                    <td className="p-2">{p.orderDate || '-'}</td>
                    <td className="p-2">{p.currentEta}</td>
                    <td className="p-2 font-sans">{p.isPartsIn ? 'YES' : 'NO'}</td>
                    <td className="p-2 font-sans">{p.isAdvisorNotified ? 'YES' : 'NO'}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
