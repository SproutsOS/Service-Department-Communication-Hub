import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Package, 
  Clock, 
  DollarSign, 
  Hash, 
  Building2, 
  Truck, 
  FileText, 
  Trash2, 
  Check, 
  AlertTriangle,
  Car,
  User,
  Layers,
  Save,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PartItem, PartStatus, RepairOrder } from '../types';
import { ArrivalTimeFrameDropdown } from './ArrivalTimeFrameDropdown';
import { formatCurrency } from '../utils/formatters';

interface EditPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  part?: PartItem | null;
  roId?: string;
  initialLineNumber?: number;
  onSuccess?: (message: string) => void;
}

const DEFAULT_VENDORS = [
  'STELLANTIS',
  'MOPAR',
  'NAPA AUTO PARTS',
  'AUTOZONE',
  'O\'REILLY AUTO PARTS',
  'ADVANCE AUTO PARTS',
  'WORLDPAC',
  'DEALER DIRECT',
  'AC DELCO',
  'LOCAL WAREHOUSE'
];

export const EditPartModal: React.FC<EditPartModalProps> = ({
  isOpen,
  onClose,
  part,
  roId: initialRoId,
  initialLineNumber,
  onSuccess
}) => {
  const { 
    repairOrders, 
    updatePartItem, 
    deletePartItem, 
    addPartOrder 
  } = useApp();

  const isEditing = Boolean(part && part.id);

  // Selected RO
  const [selectedRoId, setSelectedRoId] = useState<string>(initialRoId || part?.roId || '');
  
  // Fields
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cost, setCost] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [vendor, setVendor] = useState<string>('STELLANTIS');
  const [customVendor, setCustomVendor] = useState<string>('');
  const [isCustomVendor, setIsCustomVendor] = useState<boolean>(false);
  const [status, setStatus] = useState<PartStatus>('ORDERED');
  const [estimatedArrival, setEstimatedArrival] = useState<string>('');
  const [timeFrameId, setTimeFrameId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [roLineNumber, setRoLineNumber] = useState<number>(initialLineNumber || 1);
  const [notes, setNotes] = useState<string>('');
  const [requestType, setRequestType] = useState<'ORDER_NOW' | 'QUOTE_ONLY'>('ORDER_NOW');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available vendor list from storage or defaults
  const [savedVendors, setSavedVendors] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('parts_saved_sources');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_VENDORS;
  });

  // Find target RO
  const targetRO = useMemo(() => {
    return repairOrders.find(r => r.id === selectedRoId);
  }, [repairOrders, selectedRoId]);

  // Sync state whenever modal opens or part changes
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setErrorMsg(null);
      return;
    }

    const roIdToUse = initialRoId || part?.roId || (repairOrders[0]?.id || '');
    setSelectedRoId(roIdToUse);

    if (part) {
      setPartNumber(part.partNumber || '');
      setDescription(part.description || part.name || '');
      setQuantity(part.quantity || 1);
      setCost(part.cost !== undefined && part.cost !== null ? String(part.cost) : '');
      setPrice(part.price !== undefined && part.price !== null ? String(part.price) : '');
      
      const partVendor = part.vendor || 'STELLANTIS';
      if (savedVendors.includes(partVendor.toUpperCase())) {
        setVendor(partVendor.toUpperCase());
        setIsCustomVendor(false);
        setCustomVendor('');
      } else {
        setVendor('OTHER');
        setIsCustomVendor(true);
        setCustomVendor(partVendor);
      }

      setStatus(part.status || 'ORDERED');
      setEstimatedArrival(part.estimatedArrival || '');
      setTimeFrameId(part.timeFrameId || '');
      setTrackingNumber(part.trackingNumber || '');
      setRoLineNumber(part.roLineNumber || initialLineNumber || 1);
      setNotes(part.notes || '');
      setRequestType(part.requestType || (part.status === 'QUOTE_ONLY' ? 'QUOTE_ONLY' : 'ORDER_NOW'));
    } else {
      // Reset form for adding new part
      setPartNumber('');
      setDescription('');
      setQuantity(1);
      setCost('');
      setPrice('');
      setVendor(savedVendors[0] || 'STELLANTIS');
      setIsCustomVendor(false);
      setCustomVendor('');
      setStatus('ORDERED');
      setEstimatedArrival('');
      setTimeFrameId('TODAY_5PM');
      setTrackingNumber('');
      setRoLineNumber(initialLineNumber || 1);
      setNotes('');
      setRequestType('ORDER_NOW');
    }
    setIsDeleting(false);
    setErrorMsg(null);
  }, [isOpen, part, initialRoId, initialLineNumber, repairOrders, savedVendors]);

  if (!isOpen) return null;

  // Margin Calculation
  const numCost = parseFloat(cost) || 0;
  const numPrice = parseFloat(price) || 0;
  const grossProfit = numPrice > 0 ? numPrice - numCost : 0;
  const profitMargin = numPrice > 0 ? ((grossProfit / numPrice) * 100).toFixed(1) : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedRoId) {
      setErrorMsg('Please select a Repair Order.');
      return;
    }

    if (!description.trim() && !partNumber.trim()) {
      setErrorMsg('Please provide a Part Number or Part Description.');
      return;
    }

    const effectiveVendor = isCustomVendor 
      ? (customVendor.trim() || 'Shop Supplier')
      : (vendor || 'Shop Supplier');

    // Save custom vendor to storage if new
    if (isCustomVendor && customVendor.trim()) {
      const cleanV = customVendor.trim().toUpperCase();
      if (!savedVendors.includes(cleanV)) {
        const next = [...savedVendors, cleanV];
        setSavedVendors(next);
        try {
          localStorage.setItem('parts_saved_sources', JSON.stringify(next));
        } catch {
          // ignore
        }
      }
    }

    const parsedPrice = price.trim() !== '' && !isNaN(parseFloat(price)) ? parseFloat(parseFloat(price).toFixed(2)) : undefined;
    const parsedCost = cost.trim() !== '' && !isNaN(parseFloat(cost)) ? parseFloat(parseFloat(cost).toFixed(2)) : undefined;

    if (isEditing && part) {
      updatePartItem(selectedRoId, part.id, {
        partNumber: partNumber.trim().toUpperCase(),
        description: description.trim(),
        name: description.trim(),
        quantity: Math.max(1, quantity),
        cost: parsedCost,
        price: parsedPrice,
        vendor: effectiveVendor,
        status,
        estimatedArrival: estimatedArrival || 'Pending ETA',
        timeFrameId: timeFrameId || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        roLineNumber,
        notes: notes.trim() || undefined,
        requestType
      });

      onSuccess?.(`✓ Successfully updated part #${partNumber.trim() || description.trim()} on RO #${selectedRoId}`);
    } else {
      // Add new part
      addPartOrder(selectedRoId, {
        partNumber: partNumber.trim().toUpperCase(),
        description: description.trim() || `Part ${partNumber.trim().toUpperCase()}`,
        name: description.trim(),
        quantity: Math.max(1, quantity),
        cost: parsedCost,
        price: parsedPrice,
        vendor: effectiveVendor,
        status,
        estimatedArrival: estimatedArrival || 'Pending ETA',
        timeFrameId: timeFrameId || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        roLineNumber,
        notes: notes.trim() || undefined,
        requestType
      });

      onSuccess?.(`✓ Successfully added part #${partNumber.trim() || description.trim()} to RO #${selectedRoId}`);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!part || !selectedRoId) return;
    deletePartItem(selectedRoId, part.id);
    onSuccess?.(`✓ Part #${part.partNumber || part.description} removed from RO #${selectedRoId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Part Details' : 'Add New Part to Order'}</span>
                {selectedRoId && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40">
                    RO #{selectedRoId}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEditing ? 'Modify part numbering, supplier, arrival time, pricing and line attachment.' : 'Attach and order new parts directly on this repair order.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Target RO & Job Line Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* RO Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Repair Order
              </label>
              {isEditing || initialRoId ? (
                <div className="p-2 bg-white rounded-lg border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="font-mono text-blue-700">#{selectedRoId}</span>
                  {targetRO && (
                    <span className="text-slate-500 font-normal truncate max-w-[160px]">
                      {targetRO.customerName}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={selectedRoId}
                  onChange={(e) => setSelectedRoId(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Repair Order --</option>
                  {repairOrders.map(ro => (
                    <option key={ro.id} value={ro.id}>
                      #{ro.id} - {ro.customerName} ({ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Line / Job Assignment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Attach to Job / Concern Line
              </label>
              <select
                value={roLineNumber}
                onChange={(e) => setRoLineNumber(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {targetRO && targetRO.concerns && targetRO.concerns.length > 0 ? (
                  targetRO.concerns.map((concern, idx) => (
                    <option key={idx} value={idx + 1}>
                      Line {idx + 1}: {concern.length > 35 ? concern.substring(0, 35) + '...' : concern}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Line 1: Primary Service & Diagnosis</option>
                    <option value={2}>Line 2: Additional Concern</option>
                    <option value={3}>Line 3: Additional Concern</option>
                    <option value={4}>Line 4: Additional Concern</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Part Identity: Number, Description & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-500" />
                <span>Part Number</span>
              </label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 68259468AA"
                className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-500" />
                <span>Part Description / Name *</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Front Ceramic Brake Pad Set"
                className="w-full text-xs font-semibold p-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Sourcing & Pricing Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantity
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-l-lg hover:bg-slate-100 text-slate-700 font-black cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center text-xs font-black p-2 bg-white border-y border-slate-300 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-r-lg hover:bg-slate-100 text-slate-700 font-black cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Wholesale Dealer Cost */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <span>Unit Cost ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Retail Customer Price */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>Unit Sell Price ($)</span>
                </span>
                {profitMargin !== null && (
                  <span className={`text-[10px] font-bold ${Number(profitMargin) >= 40 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {profitMargin}% GP
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs font-mono font-bold p-2 bg-white border border-emerald-300 rounded-lg text-emerald-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Supplier / Vendor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>Part Source / Supplier</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={isCustomVendor ? 'OTHER' : vendor}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    setIsCustomVendor(true);
                  } else {
                    setIsCustomVendor(false);
                    setVendor(e.target.value);
                  }
                }}
                className="text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {savedVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="OTHER">+ Add / Type Custom Supplier...</option>
              </select>

              {isCustomVendor && (
                <input
                  type="text"
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value.toUpperCase())}
                  placeholder="Enter Supplier Name..."
                  className="text-xs font-bold p-2.5 bg-white border border-blue-400 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 animate-in fade-in duration-100"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Logistics: ETA & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
            {/* Estimated Arrival (ETA) with Interactive Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Estimated Arrival (ETA)</span>
              </label>
              <ArrivalTimeFrameDropdown
                value={timeFrameId || estimatedArrival || status}
                onChange={({ timeFrameId: newTfId, estimatedArrival: newEta, status: newStatus }) => {
                  setTimeFrameId(newTfId);
                  setEstimatedArrival(newEta);
                  if (newStatus) setStatus(newStatus);
                }}
                size="md"
              />
              <input
                type="text"
                value={estimatedArrival}
                onChange={(e) => {
                  setEstimatedArrival(e.target.value);
                  setTimeFrameId('');
                }}
                placeholder="Or type custom ETA text / timestamp..."
                className="mt-1.5 w-full text-[11px] font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700"
              />
            </div>

            {/* Part Status */}
            <div>
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" />
                <span>Part Order Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PartStatus)}
                className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ORDERED">Ordered (Standard)</option>
                <option value="DAILY_ORDER">Daily Stock Order (Mopar/Stellantis)</option>
                <option value="LOCAL_PURCHASE">Local Hot Shot (Same Day)</option>
                <option value="SPECIAL_ORDER_1_5_DAYS">Special Order (1-5 Days)</option>
                <option value="SPECIAL_ORDER">Special Order (Factory)</option>
                <option value="VOR_UPGRADE">VOR Emergency / Red Order</option>
                <option value="IN_TRANSIT">In Transit / Courier Dispatched</option>
                <option value="BACKORDERED">Backordered (Supplier Delay)</option>
                <option value="RECEIVED">Received in Parts Room</option>
                <option value="ISSUED_TO_TECH">Delivered to Tech / In Bay</option>
                <option value="IN_STOCK">In Stock (Inventory)</option>
                <option value="QUOTE_ONLY">Quote Only (Pending Customer Approval)</option>
                <option value="CANCELLED">Cancelled / Not Needed</option>
              </select>
            </div>
          </div>

          {/* Tracking Number & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Courier / Waybill Tracking #
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1Z9999999999999999"
                className="w-full text-xs font-mono font-medium p-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Internal Logistics Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Driver arriving on 1:30 PM route"
                className="w-full text-xs font-medium p-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              {isEditing && (
                isDeleting ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-100">
                    <span className="text-xs font-bold text-red-600">Permanently delete part?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleting(false)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeleting(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Delete Part</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'Save Part Changes' : 'Add Part to Order'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
