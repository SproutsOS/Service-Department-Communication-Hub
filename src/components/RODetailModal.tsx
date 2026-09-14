import React, { useState } from 'react';
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
  AlertCircle,
  Eye,
  PhoneCall,
  Voicemail,
  PhoneForwarded
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStatus, PartStatus, UserRole } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatRelativeTime, formatEtaBadge, formatDurationSince, getDiagnosticStatusDetails } from '../utils/formatters';
import { TicketFlowStepper } from './TicketFlowStepper';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { getContactCadenceStatus, formatContactType, formatContactOutcome } from '../utils/cadenceUtils';

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
    deleteRepairOrder
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
  const [editPromisedTime, setEditPromisedTime] = useState(selectedRO?.promisedTime || '');
  const [editDiagnosticNotes, setEditDiagnosticNotes] = useState(selectedRO?.diagnosticNotes || '');

  React.useEffect(() => {
    if (selectedRO) {
      setEditCustomerName(selectedRO.customerName);
      setEditCustomerPhone(selectedRO.customerPhone);
      setEditVehicleYear(selectedRO.vehicle.year);
      setEditVehicleMake(selectedRO.vehicle.make);
      setEditVehicleModel(selectedRO.vehicle.model);
      setEditVehicleVin(selectedRO.vehicle.vin);
      setEditPrimaryConcern(selectedRO.primaryConcern);
      setEditPromisedTime(selectedRO.promisedTime);
      setEditDiagnosticNotes(selectedRO.diagnosticNotes || '');
      setIsEditingDetails(false);
    }
  }, [selectedRO?.id]);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'PARTS' | 'HISTORY' | 'CONTACTS'>('DETAILS');
  const [chatInput, setChatInput] = useState('');
  const [isUrgentMessage, setIsUrgentMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUrgentStatusUpdate, setIsUrgentStatusUpdate] = useState(false);

  // New Part Form state
  const [showAddPart, setShowAddPart] = useState(false);
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partVendor, setPartVendor] = useState('Ford Direct Warehouse');
  const [partEtaTime, setPartEtaTime] = useState('14:30');
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
    const [hours, minutes] = partEtaTime.split(':');
    const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '14'), parseInt(minutes || '00'));

    addPartOrder(selectedRO.id, {
      partNumber: partNumber.trim(),
      description: partDescription.trim(),
      quantity: partQuantity,
      status: 'ORDERED',
      vendor: partVendor,
      estimatedArrival: etaDate.toISOString(),
      trackingNumber: partTracking.trim() || undefined,
    });

    setPartNumber('');
    setPartDescription('');
    setShowAddPart(false);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager || !selectedRO) return;

    const ok = updateRepairOrderDetails(selectedRO.id, {
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      vehicle: {
        ...selectedRO.vehicle,
        year: Number(editVehicleYear) || selectedRO.vehicle.year,
        make: editVehicleMake.trim(),
        model: editVehicleModel.trim(),
        vin: editVehicleVin.trim().toUpperCase()
      },
      primaryConcern: editPrimaryConcern.trim(),
      promisedTime: editPromisedTime,
      diagnosticNotes: editDiagnosticNotes.trim()
    });

    if (ok) {
      setIsEditingDetails(false);
      setManagerActionFeedback('Repair order details updated and logged to audit trail.');
      setTimeout(() => setManagerActionFeedback(null), 3500);
    }
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
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgent Attention Required
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

          <div className="flex items-center gap-2 shrink-0">
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
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-white gap-2">
          <button
            id="ro-tab-details"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer ${
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
            id="ro-tab-parts"
            onClick={() => setActiveTab('PARTS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer ${
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
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Service Manager: Edit Repair Order Information
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Manager Authority Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Customer Full Name
                      </label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Customer Phone Number
                      </label>
                      <input
                        type="text"
                        value={editCustomerPhone}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={editVehicleYear}
                        onChange={(e) => setEditVehicleYear(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Make
                      </label>
                      <input
                        type="text"
                        value={editVehicleMake}
                        onChange={(e) => setEditVehicleMake(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={editVehicleModel}
                        onChange={(e) => setEditVehicleModel(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        VIN
                      </label>
                      <input
                        type="text"
                        value={editVehicleVin}
                        onChange={(e) => setEditVehicleVin(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Primary Concern
                    </label>
                    <textarea
                      rows={2}
                      value={editPrimaryConcern}
                      onChange={(e) => setEditPrimaryConcern(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Customer Promised Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editPromisedTime ? new Date(editPromisedTime).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const dt = e.target.value ? new Date(e.target.value).toISOString() : selectedRO.promisedTime;
                          setEditPromisedTime(dt);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Technician Diagnostic Findings
                      </label>
                      <input
                        type="text"
                        value={editDiagnosticNotes}
                        onChange={(e) => setEditDiagnosticNotes(e.target.value)}
                        placeholder="Diagnostic notes, inspection findings..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Changes to Order
                    </button>
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

              {/* Primary Concern & Tech Notes */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Customer Primary Concern
                </h4>
                <p className="text-sm text-slate-900 font-medium leading-relaxed">
                  {selectedRO.primaryConcern}
                </p>
                {selectedRO.diagnosticNotes && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <h5 className="text-xs font-bold text-slate-700 mb-1">
                      Technician Diagnostic Findings:
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed font-mono bg-white p-2.5 rounded border border-slate-200">
                      {selectedRO.diagnosticNotes}
                    </p>
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
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Logged by {selectedRO.advisorName}
                  </div>
                </div>

                {/* When Assigned and to Which Tech */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5 text-indigo-500" />
                    When Assigned & Tech
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {selectedRO.techName ? selectedRO.techName : 'Unassigned'}
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
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Customer Promised Time
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateTime(selectedRO.promisedTime)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Service Advisor: {selectedRO.advisorName}
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
                      className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-700 font-semibold"
                    >
                      <option value="">Select Technician...</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} — {tech.title} ({tech.bayNumber || 'No Bay'})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Bay / Stall (e.g. Bay 3)"
                      value={selectedBay}
                      onChange={e => setSelectedBay(e.target.value)}
                      className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg sm:w-44 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                    />

                    <button
                      id="confirm-dispatch-btn"
                      onClick={handleDispatch}
                      disabled={!selectedTechId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
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
                              ? 'bg-red-50 text-red-950 border border-red-200 font-medium'
                              : isSelf
                              ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200'
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inter-department messaging is read-only for the Sales position.</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100">
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
                      className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-100 shadow-sm"
                >
                  <h5 className="text-xs font-bold text-slate-900">Order Parts from Supplier</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. ML3Z-8C419-A"
                        value={partNumber}
                        onChange={e => setPartNumber(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Part Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Auxiliary Coolant Pump"
                        value={partDescription}
                        onChange={e => setPartDescription(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Supplier / Vendor</label>
                      <input
                        type="text"
                        value={partVendor}
                        onChange={e => setPartVendor(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Estimated Arrival Time Today (ETA)</label>
                      <input
                        type="time"
                        value={partEtaTime}
                        onChange={e => setPartEtaTime(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPart(false)}
                      className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer"
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
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Updated by: <strong className="font-semibold text-slate-700">{item.updatedByName}</strong> ({item.userRole.replace('_', ' ')})
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
                            <span>Logged by: <strong className="text-slate-700">{record.advisorName}</strong></span>
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

      </div>
    </div>
  );
};
