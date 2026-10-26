import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  UserCheck,
  Car,
  Wrench, 
  Package, 
  MessageSquare, 
  History, 
  Plus, 
  CheckCircle2, 
  Phone, 
  FileText,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Edit3,
  Check,
  Save,
  AlertCircle,
  Eye,
  PhoneCall,
  Voicemail,
  Loader2,
  Sparkles,
  RefreshCw,
  Trash2,
  ExternalLink,
  Calculator,
  Printer,
  Camera,
  ListFilter,
  Receipt,
  Copy,
  Gauge,
  ClipboardCheck,
  Ban,
  Columns
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStatus, PartStatus, UserRole, RepairOrder, ConcernPayType, PartItem } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatRelativeTime, formatEtaBadge, formatDurationSince, getDiagnosticStatusDetails, formatCurrency, cleanRO3700 } from '../utils/formatters';
import { ArrivalTimeFrameDropdown } from './ArrivalTimeFrameDropdown';
import { computeEtaAndStatus } from '../utils/partArrivalOptions';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { WarrantyTimeClockSection } from './WarrantyTimeClockSection';
import { TechTestDriveSection } from './TechTestDriveSection';
import { VehiclePhotoManager } from './VehiclePhotoManager';
import { ROLineBreakdown } from './ROLineBreakdown';
import { LinePartsSection } from './LinePartsSection';
import { getContactCadenceStatus, formatContactType, formatContactOutcome } from '../utils/cadenceUtils';
import { decodeVin } from '../utils/vinDecoder';
import { DynamicROWorkflow } from './DynamicROWorkflow';
import { EditPartModal } from './EditPartModal';
import { ROStickyNoteBanner, AddStickyNoteButton } from './ROStickyNoteBadge';
import { ROQuotePartsTracker } from './ROQuotePartsTracker';

export const RODetailModal: React.FC = () => {
  const { 
    selectedRO, 
    setSelectedRO, 
    selectedROModalTab,
    setSelectedROModalTab,
    currentUser, 
    users, 
    updateROStatus, 
    startDiagnosis,
    dispatchRO, 
    reassignServiceWriter,
    sendMessage, 
    markROMessagesAsRead,
    addPartOrder, 
    updatePartStatus,
    updateRepairOrderDetails,
    updateTechCauseAndCorrection,
    deleteRepairOrder,
    openDirectChat,
    openQuoteModal,
    openQuotePrintModal,
    activeQuoteRO,
    openWarrantyPrintModal,
    updateConcernPayType,
    updateConcernTech,
    toggleCustomerTaxExempt,
    addVehiclePhoto,
    deleteVehiclePhoto,
    addRepairOrderConcern,
    activeRoleView,
    markAllPartsOrderedOnRO,
    updateRepairOrderId
  } = useApp();

  const currentRole = activeRoleView || currentUser.role;
  const isManager = currentRole === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_MANAGER';
  const isAdvisor = currentRole === 'SERVICE_ADVISOR' || currentUser.role === 'SERVICE_ADVISOR';
  const isManagerOrAdvisor = isManager || isAdvisor;
  const isTechScreen = currentRole === 'TECHNICIAN' && !isManager && !isAdvisor;
  const isAdvisorScreen = isAdvisor;
  const isPartsManager = currentRole === 'PARTS_SPECIALIST' || currentUser.role === 'PARTS_SPECIALIST';
  const isSales = currentRole === 'SALES' || currentUser.role === 'SALES';
  const canChangePartStatus = (isManager || isPartsManager) && !isSales;
  const canOrderParts = (isManager || isPartsManager) && !isSales;
  const canSelectPayType = isManager || isAdvisor;
  const canAssignTech = isManager || isAdvisor;
  const canReassignServiceWriter = isManager;
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [managerActionFeedback, setManagerActionFeedback] = useState<string | null>(null);

  // Edit Repair Order Number State
  const [isEditingRoNumber, setIsEditingRoNumber] = useState(false);
  const [editRoNumberInput, setEditRoNumberInput] = useState(selectedRO?.id || '');
  const [isSavingRoNumber, setIsSavingRoNumber] = useState(false);
  const [roNumberError, setRoNumberError] = useState<string | null>(null);

  // View mode within unified Parts & Quote Message Center: SPLIT (side-by-side) | PARTS_ONLY | MESSAGES_ONLY
  const [partsCenterViewMode, setPartsCenterViewMode] = useState<'SPLIT' | 'PARTS_ONLY' | 'MESSAGES_ONLY'>('SPLIT');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Edit Part Modal State
  const [editingPartItem, setEditingPartItem] = useState<PartItem | null>(null);
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [addPartLineNumber, setAddPartLineNumber] = useState<number>(1);

  // Editable fields initialized from selectedRO
  const [editCustomerName, setEditCustomerName] = useState(selectedRO?.customerName || '');
  const [editCustomerPhone, setEditCustomerPhone] = useState(selectedRO?.customerPhone || '');
  const [editVehicleYear, setEditVehicleYear] = useState<number | string>(selectedRO?.vehicle?.year || '');
  const [editVehicleMake, setEditVehicleMake] = useState(selectedRO?.vehicle?.make || '');
  const [editVehicleModel, setEditVehicleModel] = useState(selectedRO?.vehicle?.model || '');
  const [editVehicleVin, setEditVehicleVin] = useState(selectedRO?.vehicle?.vin || '');
  const [editVehicleMileage, setEditVehicleMileage] = useState<number | string>(selectedRO?.vehicle?.mileage ?? '');
  const [editVehicleOutMileage, setEditVehicleOutMileage] = useState<number | string>(selectedRO?.outMileage ?? selectedRO?.vehicle?.outMileage ?? '');
  const [editPrimaryConcern, setEditPrimaryConcern] = useState(selectedRO?.primaryConcern || '');
  const [editConcerns, setEditConcerns] = useState<string[]>(
    selectedRO?.concerns && selectedRO.concerns.length > 0
      ? selectedRO.concerns
      : [selectedRO?.primaryConcern || '']
  );
  const [editConcernPayTypes, setEditConcernPayTypes] = useState<ConcernPayType[]>(
    selectedRO?.concernPayTypes && selectedRO.concernPayTypes.length > 0
      ? selectedRO.concernPayTypes
      : (selectedRO?.concerns || [selectedRO?.primaryConcern || '']).map(() => 'CUSTOMER_PAY')
  );
  const [editConcernTechIds, setEditConcernTechIds] = useState<(string | undefined)[]>(
    selectedRO?.concernTechIds && selectedRO.concernTechIds.length > 0
      ? selectedRO.concernTechIds
      : (selectedRO?.concerns || [selectedRO?.primaryConcern || '']).map(() => selectedRO?.techId)
  );
  const [editConcernCauses, setEditConcernCauses] = useState<string[]>(
    selectedRO?.concernCauses && selectedRO.concernCauses.length > 0
      ? selectedRO.concernCauses
      : (selectedRO?.concerns || [selectedRO?.primaryConcern || '']).map((_, i) => i === 0 ? (selectedRO?.cause || '') : '')
  );
  const [editConcernCorrections, setEditConcernCorrections] = useState<string[]>(
    selectedRO?.concernCorrections && selectedRO.concernCorrections.length > 0
      ? selectedRO.concernCorrections
      : (selectedRO?.concerns || [selectedRO?.primaryConcern || '']).map((_, i) => i === 0 ? (selectedRO?.correction || '') : '')
  );
  const [editPromisedTime, setEditPromisedTime] = useState(selectedRO?.promisedTime || '');
  const [editDiagnosticNotes, setEditDiagnosticNotes] = useState(selectedRO?.diagnosticNotes || '');
  const [editCause, setEditCause] = useState(selectedRO?.cause || '');
  const [editCorrection, setEditCorrection] = useState(selectedRO?.correction || '');
  const [editIsUrgent, setEditIsUrgent] = useState(selectedRO?.isUrgent || false);
  const [editIsWaiter, setEditIsWaiter] = useState(selectedRO?.isWaiter || false);

  // Tech direct cause & correction editor in View Mode
  const [isEditingTechFindings, setIsEditingTechFindings] = useState(false);
  const [techCauseInput, setTechCauseInput] = useState(selectedRO?.cause || selectedRO?.diagnosticNotes || '');
  const [techCorrectionInput, setTechCorrectionInput] = useState(selectedRO?.correction || '');
  const [techSaveSuccess, setTechSaveSuccess] = useState(false);

  // Auto-save states & timers
  const managerAutoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [managerAutoSaveStatus, setManagerAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [managerLastSaved, setManagerLastSaved] = useState<string>('');

  const techFindingsAutoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [techFindingsAutoSaveStatus, setTechFindingsAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [techFindingsLastSaved, setTechFindingsLastSaved] = useState<string>('');

  // Header inline mileage quick-editor
  const [isEditingHeaderMileage, setIsEditingHeaderMileage] = useState(false);
  const [headerMileageInput, setHeaderMileageInput] = useState<string>('');

  const [headerOutMileageInput, setHeaderOutMileageInput] = useState<string>('');
  const [outMilesSaved, setOutMilesSaved] = useState<boolean>(false);
  const outMilesDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync header mileage values when selectedRO changes
  useEffect(() => {
    if (selectedRO) {
      const currentOut = selectedRO.outMileage ?? selectedRO.vehicle?.outMileage;
      setHeaderOutMileageInput(currentOut !== undefined && currentOut !== null ? String(currentOut) : '');
      setHeaderMileageInput(selectedRO.vehicle?.mileage ? String(selectedRO.vehicle.mileage) : '');
    }
  }, [selectedRO?.id, selectedRO?.outMileage, selectedRO?.vehicle?.outMileage, selectedRO?.vehicle?.mileage]);

  const handleSaveHeaderMileage = () => {
    if (!selectedRO) return;
    const val = headerMileageInput.trim();
    const numMiles = val !== '' && !isNaN(Number(val)) ? Number(val) : 0;
    
    updateRepairOrderDetails(selectedRO.id, {
      vehicle: {
        ...selectedRO.vehicle,
        mileage: numMiles
      }
    });
    setEditVehicleMileage(numMiles > 0 ? numMiles : '');
    setIsEditingHeaderMileage(false);
  };

  const handleOutMilesChange = (val: string) => {
    setHeaderOutMileageInput(val);
    if (outMilesDebounceTimerRef.current) {
      clearTimeout(outMilesDebounceTimerRef.current);
    }
    outMilesDebounceTimerRef.current = setTimeout(() => {
      handleSaveHeaderOutMileage(val);
    }, 1200);
  };

  const handleSaveHeaderOutMileage = (valOverride?: string) => {
    if (outMilesDebounceTimerRef.current) {
      clearTimeout(outMilesDebounceTimerRef.current);
    }
    if (!selectedRO) return;
    const rawVal = valOverride !== undefined ? valOverride : headerOutMileageInput;
    const cleanVal = rawVal.trim();
    const numMiles = cleanVal !== '' && !isNaN(Number(cleanVal)) ? Number(cleanVal) : undefined;
    
    updateRepairOrderDetails(selectedRO.id, {
      outMileage: numMiles,
      vehicle: {
        ...selectedRO.vehicle,
        outMileage: numMiles
      }
    });
    setEditVehicleOutMileage(numMiles !== undefined ? numMiles : '');
    setOutMilesSaved(true);
    setTimeout(() => setOutMilesSaved(false), 2500);
  };

  // Keep manager edit state synced when selectedRO updates (unless currently editing)
  useEffect(() => {
    if (!selectedRO || isEditingDetails) return;
    if (!isEditingRoNumber) {
      setEditRoNumberInput(selectedRO.id || '');
    }
    setEditCustomerName(selectedRO.customerName || '');
    setEditCustomerPhone(selectedRO.customerPhone || '');
    setEditVehicleYear(selectedRO.vehicle?.year || '');
    setEditVehicleMake(selectedRO.vehicle?.make || '');
    setEditVehicleModel(selectedRO.vehicle?.model || '');
    setEditVehicleVin(selectedRO.vehicle?.vin || '');
    setEditVehicleMileage(selectedRO.vehicle?.mileage ?? '');
    setEditVehicleOutMileage(selectedRO.outMileage ?? selectedRO.vehicle?.outMileage ?? '');
    setEditPrimaryConcern(selectedRO.primaryConcern || '');
    setEditConcerns(selectedRO.concerns && selectedRO.concerns.length > 0 ? selectedRO.concerns : [selectedRO.primaryConcern || '']);
    setEditConcernPayTypes(
      selectedRO.concernPayTypes && selectedRO.concernPayTypes.length > 0
        ? selectedRO.concernPayTypes
        : (selectedRO.concerns || [selectedRO.primaryConcern || '']).map(() => 'CUSTOMER_PAY')
    );
    setEditConcernTechIds(
      selectedRO.concernTechIds && selectedRO.concernTechIds.length > 0
        ? selectedRO.concernTechIds
        : (selectedRO.concerns || [selectedRO.primaryConcern || '']).map(() => selectedRO.techId)
    );
    setEditConcernCauses(
      selectedRO.concernCauses && selectedRO.concernCauses.length > 0
        ? selectedRO.concernCauses
        : (selectedRO.concerns || [selectedRO.primaryConcern || '']).map((_, i) => i === 0 ? (selectedRO.cause || '') : '')
    );
    setEditConcernCorrections(
      selectedRO.concernCorrections && selectedRO.concernCorrections.length > 0
        ? selectedRO.concernCorrections
        : (selectedRO.concerns || [selectedRO.primaryConcern || '']).map((_, i) => i === 0 ? (selectedRO.correction || '') : '')
    );
    setEditPromisedTime(selectedRO.promisedTime || '');
    setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
    setEditCause(selectedRO.cause || '');
    setEditCorrection(selectedRO.correction || '');
    setEditIsUrgent(selectedRO.isUrgent || false);
    setEditIsWaiter(selectedRO.isWaiter || false);
  }, [selectedRO, isEditingDetails]);

  // Keep tech cause/correction synced when selectedRO changes and not editing
  useEffect(() => {
    if (!selectedRO || isEditingTechFindings) return;
    setTechCauseInput(selectedRO.cause || selectedRO.diagnosticNotes || '');
    setTechCorrectionInput(selectedRO.correction || '');
  }, [selectedRO, isEditingTechFindings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (managerAutoSaveTimerRef.current) clearTimeout(managerAutoSaveTimerRef.current);
      if (techFindingsAutoSaveTimerRef.current) clearTimeout(techFindingsAutoSaveTimerRef.current);
    };
  }, []);

  const triggerManagerAutoSave = (overrides?: Partial<RepairOrder>) => {
    if ((!isManager && !isAdvisor) || !selectedRO) return;
    setManagerAutoSaveStatus('saving');
    if (managerAutoSaveTimerRef.current) {
      clearTimeout(managerAutoSaveTimerRef.current);
    }
    managerAutoSaveTimerRef.current = setTimeout(() => {
      const validConcerns = (overrides?.concerns || editConcerns).map(c => c.trim()).filter(Boolean);
      const finalPrimary = validConcerns[0] || (overrides?.primaryConcern ?? editPrimaryConcern).trim() || selectedRO.primaryConcern;
      const finalConcernTechIds = overrides?.concernTechIds !== undefined ? overrides.concernTechIds : editConcernTechIds;
      const finalConcernCauses = overrides?.concernCauses !== undefined ? overrides.concernCauses : editConcernCauses;
      const finalConcernCorrections = overrides?.concernCorrections !== undefined ? overrides.concernCorrections : editConcernCorrections;

      const parsedOutMiles = editVehicleOutMileage !== '' && !isNaN(Number(editVehicleOutMileage)) ? Number(editVehicleOutMileage) : undefined;
      const finalOutMileage = overrides?.outMileage !== undefined ? overrides.outMileage : (parsedOutMiles !== undefined ? parsedOutMiles : selectedRO.outMileage);

      updateRepairOrderDetails(selectedRO.id, {
        customerName: overrides?.customerName !== undefined ? overrides.customerName : editCustomerName.trim(),
        customerPhone: overrides?.customerPhone !== undefined ? overrides.customerPhone : editCustomerPhone.trim(),
        outMileage: finalOutMileage,
        vehicle: {
          ...selectedRO.vehicle,
          year: overrides?.vehicle?.year !== undefined ? overrides.vehicle.year : (Number(editVehicleYear) || selectedRO.vehicle.year),
          make: overrides?.vehicle?.make !== undefined ? overrides.vehicle.make : editVehicleMake.trim(),
          model: overrides?.vehicle?.model !== undefined ? overrides.vehicle.model : editVehicleModel.trim(),
          vin: overrides?.vehicle?.vin !== undefined ? overrides.vehicle.vin : editVehicleVin.trim().toUpperCase(),
          mileage: overrides?.vehicle?.mileage !== undefined ? overrides.vehicle.mileage : (Number(editVehicleMileage) || selectedRO.vehicle.mileage || 0),
          outMileage: finalOutMileage
        },
        primaryConcern: finalPrimary,
        concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
        concernPayTypes: overrides?.concernPayTypes !== undefined ? overrides.concernPayTypes : editConcernPayTypes,
        concernTechIds: finalConcernTechIds,
        concernTechNames: finalConcernTechIds.map(id => id ? users.find(u => u.id === id)?.name : undefined),
        concernCauses: finalConcernCauses,
        concernCorrections: finalConcernCorrections,
        promisedTime: overrides?.promisedTime !== undefined ? overrides.promisedTime : editPromisedTime,
        diagnosticNotes: overrides?.diagnosticNotes !== undefined ? overrides.diagnosticNotes : editDiagnosticNotes.trim(),
        cause: finalConcernCauses[0] || (overrides?.cause !== undefined ? overrides.cause : editCause.trim()),
        correction: finalConcernCorrections[0] || (overrides?.correction !== undefined ? overrides.correction : editCorrection.trim()),
        isUrgent: overrides?.isUrgent !== undefined ? overrides.isUrgent : editIsUrgent,
        isWaiter: overrides?.isWaiter !== undefined ? overrides.isWaiter : editIsWaiter,
        ...overrides
      }, { isAutoSave: true });

      setManagerAutoSaveStatus('saved');
      setManagerLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  const flushManagerAutoSave = () => {
    if (managerAutoSaveTimerRef.current) {
      clearTimeout(managerAutoSaveTimerRef.current);
      managerAutoSaveTimerRef.current = null;
    }
    if ((!isManager && !isAdvisor) || !selectedRO) return;
    const validConcerns = editConcerns.map(c => c.trim()).filter(Boolean);
    const finalPrimary = validConcerns[0] || editPrimaryConcern.trim() || selectedRO.primaryConcern;

    const parsedOutMiles = editVehicleOutMileage !== '' && !isNaN(Number(editVehicleOutMileage)) ? Number(editVehicleOutMileage) : undefined;

    updateRepairOrderDetails(selectedRO.id, {
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      outMileage: parsedOutMiles,
      vehicle: {
        ...selectedRO.vehicle,
        year: Number(editVehicleYear) || selectedRO.vehicle.year,
        make: editVehicleMake.trim(),
        model: editVehicleModel.trim(),
        vin: editVehicleVin.trim().toUpperCase(),
        mileage: Number(editVehicleMileage) || selectedRO.vehicle.mileage || 0,
        outMileage: parsedOutMiles
      },
      primaryConcern: finalPrimary,
      concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
      concernPayTypes: editConcernPayTypes,
      concernTechIds: editConcernTechIds,
      concernTechNames: editConcernTechIds.map(id => id ? users.find(u => u.id === id)?.name : undefined),
      concernCauses: editConcernCauses,
      concernCorrections: editConcernCorrections,
      promisedTime: editPromisedTime,
      diagnosticNotes: editDiagnosticNotes.trim(),
      cause: editConcernCauses[0] || editCause.trim(),
      correction: editConcernCorrections[0] || editCorrection.trim(),
      isUrgent: editIsUrgent,
      isWaiter: editIsWaiter
    }, { isAutoSave: true });
    setManagerAutoSaveStatus('saved');
    setManagerLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const triggerTechFindingsAutoSave = (c: string, corr: string) => {
    if (!selectedRO) return;
    setTechFindingsAutoSaveStatus('saving');
    if (techFindingsAutoSaveTimerRef.current) {
      clearTimeout(techFindingsAutoSaveTimerRef.current);
    }
    techFindingsAutoSaveTimerRef.current = setTimeout(() => {
      updateTechCauseAndCorrection(selectedRO.id, c, corr, { isAutoSave: true });
      setTechFindingsAutoSaveStatus('saved');
      setTechFindingsLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  const flushTechFindingsAutoSave = () => {
    if (techFindingsAutoSaveTimerRef.current) {
      clearTimeout(techFindingsAutoSaveTimerRef.current);
      techFindingsAutoSaveTimerRef.current = null;
    }
    if (!selectedRO) return;
    updateTechCauseAndCorrection(selectedRO.id, techCauseInput, techCorrectionInput, { isAutoSave: true });
    setTechFindingsAutoSaveStatus('saved');
    setTechFindingsLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleEditConcernChange = (index: number, val: string) => {
    setEditConcerns(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleEditConcernCauseChange = (index: number, val: string) => {
    setEditConcernCauses(prev => {
      const next = [...prev];
      while (next.length <= index) next.push('');
      next[index] = val;
      return next;
    });
    if (index === 0) {
      setEditCause(val);
    }
  };

  const handleEditConcernCorrectionChange = (index: number, val: string) => {
    setEditConcernCorrections(prev => {
      const next = [...prev];
      while (next.length <= index) next.push('');
      next[index] = val;
      return next;
    });
    if (index === 0) {
      setEditCorrection(val);
    }
  };

  const handleAddEditConcern = () => {
    setEditConcerns(prev => [...prev, '']);
    setEditConcernPayTypes(prev => [...prev, 'CUSTOMER_PAY']);
    setEditConcernTechIds(prev => [...prev, selectedRO?.techId || undefined]);
    setEditConcernCauses(prev => [...prev, '']);
    setEditConcernCorrections(prev => [...prev, '']);
  };

  const handleRemoveEditConcern = (index: number) => {
    setEditConcerns(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
    setEditConcernPayTypes(prev => {
      if (prev.length <= 1) return ['CUSTOMER_PAY'];
      return prev.filter((_, i) => i !== index);
    });
    setEditConcernTechIds(prev => {
      if (prev.length <= 1) return [undefined];
      return prev.filter((_, i) => i !== index);
    });
    setEditConcernCauses(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
    setEditConcernCorrections(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEditPayTypeChange = (index: number, payType: ConcernPayType) => {
    setEditConcernPayTypes(prev => {
      const next = [...prev];
      next[index] = payType;
      return next;
    });
    if (selectedRO) {
      updateConcernPayType(selectedRO.id, index, payType);
    }
  };

  const handleEditConcernTechChange = (index: number, tId: string) => {
    const nextTechIds = [...editConcernTechIds];
    nextTechIds[index] = tId || undefined;
    setEditConcernTechIds(nextTechIds);
    if (selectedRO) {
      const t = users.find(u => u.id === tId);
      updateConcernTech(selectedRO.id, index, tId, t?.name);
    }
  };

  const handleSaveRoNumber = async () => {
    if (!selectedRO) return;
    let cleanNew = editRoNumberInput.trim().toUpperCase();
    if (cleanNew.startsWith('#')) {
      cleanNew = cleanNew.slice(1).trim();
    }
    if (!cleanNew) {
      setRoNumberError('Repair Order number cannot be empty.');
      return;
    }
    if (cleanNew === selectedRO.id) {
      setIsEditingRoNumber(false);
      setRoNumberError(null);
      return;
    }
    setIsSavingRoNumber(true);
    setRoNumberError(null);
    try {
      const result = await updateRepairOrderId(selectedRO.id, cleanNew);
      if (result.success) {
        setIsEditingRoNumber(false);
        setEditRoNumberInput(cleanNew);
        setManagerActionFeedback(`Repair Order number updated to #${cleanNew}`);
        setTimeout(() => setManagerActionFeedback(null), 3500);
      } else {
        setRoNumberError(result.error || 'Failed to update RO number');
      }
    } catch (err: any) {
      setRoNumberError(err?.message || 'Failed to update RO number');
    } finally {
      setIsSavingRoNumber(false);
    }
  };

  // Auto-VIN Decoding state for edit modal
  const [isDecodingEditVin, setIsDecodingEditVin] = useState(false);
  const [editVinDecodedMsg, setEditVinDecodedMsg] = useState<string | null>(null);
  const [editVinError, setEditVinError] = useState<string | null>(null);
  const editVinAbortRef = React.useRef<AbortController | null>(null);
  const editVinDebounceRef = React.useRef<any>(null);

  const runEditVinDecode = async (inputVin: string, isManual = false) => {
    const cleanVin = inputVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanVin.length < 10) {
      if (isManual) setEditVinError('VIN must be at least 10 characters');
      return;
    }

    if (editVinAbortRef.current) {
      editVinAbortRef.current.abort();
    }
    editVinAbortRef.current = new AbortController();

    setIsDecodingEditVin(true);
    setEditVinError(null);
    setEditVinDecodedMsg(null);

    try {
      const result = await decodeVin(cleanVin, editVinAbortRef.current.signal);
      if (result.success) {
        if (result.year) setEditVehicleYear(result.year);
        if (result.make) setEditVehicleMake(result.make);
        if (result.model) setEditVehicleModel(result.model);

        const summary = [result.year, result.make, result.model].filter(Boolean).join(' ');
        setEditVinDecodedMsg(summary ? `Auto-populated: ${summary}` : 'Decoded successfully');
      } else if (isManual || cleanVin.length === 17) {
        setEditVinError(result.error || 'Could not decode VIN');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setEditVinError('Error decoding VIN');
      }
    } finally {
      setIsDecodingEditVin(false);
    }
  };

  const handleEditVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setEditVehicleVin(rawVal);
    setEditVinDecodedMsg(null);
    setEditVinError(null);

    if (editVinDebounceRef.current) {
      clearTimeout(editVinDebounceRef.current);
    }

    if (rawVal.length === 17) {
      runEditVinDecode(rawVal, false);
    } else if (rawVal.length >= 10) {
      editVinDebounceRef.current = setTimeout(() => {
        runEditVinDecode(rawVal, false);
      }, 500);
    }
  };

  React.useEffect(() => {
    if (selectedRO) {
      setEditCustomerName(selectedRO.customerName);
      setEditCustomerPhone(selectedRO.customerPhone);
      setEditVehicleYear(selectedRO.vehicle.year);
      setEditVehicleMake(selectedRO.vehicle.make);
      setEditVehicleModel(selectedRO.vehicle.model);
      setEditVehicleVin(selectedRO.vehicle.vin);
      const cleanRO = cleanRO3700(selectedRO);
      setEditPrimaryConcern(cleanRO.primaryConcern);
      const initialConcerns = cleanRO.concerns && cleanRO.concerns.length > 0
        ? cleanRO.concerns
        : [cleanRO.primaryConcern || ''];

      setEditConcerns(initialConcerns);
      const rawPayTypes: ConcernPayType[] = cleanRO.concernPayTypes && cleanRO.concernPayTypes.length > 0
        ? (cleanRO.concernPayTypes as ConcernPayType[])
        : initialConcerns.map(() => 'CUSTOMER_PAY' as ConcernPayType);
      setEditConcernPayTypes(rawPayTypes);

      const rawTechIds = cleanRO.concernTechIds && cleanRO.concernTechIds.length > 0
        ? cleanRO.concernTechIds
        : initialConcerns.map(() => cleanRO.techId);
      setEditConcernTechIds(rawTechIds);
      setEditPromisedTime(selectedRO.promisedTime);
      setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
      setEditCause(selectedRO.cause || '');
      setEditCorrection(selectedRO.correction || '');
      setEditIsUrgent(selectedRO.isUrgent || false);
      setEditIsWaiter(selectedRO.isWaiter || false);
      setTechCauseInput(selectedRO.cause || selectedRO.diagnosticNotes || '');
      setTechCorrectionInput(selectedRO.correction || '');
      setIsEditingDetails(false);
      setIsEditingTechFindings(false);
      if (selectedROModalTab) {
        setActiveTab(selectedROModalTab);
        setSelectedROModalTab(null);
      } else if (isTechScreen) {
        setActiveTab('DETAILS');
      } else {
        setActiveTab('QUOTE_PARTS');
      }
    }
  }, [selectedRO?.id, selectedROModalTab, currentUser.role, activeRoleView, isTechScreen, setSelectedROModalTab]);

  const [activeTab, setActiveTab] = useState<'QUOTE_PARTS' | 'DETAILS' | 'LINES' | 'PHOTOS' | 'CHAT' | 'PARTS' | 'HISTORY' | 'CONTACTS' | 'WARRANTY'>('QUOTE_PARTS');

  useEffect(() => {
    if (selectedROModalTab) {
      setActiveTab(selectedROModalTab);
      setSelectedROModalTab(null);
    }
  }, [selectedROModalTab, setSelectedROModalTab]);

  useEffect(() => {
    if (isTechScreen && (activeTab === 'LINES' || activeTab === 'HISTORY' || activeTab === 'CONTACTS' || activeTab === 'PHOTOS')) {
      setActiveTab('DETAILS');
    }
    if (isAdvisorScreen && (activeTab === 'LINES' || activeTab === 'HISTORY' || activeTab === 'WARRANTY')) {
      setActiveTab('DETAILS');
    }
  }, [isTechScreen, isAdvisorScreen, activeTab]);

  // When CHAT or PARTS tab is open and there are unread messages, mark them as read
  useEffect(() => {
    if ((activeTab === 'CHAT' || activeTab === 'PARTS') && selectedRO?.id) {
      const hasUnread = (selectedRO.messages || []).some(m => !(m.readBy || []).includes(currentUser.id));
      if (hasUnread) {
        markROMessagesAsRead(selectedRO.id);
      }
    }
  }, [activeTab, selectedRO?.id, selectedRO?.messages, currentUser.id, markROMessagesAsRead]);

  const [chatInput, setChatInput] = useState('');
  const [embeddedMsgInput, setEmbeddedMsgInput] = useState('');
  const [isEmbeddedUrgent, setIsEmbeddedUrgent] = useState(false);

  // Quick Order State inside RO
  const [quickOrderPart, setQuickOrderPart] = useState<any | null>(null);
  const [quickOrderVendor, setQuickOrderVendor] = useState('STELLANTIS');
  const [quickOrderEtaOption, setQuickOrderEtaOption] = useState<'TODAY_AFTERNOON' | 'TOMORROW_MORNING' | '1_2_DAYS' | 'CUSTOM'>('TOMORROW_MORNING');
  const [quickOrderCustomEta, setQuickOrderCustomEta] = useState('');
  const [quickOrderTracking, setQuickOrderTracking] = useState('');
  const [quickOrderSuccessNote, setQuickOrderSuccessNote] = useState<string | null>(null);
  const [isUrgentMessage, setIsUrgentMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUrgentStatusUpdate, setIsUrgentStatusUpdate] = useState(false);

  // New Part Form state
  const DEFAULT_MODAL_VENDORS = ['STELLANTIS', 'OREILLY', 'AUTOZONE', 'HOLLANDS', 'RICKS PRO TRUCK'];
  const [modalVendors, setModalVendors] = useState<string[]>(DEFAULT_MODAL_VENDORS);
  const DEFAULT_MODAL_STATUSES = [
    { id: 'IN_STOCK', label: 'IN STOCK' },
    { id: 'LOCAL_PURCHASE', label: 'LOCAL PURCHASE' },
    { id: 'DAILY_ORDER', label: 'DAILY ORDER' },
    { id: 'SPECIAL_ORDER_1_5_DAYS', label: 'SPECIAL ORDER 1-5 DAYS' },
    { id: 'VOR_UPGRADE', label: 'VOR UPGRADE' },
  ];
  const [modalStatuses, setModalStatuses] = useState<Array<{ id: string; label: string }>>(DEFAULT_MODAL_STATUSES);
  const [isModalAddingCustomStatus, setIsModalAddingCustomStatus] = useState(false);
  const [modalCustomStatusInput, setModalCustomStatusInput] = useState('');
  const [customStatusEditingPartId, setCustomStatusEditingPartId] = useState<string | null>(null);
  const [partQuickCustomStatusInput, setPartQuickCustomStatusInput] = useState('');

  const [showAddPart, setShowAddPart] = useState(false);
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partVendor, setPartVendor] = useState(DEFAULT_MODAL_VENDORS[0]);
  const [isModalAddingCustomVendor, setIsModalAddingCustomVendor] = useState(false);
  const [modalCustomVendorInput, setModalCustomVendorInput] = useState('');
  const [partInitialStatus, setPartInitialStatus] = useState<PartStatus>('IN_STOCK');
  const [partTimeFrameId, setPartTimeFrameId] = useState<string>('TODAY_5PM');
  const [partEstimatedArrival, setPartEstimatedArrival] = useState<string>('');
  const [partPrice, setPartPrice] = useState('');
  const [partEtaTime, setPartEtaTime] = useState('17:00');
  const [partTracking, setPartTracking] = useState('');

  // Dispatch selector state
  const [selectedTechId, setSelectedTechId] = useState(selectedRO?.techId || '');
  const [techAssignSuccess, setTechAssignSuccess] = useState(false);

  // Service Writer (Advisor) selector state
  const [selectedAdvisorId, setSelectedAdvisorId] = useState(selectedRO?.advisorId || '');
  const [advisorReassignSuccess, setAdvisorReassignSuccess] = useState(false);
  const [isReassigningAdvisorInline, setIsReassigningAdvisorInline] = useState(false);

  // Sync state when selectedRO changes
  useEffect(() => {
    if (selectedRO) {
      setSelectedAdvisorId(selectedRO.advisorId || '');
      setSelectedTechId(selectedRO.techId || '');
    }
  }, [selectedRO?.id, selectedRO?.advisorId, selectedRO?.techId]);

  if (!selectedRO) return null;

  const currentStatusInfo = STATUS_CONFIG[selectedRO.status] || STATUS_CONFIG.CREATED;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(selectedRO.id, chatInput, isUrgentMessage);
    setChatInput('');
    setIsUrgentMessage(false);
  };

  const handleSendEmbeddedMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!embeddedMsgInput.trim() || !selectedRO) return;
    sendMessage(selectedRO.id, embeddedMsgInput.trim(), isEmbeddedUrgent);
    setEmbeddedMsgInput('');
    setIsEmbeddedUrgent(false);
  };

  const handleSendQuickMessage = (text: string) => {
    if (!selectedRO) return;
    sendMessage(selectedRO.id, text, false);
  };

  const handleQuickMarkOrderedSubmit = () => {
    if (!quickOrderPart || !selectedRO) return;
    
    let etaString = '';
    const now = new Date();
    if (quickOrderEtaOption === 'TODAY_AFTERNOON') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);
      etaString = d.toISOString();
    } else if (quickOrderEtaOption === 'TOMORROW_MORNING') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 30);
      etaString = d.toISOString();
    } else if (quickOrderEtaOption === '1_2_DAYS') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 12, 0);
      etaString = d.toISOString();
    } else if (quickOrderEtaOption === 'CUSTOM' && quickOrderCustomEta) {
      etaString = new Date(quickOrderCustomEta).toISOString();
    } else {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 30);
      etaString = d.toISOString();
    }

    const etaDisplay = quickOrderEtaOption === 'TODAY_AFTERNOON' ? 'Today Afternoon (4:00 PM)' :
      quickOrderEtaOption === 'TOMORROW_MORNING' ? 'Tomorrow Morning (9:30 AM)' :
      quickOrderEtaOption === '1_2_DAYS' ? '1-2 Business Days' :
      quickOrderCustomEta || 'Pending ETA';

    const notes = quickOrderTracking.trim() ? `PO / Tracking: ${quickOrderTracking.trim()}` : undefined;

    updatePartStatus(selectedRO.id, quickOrderPart.id, 'ORDERED', etaString, notes);

    // Automatically post status update announcement into Message Center thread
    const partLabel = quickOrderPart.partNumber ? `#${quickOrderPart.partNumber} (${quickOrderPart.name})` : quickOrderPart.name;
    const autoMsg = `🚚 Part ${partLabel} marked ON ORDER from ${quickOrderVendor} • Expected: ${etaDisplay}${quickOrderTracking ? ` • Ref/Tracking: ${quickOrderTracking.trim()}` : ''}`;
    sendMessage(selectedRO.id, autoMsg, false);

    setQuickOrderSuccessNote(`Ordered ${partLabel}`);
    setTimeout(() => setQuickOrderSuccessNote(null), 3000);
    setQuickOrderPart(null);
    setQuickOrderTracking('');
    setQuickOrderCustomEta('');
  };

  const handleQuickMarkArrived = (part: any) => {
    if (!selectedRO) return;
    updatePartStatus(selectedRO.id, part.id, 'RECEIVED');
    const partLabel = part.partNumber ? `#${part.partNumber} (${part.name})` : part.name;
    const autoMsg = `🟢 Parts Arrived: ${partLabel} is at the parts counter / staged in bin ready for technician ${selectedRO.techName || ''}!`;
    sendMessage(selectedRO.id, autoMsg, true);
    setQuickOrderSuccessNote(`Part marked arrived: ${partLabel}`);
    setTimeout(() => setQuickOrderSuccessNote(null), 3000);
  };

  const handleQuickIssueToTech = (part: any) => {
    if (!selectedRO) return;
    updatePartStatus(selectedRO.id, part.id, 'ISSUED_TO_TECH');
    const partLabel = part.partNumber ? `#${part.partNumber} (${part.name})` : part.name;
    const autoMsg = `🔧 ${partLabel} issued to technician ${selectedRO.techName || ''} for active installation.`;
    sendMessage(selectedRO.id, autoMsg, false);
  };

  const handleMarkAllPendingOrdered = () => {
    if (!selectedRO) return;
    const success = markAllPartsOrderedOnRO(selectedRO.id);
    if (success) {
      const autoMsg = `🚚 All approved & pending parts for RO #${selectedRO.id} marked ON ORDER with suppliers. Live ETAs initialized.`;
      sendMessage(selectedRO.id, autoMsg, false);
      setQuickOrderSuccessNote(`All approved parts marked ON ORDER!`);
      setTimeout(() => setQuickOrderSuccessNote(null), 3000);
    }
  };

  const handleStatusChange = (newStatus: ROStatus, note?: string) => {
    updateROStatus(selectedRO.id, newStatus, note || statusNote, isUrgentStatusUpdate);
    setStatusNote('');
    setIsUrgentStatusUpdate(false);
  };

  const handleAssignTech = (techId: string) => {
    if (!selectedRO) return;
    setSelectedTechId(techId);
    if (techId) {
      dispatchRO(selectedRO.id, techId);
      setTechAssignSuccess(true);
      setTimeout(() => setTechAssignSuccess(false), 3000);
    }
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim() || !partDescription.trim()) return;

    // Resolve expectation of part arrival & status
    const tfCalc = partTimeFrameId ? computeEtaAndStatus(partTimeFrameId) : null;

    const effectiveVendor = isModalAddingCustomVendor && modalCustomVendorInput.trim()
      ? modalCustomVendorInput.trim().toUpperCase()
      : partVendor;

    if (isModalAddingCustomVendor && modalCustomVendorInput.trim() && !modalVendors.includes(effectiveVendor)) {
      setModalVendors(prev => [...prev, effectiveVendor]);
    }

    const effectiveStatus = canChangePartStatus
      ? (isModalAddingCustomStatus && modalCustomStatusInput.trim()
          ? modalCustomStatusInput.trim().toUpperCase().replace(/\s+/g, '_')
          : (tfCalc?.status || partInitialStatus))
      : 'REQUESTED';

    if (canChangePartStatus && isModalAddingCustomStatus && modalCustomStatusInput.trim()) {
      const label = modalCustomStatusInput.trim().toUpperCase();
      if (!modalStatuses.some(s => s.id === effectiveStatus)) {
        setModalStatuses(prev => [...prev, { id: effectiveStatus, label }]);
      }
    }

    let etaArrival = partEstimatedArrival || tfCalc?.estimatedArrival;
    if (!etaArrival) {
      if (effectiveStatus === 'IN_STOCK') {
        etaArrival = new Date().toISOString();
      } else {
        const today = new Date();
        const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
        const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));
        etaArrival = etaDate.toISOString();
      }
    }

    addPartOrder(selectedRO.id, {
      partNumber: partNumber.trim().toUpperCase(),
      description: partDescription.trim(),
      quantity: partQuantity || 1,
      status: effectiveStatus,
      vendor: effectiveVendor || 'STELLANTIS',
      estimatedArrival: etaArrival,
      trackingNumber: partTracking.trim() || undefined,
      price: partPrice && !isNaN(parseFloat(partPrice)) ? Number(parseFloat(partPrice).toFixed(2)) : undefined,
    });

    setPartNumber('');
    setPartDescription('');
    setPartQuantity(1);
    setPartPrice('');
    setPartTracking('');
    setIsModalAddingCustomVendor(false);
    setModalCustomVendorInput('');
    setIsModalAddingCustomStatus(false);
    setModalCustomStatusInput('');
    setShowAddPart(false);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager || !selectedRO) return;

    flushManagerAutoSave();
    setIsEditingDetails(false);
    setManagerActionFeedback('All repair order information auto-saved and recorded to audit trail.');
    setTimeout(() => setManagerActionFeedback(null), 3500);
  };

  const handleSaveTechFindings = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!selectedRO) return;
    flushTechFindingsAutoSave();
    setIsEditingTechFindings(false);
    setTechSaveSuccess(true);
    setTimeout(() => setTechSaveSuccess(false), 3000);
  };

  const handleConfirmDelete = () => {
    if (!isManager || !selectedRO) return;
    deleteRepairOrder(selectedRO.id);
    setIsDeleteConfirmOpen(false);
  };

  const technicians = users.filter(u => u.role === 'TECHNICIAN');
  const serviceWriters = users.filter(u => 
    (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated
  );

  const handleReassignAdvisor = (newAdvId?: string) => {
    const targetAdvisorId = newAdvId || selectedAdvisorId;
    if (!targetAdvisorId || !selectedRO) return;
    const ok = reassignServiceWriter(selectedRO.id, targetAdvisorId);
    if (ok) {
      setAdvisorReassignSuccess(true);
      setIsReassigningAdvisorInline(false);
      setTimeout(() => setAdvisorReassignSuccess(false), 3500);
    }
  };
  const statusOptions: ROStatus[] = [
    'WAITING_DIAGNOSTICS',
    'IN_DIAG',
    'ESTIMATE_DONE',
    'WAITING_FOR_APPROVAL',
    'APPROVED',
    'DENIED',
    'PARTS_ORDERED',
    'PARTS_IN_TO_TECH',
    'REPAIR_IN_PROGRESS',
    'REPAIR_COMPLETE',
    'READY_FOR_PICKUP',
    'CLOSED'
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-hidden animate-in fade-in duration-150">
      <div 
        id="ro-detail-modal"
        className="bg-white w-full h-full flex flex-col overflow-hidden"
      >
        {/* Top Header - Dark Navy Modern Theme matching Technician & Advisor Specification */}
        <div className="p-4 sm:px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 flex-wrap relative">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Blue RO number badge with 1-click edit */}
            {isEditingRoNumber ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveRoNumber();
                }}
                className="inline-flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border-2 border-blue-400 shadow-md shrink-0"
              >
                <span className="text-blue-300 font-mono font-black text-sm pl-1.5">#</span>
                <input
                  type="text"
                  value={editRoNumberInput}
                  onChange={(e) => {
                    setEditRoNumberInput(e.target.value.toUpperCase());
                    if (roNumberError) setRoNumberError(null);
                  }}
                  placeholder="RO #..."
                  autoFocus
                  className="w-24 sm:w-32 px-2 py-1 text-xs sm:text-sm font-mono font-black bg-slate-900 text-white border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 uppercase tracking-wider"
                />
                <button
                  type="submit"
                  disabled={isSavingRoNumber}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                  title="Save New RO Number"
                >
                  {isSavingRoNumber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditRoNumberInput(selectedRO.id);
                    setIsEditingRoNumber(false);
                    setRoNumberError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="relative group inline-flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditRoNumberInput(selectedRO.id);
                    setIsEditingRoNumber(true);
                    setRoNumberError(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-sm sm:text-base tracking-wider shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer transition-all border border-blue-500 hover:border-blue-300 ring-1 ring-blue-400/30 group"
                  title="Click to edit Repair Order Number (RO #)"
                >
                  <span>#{selectedRO.id}</span>
                  <Edit3 className="w-3.5 h-3.5 text-blue-200 group-hover:text-white group-hover:scale-110 transition-all ml-0.5" />
                </button>
              </div>
            )}

            {roNumberError && (
              <div className="w-full bg-red-900/90 border border-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center justify-between gap-2 mt-1">
                <span>⚠️ {roNumberError}</span>
                <button type="button" onClick={() => setRoNumberError(null)} className="text-red-200 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div>
              {/* Row 1: Customer Name and Phone */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  {selectedRO.customerName}
                </h2>
                {selectedRO.customerPhone && (
                  <span className="text-xs sm:text-sm text-slate-300 font-medium">
                    ({selectedRO.customerPhone})
                  </span>
                )}
              </div>

              {/* Row 2: Vehicle, VIN & Advisor */}
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-white font-extrabold">{selectedRO.vehicle?.year} {selectedRO.vehicle?.make} {selectedRO.vehicle?.model}</span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-slate-300">VIN:</span>
                  <span className="font-mono text-blue-300 font-bold tracking-wide select-all">{selectedRO.vehicle?.vin || 'N/A'}</span>
                  {selectedRO.vehicle?.vin && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRO.vehicle.vin);
                        setManagerActionFeedback(`Copied VIN: ${selectedRO.vehicle.vin}`);
                        setTimeout(() => setManagerActionFeedback(null), 3000);
                      }}
                      className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy VIN to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium text-xs sm:text-sm flex items-center gap-1">
                  <span>Advisor:</span>
                  {canReassignServiceWriter ? (
                    <select
                      id="header-reassign-advisor-select"
                      value={selectedRO.advisorId || selectedAdvisorId}
                      onChange={e => {
                        const newId = e.target.value;
                        setSelectedAdvisorId(newId);
                        if (newId && newId !== selectedRO.advisorId) {
                          handleReassignAdvisor(newId);
                        }
                      }}
                      className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-600 hover:border-blue-400 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none text-white font-bold cursor-pointer"
                      title="Change Service Advisor"
                    >
                      {serviceWriters.map(writer => (
                        <option key={writer.id} value={writer.id} className="bg-slate-900 text-white">
                          {writer.name}{writer.employeeNumber ? ` (#${writer.employeeNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong className="text-white">{selectedRO.advisorName}</strong>
                  )}
                  {advisorReassignSuccess && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/50">
                      ✓ Updated
                    </span>
                  )}
                </span>
              </p>

              {/* Row 3: Current Miles & Out Miles */}
              <div className="flex items-center gap-3 sm:gap-4 text-sm text-slate-200 mt-1.5 font-semibold flex-wrap">
                {/* Current Miles Badge with inline edit */}
                {isEditingHeaderMileage ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveHeaderMileage();
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg border-2 border-blue-400 shadow-2xs"
                  >
                    <span className="text-slate-300 text-xs uppercase tracking-wider font-bold">CURRENT MILES:</span>
                    <input
                      type="number"
                      value={headerMileageInput}
                      onChange={(e) => setHeaderMileageInput(e.target.value)}
                      placeholder="Miles..."
                      autoFocus
                      className="w-24 px-1.5 py-0.5 text-xs font-mono font-black bg-slate-900 text-white border border-blue-400 rounded focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                      title="Save Intake Mileage"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingHeaderMileage(false)}
                      className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMileageInput(selectedRO.vehicle.mileage ? String(selectedRO.vehicle.mileage) : '');
                      setIsEditingHeaderMileage(true);
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-600 shadow-2xs cursor-pointer transition-colors group"
                    title="Click to enter or edit Current Miles"
                  >
                    <span className="text-slate-300 text-xs uppercase tracking-wider font-bold">CURRENT MILES:</span>
                    <span className="font-mono text-base font-black text-white">
                      {selectedRO.vehicle.mileage !== undefined && selectedRO.vehicle.mileage !== null && Number(selectedRO.vehicle.mileage) > 0
                        ? `${Number(selectedRO.vehicle.mileage).toLocaleString()} mi`
                        : '+ Enter In Miles'}
                    </span>
                    <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-400 transition-colors ml-0.5" />
                  </button>
                )}

                {/* Out Miles Badge & Input Box (Exact Match to Screenshot) */}
                <div className="flex items-center gap-2 bg-slate-800/95 px-3.5 py-1.5 rounded-lg border-2 border-emerald-400/90 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30 flex-wrap">
                  <span className="text-emerald-300 text-xs uppercase tracking-wider font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    OUT MILES:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Type out miles..."
                      value={headerOutMileageInput}
                      onChange={(e) => handleOutMilesChange(e.target.value)}
                      onBlur={() => handleSaveHeaderOutMileage()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveHeaderOutMileage();
                        }
                      }}
                      className="w-28 sm:w-36 px-2.5 py-1 bg-slate-900 text-emerald-300 font-mono font-black text-sm sm:text-base rounded-md border-2 border-emerald-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/60 focus:outline-none placeholder:text-emerald-200/80 placeholder:text-xs placeholder:font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-xs"
                      title="Enter Out Miles (automatically saves as you type)"
                    />
                    {outMilesSaved && (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-400 animate-in fade-in">
                        ✓ Auto-Saved
                      </span>
                    )}
                    {(() => {
                      const outNum = Number(headerOutMileageInput);
                      const inNum = Number(selectedRO.vehicle.mileage);
                      if (!isNaN(outNum) && outNum > 0 && !isNaN(inNum) && inNum > 0 && outNum >= inNum) {
                        const diff = outNum - inNum;
                        return (
                          <span className="text-xs text-emerald-200 font-mono font-black ml-1 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            (+{diff.toFixed(1)} mi)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action buttons and Status Badges */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:mr-14">
            {/* Time in shop badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">In Shop:</span>
              <span className="text-white font-mono font-bold">
                {formatDurationSince(selectedRO.createdAt) || 'Just arrived'}
              </span>
            </div>

            {/* Status Badge */}
            {!isAdvisorScreen && (
              <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
            )}
            {selectedRO.isWaiter && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 px-2.5 py-1 rounded-md shadow-xs animate-pulse">
                <Clock className="w-3.5 h-3.5" /> WAITER
              </span>
            )}
            {selectedRO.isUrgent && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-amber-600 px-2.5 py-1 rounded-md shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" /> HIGH PRIORITY
              </span>
            )}

            {/* Pro Demand Link */}
            <a
              href="https://www.prodemand.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-600 transition-colors shadow-2xs shrink-0"
              title="Open Pro Demand flat rate labor times"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pro Demand</span> Labor ↗
            </a>

            {/* Line View (Itemized Concerns & Labor Lines) Quick Toggle */}
            {!isTechScreen && !isAdvisorScreen && (
              <button
                type="button"
                id="ro-modal-line-view-toggle"
                onClick={() => setActiveTab(activeTab === 'LINES' ? 'DETAILS' : 'LINES')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer border shadow-2xs shrink-0 ${
                  activeTab === 'LINES'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                }`}
                title="Toggle between Workflow and Itemized Line View"
              >
                <ListFilter className={`w-3.5 h-3.5 ${activeTab === 'LINES' ? 'text-white' : 'text-blue-300'}`} />
                <span>Line View</span>
              </button>
            )}

            {/* Sticky Note Quick Header Button */}
            <AddStickyNoteButton 
              roId={selectedRO.id} 
              hasNote={Boolean(selectedRO.stickyNote)}
            />

            {/* Service Manager Direct Part Entry (Ticket or Quote - No Tech Request Required) */}
            {isManager && (
              <button
                type="button"
                id="ro-modal-mgr-add-part-btn"
                onClick={() => setIsAddPartModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-amber-600 hover:bg-amber-500 active:scale-98 text-white border border-amber-400 shadow-sm transition-all cursor-pointer shrink-0"
                title="Service Manager Direct Part Entry: Add parts to ticket or quote without waiting for a tech request"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <Package className="w-3.5 h-3.5 text-amber-200" />
                <span>+ Add Part</span>
              </button>
            )}

            {/* Edit RO Info (Service Advisor & Service Manager) */}
            {(isManager || isAdvisor) && (
              <button
                type="button"
                id="edit-ro-info-btn"
                onClick={() => {
                  if (!isEditingDetails && selectedRO) {
                    setEditCustomerName(selectedRO.customerName);
                    setEditCustomerPhone(selectedRO.customerPhone);
                    setEditVehicleYear(selectedRO.vehicle.year);
                    setEditVehicleMake(selectedRO.vehicle.make);
                    setEditVehicleModel(selectedRO.vehicle.model);
                    setEditVehicleVin(selectedRO.vehicle.vin);
                    setEditVehicleMileage(selectedRO.vehicle.mileage ?? '');
                    setEditVehicleOutMileage(selectedRO.outMileage ?? selectedRO.vehicle.outMileage ?? '');
                    setEditPrimaryConcern(selectedRO.primaryConcern);
                    setEditPromisedTime(selectedRO.promisedTime);
                    setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
                    setActiveTab('DETAILS');
                  }
                  setIsEditingDetails(!isEditingDetails);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer border shrink-0 ${
                  isEditingDetails 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 shadow-2xs'
                }`}
                title="Edit customer complaints, vehicle details, promised time, and assignment"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingDetails ? 'Cancel Editing' : 'Edit RO Info'}</span>
              </button>
            )}

            {/* Quick Print RO / Estimate Button in Top Header */}
            <button
              type="button"
              id="top-header-print-ro-btn"
              onClick={() => openQuotePrintModal(selectedRO.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer border shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 shadow-2xs hover:text-white"
              title="Print Repair Order / Estimate Quote (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print RO</span>
            </button>
          </div>

          {/* Close Button positioned in the Upper Right Corner of the Screen / Header */}
          <button
            id="close-ro-detail-btn"
            type="button"
            onClick={() => setSelectedRO(null)}
            className="sm:absolute sm:top-4 sm:right-6 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 hover:border-slate-500 rounded-lg transition-colors shrink-0 cursor-pointer border border-slate-700 shadow-sm z-30"
            title="Close Repair Order"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        {isSales && (
          <div className="bg-teal-50 border-b border-teal-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-teal-950 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Sales Portal (Read-Only Mode):</strong> You have real-time visibility into customer vehicle repair stage, parts ETAs, and promised completion times.
              </span>
            </div>
            <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-teal-200 text-teal-900 border border-teal-300">
              Read-Only
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center border-b border-slate-200 px-3 sm:px-6 py-2.5 bg-slate-50 gap-2 overflow-x-auto shrink-0 shadow-2xs">
          {/* Quote & Parts Pipeline Tab (Primary Working View) */}
          <button
            id="ro-tab-quote-parts"
            type="button"
            onClick={() => setActiveTab('QUOTE_PARTS')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
              activeTab === 'QUOTE_PARTS'
                ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
            }`}
            title="Quoted Services, Parts Ordering & Daily Status Pipeline"
          >
            <Receipt className={`w-3.5 h-3.5 ${activeTab === 'QUOTE_PARTS' ? 'text-slate-950' : 'text-amber-600'}`} />
            <span>Quote & Parts Tracker</span>
            {(selectedRO.parts?.length || 0) > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'QUOTE_PARTS' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {selectedRO.parts?.length} Parts
              </span>
            )}
          </button>

          <button
            id="ro-tab-details"
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
              activeTab === 'DETAILS'
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700'
                : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'DETAILS' ? 'text-white' : 'text-slate-700'}`} />
            <span>{isTechScreen ? 'Technician Workflow & Tasks' : 'RO Details'}</span>
          </button>

          {/* Line View (Concerns & Pay Types & Tech Breakdown) */}
          {!isTechScreen && !isAdvisorScreen && (
            <button
              id="ro-tab-lines"
              type="button"
              onClick={() => setActiveTab('LINES')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                activeTab === 'LINES'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700'
                  : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
              }`}
            >
              <ListFilter className={`w-3.5 h-3.5 ${activeTab === 'LINES' ? 'text-white' : 'text-slate-700'}`} />
              <span>Line View</span>
              {((selectedRO.concerns?.length || 1) > 0) && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'LINES' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-900 border border-slate-300'
                }`}>
                  {selectedRO.concerns?.length || 1}
                </span>
              )}
            </button>
          )}

          {/* Vehicle Photos Tab: Exclusively on Advisor board (isAdvisorScreen) or Manager overview */}
          {isAdvisorScreen && (
            <button
              id="ro-tab-photos"
              type="button"
              onClick={() => setActiveTab('PHOTOS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                activeTab === 'PHOTOS'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700'
                  : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
              }`}
            >
              <Camera className={`w-3.5 h-3.5 ${activeTab === 'PHOTOS' ? 'text-white' : 'text-slate-700'}`} />
              <span>Vehicle Photos</span>
              {(selectedRO.vehiclePhotos?.length || 0) > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'PHOTOS' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}>
                  {selectedRO.vehiclePhotos?.length}
                </span>
              )}
            </button>
          )}

          {/* Unified Tab Button: Parts & Quote Message Center (Consolidated) */}
          {(() => {
            const unreadMessages = (selectedRO.messages || []).filter(m => !(m.readBy || []).includes(currentUser.id));
            const hasUnreadUrgent = unreadMessages.some(m => m.isUrgent);
            const unreadCount = unreadMessages.length;
            const isPartsOrChatActive = activeTab === 'PARTS' || activeTab === 'CHAT';
            const totalPartsCount = (selectedRO.parts?.length || 0) + (selectedRO.quote?.partsItems?.length || 0);

            return (
              <button
                id="ro-tab-parts-center"
                type="button"
                onClick={() => {
                  setActiveTab('PARTS');
                  if (selectedRO?.id) {
                    markROMessagesAsRead(selectedRO.id);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                  isPartsOrChatActive
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700 shadow-md ring-2 ring-blue-400/40'
                    : hasUnreadUrgent
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white animate-pulse border-red-700 ring-2 ring-red-400'
                    : unreadCount > 0
                    ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border-blue-600 ring-1 ring-blue-300'
                    : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                }`}
                title="Parts Quoting, Ordering, Live Delivery ETAs & Inter-Department Message Center"
              >
                <div className="relative flex items-center gap-1.5">
                  <Package className={`w-3.5 h-3.5 ${isPartsOrChatActive || hasUnreadUrgent || unreadCount > 0 ? 'text-white' : 'text-amber-600'}`} />
                  <MessageSquare className={`w-3 h-3 ${isPartsOrChatActive || hasUnreadUrgent || unreadCount > 0 ? 'text-blue-200' : 'text-blue-600'}`} />
                  <span>Parts & Quote Message Center</span>
                  {(hasUnreadUrgent || unreadCount > 0) && (
                    <span className="absolute -top-1.5 -right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                  )}
                </div>

                {/* Parts Count Badge */}
                {totalPartsCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isPartsOrChatActive ? 'bg-blue-800 text-white' : 'bg-purple-100 text-purple-900 border border-purple-200'
                  }`}>
                    {totalPartsCount} Parts
                  </span>
                )}

                {/* Message Badges */}
                {hasUnreadUrgent ? (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-ping flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    URGENT
                  </span>
                ) : unreadCount > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })()}

          {!isAdvisorScreen && currentUser.role !== 'SERVICE_ADVISOR' && activeRoleView !== 'SERVICE_ADVISOR' && (
            <button
              id="ro-tab-warranty"
              type="button"
              onClick={() => setActiveTab('WARRANTY')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                activeTab === 'WARRANTY'
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border-indigo-700'
                  : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${activeTab === 'WARRANTY' ? 'text-white' : 'text-slate-700'}`} />
              <span>Warranty Time Clock</span>
              {(selectedRO.timePunches?.length || 0) > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'WARRANTY' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                }`}>
                  {selectedRO.timePunches?.length}
                </span>
              )}
            </button>
          )}

          {!isTechScreen && !isAdvisorScreen && (
            <button
              id="ro-tab-history"
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                activeTab === 'HISTORY'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700'
                  : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
              }`}
            >
              <History className={`w-3.5 h-3.5 ${activeTab === 'HISTORY' ? 'text-white' : 'text-slate-700'}`} />
              <span>Audit History ({selectedRO.history.length})</span>
            </button>
          )}

          {!isTechScreen && (
            <button
              id="ro-tab-contacts"
              type="button"
              onClick={() => setActiveTab('CONTACTS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 ${
                activeTab === 'CONTACTS'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700'
                  : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
              }`}
            >
              <Phone className={`w-3.5 h-3.5 ${activeTab === 'CONTACTS' ? 'text-white' : 'text-slate-700'}`} />
              <span>Follow-Ups</span>
              {(selectedRO.contactHistory?.length || 0) > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'CONTACTS' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}>
                  {selectedRO.contactHistory?.length}
                </span>
              )}
            </button>
          )}

          {/* Edit Quote Button - Directly to the right of Follow-Ups */}
          <button
            type="button"
            id="tab-row-edit-quote-btn"
            onClick={() => openQuoteModal(selectedRO.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-xs shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700"
            title={selectedRO.quote ? `View or Edit Repair Quote (${selectedRO.quote.status})` : 'Initiate Repair Quote'}
          >
            <Calculator className="w-3.5 h-3.5 text-white" />
            <span>Edit Quote</span>
            {selectedRO.quote && (
              <span className="text-blue-100 font-mono text-[11px] font-bold">
                (${(Number(selectedRO.quote.grandTotal) || 0).toFixed(2)})
              </span>
            )}
          </button>

          {/* Print Warranty Button - Directly to the right of Edit Quote */}
          <button
            type="button"
            id="tab-row-print-warranty-btn"
            onClick={() => openWarrantyPrintModal(selectedRO.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-2xs shrink-0 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300"
            title="Print Warranty Sheet with Cause, Correction, and Start/End Punch Clock Times"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print Warranty</span>
          </button>

          {/* Print Quote Button - Directly to the right of Print Warranty */}
          <button
            type="button"
            id="tab-row-print-quote-btn"
            onClick={() => openQuotePrintModal(selectedRO.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-2xs shrink-0 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300"
            title="Preview and print official repair estimate & customer quote"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Quote</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 min-h-0 space-y-6 max-w-7xl w-full mx-auto">
          {/* Pinned Digital Sticky Note Banner (At Top of RO View) */}
          {selectedRO.stickyNote && (
            <ROStickyNoteBanner 
              roId={selectedRO.id} 
              stickyNote={selectedRO.stickyNote} 
              allowAdd={false}
            />
          )}

          {/* TAB 0: QUOTE & WORKING ORDER PARTS TRACKER */}
          {activeTab === 'QUOTE_PARTS' && (
            <ROQuotePartsTracker
              ro={selectedRO}
              onOpenQuoteModal={openQuoteModal}
              onOpenPrintModal={openQuotePrintModal}
              onOpenEditPart={(part, lineNum) => {
                setEditingPartItem(part);
              }}
              onAddNewPart={(lineNum) => {
                setAddPartLineNumber(lineNum);
                setIsAddPartModalOpen(true);
              }}
            />
          )}

          {/* TAB 1: DETAILS & ASSIGNMENT & QUICK STATUS CHANGE */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">

              {/* Feedback toast when Service Manager updates info */}
              {managerActionFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{managerActionFeedback}</span>
                </div>
              )}

              {/* Edit RO Form (Advisor & Manager) */}
              {(isManager || isAdvisor) && isEditingDetails && (
                <form onSubmit={handleSaveDetails} className="bg-white rounded-xl p-5 border-2 border-blue-500 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Edit Repair Order Information & Customer Complaints
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {managerAutoSaveStatus === 'saving' ? (
                        <span className="text-xs font-medium text-blue-600 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Saving...
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Saved
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {isManager ? 'Manager Authority Active' : 'Advisor Authority Active'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Repair Order #
                        </label>
                        <span className="text-[10px] text-blue-600 font-semibold font-mono">RO ID</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editRoNumberInput}
                          onChange={(e) => {
                            setEditRoNumberInput(e.target.value.toUpperCase());
                            if (roNumberError) setRoNumberError(null);
                          }}
                          placeholder="RO #..."
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white uppercase"
                        />
                        {editRoNumberInput.trim().toUpperCase() !== selectedRO.id && (
                          <button
                            type="button"
                            onClick={handleSaveRoNumber}
                            disabled={isSavingRoNumber}
                            className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                            title="Apply new RO Number"
                          >
                            {isSavingRoNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Update #</span>
                          </button>
                        )}
                      </div>
                      {roNumberError && (
                        <p className="text-[11px] text-red-600 font-bold mt-1">{roNumberError}</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Customer Full Name
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCustomerName(val);
                          triggerManagerAutoSave({ customerName: val.trim() });
                        }}
                        onBlur={flushManagerAutoSave}
                        required
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Customer Phone Number
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editCustomerPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCustomerPhone(val);
                          triggerManagerAutoSave({ customerPhone: val.trim() });
                        }}
                        onBlur={flushManagerAutoSave}
                        required
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          <span>Service Writer</span>
                        </label>
                      </div>
                      <select
                        value={selectedAdvisorId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAdvisorId(val);
                          handleReassignAdvisor(val);
                        }}
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      >
                        {serviceWriters.map(writer => (
                          <option key={writer.id} value={writer.id}>
                            {writer.name}{writer.employeeNumber ? ` (#${writer.employeeNumber})` : ''} ({writer.title || writer.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Vehicle Section with VIN Auto-Decode */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-400">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <span>VIN (17-character)</span>
                        {isDecodingEditVin && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium normal-case">
                            <Loader2 className="w-3 h-3 animate-spin" /> Decoding VIN with NHTSA...
                          </span>
                        )}
                        {editVinDecodedMsg && !isDecodingEditVin && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold normal-case bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {editVinDecodedMsg}
                          </span>
                        )}
                        {editVinError && !isDecodingEditVin && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium normal-case bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                            {editVinError}
                          </span>
                        )}
                      </label>
                      {editVehicleVin.trim().length >= 10 && (
                        <button
                          type="button"
                          onClick={() => runEditVinDecode(editVehicleVin, true)}
                          disabled={isDecodingEditVin}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isDecodingEditVin ? 'animate-spin' : ''}`} /> Auto-Decode
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editVehicleVin}
                      onChange={(e) => {
                        handleEditVinChange(e);
                        triggerManagerAutoSave({
                          vehicle: {
                            ...selectedRO.vehicle,
                            vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          }
                        });
                      }}
                      onBlur={flushManagerAutoSave}
                      maxLength={17}
                      required
                      placeholder="Enter 17-digit VIN to auto-fill Year, Make & Model"
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Year
                        </label>
                        <input
                          type="number"
                          value={editVehicleYear}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditVehicleYear(val);
                            triggerManagerAutoSave({
                              vehicle: {
                                ...selectedRO.vehicle,
                                year: Number(val) || selectedRO.vehicle.year
                              }
                            });
                          }}
                          onBlur={flushManagerAutoSave}
                          required
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Make
                        </label>
                        <input
                          type="text"
                          value={editVehicleMake}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditVehicleMake(val);
                            triggerManagerAutoSave({
                              vehicle: {
                                ...selectedRO.vehicle,
                                make: val.trim()
                              }
                            });
                          }}
                          onBlur={flushManagerAutoSave}
                          required
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          value={editVehicleModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditVehicleModel(val);
                            triggerManagerAutoSave({
                              vehicle: {
                                ...selectedRO.vehicle,
                                model: val.trim()
                              }
                            });
                          }}
                          onBlur={flushManagerAutoSave}
                          required
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          In Mileage (Intake)
                        </label>
                        <input
                          type="number"
                          value={editVehicleMileage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditVehicleMileage(val);
                            triggerManagerAutoSave({
                              vehicle: {
                                ...selectedRO.vehicle,
                                mileage: Number(val) || 0
                              }
                            });
                          }}
                          onBlur={flushManagerAutoSave}
                          placeholder="e.g. 74500"
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Out Mileage (Test Drive)
                          </label>
                          {editVehicleOutMileage !== '' && editVehicleMileage !== '' && Number(editVehicleOutMileage) >= Number(editVehicleMileage) && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                              +{(Number(editVehicleOutMileage) - Number(editVehicleMileage)).toFixed(1)} mi
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={editVehicleOutMileage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditVehicleOutMileage(val);
                            const numVal = val !== '' && !isNaN(Number(val)) ? Number(val) : undefined;
                            triggerManagerAutoSave({
                              outMileage: numVal,
                              vehicle: {
                                ...selectedRO.vehicle,
                                outMileage: numVal
                              }
                            });
                          }}
                          onBlur={flushManagerAutoSave}
                          placeholder="e.g. 74504"
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Road Test & Out Mileage Section */}
                  <TechTestDriveSection ro={selectedRO} />

                  {/* Customer Complaints & Concerns Lines */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-400 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" /> Customer Complaints & Concerns
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddEditConcern();
                          triggerManagerAutoSave({ concerns: [...editConcerns, ''] });
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border-2 border-blue-300 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Line
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editConcerns.map((c, idx) => {
                        const currentPayType: ConcernPayType = editConcernPayTypes[idx] || 'CUSTOMER_PAY';
                        const currentCause = editConcernCauses[idx] ?? (idx === 0 ? editCause : '');
                        const currentCorrection = editConcernCorrections[idx] ?? (idx === 0 ? editCorrection : '');

                        const isInspectionFinding = Boolean(
                          (selectedRO?.concernSources && selectedRO.concernSources[idx] === 'INSPECTION') ||
                          (selectedRO?.recommendations || []).some(r => 
                            r.serviceName.trim().toLowerCase() === c.trim().toLowerCase() ||
                            (r.notes && r.notes.trim().toLowerCase().includes(c.trim().toLowerCase())) ||
                            (r.inspectionItemId && (idx + 1) > 1 && editConcerns.length > 1 && idx === editConcerns.length - 1)
                          ) ||
                          (selectedRO?.inspection?.items && Object.values(selectedRO.inspection.items).some(item => 
                            item.status === 'IMMEDIATE_ATTENTION' && 
                            (item.concern?.trim().toLowerCase() === c.trim().toLowerCase() || item.name.trim().toLowerCase() === c.trim().toLowerCase())
                          ))
                        );

                        return (
                          <div key={idx} className="bg-white p-3.5 rounded-xl border-2 border-slate-400 space-y-3 shadow-xs">
                            {/* Line Header: Line Number, Pay Type, Tech, Remove */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-slate-900 text-white shadow-2xs">
                                  Line {idx + 1}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Primary Line
                                  </span>
                                )}
                                {isInspectionFinding && (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shadow-2xs flex items-center gap-1">
                                    <ClipboardCheck className="w-3 h-3 text-amber-700" />
                                    <span>Technicians Findings</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {canSelectPayType ? (
                                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-300">
                                    <span className="text-[10px] font-bold text-slate-500 mr-1 hidden xs:inline uppercase tracking-wider">Pay:</span>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayTypeChange(idx, 'CUSTOMER_PAY')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                        currentPayType === 'CUSTOMER_PAY'
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                      }`}
                                      title="Mark as Customer Pay"
                                    >
                                      Customer Pay
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayTypeChange(idx, 'WARRANTY')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                        currentPayType === 'WARRANTY'
                                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                      }`}
                                      title="Mark as Warranty"
                                    >
                                      Warranty
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayTypeChange(idx, 'INTERNAL')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                        currentPayType === 'INTERNAL'
                                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                      }`}
                                      title="Mark as Internal"
                                    >
                                      Internal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayTypeChange(idx, 'EXTENDED_WARRANTY')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                        currentPayType === 'EXTENDED_WARRANTY'
                                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                      }`}
                                      title="Mark as Extended Warranty"
                                    >
                                      Extended Warranty
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pay:</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      currentPayType === 'CUSTOMER_PAY'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : currentPayType === 'WARRANTY'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : currentPayType === 'INTERNAL'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                                    }`}>
                                      {currentPayType === 'CUSTOMER_PAY' ? 'Customer Pay' : currentPayType === 'WARRANTY' ? 'Warranty' : currentPayType === 'INTERNAL' ? 'Internal' : 'Extended Warranty'}
                                    </span>
                                  </div>
                                )}

                                {/* Tech assignment for this line */}
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                                  <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
                                  {canAssignTech ? (
                                    <select
                                      value={editConcernTechIds[idx] || ''}
                                      onChange={e => handleEditConcernTechChange(idx, e.target.value)}
                                      className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                      title="Assign specific technician to this line item"
                                    >
                                      <option value="">{selectedRO?.techName ? `(Primary: ${selectedRO.techName})` : 'Unassigned'}</option>
                                      {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>
                                          {tech.name}{tech.employeeNumber ? ` #${tech.employeeNumber}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[11px] font-bold text-slate-800">
                                      {technicians.find(t => t.id === editConcernTechIds[idx])?.name || selectedRO?.techName || 'Unassigned'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {editConcerns.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedConcerns = editConcerns.filter((_, i) => i !== idx);
                                    handleRemoveEditConcern(idx);
                                    triggerManagerAutoSave({ concerns: updatedConcerns });
                                  }}
                                  className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 hover:bg-red-50 px-1.5 py-0.5 rounded ml-auto"
                                  title="Remove line"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove Line
                                </button>
                              )}
                            </div>

                            {/* 1. Customer Stated Complaint or Technician's Findings */}
                            <div className="space-y-1.5">
                              <label className="text-[16px] font-black text-black uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black inline-flex items-center justify-center">1</span>
                                <span>{isInspectionFinding ? "Technicians Findings" : "Complaint (Customer Stated Symptom)"}</span>
                              </label>
                              <textarea
                                rows={2}
                                value={c}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleEditConcernChange(idx, val);
                                  const next = [...editConcerns];
                                  next[idx] = val;
                                  triggerManagerAutoSave({ concerns: next });
                                }}
                                onBlur={flushManagerAutoSave}
                                placeholder={isInspectionFinding ? "Technicians inspection findings..." : (idx === 0 ? "Customer primary complaint / stated symptom..." : `Customer complaint for line ${idx + 1}...`)}
                                className="w-full px-3.5 py-2.5 border-2 border-slate-600 rounded-lg text-[18px] font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-black focus:border-black bg-white leading-relaxed placeholder:text-slate-400 placeholder:text-sm"
                              />
                            </div>

                            {/* 2. Cause (Technician Diagnostic Findings) */}
                            <div className="space-y-1.5">
                              <label className="text-[16px] font-black text-black uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black inline-flex items-center justify-center">2</span>
                                <span>Cause (Diagnostic Finding)</span>
                              </label>
                              <input
                                type="text"
                                value={currentCause}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleEditConcernCauseChange(idx, val);
                                  const nextCauses = [...editConcernCauses];
                                  while (nextCauses.length <= idx) nextCauses.push('');
                                  nextCauses[idx] = val;
                                  triggerManagerAutoSave({ concernCauses: nextCauses, cause: nextCauses[0] });
                                }}
                                onBlur={flushManagerAutoSave}
                                placeholder={idx === 0 ? "Root cause / diagnostic finding (e.g. Code P0300 cylinder 3 misfire, cracked coil pack)..." : `Diagnostic finding / cause for line ${idx + 1}...`}
                                className="w-full px-3.5 py-2.5 border-2 border-slate-600 rounded-lg text-[18px] font-bold font-mono text-black focus:outline-hidden focus:ring-2 focus:ring-black focus:border-black bg-white placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans"
                              />
                            </div>

                            {/* 3. Correction (Repair Procedure / Action Taken) */}
                            <div className="space-y-1.5">
                              <label className="text-[16px] font-black text-black uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black inline-flex items-center justify-center">3</span>
                                <span>Correction (Repair Procedure / Action Taken)</span>
                              </label>
                              <input
                                type="text"
                                value={currentCorrection}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleEditConcernCorrectionChange(idx, val);
                                  const nextCorrections = [...editConcernCorrections];
                                  while (nextCorrections.length <= idx) nextCorrections.push('');
                                  nextCorrections[idx] = val;
                                  triggerManagerAutoSave({ concernCorrections: nextCorrections, correction: nextCorrections[0] });
                                }}
                                onBlur={flushManagerAutoSave}
                                placeholder={idx === 0 ? "Corrective repair (e.g. Replaced cylinder 3 coil pack & plugs, cleared codes, road tested 5 mi)..." : `Repair correction for line ${idx + 1}...`}
                                className="w-full px-3.5 py-2.5 border-2 border-slate-600 rounded-lg text-[18px] font-bold font-mono text-black focus:outline-hidden focus:ring-2 focus:ring-black focus:border-black bg-white placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans"
                              />
                            </div>

                            {/* Labor Hours (Same 18px font size as 3Cs) */}
                            {(() => {
                              const lineNum = idx + 1;
                              const lineLabor = (selectedRO.quote?.laborItems || []).filter(item => (item.roLineNumber || 1) === lineNum);
                              const lHours = lineLabor.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0);
                              const lCost = lineLabor.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
                              return (
                                <div className="space-y-1.5">
                                  <label className="text-[16px] font-black text-black uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <span>Labor Hours</span>
                                  </label>
                                  <div className="w-full px-3.5 py-2.5 border-2 border-slate-600 rounded-lg text-[18px] font-bold font-mono text-black bg-white shadow-2xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-blue-950 font-black">{lHours.toFixed(1)} hrs</span>
                                      {lCost > 0 && <span className="text-slate-600">(${lCost.toFixed(2)})</span>}
                                    </div>
                                    {lineLabor.length > 0 && (
                                      <span className="text-xs font-semibold text-slate-500 font-sans">
                                        {lineLabor.length} labor operation{lineLabor.length === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 4. Integrated Parts for Line {idx + 1} (Part Name, Price, Qty, Availability) */}
                            <LinePartsSection ro={selectedRO} lineNum={idx + 1} allowAddPart={canOrderParts} />

                            {/* 5. Line Quote Breakdown & Subtotal */}
                            {(() => {
                              const lineNum = idx + 1;
                              const lineLaborItems = (selectedRO.quote?.laborItems || []).filter(item => (item.roLineNumber || 1) === lineNum);
                              const linePartsItems = (selectedRO.quote?.partsItems || []).filter(p => (p.roLineNumber || 1) === lineNum);
                              const lineROParts = (selectedRO.parts || []).filter(p => (p.roLineNumber || 1) === lineNum);

                              const lineLaborHours = lineLaborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0);
                              const lineLaborCost = lineLaborItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
                              const lineQuotePartsCost = linePartsItems.reduce((acc, item) => acc + (Number(item.subtotal) || (Number(item.unitPrice || 0) * Number(item.quantity || 1))), 0);
                              const lineROPartsCost = lineROParts.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
                              const linePartsCost = linePartsItems.length > 0 ? lineQuotePartsCost : lineROPartsCost;
                              const linePartsCount = linePartsItems.length > 0 ? linePartsItems.length : lineROParts.length;
                              const lineTotal = lineLaborCost + linePartsCost;
                              const hasLineQuote = lineLaborItems.length > 0 || linePartsItems.length > 0 || lineROParts.length > 0;

                              return (
                                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Line {lineNum} Quote:</span>
                                    {hasLineQuote ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-950 font-bold text-[18px] border-2 border-blue-300 shadow-2xs inline-flex items-center gap-1.5">
                                          <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                                          <span>Labor:</span>
                                          <span className="font-mono font-black">{lineLaborHours.toFixed(1)} hrs</span>
                                          {lineLaborCost > 0 && (
                                            <span className="text-blue-900 font-bold text-[16px] font-mono">(${lineLaborCost.toFixed(2)})</span>
                                          )}
                                        </span>
                                        <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-950 font-bold text-[18px] border-2 border-amber-300 shadow-2xs inline-flex items-center gap-1.5">
                                          <Package className="w-4 h-4 text-amber-700 shrink-0" />
                                          <span>Parts ({linePartsCount}):</span>
                                          <span className="font-mono font-black">${linePartsCost.toFixed(2)}</span>
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="italic text-slate-500 text-[11px]">Estimate pending</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                                    <span className="text-[18px] font-black font-mono text-indigo-950 bg-white px-3 py-1 rounded-lg border-2 border-indigo-300 shadow-2xs">
                                      Line {lineNum} Total: ${lineTotal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quote Total Summary Bar */}
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-white shadow-xs space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                            Estimate / Quote Total (By Line & Totaled)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openQuotePrintModal(selectedRO.id)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                            title="Preview and print formatted repair estimate document"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-300" />
                            <span>Print Quote</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openQuoteModal(selectedRO.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>{selectedRO.quote ? 'Open & Edit Full Quote' : '+ Initiate Repair Quote'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Line-by-line itemized totals summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {editConcerns.map((_, i) => {
                          const lNum = i + 1;
                          const lLabor = (selectedRO.quote?.laborItems || []).filter(item => (item.roLineNumber || 1) === lNum).reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
                          const lQuoteParts = (selectedRO.quote?.partsItems || []).filter(p => (p.roLineNumber || 1) === lNum).reduce((acc, p) => acc + (Number(p.subtotal) || (Number(p.unitPrice || 0) * Number(p.quantity || 1))), 0);
                          const lROParts = (selectedRO.parts || []).filter(p => (p.roLineNumber || 1) === lNum).reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.quantity || 1)), 0);
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

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                        <div className="flex items-center gap-3 text-slate-300 flex-wrap">
                          <span style={{ fontSize: '101.5%' }}>Labor: <strong className="font-mono text-white">${(selectedRO.quote?.totalLaborCost || 0).toFixed(2)}</strong></span>
                          <span>Parts: <strong className="font-mono text-white">${(selectedRO.quote?.totalPartsCost || 0).toFixed(2)}</strong></span>
                          {(selectedRO.quote?.shopSuppliesFee || 0) > 0 && (
                            <span>Supplies: <strong className="font-mono text-white">${(selectedRO.quote?.shopSuppliesFee || 0).toFixed(2)}</strong></span>
                          )}
                          {(selectedRO.quote?.taxAmount || 0) > 0 && (
                            <span>Tax: <strong className="font-mono text-white">${(selectedRO.quote?.taxAmount || 0).toFixed(2)}</strong></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">Grand Total:</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            ${(selectedRO.quote?.grandTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Promised Time and Technician Diagnostic Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Customer Promised Time
                        </label>
                      </div>
                      <input
                        type="datetime-local"
                        value={editPromisedTime ? new Date(editPromisedTime).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const dt = e.target.value ? new Date(e.target.value).toISOString() : selectedRO.promisedTime;
                          setEditPromisedTime(dt);
                          triggerManagerAutoSave({ promisedTime: dt });
                        }}
                        onBlur={flushManagerAutoSave}
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Technician Diagnostic Notes
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editDiagnosticNotes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditDiagnosticNotes(val);
                          triggerManagerAutoSave({ diagnosticNotes: val.trim() });
                        }}
                        onBlur={flushManagerAutoSave}
                        placeholder="Diagnostic notes, scan tool logs, inspection findings..."
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>

                  {/* High Priority & Waiter Toggles */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = !editIsUrgent;
                        setEditIsUrgent(newVal);
                        triggerManagerAutoSave({ isUrgent: newVal });
                      }}
                      className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                        editIsUrgent
                          ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                          : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 ${editIsUrgent ? 'text-red-600' : 'text-slate-500'}`} />
                      <span>High Priority</span>
                      {editIsUrgent && (
                        <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newVal = !editIsWaiter;
                        setEditIsWaiter(newVal);
                        triggerManagerAutoSave({ isWaiter: newVal });
                      }}
                      className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                        editIsWaiter
                          ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                          : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
                      }`}
                    >
                      <Clock className={`w-4 h-4 ${editIsWaiter ? 'text-red-600' : 'text-slate-500'}`} />
                      <span>Waiter</span>
                      {editIsWaiter && (
                        <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-slate-100 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        flushManagerAutoSave();
                        setIsEditingDetails(false);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </form>
              )}
              
              {/* Dynamic RO Workflow with Fluid Next Action Promoted to Top (Option B) */}
              <DynamicROWorkflow
                ro={selectedRO}
                currentUser={currentUser}
                technicians={technicians}
                serviceAdvisors={serviceWriters}
                isManager={isManager}
                isAdvisor={isAdvisor}
                isSales={isSales}
                canAssignTech={canAssignTech}
                canSelectPayType={canSelectPayType}
                handleAssignTech={handleAssignTech}
                handleStatusChange={handleStatusChange}
                startDiagnosis={startDiagnosis}
                openQuoteModal={openQuoteModal}
                setIsFollowUpModalOpen={setIsFollowUpModalOpen}
                setActiveTab={setActiveTab}
                updateTechCauseAndCorrection={updateTechCauseAndCorrection}
                updateConcernPayType={updateConcernPayType}
                updateConcernTech={updateConcernTech}
                addRepairOrderConcern={addRepairOrderConcern}
                isTechScreen={isTechScreen}
              />
            </div>
          )}

          {/* TAB: ITEM & LINE BREAKDOWN (Concerns, Pay Types, Tech Assignments) */}
          {activeTab === 'LINES' && !isAdvisorScreen && (
            <div className="space-y-4">
              <ROLineBreakdown
                ro={selectedRO}
                users={users}
                canEdit={canSelectPayType}
                onAssignTech={(idx, techId, techName) => {
                  updateConcernTech(selectedRO.id, idx, techId, techName);
                }}
                onUpdatePayType={(idx, payType) => {
                  updateConcernPayType(selectedRO.id, idx, payType);
                }}
                onAddConcern={(text, payType, techId, techName) => {
                  addRepairOrderConcern(selectedRO.id, text, payType, techId, techName, undefined, 'CUSTOMER');
                }}
                onOpenQuote={openQuoteModal}
              />
            </div>
          )}

          {/* TAB: VEHICLE PHOTOS (Advisor Board & Intake Inspection) */}
          {activeTab === 'PHOTOS' && isAdvisorScreen && (
            <div className="space-y-4">
              <VehiclePhotoManager
                roId={selectedRO.id}
                vehicleYear={selectedRO.vehicle.year}
                vehicleMake={selectedRO.vehicle.make}
                vehicleModel={selectedRO.vehicle.model}
                vin={selectedRO.vehicle.vin}
                photos={selectedRO.vehiclePhotos || []}
                currentUser={{ id: currentUser.id, name: currentUser.name }}
                onAddPhoto={addVehiclePhoto}
                onDeletePhoto={deleteVehiclePhoto}
              />
            </div>
          )}



          {/* TAB: UNIFIED PARTS, QUOTES & INTER-DEPARTMENT MESSAGE CENTER */}
          {(activeTab === 'PARTS' || activeTab === 'CHAT') && (
            <div className="space-y-4">
              {(() => {
                // Collect all unified parts from selectedRO.parts and selectedRO.quote.partsItems
                const allPartsList: Array<{
                  id: string;
                  name: string;
                  partNumber?: string;
                  quantity: number;
                  price?: number;
                  status: string;
                  requestType?: string;
                  estimatedArrival?: string;
                  notes?: string;
                  roLineNumber?: number;
                  vendor?: string;
                  source: 'RO_PART' | 'QUOTE_PART';
                }> = [];

                const seenIds = new Set<string>();

                (selectedRO.parts || []).forEach(p => {
                  seenIds.add(p.id);
                  const lineNum = p.roLineNumber || (p.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(p.notes.match(/For Line (\d+)/i)![1], 10) : undefined);
                  allPartsList.push({
                    id: p.id,
                    name: p.description || p.name || 'Part',
                    partNumber: p.partNumber,
                    quantity: p.quantity || 1,
                    price: typeof p.price === 'number' ? p.price : (p.price ? parseFloat(String(p.price)) : undefined),
                    status: p.status,
                    requestType: p.requestType,
                    estimatedArrival: p.estimatedArrival,
                    notes: p.notes,
                    roLineNumber: lineNum,
                    vendor: p.vendor,
                    source: 'RO_PART',
                  });
                });

                (selectedRO.quote?.partsItems || []).forEach(qp => {
                  if (qp.sourcePartId && seenIds.has(qp.sourcePartId)) return;
                  const alreadyCaptured = allPartsList.some(
                    p => p.name.trim().toLowerCase() === qp.description.trim().toLowerCase()
                  );
                  if (alreadyCaptured) return;

                  allPartsList.push({
                    id: qp.id,
                    name: qp.description,
                    partNumber: qp.partNumber,
                    quantity: qp.quantity || 1,
                    price: typeof qp.unitPrice === 'number' ? qp.unitPrice : undefined,
                    status: (selectedRO.status === 'DENIED' || selectedRO.quote?.status === 'DECLINED') ? 'DECLINED' : 'QUOTE_ONLY',
                    requestType: 'QUOTE_ONLY',
                    estimatedArrival: 'Price Quote Needed',
                    roLineNumber: qp.roLineNumber || 1,
                    source: 'QUOTE_PART',
                  });
                });

                const isROApproved = selectedRO.status === 'APPROVED' || 
                                     selectedRO.quote?.status === 'APPROVED' || 
                                     ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(selectedRO.status);

                const quoteParts = allPartsList.filter(p => 
                  p.status !== 'DECLINED' && 
                  p.status !== 'CANCELLED' && 
                  (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY' || (!isROApproved && p.source === 'QUOTE_PART'))
                );

                const orderedParts = allPartsList.filter(p => 
                  p.status !== 'DECLINED' &&
                  p.status !== 'CANCELLED' &&
                  p.status !== 'QUOTE_ONLY' &&
                  p.requestType !== 'QUOTE_ONLY' &&
                  ['ORDERED', 'DAILY_ORDER', 'LOCAL_PURCHASE', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'IN_TRANSIT'].includes(p.status)
                );

                const inStockParts = allPartsList.filter(p => 
                  ['IN_STOCK', 'RECEIVED', 'ISSUED_TO_TECH'].includes(p.status)
                );

                const requestedParts = allPartsList.filter(p => 
                  p.status !== 'DECLINED' && 
                  p.status !== 'CANCELLED' && 
                  !quoteParts.some(qp => qp.id === p.id) &&
                  !orderedParts.some(op => op.id === p.id) &&
                  !inStockParts.some(ip => ip.id === p.id)
                );

                const declinedParts = allPartsList.filter(p => 
                  p.status === 'DECLINED' || p.status === 'CANCELLED'
                );

                const hasPendingToOrder = quoteParts.length > 0 || requestedParts.length > 0;

                return (
                  <>
                    {/* Unified Command & Status Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                            <Package className="w-4 h-4" />
                          </span>
                          <h3 className="text-base font-black text-white uppercase tracking-tight">
                            Parts Ordering, Quotes & Live Message Center
                          </h3>
                        </div>
                        <p className="text-xs text-slate-300 max-w-xl">
                          All parts quoting, ordering, live arrival ETAs, and inter-department messaging are consolidated directly on RO #{selectedRO.id}.
                        </p>

                        {/* Metric Counts */}
                        <div className="flex items-center gap-2 pt-2 flex-wrap text-xs font-bold">
                          {quoteParts.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/50">
                              📋 {quoteParts.length} on Quote
                            </span>
                          )}
                          {orderedParts.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-900/80 text-amber-200 border border-amber-500/50">
                              🚚 {orderedParts.length} Ordered (ETA)
                            </span>
                          )}
                          {inStockParts.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-500/50">
                              ✓ {inStockParts.length} In Bay / Ready
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            💬 {selectedRO.messages.length} Messages
                          </span>
                        </div>
                      </div>

                      {/* Header Actions & View Mode Switcher */}
                      <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {canOrderParts && (
                            <button
                              type="button"
                              onClick={() => setIsAddPartModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all cursor-pointer"
                              title="Add a new part to this Repair Order"
                            >
                              <Plus className="w-3.5 h-3.5 text-white" />
                              <span>+ Add Part</span>
                            </button>
                          )}

                          {canOrderParts && hasPendingToOrder && (
                            <button
                              type="button"
                              onClick={handleMarkAllPendingOrdered}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all cursor-pointer"
                              title="Mark all pending parts ordered with standard 1-5 day ETA"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mark All Ordered</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openQuoteModal(selectedRO.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-600 shadow-2xs transition-all cursor-pointer"
                            title="Open Quote Builder / Pricing Estimate"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-400" />
                            <span>Quote Builder</span>
                          </button>
                        </div>

                        {/* View Mode Switcher: Dual View vs Single View */}
                        <div className="inline-flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
                          <button
                            type="button"
                            onClick={() => setPartsCenterViewMode('SPLIT')}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                              partsCenterViewMode === 'SPLIT' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-white'
                            }`}
                            title="View Parts list and live Messages side-by-side"
                          >
                            <Columns className="w-3.5 h-3.5" />
                            <span>Dual View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartsCenterViewMode('PARTS_ONLY')}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                              partsCenterViewMode === 'PARTS_ONLY' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-white'
                            }`}
                            title="View full-width Parts list and ordering only"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Parts Only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartsCenterViewMode('MESSAGES_ONLY')}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                              partsCenterViewMode === 'MESSAGES_ONLY' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-white'
                            }`}
                            title="View full-width Live Message Center only"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Messages Only</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Responsive Dual-View Grid: Parts & Orders (Left) + Live Messages (Right) */}
                    <div className={partsCenterViewMode === 'SPLIT' ? 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start' : 'space-y-4'}>
                      {partsCenterViewMode !== 'MESSAGES_ONLY' && (
                        <div className={partsCenterViewMode === 'SPLIT' ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
                          {allPartsList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border-2 border-slate-300">
                        <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <h5 className="text-sm font-bold text-slate-800">No Parts Recorded</h5>
                        <p className="text-xs text-slate-500 mt-1">There are no parts requested, quoted, or ordered for this repair order yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allPartsList.sort((a, b) => (a.roLineNumber || 1) - (b.roLineNumber || 1)).map(part => {
                          const isDeclined = part.status === 'DECLINED' || part.status === 'CANCELLED';
                          const isQuote = !isDeclined && (part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY' || (!isROApproved && part.source === 'QUOTE_PART'));
                          const isOrdered = !isDeclined && !isQuote && ['ORDERED', 'DAILY_ORDER', 'LOCAL_PURCHASE', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'IN_TRANSIT'].includes(part.status);
                          const isInStock = !isDeclined && !isQuote && ['IN_STOCK', 'RECEIVED', 'ISSUED_TO_TECH'].includes(part.status);
                          const isRequested = !isDeclined && !isQuote && !isOrdered && !isInStock;

                          const etaBadge = formatEtaBadge(part.estimatedArrival);
                          const etaDisplay = part.estimatedArrival ? (
                            !isNaN(new Date(part.estimatedArrival).getTime())
                              ? `${new Date(part.estimatedArrival).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTimeOnly(new Date(part.estimatedArrival))}`
                              : part.estimatedArrival
                          ) : 'Pending ETA';

                          return (
                            <div 
                              key={part.id}
                              className={`p-4 rounded-xl border-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                isDeclined 
                                  ? 'bg-red-50/60 border-red-300'
                                  : isQuote
                                  ? 'bg-purple-50/70 border-purple-300'
                                  : isOrdered
                                  ? 'bg-amber-50/70 border-amber-300'
                                  : isInStock
                                  ? 'bg-emerald-50/70 border-emerald-300'
                                  : 'bg-blue-50/70 border-blue-300'
                              }`}
                            >
                              {/* Part Details */}
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {part.roLineNumber && (
                                    <span className="font-mono text-xs font-black uppercase px-2.5 py-1 rounded bg-slate-900 text-white shadow-2xs">
                                      Line {part.roLineNumber}
                                    </span>
                                  )}
                                  {part.partNumber && (
                                    <span className="font-mono text-[18px] font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border-2 border-slate-300">
                                      #{part.partNumber}
                                    </span>
                                  )}
                                  <span className="text-[18px] font-bold font-mono text-black bg-white px-3 py-1 rounded-lg border-2 border-slate-300">
                                    Qty: {part.quantity}
                                  </span>
                                  {part.price !== undefined && part.price > 0 && (
                                    <span className="text-[18px] font-black font-mono text-emerald-950 bg-emerald-100 px-3 py-1 rounded-lg border-2 border-emerald-300 shadow-2xs">
                                      ${part.price.toFixed(2)} ea
                                      {part.quantity > 1 && (
                                        <span className="text-[18px] font-bold text-emerald-900 ml-1.5">
                                          (${((part.quantity || 1) * part.price).toFixed(2)})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[18px] font-black text-slate-950 flex items-center gap-2 flex-wrap">
                                  <span>{part.name}</span>
                                </div>

                                {/* Status Explanation Note */}
                                <div className="text-xs font-medium">
                                  {isQuote ? (
                                    <span className="text-purple-900 font-semibold flex items-center gap-1">
                                      <span>📋 <strong>On Quote / Estimate:</strong> Part pricing quoted for customer approval. Not ordered yet.</span>
                                    </span>
                                  ) : isDeclined ? (
                                    <span className="text-red-900 font-bold flex items-center gap-1">
                                      <span>🛑 <strong>Declined by Customer:</strong> Do not order.</span>
                                    </span>
                                  ) : isInStock ? (
                                    <span className="text-emerald-900 font-semibold flex items-center gap-1">
                                      <span>✓ <strong>{part.status === 'ISSUED_TO_TECH' ? 'Issued to Technician' : 'In Stock / In Bay'}</strong></span>
                                    </span>
                                  ) : isOrdered ? (
                                    <span className="text-amber-900 font-semibold flex items-center gap-1">
                                      <span>🚚 <strong>Ordered from {part.vendor || 'Supplier'}:</strong> Tracking live delivery arrival.</span>
                                    </span>
                                  ) : (
                                    <span className="text-blue-900 font-semibold flex items-center gap-1">
                                      <span>📦 <strong>Parts Requested:</strong> Awaiting classification & ordering by Parts Department.</span>
                                    </span>
                                  )}
                                </div>

                                {part.notes && !part.notes.startsWith('For Line') && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">{part.notes}</p>
                                )}
                              </div>

                              {/* Status / ETA Badge Box & Action */}
                              <div className="shrink-0 flex flex-col sm:items-end gap-2">
                                {isQuote ? (
                                  <div className="px-3.5 py-2 rounded-lg border-2 bg-purple-100 border-purple-400 text-purple-950 flex items-center gap-2 shadow-2xs">
                                    <Calculator className="w-4 h-4 text-purple-700 shrink-0" />
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-purple-800">
                                        Estimate Status
                                      </div>
                                      <div className="text-xs font-black text-purple-950">
                                        On Quote (Pending Approval)
                                      </div>
                                    </div>
                                  </div>
                                ) : isDeclined ? (
                                  <div className="px-3.5 py-2 rounded-lg border-2 bg-red-100 border-red-400 text-red-950 flex items-center gap-2 shadow-2xs">
                                    <Ban className="w-4 h-4 text-red-700 shrink-0" />
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-red-800">
                                        Authorization
                                      </div>
                                      <div className="text-xs font-black text-red-950">
                                        Declined by Customer
                                      </div>
                                    </div>
                                  </div>
                                ) : isInStock ? (
                                  <div className="px-3.5 py-2 rounded-lg border-2 bg-emerald-100 border-emerald-400 text-emerald-950 flex items-center gap-2 shadow-2xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                        Availability
                                      </div>
                                      <div className="text-xs font-black text-emerald-950">
                                        {part.status === 'ISSUED_TO_TECH' ? 'Issued to Tech' : 'In Stock / Received'}
                                      </div>
                                    </div>
                                  </div>
                                ) : isOrdered ? (
                                  <div className={`px-3.5 py-2 rounded-lg border-2 flex items-center gap-2.5 ${
                                    etaBadge.pastDue 
                                      ? 'bg-red-50 border-red-400 text-red-950'
                                      : etaBadge.urgent
                                      ? 'bg-amber-50 border-amber-400 text-amber-950'
                                      : 'bg-purple-50 border-purple-400 text-purple-950'
                                  }`}>
                                    <Clock className={`w-4 h-4 shrink-0 ${
                                      etaBadge.pastDue ? 'text-red-600' : etaBadge.urgent ? 'text-amber-600' : 'text-purple-600'
                                    }`} />
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        ETA Arrival
                                      </div>
                                      <div className="text-xs sm:text-sm font-black text-slate-900">
                                        {etaDisplay}
                                      </div>
                                      {etaBadge.text && etaBadge.text !== etaDisplay && (
                                        <div className={`text-[10px] font-bold ${
                                          etaBadge.pastDue ? 'text-red-600' : etaBadge.urgent ? 'text-amber-700' : 'text-purple-700'
                                        }`}>
                                          {etaBadge.text}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-3.5 py-2 rounded-lg border-2 bg-blue-100 border-blue-400 text-blue-950 flex items-center gap-2 shadow-2xs">
                                    <Package className="w-4 h-4 text-blue-700 shrink-0" />
                                    <div className="text-left sm:text-right">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                                        Parts Dept Status
                                      </div>
                                      <div className="text-xs font-black text-blue-950">
                                        Parts Requested
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Quick Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {(isQuote || isRequested) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setQuickOrderPart(part);
                                        setQuickOrderVendor(part.vendor || 'STELLANTIS');
                                        setQuickOrderEtaOption('TOMORROW_MORNING');
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                      title="Mark this part as Ordered with live ETA & supplier"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Mark Ordered</span>
                                    </button>
                                  )}

                                  {isOrdered && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickMarkArrived(part)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                        title="Mark part as arrived at counter/staged for technician"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Mark Arrived / In Bay</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickOrderPart(part);
                                          setQuickOrderVendor(part.vendor || 'STELLANTIS');
                                          setQuickOrderEtaOption('1_2_DAYS');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 transition-all cursor-pointer"
                                        title="Update ETA arrival date or vendor tracking"
                                      >
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Update ETA</span>
                                      </button>
                                    </>
                                  )}

                                  {isInStock && part.status !== 'ISSUED_TO_TECH' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickIssueToTech(part)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                      title="Issue part to technician for active installation"
                                    >
                                      <Wrench className="w-3.5 h-3.5" />
                                      <span>Issue to Tech</span>
                                    </button>
                                  )}

                                  {/* Edit Part Details Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const foundPart = (selectedRO.parts || []).find(p => p.id === part.id) || {
                                        id: part.id,
                                        roId: selectedRO.id,
                                        partNumber: part.partNumber || '',
                                        description: part.name,
                                        name: part.name,
                                        quantity: part.quantity || 1,
                                        status: part.status as any,
                                        price: part.price,
                                        vendor: part.vendor || 'STELLANTIS',
                                        estimatedArrival: part.estimatedArrival || 'Pending ETA',
                                        notes: part.notes,
                                        roLineNumber: part.roLineNumber,
                                        requestType: part.requestType as any
                                      };
                                      setEditingPartItem(foundPart as PartItem);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs transition-all cursor-pointer"
                                    title="Edit part details, pricing, supplier, ETA and line assignment"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Order Success Notice */}
                    {quickOrderSuccessNote && (
                      <div className="p-3 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>{quickOrderSuccessNote}</span>
                        </div>
                        <span className="text-[11px] font-normal text-emerald-800">Recorded on RO & posted to Message Center</span>
                      </div>
                    )}

                    {/* Quick Order Popover Form (When marking a part on order) */}
                    {quickOrderPart && (
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl shadow-md space-y-3 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-300">
                          <div className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-amber-700" />
                            <h4 className="text-sm font-black text-slate-900">
                              Mark Part On Order: {quickOrderPart.partNumber ? `#${quickOrderPart.partNumber} - ` : ''}{quickOrderPart.name}
                            </h4>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setQuickOrderPart(null)}
                            className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Supplier / Vendor */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              Supplier / Vendor *
                            </label>
                            <select
                              value={quickOrderVendor}
                              onChange={e => setQuickOrderVendor(e.target.value)}
                              className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="STELLANTIS">Mopar / Stellantis</option>
                              <option value="FORD">Ford Motor Co / Motorcraft</option>
                              <option value="OREILLY">O'Reilly Auto Parts</option>
                              <option value="AUTOZONE">AutoZone Commercial</option>
                              <option value="HOLLANDS">Hollands Auto Parts</option>
                              <option value="RICKS PRO TRUCK">Ricks Pro Truck</option>
                              <option value="LOCAL DEALER">Local Dealership Transfer</option>
                              <option value="AFTERMARKET">Aftermarket / Other</option>
                            </select>
                          </div>

                          {/* Arrival Timeframe / ETA */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              Expected Arrival *
                            </label>
                            <select
                              value={quickOrderEtaOption}
                              onChange={e => setQuickOrderEtaOption(e.target.value as any)}
                              className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="TODAY_AFTERNOON">Today Afternoon (4:00 PM)</option>
                              <option value="TOMORROW_MORNING">Tomorrow Morning (9:30 AM)</option>
                              <option value="1_2_DAYS">1 to 2 Business Days</option>
                              <option value="CUSTOM">Specific Date / Time</option>
                            </select>
                            {quickOrderEtaOption === 'CUSTOM' && (
                              <input
                                type="datetime-local"
                                value={quickOrderCustomEta}
                                onChange={e => setQuickOrderCustomEta(e.target.value)}
                                className="w-full text-xs font-bold p-1.5 mt-1 bg-white border border-slate-300 rounded-lg text-slate-900"
                              />
                            )}
                          </div>

                          {/* Optional Tracking / PO # */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              PO / Reference / Tracking (Opt)
                            </label>
                            <input
                              type="text"
                              value={quickOrderTracking}
                              onChange={e => setQuickOrderTracking(e.target.value)}
                              placeholder="e.g. PO-8492 or FedEx tracking"
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-amber-900 font-medium">
                            Will automatically notify Advisor & Technician and post update to RO Message Center
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuickOrderPart(null)}
                              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleQuickMarkOrderedSubmit}
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>Confirm & Order Part</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                        </div>
                      )}

                      {/* Right Column: Embedded Quote & Parts Message Center */}
                      {partsCenterViewMode !== 'PARTS_ONLY' && (
                        <div className={partsCenterViewMode === 'SPLIT' ? 'lg:col-span-5 sticky top-4' : 'w-full'}>
                          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                                  <MessageSquare className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                    Quote & Parts Message Center
                                  </h4>
                                  <p className="text-[11px] text-slate-300">
                                    Live RO #{selectedRO.id} parts chat thread
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                                  {selectedRO.messages.length} Messages
                                </span>
                              </div>
                            </div>

                            {/* Quick Response Pill Buttons */}
                            <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
                              <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0 mr-1">
                                Quick:
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSendQuickMessage('🚚 Parts are on order, ETA tomorrow morning.')}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
                              >
                                🚚 On order, ETA tomorrow
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendQuickMessage('🟢 All parts have arrived at the parts counter - ready for tech.')}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
                              >
                                🟢 Parts arrived at counter
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendQuickMessage('📋 Customer approved quote - ready to order parts.')}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
                              >
                                📋 Customer approved quote
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendQuickMessage('🔍 Need part number clarification or VIN verification.')}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
                              >
                                🔍 Need part # / VIN
                              </button>
                            </div>

                            {/* Message List */}
                            <div className="p-4 max-h-[380px] overflow-y-auto space-y-2.5 bg-slate-50/50">
                              {selectedRO.messages.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-xs">
                                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  No messages yet on #{selectedRO.id}. Use the box below to ask questions about parts, ETAs, or quotes.
                                </div>
                              ) : (
                                selectedRO.messages.map(msg => {
                                  const isSelf = msg.senderId === currentUser.id;
                                  return (
                                    <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-bold text-slate-700">{msg.senderName}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold uppercase">
                                          {msg.senderRole.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400">{formatRelativeTime(msg.timestamp)}</span>
                                      </div>
                                      <div className={`max-w-md p-2.5 rounded-xl text-xs leading-relaxed ${
                                        msg.isUrgent
                                          ? 'bg-red-50 text-red-950 border-2 border-red-300 font-medium'
                                          : isSelf
                                          ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                                          : 'bg-white text-slate-900 rounded-bl-xs border border-slate-300 shadow-2xs'
                                      }`}>
                                        {msg.isUrgent && (
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
                                            <AlertTriangle className="w-3 h-3" /> Urgent Notice
                                          </div>
                                        )}
                                        {msg.content}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Message Input Box */}
                            <div className="p-3 bg-white border-t border-slate-200">
                              <form onSubmit={handleSendEmbeddedMessage} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={embeddedMsgInput}
                                  onChange={e => setEmbeddedMsgInput(e.target.value)}
                                  placeholder="Type a message to Tech, Advisor, or Parts Counter..."
                                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => setIsEmbeddedUrgent(!isEmbeddedUrgent)}
                                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                                    isEmbeddedUrgent
                                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                  }`}
                                  title="Mark message as urgent priority"
                                >
                                  <AlertTriangle className={`w-3.5 h-3.5 ${isEmbeddedUrgent ? 'text-white' : 'text-slate-400'}`} />
                                </button>
                                <button
                                  type="submit"
                                  disabled={!embeddedMsgInput.trim()}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Send</span>
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY */}
          {activeTab === 'HISTORY' && !isAdvisorScreen && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Real-Time Event & Status Audit Trail
              </h4>
              <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                {selectedRO.history.map(item => (
                  <div key={item.id} className="relative pb-2">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.notes}
                    </p>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                      <span>Updated by: <strong className="font-semibold text-slate-700">{item.updatedByName}</strong></span>
                      {(() => {
                        const updUser = users.find(u => u.id === item.userId || u.name === item.updatedByName);
                        return updUser?.employeeNumber ? (
                          <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {updUser.employeeNumber}
                          </span>
                        ) : null;
                      })()}
                      <span>({item.userRole.replace('_', ' ')})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER CONTACTS & TWICE-WEEKLY CADENCE HISTORY */}
          {activeTab === 'CONTACTS' && (
            <div className="space-y-4">
              {/* Cadence Policy Header Card */}
              {(() => {
                const cadence = getContactCadenceStatus(selectedRO);
                return (
                  <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          Twice-Weekly Call Standard
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cadence.badgeClass}`}>
                          {cadence.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-black mt-1 text-white flex items-center gap-2">
                        <span>Customer Contact & Update History</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {cadence.lastContactText} • Next call scheduled: <strong>{cadence.nextDueText}</strong>
                      </p>
                    </div>

                    {!isSales && (
                      <button
                        type="button"
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Log New Call / Touchpoint</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Contact History List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Logged Touchpoint Records ({selectedRO.contactHistory?.length || 0})
                </h5>

                {!selectedRO.contactHistory || selectedRO.contactHistory.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                    <PhoneCall className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-xs text-slate-700">No Customer Calls Logged Yet</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      All customers with vehicles in the shop or waiting on parts must receive proactive calls at least twice per week.
                    </p>
                    {!isSales && (
                      <button
                        type="button"
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Log Initial Customer Call</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedRO.contactHistory.map(record => {
                      const typeCfg = formatContactType(record.type);
                      const outcomeCfg = formatContactOutcome(record.outcome);
                      return (
                        <div
                          key={record.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <span className="font-semibold text-blue-600">{typeCfg.label}</span>
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${outcomeCfg.color}`}>
                                {outcomeCfg.label}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(record.timestamp)}
                            </span>
                          </div>

                          {/* Notes/Summary */}
                          <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {record.summary}
                          </p>

                          {/* Details: Advisor, ETA Discussed, Next Due */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 flex-wrap">
                              <span>Logged by: <strong className="text-slate-700">{record.advisorName}</strong></span>
                              {(() => {
                                const adv = users.find(u => u.id === record.advisorId || u.name === record.advisorName);
                                return adv?.employeeNumber ? (
                                  <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {adv.employeeNumber}
                                  </span>
                                ) : null;
                              })()}
                            </span>
                            {record.nextScheduledContactDate && (
                              <span className="font-semibold text-blue-600">
                                Next Call Due: {record.nextScheduledContactDate}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: WARRANTY TIME CLOCK & AUDIT PUNCHES */}
          {!isAdvisorScreen && currentUser.role !== 'SERVICE_ADVISOR' && activeRoleView !== 'SERVICE_ADVISOR' && activeTab === 'WARRANTY' && (
            <div className="space-y-4">
              <WarrantyTimeClockSection ro={selectedRO} />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span>Current Status:</span>
            <strong className="text-slate-800 font-bold">{currentStatusInfo.label}</strong>
            {!isManager && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md font-medium sm:ml-2">
                <Lock className="w-3 h-3 text-slate-400" /> Information locked (Manager permission required to alter/delete)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isManager && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                title="Service Manager authority: Delete this repair order"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>Delete RO</span>
              </button>
            )}

            <button
              onClick={() => setSelectedRO(null)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal for Service Manager */}
        {isManager && isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Delete Repair Order #{selectedRO.id}?
              </h3>
              
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                As <strong>Service Manager</strong>, you have sole administrative permission to delete information. Are you sure you want to permanently delete this repair order for <strong>{selectedRO.customerName}</strong> ({selectedRO.vehicle.year} {selectedRO.vehicle.make} {selectedRO.vehicle.model})?
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3 text-xs text-amber-900">
                <span className="font-bold">Permanent removal: </span>
                This record will be deleted from the active board and database. Associated parts logs and message histories for this order will be cleared.
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Yes, Delete Repair Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Follow-Up Modal */}
        {isFollowUpModalOpen && (
          <CustomerFollowUpModal
            ro={selectedRO}
            onClose={() => setIsFollowUpModalOpen(false)}
            onSuccess={(msg) => {
              setManagerActionFeedback(msg);
              setTimeout(() => setManagerActionFeedback(null), 4000);
            }}
          />
        )}

        {/* Edit Part Modal */}
        {editingPartItem && selectedRO && (
          <EditPartModal
            isOpen={true}
            onClose={() => setEditingPartItem(null)}
            part={editingPartItem}
            roId={selectedRO.id}
            onSuccess={(msg) => {
              setManagerActionFeedback(msg);
              setTimeout(() => setManagerActionFeedback(null), 4000);
            }}
          />
        )}

        {/* Add New Part to this RO Modal */}
        {isAddPartModalOpen && selectedRO && (
          <EditPartModal
            isOpen={true}
            onClose={() => setIsAddPartModalOpen(false)}
            roId={selectedRO.id}
            initialLineNumber={addPartLineNumber}
            onSuccess={(msg) => {
              setManagerActionFeedback(msg);
              setTimeout(() => setManagerActionFeedback(null), 4000);
            }}
          />
        )}

      </div>
    </div>
  );
};
