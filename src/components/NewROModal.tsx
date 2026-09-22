import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, FileText, Send, User, UserCheck, Car, Clock, Phone, AlertTriangle, Loader2, CheckCircle2, Sparkles, RefreshCw, Hash, Trash2, Wrench, ShieldCheck, Search, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { decodeVin } from '../utils/vinDecoder';
import { ConcernPayType, Customer, VehicleInfo } from '../types';


export const NewROModal: React.FC = () => {
  const { 
    isNewROModalOpen, 
    setIsNewROModalOpen, 
    createRepairOrder, 
    users, 
    currentUser, 
    setSelectedRO, 
    repairOrders,
    customers,
    prefilledCustomerForNewRO,
    setPrefilledCustomerForNewRO
  } = useApp();

  // Next suggested RO number based on current orders
  const nextSuggestedRoNumber = React.useMemo(() => {
    const maxRoNum = repairOrders.reduce((max, ro) => {
      const match = ro.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 10488);
    return `RO-${maxRoNum + 1}`;
  }, [repairOrders]);

  const serviceWriters = users.filter(u => 
    (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated
  );

  const [roNumber, setRoNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [taxExemptNumber, setTaxExemptNumber] = useState('');
  const [year, setYear] = useState<number | string>('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState<number | string>('');
  const [concerns, setConcerns] = useState<string[]>(['']);
  const [concernPayTypes, setConcernPayTypes] = useState<ConcernPayType[]>(['CUSTOMER_PAY']);
  const [concernTechIds, setConcernTechIds] = useState<string[]>(['']);
  const [promisedTime, setPromisedTime] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  const [techId, setTechId] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isWaiter, setIsWaiter] = useState(false);
  const [isTaxExempt, setIsTaxExempt] = useState(false);

  // Initialize all fields or pre-populate from Customer Cloud Directory
  useEffect(() => {
    if (isNewROModalOpen) {
      if (prefilledCustomerForNewRO) {
        setRoNumber('');
        setCustomerName(prefilledCustomerForNewRO.name || '');
        setCustomerPhone(prefilledCustomerForNewRO.phone || '');
        setIsTaxExempt(!!prefilledCustomerForNewRO.isTaxExempt);
        setTaxExemptNumber(prefilledCustomerForNewRO.taxExemptNumber || '');
        setSelectedCustomerId(prefilledCustomerForNewRO.id);

        const firstVeh = prefilledCustomerForNewRO.vehicles?.[0];
        if (firstVeh) {
          setYear(firstVeh.year || '');
          setMake(firstVeh.make || '');
          setModel(firstVeh.model || '');
          setVin(firstVeh.vin || '');
          setMileage(firstVeh.mileage || '');
          setVinDecodedMsg(`Cloud Fleet Vehicle: ${firstVeh.year} ${firstVeh.make} ${firstVeh.model}`);
        } else {
          setYear('');
          setMake('');
          setModel('');
          setVin('');
          setMileage('');
          setVinDecodedMsg(null);
        }
        setPrefilledCustomerForNewRO(null);
      } else {
        setRoNumber('');
        setCustomerName('');
        setCustomerPhone('');
        setSelectedCustomerId(null);
        setTaxExemptNumber('');
        setYear('');
        setMake('');
        setModel('');
        setVin('');
        setMileage('');
        setVinDecodedMsg(null);
      }

      setConcerns(['']);
      setConcernTechIds(['']);
      setPromisedTime('');
      const defaultAdv = currentUser.role === 'SERVICE_ADVISOR' 
        ? currentUser.id 
        : (users.find(u => u.role === 'SERVICE_ADVISOR')?.id || currentUser.id);
      setAdvisorId(defaultAdv);
      setTechId('');
      setIsUrgent(false);
      setIsWaiter(false);
      setVinError(null);
      setConcernPayTypes(['CUSTOMER_PAY']);
    }
  }, [isNewROModalOpen, currentUser.id, currentUser.role, users, prefilledCustomerForNewRO]);

  // Duplicate RO check
  const cleanedRoNumber = roNumber.trim().toUpperCase();
  const isDuplicateRo = Boolean(
    cleanedRoNumber && repairOrders.some(ro => ro.id.toUpperCase() === cleanedRoNumber)
  );

  // Cloud customer search matches
  const matchedCustomers = useMemo(() => {
    if (!customerName.trim() && !customerPhone.trim()) return [];
    const nameQuery = customerName.trim().toLowerCase();
    const phoneDigits = customerPhone.replace(/\D/g, '');

    return customers.filter(c => {
      const matchName = nameQuery.length >= 2 && c.name?.toLowerCase().includes(nameQuery);
      const matchPhone = phoneDigits.length >= 3 && c.phone?.replace(/\D/g, '').includes(phoneDigits);
      return matchName || matchPhone;
    }).slice(0, 5);
  }, [customers, customerName, customerPhone]);

  // Selected customer saved vehicles in cloud
  const activeCustomerRecord = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find(c => c.id === selectedCustomerId) || null;
    }
    // Also check exact phone match or name match
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      const match = customers.find(c => c.phone?.replace(/\D/g, '') === cleanPhone);
      if (match) return match;
    }
    const cleanName = customerName.trim().toLowerCase();
    if (cleanName.length >= 3) {
      const match = customers.find(c => c.name?.trim().toLowerCase() === cleanName);
      if (match) return match;
    }
    return null;
  }, [customers, selectedCustomerId, customerPhone, customerName]);

  const handleSelectMatchedCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || '');
    setIsTaxExempt(!!cust.isTaxExempt);
    setTaxExemptNumber(cust.taxExemptNumber || '');
    setShowCustomerDropdown(false);

    if (cust.vehicles && cust.vehicles.length >= 1) {
      const veh = cust.vehicles[0];
      setYear(veh.year || '');
      setMake(veh.make || '');
      setModel(veh.model || '');
      setVin(veh.vin || '');
      setMileage(veh.mileage || '');
      setVinDecodedMsg(`Cloud Fleet Vehicle: ${veh.year} ${veh.make} ${veh.model}`);
    }
  };

  const handleConcernChange = (index: number, val: string) => {
    setConcerns(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddConcern = (initialText = '', payType: ConcernPayType = 'CUSTOMER_PAY', assignedTechId = '') => {
    setConcerns(prev => [...prev, initialText]);
    setConcernPayTypes(prev => [...prev, payType]);
    setConcernTechIds(prev => [...prev, assignedTechId]);
  };

  const handleRemoveConcern = (index: number) => {
    setConcerns(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
    setConcernPayTypes(prev => {
      if (prev.length <= 1) return ['CUSTOMER_PAY'];
      return prev.filter((_, i) => i !== index);
    });
    setConcernTechIds(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePayTypeChange = (index: number, payType: ConcernPayType) => {
    setConcernPayTypes(prev => {
      const next = [...prev];
      next[index] = payType;
      return next;
    });
  };

  const handleConcernTechChange = (index: number, tId: string) => {
    setConcernTechIds(prev => {
      const next = [...prev];
      next[index] = tId;
      return next;
    });
  };


  // Auto-VIN Decoding state
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinDecodedMsg, setVinDecodedMsg] = useState<string | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const decodeAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Function to execute VIN lookup
  const runVinDecode = async (inputVin: string, isManual = false) => {
    const cleanVin = inputVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanVin.length < 10) {
      if (isManual) setVinError('VIN must be at least 10 characters');
      return;
    }

    if (decodeAbortRef.current) {
      decodeAbortRef.current.abort();
    }
    decodeAbortRef.current = new AbortController();

    setIsDecodingVin(true);
    setVinError(null);
    setVinDecodedMsg(null);

    try {
      const result = await decodeVin(cleanVin, decodeAbortRef.current.signal);
      if (result.success) {
        if (result.year) setYear(result.year);
        if (result.make) setMake(result.make);
        if (result.model) setModel(result.model);
        
        const summary = [result.year, result.make, result.model].filter(Boolean).join(' ');
        setVinDecodedMsg(summary ? `Auto-populated: ${summary}` : 'Decoded successfully');
      } else if (isManual || cleanVin.length === 17) {
        setVinError(result.error || 'Could not decode VIN');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setVinError('Error decoding VIN');
      }
    } finally {
      setIsDecodingVin(false);
    }
  };

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setVin(rawVal);
    setVinDecodedMsg(null);
    setVinError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Auto-decode immediately if full 17 characters, otherwise debounce when 10+ characters
    if (rawVal.length === 17) {
      runVinDecode(rawVal, false);
    } else if (rawVal.length >= 10) {
      debounceTimerRef.current = setTimeout(() => {
        runVinDecode(rawVal, false);
      }, 500);
    }
  };

  if (!isNewROModalOpen) return null;

  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  const validConcerns = concerns.map(c => c.trim()).filter(Boolean);
  const hasValidConcern = validConcerns.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !hasValidConcern || isDuplicateRo) return;

    const newROId = createRepairOrder({
      roNumber: cleanedRoNumber || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      vehicle: {
        year: year ? Number(year) : new Date().getFullYear(),
        make: make.trim() || 'Vehicle',
        model: model.trim() || '',
        vin: vin.trim(),
        mileage: mileage ? Number(mileage) : 0,
      },
      primaryConcern: validConcerns[0],
      concerns: validConcerns,
      concernPayTypes: validConcerns.map((_, i) => concernPayTypes[i] || 'CUSTOMER_PAY'),
      concernTechIds: validConcerns.map((_, i) => concernTechIds[i] || techId || undefined),
      concernTechNames: validConcerns.map((_, i) => {
        const tId = concernTechIds[i] || techId;
        return tId ? users.find(u => u.id === tId)?.name : undefined;
      }),
      promisedTime: promisedTime || undefined,
      advisorId: advisorId || undefined,
      techId: techId || undefined,
      isUrgent,
      isWaiter,
      isTaxExempt,
      taxExemptNumber: isTaxExempt ? (taxExemptNumber.trim() || undefined) : undefined,
    });

    setIsNewROModalOpen(false);
    setConcerns(['']);
    setConcernPayTypes(['CUSTOMER_PAY']);

    // Automatically open newly created RO
    setTimeout(() => {
      const created = repairOrders.find(r => r.id === newROId);
      if (created) setSelectedRO(created);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="new-ro-modal"
        className="bg-white rounded-xl shadow-2xl border-2 border-slate-400 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b-2 border-slate-300 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Create New Repair Order</h2>
              <p className="text-xs text-slate-600 font-medium">
                Log customer intake, primary diagnostic concern, and assign to technician
              </p>
            </div>
          </div>
          <button
            id="close-new-ro-modal-btn"
            onClick={() => setIsNewROModalOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Repair Order Reference & Promised Time */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" /> Repair Order Reference
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Dealership / DMS Reference
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Repair Order # (RO Number)
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="new-ro-number-input"
                    type="text"
                    placeholder="Enter Repair Order # (e.g. 10489)"
                    value={roNumber}
                    onChange={e => setRoNumber(e.target.value)}
                    className={`w-full text-xs font-mono font-bold px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:outline-none uppercase bg-white shadow-xs ${
                      isDuplicateRo
                        ? 'border-red-500 focus:ring-red-400 text-red-700 bg-red-50/50'
                        : 'border-slate-600 focus:border-blue-600 focus:ring-blue-500/20 text-slate-900'
                    }`}
                  />
                </div>
                {isDuplicateRo ? (
                  <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-center gap-1 bg-red-50 p-1.5 rounded-md border-2 border-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Repair Order #{cleanedRoNumber} already exists in the system. Please enter a unique RO number.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter your shop or DMS repair order number.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Promised Completion Time (Optional)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={promisedTime}
                    onChange={e => setPromisedTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-medium text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Promise time committed to the customer at vehicle intake.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Customer Information
                </h3>
                {activeCustomerRecord && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    <span>Cloud Profile Linked ({activeCustomerRecord.totalVisits || 0} Visits)</span>
                  </span>
                )}
              </div>
              
              {/* Tax Exempt Button on Customer Screen */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="new-ro-tax-exempt-btn"
                  onClick={() => setIsTaxExempt(!isTaxExempt)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shadow-2xs ${
                    isTaxExempt
                      ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 ring-1 ring-emerald-500'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-300 hover:border-emerald-400'
                  }`}
                  title={isTaxExempt ? "Customer is marked Tax Exempt (0% sales tax). Click to remove." : "Click if customer is Tax Exempt (0% sales tax instead of 7%)"}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isTaxExempt ? 'text-white' : 'text-slate-400'}`} />
                  <span>{isTaxExempt ? 'Tax Exempt Customer (0% Tax) ✓' : 'Tax Exempt? Click if exempt'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <div className="relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter customer name"
                  value={customerName}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-900 bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-900 bg-white font-medium font-mono"
                />
              </div>

              {/* Real-time Cloud Auto-complete Suggestions Dropdown */}
              {showCustomerDropdown && matchedCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border-2 border-blue-400 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-150">
                  <div className="bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Matching Customers in Cloud Database (Click to auto-fill)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {matchedCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectMatchedCustomer(cust)}
                      className="p-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between text-left transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{cust.name}</span>
                          {cust.isTaxExempt && (
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                              0% Tax Exempt
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {cust.totalVisits || 0} visit{(cust.totalVisits || 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-3 mt-0.5">
                          {cust.phone && <span>Phone: <span className="font-mono text-slate-900 font-semibold">{cust.phone}</span></span>}
                          {cust.vehicles && cust.vehicles.length > 0 && (
                            <span className="text-slate-500 truncate max-w-xs">
                              🚗 {cust.vehicles[0].year} {cust.vehicles[0].make} {cust.vehicles[0].model} {cust.vehicles.length > 1 ? `(+${cust.vehicles.length - 1} more)` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Exemption Certificate/Permit Number if Tax Exempt */}
            {isTaxExempt && (
              <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-3 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-emerald-900 block">
                    Tax Exemption Permit / Certificate # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter sales tax permit or exemption certificate #"
                    value={taxExemptNumber}
                    onChange={e => setTaxExemptNumber(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-emerald-400 bg-white rounded-md text-slate-900 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Saved Fleet Vehicles Chip Bar */}
            {activeCustomerRecord && activeCustomerRecord.vehicles && activeCustomerRecord.vehicles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-300">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Saved Fleet in Cloud (Click any vehicle to auto-populate):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {activeCustomerRecord.vehicles.length} Vehicle{activeCustomerRecord.vehicles.length === 1 ? '' : 's'} on file
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCustomerRecord.vehicles.map((v, idx) => {
                    const isCurrent = vin && v.vin && vin.toUpperCase() === v.vin.toUpperCase();
                    return (
                      <button
                        key={v.vin || idx}
                        type="button"
                        onClick={() => {
                          setYear(v.year || '');
                          setMake(v.make || '');
                          setModel(v.model || '');
                          setVin(v.vin || '');
                          setMileage(v.mileage || '');
                          setVinDecodedMsg(`Cloud Fleet Vehicle: ${v.year} ${v.make} ${v.model}`);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-2xs ${
                          isCurrent 
                            ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400' 
                            : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <Car className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-blue-600'}`} />
                        <span>{v.year} {v.make} {v.model}</span>
                        {v.vin && (
                          <span className={`font-mono text-[10px] ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                            ({v.vin.slice(-6)})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Vehicle Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-600" /> Vehicle Information
              </h3>
              <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Decodes Year, Make & Model
              </span>
            </div>

            {/* VIN Input Box with Decode Status */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>VIN (Vehicle Identification Number)</span>
                  {isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium normal-case">
                      <Loader2 className="w-3 h-3 animate-spin" /> Decoding VIN with NHTSA...
                    </span>
                  )}
                  {vinDecodedMsg && !isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold normal-case bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {vinDecodedMsg}
                    </span>
                  )}
                  {vinError && !isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium normal-case bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                      {vinError}
                    </span>
                  )}
                </label>

                {vin.trim().length >= 10 && (
                  <button
                    type="button"
                    onClick={() => runVinDecode(vin, true)}
                    disabled={isDecodingVin}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isDecodingVin ? 'animate-spin' : ''}`} /> Decode VIN
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter or paste 17-character VIN"
                  value={vin}
                  onChange={handleVinChange}
                  maxLength={17}
                  className="w-full text-xs px-3 py-2.5 font-mono font-bold tracking-wider border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-white shadow-xs text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Enter or paste any 17-digit VIN. Year, Make, and Model will automatically be fetched and entered into the fields below.
              </p>
            </div>

            {/* Year, Make, Model & Trim */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Year</label>
                <input
                  type="number"
                  placeholder="Year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Make</label>
                <input
                  type="text"
                  placeholder="Make"
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Model & Trim</label>
                <input
                  type="text"
                  placeholder="Model & Trim"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="mt-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Odometer Mileage</label>
              <input
                type="number"
                placeholder="Mileage"
                value={mileage}
                onChange={e => setMileage(e.target.value)}
                className="w-full sm:w-1/2 text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs text-slate-900"
              />
            </div>
          </div>

          {/* Customer Complaints & Concerns Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Customer Complaints / Concerns *
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {concerns.length} {concerns.length === 1 ? 'Line Item' : 'Line Items'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddConcern()}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border-2 border-slate-400 hover:border-blue-600 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Concern Line
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Add all customer complaints, symptoms, or requested service lines. Line 1 is logged as the primary complaint.
            </p>

            {/* List of Concerns */}
            <div className="space-y-2.5">
              {concerns.map((concern, idx) => {
                const currentPayType: ConcernPayType = concernPayTypes[idx] || 'CUSTOMER_PAY';
                return (
                  <div key={idx} className="bg-white p-3 rounded-lg border-2 border-slate-400 shadow-2xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">
                        {idx === 0 ? 'Line 1 (Primary Concern)' : `Line ${idx + 1}`}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Pay Type Selector */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-300">
                          <span className="text-[10px] font-bold text-slate-500 mr-1 hidden xs:inline uppercase tracking-wider">Pay:</span>
                          <button
                            type="button"
                            onClick={() => handlePayTypeChange(idx, 'CUSTOMER_PAY')}
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
                            onClick={() => handlePayTypeChange(idx, 'WARRANTY')}
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
                            onClick={() => handlePayTypeChange(idx, 'INTERNAL')}
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

                        {/* Assigned Tech Selector for this line */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                          <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
                          <select
                            value={concernTechIds[idx] || ''}
                            onChange={e => handleConcernTechChange(idx, e.target.value)}
                            className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            title="Assign specific technician to this line"
                          >
                            <option value="">{techId ? `Default (${users.find(u => u.id === techId)?.name || 'Assigned'})` : 'Unassigned'}</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name}{t.employeeNumber ? ` #${t.employeeNumber}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {concerns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveConcern(idx)}
                          className="text-[11px] text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors ml-auto"
                          title="Remove this line item"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Line
                        </button>
                      )}
                    </div>
                    <textarea
                    rows={2}
                    required={idx === 0}
                    placeholder={
                      idx === 0
                        ? "Enter primary customer complaint or requested service..."
                        : `Enter additional concern line ${idx + 1}...`
                    }
                    value={concern}
                    onChange={e => handleConcernChange(idx, e.target.value)}
                    className="w-full text-xs p-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed bg-white text-slate-900 font-medium"
                  />
                </div>
              );
            })}
          </div>

          </div>

          {/* Work Assignment: Service Writer & Technician */}
          <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-400 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" /> Order Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Service Writer (Advisor) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Service Writer (Advisor) *</span>
                </label>
                <select
                  id="new-ro-advisor-select"
                  value={advisorId}
                  onChange={e => setAdvisorId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-800"
                  required
                >
                  {serviceWriters.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.employeeNumber ? ` (#${w.employeeNumber})` : ''} — {w.title || w.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technician */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-slate-600" />
                  <span>Assign Technician (Optional)</span>
                </label>
                <select
                  id="new-ro-tech-select"
                  value={techId}
                  onChange={e => setTechId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-800"
                >
                  <option value="">Leave in Queue (Unassigned)</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.employeeNumber ? ` ${t.employeeNumber}` : ''} — {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* High Priority & Waiter Buttons */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {/* High Priority Button */}
            <button
              type="button"
              id="new-ro-high-priority-btn"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                isUrgent
                  ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                  : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-slate-500'}`} />
              <span>High Priority</span>
              {isUrgent && (
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </button>

            {/* Waiter Button to the right of High Priority */}
            <button
              type="button"
              id="new-ro-waiter-btn"
              onClick={() => setIsWaiter(!isWaiter)}
              className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                isWaiter
                  ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                  : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
              }`}
            >
              <Clock className={`w-4 h-4 ${isWaiter ? 'text-red-600' : 'text-slate-500'}`} />
              <span>Waiter</span>
              {isWaiter && (
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t-2 border-slate-300 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsNewROModalOpen(false)}
              className="px-4 py-2 border-2 border-slate-400 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-new-ro-btn"
              type="submit"
              disabled={isDuplicateRo || !customerName.trim() || !hasValidConcern}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Open Repair Order
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
