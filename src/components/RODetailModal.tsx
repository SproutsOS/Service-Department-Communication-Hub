import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
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
  PhoneForwarded,
  Loader2,
  Sparkles,
  RefreshCw,
  Trash2,
  ExternalLink,
  Calculator,
  Printer
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStatus, PartStatus, UserRole, RepairOrder } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatRelativeTime, formatEtaBadge, formatDurationSince, getDiagnosticStatusDetails } from '../utils/formatters';
import { TicketFlowStepper } from './TicketFlowStepper';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { WarrantyTimeClockSection } from './WarrantyTimeClockSection';
import { getContactCadenceStatus, formatContactType, formatContactOutcome } from '../utils/cadenceUtils';
import { decodeVin } from '../utils/vinDecoder';

export const RODetailModal: React.FC = () => {
  const { 
    selectedRO, 
    setSelectedRO, 
    currentUser, 
    users, 
    updateROStatus, 
    startDiagnosis,
    dispatchRO, 
    sendMessage, 
    addPartOrder, 
    updatePartStatus,
    updateRepairOrderDetails,
    updateTechCauseAndCorrection,
    deleteRepairOrder,
    openDirectChat,
    openQuoteModal,
    openWarrantyPrintModal
  } = useApp();

  const isManager = currentUser.role === 'SERVICE_MANAGER';
  const isSales = currentUser.role === 'SALES';
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
  const [editPrimaryConcern, setEditPrimaryConcern] = useState(selectedRO?.primaryConcern || '');
  const [editConcerns, setEditConcerns] = useState<string[]>(
    selectedRO?.concerns && selectedRO.concerns.length > 0
      ? selectedRO.concerns
      : [selectedRO?.primaryConcern || '']
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
    setEditPrimaryConcern(selectedRO.primaryConcern || '');
    setEditConcerns(selectedRO.concerns && selectedRO.concerns.length > 0 ? selectedRO.concerns : [selectedRO.primaryConcern || '']);
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

      updateRepairOrderDetails(selectedRO.id, {
        customerName: overrides?.customerName !== undefined ? overrides.customerName : editCustomerName.trim(),
        customerPhone: overrides?.customerPhone !== undefined ? overrides.customerPhone : editCustomerPhone.trim(),
        vehicle: {
          ...selectedRO.vehicle,
          year: overrides?.vehicle?.year !== undefined ? overrides.vehicle.year : (Number(editVehicleYear) || selectedRO.vehicle.year),
          make: overrides?.vehicle?.make !== undefined ? overrides.vehicle.make : editVehicleMake.trim(),
          model: overrides?.vehicle?.model !== undefined ? overrides.vehicle.model : editVehicleModel.trim(),
          vin: overrides?.vehicle?.vin !== undefined ? overrides.vehicle.vin : editVehicleVin.trim().toUpperCase()
        },
        primaryConcern: finalPrimary,
        concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
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
        vin: editVehicleVin.trim().toUpperCase()
      },
      primaryConcern: finalPrimary,
      concerns: validConcerns.length > 0 ? validConcerns : [finalPrimary],
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
  };

  const handleRemoveEditConcern = (index: number) => {
    setEditConcerns(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
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
    }
  }, [selectedRO?.id]);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'PARTS' | 'HISTORY' | 'CONTACTS' | 'WARRANTY'>('DETAILS');
  const [chatInput, setChatInput] = useState('');
  const [isUrgentMessage, setIsUrgentMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUrgentStatusUpdate, setIsUrgentStatusUpdate] = useState(false);

  // New Part Form state
  const [showAddPart, setShowAddPart] = useState(false);
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partVendor, setPartVendor] = useState('');
  const [partEtaTime, setPartEtaTime] = useState('');
  const [partTracking, setPartTracking] = useState('');

  // Dispatch selector state
  const [selectedTechId, setSelectedTechId] = useState(selectedRO?.techId || '');
  const [selectedBay, setSelectedBay] = useState(selectedRO?.bay || '');

  if (!selectedRO) return null;

  const currentStatusInfo = STATUS_CONFIG[selectedRO.status] || STATUS_CONFIG.CREATED;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(selectedRO.id, chatInput, isUrgentMessage);
    setChatInput('');
    setIsUrgentMessage(false);
  };

  const handleStatusChange = (newStatus: ROStatus) => {
    updateROStatus(selectedRO.id, newStatus, statusNote, isUrgentStatusUpdate);
    setStatusNote('');
    setIsUrgentStatusUpdate(false);
  };

  const handleDispatch = () => {
    if (!selectedTechId) return;
    dispatchRO(selectedRO.id, selectedTechId, selectedBay);
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim() || !partDescription.trim()) return;

    // Build today's date with chosen ETA time
    const today = new Date();
    const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
    const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));

    addPartOrder(selectedRO.id, {
      partNumber: partNumber.trim(),
      description: partDescription.trim(),
      quantity: partQuantity || 1,
      status: 'ORDERED',
      vendor: partVendor.trim() || 'Direct Parts Supplier',
      estimatedArrival: etaDate.toISOString(),
      trackingNumber: partTracking.trim() || undefined,
    });

    setPartNumber('');
    setPartDescription('');
    setPartVendor('');
    setPartEtaTime('');
    setPartTracking('');
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
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg sm:text-xl text-blue-600 tracking-tight">
                #{selectedRO.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
              {selectedRO.isUrgent && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border-2 border-red-500 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> HIGH PRIORITY
                </span>
              )}
              {selectedRO.isWaiter && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border-2 border-red-500 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-red-600" /> WAITER
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">{selectedRO.customerName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {selectedRO.customerPhone}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700">
                {selectedRO.vehicle.year} {selectedRO.vehicle.make} {selectedRO.vehicle.model}
              </span>
              <span className="text-slate-400">({selectedRO.vehicle.vin})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* ProDemand Labor Guide Link */}
            <a
              href="https://www.prodemand.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
              title="Open Mitchell 1 ProDemand flat rate labor times"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ProDemand</span> Labor ↗
            </a>

            {/* Repair Quote Initiation / Status */}
            <button
              type="button"
              onClick={() => openQuoteModal(selectedRO.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
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

            {!isSales && (
              <button
                type="button"
                onClick={() => setIsFollowUpModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                title="Log customer call or follow-up note"
              >
                <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                <span>Log Customer Follow-Up</span>
              </button>
            )}

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
                    setEditPrimaryConcern(selectedRO.primaryConcern);
                    setEditPromisedTime(selectedRO.promisedTime);
                    setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
                    setActiveTab('DETAILS');
                  }
                  setIsEditingDetails(!isEditingDetails);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
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
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 border border-slate-300 text-slate-700 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Info Locked</span>
              </span>
            )}

            <button
              id="header-print-warranty-btn"
              type="button"
              onClick={() => openWarrantyPrintModal(selectedRO.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
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

        {/* Navigation Tabs */}
        {isSales && (
          <div className="bg-teal-50 border-b border-teal-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-teal-950">
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
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-white gap-2 overflow-x-auto">
          <button
            id="ro-tab-details"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'DETAILS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>RO Details & Assignment</span>
          </button>

          <button
            id="ro-tab-chat"
            onClick={() => setActiveTab('CHAT')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === 'CHAT'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
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
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'WARRANTY'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
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
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === 'PARTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Parts & ETA Tracking</span>
            {selectedRO.parts.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.parts.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-history"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History ({selectedRO.history.length})</span>
          </button>

          <button
            id="ro-tab-contacts"
            onClick={() => setActiveTab('CONTACTS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'CONTACTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Customer Follow-Ups</span>
            {(selectedRO.contactHistory?.length || 0) > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.contactHistory?.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

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

              {/* Security & Data Locking Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                isManager 
                  ? 'bg-blue-50/70 border-blue-200 text-blue-900' 
                  : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}>
                {isManager ? (
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <span className="font-bold">
                    {isManager ? 'Service Manager Administration: ' : 'Data Integrity Lock: '}
                  </span>
                  <span>
                    {isManager
                      ? 'You have administrative permission to modify all entered customer, vehicle, and work order details, or delete records. Use "Edit RO Info" in the top right to edit.'
                      : 'All customer information, vehicle specs, and repair order details are locked to preserve data integrity. Only the Service Manager has permission to alter or delete entered information.'}
                  </span>
                </div>
              </div>

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
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Auto-Saving...
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Auto-Saved {managerLastSaved ? `at ${managerLastSaved}` : ''}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Manager Authority Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Customer Full Name
                        </label>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
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
                      <div className="col-span-2 sm:col-span-1">
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
                      {editConcerns.map((c, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border-2 border-slate-400 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">
                              {idx === 0 ? 'Line 1 (Primary Concern)' : `Line ${idx + 1}`}
                            </span>
                            {editConcerns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedConcerns = editConcerns.filter((_, i) => i !== idx);
                                  handleRemoveEditConcern(idx);
                                  triggerManagerAutoSave({ concerns: updatedConcerns });
                                }}
                                className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 hover:bg-red-50 px-1.5 py-0.5 rounded"
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
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Customer Promised Time
                        </label>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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
                          <span>Diagnostic Cause (Why it failed)</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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
                          <span>Correction (Repair Performed)</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Auto-saved
                        </span>
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

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Auto-Save active: All typed information is saved automatically to the repair order.</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Done Editing (Auto-Saved ✓)</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Customer Follow-Up & Cadence Card (Twice-Per-Week Cadence) */}
              {(() => {
                const cadence = getContactCadenceStatus(selectedRO);
                return (
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                    cadence.isOverdue 
                      ? 'bg-red-50/70 border-red-200' 
                      : cadence.isDueToday
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                          <span>Customer Communication Cadence:</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cadence.badgeClass}`}>
                          {cadence.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          (Twice per week standard)
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1">
                        <strong>Last Contact:</strong> {cadence.lastContactText} • <strong>Next Call Due:</strong> {cadence.nextDueText}
                      </div>
                    </div>

                    {!isSales && (
                      <button
                        type="button"
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Log Customer Touchpoint</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Customer Complaints / Concerns & Technician Three C's (Complaint, Cause, Correction) */}
              {(() => {
                const displayConcerns = selectedRO.concerns && selectedRO.concerns.length > 0
                  ? selectedRO.concerns
                  : [selectedRO.primaryConcern];
                const hasTechCause = Boolean(selectedRO.cause?.trim());
                const hasTechCorrection = Boolean(selectedRO.correction?.trim());
                const hasBoth = hasTechCause && hasTechCorrection;

                return (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                    {/* Header with quick action */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Customer Intake & Technician Three C's
                        </h4>
                        {hasBoth ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cause & Correction Documented
                          </span>
                        ) : (hasTechCause || hasTechCorrection) ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Partially Documented
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Cause & Correction Pending
                          </span>
                        )}
                      </div>

                      {!isSales && (
                        <button
                          type="button"
                          onClick={() => {
                            setTechCauseInput(selectedRO.cause || selectedRO.diagnosticNotes || '');
                            setTechCorrectionInput(selectedRO.correction || '');
                            setIsEditingTechFindings(!isEditingTechFindings);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border-2 shadow-2xs transition-colors cursor-pointer ${
                            isEditingTechFindings
                              ? 'bg-slate-100 text-slate-800 border-slate-600 hover:bg-slate-200'
                              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{isEditingTechFindings ? 'Close Cause & Correction' : (hasBoth ? 'Edit Cause & Correction' : 'Type In Cause & Correction')}</span>
                        </button>
                      )}
                    </div>

                    {techSaveSuccess && (
                      <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Cause and Correction saved to repair order and updated across all workstations.</span>
                      </div>
                    )}

                    {/* 1. COMPLAINT: Customer Complaints */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                          <span>1. Customer Complaints / Concerns (Complaint):</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {displayConcerns.length} {displayConcerns.length === 1 ? 'Line Item' : 'Line Items'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {displayConcerns.map((concern, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border-2 border-slate-300 shadow-2xs flex items-start gap-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 mt-0.5">
                              {idx === 0 ? 'Line 1 (Primary)' : `Line ${idx + 1}`}
                            </span>
                            <p className="text-xs text-slate-900 font-medium leading-relaxed flex-1">
                              {concern}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2 & 3: CAUSE & CORRECTION (Either Interactive Form or Documented Cards) */}
                    {isEditingTechFindings ? (
                      <form onSubmit={handleSaveTechFindings} className="bg-white p-4 rounded-xl border-2 border-slate-600 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 flex-wrap gap-2">
                          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-blue-600" />
                            <span>Technician Diagnostic Findings: Cause & Correction</span>
                          </h5>
                          <div className="flex items-center gap-2">
                            {techFindingsAutoSaveStatus === 'saving' ? (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Auto-Saving...
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> Auto-Saved {techFindingsLastSaved ? `at ${techFindingsLastSaved}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                              <span>2. Cause (Diagnostic Finding / Root Cause)</span>
                            </label>
                            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Auto-saved
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={techCauseInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTechCauseInput(val);
                              triggerTechFindingsAutoSave(val, techCorrectionInput);
                            }}
                            onBlur={flushTechFindingsAutoSave}
                            placeholder="Type diagnostic cause (e.g., Code P0300 set due to cylinder 3 spark plug fouled with oil from leaking valve cover gasket tube seal)..."
                            className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              <span>3. Correction (Repair Completed / Corrective Action)</span>
                            </label>
                            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Auto-saved
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={techCorrectionInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTechCorrectionInput(val);
                              triggerTechFindingsAutoSave(techCauseInput, val);
                            }}
                            onBlur={flushTechFindingsAutoSave}
                            placeholder="Type corrective repair (e.g., Replaced valve cover gasket and spark plug tube seals, installed new plugs, cleared codes, verified 5-mile road test)..."
                            className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t-2 border-slate-200 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Auto-Save active: Changes save automatically as you type.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                flushTechFindingsAutoSave();
                                setIsEditingTechFindings(false);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border-2 border-slate-400 transition-colors cursor-pointer"
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Done Editing (Auto-Saved ✓)</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-2.5">
                        {/* 2. CAUSE */}
                        <div className="bg-white p-3.5 rounded-lg border-2 border-slate-300 shadow-2xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                              <span>2. Cause (Diagnostic Finding / Root Cause)</span>
                            </span>
                            {hasTechCause ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                                Diagnosed
                              </span>
                            ) : !isSales && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTechCauseInput(selectedRO.cause || selectedRO.diagnosticNotes || '');
                                  setTechCorrectionInput(selectedRO.correction || '');
                                  setIsEditingTechFindings(true);
                                }}
                                className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Type In Cause</span>
                              </button>
                            )}
                          </div>
                          {hasTechCause ? (
                            <p className="text-xs text-slate-900 font-medium leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-300">
                              {selectedRO.cause}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No diagnostic root cause documented yet. Technician can type it directly by clicking "Type In Cause" above.
                            </p>
                          )}
                        </div>

                        {/* 3. CORRECTION */}
                        <div className="bg-white p-3.5 rounded-lg border-2 border-slate-300 shadow-2xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              <span>3. Correction (Repair Completed / Corrective Action)</span>
                            </span>
                            {hasTechCorrection ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                Repaired
                              </span>
                            ) : !isSales && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTechCauseInput(selectedRO.cause || selectedRO.diagnosticNotes || '');
                                  setTechCorrectionInput(selectedRO.correction || '');
                                  setIsEditingTechFindings(true);
                                }}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Type In Correction</span>
                              </button>
                            )}
                          </div>
                          {hasTechCorrection ? (
                            <p className="text-xs text-slate-900 font-medium leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-300">
                              {selectedRO.correction}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No corrective repair documented yet. Technician can type it directly by clicking "Type In Correction" above.
                            </p>
                          )}
                        </div>

                        {selectedRO.diagnosticNotes && selectedRO.diagnosticNotes !== selectedRO.cause && (
                          <div className="bg-white p-3 rounded-lg border-2 border-slate-300 text-xs">
                            <span className="font-bold text-slate-700 block mb-1">Additional Diagnostic Notes:</span>
                            <p className="text-slate-600 font-mono leading-relaxed">{selectedRO.diagnosticNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Technician Additional Recommended Services (Air filter, cabin filter, tires, scheduled maint) */}
              <TechRecommendationsSection ro={selectedRO} />

              {/* Repair Quote & Labor Estimate Card */}
              <div className="bg-white rounded-xl border-2 border-indigo-200 overflow-hidden shadow-2xs">
                <div className="p-4 bg-indigo-50/70 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Repair Quote & Labor Estimate</h4>
                        {selectedRO.quote ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            selectedRO.quote.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : selectedRO.quote.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : selectedRO.quote.status === 'DECLINED'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {selectedRO.quote.status}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Not Initiated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Technician-initiated labor & parts estimate linked to Mitchell 1 ProDemand
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href="https://www.prodemand.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Open Mitchell 1 ProDemand for OEM flat rate labor times"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ProDemand Labor ↗</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => openQuoteModal(selectedRO.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{selectedRO.quote ? 'Open & Edit Quote' : '+ Initiate Repair Quote'}</span>
                    </button>
                  </div>
                </div>

                {selectedRO.quote ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Labor Items</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {(selectedRO.quote.laborItems || []).length} lines ({((selectedRO.quote.laborItems || []).reduce((s, i) => s + (Number(i.laborHours) || 0), 0)).toFixed(1)} hrs)
                        </div>
                        <div className="text-xs font-semibold text-slate-600 mt-0.5">
                          ${(Number(selectedRO.quote.totalLaborCost ?? (selectedRO.quote as any).laborSubtotal) || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Parts Required</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {(selectedRO.quote.partsItems || []).length} parts
                        </div>
                        <div className="text-xs font-semibold text-slate-600 mt-0.5">
                          ${(Number(selectedRO.quote.totalPartsCost ?? (selectedRO.quote as any).partsSubtotal) || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Supplies & Tax</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          ${((Number(selectedRO.quote.shopSuppliesFee ?? (selectedRO.quote as any).shopSupplies) || 0) + (Number(selectedRO.quote.taxAmount ?? (selectedRO.quote as any).tax) || 0)).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Supplies ${((Number(selectedRO.quote.shopSuppliesFee ?? (selectedRO.quote as any).shopSupplies) || 0)).toFixed(2)} • Tax ${((Number(selectedRO.quote.taxAmount ?? (selectedRO.quote as any).tax) || 0)).toFixed(2)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200">
                        <div className="text-[10px] uppercase font-bold text-indigo-700">Grand Total</div>
                        <div className="text-lg font-black text-indigo-950 mt-0.5">
                          ${(Number(selectedRO.quote.grandTotal) || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] font-bold text-indigo-600">
                          Rate: ${(selectedRO.quote.defaultLaborRate ?? (selectedRO.quote as any).hourlyLaborRate ?? 150)}/hr
                        </div>
                      </div>
                    </div>

                    {selectedRO.quote.advisorNotes && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold">Advisor / Customer Notes: </span>
                        <span>{selectedRO.quote.advisorNotes}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <p>
                      No formal repair quote has been initiated for this repair order yet. Technicians can look up OEM labor times in ProDemand and build an itemized quote to present to the advisor and customer.
                    </p>
                    <button
                      type="button"
                      onClick={() => openQuoteModal(selectedRO.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shrink-0 cursor-pointer shadow-xs"
                    >
                      Initiate Quote Now
                    </button>
                  </div>
                )}
              </div>

              {/* Order Metadata Grid: Created, Assigned, Advisor, Tech, Promised */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Date Repair Order Made */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Date RO Was Made
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateTime(selectedRO.createdAt)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                    <span>Logged by {selectedRO.advisorName}</span>
                    {(() => {
                      const adv = users.find(u => u.id === selectedRO.advisorId || u.name === selectedRO.advisorName);
                      return adv?.employeeNumber ? (
                        <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {adv.employeeNumber}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* When Assigned and to Which Tech */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      When Assigned & Tech
                    </div>
                    {selectedRO.techId && selectedRO.techId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => openDirectChat(selectedRO.techId!)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Direct message ${selectedRO.techName}`}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Chat</span>
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{selectedRO.techName ? selectedRO.techName : 'Unassigned'}</span>
                    {selectedRO.techName && (() => {
                      const tch = users.find(u => u.id === selectedRO.techId || u.name === selectedRO.techName);
                      return tch?.employeeNumber ? (
                        <span className="font-mono text-sm font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {tch.employeeNumber}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedRO.dispatchedAt ? (
                      `Assigned: ${formatDateTime(selectedRO.dispatchedAt)} • ${selectedRO.bay || 'Bay Pending'}`
                    ) : (
                      <span className="text-amber-600 font-semibold">Not yet assigned</span>
                    )}
                  </div>
                </div>

                {/* Promised Completion Time */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Customer Promised Time
                    </div>
                    {selectedRO.advisorId && selectedRO.advisorId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => openDirectChat(selectedRO.advisorId)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Direct message ${selectedRO.advisorName}`}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Chat</span>
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateTime(selectedRO.promisedTime)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                    <span>Service Advisor: {selectedRO.advisorName}</span>
                    {(() => {
                      const adv = users.find(u => u.id === selectedRO.advisorId || u.name === selectedRO.advisorName);
                      return adv?.employeeNumber ? (
                        <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {adv.employeeNumber}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

              </div>

              {/* Diagnostic Phase Tracking Box: Waiting to be Diagnosed vs Being Diagnosed */}
              {selectedRO.status === 'WAITING_DIAGNOSIS' && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Vehicle is Waiting to be Diagnosed
                      </div>
                      <div className="text-xs text-amber-800 mt-0.5">
                        Staged in {selectedRO.bay || 'technician bay'} awaiting initial scan & teardown. Placed in queue at{' '}
                        <strong className="font-semibold">{formatTimeOnly(selectedRO.waitingDiagnosisAt)}</strong> ({formatDurationSince(selectedRO.waitingDiagnosisAt)} wait time).
                      </div>
                    </div>
                  </div>
                  {!isSales && (
                    <button
                      onClick={() => startDiagnosis(selectedRO.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Begin Diagnosis Now</span>
                    </button>
                  )}
                </div>
              )}

              {(selectedRO.status === 'BEING_DIAGNOSED' || selectedRO.status === 'IN_BAY') && (
                <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                      <Wrench className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Vehicle is Being Diagnosed
                      </div>
                      <div className="text-xs text-blue-800 mt-0.5">
                        Active testing & inspection underway by <strong className="font-semibold">{selectedRO.techName || 'assigned technician'}</strong> in {selectedRO.bay || 'bay'}.
                        Commenced at <strong className="font-semibold">{formatTimeOnly(selectedRO.diagnosisStartedAt)}</strong> ({formatDurationSince(selectedRO.diagnosisStartedAt)} active duration).
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/90 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider shrink-0">
                    Active Inspection
                  </span>
                </div>
              )}

              {/* Visual Ticket Flow Pipeline Stepper */}
              <TicketFlowStepper 
                ro={selectedRO} 
                onUpdateStatus={handleStatusChange} 
                canEdit={!isSales}
              />

              {/* Technician Assignment Section (For Manager & Advisors) */}
              {(currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Technician & Bay Assignment
                  </h4>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <select
                      id="dispatch-tech-select"
                      value={selectedTechId}
                      onChange={e => {
                        const techId = e.target.value;
                        setSelectedTechId(techId);
                        const tech = technicians.find(t => t.id === techId);
                        if (tech?.bayNumber) {
                          setSelectedBay(tech.bayNumber);
                        }
                      }}
                      className="text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-semibold"
                    >
                      <option value="">Select Technician...</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}{tech.employeeNumber ? ` ${tech.employeeNumber}` : ''} — {tech.title} ({tech.bayNumber || 'No Bay'})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Bay / Stall (e.g. Bay 3)"
                      value={selectedBay}
                      onChange={e => setSelectedBay(e.target.value)}
                      className="text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg sm:w-44 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                    />

                    <button
                      id="confirm-dispatch-btn"
                      onClick={handleDispatch}
                      disabled={!selectedTechId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer border-2 border-blue-700"
                    >
                      {selectedRO.techId ? 'Re-Assign Job' : 'Assign to Tech'}
                    </button>
                  </div>
                </div>
              )}

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
                  <h5 className="text-xs font-bold text-slate-900">Order Parts from Supplier</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. ML3Z-8C419-A"
                        value={partNumber}
                        onChange={e => setPartNumber(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Part Description</label>
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Supplier / Vendor</label>
                      <input
                        type="text"
                        placeholder="e.g. Ford Motorcraft, AutoZone, NAPA..."
                        value={partVendor}
                        onChange={e => setPartVendor(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Estimated Arrival Time Today (ETA)</label>
                      <input
                        type="time"
                        value={partEtaTime}
                        onChange={e => setPartEtaTime(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                      />
                    </div>
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
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                #{part.partNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {part.description} (Qty: {part.quantity})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Vendor: {part.vendor} {part.trackingNumber ? `• Tracking: ${part.trackingNumber}` : ''}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : part.status === 'IN_TRANSIT'
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                              {part.status.replace('_', ' ')}
                            </span>
                            {part.estimatedArrival && (
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
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">Quick Update Status:</span>
                          <div className="flex gap-1.5">
                            {(['ORDERED', 'IN_TRANSIT', 'RECEIVED', 'ISSUED_TO_TECH'] as PartStatus[]).map(st => (
                              <button
                                key={st}
                                onClick={() => updatePartStatus(selectedRO.id, part.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                  part.status === st
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st === 'ISSUED_TO_TECH' ? 'Issued to Tech' : st.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
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

              {/* Direct Phone Dial Quick Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{selectedRO.customerName}</span>
                  <span className="font-mono text-slate-600 font-semibold">{selectedRO.customerPhone}</span>
                </div>
                <a
                  href={`tel:${selectedRO.customerPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <PhoneForwarded className="w-3.5 h-3.5" />
                  <span>Call {selectedRO.customerPhone}</span>
                </a>
              </div>

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
