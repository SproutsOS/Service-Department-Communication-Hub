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
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStatus, PartStatus, UserRole, RepairOrder, ConcernPayType } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatRelativeTime, formatEtaBadge, formatDurationSince, getDiagnosticStatusDetails } from '../utils/formatters';
import { TicketFlowStepper } from './TicketFlowStepper';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { WarrantyTimeClockSection } from './WarrantyTimeClockSection';
import { VehiclePhotoManager } from './VehiclePhotoManager';
import { getContactCadenceStatus, formatContactType, formatContactOutcome } from '../utils/cadenceUtils';
import { decodeVin } from '../utils/vinDecoder';
import { DynamicROWorkflow } from './DynamicROWorkflow';

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
    addPartOrder, 
    updatePartStatus,
    updateRepairOrderDetails,
    updateTechCauseAndCorrection,
    deleteRepairOrder,
    openDirectChat,
    openQuoteModal,
    openWarrantyPrintModal,
    updateConcernPayType,
    updateConcernTech,
    toggleCustomerTaxExempt,
    addVehiclePhoto,
    deleteVehiclePhoto,
    activeRoleView
  } = useApp();

  const isTechScreen = activeRoleView === 'TECHNICIAN' || currentUser.role === 'TECHNICIAN';
  const isAdvisorScreen = (activeRoleView === 'SERVICE_ADVISOR' || (currentUser.role === 'SERVICE_ADVISOR' && !activeRoleView)) && !isTechScreen;
  const isManager = (currentUser.role === 'SERVICE_MANAGER' || activeRoleView === 'SERVICE_MANAGER') && !isAdvisorScreen && !isTechScreen;
  const isAdvisor = isAdvisorScreen;
  const isPartsManager = currentUser.role === 'PARTS_SPECIALIST' || activeRoleView === 'PARTS_SPECIALIST';
  const isSales = currentUser.role === 'SALES' || activeRoleView === 'SALES';
  const canChangePartStatus = (currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'PARTS_SPECIALIST') && !isAdvisorScreen && !isTechScreen;
  const canSelectPayType = isManager || isAdvisor;
  const canAssignTech = isManager || isAdvisor;
  const canReassignServiceWriter = !isTechScreen && (currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [managerActionFeedback, setManagerActionFeedback] = useState<string | null>(null);

  // Editable fields initialized from selectedRO
  const [editCustomerName, setEditCustomerName] = useState(selectedRO?.customerName || '');
  const [editCustomerPhone, setEditCustomerPhone] = useState(selectedRO?.customerPhone || '');
  const [editVehicleYear, setEditVehicleYear] = useState<number | string>(selectedRO?.vehicle.year || '');
  const [editVehicleMake, setEditVehicleMake] = useState(selectedRO?.vehicle.make || '');
  const [editVehicleModel, setEditVehicleModel] = useState(selectedRO?.vehicle.model || '');
  const [editVehicleVin, setEditVehicleVin] = useState(selectedRO?.vehicle.vin || '');
  const [editVehicleMileage, setEditVehicleMileage] = useState<number | string>(selectedRO?.vehicle.mileage ?? '');
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

  // Keep manager edit state synced when selectedRO updates (unless currently editing)
  useEffect(() => {
    if (!selectedRO || isEditingDetails) return;
    setEditCustomerName(selectedRO.customerName || '');
    setEditCustomerPhone(selectedRO.customerPhone || '');
    setEditVehicleYear(selectedRO.vehicle.year || '');
    setEditVehicleMake(selectedRO.vehicle.make || '');
    setEditVehicleModel(selectedRO.vehicle.model || '');
    setEditVehicleVin(selectedRO.vehicle.vin || '');
    setEditVehicleMileage(selectedRO.vehicle.mileage ?? '');
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
    if (!isManager || !selectedRO) return;
    setManagerAutoSaveStatus('saving');
    if (managerAutoSaveTimerRef.current) {
      clearTimeout(managerAutoSaveTimerRef.current);
    }
    managerAutoSaveTimerRef.current = setTimeout(() => {
      const validConcerns = (overrides?.concerns || editConcerns).map(c => c.trim()).filter(Boolean);
      const finalPrimary = validConcerns[0] || (overrides?.primaryConcern ?? editPrimaryConcern).trim() || selectedRO.primaryConcern;
      const finalConcernTechIds = overrides?.concernTechIds !== undefined ? overrides.concernTechIds : editConcernTechIds;

      updateRepairOrderDetails(selectedRO.id, {
        customerName: overrides?.customerName !== undefined ? overrides.customerName : editCustomerName.trim(),
        customerPhone: overrides?.customerPhone !== undefined ? overrides.customerPhone : editCustomerPhone.trim(),
        vehicle: {
          ...selectedRO.vehicle,
          year: overrides?.vehicle?.year !== undefined ? overrides.vehicle.year : (Number(editVehicleYear) || selectedRO.vehicle.year),
          make: overrides?.vehicle?.make !== undefined ? overrides.vehicle.make : editVehicleMake.trim(),
          model: overrides?.vehicle?.model !== undefined ? overrides.vehicle.model : editVehicleModel.trim(),
          vin: overrides?.vehicle?.vin !== undefined ? overrides.vehicle.vin : editVehicleVin.trim().toUpperCase(),
          mileage: overrides?.vehicle?.mileage !== undefined ? overrides.vehicle.mileage : (Number(editVehicleMileage) || selectedRO.vehicle.mileage || 0)
        },
        primaryConcern: finalPrimary,
        concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
        concernPayTypes: overrides?.concernPayTypes !== undefined ? overrides.concernPayTypes : editConcernPayTypes,
        concernTechIds: finalConcernTechIds,
        concernTechNames: finalConcernTechIds.map(id => id ? users.find(u => u.id === id)?.name : undefined),
        promisedTime: overrides?.promisedTime !== undefined ? overrides.promisedTime : editPromisedTime,
        diagnosticNotes: overrides?.diagnosticNotes !== undefined ? overrides.diagnosticNotes : editDiagnosticNotes.trim(),
        cause: overrides?.cause !== undefined ? overrides.cause : editCause.trim(),
        correction: overrides?.correction !== undefined ? overrides.correction : editCorrection.trim(),
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
    if (!isManager || !selectedRO) return;
    const validConcerns = editConcerns.map(c => c.trim()).filter(Boolean);
    const finalPrimary = validConcerns[0] || editPrimaryConcern.trim() || selectedRO.primaryConcern;

    updateRepairOrderDetails(selectedRO.id, {
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      vehicle: {
        ...selectedRO.vehicle,
        year: Number(editVehicleYear) || selectedRO.vehicle.year,
        make: editVehicleMake.trim(),
        model: editVehicleModel.trim(),
        vin: editVehicleVin.trim().toUpperCase(),
        mileage: Number(editVehicleMileage) || selectedRO.vehicle.mileage || 0
      },
      primaryConcern: finalPrimary,
      concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
      concernPayTypes: editConcernPayTypes,
      concernTechIds: editConcernTechIds,
      concernTechNames: editConcernTechIds.map(id => id ? users.find(u => u.id === id)?.name : undefined),
      promisedTime: editPromisedTime,
      diagnosticNotes: editDiagnosticNotes.trim(),
      cause: editCause.trim(),
      correction: editCorrection.trim(),
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

  const handleAddEditConcern = () => {
    setEditConcerns(prev => [...prev, '']);
    setEditConcernPayTypes(prev => [...prev, 'CUSTOMER_PAY']);
    setEditConcernTechIds(prev => [...prev, selectedRO?.techId || undefined]);
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
      setEditPrimaryConcern(selectedRO.primaryConcern);
      const initialConcerns = selectedRO.concerns && selectedRO.concerns.length > 0
        ? selectedRO.concerns
        : [selectedRO.primaryConcern || ''];
      setEditConcerns(initialConcerns);
      setEditConcernPayTypes(
        selectedRO.concernPayTypes && selectedRO.concernPayTypes.length > 0
          ? selectedRO.concernPayTypes
          : initialConcerns.map(() => 'CUSTOMER_PAY')
      );
      setEditConcernTechIds(
        selectedRO.concernTechIds && selectedRO.concernTechIds.length > 0
          ? selectedRO.concernTechIds
          : initialConcerns.map(() => selectedRO.techId)
      );
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
      } else if (currentUser.role === 'PARTS_SPECIALIST' || activeRoleView === 'PARTS_SPECIALIST') {
        setActiveTab('PARTS');
      } else {
        setActiveTab('DETAILS');
      }
    }
  }, [selectedRO?.id, selectedROModalTab, currentUser.role, activeRoleView, setSelectedROModalTab]);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PHOTOS' | 'CHAT' | 'PARTS' | 'HISTORY' | 'CONTACTS' | 'WARRANTY'>('DETAILS');

  useEffect(() => {
    if (selectedROModalTab) {
      setActiveTab(selectedROModalTab);
      setSelectedROModalTab(null);
    }
  }, [selectedROModalTab, setSelectedROModalTab]);
  const [chatInput, setChatInput] = useState('');
  const [isUrgentMessage, setIsUrgentMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUrgentStatusUpdate, setIsUrgentStatusUpdate] = useState(false);

  // New Part Form state
  const DEFAULT_MODAL_VENDORS = ['STELLANTIS', 'OREILLY', 'AUTOZONE', 'HOLLANDS', 'RICKS PRO TRUCK'];
  const [modalVendors, setModalVendors] = useState<string[]>(DEFAULT_MODAL_VENDORS);
  const DEFAULT_MODAL_STATUSES = [
    { id: 'IN_STOCK', label: 'IN STOCK' },
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

    // Build today's date with chosen ETA time
    const today = new Date();
    const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
    const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));

    const effectiveVendor = isModalAddingCustomVendor && modalCustomVendorInput.trim()
      ? modalCustomVendorInput.trim().toUpperCase()
      : partVendor;

    if (isModalAddingCustomVendor && modalCustomVendorInput.trim() && !modalVendors.includes(effectiveVendor)) {
      setModalVendors(prev => [...prev, effectiveVendor]);
    }

    const effectiveStatus = canChangePartStatus
      ? (isModalAddingCustomStatus && modalCustomStatusInput.trim()
          ? modalCustomStatusInput.trim().toUpperCase().replace(/\s+/g, '_')
          : partInitialStatus)
      : 'REQUESTED';

    if (canChangePartStatus && isModalAddingCustomStatus && modalCustomStatusInput.trim()) {
      const label = modalCustomStatusInput.trim().toUpperCase();
      if (!modalStatuses.some(s => s.id === effectiveStatus)) {
        setModalStatuses(prev => [...prev, { id: effectiveStatus, label }]);
      }
    }

    addPartOrder(selectedRO.id, {
      partNumber: partNumber.trim().toUpperCase(),
      description: partDescription.trim(),
      quantity: partQuantity || 1,
      status: effectiveStatus,
      vendor: effectiveVendor || 'STELLANTIS',
      estimatedArrival: effectiveStatus === 'IN_STOCK' ? new Date().toISOString() : etaDate.toISOString(),
      trackingNumber: partTracking.trim() || undefined,
      price: partPrice ? parseFloat(partPrice) : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="ro-detail-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl sm:max-w-[1060px] w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          {/* Top Row: RO number, status badge, priority/waiter tags on the left; Action buttons & close on the right */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
              <span className="font-bold text-lg sm:text-xl text-blue-600 tracking-tight">
                #{selectedRO.id}
              </span>
              {isTechScreen && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border-2 border-blue-400 flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-blue-600" />
                  <span>Technician Station</span>
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
              {selectedRO.isWaiter && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border-2 border-red-500 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-red-600" /> WAITER
                </span>
              )}
              {selectedRO.isUrgent && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border-2 border-red-500 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> HIGH PRIORITY
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* ProDemand Labor Guide Link */}
              <a
                href="https://www.prodemand.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs shrink-0"
                title="Open Mitchell 1 ProDemand flat rate labor times"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ProDemand</span> Labor ↗
              </a>

              {/* Advisor Quick Photos Action */}
              {isAdvisorScreen && (
                <button
                  type="button"
                  onClick={() => setActiveTab('PHOTOS')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border shadow-2xs shrink-0 ${
                    activeTab === 'PHOTOS'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
                  }`}
                  title="Vehicle Intake & Walkaround Photos"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photos ({(selectedRO.vehiclePhotos?.length || 0)})</span>
                </button>
              )}

              {/* Repair Quote Initiation / Status */}
              <button
                type="button"
                onClick={() => openQuoteModal(selectedRO.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs shrink-0 ${
                  selectedRO.quote
                    ? selectedRO.quote.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : selectedRO.quote.status === 'SUBMITTED'
                      ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100'
                    : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 hover:scale-102'
                }`}
                title={selectedRO.quote ? `View or Edit Repair Quote (${selectedRO.quote.status})` : 'Initiate Repair Quote'}
              >
                <Calculator className="w-3.5 h-3.5" />
                {selectedRO.quote ? (
                  <span>
                    Quote: <strong>${(Number(selectedRO.quote.grandTotal) || 0).toFixed(2)}</strong>
                  </span>
                ) : (
                  <span>+ Repair Quote</span>
                )}
              </button>

              {isManager ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingDetails && selectedRO) {
                      setEditCustomerName(selectedRO.customerName);
                      setEditCustomerPhone(selectedRO.customerPhone);
                      setEditVehicleYear(selectedRO.vehicle.year);
                      setEditVehicleMake(selectedRO.vehicle.make);
                      setEditVehicleModel(selectedRO.vehicle.model);
                      setEditVehicleVin(selectedRO.vehicle.vin);
                      setEditVehicleMileage(selectedRO.vehicle.mileage ?? '');
                      setEditPrimaryConcern(selectedRO.primaryConcern);
                      setEditPromisedTime(selectedRO.promisedTime);
                      setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
                      setActiveTab('DETAILS');
                    }
                    setIsEditingDetails(!isEditingDetails);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border shrink-0 ${
                    isEditingDetails 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                  }`}
                  title="Service Manager: Edit core repair order details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingDetails ? 'Cancel Editing' : 'Edit RO Info'}</span>
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 border border-slate-300 text-slate-700 text-xs font-semibold shrink-0">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Info Locked</span>
                </span>
              )}

              <button
                id="header-print-warranty-btn"
                type="button"
                onClick={() => openWarrantyPrintModal(selectedRO.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs shrink-0"
                title="Print Warranty Sheet with Cause, Correction, and Start/End Punch Clock Times"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Print Warranty</span>
              </button>

              <button
                id="close-ro-detail-btn"
                onClick={() => setSelectedRO(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-Header Strip: Customer & Service Advisor on the left, Vehicle, VIN & Mileage on the right */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0">
            {/* Customer & Advisor */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap shrink-0 min-h-[34px]">
              {selectedRO.customerName && selectedRO.customerName.trim().toLowerCase() !== 'woolwine cdjr' && (
                <>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{selectedRO.customerName}</span>
                  </div>
                  {selectedRO.customerPhone && (
                    <span className="text-slate-500 text-xs font-medium">({selectedRO.customerPhone})</span>
                  )}
                  <span className="text-slate-300 font-light">|</span>
                </>
              )}

              {/* Service Advisor with Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-700">Advisor:</span>
                </div>
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
                    className="text-xs px-2.5 py-1 bg-white border-2 border-slate-600 hover:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-900 font-bold cursor-pointer shrink-0"
                    title="Change Service Advisor"
                  >
                    {serviceWriters.map(writer => (
                      <option key={writer.id} value={writer.id}>
                        {writer.name}{writer.employeeNumber ? ` (#${writer.employeeNumber})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    {selectedRO.advisorName}
                  </span>
                )}
                {advisorReassignSuccess && (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Updated
                  </span>
                )}
              </div>
            </div>

            {/* Vehicle, VIN & Miles */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs self-start md:self-auto flex-wrap shrink-0 min-h-[36px]">
              <Car className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
                {selectedRO.vehicle.year} {selectedRO.vehicle.make} {selectedRO.vehicle.model}
              </span>
              <span className="text-slate-300 mx-3 select-none font-light shrink-0">|</span>
              <span 
                className="font-bold text-slate-900 text-sm whitespace-nowrap select-all shrink-0" 
                title={`VIN: ${selectedRO.vehicle.vin}`}
              >
                {selectedRO.vehicle.vin}
              </span>
              <span className="text-slate-300 mx-3 select-none font-light shrink-0">|</span>
              <span className="font-bold text-slate-900 text-sm whitespace-nowrap shrink-0">
                {selectedRO.vehicle.mileage !== undefined && selectedRO.vehicle.mileage !== null && Number(selectedRO.vehicle.mileage) > 0
                  ? `${Number(selectedRO.vehicle.mileage).toLocaleString()} mi`
                  : 'N/A'}
              </span>
            </div>
          </div>
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

        <div className="flex flex-wrap border-b border-slate-200 px-3 sm:px-6 bg-white gap-1 sm:gap-2 overflow-x-auto shrink-0">
          <button
            id="ro-tab-details"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'DETAILS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{isTechScreen ? 'Technician Workflow & Tasks' : 'RO Details & Assignment'}</span>
          </button>

          {/* Vehicle Photos Tab: Exclusively on Advisor board (isAdvisorScreen) or Manager overview */}
          {isAdvisorScreen && (
            <button
              id="ro-tab-photos"
              onClick={() => setActiveTab('PHOTOS')}
              className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'PHOTOS'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>Vehicle Photos</span>
              {(selectedRO.vehiclePhotos?.length || 0) > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {selectedRO.vehiclePhotos?.length}
                </span>
              )}
            </button>
          )}

          <button
            id="ro-tab-chat"
            onClick={() => setActiveTab('CHAT')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'CHAT'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Live Communication</span>
            {selectedRO.messages.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.messages.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-warranty"
            onClick={() => setActiveTab('WARRANTY')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'WARRANTY'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Warranty Time Clock</span>
            {(selectedRO.timePunches?.length || 0) > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.timePunches?.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-parts"
            onClick={() => setActiveTab('PARTS')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'PARTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>Parts ETA</span>
            {selectedRO.parts.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.parts.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-history"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Audit History ({selectedRO.history.length})</span>
          </button>

          <button
            id="ro-tab-contacts"
            onClick={() => setActiveTab('CONTACTS')}
            className={`py-2.5 px-2.5 sm:px-3 -mb-px border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'CONTACTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Follow-Ups</span>
            {(selectedRO.contactHistory?.length || 0) > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.contactHistory?.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">

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

              {/* Service Manager Edit Form */}
              {isManager && isEditingDetails && (
                <form onSubmit={handleSaveDetails} className="bg-white rounded-xl p-5 border-2 border-blue-500 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Service Manager: Edit Repair Order Information
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
                        Manager Authority Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          Mileage (mi)
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
                    </div>
                  </div>

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

                    <div className="space-y-2">
                      {editConcerns.map((c, idx) => {
                        const currentPayType: ConcernPayType = editConcernPayTypes[idx] || 'CUSTOMER_PAY';
                        return (
                          <div key={idx} className="bg-white p-2.5 rounded-lg border-2 border-slate-400 space-y-2 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">
                                {idx === 0 ? 'Line 1 (Primary Concern)' : `Line ${idx + 1}`}
                              </span>

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
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pay:</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      currentPayType === 'CUSTOMER_PAY'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : currentPayType === 'WARRANTY'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                                    }`}>
                                      {currentPayType === 'CUSTOMER_PAY' ? 'Customer Pay' : currentPayType === 'WARRANTY' ? 'Warranty' : 'Internal'}
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
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              )}
                            </div>
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
                              placeholder={idx === 0 ? "Customer primary concern / complaint..." : `Additional concern / complaint line ${idx + 1}...`}
                              className="w-full px-2.5 py-1.5 border-2 border-slate-600 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

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
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                          <span>Cause</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editCause}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCause(val);
                          triggerManagerAutoSave({ cause: val.trim() });
                        }}
                        onBlur={flushManagerAutoSave}
                        placeholder="Root cause (e.g., Code P0300 cylinder 3 plug fouled with oil, broken belt tensioner)..."
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Correction</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editCorrection}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditCorrection(val);
                          triggerManagerAutoSave({ correction: val.trim() });
                        }}
                        onBlur={flushManagerAutoSave}
                        placeholder="Corrective repair (e.g., Replaced spark plug tube seals & plugs, road tested 5 mi)..."
                        className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
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
                        placeholder="Diagnostic notes, inspection findings..."
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
                isTechScreen={isTechScreen}
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

          {/* TAB 2: LIVE COMMUNICATION THREAD */}
          {activeTab === 'CHAT' && (
            <div className="flex flex-col h-[480px]">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Inter-Department Communication Thread
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Direct channel between Service Manager, Service Advisors, Techs, & Parts
                  </p>
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {selectedRO.messages.length} messages logged
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {selectedRO.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    No messages yet on {selectedRO.id}. Start the conversation below.
                  </div>
                ) : (
                  selectedRO.messages.map(msg => {
                    const isSelf = msg.senderId === currentUser.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-bold text-slate-700">
                            {msg.senderName}
                          </span>
                          {(() => {
                            const sender = users.find(u => u.id === msg.senderId);
                            return sender?.employeeNumber ? (
                              <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {sender.employeeNumber}
                              </span>
                            ) : null;
                          })()}
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold uppercase">
                            {msg.senderRole.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(msg.timestamp)}
                          </span>
                        </div>

                        <div 
                          className={`max-w-md p-3 rounded-xl text-xs leading-relaxed ${
                            msg.isUrgent
                              ? 'bg-red-50 text-red-950 border-2 border-red-300 font-medium'
                              : isSelf
                              ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-slate-100 text-slate-900 rounded-bl-xs border-2 border-slate-300'
                          }`}
                        >
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
              {isSales ? (
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inter-department messaging is read-only for the Sales position.</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="pt-3 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUrgentMessage}
                        onChange={e => setIsUrgentMessage(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Flag as Urgent Push Notification
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400">Press Enter to send</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Message regarding ${selectedRO.id} as ${currentUser.name}...`}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 text-sm px-3.5 py-2 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs bg-white text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer border-2 border-blue-700"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* TAB 3: PARTS ORDERED & TRACKED WITH ESTIMATED ARRIVAL */}
          {activeTab === 'PARTS' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Parts Ordered & Tracking Status
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Live delivery ETAs and parts staging directly on this repair order
                  </p>
                </div>

                {!isSales && (
                  <button
                    id="add-part-toggle-btn"
                    onClick={() => setShowAddPart(!showAddPart)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer border-2 border-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Order New Part</span>
                  </button>
                )}
              </div>

              {/* Add Part Form */}
              {showAddPart && (
                <form 
                  onSubmit={handleAddPartSubmit}
                  className="p-4 bg-slate-50 rounded-xl border-2 border-slate-400 space-y-3 animate-in fade-in duration-100 shadow-sm"
                >
                  <h5 className="text-xs font-bold text-slate-900">Add / Order Parts</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Part Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. ML3Z-8C419-A"
                        value={partNumber}
                        onChange={e => setPartNumber(e.target.value)}
                        required
                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Part Description *</label>
                      <input
                        type="text"
                        placeholder="e.g. Auxiliary Coolant Pump"
                        value={partDescription}
                        onChange={e => setPartDescription(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Supplier / Vendor *</label>
                        {!isModalAddingCustomVendor && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalAddingCustomVendor(true);
                              setModalCustomVendorInput('');
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                          >
                            + Add Custom
                          </button>
                        )}
                      </div>

                      {!isModalAddingCustomVendor ? (
                        <select
                          value={partVendor}
                          onChange={e => {
                            if (e.target.value === '__ADD_NEW__') {
                              setIsModalAddingCustomVendor(true);
                              setModalCustomVendorInput('');
                            } else {
                              setPartVendor(e.target.value);
                            }
                          }}
                          className="w-full text-xs font-bold px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                        >
                          {modalVendors.map(v => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                          <option value="__ADD_NEW__">+ Add Other Vendor...</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Vendor name..."
                            value={modalCustomVendorInput}
                            onChange={e => setModalCustomVendorInput(e.target.value)}
                            autoFocus
                            className="flex-1 text-xs font-bold px-2.5 py-1.5 bg-white border-2 border-blue-500 rounded-lg focus:outline-none uppercase text-slate-800"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = modalCustomVendorInput.trim().toUpperCase();
                                if (trimmed) {
                                  if (!modalVendors.includes(trimmed)) setModalVendors(prev => [...prev, trimmed]);
                                  setPartVendor(trimmed);
                                  setIsModalAddingCustomVendor(false);
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = modalCustomVendorInput.trim().toUpperCase();
                              if (trimmed) {
                                if (!modalVendors.includes(trimmed)) setModalVendors(prev => [...prev, trimmed]);
                                setPartVendor(trimmed);
                                setIsModalAddingCustomVendor(false);
                              }
                            }}
                            className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsModalAddingCustomVendor(false)}
                            className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Initial Part Status *</label>
                        {canChangePartStatus && !isModalAddingCustomStatus && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalAddingCustomStatus(true);
                              setModalCustomStatusInput('');
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                          >
                            + Add Custom
                          </button>
                        )}
                      </div>

                      {canChangePartStatus ? (
                        !isModalAddingCustomStatus ? (
                          <select
                            value={partInitialStatus}
                            onChange={e => {
                              if (e.target.value === '__ADD_NEW_STATUS__') {
                                setIsModalAddingCustomStatus(true);
                                setModalCustomStatusInput('');
                              } else {
                                setPartInitialStatus(e.target.value as PartStatus);
                              }
                            }}
                            className="w-full text-xs font-bold px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                          >
                            {modalStatuses.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.label}
                              </option>
                            ))}
                            <option value="__ADD_NEW_STATUS__">+ Add Custom Status...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="e.g. TIRE WAREHOUSE..."
                              value={modalCustomStatusInput}
                              onChange={e => setModalCustomStatusInput(e.target.value)}
                              autoFocus
                              className="flex-1 text-xs font-bold px-2.5 py-1.5 bg-white border-2 border-blue-500 rounded-lg focus:outline-none uppercase text-slate-800"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = modalCustomStatusInput.trim().toUpperCase();
                                  if (trimmed) {
                                    const cleanId = trimmed.replace(/\s+/g, '_');
                                    if (!modalStatuses.some(s => s.id === cleanId)) {
                                      setModalStatuses(prev => [...prev, { id: cleanId, label: trimmed }]);
                                    }
                                    setPartInitialStatus(cleanId);
                                    setIsModalAddingCustomStatus(false);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = modalCustomStatusInput.trim().toUpperCase();
                                if (trimmed) {
                                  const cleanId = trimmed.replace(/\s+/g, '_');
                                  if (!modalStatuses.some(s => s.id === cleanId)) {
                                    setModalStatuses(prev => [...prev, { id: cleanId, label: trimmed }]);
                                  }
                                  setPartInitialStatus(cleanId);
                                  setIsModalAddingCustomStatus(false);
                                }
                              }}
                              className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsModalAddingCustomStatus(false)}
                              className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>REQUESTED (Pending Parts Classification)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Parts Mgr Auth Required</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder=""
                          value={partPrice}
                          onChange={e => setPartPrice(e.target.value)}
                          className="w-full text-xs pl-6 pr-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    {partInitialStatus !== 'IN_STOCK' && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Estimated Arrival Time Today (ETA)</label>
                        <input
                          type="time"
                          value={partEtaTime}
                          onChange={e => setPartEtaTime(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPart(false)}
                      className="px-3 py-1.5 border-2 border-slate-400 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer border-2 border-blue-700"
                    >
                      Confirm Order & Notify Tech
                    </button>
                  </div>
                </form>
              )}

              {/* Parts List */}
              {selectedRO.parts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No parts currently ordered for this repair order.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedRO.parts.map(part => {
                    const etaBadge = formatEtaBadge(part.estimatedArrival);
                    return (
                      <div 
                        key={part.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                #{part.partNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {part.description} (Qty: {part.quantity})
                              </span>
                              {part.price !== undefined && (
                                <span className="text-xs font-semibold text-slate-600">
                                  • Price: ${part.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Vendor: <strong>{part.vendor}</strong> {part.trackingNumber ? `• Tracking: ${part.trackingNumber}` : ''}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              part.status === 'IN_STOCK' || part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : part.status === 'VOR_UPGRADE'
                                ? 'bg-rose-100 text-rose-700 border-rose-200 font-black'
                                : part.status === 'SPECIAL_ORDER' || part.status === 'SPECIAL_ORDER_1_5_DAYS'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : part.status === 'IN_TRANSIT'
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                              {part.status === 'SPECIAL_ORDER' || part.status === 'SPECIAL_ORDER_1_5_DAYS'
                                ? 'SPECIAL ORDER 1-5 DAYS'
                                : part.status.replace(/_/g, ' ')}
                            </span>
                            {part.status !== 'IN_STOCK' && part.status !== 'ISSUED_TO_TECH' && part.estimatedArrival && (
                              <div className="mt-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  etaBadge.pastDue
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}>
                                  {etaBadge.text}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Part Status Transition Actions */}
                        {canChangePartStatus ? (
                          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] text-slate-400 font-medium">Quick Update Status:</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {(['IN_STOCK', 'DAILY_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'RECEIVED', 'ISSUED_TO_TECH'] as PartStatus[])
                                  .concat(
                                    modalStatuses
                                      .filter(s => !['IN_STOCK', 'DAILY_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'RECEIVED', 'ISSUED_TO_TECH'].includes(s.id))
                                      .map(s => s.id)
                                  )
                                  .map(st => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => updatePartStatus(selectedRO.id, part.id, st)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                        part.status === st
                                          ? 'bg-slate-900 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {st === 'ISSUED_TO_TECH' ? 'Issued to Tech' : st === 'SPECIAL_ORDER_1_5_DAYS' ? 'Special Order 1-5 Days' : st.replace(/_/g, ' ')}
                                    </button>
                                  ))}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customStatusEditingPartId === part.id) {
                                      setCustomStatusEditingPartId(null);
                                    } else {
                                      setCustomStatusEditingPartId(part.id);
                                      setPartQuickCustomStatusInput('');
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                                >
                                  + Custom Status
                                </button>
                              </div>
                            </div>

                            {customStatusEditingPartId === part.id && (
                              <div className="flex items-center gap-1.5 p-2 bg-blue-50/50 rounded-lg border border-blue-200 animate-in fade-in duration-100">
                                <input
                                  type="text"
                                  placeholder="Enter custom status (e.g. TIRE WAREHOUSE, CORE RETURN)..."
                                  value={partQuickCustomStatusInput}
                                  onChange={e => setPartQuickCustomStatusInput(e.target.value)}
                                  autoFocus
                                  className="flex-1 text-xs font-bold px-2.5 py-1 bg-white border border-blue-400 rounded-md focus:outline-none uppercase text-slate-800"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const trimmed = partQuickCustomStatusInput.trim().toUpperCase();
                                      if (trimmed) {
                                        const cleanId = trimmed.replace(/\s+/g, '_');
                                        if (!modalStatuses.some(s => s.id === cleanId)) {
                                          setModalStatuses(prev => [...prev, { id: cleanId, label: trimmed }]);
                                        }
                                        updatePartStatus(selectedRO.id, part.id, cleanId);
                                        setCustomStatusEditingPartId(null);
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trimmed = partQuickCustomStatusInput.trim().toUpperCase();
                                    if (trimmed) {
                                      const cleanId = trimmed.replace(/\s+/g, '_');
                                      if (!modalStatuses.some(s => s.id === cleanId)) {
                                        setModalStatuses(prev => [...prev, { id: cleanId, label: trimmed }]);
                                      }
                                      updatePartStatus(selectedRO.id, part.id, cleanId);
                                      setCustomStatusEditingPartId(null);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 cursor-pointer"
                                >
                                  Set Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustomStatusEditingPartId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Status updates (In Stock, Daily Order, Special Order 1-5 Days, VOR) restricted to Service Manager & Parts Manager</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Advisor Screen (Read-Only)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: AUDIT HISTORY */}
          {activeTab === 'HISTORY' && (
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
          {activeTab === 'WARRANTY' && (
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
            <button
              type="button"
              onClick={() => openWarrantyPrintModal(selectedRO.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
              title="Print official warranty claim sheet with start/end punches, total hours, cause, and correction"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Print Warranty Sheet</span>
            </button>

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

      </div>
    </div>
  );
};
