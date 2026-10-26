import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  Receipt, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Save, 
  Check, 
  X,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag
} from 'lucide-react';
import { RepairOrder, PartItem, PartStatus, LineApprovalStatus } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime, isTechAddedConcernLine } from '../utils/formatters';

interface ROQuotePartsTrackerProps {
  ro: RepairOrder;
  onOpenQuoteModal: (roId: string) => void;
  onOpenPrintModal: (roId: string) => void;
  onOpenEditPart: (part: PartItem, lineNum?: number) => void;
  onAddNewPart: (lineNum: number) => void;
}

const PART_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  REQUESTED: { label: 'Needs Order', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', icon: Clock },
  QUOTE_ONLY: { label: 'Quote Only', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', icon: Receipt },
  ORDERED: { label: 'Ordered', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  DAILY_ORDER: { label: 'Daily Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  SPECIAL_ORDER_1_5_DAYS: { label: 'Special Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  SPECIAL_ORDER: { label: 'Special Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  VOR_UPGRADE: { label: 'VOR Critical', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300', icon: AlertTriangle },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', icon: Truck },
  RECEIVED: { label: 'Received / Staged', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle2 },
  IN_STOCK: { label: 'In Stock', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', icon: CheckCircle2 },
  ISSUED_TO_TECH: { label: 'With Tech', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle2 },
  BACKORDERED: { label: 'Backordered', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', icon: AlertCircle },
  DECLINED: { label: 'Declined', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: AlertTriangle },
};

export const ROQuotePartsTracker: React.FC<ROQuotePartsTrackerProps> = ({
  ro,
  onOpenQuoteModal,
  onOpenPrintModal,
  onOpenEditPart,
  onAddNewPart,
}) => {
  const { 
    updatePartStatus, 
    updatePartItem, 
    deletePartItem, 
    markAllPartsOrderedOnRO, 
    toggleCustomerTaxExempt,
    deleteRepairOrderConcern,
    addMultiplePartOrders,
    currentUser,
    activeRoleView
  } = useApp();

  // Inline quick editing for a specific existing part (Part #, Description, Qty, Price, ETA, tracking, vendor, notes)
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [inlinePartNumber, setInlinePartNumber] = useState<string>('');
  const [inlineDescription, setInlineDescription] = useState<string>('');
  const [inlineQty, setInlineQty] = useState<number>(1);
  const [inlinePrice, setInlinePrice] = useState<string>('0.00');
  const [inlineEta, setInlineEta] = useState<string>('');
  const [inlineTracking, setInlineTracking] = useState<string>('');
  const [inlineNotes, setInlineNotes] = useState<string>('');
  const [inlineVendor, setInlineVendor] = useState<string>('');
  const [focusField, setFocusField] = useState<'partNumber' | 'price' | 'vendor' | null>(null);

  // Inline adding new part directly to a line
  const [inlineAddingLineNum, setInlineAddingLineNum] = useState<number | null>(null);
  const [newLinePartNumber, setNewLinePartNumber] = useState<string>('');
  const [newLineDescription, setNewLineDescription] = useState<string>('');
  const [newLineQty, setNewLineQty] = useState<number>(1);
  const [newLinePrice, setNewLinePrice] = useState<string>('0.00');
  const [newLineVendor, setNewLineVendor] = useState<string>('Shop Inventory / Supplier');
  const [newLineEta, setNewLineEta] = useState<string>('Pending Parts Counter');

  const handleStartInlineEdit = (part: PartItem, fieldToFocus: 'partNumber' | 'price' | 'vendor' = 'partNumber') => {
    setEditingPartId(part.id);
    setInlinePartNumber(part.partNumber && part.partNumber !== 'TBD' ? part.partNumber : '');
    setInlineDescription(part.description || part.name || '');
    setInlineQty(part.quantity || 1);
    const pPrice = Number(part.price) || 0;
    setInlinePrice(pPrice > 0 ? pPrice.toFixed(2) : '0.00');
    setInlineEta(part.estimatedArrival || '');
    setInlineTracking(part.trackingNumber || '');
    setInlineNotes(part.notes || '');
    setInlineVendor(part.vendor || 'Shop Inventory / Supplier');
    setFocusField(fieldToFocus);
    setInlineAddingLineNum(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingPartId(null);
    setFocusField(null);
  };

  const handleSaveInlineEdit = (partId: string) => {
    const rawPriceClean = inlinePrice ? String(inlinePrice).replace(/[^0-9.]/g, '') : '';
    const parsedPrice = rawPriceClean !== '' && !isNaN(Number(rawPriceClean)) 
      ? Number(Number(rawPriceClean).toFixed(2)) 
      : 0;
    const finalPartNumber = inlinePartNumber.trim().toUpperCase() || 'TBD';
    const finalDescription = inlineDescription.trim() || 'Part Item';

    updatePartItem(ro.id, partId, {
      partNumber: finalPartNumber,
      description: finalDescription,
      quantity: Math.max(1, Number(inlineQty) || 1),
      price: parsedPrice,
      estimatedArrival: inlineEta.trim() || undefined,
      trackingNumber: inlineTracking.trim() || undefined,
      notes: inlineNotes.trim() || undefined,
      vendor: inlineVendor.trim() || undefined,
    });
    setEditingPartId(null);
    setFocusField(null);
  };

  const handleStartInlineAdd = (lineNum: number) => {
    setInlineAddingLineNum(lineNum);
    setNewLinePartNumber('');
    setNewLineDescription('');
    setNewLineQty(1);
    setNewLinePrice('0.00');
    setNewLineVendor('Shop Inventory / Supplier');
    setNewLineEta('Pending Parts Counter');
    setEditingPartId(null);
  };

  const handleCancelInlineAdd = () => {
    setInlineAddingLineNum(null);
  };

  const handleSaveInlineAdd = (lineNum: number) => {
    const rawPriceClean = newLinePrice ? String(newLinePrice).replace(/[^0-9.]/g, '') : '';
    const parsedPrice = rawPriceClean !== '' && !isNaN(Number(rawPriceClean)) 
      ? Number(Number(rawPriceClean).toFixed(2)) 
      : 0;

    addMultiplePartOrders(ro.id, [{
      partNumber: newLinePartNumber.trim().toUpperCase() || 'TBD',
      description: newLineDescription.trim() || 'Part Item',
      quantity: Math.max(1, Number(newLineQty) || 1),
      price: parsedPrice,
      vendor: newLineVendor.trim() || 'Shop Inventory / Supplier',
      estimatedArrival: newLineEta.trim() || 'Pending Parts Counter',
      status: 'REQUESTED',
      requestType: 'QUOTE_ONLY',
      roLineNumber: lineNum,
      notes: `For Line ${lineNum}`
    }]);

    setInlineAddingLineNum(null);
  };

  const handleQuickStatusChange = (partId: string, newStatus: PartStatus) => {
    const targetPart = (ro.parts || []).find(p => p.id === partId);
    let defaultEta = targetPart?.estimatedArrival;
    if (newStatus === 'RECEIVED' || newStatus === 'IN_STOCK') {
      defaultEta = 'Arrived / Staged';
    } else if (newStatus === 'ORDERED' && (!defaultEta || defaultEta.toLowerCase().includes('pending'))) {
      defaultEta = 'Expected in 1-3 Days';
    } else if (newStatus === 'IN_TRANSIT' && (!defaultEta || defaultEta.toLowerCase().includes('pending'))) {
      defaultEta = 'In Transit';
    } else if (newStatus === 'BACKORDERED') {
      defaultEta = 'Supplier Backorder';
    }
    updatePartStatus(ro.id, partId, newStatus, defaultEta);
  };

  const handleMarkReceived = (partId: string) => {
    updatePartStatus(ro.id, partId, 'RECEIVED', 'Arrived & Staged in Bay');
  };

  const handleMarkAllReceived = () => {
    const partsToReceive = (ro.parts || []).filter(
      p => p.status !== 'RECEIVED' && p.status !== 'ISSUED_TO_TECH' && p.status !== 'DECLINED' && p.status !== 'CANCELLED'
    );
    partsToReceive.forEach(p => {
      updatePartStatus(ro.id, p.id, 'RECEIVED', 'Arrived & Staged in Bay');
    });
  };

  // Group concerns / job lines
  const concerns = (ro.concerns && ro.concerns.length > 0) 
    ? ro.concerns 
    : [ro.primaryConcern || 'Customer Quoted Service'];

  // Financial calculations from quote or RO lines
  const quote = ro.quote;
  const totalLaborHours = quote?.totalLaborHours || (quote?.laborItems?.reduce((sum, l) => sum + (l.laborHours || 0), 0) || 0);
  const totalLaborCost = quote?.totalLaborCost || (quote?.laborItems?.reduce((sum, l) => sum + (l.subtotal || 0), 0) || 0);
  
  // Total parts cost from RO parts or quote parts
  const allParts = ro.parts || [];
  const totalPartsCost = allParts
    .filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + ((p.quantity || 1) * (Number(p.price) || 0)), 0);

  // Shop Supplies (capped at $35.00)
  const applySupplies = quote?.applyShopSupplies ?? true;
  const shopSuppliesFee = applySupplies 
    ? (quote?.shopSuppliesFee !== undefined ? quote.shopSuppliesFee : Math.min(35.00, Number((totalLaborCost * 0.08).toFixed(2))))
    : 0;

  // Tax & Exemption
  const isTaxExempt = Boolean(ro.isTaxExempt || quote?.isTaxExempt);
  const taxRate = isTaxExempt ? 0 : (quote?.taxRate ?? 0.07);
  const taxableAmount = totalLaborCost + totalPartsCost;
  const taxAmount = isTaxExempt ? 0 : Number((taxableAmount * taxRate).toFixed(2));
  const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

  // Parts progress metrics
  const activeParts = allParts.filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED');
  const receivedCount = activeParts.filter(p => p.status === 'RECEIVED' || p.status === 'ISSUED_TO_TECH' || p.status === 'IN_STOCK').length;
  const orderedCount = activeParts.filter(p => ['ORDERED', 'DAILY_ORDER', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE'].includes(p.status)).length;
  const inTransitCount = activeParts.filter(p => p.status === 'IN_TRANSIT').length;
  const needsOrderCount = activeParts.filter(p => p.status === 'REQUESTED' || p.status === 'QUOTE_ONLY').length;
  const backorderedCount = activeParts.filter(p => p.status === 'BACKORDERED').length;

  const allPartsReady = activeParts.length > 0 && receivedCount === activeParts.length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Progress Tracker */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                Quote & Working Order #{ro.id}
              </span>
              {isTaxExempt ? (
                <span className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
                  <span>TAX EXEMPT (0% Tax)</span>
                  {ro.taxExemptNumber && <span className="font-mono text-[11px]">#{ro.taxExemptNumber}</span>}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium text-xs border border-slate-700">
                  Standard 7% Tax
                </span>
              )}
              {allPartsReady ? (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All Parts Staged & Ready!</span>
                </span>
              ) : activeParts.length > 0 ? (
                <span className="px-2.5 py-1 rounded-md bg-blue-900/80 text-blue-200 border border-blue-500/50 text-xs font-bold flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{receivedCount} of {activeParts.length} Parts Received</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs">
                  No parts ordered yet
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-xl font-black text-white">
                {ro.customerName}
              </h2>
              <span className="text-xs text-slate-300 font-mono">
                {ro.customerPhone}
              </span>
              <span className="text-xs text-slate-400">
                • {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
              </span>
              {ro.vehicle.vin && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  VIN: {ro.vehicle.vin}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenPrintModal(ro.id)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print official customer estimate & quote sheet"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Quote</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuoteModal(ro.id)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open full interactive Quote Builder for labor and parts"
            >
              <Receipt className="w-4 h-4 text-white" />
              <span>Edit Quote Pricing</span>
            </button>

            {needsOrderCount > 0 && (
              <button
                type="button"
                onClick={() => markAllPartsOrderedOnRO(ro.id)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Mark all pending parts as ordered"
              >
                <Truck className="w-4 h-4 text-slate-950" />
                <span>Mark All Ordered</span>
              </button>
            )}

            {orderedCount + inTransitCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllReceived}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Mark all transit/ordered parts as received"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Mark All Received</span>
              </button>
            )}
          </div>
        </div>

        {/* Parts Pipeline Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-800/80 mt-4 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-bold">1. Needs Order</span>
            <span className="text-lg font-black font-mono text-white">{needsOrderCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-blue-400 uppercase tracking-wider block font-bold">2. Ordered (Pending)</span>
            <span className="text-lg font-black font-mono text-white">{orderedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-purple-400 uppercase tracking-wider block font-bold">3. In Transit (ETA)</span>
            <span className="text-lg font-black font-mono text-white">{inTransitCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">4. Received & Staged</span>
            <span className="text-lg font-black font-mono text-white">{receivedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-rose-400 uppercase tracking-wider block font-bold">5. Backordered</span>
            <span className="text-lg font-black font-mono text-white">{backorderedCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Quoted Financial Metrics Strip */}
      <div className="bg-white rounded-xl border-2 border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Labor ({totalLaborHours} hrs)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(totalLaborCost)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Parts ({activeParts.length} items)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(totalPartsCost)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Shop Supplies ($35 cap)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(shopSuppliesFee)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <span>Sales Tax</span>
              {isTaxExempt ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800 border border-amber-300">
                  EXEMPT
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">7%</span>
              )}
            </span>
            <span className={`text-base font-black font-mono ${isTaxExempt ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatCurrency(taxAmount)}
            </span>
          </div>

          <div className="border-l-2 border-slate-800 pl-4 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
            <span className="text-[10px] text-purple-700 uppercase tracking-wider block font-black">
              Total Estimate
            </span>
            <span className="text-xl font-black font-mono text-purple-900">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleCustomerTaxExempt(ro.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isTaxExempt 
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle customer sales tax exemption (0% tax)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTaxExempt ? 'Tax Exempt: Active' : 'Mark Tax Exempt'}</span>
          </button>
        </div>
      </div>

      {/* 3. Job Lines & Daily Parts Tracking Tables */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Quoted Service Operations & Daily Parts Pipeline ({concerns.length} Lines)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleStartInlineAdd(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Part to Job</span>
          </button>
        </div>

        {concerns.map((concernText, cIdx) => {
          const lineNum = cIdx + 1;
          const lineLaborItem = quote?.laborItems?.find(l => (l.roLineNumber || 1) === lineNum);
          const lineLaborHours = lineLaborItem?.laborHours || (cIdx === 0 && quote?.totalLaborHours ? quote.totalLaborHours : 1.0);
          const lineLaborRate = lineLaborItem?.hourlyRate || (quote?.defaultLaborRate || 165.00);
          const lineLaborSubtotal = lineLaborItem?.subtotal || Number((lineLaborHours * lineLaborRate).toFixed(2));

          // Filter parts for this specific line
          const lineParts = allParts.filter(p => {
            const pLine = p.roLineNumber || (p.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(p.notes.match(/For Line (\d+)/i)![1], 10) : 1);
            return pLine === lineNum;
          });

          const linePartsSubtotal = lineParts
            .filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED')
            .reduce((sum, p) => sum + ((p.quantity || 1) * (Number(p.price) || 0)), 0);

          const lineTotal = lineLaborSubtotal + linePartsSubtotal;

          return (
            <div key={lineNum} className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
              {/* Line Header */}
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black inline-flex items-center justify-center shrink-0">
                      {lineNum}
                    </span>
                    <h4 className="text-sm font-black text-slate-900">
                      {concernText}
                    </h4>
                  </div>
                  <div className="text-xs text-slate-600 pl-8 flex items-center gap-3">
                    <span>Labor: <strong>{lineLaborHours}h</strong> @ ${lineLaborRate.toFixed(2)}/hr ({formatCurrency(lineLaborSubtotal)})</span>
                    <span>•</span>
                    <span>Parts: <strong>{lineParts.length}</strong> ({formatCurrency(linePartsSubtotal)})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Line Total</span>
                    <span className="text-base font-black font-mono text-slate-900">{formatCurrency(lineTotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartInlineAdd(lineNum)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                    title={`Add part directly to Line ${lineNum}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Part</span>
                  </button>

                  {/* Delete Job ONLY for tech-added jobs / inspection findings (Customer concerns cannot be deleted) */}
                  {isTechAddedConcernLine(ro, cIdx) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete Tech Added Job Line ${lineNum} (${concernText})? This will remove this job and its parts/labor.`)) {
                          deleteRepairOrderConcern(ro.id, cIdx);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                      title={`Delete Line ${lineNum} Tech Added Job`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Job</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Parts Table for this Line */}
              <div className="p-4 space-y-3">
                {lineParts.length === 0 && inlineAddingLineNum !== lineNum ? (
                  <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">No parts assigned to Line {lineNum} yet</p>
                    <p>Click <strong>"+ Add Part"</strong> to enter the part number and price directly on this screen.</p>
                    <button
                      type="button"
                      onClick={() => handleStartInlineAdd(lineNum)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Part Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Part # & Description</th>
                          <th className="py-2.5 px-2 text-center">Qty</th>
                          <th className="py-2.5 px-2 text-right">Price</th>
                          <th className="py-2.5 px-2.5 text-right">Total</th>
                          <th className="py-2.5 px-3">Supplier / Vendor</th>
                          <th className="py-2.5 px-3">Tracking & Daily ETA</th>
                          <th className="py-2.5 px-3">Part Status (Click to Change)</th>
                          <th className="py-2.5 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* New Part Inline Entry Row */}
                        {inlineAddingLineNum === lineNum && (
                          <tr className="bg-blue-50/70 border-2 border-blue-400 animate-in fade-in">
                            <td className="py-2.5 px-3 align-top min-w-[180px]">
                              <div className="space-y-1.5">
                                <div>
                                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Part #</span>
                                  <input
                                    type="text"
                                    value={newLinePartNumber}
                                    onChange={(e) => setNewLinePartNumber(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                      if (e.key === 'Escape') handleCancelInlineAdd();
                                    }}
                                    placeholder="e.g. 68088686AA or TBD"
                                    className="w-full text-xs font-mono font-black text-slate-950 p-1.5 bg-white border-2 border-blue-600 rounded-md focus:outline-none shadow-2xs"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Description / Name</span>
                                  <input
                                    type="text"
                                    value={newLineDescription}
                                    onChange={(e) => setNewLineDescription(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                      if (e.key === 'Escape') handleCancelInlineAdd();
                                    }}
                                    placeholder="Part description"
                                    className="w-full text-xs font-medium text-slate-900 p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center align-top">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block sm:hidden">Qty</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={newLineQty}
                                onChange={(e) => setNewLineQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                className="w-14 text-xs font-black text-center p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right align-top min-w-[110px]">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block sm:hidden">Price</span>
                              <div className="relative inline-block w-full">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={newLinePrice}
                                  onFocus={() => {
                                    if (newLinePrice === '0' || newLinePrice === '0.00' || newLinePrice === '$0.00' || newLinePrice === '0.0') {
                                      setNewLinePrice('');
                                    }
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setNewLinePrice(val);
                                  }}
                                  onBlur={() => {
                                    if (!newLinePrice || newLinePrice === '.' || isNaN(Number(newLinePrice))) {
                                      setNewLinePrice('0.00');
                                    } else {
                                      setNewLinePrice(Number(newLinePrice).toFixed(2));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                    if (e.key === 'Escape') handleCancelInlineAdd();
                                  }}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono font-black text-slate-950 bg-white border-2 border-emerald-500 rounded-md focus:outline-none shadow-2xs"
                                  title="Enter price with 2 decimal places"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right align-top font-mono font-black text-slate-900 min-w-[90px]">
                              <div className="pt-2 text-sm font-black font-mono text-emerald-700">
                                ${((Number(newLineQty) || 1) * (Number(newLinePrice) || 0)).toFixed(2)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top min-w-[130px]">
                              <input
                                type="text"
                                value={newLineVendor}
                                onChange={(e) => setNewLineVendor(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                placeholder="Supplier / Vendor"
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top min-w-[180px]">
                              <input
                                type="text"
                                value={newLineEta}
                                onChange={(e) => setNewLineEta(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                placeholder="ETA (e.g. Tomorrow 10am)"
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg inline-block shadow-2xs">
                                🟧 Needs Order
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center align-top">
                              <div className="flex items-center justify-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineAdd(lineNum)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Save new part"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelInlineAdd}
                                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-2xs cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {lineParts.map(part => {
                          const statusConf = PART_STATUS_CONFIG[part.status] || PART_STATUS_CONFIG.ORDERED;
                          const StatusIcon = statusConf.icon;
                          const isInline = editingPartId === part.id;
                          const partPrice = Number(part.price) || 0;
                          const partTotal = (part.quantity || 1) * partPrice;
                          const isReceived = part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH' || part.status === 'IN_STOCK';

                          return (
                            <tr key={part.id} className={`hover:bg-slate-50/70 transition-colors ${isInline ? 'bg-amber-50/40' : isReceived ? 'bg-emerald-50/30' : ''}`}>
                              {/* Part Number & Name */}
                              <td className="py-2.5 px-3 align-top min-w-[180px]">
                                {isInline ? (
                                  <div className="space-y-1.5">
                                    <div>
                                      <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Part #</span>
                                      <input
                                        type="text"
                                        value={inlinePartNumber}
                                        onChange={(e) => setInlinePartNumber(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="e.g. 68088686AA or TBD"
                                        className="w-full text-xs font-mono font-black text-slate-950 p-1.5 bg-white border-2 border-blue-500 rounded-md focus:outline-none shadow-2xs"
                                        autoFocus={focusField === 'partNumber'}
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Description / Name</span>
                                      <input
                                        type="text"
                                        value={inlineDescription}
                                        onChange={(e) => setInlineDescription(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="Part name or description"
                                        className="w-full text-xs font-medium text-slate-900 p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                    className="cursor-pointer group py-1 rounded hover:bg-blue-50/60 transition-colors px-1 -mx-1"
                                    title="Click to put in Part # and Price inline"
                                  >
                                    <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5 group-hover:text-blue-700">
                                      <span>{part.partNumber || 'TBD'}</span>
                                      <span className="text-[10px] text-blue-600 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        <Edit3 className="w-2.5 h-2.5" /> Edit
                                      </span>
                                    </div>
                                    <div className="text-slate-700 font-medium text-xs">
                                      {part.description || part.name || 'Part Item'}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Qty */}
                              <td className="py-2.5 px-2 text-center align-top">
                                {isInline ? (
                                  <>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block sm:hidden">Qty</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={inlineQty}
                                      onChange={(e) => setInlineQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      className="w-14 text-xs font-black text-center p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                  </>
                                ) : (
                                  <span 
                                    onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                    className="font-bold text-slate-800 cursor-pointer hover:text-blue-700 py-1 inline-block"
                                    title="Click to edit Qty"
                                  >
                                    {part.quantity || 1}
                                  </span>
                                )}
                              </td>

                              {/* Unit Price */}
                              <td className="py-2.5 px-2 text-right align-top min-w-[110px]">
                                {isInline ? (
                                  <>
                                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block sm:hidden">Price</span>
                                    <div className="relative inline-block w-full">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={inlinePrice}
                                        onFocus={() => {
                                          if (inlinePrice === '0' || inlinePrice === '0.00' || inlinePrice === '$0.00' || inlinePrice === '0.0') {
                                            setInlinePrice('');
                                          }
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.]/g, '');
                                          setInlinePrice(val);
                                        }}
                                        onBlur={() => {
                                          if (!inlinePrice || inlinePrice === '.' || isNaN(Number(inlinePrice))) {
                                            setInlinePrice('0.00');
                                          } else {
                                            setInlinePrice(Number(inlinePrice).toFixed(2));
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="0.00"
                                        className="w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono font-black text-slate-950 bg-white border-2 border-emerald-500 rounded-md focus:outline-none shadow-2xs"
                                        autoFocus={focusField === 'price'}
                                        title="Enter unit price in dollars and cents (e.g. 10.00)"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <div 
                                    onClick={() => handleStartInlineEdit(part, 'price')}
                                    className="font-mono font-bold text-slate-700 cursor-pointer group hover:bg-emerald-50/60 transition-colors py-1 px-1 -mx-1 rounded"
                                    title="Click to put in Price directly"
                                  >
                                    <div className="flex items-center justify-end gap-1.5 group-hover:text-emerald-700 font-black">
                                      <span>{formatCurrency(partPrice)}</span>
                                      <span className="text-[10px] text-emerald-600 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        <Edit3 className="w-2.5 h-2.5" />
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Total */}
                              <td className="py-2.5 px-2.5 text-right align-top font-mono font-black text-slate-900 min-w-[90px]">
                                {isInline ? (
                                  <div className="pt-2 text-sm font-black font-mono text-emerald-700">
                                    ${((Number(inlineQty) || 1) * (Number(inlinePrice) || 0)).toFixed(2)}
                                  </div>
                                ) : (
                                  <div className="py-1">
                                    {formatCurrency(partTotal)}
                                  </div>
                                )}
                              </td>

                              {/* Vendor */}
                              <td className="py-2.5 px-3 align-top min-w-[130px]">
                                {isInline ? (
                                  <input
                                    type="text"
                                    value={inlineVendor}
                                    onChange={(e) => setInlineVendor(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                      if (e.key === 'Escape') handleCancelInlineEdit();
                                    }}
                                    placeholder="e.g. MOPAR / AutoZone"
                                    className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                                    autoFocus={focusField === 'vendor'}
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 py-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>{part.vendor || 'Shop Inventory / Supplier'}</span>
                                  </span>
                                )}
                              </td>

                              {/* Tracking & ETA */}
                              <td className="py-2.5 px-3 align-top min-w-[180px]">
                                {isInline ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={inlineEta}
                                      onChange={(e) => setInlineEta(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="ETA: e.g. Tomorrow 10am"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={inlineTracking}
                                      onChange={(e) => setInlineTracking(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="Tracking # / PO #"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-mono focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={inlineNotes}
                                      onChange={(e) => setInlineNotes(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="Notes / Staging Bin"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-0.5 py-1">
                                    <div className="font-bold text-slate-800 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>{part.estimatedArrival || 'ETA Pending'}</span>
                                    </div>
                                    {part.trackingNumber && (
                                      <div className="text-[11px] font-mono text-blue-700 flex items-center gap-1 font-bold">
                                        <Truck className="w-3 h-3 text-blue-500" />
                                        <span>#{part.trackingNumber}</span>
                                      </div>
                                    )}
                                    {part.notes && (
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1 italic">
                                        <MapPin className="w-3 h-3 text-emerald-600" />
                                        <span>{part.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status Dropdown Pill (Click to update day by day!) */}
                              <td className="py-2.5 px-3 align-top">
                                <div className="relative inline-block w-44 pt-0.5">
                                  <select
                                    value={part.status}
                                    onChange={(e) => handleQuickStatusChange(part.id, e.target.value as PartStatus)}
                                    className={`w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border shadow-2xs cursor-pointer appearance-none ${statusConf.bg} ${statusConf.text} ${statusConf.border} focus:ring-2 focus:ring-blue-500 pr-7`}
                                    title="Click to update part status day by day"
                                  >
                                    <option value="REQUESTED">🟧 Needs Order</option>
                                    <option value="QUOTE_ONLY">📋 Quote Only</option>
                                    <option value="ORDERED">🟦 Ordered</option>
                                    <option value="SPECIAL_ORDER_1_5_DAYS">🚚 Special Order (1-5 Days)</option>
                                    <option value="IN_TRANSIT">🟪 In Transit</option>
                                    <option value="RECEIVED">🟩 Received & Staged</option>
                                    <option value="IN_STOCK">📦 In Stock</option>
                                    <option value="BACKORDERED">🟥 Backordered</option>
                                    <option value="DECLINED">⚪ Declined</option>
                                    <option value="CANCELLED">⚪ Cancelled</option>
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-2 text-center align-top">
                                <div className="flex items-center justify-center gap-1.5 pt-1">
                                  {isInline ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineEdit(part.id)}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                                        title="Save Part #, Price, Qty, and Tracking"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelInlineEdit}
                                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-2xs cursor-pointer"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {!isReceived && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkReceived(part.id)}
                                          className="p-1.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-2xs cursor-pointer"
                                          title="Mark Received / Arrived today"
                                        >
                                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                        className="p-1.5 rounded-md hover:bg-blue-100 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer border border-transparent hover:border-blue-300"
                                        title="Edit Part #, Price, Qty, and Tracking inline"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deletePartItem(ro.id, part.id)}
                                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                        title="Remove part from quote"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
